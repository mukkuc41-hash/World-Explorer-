import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, RefreshCw, Compass, MapPin, Target, Activity, Zap } from 'lucide-react';

export interface GlobeLocation {
  id: string;
  title: string;
  lat: number;
  lng: number;
  zoom: number;
  region: string;
  category: string;
  description: string;
  imageUrl?: string;
}

interface ImmersiveGlobeCanvasProps {
  explorerState: {
    lat: number;
    lng: number;
    zoom: number;
    activeLandmarkId: string | null;
  };
  onLocationSelect: (location: GlobeLocation) => void;
  landmarks: GlobeLocation[];
}

export default function ImmersiveGlobeCanvas({
  explorerState,
  onLocationSelect,
  landmarks
}: ImmersiveGlobeCanvasProps) {
  const [worldData, setWorldData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rotation, setRotation] = useState<[number, number]>([-75, -25]); // Longitude, Latitude
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 440, height: 440 });

  // Dynamically observe component size to handle responsive layout sizing
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        const size = Math.min(width, height, 540) || 400;
        setDimensions({ width: size, height: size });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Fetch standard global land boundaries for vector map rendering
  useEffect(() => {
    let isMounted = true;
    fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
      .then((res) => {
        if (!res.ok) throw new Error('Globe geometry asset unreachable');
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setWorldData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load global map layers:', err);
        setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Soft background auto-rotation during idle state
  useEffect(() => {
    if (!isAutoRotating || isAnimating) return;

    let animFrame: number;
    let lastTime = performance.now();

    const stepRotation = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;
      // 1.8 degrees per second spin speed
      const step = 1.8 * (delta / 1000);
      setRotation((prev) => [(prev[0] + step) % 360, prev[1]]);
      animFrame = requestAnimationFrame(stepRotation);
    };

    animFrame = requestAnimationFrame(stepRotation);
    return () => cancelAnimationFrame(animFrame);
  }, [isAutoRotating, isAnimating]);

  // Master synchronization trigger: smoothly pan/orbit globe rotation to coordinates when state updates
  useEffect(() => {
    const targetLng = -explorerState.lng;
    const targetLat = -explorerState.lat;

    // Guard to prevent redundant micro-movements
    const diffLng = Math.abs((((targetLng - rotation[0] + 180) % 360) + 360) % 360 - 180);
    const diffLat = Math.abs(targetLat - rotation[1]);
    if (diffLng < 0.1 && diffLat < 0.1) return;

    setIsAnimating(true);
    setIsAutoRotating(false);

    const duration = 1800; // Fluid 1.8s flyover interpolation
    const startTime = performance.now();
    const startLng = rotation[0];
    const startLat = rotation[1];

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    let frameId: number;

    const animateGlobe = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);

      // Shortest arc calculation for longitude
      let currentDiffLng = targetLng - startLng;
      currentDiffLng = ((((currentDiffLng + 180) % 360) + 360) % 360) - 180;

      const currentLng = startLng + currentDiffLng * eased;
      const currentLat = startLat + (targetLat - startLat) * eased;

      setRotation([currentLng, currentLat]);

      if (progress < 1) {
        frameId = requestAnimationFrame(animateGlobe);
      } else {
        setIsAnimating(false);
        // Retain focused target lock before resuming idle spin
        const resumeTimer = setTimeout(() => {
          setIsAutoRotating(true);
        }, 15000);
        return () => clearTimeout(resumeTimer);
      }
    };

    frameId = requestAnimationFrame(animateGlobe);
    return () => cancelAnimationFrame(frameId);
  }, [explorerState.lat, explorerState.lng]);

  // User manual drag interface controls
  const dragTracker = useRef({ isDragging: false, startX: 0, startY: 0, startRotation: [0, 0] });

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.preventDefault();
    setIsAutoRotating(false);
    dragTracker.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startRotation: [...rotation]
    };
    (e.currentTarget as any).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragTracker.current.isDragging) return;
    const dx = e.clientX - dragTracker.current.startX;
    const dy = e.clientY - dragTracker.current.startY;
    
    const sensitivity = 0.25;
    const newLng = (dragTracker.current.startRotation[0] + dx * sensitivity) % 360;
    const newLat = Math.max(-65, Math.min(65, dragTracker.current.startRotation[1] - dy * sensitivity));
    
    setRotation([newLng, newLat]);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    dragTracker.current.isDragging = false;
    (e.currentTarget as any).releasePointerCapture(e.pointerId);
  };

  // Memoized D3 projections for performance
  const r = dimensions.width / 2 - 20;
  const projection = useMemo(() => {
    return d3.geoOrthographic()
      .scale(r)
      .translate([dimensions.width / 2, dimensions.height / 2])
      .rotate(rotation)
      .clipAngle(90);
  }, [dimensions, rotation, r]);

  const pathGenerator = useMemo(() => {
    return d3.geoPath().projection(projection);
  }, [projection]);

  const graticuleLines = useMemo(() => d3.geoGraticule()(), []);

  // Compute active landmarks positioned on the visible hemisphere
  const activeMarkPoints = useMemo(() => {
    return landmarks.map((loc) => {
      const coordinates: [number, number] = [loc.lng, loc.lat];
      const projected = projection(coordinates);
      const center = projection.invert([dimensions.width / 2, dimensions.height / 2]);
      
      if (!center) return { ...loc, isVisible: false, x: 0, y: 0 };
      
      const radDistance = d3.geoDistance(coordinates, center);
      const isVisibleOnFront = radDistance < Math.PI / 2;

      return {
        ...loc,
        isVisible: isVisibleOnFront && projected !== null,
        x: projected ? projected[0] : 0,
        y: projected ? projected[1] : 0
      };
    });
  }, [landmarks, projection, dimensions]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-stone-950/95 border border-stone-800/80 p-5 rounded-[32px] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
      
      {/* Space Hologram Navigation HUD HUD overlay */}
      <div className="absolute top-5 left-5 flex flex-col gap-1 font-mono text-[10px] text-cyan-400 z-10 pointer-events-none">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="font-bold tracking-widest uppercase">3D_ORBIT_TELEMETRY</span>
        </div>
        <div className="text-stone-400">LAT: <span className="text-white font-bold">{(-rotation[1]).toFixed(4)}&deg;</span></div>
        <div className="text-stone-400">LNG: <span className="text-white font-bold">{(-rotation[0]).toFixed(4)}&deg;</span></div>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[8px] text-emerald-400/90 tracking-wider">SYNC STATUS: ACTIVE</span>
        </div>
      </div>

      <div className="absolute top-5 right-5 z-10">
        <button
          onClick={() => setIsAutoRotating(!isAutoRotating)}
          className={`p-2.5 rounded-xl border font-mono text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
            isAutoRotating 
              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-400/30' 
              : 'bg-stone-900/80 text-stone-400 border-stone-800'
          }`}
          title="Toggle Auto Orbital Rotation"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isAutoRotating ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }} />
          <span>{isAutoRotating ? 'Auto_Spin_On' : 'Static'}</span>
        </button>
      </div>

      {/* Main interactive SVG projection viewport */}
      <div ref={containerRef} className="w-full flex-1 flex items-center justify-center cursor-grab active:cursor-grabbing relative">
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-7 h-7 text-cyan-400 animate-spin" />
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">Constructing Mesh...</span>
          </div>
        ) : (
          <svg
            width={dimensions.width}
            height={dimensions.height}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="select-none overflow-visible touch-none"
          >
            <defs>
              {/* Futuristic Cyber-punk Globe styling radial fills */}
              <radialGradient id="cyber-core" cx="50%" cy="50%" r="50%">
                <stop offset="65%" stopColor="#040b15" stopOpacity={0.95} />
                <stop offset="85%" stopColor="#0e2840" stopOpacity={0.7} />
                <stop offset="100%" stopColor="#00f3ff" stopOpacity={0.4} />
              </radialGradient>

              <filter id="holographic-glare" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Glowing neon background ring */}
            <circle
              cx={dimensions.width / 2}
              cy={dimensions.height / 2}
              r={r + 6}
              fill="none"
              stroke="#00ffff"
              strokeWidth={0.8}
              strokeDasharray="3,6"
              className="opacity-30"
            />

            {/* Simulated atmospheric background glow */}
            <circle
              cx={dimensions.width / 2}
              cy={dimensions.height / 2}
              r={r}
              fill="url(#cyber-core)"
            />

            {/* Longitudinal/Latitudinal Gridlines */}
            <path
              d={pathGenerator(graticuleLines) || ''}
              fill="none"
              stroke="#08f1ff"
              strokeWidth={0.3}
              className="opacity-20 pointer-events-none"
            />

            {/* Landmass Geometries */}
            {worldData && (
              <g className="landmasses pointer-events-none">
                {worldData.features.map((feature: any, i: number) => {
                  const path = pathGenerator(feature);
                  if (!path) return null;

                  const isFeatureSelected = explorerState.activeLandmarkId && 
                    feature.properties?.name === landmarks.find(l => l.id === explorerState.activeLandmarkId)?.title;

                  return (
                    <path
                      key={`global-land-${i}`}
                      d={path}
                      fill={isFeatureSelected ? 'rgba(6, 182, 212, 0.4)' : 'rgba(12, 53, 84, 0.25)'}
                      stroke="#0af"
                      strokeWidth={isFeatureSelected ? 1.0 : 0.4}
                      opacity={0.8}
                      className="transition-all duration-300"
                    />
                  );
                })}
              </g>
            )}

            {/* Render interactive markers on visible front coordinates */}
            <g className="beacons">
              {activeMarkPoints.map((loc) => {
                if (!loc.isVisible) return null;

                const isBeaconActive = explorerState.activeLandmarkId === loc.id;

                return (
                  <g
                    key={`beacon-${loc.id}`}
                    transform={`translate(${loc.x}, ${loc.y})`}
                    className="cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLocationSelect(loc);
                    }}
                  >
                    {/* Concentric radar beacon pulses */}
                    <circle
                      cx={0}
                      cy={0}
                      r={isBeaconActive ? 20 : 10}
                      fill="none"
                      stroke={isBeaconActive ? '#00ffff' : '#00ffcc'}
                      strokeWidth={1}
                      className="animate-ping opacity-60"
                      style={{ animationDuration: isBeaconActive ? '1.5s' : '3s' }}
                    />

                    {/* Outer core node */}
                    <circle
                      cx={0}
                      cy={0}
                      r={isBeaconActive ? 6 : 4.5}
                      fill={isBeaconActive ? '#ffffff' : '#08f1ff'}
                      stroke={isBeaconActive ? '#00ffcc' : '#ffffff'}
                      strokeWidth={1.2}
                      filter="url(#holographic-glare)"
                    />

                    {/* Central core energy pixel */}
                    <circle
                      cx={0}
                      cy={0}
                      r={1.5}
                      fill="#ffffff"
                    />

                    {/* Hover holographic LCD label tooltip */}
                    <g className={`pointer-events-none transition-all duration-300 ${
                      isBeaconActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
                    }`}>
                      <rect
                        x={12}
                        y={-20}
                        width={140}
                        height={34}
                        rx={8}
                        fill="rgba(4, 8, 16, 0.95)"
                        stroke="#00f3ff"
                        strokeWidth={1.0}
                        className="shadow-2xl"
                      />
                      <text
                        x={20}
                        y={-8}
                        fill="#ffffff"
                        fontSize={8.5}
                        fontFamily="serif"
                        fontStyle="italic"
                        fontWeight="bold"
                      >
                        {loc.title.length > 20 ? `${loc.title.substring(0, 18)}...` : loc.title}
                      </text>
                      <text
                        x={20}
                        y={4}
                        fill="#00ffff"
                        fontSize={6.5}
                        fontFamily="monospace"
                        letterSpacing={0.4}
                      >
                        {loc.lat.toFixed(3)}&deg;N | {loc.lng.toFixed(3)}&deg;E
                      </text>
                      <line
                        x1={0}
                        y1={0}
                        x2={12}
                        y2={-8}
                        stroke="#00ffff"
                        strokeWidth={0.8}
                      />
                    </g>
                  </g>
                );
              })}
            </g>
          </svg>
        )}
      </div>

      {/* Mini state lock summary details HUD */}
      <div className="w-full mt-3 py-3 px-4 bg-stone-900/60 border border-stone-800 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
            <Target className="w-4 h-4 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <span className="text-[7px] font-mono text-cyan-400 uppercase tracking-widest block font-bold">ORBITAL FOCUS</span>
            <span className="text-xs font-serif italic text-white truncate max-w-[180px] block font-bold leading-tight">{landmarks.find(l => l.id === explorerState.activeLandmarkId)?.title || 'Global Sweep'}</span>
          </div>
        </div>
        <div className="font-mono text-[8px] text-stone-500 text-right uppercase">
          Altitude: Orbit (520km)<br />
          Telemetry: Secured
        </div>
      </div>

    </div>
  );
}
