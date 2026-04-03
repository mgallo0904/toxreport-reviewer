import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const upload = multer({ dest: 'uploads/' });

async function startServer() {
  console.log("STARTING SERVER. API KEY EXISTS:", !!process.env.GEMINI_API_KEY);
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    console.log("Health check. API Key exists:", !!process.env.GEMINI_API_KEY);
    res.json({ status: "ok", hasApiKey: !!process.env.GEMINI_API_KEY });
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
        const filePath = path.join(process.cwd(), req.file.path);
        // Upload to Gemini
        let uploadedFile = await ai.files.upload({
          file: filePath,
          mimeType: req.file.mimetype || 'application/pdf',
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
        const filePath = path.join(process.cwd(), req.file.path);
        fs.unlink(filePath, (err) => {
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
