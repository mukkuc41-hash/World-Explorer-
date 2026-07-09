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
  Eye,
  EyeOff,
  Video,
  RefreshCw
} from 'lucide-react';
import { GlobeLocation } from './ImmersiveGlobeCanvas.tsx';
import { useWikipediaSync } from '../hooks/useWikipediaSync.ts';
import { useTimeZoneTheme } from '../hooks/useTimeZoneTheme.ts';
import { Clock, ExternalLink } from 'lucide-react';

// Robust, fallback center when validation triggers
const fallbackCenter = { lat: 26.9258, lng: 75.8237 };

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

// Comprehensive dark night-mode visual themes for high-contrast neon styling
const ULTRA_DARK_MAP_STYLE = [
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

interface UltimateMapAppProps {
  explorerState: {
    lat: number;
    lng: number;
    zoom: number;
    activeLandmarkId: string | null;
    viewMode: 'map' | 'globe' | 'streetview';
  };
  onLocationChange: (location: GlobeLocation & { imageUrl?: string }) => void;
  onViewModeChange: (viewMode: 'map' | 'globe' | 'streetview') => void;
  landmarks: Array<GlobeLocation & { imageUrl?: string }>;
}

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasMapsKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

// --- ROBUST ERROR BOUNDARY FOR MAP WRAPPER ---
class MapErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null; errorInfo: any }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("[MAP_ERROR_BOUNDARY] Caught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[480px] bg-stone-900/60 rounded-[32px] border border-red-500/30 p-8 flex flex-col items-center justify-center text-center relative overflow-hidden backdrop-blur-md">
          <div className="absolute inset-0 bg-gradient-to-b from-red-950/25 to-transparent pointer-events-none" />
          
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/35 text-red-400 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(239,68,68,0.15)] animate-pulse">
            <HelpCircle className="w-8 h-8" />
          </div>
          
          <h2 className="text-xl font-serif italic text-white mb-2">Map Context Intercepted</h2>
          <p className="text-xs text-stone-400/85 max-w-[460px] leading-relaxed mb-6">
            A dynamic maps script or marker execution error was safely isolated by the telemetry boundary.
          </p>

          <div className="bg-black/80 border border-red-500/20 rounded-2xl p-4 text-left max-w-[500px] w-full text-[10px] font-mono leading-relaxed text-red-300">
            <div className="text-red-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              ERROR STACK TRACE:
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap select-all max-h-[150px]">
              {this.state.error?.toString() || 'Script Error: Unmasked CORS event'}
            </pre>
          </div>

          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-6 bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/20 px-4 py-2 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider cursor-pointer transition-all"
          >
            Reset Telemetry Deck
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function UltimateMapAppContent({
  explorerState,
  onLocationChange,
  onViewModeChange,
  landmarks
}: UltimateMapAppProps) {
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');
  const [zoomLevel, setZoomLevel] = useState(15);
  const [isCardOpen, setIsCardOpen] = useState(true);

  // Setup window.onerror Interceptor to safely log CORS and generic script loading failures
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const message = event.message || '';
      const isCrossOrigin = message.toLowerCase().includes('script error') || !event.filename;
      
      if (isCrossOrigin) {
        console.warn(
          `[MAPS_CORS_GUARD] Intercepted unmasked cross-origin Script Error. ` +
          `Enforced crossorigin="anonymous" to unmask full stack traces in development. ` +
          `Details: Source: ${event.filename || 'Unknown Script'}, Line: ${event.lineno || 'N/A'}`
        );
      } else {
        console.error('[MAPS_RUNTIME_ERROR] Captured error event:', event.error || message);
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (!hasMapsKey) {
    return (
      <div className="w-full h-full min-h-[480px] bg-stone-900/40 rounded-[32px] border border-stone-800 p-8 flex flex-col items-center justify-center text-center relative overflow-hidden backdrop-blur-md">
        <div className="absolute inset-0 bg-radial-gradient from-cyan-950/25 to-transparent pointer-events-none" />
        
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/35 text-red-400 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(239,68,68,0.15)] animate-pulse">
          <HelpCircle className="w-8 h-8" />
        </div>
        
        <h2 className="text-2xl font-serif italic text-white mb-2">Google Maps SDK Ingress Key Required</h2>
        <p className="text-xs text-stone-400/85 max-w-[460px] leading-relaxed mb-6">
          To boot up the standard 2D map canvas, load streets, satellite terrain, and enable the Places Autocomplete search database, please set up your secret API credentials.
        </p>

        <div className="bg-black/50 border border-stone-800 rounded-2xl p-5 text-left max-w-[480px] w-full text-[11px] font-mono leading-relaxed space-y-3.5 text-stone-300">
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-md bg-stone-800 text-stone-400 flex items-center justify-center shrink-0 font-bold">1</span>
            <p>
              Obtain a key from the <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Google Cloud Console</a>.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-md bg-stone-800 text-stone-400 flex items-center justify-center shrink-0 font-bold">2</span>
            <p>
              Navigate to <strong>Settings</strong> (⚙️ top right gear) &rarr; <strong>Secrets</strong>.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-md bg-stone-800 text-stone-400 flex items-center justify-center shrink-0 font-bold">3</span>
            <p>
              Name the secret <code>GOOGLE_MAPS_PLATFORM_KEY</code>, paste your API token, and hit save.
            </p>
          </div>
        </div>
        
        <div className="mt-8 text-[9px] uppercase tracking-widest font-mono text-cyan-400/40">
          &bull; HOLOGRAPHIC 3D GLOBE remains fully operational offline &bull;
        </div>
      </div>
    );
  }

  // Strict coordinate boundary validation
  const coordinates = { lat: explorerState.lat, lng: explorerState.lng };
  const safeCoordinates = (!coordinates || typeof coordinates.lat === 'undefined' || typeof coordinates.lng === 'undefined' || isNaN(coordinates.lat) || isNaN(coordinates.lng)) 
    ? fallbackCenter 
    : { lat: Number(explorerState.lat), lng: Number(explorerState.lng) };

  const activeLandmark = landmarks.find(l => l.id === explorerState.activeLandmarkId) || {
    id: 'custom',
    title: 'Custom Coordinate Pin',
    lat: safeCoordinates.lat,
    lng: safeCoordinates.lng,
    description: 'A custom location pinned on the synchronized visual dashboard.',
    imageUrl: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&q=80&w=600'
  };

  // PREMIUM EXTENSIONS INTEGRATION
  const { localTimeStr, phase, mapStyles, glowingColor } = useTimeZoneTheme(safeCoordinates.lat, safeCoordinates.lng);
  const wikiSummary = useWikipediaSync(activeLandmark.title);

  return (
    <APIProvider apiKey={API_KEY} version="weekly" solutionChannel="gmp-mcp-codeassist-v1-aistudio">
      <div className="relative w-full h-full min-h-[500px] bg-stone-950 rounded-[32px] overflow-hidden border border-stone-800 shadow-2xl flex flex-col justify-end">
        
        {/* Dynamic Map Body Panel */}
        <div className="absolute inset-0 z-0">
          <AnimatePresence mode="wait">
            {explorerState.viewMode === 'streetview' ? (
              <motion.div
                key="streetview-viewport"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full relative"
              >
                <StreetViewPortal 
                  lat={safeCoordinates.lat} 
                  lng={safeCoordinates.lng} 
                  onClose={() => onViewModeChange('map')} 
                />
              </motion.div>
            ) : (
              <motion.div
                key="2d-map-viewport"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full"
              >
                <Map
                  defaultCenter={safeCoordinates}
                  defaultZoom={explorerState.zoom}
                  center={safeCoordinates}
                  zoom={zoomLevel}
                  onZoomChanged={(e) => {
                    try {
                      setZoomLevel(e.detail.zoom);
                    } catch (zoomErr) {
                      console.error("[Map Guard] Failed to update zoomLevel state:", zoomErr);
                    }
                  }}
                  mapTypeId={mapType}
                  disableDefaultUI={true}
                  gestureHandling="greedy"
                  mapId="ULTIMATE_MAP_SYNC_CANVAS"
                  style={{ width: '100%', height: '100%' }}
                  styles={mapStyles}
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                >
                  {/* Master cinematic drone fly-to component controller */}
                  <CinematicCameraEngine 
                    lat={safeCoordinates.lat} 
                    lng={safeCoordinates.lng} 
                    targetZoom={explorerState.zoom} 
                    setZoomLevel={setZoomLevel}
                  />

                  {/* Safe robust markers rendering controller with Map context guard */}
                  <SafeMarkers 
                    landmarks={landmarks}
                    explorerState={explorerState}
                    activeLandmark={activeLandmark}
                    onLocationChange={onLocationChange}
                    setIsCardOpen={setIsCardOpen}
                  />
                </Map>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Floating Input Overlays for places autocompletion and controls */}
        {explorerState.viewMode !== 'streetview' && (
          <FloatingOverlays 
            mapType={mapType} 
            setMapType={setMapType} 
            activeLocation={safeCoordinates} 
            onLocationChange={onLocationChange}
            zoomLevel={zoomLevel}
            setZoomLevel={setZoomLevel}
            onViewModeChange={onViewModeChange}
          />
        )}

        {/* Cinematic slide-out informational panel */}
        <AnimatePresence>
          {isCardOpen && (
            <motion.div
              initial={{ opacity: 0, x: 80, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20 }}
              className="absolute top-6 right-6 z-30 bg-black/95 backdrop-blur-xl p-5 rounded-[24px] border border-cyan-500/30 shadow-[0_0_35px_rgba(6,182,212,0.22)] max-w-[310px] text-white"
            >
              <div className="flex items-start justify-between gap-3 border-b border-stone-800 pb-3 mb-3">
                <div>
                  <span className="text-[7px] font-mono font-black tracking-[0.2em] text-cyan-400 uppercase block">TARGET_ENGAGEMENT</span>
                  <h3 className="font-serif italic text-xl tracking-tight text-white mt-1 leading-snug">{activeLandmark.title}</h3>
                </div>
                <button
                  onClick={() => setIsCardOpen(false)}
                  className="text-stone-400 hover:text-white hover:bg-stone-800/40 p-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Local Clock & Time Zone Phase Badge */}
              <div className="flex items-center gap-2 bg-stone-900/80 border border-stone-800 px-3 py-1.5 rounded-xl mb-3">
                <Clock className="w-3.5 h-3.5 text-cyan-400 animate-pulse shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-[8px] font-mono text-stone-400 block uppercase leading-none">LOCAL_SOLAR_TIME</span>
                  <span className="text-[10px] font-mono font-bold text-white mt-0.5 block">{localTimeStr}</span>
                </div>
                <div className={`px-2 py-0.5 rounded-md text-[7px] font-mono font-bold uppercase tracking-wider bg-gradient-to-r ${glowingColor} text-black shrink-0`}>
                  {phase}
                </div>
              </div>

              {/* Landmark Frame Preview */}
              <div className="relative h-32 w-full overflow-hidden rounded-xl mb-3 border border-stone-800 bg-stone-900">
                <img
                  src={activeLandmark.imageUrl || 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&q=80&w=600'}
                  alt={activeLandmark.title}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="text-[8px] font-mono text-cyan-400 font-bold">
                    LAT: {safeCoordinates.lat.toFixed(4)} &bull; LNG: {safeCoordinates.lng.toFixed(4)}
                  </span>
                </div>
              </div>

              {/* Wikipedia Synced Article Extract */}
              {wikiSummary.isLoading ? (
                <div className="flex flex-col gap-1.5 py-4 justify-center items-center bg-stone-900/40 border border-stone-800/40 rounded-xl mb-4">
                  <div className="w-4.5 h-4.5 border border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[8px] text-cyan-400 font-mono uppercase tracking-wider">Syncing Wikipedia...</span>
                </div>
              ) : (
                <p className="text-[10.5px] leading-relaxed text-stone-300 font-mono mb-4 max-h-24 overflow-y-auto pr-1 select-text scrollbar-thin">
                  {wikiSummary.extract || activeLandmark.description}
                </p>
              )}

              {/* Portal Quick Launcher Buttons */}
              <div className="pt-3 border-t border-stone-800 flex gap-2">
                <button
                  onClick={() => onViewModeChange('streetview')}
                  className="flex-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 py-2.5 rounded-xl border border-cyan-400/20 text-[9px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Video className="w-3.5 h-3.5" />
                  Street_View Portal
                </button>
                <button
                  onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${safeCoordinates.lat},${safeCoordinates.lng}`, '_blank')}
                  className="px-3 bg-stone-900 hover:bg-stone-800 text-stone-300 py-2.5 rounded-xl border border-stone-800 text-[9px] font-mono font-bold flex items-center justify-center cursor-pointer"
                  title="Open Direction Directions in Google Maps"
                >
                  <Navigation className="w-3.5 h-3.5" />
                </button>
              </div>

              {wikiSummary.pageUrl && (
                <div className="mt-3 text-center border-t border-stone-900/60 pt-2.5">
                  <a
                    href={wikiSummary.pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[8px] font-mono font-bold uppercase tracking-wider text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1.5 transition-colors"
                  >
                    <span>Read Wiki Page</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </APIProvider>
  );
}

// -----------------------------------------------------------------------------
// SECURE DEFAULT EXPORT WRAPPER
// -----------------------------------------------------------------------------
export default function UltimateMapApp(props: UltimateMapAppProps) {
  return (
    <MapErrorBoundary>
      <UltimateMapAppContent {...props} />
    </MapErrorBoundary>
  );
}

// Cinematic drone flight rotation camera hook
function CinematicCameraEngine({
  lat,
  lng,
  targetZoom,
  setZoomLevel
}: {
  lat: number;
  lng: number;
  targetZoom: number;
  setZoomLevel: (zoom: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Strict LatLng boundary check using the requested validation pattern
    const coordinates = { lat, lng };
    if (!coordinates || typeof coordinates.lat === 'undefined' || typeof coordinates.lng === 'undefined' || isNaN(coordinates.lat) || isNaN(coordinates.lng)) {
      console.warn("[Map Guard] Blocked execution due to uninitialized or malformed LatLng values.");
      return;
    }

    try {
      // Pan smoothly to target coordinate
      map.panTo({ lat, lng });

      let count = 0;
      const initialHeading = map.getHeading() || 0;
      const initialTilt = map.getTilt() || 0;

      const flightDuration = 1800; // 1.8 seconds fluid sweep
      const stepInterval = 40; // ~25 FPS
      const totalSteps = flightDuration / stepInterval;

      const easeOutQuad = (t: number) => t * (2 - t);

      const intervalId = setInterval(() => {
        count++;
        const progress = count / totalSteps;
        const easedProgress = easeOutQuad(progress);

        // Perform camera dynamic rotation and 45 degree tilt sweep
        try {
          if (typeof map.setHeading === 'function') {
            map.setHeading(initialHeading + easedProgress * 45);
          }
          if (typeof map.setTilt === 'function') {
            map.setTilt(initialTilt + easedProgress * 45);
          }
        } catch (err) {
          // Fallback for standard 2D vector layouts if WebGL tilt properties are blocked
        }

        if (count >= totalSteps) {
          clearInterval(intervalId);
          try {
            map.setZoom(targetZoom);
            setZoomLevel(targetZoom);
          } catch (zoomErr) {
            console.error("[Map Guard] Failed to update map zoom:", zoomErr);
          }
        }
      }, stepInterval);

      return () => clearInterval(intervalId);
    } catch (err) {
      console.error("[Map Guard] Error during cinematic flight operations:", err);
    }
  }, [lat, lng, map, targetZoom, setZoomLevel]);

  return null;
}

// 360 Degree Street View Panorama Portal Render Frame
function StreetViewPortal({
  lat,
  lng,
  onClose
}: {
  lat: number;
  lng: number;
  onClose: () => void;
}) {
  const portalContainerRef = useRef<HTMLDivElement>(null);
  const [streetViewStatus, setStreetViewStatus] = useState<'loading' | 'active' | 'not_found'>('loading');
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!portalContainerRef.current || !mapsLib) return;

    // Strict LatLng boundary check using the requested validation pattern
    const coordinates = { lat, lng };
    if (!coordinates || typeof coordinates.lat === 'undefined' || typeof coordinates.lng === 'undefined' || isNaN(coordinates.lat) || isNaN(coordinates.lng)) {
      console.warn("[Map Guard] Blocked execution due to uninitialized or malformed LatLng values.");
      return;
    }

    try {
      setStreetViewStatus('loading');
      const googleMaps = mapsLib as any;
      const svService = new googleMaps.StreetViewService();
      const radius = 100; // Search for street panorama within 100 meters

      svService.getPanorama({ location: { lat, lng }, radius }, (data: any, status: string) => {
        try {
          if (status === googleMaps.StreetViewStatus.OK && data && data.location) {
            new googleMaps.StreetViewPanorama(portalContainerRef.current!, {
              position: data.location.latLng,
              pov: { heading: 34, pitch: 10 },
              zoom: 1,
              addressControl: false,
              showRoadLabels: true,
              motionTracking: false,
              motionTrackingControl: false
            });
            setStreetViewStatus('active');
          } else {
            setStreetViewStatus('not_found');
          }
        } catch (renderErr) {
          console.error("[Map Guard] Failed to instantiate street view panel:", renderErr);
          setStreetViewStatus('not_found');
        }
      });
    } catch (svcErr) {
      console.error("[Map Guard] StreetView service initialization error:", svcErr);
      setStreetViewStatus('not_found');
    }
  }, [lat, lng, mapsLib]);

  return (
    <div className="relative w-full h-full bg-stone-900 rounded-[32px] overflow-hidden flex flex-col justify-between">
      
      {/* Absolute Panoramic Video Screen */}
      <div ref={portalContainerRef} className="absolute inset-0 z-0 w-full h-full" />

      {/* Header HUD panel overlay */}
      <div className="absolute top-5 left-5 right-5 z-10 flex items-center justify-between gap-4 pointer-events-none">
        <div className="bg-black/90 border border-cyan-400/30 px-3 py-2 rounded-xl flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping shrink-0" />
          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-black">STREET_PANORAMA_LIVE</span>
        </div>

        <button
          onClick={onClose}
          className="bg-black/90 border border-stone-800 hover:border-white text-white p-2.5 rounded-xl transition-all cursor-pointer pointer-events-auto"
          title="Return to 2D Map Look"
        >
          <X className="w-4.5 h-4.5" />
        </button>
      </div>

      {streetViewStatus === 'loading' && (
        <div className="absolute inset-0 bg-stone-950/95 z-20 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-7 h-7 text-cyan-400 animate-spin" />
          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">Searching Street View nodes...</span>
        </div>
      )}

      {streetViewStatus === 'not_found' && (
        <div className="absolute inset-0 bg-stone-950/95 z-20 flex flex-col items-center justify-center gap-4 text-center p-6">
          <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/35 text-rose-400 rounded-xl flex items-center justify-center animate-pulse">
            <EyeOff className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-serif italic text-white font-bold mb-1">Street View Unavailable</h4>
            <p className="text-[10px] font-mono text-stone-400 max-w-[280px] leading-relaxed">
              No 360-degree panorama coverage was located within WGS-84 radius at coordinates: ({lat.toFixed(4)}, {lng.toFixed(4)}).
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 px-4 py-2 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider cursor-pointer"
          >
            Go Back
          </button>
        </div>
      )}
    </div>
  );
}

// Subcomponent: floating overlay bar for search query auto completion and control panels
function FloatingOverlays({
  mapType,
  setMapType,
  activeLocation,
  onLocationChange,
  zoomLevel,
  setZoomLevel,
  onViewModeChange
}: {
  mapType: string;
  setMapType: (type: any) => void;
  activeLocation: { lat: number; lng: number };
  onLocationChange: (location: GlobeLocation & { imageUrl?: string }) => void;
  zoomLevel: number;
  setZoomLevel: (z: number) => void;
  onViewModeChange: (view: 'map' | 'globe' | 'streetview') => void;
}) {
  const map = useMap();
  const placesLibrary = useMapsLibrary('places');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Instantiates standard Google Places Autocomplete directly on the text input
  useEffect(() => {
    if (!placesLibrary || !searchInputRef.current || !map) return;

    try {
      const autocomplete = new placesLibrary.Autocomplete(searchInputRef.current, {
        fields: ['geometry', 'name', 'formatted_address', 'photos']
      });

      autocomplete.bindTo('bounds', map);

      const listener = autocomplete.addListener('place_changed', () => {
        try {
          const place = autocomplete.getPlace();
          if (place.geometry && place.geometry.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            
            // Strict LatLng boundary check using the requested validation pattern
            const coordinates = { lat, lng };
            if (!coordinates || typeof coordinates.lat === 'undefined' || typeof coordinates.lng === 'undefined' || isNaN(coordinates.lat) || isNaN(coordinates.lng)) {
              console.warn("[Map Guard] Blocked execution due to uninitialized or malformed LatLng values.");
              return;
            }

            // Dynamic fetch of Places Photo array
            let imgUrl = undefined;
            if (place.photos && place.photos.length > 0) {
              try {
                imgUrl = place.photos[0].getUrl({ maxWidth: 600 });
              } catch (photoErr) {
                console.warn('Autocomplete image parsing error (gracefully caught):', photoErr);
              }
            }

            onLocationChange({
              id: Math.random().toString(36).substring(2, 9),
              title: place.name || 'Discovered Location',
              lat,
              lng,
              zoom: 16,
              region: place.formatted_address || 'WGS-84 coordinate system',
              category: 'Explored Target',
              description: place.formatted_address || 'An exciting landmark resolved through standard search autocompletion API.',
              imageUrl: imgUrl
            });
          }
        } catch (callbackErr) {
          console.error("[Map Guard] Error inside autocomplete place_changed callback:", callbackErr);
        }
      });

      return () => {
        try {
          listener.remove();
        } catch (removeErr) {
          console.warn("[Map Guard] Failed to remove autocomplete listener:", removeErr);
        }
      };
    } catch (initErr) {
      console.error("[Map Guard] Autocomplete service initialization failed:", initErr);
    }
  }, [placesLibrary, map, onLocationChange]);

  const handleZoomIn = () => {
    if (map) {
      try {
        const nextZoom = Math.min(21, (map.getZoom() || zoomLevel) + 1);
        map.setZoom(nextZoom);
        setZoomLevel(nextZoom);
      } catch (zoomInErr) {
        console.error("[Map Guard] Zoom in command failed:", zoomInErr);
      }
    }
  };

  const handleZoomOut = () => {
    if (map) {
      try {
        const nextZoom = Math.max(1, (map.getZoom() || zoomLevel) - 1);
        map.setZoom(nextZoom);
        setZoomLevel(nextZoom);
      } catch (zoomOutErr) {
        console.error("[Map Guard] Zoom out command failed:", zoomOutErr);
      }
    }
  };

  const handleRecenter = () => {
    if (map) {
      // Strict LatLng boundary check using the requested validation pattern
      const coordinates = { lat: activeLocation.lat, lng: activeLocation.lng };
      if (!coordinates || typeof coordinates.lat === 'undefined' || typeof coordinates.lng === 'undefined' || isNaN(coordinates.lat) || isNaN(coordinates.lng)) {
        console.warn("[Map Guard] Blocked execution due to uninitialized or malformed LatLng values.");
        return;
      }

      try {
        map.panTo({ lat: activeLocation.lat, lng: activeLocation.lng });
        map.setZoom(16);
        setZoomLevel(16);
        
        // Zero-out tilts for absolute 2D look during rapid re-centering
        try {
          if (typeof map.setTilt === 'function') map.setTilt(0);
          if (typeof map.setHeading === 'function') map.setHeading(0);
        } catch (err) {}
      } catch (panErr) {
        console.error("[Map Guard] Recenter camera pan failed:", panErr);
      }
    }
  };

  const toggleSatellite = () => {
    try {
      setMapType(mapType === 'roadmap' ? 'hybrid' : 'roadmap');
    } catch (typeErr) {
      console.error("[Map Guard] Map type toggle error:", typeErr);
    }
  };

  return (
    <>
      {/* Top Search Autocomplete Floating Panel */}
      <div className="absolute top-6 left-6 z-20 max-w-sm w-full shrink-0">
        <div className="relative flex items-center bg-black/95 backdrop-blur-xl border border-stone-800 rounded-2xl shadow-2xl px-4 py-3.5 text-white">
          <Search className="w-4 h-4 text-cyan-400 shrink-0 mr-3" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search city palaces, monuments..."
            className="w-full bg-transparent border-none outline-none text-xs font-mono placeholder-stone-500 focus:ring-0 text-white"
          />
          <div className="shrink-0 flex items-center gap-1 ml-2 bg-cyan-500/15 border border-cyan-500/20 px-2 py-0.5 rounded-lg text-[7px] font-mono text-cyan-400 font-bold uppercase tracking-wider animate-pulse">
            <Sparkles className="w-2.5 h-2.5 shrink-0" />
            <span>Places_API</span>
          </div>
        </div>
      </div>

      {/* Floating control trigger cluster */}
      <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-2">
        
        {/* Recenter Lock */}
        <button
          onClick={handleRecenter}
          className="w-10 h-10 rounded-xl bg-black/95 hover:bg-stone-900 border border-stone-800 text-cyan-400 hover:text-white flex items-center justify-center transition-all shadow-xl cursor-pointer"
          title="Recenter Camera on Pinned Coordinates"
        >
          <Compass className="w-4.5 h-4.5" />
        </button>

        {/* Satellite Map Toggle */}
        <button
          onClick={toggleSatellite}
          className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all shadow-xl cursor-pointer ${
            mapType === 'hybrid'
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
              : 'bg-black/95 hover:bg-stone-900 border-stone-800 text-cyan-400 hover:text-white'
          }`}
          title="Toggle Satellite Viewport"
        >
          <Layers className="w-4.5 h-4.5" />
        </button>

        {/* Zoom In */}
        <button
          onClick={handleZoomIn}
          className="w-10 h-10 rounded-xl bg-black/95 hover:bg-stone-900 border border-stone-800 text-cyan-400 hover:text-white flex items-center justify-center transition-all shadow-xl cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4.5 h-4.5" />
        </button>

        {/* Zoom Out */}
        <button
          onClick={handleZoomOut}
          className="w-10 h-10 rounded-xl bg-black/95 hover:bg-stone-900 border border-stone-800 text-cyan-400 hover:text-white flex items-center justify-center transition-all shadow-xl cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4.5 h-4.5" />
        </button>

        {/* Immediate Street View Toggle */}
        <button
          onClick={() => {
            try {
              onViewModeChange('streetview');
            } catch (viewErr) {
              console.error("[Map Guard] ViewMode change trigger failed:", viewErr);
            }
          }}
          className="w-10 h-10 rounded-xl bg-black/95 hover:bg-stone-900 border border-stone-800 text-cyan-400 hover:text-white flex items-center justify-center transition-all shadow-xl cursor-pointer"
          title="Quick Street View Mode"
        >
          <Eye className="w-4.5 h-4.5" />
        </button>
      </div>
    </>
  );
}

// Marker component wrapper with rigid coordination sanitization and Map context guard
function ActiveCustomMarker({
  position,
  title,
  onClick
}: {
  position: google.maps.LatLngLiteral;
  title: string;
  onClick: () => void;
}) {
  const [markerRef] = useAdvancedMarkerRef();
  const map = useMap();

  if (!map) return null;

  // Enforce absolute sanitization on the coordinate numbers using the requested validation pattern
  const coordinates = position;
  if (!coordinates || typeof coordinates.lat === 'undefined' || typeof coordinates.lng === 'undefined' || isNaN(coordinates.lat) || isNaN(coordinates.lng)) {
    console.warn("[Map Guard] Blocked execution due to uninitialized or malformed LatLng values.");
    return null;
  }

  return (
    <AdvancedMarker
      ref={markerRef}
      position={{ lat: coordinates.lat, lng: coordinates.lng }}
      title={title}
      onClick={() => {
        try {
          onClick();
        } catch (clickErr) {
          console.error("[Map Guard] Active marker click event failed:", clickErr);
        }
      }}
    >
      <div className="relative flex items-center justify-center cursor-pointer select-none">
        <span className="absolute animate-ping inline-flex h-11 w-11 rounded-full bg-cyan-400/40" />
        <span className="absolute animate-ping inline-flex h-18 w-18 rounded-full bg-cyan-500/10" style={{ animationDuration: '3s' }} />

        <svg
          width="34"
          height="44"
          viewBox="0 0 36 46"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="filter drop-shadow-[0_4px_10px_rgba(6,182,212,0.6)]"
        >
          <path
            d="M18 0C8.05888 0 0 8.05888 0 18C0 27.5304 7.23438 33.7431 15.3406 43.6828C16.8125 45.4875 19.1875 45.4875 20.6594 43.6828C28.7656 33.7431 36 27.5304 36 18C36 8.05888 27.9411 0 18 0ZM18 26C13.5817 26 10 22.4183 10 18C10 13.5817 13.5817 10 18 10C22.4183 10 26 13.5817 26 18C26 22.4183 22.4183 26 18 26Z"
            fill="url(#ultimate_marker_gradient)"
          />
          <circle cx="18" cy="18" r="4.5" fill="#ffffff" />
          <defs>
            <linearGradient id="ultimate_marker_gradient" x1="18" y1="0" x2="18" y2="46" gradientUnits="userSpaceOnUse">
              <stop stopColor="#00f0ff" />
              <stop offset="1" stopColor="#0066ff" />
            </linearGradient>
          </defs>
        </svg>

        <div className="absolute -top-7 bg-black/95 border border-cyan-400/45 rounded-lg px-2 py-0.5 shadow-2xl">
          <span className="text-[7.5px] font-mono uppercase font-black tracking-widest text-cyan-300 whitespace-nowrap block">
            {title}
          </span>
        </div>
      </div>
    </AdvancedMarker>
  );
}

// Master component wrapper managing safe coordinate checking and Map rendering locks
function SafeMarkers({
  landmarks,
  explorerState,
  activeLandmark,
  onLocationChange,
  setIsCardOpen
}: {
  landmarks: Array<GlobeLocation & { imageUrl?: string }>;
  explorerState: any;
  activeLandmark: any;
  onLocationChange: (l: any) => void;
  setIsCardOpen: (open: boolean) => void;
}) {
  const map = useMap();

  // 1. MAP CONTEXT GUARD: If map reference context is not fully loaded, render absolutely nothing
  if (!map) {
    return null;
  }

  // Helper coordinate sanitizing engine
  const sanitizeValue = (val: any, fallback: number): number => {
    if (val === undefined || val === null) return fallback;
    const parsed = Number(val);
    return isNaN(parsed) ? fallback : parsed;
  };

  const activeLat = sanitizeValue(explorerState.lat, 26.9258);
  const activeLng = sanitizeValue(explorerState.lng, 75.8237);

  // Strict LatLng boundary check using the requested validation pattern
  const activeCoords = { lat: activeLat, lng: activeLng };
  if (!activeCoords || typeof activeCoords.lat === 'undefined' || typeof activeCoords.lng === 'undefined' || isNaN(activeCoords.lat) || isNaN(activeCoords.lng)) {
    console.warn("[Map Guard] Blocked execution due to uninitialized or malformed LatLng values.");
    return null;
  }

  return (
    <>
      {/* 2. COORDINATE SANITIZATION & 3. STABLE KEY ASSIGNMENT: Target custom pinpoint */}
      <ActiveCustomMarker 
        key={`active-center-marker-${explorerState.activeLandmarkId || 'custom'}-${activeLat}-${activeLng}`}
        position={{ lat: activeLat, lng: activeLng }}
        title={activeLandmark?.title || 'Target'}
        onClick={() => {
          try {
            setIsCardOpen(true);
          } catch (openErr) {
            console.error("[Map Guard] Failed to trigger card opening:", openErr);
          }
        }}
      />

      {/* Array loop mapping safe secondary landmark pins */}
      {landmarks.map((landmark) => {
        const landmarkLat = sanitizeValue(landmark.lat, 0);
        const landmarkLng = sanitizeValue(landmark.lng, 0);

        // Strict LatLng boundary check using the requested validation pattern
        const landmarkCoords = { lat: landmarkLat, lng: landmarkLng };
        if (!landmarkCoords || typeof landmarkCoords.lat === 'undefined' || typeof landmarkCoords.lng === 'undefined' || isNaN(landmarkCoords.lat) || isNaN(landmarkCoords.lng)) {
          console.warn("[Map Guard] Blocked execution due to uninitialized or malformed LatLng values.");
          return null;
        }

        // Exclude the active landmark coordinate to avoid double rendering clashes
        const isSelf = Math.abs(landmarkLat - activeLat) < 0.0001 &&
                       Math.abs(landmarkLng - activeLng) < 0.0001;
        if (isSelf) return null;

        return (
          <AdvancedMarker
            key={`landmark-marker-${landmark.id}-${landmarkLat}-${landmarkLng}`}
            position={{ lat: landmarkLat, lng: landmarkLng }}
            title={landmark.title}
            onClick={() => {
              try {
                onLocationChange(landmark);
                setIsCardOpen(true);
              } catch (clickErr) {
                console.error("[Map Guard] Landmark marker click failure:", clickErr);
              }
            }}
          >
            <div className="group relative cursor-pointer flex items-center justify-center">
              <div className="w-5.5 h-5.5 bg-black/95 border-2 border-cyan-400 rounded-full flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.4)] transition-transform hover:scale-125">
                <div className="w-1.5 h-1.5 bg-cyan-300 rounded-full animate-pulse" />
              </div>
              <div className="absolute top-7 left-1/2 -translate-x-1/2 bg-black/95 border border-stone-800 px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-wider text-cyan-300 pointer-events-none opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                {landmark.title}
              </div>
            </div>
          </AdvancedMarker>
        );
      })}
    </>
  );
}
