import { useState, useEffect, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Map as MapIcon, Compass, Sparkles, Navigation, MapPin, Loader2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasMapsKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

interface GMapExperienceDeckProps {
  lat: number;
  lng: number;
  placeName: string;
}

// Inner Component for Street View Panorama
function StreetViewPanorama({ lat, lng }: { lat: number; lng: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapsLib = useMapsLibrary('maps');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current || !mapsLib) return;

    setLoading(true);
    setError(null);

    const googleMaps = mapsLib as any;
    const svService = new googleMaps.StreetViewService();
    
    // Check if Street View is available within 100 meters
    svService.getPanorama({
      location: { lat, lng },
      radius: 100,
      sources: [googleMaps.StreetViewSource.DEFAULT]
    }, (data, status) => {
      if (status === googleMaps.StreetViewStatus.OK && data && data.location && data.location.pano) {
        new googleMaps.StreetViewPanorama(containerRef.current!, {
          pano: data.location.pano,
          pov: { heading: 180, pitch: 0 },
          zoom: 1,
          visible: true,
          disableDefaultUI: false,
        });
        setLoading(false);
      } else {
        setError("Street View panorama is not available at this exact historic location.");
        setLoading(false);
      }
    });
  }, [lat, lng, mapsLib]);

  return (
    <div className="relative w-full h-[300px] rounded-3xl overflow-hidden bg-stone-900 border border-stone-800">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-stone-950 text-stone-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#00af87]" />
          <span className="text-[10px] font-mono uppercase tracking-widest">Scanning street horizon...</span>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-stone-950 text-stone-400">
          <Compass className="w-8 h-8 mb-2 text-stone-500 animate-pulse" />
          <p className="text-xs font-serif italic text-stone-300 mb-1">{error}</p>
          <p className="text-[9px] font-mono uppercase tracking-widest opacity-40">Coordinates: {lat.toFixed(4)}°N, {lng.toFixed(4)}°E</p>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" style={{ visibility: error ? 'hidden' : 'visible' }} />
    </div>
  );
}

