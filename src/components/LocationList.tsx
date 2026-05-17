import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../lib/firebase.ts';
import { Continent } from '../App.tsx';
import LocationCard from './LocationCard.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { MapPinOff, Heart, Search, Calendar, Archive } from 'lucide-react';

interface LocationListProps {
  continent: Continent | null;
  country: string | null;
  state: string | null;
  showFavoritesOnly?: boolean;
  showTourOnly?: boolean;
  showArchiveOnly?: boolean;
  searchQuery?: string;
  onSelect?: (location: LocationData) => void;
}

export interface LocationData {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  continent: string;
  country: string;
  state: string;
  userId: string;
  userName: string;
  lat: number;
  lng: number;
  createdAt: any;
  updatedAt: any;
}

export default function LocationList({ continent, country, state, showFavoritesOnly, showTourOnly, showArchiveOnly, searchQuery, onSelect }: LocationListProps) {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [userFavorites, setUserFavorites] = useState<Set<string>>(new Set());
  const [userTour, setUserTour] = useState<Set<string>>(new Set());
  const [userArchive, setUserArchive] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Fetch favorites
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setUserFavorites(new Set());
      return;
    }

    const q = query(
      collection(db, 'favorites'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const favs = new Set(snapshot.docs.map(doc => doc.data().locationId));
      setUserFavorites(favs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'favorites');
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  // Fetch tours
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setUserTour(new Set());
      return;
    }

    const q = query(
      collection(db, 'tours'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tour = new Set(snapshot.docs.map(doc => doc.data().locationId));
      setUserTour(tour);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tours');
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  // Fetch archives
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setUserArchive(new Set());
      return;
    }

    const q = query(
      collection(db, 'archives'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const arch = new Set(snapshot.docs.map(doc => doc.data().locationId));
      setUserArchive(arch);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'archives');
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  useEffect(() => {
    // If no continent and not showing special collections and no search query, we don't know what to show
    if (!continent && !showFavoritesOnly && !showTourOnly && !showArchiveOnly && !searchQuery) return;

    setLoading(true);
    let q;
    
    // If searching, we fetch everything related to the current context or everything if no context
    if (searchQuery) {
        // Fetch all locations to filter in memory for robust search
        q = query(collection(db, 'locations'), orderBy('createdAt', 'desc'));
    } else if (showFavoritesOnly || showTourOnly || showArchiveOnly) {
      q = query(collection(db, 'locations'), orderBy('createdAt', 'desc'));
    } else {
      q = query(
        collection(db, 'locations'),
        where('continent', '==', continent)
      );

      if (country) {
        q = query(q, where('country', '==', country));
      }
      if (state) {
        q = query(q, where('state', '==', state));
      }

      q = query(q, orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let locs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LocationData[];

      // Filter by favorites if needed
      if (showFavoritesOnly) {
        locs = locs.filter(loc => userFavorites.has(loc.id));
      }

      // Filter by tour if needed
      if (showTourOnly) {
        locs = locs.filter(loc => userTour.has(loc.id));
      }

      // Filter by archive if needed
      if (showArchiveOnly) {
        locs = locs.filter(loc => userArchive.has(loc.id));
      }

      // Filter by search query if present
      if (searchQuery) {
        const queryLower = searchQuery.toLowerCase();
        locs = locs.filter(loc => 
          loc.name.toLowerCase().includes(queryLower) ||
          loc.country.toLowerCase().includes(queryLower) ||
          loc.continent.toLowerCase().includes(queryLower) ||
          (loc.state && loc.state.toLowerCase().includes(queryLower))
        );

        // Also enforce existing category filters if searching within a category
        if (continent) locs = locs.filter(loc => loc.continent === continent);
        if (country) locs = locs.filter(loc => loc.country === country);
        if (state) locs = locs.filter(loc => loc.state === state);
      }

      setLocations(locs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'locations');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [continent, country, state, showFavoritesOnly, showTourOnly, showArchiveOnly, userFavorites, userTour, userArchive, searchQuery]);

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
        {searchQuery ? (
          <>
            <Search className="w-16 h-16 opacity-10 mb-6" />
            <h3 className="text-2xl font-serif italic mb-2">No results found</h3>
            <p className="text-[#141414]/40">We couldn't find any matches for "{searchQuery}".</p>
          </>
        ) : showFavoritesOnly ? (
          <>
            <Heart className="w-16 h-16 opacity-10 mb-6" />
            <h3 className="text-2xl font-serif italic mb-2">No favorites yet</h3>
            <p className="text-[#141414]/40">Your marked locations will appear here.</p>
          </>
        ) : showTourOnly ? (
          <>
            <Calendar className="w-16 h-16 opacity-10 mb-6" />
            <h3 className="text-2xl font-serif italic mb-2">Itinerary empty</h3>
            <p className="text-[#141414]/40">Plan your next tour by clicking "Plan Visit" on any discovery.</p>
          </>
        ) : showArchiveOnly ? (
          <>
            <Archive className="w-16 h-16 opacity-10 mb-6" />
            <h3 className="text-2xl font-serif italic mb-2">Archive empty</h3>
            <p className="text-[#141414]/40">Your archived gems will appear here.</p>
          </>
        ) : (
          <>
            <MapPinOff className="w-16 h-16 opacity-10 mb-6" />
            <h3 className="text-2xl font-serif italic mb-2">No locations yet</h3>
            <p className="text-[#141414]/40">Be the first to share a location in {continent}!</p>
          </>
        )}
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
      <AnimatePresence mode="popLayout">
        {locations.map((loc, index) => (
          <LocationCard 
            key={loc.id} 
            location={loc} 
            index={index} 
            isFavorite={userFavorites.has(loc.id)}
            onSelect={onSelect}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
