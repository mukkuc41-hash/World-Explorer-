import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  Gamepad2, Trophy, Compass, Star, MapPin, Map, Navigation, 
  HelpCircle, RefreshCw, Milestone, Volume2, VolumeX, ArrowRight,
  Info, Sparkles, X, CheckCircle2, ChevronRight, AlertCircle, Heart,
  Flag, Target
} from 'lucide-react';
import StreetViewScavengerHunt from './StreetViewScavengerHunt.tsx';

export interface GameLocation {
  name: string;
  lat: number;
  lng: number;
  hint?: string;
}

export const GAME_DATA: Record<string, GameLocation[]> = {
  landmarks: [
    { name: "Eiffel Tower", lat: 48.8584, lng: 2.2945, hint: "A wrought-iron lattice tower on the Champ de Mars in Paris, France." },
    { name: "Taj Mahal", lat: 27.1751, lng: 78.0421, hint: "An ivory-white marble mausoleum on the south bank of the Yamuna river in Agra, India." },
    { name: "Statue of Liberty", lat: 40.6892, lng: -74.0445, hint: "A colossal neoclassical sculpture on Liberty Island in New York Harbor." },
    { name: "Great Wall of China", lat: 40.4319, lng: 116.5704, hint: "A series of fortifications built across the historical northern borders of ancient Chinese states." },
    { name: "Machu Picchu", lat: -13.1631, lng: -72.5450, hint: "An Incan citadel set high in the Andes Mountains in Peru." },
    { name: "Pyramids of Giza", lat: 29.9792, lng: 31.1342, hint: "The oldest and largest of the three pyramids in the Giza pyramid complex, Egypt." },
    { name: "Colosseum", lat: 41.8902, lng: 12.4922, hint: "An oval amphitheatre in the centre of the city of Rome, Italy." },
    { name: "Christ the Redeemer", lat: -22.9519, lng: -43.2105, hint: "An Art Deco statue of Jesus Christ in Rio de Janeiro, Brazil." },
    { name: "Petra", lat: 30.3285, lng: 35.4444, hint: "A famous archaeological site in Jordan's southwestern desert, known as the 'Rose City'." },
    { name: "Sydney Opera House", lat: -33.8568, lng: 151.2153, hint: "A multi-venue performing arts centre at Bennelong Point in Sydney, Australia." },
    { name: "Stonehenge", lat: 51.1789, lng: -1.8262, hint: "A prehistoric monument on Salisbury Plain in Wiltshire, England." }
  ],
  capitals: [
    { name: "Tokyo", lat: 35.6762, lng: 139.6503, hint: "The busy capital of Japan, known for its ultra-modern skyscrapers and neon-lit streets." },
    { name: "New Delhi", lat: 28.6139, lng: 77.2090, hint: "The capital of India, structured around tree-lined boulevards and home to Rashtrapati Bhavan." },
    { name: "Paris", lat: 48.8566, lng: 2.3522, hint: "The capital of France, a global center for art, fashion, gastronomy, and culture." },
    { name: "Washington D.C.", lat: 38.9072, lng: -77.0369, hint: "The capital of the United States, defined by imposing neoclassical monuments." },
    { name: "Canberra", lat: -35.2809, lng: 149.1300, hint: "The capital city of Australia, founded following a compromise between Sydney and Melbourne." },
    { name: "London", lat: 51.5074, lng: -0.1278, hint: "The capital of England and the United Kingdom, standing on the River Thames." },
    { name: "Brasília", lat: -15.7975, lng: -47.8919, hint: "The federal capital of Brazil, famous for its futuristic airplane-shaped urban design." },
    { name: "Ottawa", lat: 45.4215, lng: -75.6972, hint: "The capital of Canada, situated on the south bank of the Ottawa River in Ontario." },
    { name: "Cairo", lat: 30.0444, lng: 31.2357, hint: "The capital of Egypt, a major metropolitan hub set on the ancient Nile River." },
    { name: "Rome", lat: 41.9028, lng: 12.4964, hint: "The capital of Italy, a sprawling, cosmopolitan city with nearly 3,000 years of globally influential art." }
  ],
  airports: [
    { name: "Dubai International Airport (DXB)", lat: 25.2532, lng: 55.3657, hint: "The primary international airport serving Dubai, United Arab Emirates, and a major global hub." },
    { name: "London Heathrow Airport (LHR)", lat: 51.4700, lng: -0.4543, hint: "A major international airport in London, United Kingdom, and the busiest airport in Europe." },
    { name: "Los Angeles International Airport (LAX)", lat: 33.9416, lng: -118.4085, hint: "The primary international airport serving Los Angeles and its surrounding area." },
    { name: "Tokyo Haneda Airport (HND)", lat: 35.5494, lng: 139.7798, hint: "One of two primary airports that serve the Greater Tokyo Area, located in Ota, Tokyo." },
    { name: "Singapore Changi Airport (SIN)", lat: 1.3644, lng: 103.9915, hint: "A world-class aviation hub in Singapore, repeatedly voted the world's best airport." },
    { name: "John F. Kennedy International (JFK)", lat: 40.6413, lng: -73.7781, hint: "The main international airport serving New York City, located in Queens." },
    { name: "Charles de Gaulle Airport (CDG)", lat: 49.0097, lng: 2.5479, hint: "The largest international airport in France, named after the leader of the Free French Forces." }
  ],
  rivers: [
    { name: "Nile River", lat: 30.1214, lng: 31.3323, hint: "A major north-flowing river in northeastern Africa, historically considered the longest river in the world." },
    { name: "Amazon River", lat: -0.1000, lng: -50.0000, hint: "The largest river in the world by discharge volume of water, located in South America." },
    { name: "Yangtze River", lat: 31.2304, lng: 121.4737, hint: "The longest river in Asia and the third-longest in the world, flowing entirely within China." },
    { name: "Mississippi River", lat: 29.1500, lng: -89.2500, hint: "The second-longest river and chief river of the second-largest drainage system on the North American continent." },
    { name: "Danube River", lat: 45.2000, lng: 29.7000, hint: "The second-longest river in Europe, flowing through or bordering ten countries from Germany to the Black Sea." }
  ],
  mountains: [
    { name: "Mount Everest", lat: 27.9881, lng: 86.9250, hint: "Earth's highest mountain above sea level, located in the Mahalangur Himal sub-range of the Himalayas." },
    { name: "Mount Kilimanjaro", lat: -3.0674, lng: 37.3556, hint: "A dormant volcano in Tanzania, the highest mountain in Africa and the highest single free-standing mountain in the world." },
    { name: "Mount Fuji", lat: 35.3606, lng: 138.7274, hint: "An active stratovolcano that last erupted in 1707–1708, the tallest peak in Japan." },
    { name: "Mont Blanc", lat: 45.8326, lng: 6.8652, hint: "The highest mountain in the Alps and the highest in Europe west of the Caucasus peaks." },
    { name: "Denali", lat: 63.0692, lng: -151.0070, hint: "The highest mountain peak in North America, located in Alaska." }
  ],
  cities: [
    { name: "New York City", lat: 40.7128, lng: -74.0060, hint: "The most populous city in the United States, known as the cultural, financial, and media capital of the world." },
    { name: "Sydney", lat: -33.8688, lng: 151.2093, hint: "The state capital of New South Wales and the most populous city in Australia and Oceania." },
    { name: "London", lat: 51.5074, lng: -0.1278, hint: "The capital of both England and the United Kingdom, standing on the River Thames." },
    { name: "Paris", lat: 48.8566, lng: 2.3522, hint: "The City of Light, globally celebrated for romantic avenues, culinary arts, and museum landmarks." },
    { name: "Mumbai", lat: 19.0760, lng: 72.8777, hint: "A densely populated city on India’s west coast, a financial hub and home to the Bollywood film industry." },
    { name: "Cape Town", lat: -33.9249, lng: 18.4241, hint: "A port city on South Africa’s southwest coast, on a peninsula beneath the imposing Table Mountain." }
  ],
  deserts: [
    { name: "Sahara Desert", lat: 23.4162, lng: 12.0000, hint: "The largest hot desert in the world, and the third-largest desert overall, covering much of North Africa." },
    { name: "Gobi Desert", lat: 42.5900, lng: 103.4300, hint: "A vast, arid region in northern China and southern Mongolia, known for its dunes and rare animals." },
    { name: "Kalahari Desert", lat: -23.0000, lng: 22.0000, hint: "A large semi-arid sandy savanna in Southern Africa, covering much of Botswana." },
    { name: "Atacama Desert", lat: -23.8634, lng: -69.1328, hint: "A non-polar desert in South America, the driest non-polar desert in the world." }
  ],
  islands: [
    { name: "Madagascar", lat: -18.7669, lng: 46.8691, hint: "An island country lying off the southeastern coast of Africa, home to unique wildlife like lemurs." },
    { name: "Bali", lat: -8.4095, lng: 115.1889, hint: "A famous Indonesian province known for its forested volcanic mountains, rice paddies, and beaches." },
    { name: "Greenland", lat: 72.0000, lng: -40.0000, hint: "The world's largest island, located between the Arctic and Atlantic oceans." },
    { name: "Iceland", lat: 64.9631, lng: -19.0208, hint: "A Nordic island nation defined by its dramatic landscape with volcanoes, geysers, and glaciers." }
  ],
  forests: [
    { name: "Black Forest", lat: 48.0000, lng: 8.2500, hint: "A mountainous region in southwest Germany, bordering France, known for its dense, dark pine woods." },
    { name: "Daintree Rainforest", lat: -16.1700, lng: 145.4185, hint: "A tropical rainforest region on the northeast coast of Queensland, Australia, considered one of the oldest in the world." },
    { name: "Amazon Rainforest", lat: -3.4653, lng: -62.2159, hint: "A moist broadleaf tropical rainforest in the Amazon basin, representing over half of the planet's rainforest." }
  ],
  lakes: [
    { name: "Lake Superior", lat: 47.7231, lng: -87.2541, hint: "The largest of the Great Lakes of North America, and the world's largest freshwater lake by surface area." },
    { name: "Lake Victoria", lat: -1.0000, lng: 33.0000, hint: "One of the African Great Lakes, the continent's largest lake by area, and the world's largest tropical lake." },
    { name: "Lake Baikal", lat: 53.5587, lng: 108.1650, hint: "A massive, ancient lake in the mountainous Russian region of Siberia, the world's deepest lake." },
    { name: "Lake Como", lat: 46.0160, lng: 9.2572, hint: "An upscale resort area in Northern Italy's Lombardy region, shaped like an inverted Y." }
  ]
};

