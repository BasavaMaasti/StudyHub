import express from "express";
import {
  createCheckoutSession,
  getAllPurchasedCourse,
  getCourseDetailWithPurchaseStatus,
  stripeWebhook,
  getAllPurchasedCoursesForAdmin, // ✅ Add this import
} from "../controllers/coursePurchase.controller.js";

import { isAuthenticated, restrictTo } from "../middlewares/isAuthenticated.js";

const router = express.Router();

// User purchase routes
router.route("/checkout/create-checkout-session").post(isAuthenticated, createCheckoutSession);
router.route("/webhook").post(express.raw({ type: "application/json" }), stripeWebhook);
router.route("/course/:courseId/detail-with-status").get(isAuthenticated, getCourseDetailWithPurchaseStatus);
router.route("/").get(isAuthenticated, getAllPurchasedCourse);

// ✅ Admin route to get all completed purchases with summary
router
  .route("/admin/all-purchased-courses")
  .get(isAuthenticated, restrictTo("admin","instructor"), getAllPurchasedCoursesForAdmin);

export default router;
