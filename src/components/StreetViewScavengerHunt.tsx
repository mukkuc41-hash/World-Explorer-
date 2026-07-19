// TODO: Insert your Google Maps API Key here.
// The Google Maps Platform Key is configured via process.env.GOOGLE_MAPS_PLATFORM_KEY in the environment.

import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  Compass, Map, Navigation, HelpCircle, RefreshCw, Milestone, 
  Volume2, VolumeX, ArrowRight, Info, AlertCircle, Trophy, 
  MapPin, CheckCircle2, Flag, Timer, ChevronRight, Play, Eye
} from 'lucide-react';

interface Point {
  lat: number;
  lng: number;
  name?: string;
}

const LOCATION_HUBS = [
  { name: "Eiffel Tower Area, Paris", lat: 48.8584, lng: 2.2945 },
  { name: "Taj Mahal Complex, Agra", lat: 27.1751, lng: 78.0421 },
  { name: "Statue of Liberty Island, New York", lat: 40.6892, lng: -74.0445 },
  { name: "Colosseum Surroundings, Rome", lat: 41.8902, lng: 12.4922 },
  { name: "Sydney Opera House, Australia", lat: -33.8568, lng: 151.2153 },
  { name: "Times Square, New York", lat: 40.7580, lng: -73.9855 },
  { name: "Trafalgar Square, London", lat: 51.5072, lng: -0.1276 },
  { name: "Shibuya Crossing, Tokyo", lat: 35.6595, lng: 139.7005 },
  { name: "Acropolis Area, Athens", lat: 37.9715, lng: 23.7257 },
  { name: "Marina Bay Sands, Singapore", lat: 1.3521, lng: 103.8198 },
  { name: "Golden Gate Bridge Park, San Francisco", lat: 37.8199, lng: -122.4783 },
  { name: "Duomo Plaza, Milan", lat: 45.4641, lng: 9.1919 },
  { name: "Brandenburg Gate, Berlin", lat: 52.5163, lng: 13.3777 },
  { name: "Rijksmuseum Area, Amsterdam", lat: 52.3600, lng: 4.8852 },
  { name: "Grand Canal, Venice", lat: 45.4408, lng: 12.3155 },
  { name: "Plaza Mayor, Madrid", lat: 40.4154, lng: -3.7074 },
  { name: "Table Mountain Road, Cape Town", lat: -33.9249, lng: 18.4241 },
  { name: "Copacabana Coast, Rio de Janeiro", lat: -22.9714, lng: -43.1825 }
];

interface StreetViewScavengerHuntProps {
  onBack: () => void;
}

