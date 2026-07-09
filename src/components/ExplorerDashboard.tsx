import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Globe, 
  Map, 
  Compass, 
  Target, 
  Play, 
  Pause, 
  Columns2, 
  Sparkles, 
  Clock, 
  Info, 
  Activity, 
  Eye, 
  MapPin, 
  Bookmark,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import ImmersiveGlobeCanvas, { GlobeLocation } from './ImmersiveGlobeCanvas.tsx';
import UltimateMapApp from './UltimateMapApp.tsx';
import DistanceMatrixCalculator from './DistanceMatrixCalculator.tsx';

// Fully specified pre-configured high-fidelity landmark datasets as requested
const SEED_LANDMARKS: Array<GlobeLocation & { imageUrl?: string; region: string; category: string }> = [
  {
    id: "jaipur-city-palace",
    title: "City Palace, Jaipur",
    lat: 26.9258,
    lng: 75.8237,
    zoom: 16,
    region: "Rajasthan, India",
    category: "Royal Heritage",
    imageUrl: "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&q=80&w=600",
    description: "Located in the heart of the Old City of Jaipur, the City Palace is a magnificent complex blending Mughal and Rajasthani architecture. Built by Maharaja Sawai Jai Singh II, it houses gorgeous courtyards, royal pavilions, temples, and galleries of priceless textiles and armor."
  },
  {
    id: "jaipur-jal-mahal",
    title: "Jal Mahal, Jaipur",
    lat: 26.9656,
    lng: 75.8592,
    zoom: 16,
    region: "Rajasthan, India",
    category: "Architectural Marvel",
    imageUrl: "https://images.unsplash.com/photo-1598135753163-6167c1a1ad65?auto=format&fit=crop&q=80&w=600",
    description: "The Water Palace is a spectacular low-rise palace appearing to float in the middle of Man Sagar Lake. Constructed from rich red sandstone, the palace features unique craftsmanship with 4 submerged stories and an open top-floor terrace that is home to a lush aromatic garden."
  },
  {
    id: "jaipur-hawa-mahal",
    title: "Hawa Mahal, Jaipur",
    lat: 26.9180,
    lng: 75.8256,
    zoom: 16,
    region: "Rajasthan, India",
    category: "Historical Landmark",
    imageUrl: "https://images.unsplash.com/photo-1477584308800-b48c240a16d1?auto=format&fit=crop&q=80&w=600",
    description: "The famous 'Palace of Winds' features an extraordinary five-story exterior resembling a honeycomb. Its 953 small windows (jharokhas) are decorated with intricate latticework, designed for royal ladies to witness street festivals while remaining unobserved."
  },
  {
    id: "jaipur-amer-fort",
    title: "Amer Fort, Jaipur",
    lat: 26.9855,
    lng: 75.8513,
    zoom: 15,
    region: "Rajasthan, India",
    category: "Ancient Citadel",
    imageUrl: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&q=80&w=600",
    description: "Perched high on a rugged hill overlooking Maota Lake, Amer Fort is famous for its artistic Hindu-style elements, defensive ramparts, series of gates, and the magnificent Sheesh Mahal (Mirror Palace) lined with thousands of mosaic mirror tiles."
  },
  {
    id: "agra-taj-mahal",
    title: "Taj Mahal, Agra",
    lat: 27.1751,
    lng: 78.0421,
    zoom: 16,
    region: "Uttar Pradesh, India",
    category: "World Wonder",
    imageUrl: "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&q=80&w=600",
    description: "An immense mausoleum of white marble, built in Agra between 1631 and 1648 by order of the Mughal emperor Shah Jahan in memory of his favorite wife, Mumtaz Mahal. It represents the pinnacle of Mughal architectural style and romantic symmetry."
  },
  {
    id: "paris-eiffel-tower",
    title: "Eiffel Tower, Paris",
    lat: 48.8584,
    lng: 2.2945,
    zoom: 16,
    region: "Paris, France",
    category: "Modern Monument",
    imageUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=600",
    description: "Built in 1889 as the entrance arch to the World's Fair, this iconic iron lattice tower stands as an international symbol of romance, engineering, and architectural innovation on the Champ de Mars."
  },
  {
    id: "egypt-giza-pyramid",
    title: "Great Pyramid of Giza",
    lat: 29.9792,
    lng: 31.1342,
    zoom: 15,
    region: "Giza, Egypt",
    category: "Ancient Wonder",
    imageUrl: "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&q=80&w=600",
    description: "The oldest and sole surviving structure of the Seven Wonders of the Ancient World, this magnificent monument was built over 4,500 years ago as a grand tomb for Pharaoh Khufu."
  },
  {
    id: "rome-colosseum",
    title: "Colosseum, Rome",
    lat: 41.8902,
    lng: 12.4922,
    zoom: 16,
    region: "Lazio, Italy",
    category: "Imperial History",
    imageUrl: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&q=80&w=600",
    description: "Completed in 80 AD, this massive elliptical amphitheater in the heart of Rome hosted gladiatorial combats, dramatic theater, and simulated sea battles, serving as a monument to ancient Roman engineering."
  }
];

