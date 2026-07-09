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
  Sparkles,
  HelpCircle,
  Locate,
  Info,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { GlobeLocation } from './ImmersiveGlobeCanvas.tsx';

// -----------------------------------------------------------------------------
// SCRIPT CORS MONKEYPATCH:
// Dynamically intercepts script creations and enforces crossorigin="anonymous"
// for Google Maps scripts. This unmasks generic "Script error" blocks.
// -----------------------------------------------------------------------------
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const originalCreateElement = document.createElement;
  document.createElement = function (this: Document, tagName: string, options?: ElementCreationOptions) {
    const element = originalCreateElement.call(this, tagName, options);
    if (tagName.toLowerCase() === 'script') {
      const scriptEl = element as HTMLScriptElement;
      const originalSetAttribute = scriptEl.setAttribute;
      scriptEl.setAttribute = function(name: string, value: string) {
        if (name === 'src' && value) {
          const valStr = String(value);
          if (valStr.includes('maps.googleapis.com') || valStr.includes('google')) {
            scriptEl.crossOrigin = 'anonymous';
          }
        }
        return originalSetAttribute.call(this, name, value);
      };
      
      Object.defineProperty(scriptEl, 'src', {
        configurable: true,
        enumerable: true,
        get() {
          return this.getAttribute('src') || '';
        },
        set(val: string) {
          if (val) {
            const valStr = String(val);
            if (valStr.includes('maps.googleapis.com') || valStr.includes('google')) {
              this.crossOrigin = 'anonymous';
            }
            this.setAttribute('src', valStr);
          } else {
            this.setAttribute('src', val);
          }
        }
      });
    }
    return element;
  };
}

