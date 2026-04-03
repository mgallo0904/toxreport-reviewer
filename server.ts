import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";

const upload = multer({ dest: 'uploads/' });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is missing" });
      }

      const ai = new GoogleGenAI({ apiKey });

      try {
        // Upload to Gemini
        let uploadedFile = await ai.files.upload({
          file: req.file.path,
          mimeType: req.file.mimetype || 'application/pdf',
          displayName: req.file.originalname,
        });

        // Wait for processing to complete
        while (uploadedFile.state === 'PROCESSING') {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          uploadedFile = await ai.files.get({ name: uploadedFile.name });
        }

        if (uploadedFile.state === 'FAILED') {
          return res.status(500).json({ error: `File processing failed for ${req.file.originalname}` });
        }

        res.json({ file: uploadedFile });
      } finally {
        // Clean up the local file
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Error deleting local file:", err);
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
