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

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url}`);
  next();
});

// Serve static files FIRST
app.use(express.static(distPath));

// Handle all routes - THIS IS THE CORRECT WAY FOR EXPRESS 5
// NO app.get("*") - use middleware instead
app.use((req, res) => {
  // Skip if the request is for a file that exists
  if (req.method !== "GET") {
    return res.status(404).json({ error: "Not found" });
  }

  console.log(`Serving index.html for: ${req.url}`);
  res.sendFile(indexPath);
});

// Error handling
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).send("Internal Server Error");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Serving from: ${distPath}`);
});
