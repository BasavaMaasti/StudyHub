// middleware/isAuthenticated.js
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const isAuthenticated = async (req, res, next) => {
  try {
    // 1. Get token from cookies or Authorization header
    const token = req.cookies.token || 
                 req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required"
      });
    }

    // 2. Verify token (supports both SECRET_KEY and JWT_SECRET)
    const decoded = jwt.verify(token, process.env.SECRET_KEY || process.env.JWT_SECRET);
    
    // 3. Fetch user from database
    const user = await User.findById(decoded.userId || decoded._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // 4. Attach user data to request
    req.user = user;  // Full user object
    req.id = user._id; // Backward compatibility
    next();

  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({
      success: false,
      message: error.message || "Invalid or expired token"
    });
  }
};

// Role-based access control (optional but recommended)
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to perform this action"
      });
    }
    next();
  };
};