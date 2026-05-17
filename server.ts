import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenerativeAI } from "@google/generative-ai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      const model = genAI.getGenerativeModel({
        model: "gemini-3-flash-preview",
        systemInstruction: "You are a travel assistant for 'World Explorer', a community travel platform. Help users find amazing places, plan trips, and understand architectural styles. Be professional, inspiring, and concise. Mention that you are powered by Gemini.",
      });
      
      const chat = model.startChat({
        history: history || [],
      });

      const result = await chat.sendMessage(message);
      const response = await result.response;
      res.json({ text: response.text() });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error.message || "Failed to get response from AI" });
    }
  });

  app.post("/api/generate-details", async (req, res) => {
    try {
      const { place } = req.body;
      const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
      
      const prompt = `Provide a poetic, detailed description of the following place: "${place}". 
      Include 3 key architectural or natural highlights. 
      Format the response as a JSON object with two fields: "description" (string) and "imageKeywords" (string, 3-5 words describing the visual essence for a search query).
      Note: return ONLY the JSON object.`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      
      // Basic cleanup in case JSON is wrapped in markdown blocks
      text = text.replace(/```json\n?/, '').replace(/```/, '').trim();

      const data = JSON.parse(text);
      res.json(data);
    } catch (error: any) {
      console.error("Generation Error:", error);
      res.status(500).json({ error: "Failed to generate details" });
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
    // Production: serve static files
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
