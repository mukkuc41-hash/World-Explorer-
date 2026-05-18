import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { initializeApp, getApps, getApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import firebaseConfig from "./firebase-applet-config.json";

// Initialize Firebase Admin lazily and safely
let db: any = null;

function getDb() {
  if (!db) {
    try {
      // Primary: Use zero-config initialization which is best for Cloud Run environment
      const appAdmin = getApps().length === 0 ? initializeApp() : getApp();
      db = getFirestore(appAdmin, firebaseConfig.firestoreDatabaseId);
    } catch (error) {
      console.warn("Zero-config Firebase initialization failed, trying with explicit projectId:", error);
      try {
        const appAdmin = getApps().length === 0 
          ? initializeApp({ projectId: firebaseConfig.projectId })
          : getApp();
        db = getFirestore(appAdmin, firebaseConfig.firestoreDatabaseId);
      } catch (innerError) {
        console.error("Firebase Admin initialization totally failed:", innerError);
      }
    }
  }
  return db;
}

async function seedDatabase() {
  const firestore = getDb();
  if (!firestore) {
    console.warn("Skipping seed: Firestore not initialized");
    return;
  }

  try {
    console.log(`Starting database seed for project: ${firebaseConfig.projectId}, database: ${firebaseConfig.firestoreDatabaseId}`);
    const seeds = [
      {
        id: 'taj-mahal',
        name: 'Taj Mahal',
        description: 'An ivory-white marble mausoleum on the right bank of the river Yamuna in Agra, Uttar Pradesh, India. A symbol of eternal love and a UNESCO World Heritage site.',
        continent: 'Asia',
        country: 'India',
        state: 'Uttar Pradesh',
        imageUrl: 'https://images.unsplash.com/photo-1564507592333-c60657eea023?auto=format&fit=crop&q=80&w=1200',
        userId: 'system',
        userName: 'World Explorer',
        isDeleted: false
      },
      {
        id: 'hawa-mahal',
        name: 'Hawa Mahal',
        description: 'The "Palace of Winds" in Jaipur, built of red and pink sandstone. Its unique five-floor exterior is akin to a honeycomb with its 953 small windows called jharokhas.',
        continent: 'Asia',
        country: 'India',
        state: 'Rajasthan',
        imageUrl: 'https://images.unsplash.com/photo-1627891395562-f67fce533b66?auto=format&fit=crop&q=80&w=1200',
        userId: 'system',
        userName: 'World Explorer',
        isDeleted: false
      },
      {
        id: 'varanasi-ghats',
        name: 'Varanasi Ghats',
        description: 'The spiritual heart of India, where city life meets the sacred Ganges. These riverfront steps are used for everything from daily prayers to ancient ceremonies.',
        continent: 'Asia',
        country: 'India',
        state: 'Uttar Pradesh',
        imageUrl: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&q=80&w=1200',
        userId: 'system',
        userName: 'World Explorer',
        isDeleted: false
      },
      {
        id: 'kerala-backwaters',
        name: 'Kerala Backwaters',
        description: 'A labyrinthine network of lagoons, lakes, and canals lying parallel to the Arabian Sea coast. Famous for its serene beauty and iconic houseboats.',
        continent: 'Asia',
        country: 'India',
        state: 'Kerala',
        imageUrl: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&q=80&w=1200',
        userId: 'system',
        userName: 'World Explorer',
        isDeleted: false
      }
    ];

    for (const seed of seeds) {
      const docRef = firestore.collection('locations').doc(seed.id);
      const doc = await docRef.get();
      if (!doc.exists) {
        await docRef.set({
          ...seed,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });
        console.log(`Seeded: ${seed.name}`);
      }
    }
  } catch (error) {
    console.error("Database seeding failed:", error);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Start seeding in background - caught to prevent server crash
  seedDatabase().catch(err => console.error("Background seeding error:", err));

  app.use(express.json());

  const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });

  // API routes
  app.post("/api/chat", async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is missing on the server." });
      }

      const { message, history, botType } = req.body;
      const firestore = getDb();
      
      const isSelfAssist = botType === 'self-assist';

      const tools = [
        { googleSearch: {} },
        {
          functionDeclarations: [
            {
              name: "search_locations",
              description: "Search for existing travel destinations in the World Explorer database by name or continent.",
              parameters: {
                type: "OBJECT",
                properties: {
                  query: { type: "STRING", description: "Search terms (name prefix) or specific keywords." },
                  continent: { 
                    type: "STRING", 
                    enum: ["Africa", "Asia", "Europe", "North America", "South America", "Oceania", "Antarctica"],
                    description: "Filter by continent if specified."
                  }
                }
              }
            },
            {
              name: "add_location",
              description: "Add a new travel destination to the World Explorer community archive.",
              parameters: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  description: { type: "STRING" },
                  continent: { 
                    type: "STRING", 
                    enum: ["Africa", "Asia", "Europe", "North America", "South America", "Oceania", "Antarctica"]
                  },
                  country: { type: "STRING" },
                  state: { type: "STRING" },
                  imageUrl: { type: "STRING", description: "Optional image URL." }
                },
                required: ["name", "description", "continent"]
              }
            },
            {
              name: "get_location_reviews",
              description: "Fetch community reviews and insights for a specific location to analyze feedback.",
              parameters: {
                type: "OBJECT",
                properties: {
                  locationId: { type: "STRING" }
                },
                required: ["locationId"]
              }
            },
            {
              name: "trigger_ui_action",
              description: "Trigger specific UI components or actions in the web application interface.",
              parameters: {
                type: "OBJECT",
                properties: {
                  action: { 
                    type: "STRING", 
                    enum: ["open_add_location", "open_search", "view_favorites", "view_world"],
                    description: "The specific UI component or view to open for the user."
                  }
                },
                required: ["action"]
              }
            }
          ]
        }
      ];

      // Build contents for generateContent
      const contents = [
        ...(history || []),
        { role: 'user', parts: [{ text: message }] }
      ];

      const privacyConstraint = "PRIVACY & SECURITY: Strictly no handling of credentials, passwords, or encrypted information. Maintain absolute user privacy. No profile-related work or personal data management.";

      const systemInstructions = isSelfAssist 
        ? `You are 'Self Assist Bot', the intelligent interface guide for World Explorer.
           Key Features & Duties:
           1. INTERACTIVE HELP: Explain how to use the app in a conversational way. 
           2. UI ACTIONS: Use 'trigger_ui_action' to assist users with app features. If they ask "How do I add a place?", trigger 'open_add_location' while explaining the steps.
           3. REAL-TIME FACT CHECKING: Use 'googleSearch' grounding to answer travel-related questions or fact-check destinations in real-time.
           4. MULTI-TOOL LOGIC: You can check local records via 'search_locations' or the web via search to provide comprehensive help.
           
           Limitations:
           - You are ONLY for help with this application and travel places.
           - ${privacyConstraint}
           
           Tone: Extremely helpful, instructional, and 'Powered by Gemini and Google Search'.`
        : `You are 'Traveler Guide', the ultimate AI research assistant for travel destinations.
           Key Features & Duties:
           1. DETAILED PLACE ANALYSIS: Provide in-depth information and analysis about travel destinations ONLY. Your expertise is strictly limited to places.
           2. REAL-TIME RESEARCH & FACT CHECKING: Use 'googleSearch' grounding for absolute accuracy on destination details, current events, and travel tips.
           3. MULTI-TOOL DESTINATION ANALYSIS: Combine 'search_locations' (local archive), 'get_location_reviews' (community sentiment), and 'googleSearch' (web facts).
           4. COMMUNITY ADVOCATE: Encourage users to use 'add_location' for new discoveries based on your research.
           
           Limitations:
           - You are ONLY for detailed information analysis of PLACES.
           - ${privacyConstraint}
           
           Tone: Sophisticated, deeply knowledgeable, authoritative on places. 'Powered by Gemini and Google Search'.`;

      let response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents,
        config: {
          tools: tools as any,
          toolConfig: { includeServerSideToolInvocations: true } as any,
          systemInstruction: systemInstructions
        } as any
      } as any);

      let iterations = 0;
      const triggeredActions: string[] = [];
      
      while (response.functionCalls && iterations < 5) {
        iterations++;
        const toolResults: any[] = [];
        const modelTurn = response.candidates?.[0]?.content;
        
        if (modelTurn) {
          contents.push(modelTurn);
        }

        for (const call of response.functionCalls) {
          try {
            if (call.name === "trigger_ui_action") {
              const { action } = call.args as any;
              triggeredActions.push(action);
              toolResults.push({
                functionResponse: {
                  name: call.name,
                  response: { success: true, note: `UI action '${action}' triggered.` },
                  id: call.id
                }
              });
            } else if (call.name === "search_locations") {
              const firestore = getDb();
              if (!firestore) {
                console.warn("Firestore not available for search_locations");
                toolResults.push({
                  functionResponse: { name: call.name, response: { results: [], note: "Community database currently unavailable. Falling back to global knowledge." }, id: call.id }
                });
                continue;
              }
              const { query: searchQuery, continent } = call.args as any;
              let q = firestore.collection("locations").where("isDeleted", "==", false);
              
              if (continent) {
                q = q.where("continent", "==", continent);
              }

              if (searchQuery) {
                // Prefix search works best with orderBy and startAt/endAt
                q = q.orderBy("name").startAt(searchQuery).endAt(searchQuery + "\uf8ff");
              } else {
                q = q.orderBy("createdAt", "desc");
              }

              const snapshot = await q.limit(5).get();
              const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              
              toolResults.push({
                functionResponse: {
                  name: call.name,
                  response: { results },
                  id: call.id
                }
              });
            } else if (call.name === "get_location_reviews") {
              const firestore = getDb();
              if (!firestore) {
                console.warn("Firestore not available for get_location_reviews");
                toolResults.push({
                  functionResponse: { name: call.name, response: { reviews: [], count: 0, note: "Reviews unavailable." }, id: call.id }
                });
                continue;
              }
              const { locationId } = call.args as any;
              const snapshot = await firestore.collection("reviews")
                .where("locationId", "==", locationId)
                .orderBy("createdAt", "desc")
                .limit(10)
                .get();
              
              const reviews = snapshot.docs.map(doc => doc.data());
              toolResults.push({
                functionResponse: {
                  name: call.name,
                  response: { reviews, count: reviews.length },
                  id: call.id
                }
              });
            } else if (call.name === "add_location") {
              const firestore = getDb();
              if (!firestore) {
                toolResults.push({
                  functionResponse: { name: call.name, response: { error: "Database unavailable. Cannot add discovery at this time." }, id: call.id }
                });
                continue;
              }
              const args = call.args as any;
              const locationData = {
                name: args.name,
                description: args.description,
                continent: args.continent,
                country: args.country || "",
                state: args.state || "",
                imageUrl: args.imageUrl || `https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&q=80&w=800&keywords=${encodeURIComponent(args.name)}`,
                userId: "traveler-guide-ai",
                userName: "Traveler Guide",
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
                isDeleted: false
              };
              const docRef = await firestore.collection("locations").add(locationData);
              toolResults.push({
                functionResponse: {
                  name: call.name,
                  response: { success: true, id: docRef.id, name: args.name },
                  id: call.id
                }
              });
            }
          } catch (err) {
            toolResults.push({
              functionResponse: { name: call.name, response: { error: "Action failed" }, id: call.id }
            });
          }
        }

        contents.push({ role: 'user', parts: toolResults });
        
        response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents,
          config: {
            tools: tools as any,
            toolConfig: { includeServerSideToolInvocations: true } as any
          } as any
        } as any);
      }

      const groundingLinks = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(chunk => ({
        title: chunk.web?.title || chunk.maps?.title || "Source",
        uri: chunk.web?.uri || chunk.maps?.uri 
      })).filter(link => link.uri) || [];

      res.json({ 
        text: response.text,
        links: groundingLinks,
        actions: triggeredActions
      });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      const isQuotaError = error.message?.includes("RESOURCE_EXHAUSTED") || error.status === 429;
      res.status(isQuotaError ? 429 : 500).json({ 
        error: isQuotaError 
          ? "The traveler guide is resting! We've hit our Gemini API quota. Please try again in a few moments."
          : error.message || "Failed to get response" 
      });
    }
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
      const isQuotaError = error.message?.includes("RESOURCE_EXHAUSTED") || error.status === 429;
      res.status(isQuotaError ? 429 : 500).json({ 
        error: isQuotaError ? "Quota exhausted" : "Failed to generate" 
      });
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


