import express from "express";
import { 
  getUserProfile, 
  login, 
  logout, 
  register, 
  updateProfile 
} from "../controllers/user.controller.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js"; // Named import
import upload from "../utils/multer.js";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.get("/logout", logout);



// Protected routes (require authentication)
router.get("/profile", isAuthenticated, getUserProfile);
router.put("/profile/update", isAuthenticated, upload.single("profilePhoto"), updateProfile);

export default router;

