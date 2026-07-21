# Google Maps Platform & AI Bot Integration Blueprint
### Production-Ready, Strictly Typed Full-Stack Solution (TypeScript)

This blueprint provides the complete, production-ready, and strictly typed architecture for:
1. **Frontend Google Map Visualizer**: Loads dynamic locations (from Google Places API or local database/JSON), auto-places markers, adjusts camera viewports (bounds) dynamically, and implements custom Info Windows.
2. **AI Bot Integration (Function Calling / Tool Use)**: Connects the Gemini API (using the modern `@google/genai` SDK) to the Google Maps Platform services to resolve address geocoding, find local places, and calculate distances securely.

---

## 1. Architectural Topology & Secure Flow

To protect sensitive API keys (such as `GOOGLE_MAPS_PLATFORM_KEY` and `GEMINI_API_KEY`) from browser exposure or user tempering, all third-party API interactions are proxied through a secure Node.js backend.

```
┌────────────────────────┐              ┌────────────────────────┐              ┌────────────────────────┐
│      Client Web UI     │              │     Secure Backend     │              │ Google Maps / Gemini   │
│ (React/TS Map View)    │ <──────────> │   (Express / Node)     │ <──────────> │ Platform Services      │
│                        │              │ (Environment variables)│              │                        │
└────────────────────────┘              └────────────────────────┘              └────────────────────────┘
```

---

## 2. Shared Type Declarations (`types.ts`)

These TypeScript interfaces define the payloads and models shared across the frontend, backend, and the AI bot's Tool definitions.

```typescript
/**
 * Core Geolocation Model
 */
export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Structured Location Detail
 */
export interface BusinessLocation {
  id: string;
  name: string;
  formattedAddress: string;
  coordinates: LatLng;
  rating?: number;
  phoneNumber?: string;
  websiteUri?: string;
  editorialSummary?: string;
}

/**
 * Geocoding Request & Response Payloads
 */
export interface GeocodeRequest {
  address: string;
}

export interface GeocodeResponse {
  address: string;
  coordinates: LatLng;
  formattedAddress: string;
  placeId: string;
}

/**
 * Places Nearby Request & Response Payloads
 */
export interface PlacesNearbyRequest {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  keyword: string;
}

export interface PlacesNearbyResponse {
  results: BusinessLocation[];
}

/**
 * Distance Calculation Request & Response Payloads
 */
export interface DistanceMatrixRequest {
  origin: string | LatLng;
  destination: string | LatLng;
  mode?: 'DRIVING' | 'WALKING' | 'BICYCLING' | 'TRANSIT';
}

export interface DistanceMatrixResponse {
  originAddress: string;
  destinationAddress: string;
  distanceText: string;
  distanceValueMeters: number;
  durationText: string;
  durationValueSeconds: number;
}
```

---

## 3. Secure Node.js Backend Service (`server/mapsService.ts`)

An asynchronous, robust service class utilizing native `fetch` to interface with the **Google Maps Platform APIs** (supporting the new high-performance APIs such as Places API (New) and Routes API / Distance Matrix).

