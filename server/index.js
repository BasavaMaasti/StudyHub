import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import connectDB from "./database/db.js";
import userRoute from "./routes/user.route.js";
import courseRoute from "./routes/course.route.js";
import mediaRoute from "./routes/media.route.js";
import purchaseRoute from "./routes/purchaseCourse.route.js";
import courseProgressRoute from "./routes/courseProgress.route.js";
import aiInterviewRoute from "./routes/aiInterview.route.js";
import { stripeWebhook } from "./controllers/coursePurchase.controller.js"; // Import webhook handler

dotenv.config();
connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Stripe webhook route - must come BEFORE express.json()
app.post("/api/v1/purchase/webhook", express.raw({ type: "application/json" }), stripeWebhook);

// General middleware
app.use(express.json()); // Must come after the webhook
app.use(cookieParser());
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

// API Routes
app.use("/api/v1/user", userRoute);
app.use("/api/v1/course", courseRoute);
app.use("/api/v1/media", mediaRoute);
app.use("/api/v1/purchase", purchaseRoute); // other purchase routes (not webhook)
app.use("/api/v1/progress", courseProgressRoute);
app.use("/api/v1/aiinterview", aiInterviewRoute);

app.use("/uploads", express.static("uploads"));

// Server start
app.listen(PORT, () => {
  console.log(`Server listening at port ${PORT}`);
});