// Custom dark night-mode visual themes for high-contrast neon styling
const PREMIUM_DARK_MAP_STYLE = [
  { "elementType": "geometry", "stylers": [{ "color": "#090d16" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#74889c" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#090d16" }] },
  { "featureType": "administrative", "elementType": "geometry.stroke", "stylers": [{ "color": "#1a2538" }] },
  { "featureType": "administrative.land_parcel", "elementType": "labels", "stylers": [{ "visibility": "off" }] },
  { "featureType": "landscape.natural", "elementType": "geometry", "stylers": [{ "color": "#0d1421" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#111b2b" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#00ffd5" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#16233b" }] },
  { "featureType": "road.arterial", "elementType": "geometry", "stylers": [{ "color": "#1f3354" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#00ffd5" }, { "weight": 0.5 }] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#125166" }] },
  { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#13213c" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#050a12" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#1d324f" }] }
];

export interface FunctionalMapAppPreviewProps {
  explorerState?: {
    lat: number;
    lng: number;
    zoom: number;
    activeLandmarkId: string | null;
    viewMode: 'map' | 'globe' | 'streetview';
  };
  onLocationChange?: (location: GlobeLocation & { imageUrl?: string }) => void;
  landmarks?: Array<GlobeLocation & { imageUrl?: string }>;
}

// Load the custom Google Maps API key defined in environment configurations
const API_KEY = 
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PL ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasMapsKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

// --- ROBUST MAP ERROR BOUNDARY ---
class MapErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("[MAP_PREVIEW_ERROR_BOUNDARY] Intercepted runtime issue:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[480px] bg-stone-900 rounded-[32px] border border-red-500/20 p-8 flex flex-col items-center justify-center text-center relative overflow-hidden backdrop-blur-md">
          <div className="absolute inset-0 bg-gradient-to-b from-red-950/25 to-transparent pointer-events-none" />
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl flex items-center justify-center mb-5 animate-pulse shadow-lg">
            <HelpCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-serif italic text-white mb-2">Map Preview Isolation</h2>
          <p className="text-xs text-stone-400 max-w-[440px] leading-relaxed mb-6">
            A standard maps loading or rendering conflict was intercepted and isolated gracefully.
          </p>
          <div className="bg-black/65 border border-red-500/10 rounded-xl p-4 text-left max-w-[480px] w-full text-[10px] font-mono leading-relaxed text-red-300">
            <pre className="overflow-x-auto whitespace-pre-wrap select-all max-h-[120px]">
              {this.state.error?.toString() || 'Script Error: Unmasked CORS event'}
            </pre>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-6 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 px-5 py-2 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider cursor-pointer transition-all"
          >
            Reset Viewport
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function MapPreviewContent({
  explorerState,
  onLocationChange,
  landmarks = []
}: FunctionalMapAppPreviewProps) {
  // Local state fallbacks if parent coordinates are not provided
  const [localLat, setLocalLat] = useState(37.42);
  const [localLng, setLocalLng] = useState(-122.08);
  const [localZoom, setLocalZoom] = useState(12);

  // Active Map Viewport Layout Controls
  const [mapType, setMapType] = useState<'roadmap' | 'hybrid' | 'satellite'>('roadmap');
  const [zoomLevel, setZoomLevel] = useState(13);
  const [isCardOpen, setIsCardOpen] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // AUTOMATED STATE LOCK REF
  const lastDispatchedCoords = useRef<{ lat: number; lng: number } | null>(null);

  // API Instances
  const map = useMap();
  const placesLibrary = useMapsLibrary('places');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Resolve current coordinates with robust fallbacks
  const currentLat = explorerState?.lat ?? localLat;
  const currentLng = explorerState?.lng ?? localLng;
  const currentZoom = explorerState?.zoom ?? localZoom;

  // Find active location object metadata
  const activeLandmark = landmarks.find(
    l => Math.abs(l.lat - currentLat) < 0.0001 && Math.abs(l.lng - currentLng) < 0.0001
  ) || {
    id: 'discovered_pin',
    title: 'Discovered Coordinates',
    lat: currentLat,
    lng: currentLng,
    description: 'A precise geographic landmark synchronized on our immersive flat maps dashboard.',
    imageUrl: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&q=80&w=600',
    category: 'Exploration Spot',
    region: 'Standard WGS-84 coordinate system'
  };

  // --- STRICT DATA SANITIZATION UTILITY ---
  const sanitizeCoords = (rawLat: any, rawLng: any): { lat: number; lng: number } | null => {
    if (rawLat === undefined || rawLat === null || rawLng === undefined || rawLng === null) {
      console.warn('[PREVIEW_SANITIZATION] Coordinate value is undefined or null');
      return null;
    }
    const latVal = typeof rawLat === 'string' ? parseFloat(rawLat) : rawLat;
    const lngVal = typeof rawLng === 'string' ? parseFloat(rawLng) : rawLng;

    if (isNaN(latVal) || isNaN(lngVal)) {
      console.warn('[PREVIEW_SANITIZATION] Parsing resulted in NaN:', rawLat, rawLng);
      return null;
    }

    if (latVal < -90 || latVal > 90 || lngVal < -180 || lngVal > 180) {
      console.warn('[PREVIEW_SANITIZATION] Out of standard geographical range:', latVal, lngVal);
      return null;
    }

    return { lat: latVal, lng: lngVal };
  };

  // Synchronize incoming state from parent elements with State Lock to completely block render loops
  useEffect(() => {
    if (explorerState && map) {
      const sanitized = sanitizeCoords(explorerState.lat, explorerState.lng);
      if (!sanitized) return;

      const last = lastDispatchedCoords.current;
      const isSame = last && 
                     Math.abs(last.lat - sanitized.lat) < 0.0001 && 
                     Math.abs(last.lng - sanitized.lng) < 0.0001;

      if (!isSame) {
        map.panTo(sanitized);
        if (explorerState.zoom) {
          map.setZoom(explorerState.zoom);
          setZoomLevel(explorerState.zoom);
        }
        lastDispatchedCoords.current = sanitized;
      }
    }
  }, [explorerState?.lat, explorerState?.lng, explorerState?.zoom, map]);

  // Bind Autocomplete to Floating Search Input Element
  useEffect(() => {
    if (!placesLibrary || !searchInputRef.current || !map) return;

    const autocomplete = new placesLibrary.Autocomplete(searchInputRef.current, {
      fields: ['geometry', 'name', 'formatted_address', 'photos']
    });

    autocomplete.bindTo('bounds', map);

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        const rawLat = place.geometry.location.lat();
        const rawLng = place.geometry.location.lng();
        
        const sanitized = sanitizeCoords(rawLat, rawLng);
        if (!sanitized) return;

        // Process picture reference URLs
        let imgUrl = undefined;
        if (place.photos && place.photos.length > 0) {
          try {
            imgUrl = place.photos[0].getUrl({ maxWidth: 600 });
          } catch (e) {
            console.warn('Place picture url resolution skipped:', e);
          }
        }

        const discoveredLocation: GlobeLocation & { imageUrl?: string } = {
          id: 'searched_point_' + Date.now(),
          title: place.name || 'Discovered Spot',
          lat: sanitized.lat,
          lng: sanitized.lng,
          zoom: 16,
          region: 'Search API Telemetry',
          category: 'Place Search',
          description: place.formatted_address || 'An exciting landmark identified using Google Places Autocomplete.',
          imageUrl: imgUrl
        };

        // Smooth camera transition to target
        map.panTo(sanitized);
        map.setZoom(16);
        setZoomLevel(16);

        // Update state lock
        lastDispatchedCoords.current = sanitized;

        if (onLocationChange) {
          onLocationChange(discoveredLocation);
        } else {
          setLocalLat(sanitized.lat);
          setLocalLng(sanitized.lng);
          setLocalZoom(16);
        }
        setIsCardOpen(true);
      }
    });

    return () => {
      listener.remove();
    };
  }, [placesLibrary, map, onLocationChange]);

  // Browser-native GPS Geolocation API Locator
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      console.warn('Geolocation is unsupported on this browser agent.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude } = position.coords;
        const sanitized = sanitizeCoords(latitude, longitude);

        if (sanitized) {
          setUserLocation(sanitized);
          if (map) {
            map.panTo(sanitized);
            map.setZoom(16);
            setZoomLevel(16);
          }

          // Save last dispatched coords
          lastDispatchedCoords.current = sanitized;

          const userSpot: GlobeLocation & { imageUrl?: string } = {
            id: 'user_live_coordinates',
            title: 'Your Device Location',
            lat: sanitized.lat,
            lng: sanitized.lng,
            zoom: 16,
            region: 'WGS-84 Telemetry',
            category: 'Live Anchor',
            description: 'Your accurate live coordinate retrieved via browser geolocator API.',
            imageUrl: 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?auto=format&fit=crop&q=80&w=600'
          };

          if (onLocationChange) {
            onLocationChange(userSpot);
          } else {
            setLocalLat(sanitized.lat);
            setLocalLng(sanitized.lng);
            setLocalZoom(16);
          }
          setIsCardOpen(true);
        }
      },
      (error) => {
        setIsLocating(false);
        console.error('HTML5 Geolocation access error:', error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Drag/Pan internally update state coordinates
  const handleMapCameraChange = (e: any) => {
    const center = e.detail.center;
    if (!center) return;

    const latVal = typeof center.lat === 'function' ? center.lat() : center.lat;
    const lngVal = typeof center.lng === 'function' ? center.lng() : center.lng;

    const sanitized = sanitizeCoords(latVal, lngVal);
    if (!sanitized) return;

    // Synchronize to lock ref
    lastDispatchedCoords.current = sanitized;

    if (onLocationChange) {
      // Avoid firing redundant updates
      const hasChanged = Math.abs(currentLat - sanitized.lat) > 0.0001 || 
                         Math.abs(currentLng - sanitized.lng) > 0.0001;
      
      if (hasChanged) {
        const matchingLandmark = landmarks.find(
          l => Math.abs(l.lat - sanitized.lat) < 0.0001 && Math.abs(l.lng - sanitized.lng) < 0.0001
        );

        onLocationChange({
          id: matchingLandmark?.id || 'custom_drag',
          title: matchingLandmark?.title || 'Explored Coordinate',
          lat: sanitized.lat,
          lng: sanitized.lng,
          zoom: map?.getZoom() || zoomLevel,
          region: matchingLandmark?.region || 'Flat Map Bounds',
          category: matchingLandmark?.category || 'Custom Pin',
          description: matchingLandmark?.description || 'A unique coordinates viewport reached by dragging and panning the interactive standard map.',
          imageUrl: matchingLandmark?.imageUrl
        });
      }
    } else {
      setLocalLat(sanitized.lat);
      setLocalLng(sanitized.lng);
    }
  };

  // Zoom Controllers
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

  const handleRecenterCamera = () => {
    if (map) {
      map.panTo({ lat: currentLat, lng: currentLng });
      map.setZoom(15);
      setZoomLevel(15);
    }
  };

  const toggleSatelliteView = () => {
    const nextType = mapType === 'roadmap' ? 'hybrid' : 'roadmap';
    setMapType(nextType);
  };

  return (
    <div className="relative w-full h-full min-h-[480px] bg-stone-950 rounded-[32px] overflow-hidden border border-stone-800 shadow-2xl flex items-center justify-center">
      {/* 2D Interactive Google Map Canvas */}
      <Map
        defaultCenter={{ lat: currentLat, lng: currentLng }}
        defaultZoom={zoomLevel}
        center={{ lat: currentLat, lng: currentLng }}
        zoom={zoomLevel}
        mapTypeId={mapType}
        styles={mapType === 'roadmap' ? PREMIUM_DARK_MAP_STYLE : undefined}
        disableDefaultUI={true}
        gestureHandling="greedy"
        onCenterChanged={handleMapCameraChange}
        onZoomChanged={(e) => setZoomLevel(e.detail.zoom)}
        mapId="PREVIEW_MAP_SYNC_CANVAS"
        style={{ width: '100%', height: '100%' }}
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
      >
        {/* Holographic Concentric Pulse Target Marker Pin */}
        <AdvancedMarker
          position={{ lat: currentLat, lng: currentLng }}
          title={activeLandmark.title}
          onClick={() => setIsCardOpen(true)}
        >
          <div className="relative flex items-center justify-center cursor-pointer select-none">
            {/* Pulsing Sonar Waves */}
            <span className="absolute animate-ping inline-flex h-12 w-12 rounded-full bg-cyan-400/30" />
            <span className="absolute animate-ping inline-flex h-20 w-20 rounded-full bg-cyan-500/10" style={{ animationDuration: '2.5s' }} />

            {/* Glowing Custom SVG Pointer */}
            <svg
              width="38"
              height="48"
              viewBox="0 0 36 46"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="filter drop-shadow-[0_0_12px_rgba(6,182,212,0.8)] transition-all transform hover:scale-110"
            >
              <path
                d="M18 0C8.05888 0 0 8.05888 0 18C0 27.5304 7.23438 33.7431 15.3406 43.6828C16.8125 45.4875 19.1875 45.4875 20.6594 43.6828C28.7656 33.7431 36 27.5304 36 18C36 8.05888 27.9411 0 18 0ZM18 26C13.5817 26 10 22.4183 10 18C10 13.5817 13.5817 10 18 10C22.4183 10 26 13.5817 26 18C26 22.4183 22.4183 26 18 26Z"
                fill="url(#neon_gradient_preview)"
              />
              <circle cx="18" cy="18" r="5" fill="#ffffff" />
              <defs>
                <linearGradient id="neon_gradient_preview" x1="18" y1="0" x2="18" y2="46" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#00ffd5" />
                  <stop offset="1" stopColor="#08f1ff" />
                </linearGradient>
              </defs>
            </svg>

            {/* Mini HUD stamp */}
            <div className="absolute -top-7 bg-black/95 border border-cyan-400 px-2.5 py-0.5 rounded shadow-[0_0_10px_rgba(6,182,212,0.4)] whitespace-nowrap">
              <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-cyan-400">
                {activeLandmark.title}
              </span>
            </div>
          </div>
        </AdvancedMarker>

        {/* User live location custom pin drops */}
        {userLocation && (
          <AdvancedMarker
            position={userLocation}
            title="Your Spot"
            onClick={() => setIsCardOpen(true)}
          >
            <div className="relative flex items-center justify-center cursor-pointer">
              <span className="absolute animate-ping inline-flex h-8 w-8 rounded-full bg-emerald-400/35" />
              <div className="w-5 h-5 bg-stone-950 border border-emerald-400 rounded-full flex items-center justify-center shadow-lg">
                <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
              </div>
            </div>
          </AdvancedMarker>
        )}

        {/* Display adjacent markers */}
        {landmarks.map((landmark, idx) => {
          const isCurrent = Math.abs(landmark.lat - currentLat) < 0.0001 && Math.abs(landmark.lng - currentLng) < 0.0001;
          if (isCurrent) return null;

          return (
            <AdvancedMarker
              key={`adj-landmark-preview-${landmark.id || idx}`}
              position={{ lat: landmark.lat, lng: landmark.lng }}
              title={landmark.title}
              onClick={() => {
                const verified = sanitizeCoords(landmark.lat, landmark.lng);
                if (verified) {
                  lastDispatchedCoords.current = verified;
                  if (onLocationChange) {
                    onLocationChange(landmark);
                  } else {
                    setLocalLat(verified.lat);
                    setLocalLng(verified.lng);
                  }
                  setIsCardOpen(true);
                }
              }}
            >
              <div className="group relative cursor-pointer flex items-center justify-center">
                <div className="w-5 h-5 bg-stone-900 border border-cyan-400/50 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-125 hover:border-cyan-400">
                  <div className="w-1.5 h-1.5 bg-cyan-400/80 rounded-full" />
                </div>
                {/* Tooltip Label */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/95 border border-stone-800 px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-wider text-cyan-300 pointer-events-none opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity duration-200 shadow-xl z-50">
                  {landmark.title}
                </div>
              </div>
            </AdvancedMarker>
          );
        })}
      </Map>

      {/* FLOATING AUTOCOMPLETE SEARCH BAR OVER TOP-LEFT */}
      <div className="absolute top-6 left-6 z-20 max-w-xs sm:max-w-sm w-full shrink-0">
        <div className="relative flex items-center bg-black/90 backdrop-blur-xl border border-stone-800 rounded-2xl shadow-2xl px-4 py-3 text-white">
          <Search className="w-4 h-4 text-cyan-400 shrink-0 mr-3" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search palaces, cities, forts..."
            className="w-full bg-transparent border-none outline-none text-xs font-mono placeholder-stone-500 focus:ring-0 text-white"
          />
          <div className="shrink-0 flex items-center gap-1 ml-2 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-lg text-[7px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
            <Sparkles className="w-2.5 h-2.5 shrink-0 animate-pulse text-cyan-400" />
            <span>Search</span>
          </div>
        </div>
      </div>

      {/* FLOATING ACTIONS CONTROL PANEL (RECENTER, TOGGLE, GEOLOCATOR, ZOOM) */}
      <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-2">
        {/* Recenter Lock */}
        <button
          onClick={handleRecenterCamera}
          className="w-10 h-10 rounded-xl bg-black/90 hover:bg-stone-900 border border-stone-800 text-cyan-400 hover:text-white flex items-center justify-center transition-all shadow-xl cursor-pointer"
          title="Recenter Map View"
        >
          <Compass className="w-5 h-5 animate-spin-slow" />
        </button>

        {/* Locate Me targeting button */}
        <button
          onClick={handleLocateMe}
          className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all shadow-xl cursor-pointer ${
            isLocating 
              ? 'bg-cyan-500/25 border-cyan-400 text-white animate-pulse'
              : 'bg-black/90 hover:bg-stone-900 border-stone-800 text-cyan-400 hover:text-white'
          }`}
          title="Locate My Device"
          disabled={isLocating}
        >
          {isLocating ? (
            <RefreshCw className="w-4.5 h-4.5 animate-spin" />
          ) : (
            <Locate className="w-4.5 h-4.5" />
          )}
        </button>

        {/* Dynamic standard roadmap vs satellite layer toggle */}
        <button
          onClick={toggleSatelliteView}
          className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all shadow-xl cursor-pointer ${
            mapType === 'hybrid' || mapType === 'satellite'
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
              : 'bg-black/90 hover:bg-stone-900 border-stone-800 text-cyan-400 hover:text-white'
          }`}
          title="Toggle Satellite View"
        >
          <Layers className="w-4.5 h-4.5" />
        </button>

        {/* Zoom In */}
        <button
          onClick={handleZoomIn}
          className="w-10 h-10 rounded-xl bg-black/90 hover:bg-stone-900 border border-stone-800 text-cyan-400 hover:text-white flex items-center justify-center transition-all shadow-xl cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4.5 h-4.5" />
        </button>

        {/* Zoom Out */}
        <button
          onClick={handleZoomOut}
          className="w-10 h-10 rounded-xl bg-black/90 hover:bg-stone-900 border border-stone-800 text-cyan-400 hover:text-white flex items-center justify-center transition-all shadow-xl cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* SEMI-TRANSPARENT LOCATION INFORMATION CARD OVER THE RIGHT */}
      <AnimatePresence>
        {isCardOpen && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22 }}
            className="absolute top-6 right-6 z-30 bg-black/90 backdrop-blur-xl p-5 rounded-[24px] border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)] max-w-[290px] text-white"
          >
            {/* Header HUD layout */}
            <div className="flex items-start justify-between gap-3 border-b border-stone-800 pb-3 mb-3">
              <div>
                <span className="text-[7px] font-mono font-black tracking-[0.25em] text-cyan-400 uppercase block">GEOLOCATION_LOCK</span>
                <h3 className="font-serif italic text-lg tracking-tight text-stone-100 mt-1 leading-snug">{activeLandmark.title}</h3>
              </div>
              <button
                onClick={() => setIsCardOpen(false)}
                className="text-stone-400 hover:text-white hover:bg-stone-800/40 p-1 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Picture preview frame */}
            <div className="relative h-28 w-full overflow-hidden rounded-xl mb-3 border border-stone-800 bg-stone-900">
              <img
                src={activeLandmark.imageUrl || 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&q=80&w=600'}
                alt={activeLandmark.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
              <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded border border-stone-800">
                <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="text-[8px] font-mono text-cyan-400 font-bold">
                  {currentLat.toFixed(4)}&deg;N &bull; {currentLng.toFixed(4)}&deg;E
                </span>
              </div>
            </div>

            {/* Description details */}
            <p className="text-[10px] leading-relaxed text-stone-300 font-mono mb-4 max-h-20 overflow-y-auto pr-1 select-text scrollbar-thin">
              {activeLandmark.description}
            </p>

            {/* Route Nav Launcher Button */}
            <div className="pt-3 border-t border-stone-800">
              <button
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${currentLat},${currentLng}`, '_blank')}
                className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 py-2 rounded-xl border border-cyan-400/20 text-[9px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Navigation className="w-3.5 h-3.5 animate-pulse" />
                <span>Compute Nav Route</span>
                <ExternalLink className="w-3 h-3 text-cyan-400/50" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// SECURE PUBLIC DEFAULT EXPORT WRAPPER
export default function FunctionalMapAppPreview(props: FunctionalMapAppPreviewProps) {
  // Graceful API Key splash screen if key has not yet been configured
  if (!hasMapsKey) {
    return (
      <div className="w-full h-full min-h-[480px] bg-stone-900 rounded-[32px] border border-stone-800 p-8 flex flex-col items-center justify-center text-center relative overflow-hidden backdrop-blur-md">
        <div className="absolute inset-0 bg-radial-gradient from-cyan-950/20 to-transparent pointer-events-none" />
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/35 text-red-400 rounded-2xl flex items-center justify-center mb-6 shadow-lg animate-pulse">
          <HelpCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-serif italic text-white mb-2">Google Maps Key Required</h2>
        <p className="text-xs text-stone-400 max-w-[460px] leading-relaxed mb-6">
          To launch the flat map preview, search coordinates via Google Places, and trace custom paths, please verify your API credential keys.
        </p>

        <div className="bg-black/55 border border-stone-800 rounded-2xl p-5 text-left max-w-[480px] w-full text-[11px] font-mono leading-relaxed space-y-3.5 text-stone-300">
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-md bg-stone-800 text-stone-400 flex items-center justify-center shrink-0 font-bold">1</span>
            <p>
              Acquire a platform key from the <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Google Cloud Console</a>.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-md bg-stone-800 text-stone-400 flex items-center justify-center shrink-0 font-bold">2</span>
            <p>
              Open <strong>Settings</strong> (⚙️ top-right gear icon) &rarr; <strong>Secrets</strong>.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-md bg-stone-800 text-stone-400 flex items-center justify-center shrink-0 font-bold">3</span>
            <p>
              Type <code>GOOGLE_MAPS_PLATFORM_KEY</code> as the name, paste your key, and press <strong>Enter</strong> to save.
            </p>
          </div>
        </div>
        
        <div className="mt-8 text-[9px] uppercase tracking-widest font-mono text-cyan-400/40">
          &bull; The offline orbital globe canvas remains active and interactive &bull;
        </div>
      </div>
    );
  }

  return (
    <MapErrorBoundary>
      <APIProvider apiKey={API_KEY} version="weekly" solutionChannel="gmp-mcp-codeassist-v1-aistudio">
        <MapPreviewContent {...props} />
      </APIProvider>
    </MapErrorBoundary>
  );
}
