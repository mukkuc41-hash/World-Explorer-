import React, { useState, useEffect } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Car, 
  Footprints, 
  Home, 
  Compass, 
  Navigation, 
  Clock, 
  Activity, 
  Settings, 
  MapPin, 
  ChevronRight,
  AlertTriangle
} from 'lucide-react';

export interface Coordinate {
  lat: number;
  lng: number;
  name: string;
}

// Famous World Home bases for convenient testing & custom inputs
const HOME_PRESETS: Coordinate[] = [
  { name: 'Jaipur (Old City)', lat: 26.9124, lng: 75.7873 },
  { name: 'Eiffel Tower (Paris)', lat: 48.8584, lng: 2.2945 },
  { name: 'Central Park (NYC)', lat: 40.7851, lng: -73.9682 },
  { name: 'Tokyo Station', lat: 35.6812, lng: 139.7671 },
];

interface DistanceMatrixCalculatorProps {
  destLat: number;
  destLng: number;
  destTitle: string;
}

interface ETAResult {
  distance: string;
  duration: string;
}

export default function DistanceMatrixCalculator({
  destLat,
  destLng,
  destTitle
}: DistanceMatrixCalculatorProps) {
  const routesLib = useMapsLibrary('routes');
  const [selectedHomeIdx, setSelectedHomeIdx] = useState(0);
  const [isSettingOpen, setIsSettingOpen] = useState(false);
  
  // Custom Home support
  const [customHome, setCustomHome] = useState<Coordinate | null>(null);
  const [customLat, setCustomLat] = useState('26.9124');
  const [customLng, setCustomLng] = useState('75.7873');
  const [customName, setCustomName] = useState('Custom Base');

  const currentHome = customHome || HOME_PRESETS[selectedHomeIdx];

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [drivingETA, setDrivingETA] = useState<ETAResult | null>(null);
  const [walkingETA, setWalkingETA] = useState<ETAResult | null>(null);

  useEffect(() => {
    // Distance calculation requires the google.maps routes library and destination coordinates
    if (!routesLib || !destLat || !destLng) return;

    const google = (window as any).google;
    if (!google || !google.maps) return;

    setLoading(true);
    setError(null);

    const service = new google.maps.DistanceMatrixService();
    const origin = new google.maps.LatLng(currentHome.lat, currentHome.lng);
    const destination = new google.maps.LatLng(destLat, destLng);

    // Call service for Driving
    const fetchDriving = new Promise<ETAResult>((resolve, reject) => {
      service.getDistanceMatrix(
        {
          origins: [origin],
          destinations: [destination],
          travelMode: google.maps.TravelMode.DRIVING,
          unitSystem: google.maps.UnitSystem.METRIC
        },
        (response: any, status: string) => {
          if (status === 'OK' && response && response.rows[0]?.elements[0]) {
            const element = response.rows[0].elements[0];
            if (element.status === 'OK') {
              resolve({
                distance: element.distance.text,
                duration: element.duration.text
              });
            } else {
              reject(new Error(`Driving route status: ${element.status}`));
            }
          } else {
            reject(new Error(`Service failure status: ${status}`));
          }
        }
      );
    });

    // Call service for Walking
    const fetchWalking = new Promise<ETAResult>((resolve, reject) => {
      service.getDistanceMatrix(
        {
          origins: [origin],
          destinations: [destination],
          travelMode: google.maps.TravelMode.WALKING,
          unitSystem: google.maps.UnitSystem.METRIC
        },
        (response: any, status: string) => {
          if (status === 'OK' && response && response.rows[0]?.elements[0]) {
            const element = response.rows[0].elements[0];
            if (element.status === 'OK') {
              resolve({
                distance: element.distance.text,
                duration: element.duration.text
              });
            } else {
              reject(new Error(`Walking route status: ${element.status}`));
            }
          } else {
            reject(new Error(`Service failure status: ${status}`));
          }
        }
      );
    });

    let isMounted = true;

    Promise.allSettled([fetchDriving, fetchWalking]).then(([drivingRes, walkingRes]) => {
      if (!isMounted) return;

      if (drivingRes.status === 'fulfilled') {
        setDrivingETA(drivingRes.value);
      } else {
        setDrivingETA(null);
      }

      if (walkingRes.status === 'fulfilled') {
        setWalkingETA(walkingRes.value);
      } else {
        setWalkingETA(null);
      }

      if (drivingRes.status === 'rejected' && walkingRes.status === 'rejected') {
        const dErr = (drivingRes as PromiseRejectedResult).reason?.message || '';
        if (dErr.includes('ZERO_RESULTS')) {
          setError('No viable land-route exists (e.g. crossing oceans/continents).');
        } else {
          setError('Unable to fetch routing distances.');
        }
      }

      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [routesLib, destLat, destLng, currentHome.lat, currentHome.lng]);

  const handleApplyCustomHome = (e: React.FormEvent) => {
    e.preventDefault();
    const latNum = parseFloat(customLat);
    const lngNum = parseFloat(customLng);
    
    if (isNaN(latNum) || isNaN(lngNum)) {
      alert('Please input valid float coordinates.');
      return;
    }

    setCustomHome({
      name: customName || 'Custom Base',
      lat: latNum,
      lng: lngNum
    });
    setIsSettingOpen(false);
  };

  const handleClearCustom = () => {
    setCustomHome(null);
    setSelectedHomeIdx(0);
  };

  return (
    <div className="bg-[#0b0c10]/95 border border-stone-800 rounded-2xl p-4.5 text-white font-mono shadow-xl relative overflow-hidden backdrop-blur-xl">
      {/* Background glow strip */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-cyan-400 to-indigo-500" />
      
      {/* HUD Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-800/80 mb-3.5">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold tracking-wider text-stone-200">TELEMETRY_DISTANCE_MATRIX</span>
        </div>
        <button
          onClick={() => setIsSettingOpen(!isSettingOpen)}
          className="text-stone-400 hover:text-white p-1 rounded hover:bg-stone-800/40 transition-colors cursor-pointer"
          title="Configure Home Base Coordinate"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Preset select & configurations layout */}
      <AnimatePresence>
        {isSettingOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-b border-stone-800/60 pb-3 mb-3"
          >
            <div className="bg-stone-900/40 p-3 rounded-xl space-y-3 border border-stone-800/40">
              <span className="text-[8px] font-black text-cyan-400 tracking-wider block">CHOOSE TELEMETRY BASE:</span>
              <div className="grid grid-cols-2 gap-2">
                {HOME_PRESETS.map((p, idx) => {
                  const isAct = !customHome && selectedHomeIdx === idx;
                  return (
                    <button
                      key={p.name}
                      onClick={() => {
                        setCustomHome(null);
                        setSelectedHomeIdx(idx);
                      }}
                      className={`text-[8.5px] p-2 rounded-lg border text-left truncate transition-all cursor-pointer ${
                        isAct 
                          ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300 font-bold' 
                          : 'bg-black/40 border-stone-800 hover:border-stone-700 text-stone-400'
                      }`}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>

              {/* Form to submit manual inputs */}
              <form onSubmit={handleApplyCustomHome} className="space-y-2 border-t border-stone-800/60 pt-2.5">
                <span className="text-[8px] font-black text-cyan-400 tracking-wider block">ENTER CUSTOM COORDINATES:</span>
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="Base Name (e.g. London)"
                  className="w-full text-[9px] bg-black/60 border border-stone-800 p-1.5 rounded text-white focus:outline-none focus:border-cyan-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={customLat}
                    onChange={e => setCustomLat(e.target.value)}
                    placeholder="Latitude"
                    className="w-full text-[9px] bg-black/60 border border-stone-800 p-1.5 rounded text-white focus:outline-none focus:border-cyan-500"
                  />
                  <input
                    type="text"
                    value={customLng}
                    onChange={e => setCustomLng(e.target.value)}
                    placeholder="Longitude"
                    className="w-full text-[9px] bg-black/60 border border-stone-800 p-1.5 rounded text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 text-[8.5px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 py-1.5 rounded cursor-pointer transition-colors"
                  >
                    Set Base
                  </button>
                  {customHome && (
                    <button
                      type="button"
                      onClick={handleClearCustom}
                      className="text-[8.5px] font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-2 py-1.5 rounded cursor-pointer transition-colors"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Origin / Destination Display Nodes */}
      <div className="bg-stone-950/60 border border-stone-900 rounded-xl p-2.5 mb-3.5 space-y-2 text-[10px]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
          <span className="text-stone-400 font-bold">HOME BASE:</span>
          <span className="text-white font-medium truncate flex-1 text-right">{currentHome.name}</span>
        </div>
        <div className="flex items-center gap-2 border-t border-stone-900 pt-2">
          <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping shrink-0" />
          <span className="text-stone-400 font-bold">TARGET:</span>
          <span className="text-white font-medium truncate flex-1 text-right">{destTitle}</span>
        </div>
      </div>

      {/* Telemetry Output Metrics */}
      {loading ? (
        <div className="py-6 flex flex-col items-center justify-center gap-2">
          <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-[9px] text-stone-500 tracking-wider">CALCULATING ORBITAL LINK...</span>
        </div>
      ) : error ? (
        <div className="bg-red-950/20 border border-red-900/30 text-red-400 p-3 rounded-xl flex items-start gap-2 text-[9.5px]">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {/* Driving card */}
          <div className="bg-stone-900/30 border border-stone-800/50 rounded-xl p-3 flex flex-col justify-between hover:border-emerald-500/20 transition-all group">
            <div className="flex items-center gap-2 text-stone-400 mb-2">
              <Car className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="text-[8px] font-black uppercase tracking-wider">DRIVE ETA</span>
            </div>
            {drivingETA ? (
              <div className="space-y-0.5">
                <span className="text-lg font-serif font-black text-white italic leading-none">{drivingETA.duration}</span>
                <span className="text-[8.5px] text-stone-500 block">Distance: {drivingETA.distance}</span>
              </div>
            ) : (
              <span className="text-[9px] text-stone-500 italic">No drive road</span>
            )}
          </div>

          {/* Walking card */}
          <div className="bg-stone-900/30 border border-stone-800/50 rounded-xl p-3 flex flex-col justify-between hover:border-cyan-500/20 transition-all group">
            <div className="flex items-center gap-2 text-stone-400 mb-2">
              <Footprints className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="text-[8px] font-black uppercase tracking-wider">WALK ETA</span>
            </div>
            {walkingETA ? (
              <div className="space-y-0.5">
                <span className="text-lg font-serif font-black text-white italic leading-none">{walkingETA.duration}</span>
                <span className="text-[8.5px] text-stone-500 block">Distance: {walkingETA.distance}</span>
              </div>
            ) : (
              <span className="text-[9px] text-stone-500 italic">No walk path</span>
            )}
          </div>
        </div>
      )}

      {/* Small informative bottom tag */}
      <div className="pt-2.5 mt-3.5 border-t border-stone-900 text-[7.5px] text-stone-600 leading-snug">
        * Estimates are calculated live via the standard <code>google.maps.DistanceMatrixService</code> framework.
      </div>
    </div>
  );
}
