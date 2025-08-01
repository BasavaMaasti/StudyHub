import Stripe from "stripe";
import { Course } from "../models/course.model.js";
import { CoursePurchase } from "../models/coursePurchase.model.js";
import { Lecture } from "../models/lecture.model.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createCheckoutSession = async (req, res) => {
  try {
    const userId = req.id;
    const { courseId } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found!" });
    if (course.coursePrice <= 0) {
      return res.status(400).json({ message: "Invalid course price" });
    }

    const tempPaymentId = `temp_${Date.now()}`;
    const newPurchase = new CoursePurchase({
      courseId,
      userId,
      amount: course.coursePrice,
      status: "pending",
      paymentId: tempPaymentId,
    });
    await newPurchase.save();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: course.courseTitle,
              images: [course.courseThumbnail],
            },
            unit_amount: course.coursePrice * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/course-progress/${courseId}?payment=success`,
      cancel_url: `${process.env.FRONTEND_URL}/course-detail/${courseId}`,
      metadata: {
        courseId: courseId.toString(),
        userId: userId.toString(),
        dbPurchaseId: newPurchase._id.toString(),
      },
    });

    if (!session?.url) {
      return res.status(400).json({
        success: false,
        message: "Error while creating payment session",
      });
    }

    newPurchase.paymentId = session.id;
    await newPurchase.save();

    return res.status(200).json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during checkout",
    });
  }
};

export const stripeWebhook = async (req, res) => {
  let event;
  const sig = req.headers["stripe-signature"];

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("⚠️ Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const dbSession = await mongoose.startSession();
    try {
      await dbSession.startTransaction();

      let purchase;
      let attempts = 0;
      while (!purchase && attempts < 5) {
        purchase = await CoursePurchase.findOne({
          $or: [
            { paymentId: session.id },
            { _id: session.metadata?.dbPurchaseId },
          ],
        }).populate("courseId").session(dbSession);

        if (!purchase) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          attempts++;
        }
      }

      if (!purchase) {
        throw new Error("Purchase record not found");
      }

      if (session.payment_status !== "paid") {
        throw new Error(`Payment status is ${session.payment_status}`);
      }

      purchase.status = "completed";
      purchase.amount = session.amount_total / 100;
      await purchase.save({ session: dbSession });

      if (purchase.courseId?.lectures?.length > 0) {
        await Lecture.updateMany(
          { _id: { $in: purchase.courseId.lectures } },
          { $set: { isPreviewFree: true } },
          { session: dbSession }
        );
      }

      await User.findByIdAndUpdate(
        purchase.userId,
        { $addToSet: { enrolledCourses: purchase.courseId._id } },
        { session: dbSession, new: true }
      );

      await Course.findByIdAndUpdate(
        purchase.courseId._id,
        { $addToSet: { enrolledStudents: purchase.userId } },
        { session: dbSession, new: true }
      );

      await dbSession.commitTransaction();
      console.log("✅ Purchase successfully processed");
    } catch (error) {
      await dbSession.abortTransaction();
      console.error("❌ Transaction aborted:", error.message);
      return res.status(400).json({ error: error.message });
    } finally {
      dbSession.endSession();
    }
  }

  return res.status(200).send();
};

export const getCourseDetailWithPurchaseStatus = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.id;

    const course = await Course.findById(courseId)
      .populate("creator")
      .populate("lectures");

    if (!course) {
      return res.status(404).json({ message: "Course not found!" });
    }

    const purchase = await CoursePurchase.findOne({
      userId,
      courseId,
      status: "completed",
    });

    return res.status(200).json({
      course,
      purchased: purchase
        ? {
            status: purchase.status,
            purchaseDate: purchase.createdAt,
          }
        : null,
    });
  } catch (error) {
    console.error("Course detail error:", error);
    return res.status(500).json({
      message: "Internal server error while fetching course details",
    });
  }
};

export const getAllPurchasedCourse = async (req, res) => {
  try {
    const userId = req.id;
    const purchasedCourses = await CoursePurchase.find({
      userId,
      status: "completed",
    }).populate({
      path: "courseId",
      populate: {
        path: "lectures",
        select: "title duration",
      },
    });

    return res.status(200).json({
      success: true,
      data: purchasedCourses || [],
    });
  } catch (error) {
    console.error("Purchased courses error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching purchases",
    });
  }
};

export const getAllPurchasedCoursesForAdmin = async (req, res) => {
  try {
    const purchases = await CoursePurchase.find({ status: "completed" })
      .populate("courseId", "courseTitle")
      .populate("userId", "fullName email");

    const totalSales = purchases.length;
    const totalRevenue = purchases.reduce((sum, p) => sum + (p.amount || 0), 0);

    return res.status(200).json({
      success: true,
      data: {
        totalSales,
        totalRevenue,
        purchases,
      },
    });
  } catch (error) {
    console.error("Admin purchase summary error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching admin purchases",
    });
  }
};
