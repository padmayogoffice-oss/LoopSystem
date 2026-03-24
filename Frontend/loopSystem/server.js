import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, "dist");

console.log("DIST PATH:", distPath);

// Serve static files
app.use(express.static(distPath));

// Fallback
app.use((req, res) => {
  res.sendFile("index.html", { root: distPath });
});

// ✅ CRITICAL FIX HERE
app.listen(process.env.PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
