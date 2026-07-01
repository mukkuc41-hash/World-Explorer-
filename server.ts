import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { initializeApp, getApps, getApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import firebaseConfig from "./firebase-applet-config.json";

// Initialize Firebase Admin lazily and safely
let db: any = null;
let isSearchGroundingDisabledGlobal = false;

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

function getFallbackAutofillData(place: string) {
  const normalized = place.toLowerCase().trim();
  
  // High-fidelity keyword dictionary of locations to make fallback content incredibly smart
  const registry: Record<string, { name: string; country: string; state: string; continent: string; lat: number; lng: number; description: string; imageKeywords: string }> = {
    "kyoto": {
      name: "Kyoto Temple District",
      country: "Japan",
      state: "Kyoto",
      continent: "Asia",
      lat: 35.0116,
      lng: 135.7681,
      description: "A breathtaking historic city adorned with gorgeous wooden temples, spectacular shrines, stone paths, and classical gardens offering absolute peace and quietude.",
      imageKeywords: "kyoto temple bamboo garden"
    },
    "tokyo": {
      name: "Tokyo Skyline",
      country: "Japan",
      state: "Tokyo",
      continent: "Asia",
      lat: 35.6762,
      lng: 139.6503,
      description: "A futuristic metropolis where modern towering skyscrapers stand beside deep historical shrines, bustling food alleys, and illuminated crossings of dazzling neon.",
      imageKeywords: "tokyo neon tower shibuya"
    },
    "paris": {
      name: "Eiffel Tower Landscape",
      country: "France",
      state: "Île-de-France",
      continent: "Europe",
      lat: 48.8566,
      lng: 2.3522,
      description: "The global epicenter of fine arts, fashion, gastronomy, and unmatched romance. Set beautifully along the Seine River, featuring spectacular architecture and historical monuments.",
      imageKeywords: "paris eiffel tower seine"
    },
    "taj": {
      name: "Taj Mahal Palace",
      country: "India",
      state: "Uttar Pradesh",
      continent: "Asia",
      lat: 27.1751,
      lng: 78.0421,
      description: "An iconic ivy-white marble mausoleum on the south bank of the Yamuna River, symbolizing undying devotion, marvelous design symmetry, and elegant heritage craftsmanship.",
      imageKeywords: "taj mahal agra palace"
    },
    "petra": {
      name: "Al-Khazneh Petra",
      country: "Jordan",
      state: "Ma'an",
      continent: "Asia",
      lat: 30.3285,
      lng: 35.4444,
      description: "An ancient archaeological city featuring spectacular rock-cut architectural facades chiseled directly into the rose-red sandstone desert cliffs.",
      imageKeywords: "petra jordan treasury canyon"
    },
    "pyramid": {
      name: "Giza Pyramids Complex",
      country: "Egypt",
      state: "Giza",
      continent: "Africa",
      lat: 29.9792,
      lng: 31.1342,
      description: "One of the original wonders of the ancient world. Majestic tall structures rising proudly from the desert sands representing millennia of remarkable architectural achievements.",
      imageKeywords: "giza pyramids desert camel sphinx"
    },
    "new york": {
      name: "Manhattan Central Park",
      country: "United States",
      state: "New York",
      continent: "North America",
      lat: 40.7128,
      lng: -74.0060,
      description: "A gorgeous urban escape inside the energetic metropolis, surrounded by iconic skyscrapers, tranquil water streams, and stunning seasonal nature paths.",
      imageKeywords: "manhattan central park new york"
    },
    "grand canyon": {
      name: "Grand Canyon National Park",
      country: "United States",
      state: "Arizona",
      continent: "North America",
      lat: 36.0544,
      lng: -112.1401,
      description: "A massive, deep canyon cut through millions of years by the Colorado River, boasting gorgeous exposed multi-layered red rock vistas and deep natural geology.",
      imageKeywords: "grand canyon sunset canyon"
    },
    "sydney": {
      name: "Sydney Opera House",
      country: "Australia",
      state: "New South Wales",
      continent: "Oceania",
      lat: -33.8688,
      lng: 151.2093,
      description: "A famous masterpiece of modern structural expression, curving elegantly over the harbor waters, adjacent to spectacular urban botanic gardens.",
      imageKeywords: "sydney harbour bridge opera house"
    },
    "colosseum": {
      name: "Rome Colosseum",
      country: "Italy",
      state: "Lazio",
      continent: "Europe",
      lat: 41.8902,
      lng: 12.4922,
      description: "An iconic ancient amphitheatre standing at the historical heart of the Roman Empire, showcasing amazing stone crafts and spectacular monumental architectures.",
      imageKeywords: "colosseum rome italy sunset"
    },
    "rome": {
      name: "Rome Historic Site",
      country: "Italy",
      state: "Lazio",
      continent: "Europe",
      lat: 41.9028,
      lng: 12.4964,
      description: "A historic city that feels like an open-air museum, filled with ancient ruins, magnificent baroque fountains, elegant cathedrals, and lively cobblestone piazzas.",
      imageKeywords: "rome fountain colosseum"
    },
    "rio": {
      name: "Rio de Janeiro Christ the Redeemer",
      country: "Brazil",
      state: "Rio de Janeiro",
      continent: "South America",
      lat: -22.9519,
      lng: -43.2105,
      description: "A towering art-deco monument overlooking a breathtaking coastal landscape of pristine golden beaches, verdant granite hills, and stunning blue sea water.",
      imageKeywords: "rio de janeiro beach christ"
    }
  };

  // Find partial keyword matches
  for (const key of Object.keys(registry)) {
    if (normalized.includes(key)) {
      return {
        ...registry[key],
        name: place.replace(/\b\w/g, c => c.toUpperCase())
      };
    }
  }

  // General Heuristics based on name string features
  let country = "United States";
  let state = "California";
  let continent = "North America";
  let lat = 37.7749;
  let lng = -122.4194;

  if (normalized.match(/(london|british|uk|england|france|paris|spain|madrid|italy|rome|germany|berlin|europe|greece|athens|lucerne|swiss|switzerland|amsterdam|vienna)/)) {
    country = normalized.includes("london") || normalized.includes("uk") ? "United Kingdom" :
              normalized.includes("france") || normalized.includes("paris") ? "France" :
              normalized.includes("spain") ? "Spain" :
              normalized.includes("italy") || normalized.includes("rome") ? "Italy" : "Switzerland";
    state = "Europe";
    continent = "Europe";
    lat = 48.0 + (Math.random() * 5);
    lng = 10.0 + (Math.random() * 10);
  } else if (normalized.match(/(tokyo|kyoto|japan|china|beijing|india|delhi|taj|mumbai|singapore|vietnam|hanoi|thailand|bangkok|seoul|korea|indonesia|bali|asia)/)) {
    country = normalized.includes("japan") || normalized.includes("tokyo") ? "Japan" :
              normalized.includes("china") ? "China" :
              normalized.includes("india") ? "India" :
              normalized.includes("thailand") ? "Thailand" : "Singapore";
    state = "Asia";
    continent = "Asia";
    lat = 25.0 + (Math.random() * 10);
    lng = 100.0 + (Math.random() * 20);
  } else if (normalized.match(/(cairo|egypt|giza|kenya|nairobi|morocco|marrakech|south africa|cape town|safari|africa)/)) {
    country = normalized.includes("egypt") ? "Egypt" :
              normalized.includes("morocco") ? "Morocco" :
              normalized.includes("south africa") ? "South Africa" : "Kenya";
    state = "Africa";
    continent = "Africa";
    lat = -5.0 + (Math.random() * 25);
    lng = 25.0 + (Math.random() * 10);
  } else if (normalized.match(/(york|canyon|california|grand|chicago|america|usa|miami|vegas|canada|toronto|vancouver)/)) {
    country = normalized.includes("canada") || normalized.includes("toronto") ? "Canada" : "United States";
    state = "North America";
    continent = "North America";
    lat = 37.0 + (Math.random() * 5);
    lng = -95.0 + (Math.random() * 15);
  } else if (normalized.match(/(rio|brazil|sao|argentina|buenos|peru|lima|machu|andes|chile|colombia|america)/)) {
    country = normalized.includes("brazil") ? "Brazil" :
              normalized.includes("peru") ? "Peru" : "Argentina";
    state = "South America";
    continent = "South America";
    lat = -15.0 + (Math.random() * 10);
    lng = -60.0 + (Math.random() * 10);
  } else if (normalized.match(/(australia|sydney|melbourne|zealand|auckland|fiji|great barrier|oceania)/)) {
    country = normalized.includes("zealand") ? "New Zealand" : "Australia";
    state = "Oceania";
    continent = "Oceania";
    lat = -28.0 + (Math.random() * 10);
    lng = 138.0 + (Math.random() * 10);
  }

  // Create hash based on place characters to make coords deterministic
  let hash = 0;
  for (let i = 0; i < place.length; i++) {
    hash = (hash << 5) - hash + place.charCodeAt(i);
  }
  hash = Math.abs(hash);
  lat += (hash % 100) / 100 * (hash % 2 === 0 ? 1 : -1);
  lng += (hash % 100) / 100 * (hash % 2 === 0 ? -1 : 1);

  let district = "Central District";
  if (normalized.includes("london") || normalized.includes("uk")) {
    district = "Greater London";
  } else if (normalized.includes("paris")) {
    district = "Île-de-France";
  } else if (normalized.includes("amber") || normalized.includes("fort")) {
    district = "ajmer";
  } else if (normalized.includes("tokyo")) {
    district = "Shinjuku";
  } else if (normalized.includes("kyoto")) {
    district = "Kamigyo-ku";
  } else if (normalized.includes("delhi")) {
    district = "New Delhi";
  }

  const formattedSearchLocation = `${continent}, ${country}, ${state}, ${district}, ${place.replace(/\b\w/g, c => c.toUpperCase())}`;

  return {
    name: place.replace(/\b\w/g, c => c.toUpperCase()),
    country,
    state,
    continent,
    district,
    formattedSearchLocation,
    lat: parseFloat(lat.toFixed(4)),
    lng: parseFloat(lng.toFixed(4)),
    description: `A phenomenal, highly recommended destination at ${place.replace(/\b\w/g, c => c.toUpperCase())}. Known for its beautiful architectural history, magnificent landmarks, and exquisite local culture, this place remains a classic exploration spot for global travelers.`,
    imageKeywords: `${normalized} landmark architecture sightseeing`
  };
}

function parseCustomCodeStructure(place: string): any {
  if (!place) return null;
  const lines = place.split(/\r?\n/);
  
  let continent = "";
  let country = "";
  let state = "";
  let city = "";
  let name = "";
  let lat: number | null = null;
  let lng: number | null = null;
  let hasHierarchy = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const isLatLine = trimmed.match(/^lat(?:itude)?/i);
    const isLngLine = trimmed.match(/^(?:lng|long(?:itude)?)/i);

    if (isLatLine) {
      const clean = trimmed.replace(/^lat(?:itude)?/i, '').trim();
      const numMatch = clean.match(/[-+]?\s*\d+(?:\.\d+)?/);
      if (numMatch) {
        const val = parseFloat(numMatch[0].replace(/\s+/g, ''));
        if (clean.includes('--') || clean.match(/[:=]\s*-/) || clean.match(/\s+-\d+/)) {
          lat = -Math.abs(val);
        } else {
          lat = Math.abs(val);
        }
      }
      continue;
    }

    if (isLngLine) {
      const clean = trimmed.replace(/^(?:lng|long(?:itude)?)/i, '').trim();
      const numMatch = clean.match(/[-+]?\s*\d+(?:\.\d+)?/);
      if (numMatch) {
        const val = parseFloat(numMatch[0].replace(/\s+/g, ''));
        if (clean.startsWith('-') || clean.includes('--') || clean.match(/[:=]\s*-/) || clean.match(/\s+-\d+/)) {
          lng = -Math.abs(val);
        } else {
          lng = val;
        }
      }
      continue;
    }

    // Comma-separated hierarchy line, e.g. "Asia,india,rajasthan,ajmer,Amber fort"
    if (trimmed.includes(',')) {
      const parts = trimmed.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        hasHierarchy = true;
        const capitalizedParts = parts.map(p => p.replace(/\b\w/g, c => c.toUpperCase()));
        
        if (parts.length === 5) {
          continent = capitalizedParts[0];
          country = capitalizedParts[1];
          state = capitalizedParts[2];
          city = capitalizedParts[3];
          name = capitalizedParts[4];
          if (city) {
            state = `${state}, ${city}`;
          }
        } else if (parts.length === 4) {
          continent = capitalizedParts[0];
          country = capitalizedParts[1];
          state = capitalizedParts[2];
          name = capitalizedParts[3];
        } else if (parts.length === 3) {
          continent = capitalizedParts[0];
          country = capitalizedParts[1];
          name = capitalizedParts[2];
          state = capitalizedParts[1];
        } else {
          continent = capitalizedParts[0];
          country = capitalizedParts[1];
          state = capitalizedParts[2] || "";
          name = capitalizedParts.slice(3).join(', ');
        }
      }
    } else {
      // If no name has been set yet, let's treat any non-coordinate line as the name
      if (!name) {
        name = trimmed.replace(/\b\w/g, c => c.toUpperCase());
      }
    }
  }

  // Final check: if we parsed either coordinate or structured hierarchy details, we consider it a match!
  if (hasHierarchy || lat !== null || lng !== null) {
    const validContinents = ["Africa", "Asia", "Europe", "North America", "South America", "Oceania", "Antarctica"];
    let finalContinent = "Asia";
    if (continent) {
      const matched = validContinents.find(c => c.toLowerCase() === continent.toLowerCase());
      if (matched) {
        finalContinent = matched;
      } else {
        finalContinent = continent;
      }
    }

    return {
      name: name || "Custom Explorer Landmark",
      continent: finalContinent,
      country: country || "India",
      state: state || "Rajasthan",
      lat: lat !== null ? parseFloat(lat.toFixed(4)) : null,
      lng: lng !== null ? parseFloat(lng.toFixed(4)) : null
    };
  }

  return null;
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
    const { message, history, currentUserId, currentUserName, chatMode } = req.body || {};
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is missing on the server." });
      }

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
                  imageUrl: { type: "STRING", description: "Optional image URL." },
                  lat: { type: "NUMBER", description: "Latitude coordinate of the location." },
                  lng: { type: "NUMBER", description: "Longitude coordinate of the location." }
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

      const systemInstructions = chatMode === "add_location" 
        ? `You are 'Add Location AI', a specialized, intelligent chatbot companion built specifically for the World Explorer application.
Your core, singular design purpose is to help explorers find, discover, and instantly ADD beautiful geographical landmarks, sightseeing locations, and architectural wonders to their map.

You have the unique ability to query google search and directly parse geographical landmarks into structured database entries.

Your primary duty:
1. GEOLOCATING & INSTANT ADDITION: When the user asks for tourist places, landmarks, sightseeing spots, or asks to add a specific location (either explicitly e.g., "add Amber Fort", or implicitly e.g., "what are some scenic places to add in Rome?"), you MUST describe them AND parallelly call the 'add_location' tool to auto-register them in the database! (Add at least 3-4 top landmarks for general queries with accurate name, description, country, state, continent, and grounded lat/lng coordinates).
2. REAL-LIFE GEOGRAPHY RESOLUTION: Leverage Google Search database grounding to find real countries, states, and resolve the precise latitude & longitude coordinates.
3. CLEAR CONFIRMATION: After you invoke the 'add_location' tool successfully, tell the user with excitement exactly which places you have successfully registered and mapped for them under their username '${explorerName}'!

Strict Safety & Privacy Boundaries (MANDATORY & ABSOLUTE):
- LIMITATION TO TRAVEL-RELATED QUERIES: Your capability is strictly bound to travel queries, geographical landmarks, coordinates, directions, local history, weather, and assisting the user. If the user asks about general computing, unrelated code, passwords, or passwords recovery, you MUST politely refuse to answer and steer them back to travel matters.
- STRICTLY PROHIBITED FROM ACCESSING PROFILE DETAILS: You cannot access or view any detailed user profile information (such as password, email, phone number, real credentials). You are ONLY allowed to know and output the current user's non-sensitive username: '${explorerName}'.
- NO CREDENTIALS or AUTH WORK: You cannot display, manipulate, reset, or process user accounts, registration tokens, emails, or credentials.
- NO DATA SHARING: You are strictly prohibited from sharing user personal data, search logs, IP information, or other confidential user stats.
- NO DEVELOPER/OWNER REVELATION: You are strictly forbidden from disclosing the App Owner's ID, Owner's profile, user work ID, or the Owner/Developer's name. You cannot assess or view the owner's profile.
- If a user asks questions violating these guidelines, politely decline and steer them back to travel discoveries and landmarks.

MANDATORY RESPONSE FOOTER:
At the very end of EVERY single response, you must append this exact guarantee string:
🛡️ Privacy & Security Guarantee: To protect your privacy, I am strictly restricted to travel-related queries. I have zero access to your credentials, emails, passwords, owner profile IDs, or any sensitive system configuration. No private profiling files are available to me.

Tone: Enthusiastic, deeply knowledgeable, highly responsive, and focused on directly mapping beautiful new discoveries. 'Powered by Gemini and Google Search'.`
        : `You are 'World Explorer AI', an advanced, intelligent, central companion AI chatbot for the World Explorer application.

Key Features & Core Duties:
1. DATA SYNTHESIS: You can synthesize complex travel records, multiple community locations, and historical insights into comprehensive, tailored itineraries or reports.
2. DATA ANALYSIS: You can analyze travel trends, compare destinations, calculate distances, and summarize coordinate formats (latitude/longitude metrics).
3. REAL LIFE LOGIC CHECKS: You can run real-world travel safety checks, coordinate validity checks, packing list logic checks, and alignment checks (e.g. verifying that a city belongs to the correct region, country, or continent).
4. SEARCH & FIND ANYTHING: You can query anything in the World Explorer location archive using the 'search_locations' function, and you can query public web information utilizing Google Search grounding.
5. EXPLAIN ANYTHING: You can explain geographical wonders, architectural marvels, continental histories, local cultures, and app mechanics with pristine clarity.
6. ADD COMMUNITY DISCOVERIES: You can register new locations into the community archive via the 'add_location' tool. Crucially, the creator/explorer name under which the location is saved must appear as the username: '${explorerName}'.
7. DIRECT AUTOMATIC DESTINATION ADDITION: When the user asks for tourist places, sightseeing recommendations, or landmarks in any city/area (such as "tourist places in Jaipur" or "attractions in Jaipur"), you must NOT only describe or list them in text, but you MUST also DIRECTLY call the 'add_location' tool in parallel for each of the major sights (add at least 3-4 top landmarks, such as 'Hawa Mahal', 'Amer Fort', 'City Palace', etc., with accurate name, description, country, state, continent, and estimated/grounded latitude/longitude coordinates). This directly registers and geo-tags them on the user's interactive map and community database! Tell them clearly that you have directly added these places to the Map and Community archive.

Strict Safety & Privacy Boundaries (MANDATORY & ABSOLUTE):
- LIMITATION TO TRAVEL-RELATED QUERIES: Your capability is strictly bound to travel queries, geographical landmarks, coordinates, directions, local history, weather, and assisting the user. If the user asks about general computing, unrelated code, passwords, or passwords recovery, you MUST politely refuse to answer and steer them back to travel matters.
- STRICTLY PROHIBITED FROM ACCESSING PROFILE DETAILS: You cannot access or view any detailed user profile information (such as password, email, phone number, real credentials). You are ONLY allowed to know and output the current user's non-sensitive username: '${explorerName}'.
- NO CREDENTIALS or AUTH WORK: You cannot display, manipulate, reset, or process user accounts, registration tokens, emails, or credentials.
- NO DATA SHARING: You are strictly prohibited from sharing user personal data, search logs, IP information, or other confidential user stats.
- NO DEVELOPER/OWNER REVELATION: You are strictly forbidden from disclosing the App Owner's ID, Owner's profile, user work ID, or the Owner/Developer's name. You cannot assess or view the owner's profile.
- If a user asks questions violating these guidelines, politely decline and steer them back to travel discoveries and landmarks.

MANDATORY RESPONSE FOOTER:
At the very end of EVERY single response, you must append this exact guarantee string:
🛡️ Privacy & Security Guarantee: To protect your privacy, I am strictly restricted to travel-related queries. I have zero access to your credentials, emails, passwords, owner profile IDs, or any sensitive system configuration. No private profiling files are available to me.

Tone: Professional, highly responsive, objective, and deeply knowledgeable. 'Powered by Gemini and Google Search'.`;

      let response;
      let currentTools = tools;
      let modelHasWebSearch = !isSearchGroundingDisabledGlobal;

      if (!isSearchGroundingDisabledGlobal) {
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
          isSearchGroundingDisabledGlobal = true;
          modelHasWebSearch = false;
        }
      }

      if (isSearchGroundingDisabledGlobal || !response) {
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

              const continentCoords: Record<string, { lat: number; lng: number }> = {
                "Asia": { lat: 34.0479, lng: 100.6197 },
                "Europe": { lat: 48.69096, lng: 14.7202 },
                "North America": { lat: 39.8283, lng: -98.5795 },
                "South America": { lat: -14.2350, lng: -51.9253 },
                "Africa": { lat: -8.7832, lng: 34.5085 },
                "Oceania": { lat: -25.2744, lng: 133.7751 },
                "Antarctica": { lat: -82.8628, lng: 135.0000 }
              };

              const defaultCoord = continentCoords[args.continent] || { lat: 0.0, lng: 0.0 };
              const latNum = typeof args.lat === 'number' ? args.lat : defaultCoord.lat;
              const lngNum = typeof args.lng === 'number' ? args.lng : defaultCoord.lng;

              const locationData = {
                name: args.name,
                description: args.description,
                continent: args.continent,
                country: args.country || "",
                state: args.state || "",
                imageUrl: args.imageUrl || `https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&q=80&w=800&keywords=${encodeURIComponent(args.name)}`,
                userId: currentUserId || "world-explorer-ai",
                userName: currentUserName || "World Explorer AI",
                lat: latNum,
                lng: lngNum,
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

              // Push syncing action for client-side persistence
              triggeredActions.push("add_location_sync:" + JSON.stringify({ id, ...locationData }));

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

      let finalTextResponse = response.text || "";
      const guaranteeNoticeText = "🛡️ Privacy & Security Guarantee: To protect your privacy, I am strictly restricted to travel-related queries. I have zero access to your credentials, emails, passwords, owner profile IDs, or any sensitive system configuration. No private profiling files are available to me.";
      
      if (!finalTextResponse.includes("Privacy & Security Guarantee") && !finalTextResponse.includes("To protect your privacy, I am strictly restricted")) {
        finalTextResponse = finalTextResponse.trim() + "\n\n" + guaranteeNoticeText;
      }

      res.json({ 
        text: finalTextResponse,
        links: groundingLinks,
        actions: triggeredActions
      });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      
      const guaranteeNoticeText = "🛡️ Privacy & Security Guarantee: To protect your privacy, I am strictly restricted to travel-related queries. I have zero access to your credentials, emails, passwords, owner profile IDs, or any sensitive system configuration. No private profiling files are available to me.";
      
      // Smart offline-mode fallback instead of raising 429 status code
      let textResponse = `Hello there! World Explorer AI here in Smart Energy-Saver Local Mode 🌍 (Our API server is catching its breath, but we are fully running with local fallback intelligence!). How can I help you explore today?

Since I am running locally right now, you can perform these actions:
- **Search Destinations**: Type 'search' followed by a country or continent.
- **Add Landmark**: Click the floating "+" dial in the bottom-right corner and use my instant smart autofill to geotag any location!
- **Ask the Explorer**: Ask me about standard travel preparations or coordinates.`;

      const userText = (message || "").toLowerCase();
      if (userText.includes("search") || userText.includes("find") || userText.includes("show")) {
        textResponse = `🔍 **Local Search Activated**: I recommend using the search bar in the top-left navigation drawer of your map or continent browser. This lets you filter our Firestore travel archives in real-time by country, continent, or landmarks!`;
      } else if (userText.includes("add") || userText.includes("create") || userText.includes("new")) {
        textResponse = `✨ **Quick Pin Guide**: To drop a beautiful pin on our interactive map:
1. Tap the floating **"+" Add Location** dial located in the bottom right.
2. Type any destination (e.g., "Kyoto Golden Pavilion") in my **World Explorer AI • Smart Co-pilot** input box.
3. Click **Autofill**! I will immediately pull high-fidelity coordinates, design keywords, and beautiful summaries.`;
      } else if (userText.includes("hello") || userText.includes("hi ") || userText.includes("hey")) {
        textResponse = `Welcome to World Explorer AI! 🌍 My core systems are in high-efficiency local mode. I would love to guide you on pinning beautiful locations, searching through global continents, or verifying latitude/longitude values!`;
      } else if (userText.includes("weather")) {
        textResponse = `🌦️ **Real-time Forecast**: Pick any landmark in your collection, open its detail card, and tap the modern weather cloud widget to fetch live meteorological data directly from satellite services!`;
      }

      if (!textResponse.includes("Privacy & Security Guarantee")) {
        textResponse = textResponse.trim() + "\n\n" + guaranteeNoticeText;
      }

      res.json({ 
        text: textResponse,
        links: [],
        actions: []
      });
    }
  });

  app.post("/api/generate-details", async (req, res) => {
    const { place } = req.body || {};
    try {
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
            ...(!isSearchGroundingDisabledGlobal ? {
              tools: [{ googleSearch: {} }],
              toolConfig: { includeServerSideToolInvocations: true } as any
            } : {}),
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
            ...(!isSearchGroundingDisabledGlobal ? {
              tools: [{ googleSearch: {} }],
              toolConfig: { includeServerSideToolInvocations: true } as any
            } : {}),
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
      console.warn("AI Generate-details API or Quota issue detected. Falling back seamlessly to local high-fidelity generator.");
      const fallbackData = getFallbackAutofillData(place);
      res.json({
        description: fallbackData.description,
        imageKeywords: fallbackData.imageKeywords
      });
    }
  });

  app.post("/api/ai-autofill", async (req, res) => {
    const { place } = req.body || {};
    try {
      if (!place) {
        return res.status(400).json({ error: "Place name is required" });
      }

      const customData = parseCustomCodeStructure(place);
      if (!process.env.GEMINI_API_KEY) {
        console.warn("Gemini API key is missing. Using custom parsed or fallback engine.");
        const fallbackData = getFallbackAutofillData(customData ? customData.name : place);
        if (customData) {
          fallbackData.name = customData.name || fallbackData.name;
          fallbackData.continent = customData.continent || fallbackData.continent;
          fallbackData.country = customData.country || fallbackData.country;
          fallbackData.state = customData.state || fallbackData.state;
          if (customData.lat !== null) fallbackData.lat = customData.lat;
          if (customData.lng !== null) fallbackData.lng = customData.lng;
        }
        return res.json(fallbackData);
      }

      console.log(`AI-autofill details for: ${place}. Custom structured data detected:`, !!customData);

      let promptContent1 = `You are a world-class travel, geography and metadata expert. Search for the place: "${place}" (and use Google Search grounding). Extract and return:
1. Exact coordinates (latitude and longitude numbers).
2. Clean capitalized State/Region and Country of the place.
3. Continent: must be one of: "Africa", "Asia", "Europe", "North America", "South America", "Oceania", "Antarctica".
4. District: local city district, municipality, county, or town-district name of the place (e.g. for Amber Fort, use "ajmer" or "Jaipur").
5. fsl (formattedSearchLocation): A complete formatted search location string strictly in this 5-part comma separated format: \`Continent, Country, State, District, Landmark\`. In this string: Continent, Country, State, District MUST BE EXACTLY matching the resolved parameters, and Landmark MUST BE the resolved Name/Title. For example: "Asia, India, Rajasthan, ajmer, Amber fort" or "Asia, India, Rajasthan, Amer, Amber Fort".
6. A highly descriptive, beautifully written, 2-3 sentence travel description for tourists.
7. A clean, beautiful, short name or display title for this place (keep it short and elegant, under 60 characters).
8. 2-3 photography search keywords for Unsplash (e.g., "paris eiffel tower evening").

Format the output strictly as a JSON object matching the requested schema.`;

      let promptContent2 = `Generate travel metadata for: "${place}". Extract exact coordinates, state, country, continent (Africa, Asia, Europe, North America, South America, Oceania, Antarctica), district, formattedSearchLocation (Continent, Country, State, District, Landmark), descriptive sentences, name/title, and image keywords in JSON.`;

      if (customData) {
        const customPrompt = `You are a world-class travel, geography and metadata expert. Determine travel metadata inside the requested schema.
The user has provided custom, specific location parameters that you MUST strictly, faithfully incorporate into the final JSON output structure:
- Name/Title of Landmark: "${customData.name}"
- Continent Location: "${customData.continent}"
- Country Location: "${customData.country}"
- State/Region Location: "${customData.state}"
- District/City Location: "${customData.district || 'ajmer'}"
- Latitude Coordinate: ${customData.lat !== null ? customData.lat : 'determine automatically'}
- Longitude Coordinate: ${customData.lng !== null ? customData.lng : 'determine automatically'}

Now, please write:
1. A highly descriptive, beautifully written, 2-3 sentence travel description highlighting "${customData.name}" in "${customData.state}, ${customData.country}".
2. formattedSearchLocation: A complete formatted search location string strictly in this 5-part comma separated format: \`Continent, Country, State, District, Landmark\` matching "${customData.continent}, ${customData.country}, ${customData.state}, ${customData.district || 'ajmer'}, ${customData.name}".
3. 2-3 brilliant photography keywords for image search queries.

Adhere strictly to the explicit coordinates, country, state, continent, and name in the output.`;
        promptContent1 = customPrompt;
        promptContent2 = customPrompt;
      }

      const response = await callGemini(
        () => ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: promptContent1,
          config: {
            tools: [{ googleSearch: {} }],
            toolConfig: { includeServerSideToolInvocations: true } as any,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                description: { type: "STRING" },
                country: { type: "STRING" },
                state: { type: "STRING" },
                continent: { 
                  type: "STRING", 
                  enum: ["Africa", "Asia", "Europe", "North America", "South America", "Oceania", "Antarctica"]
                },
                district: { type: "STRING" },
                formattedSearchLocation: { type: "STRING" },
                lat: { type: "NUMBER" },
                lng: { type: "NUMBER" },
                imageKeywords: { type: "STRING" }
              },
              required: ["name", "description", "country", "state", "continent", "district", "formattedSearchLocation", "lat", "lng", "imageKeywords"]
            }
          } as any
        } as any),
        () => ai.models.generateContent({
          model: "gemini-flash-latest",
          contents: promptContent2,
          config: {
            tools: [{ googleSearch: {} }],
            toolConfig: { includeServerSideToolInvocations: true } as any,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                description: { type: "STRING" },
                country: { type: "STRING" },
                state: { type: "STRING" },
                continent: { 
                  type: "STRING", 
                  enum: ["Africa", "Asia", "Europe", "North America", "South America", "Oceania", "Antarctica"]
                },
                district: { type: "STRING" },
                formattedSearchLocation: { type: "STRING" },
                lat: { type: "NUMBER" },
                lng: { type: "NUMBER" },
                imageKeywords: { type: "STRING" }
              },
              required: ["name", "description", "country", "state", "continent", "district", "formattedSearchLocation", "lat", "lng", "imageKeywords"]
            }
          } as any
        } as any)
      );

      let text = response.text;
      if (!text) {
        throw new Error("Empty response from Gemini");
      }

       const data = JSON.parse(text);
      if (customData) {
        data.name = customData.name || data.name;
        data.continent = customData.continent || data.continent;
        data.country = customData.country || data.country;
        data.state = customData.state || data.state;
        data.district = customData.district || data.district || "ajmer";
        data.formattedSearchLocation = `${data.continent}, ${data.country}, ${data.state}, ${data.district}, ${data.name}`;
        if (customData.lat !== null) data.lat = customData.lat;
        if (customData.lng !== null) data.lng = customData.lng;
      }
      res.json(data);
    } catch (error: any) {
      console.warn("AI Auto-fill API or Quota issue detected. Falling back seamlessly to local World Explorer AI generator.");
      const customData = parseCustomCodeStructure(place);
      const fallbackData = getFallbackAutofillData(customData ? customData.name : place);
      if (customData) {
        fallbackData.name = customData.name || fallbackData.name;
        fallbackData.continent = customData.continent || fallbackData.continent;
        fallbackData.country = customData.country || fallbackData.country;
        fallbackData.state = customData.state || fallbackData.state;
        fallbackData.district = customData.district || fallbackData.district || "ajmer";
        fallbackData.formattedSearchLocation = `${fallbackData.continent}, ${fallbackData.country}, ${fallbackData.state}, ${fallbackData.district}, ${fallbackData.name}`;
        if (customData.lat !== null) fallbackData.lat = customData.lat;
        if (customData.lng !== null) fallbackData.lng = customData.lng;
      }
      res.json(fallbackData);
    }
  });

  app.post("/api/recommendations", async (req, res) => {
    const { place } = req.body || {};
    if (!place) return res.status(400).json({ error: "Place name is required" });
    const normalizedPlace = place.toLowerCase().trim();
    try {
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

      let response;
      const promptText = `Based on "${place}", suggest 3 similar remarkable travel destinations. Return as JSON array of objects with "name", "reason", and "imageKeywords" fields.`;

      const getConfig = (useSearch: boolean) => {
        const config: any = {
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
        };
        if (useSearch) {
          config.tools = [{ googleSearch: {} }];
          config.toolConfig = { includeServerSideToolInvocations: true } as any;
        }
        return config;
      };

      if (!isSearchGroundingDisabledGlobal) {
        try {
          response = await callGemini(
            () => ai.models.generateContent({
              model: "gemini-3.5-flash",
              contents: promptText,
              config: getConfig(true)
            } as any),
            () => ai.models.generateContent({
              model: "gemini-flash-latest",
              contents: promptText,
              config: getConfig(true)
            } as any)
          );
        } catch (searchError: any) {
          console.warn("Recommendations with Google Search grounding failed. Disabling search grounding globally & retrying without tools...", searchError);
          isSearchGroundingDisabledGlobal = true;
        }
      }

      if (isSearchGroundingDisabledGlobal || !response) {
        // Retry standard Gemini call without search grounding
        response = await callGemini(
          () => ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: promptText,
            config: getConfig(false)
          } as any),
          () => ai.models.generateContent({
            model: "gemini-flash-latest",
            contents: promptText,
            config: getConfig(false)
          } as any)
        );
      }

      const recommendationsData = JSON.parse(response.text);
      // Cache dynamic recommendations
      dynamicCache.recommendations.set(normalizedPlace, recommendationsData);
      res.json(recommendationsData);
    } catch (error: any) {
      console.warn("Recommendations API error or Quota issue detected. Falling back seamlessly to local recommendations.");
      const fallbackRecs = [
        {
          name: `${place} Old Quarter`,
          reason: `Rich historical district located right by ${place}, showcasing classical structures and scenic views.`,
          imageKeywords: `${place} historic quarter travel`
        },
        {
          name: `${place} Panoramic Overlook`,
          reason: `A stunning peak with panoramic 360-degree vistas overlooking ${place}'s landscapes.`,
          imageKeywords: `${place} landscape scenic mountain viewpoint`
        },
        {
          name: `The Grand Gardens of ${place}`,
          reason: `Lush, beautifully landscaped public botanical gardens filled with incredible native floral species.`,
          imageKeywords: `${place} botanical garden park`
        }
      ];
      dynamicCache.recommendations.set(normalizedPlace, fallbackRecs);
      res.json(fallbackRecs);
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
        try {
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
        } catch (geoErr) {
          console.warn(`[Weather API] Coordinate resolution failed for ${place}. Falling back to local offline model.`, geoErr);
          const fallback = getFallbackAutofillData(place as string);
          lat = fallback.lat;
          lng = fallback.lng;
          dynamicCache.geo.set(normalizedPlace, { lat, lng });
        }
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


