import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, "dist");

console.log("DIST PATH:", distPath);

// Serve static files
app.use(express.static(distPath));

// ✅ FINAL FIX
app.use((req, res) => {
  res.sendFile("index.html", { root: distPath });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Frontend running on port ${PORT}`);
});
