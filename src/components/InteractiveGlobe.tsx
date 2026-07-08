import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, RefreshCw, Compass, MapPin, ZoomIn, ZoomOut, Target, Cpu, Activity, Shield, X } from 'lucide-react';
import { Continent } from '../App.tsx';
import { LocationData } from './LocationList.tsx';

// Mapping of common GeoJSON country names to standard Continents
const COUNTRY_TO_CONTINENT: Record<string, Continent> = {
  // North America
  "Canada": "North America",
  "United States": "North America",
  "United States of America": "North America",
  "Mexico": "North America",
  "Greenland": "North America",
  "Cuba": "North America",
  "Guatemala": "North America",
  "Honduras": "North America",
  "Nicaragua": "North America",
  "Panama": "North America",
  "Costa Rica": "North America",
  "El Salvador": "North America",
  "Jamaica": "North America",
  "Haiti": "North America",
  "Dominican Rep.": "North America",
  "Dominican Republic": "North America",
  "Puerto Rico": "North America",
  "Bahamas": "North America",
  "Belize": "North America",

  // South America
  "Brazil": "South America",
  "Argentina": "South America",
  "Peru": "South America",
  "Colombia": "South America",
  "Chile": "South America",
  "Venezuela": "South America",
  "Ecuador": "South America",
  "Bolivia": "South America",
  "Paraguay": "South America",
  "Uruguay": "South America",
  "Guyana": "South America",
  "Suriname": "South America",
  "Falkland Is.": "South America",

  // Europe
  "United Kingdom": "Europe",
  "France": "Europe",
  "Germany": "Europe",
  "Italy": "Europe",
  "Spain": "Europe",
  "Poland": "Europe",
  "Ukraine": "Europe",
  "Romania": "Europe",
  "Netherlands": "Europe",
  "Belgium": "Europe",
  "Greece": "Europe",
  "Czechia": "Europe",
  "Sweden": "Europe",
  "Norway": "Europe",
  "Finland": "Europe",
  "Austria": "Europe",
  "Switzerland": "Europe",
  "Denmark": "Europe",
  "Ireland": "Europe",
  "Portugal": "Europe",
  "Slovakia": "Europe",
  "Hungary": "Europe",
  "Belarus": "Europe",
  "Moldova": "Europe",
  "Lithuania": "Europe",
  "Latvia": "Europe",
  "Estonia": "Europe",
  "Bulgaria": "Europe",
  "Albania": "Europe",
  "Serbia": "Europe",
  "Croatia": "Europe",
  "Slovenia": "Europe",
  "Bosnia and Herz.": "Europe",
  "Macedonia": "Europe",
  "Montenegro": "Europe",
  "Kosovo": "Europe",
  "Iceland": "Europe",
  "Luxembourg": "Europe",
  "Cyprus": "Europe",

  // Africa
  "Algeria": "Africa",
  "Angola": "Africa",
  "Benin": "Africa",
  "Botswana": "Africa",
  "Burkina Faso": "Africa",
  "Burundi": "Africa",
  "Cabo Verde": "Africa",
  "Cameroon": "Africa",
  "Central African Rep.": "Africa",
  "Chad": "Africa",
  "Comoros": "Africa",
  "Congo": "Africa",
  "Dem. Rep. Congo": "Africa",
  "Democratic Republic of the Congo": "Africa",
  "Djibouti": "Africa",
  "Egypt": "Africa",
  "Equatorial Guinea": "Africa",
  "Eritrea": "Africa",
  "Eswatini": "Africa",
  "Ethiopia": "Africa",
  "Gabon": "Africa",
  "Gambia": "Africa",
  "Ghana": "Africa",
  "Guinea": "Africa",
  "Guinea-Bissau": "Africa",
  "Ivory Coast": "Africa",
  "Kenya": "Africa",
  "Lesotho": "Africa",
  "Liberia": "Africa",
  "Libya": "Africa",
  "Madagascar": "Africa",
  "Malawi": "Africa",
  "Mali": "Africa",
  "Mauritania": "Africa",
  "Mauritius": "Africa",
  "Morocco": "Africa",
  "Mozambique": "Africa",
  "Namibia": "Africa",
  "Niger": "Africa",
  "Nigeria": "Africa",
  "Rwanda": "Africa",
  "Sao Tome and Principe": "Africa",
  "Senegal": "Africa",
  "Seychelles": "Africa",
  "Sierra Leone": "Africa",
  "Somalia": "Africa",
  "South Africa": "Africa",
  "South Sudan": "Africa",
  "Sudan": "Africa",
  "Tanzania": "Africa",
  "Togo": "Africa",
  "Tunisia": "Africa",
  "Uganda": "Africa",
  "Zambia": "Africa",
  "Zimbabwe": "Africa",
  "W. Sahara": "Africa",
  "Somaliland": "Africa",

  // Asia
  "Afghanistan": "Asia",
  "Armenia": "Asia",
  "Azerbaijan": "Asia",
  "Bahrain": "Asia",
  "Bangladesh": "Asia",
  "Bhutan": "Asia",
  "Brunei": "Asia",
  "Cambodia": "Asia",
  "China": "Asia",
  "Georgia": "Asia",
  "India": "Asia",
  "Indonesia": "Asia",
  "Iran": "Asia",
  "Iraq": "Asia",
  "Israel": "Asia",
  "Japan": "Asia",
  "Jordan": "Asia",
  "Kazakhstan": "Asia",
  "Kuwait": "Asia",
  "Kyrgyzstan": "Asia",
  "Laos": "Asia",
  "Lebanon": "Asia",
  "Malaysia": "Asia",
  "Maldives": "Asia",
  "Mongolia": "Asia",
  "Myanmar": "Asia",
  "Nepal": "Asia",
  "North Korea": "Asia",
  "Oman": "Asia",
  "Pakistan": "Asia",
  "Palestine": "Asia",
  "Philippines": "Asia",
  "Qatar": "Asia",
  "Russia": "Asia",
  "Saudi Arabia": "Asia",
  "Singapore": "Asia",
  "South Korea": "Asia",
  "Sri Lanka": "Asia",
  "Syria": "Asia",
  "Taiwan": "Asia",
  "Tajikistan": "Asia",
  "Thailand": "Asia",
  "Timor-Leste": "Asia",
  "Turkey": "Asia",
  "Turkmenistan": "Asia",
  "United Arab Emirates": "Asia",
  "Uzbekistan": "Asia",
  "Vietnam": "Asia",
  "Yemen": "Asia",

  // Oceania
  "Australia": "Oceania",
  "New Zealand": "Oceania",
  "Papua New Guinea": "Oceania",
  "Fiji": "Oceania",
  "Solomon Is.": "Oceania",
  "Vanuatu": "Oceania",
  "New Caledonia": "Oceania",
  "Samoa": "Oceania",
  "Tonga": "Oceania",

  // Antarctica
  "Antarctica": "Antarctica",
  "Fr. S. Antarctic Lands": "Antarctica"
};