export interface UnifiedExplorerState {
  lat: number;
  lng: number;
  zoom: number;
  activeLandmarkId: string | null;
  viewMode: 'map' | 'globe' | 'streetview';
}

export default function ExplorerDashboard() {
  const [explorerState, setExplorerState] = useState<UnifiedExplorerState>({
    lat: SEED_LANDMARKS[0].lat,
    lng: SEED_LANDMARKS[0].lng,
    zoom: SEED_LANDMARKS[0].zoom,
    activeLandmarkId: SEED_LANDMARKS[0].id,
    viewMode: 'map'
  });

  const [layoutMode, setLayoutMode] = useState<'split' | 'globe' | 'map'>('split');
  const [isPlayingTour, setIsPlayingTour] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const tourTimerRef = useRef<number | null>(null);

  // Staggered Fly-over Auto-Tour Loop System
  useEffect(() => {
    if (isPlayingTour) {
      tourTimerRef.current = window.setInterval(() => {
        setTourIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % SEED_LANDMARKS.length;
          const target = SEED_LANDMARKS[nextIndex];
          setExplorerState(prev => ({
            ...prev,
            lat: target.lat,
            lng: target.lng,
            zoom: target.zoom,
            activeLandmarkId: target.id
          }));
          return nextIndex;
        });
      }, 7500); // 7.5 seconds delay between geographic steps
    } else {
      if (tourTimerRef.current) {
        clearInterval(tourTimerRef.current);
        tourTimerRef.current = null;
      }
    }

    return () => {
      if (tourTimerRef.current) clearInterval(tourTimerRef.current);
    };
  }, [isPlayingTour]);

  // Memory cleanup and rapid-toggle transition protection
  useEffect(() => {
    // Force a minor delay to let the DOM settle before triggering layout adjustments
    const resizeTimeout = setTimeout(() => {
      if (typeof window !== 'undefined') {
        // Trigger a global resize event safely to force maps/webgl components to recalculate viewport proportions
        window.dispatchEvent(new Event('resize'));
      }
    }, 120);

    return () => {
      clearTimeout(resizeTimeout);
    };
  }, [layoutMode]);

  // Handle user manual landmark select from the list
  const handleSelectLandmark = (landmark: typeof SEED_LANDMARKS[0], idx: number) => {
    setIsPlayingTour(false); // End autoplay upon user manual interaction
    setTourIndex(idx);
    setExplorerState(prev => ({
      ...prev,
      lat: landmark.lat,
      lng: landmark.lng,
      zoom: landmark.zoom,
      activeLandmarkId: landmark.id,
      // Retain streetview if already active on target change
      viewMode: prev.viewMode === 'streetview' ? 'streetview' : 'map'
    }));
  };

  // Synchronized updates from Google Places autocompletion search box
  const handleSyncedLocationChange = (newLocation: GlobeLocation & { imageUrl?: string }) => {
    setIsPlayingTour(false);
    
    // Add custom dynamic element dynamically if searched custom location is brand new
    const exists = SEED_LANDMARKS.some(l => Math.abs(l.lat - newLocation.lat) < 0.0001);
    
    setExplorerState({
      lat: newLocation.lat,
      lng: newLocation.lng,
      zoom: newLocation.zoom,
      activeLandmarkId: exists ? (SEED_LANDMARKS.find(l => Math.abs(l.lat - newLocation.lat) < 0.0001)?.id || 'custom') : 'custom',
      viewMode: 'map'
    });
  };

  // View modes switcher trigger
  const handleViewModeChange = (mode: 'map' | 'globe' | 'streetview') => {
    setExplorerState(prev => ({
      ...prev,
      viewMode: mode
    }));
  };

  const activeFocusLandmark = SEED_LANDMARKS.find(l => l.id === explorerState.activeLandmarkId) || {
    id: 'custom',
    title: 'Discovered Target',
    region: 'WGS-84 Coordinates',
    category: 'Exploration Lock',
    description: 'Dynamic coordinates selected through the integrated Places API Search Engine.'
  };

  return (
    <div className="w-full flex flex-col gap-6 text-left" id="cyber-explorer-hub-root">
      
      {/* Visual Tech Header Panel */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-stone-900/60 dark:bg-stone-950/80 border border-stone-800/80 p-6 rounded-3xl backdrop-blur-3xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-[0.25em] text-cyan-400 font-black uppercase">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>ORBITAL_PLANE // MIRROR_MATRIX_SYNC_v3.0</span>
          </div>
          <h2 className="text-xl md:text-2xl font-serif italic text-white font-extrabold tracking-tight leading-tight">
            Ultimate Dual-Preview Geographic Sync
          </h2>
          <p className="text-[11px] font-mono text-stone-400 leading-relaxed">
            Harness real-time flight telemetry linking a vectors-projected 3D Globe with an advanced Google Maps custom interface.
          </p>
        </div>

        {/* Real-time coordinates HUD LCD */}
        <div className="flex flex-wrap items-center gap-5 bg-black/80 border border-stone-800 p-3 rounded-2xl font-mono text-[10.5px]">
          <div className="space-y-0.5">
            <span className="text-stone-500 uppercase block text-[8px] tracking-wider">TARGET PIN</span>
            <span className="text-cyan-400 font-bold max-w-[150px] truncate block leading-none">{activeFocusLandmark.title}</span>
          </div>
          <div className="w-px h-7 bg-stone-800 hidden sm:block" />
          <div className="space-y-0.5">
            <span className="text-stone-500 uppercase block text-[8px] tracking-wider">DATUM</span>
            <span className="text-white block leading-none">{explorerState.lat.toFixed(4)}&deg;N, {explorerState.lng.toFixed(4)}&deg;E</span>
          </div>
          <div className="w-px h-7 bg-stone-800 hidden sm:block" />
          <div className="space-y-0.5">
            <span className="text-stone-500 uppercase block text-[8px] tracking-wider">LENS LOCK</span>
            <span className="text-emerald-400 block leading-none uppercase font-bold">{explorerState.viewMode === 'streetview' ? 'PANORAMA 360' : layoutMode === 'globe' ? 'ALTITUDE 520KM' : 'STREET LAYER'}</span>
          </div>
        </div>
      </div>

      {/* Main split-view dashboard grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Left Side Menu: Interactive Lands Index */}
        <div className="xl:col-span-3 space-y-4">
          <div className="bg-[#191a18]/45 dark:bg-stone-900/40 border border-stone-800/80 p-5 rounded-[28px] shadow-2xl backdrop-blur-md">
            
            <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-[11px] font-mono font-bold uppercase text-stone-200 tracking-wider">LANDMARKS_INDEX</span>
              </div>
              
              {/* Fly-Over Auto Tour Button */}
              <button
                onClick={() => setIsPlayingTour(!isPlayingTour)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9.5px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  isPlayingTour 
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse' 
                    : 'bg-cyan-500/10 hover:bg-cyan-500/25 text-cyan-400 border-cyan-400/20'
                }`}
              >
                {isPlayingTour ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5 fill-current" />}
                <span>{isPlayingTour ? 'Active' : 'Drone Tour'}</span>
              </button>
            </div>

            {/* List entries */}
            <div className="space-y-2 max-h-[360px] xl:max-h-[500px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-stone-800">
              {SEED_LANDMARKS.map((landmark, index) => {
                const isSelected = explorerState.activeLandmarkId === landmark.id;

                return (
                  <button
                    key={landmark.id}
                    onClick={() => handleSelectLandmark(landmark, index)}
                    className={`w-full text-left p-3 rounded-2xl border flex items-start gap-3.5 transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-cyan-950/20 border-cyan-500/50 text-white shadow-[0_0_20px_rgba(6,182,212,0.12)]' 
                        : 'bg-transparent border-transparent hover:bg-stone-900/40 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {/* Small image placeholder frame */}
                    <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-stone-800 bg-stone-900">
                      <img
                        src={landmark.imageUrl}
                        alt={landmark.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[7.5px] font-mono tracking-widest text-cyan-400 uppercase font-black">
                          {landmark.category}
                        </span>
                        {isSelected && (
                          <span className="w-2 h-2 bg-cyan-400 rounded-full animate-ping shrink-0" />
                        )}
                      </div>
                      <h4 className="font-serif italic font-bold text-xs.5 leading-snug text-white mt-1 truncate">
                        {landmark.title}
                      </h4>
                      <p className="text-[9px] font-mono opacity-60 mt-0.5 truncate">{landmark.region}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Diagnostics Stream panel overlay */}
          <div className="hidden xl:block bg-stone-950/80 border border-stone-800/80 p-5 rounded-2xl font-mono text-[9.5px] text-stone-500 space-y-2">
            <div className="flex items-center gap-2 border-b border-stone-800 pb-2 text-stone-400 font-bold">
              <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span>DIAGNOSTICS_MATRIX</span>
            </div>
            <div className="flex justify-between">
              <span>LAT_TILT_HEADING:</span>
              <span className="text-cyan-400 font-semibold">TRUE (45&deg; ROT)</span>
            </div>
            <div className="flex justify-between">
              <span>MAPS_GL_READY:</span>
              <span className="text-white">ENABLED</span>
            </div>
            <div className="flex justify-between">
              <span>SYNC_LATENCY:</span>
              <span className="text-emerald-400 font-bold">&lt;1.0ms (COOR_MIRR)</span>
            </div>
            <div className="pt-2 text-[8px] border-t border-stone-900 leading-relaxed text-stone-600">
              * Any custom location searched through the interactive Places Autocomplete triggers orbital flight calculations on the 3D canvas and the drone camera angle sweeps.
            </div>
          </div>
        </div>

        {/* Right Side: Primary Viewports Layout Deck */}
        <div className="xl:col-span-9 space-y-4">
          
          {/* Deck View Layout Switches */}
          <div className="flex items-center justify-between bg-stone-900/40 border border-stone-800/80 px-4.5 py-3 rounded-2xl">
            <span className="text-[10px] font-mono text-stone-400 font-bold uppercase tracking-wider hidden md:inline">
              VIEWPORT_LAYOUT_CONFIG:
            </span>
            
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => setLayoutMode('split')}
                className={`px-3.5 py-2 rounded-xl text-[9.5px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                  layoutMode === 'split' 
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
                    : 'bg-stone-900/60 text-stone-400 hover:text-stone-200 border border-stone-800'
                }`}
              >
                <Columns2 className="w-3.5 h-3.5" />
                <span>Split Deck</span>
              </button>

              <button
                onClick={() => setLayoutMode('globe')}
                className={`px-3.5 py-2 rounded-xl text-[9.5px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                  layoutMode === 'globe' 
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
                    : 'bg-stone-900/60 text-stone-400 hover:text-stone-200 border border-stone-800'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>3D Globe Only</span>
              </button>

              <button
                onClick={() => setLayoutMode('map')}
                className={`px-3.5 py-2 rounded-xl text-[9.5px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                  layoutMode === 'map' 
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
                    : 'bg-stone-900/60 text-stone-400 hover:text-stone-200 border border-stone-800'
                }`}
              >
                <Map className="w-3.5 h-3.5" />
                <span>2D Map Only</span>
              </button>
            </div>
          </div>

          {/* Viewports layout container - Keeping both canvases mounted permanently to secure rendering scripts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
            
            {/* Component B: Immersive 3D Globe Canvas Container */}
            <div className={
              layoutMode === 'globe'
                ? 'lg:col-span-12 h-[500px] flex flex-col block'
                : layoutMode === 'split'
                  ? 'lg:col-span-6 h-[500px] flex flex-col block'
                  : 'hidden'
            }>
              <ImmersiveGlobeCanvas 
                explorerState={explorerState}
                onLocationSelect={(landmark) => {
                  // Update index and state on select
                  const idx = SEED_LANDMARKS.findIndex(l => l.id === landmark.id);
                  if (idx !== -1) setTourIndex(idx);
                  setExplorerState({
                    lat: landmark.lat,
                    lng: landmark.lng,
                    zoom: landmark.zoom,
                    activeLandmarkId: landmark.id,
                    viewMode: 'map'
                  });
                }}
                landmarks={SEED_LANDMARKS}
              />
            </div>

            {/* Component A: Custom Premium Ultimate Map Application Container */}
            <div className={
              layoutMode === 'map'
                ? 'lg:col-span-12 h-[500px] flex flex-col block'
                : layoutMode === 'split'
                  ? 'lg:col-span-6 h-[500px] flex flex-col block'
                  : 'hidden'
            }>
              <UltimateMapApp 
                explorerState={explorerState}
                onLocationChange={handleSyncedLocationChange}
                onViewModeChange={handleViewModeChange}
                landmarks={SEED_LANDMARKS}
              />
            </div>

          </div>

          {/* Footer Interactive Legend & Premium Telemetry Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DistanceMatrixCalculator 
              destLat={explorerState.lat}
              destLng={explorerState.lng}
              destTitle={activeFocusLandmark.title}
            />

            <div className="bg-[#191a18]/45 dark:bg-stone-900/40 border border-stone-800/80 rounded-2xl p-5 flex items-start gap-3.5 backdrop-blur-md">
              <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h5 className="text-xs font-mono font-bold text-stone-200 uppercase tracking-wider">Dual-Preview Deck Guidelines:</h5>
                <p className="text-[10px] leading-relaxed text-stone-400 font-mono">
                  1. Search any custom place with the <strong className="text-cyan-400">Places Autocomplete</strong> bar overlaying the map to see coordinates sync instantly. <br />
                  2. Click <strong className="text-cyan-400">Street_View Portal</strong> on the info slide to pivot into the high-resolution 360° panorama lens viewport. <br />
                  3. Drag the <strong className="text-cyan-400">3D Globe Canvas</strong> manually to spin the orthographic planet sphere. Hover points to read location stamps.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
