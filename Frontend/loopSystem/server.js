import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, "dist");

console.log("DIST PATH:", distPath);
console.log("PORT FROM ENV:", process.env.PORT);

// Serve static
app.use(express.static(distPath));

// Fallback
app.use((req, res) => {
  res.sendFile("index.html", { root: distPath });
});

// ✅ FINAL
app.listen(process.env.PORT || 3000, "0.0.0.0", () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
