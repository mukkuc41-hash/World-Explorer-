import { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap, InfoWindow, useAdvancedMarkerRef } from '@vis.gl/react-google-maps';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { LocationData } from './LocationList.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { Map as MapIcon, Layers, Navigation } from 'lucide-react';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';

interface WorldViewProps {
  continent: string | null;
  country: string | null;
  state: string | null;
  searchQuery?: string;
}

export default function WorldView({ continent, country, state, searchQuery }: WorldViewProps) {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'locations'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let locs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LocationData[];
      
      // Filter hierarchy
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
      
      setLocations(locs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'locations');
    });

    return () => unsubscribe();
  }, [continent, country, state, searchQuery]);

  const mapCenter = ((state || country) && locations.length > 0) 
    ? { lat: locations[0].lat, lng: locations[0].lng } 
    : continentCenter(continent);
  
  const zoom = state ? 11 : country ? 6 : continent ? 4 : 2;

  return (
    <div className="relative w-full h-[600px] rounded-[40px] overflow-hidden shadow-2xl border border-[#141414]/10">
      <APIProvider apiKey={API_KEY} version="weekly">
        <Map
          defaultCenter={mapCenter}
          defaultZoom={zoom}
          center={mapCenter}
          zoom={zoom}
          mapId="WORLD_EXPLORER_MAP"
          gestureHandling="greedy"
          disableDefaultUI={true}
          style={{ width: '100%', height: '100%' }}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        >
          {locations.map((loc) => (
            <LocationMarker 
              key={loc.id} 
              location={loc} 
              onSelect={() => setSelectedLocation(loc)}
            />
          ))}

          {selectedLocation && (
            <InfoWindow
              position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
              onCloseClick={() => setSelectedLocation(null)}
            >
              <div className="p-2 max-w-[200px]">
                <h4 className="font-serif italic text-lg tracking-tighter mb-1">{selectedLocation.name}</h4>
                <p className="text-[10px] text-[#141414]/60 mb-2 truncate">{selectedLocation.description}</p>
                <img 
                  src={selectedLocation.imageUrl} 
                  className="w-full h-24 object-cover rounded-lg mb-2" 
                  referrerPolicy="no-referrer"
                />
                <button 
                  className="w-full bg-[#141414] text-white py-2 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                  onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedLocation.lat},${selectedLocation.lng}`, '_blank')}
                >
                  <Navigation className="w-3 h-3" /> Directions
                </button>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>

      <div className="absolute top-6 left-6 flex items-center gap-2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-[#141414]/5">
        <MapIcon className="w-4 h-4 text-[#5A5A40]" />
        <span className="text-[10px] uppercase font-bold tracking-widest">
          {continent ? `${continent} View` : 'Global View'}
        </span>
      </div>
    </div>
  );
}

function LocationMarker({ location, onSelect }: { location: LocationData, onSelect: () => void }) {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <AdvancedMarker
      ref={markerRef}
      position={{ lat: location.lat, lng: location.lng }}
      onClick={onSelect}
      title={location.name}
    >
      <Pin background="#5A5A40" glyphColor="#fff" borderColor="#f5f5f0" scale={0.8} />
    </AdvancedMarker>
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
