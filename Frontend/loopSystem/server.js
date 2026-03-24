import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, "dist");
const indexFile = path.join(distPath, "index.html");

// Debug logs (VERY IMPORTANT)
console.log("DIST PATH:", distPath);
console.log("INDEX EXISTS:", fs.existsSync(indexFile));

// Serve static files
app.use(express.static(distPath));

// Fallback route
app.use((req, res) => {
  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
  } else {
    res.status(500).send("❌ index.html not found in dist folder");
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Frontend running on port ${PORT}`);
});