// Map each continent to a high-end cyber-neon configuration
const CYBER_CONTINENT_THEME: Record<Continent, { 
  fillGrad: string; 
  strokeColor: string; 
  glowFilter: string;
  particleColor: string;
}> = {
  "Africa": { 
    fillGrad: "url(#grad-africa)", 
    strokeColor: "#ffaa00", 
    glowFilter: "url(#glow-orange)",
    particleColor: "#f59e0b"
  },
  "Asia": { 
    fillGrad: "url(#grad-asia)", 
    strokeColor: "#00ffcc", 
    glowFilter: "url(#glow-cyan)",
    particleColor: "#10b981"
  },
  "Europe": { 
    fillGrad: "url(#grad-europe)", 
    strokeColor: "#bd93f9", 
    glowFilter: "url(#glow-magenta)",
    particleColor: "#a855f7"
  },
  "North America": { 
    fillGrad: "url(#grad-north-america)", 
    strokeColor: "#ff007f", 
    glowFilter: "url(#glow-magenta)",
    particleColor: "#ec4899"
  },
  "South America": { 
    fillGrad: "url(#grad-south-america)", 
    strokeColor: "#00ff88", 
    glowFilter: "url(#glow-emerald)",
    particleColor: "#34d399"
  },
  "Oceania": { 
    fillGrad: "url(#grad-oceania)", 
    strokeColor: "#00f0ff", 
    glowFilter: "url(#glow-cyan)",
    particleColor: "#06b6d4"
  },
  "Antarctica": { 
    fillGrad: "url(#grad-antarctica)", 
    strokeColor: "#a5f3fc", 
    glowFilter: "url(#glow-cyan)",
    particleColor: "#38bdf8"
  }
};

const CITY_LIGHTS = [
  { name: "Tokyo", lat: 35.6762, lng: 139.6503 },
  { name: "New York", lat: 40.7128, lng: -74.0060 },
  { name: "London", lat: 51.5074, lng: -0.1278 },
  { name: "Paris", lat: 48.8566, lng: 2.3522 },
  { name: "Sydney", lat: -33.8688, lng: 151.2093 },
  { name: "Cairo", lat: 30.0444, lng: 31.2357 },
  { name: "Rio de Janeiro", lat: -22.9068, lng: -43.1729 },
  { name: "Mumbai", lat: 19.0760, lng: 72.8777 },
  { name: "Shanghai", lat: 31.2304, lng: 121.4737 },
  { name: "Los Angeles", lat: 34.0522, lng: -118.2437 },
  { name: "Moscow", lat: 55.7558, lng: 37.6173 },
  { name: "Cape Town", lat: -33.9249, lng: 18.4241 },
  { name: "Buenos Aires", lat: -34.6037, lng: -58.3816 },
  { name: "New Delhi", lat: 28.6139, lng: 77.2090 },
  { name: "Beijing", lat: 39.9042, lng: 116.4074 },
  { name: "Lagos", lat: 6.5244, lng: 3.3792 },
  { name: "Nairobi", lat: -1.2921, lng: 36.8219 },
  { name: "Chicago", lat: 41.8781, lng: -87.6298 },
  { name: "Toronto", lat: 43.6532, lng: -79.3832 },
  { name: "Berlin", lat: 52.5200, lng: 13.4050 },
  { name: "Seoul", lat: 37.5665, lng: 126.9780 },
  { name: "Bangkok", lat: 13.7563, lng: 100.5018 },
  { name: "Jakarta", lat: -6.2088, lng: 106.8456 },
  { name: "Singapore", lat: 1.3521, lng: 103.8198 },
  { name: "Dubai", lat: 25.2048, lng: 55.2708 },
  { name: "São Paulo", lat: -23.5505, lng: -46.6333 },
  { name: "Mexico City", lat: 19.4326, lng: -99.1332 },
  { name: "Johannesburg", lat: -26.2041, lng: 28.0473 },
  { name: "Istanbul", lat: 41.0082, lng: 28.9784 },
  { name: "Riyadh", lat: 24.7136, lng: 46.6753 },
  { name: "Madrid", lat: 40.4168, lng: -3.7038 },
  { name: "Rome", lat: 41.9028, lng: 12.4964 },
  { name: "Stockholm", lat: 59.3293, lng: 18.0686 },
  { name: "Manila", lat: 14.5995, lng: 120.9842 },
  { name: "Auckland", lat: -36.8485, lng: 174.7633 },
  { name: "Lima", lat: -12.0464, lng: -77.0428 },
  { name: "Santiago", lat: -33.4489, lng: -70.6693 },
  { name: "Vancouver", lat: 49.2827, lng: -123.1207 },
  { name: "Denver", lat: 39.7392, lng: -104.9903 },
  { name: "Miami", lat: 25.7617, lng: -80.1918 },
  { name: "Houston", lat: 29.7604, lng: -95.3698 },
  { name: "Casablanca", lat: 33.5731, lng: -7.5898 },
  { name: "Dakar", lat: 14.7167, lng: -17.4677 },
  { name: "Khartoum", lat: 15.5007, lng: 32.5599 },
  { name: "Addis Ababa", lat: 9.0192, lng: 38.7468 },
  { name: "Baghdad", lat: 33.3152, lng: 44.3661 },
  { name: "Tehran", lat: 35.6892, lng: 51.3890 },
  { name: "Karachi", lat: 24.8607, lng: 67.0011 },
  { name: "Dhaka", lat: 23.8103, lng: 90.4125 },
  { name: "Guangzhou", lat: 23.1291, lng: 113.2644 },
  { name: "Shenzhen", lat: 22.5431, lng: 114.0579 },
  { name: "Hong Kong", lat: 22.3193, lng: 114.1694 },
  { name: "Taipei", lat: 25.0330, lng: 121.5654 },
  { name: "Melbourne", lat: -37.8136, lng: 144.9631 },
  { name: "Honolulu", lat: 21.3069, lng: -157.8583 },
  { name: "Reykjavik", lat: 64.1466, lng: -21.9426 },
  { name: "Vladivostok", lat: 43.1198, lng: 131.8869 },
  { name: "Perth", lat: -31.9505, lng: 115.8605 }
];

const PROCEDURAL_CLOUDS = [
  // Equatorial cloud bands
  { center: [-150, 5] as [number, number], radius: 14, opacity: 0.45, pulseSpeed: 0.05, phase: 0 },
  { center: [-110, 8] as [number, number], radius: 18, opacity: 0.55, pulseSpeed: 0.03, phase: 1.2 },
  { center: [-60, -5] as [number, number], radius: 16, opacity: 0.4, pulseSpeed: 0.04, phase: 2.5 },
  { center: [0, 2] as [number, number], radius: 22, opacity: 0.6, pulseSpeed: 0.02, phase: 0.5 },
  { center: [40, -8] as [number, number], radius: 15, opacity: 0.5, pulseSpeed: 0.06, phase: 3.1 },
  { center: [90, 4] as [number, number], radius: 20, opacity: 0.48, pulseSpeed: 0.03, phase: 1.8 },
  { center: [130, -3] as [number, number], radius: 17, opacity: 0.52, pulseSpeed: 0.05, phase: 0.9 },
  
  // Mid-latitude storm systems (Northern Hemisphere)
  { center: [-130, 45] as [number, number], radius: 18, opacity: 0.65, pulseSpeed: 0.04, phase: 2.1 }, // Pacific storm
  { center: [-80, 42] as [number, number], radius: 12, opacity: 0.5, pulseSpeed: 0.05, phase: 0.2 },
  { center: [-40, 50] as [number, number], radius: 25, opacity: 0.7, pulseSpeed: 0.02, phase: 1.5 }, // Atlantic swirling low
  { center: [10, 48] as [number, number], radius: 14, opacity: 0.45, pulseSpeed: 0.07, phase: 4.0 },
  { center: [60, 55] as [number, number], radius: 20, opacity: 0.58, pulseSpeed: 0.03, phase: 2.8 },
  { center: [110, 45] as [number, number], radius: 16, opacity: 0.52, pulseSpeed: 0.04, phase: 0.7 },
  { center: [150, 50] as [number, number], radius: 22, opacity: 0.62, pulseSpeed: 0.025, phase: 3.5 },

  // Mid-latitude storm systems (Southern Hemisphere)
  { center: [-120, -40] as [number, number], radius: 20, opacity: 0.6, pulseSpeed: 0.03, phase: 1.1 },
  { center: [-70, -45] as [number, number], radius: 15, opacity: 0.48, pulseSpeed: 0.05, phase: 2.9 },
  { center: [-20, -50] as [number, number], radius: 24, opacity: 0.68, pulseSpeed: 0.02, phase: 0.4 },
  { center: [30, -35] as [number, number], radius: 16, opacity: 0.5, pulseSpeed: 0.06, phase: 1.7 },
  { center: [80, -45] as [number, number], radius: 22, opacity: 0.65, pulseSpeed: 0.035, phase: 3.2 },
  { center: [130, -42] as [number, number], radius: 18, opacity: 0.55, pulseSpeed: 0.045, phase: 0.8 },

  // Polar vortex systems
  { center: [0, 80] as [number, number], radius: 25, opacity: 0.75, pulseSpeed: 0.015, phase: 0 },
  { center: [120, 82] as [number, number], radius: 20, opacity: 0.7, pulseSpeed: 0.02, phase: 1.9 },
  { center: [-120, -80] as [number, number], radius: 28, opacity: 0.8, pulseSpeed: 0.012, phase: 0.8 },
  { center: [40, -82] as [number, number], radius: 22, opacity: 0.75, pulseSpeed: 0.018, phase: 2.3 }
];