```typescript
import { 
  LatLng, 
  BusinessLocation, 
  GeocodeResponse, 
  DistanceMatrixResponse 
} from './types';

export class GoogleMapsService {
  private apiKey: string;

  constructor() {
    const key = process.env.GOOGLE_MAPS_PLATFORM_KEY;
    if (!key) {
      throw new Error("CRITICAL CONFIGURATION ERROR: GOOGLE_MAPS_PLATFORM_KEY is not defined in process.env");
    }
    this.apiKey = key;
  }

  /**
   * Geocode Address -> Lat/Lng
   */
  public async geocodeAddress(address: string): Promise<GeocodeResponse> {
    if (!address.trim()) throw new Error("Address query cannot be empty");

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`;
    
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Geocoding HTTP Error: ${res.status}`);
      
      const data = await res.json();
      if (data.status === 'ZERO_RESULTS') {
        throw new Error(`No coordinates resolved for address: "${address}"`);
      }
      if (data.status === 'OVER_QUERY_LIMIT') {
        throw new Error("Rate limit exceeded for Google Geocoding API");
      }
      if (data.status !== 'OK') {
        throw new Error(`Google Geocoding API returned: ${data.status} - ${data.error_message || ''}`);
      }

      const result = data.results[0];
      const { lat, lng } = result.geometry.location;

      return {
        address,
        coordinates: { lat, lng },
        formattedAddress: result.formatted_address,
        placeId: result.place_id
      };
    } catch (error: any) {
      console.error(`[GoogleMapsService.geocodeAddress] Error:`, error.message);
      throw error;
    }
  }

  /**
   * Search places dynamically using Google Places API (New) Text Search
   */
  public async textSearchPlaces(textQuery: string): Promise<BusinessLocation[]> {
    if (!textQuery.trim()) throw new Error("Search query cannot be empty");

    const url = 'https://places.googleapis.com/v1/places:searchText';
    
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.nationalPhoneNumber,places.websiteUri,places.editorialSummary'
        },
        body: JSON.stringify({ textQuery })
      });

      if (!res.ok) throw new Error(`Places API HTTP Error: ${res.status}`);

      const data = await res.json();
      if (!data.places || data.places.length === 0) {
        return [];
      }

      return data.places.map((p: any) => ({
        id: p.id,
        name: p.displayName?.text || 'Unknown Business',
        formattedAddress: p.formattedAddress || 'No Address Listed',
        coordinates: {
          lat: p.location?.latitude,
          lng: p.location?.longitude
        },
        rating: p.rating,
        phoneNumber: p.nationalPhoneNumber,
        websiteUri: p.websiteUri,
        editorialSummary: p.editorialSummary?.text
      }));
    } catch (error: any) {
      console.error(`[GoogleMapsService.textSearchPlaces] Error:`, error.message);
      throw error;
    }
  }

  /**
   * Calculate exact distance between origin and destination via Distance Matrix
   */
  public async calculateDistance(
    origin: string | LatLng, 
    destination: string | LatLng,
    mode: 'DRIVING' | 'WALKING' | 'BICYCLING' | 'TRANSIT' = 'DRIVING'
  ): Promise<DistanceMatrixResponse> {
    const originStr = typeof origin === 'string' ? origin : `${origin.lat},${origin.lng}`;
    const destStr = typeof destination === 'string' ? destination : `${destination.lat},${destination.lng}`;

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(originStr)}&destinations=${encodeURIComponent(destStr)}&mode=${mode.toLowerCase()}&key=${this.apiKey}`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Distance Matrix HTTP Error: ${res.status}`);

      const data = await res.json();
      if (data.status !== 'OK') {
        throw new Error(`Google Distance Matrix API returned: ${data.status}`);
      }

      const row = data.rows[0];
      const element = row.elements[0];

      if (element.status === 'ZERO_RESULTS') {
        throw new Error(`No route found between "${originStr}" and "${destStr}"`);
      }
      if (element.status !== 'OK') {
        throw new Error(`Route error: ${element.status}`);
      }

      return {
        originAddress: data.origin_addresses[0],
        destinationAddress: data.destination_addresses[0],
        distanceText: element.distance.text,
        distanceValueMeters: element.distance.value,
        durationText: element.duration.text,
        durationValueSeconds: element.duration.value
      };
    } catch (error: any) {
      console.error(`[GoogleMapsService.calculateDistance] Error:`, error.message);
      throw error;
    }
  }
}
```

---

## 4. Full-Stack Express API Endpoints (`server.ts`)

Expose these server capabilities over lightweight API routers to make them securely available to the client.