const CATEGORIES = [
  { id: 'landmarks', name: 'Landmarks', icon: '🏰', color: 'from-amber-500 to-orange-600', desc: 'Find legendary historical structures and wonders.' },
  { id: 'capitals', name: 'Capitals', icon: '🏛️', color: 'from-blue-500 to-indigo-600', desc: 'Search for seat cities of sovereign countries.' },
  { id: 'airports', name: 'Airports', icon: '✈️', color: 'from-cyan-500 to-blue-600', desc: 'Locate busy global runways and flight hubs.' },
  { id: 'rivers', name: 'Rivers', icon: '🌊', color: 'from-sky-500 to-emerald-600', desc: 'Trace long flowing watercourses across maps.' },
  { id: 'mountains', name: 'Mountains', icon: '🏔️', color: 'from-stone-500 to-slate-700', desc: 'Pin peak summits and high altitude ranges.' },
  { id: 'cities', name: 'Major Cities', icon: '🌆', color: 'from-rose-500 to-pink-600', desc: 'Seek out huge global urban and financial hubs.' },
  { id: 'deserts', name: 'Deserts', icon: '🏜️', color: 'from-yellow-500 to-amber-700', desc: 'Discover dry sand dunes and barren non-polar plains.' },
  { id: 'islands', name: 'Islands', icon: '🏝️', color: 'from-emerald-400 to-teal-600', desc: 'Isolate islands surrounded by vast oceans.' },
  { id: 'forests', name: 'Forests', icon: '🌲', color: 'from-green-500 to-emerald-800', desc: 'Spot pristine rainforests and ancient dense woods.' },
  { id: 'lakes', name: 'Lakes', icon: '💧', color: 'from-blue-400 to-teal-500', desc: 'Locate huge freshwater lakes and deep basins.' }
];

