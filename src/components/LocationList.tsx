import { useState, useEffect } from 'react';
import { CollectionReference, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../lib/firebase.ts';
import { Continent } from '../App.tsx';
import LocationCard from './LocationCard.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { MapPinOff, Heart, Search, Calendar, Bookmark, Trash2, Compass } from 'lucide-react';

interface LocationListProps {
  continent: Continent | null;
  country: string | null;
  state: string | null;
  showFavoritesOnly?: boolean;
  showTourOnly?: boolean;
  showArchiveOnly?: boolean;
  showTrashOnly?: boolean;
  showUserAddedOnly?: boolean;
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
  isDeleted?: boolean;
  deletedAt?: any;
  createdAt: any;
  updatedAt: any;
}

export default function LocationList({ continent, country, state, showFavoritesOnly, showTourOnly, showArchiveOnly, showTrashOnly, showUserAddedOnly, searchQuery, onSelect }: LocationListProps) {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [userFavorites, setUserFavorites] = useState<Set<string>>(new Set());
  const [userTour, setUserTour] = useState<Set<string>>(new Set());
  const [userArchive, setUserArchive] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  // Monitor the network online/offline state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch favorites
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setUserFavorites(new Set());
      return;
    }

    // Load instantly from localStorage cache if present to support offline
    try {
      const cached = localStorage.getItem(`cached_favs_${user.uid}`);
      if (cached) {
        setUserFavorites(new Set(JSON.parse(cached)));
      }
    } catch (e) {
      console.warn("Could not load cached favorites:", e);
    }

    const q = query(
      collection(db, 'favorites'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const favsList = snapshot.docs.map(doc => doc.data().locationId);
      const favsSet = new Set(favsList);
      setUserFavorites(favsSet);
      try {
        localStorage.setItem(`cached_favs_${user.uid}`, JSON.stringify(favsList));
      } catch (e) {
        console.warn("Could not write favorites to cache:", e);
      }
    }, (error) => {
      console.warn("Firestore favorites snapshot connection pending / offline:", error);
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

    // Load instantly from localStorage cache if present to support offline
    try {
      const cached = localStorage.getItem(`cached_tours_${user.uid}`);
      if (cached) {
        setUserTour(new Set(JSON.parse(cached)));
      }
    } catch (e) {
      console.warn("Could not load cached tours:", e);
    }

    const q = query(
      collection(db, 'tours'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tourList = snapshot.docs.map(doc => doc.data().locationId);
      const tourSet = new Set(tourList);
      setUserTour(tourSet);
      try {
        localStorage.setItem(`cached_tours_${user.uid}`, JSON.stringify(tourList));
      } catch (e) {
        console.warn("Could not write tours to cache:", e);
      }
    }, (error) => {
      console.warn("Firestore tours snapshot connection pending / offline:", error);
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

    // Load instantly from localStorage cache if present to support offline
    try {
      const cached = localStorage.getItem(`cached_archives_${user.uid}`);
      if (cached) {
        setUserArchive(new Set(JSON.parse(cached)));
      }
    } catch (e) {
      console.warn("Could not load cached archives:", e);
    }

    const q = query(
      collection(db, 'archives'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const archList = snapshot.docs.map(doc => doc.data().locationId);
      const archSet = new Set(archList);
      setUserArchive(archSet);
      try {
        localStorage.setItem(`cached_archives_${user.uid}`, JSON.stringify(archList));
      } catch (e) {
        console.warn("Could not write archives to cache:", e);
      }
    }, (error) => {
      console.warn("Firestore archives snapshot connection pending / offline:", error);
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  useEffect(() => {
    // If no continent and not showing special collections and no search query, we don't know what to show
    if (!continent && !showFavoritesOnly && !showTourOnly && !showArchiveOnly && !showTrashOnly && !showUserAddedOnly && !searchQuery) return;

    setLoading(true);

    const cacheKey = `cached_locs_${continent || 'all'}_${country || 'all'}_${state || 'all'}_${showFavoritesOnly ? 'yes' : 'no'}_${showTourOnly ? 'yes' : 'no'}_${showArchiveOnly ? 'yes' : 'no'}_${showTrashOnly ? 'yes' : 'no'}_${showUserAddedOnly ? 'yes' : 'no'}_${searchQuery || ''}`;

    // Attempt instant render from cache so the user sees locations without network
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLocations(parsed);
          setLoading(false);
        }
      }
    } catch (e) {
      console.warn("Could not load cached locations:", e);
    }

    let q;
    
    // If searching, we fetch everything related to the current context or everything if no context
    if (searchQuery) {
        // Fetch all locations to filter in memory for robust search
        q = query(collection(db, 'locations'), orderBy('createdAt', 'desc'));
    } else if (showFavoritesOnly || showTourOnly || showArchiveOnly || showTrashOnly || showUserAddedOnly) {
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

      // Filter by isDeleted
      if (showTrashOnly) {
        locs = locs.filter(loc => loc.isDeleted === true);
      } else {
        locs = locs.filter(loc => !loc.isDeleted);
      }

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
      
      // Filter by user added only (not AI or system)
      if (showUserAddedOnly) {
        locs = locs.filter(loc => loc.userId !== 'traveler-guide-ai' && loc.userId !== 'system');
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

      // Save to cache
      try {
        localStorage.setItem(cacheKey, JSON.stringify(locs));
      } catch (e) {
        console.warn("Could not cache locations:", e);
      }
    }, (error) => {
      console.warn("Firestore locations subscription error / offline:", error);
      
      // Attempt load from cache on snapshot subscription error
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            setLocations(parsed);
          }
        }
      } catch (e) {
        console.warn("Could not retrieve cached locations on offline error:", e);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [continent, country, state, showFavoritesOnly, showTourOnly, showArchiveOnly, showTrashOnly, showUserAddedOnly, userFavorites, userTour, userArchive, searchQuery]);

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
            <Bookmark className="w-16 h-16 opacity-10 mb-6" />
            <h3 className="text-2xl font-serif italic mb-2">Archive empty</h3>
            <p className="text-[#141414]/40">Your archived gems will appear here.</p>
          </>
        ) : showUserAddedOnly ? (
          <>
            <Compass className="w-16 h-16 opacity-10 mb-6" />
            <h3 className="text-2xl font-serif italic mb-2">No community discoveries</h3>
            <p className="text-[#141414]/40">Be the first to share a personal discovery!</p>
          </>
        ) : showTrashOnly ? (
          <>
            <Trash2 className="w-16 h-16 opacity-10 mb-6" />
            <h3 className="text-2xl font-serif italic mb-2">Trash is empty</h3>
            <p className="text-[#141414]/40">Deleted discoveries will stay here for 30 days.</p>
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
    <div className="space-y-6">
      {isOffline && (
        <div className="bg-[#5A5A40]/10 border border-[#5A5A40]/25 rounded-2xl p-4 flex items-center justify-between text-xs font-serif italic text-[#5A5A40] animate-pulse">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#5A5A40] animate-spin" style={{ animationDuration: '4s' }} />
            <span><strong>Offline Mode Enabled:</strong> You are viewing previously fetched and saved explorer landmarks. Real-time updates will auto-resume once connection returns.</span>
          </div>
          <span className="font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-[#5A5A40]/10 rounded shrink-0">Cached Data</span>
        </div>
      )}
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
    </div>
  );
}
