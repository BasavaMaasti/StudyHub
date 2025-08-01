import { GoogleGenerativeAI } from "@google/generative-ai";
import AIInterview from "../models/aiInterview.model.js";

// Initialize with fallback configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const MODEL_NAME = "gemini-pro";

// Safety settings configuration
const SAFETY_SETTINGS = [
  {
    category: "HARM_CATEGORY_HARASSMENT",
    threshold: "BLOCK_NONE",
  },
  {
    category: "HARM_CATEGORY_HATE_SPEECH",
    threshold: "BLOCK_NONE",
  },
  {
    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
    threshold: "BLOCK_NONE",
  },
  {
    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
    threshold: "BLOCK_NONE",
  },
];

// Local question bank fallback
const LOCAL_QUESTIONS = {
  "junior": [
    "Explain the difference between let, const, and var in JavaScript",
    "What is React and why would you use it?",
    "How would you center a div in CSS?",
    "Explain RESTful APIs",
    "What is the virtual DOM in React?"
  ],
  "mid": [
    "Explain the React component lifecycle",
    "How would you optimize a slow React application?",
    "Describe your approach to state management",
    "Explain the difference between SQL and NoSQL databases",
    "How would you implement authentication in a web app?"
  ],
  "senior": [
    "Design a scalable microservice architecture",
    "Explain the CAP theorem and its implications",
    "How would you handle a major production outage?",
    "Design a caching strategy for a high-traffic application",
    "Explain event sourcing and CQRS patterns"
  ]
};
// Helper: Validate request body
const validateCreateRequest = (body) => {
  const { role, techStack, experienceLevel } = body;
  const errors = [];

  if (!role?.trim()) errors.push("Role is required");
  if (!techStack?.trim()) errors.push("Tech stack is required");
  if (!["Entry", "Mid", "Senior"].includes(experienceLevel)) {
    errors.push("Experience level must be Entry, Mid, or Senior");
  }

  return errors;
};

export const createInterview = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate request
    const validationErrors = validateCreateRequest(req.body);
    if (validationErrors.length > 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors
      });
    }

    // Validate user
    if (!req.user?._id || !mongoose.Types.ObjectId.isValid(req.user._id)) {
      await session.abortTransaction();
      return res.status(401).json({ 
        success: false, 
        message: "Invalid user ID" 
      });
    }

    const { role, techStack, experienceLevel } = req.body;

    // Generate questions (API or fallback)
    let questions = [];
    let source = "gemini_api";

    try {
      const model = genAI.getGenerativeModel({ model: MODEL_NAME });
      const prompt = `Generate 5 ${experienceLevel} level questions for ${role} (${techStack})`;
      const result = await model.generateContent(prompt);
      const text = await result.response.text();
      
      questions = text.split('\n')
        .filter(q => q.trim().length > 5) // Minimum question length
        .map((q, i) => ({
          question: q.replace(/^\d+\.\s*/, '').trim(),
          questionNumber: i + 1
        }));

      if (questions.length < 3) throw new Error("Insufficient questions");
    } catch (apiError) {
      console.warn("API failed, using local questions");
      source = "local_fallback";
      const levelKey = experienceLevel.toLowerCase().includes('senior') ? 'senior' : 
                      experienceLevel.toLowerCase().includes('mid') ? 'mid' : 'junior';
      questions = LOCAL_QUESTIONS[levelKey]?.map((q, i) => ({
        question: q,
        questionNumber: i + 1
      })) || [];
    }

    // Create and save interview
    const interview = new AIInterview({
      user: req.user._id,
      role: role.trim(),
      techStack: techStack.trim(),
      experienceLevel,
      questions,
      source,
      status: 'created'
    });

    await interview.save({ session });
    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      interview
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error:', error.message);
    
    let statusCode = 500;
    let message = "Interview creation failed";

    if (error.message.includes("validation failed")) {
      statusCode = 400;
      message = error.message;
    }

    return res.status(statusCode).json({
      success: false,
      message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
};

// Other controller methods (evaluateInterview, getInterviews) remain similar
// but with added validation as shown above
export const evaluateInterview = async (req, res) => {
  try {
    const { interviewId, answers } = req.body;
    
    // Validation
    if (!interviewId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: "Interview ID and answers array are required"
      });
    }

    const interview = await AIInterview.findById(interviewId);
    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found"
      });
    }

    // Initialize model
    const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME,
      safetySettings: SAFETY_SETTINGS
    });

    // Evaluate each answer
    for (let i = 0; i < Math.min(answers.length, interview.questions.length); i++) {
      try {
        const prompt = `Evaluate this technical interview answer (1-10 scale):
        Question: ${interview.questions[i].question}
        Answer: ${answers[i]}
        
        Provide:
        1. A score from 1-10
        2. Technical accuracy feedback
        3. Suggestions for improvement
        4. Example better answer`;
        
        const text = await generateWithRetry(model, prompt);
        
        interview.questions[i] = {
          ...interview.questions[i].toObject(),
          userAnswer: answers[i],
          feedback: text,
          evaluatedAt: new Date()
        };
      } catch (evalError) {
        console.error(`Failed to evaluate question ${i}:`, evalError);
        interview.questions[i].feedback = "Evaluation failed - "+evalError.message;
      }
    }

    // Generate overall feedback
    try {
      const summaryPrompt = `Provide overall feedback for this ${interview.experienceLevel} level ${interview.role} interview.`;
      const summaryText = await generateWithRetry(model, summaryPrompt);
      interview.overallFeedback = summaryText;
    } catch (summaryError) {
      console.error("Failed to generate summary:", summaryError);
      interview.overallFeedback = "Overall evaluation failed";
    }

    interview.status = 'completed';
    interview.completedAt = new Date();
    await interview.save();

    return res.status(200).json({
      success: true,
      interview
    });

  } catch (error) {
    console.error('Evaluation error:', error);
    return res.status(500).json({
      success: false,
      message: "Failed to evaluate interview",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getInterviews = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const parsedLimit = Math.min(parseInt(limit), 50);

    const [interviews, total] = await Promise.all([
      AIInterview.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit),
      AIInterview.countDocuments({ user: req.user._id })
    ]);

    return res.status(200).json({
      success: true,
      interviews,
      total,
      page: Math.max(1, parseInt(page)),
      pages: Math.ceil(total / parsedLimit),
      limit: parsedLimit
    });

  } catch (error) {
    console.error('Fetch error:', error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch interviews",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Test endpoint for API connection
export const testConnection = async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const prompt = "Hello, respond with 'OK' if working";
    const result = await model.generateContent(prompt);
    const text = await result.response.text();

    return res.json({
      success: true,
      response: text,
      apiStatus: "working",
      apiKeyConfigured: !!GEMINI_API_KEY,
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      apiStatus: "failed",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};