```typescript
import express from 'express';
import { GoogleMapsService } from './server/mapsService';

const app = express();
app.use(express.json());

const mapsService = new GoogleMapsService();

/**
 * Proxy Location Queries dynamically using the secure key
 */
app.get('/api/places/search', async (req, res) => {
  const query = req.query.q as string;
  if (!query) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  try {
    const places = await mapsService.textSearchPlaces(query);
    res.json({ results: places });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to search locations" });
  }
});

/**
 * Direct Static Fallback API (JSON list of coordinates)
 */
app.get('/api/places/local-fallback', (req, res) => {
  // Pre-configured list of business locations
  const fallbackSights = [
    {
      id: "amber-fort",
      name: "Amer Palace & Fort",
      formattedAddress: "Devisinghpura, Amer, Jaipur, Rajasthan 302001",
      coordinates: { lat: 26.9855, lng: 75.8513 },
      editorialSummary: "A magnificent 16th-century fortress and palace complex set on a high hill."
    },
    {
      id: "hawa-mahal",
      name: "Hawa Mahal",
      formattedAddress: "Hawa Mahal Rd, Badi Choupad, J.D.A. Market, Jaipur, Rajasthan 302002",
      coordinates: { lat: 26.9239, lng: 75.8267 },
      editorialSummary: "An iconic pink-and-red sandstone palace built like a honeycomb."
    },
    {
      id: "city-palace",
      name: "City Palace, Jaipur",
      formattedAddress: "Tulsi Marg, Gangori Bazaar, J.D.A. Market, Pink City, Jaipur, Rajasthan 302002",
      coordinates: { lat: 26.9258, lng: 75.8236 },
      editorialSummary: "Stunning royal palace complex showcasing architecture and historical court relics."
    }
  ];
  res.json({ results: fallbackSights });
});
```

---

## 5. Front-End Map Loader & Dynamic Visualizer (`src/components/DynamicMapView.tsx`)

This React/TypeScript component utilizes the official `@googlemaps/js-api-loader` to dynamically initialize the interactive Google Map, fetch the targeted business locations, automatically iterate over them to spawn markers with customized Info Windows, and dynamically calculate the bounds to fit all markers elegantly in the viewport.

