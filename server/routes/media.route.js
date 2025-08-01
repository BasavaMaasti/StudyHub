import express from "express";
import upload from "../utils/multer.js";
import { uploadMedia, deleteMediaFromCloudinary } from "../utils/cloudinary.js";
import fs from "fs";

const router = express.Router();

router.post("/upload-video", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No video file provided"
      });
    }

    // Upload to Cloudinary
    const result = await uploadMedia(req.file.path, {
      resource_type: "video",
      folder: "course-videos",
      chunk_size: 6000000 // 6MB chunks
    });

    // Cleanup temp file - check if file exists first
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(200).json({
      success: true,
      message: "Video uploaded successfully",
      data: {
        url: result.secure_url,
        public_id: result.public_id,
        duration: result.duration
      }
    });

  } catch (error) {
    // Cleanup temp file if exists
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: error.message || "Video upload failed",
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

router.post("/delete-video", async (req, res) => {
  try {
    const { publicId } = req.body;
    if (!publicId) throw new Error("Public ID required");
    
    await deleteMediaFromCloudinary(publicId, { resource_type: "video" });
    
    res.status(200).json({
      success: true,
      message: "Video deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete video"
    });
  }
});

export default router;
