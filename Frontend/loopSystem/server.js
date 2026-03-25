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

// Serve static files
app.use(express.static(distPath));

// For Express 5, use this syntax for wildcard routes
// This handles all routes by serving index.html (for client-side routing)
app.use((req, res, next) => {
  // Skip API routes - if you have any API endpoints
  if (req.path.startsWith("/api")) {
    return next();
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
  console.log(`✅ Health check: http://localhost:${PORT}/`);
});