// Inner Component for Nearby Places Explorer
function NearbyLandmarks({ lat, lng }: { lat: number; lng: number }) {
  const placesLib = useMapsLibrary('places');
  const [landmarks, setLandmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNearby = async () => {
    if (!placesLib) return;
    setLoading(true);
    setError(null);

    try {
      // Using Places API (New) Nearby Search
      const { places } = await placesLib.Place.searchNearby({
        fields: ['id', 'displayName', 'formattedAddress', 'location', 'types', 'rating'],
        locationRestriction: {
          center: { lat, lng },
          radius: 3000,
        },
        includedTypes: ['tourist_attraction', 'museum', 'landmark', 'historical_place', 'park'],
        maxResultCount: 6,
      });

      if (places && places.length > 0) {
        setLandmarks(places);
      } else {
        setLandmarks([]);
        setError("No major landmark metadata registered near these coordinates.");
      }
    } catch (err: any) {
      console.error("Nearby Search Error:", err);
      setError("Unable to retrieve nearby coordinates from Google Places API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNearby();
  }, [lat, lng, placesLib]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-[#141414]/40 font-mono">
          Places API Real-Time Scan
        </span>
        <button 
          onClick={fetchNearby}
          disabled={loading}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest bg-[#f8f8f5] border border-[#141414]/5 hover:bg-[#141414] hover:text-white transition-all disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-2.5 h-2.5 ${loading ? 'animate-spin' : ''}`} /> Sync
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-[#f8f8f5] rounded-2xl animate-pulse border border-[#141414]/5" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 bg-[#f8f8f5] rounded-3xl border border-[#141414]/5 text-center">
          <Sparkles className="w-6 h-6 mx-auto mb-2 text-stone-400" />
          <p className="text-xs font-serif italic text-[#141414]/60">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {landmarks.map((place, i) => (
            <motion.div
              key={place.id || i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 bg-[#f8f8f5] rounded-2xl border border-[#141414]/5 hover:border-[#00af87] hover:bg-white transition-all duration-300 flex items-start gap-3 text-left group"
            >
              <div className="p-2.5 bg-[#00af87]/10 text-[#00af87] rounded-xl group-hover:scale-110 transition-transform">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="font-serif italic font-bold text-sm text-[#141414] truncate mb-0.5">
                  {place.displayName}
                </h5>
                <p className="text-[10px] text-[#141414]/50 truncate mb-1">
                  {place.formattedAddress || 'Nearby attraction'}
                </p>
                {place.rating && (
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-mono text-[#141414]/40">Rating:</span>
                    <span className="text-[10px] font-bold text-amber-600">★ {place.rating}</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GMapExperienceDeck({ lat, lng, placeName }: GMapExperienceDeckProps) {
  const [activeTab, setActiveTab] = useState<'map' | 'streetview' | 'landmarks'>('map');

  if (!hasMapsKey) {
    return (
      <div className="my-8 p-6 bg-amber-500/5 border border-amber-500/10 rounded-3xl text-left flex items-start gap-4">
        <div className="p-3 bg-amber-500/10 text-amber-700 rounded-2xl">
          <MapIcon className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h4 className="font-serif italic font-bold text-base text-[#141414] mb-1">
            Google Maps Experience Deck Available
          </h4>
          <p className="text-xs text-[#141414]/60 leading-relaxed mb-3">
            Unlock professional full-scale mapping inside this modal! Saving your Google Maps Platform API key will activate:
          </p>
          <div className="grid grid-cols-3 gap-2.5 text-[10px] uppercase font-black tracking-wider text-[#141414]/70 font-mono">
            <div className="flex items-center gap-1.5 p-2 bg-[#f8f8f5] rounded-xl"><MapPin className="w-3.5 h-3.5 text-[#00af87]" /> Dynamic Map</div>
            <div className="flex items-center gap-1.5 p-2 bg-[#f8f8f5] rounded-xl"><Compass className="w-3.5 h-3.5 text-blue-500" /> Street View</div>
            <div className="flex items-center gap-1.5 p-2 bg-[#f8f8f5] rounded-xl"><Sparkles className="w-3.5 h-3.5 text-amber-500" /> Nearby Gems</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY} version="weekly">
      <div className="my-8 border border-[#141414]/10 rounded-[36px] bg-white overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.02)] flex flex-col">
        {/* Experience Header Tabs */}
        <div className="flex items-center justify-between border-b border-[#141414]/5 px-6 py-4.5 bg-[#fcfcf9]">
          <div className="flex items-center gap-2">
            <MapIcon className="w-4 h-4 text-[#00af87] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#141414] font-mono">
              MAPS_ENGINE
            </span>
          </div>
          <div className="flex items-center gap-1.5 p-1 bg-[#f0f0eb] rounded-xl">
            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                activeTab === 'map'
                  ? 'bg-white text-[#141414] shadow-sm'
                  : 'text-[#141414]/50 hover:text-[#141414]'
              }`}
            >
              <MapIcon className="w-3 h-3" /> Map
            </button>
            <button
              onClick={() => setActiveTab('streetview')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                activeTab === 'streetview'
                  ? 'bg-white text-[#141414] shadow-sm'
                  : 'text-[#141414]/50 hover:text-[#141414]'
              }`}
            >
              <Compass className="w-3 h-3" /> Street View
            </button>
            <button
              onClick={() => setActiveTab('landmarks')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                activeTab === 'landmarks'
                  ? 'bg-white text-[#141414] shadow-sm'
                  : 'text-[#141414]/50 hover:text-[#141414]'
              }`}
            >
              <Sparkles className="w-3 h-3" /> Nearby Gems
            </button>
          </div>
        </div>

        {/* Tab Content Canvas */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'map' && (
              <motion.div
                key="map"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="relative w-full h-[300px] rounded-3xl overflow-hidden border border-[#141414]/5 shadow-inner">
                  <Map
                    defaultCenter={{ lat, lng }}
                    defaultZoom={15}
                    center={{ lat, lng }}
                    mapId="LANDMARK_DETAIL_MAP"
                    gestureHandling="greedy"
                    disableDefaultUI={false}
                    style={{ width: '100%', height: '100%' }}
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  >
                    <AdvancedMarker position={{ lat, lng }} title={placeName}>
                      <Pin background="#00af87" glyphColor="#fff" borderColor="#fff" />
                    </AdvancedMarker>
                  </Map>

                  <div className="absolute bottom-4 right-4 z-10">
                    <button
                      onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank')}
                      className="px-4.5 py-2.5 bg-[#141414] text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg hover:bg-stone-800 transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                    >
                      <Navigation className="w-3.5 h-3.5" /> Direct Navigation
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-[#141414]/50 px-1">
                  <span>GPS: {lat.toFixed(6)}, {lng.toFixed(6)}</span>
                  <span>Interactive Map Engine Online</span>
                </div>
              </motion.div>
            )}

            {activeTab === 'streetview' && (
              <motion.div
                key="streetview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <StreetViewPanorama lat={lat} lng={lng} />
              </motion.div>
            )}

            {activeTab === 'landmarks' && (
              <motion.div
                key="landmarks"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <NearbyLandmarks lat={lat} lng={lng} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </APIProvider>
  );
}
