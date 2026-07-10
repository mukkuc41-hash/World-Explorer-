import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../lib/firebase.ts';
import { LocationData } from './LocationList.tsx';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { 
  Map as MapIcon, 
  Layers, 
  Navigation, 
  MapPin, 
  Activity, 
  Globe, 
  Compass, 
  ChevronDown, 
  X, 
  Minimize2, 
  Maximize2, 
  GripHorizontal,
  Search,
  Mic,
  ArrowRight,
  Home,
  Utensils,
  Hotel
} from 'lucide-react';
import { Continent } from '../App.tsx';
import ImmersiveGlobeCanvas, { GlobeLocation } from './ImmersiveGlobeCanvas.tsx';
import GoogleMapsApp from './GoogleMapsApp.tsx';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasMapsKey = Boolean(GOOGLE_MAPS_KEY) && GOOGLE_MAPS_KEY !== 'YOUR_API_KEY';

function createMarkerIcon(isFavorite: boolean, isTour: boolean, isSelected: boolean, type?: string, name?: string) {
  const isHospital = type?.toLowerCase().includes('hospital') || name?.toLowerCase().includes('hospital');
  const isResidenceOrHotel = type?.toLowerCase().includes('residence') || type?.toLowerCase().includes('home') || type?.toLowerCase().includes('hotel') || name?.toLowerCase().includes('hotel') || name?.toLowerCase().includes('residence');

  if (isHospital) {
    return L.divIcon({
      className: 'custom-leaflet-marker-hospital',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-8 h-8 rounded-full bg-red-500/30 animate-ping"></div>
          <div class="relative w-8 h-8 rounded-full bg-red-600 border-2 border-white flex items-center justify-center text-white text-xs font-black shadow-lg" style="font-family: sans-serif; font-weight: 900;">H</div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  }

  if (isResidenceOrHotel) {
    return L.divIcon({
      className: 'custom-leaflet-marker-residence',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-8 h-8 rounded-full bg-blue-500/30 animate-ping"></div>
          <div class="relative w-8 h-8 bg-blue-600 border-2 border-white flex items-center justify-center text-white text-xs shadow-lg rounded-xl" style="clip-path: polygon(50% 0%, 100% 38%, 100% 100%, 0% 100%, 0% 38%);">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-white -mt-0.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  }

  const bgColor = isSelected ? '#ea580c' : isFavorite ? '#e11d48' : isTour ? '#00af87' : '#5A5A40';
  const pingColor = isSelected ? 'rgba(234, 88, 12, 0.4)' : isFavorite ? 'rgba(225, 29, 72, 0.4)' : isTour ? 'rgba(0, 175, 135, 0.4)' : 'rgba(90, 90, 64, 0.4)';
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-8 h-8 rounded-full animate-ping" style="background-color: ${pingColor}"></div>
        <div class="relative w-5 h-5 rounded-full flex items-center justify-center shadow-lg border-2 border-white text-white transition-all transform hover:scale-110" style="background-color: ${bgColor}">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
}

interface WorldViewProps {
  continent: string | null;
  country: string | null;
  state: string | null;
  showFavoritesOnly?: boolean;
  showTourOnly?: boolean;
  showUserAddedOnly?: boolean;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  onSelect?: (location: LocationData) => void;
  onSelectContinent?: (continent: Continent | null) => void;
  speed?: number;
  onChangeSpeed?: (speed: number) => void;
}

export default function WorldView({ 
  continent, 
  country, 
  state, 
  showFavoritesOnly, 
  showTourOnly, 
  showUserAddedOnly, 
  searchQuery, 
  onSearchQueryChange,
  onSelect,
  onSelectContinent,
  speed,
  onChangeSpeed
}: WorldViewProps) {
  const [rawAllLocations, setRawAllLocations] = useState<LocationData[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [userFavorites, setUserFavorites] = useState<Set<string>>(new Set());
  const [userTour, setUserTour] = useState<Set<string>>(new Set());
  const [viewType, setViewType] = useState<'flat' | 'split' | 'globe'>('flat');
  const [splitRatio, setSplitRatio] = useState<number>(50);
  const [activeLandmarkId, setActiveLandmarkId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Map Engine & Shared Camera state for Google Maps + Leaflet syncing
  const [mapEngine, setMapEngine] = useState<'google' | 'leaflet'>(hasMapsKey ? 'google' : 'leaflet');
  const [syncedCenter, setSyncedCenter] = useState<{ lat: number, lng: number }>({ lat: 26.9258, lng: 75.8237 });
  const [syncedZoom, setSyncedZoom] = useState<number>(state ? 11 : country ? 6 : continent ? 4 : 2);

  // Synchronize map center when filter boundaries or locations load to prevent uninitialized reference crashes
  useEffect(() => {
    if (rawAllLocations.length > 0) {
      let filtered = [...rawAllLocations];
      if (state) filtered = filtered.filter(l => l.state === state);
      else if (country) filtered = filtered.filter(l => l.country === country);
      else if (continent) filtered = filtered.filter(l => l.continent === continent);
      
      if (filtered.length > 0 && filtered[0].lat && filtered[0].lng) {
        setSyncedCenter({ lat: filtered[0].lat, lng: filtered[0].lng });
      }
    }
  }, [rawAllLocations, continent, country, state]);

  // Leaflet references and states
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const polylineRef = useRef<L.Polyline | null>(null);

  // Local Locator Dropdown States
  const [locatorContinent, setLocatorContinent] = useState<string>('');
  const [locatorCountry, setLocatorCountry] = useState<string>('');
  const [locatorState, setLocatorState] = useState<string>('');
  const [locatorLandmarkId, setLocatorLandmarkId] = useState<string>('');
  const [isLocatorMinimized, setIsLocatorMinimized] = useState<boolean>(false);
  const worldViewContainerRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  // Fetch all active (not deleted) locations in one go
  useEffect(() => {
    const q = query(collection(db, 'locations'), where('isDeleted', '==', false));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const locs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LocationData[];
      setRawAllLocations(locs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'locations');
    });
    return () => unsubscribe();
  }, []);

  // Compute the locations state (which is filtered for the flat map if hierarchy/search is active)
  const locations = useMemo(() => {
    let locs = [...rawAllLocations];
    
    // Filter special collections
    if (showFavoritesOnly) {
      locs = locs.filter(l => userFavorites.has(l.id));
    }
    if (showTourOnly) {
      locs = locs.filter(l => userTour.has(l.id));
    }
    if (showUserAddedOnly) {
      locs = locs.filter(l => l.userId !== 'traveler-guide-ai' && l.userId !== 'system');
    }

    // Filter hierarchy based on dashboard selectors
    if (continent) {
      locs = locs.filter(l => l.continent === continent);
    }
    if (country) {
      locs = locs.filter(l => l.country === country);
    }
    if (state) {
      locs = locs.filter(l => l.state === state);
    }

    // Search filter
    if (searchQuery) {
      const queryLower = searchQuery.toLowerCase();
      locs = locs.filter(l => 
        l.name.toLowerCase().includes(queryLower) ||
        l.country.toLowerCase().includes(queryLower) ||
        l.continent.toLowerCase().includes(queryLower) ||
        (l.state && l.state.toLowerCase().includes(queryLower))
      );
    }

    // Category filter
    if (activeCategory && activeCategory !== 'all') {
      const catLower = activeCategory.toLowerCase();
      locs = locs.filter(l => 
        (l.type && l.type.toLowerCase().includes(catLower)) ||
        l.name.toLowerCase().includes(catLower)
      );
    }
    
    // Safety check to completely avoid Leaflet Uncaught Error: Invalid LatLng object: (undefined, undefined)
    return locs.filter(l => l && typeof l.lat === 'number' && typeof l.lng === 'number' && !isNaN(l.lat) && !isNaN(l.lng));
  }, [rawAllLocations, continent, country, state, showFavoritesOnly, showTourOnly, showUserAddedOnly, userFavorites, userTour, searchQuery, activeCategory]);

  // List of all unique continents in the database
  const availableContinents = useMemo(() => {
    const set = new Set<string>();
    rawAllLocations.forEach(l => {
      if (l.continent) set.add(l.continent);
    });
    return Array.from(set).sort();
  }, [rawAllLocations]);

  // List of countries filtered by selected continent
  const availableCountries = useMemo(() => {
    const set = new Set<string>();
    rawAllLocations.forEach(l => {
      if (l.country && (!locatorContinent || l.continent === locatorContinent)) {
        set.add(l.country);
      }
    });
    return Array.from(set).sort();
  }, [rawAllLocations, locatorContinent]);

  // List of states filtered by selected country and continent
  const availableStates = useMemo(() => {
    const set = new Set<string>();
    rawAllLocations.forEach(l => {
      if (l.state && 
         (!locatorContinent || l.continent === locatorContinent) && 
         (!locatorCountry || l.country === locatorCountry)) {
        set.add(l.state);
      }
    });
    return Array.from(set).sort();
  }, [rawAllLocations, locatorContinent, locatorCountry]);

  // List of landmarks filtered by all above
  const availableLandmarks = useMemo(() => {
    return rawAllLocations.filter(l => 
      (!locatorContinent || l.continent === locatorContinent) &&
      (!locatorCountry || l.country === locatorCountry) &&
      (!locatorState || l.state === locatorState)
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [rawAllLocations, locatorContinent, locatorCountry, locatorState]);

  // Handle local locator selections
  const handleLocatorSelectLandmark = (landmarkId: string) => {
    setLocatorLandmarkId(landmarkId);
    const landmark = rawAllLocations.find(l => l.id === landmarkId);
    if (landmark) {
      setSelectedLocation(landmark);
      setActiveLandmarkId(landmark.id);
      if (onSelect) {
        onSelect(landmark);
      }
    }
  };

  // Keep the locator selections in sync with any selection in the map/globe
  useEffect(() => {
    if (selectedLocation) {
      setLocatorContinent(selectedLocation.continent || '');
      setLocatorCountry(selectedLocation.country || '');
      setLocatorState(selectedLocation.state || '');
      setLocatorLandmarkId(selectedLocation.id || '');
    }
  }, [selectedLocation]);

  // Show all locations added in the app on the globe in the global view (when continent is null)
  const landmarks = useMemo<GlobeLocation[]>(() => {
    const targetLocs = (!continent) ? rawAllLocations : locations;
    return targetLocs.map(loc => ({
      id: loc.id,
      title: loc.name,
      lat: loc.lat,
      lng: loc.lng,
      zoom: 15,
      region: loc.state ? `${loc.state}, ${loc.country}` : loc.country,
      category: loc.continent,
      description: loc.description,
      imageUrl: loc.imageUrl
    }));
  }, [rawAllLocations, locations, continent]);

  const explorerState = useMemo(() => {
    if (selectedLocation) {
      return {
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        zoom: 15,
        activeLandmarkId: selectedLocation.id
      };
    }
    if (activeLandmarkId) {
      const landmark = rawAllLocations.find(l => l.id === activeLandmarkId);
      if (landmark) {
        return {
          lat: landmark.lat,
          lng: landmark.lng,
          zoom: 15,
          activeLandmarkId: landmark.id
        };
      }
    }
    if (locations.length > 0) {
      return {
        lat: locations[0].lat,
        lng: locations[0].lng,
        zoom: 15,
        activeLandmarkId: locations[0].id
      };
    }
    return {
      lat: 20,
      lng: 0,
      zoom: 2,
      activeLandmarkId: null
    };
  }, [selectedLocation, activeLandmarkId, locations, rawAllLocations]);

  const handleLocationSelect = (landmark: GlobeLocation) => {
    if (landmark.id.startsWith('continent-')) {
      const continentName = landmark.id.replace('continent-', '');
      const formatted = continentName.charAt(0).toUpperCase() + continentName.slice(1);
      if (onSelectContinent) {
        onSelectContinent(formatted as Continent);
      }
      return;
    }

    setActiveLandmarkId(landmark.id);
    const originalLoc = rawAllLocations.find(l => l.id === landmark.id);
    if (originalLoc) {
      setSelectedLocation(originalLoc);
      if (onSelect) {
        onSelect(originalLoc);
      }
    }
  };

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    const qFav = query(collection(db, 'favorites'), where('userId', '==', user.uid));
    const unsubFav = onSnapshot(qFav, (snap) => {
      setUserFavorites(new Set(snap.docs.map(d => d.data().locationId)));
    });
    const qTour = query(collection(db, 'tours'), where('userId', '==', user.uid));
    const unsubTour = onSnapshot(qTour, (snap) => {
      setUserTour(new Set(snap.docs.map(d => d.data().locationId)));
    });
    return () => { unsubFav(); unsubTour(); };
  }, [user]);

  const mapCenter = ((state || country) && locations.length > 0) 
    ? { lat: locations[0].lat, lng: locations[0].lng } 
    : continentCenter(continent);
  
  const zoom = state ? 11 : country ? 6 : continent ? 4 : 2;

  // Sync state derived from hierarchy selection props
  useEffect(() => {
    setSyncedCenter(mapCenter);
    setSyncedZoom(zoom);
  }, [continent, country, state]);

  // Sync state when location selection changes
  useEffect(() => {
    if (selectedLocation) {
      setSyncedCenter({ lat: selectedLocation.lat, lng: selectedLocation.lng });
      setSyncedZoom(13);
    }
  }, [selectedLocation]);

  const mapCenterRef = useRef(mapCenter);
  const zoomRef = useRef(zoom);
  useEffect(() => {
    mapCenterRef.current = mapCenter;
    zoomRef.current = zoom;
  });

  // Callback ref to handle initialization and destruction of Leaflet cleanly
  const handleMapRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      if (!mapRef.current) {
        const map = L.map(node, {
          center: [mapCenterRef.current.lat, mapCenterRef.current.lng],
          zoom: zoomRef.current,
          zoomControl: false,
          attributionControl: false
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
        }).addTo(map);

        L.control.zoom({ position: 'topleft' }).addTo(map);

        // Bind camera movement events to update synced state
        map.on('moveend', () => {
          const c = map.getCenter();
          const z = map.getZoom();
          setSyncedCenter({ lat: c.lat, lng: c.lng });
          setSyncedZoom(z);
        });

        mapRef.current = map;
        setMapInstance(map);
      }
    } else {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setMapInstance(null);
        markersRef.current = {};
        polylineRef.current = null;
      }
    }
  }, []);

  // Update map view on syncedCenter/syncedZoom changes
  useEffect(() => {
    if (mapInstance && mapEngine === 'leaflet') {
      const currentC = mapInstance.getCenter();
      const currentZ = mapInstance.getZoom();
      const latDiff = Math.abs(currentC.lat - syncedCenter.lat);
      const lngDiff = Math.abs(currentC.lng - syncedCenter.lng);
      if (latDiff > 0.0001 || lngDiff > 0.0001 || currentZ !== syncedZoom) {
        mapInstance.setView([syncedCenter.lat, syncedCenter.lng], syncedZoom, { animate: true });
      }
    }
  }, [mapInstance, syncedCenter, syncedZoom, mapEngine]);

  // Invalidate map size when view mode changes or layout dimensions change to avoid grey tiles or styling glitches
  useEffect(() => {
    if (mapInstance) {
      // Delay slightly to allow the motion animation to complete or progress
      const interval = setInterval(() => {
        mapInstance.invalidateSize();
      }, 50);
      const timeout = setTimeout(() => {
        clearInterval(interval);
        mapInstance.invalidateSize();
      }, 500);
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [mapInstance, viewType, splitRatio]);

  // Sync Leaflet Markers
  useEffect(() => {
    if (!mapInstance || viewType === 'globe') return;

    // Clear removed markers
    const currentLocIds = new Set(locations.map(l => l.id));
    Object.keys(markersRef.current).forEach(id => {
      if (!currentLocIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Draw/Update markers
    locations.forEach(loc => {
      const isFav = userFavorites.has(loc.id);
      const isTour = userTour.has(loc.id);
      const isSel = selectedLocation?.id === loc.id;

      const icon = createMarkerIcon(isFav, isTour, isSel, loc.type, loc.name);

      if (markersRef.current[loc.id]) {
        markersRef.current[loc.id].setIcon(icon);
        markersRef.current[loc.id].setLatLng([loc.lat, loc.lng]);
      } else {
        const marker = L.marker([loc.lat, loc.lng], { icon }).addTo(mapInstance);

        const popupContent = document.createElement('div');
        popupContent.className = 'p-3 max-w-[220px] font-sans text-stone-800';
        popupContent.innerHTML = `
          <h4 class="font-serif italic text-base font-bold tracking-tight mb-1 text-stone-900">${loc.name}</h4>
          <p class="text-[10px] text-stone-500 mb-2 leading-relaxed">${loc.description || ''}</p>
          ${loc.imageUrl ? `<img src="${loc.imageUrl}" class="w-full h-24 object-cover rounded-lg mb-2 shadow-sm" referrerPolicy="no-referrer" />` : ''}
          <div class="flex flex-col gap-1.5 mt-2">
            <button id="btn-dir-${loc.id}" class="w-full bg-[#141414] hover:bg-stone-800 text-white py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
              Directions
            </button>
            <button id="btn-det-${loc.id}" class="w-full bg-stone-100 hover:bg-stone-200 text-stone-800 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border border-stone-200 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              View Details
            </button>
          </div>
        `;

        marker.bindPopup(popupContent, {
          closeButton: false,
          className: 'custom-leaflet-popup',
          maxWidth: 240
        });

        marker.on('popupopen', () => {
          const dirBtn = document.getElementById(`btn-dir-${loc.id}`);
          if (dirBtn) {
            dirBtn.onclick = (e) => {
              e.stopPropagation();
              window.open(`https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`, '_blank');
            };
          }
          const detBtn = document.getElementById(`btn-det-${loc.id}`);
          if (detBtn) {
            detBtn.onclick = (e) => {
              e.stopPropagation();
              if (onSelect) onSelect(loc);
            };
          }
          setSelectedLocation(loc);
        });

        marker.on('click', () => {
          setSelectedLocation(loc);
        });

        markersRef.current[loc.id] = marker;
      }
    });
  }, [mapInstance, locations, userFavorites, userTour, selectedLocation, viewType]);

  // Sync Tour Polyline
  useEffect(() => {
    if (!mapInstance || viewType === 'globe') return;

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (showTourOnly && locations.length >= 2) {
      const latLngs = locations.map(l => [l.lat, l.lng] as L.LatLngExpression);
      polylineRef.current = L.polyline(latLngs, {
        color: '#00af87',
        weight: 3.5,
        opacity: 0.9,
        dashArray: '5, 10'
      }).addTo(mapInstance);
    }
  }, [mapInstance, locations, showTourOnly, viewType]);

  // Center map when location selection changes
  useEffect(() => {
    if (mapInstance && selectedLocation) {
      mapInstance.setView([selectedLocation.lat, selectedLocation.lng], 13, { animate: true });
      const marker = markersRef.current[selectedLocation.id];
      if (marker) {
        marker.openPopup();
      }
    }
  }, [selectedLocation, mapInstance]);

  const mapWidth = viewType === 'flat' ? '100%' : viewType === 'globe' ? '0%' : `${splitRatio}%`;
  const globeWidth = viewType === 'globe' ? '100%' : viewType === 'flat' ? '0%' : `${100 - splitRatio}%`;

  const activeTopTab = viewType === 'globe' 
    ? 'globe' 
    : viewType === 'split' 
      ? 'split' 
      : (!continent && syncedZoom <= 2.5) 
        ? 'global' 
        : 'flat';

  return (
    <div ref={worldViewContainerRef} className="relative w-full h-[620px] rounded-[40px] overflow-hidden shadow-2xl border border-[#141414]/10 bg-[#f5f5f0] dark:bg-stone-950 flex flex-col justify-end">
      
      {/* ==================== HIGH-FIDELITY DESIGN PANEL OVERLAY ==================== */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-32px)] max-w-md pointer-events-none flex flex-col gap-2">
        
        {/* 1. Top Navigation Bar (Segmented Control) */}
        <div className="bg-white/90 dark:bg-[#141414]/90 backdrop-blur-md p-1 rounded-full shadow-lg border border-stone-200/50 dark:border-stone-800 pointer-events-auto flex items-center justify-between w-full">
          <button
            onClick={() => {
              setViewType('flat');
              if (onSelectContinent) onSelectContinent(null);
              setSyncedCenter({ lat: 20, lng: 0 });
              setSyncedZoom(2);
            }}
            className={`flex-1 text-center py-2 px-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
              activeTopTab === 'global'
                ? 'bg-blue-600 text-white shadow-md font-black'
                : 'text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white hover:bg-stone-100/50 dark:hover:bg-white/5'
            }`}
          >
            GLOBAL VIEW
          </button>
          
          <button
            onClick={() => {
              setViewType('flat');
              setSyncedCenter({ lat: 26.9258, lng: 75.8237 });
              setSyncedZoom(12);
            }}
            className={`flex-1 text-center py-2 px-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
              activeTopTab === 'flat'
                ? 'bg-blue-600 text-white shadow-md font-black'
                : 'text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white hover:bg-stone-100/50 dark:hover:bg-white/5'
            }`}
          >
            2D MAP
          </button>
          
          <button
            onClick={() => setViewType('split')}
            className={`flex-1 text-center py-2 px-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
              activeTopTab === 'split'
                ? 'bg-blue-600 text-white shadow-md font-black'
                : 'text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white hover:bg-stone-100/50 dark:hover:bg-white/5'
            }`}
          >
            SPLIT DECK
          </button>
          
          <button
            onClick={() => setViewType('globe')}
            className={`flex-1 text-center py-2 px-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
              activeTopTab === 'globe'
                ? 'bg-blue-600 text-white shadow-md font-black'
                : 'text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white hover:bg-stone-100/50 dark:hover:bg-white/5'
            }`}
          >
            3D GLOBE
          </button>
        </div>

        {/* 2. Secondary Bar (Map Engine Toggle) */}
        {viewType !== 'globe' && (
          <div className="flex items-center justify-center gap-2 pointer-events-auto w-full animate-fade-in">
            <div className="bg-white/85 dark:bg-[#141414]/85 backdrop-blur-md p-1 rounded-full shadow-md border border-stone-200/50 dark:border-stone-800 flex items-center justify-center gap-1">
              <button
                onClick={() => setMapEngine('leaflet')}
                className={`px-4 py-1.5 rounded-full text-[8.5px] font-black uppercase tracking-widest transition-all ${
                  mapEngine === 'leaflet'
                    ? 'bg-blue-600 text-white shadow-sm font-black'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                Leaflet 2D
              </button>
              <button
                onClick={() => setMapEngine('google')}
                className={`px-4 py-1.5 rounded-full text-[8.5px] font-black uppercase tracking-widest transition-all ${
                  mapEngine === 'google'
                    ? 'bg-blue-600 text-white shadow-sm font-black'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                Google Maps
              </button>
            </div>
          </div>
        )}

        {/* 3. Search Bar */}
        {viewType !== 'globe' && (
          <div className="bg-white dark:bg-[#141414] rounded-full border border-stone-200/60 dark:border-stone-800 shadow-lg px-4 py-2.5 flex items-center gap-2 pointer-events-auto transition-all focus-within:ring-2 focus-within:ring-blue-500/50 w-full animate-fade-in">
            <Search className="w-4 h-4 text-stone-400 shrink-0" />
            <input
              type="text"
              value={searchQuery || ''}
              onChange={(e) => {
                if (onSearchQueryChange) onSearchQueryChange(e.target.value);
              }}
              placeholder="Search historic gems, or enter directions..."
              className="w-full bg-transparent text-xs font-medium text-stone-800 dark:text-stone-100 placeholder-stone-400 outline-none border-0 p-0"
            />
            <Mic className="w-3.5 h-3.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 shrink-0 cursor-pointer transition-colors" />
            <button className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 shadow hover:bg-blue-700 transition-colors">
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* 4. Category Pills */}
        {viewType !== 'globe' && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 pointer-events-auto w-full animate-fade-in">
            <button
              onClick={() => setActiveCategory('all')}
              className={`flex-1 text-center py-1.5 px-3.5 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm shrink-0 transition-all ${
                activeCategory === 'all'
                  ? 'bg-blue-600 border-blue-500 text-white font-black'
                  : 'bg-white/90 dark:bg-[#141414]/90 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-900'
              }`}
            >
              ALL LANDMARKS
            </button>
            
            <button
              onClick={() => setActiveCategory('restaurant')}
              className={`flex-1 text-center py-1.5 px-3.5 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm shrink-0 transition-all flex items-center justify-center gap-1 ${
                activeCategory === 'restaurant'
                  ? 'bg-blue-600 border-blue-500 text-white font-black'
                  : 'bg-white/90 dark:bg-[#141414]/90 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-900'
              }`}
            >
              <Utensils className="w-2.5 h-2.5" />
              RESTAURANTS
            </button>
            
            <button
              onClick={() => setActiveCategory('hotel')}
              className={`flex-1 text-center py-1.5 px-3.5 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm shrink-0 transition-all flex items-center justify-center gap-1 ${
                activeCategory === 'hotel'
                  ? 'bg-blue-600 border-blue-500 text-white font-black'
                  : 'bg-white/90 dark:bg-[#141414]/90 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-900'
              }`}
            >
              <Hotel className="w-2.5 h-2.5" />
              HOTELS
            </button>
            
            <button
              onClick={() => setActiveCategory('hospital')}
              className={`flex-1 text-center py-1.5 px-3.5 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm shrink-0 transition-all flex items-center justify-center gap-1 ${
                activeCategory === 'hospital'
                  ? 'bg-blue-600 border-blue-500 text-white font-black'
                  : 'bg-white/90 dark:bg-[#141414]/90 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-900'
              }`}
            >
              <Activity className="w-2.5 h-2.5" />
              HOSPITALS
            </button>
          </div>
        )}

      </div>

      {/* Split ratio slider overlay, visible only when in split mode */}
      {viewType === 'split' && (
        <div className="absolute bottom-6 right-6 bg-white/95 dark:bg-[#141414]/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl border border-stone-200/50 dark:border-stone-800 z-20 flex items-center gap-3">
          <span className="text-[8px] font-black uppercase tracking-widest opacity-60">2D Map</span>
          <input 
            type="range" 
            min="15" 
            max="85" 
            value={splitRatio} 
            onChange={(e) => setSplitRatio(Number(e.target.value))}
            className="w-24 accent-blue-600 h-1 bg-gray-200 dark:bg-stone-800 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-[8px] font-black uppercase tracking-widest opacity-60">3D Globe</span>
        </div>
      )}

      {/* Sliding Views Container */}
      <div className="relative w-full h-full flex overflow-hidden z-0">
        {/* 2D Map Pane */}
        <motion.div 
          className="h-full relative overflow-hidden"
          style={{ width: mapWidth, pointerEvents: viewType === 'globe' ? 'none' : 'auto' }}
          animate={{ 
            width: mapWidth,
            opacity: viewType === 'globe' ? 0 : 1
          }}
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        >
          {mapEngine === 'google' ? (
            <GoogleMapsApp 
              locations={locations}
              selectedLocation={selectedLocation}
              onSelect={(loc) => {
                setSelectedLocation(loc);
                if (onSelect) onSelect(loc);
              }}
              userFavorites={userFavorites}
              userTour={userTour}
              showTourOnly={showTourOnly}
              center={syncedCenter}
              zoom={syncedZoom}
              onCameraChange={(c, z) => {
                setSyncedCenter(c);
                setSyncedZoom(z);
              }}
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
            />
          ) : (
            <div ref={handleMapRef} className="w-full h-full z-0" />
          )}
        </motion.div>

        {/* Dynamic Visual Sliding Divider */}
        {viewType === 'split' && (
          <div className="w-1.5 h-full bg-blue-500/30 dark:bg-stone-800 transition-colors flex items-center justify-center relative z-10 select-none">
            <div className="absolute w-6 h-6 bg-white dark:bg-[#141414] rounded-full shadow-lg border border-stone-200 dark:border-stone-800 flex items-center justify-center">
              <Layers className="w-3 h-3 text-blue-600" />
            </div>
          </div>
        )}

        {/* 3D Globe Pane */}
        <motion.div 
          className="h-full relative overflow-hidden"
          style={{ width: globeWidth }}
          animate={{ 
            width: globeWidth,
            opacity: viewType === 'flat' ? 0 : 1
          }}
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        >
          <ImmersiveGlobeCanvas 
            explorerState={explorerState}
            onLocationSelect={handleLocationSelect}
            landmarks={landmarks}
          />
        </motion.div>
      </div>

      {/* Dynamic Location Locator floating box */}
      {viewType !== 'globe' && (
        <motion.div
          drag
          dragControls={dragControls}
          dragListener={false}
          dragConstraints={worldViewContainerRef}
          dragElastic={0.1}
          dragMomentum={false}
          className="absolute bottom-6 left-6 z-10 max-w-sm w-[calc(100%-48px)] bg-white/95 dark:bg-[#141414]/95 backdrop-blur-md rounded-[28px] shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden select-none pointer-events-auto"
        >
          <div className="p-4.5 space-y-3">
            {/* Header / Drag Handle area */}
            <div 
              onPointerDown={(e) => dragControls.start(e)}
              className="flex items-center justify-between cursor-grab active:cursor-grabbing border-b border-stone-100 dark:border-white/5 pb-2"
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-500/10 rounded-xl text-blue-600 shrink-0">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif italic text-xs tracking-tight leading-none text-[#141414] dark:text-white flex items-center gap-1.5">
                    Location Locator
                    <GripHorizontal className="w-3.5 h-3.5 opacity-30 text-[#141414] dark:text-white shrink-0" />
                  </h3>
                  <span className="text-[8px] uppercase tracking-wider font-mono opacity-40 block">NAVIGATE DATABASE GEMS</span>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5">
                {/* Reset Filters */}
                {(locatorContinent || locatorCountry || locatorState || locatorLandmarkId) && !isLocatorMinimized && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocatorContinent('');
                      setLocatorCountry('');
                      setLocatorState('');
                      setLocatorLandmarkId('');
                      setSelectedLocation(null);
                    }}
                    className="p-1.5 hover:bg-[#141414]/5 dark:hover:bg-white/5 rounded-full text-rose-500 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    title="Reset Filters"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Minimise / Maximise Buttons */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLocatorMinimized(!isLocatorMinimized);
                  }}
                  className="p-1.5 hover:bg-[#141414]/5 dark:hover:bg-white/5 rounded-full text-[#141414] dark:text-white opacity-60 hover:opacity-100 transition-all cursor-pointer"
                  title={isLocatorMinimized ? "Maximise Locator" : "Minimise Locator"}
                >
                  {isLocatorMinimized ? (
                    <Maximize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Minimize2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Locator Body Dropdowns, hidden when minimized */}
            {!isLocatorMinimized && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {/* Continent Dropdown */}
                <div className="space-y-1">
                  <label className="text-[8px] uppercase tracking-wider font-bold opacity-40 block">Continent</label>
                  <div className="relative">
                    <select
                      value={locatorContinent}
                      onChange={(e) => {
                        setLocatorContinent(e.target.value);
                        setLocatorCountry('');
                        setLocatorState('');
                        setLocatorLandmarkId('');
                      }}
                      className="w-full bg-[#141414]/5 dark:bg-white/5 hover:bg-[#141414]/10 dark:hover:bg-white/10 text-[11px] font-medium border-0 outline-none rounded-xl py-2 px-2.5 cursor-pointer appearance-none text-[#141414] dark:text-white transition-all pr-6"
                    >
                      <option value="" className="text-gray-600 dark:text-gray-400">All Continents</option>
                      {availableContinents.map(c => (
                        <option key={c} value={c} className="text-black dark:text-white bg-white dark:bg-[#141414]">{c}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-30" />
                  </div>
                </div>

                {/* Country Dropdown */}
                <div className="space-y-1">
                  <label className="text-[8px] uppercase tracking-wider font-bold opacity-40 block">Country</label>
                  <div className="relative">
                    <select
                      value={locatorCountry}
                      onChange={(e) => {
                        setLocatorCountry(e.target.value);
                        setLocatorState('');
                        setLocatorLandmarkId('');
                      }}
                      className="w-full bg-[#141414]/5 dark:bg-white/5 hover:bg-[#141414]/10 dark:hover:bg-white/10 text-[11px] font-medium border-0 outline-none rounded-xl py-2 px-2.5 cursor-pointer appearance-none text-[#141414] dark:text-white transition-all pr-6"
                    >
                      <option value="" className="text-gray-600 dark:text-gray-400">All Countries</option>
                      {availableCountries.map(c => (
                        <option key={c} value={c} className="text-black dark:text-white bg-white dark:bg-[#141414]">{c}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-30" />
                  </div>
                </div>

                {/* State/Region Dropdown */}
                <div className="space-y-1">
                  <label className="text-[8px] uppercase tracking-wider font-bold opacity-40 block">State/Region</label>
                  <div className="relative">
                    <select
                      value={locatorState}
                      onChange={(e) => {
                        setLocatorState(e.target.value);
                        setLocatorLandmarkId('');
                      }}
                      className="w-full bg-[#141414]/5 dark:bg-white/5 hover:bg-[#141414]/10 dark:hover:bg-white/10 text-[11px] font-medium border-0 outline-none rounded-xl py-2 px-2.5 cursor-pointer appearance-none text-[#141414] dark:text-white transition-all pr-6"
                    >
                      <option value="" className="text-gray-600 dark:text-gray-400">All States</option>
                      {availableStates.map(s => (
                        <option key={s} value={s} className="text-black dark:text-white bg-white dark:bg-[#141414]">{s}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-30" />
                  </div>
                </div>

                {/* Landmark Dropdown */}
                <div className="space-y-1">
                  <label className="text-[8px] uppercase tracking-wider font-bold opacity-40 block">Place / Landmark</label>
                  <div className="relative">
                    <select
                      value={locatorLandmarkId}
                      onChange={(e) => handleLocatorSelectLandmark(e.target.value)}
                      className="w-full bg-[#141414]/5 dark:bg-white/5 hover:bg-[#141414]/10 dark:hover:bg-white/10 text-[11px] font-medium border-0 outline-none rounded-xl py-2 px-2.5 cursor-pointer appearance-none text-[#141414] dark:text-white transition-all pr-6"
                    >
                      <option value="" className="text-gray-600 dark:text-gray-400">Select Place...</option>
                      {availableLandmarks.map(l => (
                        <option key={l.id} value={l.id} className="text-black dark:text-white bg-white dark:bg-[#141414]">{l.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-30" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function continentCenter(continent: string | null): { lat: number, lng: number } {
  switch (continent) {
    case "Africa": return { lat: 8.7832, lng: 34.5085 };
    case "Asia": return { lat: 34.0479, lng: 100.6197 };
    case "Europe": return { lat: 54.5260, lng: 15.2551 };
    case "North America": return { lat: 54.5260, lng: -105.2551 };
    case "South America": return { lat: -8.7832, lng: -55.4915 };
    case "Oceania": return { lat: -22.7359, lng: 140.0188 };
    case "Antarctica": return { lat: -82.8628, lng: 135.0000 };
    default: return { lat: 20, lng: 0 };
  }
}
