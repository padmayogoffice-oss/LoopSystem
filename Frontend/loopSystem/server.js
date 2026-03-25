import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, "dist");

console.log("DIST PATH:", distPath);
console.log("PORT FROM ENV:", process.env.PORT);

// Serve static files
app.use(express.static(distPath));

// Proxy API requests to backend
app.use(
  "/api",
  createProxyMiddleware({
    target: process.env.BACKEND_URL || "http://localhost:3000",
    changeOrigin: true,
    pathRewrite: {
      "^/api": "/api", // Keep the /api prefix
    },
  }),
);

// Fallback for all other routes
app.use((req, res) => {
  res.sendFile("index.html", { root: distPath });
});

// Start server
app.listen(process.env.PORT || 3000, "0.0.0.0", () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