```typescript
import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { BusinessLocation } from '../types';

interface MapViewProps {
  searchQuery?: string;
  useLocalFallback?: boolean;
}

export default function DynamicMapView({ searchQuery = 'Jaipur landmarks', useLocalFallback = false }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [locations, setLocations] = useState<BusinessLocation[]>([]);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [activeInfoWindow, setActiveInfoWindow] = useState<google.maps.InfoWindow | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Fetch Location Data (Options A or B)
  useEffect(() => {
    const loadLocations = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const endpoint = useLocalFallback 
          ? '/api/places/local-fallback'
          : `/api/places/search?q=${encodeURIComponent(searchQuery)}`;
        
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error("Failed to retrieve location assets");
        const data = await response.json();
        setLocations(data.results || []);
      } catch (err: any) {
        setErrorMsg(err.message || "Could not load dynamic markers.");
      } finally {
        setLoading(false);
      }
    };

    loadLocations();
  }, [searchQuery, useLocalFallback]);

  // 2. Initialize Google Map Instance
  useEffect(() => {
    if (!mapRef.current) return;

    const loader = new Loader({
      apiKey: process.env.GOOGLE_MAPS_PLATFORM_KEY || '',
      version: "weekly",
      libraries: ["places"]
    });

    loader.load().then(() => {
      if (mapRef.current) {
        const defaultMap = new google.maps.Map(mapRef.current, {
          center: { lat: 20.5937, lng: 78.9629 }, // Default to Center of India
          zoom: 5,
          mapId: "DEMO_MAP_ID", // Required for advanced styling features
          styles: [
            { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] }
          ]
        });
        setMapInstance(defaultMap);
      }
    }).catch(err => {
      console.error("Google Maps SDK failed to load:", err);
      setErrorMsg("Failed to load Google Maps SDK.");
    });
  }, []);

  // 3. Auto-Place Markers & Set Viewport Bounds Dynamic fit
  useEffect(() => {
    if (!mapInstance || locations.length === 0) return;

    // Clear previous markers
    markers.forEach(m => m.setMap(null));
    if (activeInfoWindow) activeInfoWindow.close();

    const newMarkers: google.maps.Marker[] = [];
    const bounds = new google.maps.LatLngBounds();

    locations.forEach(loc => {
      const position = new google.maps.LatLng(loc.coordinates.lat, loc.coordinates.lng);
      bounds.extend(position);

      // Create interactive marker
      const marker = new google.maps.Marker({
        position,
        map: mapInstance,
        title: loc.name,
        animation: google.maps.Animation.DROP
      });

      // Customized popup / InfoWindow
      const infoWindowContent = `
        <div style="color: #111827; padding: 8px; font-family: system-ui, sans-serif; max-width: 240px;">
          <h4 style="font-weight: 600; margin: 0 0 4px 0; font-size: 14px;">${loc.name}</h4>
          <p style="font-size: 11px; color: #4b5563; margin: 0 0 6px 0;">${loc.formattedAddress}</p>
          ${loc.editorialSummary ? `<p style="font-size: 11px; line-height: 1.4; margin: 0; color: #1f2937;">${loc.editorialSummary}</p>` : ''}
          ${loc.rating ? `<div style="font-size: 11px; color: #eab308; margin-top: 4px;">★ ${loc.rating} Rating</div>` : ''}
        </div>
      `;

      const infoWindow = new google.maps.InfoWindow({
        content: infoWindowContent
      });

      // Open on Click Event
      marker.addListener('click', () => {
        if (activeInfoWindow) activeInfoWindow.close();
        infoWindow.open({
          anchor: marker,
          map: mapInstance,
          shouldFocus: true
        });
        setActiveInfoWindow(infoWindow);
      });

      newMarkers.push(marker);
    });

    setMarkers(newMarkers);

    // Dynamic viewport fit bounds
    if (locations.length > 1) {
      mapInstance.fitBounds(bounds);
    } else if (locations.length === 1) {
      mapInstance.setCenter(bounds.getCenter());
      mapInstance.setZoom(14);
    }
  }, [mapInstance, locations]);

  return (
    <div className="relative w-full h-[550px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 z-10 backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-300 font-medium text-sm">Locating coordinates dynamically...</p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="absolute top-4 left-4 right-4 bg-red-950/90 border border-red-800 text-red-200 px-4 py-3 rounded-xl z-10 flex items-center justify-between text-xs backdrop-blur-md">
          <span>⚠️ {errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="hover:text-white font-bold font-mono">✕</button>
        </div>
      )}

      {/* Actual Map Target */}
      <div id="google-interactive-map" ref={mapRef} className="w-full h-full" />
    </div>
  );
}
```

---

## 6. AI Bot Core Framework Integration (Gemini SDK Tool Calling)

Integrates Google Maps Platform features straight into **Gemini API model interaction pipelines** as structured function declarations. The AI Model decides *when* to execute a Geocoding lookup, distance measurement, or a place search based on user inputs, runs the secure service, and automatically formats the returned data into user-friendly narratives.

