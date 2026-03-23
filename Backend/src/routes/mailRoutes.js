import express from "express";
import multer from "multer";
import { sendLoopingMails } from "../controllers/mailController.js";
import {
  authenticate,
  validateCredentials,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "application/zip",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only images, PDFs, documents, and text files are allowed.",
        ),
        false,
      );
    }
  },
});

// Auth route (public) - uses ADMIN_EMAIL and ADMIN_PASSWORD from .env
router.post("/login", validateCredentials);

// Protected mail routes
router.post(
  "/send-loop",
  authenticate,
  upload.array("attachments", 5), // Max 5 files
  sendLoopingMails,
);

// Health check route
router.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

export default router;
