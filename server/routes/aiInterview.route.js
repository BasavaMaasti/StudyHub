import express from 'express';
import {
  createInterview,
  evaluateInterview,
  getInterviews
} from '../controllers/aiInterview.controller.js';
import { isAuthenticated, restrictTo } from '../middlewares/isAuthenticated.js';

const router = express.Router();

// Auth protection for all routes
router.use(isAuthenticated);

// Create interview (Student only)
router.post('/', 
  restrictTo('student'),
  // Body validation is now handled in the controller
  createInterview
);

// Get user's interviews
router.get('/', getInterviews);

// Evaluate interview (Student only)
router.post('/evaluate',
  restrictTo('student'),
  // Validation happens in controller
  evaluateInterview
);

export default router;