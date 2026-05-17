import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { initializeApp, getApps, getApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Initialize Firebase Admin
import firebaseConfig from "./firebase-applet-config.json";

const appAdmin = getApps().length === 0 
  ? initializeApp({ projectId: firebaseConfig.projectId })
  : getApp();

const db = getFirestore(appAdmin, firebaseConfig.firestoreDatabaseId);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Use the modern SDK
  const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY || "",
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/generate-details", async (req, res) => {
    try {
      const { place } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Provide description of "${place}" as JSON: {"description": "...", "imageKeywords": "..."}. ONLY JSON.`,
      });
      let text = response.text.replace(/```json\n?/, '').replace(/```/, '').trim();
      res.json(JSON.parse(text));
    } catch (error: any) {
      res.status(500).json({ error: "Failed to generate" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, "0.0.0.0", () => console.log(`Server on port ${PORT}`));
}

startServer();


