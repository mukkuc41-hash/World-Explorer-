import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, RefreshCw, Compass, MapPin, ZoomIn, ZoomOut, Activity, Target } from 'lucide-react';

export interface GlobeLocation {
  lat: number;
  lng: number;
  title: string;
  description: string;
  zoom?: number;
}

interface ImmersiveGlobeProps {
  activeLocation: GlobeLocation | null;
  onLocationSelect: (location: GlobeLocation) => void;
  landmarks: GlobeLocation[];
}

export default function ImmersiveGlobe({
  activeLocation,
  onLocationSelect,
  landmarks
}: ImmersiveGlobeProps) {
  const [worldData, setWorldData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rotation, setRotation] = useState<[number, number]>([-75, -25]); // Lng, Lat
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [isAnimatingToLocation, setIsAnimatingToLocation] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 420, height: 420 });

  // Resize handler
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        const size = Math.min(width, height, 500) || 400;
        setDimensions({ width: size, height: size });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Fetch World GeoJSON data
  useEffect(() => {
    let active = true;
    fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load world geometry');
        return res.json();
      })
      .then((data) => {
        if (active) {
          setWorldData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching global map dataset:', err);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Idle Auto-Rotation
  useEffect(() => {
    if (!isAutoRotating || isAnimatingToLocation) return;

    let animFrame: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;
      // Rotate 1.5 degrees per second
      const step = 1.5 * (delta / 1000);
      setRotation((prev) => [(prev[0] + step) % 360, prev[1]]);
      animFrame = requestAnimationFrame(tick);
    };

    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, [isAutoRotating, isAnimatingToLocation]);

  // Smooth orbital focus camera animation when active location changes
  useEffect(() => {
    if (!activeLocation) return;

    // Lng is mapped to -lng, Lat to -lat for the orthographic center rotation
    const targetLng = -activeLocation.lng;
    const targetLat = -activeLocation.lat;

    setIsAnimatingToLocation(true);
    setIsAutoRotating(false);

    const duration = 1600; // 1.6 seconds smooth fly-over
    const startTime = performance.now();
    const startLng = rotation[0];
    const startLat = rotation[1];

    const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

    let frameId: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(progress);

      // Interpolate with shortest angle path for longitude
      let diffLng = targetLng - startLng;
      // Normalize angle diff to [-180, 180] for shortest-path rotation
      diffLng = ((((diffLng + 180) % 360) + 360) % 360) - 180;

      const currentLng = startLng + diffLng * eased;
      const currentLat = startLat + (targetLat - startLat) * eased;

      setRotation([currentLng, currentLat]);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        setIsAnimatingToLocation(false);
        // Pause briefly, then allow auto-rotation if desired
        setTimeout(() => {
          setIsAutoRotating(true);
        }, 12000); // Wait 12s of static lock before continuing slow spin
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [activeLocation]);

  // Mouse/Touch Drag controls to rotate manually
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, startRotation: [0, 0] });

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.preventDefault();
    setIsAutoRotating(false);
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startRotation: [...rotation]
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current.isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    
    // Sensibility multiplier
    const sens = 0.25;
    const newLng = (dragRef.current.startRotation[0] + dx * sens) % 360;
    // Cap latitude to avoid flipping upside down
    const newLat = Math.max(-60, Math.min(60, dragRef.current.startRotation[1] - dy * sens));
    
    setRotation([newLng, newLat]);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    dragRef.current.isDragging = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    // Enable auto-rotate back after some delay
    const resumeTimer = setTimeout(() => {
      setIsAutoRotating(true);
    }, 15000);
    return () => clearTimeout(resumeTimer);
  };

  // D3 calculations memoized
  const r = dimensions.width / 2 - 15;
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

  const graticule = useMemo(() => {
    return d3.geoGraticule()();
  }, []);

  // Determine which landmarks are currently on the visible front hemisphere of the globe
  const visibleLandmarks = useMemo(() => {
    return landmarks.map((loc, idx) => {
      const coords: [number, number] = [loc.lng, loc.lat];
      const projected = projection(coords);
      
      // Calculate angular distance to the center of projection to determine front vs back hemisphere
      const center = projection.invert([dimensions.width / 2, dimensions.height / 2]);
      if (!center) return { ...loc, visible: false, x: 0, y: 0, index: idx };
      
      const distance = d3.geoDistance(coords, center);
      const isVisible = distance < Math.PI / 2; // less than 90 degrees away from center

      return {
        ...loc,
        visible: isVisible && projected !== null,
        x: projected ? projected[0] : 0,
        y: projected ? projected[1] : 0,
        index: idx
      };
    });
  }, [landmarks, projection, dimensions]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-black/40 dark:bg-stone-950/80 rounded-[32px] border border-cyan-500/10 p-4 overflow-hidden shadow-2xl backdrop-blur-xl">
      {/* Visual Telemetry Overlays */}
      <div className="absolute top-4 left-4 flex flex-col gap-1 font-mono text-[9px] text-cyan-400/80 z-10 pointer-events-none">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
          <span>CYBER_GLOBE_PROJECTION_v2.0</span>
        </div>
        <div>LAT: {(-rotation[1]).toFixed(4)}&deg; N</div>
        <div>LNG: {(-rotation[0]).toFixed(4)}&deg; E</div>
        <div className="flex items-center gap-1 mt-1 text-[8px] text-emerald-400">
          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
          <span>SYS_STATUS: {isAnimatingToLocation ? 'ORBITAL_LOCKING' : isAutoRotating ? 'SLOW_SCANNING' : 'USER_GUIDED'}</span>
        </div>
      </div>

      {/* Control Quick Toggle */}
      <div className="absolute bottom-4 right-4 flex gap-1.5 z-10">
        <button
          onClick={() => {
            setIsAutoRotating(!isAutoRotating);
          }}
          className={`p-2 rounded-xl border text-[9px] font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
            isAutoRotating 
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30' 
              : 'bg-stone-900/60 text-stone-400 border-stone-800'
          }`}
          title="Toggle Auto Rotation"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isAutoRotating ? 'animate-spin' : ''}`} style={{ animationDuration: '10s' }} />
          <span>{isAutoRotating ? 'Rotation On' : 'Rotation Off'}</span>
        </button>
      </div>

      {/* Main D3 Globe Drawing Area */}
      <div ref={containerRef} className="w-full flex-1 flex items-center justify-center cursor-grab active:cursor-grabbing relative">
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">LOADING GLOBAL GEOJSON...</span>
          </div>
        ) : (
          <svg
            id="holographic-immersive-globe"
            width={dimensions.width}
            height={dimensions.height}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="select-none overflow-visible touch-none"
          >
            <defs>
              {/* Globe Holographic Radials and Glow Filters */}
              <radialGradient id="globe-glow" cx="50%" cy="50%" r="50%">
                <stop offset="70%" stopColor="#020813" stopOpacity={0.85} />
                <stop offset="92%" stopColor="#0f3d5a" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#08f1ff" stopOpacity={0.35} />
              </radialGradient>
              
              <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Ambient outer halo ring */}
            <circle
              cx={dimensions.width / 2}
              cy={dimensions.height / 2}
              r={r + 8}
              fill="none"
              stroke="url(#outer-cyan-gradient)"
              strokeWidth={1}
              className="opacity-40"
              strokeDasharray="4,8"
            />

            {/* Core sphere back shade with holographic gradient */}
            <circle
              cx={dimensions.width / 2}
              cy={dimensions.height / 2}
              r={r}
              fill="url(#globe-glow)"
              className="transition-all"
            />

            {/* Latitude & Longitude Graticule Gridlines */}
            <path
              d={pathGenerator(graticule) || ''}
              fill="none"
              stroke="#08f1ff"
              strokeWidth={0.3}
              className="opacity-20 pointer-events-none"
            />

            {/* Continents / Landmass Drawing */}
            {worldData && (
              <g className="lands pointer-events-none">
                {worldData.features.map((d: any, i: number) => {
                  const path = pathGenerator(d);
                  if (!path) return null;
                  
                  const isActiveContinentLand = activeLocation && d.properties?.name === activeLocation.title;

                  return (
                    <path
                      key={`land-${i}`}
                      d={path}
                      fill={isActiveContinentLand ? 'rgba(6, 182, 212, 0.45)' : 'rgba(15, 68, 97, 0.28)'}
                      stroke="#0cf"
                      strokeWidth={isActiveContinentLand ? 0.8 : 0.4}
                      className="transition-all duration-300 hover:fill-cyan-500/25"
                      opacity={0.8}
                    />
                  );
                })}
              </g>
            )}

            {/* Dynamic Interactive Node Markers on the Front Hemisphere */}
            <g className="nodes">
              {visibleLandmarks.map((loc) => {
                if (!loc.visible) return null;

                const isCurrentlyActive = activeLocation && 
                  Math.abs(activeLocation.lat - loc.lat) < 0.001 &&
                  Math.abs(activeLocation.lng - loc.lng) < 0.001;

                return (
                  <g
                    key={`globe-node-${loc.index}`}
                    transform={`translate(${loc.x}, ${loc.y})`}
                    className="cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLocationSelect(loc);
                    }}
                  >
                    {/* Concentric radar beam pulses */}
                    <circle
                      cx={0}
                      cy={0}
                      r={isCurrentlyActive ? 22 : 12}
                      fill="none"
                      stroke={isCurrentlyActive ? '#00ffcc' : '#08f1ff'}
                      strokeWidth={1}
                      className="animate-ping opacity-45"
                      style={{ animationDuration: isCurrentlyActive ? '1.8s' : '3s' }}
                    />

                    {/* Node Core Bubble */}
                    <circle
                      cx={0}
                      cy={0}
                      r={isCurrentlyActive ? 7 : 4}
                      fill={isCurrentlyActive ? '#ffffff' : '#08f1ff'}
                      stroke={isCurrentlyActive ? '#00ffcc' : '#ffffff'}
                      strokeWidth={1.5}
                      filter="url(#node-glow)"
                      className="transition-all duration-300"
                    />

                    {/* Inner high-intensity cyber pulse */}
                    <circle
                      cx={0}
                      cy={0}
                      r={2}
                      fill="#ffffff"
                    />

                    {/* Floating Holographic Telemetry Label (Only for Active or Hovered) */}
                    <g className={`pointer-events-none transition-all duration-300 ${
                      isCurrentlyActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
                    }`}>
                      {/* Label background card */}
                      <rect
                        x={10}
                        y={-18}
                        width={130}
                        height={34}
                        rx={6}
                        fill="rgba(4, 9, 19, 0.95)"
                        stroke="#00ffcc"
                        strokeWidth={0.8}
                      />
                      <text
                        x={16}
                        y={-6}
                        fill="#ffffff"
                        fontSize={8.5}
                        fontFamily="serif"
                        fontStyle="italic"
                        fontWeight="bold"
                      >
                        {loc.title.length > 20 ? `${loc.title.substring(0, 18)}...` : loc.title}
                      </text>
                      <text
                        x={16}
                        y={6}
                        fill="#00ffcc"
                        fontSize={6.5}
                        fontFamily="monospace"
                        letterSpacing={0.5}
                      >
                        {loc.lat.toFixed(3)}&deg;N | {loc.lng.toFixed(3)}&deg;E
                      </text>
                      <line
                        x1={0}
                        y1={0}
                        x2={10}
                        y2={-6}
                        stroke="#00ffcc"
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

      {/* Active Landmark Detail Footer HUD */}
      {activeLocation && (
        <div className="w-full mt-2 py-2 px-3 bg-cyan-950/20 border border-cyan-500/20 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0 border border-cyan-400/20">
              <Target className="w-4 h-4 text-cyan-400 animate-pulse" />
            </div>
            <div className="text-left min-w-0">
              <span className="text-[7px] font-mono text-cyan-400 uppercase tracking-widest block">TELEMETRY_LOCK</span>
              <span className="text-xs font-serif italic text-white font-semibold truncate block leading-tight">{activeLocation.title}</span>
            </div>
          </div>
          <div className="font-mono text-[8px] text-cyan-400/60 text-right shrink-0">
            ALT: 2,450 FT<br />
            BEAM: 100% SECURE
          </div>
        </div>
      )}
    </div>
  );
}
