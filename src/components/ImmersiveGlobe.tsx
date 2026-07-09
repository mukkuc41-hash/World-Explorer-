import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, RefreshCw, Compass, MapPin, Target, Activity, ZoomIn, ZoomOut, Shield, Cpu } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Custom Rayleigh Scattering Atmosphere Shaders
const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vEyeVector;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vEyeVector = -normalize(mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const atmosphereFragmentShader = `
  varying vec3 vNormal;
  varying vec3 vEyeVector;
  void main() {
    float intensity = pow(0.65 - dot(vNormal, vEyeVector), 2.5);
    vec3 atmosphereColor = vec3(0.12, 0.48, 0.98);
    gl_FragColor = vec4(atmosphereColor, intensity);
  }
`;

// Procedural texture drawing helpers for Earth realism
const drawEarthDayTexture = (worldJson: any) => {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Oceans with soft depth gradient
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#020b1e');
  grad.addColorStop(0.5, '#051634');
  grad.addColorStop(1, '#020b1e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const projection = d3.geoEquirectangular()
    .scale(canvas.width / (2 * Math.PI))
    .translate([canvas.width / 2, canvas.height / 2]);
  const path = d3.geoPath().projection(projection).context(ctx);

  // Background grid
  ctx.strokeStyle = 'rgba(8, 241, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  path(d3.geoGraticule()());
  ctx.stroke();

  // Continent masses
  if (worldJson) {
    worldJson.features.forEach((feature: any) => {
      ctx.beginPath();
      path(feature);
      // Dual layer fill for realistic biome land coloring
      ctx.fillStyle = '#0f2f1d'; // Forest/vegetation base
      ctx.fill();

      ctx.fillStyle = 'rgba(27, 67, 50, 0.55)'; // Layered biome blending
      ctx.fill();

      // Cyber/Tech boundaries
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
      ctx.lineWidth = 1.0;
      ctx.stroke();
    });
  }

  return new THREE.CanvasTexture(canvas);
};

const drawEarthSpecularMap = (worldJson: any) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Oceans reflect highly (white)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const projection = d3.geoEquirectangular()
    .scale(canvas.width / (2 * Math.PI))
    .translate([canvas.width / 2, canvas.height / 2]);
  const path = d3.geoPath().projection(projection).context(ctx);

  // Land is matte (black / dark gray)
  if (worldJson) {
    worldJson.features.forEach((feature: any) => {
      ctx.beginPath();
      path(feature);
      ctx.fillStyle = '#0c0c0c';
      ctx.fill();
    });
  }

  return new THREE.CanvasTexture(canvas);
};

const drawEarthBumpMap = (worldJson: any) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Ocean is flat (black)
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const projection = d3.geoEquirectangular()
    .scale(canvas.width / (2 * Math.PI))
    .translate([canvas.width / 2, canvas.height / 2]);
  const path = d3.geoPath().projection(projection).context(ctx);

  // Land has base elevation (mid-gray) with terrain noise bumps
  if (worldJson) {
    worldJson.features.forEach((feature: any) => {
      ctx.beginPath();
      path(feature);
      ctx.fillStyle = '#555555';
      ctx.fill();

      ctx.strokeStyle = '#999999';
      ctx.lineWidth = 3;
      ctx.stroke();
    });

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 0) {
        // High-frequency mountain noise
        const mountainNoise = Math.floor(Math.random() * 55);
        data[i] = Math.min(255, data[i] + mountainNoise);
        data[i + 1] = Math.min(255, data[i + 1] + mountainNoise);
        data[i + 2] = Math.min(255, data[i + 2] + mountainNoise);
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  return new THREE.CanvasTexture(canvas);
};

const drawEarthNightLights = (worldJson: any) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Dark base
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const projection = d3.geoEquirectangular()
    .scale(canvas.width / (2 * Math.PI))
    .translate([canvas.width / 2, canvas.height / 2]);
  const path = d3.geoPath().projection(projection).context(ctx);

  if (worldJson) {
    worldJson.features.forEach((feature: any) => {
      ctx.save();
      ctx.beginPath();
      path(feature);
      ctx.clip(); // Only spawn lights inside continents

      // Draw cluster-based city lights
      ctx.fillStyle = 'rgba(255, 230, 150, 0.95)'; // Radiant warm light
      for (let i = 0; i < 40; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        
        ctx.beginPath();
        ctx.arc(x, y, 1.2 + Math.random() * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Surrounding metropolitan network glow
        ctx.fillStyle = 'rgba(255, 180, 80, 0.45)';
        for (let j = 0; j < 6; j++) {
          const sx = x + (Math.random() - 0.5) * 12;
          const sy = y + (Math.random() - 0.5) * 12;
          ctx.beginPath();
          ctx.arc(sx, sy, 0.6 + Math.random() * 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    });
  }

  return new THREE.CanvasTexture(canvas);
};

const drawCloudTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const imgData = ctx.createImageData(canvas.width, canvas.height);
  const data = imgData.data;

  // Generate fractal weather patterns
  for (let y = 0; y < canvas.height; y++) {
    const latFactor = Math.sin((y / canvas.height) * Math.PI);
    const beltDensity = 0.25 + 0.65 * Math.pow(Math.sin((y / canvas.height) * Math.PI * 3.0), 2);

    for (let x = 0; x < canvas.width; x++) {
      let value = 0;
      value += Math.sin(x * 0.012 + y * 0.006) * 0.5;
      value += Math.sin(x * 0.024 - y * 0.012) * 0.25;
      value += Math.sin(x * 0.06 + y * 0.035) * 0.125;
      value += Math.sin(x * 0.12 - y * 0.06) * 0.0625;
      
      value = (value + 0.9375) / 1.875;
      const density = value * beltDensity * latFactor;

      let alpha = 0;
      if (density > 0.44) {
        alpha = (density - 0.44) * 2.2;
        alpha = Math.min(alpha, 0.88);
      }

      const idx = (y * canvas.width + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = Math.floor(alpha * 255);
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Ambient blur for realistic fluffiness
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  for (let i = 0; i < 2; i++) {
    ctx.filter = 'blur(3px)';
    ctx.drawImage(canvas, 0, 0);
  }

  return new THREE.CanvasTexture(canvas);
};

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
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState(1500);
  const [utcTime, setUtcTime] = useState('00:00:00 UTC');
  const [holoEngineActive, setHoloEngineActive] = useState(true);
  
  const speedMultiplierRef = useRef(1500);
  const isAutoRotatingRef = useRef(true);
  const wireframeMeshRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    speedMultiplierRef.current = speedMultiplier;
  }, [speedMultiplier]);

  useEffect(() => {
    isAutoRotatingRef.current = isAutoRotating;
  }, [isAutoRotating]);

  useEffect(() => {
    if (wireframeMeshRef.current) {
      wireframeMeshRef.current.visible = holoEngineActive;
    }
  }, [holoEngineActive]);

  // Real-time UTC clock updater
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const h = String(now.getUTCHours()).padStart(2, '0');
      const m = String(now.getUTCMinutes()).padStart(2, '0');
      const s = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`${h}:${m}:${s} UTC`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 420, height: 420 });

  // Projected 2D screen coordinates for markers
  const [projectedMarkers, setProjectedMarkers] = useState<Array<{
    index: number;
    title: string;
    lat: number;
    lng: number;
    x: number;
    y: number;
    visible: boolean;
    location: GlobeLocation;
  }>>([]);

  // Refs for animation & Three.js synchronization
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const targetCameraPos = useRef<THREE.Vector3 | null>(null);

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

  // Convert lat/lng to standard 3D cartesian coordinates on sphere
  const convertLatLngToVector3 = (lat: number, lng: number, radius: number): THREE.Vector3 => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    
    // Standard spherical coordinates projection matching Three.js UV sphere mapping
    const x = -radius * Math.cos(theta) * Math.sin(phi);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(theta) * Math.sin(phi);
    
    return new THREE.Vector3(x, y, z);
  };

  // Build Earth Canvas Texture drawing GeoJSON
  const drawEarthTexture = (worldJson: any) => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Beautiful space-themed dark radial background
    ctx.fillStyle = '#050a14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dynamic linear mappings
    const projection = d3.geoEquirectangular()
      .scale(canvas.width / (2 * Math.PI))
      .translate([canvas.width / 2, canvas.height / 2]);

    const path = d3.geoPath().projection(projection).context(ctx);

    // Delicate graticule gridlines
    ctx.strokeStyle = 'rgba(8, 241, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    path(d3.geoGraticule()());
    ctx.stroke();

    // Outline landmasses with premium high-contrast cyan glow borders
    if (worldJson) {
      worldJson.features.forEach((feature: any) => {
        ctx.beginPath();
        path(feature);
        ctx.fillStyle = 'rgba(15, 68, 97, 0.3)';
        ctx.fill();
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      });
    }

    return new THREE.CanvasTexture(canvas);
  };

  // Master Three.js initialization and animation loop
  useEffect(() => {
    if (!worldData || !mountRef.current) return;

    const width = dimensions.width;
    const height = dimensions.height;

    // 1. Create Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 3.5);
    cameraRef.current = camera;

    // 2. Create WebGLRenderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 3. Configure OrbitControls with damping/inertia as requested
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.65;
    controls.enableZoom = true;
    controls.minDistance = 2.0;
    controls.maxDistance = 6.0;
    controlsRef.current = controls;

    // 4. Lights Setup for beautiful 3D atmospheric depth
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.15); // Dim ambient for glowing dark-side cities
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.6); // Bright white sun
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x00f3ff, 0.35); // Subtle cyber fill
    fillLight.position.set(-5, -3, -5);
    scene.add(fillLight);

    // 5. Earth Sphere Mesh & realistic layers
    const earthRadius = 1.5;

    // Procedural multi-layer textures
    const dayTexture = drawEarthDayTexture(worldData);
    const specularTexture = drawEarthSpecularMap(worldData);
    const bumpTexture = drawEarthBumpMap(worldData);
    const nightLightsTexture = drawEarthNightLights(worldData);
    const cloudTexture = drawCloudTexture();

    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
      map: dayTexture || undefined,
      specularMap: specularTexture || undefined,
      specular: new THREE.Color(0x3a6a9c),
      shininess: 55,
      bumpMap: bumpTexture || undefined,
      bumpScale: 0.02,
      emissiveMap: nightLightsTexture || undefined,
      emissive: new THREE.Color(0xffe1a8),
      emissiveIntensity: 1.5,
    });

    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMeshRef.current = earthMesh;

    // Axial Tilt Container (Earth group rotated on Z by 23.5 degrees)
    const earthGroup = new THREE.Group();
    earthGroup.rotation.z = THREE.MathUtils.degToRad(23.5);
    scene.add(earthGroup);
    earthGroup.add(earthMesh);

    // 6. Independent Cloud Layer (Cloud Belt)
    const cloudGeo = new THREE.SphereGeometry(earthRadius + 0.015, 64, 64);
    const cloudMat = new THREE.MeshPhongMaterial({
      map: cloudTexture || undefined,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      blending: THREE.NormalBlending
    });
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    earthMesh.add(cloudMesh); // Rotates with earth, but animate loop adds extra weather drift

    // 7. Multi-Layer Atmospheric Atmosphere (Rayleigh scattering)
    const atmosphereGeo = new THREE.SphereGeometry(earthRadius * 1.12, 64, 64);
    const atmosphereMat = new THREE.ShaderMaterial({
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    scene.add(atmosphereMesh);

    // 8. Cybernet Grid Outer Hologram Shell
    const wireframeGeo = new THREE.SphereGeometry(earthRadius + 0.025, 32, 32);
    const wireframeMat = new THREE.MeshBasicMaterial({
      color: 0x08f1ff,
      wireframe: true,
      transparent: true,
      opacity: 0.06,
    });
    const wireframeMesh = new THREE.Mesh(wireframeGeo, wireframeMat);
    wireframeMeshRef.current = wireframeMesh;
    wireframeMesh.visible = holoEngineActive;
    earthMesh.add(wireframeMesh);

    // Detect user interactions to pause auto-spin dynamically
    const onStartInteracting = () => {
      setIsAutoRotating(false);
    };
    controls.addEventListener('start', onStartInteracting);

    // 9. RequestAnimationFrame Animation & Render loop
    let animationFrameId: number;
    const tempV = new THREE.Vector3();
    const clock = new THREE.Clock();

    const SIDEREAL_SPEED = (2 * Math.PI) / 86164; // Earth rotates 360 degrees in 86164s

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const currentSpeed = speedMultiplierRef.current;
      const autoRotate = isAutoRotatingRef.current;

      // Earth rotation on Y-axis
      if (autoRotate) {
        earthMesh.rotation.y += delta * SIDEREAL_SPEED * currentSpeed;
        // Clouds drift independently and slightly faster to simulate atmospheric weather winds
        cloudMesh.rotation.y += delta * (0.00008 * currentSpeed + 0.005);
      } else {
        // Slow fallback cloud drift when static
        cloudMesh.rotation.y += delta * 0.006;
      }

      // Smooth camera interpolation towards selected target coordinate vector
      if (targetCameraPos.current) {
        camera.position.lerp(targetCameraPos.current, 0.06);
        // If extremely close, clear target to release camera to OrbitControls
        if (camera.position.distanceTo(targetCameraPos.current) < 0.005) {
          targetCameraPos.current = null;
        }
      }

      // ALWAYS call controls.update() explicitly to keep dampings/inertia active
      controls.update();

      // Project landmarks to 2D CSS screen coordinates
      const currentMarkers = landmarks.map((loc, idx) => {
        const worldPos = convertLatLngToVector3(loc.lat, loc.lng, earthRadius);
        
        // Account for Earth Mesh's live rotation
        worldPos.applyMatrix4(earthMesh.matrixWorld);

        // Vector pointing from world position to camera
        const toCamera = new THREE.Vector3().subVectors(camera.position, worldPos).normalize();
        const surfaceNormal = worldPos.clone().normalize();
        
        // Dot product determines if beacon is on the visible front face
        const isFacingCamera = surfaceNormal.dot(toCamera) > 0.05;

        if (isFacingCamera) {
          tempV.copy(worldPos).project(camera);
          const x = (tempV.x * 0.5 + 0.5) * width;
          const y = (-(tempV.y * 0.5) + 0.5) * height;
          
          return {
            index: idx,
            title: loc.title,
            lat: loc.lat,
            lng: loc.lng,
            x,
            y,
            visible: true,
            location: loc
          };
        } else {
          return {
            index: idx,
            title: loc.title,
            lat: loc.lat,
            lng: loc.lng,
            x: 0,
            y: 0,
            visible: false,
            location: loc
          };
        }
      });

      setProjectedMarkers(currentMarkers);

      // Render Scene
      renderer.render(scene, camera);
    };

    animate();

    // Clean up
    return () => {
      cancelAnimationFrame(animationFrameId);
      controls.removeEventListener('start', onStartInteracting);
      controls.dispose();
      renderer.dispose();
      
      // Dispose all procedurally generated textures
      if (dayTexture) dayTexture.dispose();
      if (specularTexture) specularTexture.dispose();
      if (bumpTexture) bumpTexture.dispose();
      if (nightLightsTexture) nightLightsTexture.dispose();
      if (cloudTexture) cloudTexture.dispose();

      earthGeo.dispose();
      earthMat.dispose();
      cloudGeo.dispose();
      cloudMat.dispose();
      atmosphereGeo.dispose();
      atmosphereMat.dispose();
      wireframeGeo.dispose();
      wireframeMat.dispose();

      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [worldData, dimensions.width, dimensions.height, landmarks]);

  // Handle auto-focus camera transitions when active location coordinate state changes
  useEffect(() => {
    if (!activeLocation || !earthMeshRef.current || !cameraRef.current) return;

    // Latitude maps to spherical components
    const targetVector = convertLatLngToVector3(activeLocation.lat, activeLocation.lng, 1.5);

    // Apply the active live rotation of the Earth mesh to calculate true world space coordinates
    targetVector.applyMatrix4(earthMeshRef.current.matrixWorld);

    // Target Camera is positioned outwards along the normal vector direction
    const normal = targetVector.clone().normalize();
    const cameraTargetDistance = 3.2; // Optimal dramatic zoom height
    const targetPos = normal.multiplyScalar(cameraTargetDistance);

    // Lock target coordinates for animation interpolation
    targetCameraPos.current = targetPos;
    setIsAutoRotating(false);
  }, [activeLocation]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between bg-stone-950/95 border border-stone-800/80 p-5 rounded-[32px] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
      
      {/* Dynamic Cyber Tactical HUD Control Bar */}
      <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 z-10 bg-stone-900/40 border border-stone-800/40 p-3 rounded-2xl backdrop-blur-md mb-2">
        {/* Left Section: Status Telemetries & UTC Clock */}
        <div className="flex flex-col gap-1 font-mono text-[9px] text-cyan-400">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="font-bold tracking-widest uppercase">3D_ORBIT_TELEMETRY</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-stone-400">
            <div>LAT: <span className="text-white font-bold">{activeLocation ? activeLocation.lat.toFixed(4) : '0.0000'}&deg;</span></div>
            <div>LNG: <span className="text-white font-bold">{activeLocation ? activeLocation.lng.toFixed(4) : '0.0000'}&deg;</span></div>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded text-[8px] text-emerald-400 font-bold uppercase tracking-wider">
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
              ORBITAL_SYS: ENGAGED
            </div>
            <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded text-[8px] text-amber-400 font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              DAY_NIGHT: {utcTime}
            </div>
          </div>
        </div>

        {/* Middle Section: Elegant Green Speed Slider */}
        <div className="flex flex-col items-center gap-1.5 w-full max-w-[200px] md:max-w-[220px]">
          <div className="flex justify-between w-full text-[9px] font-mono text-stone-400">
            <span>ROTATION_SPEED</span>
            <span className="text-emerald-400 font-bold uppercase tracking-wider">
              {speedMultiplier === 0 ? 'PAUSED' : `${(speedMultiplier).toFixed(0)}x`}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="5000"
            step="50"
            value={speedMultiplier}
            onChange={(e) => {
              const val = Number(e.target.value);
              setSpeedMultiplier(val);
              if (val > 0) {
                setIsAutoRotating(true);
              } else {
                setIsAutoRotating(false);
              }
            }}
            className="w-full h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between w-full text-[7px] font-mono text-stone-500">
            <span>STATIC</span>
            <span>1.0x (SIDEREAL)</span>
            <span>TURBO</span>
          </div>
        </div>

        {/* Right Section: Viewport Controls & Zoom buttons */}
        <div className="flex items-center gap-2">
          {/* Zoom In */}
          <button
            onClick={() => {
              if (cameraRef.current && controlsRef.current) {
                cameraRef.current.position.multiplyScalar(0.85);
                controlsRef.current.update();
              }
            }}
            className="p-2 rounded-xl bg-stone-900/80 text-cyan-400 border border-stone-800 hover:border-cyan-500/50 hover:bg-cyan-950/20 transition-all cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          
          {/* Zoom Out */}
          <button
            onClick={() => {
              if (cameraRef.current && controlsRef.current) {
                cameraRef.current.position.multiplyScalar(1.15);
                controlsRef.current.update();
              }
            }}
            className="p-2 rounded-xl bg-stone-900/80 text-cyan-400 border border-stone-800 hover:border-cyan-500/50 hover:bg-cyan-950/20 transition-all cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Reset View */}
          <button
            onClick={() => {
              if (cameraRef.current && controlsRef.current) {
                cameraRef.current.position.set(0, 0, 3.5);
                controlsRef.current.target.set(0, 0, 0);
                controlsRef.current.update();
                setSpeedMultiplier(1500);
                setIsAutoRotating(true);
              }
            }}
            className="p-2 rounded-xl bg-stone-900/80 text-cyan-400 border border-stone-800 hover:border-cyan-500/50 hover:bg-cyan-950/20 transition-all cursor-pointer"
            title="Reset Space Orientation"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Auto Rotation Toggle Button */}
          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className={`px-3 py-2 rounded-xl border font-mono text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              isAutoRotating 
                ? 'bg-cyan-500/15 text-cyan-400 border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.15)]' 
                : 'bg-stone-900/80 text-stone-400 border-stone-800'
            }`}
            title="Toggle Space Spin"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isAutoRotating ? 'bg-cyan-400 animate-ping' : 'bg-stone-600'}`} />
            <span>{isAutoRotating ? 'SPIN_ON' : 'STATIC'}</span>
          </button>
        </div>
      </div>

      {/* Main interactive Three.js container viewport */}
      <div 
        ref={containerRef} 
        className="w-full flex-1 flex items-center justify-center cursor-grab active:cursor-grabbing relative bg-radial from-stone-900/10 to-transparent"
      >
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-7 h-7 text-cyan-400 animate-spin" />
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">Constructing 3D Mesh...</span>
          </div>
        ) : (
          <div className="relative overflow-visible" style={{ width: dimensions.width, height: dimensions.height }}>
            {/* The WebGL Canvas Mount Node */}
            <div ref={mountRef} className="absolute inset-0 z-0 pointer-events-auto" />

            {/* Hybrid High-Fidelity DOM Markers Overlay */}
            <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
              {projectedMarkers.map((marker) => {
                if (!marker.visible) return null;

                const isCurrentlyActive = activeLocation && 
                  Math.abs(activeLocation.lat - marker.lat) < 0.001 &&
                  Math.abs(activeLocation.lng - marker.lng) < 0.001;

                return (
                  <div
                    key={`beacon-overlay-${marker.index}`}
                    style={{
                      position: 'absolute',
                      left: marker.x,
                      top: marker.y,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className="pointer-events-auto cursor-pointer group"
                  >
                    {/* Concentric radar beacon pulses */}
                    <div 
                      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400 animate-ping opacity-60`}
                      style={{
                        width: isCurrentlyActive ? '40px' : '20px',
                        height: isCurrentlyActive ? '40px' : '20px',
                        animationDuration: isCurrentlyActive ? '1.5s' : '3.0s'
                      }}
                    />

                    {/* Outer glow node bubble */}
                    <button
                      onClick={() => onLocationSelect(marker.location)}
                      className={`w-4 h-4 rounded-full flex items-center justify-center transition-transform hover:scale-125 shadow-lg border border-white ${
                        isCurrentlyActive ? 'bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.6)]' : 'bg-cyan-500/80'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    </button>

                    {/* Hover holographic label tooltip */}
                    <div className={`absolute top-6 left-1/2 -translate-x-1/2 bg-black/95 border border-cyan-400/60 p-2.5 rounded-xl text-white shadow-2xl transition-all duration-300 pointer-events-none max-w-[160px] w-40 ${
                      isCurrentlyActive 
                        ? 'opacity-100 translate-y-0 scale-100' 
                        : 'opacity-0 translate-y-2 scale-95 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100'
                    }`}>
                      <h4 className="text-[9px] font-serif italic font-bold tracking-tight text-white block truncate">
                        {marker.title}
                      </h4>
                      <p className="text-[7px] font-mono text-cyan-400 block mt-0.5">
                        {marker.lat.toFixed(3)}&deg;N | {marker.lng.toFixed(3)}&deg;E
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Embedded Immersive Floating HUD Controls */}
            <div className="absolute inset-x-0 bottom-2 flex justify-between items-center px-4 z-20 pointer-events-none">
              {/* Bottom-Left Card: Holo Engine Switch */}
              <div className="pointer-events-auto bg-stone-950/90 border border-stone-800/80 p-2 rounded-xl flex items-center gap-2.5 font-mono text-[9px] text-white shadow-lg backdrop-blur-md">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-bold tracking-wider">HOLO_ENGINE</span>
                <button
                  onClick={() => setHoloEngineActive(!holoEngineActive)}
                  className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border cursor-pointer transition-colors ${
                    holoEngineActive 
                      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-400/30' 
                      : 'bg-stone-900 text-stone-500 border-stone-800'
                  }`}
                >
                  {holoEngineActive ? 'SHOW' : 'HIDE'}
                </button>
              </div>

              {/* Bottom-Middle-Right Selector: Continent Dropdown */}
              <div className="pointer-events-auto bg-stone-950/90 border border-stone-800/80 p-1.5 rounded-xl shadow-lg backdrop-blur-md max-w-[180px]">
                <select
                  onChange={(e) => {
                    const continent = e.target.value;
                    if (continent) {
                      const coords: any = {
                        "Asia": { lat: 26.9258, lng: 75.8237, title: "Jaipur, India", zoom: 15 },
                        "Europe": { lat: 48.8584, lng: 2.2945, title: "Paris, France", zoom: 15 },
                        "Africa": { lat: 29.9792, lng: 31.1342, title: "Giza, Egypt", zoom: 15 },
                        "North America": { lat: 40.7128, lng: -74.0060, title: "New York, USA", zoom: 14 },
                        "South America": { lat: -22.9519, lng: -43.2105, title: "Rio de Janeiro, Brazil", zoom: 14 },
                        "Oceania": { lat: -33.8568, lng: 151.2153, title: "Sydney, Australia", zoom: 14 },
                        "Antarctica": { lat: -75.2509, lng: -0.0713, title: "Amundsen-Scott, Antarctica", zoom: 13 }
                      };
                      const coord = coords[continent];
                      if (coord) {
                        onLocationSelect({
                          id: `continent-${continent.toLowerCase()}`,
                          title: coord.title,
                          lat: coord.lat,
                          lng: coord.lng,
                          zoom: coord.zoom
                        } as any);
                      }
                    }
                  }}
                  defaultValue=""
                  className="bg-transparent text-stone-300 font-mono text-[9px] font-bold uppercase tracking-wider py-1 px-2 border-0 outline-none w-full cursor-pointer focus:ring-0"
                >
                  <option value="" disabled className="bg-stone-950 text-stone-500">CHOOSE TARGET NEURAL CONTINENT</option>
                  <option value="Asia" className="bg-stone-950 text-white">Asia</option>
                  <option value="Europe" className="bg-stone-950 text-white">Europe</option>
                  <option value="Africa" className="bg-stone-950 text-white">Africa</option>
                  <option value="North America" className="bg-stone-950 text-white">North America</option>
                  <option value="South America" className="bg-stone-950 text-white">South America</option>
                  <option value="Oceania" className="bg-stone-950 text-white">Oceania</option>
                  <option value="Antarctica" className="bg-stone-950 text-white">Antarctica</option>
                </select>
              </div>
            </div>
          </div>
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
            <span className="text-xs font-serif italic text-white truncate max-w-[180px] block font-bold leading-tight">
              {activeLocation ? activeLocation.title : 'Global Sweep'}
            </span>
          </div>
        </div>
        <div className="font-mono text-[8px] text-stone-500 text-right uppercase">
          Altitude: Orbit (520km)<br />
          Telemetry: Secured
        </div>
      </div>

      {/* Margins Footer Status Bar */}
      <div className="w-full flex justify-between items-center mt-3 pt-2 border-t border-stone-900 font-mono text-[8px] text-stone-500 select-none">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
          <span>SYS_GRID: <span className="text-emerald-400 font-bold">RESOLUTION_OK</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <Shield className="w-3 h-3 text-cyan-500" />
          <span>NEURAL_DATA_STREAM: <span className="text-cyan-400 font-bold">SECURE</span></span>
        </div>
      </div>

    </div>
  );
}
