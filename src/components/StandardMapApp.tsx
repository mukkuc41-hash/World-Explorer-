import React, { useState, useEffect, useRef } from 'react';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  useMap, 
  useMapsLibrary,
  useAdvancedMarkerRef
} from '@vis.gl/react-google-maps';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ZoomIn, 
  ZoomOut, 
  Layers, 
  Compass, 
  Search, 
  MapPin, 
  Navigation, 
  X, 
  Info, 
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { GlobeLocation } from './ImmersiveGlobe.tsx';

interface StandardMapAppProps {
  activeLocation: GlobeLocation & { imageUrl?: string };
  onLocationChange: (location: GlobeLocation & { imageUrl?: string }) => void;
  landmarks: Array<GlobeLocation & { imageUrl?: string }>;
}

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasMapsKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

export default function StandardMapApp({
  activeLocation,
  onLocationChange,
  landmarks
}: StandardMapAppProps) {
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid' | 'terrain'>('roadmap');
  const [zoomLevel, setZoomLevel] = useState(15);
  const [isCardOpen, setIsCardOpen] = useState(true);

  if (!hasMapsKey) {
    return (
      <div className="w-full h-full min-h-[480px] bg-stone-900/40 rounded-[32px] border border-stone-800 p-8 flex flex-col items-center justify-center text-center relative overflow-hidden backdrop-blur-md">
        <div className="absolute inset-0 bg-radial-gradient from-cyan-950/20 to-transparent pointer-events-none" />
        
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/35 text-red-400 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(239,68,68,0.15)] animate-pulse">
          <HelpCircle className="w-8 h-8" />
        </div>
        
        <h2 className="text-2xl font-serif italic text-white mb-2">Google Maps Key Required</h2>
        <p className="text-xs text-stone-400/80 max-w-[460px] leading-relaxed mb-6">
          To display the standard 2D map, load street views, satellite terrains, and use the Places Autocomplete search engine, please configure your API Key.
        </p>

        <div className="bg-black/40 border border-stone-800 rounded-2xl p-5 text-left max-w-[480px] w-full text-[11px] font-mono leading-relaxed space-y-3.5 text-stone-300">
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-md bg-stone-800 text-stone-400 flex items-center justify-center shrink-0">1</span>
            <p>
              Get an API key from the <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Google Cloud Console</a>.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-md bg-stone-800 text-stone-400 flex items-center justify-center shrink-0">2</span>
            <p>
              Open <strong>Settings</strong> (⚙️ gear icon, top-right corner) &rarr; <strong>Secrets</strong>.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-md bg-stone-800 text-stone-400 flex items-center justify-center shrink-0">3</span>
            <p>
              Type <code>GOOGLE_MAPS_PLATFORM_KEY</code> as the secret name, and paste your key. Press <strong>Enter</strong> to save.
            </p>
          </div>
        </div>
        
        <div className="mt-8 text-[9px] uppercase tracking-widest font-mono text-cyan-400/50">
          &bull; Cinematic 3D Globe View remains fully operational offline &bull;
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY} version="weekly" solutionChannel="gmp-mcp-codeassist-v1-aistudio">
      <div className="relative w-full h-full min-h-[480px] bg-stone-950 rounded-[32px] overflow-hidden border border-stone-800 shadow-2xl flex items-center justify-center">
        {/* Main Interactive Map Component */}
        <Map
          defaultCenter={{ lat: activeLocation.lat, lng: activeLocation.lng }}
          defaultZoom={activeLocation.zoom || zoomLevel}
          onZoomChanged={(e) => setZoomLevel(e.detail.zoom)}
          mapTypeId={mapType}
          disableDefaultUI={true}
          gestureHandling="greedy"
          mapId="WORLD_EXPLORER_MAP_SYNC"
          style={{ width: '100%', height: '100%' }}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        >
          {/* Camera sync engine to handle smooth panning */}
          <CameraSyncEngine activeLocation={activeLocation} />

          {/* Active SVG Target Pinned Marker */}
          <ActiveCustomMarker 
            position={{ lat: activeLocation.lat, lng: activeLocation.lng }}
            title={activeLocation.title}
            onClick={() => setIsCardOpen(true)}
          />

          {/* Render adjacent preloaded landmarks */}
          {landmarks.map((landmark, index) => {
            const isSelf = Math.abs(landmark.lat - activeLocation.lat) < 0.0001 &&
                           Math.abs(landmark.lng - activeLocation.lng) < 0.0001;
            if (isSelf) return null;
            
            return (
              <AdvancedMarker
                key={`landmark-pin-${index}`}
                position={{ lat: landmark.lat, lng: landmark.lng }}
                title={landmark.title}
                onClick={() => {
                  onLocationChange(landmark);
                  setIsCardOpen(true);
                }}
              >
                <div className="group relative cursor-pointer flex items-center justify-center">
                  <div className="w-5 h-5 bg-stone-900 border-2 border-cyan-400 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-125">
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                  </div>
                  {/* Miniature Label */}
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/90 border border-stone-800 px-1.5 py-0.5 rounded text-[7px] font-mono uppercase tracking-wider text-cyan-300 pointer-events-none opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                    {landmark.title}
                  </div>
                </div>
              </AdvancedMarker>
            );
          })}
        </Map>

        {/* Floating Components (Autocomplete Input & UI Buttons) */}
        <FloatingControls 
          mapType={mapType} 
          setMapType={setMapType} 
          activeLocation={activeLocation} 
          onLocationChange={onLocationChange}
          zoomLevel={zoomLevel}
          setZoomLevel={setZoomLevel}
        />

        {/* Sleek Cinematic Slide-Out Info Card */}
        <AnimatePresence>
          {isCardOpen && (
            <motion.div
              initial={{ opacity: 0, x: 80, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20 }}
              className="absolute top-6 right-6 z-30 bg-black/95 backdrop-blur-xl p-5 rounded-[24px] border border-cyan-500/30 shadow-[0_0_35px_rgba(6,182,212,0.18)] max-w-[310px] text-white"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 border-b border-stone-800 pb-3 mb-3">
                <div>
                  <span className="text-[7px] font-mono font-black tracking-[0.2em] text-cyan-400 uppercase block">GEOGRAPHIC_PIN_ENGAGED</span>
                  <h3 className="font-serif italic text-xl tracking-tight text-white mt-1 leading-snug">{activeLocation.title}</h3>
                </div>
                <button
                  onClick={() => setIsCardOpen(false)}
                  className="text-stone-400 hover:text-white hover:bg-stone-800/40 p-1 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Photo Preview Frame */}
              <div className="relative h-32 w-full overflow-hidden rounded-xl mb-3 border border-stone-800 bg-stone-900">
                <img
                  src={activeLocation.imageUrl || 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&q=80&w=600'}
                  alt={activeLocation.title}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <div className="absolute bottom-2 left-2 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span className="text-[8px] font-mono text-cyan-400 font-bold">
                    LAT: {activeLocation.lat.toFixed(4)} &bull; LNG: {activeLocation.lng.toFixed(4)}
                  </span>
                </div>
              </div>

              {/* Description Paragraph */}
              <p className="text-[10.5px] leading-relaxed text-stone-300 font-mono mb-4 max-h-24 overflow-y-auto pr-1 select-text scrollbar-thin scrollbar-thumb-stone-800">
                {activeLocation.description}
              </p>

              {/* Interaction Launch Buttons */}
              <div className="pt-3 border-t border-stone-800 flex gap-2">
                <button
                  onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${activeLocation.lat},${activeLocation.lng}`, '_blank')}
                  className="flex-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 py-2 rounded-xl border border-cyan-400/20 text-[9px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Route Nav
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </APIProvider>
  );
}

// Sub-component for Floating Autocomplete Search & Map UI Actions
function FloatingControls({
  mapType,
  setMapType,
  activeLocation,
  onLocationChange,
  zoomLevel,
  setZoomLevel
}: {
  mapType: string;
  setMapType: (type: any) => void;
  activeLocation: GlobeLocation & { imageUrl?: string };
  onLocationChange: (location: GlobeLocation & { imageUrl?: string }) => void;
  zoomLevel: number;
  setZoomLevel: (z: number) => void;
}) {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const inputRef = useRef<HTMLInputElement>(null);

  // Instantiates standard Google Places Autocomplete on the input
  useEffect(() => {
    if (!placesLib || !inputRef.current || !map) return;

    const autocomplete = new placesLib.Autocomplete(inputRef.current, {
      fields: ['geometry', 'name', 'formatted_address', 'photos']
    });

    autocomplete.bindTo('bounds', map);

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        
        // Grab first high-quality photo if available from Places
        let imgUrl = undefined;
        if (place.photos && place.photos.length > 0) {
          try {
            imgUrl = place.photos[0].getUrl({ maxWidth: 600 });
          } catch (photoErr) {
            console.warn('Failed to retrieve Places API Photo URL:', photoErr);
          }
        }

        onLocationChange({
          lat,
          lng,
          zoom: 16,
          title: place.name || 'Discovered Location',
          description: place.formatted_address || 'A historic landmark identified using our synced maps framework.',
          imageUrl: imgUrl
        });
      }
    });

    return () => {
      listener.remove();
    };
  }, [placesLib, map, onLocationChange]);

  const handleZoomIn = () => {
    if (map) {
      const nextZoom = Math.min(21, (map.getZoom() || zoomLevel) + 1);
      map.setZoom(nextZoom);
      setZoomLevel(nextZoom);
    }
  };

  const handleZoomOut = () => {
    if (map) {
      const nextZoom = Math.max(1, (map.getZoom() || zoomLevel) - 1);
      map.setZoom(nextZoom);
      setZoomLevel(nextZoom);
    }
  };

  const handleRecenter = () => {
    if (map) {
      map.panTo({ lat: activeLocation.lat, lng: activeLocation.lng });
      map.setZoom(16);
      setZoomLevel(16);
    }
  };

  const toggleSatellite = () => {
    const nextType = mapType === 'roadmap' ? 'hybrid' : 'roadmap';
    setMapType(nextType);
  };

  return (
    <>
      {/* Autocomplete Input Search Floating bar */}
      <div className="absolute top-6 left-6 z-20 max-w-sm w-full shrink-0">
        <div className="relative flex items-center bg-black/90 backdrop-blur-xl border border-stone-800 rounded-2xl shadow-2xl px-4 py-3 text-white">
          <Search className="w-4 h-4 text-cyan-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search city palaces, forts..."
            className="w-full bg-transparent border-none outline-none text-xs font-mono placeholder-stone-500 focus:ring-0 text-white"
          />
          <div className="shrink-0 flex items-center gap-1 ml-2 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-lg text-[7px] font-mono text-cyan-400 font-bold uppercase tracking-wider animate-pulse">
            <Sparkles className="w-2 h-2 shrink-0" />
            <span>Places_API</span>
          </div>
        </div>
      </div>

      {/* Vertical Map Action Controls (Recenter, Zoom, Map Type Toggle) */}
      <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-2.5">
        {/* Recenter Lock */}
        <button
          onClick={handleRecenter}
          className="w-12 h-12 rounded-[16px] bg-stone-950/95 hover:bg-stone-900 border border-stone-800 hover:border-cyan-400/40 text-cyan-400 hover:text-cyan-300 flex items-center justify-center transition-all duration-150 ease-out hover:scale-[1.08] active:scale-[0.92] shadow-xl hover:shadow-[0_0_15px_rgba(6,182,212,0.25)] cursor-pointer select-none"
          title="Recenter Camera on Lock"
        >
          <Compass className="w-5 h-5 animate-pulse" />
        </button>

        {/* Satellite Map Type */}
        <button
          onClick={toggleSatellite}
          className={`w-12 h-12 rounded-[16px] border flex items-center justify-center transition-all duration-150 ease-out hover:scale-[1.08] active:scale-[0.92] cursor-pointer select-none ${
            mapType === 'hybrid' || mapType === 'satellite'
              ? 'bg-cyan-950/80 text-cyan-300 border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
              : 'bg-stone-950/95 hover:bg-stone-900 border border-stone-800 hover:border-cyan-400/40 text-cyan-400 hover:text-cyan-300 shadow-xl hover:shadow-[0_0_15px_rgba(6,182,212,0.25)]'
          }`}
          title="Toggle Satellite View"
        >
          <Layers className="w-5 h-5" />
        </button>

        {/* Zoom In */}
        <button
          onClick={handleZoomIn}
          className="w-12 h-12 rounded-[16px] bg-stone-950/95 hover:bg-stone-900 border border-stone-800 hover:border-cyan-400/40 text-cyan-400 hover:text-cyan-300 flex items-center justify-center transition-all duration-150 ease-out hover:scale-[1.08] active:scale-[0.92] shadow-xl hover:shadow-[0_0_15px_rgba(6,182,212,0.25)] cursor-pointer select-none"
          title="Zoom In"
        >
          <ZoomIn className="w-5 h-5" />
        </button>

        {/* Zoom Out */}
        <button
          onClick={handleZoomOut}
          className="w-12 h-12 rounded-[16px] bg-stone-950/95 hover:bg-stone-900 border border-stone-800 hover:border-cyan-400/40 text-cyan-400 hover:text-cyan-300 flex items-center justify-center transition-all duration-150 ease-out hover:scale-[1.08] active:scale-[0.92] shadow-xl hover:shadow-[0_0_15px_rgba(6,182,212,0.25)] cursor-pointer select-none"
          title="Zoom Out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
      </div>
    </>
  );
}

// Custom Interactive SVG Marker
function ActiveCustomMarker({
  position,
  title,
  onClick
}: {
  position: google.maps.LatLngLiteral;
  title: string;
  onClick: () => void;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <AdvancedMarker
      ref={markerRef}
      position={position}
      title={title}
      onClick={onClick}
    >
      {/* Custom Holographic Floating SVG Pin layout */}
      <div className="relative flex items-center justify-center cursor-pointer select-none">
        {/* Radar Concentric pulsing waves */}
        <span className="absolute animate-ping inline-flex h-12 w-12 rounded-full bg-cyan-400/35" />
        <span className="absolute animate-ping inline-flex h-20 w-20 rounded-full bg-cyan-500/10" style={{ animationDuration: '3s' }} />

        {/* Central Core Pin */}
        <svg
          width="36"
          height="46"
          viewBox="0 0 36 46"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="filter drop-shadow-[0_4px_10px_rgba(6,182,212,0.6)]"
        >
          <path
            d="M18 0C8.05888 0 0 8.05888 0 18C0 27.5304 7.23438 33.7431 15.3406 43.6828C16.8125 45.4875 19.1875 45.4875 20.6594 43.6828C28.7656 33.7431 36 27.5304 36 18C36 8.05888 27.9411 0 18 0ZM18 26C13.5817 26 10 22.4183 10 18C10 13.5817 13.5817 10 18 10C22.4183 10 26 13.5817 26 18C26 22.4183 22.4183 26 18 26Z"
            fill="url(#marker_gradient)"
          />
          <circle cx="18" cy="18" r="4.5" fill="#ffffff" />
          <defs>
            <linearGradient id="marker_gradient" x1="18" y1="0" x2="18" y2="46" gradientUnits="userSpaceOnUse">
              <stop stopColor="#06b6d4" />
              <stop offset="1" stopColor="#08f1ff" />
            </linearGradient>
          </defs>
        </svg>

        {/* Mini Label */}
        <div className="absolute -top-6 bg-black/95 border border-cyan-400/40 rounded-lg px-2 py-0.5 shadow-2xl">
          <span className="text-[7px] font-mono uppercase font-black tracking-widest text-white leading-none whitespace-nowrap block">
            {title}
          </span>
        </div>
      </div>
    </AdvancedMarker>
  );
}

// CameraSyncEngine to handle smooth panning and zooming to the active location smoothly
function CameraSyncEngine({ activeLocation }: { activeLocation: any }) {
  const map = useMap();
  useEffect(() => {
    if (map && activeLocation) {
      map.panTo({ lat: activeLocation.lat, lng: activeLocation.lng });
      if (activeLocation.zoom) {
        map.setZoom(activeLocation.zoom);
      }
    }
  }, [map, activeLocation.lat, activeLocation.lng, activeLocation.zoom]);
  return null;
}
