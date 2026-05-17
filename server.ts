import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenerativeAI } from "@google/generative-ai";
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

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      
      const tools = [
        {
          functionDeclarations: [
            {
              name: "search_locations_in_database",
              description: "Searches the World Explorer database for existing tourist locations based on a query (name, description, or tags). Returns a list of matching places with names, descriptions, and IDs.",
              parameters: {
                type: "OBJECT",
                properties: {
                  query: { type: "STRING", description: "The search query (e.g., 'temples', 'beaches')." },
                },
                required: ["query"],
              },
            },
            {
              name: "generate_place_info",
              description: "Generates a poetic, engaging description and visual keywords for a place that might not be in our database yet. Use this when the search returns no results or for general info.",
              parameters: {
                type: "OBJECT",
                properties: {
                  placeName: { type: "STRING", description: "The name of the place." },
                },
                required: ["placeName"],
              },
            },
            {
              name: "add_new_location",
              description: "Adds a new location to the World Explorer community platform. Use this ONLY when a user explicitly wants to share or add a place to the archive.",
              parameters: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING", description: "Name of the place." },
                  description: { type: "STRING", description: "Engaging description." },
                  continent: { 
                    type: "STRING", 
                    enum: ["Africa", "Asia", "Europe", "North America", "South America", "Oceania", "Antarctica"],
                    description: "The continent." 
                  },
                  country: { type: "STRING", description: "Country name." },
                  state: { type: "STRING", description: "State or regional area." },
                  imageUrl: { type: "STRING", description: "A valid image URL. If not provided, you MUST suggest using an unsplash keyword query like: https://images.unsplash.com/photo-...?keywords=... " },
                },
                required: ["name", "description", "continent"],
              },
            },
          ],
        },
      ];

      const model = genAI.getGenerativeModel({
        model: "gemini-3-flash-preview",
        systemInstruction: `You are 'World Explorer', a helpful AI travel assistant.
        Your goals:
        1. Help users search for amazing locations in our database.
        2. Provide beautiful, poetic descriptions for any place in the world.
        3. Help users add new places to our shared community archive.
        
        Guidelines:
        - If someone asks for details on a place, first search_locations_in_database.
        - If search yields nothing, use generate_place_info to give them a great answer anyway.
        - Encourage users to 'Add it to the Explorer' if it's a new find.
        - Be poetic, professional, and inspiring. Mention you are powered by Gemini.`,
        tools: tools as any,
      });
      
      const chat = model.startChat({
        history: history || [],
      });

      let result = await chat.sendMessage(message);
      let response = result.response;
      let calls = response.functionCalls();

      // Handle function calls iteratively
      while (calls && calls.length > 0) {
        const toolResults: any[] = [];

        for (const call of calls) {
          try {
            if (call.name === "search_locations_in_database") {
              const { query: searchQuery } = call.args as any;
              // Basic keywords search simulation using Firestore queries
              // We'll search by name prefix as a decent approximation for small datasets
              const snapshot = await db.collection("locations")
                .orderBy("name")
                .startAt(searchQuery)
                .endAt(searchQuery + "\uf8ff")
                .limit(5)
                .get();
              
              const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              toolResults.push({
                functionResponse: {
                  name: call.name,
                  response: { results, count: results.length },
                }
              });
            } else if (call.name === "generate_place_info") {
              const { placeName } = call.args as any;
              const genModel = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
              const prompt = `Provide a poetic, detailed description of "${placeName}". Format as JSON: {"description": "...", "imageKeywords": "...", "continent": "...", "country": "..."}`;
              const genResult = await genModel.generateContent(prompt);
              const text = genResult.response.text().replace(/```json\n?/, '').replace(/```/, '').trim();
              toolResults.push({
                functionResponse: {
                  name: call.name,
                  response: JSON.parse(text),
                }
              });
            } else if (call.name === "add_new_location") {
              const args = call.args as any;
              const locationData = {
                name: args.name,
                description: args.description,
                continent: args.continent,
                country: args.country || "",
                state: args.state || "",
                imageUrl: args.imageUrl || `https://images.unsplash.com/photo-1548013146-72479768b0fd?auto=format&fit=crop&q=80&w=800&keywords=${encodeURIComponent(args.name)}`,
                userId: "ai-assistant",
                userName: "AI Travel Bot",
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
              };
              const docRef = await db.collection("locations").add(locationData);
              toolResults.push({
                functionResponse: {
                  name: call.name,
                  response: { success: true, id: docRef.id, name: args.name },
                }
              });
            }
          } catch (err) {
            console.error(`Tool error (${call.name}):`, err);
            toolResults.push({
              functionResponse: {
                name: call.name,
                response: { error: "Action failed. Please try again." },
              }
            });
          }
        }

        // Send tool results back to the model
        result = await chat.sendMessage(toolResults);
        response = result.response;
        calls = response.functionCalls();
      }

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