export default function GameHub() {
  const [apiKey] = useState<string>(process.env.GOOGLE_MAPS_PLATFORM_KEY || '');
  const [apiLoaded, setApiLoaded] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [activeGame, setActiveGame] = useState<'menu' | 'quiz' | 'scavenger'>('menu');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [currentTarget, setCurrentTarget] = useState<GameLocation | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lastGuessDistance, setLastGuessDistance] = useState<number | null>(null);
  const [lastGuessCoords, setLastGuessCoords] = useState<[number, number] | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [roundStatus, setRoundStatus] = useState<'playing' | 'guessed'>('playing');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [categoryStats, setCategoryStats] = useState<Record<string, { high: number, played: number }>>({});
  const [mapType, setMapType] = useState<'google' | 'leaflet' | 'loading'>('loading');

  // Auto-switch countdown state
  const [countdown, setCountdown] = useState<number | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const lineRef = useRef<L.Polyline | null>(null);
  
  // Google Maps references
  const googleMapRef = useRef<any>(null);
  const googleMarkersRef = useRef<any[]>([]);
  const googlePolylineRef = useRef<any>(null);

  // Load persistent stats
  useEffect(() => {
    const savedScore = localStorage.getItem('world_explorer_quiz_score');
    if (savedScore) setScore(parseInt(savedScore, 10));

    const savedStreak = localStorage.getItem('world_explorer_quiz_streak');
    if (savedStreak) setStreak(parseInt(savedStreak, 10));

    const savedHighScore = localStorage.getItem('world_explorer_quiz_highscore');
    if (savedHighScore) setHighScore(parseInt(savedHighScore, 10));

    const savedStats = localStorage.getItem('world_explorer_quiz_category_stats');
    if (savedStats) {
      try {
        setCategoryStats(JSON.parse(savedStats));
      } catch (e) {
        console.error("Error parsing category stats", e);
      }
    }
  }, []);

  // Load Google Maps Script
  useEffect(() => {
    if (!apiKey) {
      setApiError("Google Maps API Key is missing. Please set your GOOGLE_MAPS_PLATFORM_KEY in your env/secrets settings.");
      setApiLoaded(false);
      return;
    }

    const loadScript = () => {
      if ((window as any).google && (window as any).google.maps) {
        setApiLoaded(true);
        return;
      }

      const existingScript = document.getElementById('google-maps-scavenger-script');
      if (existingScript) {
        // Script already added, attach load/error event listeners to be safe of race conditions
        existingScript.addEventListener('load', () => {
          setApiLoaded(true);
        });
        existingScript.addEventListener('error', () => {
          setApiError("Failed to load Google Maps script. Check your API key or network connection.");
        });
        // Check again immediately in case it loaded since the query
        if ((window as any).google && (window as any).google.maps) {
          setApiLoaded(true);
        }
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-maps-scavenger-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
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

  // Sync state to local storage
  const saveStats = (newScore: number, newStreak: number, newHighScore: number, updatedStats?: any) => {
    localStorage.setItem('world_explorer_quiz_score', newScore.toString());
    localStorage.setItem('world_explorer_quiz_streak', newStreak.toString());
    localStorage.setItem('world_explorer_quiz_highscore', newHighScore.toString());
    if (updatedStats) {
      localStorage.setItem('world_explorer_quiz_category_stats', JSON.stringify(updatedStats));
    }
  };

  // Sound effects generator via Web Audio API
  const playSound = (type: 'correct' | 'incorrect' | 'click' | 'victory') => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      if (type === 'correct') {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        
        osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        
        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 0.4);
        osc2.stop(ctx.currentTime + 0.4);
      } else if (type === 'incorrect') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } else if (type === 'victory') {
        // Play a nice arpeggio
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.1);
          gain.gain.setValueAtTime(0.12, ctx.currentTime + index * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + index * 0.1 + 0.3);
          
          osc.start(ctx.currentTime + index * 0.1);
          osc.stop(ctx.currentTime + index * 0.1 + 0.3);
        });
      }
    } catch (e) {
      console.warn("Web Audio not allowed or failed:", e);
    }
  };

  // Haversine formula to compute great-circle distance
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) + 
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
  };

  // Launch a game category
  const selectCategory = (catId: string) => {
    playSound('click');
    setActiveCategory(catId);
    setRoundStatus('playing');
    setLastGuessDistance(null);
    setLastGuessCoords(null);
    setShowHint(false);

    const locations = GAME_DATA[catId];
    if (locations && locations.length > 0) {
      const randomTarget = locations[Math.floor(Math.random() * locations.length)];
      setCurrentTarget(randomTarget);
    }
  };

  // Setup/tear-down Map on category activation
  useEffect(() => {
    if (!activeCategory || !mapContainerRef.current) return;

    const google = (window as any).google;
    const canUseGoogle = apiLoaded && google && google.maps;

    if (canUseGoogle) {
      setMapType('google');
      // Destroy existing Leaflet map if active
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (err) {
          console.warn("Leaflet cleanup warning:", err);
        }
        mapRef.current = null;
        markersRef.current = null;
        lineRef.current = null;
      }

      // Initialize Google Map
      const map = new google.maps.Map(mapContainerRef.current, {
        center: { lat: 25, lng: 10 },
        zoom: 2,
        minZoom: 1,
        maxZoom: 15,
        mapTypeId: 'roadmap',
        disableDefaultUI: false,
        zoomControl: true,
        styles: document.documentElement.classList.contains('dark') || document.body.classList.contains('dark') ? [
          { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
          {
            featureType: "administrative.locality",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
          },
          {
            featureType: "poi",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
          },
          {
            featureType: "road",
            elementType: "geometry",
            stylers: [{ color: "#38414e" }],
          },
          {
            featureType: "road",
            elementType: "geometry.stroke",
            stylers: [{ color: "#212a37" }],
          },
          {
            featureType: "road.highway",
            elementType: "geometry",
            stylers: [{ color: "#746855" }],
          },
          {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#17263c" }],
          },
        ] : []
      });

      googleMapRef.current = map;

      // Register click handler
      map.addListener('click', (e: any) => {
        if (e.latLng) {
          handleMapClick(e.latLng.lat(), e.latLng.lng());
        }
      });
    } else {
      // Initialize Leaflet
      setMapType('leaflet');
      
      // Cleanup google map if any
      if (googleMarkersRef.current) {
        googleMarkersRef.current.forEach(m => m.setMap(null));
        googleMarkersRef.current = [];
      }
      if (googlePolylineRef.current) {
        googlePolylineRef.current.setMap(null);
        googlePolylineRef.current = null;
      }
      googleMapRef.current = null;

      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (err) {
          console.warn("Leaflet cleanup warning:", err);
        }
        mapRef.current = null;
      }

      const isDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
      const tileUrl = isDark 
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

      const map = L.map(mapContainerRef.current, {
        center: [25, 10],
        zoom: 2.2,
        minZoom: 1.5,
        maxZoom: 10,
        zoomControl: false,
        attributionControl: false
      });

      L.tileLayer(tileUrl).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const markers = L.layerGroup().addTo(map);
      markersRef.current = markers;
      mapRef.current = map;

      // Listen to map clicks
      map.on('click', (e: L.LeafletMouseEvent) => {
        handleMapClick(e.latlng.lat, e.latlng.lng);
      });
    }

    // Cleanup markers and polyline
    return () => {
      if (googleMarkersRef.current) {
        googleMarkersRef.current.forEach(m => m.setMap(null));
        googleMarkersRef.current = [];
      }
      if (googlePolylineRef.current) {
        googlePolylineRef.current.setMap(null);
        googlePolylineRef.current = null;
      }
      googleMapRef.current = null;

      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (err) {
          console.warn("Leaflet cleanup warning:", err);
        }
        mapRef.current = null;
      }
    };
  }, [activeCategory, apiLoaded]);

  // Handle a user's guess click on the map
  const handleMapClick = (lat: number, lng: number) => {
    if (roundStatus !== 'playing' || !currentTarget) return;

    const google = (window as any).google;
    const isGoogleActive = mapType === 'google' && google && google.maps && googleMapRef.current;

    const dist = getDistance(lat, lng, currentTarget.lat, currentTarget.lng);
    setLastGuessDistance(dist);
    setLastGuessCoords([lat, lng]);
    setRoundStatus('guessed');

    if (isGoogleActive) {
      // Clear previous markers & polyline
      if (googleMarkersRef.current) {
        googleMarkersRef.current.forEach(m => m.setMap(null));
        googleMarkersRef.current = [];
      }
      if (googlePolylineRef.current) {
        googlePolylineRef.current.setMap(null);
        googlePolylineRef.current = null;
      }

      // Add guess marker (Red Pin)
      const guessMarker = new google.maps.Marker({
        position: { lat, lng },
        map: googleMapRef.current,
        title: "Your Guess",
        icon: {
          url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png"
        }
      });
      googleMarkersRef.current.push(guessMarker);

      // Add actual target marker (Green Pin with precise Google Maps coordinates)
      const targetMarker = new google.maps.Marker({
        position: { lat: currentTarget.lat, lng: currentTarget.lng },
        map: googleMapRef.current,
        title: currentTarget.name,
        icon: {
          url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png"
        }
      });
      googleMarkersRef.current.push(targetMarker);

      // Draw connecting polyline
      const polyline = new google.maps.Polyline({
        path: [
          { lat, lng },
          { lat: currentTarget.lat, lng: currentTarget.lng }
        ],
        geodesic: true,
        strokeColor: dist < 250 ? '#10b981' : dist < 1000 ? '#f59e0b' : '#ef4444',
        strokeOpacity: 0.8,
        strokeWeight: 3,
        map: googleMapRef.current
      });
      googlePolylineRef.current = polyline;

      // Show custom InfoWindow on target
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 6px; color: #111; font-family: system-ui, sans-serif; max-width: 180px;">
            <h4 style="font-weight: bold; margin: 0 0 4px 0; font-size: 13px;">${currentTarget.name}</h4>
            <p style="font-size: 11px; margin: 0; color: #059669; font-weight: bold;">🎯 Correct Location!</p>
            <p style="font-size: 11px; margin: 2px 0 0 0; color: #4b5563;">Distance: ${dist.toLocaleString()} km</p>
          </div>
        `
      });
      infoWindow.open(googleMapRef.current, targetMarker);

      // Zoom out to frame both markers beautifully
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat, lng });
      bounds.extend({ lat: currentTarget.lat, lng: currentTarget.lng });
      googleMapRef.current.fitBounds(bounds);
    } else {
      // Leaflet fallback behavior
      if (markersRef.current) {
        markersRef.current.clearLayers();

        // Red/Orange Guess Icon
        const guessIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div class="w-6 h-6 bg-rose-500 border-2 border-white rounded-full flex items-center justify-center shadow-lg transform -translate-x-1/2 -translate-y-1/2 animate-ping" style="animation-duration: 2s;"></div>
                 <div class="w-5 h-5 bg-rose-500 border-2 border-white rounded-full flex items-center justify-center shadow-md absolute top-0.5 left-0.5">
                   <span class="text-[8px] font-black text-white">?</span>
                 </div>`
        });

        // Emerald Target Icon
        const targetIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div class="w-8 h-8 bg-emerald-500 border-2 border-white rounded-2xl flex items-center justify-center shadow-xl transform -translate-x-1/2 -translate-y-1/2 animate-bounce">
                   <span class="text-xs">🎯</span>
                 </div>`
        });

        L.marker([lat, lng], { icon: guessIcon }).addTo(markersRef.current);
        L.marker([currentTarget.lat, currentTarget.lng], { icon: targetIcon })
          .addTo(markersRef.current)
          .bindPopup(`
            <div class="p-3 text-center">
              <p class="font-bold text-sm text-[#141414]">${currentTarget.name}</p>
              <p class="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mt-1">Found target here!</p>
            </div>
          `, { className: 'custom-leaflet-popup' })
          .openPopup();

        // Draw connecting polyline
        const line = L.polyline([[lat, lng], [currentTarget.lat, currentTarget.lng]], {
          color: dist < 250 ? '#10b981' : dist < 1000 ? '#f59e0b' : '#ef4444',
          weight: 3,
          dashArray: '6, 8',
          opacity: 0.8
        }).addTo(markersRef.current);
        
        lineRef.current = line;

        if (mapRef.current) {
          const bounds = L.latLngBounds([[lat, lng], [currentTarget.lat, currentTarget.lng]]);
          mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 5 });
        }
      }
    }

    // Calculate Scores & Streak multipliers
    let pointsEarned = 0;
    const isCorrect = dist < 250; // Inside 250km threshold is extremely precise

    if (isCorrect) {
      pointsEarned = 100;
      if (dist < 100) pointsEarned += 50; 
      if (dist < 30) pointsEarned += 50; 

      const nextStreak = streak + 1;
      setStreak(nextStreak);
      
      const sessionScore = score + pointsEarned;
      setScore(sessionScore);

      const nextHighScore = Math.max(highScore, sessionScore);
      setHighScore(nextHighScore);

      // Save category stats
      const currentCatStats = categoryStats[activeCategory!] || { high: 0, played: 0 };
      const updatedCatStats = {
        ...categoryStats,
        [activeCategory!]: {
          high: Math.max(currentCatStats.high, pointsEarned),
          played: currentCatStats.played + 1
        }
      };
      setCategoryStats(updatedCatStats);

      saveStats(sessionScore, nextStreak, nextHighScore, updatedCatStats);
      playSound('correct');

      // Trigger Confetti!
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 }
      });
    } else {
      setStreak(0);
      playSound('incorrect');

      const currentCatStats = categoryStats[activeCategory!] || { high: 0, played: 0 };
      const updatedCatStats = {
        ...categoryStats,
        [activeCategory!]: {
          ...currentCatStats,
          played: currentCatStats.played + 1
        }
      };
      setCategoryStats(updatedCatStats);
      saveStats(score, 0, highScore, updatedCatStats);

      // Wrong guess auto-switch countdown trigger
      setCountdown(4);
    }
  };

  // Next round setup
  const nextRound = () => {
    playSound('click');
    setRoundStatus('playing');
    setLastGuessDistance(null);
    setLastGuessCoords(null);
    setShowHint(false);
    setCountdown(null);

    // Clear Google maps items
    if (googleMarkersRef.current) {
      googleMarkersRef.current.forEach(m => m.setMap(null));
      googleMarkersRef.current = [];
    }
    if (googlePolylineRef.current) {
      googlePolylineRef.current.setMap(null);
      googlePolylineRef.current = null;
    }

    // Clear Leaflet markers
    if (markersRef.current) {
      markersRef.current.clearLayers();
    }

    const locations = GAME_DATA[activeCategory!];
    if (locations && locations.length > 0) {
      // Avoid picking exactly the same location if possible
      let randomTarget = locations[Math.floor(Math.random() * locations.length)];
      if (currentTarget && locations.length > 1) {
        while (randomTarget.name === currentTarget.name) {
          randomTarget = locations[Math.floor(Math.random() * locations.length)];
        }
      }
      setCurrentTarget(randomTarget);
    }

    if (mapType === 'google' && googleMapRef.current) {
      googleMapRef.current.setZoom(2);
      googleMapRef.current.setCenter({ lat: 25, lng: 10 });
    } else if (mapType === 'leaflet' && mapRef.current) {
      mapRef.current.setView([25, 10], 2.2);
    }
  };

  // Handle auto-switch countdown effect
  useEffect(() => {
    if (countdown === null) return;

    if (countdown <= 0) {
      setCountdown(null);
      nextRound();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  // Quit and return to Category menu
  const quitToMenu = () => {
    playSound('click');
    setActiveCategory(null);
    setCurrentTarget(null);
    setRoundStatus('playing');
    setLastGuessDistance(null);
    setLastGuessCoords(null);
    setShowHint(false);
    setCountdown(null);

    if (googleMarkersRef.current) {
      googleMarkersRef.current.forEach(m => m.setMap(null));
      googleMarkersRef.current = [];
    }
    if (googlePolylineRef.current) {
      googlePolylineRef.current.setMap(null);
      googlePolylineRef.current = null;
    }

    if (markersRef.current) {
      markersRef.current.clearLayers();
    }
  };

  // Reset all game data
  const resetAllData = () => {
    if (confirm("Are you sure you want to reset your scores, high scores, and statistics?")) {
      playSound('incorrect');
      setScore(0);
      setStreak(0);
      setHighScore(0);
      setCategoryStats({});
      localStorage.removeItem('world_explorer_quiz_score');
      localStorage.removeItem('world_explorer_quiz_streak');
      localStorage.removeItem('world_explorer_quiz_highscore');
      localStorage.removeItem('world_explorer_quiz_category_stats');
    }
  };

  if (activeGame === 'scavenger') {
    return <StreetViewScavengerHunt onBack={() => setActiveGame('menu')} />;
  }

  if (activeGame === 'menu') {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-8">
        {/* Main Hub Welcome Banner */}
        <div className="bg-[#141414] text-white p-8 rounded-[32px] shadow-2xl relative overflow-hidden border border-white/5">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-[#5A5A40]/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="text-center md:text-left space-y-2">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="bg-emerald-500/15 text-emerald-400 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded border border-emerald-500/20">
                  World Explorer Arcade
                </span>
                <span className="bg-[#5A5A40]/25 text-white/80 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded border border-[#5A5A40]/35 animate-pulse">
                  2 Games Loaded
                </span>
              </div>
              <h1 className="font-serif italic text-4xl md:text-5xl font-black tracking-tight text-white mt-1">
                Geographical Game Hub
              </h1>
              <p className="text-sm text-zinc-400 max-w-xl">
                Expand your spatial intelligence and global geographic literacy with our custom curated map games. Teleport around the globe, drop pinpoint markers, and test your speed!
              </p>
            </div>
            
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-3xl flex items-center justify-center shadow-inner shrink-0">
              <Gamepad2 className="w-10 h-10" />
            </div>
          </div>
        </div>

        {/* 2-Column Game Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
          {/* GAME 1: QUIZ MASTER */}
          <motion.div 
            whileHover={{ y: -6, scale: 1.01 }}
            className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-[32px] p-8 shadow-xl flex flex-col justify-between space-y-6 group transition-all relative overflow-hidden"
          >
            {/* Background pattern */}
            <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors pointer-events-none"></div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400 rounded-2xl flex items-center justify-center">
                  <Trophy className="w-7 h-7" />
                </div>
                <span className="bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 text-[10px] uppercase font-black px-3 py-1 rounded-full border border-indigo-500/20">
                  Map Guesser
                </span>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  10-Category World Quiz Master
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Test your world knowledge! Drop coordinates on an interactive satellite radar map across 10 specialized categories including Landmarks, Capitals, Rivers, and Mountains. Correct guesses must be within 250 kilometers!
                </p>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 pt-2">
                {['10 Categories', 'Score Tracker', 'Win Streaks', 'Geographical Hints'].map((tag) => (
                  <span key={tag} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[11px] px-2.5 py-1 rounded-lg border border-black/5 dark:border-white/5">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={() => { playSound('click'); setActiveGame('quiz'); }}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-700 dark:hover:bg-indigo-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 group-hover:shadow-indigo-600/30"
            >
              <span>Play Quiz Master</span>
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </motion.div>

          {/* GAME 2: STREET VIEW SCAVENGER HUNT */}
          <motion.div 
            whileHover={{ y: -6, scale: 1.01 }}
            className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-[32px] p-8 shadow-xl flex flex-col justify-between space-y-6 group transition-all relative overflow-hidden"
          >
            {/* Background pattern */}
            <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none"></div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400 rounded-2xl flex items-center justify-center">
                  <Compass className="w-7 h-7" />
                </div>
                <span className="bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 text-[10px] uppercase font-black px-3 py-1 rounded-full border border-emerald-500/20">
                  Street View
                </span>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Teleportation Scavenger Hunt
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Spawn randomly inside immersive, 3D Google Street View panoramas! Navigate road systems step-by-step while tracing your progressive deviation on a live tracking mini-map. Reach the target within a precise 10-meter range before time runs out!
                </p>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 pt-2">
                {['Immersive 3D', 'Live Mini-Map', 'Haversine Timer', '10m Precision'].map((tag) => (
                  <span key={tag} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[11px] px-2.5 py-1 rounded-lg border border-black/5 dark:border-white/5">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={() => { playSound('click'); setActiveGame('scavenger'); }}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 group-hover:shadow-emerald-600/30"
            >
              <span>Play Scavenger Hunt</span>
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* HEADER HUD */}
      <div className="bg-[#141414] text-white p-6 rounded-[32px] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 border border-white/5 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#5A5A40]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center shadow-inner animate-pulse">
            <Gamepad2 className="w-8 h-8" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] font-black text-emerald-400">Educational Arcade</span>
              <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-emerald-500/20">Active</span>
            </div>
            <h1 className="font-serif italic text-3xl md:text-4xl tracking-tight mt-0.5">10-Game World Quiz</h1>
          </div>
        </div>

        {/* Global Scores Grid */}
        <div className="grid grid-cols-3 gap-3 md:gap-6 bg-white/5 p-3 rounded-2xl border border-white/10 relative z-10 w-full md:w-auto">
          <div className="text-center px-2">
            <span className="text-[9px] uppercase tracking-wider font-black text-white/50 block">Current Score</span>
            <span className="font-mono text-xl font-black text-emerald-400 block mt-0.5">{score}</span>
          </div>
          <div className="text-center border-x border-white/10 px-4">
            <span className="text-[9px] uppercase tracking-wider font-black text-white/50 block">Win Streak</span>
            <span className="font-mono text-xl font-black text-amber-400 flex items-center justify-center gap-1 mt-0.5">
              🔥 {streak}
            </span>
          </div>
          <div className="text-center px-2">
            <span className="text-[9px] uppercase tracking-wider font-black text-white/50 block">High Score</span>
            <span className="font-mono text-xl font-black text-[#5A5A40] block mt-0.5">{highScore}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 relative z-10">
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)} 
            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors text-white/80"
            title={soundEnabled ? "Mute Sound FX" : "Unmute Sound FX"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
          </button>
          <button 
            onClick={resetAllData} 
            className="p-3 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl border border-rose-500/20 transition-all text-rose-400 text-xs font-bold uppercase tracking-wider"
            title="Reset Game Statistics"
          >
            Reset
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!activeCategory ? (
          /* GAME SELECTION MENU */
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <button
                onClick={() => { playSound('click'); setActiveGame('menu'); }}
                className="text-xs font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-500 flex items-center gap-1 hover:-translate-x-0.5 transition-all"
              >
                ← Back to Game Hub Menu
              </button>
            </div>

            <div className="text-center md:text-left">
              <h2 className="text-xl font-bold text-[#141414] dark:text-white flex items-center justify-center md:justify-start gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <span>Select a Geography Category</span>
              </h2>
              <p className="text-sm text-[#141414]/60 dark:text-white/60 mt-1">
                Pin targets on the global map. Correct guesses are within 250 kilometers! Build streaks for massive scores.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              {CATEGORIES.map((cat, idx) => {
                const stats = categoryStats[cat.id] || { high: 0, played: 0 };
                return (
                  <motion.button
                    key={cat.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.04 }}
                    onClick={() => selectCategory(cat.id)}
                    className="group text-left bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-3xl p-5 hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[170px]"
                  >
                    {/* Background accent */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity rounded-full blur-xl pointer-events-none"></div>
                    
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-3xl filter drop-shadow">{cat.icon}</span>
                        {stats.played > 0 && (
                          <span className="bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-emerald-500/20">
                            ✓ Played
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-[#141414] dark:text-white mt-4 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {cat.name}
                      </h3>
                      <p className="text-[10px] text-[#141414]/50 dark:text-white/40 mt-1 line-clamp-2">
                        {cat.desc}
                      </p>
                    </div>

                    <div className="border-t border-black/5 dark:border-white/5 pt-3 mt-4 flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-[#141414]/40 dark:text-white/30">
                      <span>Played: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{stats.played}</strong></span>
                      <span>Best: <strong className="font-mono text-amber-500">{stats.high} XP</strong></span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ) : (
          /* ACTIVE GAME SCREEN */
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* GAMEBOARD CONTROLS (LEFT PANEL) */}
            <div className="lg:col-span-4 space-y-4 flex flex-col justify-between">
              <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-3xl p-6 shadow-xl space-y-5">
                <div className="flex items-center justify-between">
                  <button 
                    onClick={quitToMenu}
                    className="text-xs font-bold uppercase tracking-wider text-rose-500 hover:text-rose-600 hover:-translate-x-1 transition-all flex items-center gap-1"
                  >
                    ← Exit Quiz
                  </button>
                  <span className="bg-[#5A5A40]/10 text-[#5A5A40] text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-[#5A5A40]/20">
                    Category: {CATEGORIES.find(c => c.id === activeCategory)?.name}
                  </span>
                </div>

                {/* OBJECTIVE CONTAINER */}
                <div className="bg-slate-50 dark:bg-zinc-950 p-5 rounded-2xl border border-black/5 dark:border-white/5 text-center relative overflow-hidden">
                  <span className="text-[10px] uppercase font-black tracking-[0.2em] text-[#5A5A40] block">Mission Target</span>
                  
                  {currentTarget ? (
                    <>
                      <h2 className="text-2xl font-serif italic text-slate-800 dark:text-zinc-100 font-extrabold tracking-tight mt-1.5 leading-tight">
                        {currentTarget.name}
                      </h2>
                      
                      {/* Hint Toggle */}
                      <div className="mt-4">
                        {showHint ? (
                          <motion.p 
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed bg-white dark:bg-zinc-900 p-3 rounded-xl border border-black/5 inline-block text-left"
                          >
                            💡 <strong>Hint:</strong> {currentTarget.hint || "No specific hint provided for this location, rely on your worldwide geographical senses!"}
                          </motion.p>
                        ) : (
                          <button 
                            onClick={() => { playSound('click'); setShowHint(true); }}
                            className="text-[10px] uppercase tracking-wider font-bold text-sky-500 hover:text-sky-600 flex items-center gap-1 mx-auto"
                          >
                            <HelpCircle className="w-3.5 h-3.5" /> Show Geographical Hint
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-slate-400 italic text-sm">Loading target location...</div>
                  )}
                </div>

                {/* GAME STATE RESPONSES */}
                <AnimatePresence mode="wait">
                  {roundStatus === 'playing' ? (
                    <motion.div 
                      key="playing"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10"
                    >
                      <Compass className="w-8 h-8 text-emerald-500 mx-auto animate-spin" style={{ animationDuration: '6s' }} />
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-2">
                        Click anywhere on the world map to drop your pin!
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Try to pin as close to {currentTarget?.name} as possible.
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="guessed"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <div className={`p-5 rounded-2xl border text-center ${lastGuessDistance !== null && lastGuessDistance < 250 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-300'}`}>
                        <div className="flex items-center justify-center gap-2 mb-2">
                          {lastGuessDistance !== null && lastGuessDistance < 250 ? (
                            <>
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                              <span className="font-bold text-sm uppercase tracking-wider">Perfect Hit!</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-5 h-5 text-rose-500" />
                              <span className="font-bold text-sm uppercase tracking-wider">Too Far Away!</span>
                            </>
                          )}
                        </div>

                        <div className="text-3xl font-black font-mono tracking-tight">
                          {lastGuessDistance?.toLocaleString()} <span className="text-sm font-medium">km</span>
                        </div>
                        <p className="text-xs opacity-80 mt-1">
                          {lastGuessDistance !== null && lastGuessDistance < 250 
                            ? `Fantastic job! You were extremely precise. (+100 XP awarded)`
                            : `The actual coordinate was ${lastGuessDistance?.toLocaleString()} km away. Switching to next place in ${countdown ?? 4}s...`
                          }
                        </p>
                      </div>

                      <button
                        onClick={nextRound}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold p-4 rounded-2xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                      >
                        <span>Next Target {countdown !== null ? `(${countdown}s)` : ''}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* QUICK GEOGRAPHY INSTRUCTION CARD */}
              <div className="bg-[#141414] text-white/80 p-5 rounded-3xl border border-white/5 space-y-3">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#5A5A40]" />
                  <span className="text-[10px] uppercase font-black tracking-widest text-[#5A5A40]">Rulebook</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  The closer you are, the higher the accuracy ranking. Dropping your pin within <strong>250 km</strong> constitutes a winning strike, increasing your active streak multiplier. Standard pins award <strong>100 points</strong>, and pins closer than 100km award a <strong>50 XP premium bonus</strong>!
                </p>
              </div>
            </div>

            {/* MAP STAGE (RIGHT PANEL) */}
            <div className="lg:col-span-8 flex flex-col">
              <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-[32px] p-4 shadow-xl flex-grow flex flex-col">
                <div className="flex items-center justify-between mb-3 px-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-xs font-bold text-[#141414] dark:text-zinc-300">Global Satellite Target Radar</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                      mapType === 'google' 
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                        : mapType === 'leaflet'
                          ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          : 'bg-zinc-500/10 text-zinc-500'
                    }`}>
                      {mapType === 'google' ? 'Google Maps' : mapType === 'leaflet' ? 'Leaflet Fallback' : 'Loading Map...'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Use scroll or pinch to zoom. Tap to mark your guess coordinates.
                  </div>
                </div>

                {apiError && (
                  <div className="mb-2 p-2 bg-rose-500/10 border border-rose-500/25 rounded-xl flex items-start gap-2 text-rose-600 dark:text-rose-400 text-[10px] leading-relaxed">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Google Maps Warning:</span> {apiError} Using robust Leaflet fallback.
                    </div>
                  </div>
                )}

                <div className="relative rounded-2xl overflow-hidden border border-black/10 dark:border-white/10" style={{ height: '58vh' }}>
                  <div ref={mapContainerRef} className="w-full h-full" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
