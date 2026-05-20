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
      const apps = getApps();
      const appAdmin = apps.length === 0 ? initializeApp({
        projectId: firebaseConfig.projectId
      }) : apps[0];
      
      // Try to use the configured database ID first
      if (firebaseConfig.firestoreDatabaseId) {
        try {
          db = getFirestore(appAdmin, firebaseConfig.firestoreDatabaseId);
          console.log(`Using Firestore database: ${firebaseConfig.firestoreDatabaseId}`);
        } catch (e) {
          console.warn(`Failed to connect to DB ${firebaseConfig.firestoreDatabaseId}, falling back to default`);
          db = getFirestore(appAdmin);
        }
      } else {
        db = getFirestore(appAdmin);
      }
    } catch (error) {
      console.error("Firebase Admin initialization failed:", error);
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
    console.log(`Starting database seed check for project: ${firebaseConfig.projectId}, database: ${firebaseConfig.firestoreDatabaseId}`);
    
    // Quick, non-throwing check to see if database is ready to be written to/read by have ADMIN permissions
    try {
      await firestore.collection('locations').limit(1).get();
    } catch (authError: any) {
      console.warn(`[Firestore Seed Note] Server-side direct Firestore access is currently pending IAM permission setup (${authError.message || authError}).
Using secure fallback in-memory stores for background AI features. Client-side client SDK operations will work seamlessly with user credentials.`);
      return;
    }

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
      },
      {
        id: 'machu-picchu',
        name: 'Machu Picchu',
        description: 'A 15th-century Inca citadel located in the Eastern Cordillera of southern Peru on a 2,430-meter mountain ridge.',
        continent: 'South America',
        country: 'Peru',
        state: 'Cusco',
        imageUrl: 'https://images.unsplash.com/photo-1587595431973-160d0d94add1?auto=format&fit=crop&q=80&w=1200',
        userId: 'system',
        userName: 'World Explorer',
        isDeleted: false
      },
      {
        id: 'colosseum',
        name: 'The Colosseum',
        description: 'The largest ancient amphitheatre ever built, and is still the largest standing amphitheatre in the world today, despite its age.',
        continent: 'Europe',
        country: 'Italy',
        state: 'Lazio',
        imageUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&q=80&w=1200',
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

// In-Memory resilient stores to ensure AI actions continue successfully if backend has no direct DB keys
const inMemoryLocations: Array<any> = [
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
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
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
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
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
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
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
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'machu-picchu',
    name: 'Machu Picchu',
    description: 'A 15th-century Inca citadel located in the Eastern Cordillera of southern Peru on a 2,430-meter mountain ridge.',
    continent: 'South America',
    country: 'Peru',
    state: 'Cusco',
    imageUrl: 'https://images.unsplash.com/photo-1587595431973-160d0d94add1?auto=format&fit=crop&q=80&w=1200',
    userId: 'system',
    userName: 'World Explorer',
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'colosseum',
    name: 'The Colosseum',
    description: 'The largest ancient amphitheatre ever built, and is still the largest standing amphitheatre in the world today, despite its age.',
    continent: 'Europe',
    country: 'Italy',
    state: 'Lazio',
    imageUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&q=80&w=1200',
    userId: 'system',
    userName: 'World Explorer',
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const inMemoryReviews: Array<any> = [
  {
    id: 'rev-1',
    locationId: 'taj-mahal',
    rating: 5,
    text: 'Absolutely stunning architectural marvel! Seeing the sunrise here is a once-in-a-lifetime experience.',
    userName: 'Traveler Jane',
    userId: 'user-1',
    createdAt: new Date().toISOString()
  },
  {
    id: 'rev-2',
    locationId: 'taj-mahal',
    rating: 5,
    text: 'A profound symbol of love. The intricate marble inlays and gardens are beautifully kept.',
    userName: 'History Buff',
    userId: 'user-2',
    createdAt: new Date().toISOString()
  },
  {
    id: 'rev-3',
    locationId: 'colosseum',
    rating: 5,
    text: 'Walking through the ancient gladiator arena is magical! Highly recommend a guided tour to understand history.',
    userName: 'Explorer Dan',
    userId: 'user-3',
    createdAt: new Date().toISOString()
  }
];

// Static Pre-populated Cache for standard locations
const staticLocationsCache: Record<string, {
  details: { description: string; imageKeywords: string };
  recommendations: Array<{ name: string; reason: string; imageKeywords: string }>;
  geo: { lat: number; lng: number };
}> = {
  "taj mahal": {
    details: {
      description: "The Taj Mahal is an ivory-white marble mausoleum on the south bank of the Yamuna river in the Indian city of Agra. It was commissioned in 1632 by the Mughal emperor Shah Jahan to house the tomb of his favourite wife, Mumtaz Mahal; it also houses the tomb of Shah Jahan himself.",
      imageKeywords: "taj mahal agra close-up sunrise"
    },
    recommendations: [
      { name: "Humayun's Tomb, Delhi", reason: "A stunning precursor to the Taj Mahal architecture, located in the capital city.", imageKeywords: "humayun's tomb delhi" },
      { name: "Shalimar Bagh, Srinagar", reason: "An exquisite Mughal garden showcasing the artistic height of the empire's landscaping.", imageKeywords: "shalimar bagh srinagar" },
      { name: "Agra Fort", reason: "The majestic red sandstone fortress where Shah Jahan was imprisoned, offering views of the Taj Mahal.", imageKeywords: "agra fort india" }
    ],
    geo: { lat: 27.1751, lng: 78.0421 }
  },
  "hawa mahal": {
    details: {
      description: "Hawa Mahal, also known as 'Palace of Breeze', is an extraordinary five-story palace in Jaipur, India. Built of red and pink sandstone in 1799, its unique honeycomb facade features 953 small windows (jharokhas) designed to allow royal women to observe daily street life without being seen.",
      imageKeywords: "hawa mahal jaipur exterior"
    },
    recommendations: [
      { name: "City Palace, Jaipur", reason: "A beautiful palace complex combining traditional Rajasthani and Mughal architectural styles nearby.", imageKeywords: "city palace jaipur" },
      { name: "Amer Fort, Jaipur", reason: "Located on a hill, this magnificent fort is known for its artistic style elements and panoramic views.", imageKeywords: "amer fort jaipur" },
      { name: "Jantar Mantar, Jaipur", reason: "A collection of nineteen architectural astronomical instruments built by the Rajput king Sawai Jai Singh II.", imageKeywords: "jantar mantar jaipur" }
    ],
    geo: { lat: 26.9239, lng: 75.8267 }
  },
  "varanasi ghats": {
    details: {
      description: "The Varanasi Ghats are spectacular riverfront stone-steps leading to the banks of the sacred River Ganges in Varanasi, India. The city has 84 ghats, most of which are used for bathing and spiritual puja ceremonies, while two are ancient cremation sites.",
      imageKeywords: "varanasi ghats ganga aarti"
    },
    recommendations: [
      { name: "Sarnath, Varanasi", reason: "An essential Buddhist pilgrimage site where Lord Buddha gave his first sermon, located just outside Varanasi.", imageKeywords: "sarnath deer park" },
      { name: "Rishikesh Ghats", reason: "Serene riverbanks on the upper Ganges, famous for yoga, spirituality, and cleaner mountain water.", imageKeywords: "rishikesh ganges river" },
      { name: "Haridwar Ghats", reason: "A holy city on the Ganges where pilgrims gather for ritual baths at Har Ki Pauri.", imageKeywords: "har ki pauri haridwar" }
    ],
    geo: { lat: 25.3018, lng: 83.0090 }
  },
  "kerala backwaters": {
    details: {
      description: "The Kerala Backwaters are a gorgeous system of brackish lagoons, lakes, and rivers lying parallel to the Arabian Sea coast. This serene and biodiverse ecosystem is explored on iconic traditional houseboats, cruising past coco groves, villages, and paddy fields.",
      imageKeywords: "kerala backwaters houseboat"
    },
    recommendations: [
      { name: "Kumarakom Bird Sanctuary", reason: "A beautiful bird sanctuary set in the backwaters of Vembanad Lake, ideal for nature lovers.", imageKeywords: "kumarakom lake birds" },
      { name: "Munnar Tea Gardens", reason: "A spectacular hill station in Kerala famous for its lush tea plantations and misty valleys.", imageKeywords: "munnar tea estate kerala" },
      { name: "Varkala Beach", reason: "Where red cliffs meet the Arabian Sea, offering a quiet coastal escape in southern Kerala.", imageKeywords: "varkala cliff beach" }
    ],
    geo: { lat: 9.4981, lng: 76.3388 }
  },
  "machu picchu": {
    details: {
      description: "Machu Picchu is an impressive 15th-century Inca citadel nestled high in the Andean Mountains of southern Peru. Situated on a ridge above the Sacred Valley, it is celebrated for its precise stonework, astronomical alignments, and breathtaking natural scenery.",
      imageKeywords: "machu picchu ruins mountains sunny"
    },
    recommendations: [
      { name: "Sacred Valley, Peru", reason: "The magnificent Andean valley containing historical towns, agricultural terraces, and Inca ruins.", imageKeywords: "sacred valley peru ruins" },
      { name: "Ollantaytambo", reason: "An Inca archaeological site and town known for some of the best-preserved stonework.", imageKeywords: "ollantaytambo ruins town" },
      { name: "Choquequirao", reason: "A sister city to Machu Picchu, larger but more remote, accessible only via scenic treks.", imageKeywords: "choquequirao ruins mountains" }
    ],
    geo: { lat: -13.1631, lng: -72.5450 }
  },
  "the colosseum": {
    details: {
      description: "The Colosseum, situated in Rome, Italy, is the largest ancient amphitheatre built. Begun under Emperor Vespasian in 72 AD, this massive structure hosted gladiatorial combats, drama, and public spectacles, remaining a monumental icon of imperial Rome.",
      imageKeywords: "colosseum rome sunset ancient"
    },
    recommendations: [
      { name: "Roman Forum", reason: "The historic plaza surrounded by the ruins of several important ancient government buildings next to the Colosseum.", imageKeywords: "roman forum ruins rome" },
      { name: "Pantheon, Rome", reason: "A former Roman temple, now a Catholic church, boasting the world's largest unreinforced concrete dome.", imageKeywords: "pantheon rome plaza" },
      { name: "Pompeii Archaeological Park", reason: "The preserved ancient Roman city buried by the eruption of Mount Vesuvius in AD 79.", imageKeywords: "pompeii ruins vesuvius" }
    ],
    geo: { lat: 41.8902, lng: 12.4922 }
  },
  "colosseum": {
    details: {
      description: "The Colosseum, situated in Rome, Italy, is the largest ancient amphitheatre built. Begun under Emperor Vespasian in 72 AD, this massive structure hosted gladiatorial combats, drama, and public spectacles, remaining a monumental icon of imperial Rome.",
      imageKeywords: "colosseum rome sunset ancient"
    },
    recommendations: [
      { name: "Roman Forum", reason: "The historic plaza surrounded by the ruins of several important ancient government buildings next to the Colosseum.", imageKeywords: "roman forum ruins rome" },
      { name: "Pantheon, Rome", reason: "A former Roman temple, now a Catholic church, boasting the world's largest unreinforced concrete dome.", imageKeywords: "pantheon rome plaza" },
      { name: "Pompeii Archaeological Park", reason: "The preserved ancient Roman city buried by the eruption of Mount Vesuvius in AD 79.", imageKeywords: "pompeii ruins vesuvius" }
    ],
    geo: { lat: 41.8902, lng: 12.4922 }
  }
};

// Dynamic Cache maps for any other user-added places
const dynamicCache = {
  details: new Map<string, any>(),
  recommendations: new Map<string, any>(),
  geo: new Map<string, { lat: number; lng: number }>()
};

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

  // Base helper for Gemini calls with simple retry and fallback model capability
  async function callGemini(callFn: () => Promise<any>, fallbackFn?: () => Promise<any>, maxRetries = 2) {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await callFn();
      } catch (error: any) {
        lastError = error;
        const isQuotaError = error.message?.includes("RESOURCE_EXHAUSTED") || error.status === 429;
        if (!isQuotaError) throw error;
        
        console.warn(`Gemini Quota reached on primary model (Attempt ${i + 1}/${maxRetries}). Waiting...`);
        // Basic exponential backoff if it's a quota error
        await new Promise(resolve => setTimeout(resolve, (i + 1) * 2000));
      }
    }

    if (fallbackFn) {
      console.warn("Attempting fallback Gemini model due to quota exhaustion...");
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await fallbackFn();
        } catch (error: any) {
          lastError = error;
          const isQuotaError = error.message?.includes("RESOURCE_EXHAUSTED") || error.status === 429;
          if (!isQuotaError) throw error;
          
          console.warn(`Gemini Quota reached on fallback model (Attempt ${i + 1}/${maxRetries}). Waiting...`);
          await new Promise(resolve => setTimeout(resolve, (i + 1) * 2000));
        }
      }
    }

    throw lastError;
  }

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", firebase: !!db, gemini: !!process.env.GEMINI_API_KEY });
  });

  app.post("/api/chat", async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is missing on the server." });
      }

      const { message, history, currentUserId, currentUserName } = req.body;
      const firestore = getDb();
      
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

      const explorerName = currentUserName || "Anonymous Explorer";

      const systemInstructions = `You are 'World Explorer AI', an advanced, intelligent, central companion AI chatbot for the World Explorer application.

Key Features & Core Duties:
1. DATA SYNTHESIS: You can synthesize complex travel records, multiple community locations, and historical insights into comprehensive, tailored itineraries or reports.
2. DATA ANALYSIS: You can analyze travel trends, compare destinations, calculate distances, and summarize coordinate formats (latitude/longitude metrics).
3. REAL LIFE LOGIC CHECKS: You can run real-world travel safety checks, coordinate validity checks, packing list logic checks, and alignment checks (e.g. verifying that a city belongs to the correct region, country, or continent).
4. SEARCH & FIND ANYTHING: You can query anything in the World Explorer location archive using the 'search_locations' function, and you can query public web information utilizing Google Search grounding.
5. EXPLAIN ANYTHING: You can explain geographical wonders, architectural marvels, continental histories, local cultures, and app mechanics with pristine clarity.
6. ADD COMMUNITY DISCOVERIES: You can register new locations into the community archive via the 'add_location' tool. Crucially, the creator/explorer name under which the location is saved must appear as the username: '${explorerName}'.

Strict Safety & Privacy Boundaries (MANDATORY & ABSOLUTE):
- LIMITATION TO APP WORK: Your context is strictly bound to the World Explorer app, travel information, maps, geography, coordinates, and assisting the user.
- STRICTLY PROHIBITED FROM ACCESSING PROFILE DETAILS: You cannot access or view any detailed user profile information (such as password, email, phone number, real credentials). You are ONLY allowed to know and output the current user's non-sensitive username: '${explorerName}'.
- NO CREDENTIALS or AUTH WORK: You cannot display, manipulate, reset, or process user accounts, registration tokens, emails, or credentials.
- NO DATA SHARING: You are strictly prohibited from sharing user personal data, search logs, IP information, or other confidential user stats.
- NO DEVELOPER/OWNER REVELATION: You are strictly forbidden from disclosing the App Owner's ID, Owner's profile, user work ID, or the Owner/Developer's name. You cannot assess or view the owner's profile.
- If a user asks questions violating these guidelines, politely decline and steer them back to geographical discoveries.

Tone: Professional, highly responsive, objective, and deeply knowledgeable. 'Powered by Gemini and Google Search'.`;

      let response;
      let currentTools = tools;
      let modelHasWebSearch = true;

      try {
        response = await callGemini(
          () => ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents,
            config: {
              tools: tools as any,
              toolConfig: { includeServerSideToolInvocations: true } as any,
              systemInstruction: systemInstructions
            } as any
          } as any),
          () => ai.models.generateContent({
            model: "gemini-flash-latest",
            contents,
            config: {
              tools: tools as any,
              toolConfig: { includeServerSideToolInvocations: true } as any,
              systemInstruction: systemInstructions
            } as any
          } as any)
        );
      } catch (firstErr: any) {
        console.warn("First chat invocation failed (likely search grounding or quota mismatch). Attempting fallback without third-party web search grounding...", firstErr);
        // Fall back to a standard model call that does not include the tools/grounding config.
        const textOnlyTools = [{
          functionDeclarations: tools[1].functionDeclarations
        }];
        currentTools = textOnlyTools as any;
        modelHasWebSearch = false;

        response = await callGemini(
          () => ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents,
            config: {
              tools: textOnlyTools as any,
              systemInstruction: systemInstructions
            } as any
          } as any),
          () => ai.models.generateContent({
            model: "gemini-flash-latest",
            contents,
            config: {
              tools: textOnlyTools as any,
              systemInstruction: systemInstructions
            } as any
          } as any)
        );
      }

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
              const { query: searchQuery, continent } = call.args as any;
              let results: any[] = [];
              let usingFallback = false;

              if (!firestore) {
                usingFallback = true;
              } else {
                try {
                  let q = firestore.collection("locations").where("isDeleted", "==", false);
                  
                  if (continent) {
                    q = q.where("continent", "==", continent);
                  }

                  if (searchQuery) {
                    q = q.orderBy("name").startAt(searchQuery).endAt(searchQuery + "\uf8ff");
                  } else {
                    q = q.orderBy("createdAt", "desc");
                  }

                  const snapshot = await q.limit(5).get();
                  results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                } catch (e: any) {
                  console.warn(`[Firestore Tool Warning] search_locations failed (${e.message || e}). Falling back to in-memory store.`);
                  usingFallback = true;
                }
              }

              if (usingFallback) {
                results = inMemoryLocations.filter(loc => {
                  if (loc.isDeleted) return false;
                  if (continent && loc.continent !== continent) return false;
                  if (searchQuery) {
                    const term = searchQuery.toLowerCase().trim();
                    return loc.name.toLowerCase().includes(term) || loc.description.toLowerCase().includes(term);
                  }
                  return true;
                }).slice(0, 5);
              }
              
              toolResults.push({
                functionResponse: {
                  name: call.name,
                  response: { results },
                  id: call.id
                }
              });
            } else if (call.name === "get_location_reviews") {
              const firestore = getDb();
              const { locationId } = call.args as any;
              let reviews: any[] = [];
              let usingFallback = false;

              if (!firestore) {
                usingFallback = true;
              } else {
                try {
                  const snapshot = await firestore.collection("reviews")
                    .where("locationId", "==", locationId)
                    .orderBy("createdAt", "desc")
                    .limit(10)
                    .get();
                  
                  reviews = snapshot.docs.map(doc => doc.data());
                } catch (e: any) {
                  console.warn(`[Firestore Tool Warning] get_location_reviews failed (${e.message || e}). Falling back to in-memory store.`);
                  usingFallback = true;
                }
              }

              if (usingFallback) {
                reviews = inMemoryReviews.filter(rev => rev.locationId === locationId)
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 10);
              }

              toolResults.push({
                functionResponse: {
                  name: call.name,
                  response: { reviews, count: reviews.length },
                  id: call.id
                }
              });
            } else if (call.name === "add_location") {
              const firestore = getDb();
              const args = call.args as any;
              const locationData = {
                name: args.name,
                description: args.description,
                continent: args.continent,
                country: args.country || "",
                state: args.state || "",
                imageUrl: args.imageUrl || `https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&q=80&w=800&keywords=${encodeURIComponent(args.name)}`,
                userId: currentUserId || "world-explorer-ai",
                userName: currentUserName || "World Explorer AI",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isDeleted: false
              };

              let id = `loc-${Date.now()}`;
              let usingFallback = false;

              if (!firestore) {
                usingFallback = true;
              } else {
                try {
                  const dbLocationData = {
                    ...locationData,
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp()
                  };
                  const docRef = await firestore.collection("locations").add(dbLocationData);
                  id = docRef.id;
                } catch (e: any) {
                  console.warn(`[Firestore Tool Warning] add_location failed (${e.message || e}). Saving to in-memory store instead.`);
                  usingFallback = true;
                }
              }

              // Save to in-memory array to stay completely in sync
              const localLocation = { id, ...locationData };
              inMemoryLocations.push(localLocation);

              toolResults.push({
                functionResponse: {
                  name: call.name,
                  response: { success: true, id, name: args.name },
                  id: call.id
                }
              });
            }
          } catch (err) {
            toolResults.push({
              // Fallback error
              functionResponse: { name: call.name, response: { error: "Action failed" }, id: call.id }
            });
          }
        }

        contents.push({ role: 'user', parts: toolResults });
        
        response = await callGemini(
          () => ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents,
            config: {
              tools: currentTools as any,
              ...(modelHasWebSearch ? { toolConfig: { includeServerSideToolInvocations: true } } : {})
            } as any
          } as any),
          () => ai.models.generateContent({
            model: "gemini-flash-latest",
            contents,
            config: {
              tools: currentTools as any,
              ...(modelHasWebSearch ? { toolConfig: { includeServerSideToolInvocations: true } } : {})
            } as any
          } as any)
        );
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
          ? "World Explorer AI is catching its breath! We've temporarily hit our Gemini API quota. Please try again in a few moments."
          : error.message || "Failed to get response" 
      });
    }
  });

  app.post("/api/generate-details", async (req, res) => {
    try {
      const { place } = req.body;
      if (!place) {
        return res.status(400).json({ error: "Place name is required" });
      }

      const normalizedPlace = place.toLowerCase().trim();

      // Check static cache
      if (staticLocationsCache[normalizedPlace]) {
        console.log(`[Cache Hit] Static details used for: ${place}`);
        return res.json(staticLocationsCache[normalizedPlace].details);
      }

      // Check dynamic cache
      if (dynamicCache.details.has(normalizedPlace)) {
        console.log(`[Cache Hit] Dynamic details used for: ${place}`);
        return res.json(dynamicCache.details.get(normalizedPlace));
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is missing on the server." });
      }

      console.log(`Generating details for: ${place}`);

      const response = await callGemini(
        () => ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Provide a detailed, highly accurate description of "${place}" including travel significance, historical facts, and key highlights. Feel free to use Google Search to ground the facts. Return as JSON with "description" and "imageKeywords" fields only.`,
          config: {
            tools: [{ googleSearch: {} }],
            toolConfig: { includeServerSideToolInvocations: true } as any,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                description: { type: "STRING" },
                imageKeywords: { type: "STRING" }
              },
              required: ["description", "imageKeywords"]
            }
          } as any
        } as any),
        () => ai.models.generateContent({
          model: "gemini-flash-latest",
          contents: `Provide a detailed, highly accurate description of "${place}" including travel significance. Feel free to use Google Search to ground the facts. Return as JSON with "description" and "imageKeywords" fields only.`,
          config: {
            tools: [{ googleSearch: {} }],
            toolConfig: { includeServerSideToolInvocations: true } as any,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                description: { type: "STRING" },
                imageKeywords: { type: "STRING" }
              },
              required: ["description", "imageKeywords"]
            }
          } as any
        } as any)
      );

      console.log(`Gemini response received for: ${place}`);
      
      let text = response.text;
      if (!text) {
        throw new Error("Empty response from Gemini");
      }

      try {
        const data = JSON.parse(text);
        // Cache the dynamically generated details
        dynamicCache.details.set(normalizedPlace, data);
        res.json(data);
      } catch (parseError) {
        console.error("JSON Parse Error:", text);
        // Fallback for malformed JSON
        const fallbackData = {
          description: text.substring(0, 500),
          imageKeywords: place
        };
        dynamicCache.details.set(normalizedPlace, fallbackData);
        res.json(fallbackData);
      }
    } catch (error: any) {
      console.error("Generate details error:", error);
      const isQuotaError = error.message?.includes("RESOURCE_EXHAUSTED") || error.status === 429;
      res.status(isQuotaError ? 429 : 500).json({ 
        error: isQuotaError ? "World Explorer AI is taking a break (Quota exceeded). Please try again later." : `Generation failed: ${error.message || "Unknown error"}`
      });
    }
  });

  app.post("/api/recommendations", async (req, res) => {
    try {
      const { place } = req.body;
      if (!place) return res.status(400).json({ error: "Place name is required" });

      const normalizedPlace = place.toLowerCase().trim();

      // Check static cache
      if (staticLocationsCache[normalizedPlace]) {
        console.log(`[Cache Hit] Static recommendations used for: ${place}`);
        return res.json(staticLocationsCache[normalizedPlace].recommendations);
      }

      // Check dynamic cache
      if (dynamicCache.recommendations.has(normalizedPlace)) {
        console.log(`[Cache Hit] Dynamic recommendations used for: ${place}`);
        return res.json(dynamicCache.recommendations.get(normalizedPlace));
      }

      const response = await callGemini(
        () => ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Based on "${place}", suggest 3 similar remarkable travel destinations. Use Google Search to find outstanding real travel sites if needed. Return as JSON array of objects with "name", "reason", and "imageKeywords" fields.`,
          config: {
            tools: [{ googleSearch: {} }],
            toolConfig: { includeServerSideToolInvocations: true } as any,
            responseMimeType: "application/json",
            responseSchema: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  reason: { type: "STRING" },
                  imageKeywords: { type: "STRING" }
                },
                required: ["name", "reason", "imageKeywords"]
              }
            }
          } as any
        } as any),
        () => ai.models.generateContent({
          model: "gemini-flash-latest",
          contents: `Based on "${place}", suggest 3 similar remarkable travel destinations. Use Google Search to find outstanding real travel sites if needed. Return as JSON array of objects with "name", "reason", and "imageKeywords" fields.`,
          config: {
            tools: [{ googleSearch: {} }],
            toolConfig: { includeServerSideToolInvocations: true } as any,
            responseMimeType: "application/json",
            responseSchema: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  reason: { type: "STRING" },
                  imageKeywords: { type: "STRING" }
                },
                required: ["name", "reason", "imageKeywords"]
              }
            }
          } as any
        } as any)
      );

      const recommendationsData = JSON.parse(response.text);
      // Cache dynamic recommendations
      dynamicCache.recommendations.set(normalizedPlace, recommendationsData);
      res.json(recommendationsData);
    } catch (error: any) {
      console.error("Recommendations error:", error);
      const isQuotaError = error.message?.includes("RESOURCE_EXHAUSTED") || error.status === 429;
      res.status(isQuotaError ? 429 : 500).json({ 
        error: isQuotaError ? "World Explorer AI is taking a break (Quota exceeded). Please try again later." : "Failed to get recommendations" 
      });
    }
  });

  app.get("/api/weather", async (req, res) => {
    try {
      const { place } = req.query;
      if (!place) return res.status(400).json({ error: "Place is required" });

      const normalizedPlace = (place as string).toLowerCase().trim();
      let lat: number;
      let lng: number;

      // Check static cache
      if (staticLocationsCache[normalizedPlace]) {
        console.log(`[Cache Hit] Static geo coordinates used for: ${place}`);
        const coord = staticLocationsCache[normalizedPlace].geo;
        lat = coord.lat;
        lng = coord.lng;
      }
      // Check dynamic cache
      else if (dynamicCache.geo.has(normalizedPlace)) {
        console.log(`[Cache Hit] Dynamic geo coordinates used for: ${place}`);
        const coord = dynamicCache.geo.get(normalizedPlace)!;
        lat = coord.lat;
        lng = coord.lng;
      }
      else {
        console.log(`Bypassing cache: querying geo coordinates via Gemini for: ${place}`);
        // Get coords for the place using Gemini
        const geoResponse = await callGemini(
          () => ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: `What are the approximate latitude and longitude of "${place}"? Return as JSON with "lat" and "lng" fields.`,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  lat: { type: "NUMBER" },
                  lng: { type: "NUMBER" }
                },
                required: ["lat", "lng"]
              }
            } as any
          } as any),
          () => ai.models.generateContent({
            model: "gemini-flash-latest",
            contents: `What are the approximate latitude and longitude of "${place}"? Return as JSON with "lat" and "lng" fields.`,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  lat: { type: "NUMBER" },
                  lng: { type: "NUMBER" }
                },
                required: ["lat", "lng"]
              }
            } as any
          } as any)
        );

        const geoData = JSON.parse(geoResponse.text);
        lat = geoData.lat;
        lng = geoData.lng;
        // Cache coordinates
        dynamicCache.geo.set(normalizedPlace, { lat, lng });
      }
      
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`;
      const weatherRes = await fetch(weatherUrl);
      const weatherData = await weatherRes.json();
      
      res.json({
        temp: weatherData.current_weather.temperature,
        wind: weatherData.current_weather.windspeed,
        condition: weatherData.current_weather.weathercode, // simplified
      });
    } catch (error) {
      console.error("Weather error:", error);
      res.status(500).json({ error: "Weather data unavailable" });
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: NODE_ENV=${process.env.NODE_ENV}`);
    console.log(`Gemini Key present: ${!!process.env.GEMINI_API_KEY}`);
  });
}

startServer().catch(err => {
  console.error("FAILED TO START SERVER:", err);
});


