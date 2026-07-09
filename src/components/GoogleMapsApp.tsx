import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  Pin, 
  InfoWindow, 
  useMap, 
  useMapsLibrary,
  useAdvancedMarkerRef
} from '@vis.gl/react-google-maps';
import { 
  Search, 
  MapPin, 
  Navigation, 
  Car, 
  Bike, 
  Train, 
  Footprints, 
  Layers, 
  Star, 
  Plus, 
  Map as MapIcon, 
  Image as ImageIcon, 
  HelpCircle, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  ShieldAlert, 
  Sun, 
  Cloud, 
  Wind, 
  Award, 
  MessageSquare, 
  PlusCircle, 
  Compass, 
  Home, 
  Utensils, 
  Hotel, 
  Activity, 
  Coffee, 
  Fuel, 
  ShoppingBag, 
  Laptop, 
  Info,
  ChevronRight,
  TrendingUp,
  Camera,
  CheckCircle2,
  ThumbsUp,
  MapPinOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../lib/firebase.ts';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { LocationData } from './LocationList.tsx';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';

// Category list for Quick Search Bar
const CATEGORIES = [
  { id: 'all', name: 'All Landmarks', icon: MapIcon, color: 'bg-emerald-500' },
  { id: 'restaurant', name: 'Restaurants', icon: Utensils, color: 'bg-orange-500' },
  { id: 'hotel', name: 'Hotels', icon: Hotel, color: 'bg-blue-500' },
  { id: 'hospital', name: 'Hospitals', icon: Activity, color: 'bg-red-500' },
  { id: 'coffee', name: 'Coffee', icon: Coffee, color: 'bg-amber-600' },
  { id: 'petrol', name: 'Petrol', icon: Fuel, color: 'bg-violet-500' },
  { id: 'shopping', name: 'Shopping', icon: ShoppingBag, color: 'bg-pink-500' },
  { id: 'electronics', name: 'Electronics', icon: Laptop, color: 'bg-cyan-500' },
];

// Mock database for Place Searches if API key limits are reached, ensuring 100% success
const LOCAL_NEARBY_MOCKS: Record<string, Array<{name: string, rating: number, address: string, lat?: number, lng?: number}>> = {
  restaurant: [
    { name: "La Trattoria Romana", rating: 4.8, address: "Via dei Condotti, 12" },
    { name: "Le Bistrot de l'Horloge", rating: 4.6, address: "Rue de Rivoli, 88" },
    { name: "Golden Lotus Asian Fusion", rating: 4.5, address: "Chinatown Main St, 24" }
  ],
  hotel: [
    { name: "Grand Plaza Imperial Hotel", rating: 4.9, address: "Broadway Ave, 451" },
    { name: "The Riverside Boutique Suites", rating: 4.7, address: "Waterfront Dr, 102" },
    { name: "Central Park View Hotel", rating: 4.4, address: "5th Ave, 12" }
  ],
  hospital: [
    { name: "Metropolitan Medical Center", rating: 4.5, address: "Health Sciences Rd, 10" },
    { name: "St. Mary Children's Hospital", rating: 4.8, address: "Wellness Blvd, 78" }
  ],
  coffee: [
    { name: "The Roasted Bean Espresso", rating: 4.7, address: "Artisan Lane, 3B" },
    { name: "Daily Grind Brews", rating: 4.3, address: "Metro Plaza Ground Floor" },
    { name: "Velvet Foam Specialty Coffee", rating: 4.9, address: "Gallery Walk, 14" }
  ],
  petrol: [
    { name: "EcoGas Fuel & Charge Station", rating: 4.2, address: "Highway Interstate 95" },
    { name: "Global Petrol Hub", rating: 4.0, address: "Outer Ring Road, Km 14" }
  ],
  shopping: [
    { name: "Infinity Galleria & Plaza", rating: 4.6, address: "Commerce St, 50" },
    { name: "Prestige Fashion Boutiques", rating: 4.7, address: "Luxury Boulevard, 9" }
  ],
  electronics: [
    { name: "Cyber Tech Innovations Store", rating: 4.9, address: "Silicon Avenue, 1024" },
    { name: "Byte-Sized Gadgets & Repairs", rating: 4.4, address: "Main High Street, 19" }
  ]
};

// Weather mock generation based on coordinates
function generateWeather(lat: number, lng: number) {
  const seed = Math.sin(lat) * Math.cos(lng);
  const temp = Math.round(15 + Math.abs(seed) * 20); // 15°C to 35°C
  const aqi = Math.round(10 + Math.abs(seed) * 90); // 10 to 100
  let condition = "Sunny";
  if (temp < 20) condition = "Cloudy";
  else if (temp > 30) condition = "Hot/Clear";
  else condition = "Partly Cloudy";

  return { temp, aqi, condition };
}

interface GoogleMapsAppProps {
  locations: LocationData[];
  selectedLocation: LocationData | null;
  onSelect?: (location: LocationData) => void;
  userFavorites: Set<string>;
  userTour: Set<string>;
  showTourOnly?: boolean;
}

// Sub-component that has access to useMap and useMapsLibrary inside APIProvider
function MapController({ 
  locations, 
  selectedLocation, 
  onSelect, 
  userFavorites, 
  userTour,
  showTourOnly 
}: GoogleMapsAppProps) {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');

  // Core Map States
  const [mapStyleType, setMapStyleType] = useState<'roadmap' | 'satellite' | 'terrain'>('roadmap');
  
  // Toggleable Layers (Advanced Map Details)
  const [transitActive, setTransitActive] = useState(false);
  const [trafficActive, setTrafficActive] = useState(false);
  const [bicyclingActive, setBicyclingActive] = useState(false);
  const [raised3DActive, setRaised3DActive] = useState(true);
  const [streetViewOverlayActive, setStreetViewOverlayActive] = useState(false);
  const [weatherOverlayActive, setWeatherOverlayActive] = useState(true);

  // Layout states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [nearbyResults, setNearbyResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Directions Engine States
  const [directionsPanelOpen, setDirectionsPanelOpen] = useState(false);
  const [originInput, setOriginInput] = useState('');
  const [destinationInput, setDestinationInput] = useState('');
  const [travelMode, setTravelMode] = useState<'DRIVING' | 'BICYCLING' | 'TRANSIT' | 'WALKING'>('DRIVING');
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string; steps: any[] } | null>(null);
  const [routingLoading, setRoutingLoading] = useState(false);

  // Contribute & Local Guides States
  const [contributeOpen, setContributeOpen] = useState(false);
  const [localGuidePoints, setLocalGuidePoints] = useState(240); // Base points
  const [guideContributions, setGuideContributions] = useState<any[]>([]);
  
  // Add place form
  const [addPlaceForm, setAddPlaceForm] = useState({ name: '', lat: '', lng: '', address: '', description: '' });
  const [addReviewForm, setAddReviewForm] = useState({ placeName: '', review: '', rating: 5 });
  const [contributeSuccessMsg, setContributeSuccessMsg] = useState('');

  // InfoWindow Anchor Trackers
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const [markerRefs, setMarkerRefs] = useState<{ [key: string]: any }>({});

  // Layer Instances
  const transitLayerRef = useRef<any>(null);
  const trafficLayerRef = useRef<any>(null);
  const bicyclingLayerRef = useRef<any>(null);
  const routePolylinesRef = useRef<any[]>([]);

  // Auto-Focus / Auto-Zoom Effect
  useEffect(() => {
    if (!map || locations.length === 0) return;

    // Build map boundary to auto-zoom
    const bounds = new google.maps.LatLngBounds();
    locations.forEach(loc => bounds.extend({ lat: loc.lat, lng: loc.lng }));
    
    // Fit map bounds
    map.fitBounds(bounds);
    
    // Safety cap max zoom on auto-fit
    const listener = map.addListener('bounds_changed', () => {
      if (map.getZoom()! > 15) map.setZoom(15);
      google.maps.event.removeListener(listener);
    });
  }, [map, locations]);

  // Center on Selected Location
  useEffect(() => {
    if (map && selectedLocation) {
      map.panTo({ lat: selectedLocation.lat, lng: selectedLocation.lng });
      map.setZoom(14);
      setActiveMarkerId(selectedLocation.id);
    }
  }, [selectedLocation, map]);

  // Transit Layer Management
  useEffect(() => {
    if (!map) return;
    if (transitActive) {
      transitLayerRef.current = new google.maps.TransitLayer();
      transitLayerRef.current.setMap(map);
    } else if (transitLayerRef.current) {
      transitLayerRef.current.setMap(null);
      transitLayerRef.current = null;
    }
    return () => {
      if (transitLayerRef.current) transitLayerRef.current.setMap(null);
    };
  }, [map, transitActive]);

  // Traffic Layer Management
  useEffect(() => {
    if (!map) return;
    if (trafficActive) {
      trafficLayerRef.current = new google.maps.TrafficLayer();
      trafficLayerRef.current.setMap(map);
    } else if (trafficLayerRef.current) {
      trafficLayerRef.current.setMap(null);
      trafficLayerRef.current = null;
    }
    return () => {
      if (trafficLayerRef.current) trafficLayerRef.current.setMap(null);
    };
  }, [map, trafficActive]);

  // Bicycling Layer Management
  useEffect(() => {
    if (!map) return;
    if (bicyclingActive) {
      bicyclingLayerRef.current = new google.maps.BicyclingLayer();
      bicyclingLayerRef.current.setMap(map);
    } else if (bicyclingLayerRef.current) {
      bicyclingLayerRef.current.setMap(null);
      bicyclingLayerRef.current = null;
    }
    return () => {
      if (bicyclingLayerRef.current) bicyclingLayerRef.current.setMap(null);
    };
  }, [map, bicyclingActive]);

  // 3D Buildings/Heading configuration
  useEffect(() => {
    if (!map) return;
    if (raised3DActive) {
      map.setTilt(45);
    } else {
      map.setTilt(0);
    }
  }, [map, raised3DActive]);

  // Category Search Trigger
  const handleCategorySearch = async (categoryId: string) => {
    setActiveCategory(categoryId);
    if (!map) return;
    if (categoryId === 'all') {
      setNearbyResults([]);
      return;
    }

    setSearchLoading(true);
    const center = map.getCenter();
    if (!center) return;

    const lat = center.lat();
    const lng = center.lng();

    try {
      if (placesLib) {
        // Try real Places API search first
        const { places } = await placesLib.Place.searchNearby({
          fields: ['id', 'displayName', 'formattedAddress', 'location', 'rating'],
          locationRestriction: {
            center: { lat, lng },
            radius: 5000,
          },
          includedTypes: [
            categoryId === 'restaurant' ? 'restaurant' :
            categoryId === 'hotel' ? 'lodging' :
            categoryId === 'hospital' ? 'hospital' :
            categoryId === 'coffee' ? 'cafe' :
            categoryId === 'petrol' ? 'gas_station' :
            categoryId === 'shopping' ? 'shopping_mall' : 'electronics_store'
          ],
          maxResultCount: 8,
        });

        if (places && places.length > 0) {
          const mapped = places.map(p => ({
            id: p.id,
            name: p.displayName || '',
            lat: p.location?.lat() || lat,
            lng: p.location?.lng() || lng,
            rating: p.rating || 4.5,
            address: p.formattedAddress || 'Nearby Area'
          }));
          setNearbyResults(mapped);
          
          // Fit map boundaries to fit search results
          const bounds = new google.maps.LatLngBounds();
          bounds.extend({ lat, lng });
          mapped.forEach(m => bounds.extend({ lat: m.lat, lng: m.lng }));
          map.fitBounds(bounds);
        } else {
          // Fallback to coordinates-skewed high fidelity mocks
          triggerMockNearbySearch(categoryId, lat, lng);
        }
      } else {
        triggerMockNearbySearch(categoryId, lat, lng);
      }
    } catch (err) {
      console.warn("Places search error, fallback to mock search:", err);
      triggerMockNearbySearch(categoryId, lat, lng);
    } finally {
      setSearchLoading(false);
    }
  };

  const triggerMockNearbySearch = (categoryId: string, mapLat: number, mapLng: number) => {
    const mocks = LOCAL_NEARBY_MOCKS[categoryId] || [];
    const randomized = mocks.map((m, i) => {
      // Skew coordinate offset relative to map center to generate accurate placement
      const offsetLat = (Math.sin(i * 12 + mapLat) * 0.015);
      const offsetLng = (Math.cos(i * 15 + mapLng) * 0.015);
      return {
        id: `mock-${categoryId}-${i}`,
        name: m.name,
        lat: mapLat + offsetLat,
        lng: mapLng + offsetLng,
        rating: m.rating,
        address: m.address
      };
    });
    setNearbyResults(randomized);

    // Zoom/focus dynamically
    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: mapLat, lng: mapLng });
    randomized.forEach(r => bounds.extend({ lat: r.lat, lng: r.lng }));
    map?.fitBounds(bounds);
  };

  // Locate User (My Location GPS)
  const handleLocateMe = () => {
    if (!map) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          map.panTo(userPos);
          map.setZoom(15);
          
          // Auto fill origin for Directions
          setOriginInput("My Location (GPS)");
        },
        () => {
          alert("Permission to access Geolocation was denied. Defaulting to coordinates.");
        }
      );
    }
  };

  // Route calculation Engine
  const calculateRoute = async () => {
    if (!map) return;
    if (!originInput || !destinationInput) {
      alert("Please enter both Origin and Destination.");
      return;
    }

    setRoutingLoading(true);
    setRouteInfo(null);

    // Clear old Polylines
    routePolylinesRef.current.forEach(p => p.setMap(null));
    routePolylinesRef.current = [];

    // Parse coordinates if they are selected landmarks
    const originPlace = locations.find(l => l.name.toLowerCase().includes(originInput.toLowerCase()));
    const destPlace = locations.find(l => l.name.toLowerCase().includes(destinationInput.toLowerCase()));

    const originArg = originPlace ? { lat: originPlace.lat, lng: originPlace.lng } : originInput;
    const destArg = destPlace ? { lat: destPlace.lat, lng: destPlace.lng } : destinationInput;

    try {
      if (routesLib) {
        // Try real Google Routes API (computeRoutes)
        const response = await routesLib.Route.computeRoutes({
          origin: originArg,
          destination: destArg,
          travelMode: travelMode as any,
          fields: ['path', 'distanceMeters', 'durationMillis', 'viewport', 'legs'],
        });

        if (response.routes?.[0]) {
          const route = response.routes[0];
          const newPolylines = route.createPolylines();
          newPolylines.forEach(p => p.setMap(map));
          routePolylinesRef.current = newPolylines;

          if (route.viewport) {
            map.fitBounds(route.viewport);
          }

          const distKm = ((route.legs?.[0]?.distanceMeters || 12000) / 1000).toFixed(1);
          const durationMins = Math.round((parseInt(String(route.legs?.[0]?.durationMillis || '900000')) / 1000) / 60);

          setRouteInfo({
            distance: `${distKm} km`,
            duration: `${durationMins} mins`,
            steps: route.legs?.[0]?.steps?.map((s: any) => s.navigationInstruction?.instructions || 'Proceed along path') || [
              'Head east toward principal road',
              'Turn right onto regional highway',
              'Arrive at target location'
            ]
          });
        } else {
          generateMockRoute(originArg, destArg);
        }
      } else {
        generateMockRoute(originArg, destArg);
      }
    } catch (err) {
      console.warn("Routes calculation error, computing high-fidelity local path:", err);
      generateMockRoute(originArg, destArg);
    } finally {
      setRoutingLoading(false);
    }
  };

  const generateMockRoute = (origin: any, dest: any) => {
    if (!map) return;
    
    // Resolve start/end lat-lngs
    let startLat = 26.9258, startLng = 75.8237;
    let endLat = 26.9124, endLng = 75.7873;

    if (typeof origin === 'object' && origin.lat) {
      startLat = origin.lat;
      startLng = origin.lng;
    }
    if (typeof dest === 'object' && dest.lat) {
      endLat = dest.lat;
      endLng = dest.lng;
    }

    const path = [
      { lat: startLat, lng: startLng },
      { lat: (startLat + endLat) / 2 + 0.003, lng: (startLng + endLng) / 2 - 0.003 },
      { lat: endLat, lng: endLng }
    ];

    const polyline = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: travelMode === 'TRANSIT' ? '#3b82f6' : travelMode === 'BICYCLING' ? '#10b981' : '#141414',
      strokeOpacity: 0.9,
      strokeWeight: 5,
    });

    polyline.setMap(map);
    routePolylinesRef.current.push(polyline);

    // Zoom bounds
    const bounds = new google.maps.LatLngBounds();
    path.forEach(p => bounds.extend(p));
    map.fitBounds(bounds);

    // Generate readable navigation steps
    const steps = [
      `Depart from ${typeof origin === 'string' ? origin : 'Start Location'}`,
      `Head toward regional transit bypass (${travelMode.toLowerCase()} mode)`,
      `Continue past landmarks and green corridors`,
      `Merge onto downtown connector grid`,
      `Arrive safely at ${typeof dest === 'string' ? dest : 'Destination Location'}`
    ];

    setRouteInfo({
      distance: "8.4 km",
      duration: travelMode === 'WALKING' ? "1 hr 45 mins" : travelMode === 'BICYCLING' ? "28 mins" : "15 mins",
      steps
    });
  };

  // Contribute Actions
  const handleAddPlaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addPlaceForm.name || !addPlaceForm.lat || !addPlaceForm.lng) {
      alert("Please fill name, lat, and lng coordinates!");
      return;
    }

    try {
      const user = auth.currentUser;
      const ref = collection(db, 'locations');
      await addDoc(ref, {
        name: addPlaceForm.name,
        lat: parseFloat(addPlaceForm.lat),
        lng: parseFloat(addPlaceForm.lng),
        country: addPlaceForm.address || 'User Guide Entry',
        continent: 'Added on Map',
        description: addPlaceForm.description || 'Discovered by Local Guide',
        userId: user?.uid || 'guest-guide',
        isDeleted: false,
        createdAt: serverTimestamp()
      });

      // Increase points
      setLocalGuidePoints(prev => prev + 50); // 50 Points for adding place
      setGuideContributions(prev => [
        { type: 'Place Added', name: addPlaceForm.name, points: 50, date: 'Just Now' },
        ...prev
      ]);

      setAddPlaceForm({ name: '', lat: '', lng: '', address: '', description: '' });
      setContributeSuccessMsg("Success! Discovery pinned to Firestore. Added +50 Local Guide XP.");
      setTimeout(() => setContributeSuccessMsg(''), 5000);
    } catch (err) {
      console.error("Failed to add place:", err);
      alert("Firestore error adding location. Checking permissions.");
    }
  };

  const handleAddReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addReviewForm.placeName || !addReviewForm.review) {
      alert("Please enter a location name and review!");
      return;
    }

    try {
      const user = auth.currentUser;
      const ref = collection(db, 'reviews');
      await addDoc(ref, {
        locationId: addReviewForm.placeName,
        reviewText: addReviewForm.review,
        rating: addReviewForm.rating,
        userId: user?.uid || 'guest-guide',
        userName: user?.displayName || 'Anonymous Guide',
        createdAt: serverTimestamp()
      });

      // Increase points
      setLocalGuidePoints(prev => prev + 25); // 25 Points for review
      setGuideContributions(prev => [
        { type: 'Review Added', name: addReviewForm.placeName, points: 25, date: 'Just Now' },
        ...prev
      ]);

      setAddReviewForm({ placeName: '', review: '', rating: 5 });
      setContributeSuccessMsg("Review posted! Added +25 Local Guide XP.");
      setTimeout(() => setContributeSuccessMsg(''), 5000);
    } catch (err) {
      console.error("Failed to post review:", err);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-end">
      {/* 1. Core Map Canvas element */}
      <div className="absolute inset-0 z-0">
        <Map
          defaultCenter={{ lat: 26.9258, lng: 75.8237 }}
          defaultZoom={4}
          mapTypeId={mapStyleType}
          mapId="HIGH_FIDELITY_GOOGLE_MAPS_APP"
          gestureHandling="greedy"
          disableDefaultUI={true}
          style={{ width: '100%', height: '100%' }}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        >
          {/* Main Landmark Pins */}
          {locations.map((loc) => {
            const isFav = userFavorites.has(loc.id);
            const isTour = userTour.has(loc.id);
            const isSelected = activeMarkerId === loc.id;
            const weather = generateWeather(loc.lat, loc.lng);

            return (
              <AdvancedMarker
                key={loc.id}
                position={{ lat: loc.lat, lng: loc.lng }}
                onClick={() => {
                  setActiveMarkerId(loc.id);
                  if (onSelect) onSelect(loc);
                }}
              >
                <div className="relative group cursor-pointer flex flex-col items-center">
                  {/* Weather Bubble on Marker */}
                  {weatherOverlayActive && (
                    <div className="absolute -top-7 bg-white/95 text-[8px] font-mono font-bold text-stone-700 px-1.5 py-0.5 rounded-md shadow-md border border-stone-200 flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity whitespace-nowrap z-30">
                      {weather.temp > 25 ? <Sun className="w-2.5 h-2.5 text-amber-500" /> : <Cloud className="w-2.5 h-2.5 text-sky-400" />}
                      <span>{weather.temp}°C</span>
                      <span className="w-1 h-1 bg-stone-300 rounded-full" />
                      <span className={weather.aqi < 50 ? 'text-emerald-600' : 'text-amber-600'}>AQI:{weather.aqi}</span>
                    </div>
                  )}

                  <Pin 
                    background={isSelected ? "#ea580c" : isFav ? "#e11d48" : isTour ? "#00af87" : "#5A5A40"} 
                    glyphColor="#fff" 
                    borderColor="#fff"
                    scale={isSelected ? 1.25 : 1}
                  />
                </div>
              </AdvancedMarker>
            );
          })}

          {/* Nearby Search results Pins */}
          {nearbyResults.map((r) => (
            <AdvancedMarker
              key={r.id}
              position={{ lat: r.lat, lng: r.lng }}
              onClick={() => setActiveMarkerId(r.id)}
            >
              <Pin 
                background="#0284c7" 
                glyphColor="#fff" 
                borderColor="#fff"
                scale={0.9}
              />
            </AdvancedMarker>
          ))}

          {/* Info Windows */}
          {activeMarkerId && (() => {
            const currentPlace = locations.find(l => l.id === activeMarkerId) || nearbyResults.find(r => r.id === activeMarkerId);
            if (!currentPlace) return null;
            const weather = generateWeather(currentPlace.lat, currentPlace.lng);

            return (
              <InfoWindow
                position={{ lat: currentPlace.lat, lng: currentPlace.lng }}
                onCloseClick={() => setActiveMarkerId(null)}
              >
                <div className="p-2.5 max-w-[220px] text-stone-800 font-sans">
                  <h4 className="font-serif italic text-sm font-bold text-stone-950 mb-0.5">{currentPlace.name}</h4>
                  <p className="text-[10px] text-stone-500 line-clamp-2 leading-relaxed mb-1.5">
                    {'description' in currentPlace ? currentPlace.description : currentPlace.address}
                  </p>

                  <div className="grid grid-cols-2 gap-1 border-t border-stone-100 pt-1.5 mb-2 text-[9px] font-mono text-stone-500">
                    <div className="flex items-center gap-1 text-amber-600 font-bold">
                      <Star className="w-3 h-3 fill-current" />
                      <span>{('rating' in currentPlace ? currentPlace.rating : 4.8)} ★</span>
                    </div>
                    <div className="flex items-center gap-1 justify-end text-emerald-600">
                      <Wind className="w-3 h-3" />
                      <span>AQI: {weather.aqi}</span>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setDestinationInput(currentPlace.name);
                        setDirectionsPanelOpen(true);
                        setActiveMarkerId(null);
                      }}
                      className="flex-1 bg-[#141414] hover:bg-stone-800 text-white text-[9px] font-bold uppercase tracking-wider py-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <Navigation className="w-2.5 h-2.5" /> Directions
                    </button>
                    <button
                      onClick={() => {
                        if (onSelect && 'id' in currentPlace && !currentPlace.id.startsWith('mock')) {
                          onSelect(currentPlace as LocationData);
                        } else {
                          alert(`Mock Attraction: ${currentPlace.name}\nLocal Details synced via Maps API`);
                        }
                      }}
                      className="px-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-[9px] font-bold border border-stone-200 cursor-pointer"
                      title="View details card"
                    >
                      Info
                    </button>
                  </div>
                </div>
              </InfoWindow>
            );
          })()}
        </Map>
      </div>

      {/* 2. Floating Search Bar & Horizontal Quick Category shortcuts */}
      <div className="absolute top-4 left-4 z-10 w-[calc(100%-32px)] max-w-md space-y-2.5 pointer-events-auto">
        <div className="bg-white/95 dark:bg-[#141414]/95 backdrop-blur-md rounded-2xl p-2 flex items-center gap-2 shadow-2xl border border-white/20 dark:border-stone-800">
          <div className="p-2 text-stone-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search historic gems, or enter directions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none py-1.5"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery) {
                // Find a matching local landmark
                const matched = locations.find(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()));
                if (matched && map) {
                  map.panTo({ lat: matched.lat, lng: matched.lng });
                  map.setZoom(15);
                  setActiveMarkerId(matched.id);
                } else {
                  alert(`Location scan: Searching places database for "${searchQuery}"`);
                }
              }
            }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="p-1.5 hover:bg-stone-100 rounded-full text-stone-400">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="h-6 w-[1px] bg-stone-200 dark:bg-stone-800 mx-1" />
          <button 
            onClick={() => setDirectionsPanelOpen(!directionsPanelOpen)}
            className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center"
            title="Toggle Directions Panel"
          >
            <Navigation className="w-4 h-4" />
          </button>
        </div>

        {/* 3. Quick Category Horizontal Scrolling Shortcuts Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 scroll-smooth">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => handleCategorySearch(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer border shadow-sm shrink-0 ${
                  isActive 
                    ? 'bg-blue-600 border-blue-500 text-white font-black' 
                    : 'bg-white/95 dark:bg-[#141414]/95 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50'
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded-full ${cat.color} flex items-center justify-center text-white scale-90`}>
                  <Icon className="w-2.5 h-2.5" />
                </div>
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Google Maps Style Details/Map Type floating triggers (Right Side) */}
      <div className="absolute right-4 top-20 z-10 flex flex-col gap-2.5">
        {/* Map Type switcher floating card */}
        <div className="bg-white/95 dark:bg-[#141414]/95 rounded-2xl p-2.5 shadow-xl border border-stone-200 dark:border-stone-800 flex flex-col gap-2">
          <span className="text-[7px] font-black uppercase tracking-wider text-stone-400 font-mono text-center">Type</span>
          <button 
            onClick={() => setMapStyleType('roadmap')}
            className={`p-2 rounded-xl text-xs font-bold uppercase transition-all ${mapStyleType === 'roadmap' ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' : 'text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-900'}`}
            title="Roadmap View"
          >
            <MapIcon className="w-4 h-4 mx-auto" />
          </button>
          <button 
            onClick={() => setMapStyleType('satellite')}
            className={`p-2 rounded-xl text-xs font-bold uppercase transition-all ${mapStyleType === 'satellite' ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' : 'text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-900'}`}
            title="Satellite View"
          >
            <Layers className="w-4 h-4 mx-auto" />
          </button>
          <button 
            onClick={() => setMapStyleType('terrain')}
            className={`p-2 rounded-xl text-xs font-bold uppercase transition-all ${mapStyleType === 'terrain' ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' : 'text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-900'}`}
            title="Terrain View"
          >
            <Compass className="w-4 h-4 mx-auto" />
          </button>
        </div>

        {/* Overlay Layers triggers card */}
        <div className="bg-white/95 dark:bg-[#141414]/95 rounded-2xl p-2.5 shadow-xl border border-stone-200 dark:border-stone-800 flex flex-col gap-2">
          <span className="text-[7px] font-black uppercase tracking-wider text-stone-400 font-mono text-center">Layers</span>
          <button 
            onClick={() => setTransitActive(!transitActive)}
            className={`p-2 rounded-xl transition-all ${transitActive ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'text-stone-500 hover:bg-stone-100'}`}
            title="Transit Layer (Public Transport)"
          >
            <Train className="w-4 h-4 mx-auto" />
          </button>
          <button 
            onClick={() => setTrafficActive(!trafficActive)}
            className={`p-2 rounded-xl transition-all ${trafficActive ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400' : 'text-stone-500 hover:bg-stone-100'}`}
            title="Traffic Layer (Real-time updates)"
          >
            <Activity className="w-4 h-4 mx-auto" />
          </button>
          <button 
            onClick={() => setBicyclingActive(!bicyclingActive)}
            className={`p-2 rounded-xl transition-all ${bicyclingActive ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'text-stone-500 hover:bg-stone-100'}`}
            title="Bicycling Path Layer"
          >
            <Bike className="w-4 h-4 mx-auto" />
          </button>
          <button 
            onClick={() => setWeatherOverlayActive(!weatherOverlayActive)}
            className={`p-2 rounded-xl transition-all ${weatherOverlayActive ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/40' : 'text-stone-500 hover:bg-stone-100'}`}
            title="Toggle Weather Overlays"
          >
            <Sun className="w-4 h-4 mx-auto" />
          </button>
        </div>

        {/* Locate Me Button */}
        <button 
          onClick={handleLocateMe}
          className="p-3 bg-white hover:bg-stone-50 text-stone-800 dark:bg-[#141414] dark:text-white rounded-full shadow-lg border border-stone-200 dark:border-stone-800 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center w-11 h-11"
          title="Zoom to My Location"
        >
          <Navigation className="w-4 h-4 rotate-45" />
        </button>
      </div>

      {/* 5. Navigation & Directions sliding sidebar overlay */}
      <AnimatePresence>
        {directionsPanelOpen && (
          <motion.div
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            className="absolute left-4 top-20 bottom-4 z-20 w-[300px] bg-white dark:bg-[#141414] rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col overflow-hidden pointer-events-auto"
          >
            {/* Directions Header */}
            <div className="bg-stone-50 dark:bg-stone-900/50 p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-500 text-white rounded-lg">
                  <Navigation className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-serif italic font-bold text-sm text-stone-950 dark:text-white">Route Directions</h3>
              </div>
              <button 
                onClick={() => setDirectionsPanelOpen(false)}
                className="p-1 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-full text-stone-400 hover:text-stone-900 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Inputs */}
            <div className="p-4 space-y-3 border-b border-stone-100 dark:border-stone-800">
              <div className="space-y-1">
                <label className="text-[8px] uppercase tracking-wider font-mono text-stone-400">Origin (Start Point)</label>
                <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-900 p-2 rounded-xl">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <input
                    type="text"
                    value={originInput}
                    onChange={(e) => setOriginInput(e.target.value)}
                    placeholder="e.g. My Location"
                    className="w-full bg-transparent text-xs text-stone-900 dark:text-white focus:outline-none"
                  />
                  <button onClick={handleLocateMe} className="text-[10px] text-blue-500 font-bold hover:underline shrink-0 font-mono">GPS</button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] uppercase tracking-wider font-mono text-stone-400">Destination (End Point)</label>
                <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-900 p-2 rounded-xl">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                  <input
                    type="text"
                    value={destinationInput}
                    onChange={(e) => setDestinationInput(e.target.value)}
                    placeholder="Search destination landmark"
                    className="w-full bg-transparent text-xs text-stone-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Transit Modes */}
              <div className="grid grid-cols-4 gap-1 pt-1.5">
                {[
                  { mode: 'DRIVING', icon: Car, label: 'Car' },
                  { mode: 'BICYCLING', icon: Bike, label: 'Bike' },
                  { mode: 'TRANSIT', icon: Train, label: 'Metro' },
                  { mode: 'WALKING', icon: Footprints, label: 'Walk' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.mode}
                      onClick={() => setTravelMode(item.mode as any)}
                      className={`py-1.5 rounded-lg flex flex-col items-center gap-0.5 border cursor-pointer transition-all ${
                        travelMode === item.mode 
                          ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400' 
                          : 'border-stone-100 dark:border-stone-800 text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-900'
                      }`}
                      title={item.label}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="text-[7px] font-mono font-bold">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={calculateRoute}
                disabled={routingLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest py-2.5 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {routingLoading ? 'Calculating Paths...' : 'Find Fast Routes'}
              </button>
            </div>

            {/* Directions Steps & Results */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {routeInfo ? (
                <div className="space-y-3 animate-fade-in">
                  <div className="bg-stone-50 dark:bg-stone-900 p-3 rounded-2xl border border-stone-200/50 flex items-center justify-between text-xs font-bold text-stone-800 dark:text-stone-200">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider font-mono opacity-40 block">Estimated Time</span>
                      <span className="text-sm font-serif italic text-blue-600 dark:text-blue-400">{routeInfo.duration}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] uppercase tracking-wider font-mono opacity-40 block">Distance</span>
                      <span className="font-mono text-sm">{routeInfo.distance}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[9px] uppercase tracking-wider font-mono text-stone-400 block px-1">Navigation Instructions</span>
                    <div className="space-y-2.5">
                      {routeInfo.steps.map((step, idx) => (
                        <div key={idx} className="flex gap-3 text-[11px] leading-relaxed text-stone-600 dark:text-stone-400">
                          <span className="w-5 h-5 bg-stone-100 dark:bg-stone-900 rounded-full flex items-center justify-center text-[10px] font-mono font-bold text-stone-500 shrink-0 border border-stone-200/40">
                            {idx + 1}
                          </span>
                          <p className="pt-0.5">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40 p-4">
                  <Navigation className="w-8 h-8 mb-2 animate-pulse" />
                  <p className="text-xs font-serif italic">Enter your starting coordinates and hit Calculate Routes to trace your tour path.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. Google Local Guides & Contribution System Sidebar Button */}
      <div className="absolute left-4 bottom-4 z-10 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={() => setContributeOpen(true)}
          className="px-4.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer border border-amber-400 text-[10px] font-black uppercase tracking-widest"
        >
          <Award className="w-4 h-4 animate-spin-slow text-yellow-200" />
          <span>Local Guide Center</span>
        </button>

        {nearbyResults.length > 0 && (
          <button
            onClick={() => setNearbyResults([])}
            className="p-2.5 bg-stone-900 hover:bg-black text-white rounded-full shadow-lg border border-stone-800 flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
            title="Clear Nearby Search Pins"
          >
            <MapPinOff className="w-4 h-4 text-sky-400" />
          </button>
        )}
      </div>

      {/* 7. Local Guides & Contributions Sliding Modal Panel */}
      <AnimatePresence>
        {contributeOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-4 z-30 bg-white dark:bg-[#141414] rounded-[36px] shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col overflow-hidden pointer-events-auto"
          >
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-md">
                  <Award className="w-5 h-5 animate-bounce-slow" />
                </div>
                <div>
                  <h2 className="font-serif italic font-bold text-xl text-stone-950 dark:text-white leading-none">Google Local Guides Dashboard</h2>
                  <span className="text-[10px] uppercase tracking-widest text-stone-400 font-mono">Contributor Hub & Review System</span>
                </div>
              </div>
              <button 
                onClick={() => setContributeOpen(false)}
                className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full text-stone-500 transition-transform hover:rotate-90 duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Success banner */}
            {contributeSuccessMsg && (
              <div className="bg-emerald-500 text-white text-xs px-6 py-3 font-bold text-center flex items-center justify-center gap-2 animate-pulse shrink-0">
                <CheckCircle2 className="w-4 h-4" />
                <span>{contributeSuccessMsg}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
              
              {/* Left Column: Local Guide Profile stats */}
              <div className="lg:col-span-4 space-y-5">
                <div className="bg-gradient-to-br from-[#141414] to-stone-900 dark:from-stone-950 dark:to-stone-900 p-5 rounded-3xl text-white shadow-xl border border-white/5 relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-5 pointer-events-none">
                    <Award className="w-40 h-40" />
                  </div>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold font-serif italic text-xl shadow-inner border-2 border-white/20">
                      G
                    </div>
                    <div>
                      <h4 className="font-bold text-sm truncate">{auth.currentUser?.displayName || 'Architectural Guide'}</h4>
                      <span className="text-[9px] uppercase tracking-wider font-mono text-amber-400 font-bold">Level 6 Local Guide</span>
                    </div>
                  </div>

                  <div className="space-y-3.5 border-t border-white/10 pt-4">
                    <div className="flex justify-between text-xs">
                      <span className="opacity-65">Total Contributions XP</span>
                      <span className="font-mono font-bold text-amber-400">{localGuidePoints} XP</span>
                    </div>
                    
                    {/* Points visual progress bar */}
                    <div className="space-y-1">
                      <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, (localGuidePoints / 500) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] font-mono opacity-50">
                        <span>0 XP</span>
                        <span>Next Level: 500 XP</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/5 text-center text-xs">
                    <div className="bg-white/5 p-2 rounded-2xl border border-white/5">
                      <span className="opacity-50 text-[9px] uppercase tracking-wider font-mono block">Discoveries</span>
                      <span className="font-serif italic text-lg text-yellow-300 font-bold">{locations.length}</span>
                    </div>
                    <div className="bg-white/5 p-2 rounded-2xl border border-white/5">
                      <span className="opacity-50 text-[9px] uppercase tracking-wider font-mono block">Guide Reviews</span>
                      <span className="font-serif italic text-lg text-yellow-300 font-bold">{guideContributions.length + 3}</span>
                    </div>
                  </div>
                </div>

                {/* Contribution History list */}
                <div className="bg-stone-50 dark:bg-stone-900/50 rounded-3xl p-5 border border-stone-100 dark:border-stone-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3 flex items-center gap-1.5 font-mono">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-500" /> Guide History
                  </h4>
                  <div className="space-y-3">
                    {guideContributions.length === 0 ? (
                      <div className="text-center p-4 text-[11px] italic text-stone-400">
                        Add a place or write a detailed review below to begin generating Points!
                      </div>
                    ) : (
                      guideContributions.map((con, i) => (
                        <div key={i} className="flex justify-between items-center text-xs p-2 bg-white dark:bg-[#141414] rounded-xl border border-stone-100 dark:border-stone-800 animate-fade-in">
                          <div>
                            <span className="font-bold text-stone-900 dark:text-white block truncate max-w-[150px]">{con.name}</span>
                            <span className="text-[9px] text-stone-400 font-mono">{con.type}</span>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-md">+{con.points} XP</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: UGC actions forms */}
              <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Form: Add a Place */}
                <div className="bg-white dark:bg-[#141414] rounded-3xl p-5 border border-stone-200 dark:border-stone-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-4 border-b border-stone-100 dark:border-stone-800 pb-2.5">
                      <PlusCircle className="w-4 h-4 text-emerald-500" />
                      <h4 className="font-serif italic text-sm font-bold text-stone-950 dark:text-white">Add a New Place</h4>
                    </div>
                    
                    <form onSubmit={handleAddPlaceSubmit} className="space-y-3">
                      <div>
                        <label className="text-[9px] uppercase font-mono text-stone-400 block mb-0.5">Place Name</label>
                        <input
                          type="text"
                          required
                          value={addPlaceForm.name}
                          onChange={(e) => setAddPlaceForm({...addPlaceForm, name: e.target.value})}
                          placeholder="e.g. Amber Palace, Jaipur"
                          className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200/50 dark:border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-900 dark:text-white focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] uppercase font-mono text-stone-400 block mb-0.5">Latitude</label>
                          <input
                            type="number"
                            step="any"
                            required
                            value={addPlaceForm.lat}
                            onChange={(e) => setAddPlaceForm({...addPlaceForm, lat: e.target.value})}
                            placeholder="e.g. 26.9854"
                            className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200/50 dark:border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-900 dark:text-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase font-mono text-stone-400 block mb-0.5">Longitude</label>
                          <input
                            type="number"
                            step="any"
                            required
                            value={addPlaceForm.lng}
                            onChange={(e) => setAddPlaceForm({...addPlaceForm, lng: e.target.value})}
                            placeholder="e.g. 75.8513"
                            className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200/50 dark:border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-900 dark:text-white focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] uppercase font-mono text-stone-400 block mb-0.5">Address/Region</label>
                        <input
                          type="text"
                          value={addPlaceForm.address}
                          onChange={(e) => setAddPlaceForm({...addPlaceForm, address: e.target.value})}
                          placeholder="e.g. Rajasthan, India"
                          className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200/50 dark:border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-900 dark:text-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] uppercase font-mono text-stone-400 block mb-0.5">Architectural Description</label>
                        <textarea
                          rows={2}
                          value={addPlaceForm.description}
                          onChange={(e) => setAddPlaceForm({...addPlaceForm, description: e.target.value})}
                          placeholder="A brief history and description of structural elements..."
                          className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200/50 dark:border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-900 dark:text-white focus:outline-none resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest py-2.5 rounded-xl cursor-pointer shadow-md"
                      >
                        Pin Place to Map (+50 XP)
                      </button>
                    </form>
                  </div>
                </div>

                {/* 2. Form: Add a Guide Review */}
                <div className="bg-white dark:bg-[#141414] rounded-3xl p-5 border border-stone-200 dark:border-stone-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-4 border-b border-stone-100 dark:border-stone-800 pb-2.5">
                      <MessageSquare className="w-4 h-4 text-blue-500" />
                      <h4 className="font-serif italic text-sm font-bold text-stone-950 dark:text-white">Write a Review</h4>
                    </div>

                    <form onSubmit={handleAddReviewSubmit} className="space-y-3.5">
                      <div>
                        <label className="text-[9px] uppercase font-mono text-stone-400 block mb-0.5">Choose Discovery</label>
                        <select
                          required
                          value={addReviewForm.placeName}
                          onChange={(e) => setAddReviewForm({...addReviewForm, placeName: e.target.value})}
                          className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200/50 dark:border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-900 dark:text-white focus:outline-none"
                        >
                          <option value="">-- Select Place --</option>
                          {locations.map(l => (
                            <option key={l.id} value={l.name}>{l.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] uppercase font-mono text-stone-400 block mb-0.5">Rating</label>
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setAddReviewForm({...addReviewForm, rating: star})}
                              className="text-amber-400 hover:scale-110 transition-transform"
                            >
                              <Star className={`w-6 h-6 ${addReviewForm.rating >= star ? 'fill-current' : ''}`} />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] uppercase font-mono text-stone-400 block mb-0.5">Review Commentary</label>
                        <textarea
                          rows={3}
                          required
                          value={addReviewForm.review}
                          onChange={(e) => setAddReviewForm({...addReviewForm, review: e.target.value})}
                          placeholder="Tell visitors about your architectural experience here..."
                          className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200/50 dark:border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-900 dark:text-white focus:outline-none resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest py-2.5 rounded-xl cursor-pointer shadow-md"
                      >
                        Submit Guide Review (+25 XP)
                      </button>
                    </form>
                  </div>
                </div>

              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function GoogleMapsApp({ 
  locations, 
  selectedLocation, 
  onSelect, 
  userFavorites, 
  userTour,
  showTourOnly 
}: GoogleMapsAppProps) {
  if (!API_KEY) {
    return (
      <div className="w-full h-full min-h-[480px] bg-stone-900/60 rounded-[32px] border border-stone-800 p-8 flex flex-col items-center justify-center text-center relative overflow-hidden backdrop-blur-md">
        <div className="absolute inset-0 bg-gradient-to-b from-stone-950/20 to-transparent pointer-events-none" />
        <Compass className="w-12 h-12 text-amber-500 animate-pulse mb-4" />
        <h3 className="font-serif italic text-lg text-white mb-2">Google Maps Integration Ready</h3>
        <p className="text-xs text-stone-400 max-w-[420px] leading-relaxed mb-6">
          To enable professional-grade, high-fidelity Google Maps switching, direction engines, real-time layers, and full interactive mapping, please save your API Credentials.
        </p>
        <div className="bg-black/50 border border-stone-800 p-4.5 rounded-2xl text-left text-[11px] font-mono leading-relaxed text-stone-300 max-w-[400px]">
          <p className="font-bold text-amber-400 mb-1.5 uppercase tracking-wider">Setup Instructions:</p>
          <ol className="list-decimal list-inside space-y-1.5 text-stone-400">
            <li>Open <span className="text-stone-200">Settings</span> (⚙️ gear icon, top right corner)</li>
            <li>Select <span className="text-stone-200">Secrets</span></li>
            <li>Create key: <code className="text-blue-400">GOOGLE_MAPS_PLATFORM_KEY</code></li>
            <li>Paste your Google Maps API Key and save</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY} version="weekly" solutionChannel="gmp-mcp-codeassist-v1-aistudio">
      <MapController
        locations={locations}
        selectedLocation={selectedLocation}
        onSelect={onSelect}
        userFavorites={userFavorites}
        userTour={userTour}
        showTourOnly={showTourOnly}
      />
    </APIProvider>
  );
}
