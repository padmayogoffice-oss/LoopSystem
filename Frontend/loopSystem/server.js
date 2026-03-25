import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, "dist");

console.log("DIST PATH:", distPath);
console.log("PORT FROM ENV:", process.env.PORT);

// Check if dist directory exists
if (!fs.existsSync(distPath)) {
  console.error("ERROR: dist directory not found! Build may have failed.");
  process.exit(1);
}

// Check if index.html exists
const indexPath = path.join(distPath, "index.html");
if (!fs.existsSync(indexPath)) {
  console.error("ERROR: index.html not found in dist directory!");
  process.exit(1);
}

// Add a health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    distExists: true,
    indexPath: indexPath,
  });
});

// Explicitly handle root path
app.get("/", (req, res) => {
  console.log("Serving root path");
  res.sendFile(indexPath);
});

// Serve static files
app.use(express.static(distPath));

// Handle all other routes for client-side routing
app.get("*", (req, res) => {
  // Skip API routes if you have any
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }

  console.log(`Serving index.html for path: ${req.path}`);
  res.sendFile(indexPath);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).send("Internal Server Error");
});

// Get PORT from environment or use 3000 as fallback
const PORT = process.env.PORT || 3000;

// Listen on all network interfaces
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Serving files from: ${distPath}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
});
