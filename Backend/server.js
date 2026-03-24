import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mailRoutes from "./src/routes/mailRoutes.js";

// Initialize dotenv
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../Frontend/dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../Frontend/dist/index.html"));
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use("/api/mail", mailRoutes);

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "Looping Mail System API",
    version: "1.0.0",
    status: "running",
    endpoints: {
      login: "POST /api/mail/login",
      sendLoopMails: "POST /api/mail/send-loop",
      health: "GET /api/mail/health",
    },
  });
});

// Health check route
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.path,
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error("Error stack:", err.stack);

  // Handle multer errors
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File too large. Maximum file size is 10MB",
    });
  }

  if (err.code === "LIMIT_FILE_COUNT") {
    return res.status(400).json({
      success: false,
      message: "Too many files. Maximum 5 files allowed",
    });
  }

  if (err.message === "Invalid file type") {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expired",
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(
    "\x1b[36m%s\x1b[0m",
    "═══════════════════════════════════════════════════",
  );
  console.log("\x1b[32m%s\x1b[0m", "🚀 Looping Mail System Backend Server");
  console.log(
    "\x1b[36m%s\x1b[0m",
    "═══════════════════════════════════════════════════",
  );
  console.log(`📡 Server running on: \x1b[33mhttp://localhost:${PORT}\x1b[0m`);
  console.log(
    `🔧 Environment: \x1b[33m${process.env.NODE_ENV || "development"}\x1b[0m`,
  );
  console.log(
    `📧 Email Service: \x1b[33mZoho Mail (${process.env.ZOHO_USER})\x1b[0m`,
  );
  console.log(`👤 Admin Email: \x1b[33m${process.env.ADMIN_EMAIL}\x1b[0m`);
  console.log(
    "\x1b[36m%s\x1b[0m",
    "═══════════════════════════════════════════════════",
  );
  console.log("\x1b[34m%s\x1b[0m", "Available endpoints:");
  console.log(`  POST   \x1b[33m/api/mail/login\x1b[0m     - Login to system`);
  console.log(
    `  POST   \x1b[33m/api/mail/send-loop\x1b[0m - Send looping emails`,
  );
  console.log(`  GET    \x1b[33m/api/mail/health\x1b[0m    - Health check`);
  console.log(
    "\x1b[36m%s\x1b[0m",
    "═══════════════════════════════════════════════════",
  );
});

// Graceful shutdown
const gracefulShutdown = () => {
  console.log(
    "\n\x1b[33m%s\x1b[0m",
    "Received shutdown signal, closing server...",
  );
  server.close(() => {
    console.log("\x1b[32m%s\x1b[0m", "Server closed successfully");
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error(
      "\x1b[31m%s\x1b[0m",
      "Could not close connections in time, forcefully shutting down",
    );
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("\x1b[31m%s\x1b[0m", "Uncaught Exception:", error);
  gracefulShutdown();
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error(
    "\x1b[31m%s\x1b[0m",
    "Unhandled Rejection at:",
    promise,
    "reason:",
    reason,
  );
  gracefulShutdown();
});

export default app;