export default function StreetViewScavengerHunt({ onBack }: StreetViewScavengerHuntProps) {
  const [apiKey] = useState<string>(process.env.GOOGLE_MAPS_PLATFORM_KEY || '');
  const [apiLoaded, setApiLoaded] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Game States
  const [gameState, setGameState] = useState<'idle' | 'loading' | 'playing' | 'won' | 'lost'>('idle');
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [targetPoint, setTargetPoint] = useState<Point | null>(null);
  const [currentPosition, setCurrentPosition] = useState<Point | null>(null);
  const [distance, setDistance] = useState<number | null>(null); // in meters
  const [timeLeft, setTimeLeft] = useState<number>(0); // in seconds
  const [timeLimit, setTimeLimit] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('scavenger_hunt_high_score') || '0', 10);
  });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(true);

  // References
  const panoramaContainerRef = useRef<HTMLDivElement | null>(null);
  const miniMapContainerRef = useRef<HTMLDivElement | null>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const miniMapRef = useRef<L.Map | null>(null);
  const playerMarkerRef = useRef<L.Marker | null>(null);
  const targetMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load Google Maps Script
  useEffect(() => {
    if (!apiKey) {
      setApiError("Google Maps API Key is missing. Please set your GOOGLE_MAPS_PLATFORM_KEY in your env/secrets settings.");
      return;
    }

    const loadScript = () => {
      if ((window as any).google && (window as any).google.maps) {
        setApiLoaded(true);
        return;
      }

      const existingScript = document.getElementById('google-maps-scavenger-script');
      if (existingScript) {
        setApiLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-maps-scavenger-script';
      // Ensure the &libraries=streetView parameter is included in the script source as requested
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=streetView`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setApiLoaded(true);
      };
      script.onerror = () => {
        setApiError("Failed to load Google Maps script. Check your API key or network connection.");
      };
      document.head.appendChild(script);
    };

    loadScript();
  }, [apiKey]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  // Web Audio Sound FX Generator
  const playSound = (type: 'correct' | 'incorrect' | 'click' | 'teleport' | 'warning' | 'win') => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      if (type === 'click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } else if (type === 'teleport') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      } else if (type === 'win') {
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25];
        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.1);
          gain.gain.setValueAtTime(0.12, ctx.currentTime + index * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + index * 0.1 + 0.4);
          osc.start(ctx.currentTime + index * 0.1);
          osc.stop(ctx.currentTime + index * 0.1 + 0.4);
        });
      } else if (type === 'incorrect') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(90, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      } else if (type === 'warning') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch (e) {
      console.warn("Web Audio API not supported or allowed", e);
    }
  };

  // Haversine Formula for Great Circle Distance calculation in meters
  const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in meters
  };

  // Dynamic Teleportation Engine: Get valid Street View Coordinates
  const getValidLocation = async (): Promise<Point> => {
    const google = (window as any).google;
    if (!google || !google.maps) {
      throw new Error("Google Maps API is not loaded.");
    }

    const svService = new google.maps.StreetViewService();
    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
      attempts++;
      // Choose a random location hub
      const hub = LOCATION_HUBS[Math.floor(Math.random() * LOCATION_HUBS.length)];
      
      // Generate a small random offset within ~500m to 3km (0.005 to 0.03 degrees)
      const latOffset = (Math.random() - 0.5) * 0.012;
      const lngOffset = (Math.random() - 0.5) * 0.012;
      const searchLat = hub.lat + latOffset;
      const searchLng = hub.lng + lngOffset;

      try {
        const result = await new Promise<any>((resolve, reject) => {
          svService.getPanorama(
            {
              location: { lat: searchLat, lng: searchLng },
              radius: 1000, // Search within 1000m radius
              preference: google.maps.StreetViewPreference.NEAREST,
              sources: [google.maps.StreetViewSource.OUTDOOR]
            },
            (data: any, status: any) => {
              if (status === google.maps.StreetViewStatus.OK && data && data.location && data.location.latLng) {
                resolve(data);
              } else {
                reject(status);
              }
            }
          );
        });

        const finalLat = result.location.latLng.lat();
        const finalLng = result.location.latLng.lng();
        
        return {
          lat: finalLat,
          lng: finalLng,
          name: hub.name
        };
      } catch (err) {
        // Retry next iteration
        console.log(`Street view search retry ${attempts}/${maxAttempts}`);
      }
    }

    // Bumper fallback if loop fails to resolve
    const defaultHub = LOCATION_HUBS[Math.floor(Math.random() * LOCATION_HUBS.length)];
    return { lat: defaultHub.lat, lng: defaultHub.lng, name: defaultHub.name };
  };

  // Trigger loading the Scavenger game
  const loadModeScavenger = async () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    playSound('click');
    setGameState('loading');
    setStartPoint(null);
    setTargetPoint(null);
    setCurrentPosition(null);
    setDistance(null);
    setShowHint(false);

    try {
      // 1. Trigger getValidLocation() twice to acquire a random 'start' point and a random 'target' point
      const start = await getValidLocation();
      let target = await getValidLocation();

      // Ensure start and target are not exactly the same
      let distanceCheck = calculateHaversineDistance(start.lat, start.lng, target.lat, target.lng);
      let limitAttempts = 0;
      while (distanceCheck < 300 && limitAttempts < 5) {
        target = await getValidLocation();
        distanceCheck = calculateHaversineDistance(start.lat, start.lng, target.lat, target.lng);
        limitAttempts++;
      }

      setStartPoint(start);
      setTargetPoint(target);
      setCurrentPosition(start);
      
      // Calculate start distance using Haversine
      const initialDist = distanceCheck;
      setDistance(initialDist);

      // Set a time limit based on the distance (e.g., 1 minute for every 5km), with a floor of 60 seconds
      const distanceKm = initialDist / 1000;
      const calculatedMinutes = Math.ceil(distanceKm / 5);
      const allocatedSeconds = Math.max(60, calculatedMinutes * 60);

      setTimeLimit(allocatedSeconds);
      setTimeLeft(allocatedSeconds);
      setGameState('playing');
      playSound('teleport');

    } catch (error) {
      console.error("Failed to start Scavenger Hunt:", error);
      setApiError("Error initializing Street View locations. Please try again.");
      setGameState('idle');
    }
  };

  // Setup the Street View Panorama once game state changes to 'playing'
  useEffect(() => {
    if (gameState !== 'playing' || !startPoint || !targetPoint || !apiLoaded) return;

    const google = (window as any).google;
    if (!google || !google.maps) return;

    if (panoramaContainerRef.current) {
      // Create panorama inside the map/panorama container
      const panorama = new google.maps.StreetViewPanorama(panoramaContainerRef.current, {
        position: { lat: startPoint.lat, lng: startPoint.lng },
        pov: { heading: 34, pitch: 10 },
        zoom: 1,
        addressControl: false,
        linksControl: true,
        panControl: true,
        enableCloseButton: false,
        motionTracking: false,
        motionTrackingControl: false
      });

      panoramaRef.current = panorama;

      // Listen for position changes as the player navigates inside Street View
      panorama.addListener('position_changed', () => {
        const newPos = panorama.getPosition();
        if (newPos) {
          const currentLat = newPos.lat();
          const currentLng = newPos.lng();
          const newPoint = { lat: currentLat, lng: currentLng };
          
          setCurrentPosition(newPoint);

          // Recalculate distance
          const newDist = calculateHaversineDistance(currentLat, currentLng, targetPoint.lat, targetPoint.lng);
          setDistance(newDist);
        }
      });
    }

    // Initialize Leaflet Mini-Map if container is ready
    if (miniMapContainerRef.current) {
      if (miniMapRef.current) {
        miniMapRef.current.remove();
      }

      const map = L.map(miniMapContainerRef.current, {
        center: [startPoint.lat, startPoint.lng],
        zoom: 12,
        zoomControl: false,
        attributionControl: false
      });

      // Dark Mode Tile Style matching World Explorer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);

      // Custom divIcons for stunning visual indicators
      const startIcon = L.divIcon({
        className: 'custom-start-icon',
        html: `<div class="w-4 h-4 bg-blue-500 border-2 border-white rounded-full flex items-center justify-center shadow-lg transform -translate-x-1/2 -translate-y-1/2">
                 <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
               </div>`
      });

      const playerIcon = L.divIcon({
        className: 'custom-player-icon',
        html: `<div class="w-6 h-6 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center shadow-lg transform -translate-x-1/2 -translate-y-1/2 animate-pulse">
                 <div class="w-2.5 h-2.5 bg-white rounded-full"></div>
               </div>`
      });

      const targetIcon = L.divIcon({
        className: 'custom-target-icon',
        html: `<div class="w-7 h-7 bg-rose-500 border-2 border-white rounded-xl flex items-center justify-center shadow-lg transform -translate-x-1/2 -translate-y-1/2 animate-bounce">
                 <span class="text-xs">🎯</span>
               </div>`
      });

      // Add Start Marker
      L.marker([startPoint.lat, startPoint.lng], { icon: startIcon }).addTo(map)
        .bindPopup("<div class='text-xs text-black font-semibold'>Spawning Location</div>");

      // Add Player Marker
      const playerMarker = L.marker([startPoint.lat, startPoint.lng], { icon: playerIcon }).addTo(map);
      playerMarkerRef.current = playerMarker;

      // Add Target Marker
      const targetMarker = L.marker([targetPoint.lat, targetPoint.lng], { icon: targetIcon }).addTo(map);
      targetMarkerRef.current = targetMarker;

      // Connect with Polyline
      const polyline = L.polyline([[startPoint.lat, startPoint.lng], [targetPoint.lat, targetPoint.lng]], {
        color: '#10b981',
        weight: 2,
        dashArray: '5, 5',
        opacity: 0.6
      }).addTo(map);
      polylineRef.current = polyline;

      // Fit map to contain start and target bounds beautifully
      const bounds = L.latLngBounds([[startPoint.lat, startPoint.lng], [targetPoint.lat, targetPoint.lng]]);
      map.fitBounds(bounds, { padding: [30, 30] });

      miniMapRef.current = map;
    }

  }, [gameState, startPoint, targetPoint, apiLoaded]);

  // Sync Leaflet Mini-Map to Player position changes
  useEffect(() => {
    if (gameState !== 'playing' || !currentPosition || !targetPoint || !miniMapRef.current) return;

    const map = miniMapRef.current;

    // Update player marker coordinate
    if (playerMarkerRef.current) {
      playerMarkerRef.current.setLatLng([currentPosition.lat, currentPosition.lng]);
    }

    // Update Polyline representation
    if (polylineRef.current) {
      polylineRef.current.setLatLngs([
        [currentPosition.lat, currentPosition.lng],
        [targetPoint.lat, targetPoint.lng]
      ]);
    }

    // Keep player in center of mini-map view
    map.panTo([currentPosition.lat, currentPosition.lng]);

  }, [currentPosition, targetPoint, gameState]);

  // Main game loop (Interval + Precision Win Condition)
  useEffect(() => {
    if (gameState !== 'playing' || !targetPoint || !currentPosition) return;

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    // Start interval
    timerIntervalRef.current = setInterval(() => {
      // 1. Update the timer every second
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time Up -> Game Over
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          setGameState('lost');
          playSound('incorrect');
          return 0;
        }
        
        // play warning beep when time is critical
        if (prev <= 10) {
          playSound('warning');
        }

        return prev - 1;
      });

      // 2. Precise Win Condition:
      // Instead of a radius, check if the absolute difference between the player's current lat/lng
      // and the target lat/lng is less than 0.0001 (roughly 10 meters).
      const latDiff = Math.abs(currentPosition.lat - targetPoint.lat);
      const lngDiff = Math.abs(currentPosition.lng - targetPoint.lng);

      if (latDiff < 0.0001 && lngDiff < 0.0001) {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        
        // Trigger win sequence
        setGameState('won');
        
        // Calculate dynamic reward points
        const bonusPoints = Math.max(100, Math.round(timeLeft * 5));
        const finalReward = 1000 + bonusPoints;
        setScore(finalReward);

        const savedHigh = parseInt(localStorage.getItem('scavenger_hunt_high_score') || '0', 10);
        if (finalReward > savedHigh) {
          localStorage.setItem('scavenger_hunt_high_score', finalReward.toString());
          setHighScore(finalReward);
        }

        playSound('win');
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });

        // Prompt user: "Alert: Target Reached!" as explicitly requested
        setTimeout(() => {
          alert('Alert: Target Reached!');
        }, 100);
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [gameState, currentPosition, targetPoint]);

  // Teleport player back to start point
  const handleTeleportToStart = () => {
    if (!startPoint || !panoramaRef.current) return;
    playSound('teleport');
    panoramaRef.current.setPosition({ lat: startPoint.lat, lng: startPoint.lng });
    setCurrentPosition(startPoint);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* GAME STATUS HEADER HUD */}
      <div className="bg-[#141414] text-white p-5 rounded-[28px] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center shadow-inner">
            <Compass className="w-6 h-6" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider font-black text-emerald-400">Street View Arcade</span>
              <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-emerald-500/20">GPS MATCH</span>
            </div>
            <h1 className="font-serif italic text-2xl md:text-3xl tracking-tight mt-0.5">Teleportation Scavenger Hunt</h1>
          </div>
        </div>

        {/* Global Scores and Time HUD */}
        {gameState === 'playing' && (
          <div className="flex flex-wrap items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/10 relative z-10 w-full md:w-auto justify-around md:justify-start">
            <div className="text-center px-4">
              <span className="text-[9px] uppercase tracking-wider font-black text-white/50 block">Time Remaining</span>
              <span className={`font-mono text-xl font-black flex items-center justify-center gap-1.5 mt-0.5 ${timeLeft <= 15 ? 'text-rose-500 animate-pulse' : 'text-amber-400'}`}>
                <Timer className="w-4 h-4" /> {formatTime(timeLeft)}
              </span>
            </div>
            <div className="text-center border-x border-white/10 px-6">
              <span className="text-[9px] uppercase tracking-wider font-black text-white/50 block">Distance to Target</span>
              <span className="font-mono text-xl font-black text-emerald-400 block mt-0.5">
                {distance !== null ? `${Math.round(distance).toLocaleString()} m` : 'Calculating...'}
              </span>
            </div>
            <div className="text-center px-4">
              <span className="text-[9px] uppercase tracking-wider font-black text-white/50 block">Target Precision</span>
              <span className="font-mono text-sm font-black text-[#5A5A40] block mt-1.5 bg-[#5A5A40]/10 border border-[#5A5A40]/20 px-2 py-0.5 rounded leading-none">
                &lt; 10m
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 relative z-10 w-full md:w-auto justify-end">
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)} 
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors text-white/80 text-xs"
            title={soundEnabled ? "Mute Sound" : "Unmute Sound"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
          </button>
          <button 
            onClick={onBack} 
            className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold transition-all border border-white/10"
          >
            ← Exit Game
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {gameState === 'idle' && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-[32px] p-8 shadow-2xl relative overflow-hidden"
          >
            <div className="max-w-2xl mx-auto text-center space-y-6 py-6">
              <div className="w-16 h-16 bg-[#5A5A40]/10 border border-[#5A5A40]/20 text-[#5A5A40] dark:text-emerald-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                <Map className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-serif italic text-zinc-800 dark:text-white font-black">
                  Can you navigate to the precise coordinate?
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto">
                  Our GPS Teleportation Engine will spawn you at a random start location and set a dynamic target nearby. Use Street View navigation arrows to step your way to the target. Reach the precise target point within 10 meters to win!
                </p>
              </div>

              {apiError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl max-w-md mx-auto text-center">
                  <div className="flex items-center gap-2 justify-center text-rose-500 font-bold text-xs">
                    <AlertCircle className="w-4 h-4" />
                    <span>Configuration Required</span>
                  </div>
                  <p className="text-[11px] text-rose-400/80 mt-1 leading-relaxed">
                    {apiError}
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <button
                  onClick={loadModeScavenger}
                  disabled={!!apiError}
                  className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all shadow-xl shadow-emerald-600/20 flex items-center gap-3 text-sm tracking-wide uppercase"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Teleport & Play Scavenger Hunt</span>
                </button>
              </div>

              {/* High Score board */}
              <div className="pt-6 border-t border-black/5 dark:border-white/5 flex items-center justify-center gap-6 text-xs uppercase tracking-widest font-bold text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-500" /> Best Score: <strong className="font-mono text-zinc-800 dark:text-white">{highScore} XP</strong>
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {gameState === 'loading' && (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-[32px] p-12 text-center shadow-xl min-h-[400px] flex flex-col items-center justify-center space-y-6"
          >
            <div className="relative">
              <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
              <Compass className="w-6 h-6 text-emerald-500 absolute inset-0 m-auto animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 uppercase tracking-wider">Synchronizing Teleporter Coordinates...</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
                Calling dynamic search agents to locate outdoor high-resolution panoramas near a major world landmark. Just a moment!
              </p>
            </div>
          </motion.div>
        )}

        {gameState === 'playing' && (
          <motion.div 
            key="playing"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* PANORAMA INTERACTION AREA (LEFT PANEL) */}
            <div className="lg:col-span-8 flex flex-col">
              <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-[32px] p-4 shadow-xl flex-grow flex flex-col">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      Objective: Reach target at <strong>{targetPoint?.name}</strong>
                    </span>
                  </div>
                  <div className="text-[10px] uppercase font-black tracking-widest text-[#5A5A40] bg-[#5A5A40]/10 border border-[#5A5A40]/20 px-2 py-0.5 rounded">
                    Goal Range: &lt; 0.0001 (10m)
                  </div>
                </div>

                {/* THE MAP-CONTAINER STYLED TO 70VH */}
                <div 
                  id="map-container"
                  ref={panoramaContainerRef} 
                  className="w-full rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 relative" 
                  style={{ height: '62vh', minHeight: '450px' }}
                >
                  {/* Floating Action HUD on Street View Canvas */}
                  <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                    <button
                      onClick={handleTeleportToStart}
                      className="px-3.5 py-2 bg-black/80 hover:bg-black text-white rounded-xl text-[11px] font-bold transition-all border border-white/10 flex items-center gap-1.5 shadow-lg backdrop-blur-sm"
                      title="Reset position back to where you spawned"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Teleport to Start
                    </button>
                  </div>

                  <div className="absolute top-4 right-4 z-10 flex gap-2">
                    <button
                      onClick={() => setShowMiniMap(!showMiniMap)}
                      className="p-2 bg-black/80 hover:bg-black text-white rounded-xl text-xs font-bold transition-all border border-white/10 flex items-center gap-1 shadow-lg backdrop-blur-sm"
                      title="Toggle Mini-Map Overlay"
                    >
                      <Map className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* SIDEBOARD (RIGHT PANEL) */}
            <div className="lg:col-span-4 space-y-4 flex flex-col">
              {/* TARGET DETAILS */}
              <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-3xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-black tracking-[0.2em] text-[#5A5A40] block">Mission Blueprint</span>
                  <span className="text-[10px] text-zinc-400 font-mono">GPS TARGET</span>
                </div>

                <div className="bg-slate-50 dark:bg-zinc-950 p-4 rounded-2xl border border-black/5 dark:border-white/5">
                  <span className="text-[9px] uppercase font-bold text-zinc-400 block">TARGET REGION</span>
                  <h4 className="text-lg font-serif italic text-zinc-800 dark:text-zinc-100 font-extrabold mt-0.5">
                    {targetPoint?.name}
                  </h4>
                  <div className="text-[10px] font-mono text-zinc-500 mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-rose-500" /> Lat: {targetPoint?.lat.toFixed(5)}, Lng: {targetPoint?.lng.toFixed(5)}
                  </div>
                </div>

                {/* Hint mechanism */}
                <div className="pt-2">
                  {showHint ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed bg-slate-50 dark:bg-zinc-950 p-3 rounded-xl border border-black/5"
                    >
                      💡 <strong>GPS Hint:</strong> The target is located precisely near the coordinate center. Watch the floating Mini-Map line! Use the navigation arrows in the street view to move closer. Look at the distance indicator; it updates live to show if you are walking in the right direction!
                    </motion.div>
                  ) : (
                    <button 
                      onClick={() => { playSound('click'); setShowHint(true); }}
                      className="text-[10px] uppercase tracking-wider font-bold text-emerald-600 hover:text-emerald-500 flex items-center gap-1"
                    >
                      <HelpCircle className="w-3.5 h-3.5" /> Reveal GPS Coordinates Hint
                    </button>
                  )}
                </div>
              </div>

              {/* MINI-MAP CONTAINER */}
              <div className={`bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-3xl p-4 shadow-xl flex-grow flex flex-col justify-between ${!showMiniMap ? 'opacity-30 pointer-events-none' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-emerald-500 animate-pulse" /> Live Progressive Mini-Map
                  </span>
                  <span className="text-[9px] text-zinc-400 uppercase font-mono">Leaflet Tracking</span>
                </div>

                {/* Map stage */}
                <div 
                  ref={miniMapContainerRef}
                  className="w-full rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 relative"
                  style={{ height: '26vh', minHeight: '180px' }}
                />

                <div className="text-[10px] text-zinc-400 mt-2 text-center leading-normal">
                  The green dashed line traces the great-circle path from you (green) to the destination point (red).
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* WON SCREEN */}
        {gameState === 'won' && (
          <motion.div 
            key="won"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="bg-zinc-950 text-white border border-emerald-500/20 rounded-[32px] p-8 md:p-12 text-center shadow-2xl space-y-6 max-w-xl mx-auto relative overflow-hidden"
          >
            {/* Glow */}
            <div className="absolute top-0 inset-x-0 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="w-20 h-20 bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 rounded-[2rem] flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <div className="text-xs text-emerald-400 uppercase tracking-widest font-black leading-none">Scavenger Success!</div>
              <h2 className="text-3xl md:text-4xl font-serif italic font-extrabold tracking-tight">Mission Accomplished!</h2>
              <p className="text-sm text-zinc-400 max-w-sm mx-auto">
                You successfully navigated through Street View grid coordinates and reached the exact target at <strong>{targetPoint?.name}</strong> with less than 10 meters of absolute deviation!
              </p>
            </div>

            <div className="bg-white/5 rounded-2xl border border-white/10 p-5 max-w-xs mx-auto grid grid-cols-2 gap-4">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-zinc-400 block">Awarded</span>
                <span className="text-2xl font-mono font-black text-emerald-400">+{score} XP</span>
              </div>
              <div className="border-l border-white/10">
                <span className="text-[9px] uppercase tracking-wider text-zinc-400 block">High Score</span>
                <span className="text-2xl font-mono font-black text-amber-400">{highScore} XP</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
              <button
                onClick={loadModeScavenger}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg"
              >
                Play Another Round
              </button>
              <button
                onClick={onBack}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
              >
                Back to Menu
              </button>
            </div>
          </motion.div>
        )}

        {/* LOST SCREEN */}
        {gameState === 'lost' && (
          <motion.div 
            key="lost"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="bg-zinc-950 text-white border border-rose-500/20 rounded-[32px] p-8 md:p-12 text-center shadow-2xl space-y-6 max-w-xl mx-auto relative overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="w-16 h-16 bg-rose-500/20 border-2 border-rose-500 text-rose-400 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-rose-500/30">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="text-xs text-rose-400 uppercase tracking-widest font-black leading-none">Time Expired</div>
              <h2 className="text-3xl font-serif italic font-extrabold tracking-tight">Mission Failed</h2>
              <p className="text-sm text-zinc-400 max-w-sm mx-auto">
                You ran out of GPS link synchronization time! You were still <strong>{distance ? Math.round(distance).toLocaleString() : '---'} meters</strong> away from the target landmark.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
              <button
                onClick={loadModeScavenger}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all"
              >
                Try Again
              </button>
              <button
                onClick={onBack}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
              >
                Back to Menu
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