interface InteractiveGlobeProps {
  selectedContinent: Continent | null;
  onSelectContinent: (continent: Continent | null) => void;
  locations: LocationData[];
  speed?: number;
  onChangeSpeed?: (speed: number) => void;
  onSelectLocation?: (location: LocationData) => void;
}

export default function InteractiveGlobe({ 
  selectedContinent, 
  onSelectContinent, 
  locations,
  speed: speedProp,
  onChangeSpeed,
  onSelectLocation
}: InteractiveGlobeProps) {
  const [worldData, setWorldData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rotation, setRotation] = useState<[number, number]>([12, -15]);
  const [scale, setScale] = useState(210);
  const [hoveredContinent, setHoveredContinent] = useState<Continent | null>(null);
  const [isRotating, setIsRotating] = useState(true);
  const [localSpeed, setLocalSpeed] = useState(1.0); // Interactive rotation speed multiplier (0.1x to 4.0x)
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);

  const speed = speedProp !== undefined ? speedProp : localSpeed;

  useEffect(() => {
    if (speedProp !== undefined && speedProp > 0) {
      setIsRotating(true);
    }
  }, [speedProp]);

  // Orbit rotation step to create spinning holographic satellites
  const [orbitOffset, setOrbitOffset] = useState(0);
  const [utcDate, setUtcDate] = useState(new Date());
  const [bloomEnabled, setBloomEnabled] = useState(true);
  const [bloomIntensity, setBloomIntensity] = useState(2.5);
  const [showProjectionBeam, setShowProjectionBeam] = useState(false); // Default to false for realistic look
  const [cloudsEnabled, setCloudsEnabled] = useState(true);
  const [cloudOffset, setCloudOffset] = useState(0);
  const [cloudOpacity, setCloudOpacity] = useState(0.48);
  const [atmosphereEnabled, setAtmosphereEnabled] = useState(true);
  const [atmosphereGlow, setAtmosphereGlow] = useState(0.8);
  const [cyberHudEnabled, setCyberHudEnabled] = useState(false); // Default to false for a clean realistic satellite globe
  const [isHoloEngineExpanded, setIsHoloEngineExpanded] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setUtcDate(new Date());
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 500, height: 500 });

  // Auto-rotate the globe slowly using a high-performance, frame-rate independent requestAnimationFrame loop
  useEffect(() => {
    if (!isRotating) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      const delta = time - lastTime;
      // Cap delta to 100ms to prevent huge jumps when the tab is inactive or suspended
      const cappedDelta = Math.min(delta, 100);
      lastTime = time;

      // Maintain original speed targets (calibrated for 30ms step size: 0.65, 1.8, 0.28 degrees per step respectively)
      const stepFactor = speed * (cappedDelta / 30);

      setRotation(prev => [prev[0] + 0.65 * stepFactor, prev[1]]);
      setOrbitOffset(prev => (prev + 1.8 * stepFactor) % 360);
      setCloudOffset(prev => (prev + 0.28 * stepFactor) % 360); // Clouds rotate slowly for dynamic wind effect

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isRotating, speed]);

  // Load standard light-weight GeoJSON map
  useEffect(() => {
    let active = true;
    fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
      .then(res => res.json())
      .then(data => {
        if (active) {
          setWorldData(data);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error("Failed to load world map GeoJSON:", err);
        setLoading(false);
      });

    return () => { active = false; };
  }, []);

  // Handle responsive resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      const computedSize = Math.max(300, Math.min(width, 540));
      setDimensions({ width: computedSize, height: computedSize });
      setScale(computedSize * 0.41);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute D3 Projection and Path generators
  const projection = useMemo(() => {
    return d3.geoOrthographic()
      .scale(scale)
      .translate([dimensions.width / 2, dimensions.height / 2])
      .rotate([rotation[0], rotation[1]])
      .clipAngle(90);
  }, [scale, dimensions, rotation]);

  const pathGenerator = useMemo(() => {
    return d3.geoPath().projection(projection);
  }, [projection]);

  // Secondary projection specifically for the cloud layer with independent rotation speed
  const cloudProjection = useMemo(() => {
    return d3.geoOrthographic()
      .scale(scale)
      .translate([dimensions.width / 2, dimensions.height / 2])
      .rotate([rotation[0] + cloudOffset, rotation[1]])
      .clipAngle(90);
  }, [scale, dimensions, rotation, cloudOffset]);

  const cloudPathGenerator = useMemo(() => {
    return d3.geoPath().projection(cloudProjection);
  }, [cloudProjection]);

  const graticule = useMemo(() => {
    return d3.geoGraticule()();
  }, []);

  const nightLayers = useMemo(() => {
    const utcHours = utcDate.getUTCHours();
    const utcMinutes = utcDate.getUTCMinutes();
    const utcSeconds = utcDate.getUTCSeconds();
    const utcTimeDecimal = utcHours + utcMinutes / 60 + utcSeconds / 3600;

    // Subsolar longitude: noon (12:00) UTC is roughly 0°
    const subsolarLng = (12 - utcTimeDecimal) * 15;

    // Solar declination (Earth axial tilt): ranges between -23.44 and +23.44 degrees
    const startOfYear = new Date(utcDate.getUTCFullYear(), 0, 1);
    const diff = utcDate.getTime() - startOfYear.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const declination = 23.44 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 80));

    // The center of night is the antipodal point of the subsolar coordinates
    const nightCenterLng = subsolarLng + 180 > 180 ? subsolarLng - 180 : subsolarLng + 180;
    const nightCenterLat = -declination;

    try {
      // Core total shadow circle
      const coreCircle = d3.geoCircle().center([nightCenterLng, nightCenterLat]).radius(78)();
      // Mid twilight shadow circle
      const midCircle = d3.geoCircle().center([nightCenterLng, nightCenterLat]).radius(85)();
      // Outer light shadow circle
      const outerCircle = d3.geoCircle().center([nightCenterLng, nightCenterLat]).radius(92)();
      // Absolute 90-degree boundary line representing the golden atmospheric sunset/sunrise transition
      const terminatorCircle = d3.geoCircle().center([nightCenterLng, nightCenterLat]).radius(90)();

      return {
        core: coreCircle,
        mid: midCircle,
        outer: outerCircle,
        terminator: terminatorCircle
      };
    } catch (err) {
      console.error("Failed to generate day/night geo circles:", err);
      return null;
    }
  }, [utcDate]);

  // Direct pointer drag listeners
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsRotating(false);
    const startX = e.clientX;
    const startY = e.clientY;
    const [r0, r1] = rotation;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      const sensitivity = 0.3;
      let nextLon = r0 + dx * sensitivity;
      let nextLat = r1 - dy * sensitivity;

      // Clamp latitude to avoid flipping upside down
      nextLat = Math.max(-80, Math.min(80, nextLat));

      setRotation([nextLon, nextLat]);
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Helper function to check if a location marker is on the visible front hemisphere
  const isPointVisible = (lng: number, lat: number) => {
    const rlon = projection.rotate()[0];
    const rlat = projection.rotate()[1];
    const distance = d3.geoDistance([lng, lat], [-rlon, -rlat]);
    return distance < Math.PI / 2; // Less than 90 degrees angular distance
  };

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center w-full relative select-none bg-black/95 rounded-[36px] p-2 border border-emerald-500/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden">
      
      {/* Visual cyber HUD borders and status decorations in the corner to align with image */}
      <div className="absolute top-4 left-6 flex flex-col gap-1 pointer-events-none text-emerald-400/80 font-mono text-[9px] uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <Target className="w-3 h-3 animate-pulse text-emerald-400" />
          <span>ORBITAL_SYS: ENGAGED</span>
        </div>
        <div className="flex items-center gap-1.5 text-[8px] text-orange-400/80 tracking-wider pl-5 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
          <span>DAY_NIGHT: {utcDate.toISOString().slice(11, 19)} UTC</span>
        </div>
      </div>

      {/* Bloom Shader & Projection HUD Tuning Deck */}
      <div className="absolute bottom-16 left-6 z-10 flex flex-col bg-black/85 backdrop-blur-md p-3.5 rounded-2xl border border-cyan-500/30 max-w-[200px] shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all">
        <div className="flex items-center justify-between gap-1.5 border-b border-cyan-500/20 pb-1.5 text-cyan-400 font-mono text-[9px] font-bold uppercase tracking-widest">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>HOLO_ENGINE</span>
          </div>
          <button
            onClick={() => setIsHoloEngineExpanded(!isHoloEngineExpanded)}
            className="p-1 rounded hover:bg-cyan-500/10 transition-colors text-cyan-400 font-mono text-[8px] font-bold border border-cyan-500/20 cursor-pointer"
          >
            {isHoloEngineExpanded ? 'HIDE' : 'SHOW'}
          </button>
        </div>
        
        <AnimatePresence initial={false}>
          {isHoloEngineExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mt-2.5 space-y-2.5 flex flex-col"
            >
              {/* Bloom Toggle */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-white/70 font-mono text-[8px] uppercase tracking-wider">POST_BLOOM:</span>
                <button
                  onClick={() => setBloomEnabled(!bloomEnabled)}
                  className={`px-2 py-0.5 rounded text-[8px] font-mono border transition-all ${
                    bloomEnabled 
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_8px_rgba(6,182,212,0.3)]' 
                      : 'bg-black/50 border-cyan-500/10 text-cyan-500/50 hover:bg-cyan-500/5'
                  }`}
                >
                  {bloomEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Bloom Intensity Slider */}
              {bloomEnabled && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[8px] font-mono text-cyan-400/80">
                    <span>GLOW_LEVEL:</span>
                    <span className="font-bold">{bloomIntensity.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="4.5"
                    step="0.1"
                    value={bloomIntensity}
                    onChange={(e) => setBloomIntensity(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer h-1 rounded bg-cyan-950/60 border border-cyan-500/20"
                  />
                </div>
              )}

              {/* Projection Beam Toggle */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-white/70 font-mono text-[8px] uppercase tracking-wider">PROJECTOR:</span>
                <button
                  onClick={() => setShowProjectionBeam(!showProjectionBeam)}
                  className={`px-2 py-0.5 rounded text-[8px] font-mono border transition-all ${
                    showProjectionBeam 
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_8px_rgba(6,182,212,0.3)]' 
                      : 'bg-black/50 border-cyan-500/10 text-cyan-500/50 hover:bg-cyan-500/5'
                  }`}
                >
                  {showProjectionBeam ? 'ACTIVE' : 'STANDBY'}
                </button>
              </div>

              {/* Cloud Layer Toggle & Slider */}
              <div className="flex items-center justify-between gap-4 border-t border-cyan-500/10 pt-2">
                <span className="text-white/70 font-mono text-[8px] uppercase tracking-wider">CLOUD_LAYER:</span>
                <button
                  onClick={() => setCloudsEnabled(!cloudsEnabled)}
                  className={`px-2 py-0.5 rounded text-[8px] font-mono border transition-all ${
                    cloudsEnabled 
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_8px_rgba(6,182,212,0.3)]' 
                      : 'bg-black/50 border-cyan-500/10 text-cyan-500/50 hover:bg-cyan-500/5'
                  }`}
                >
                  {cloudsEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {cloudsEnabled && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[8px] font-mono text-cyan-400/80">
                    <span>CLOUD_DENSITY:</span>
                    <span className="font-bold">{(cloudOpacity * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.10"
                    max="1.00"
                    step="0.05"
                    value={cloudOpacity}
                    onChange={(e) => setCloudOpacity(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer h-1 rounded bg-cyan-950/60 border border-cyan-500/20"
                  />
                </div>
              )}

              {/* Atmosphere Halo Toggle & Slider */}
              <div className="flex items-center justify-between gap-4 border-t border-cyan-500/10 pt-2">
                <span className="text-white/70 font-mono text-[8px] uppercase tracking-wider">ATMOSPHERE:</span>
                <button
                  onClick={() => setAtmosphereEnabled(!atmosphereEnabled)}
                  className={`px-2 py-0.5 rounded text-[8px] font-mono border transition-all ${
                    atmosphereEnabled 
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_8px_rgba(6,182,212,0.3)]' 
                      : 'bg-black/50 border-cyan-500/10 text-cyan-500/50 hover:bg-cyan-500/5'
                  }`}
                >
                  {atmosphereEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {atmosphereEnabled && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[8px] font-mono text-cyan-400/80">
                    <span>HALO_GLOW:</span>
                    <span className="font-bold">{atmosphereGlow.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="2.0"
                    step="0.05"
                    value={atmosphereGlow}
                    onChange={(e) => setAtmosphereGlow(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer h-1 rounded bg-cyan-950/60 border border-cyan-500/20"
                  />
                </div>
              )}

              {/* Cyber HUD Overlays Toggle */}
              <div className="flex items-center justify-between gap-4 border-t border-cyan-500/10 pt-2">
                <span className="text-white/70 font-mono text-[8px] uppercase tracking-wider">CYBER_HUD:</span>
                <button
                  onClick={() => setCyberHudEnabled(!cyberHudEnabled)}
                  className={`px-2 py-0.5 rounded text-[8px] font-mono border transition-all ${
                    cyberHudEnabled 
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_8px_rgba(6,182,212,0.3)]' 
                      : 'bg-black/50 border-cyan-500/10 text-cyan-500/50 hover:bg-cyan-500/5'
                  }`}
                  title="Toggle futuristic scanning grids, HUD rings and transparent land filters"
                >
                  {cyberHudEnabled ? 'ACTIVE' : 'OFF'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute top-4 right-6 flex items-center gap-2 z-10 flex-wrap justify-end">
        {/* Dynamic Speed Controller HUD */}
        <div className="flex items-center gap-1.5 bg-black/85 backdrop-blur-md px-2.5 py-1 rounded-full border border-emerald-500/20 text-emerald-400 text-[9px] font-mono select-none">
          <span className="opacity-75">SPEED:</span>
          <span className="font-bold min-w-[24px] text-right">{speed.toFixed(1)}x</span>
          <input
            type="range"
            min="0.1"
            max="4.0"
            step="0.1"
            value={speed}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (onChangeSpeed) {
                onChangeSpeed(val);
              } else {
                setLocalSpeed(val);
              }
            }}
            className="w-14 sm:w-20 accent-emerald-400 cursor-pointer h-1 rounded-lg bg-emerald-950 border border-emerald-500/20"
            title="Adjust Rotation Speed"
          />
        </div>

        <button
          onClick={() => setScale(prev => Math.min(prev + 30, 450))}
          className="p-1.5 bg-black/80 backdrop-blur-md rounded-full border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setScale(prev => Math.max(prev - 30, 100))}
          className="p-1.5 bg-black/80 backdrop-blur-md rounded-full border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            setIsRotating(!isRotating);
            if (!isRotating) {
              setRotation([12, -15]);
            }
          }}
          className={`p-1.5 backdrop-blur-md rounded-full border transition-all ${
            isRotating 
              ? 'bg-emerald-500 text-black border-transparent shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
              : 'bg-black/80 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'
          }`}
          title={isRotating ? "Pause Spin" : "Auto Spin"}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
        </button>
      </div>

      {loading ? (
        <div className="w-[350px] h-[350px] sm:w-[450px] sm:h-[450px] flex flex-col items-center justify-center gap-4">
          <Globe className="w-12 h-12 text-emerald-400 animate-spin" style={{ animationDuration: '3s' }} />
          <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400/60">SYNCHRONIZING NEURAL VECTOR MAP...</span>
        </div>
      ) : (
        <div 
          onPointerDown={handlePointerDown}
          className="cursor-grab active:cursor-grabbing relative flex items-center justify-center overflow-visible"
          style={{ width: dimensions.width, height: dimensions.height }}
        >
          <svg width={dimensions.width} height={dimensions.height} className="overflow-visible">
            <defs>
              {/* Radial gradient shading giving depth with cyber grid */}
              <radialGradient id="globe-shading" cx="40%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#00d0ff" stopOpacity={0.06} />
                <stop offset="50%" stopColor="#050b14" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#000000" stopOpacity={0.92} />
              </radialGradient>

              {/* --- REALISTIC EARTH CONTINENT GRADIENTS --- */}
              {/* Africa: Sahara desert sand in north transitioning to tropical savannah & jungle greens */}
              <linearGradient id="grad-africa" x1="25%" y1="0%" x2="75%" y2="100%">
                <stop offset="0%" stopColor="#dfb76c" stopOpacity={0.95} /> {/* Sahara desert north */}
                <stop offset="25%" stopColor="#d2a04e" stopOpacity={0.95} /> {/* Transition Sahel */}
                <stop offset="65%" stopColor="#2b6b23" stopOpacity={0.95} /> {/* Central Congo Jungle */}
                <stop offset="100%" stopColor="#1a4c17" stopOpacity={0.95} /> {/* Southern forests */}
              </linearGradient>

              {/* Asia: Siberian tundra white/dark green to central steppes/deserts to south jungles */}
              <linearGradient id="grad-asia" x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={0.98} /> {/* Arctic snowy north */}
                <stop offset="18%" stopColor="#e2e8f0" stopOpacity={0.95} /> {/* Northern tundra */}
                <stop offset="35%" stopColor="#1a4c17" stopOpacity={0.95} /> {/* Siberian Taiga */}
                <stop offset="60%" stopColor="#cca158" stopOpacity={0.92} /> {/* Gobi/Central deserts */}
                <stop offset="82%" stopColor="#226b20" stopOpacity={0.95} /> {/* Indian/Chinese vegetation */}
                <stop offset="100%" stopColor="#10440e" stopOpacity={0.95} /> {/* Southeast Asian rainforests */}
              </linearGradient>

              {/* Europe: Temperate woodlands to Mediterranean olive tones */}
              <linearGradient id="grad-europe" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#143f11" stopOpacity={0.92} /> {/* Nordic forests */}
                <stop offset="40%" stopColor="#2e7d32" stopOpacity={0.95} /> {/* Western woodlands */}
                <stop offset="75%" stopColor="#3d8b31" stopOpacity={0.95} /> {/* Mediterranean light green */}
                <stop offset="100%" stopColor="#96ab73" stopOpacity={0.9} /> {/* Spain/Italy warm tones */}
              </linearGradient>

              {/* North America: Snowy Greenland/Canada to central plains to Mexican deserts */}
              <linearGradient id="grad-north-america" x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={1.0} /> {/* Greenland snowy cap */}
                <stop offset="20%" stopColor="#cbd5e1" stopOpacity={0.95} /> {/* Northern Canada tundra */}
                <stop offset="42%" stopColor="#163f13" stopOpacity={0.95} /> {/* Canadian pine forests */}
                <stop offset="72%" stopColor="#367a2e" stopOpacity={0.95} /> {/* US plains and valleys */}
                <stop offset="100%" stopColor="#c59e56" stopOpacity={0.95} /> {/* Mexican arid desert */}
              </linearGradient>

              {/* South America: Rich deep green Amazon rainforest to Andes highlands */}
              <linearGradient id="grad-south-america" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#082805" stopOpacity={0.96} /> {/* Deep Amazon basin */}
                <stop offset="45%" stopColor="#124f11" stopOpacity={0.95} /> {/* Forest cover */}
                <stop offset="78%" stopColor="#2e7d32" stopOpacity={0.95} /> {/* Highlands */}
                <stop offset="100%" stopColor="#8d6e63" stopOpacity={0.9} /> {/* Southern dry Patagonia */}
              </linearGradient>

              {/* Oceania: Island greens with light sandy coral ring effects */}
              <linearGradient id="grad-oceania" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2e7d32" stopOpacity={0.95} /> {/* Australian outback forest fringe */}
                <stop offset="45%" stopColor="#cca158" stopOpacity={0.92} /> {/* Arid Australian interior */}
                <stop offset="80%" stopColor="#1b5e20" stopOpacity={0.95} /> {/* New Zealand & Islands */}
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.8} /> {/* Turquoise coral reefs */}
              </linearGradient>

              {/* Antarctica: Pristine glacial ice sheet */}
              <linearGradient id="grad-antarctica" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={1.0} /> {/* South pole core ice */}
                <stop offset="65%" stopColor="#f8fafc" stopOpacity={1.0} /> {/* Glacial sheet */}
                <stop offset="100%" stopColor="#e2e8f0" stopOpacity={0.95} /> {/* Crevasses and shadow ice */}
              </linearGradient>

              {/* High intensity cyber glow filters */}
              <filter id="glow-cyan" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="5" result="blur1" />
                <feGaussianBlur stdDeviation="2" result="blur2" />
                <feMerge>
                  <feMergeNode in="blur1" />
                  <feMergeNode in="blur2" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="glow-magenta" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="6" result="blur1" />
                <feGaussianBlur stdDeviation="2" result="blur2" />
                <feMerge>
                  <feMergeNode in="blur1" />
                  <feMergeNode in="blur2" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="glow-orange" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="5" result="blur1" />
                <feGaussianBlur stdDeviation="1.5" result="blur2" />
                <feMerge>
                  <feMergeNode in="blur1" />
                  <feMergeNode in="blur2" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="glow-emerald" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="5" result="blur1" />
                <feGaussianBlur stdDeviation="2" result="blur2" />
                <feMerge>
                  <feMergeNode in="blur1" />
                  <feMergeNode in="blur2" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Simple subtle generic glow */}
              <filter id="subtle-glow" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Dynamic Post-Processing Bloom Glow Filter */}
              <filter id="bloom-glow-filter" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur in="SourceGraphic" stdDeviation={bloomIntensity * 0.7} result="blur_core" />
                <feGaussianBlur in="SourceGraphic" stdDeviation={bloomIntensity * 1.8} result="blur_mid" />
                <feGaussianBlur in="SourceGraphic" stdDeviation={bloomIntensity * 4.5} result="blur_wide" />
                <feColorMatrix type="matrix" values="
                  1.2 0   0   0   0
                  0   1.2 0   0   0
                  0   0   1.3 0   0
                  0   0   0   1.8 0" in="blur_mid" result="boosted_mid" />
                <feMerge>
                  <feMergeNode in="blur_wide" />
                  <feMergeNode in="boosted_mid" />
                  <feMergeNode in="blur_core" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Volumetric Hologram Projection Beam Gradient */}
              <linearGradient id="projection-grad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#00f3ff" stopOpacity={0.25} />
                <stop offset="40%" stopColor="#0066ff" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#000000" stopOpacity={0} />
              </linearGradient>

              {/* Deep Ocean Highly Realistic Satellite Depth Gradient */}
              <radialGradient id="ocean-glow" cx="38%" cy="38%" r="62%">
                <stop offset="0%" stopColor="#1a5dbf" stopOpacity={1.0} /> {/* Shallow tropical oceans */}
                <stop offset="35%" stopColor="#0d3c8c" stopOpacity={1.0} /> {/* Mid depth oceans */}
                <stop offset="70%" stopColor="#041d4c" stopOpacity={1.0} /> {/* Deep marine trenches */}
                <stop offset="100%" stopColor="#01071d" stopOpacity={1.0} /> {/* Extreme abyssal shadow */}
              </radialGradient>

              {/* Organic satellite land texture noise */}
              <filter id="land-texture" x="-10%" y="-10%" width="120%" height="120%">
                <feTurbulence type="fractalNoise" baseFrequency="0.14" numOctaves="4" result="noise" />
                <feColorMatrix type="matrix" values="
                  1 0 0 0 0
                  0 1 0 0 0
                  0 0 1 0 0
                  0 0 0 0.14 0" in="noise" result="lowOpacityNoise" />
                <feComposite operator="arithmetic" k1="0" k2="1" k3="0.32" k4="0" in="SourceGraphic" in2="lowOpacityNoise" result="composite" />
                <feMerge>
                  <feMergeNode in="composite" />
                </feMerge>
              </filter>

              {/* Thin blue atmospheric halo gradient */}
              <radialGradient id="atmosphere-halo-grad" cx="50%" cy="50%" r="50%">
                <stop offset="82%" stopColor="#00d0ff" stopOpacity={0} />
                <stop offset="87%" stopColor="#0090ff" stopOpacity={0.18} />
                <stop offset="93%" stopColor="#0044ff" stopOpacity={0.48} />
                <stop offset="97%" stopColor="#00e1ff" stopOpacity={0.82} />
                <stop offset="100%" stopColor="#ffffff" stopOpacity={1.0} />
              </radialGradient>

              {/* Procedural noise generator for cloud textures */}
              <filter id="cloud-noise" x="-35%" y="-35%" width="170%" height="170%">
                <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise" />
                <feColorMatrix type="matrix" values="
                  1 0 0 0 1
                  0 1 0 0 1
                  0 0 1 0 1
                  0 0 0 0.85 0" in="noise" result="colored" />
                <feComposite operator="in" in="colored" in2="SourceGraphic" result="composite" />
                <feGaussianBlur stdDeviation="2.0" in="composite" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Three-dimensional fluffy cloud gradient */}
              <radialGradient id="cloud-grad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={0.92} />
                <stop offset="50%" stopColor="#f0f9ff" stopOpacity={0.7} />
                <stop offset="85%" stopColor="#bae6fd" stopOpacity={0.32} />
                <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
              </radialGradient>
            </defs>

            {/* Volumetric Hologram Projection Beam */}
            {showProjectionBeam && (
              <polygon
                points={`
                  ${dimensions.width / 2 - scale * 0.4},${dimensions.height / 2 + scale * 0.95} 
                  ${dimensions.width / 2 + scale * 0.4},${dimensions.height / 2 + scale * 0.95} 
                  ${dimensions.width / 2 + scale * 1.05},${dimensions.height / 2} 
                  ${dimensions.width / 2 - scale * 1.05},${dimensions.height / 2}
                `}
                fill="url(#projection-grad)"
                className="pointer-events-none"
                style={{ mixBlendMode: 'screen' }}
              />
            )}

            {/* Glowing pedestal base reflection rings (saucer at the bottom of the globe) */}
            <g transform={`translate(${dimensions.width / 2}, ${dimensions.height / 2 + scale * 0.95})`} className="pointer-events-none">
              {/* Deep blue backplate shadow */}
              <ellipse
                cx={0}
                cy={12}
                rx={scale * 1.4}
                ry={28}
                fill="#001a33"
                fillOpacity={0.25}
                filter="url(#subtle-glow)"
              />

              {/* Solid metallic structural rim */}
              <ellipse
                cx={0}
                cy={6}
                rx={scale * 1.35}
                ry={26}
                fill="none"
                stroke="#0b1b36"
                strokeWidth={5}
              />

              {/* Outer neon green/cyan pedestal ring */}
              <ellipse
                cx={0}
                cy={0}
                rx={scale * 1.25}
                ry={22}
                fill="none"
                stroke="url(#grad-asia)"
                strokeWidth={2}
                filter="url(#glow-cyan)"
                className="opacity-60 animate-pulse"
              />

              {/* High-tech radial subdivision tick marks */}
              {Array.from({ length: 24 }).map((_, i) => {
                const angle = (i * 360) / 24;
                const x1 = scale * 1.25 * Math.cos((angle * Math.PI) / 180);
                const y1 = 22 * Math.sin((angle * Math.PI) / 180);
                const x2 = scale * 1.18 * Math.cos((angle * Math.PI) / 180);
                const y2 = 21 * Math.sin((angle * Math.PI) / 180);
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#00ffff"
                    strokeWidth={1.5}
                    strokeOpacity={0.5}
                  />
                );
              })}

              {/* Mid violet neon pedestal ring */}
              <ellipse
                cx={0}
                cy={3}
                rx={scale * 1.05}
                ry={15}
                fill="none"
                stroke="url(#grad-europe)"
                strokeWidth={2.5}
                filter="url(#glow-magenta)"
                className="opacity-70"
              />

              {/* Inner glowing laser emitter core */}
              <ellipse
                cx={0}
                cy={0}
                rx={scale * 0.8}
                ry={10}
                fill="#010612"
                stroke="#00f3ff"
                strokeWidth={1.8}
                filter="url(#subtle-glow)"
              />

              {/* High-intensity central projector node */}
              <circle
                cx={0}
                cy={0}
                r={12}
                fill="#ffffff"
                filter="url(#glow-cyan)"
                className="animate-pulse"
                style={{ animationDuration: '2s' }}
              />
              <circle
                cx={0}
                cy={0}
                r={6}
                fill="#00ffcc"
                filter="url(#glow-cyan)"
              />
            </g>

            {/* Real-time Glowing Additive Atmospheric Halo (Thin Blue Line) */}
            {atmosphereEnabled && (
              <g className="pointer-events-none" style={{ mixBlendMode: 'screen' }}>
                {/* 1. Ultra-thin high-intensity atmospheric limb */}
                <circle
                  cx={dimensions.width / 2}
                  cy={dimensions.height / 2}
                  r={scale + 1.2}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={1.0}
                  strokeOpacity={0.85 * (atmosphereGlow / 1.0)}
                  filter="url(#subtle-glow)"
                />
                
                {/* 2. Outer glowing atmospheric scattering ring */}
                <circle
                  cx={dimensions.width / 2}
                  cy={dimensions.height / 2}
                  r={scale * 1.025}
                  fill="url(#atmosphere-halo-grad)"
                  className="transition-all duration-300"
                  style={{ opacity: 0.9 * (atmosphereGlow / 1.0) }}
                />

                {/* 3. Outer corona scatter layer */}
                <circle
                  cx={dimensions.width / 2}
                  cy={dimensions.height / 2}
                  r={scale * 1.04}
                  fill="none"
                  stroke="#0090ff"
                  strokeWidth={2.5}
                  strokeOpacity={0.25 * (atmosphereGlow / 1.0)}
                  filter="url(#subtle-glow)"
                />
              </g>
            )}

            {/* Cybernetic Rotating Orbit Ring 1 (Cyan) */}
            {cyberHudEnabled && (
              <g transform={`translate(${dimensions.width / 2}, ${dimensions.height / 2}) rotate(-18)`} className="pointer-events-none">
                <ellipse
                  cx={0}
                  cy={0}
                  rx={scale * 1.3}
                  ry={scale * 0.4}
                  fill="none"
                  stroke="#00ffcc"
                  strokeWidth={1.2}
                  className="opacity-30"
                  strokeDashoffset={orbitOffset}
                />
                {/* Small orbit node/satellite */}
                <circle
                  cx={scale * 1.3 * Math.cos((orbitOffset * Math.PI) / 180)}
                  cy={scale * 0.4 * Math.sin((orbitOffset * Math.PI) / 180)}
                  r={4}
                  fill="#00ffcc"
                  filter="url(#glow-cyan)"
                />
              </g>
            )}

            {/* Cybernetic Rotating Orbit Ring 2 (Magenta/Purple) */}
            {cyberHudEnabled && (
              <g transform={`translate(${dimensions.width / 2}, ${dimensions.height / 2}) rotate(25)`} className="pointer-events-none">
                <ellipse
                  cx={0}
                  cy={0}
                  rx={scale * 1.22}
                  ry={scale * 0.35}
                  fill="none"
                  stroke="#ff00ff"
                  strokeWidth={0.8}
                  className="opacity-25"
                  strokeDashoffset={-orbitOffset * 1.3}
                />
                {/* Second orbit node */}
                <circle
                  cx={scale * 1.22 * Math.cos(((-orbitOffset * 1.1) * Math.PI) / 180)}
                  cy={scale * 0.35 * Math.sin(((-orbitOffset * 1.1) * Math.PI) / 180)}
                  r={3}
                  fill="#ff00ff"
                  filter="url(#glow-magenta)"
                />
              </g>
            )}

            {/* Ocean sphere background */}
            <circle
              cx={dimensions.width / 2}
              cy={dimensions.height / 2}
              r={scale}
              fill="url(#ocean-glow)"
              className="stroke-cyan-500/10"
              strokeWidth={1.5}
            />

            {/* Deep space latitude / longitude grid lines (cyan/purple graticule) */}
            {cyberHudEnabled && (
              <path
                d={pathGenerator(graticule) || undefined}
                fill="none"
                stroke="url(#grad-europe)"
                strokeWidth={0.5}
                className="opacity-20 pointer-events-none"
              />
            )}

            {/* Countries and Continents with particle and mesh layers */}
            {worldData?.features?.map((feature: any, index: number) => {
              const countryName = feature.properties?.name;
              const continentOfCountry = COUNTRY_TO_CONTINENT[countryName] || "Asia";
              const isContinentHovered = hoveredContinent === continentOfCountry;
              const isContinentSelected = selectedContinent === continentOfCountry;

              const pathD = pathGenerator(feature);
              if (!pathD) return null;

              // Color choices based on state
              const theme = CYBER_CONTINENT_THEME[continentOfCountry];
              
              const fillOpacity = cyberHudEnabled
                ? (isContinentSelected ? 0.7 : isContinentHovered ? 0.5 : 0.32)
                : (isContinentSelected ? 0.95 : isContinentHovered ? 0.90 : 0.85);
              
              const strokeWidth = cyberHudEnabled
                ? (isContinentSelected ? 1.8 : isContinentHovered ? 1.2 : 0.6)
                : (isContinentSelected ? 1.2 : isContinentHovered ? 0.8 : 0.25);
              
              const strokeColor = cyberHudEnabled
                ? theme.strokeColor
                : (isContinentSelected ? "#00f3ff" : isContinentHovered ? "rgba(255, 215, 0, 0.6)" : "rgba(10, 40, 10, 0.12)");
              
              const filterVal = cyberHudEnabled
                ? (isContinentSelected || isContinentHovered ? theme.glowFilter : "none")
                : "none";
              
              const landFilter = cyberHudEnabled ? "none" : "url(#land-texture)";

              return (
                <g key={index}>
                  {/* Layer 1: Solid or semi-transparent gradient fill representing land mass */}
                  <path
                    d={pathD}
                    fill={theme.fillGrad}
                    fillOpacity={fillOpacity}
                    filter={landFilter}
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredContinent(continentOfCountry)}
                    onMouseLeave={() => setHoveredContinent(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectContinent(isContinentSelected ? null : continentOfCountry);
                    }}
                  />

                  {/* Layer 2: Boundary stroke with optional glowing filter */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    className="pointer-events-none transition-all duration-200"
                    filter={filterVal}
                    strokeOpacity={isContinentSelected ? 1 : cyberHudEnabled ? 0.75 : 0.4}
                  />

                  {/* Layer 3: Stunning digital starry particles / boundary glow */}
                  {cyberHudEnabled && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke={theme.strokeColor}
                      strokeWidth={1}
                      className="pointer-events-none transition-all duration-200 opacity-40"
                    />
                  )}
                </g>
              );
            })}

            {/* --- PROCEDURAL ROTATING CLOUD LAYER --- */}
            {cloudsEnabled && (
              <g className="pointer-events-none" style={{ mixBlendMode: 'screen' }}>
                {PROCEDURAL_CLOUDS.map((cloud, idx) => {
                  // Compute dynamic radius with low-frequency pulsing noise
                  const pulseAmount = Math.sin((utcDate.getTime() * 0.0008) * cloud.pulseSpeed + cloud.phase);
                  const dynamicRadius = Math.max(4, cloud.radius + pulseAmount * 2.2);
                  
                  // Construct geoCircle
                  let cloudGeo: any = null;
                  try {
                    cloudGeo = d3.geoCircle()
                      .center(cloud.center)
                      .radius(dynamicRadius)();
                  } catch (e) {
                    return null;
                  }

                  const pathD = cloudPathGenerator(cloudGeo);
                  if (!pathD) return null;

                  // Compute dynamic opacity with pulsing
                  const dynamicOpacity = Math.max(0.15, Math.min(0.85, (cloud.opacity + pulseAmount * 0.08) * cloudOpacity));

                  return (
                    <path
                      key={`cloud-${idx}`}
                      d={pathD}
                      fill="url(#cloud-grad)"
                      fillOpacity={dynamicOpacity}
                      filter="url(#cloud-noise)"
                      className="transition-all duration-300"
                    />
                  );
                })}
              </g>
            )}

            {/* --- DAY/NIGHT SHADER TERMINATOR LAYERS --- */}
            {nightLayers && (
              <g className="pointer-events-none">
                {/* 1. Outer Twilight Shading (Soft transition) */}
                {pathGenerator(nightLayers.outer) && (
                  <path
                    d={pathGenerator(nightLayers.outer) || undefined}
                    fill="#020512"
                    fillOpacity={0.16}
                    className="transition-all duration-300"
                  />
                )}

                {/* 2. Mid Twilight Shading */}
                {pathGenerator(nightLayers.mid) && (
                  <path
                    d={pathGenerator(nightLayers.mid) || undefined}
                    fill="#010309"
                    fillOpacity={0.25}
                    className="transition-all duration-300"
                  />
                )}

                {/* 3. Core Night Shading */}
                {pathGenerator(nightLayers.core) && (
                  <path
                    d={pathGenerator(nightLayers.core) || undefined}
                    fill="#000105"
                    fillOpacity={0.45}
                    className="transition-all duration-300"
                  />
                )}

                {/* 4. Golden Atmosphere Terminator Line (glowing sunset/sunrise edge) */}
                {pathGenerator(nightLayers.terminator) && (
                  <path
                    d={pathGenerator(nightLayers.terminator) || undefined}
                    fill="none"
                    stroke="#f97316"
                    strokeWidth={1.5}
                    strokeOpacity={0.4}
                    filter="url(#subtle-glow)"
                    className="transition-all duration-300"
                  />
                )}
              </g>
            )}

            {/* --- REAL-TIME NIGHT-SIDE CITY LIGHTS WITH BLOOM GLOW --- */}
            {CITY_LIGHTS.map((city, idx) => {
              const isVisible = isPointVisible(city.lng, city.lat);
              if (!isVisible) return null;

              const projected = projection([city.lng, city.lat]);
              if (!projected) return null;
              const [x, y] = projected;

              // Check if city is on the night side (inside the outer twilight shadow)
              let isInShadow = true;
              if (nightLayers?.outer) {
                try {
                  isInShadow = d3.geoContains(nightLayers.outer, [city.lng, city.lat]);
                } catch (e) {
                  isInShadow = true;
                }
              }

              // Do not show city lights if they are in full daylight
              if (!isInShadow) return null;

              return (
                <g key={`city-${idx}`} className="pointer-events-none">
                  {/* Dynamic Bloom Glow Core */}
                  <circle
                    cx={x}
                    cy={y}
                    r={bloomEnabled ? 4.5 : 2.0}
                    fill="#ffea7a"
                    fillOpacity={0.75}
                    filter={bloomEnabled ? "url(#bloom-glow-filter)" : "url(#subtle-glow)"}
                  />
                  {/* Pinpoint LED Center */}
                  <circle
                    cx={x}
                    cy={y}
                    r={1}
                    fill="#ffffff"
                    fillOpacity={0.95}
                  />
                </g>
              );
            })}

            {/* Ambient shading layer for 3D sphere spherical simulation */}
            <circle
              cx={dimensions.width / 2}
              cy={dimensions.height / 2}
              r={scale}
              className="pointer-events-none"
              fill="url(#globe-shading)"
            />

            {/* Glowing neon data dots representing locations */}
            {locations.map((loc) => {
              const isVisible = isPointVisible(loc.lng, loc.lat);
              if (!isVisible) return null;

              const projected = projection([loc.lng, loc.lat]);
              if (!projected) return null;
              const [x, y] = projected;

              const isLocationOfSelectedContinent = selectedContinent === loc.continent;

              return (
                <g 
                  key={loc.id} 
                  className="cursor-pointer pointer-events-auto group"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedLocation(loc);
                  }}
                >
                  {/* Concentric expanding telemetry radar ring */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isLocationOfSelectedContinent ? 11 : 8}
                    fill="none"
                    stroke="#00ffcc"
                    strokeWidth={1.2}
                    className="animate-ping"
                    style={{ animationDuration: '2.5s' }}
                  />

                  {/* Glow shadow */}
                  <circle
                    cx={x}
                    cy={y}
                    r={5}
                    fill="#00ffcc"
                    filter="url(#glow-cyan)"
                    className="opacity-70 group-hover:opacity-100 transition-opacity"
                  />

                  {/* Central high intensity physical node */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isLocationOfSelectedContinent ? 4 : 3}
                    fill="#ffffff"
                    stroke="#00ffff"
                    strokeWidth={1.5}
                    className="group-hover:scale-125 transition-transform"
                  />
                </g>
              );
            })}
          </svg>

          {/* Current selected/hovered continent tooltip card styled with high-tech HUD format */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-md px-5 py-2.5 rounded-xl border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)] flex items-center gap-3 pointer-events-none max-w-[90%] truncate">
            <Cpu className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-pulse" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">
              {hoveredContinent || selectedContinent ? (
                <>
                  <span className="text-emerald-500/60">ACTIVE_SECTOR:</span>{' '}
                  <span className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
                    {hoveredContinent || selectedContinent}
                  </span>
                </>
              ) : (
                <span className="text-emerald-400/70">SPIN & CHOOSE TARGET NEURAL CONTINENT</span>
              )}
            </span>
          </div>

          {/* Custom Informational Info Window Popups for Landmark Markers */}
          <AnimatePresence>
            {selectedLocation && (
              <motion.div
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                transition={{ type: 'spring', damping: 20 }}
                onPointerDown={(e) => e.stopPropagation()} // Stop propagation so dragging is not activated on card
                className="absolute top-6 right-6 z-30 bg-black/95 backdrop-blur-xl p-4 rounded-2xl border border-cyan-400/40 shadow-[0_0_25px_rgba(6,182,212,0.3)] max-w-[280px] md:max-w-[320px] text-white select-text pointer-events-auto"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-cyan-500/30 pb-2.5 mb-2.5">
                  <div>
                    <span className="text-[8px] font-mono font-black tracking-widest text-cyan-400 uppercase block">LANDMARK_LOCK_ENGAGED</span>
                    <h3 className="font-serif italic text-lg tracking-tight text-white mt-1 leading-snug">{selectedLocation.name}</h3>
                    <p className="text-[9px] font-mono text-cyan-400/70 mt-0.5 uppercase tracking-wide">
                      {selectedLocation.state ? `${selectedLocation.state}, ` : ''}{selectedLocation.country}
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedLocation(null)}
                    className="text-cyan-400 hover:text-white cursor-pointer p-1 rounded hover:bg-cyan-500/20 transition-colors shrink-0"
                    title="Close Lock"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Image Preview */}
                <div className="relative h-28 w-full overflow-hidden rounded-xl mb-3 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                  <img 
                    src={selectedLocation.imageUrl} 
                    alt={selectedLocation.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="text-[8px] font-mono text-cyan-400 font-bold tracking-tight">
                      LAT: {selectedLocation.lat.toFixed(4)} | LNG: {selectedLocation.lng.toFixed(4)}
                    </span>
                  </div>
                </div>

                {/* Historical Summary */}
                <p className="text-[10px] leading-relaxed text-cyan-100/90 font-mono mb-3.5 max-h-24 overflow-y-auto pr-1 select-text scrollbar-thin">
                  {selectedLocation.description}
                </p>

                {/* Experience Deck Launcher Button */}
                <div className="pt-2 border-t border-cyan-500/30">
                  <button
                    onClick={() => {
                      if (onSelectLocation) {
                        onSelectLocation(selectedLocation);
                      }
                    }}
                    className="w-full bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-300 py-2 px-3 rounded-xl border border-cyan-400/50 text-[9px] font-mono font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer transition-all hover:shadow-[0_0_12px_rgba(6,182,212,0.35)]"
                  >
                    <Compass className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '8s' }} />
                    Open Experience Deck
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Futuristic telemetry sidebar data strips simulating visual style in the image */}
      <div className="w-full flex items-center justify-between px-6 pb-2 pt-1 border-t border-emerald-500/10 text-[8px] font-mono text-emerald-500/40 pointer-events-none select-none uppercase tracking-wider">
        <div className="flex items-center gap-2">
          <Activity className="w-3 h-3 text-emerald-500/30 shrink-0" />
          <span>SYS_GRID: RESOLUTION_OK</span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-3 h-3 text-emerald-500/30 shrink-0" />
          <span>NEURAL_DATA_STREAM: SECURE</span>
        </div>
      </div>
    </div>
  );
}