```typescript
import { GoogleGenAI } from '@google/genai';
import { GoogleMapsService } from './mapsService';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const mapsService = new GoogleMapsService();

/**
 * 1. Define Declarations of Google Maps Service Tools to Gemini
 */
const GOOGLE_MAPS_TOOLS = {
  functionDeclarations: [
    {
      name: "geocode_address",
      description: "Convert a natural text address, city, or country query into exact latitude/longitude coordinate metrics.",
      parameters: {
        type: "OBJECT",
        properties: {
          address: { type: "STRING", description: "The physical address, city name, or landmark (e.g., 'Eiffel Tower, Paris')." }
        },
        required: ["address"]
      }
    },
    {
      name: "search_nearby_businesses",
      description: "Find local businesses, sightseeing attractions, or tourist spots around a specific keyword or query text.",
      parameters: {
        type: "OBJECT",
        properties: {
          query: { type: "STRING", description: "Query text of the spots to search (e.g., 'scenic viewpoints in Kyoto' or 'top coffee shops in Seattle')." }
        },
        required: ["query"]
      }
    },
    {
      name: "calculate_driving_route",
      description: "Calculate transit distance and driving duration between two locations.",
      parameters: {
        type: "OBJECT",
        properties: {
          origin: { type: "STRING", description: "Start address or coordinates." },
          destination: { type: "STRING", description: "Destination address or coordinates." }
        },
        required: ["origin", "destination"]
      }
    }
  ]
};

/**
 * 2. Main Chat Handler executing and parsing Google Maps Tools
 */
export async function handleBotConversation(userPrompt: string, chatHistory: any[]) {
  try {
    // Call model with tools registered
    const modelResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        ...chatHistory,
        { role: 'user', parts: [{ text: userPrompt }] }
      ],
      config: {
        tools: [GOOGLE_MAPS_TOOLS] as any,
        systemInstruction: "You are 'World Explorer Maps Co-Pilot', an expert digital mapping companion. Utilize google maps tools whenever the user mentions a location, geocoding query, nearby search, or routing request."
      }
    });

    const candidate = modelResponse.candidates?.[0];
    const functionCalls = candidate?.content?.parts?.filter(part => part.functionCall);

    // If model decided to invoke a Google Maps API call
    if (functionCalls && functionCalls.length > 0) {
      const results: any[] = [];

      for (const call of functionCalls) {
        const { name, args } = call.functionCall!;
        console.log(`[AI Tool Triggered] Running: ${name} with args:`, args);

        try {
          if (name === 'geocode_address') {
            const data = await mapsService.geocodeAddress((args as any).address);
            results.push({
              functionResponse: {
                name,
                response: { data }
              }
            });
          } else if (name === 'search_nearby_businesses') {
            const data = await mapsService.textSearchPlaces((args as any).query);
            results.push({
              functionResponse: {
                name,
                response: { data }
              }
            });
          } else if (name === 'calculate_driving_route') {
            const data = await mapsService.calculateDistance((args as any).origin, (args as any).destination);
            results.push({
              functionResponse: {
                name,
                response: { data }
              }
            });
          }
        } catch (apiErr: any) {
          // Handle error gracefully back to the AI
          results.push({
            functionResponse: {
              name,
              response: { error: apiErr.message || "Operation failed on Google Maps Platform" }
            }
          });
        }
      }

      // Submit execution results back to Gemini to synthesize natural user text responses
      const synthesisResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          ...chatHistory,
          { role: 'user', parts: [{ text: userPrompt }] },
          candidate?.content as any, // Include tool call
          { role: 'tool', parts: results } // Provide tool response
        ],
        config: {
          systemInstruction: "Format the returned geographical data or coordinates into a delightful, natural, user-friendly response. Avoid raw JSON syntax in the text, present coordinates elegantly and list places as scannable bullet points."
        }
      });

      return {
        role: 'model',
        text: synthesisResponse.text || "Resolved maps query successfully."
      };
    }

    // Standard conversational fallback if no tools were invoked
    return {
      role: 'model',
      text: modelResponse.text || "How can I help you explore the world today?"
    };

  } catch (globalErr: any) {
    console.error("[Bot Error Handler]:", globalErr);
    return {
      role: 'model',
      text: `⚠️ **Mapping Intelligence Connection Error**: ${globalErr.message || "An unexpected error occurred."}`
    };
  }
}
```

---

## 7. Key Safeguards & Security Auditing
* **Keep Keys Hidden**: Always resolve `process.env.GOOGLE_MAPS_PLATFORM_KEY` inside `server.ts` or server services. Never prepend with `VITE_` or expose it directly on clients.
* **Input Isolation**: Always sanitize strings and encode query strings before passing values to HTTP queries.
* **Zero Trust Fallback**: When rate limits, expired keys, or zero results trigger, fall back cleanly to static JSON coordinate databases so the Map component never crashes.
