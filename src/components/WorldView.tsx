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
  Hotel,
  Target,
  Send,
  Train,
  Anchor,
  Eye,
  EyeOff,
  Moon,
  Bike,
  Building,
  Flame,
  Wind
} from 'lucide-react';
import { Continent } from '../App.tsx';
import ImmersiveGlobeCanvas, { GlobeLocation } from './ImmersiveGlobeCanvas.tsx';
import GoogleMapsApp from './GoogleMapsApp.tsx';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasMapsKey = Boolean(GOOGLE_MAPS_KEY) && 
                   GOOGLE_MAPS_KEY.trim() !== '' && 
                   GOOGLE_MAPS_KEY !== 'YOUR_API_KEY' && 
                   GOOGLE_MAPS_KEY !== 'placeholder';

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
  const [mapEngine, setMapEngine] = useState<'google' | 'leaflet'>('leaflet');
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
  const tileLayersRef = useRef<L.TileLayer[]>([]);

  // Google Maps Style Map Details toggles
  const [showPublicTransport, setShowPublicTransport] = useState<boolean>(false);
  const [showTraffic, setShowTraffic] = useState<boolean>(false);
  const [showBicycling, setShowBicycling] = useState<boolean>(false);
  const [showRaisedBuildings, setShowRaisedBuildings] = useState<boolean>(false);
  const [showStreetView, setShowStreetView] = useState<boolean>(false);
  const [showWildfires, setShowWildfires] = useState<boolean>(false);
  const [showAirQuality, setShowAirQuality] = useState<boolean>(false);

  // Overlay layer references
  const overlayLayersRef = useRef<L.Layer[]>([]);

  const [leafletMapStyle, setLeafletMapStyle] = useState<'roadmap' | 'hybrid' | 'terrain' | 'dark' | 'osm'>('roadmap');
  const [leafletShowLabels, setLeafletShowLabels] = useState<boolean>(true);
  const [leafletShowBorders, setLeafletShowBorders] = useState<boolean>(true);
  const [leafletShowRailways, setLeafletShowRailways] = useState<boolean>(false);
  const [leafletShowSeaMap, setLeafletShowSeaMap] = useState<boolean>(false);
  const [bottomSheetOpen, setBottomSheetOpen] = useState<boolean>(false);
  const [bottomSheetHeight, setBottomSheetHeight] = useState<number>(450);

  const isDraggingRef = useRef<boolean>(false);
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);

  const handleDragStart = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startYRef.current = clientY;
    startHeightRef.current = bottomSheetHeight;
    document.body.style.userSelect = 'none';
  }, [bottomSheetHeight]);

  useEffect(() => {
    const handleDragMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const deltaY = clientY - startYRef.current;
      // Dragging UP (negative deltaY) increases bottom sheet height
      const newHeight = Math.max(180, Math.min(window.innerHeight * 0.85, startHeightRef.current - deltaY));
      setBottomSheetHeight(newHeight);
    };

    const handleDragEnd = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleDragMove, { passive: false });
    window.addEventListener('touchend', handleDragEnd);

    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, []);

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

  // Reset marker/polyline references when mapInstance changes to avoid referencing elements of a destroyed map
  useEffect(() => {
    markersRef.current = {};
    polylineRef.current = null;
  }, [mapInstance]);

  // Callback ref to handle initialization and destruction of Leaflet cleanly
  const handleMapRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      // Clear leaflet ID on DOM node if it was previously initialized to prevent container reuse issues
      if ((node as any)._leaflet_id) {
        try {
          delete (node as any)._leaflet_id;
        } catch (e) {
          (node as any)._leaflet_id = null;
        }
      }

      // If mapRef already exists, safely destroy it before creating a new one
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          console.error("Failed to remove old mapRef:", e);
        }
        mapRef.current = null;
      }

      try {
        const map = L.map(node, {
          center: [mapCenterRef.current.lat, mapCenterRef.current.lng],
          zoom: zoomRef.current,
          zoomControl: false,
          attributionControl: false
        });

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
      } catch (err) {
        console.error("Leaflet map initialization crash prevented:", err);
      }
    } else {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          console.error("Failed to remove mapRef on unmount:", e);
        }
        mapRef.current = null;
        setMapInstance(null);
        markersRef.current = {};
        polylineRef.current = null;
        tileLayersRef.current = [];
      }
    }
  }, []);

  // Sync Leaflet tile layers dynamically
  useEffect(() => {
    if (!mapInstance) return;

    // Remove existing tile layers safely
    tileLayersRef.current.forEach(layer => {
      try {
        if (mapInstance.hasLayer(layer)) {
          mapInstance.removeLayer(layer);
        } else {
          layer.remove();
        }
      } catch (e) {
        console.error("Failed to safely remove Leaflet tile layer:", e);
      }
    });
    tileLayersRef.current = [];

    const newLayers: L.TileLayer[] = [];

    // 1. Base Layer Selection
    if (leafletMapStyle === 'hybrid') {
      const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      });
      newLayers.push(satelliteLayer);
    } else if (leafletMapStyle === 'terrain') {
      const terrainLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 13,
        attribution: 'Tiles &copy; Esri'
      });
      newLayers.push(terrainLayer);
    } else if (leafletMapStyle === 'dark') {
      const darkLayer = L.tileLayer(
        leafletShowLabels 
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' 
          : 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', 
        {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        }
      );
      newLayers.push(darkLayer);
    } else if (leafletMapStyle === 'osm') {
      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      });
      newLayers.push(osmLayer);
    } else {
      // roadmap / Light
      const defaultLayer = L.tileLayer(
        leafletShowLabels 
          ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png' 
          : 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', 
        {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        }
      );
      newLayers.push(defaultLayer);
    }

    // 2. Add Place Labels Overlay for Satellite/Terrain/OSM (if labels toggle is active)
    if (leafletShowLabels && (leafletMapStyle === 'hybrid' || leafletMapStyle === 'terrain')) {
      const labelsLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      });
      newLayers.push(labelsLayer);
    }

    // 3. Add Political Boundaries/Borders Overlay if toggled
    if (leafletShowBorders) {
      const bordersLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        opacity: 0.8
      });
      newLayers.push(bordersLayer);
    }

    // 4. Add Railways Route Layer if toggled
    if (leafletShowRailways) {
      const railLayer = L.tileLayer('https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Map style: &copy; <a href="https://www.openrailwaymap.org/">OpenRailwayMap</a>'
      });
      newLayers.push(railLayer);
    }

    // 5. Add Sea Marks Layer if toggled
    if (leafletShowSeaMap) {
      const seaLayer = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="http://www.openseamap.org">OpenSeaMap</a> contributors'
      });
      newLayers.push(seaLayer);
    }

    // Apply layers to map
    newLayers.forEach(layer => {
      try {
        layer.addTo(mapInstance);
        tileLayersRef.current.push(layer);
      } catch (e) {
        console.error("Failed to add new Leaflet tile layer:", e);
      }
    });
  }, [mapInstance, leafletMapStyle, leafletShowLabels, leafletShowBorders, leafletShowRailways, leafletShowSeaMap]);

  // Synchronize Google Maps Style detailed layers & overlays on Leaflet
  useEffect(() => {
    if (!mapInstance || viewType === 'globe') return;

    // 1. Remove all old detailed overlay layers
    overlayLayersRef.current.forEach(layer => {
      try {
        if (mapInstance.hasLayer(layer)) {
          mapInstance.removeLayer(layer);
        }
      } catch (e) {
        console.error("Failed to remove Leaflet overlay layer:", e);
      }
    });
    overlayLayersRef.current = [];

    const newOverlays: L.Layer[] = [];

    // --- BICYCLING LAYER ---
    if (showBicycling) {
      const bicLayer = L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', {
        maxZoom: 19,
        opacity: 0.6
      });
      newOverlays.push(bicLayer);
    }

    // --- AIR QUALITY INDEX ---
    if (showAirQuality) {
      const aqLayer = L.tileLayer('https://tiles.waqi.info/tiles/usepa-aqi/{z}/{x}/{y}.png?token=demo', {
        maxZoom: 19,
        opacity: 0.8
      });
      newOverlays.push(aqLayer);
    }

    // --- PUBLIC TRANSPORT ---
    if (showPublicTransport) {
      // Draw simulated transit lines
      const line1Coords: [number, number][] = [
        [syncedCenter.lat - 0.015, syncedCenter.lng - 0.012],
        [syncedCenter.lat - 0.005, syncedCenter.lng - 0.003],
        [syncedCenter.lat + 0.005, syncedCenter.lng + 0.004],
        [syncedCenter.lat + 0.015, syncedCenter.lng + 0.012]
      ];
      const transitLine1 = L.polyline(line1Coords, {
        color: '#2563eb',
        weight: 5,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round'
      });
      newOverlays.push(transitLine1);

      const line2Coords: [number, number][] = [
        [syncedCenter.lat - 0.012, syncedCenter.lng + 0.012],
        [syncedCenter.lat - 0.002, syncedCenter.lng + 0.002],
        [syncedCenter.lat + 0.008, syncedCenter.lng - 0.008],
        [syncedCenter.lat + 0.018, syncedCenter.lng - 0.018]
      ];
      const transitLine2 = L.polyline(line2Coords, {
        color: '#ea580c',
        weight: 5,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round'
      });
      newOverlays.push(transitLine2);

      // Transit station markers
      const stations = [
        { name: 'Central Interchange Hub', lat: syncedCenter.lat - 0.005, lng: syncedCenter.lng - 0.003, lines: ['Blue Line', 'Orange Line'], type: 'Metro' },
        { name: 'East Plaza Station', lat: syncedCenter.lat - 0.012, lng: syncedCenter.lng + 0.012, lines: ['Orange Line'], type: 'Metro' },
        { name: 'North Boulevard Terminal', lat: syncedCenter.lat + 0.005, lng: syncedCenter.lng + 0.004, lines: ['Blue Line', 'Bus Route 10'], type: 'Bus & Rail' }
      ];

      stations.forEach(st => {
        const stationIcon = L.divIcon({
          className: 'custom-transit-marker',
          html: `
            <div class="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white shadow-md border-2 border-white transition-transform hover:scale-110">
              <svg style="width: 14px; height: 14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="4" y="2" width="16" height="16" rx="2"/>
                <line x1="6" y1="22" x2="6" y2="18"/>
                <line x1="18" y1="22" x2="18" y2="18"/>
              </svg>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        const marker = L.marker([st.lat, st.lng], { icon: stationIcon });
        marker.bindPopup(`
          <div class="p-2 font-sans min-w-[150px]">
            <div class="flex items-center gap-1 mb-1">
              <span class="px-1 py-0.5 bg-blue-100 text-blue-800 text-[8px] font-black uppercase rounded">${st.type}</span>
              <h5 class="text-xs font-black text-stone-900">${st.name}</h5>
            </div>
            <p class="text-[9px] text-stone-600 mb-1">Serving: <strong>${st.lines.join(', ')}</strong></p>
            <p class="text-[9px] text-emerald-600 font-bold flex items-center gap-1">
              <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
              On Time & On Service
            </p>
          </div>
        `);
        newOverlays.push(marker);
      });
    }

    // --- TRAFFIC FLOW ---
    if (showTraffic) {
      const trafficPaths = [
        {
          coords: [
            [syncedCenter.lat - 0.012, syncedCenter.lng + 0.003],
            [syncedCenter.lat - 0.002, syncedCenter.lng + 0.003],
            [syncedCenter.lat + 0.008, syncedCenter.lng + 0.003]
          ],
          color: '#ef4444', // Red
          label: 'Heavy Delay (11m delay)'
        },
        {
          coords: [
            [syncedCenter.lat - 0.014, syncedCenter.lng - 0.008],
            [syncedCenter.lat - 0.004, syncedCenter.lng - 0.008],
            [syncedCenter.lat + 0.006, syncedCenter.lng - 0.008]
          ],
          color: '#f59e0b', // Yellow
          label: 'Slow Flow (4m delay)'
        },
        {
          coords: [
            [syncedCenter.lat - 0.016, syncedCenter.lng - 0.002],
            [syncedCenter.lat - 0.006, syncedCenter.lng - 0.002],
            [syncedCenter.lat + 0.004, syncedCenter.lng - 0.002],
            [syncedCenter.lat + 0.014, syncedCenter.lng - 0.002]
          ],
          color: '#22c55e', // Green
          label: 'Normal Flow (Clear)'
        }
      ];

      trafficPaths.forEach(path => {
        const outerLine = L.polyline(path.coords as [number, number][], {
          color: path.color,
          weight: 6,
          opacity: 0.85,
          lineCap: 'round'
        });
        const innerLine = L.polyline(path.coords as [number, number][], {
          color: '#ffffff',
          weight: 2,
          opacity: 0.9,
          dashArray: '5, 8',
          lineCap: 'round'
        });

        outerLine.bindPopup(`<div class="p-1 font-sans text-xs font-bold text-stone-800">${path.label}</div>`);
        newOverlays.push(outerLine, innerLine);
      });
    }

    // --- RAISED BUILDINGS (3D ISOMETRIC BLOCKS) ---
    if (showRaisedBuildings) {
      // Let's draw realistic 3D buildings around the landmarks
      locations.forEach(loc => {
        const dist = Math.sqrt(Math.pow(loc.lat - syncedCenter.lat, 2) + Math.pow(loc.lng - syncedCenter.lng, 2));
        if (dist < 0.04) { // Only nearby landmarks
          const lat = loc.lat;
          const lng = loc.lng;

          // Building 1 - Main Landmark extrusion
          const base: [number, number][] = [
            [lat - 0.0003, lng - 0.0004],
            [lat - 0.0003, lng + 0.0004],
            [lat + 0.0003, lng + 0.0004],
            [lat + 0.0003, lng - 0.0004],
            [lat - 0.0003, lng - 0.0004]
          ];
          // Extruded roof offset
          const roof: [number, number][] = [
            [lat + 0.0002, lng + 0.0002],
            [lat + 0.0002, lng + 0.0010],
            [lat + 0.0008, lng + 0.0010],
            [lat + 0.0008, lng + 0.0002],
            [lat + 0.0002, lng + 0.0002]
          ];

          const wall1: [number, number][] = [base[0], base[1], roof[1], roof[0], base[0]];
          const wall2: [number, number][] = [base[1], base[2], roof[2], roof[1], base[1]];

          const basePoly = L.polygon(base, { fillColor: '#78716c', color: '#57534e', weight: 1, fillOpacity: 0.35 });
          const wall1Poly = L.polygon(wall1, { fillColor: '#a8a29e', color: '#78716c', weight: 1, fillOpacity: 0.65 });
          const wall2Poly = L.polygon(wall2, { fillColor: '#d6d3d1', color: '#a8a29e', weight: 1, fillOpacity: 0.75 });
          const roofPoly = L.polygon(roof, { fillColor: '#e7e5e4', color: '#a8a29e', weight: 1, fillOpacity: 0.9 });

          roofPoly.bindPopup(`<div class="p-1 font-sans text-xs font-bold text-stone-800">3D Landmark Envelope: ${loc.name}</div>`);
          newOverlays.push(basePoly, wall1Poly, wall2Poly, roofPoly);
        }
      });
    }

    // --- STREET VIEW (BLUE LINES & PEGMAN INTERACTIVE) ---
    if (showStreetView) {
      // Blue lines
      const streetLines = [
        [
          [syncedCenter.lat - 0.015, syncedCenter.lng - 0.005],
          [syncedCenter.lat + 0.015, syncedCenter.lng - 0.005]
        ],
        [
          [syncedCenter.lat - 0.005, syncedCenter.lng - 0.015],
          [syncedCenter.lat - 0.005, syncedCenter.lng + 0.015]
        ]
      ];

      streetLines.forEach(line => {
        const svLine = L.polyline(line as [number, number][], {
          color: '#3b82f6',
          weight: 4,
          opacity: 0.75
        });
        newOverlays.push(svLine);
      });

      // Interactive Pegman cameras
      locations.forEach(loc => {
        const dist = Math.sqrt(Math.pow(loc.lat - syncedCenter.lat, 2) + Math.pow(loc.lng - syncedCenter.lng, 2));
        if (dist < 0.04) {
          const pegmanIcon = L.divIcon({
            className: 'custom-pegman-marker',
            html: `
              <div class="relative flex items-center justify-center">
                <div class="absolute w-8 h-8 rounded-full bg-yellow-400/30 animate-pulse"></div>
                <div class="w-7 h-7 rounded-full bg-yellow-400 border-2 border-white flex items-center justify-center text-stone-900 shadow-md transition-transform hover:scale-120">
                  <svg style="width: 14px; height: 14px;" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="2.5" />
                    <path d="M12 8.5c-1.5 0-3 1-3 3v5c0 .5.5 1 1 1h1v4c0 .5.5 1 1 1s1-.5 1-1v-4h1c.5 0 1-.5 1-1v-5c0-2-1.5-3-3-3z" />
                  </svg>
                </div>
              </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          });

          const marker = L.marker([loc.lat, loc.lng], { icon: pegmanIcon });
          marker.on('click', () => {
            const defaultImages = [
              '/images/taj_mahal.png',
              '/images/hawa_mahal.png',
              '/images/varanasi.png',
              '/images/kerala.png'
            ];
            // Assign image index based on name
            let img = defaultImages[0];
            if (loc.name.toLowerCase().includes('hawa')) img = defaultImages[1];
            else if (loc.name.toLowerCase().includes('varanasi') || loc.name.toLowerCase().includes('ghat')) img = defaultImages[2];
            else if (loc.name.toLowerCase().includes('kerala') || loc.name.toLowerCase().includes('backwaters')) img = defaultImages[3];
            else {
              // fallback based on char code
              img = defaultImages[loc.name.charCodeAt(0) % defaultImages.length];
            }

            setActiveStreetViewPano({
              name: loc.name,
              imageUrl: img
            });
          });
          newOverlays.push(marker);
        }
      });
    }

    // --- WILDFIRES ---
    if (showWildfires) {
      // Place a simulated fire point offset from center
      const fireCenter: [number, number] = [syncedCenter.lat + 0.012, syncedCenter.lng - 0.015];
      const fireCircle = L.circle(fireCenter, {
        radius: 800,
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.25,
        weight: 1.5
      });
      newOverlays.push(fireCircle);

      const wildfireIcon = L.divIcon({
        className: 'custom-wildfire-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-10 h-10 rounded-full bg-red-600/20 animate-ping"></div>
            <div class="w-8 h-8 rounded-full bg-red-600 border-2 border-white flex items-center justify-center text-white shadow-lg">
              <svg style="width: 14px; height: 14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
              </svg>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const fireMarker = L.marker(fireCenter, { icon: wildfireIcon });
      fireMarker.bindPopup(`
        <div class="p-2 font-sans min-w-[150px]">
          <div class="flex items-center gap-1.5 mb-1 text-red-600 font-bold">
            <svg style="width: 12px; height: 12px;" fill="currentColor" viewBox="0 0 24 24"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
            <span class="text-xs">Active Wildfire Alert</span>
          </div>
          <p class="text-[10px] text-stone-600 mb-1"><strong>Sector:</strong> Forest Foothills</p>
          <p class="text-[9px] text-stone-500 mb-0.5"><strong>Containment:</strong> 45%</p>
          <p class="text-[9px] text-stone-500"><strong>Threat:</strong> High risk category</p>
        </div>
      `);
      newOverlays.push(fireMarker);
    }

    // Add all to map and track in ref for future cleanup
    newOverlays.forEach(layer => {
      try {
        layer.addTo(mapInstance);
        overlayLayersRef.current.push(layer);
      } catch (err) {
        console.error("Failed to add detailed overlay to Leaflet:", err);
      }
    });

  }, [
    mapInstance,
    viewType,
    syncedCenter,
    locations,
    showBicycling,
    showAirQuality,
    showPublicTransport,
    showTraffic,
    showRaisedBuildings,
    showStreetView,
    showWildfires
  ]);

  const [activeStreetViewPano, setActiveStreetViewPano] = useState<{ name: string, imageUrl: string } | null>(null);

  // Handle locate user GPS
  const handleLocateMe = () => {
    if (!mapInstance) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          mapInstance.setView([userPos.lat, userPos.lng], 15, { animate: true });
        },
        () => {
          alert("Permission to access Geolocation was denied.");
        }
      );
    }
  };

  // Update map view on syncedCenter/syncedZoom changes
  useEffect(() => {
    if (mapInstance && (mapEngine === 'leaflet' || (mapEngine === 'google' && !hasMapsKey))) {
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

        {/* 3. Search Bar */}
        {viewType !== 'globe' && (
          <div className="bg-white dark:bg-[#141414] rounded-full border border-stone-200/60 dark:border-stone-800 shadow-lg px-4 py-2 flex items-center gap-2 pointer-events-auto transition-all focus-within:ring-2 focus-within:ring-blue-500/50 w-full animate-fade-in">
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
            <Mic className="w-4 h-4 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 shrink-0 cursor-pointer transition-colors" />
            <span className="h-4 w-[1px] bg-stone-200 dark:bg-stone-800 mx-1 shrink-0" />
            <button className="text-blue-600 hover:text-blue-700 shrink-0 transition-all p-1 hover:scale-105 active:scale-95">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" className="rotate-45 -translate-x-0.5 translate-y-0.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </div>
        )}

        {/* 4. Category Pills */}
        {viewType !== 'globe' && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 pointer-events-auto w-full animate-fade-in justify-between">
            <button
              onClick={() => setActiveCategory('all')}
              className={`flex-1 text-center py-2 px-2 rounded-full text-[8.5px] font-black uppercase tracking-wider border shadow-sm shrink-0 transition-all flex items-center justify-center gap-1 ${
                activeCategory === 'all'
                  ? 'bg-blue-600 border-blue-500 text-white font-black'
                  : 'bg-white dark:bg-[#141414] border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-900'
              }`}
            >
              <Compass className={`w-3.5 h-3.5 shrink-0 ${activeCategory === 'all' ? 'text-emerald-300' : 'text-emerald-550'}`} />
              <span>ALL LANDMARKS</span>
            </button>
            
            <button
              onClick={() => setActiveCategory('restaurant')}
              className={`flex-1 text-center py-2 px-2 rounded-full text-[8.5px] font-black uppercase tracking-wider border shadow-sm shrink-0 transition-all flex items-center justify-center gap-1 ${
                activeCategory === 'restaurant'
                  ? 'bg-blue-600 border-blue-500 text-white font-black'
                  : 'bg-white dark:bg-[#141414] border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-900'
              }`}
            >
              <Utensils className={`w-3.5 h-3.5 shrink-0 ${activeCategory === 'restaurant' ? 'text-white' : 'text-orange-500'}`} />
              <span>RESTAURANTS</span>
            </button>
            
            <button
              onClick={() => setActiveCategory('hotel')}
              className={`flex-1 text-center py-2 px-2 rounded-full text-[8.5px] font-black uppercase tracking-wider border shadow-sm shrink-0 transition-all flex items-center justify-center gap-1 ${
                activeCategory === 'hotel'
                  ? 'bg-blue-600 border-blue-500 text-white font-black'
                  : 'bg-white dark:bg-[#141414] border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-900'
              }`}
            >
              <Hotel className={`w-3.5 h-3.5 shrink-0 ${activeCategory === 'hotel' ? 'text-white' : 'text-blue-500'}`} />
              <span>HOTELS</span>
            </button>
            
            <button
              onClick={() => setActiveCategory('hospital')}
              className={`flex-1 text-center py-2 px-2 rounded-full text-[8.5px] font-black uppercase tracking-wider border shadow-sm shrink-0 transition-all flex items-center justify-center gap-1 ${
                activeCategory === 'hospital'
                  ? 'bg-blue-600 border-blue-500 text-white font-black'
                  : 'bg-white dark:bg-[#141414] border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-900'
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7.5px] font-black shrink-0 ${activeCategory === 'hospital' ? 'bg-white text-red-600' : 'bg-red-500 text-white'}`}>H</div>
              <span>HOSPITALS</span>
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
          {mapEngine === 'google' && hasMapsKey ? (
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
              isEmbedded={true}
            />
          ) : (
            <div className="relative w-full h-full">
              <div key={mapEngine} ref={handleMapRef} className="w-full h-full z-0" />
              {mapEngine === 'google' && !hasMapsKey && (
                <div className="absolute top-4 right-4 z-[400] bg-black/75 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-400 shadow-xl pointer-events-none flex items-center gap-1.5 animate-fade-in">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Leaflet Hybrid Satellite</span>
                </div>
              )}

              {/* Floating Layers & Geolocation Controls for Leaflet */}
              <div className="absolute right-4 bottom-24 z-[400] flex flex-col gap-2.5 pointer-events-auto">
                <button
                  onClick={() => setBottomSheetOpen(!bottomSheetOpen)}
                  className="bg-white hover:bg-stone-50 dark:bg-[#141414] dark:hover:bg-stone-900 text-stone-800 dark:text-white shadow-2xl border border-stone-200 dark:border-stone-800 hover:scale-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center w-11 h-11 rounded-xl"
                  title="Open Map Style Settings"
                >
                  <Layers className="w-5 h-5 text-blue-500" />
                </button>

                <button 
                  onClick={handleLocateMe}
                  className="bg-white hover:bg-stone-50 text-stone-800 dark:bg-[#141414] dark:text-white shadow-lg border border-stone-200 dark:border-stone-800 hover:scale-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center w-11 h-11 rounded-xl"
                  title="Zoom to My Location"
                >
                  <Navigation className="w-5 h-5 rotate-45 text-stone-700 dark:text-stone-300" />
                </button>
              </div>

              {/* Widescreen Interactive Street View Panel */}
              <AnimatePresence>
                {activeStreetViewPano && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 50 }}
                    className="absolute bottom-24 left-6 right-6 md:left-auto md:w-[420px] bg-stone-950/95 text-white rounded-3xl overflow-hidden shadow-2xl border border-white/10 z-[600] flex flex-col pointer-events-auto"
                  >
                    <div className="p-4 flex items-center justify-between border-b border-white/10 bg-black/40">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center text-stone-950">
                          <svg style={{ width: '12px', height: '12px' }} viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="5" r="2.5" />
                            <path d="M12 8.5c-1.5 0-3 1-3 3v5c0 .5.5 1 1 1h1v4c0 .5.5 1 1 1s1-.5 1-1v-4h1c.5 0 1-.5 1-1v-5c0-2-1.5-3-3-3z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-[11px] font-black tracking-wider uppercase">Street View Panoramic Tour</h4>
                          <p className="text-[9px] text-stone-400 leading-none truncate max-w-[240px]">{activeStreetViewPano.name}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveStreetViewPano(null)}
                        className="p-1 hover:bg-white/10 rounded-full text-stone-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="relative aspect-video w-full overflow-hidden bg-stone-900">
                      <img
                        src={activeStreetViewPano.imageUrl}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        alt="Panoramic look"
                      />

                      {/* Directional navigation arrows overlaid on screen */}
                      <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-2 pointer-events-none">
                        <button 
                          className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-white/10 backdrop-blur-sm pointer-events-auto transition-transform active:scale-90 text-xs font-bold"
                          title="Look Left"
                        >
                          &larr;
                        </button>
                        <span className="px-3 py-1 rounded-full bg-black/60 text-[9px] font-bold text-yellow-400 uppercase tracking-widest border border-white/10 backdrop-blur-sm pointer-events-auto">
                          Interactive
                        </span>
                        <button 
                          className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-white/10 backdrop-blur-sm pointer-events-auto transition-transform active:scale-90 text-xs font-bold"
                          title="Look Right"
                        >
                          &rarr;
                        </button>
                      </div>

                      {/* Compass visual indicator */}
                      <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 border border-white/20 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                        <div className="w-0.5 h-4 bg-red-500 rounded-full origin-bottom rotate-45 transform animate-pulse" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom Sheet for Style & Layers Selection */}
              <AnimatePresence>
                {bottomSheetOpen && (
                  <>
                    <div 
                      className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[450] pointer-events-auto"
                      onClick={() => setBottomSheetOpen(false)}
                    />
                    <motion.div
                      initial={{ y: '100%' }}
                      animate={{ y: 0 }}
                      exit={{ y: '100%' }}
                      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                      style={{ height: `${bottomSheetHeight}px` }}
                      className="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-[#141414]/95 backdrop-blur-xl rounded-t-[36px] shadow-3xl border-t border-stone-200/80 dark:border-stone-800 z-[500] flex flex-col max-h-[85%] pointer-events-auto overflow-hidden text-stone-800 dark:text-stone-200"
                    >
                      <div 
                        onMouseDown={handleDragStart}
                        onTouchStart={handleDragStart}
                        className="w-full py-3 cursor-ns-resize flex items-center justify-center shrink-0 hover:bg-stone-500/5 dark:hover:bg-stone-500/10 transition-colors"
                        title="Drag up or down to resize"
                      >
                        <div className="w-12 h-1 bg-stone-300 dark:bg-stone-700 rounded-full" />
                      </div>

                      <div className="px-6 pb-3 border-b border-stone-100 dark:border-stone-800/80 flex items-center justify-between shrink-0">
                        <h3 className="text-lg font-bold text-stone-900 dark:text-white font-sans">Map type</h3>
                        <button
                          onClick={() => setBottomSheetOpen(false)}
                          className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="p-6 overflow-y-auto space-y-6 no-scrollbar">
                        {/* Map Type Grid */}
                        <div>
                          <div className="flex items-center gap-5 overflow-x-auto no-scrollbar pb-1">
                            {[
                              { 
                                id: 'roadmap', 
                                name: 'Default', 
                                renderThumbnail: () => (
                                  <svg viewBox="0 0 72 72" className="w-full h-full">
                                    <rect width="72" height="72" fill="#e8ece9" />
                                    <path d="M 0 0 L 30 0 L 25 20 L 0 15 Z" fill="#d0ebd4" />
                                    <path d="M 45 40 L 72 35 L 72 72 L 40 72 Z" fill="#d0ebd4" />
                                    <path d="M 0 50 Q 15 55 25 45 T 50 60 T 72 50 L 72 72 L 0 72 Z" fill="#c3e4f5" opacity="0.8" />
                                    <path d="M 10 0 L 10 72" stroke="#ffffff" strokeWidth="4" />
                                    <path d="M 0 35 L 72 35" stroke="#ffffff" strokeWidth="4" />
                                    <path d="M 0 15 L 72 55" stroke="#ffeb3b" strokeWidth="3" />
                                    <path d="M 0 15 L 72 55" stroke="#f57c00" strokeWidth="1" />
                                  </svg>
                                )
                              },
                              { 
                                id: 'hybrid', 
                                name: 'Satellite', 
                                renderThumbnail: () => (
                                  <svg viewBox="0 0 72 72" className="w-full h-full">
                                    <rect width="72" height="72" fill="#2d3a24" />
                                    <path d="M 5 10 C 20 5, 30 25, 15 35 Z" fill="#1b2a12" opacity="0.8" />
                                    <path d="M 40 45 C 55 35, 68 55, 50 65 Z" fill="#1b2a12" opacity="0.8" />
                                    <path d="M 50 5 L 68 8 L 65 25 L 48 20 Z" fill="#425a32" />
                                    <path d="M 2 45 L 20 48 L 15 65 L 0 60 Z" fill="#3c4e2e" />
                                    <path d="M 0 30 Q 18 35 28 22 T 55 40 T 72 28" fill="none" stroke="#1d2d44" strokeWidth="3" opacity="0.6" />
                                    <path d="M 0 15 L 72 55" stroke="#ffffff" strokeWidth="2" opacity="0.5" />
                                    <path d="M 0 15 L 72 55" stroke="#90a4ae" strokeWidth="1" />
                                  </svg>
                                )
                              },
                              { 
                                id: 'terrain', 
                                name: 'Terrain', 
                                renderThumbnail: () => (
                                  <svg viewBox="0 0 72 72" className="w-full h-full">
                                    <rect width="72" height="72" fill="#dfd6ca" />
                                    <path d="M 0 72 Q 25 35 45 45 T 72 20 L 72 72 Z" fill="#c3baaa" />
                                    <path d="M 0 72 Q 15 50 30 55 T 60 40 T 72 35 L 72 72 Z" fill="#aa9f8f" />
                                    <path d="M 0 60 Q 20 30 40 40 T 72 15" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.5" />
                                    <path d="M 0 45 Q 25 20 45 25 T 72 5" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.3" />
                                    <path d="M 0 68 Q 15 40 30 45 T 60 30 T 72 25" fill="none" stroke="#8d7d6c" strokeWidth="0.8" opacity="0.4" />
                                    <path d="M 0 72 L 20 60 L 40 68 L 72 55 L 72 72 Z" fill="#ccdcb9" opacity="0.4" />
                                  </svg>
                                )
                              },
                              { 
                                id: 'dark', 
                                name: 'Midnight', 
                                renderThumbnail: () => (
                                  <svg viewBox="0 0 72 72" className="w-full h-full">
                                    <rect width="72" height="72" fill="#121212" />
                                    <path d="M 10 0 L 10 72" stroke="#1f1f1f" strokeWidth="4" />
                                    <path d="M 0 35 L 72 35" stroke="#1f1f1f" strokeWidth="4" />
                                    <path d="M 0 15 L 72 55" stroke="#37474f" strokeWidth="3" />
                                    <path d="M 0 15 L 72 55" stroke="#00e5ff" strokeWidth="1" opacity="0.8" />
                                    <circle cx="35" cy="35" r="4" fill="#00e5ff" opacity="0.7" />
                                  </svg>
                                )
                              },
                              { 
                                id: 'osm', 
                                name: 'OpenStreet', 
                                renderThumbnail: () => (
                                  <svg viewBox="0 0 72 72" className="w-full h-full">
                                    <rect width="72" height="72" fill="#f4f3f0" />
                                    <path d="M 0 0 L 30 0 L 25 20 L 0 15 Z" fill="#d8edd6" />
                                    <path d="M 45 40 L 72 35 L 72 72 L 40 72 Z" fill="#d8edd6" />
                                    <path d="M 10 0 L 10 72" stroke="#f2bc88" strokeWidth="3.5" />
                                    <path d="M 0 35 L 72 35" stroke="#f2bc88" strokeWidth="3.5" />
                                    <path d="M 0 15 L 72 55" stroke="#e08282" strokeWidth="2.5" />
                                  </svg>
                                )
                              }
                            ].map((type) => {
                              const isSelected = leafletMapStyle === type.id;
                              return (
                                <button
                                  key={type.id}
                                  onClick={() => setLeafletMapStyle(type.id as any)}
                                  className="flex flex-col items-center gap-1 focus:outline-none cursor-pointer group shrink-0"
                                >
                                  <div className={`p-[2.5px] rounded-[18px] transition-all ${
                                    isSelected 
                                      ? 'border-[3px] border-[#107c85] scale-[1.03] shadow-md' 
                                      : 'border-[3px] border-transparent hover:scale-[1.02]'
                                  }`}>
                                    <div className="w-[66px] h-[66px] rounded-[14px] relative flex items-center justify-center overflow-hidden border border-stone-200/60 dark:border-stone-800">
                                      {type.renderThumbnail()}
                                    </div>
                                  </div>
                                  <span className={`text-[11px] font-sans font-medium mt-1 transition-colors ${
                                    isSelected 
                                      ? 'text-[#107c85] dark:text-teal-400 font-bold' 
                                      : 'text-stone-600 dark:text-stone-400 group-hover:text-stone-900'
                                  }`}>
                                    {type.name}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-stone-200/60 dark:border-stone-800/80 my-4" />

                        {/* Map Details Section */}
                        <div className="space-y-3">
                          <h4 className="text-[14px] font-bold text-stone-800 dark:text-stone-300 font-sans">Map details</h4>
                          <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-7 gap-y-5 gap-x-1 justify-items-center">
                            {[
                              { 
                                id: 'publicTransport', 
                                name: 'Public transport', 
                                active: showPublicTransport, 
                                setter: setShowPublicTransport,
                                renderSvg: () => (
                                  <svg viewBox="0 0 56 56" className="w-full h-full">
                                    <rect width="56" height="56" fill="#f1f3f4" />
                                    <line x1="0" y1="28" x2="56" y2="28" stroke="#dadce0" strokeWidth="6" />
                                    <line x1="0" y1="28" x2="56" y2="28" stroke="#4285f4" strokeWidth="2" />
                                    <rect x="26" y="8" width="16" height="16" rx="3" fill="#1a73e8" />
                                    <text x="34" y="20" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">M</text>
                                    <rect x="10" y="32" width="16" height="16" rx="3" fill="#1a73e8" />
                                    <rect x="13" y="35" width="10" height="10" rx="1.5" fill="#ffffff" />
                                    <circle cx="15.5" cy="43.5" r="1" fill="#1a73e8" />
                                    <circle cx="20.5" cy="43.5" r="1" fill="#1a73e8" />
                                    <rect x="15" y="37" width="6" height="4" fill="#1a73e8" />
                                  </svg>
                                )
                              },
                              { 
                                id: 'traffic', 
                                name: 'Traffic', 
                                active: showTraffic, 
                                setter: setShowTraffic,
                                renderSvg: () => (
                                  <svg viewBox="0 0 56 56" className="w-full h-full">
                                    <rect width="56" height="56" fill="#f1f3f4" />
                                    <path d="M 22 0 L 22 56 M 34 0 L 34 56 M 0 22 L 56 22 M 0 34 L 56 34" stroke="#ffffff" strokeWidth="1.5" />
                                    <path d="M 28 0 L 28 28" stroke="#34a853" strokeWidth="4" strokeLinecap="round" />
                                    <path d="M 28 28 L 28 56" stroke="#ea4335" strokeWidth="4" strokeLinecap="round" />
                                    <path d="M 0 28 L 28 28" stroke="#f9ab00" strokeWidth="4" strokeLinecap="round" />
                                    <path d="M 28 28 L 56 28" stroke="#34a853" strokeWidth="4" strokeLinecap="round" />
                                  </svg>
                                )
                              },
                              { 
                                id: 'bicycling', 
                                name: 'Bicycling', 
                                active: showBicycling, 
                                setter: setShowBicycling,
                                renderSvg: () => (
                                  <svg viewBox="0 0 56 56" className="w-full h-full">
                                    <rect width="56" height="56" fill="#e6f4ea" />
                                    <circle cx="28" cy="28" r="16" fill="none" stroke="#137333" strokeWidth="3" strokeDasharray="2, 3" />
                                    <path d="M 12 12 Q 28 24 44 44" fill="none" stroke="#1b733a" strokeWidth="2.5" />
                                    <circle cx="24" cy="28" r="4" fill="none" stroke="#137333" strokeWidth="1" />
                                    <circle cx="34" cy="28" r="4" fill="none" stroke="#137333" strokeWidth="1" />
                                    <path d="M 24 28 L 29 23 L 34 28 M 29 23 L 29 28" stroke="#137333" strokeWidth="1" />
                                  </svg>
                                )
                              },
                              { 
                                id: 'raisedBuildings', 
                                name: 'Raised buildings', 
                                active: showRaisedBuildings, 
                                setter: setShowRaisedBuildings,
                                renderSvg: () => (
                                  <svg viewBox="0 0 56 56" className="w-full h-full">
                                    <rect width="56" height="56" fill="#e8eaed" />
                                    <path d="M 0 40 L 56 20 M 0 20 L 56 40" stroke="#ffffff" strokeWidth="2" />
                                    <path d="M 20 28 L 28 24 L 36 28 L 28 32 Z" fill="#dadce0" />
                                    <path d="M 20 28 L 20 44 L 28 48 L 28 32 Z" fill="#90a4ae" />
                                    <path d="M 28 32 L 28 48 L 36 44 L 36 28 Z" fill="#b0bec5" />
                                    <path d="M 38 18 L 44 15 L 50 18 L 44 21 Z" fill="#ffffff" />
                                    <path d="M 38 18 L 38 34 L 44 37 L 44 21 Z" fill="#b0bec5" />
                                    <path d="M 44 21 L 44 37 L 50 34 L 50 18 Z" fill="#cfd8dc" />
                                  </svg>
                                )
                              },
                              { 
                                id: 'streetView', 
                                name: 'Street View', 
                                active: showStreetView, 
                                setter: setShowStreetView,
                                renderSvg: () => (
                                  <svg viewBox="0 0 56 56" className="w-full h-full">
                                    <rect width="56" height="56" fill="#e8f0fe" />
                                    <path d="M 12 0 L 12 56 M 0 38 L 56 38" stroke="#4285f4" strokeWidth="4.5" opacity="0.6" />
                                    <path d="M 44 0 L 12 56" stroke="#4285f4" strokeWidth="3" opacity="0.5" />
                                    <g transform="translate(16, 8)">
                                      <circle cx="12" cy="8" r="3.5" fill="#f4b400" />
                                      <path d="M 12 12 C 10 12, 8 14, 8 18 L 8 28 C 8 29, 9 30, 10 30 L 11 30 L 11 38 C 11 39, 12 40, 13 40 C 14 40, 15 39, 15 38 L 15 30 L 17 30 L 17 38 C 17 39, 18 40, 19 40 C 20 40, 21 39, 21 38 L 21 30 L 22 30 C 23 30, 24 29, 24 28 L 24 18 C 24 14, 22 12, 12 12 Z" fill="#f4b400" />
                                      <path d="M 10 15 L 14 15" stroke="#f57c00" strokeWidth="1" />
                                    </g>
                                  </svg>
                                )
                              },
                              { 
                                id: 'wildfires', 
                                name: 'Wildfires', 
                                active: showWildfires, 
                                setter: setShowWildfires,
                                renderSvg: () => (
                                  <svg viewBox="0 0 56 56" className="w-full h-full">
                                    <rect width="56" height="56" fill="#fce8e6" />
                                    <circle cx="28" cy="28" r="16" fill="#ea4335" />
                                    <path d="M 28 16 C 24 22, 21 25, 21 29 C 21 33, 24 36, 28 36 C 32 36, 35 33, 35 29 C 35 23, 31 18, 28 16 Z" fill="#ffffff" />
                                    <path d="M 28 22 C 26 25, 24 27, 24 30 C 24 32, 26 34, 28 34 C 30 34, 32 32, 32 30 C 32 26, 30 24, 28 22 Z" fill="#f9ab00" />
                                  </svg>
                                )
                              },
                              { 
                                id: 'airQuality', 
                                name: 'Air Quality', 
                                active: showAirQuality, 
                                setter: setShowAirQuality,
                                renderSvg: () => (
                                  <svg viewBox="0 0 56 56" className="w-full h-full">
                                    <rect width="56" height="56" fill="#e6f4ea" />
                                    <circle cx="28" cy="28" r="16" fill="#34a853" />
                                    <path d="M 20 24 Q 28 20 36 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                                    <path d="M 18 28 Q 28 24 38 28" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                                    <path d="M 20 32 Q 28 28 36 32" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                                  </svg>
                                )
                              }
                            ].map((detail) => (
                              <button
                                key={detail.id}
                                onClick={() => detail.setter(!detail.active)}
                                className="flex flex-col items-center gap-1 focus:outline-none cursor-pointer group text-center"
                              >
                                <div className={`p-[2px] rounded-[18px] transition-all ${
                                  detail.active 
                                    ? 'border-[3px] border-[#107c85] scale-[1.03] shadow-md' 
                                    : 'border-[3px] border-transparent hover:scale-[1.02]'
                                }`}>
                                  <div className="w-[50px] h-[50px] rounded-[14px] overflow-hidden relative flex items-center justify-center border border-stone-200/50 dark:border-stone-800">
                                    {detail.renderSvg()}
                                  </div>
                                </div>
                                <span className={`text-[9.5px] leading-tight font-sans font-medium max-w-[68px] mt-0.5 transition-colors ${
                                  detail.active 
                                    ? 'text-[#107c85] dark:text-teal-400 font-bold' 
                                    : 'text-stone-600 dark:text-stone-400 group-hover:text-stone-900'
                                }`}>
                                  {detail.name}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Traditional Overlay Toggles */}
                        <div className="space-y-3 pt-4 border-t border-stone-100 dark:border-stone-800/80">
                          <span className="text-[10px] uppercase font-mono font-black tracking-widest text-stone-400 dark:text-stone-500 block">Traditional Overlays</span>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { id: 'labels', name: 'Place Labels', active: leafletShowLabels, setter: setLeafletShowLabels, desc: 'Display cities, landmarks, street names' },
                              { id: 'borders', name: 'Boundaries', active: leafletShowBorders, setter: setLeafletShowBorders, desc: 'Display regional and international borders' }
                            ].map((overlay) => (
                              <button
                                key={overlay.id}
                                onClick={() => overlay.setter(!overlay.active)}
                                className={`p-3 rounded-2xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                                  overlay.active 
                                    ? 'bg-blue-500/10 border-blue-500/50 shadow-sm' 
                                    : 'bg-stone-50 dark:bg-stone-900/50 border-stone-200/50 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800'
                                }`}
                              >
                                <div className="max-w-[70%]">
                                  <span className="text-[11px] font-bold text-stone-900 dark:text-white block leading-tight">{overlay.name}</span>
                                  <span className="text-[8px] text-stone-400 dark:text-stone-500 leading-none truncate block">{overlay.desc}</span>
                                </div>
                                <div className={`w-8 h-5 rounded-full p-0.5 transition-all shrink-0 ${overlay.active ? 'bg-[#107c85]' : 'bg-stone-300 dark:bg-stone-700'}`}>
                                  <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${overlay.active ? 'translate-x-3' : 'translate-x-0'}`} />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
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
          dragMomentum={false}
          dragElastic={0.05}
          dragConstraints={worldViewContainerRef}
          layout
          className="absolute bottom-4 left-4 z-[400] w-[340px] max-w-[calc(100%-32px)] bg-white/95 dark:bg-[#141414]/95 backdrop-blur-md rounded-[24px] shadow-lg border border-stone-200/50 dark:border-stone-800/80 overflow-hidden select-none pointer-events-auto"
        >
          <div className="p-4 space-y-2.5">
            {/* Header / Clickable Toggle area */}
            <div 
              className={`flex items-center justify-between ${!isLocatorMinimized ? 'border-b border-stone-100 dark:border-stone-800 pb-2.5' : ''}`}
            >
              <div className="flex items-center gap-2">
                {/* Drag Handle */}
                <div 
                  onPointerDown={(e) => dragControls.start(e)}
                  className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg text-stone-400 active:text-blue-500 cursor-grab active:cursor-grabbing shrink-0 transition-colors"
                  title="Drag to reposition panel"
                >
                  <GripHorizontal className="w-4 h-4" />
                </div>

                <div 
                  onClick={() => setIsLocatorMinimized(!isLocatorMinimized)}
                  className="flex items-center gap-2 cursor-pointer"
                  title={isLocatorMinimized ? "Expand Location Locator" : "Minimize Location Locator"}
                >
                  <div className="p-1.5 bg-stone-100 dark:bg-stone-900 rounded-xl text-[#107c85] dark:text-teal-400 shrink-0">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-sans font-bold text-[11px] tracking-tight leading-none text-stone-900 dark:text-white">
                      Location Locator
                    </h3>
                    <span className="text-[7.5px] uppercase tracking-wider font-mono text-stone-500 dark:text-stone-400 opacity-70 block mt-0.5">NAVIGATE DATABASE GEMS</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                {/* Reset Filters / Clear Button */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocatorContinent('');
                    setLocatorCountry('');
                    setLocatorState('');
                    setLocatorLandmarkId('');
                    setSelectedLocation(null);
                  }}
                  className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full text-stone-400 hover:text-stone-800 dark:hover:text-white transition-all cursor-pointer"
                  title="Clear Filters"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Minimize / Maximize Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLocatorMinimized(!isLocatorMinimized);
                  }}
                  className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full text-stone-400 hover:text-stone-800 dark:hover:text-white transition-all cursor-pointer"
                  title={isLocatorMinimized ? "Maximize" : "Minimize"}
                >
                  {isLocatorMinimized ? (
                    <Maximize2 className="w-4 h-4" />
                  ) : (
                    <Minimize2 className="w-4 h-4" />
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
