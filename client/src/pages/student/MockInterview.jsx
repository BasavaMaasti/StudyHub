import React, { useState, useRef, useEffect } from 'react';
import { PlusCircle, Briefcase, Calendar, X, Video, Mic, VideoOff, MicOff, ChevronRight, ChevronLeft } from 'react-feather';
import { useNavigate } from 'react-router-dom';
import { useSelector } from "react-redux";

const MockInterview = () => {

const { user } = useSelector((store) => store.auth);
const navigate = useNavigate();

useEffect(() => {
  if (user?.role === "instructor") {
    navigate("/dashboard"); // Redirect instructors
  }
}, [user, navigate]);

if (user?.role === "instructor") {
  return null; // Prevent rendering for instructors
}

  
  
  // State management
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isInterviewReady, setIsInterviewReady] = useState(false);
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isWebcamEnabled, setIsWebcamEnabled] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [feedback, setFeedback] = useState(null);
  
  // Initialize with sample previous interviews
  const [interviews, setInterviews] = useState([
    {
      id: 1,
      title: 'Frontend Developer',
      experience: '3 Years',
      date: '5/15/2023',
      feedback: `**Interview Feedback for Frontend Developer Position**\n\n**Strengths:**\n- Strong React knowledge\n- Good CSS skills\n- Clear communication\n\n**Areas for Improvement:**\n- More TypeScript practice needed\n- Deeper system design knowledge\n\n**Overall Rating:** 4/5`
    },
    {
      id: 2,
      title: 'Full Stack Engineer',
      experience: '5 Years',
      date: '6/20/2023',
      feedback: `**Interview Feedback for Full Stack Engineer Position**\n\n**Strengths:**\n- Excellent Node.js skills\n- Good database knowledge\n- Problem-solving approach\n\n**Areas for Improvement:**\n- More cloud experience needed\n- Better testing practices\n\n**Overall Rating:** 4.2/5`
    },
    {
      id: 3,
      title: 'Backend Developer',
      experience: '2 Years',
      date: '7/10/2023',
      feedback: `**Interview Feedback for Backend Developer Position**\n\n**Strengths:**\n- Solid Java skills\n- Good API design knowledge\n- Clear explanations\n\n**Areas for Improvement:**\n- More microservices experience\n- Better performance optimization\n\n**Overall Rating:** 3.8/5`
    }
  ]);

  // Form data state
  const [formData, setFormData] = useState({
    role: '',
    description: '',
    experience: ''
  });

  // Refs
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);

  // Input change handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsDialogOpen(false);
    await generateQuestions();
  };

  // Generate mock questions
  const generateQuestions = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockQuestions = [
        `Explain your experience with ${formData.description.split(',')[0] || 'React'}`,
        `How would you handle a challenging ${formData.role} scenario?`,
        'Describe your approach to debugging complex issues',
        'What best practices do you follow in your development process?',
        'How do you stay updated with industry trends?'
      ];
      
      setQuestions(mockQuestions);
      setIsInterviewReady(true);
    } catch (error) {
      console.error('Error generating questions:', error);
      alert('Failed to generate questions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
// Webcam handler
const [cameraError, setCameraError] = useState(null);
const [isCameraLoading, setIsCameraLoading] = useState(false);

const toggleWebcam = async () => {
  if (isWebcamEnabled) {
    // Cleanup
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsWebcamEnabled(false);
    setIsCameraLoading(false);
    return;
  }

  setIsCameraLoading(true);
  setCameraError(null);

  try {
    // 1. Get devices with labels
    let devices = [];
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      devices = await navigator.mediaDevices.enumerateDevices();
      tempStream.getTracks().forEach(track => track.stop());
    } catch (e) {
      devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
    }

    // 2. Try multiple constraint sets
    const constraintSets = [
      { 
        video: { 
          deviceId: devices.find(d => d.kind === 'videoinput')?.deviceId,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      },
      { video: true } // Fallback to basic constraints
    ];

    let stream;
    for (const constraints of constraintSets) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        break;
      } catch (err) {
        console.log('Constraint attempt failed:', constraints, err);
        if (constraints === constraintSets[constraintSets.length - 1]) {
          throw err;
        }
      }
    }

    // 3. Verify stream
    if (!stream?.active) throw new Error('Stream inactive');
    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length === 0) throw new Error('No video tracks');

    // 4. Set up video element
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      
      // Wait for video to be ready
      const waitForVideo = () => {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('Video timeout')), 2000);
          
          const onReady = () => {
            clearTimeout(timer);
            resolve();
          };

          if (videoRef.current.readyState >= 2) { // HAVE_CURRENT_DATA
            onReady();
          } else {
            videoRef.current.onloadeddata = onReady;
            videoRef.current.onerror = reject;
          }
        });
      };

      await waitForVideo();

      // Play video with retries
      const playWithRetry = async (attempt = 0) => {
        try {
          await videoRef.current.play();
        } catch (err) {
          if (attempt < 2) {
            await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
            return playWithRetry(attempt + 1);
          }
          throw err;
        }
      };

      await playWithRetry();
    }

    streamRef.current = stream;
    setIsWebcamEnabled(true);
  } catch (err) {
    console.error('Camera error:', err);
    setCameraError(err.message);
    setIsWebcamEnabled(false);
    
    // Cleanup
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  } finally {
    setIsCameraLoading(false);
  }
};
  // Microphone handler
  const toggleMicrophone = async () => {
    if (isMicEnabled) {
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stop();
        mediaRecorderRef.current = null;
      }
      setIsMicEnabled(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        mediaRecorderRef.current.start();
        setIsMicEnabled(true);
      } catch (err) {
        console.error('Error accessing microphone:', err);
        alert('Could not access microphone. Please check permissions.');
      }
    }
  };

  // Start interview
  const startInterview = () => {
    setIsInterviewStarted(true);
    setCurrentQuestionIndex(0);
    setAnswers(Array(questions.length).fill(''));
  };

  // Question navigation
  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      generateFeedback();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  // Generate feedback
  const generateFeedback = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockFeedback = `
        **Interview Feedback for ${formData.role} Position**
        
        **Strengths:**
        - Demonstrated solid understanding of ${formData.description.split(',')[0] || 'React'}
        - Provided clear explanations
        - Showed good problem-solving approach
        
        **Areas for Improvement:**
        - Could elaborate more on system design
        - Consider diving deeper into performance optimization
        
        **Overall Rating:** 4/5
      `;
      
      setFeedback(mockFeedback);
      
      // Add to interview history
      const newInterview = {
        id: interviews.length + 1,
        title: formData.role,
        experience: `${formData.experience} Years`,
        date: new Date().toLocaleDateString(),
        feedback: mockFeedback
      };
      
      setInterviews([newInterview, ...interviews]);
    } catch (error) {
      console.error('Error generating feedback:', error);
      setFeedback("Thank you for completing the interview!");
    } finally {
      setIsLoading(false);
    }
  };

  // Navigation
  const returnToDashboard = () => {
    setIsInterviewReady(false);
    setIsInterviewStarted(false);
    setFeedback(null);
    setIsDialogOpen(false);
  };

  // Clean up media streams
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stop();
        mediaRecorderRef.current = null;
      }
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject = null;
      }
    };
  }, []); 
  
  // Interview Question Flow Screen
  if (isInterviewStarted) {
    return (
      <div className="mock-interview-flow p-6 max-w-6xl mx-auto bg-gray-50 min-h-screen">
        <header className="mb-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">StudyHub Mock Interview</h1>
          <button 
            onClick={returnToDashboard}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Exit Interview
          </button>
        </header>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Webcam & Controls Panel */}
          <div className="w-full lg:w-2/5 xl:w-1/3">
            <div className="bg-black rounded-lg overflow-hidden aspect-video mb-4 relative">
              {isWebcamEnabled ? (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white">
                  <VideoOff size={48} />
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap gap-3 mb-6">
              <button 
                onClick={toggleWebcam}
                className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                  isWebcamEnabled ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-800'
                }`}
              >
                {isWebcamEnabled ? <VideoOff size={18} /> : <Video size={18} />}
                {isWebcamEnabled ? 'Stop Camera' : 'Enable Camera'}
              </button>
              
              <button 
                onClick={toggleMicrophone}
                className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                  isMicEnabled ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-800'
                }`}
              >
                {isMicEnabled ? <MicOff size={18} /> : <Mic size={18} />}
                {isMicEnabled ? 'Mute Mic' : 'Enable Mic'}
              </button>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <h3 className="font-medium mb-2">Interview Details</h3>
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">Role:</span> {formData.role}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Tech:</span> {formData.description}
              </p>
            </div>
          </div>

          {/* Question & Answer Panel */}
          <div className="w-full lg:w-3/5 xl:w-2/3">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">
                  {formData.role} Interview Questions
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={handlePreviousQuestion}
                    disabled={currentQuestionIndex === 0}
                    className={`p-2 rounded-full ${currentQuestionIndex === 0 ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={handleNextQuestion}
                    className={`p-2 rounded-full ${currentQuestionIndex === questions.length - 1 ? 'text-green-600 hover:bg-green-50' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    {currentQuestionIndex === questions.length - 1 ? (
                      <span className="flex items-center gap-1">
                        Submit <ChevronRight size={20} />
                      </span>
                    ) : (
                      <ChevronRight size={20} />
                    )}
                  </button>
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-700 mb-4 p-3 bg-blue-50 rounded">
                  {questions[currentQuestionIndex]}
                </h3>
                
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2 font-medium">Your Answer:</label>
                  <textarea 
                    className="w-full p-3 border border-gray-300 rounded-md h-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Type your answer here..."
                    value={answers[currentQuestionIndex] || ''}
                    onChange={(e) => {
                      const newAnswers = [...answers];
                      newAnswers[currentQuestionIndex] = e.target.value;
                      setAnswers(newAnswers);
                    }}
                  />
                </div>
              </div>
            </div>
            
            {isLoading && (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                <p className="mt-2 text-gray-600">Generating feedback...</p>
              </div>
            )}
          </div>
        </div>

        {feedback && (
          <div className="mt-8 bg-white p-6 rounded-lg shadow-md border border-green-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Interview Feedback</h3>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                Completed
              </span>
            </div>
            <div className="prose max-w-none text-gray-700 whitespace-pre-line">
              {feedback}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={returnToDashboard}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    );
  } 
  // Interview Preparation Screen
  if (isInterviewReady) {
    return (
      <div className="mock-interview-prep p-6 max-w-4xl mx-auto bg-gray-50 min-h-screen">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-blue-600">StudyHub Mock Interview</h1>
        </header>

        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-xl font-semibold mb-6">Let's Get Started</h2>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
            <h3 className="font-medium text-lg mb-2">
              Job Role/Job Position: <span className="text-blue-600">{formData.role}</span>
            </h3>
            <p className="text-gray-700 mb-2">
              <strong>Job Description/Tech Stack:</strong> {formData.description}
            </p>
            <p className="text-gray-700">
              <strong>Years of Experience:</strong> {formData.experience}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
            <h3 className="text-xl font-semibold mb-4">Information</h3>
            <p className="text-gray-700 mb-4">
              Enable Video Web Cam and Microphone to Start your AI Generated Mock Interview. 
              It has {questions.length} questions which you can answer and at the last you will get the report 
              on the basis of your answer. 
              <span className="block mt-2 font-medium">
                NOTE: We never record your video. Web cam access you can disable at any time if you want.
              </span>
            </p>

            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
              <button 
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  toggleWebcam();
                  toggleMicrophone();
                }}
              >
                {isWebcamEnabled ? <VideoOff size={16} /> : <Video size={16} />}
                {isMicEnabled ? <MicOff size={16} /> : <Mic size={16} />}
                {isWebcamEnabled || isMicEnabled ? 'Disable Media' : 'Enable Web Cam and Microphone'}
              </button>
              <button 
                onClick={startInterview}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
              >
                Start Interview
              </button>
            </div>
          </div>

          <button 
            onClick={returnToDashboard}
            className="px-4 py-2 text-blue-600 hover:text-blue-800"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Main Dashboard Screen
  return (
    <div className="mock-interview-dashboard p-6 max-w-6xl mx-auto bg-gray-50 min-h-screen">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Mock Interview Dashboard</h1>
          <p className="text-gray-600">Practice your technical interview skills</p>
        </div>
        <button 
          onClick={() => setIsDialogOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          <PlusCircle size={18} />
          New Interview
        </button>
      </div>
      
      {/* Add New Interview Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center border-b p-4">
              <h2 className="text-xl font-semibold">Create New Interview</h2>
              <button 
                onClick={() => setIsDialogOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4">
              <p className="text-gray-600 mb-4">
                Enter details about the position you're preparing for
              </p>
              
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-1">Job Role/Position</label>
                  <input
                    type="text"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Full Stack Developer"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-700 mb-1">Tech Stack</label>
                  <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. React, Node.js, MongoDB"
                    required
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-gray-700 mb-1">Years of Experience</label>
                  <input
                    type="number"
                    name="experience"
                    value={formData.experience}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="2"
                    min="0"
                    required
                  />
                </div>
                
                <div className="flex justify-end gap-3 border-t pt-4">
                  <button
                    type="button"
                    onClick={() => setIsDialogOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Generating...' : 'Start Interview'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Previous Interviews List */}
      <div className="border-t border-gray-200 pt-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-6">Previous Interviews</h2>
        
        {isLoading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {interviews.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 text-center">
            <p className="text-gray-600 mb-4">You haven't completed any interviews yet.</p>
            <button 
              onClick={() => setIsDialogOpen(true)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
            >
              Start Your First Interview
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {interviews.map((interview) => (
              <div key={interview.id} className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="mb-3 sm:mb-0">
                    <h3 className="font-medium text-lg text-gray-800">{interview.title}</h3>
                    <div className="flex flex-wrap gap-4 mt-2 text-gray-600">
                      <span className="flex items-center gap-1">
                        <Briefcase size={14} />
                        {interview.experience}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {interview.date}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        setFeedback(interview.feedback);
                        setIsInterviewReady(true);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      View Feedback
                    </button>
                    <button 
                      onClick={() => {
                        // Set form data based on interview type
                        let description = '';
                        if (interview.title.includes('Frontend')) {
                          description = 'React, JavaScript, CSS';
                        } else if (interview.title.includes('Full Stack')) {
                          description = 'React, Node.js, MongoDB';
                        } else if (interview.title.includes('Backend')) {
                          description = 'Java, Spring Boot, SQL';
                        } else {
                          description = 'General Technical Skills';
                        }
                        
                        setFormData({
                          role: interview.title,
                          description: description,
                          experience: interview.experience.split(' ')[0]
                        });
                        setIsLoading(true);
                        generateQuestions();
                      }}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
                    >
                      Retake Interview
                    </button>
                  </div>
                </div>
                
                {interview.feedback && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <h4 className="font-medium text-gray-700 mb-1">Previous Feedback:</h4>
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {interview.feedback.replace(/\*\*/g, '').substring(0, 150)}...
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MockInterview;