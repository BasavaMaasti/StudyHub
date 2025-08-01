import multer from "multer";
import { uploadPDF } from "../config/cloudinary.js";

const memoryStorage = multer.memoryStorage();

const pdfUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  }
});

export default pdfUpload;