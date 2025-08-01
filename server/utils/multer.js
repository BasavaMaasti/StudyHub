import multer from "multer";
import path from "path";

// Storage strategy
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Save files to uploads folder
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.fieldname}${ext}`); // Unique file name
  }
});

// File filter to allow video and image files based on field name
const fileFilter = (req, file, cb) => {
  if (file.fieldname === "video") {
    // Accept only video mimetypes for 'video' field
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only video files are allowed for 'video' field"), false);
    }
  } else if (file.fieldname === "courseThumbnail") {
    // Accept only image mimetypes for 'courseThumbnail' field
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed for 'courseThumbnail' field"), false);
    }
  } else {
    cb(new Error("Unexpected field name"), false);
  }
};

// Multer config with file size limits
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max file size for all files
  }
});

export default upload;
