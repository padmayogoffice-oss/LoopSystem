import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, "dist");

console.log("DIST PATH:", distPath);
console.log("PORT FROM ENV:", process.env.PORT);

// IMPORTANT: Make sure dist directory exists
import fs from "fs";
if (!fs.existsSync(distPath)) {
  console.error("ERROR: dist directory not found! Build may have failed.");
  process.exit(1);
}

// Serve static files
app.use(express.static(distPath));

// IMPORTANT: Handle all routes by serving index.html for client-side routing
// This must be the LAST route
app.get("*", (req, res) => {
  console.log(`Serving index.html for path: ${req.path}`);
  res.sendFile(path.join(distPath, "index.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).send("Internal Server Error");
});

// Get PORT from environment or use 3000 as fallback
const PORT = process.env.PORT || 3000;

// Listen on all network interfaces (0.0.0.0) - CRITICAL for Railway
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Serving files from: ${distPath}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || "development"}`);
});
