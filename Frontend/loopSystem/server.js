import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, "dist");

console.log("DIST PATH:", distPath);
console.log("PORT FROM ENV:", process.env.PORT);

// Serve static files
app.use(express.static(distPath));

// Handle API routes - redirect to backend service
// You'll need to set BACKEND_URL in Railway environment variables
app.use("/api", (req, res) => {
  // Redirect to your actual backend URL
  const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";
  const fullUrl = `${backendUrl}${req.originalUrl}`;

  // For a simple redirect (but this won't work for POST requests)
  // Better to use fetch or http-proxy-middleware
  res.redirect(fullUrl);
});

// Fallback for all other routes
app.use((req, res) => {
  res.sendFile("index.html", { root: distPath });
});

// Start server
app.listen(process.env.PORT || 3000, "0.0.0.0", () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
