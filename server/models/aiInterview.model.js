import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  questionNumber: {
    type: Number,
    required: true,
    min: 1
  },
  question: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true,
    minlength: 10
  },
  userAnswer: {
    type: String,
    default: "",
    trim: true
  },
  feedback: {
    type: String,
    default: "",
    trim: true
  },
  score: {
    type: Number,
    min: 0,
    max: 10,
    default: 0
  }
}, { _id: false });

const aiInterviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, 'User reference is required'],
    validate: {
      validator: (v) => mongoose.Types.ObjectId.isValid(v),
      message: props => `${props.value} is not a valid user ID!`
    }
  },
  role: {
    type: String,
    required: [true, 'Job role is required'],
    trim: true,
    maxlength: 100
  },
  techStack: {
    type: String,
    required: [true, 'Tech stack is required'],
    trim: true
  },
  experienceLevel: {
    type: String,
    enum: ["Entry", "Mid", "Senior"],
    required: true
  },
  questions: {
    type: [questionSchema],
    validate: {
      validator: (arr) => arr.length > 0,
      message: "At least one question is required"
    }
  },
  overallFeedback: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ["created", "in-progress", "completed"],
    default: "created"
  },
  duration: {
    type: Number,
    min: 1,
    default: 30
  },
  source: {
    type: String,
    enum: ["gemini_api", "local_fallback"],
    required: true
  }
}, {
  timestamps: true,
  strict: "throw" // Reject invalid fields
});

// Indexes for performance
aiInterviewSchema.index({ user: 1, createdAt: -1 });
aiInterviewSchema.index({ status: 1 });

// Pre-save validation
aiInterviewSchema.pre('save', function(next) {
  if (this.isModified('questions') && this.questions.length === 0) {
    throw new Error("Interview must contain at least one question");
  }
  next();
});

export default mongoose.model("AIInterview", aiInterviewSchema);