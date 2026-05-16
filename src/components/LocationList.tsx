import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { Continent } from '../App.tsx';
import LocationCard from './LocationCard.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { MapPinOff } from 'lucide-react';

interface LocationListProps {
  continent: Continent;
  country: string;
}

export interface LocationData {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  continent: string;
  country: string;
  userId: string;
  userName: string;
  lat: number;
  lng: number;
  createdAt: any;
  updatedAt: any;
}

export default function LocationList({ continent, country }: LocationListProps) {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'locations'),
      where('continent', '==', continent),
      where('country', '==', country),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const locs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LocationData[];
      setLocations(locs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'locations');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [continent]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-[#5A5A40] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-40 text-center"
      >
        <MapPinOff className="w-16 h-16 opacity-10 mb-6" />
        <h3 className="text-2xl font-serif italic mb-2">No locations yet</h3>
        <p className="text-[#141414]/40">Be the first to share a location in {continent}!</p>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
      <AnimatePresence mode="popLayout">
        {locations.map((loc, index) => (
          <LocationCard key={loc.id} location={loc} index={index} />
        ))}
      </AnimatePresence>
    </div>
  );
}
