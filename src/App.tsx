/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInWithGoogle, logout } from './lib/firebase.ts';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Plus, Compass, LogOut, ChevronLeft, Search, Map as MapIcon, LayoutGrid, Menu, X, ChevronRight, Globe, Share2, Link, Heart, Calendar, Bookmark, Trash2, Bot, Sparkles, Trophy } from 'lucide-react';
import Header from './components/Header.tsx';
import SidebarNav from './components/SidebarNav.tsx';
import LocationList from './components/LocationList.tsx';
import AddLocationModal from './components/AddLocationModal.tsx';
import WorldView from './components/WorldView.tsx';
import GoogleMapsSplash from './components/GoogleMapsSplash.tsx';
import SplashLoader from './components/SplashLoader.tsx';
import DiscoveryHero from './components/DiscoveryHero.tsx';
import PlaceDetailsModal from './components/PlaceDetailsModal.tsx';
import InteractiveBackground from './components/InteractiveBackground.tsx';
import UserProfileModal from './components/UserProfileModal.tsx';
import TravelerGuide from './components/TravelerGuide.tsx';
import SelfAssistBot from './components/SelfAssistBot.tsx';
import LeaderboardModal from './components/LeaderboardModal.tsx';
import AppGuideModal from './components/AppGuideModal.tsx';
import BadgesOverlay from './components/BadgesOverlay.tsx';
import TermsModal from './components/TermsModal.tsx';
import GlobalRotatingEarth from './components/GlobalRotatingEarth.tsx';
import { db, handleFirestoreError, OperationType } from './lib/firebase.ts';
import { collection, query, where, getDocs, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { LogIn } from 'lucide-react';

export type Continent = "Africa" | "Asia" | "Europe" | "North America" | "South America" | "Oceania" | "Antarctica";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasMapsKey = Boolean(GOOGLE_MAPS_API_KEY) && GOOGLE_MAPS_API_KEY !== 'YOUR_API_KEY';

const CONTINENT_DATA: { name: Continent; image: string; description: string }[] = [
  { 
    name: "Africa", 
    image: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&q=80&w=800",
    description: "Diverse wildlife & vast savannas" 
  },
  { 
    name: "Asia", 
    image: "https://images.unsplash.com/photo-1464817739973-0128fe77aaa1?auto=format&fit=crop&q=80&w=800",
    description: "Ancient traditions & neon cities"
  },
  { 
    name: "Europe", 
    image: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&q=80&w=800",
    description: "Historical landmarks & cultural gems"
  },
  { 
    name: "North America", 
    image: "https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?auto=format&fit=crop&q=80&w=800",
    description: "Dramatic landscapes & urban life"
  },
  { 
    name: "South America", 
    image: "https://images.unsplash.com/photo-1587595431973-160d0d94add1?auto=format&fit=crop&q=80&w=800",
    description: "Lush rainforests & vibrant energy"
  },
  { 
    name: "Oceania", 
    image: "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?auto=format&fit=crop&q=80&w=800",
    description: "Island paradises & coastal beauty"
  },
  { 
    name: "Antarctica", 
    image: "https://images.unsplash.com/photo-1414490929659-9a12b7e31907?auto=format&fit=crop&q=80&w=800",
    description: "Pristine ice & extreme wilderness"
  }
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedContinent, setSelectedContinent] = useState<Continent | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSelfAssistOpen, setIsSelfAssistOpen] = useState(false);
  const [isTravelerGuideOpen, setIsTravelerGuideOpen] = useState(false);
  const [isBadgesOpen, setIsBadgesOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    saved: 0,
    planned: 0,
    archived: 0,
    contributed: 0
  });
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showTourOnly, setShowTourOnly] = useState(false);
  const [showArchiveOnly, setShowArchiveOnly] = useState(false);
  const [showTrashOnly, setShowTrashOnly] = useState(false);
  const [showUserWorldOnly, setShowUserWorldOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const [selectedLocationData, setSelectedLocationData] = useState<any | null>(null);
  const [placeDetails, setPlaceDetails] = useState<{ description: string; imageUrl: string } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [isTermsAccepted, setIsTermsAccepted] = useState(() => localStorage.getItem('world_explorer_terms_accepted') === 'true');
  const [isGuideSeen, setIsGuideSeen] = useState(() => localStorage.getItem('world_explorer_guide_seen') === 'true');
  const [flowStep, setFlowStep] = useState<'splash' | 'login' | 'terms' | 'guide' | 'app'>('splash');

  useEffect(() => {
    if (!user) return;
    
    const collections = ['favorites', 'tours', 'archives', 'locations'];
    const unsubscribes = collections.map(col => {
      const q = query(collection(db, col), where('userId', '==', user.uid));
      return onSnapshot(q, (snap) => {
        setStats(prev => ({
          ...prev,
          [col === 'favorites' ? 'saved' : col === 'tours' ? 'planned' : col === 'archives' ? 'archived' : 'contributed']: snap.size
        }));
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user]);

  useEffect(() => {
    // Initial splash duration
    const splashTimer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Track last login and ensure profile exists
        try {
          const userDoc = doc(db, 'users', currentUser.uid);
          await setDoc(userDoc, {
            lastLogin: serverTimestamp(),
            email: currentUser.email,
            updatedAt: serverTimestamp()
          }, { merge: true });

          // Sync with public profile
          const publicRef = doc(db, 'public_profiles', currentUser.uid);
          await setDoc(publicRef, {
            displayName: currentUser.displayName || 'Architectural Explorer',
            photoURL: currentUser.photoURL,
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (e) {
          console.error("Error updating profiles:", e);
        }
      }

      if (!isLoading || flowStep !== 'splash') {
        if (!currentUser) {
          setFlowStep('login');
        } else if (!isTermsAccepted) {
          setFlowStep('terms');
        } else if (!isGuideSeen) {
          setFlowStep('guide');
        } else {
          setFlowStep('app');
        }
      }
    });

    return () => {
      clearTimeout(splashTimer);
      unsubscribe();
    };
  }, [isTermsAccepted, isGuideSeen, isLoading]);

  // When loading finishes, if we are still in splash, trigger the next step
  useEffect(() => {
    if (!isLoading && flowStep === 'splash') {
      if (!user) {
        setFlowStep('login');
      } else if (!isTermsAccepted) {
        setFlowStep('terms');
      } else if (!isGuideSeen) {
        setFlowStep('guide');
      } else {
        setFlowStep('app');
      }
    }
  }, [isLoading, user, isTermsAccepted, isGuideSeen, flowStep]);

  const handleAcceptTerms = () => {
    localStorage.setItem('world_explorer_terms_accepted', 'true');
    setIsTermsAccepted(true);
    if (!isGuideSeen) {
      setFlowStep('guide');
    } else {
      setFlowStep('app');
    }
  };

  const handleFinishGuide = () => {
    localStorage.setItem('world_explorer_guide_seen', 'true');
    setIsGuideSeen(true);
    setFlowStep('app');
  };

  const handleLogin = async () => {
    try {
      const resultUser = await signInWithGoogle();
      if (resultUser) {
        if (!isTermsAccepted) {
          setFlowStep('terms');
        } else if (!isGuideSeen) {
          setFlowStep('guide');
        } else {
          setFlowStep('app');
        }
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleSuggestionClick = async (placeName: string, initialImage?: string) => {
    setSelectedPlace(placeName);
    setLoadingDetails(true);
    // Preserve initial image while generating description
    if (initialImage) {
      setPlaceDetails({ description: '', imageUrl: initialImage });
    } else {
      setPlaceDetails(null);
    }

    try {
      const response = await fetch('/api/generate-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place: placeName }),
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to generate');
        }

        const keywords = encodeURIComponent(data.imageKeywords || placeName);
        setPlaceDetails({
          description: data.description,
          imageUrl: initialImage || `https://images.unsplash.com/photo-1548013146-72479768b0fd?auto=format&fit=crop&q=80&w=800&keywords=${keywords}`
        });
      } else {
        throw new Error("Unexpected server response");
      }
    } catch (error: any) {
      console.error("Detail generation error:", error);
      let errorMessage = "The Traveler Guide is currently overwhelmed with requests. Please try again in a moment.";
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        errorMessage = "Unable to connect to the guide server. Please verify your connection.";
      }
      setPlaceDetails({
        description: errorMessage,
        imageUrl: initialImage || "https://images.unsplash.com/photo-1548013146-72479768b0fd?auto=format&fit=crop&q=80&w=800"
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleShare = async (title: string, text: string, url: string = window.location.href) => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
    }
  };

  const handleSelection = (continent: Continent | null, country: string | null, state: string | null, showFavorites: boolean = false, showTour: boolean = false, showArchive: boolean = false, showTrash: boolean = false, showUserWorld: boolean = false) => {
    setSelectedContinent(continent);
    setSelectedCountry(country);
    setSelectedState(state);
    setShowFavoritesOnly(showFavorites);
    setShowTourOnly(showTour);
    setShowArchiveOnly(showArchive);
    setShowTrashOnly(showTrash);
    setShowUserWorldOnly(showUserWorld);
    setSearchQuery(''); // Clear search when navigating categories
    
    // Close sidebar on mobile after selection
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleAssistantAction = (action: string) => {
    switch (action) {
      case 'open_add_location':
        user ? setIsAddModalOpen(true) : signInWithGoogle();
        break;
      case 'open_search':
        const searchInput = document.querySelector('header input') as HTMLInputElement;
        if (searchInput) searchInput.focus();
        break;
      case 'view_favorites':
        handleSelection(null, null, null, true);
        break;
      case 'view_world':
        handleSelection(null, null, null);
        break;
    }
  };

  if (isLoading || flowStep === 'splash') {
    return <SplashLoader />;
  }

  if (flowStep === 'login') {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex flex-col items-center justify-center p-6 text-[#141414] relative overflow-hidden">
        <GlobalRotatingEarth />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white p-12 rounded-[48px] shadow-2xl space-y-10 text-center border border-[#141414]/5"
        >
          <div className="flex flex-col items-center gap-6">
            <div className="w-20 h-20 bg-[#141414] rounded-[32px] flex items-center justify-center shadow-xl rotate-12 group-hover:rotate-0 transition-transform">
              <Compass className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-serif italic tracking-tight">World Explorer</h1>
              <p className="text-[10px] uppercase font-black tracking-[0.3em] opacity-30 mt-2">The Global Archive</p>
            </div>
          </div>

          <p className="text-sm opacity-50 leading-relaxed max-w-[280px] mx-auto">
            Link your Google account to join our collective of modern-day explorers and archive earth's architectural gems.
          </p>

          <button
            onClick={handleLogin}
            className="w-full bg-[#141414] text-white py-5 rounded-[24px] font-bold text-lg uppercase tracking-widest hover:bg-[#333] active:scale-[0.98] transition-all flex items-center justify-center gap-4 shadow-xl"
          >
            <LogIn className="w-6 h-6" /> Start Exploring
          </button>

          <div className="pt-6 flex flex-col items-center gap-4">
             <div className="h-px w-12 bg-[#141414]/10" />
             <div className="text-[9px] uppercase font-black tracking-widest opacity-20">Safe & Secure Authentication</div>
          </div>
        </motion.div>
        
        <div className="mt-12 opacity-30 uppercase tracking-[0.3em] font-black pointer-events-none select-none text-[8px] md:text-[10px] text-center">
          &copy; 2026 World Explorer &bull; Discovery Engine v4.0
        </div>
      </div>
    );
  }

  if (flowStep === 'terms') {
    return <TermsModal onAccept={handleAcceptTerms} />;
  }

  if (flowStep === 'guide') {
    return <AppGuideModal isOpen={true} onClose={handleFinishGuide} />;
  }

  const renderActiveContent = () => {
    if (showFavoritesOnly) {
      return (
        <div className="space-y-12">
          <div className="max-w-3xl">
            <h1 className="font-serif italic text-6xl md:text-9xl mb-6 tracking-tighter leading-[0.8]">
              Saved <br /> <span className="text-[#5A5A40]">Places</span>
            </h1>
            <p className="text-xl opacity-60 leading-relaxed">
              Your personal architectural archive. Revisit the locations that inspired you or plan your next journey.
            </p>
          </div>

          <LocationList 
            continent={null} 
            country={null} 
            state={null} 
            showFavoritesOnly={true} 
            searchQuery={searchQuery}
            onSelect={setSelectedLocationData}
          />
        </div>
      );
    }

    if (showTourOnly) {
      return (
        <div className="space-y-12">
          <div className="max-w-3xl">
            <h1 className="font-serif italic text-6xl md:text-9xl mb-6 tracking-tighter leading-[0.8]">
              Next <br /> <span className="text-[#00af87]">Tour</span>
            </h1>
            <p className="text-xl opacity-60 leading-relaxed">
              Your upcoming itinerary. These are the locations you've marked for your next exploration.
            </p>
          </div>

          <LocationList 
            continent={null} 
            country={null} 
            state={null} 
            showTourOnly={true} 
            searchQuery={searchQuery}
            onSelect={setSelectedLocationData}
          />
        </div>
      );
    }

    if (showArchiveOnly) {
      return (
        <div className="space-y-12">
          <div className="max-w-3xl">
            <h1 className="font-serif italic text-6xl md:text-9xl mb-6 tracking-tighter leading-[0.8]">
              Locked <br /> <span className="text-[#141414]/40 italic">Archives</span>
            </h1>
            <p className="text-xl opacity-60 leading-relaxed">
              Your personal discovery vault. Explore the places you've archived for safe keeping.
            </p>
          </div>

          <LocationList 
            continent={null} 
            country={null} 
            state={null} 
            showArchiveOnly={true} 
            searchQuery={searchQuery}
            onSelect={setSelectedLocationData}
          />
        </div>
      );
    }

    if (showTrashOnly) {
      return (
        <div className="space-y-12">
          <div className="max-w-3xl">
            <h1 className="font-serif italic text-6xl md:text-9xl mb-6 tracking-tighter leading-[0.8] text-red-500">
              Trash <br /> <span className="text-[#141414]/40 italic">Bin</span>
            </h1>
            <p className="text-xl opacity-60 leading-relaxed">
              Items here are scheduled for deletion. You can restore them if you changed your mind.
            </p>
          </div>

          <LocationList 
            continent={null} 
            country={null} 
            state={null} 
            showTrashOnly={true} 
            searchQuery={searchQuery}
            onSelect={setSelectedLocationData}
          />
        </div>
      );
    }

    if (showUserWorldOnly) {
      return (
        <div className="space-y-12">
          <div className="max-w-3xl">
            <h1 className="font-serif italic text-6xl md:text-9xl mb-6 tracking-tighter leading-[0.8]">
              Community <br /> <span className="text-[#5A5A40]">Discoveries</span>
            </h1>
            <p className="text-xl opacity-60 leading-relaxed">
               Explore the global archive of every fellow traveler. These are personal gems shared by the community, independent of AI recommendations.
            </p>
          </div>

          <LocationList 
            continent={null} 
            country={null} 
            state={null} 
            showUserAddedOnly={true} 
            searchQuery={searchQuery}
            onSelect={setSelectedLocationData}
          />
        </div>
      );
    }

    if (!selectedContinent) {
      return (
        <div className="space-y-12">
          <div className="max-w-3xl">
            <h1 className="font-serif italic text-6xl md:text-9xl tracking-tighter leading-[0.8] mb-8">
              World <br /> <span className="text-[#5A5A40]">Explorer</span>
            </h1>
            
            <div className="mb-8 flex items-center gap-4">
               <motion.img 
                 initial={{ opacity: 0, scale: 0.8 }}
                 animate={{ opacity: 1, scale: 1 }}
                 transition={{ delay: 0.3 }}
                 src="https://flagcdn.com/in.svg" 
                 alt="India Flag" 
                 className="w-20 md:w-32 h-auto rounded-xl shadow-2xl border border-[#141414]/5 transition-all hover:scale-110 active:scale-95 cursor-pointer" 
               />
               <div className="h-12 w-[1px] bg-[#141414]/10" />
               <div className="text-[10px] uppercase tracking-[0.2em] font-black opacity-20">Verified Archive</div>
            </div>

            <p className="text-xl md:text-2xl opacity-60 leading-relaxed font-light">
              A collaborative archive of earth's most remarkable places. Use the mini menu to navigate continents, countries, and regional gems.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
             {hasMapsKey && (
              <button
                onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
                className="flex items-center gap-3 bg-[#5A5A40] text-white px-8 py-4 rounded-full shadow-xl shadow-[#5A5A40]/20 hover:bg-[#4a4a30] transition-all text-sm uppercase tracking-widest font-bold"
              >
                {viewMode === 'list' ? <><MapIcon className="w-4 h-4" /> Open Global Map</> : <><LayoutGrid className="w-4 h-4" /> View as Feed</>}
              </button>
            )}
            <button
               onClick={() => user ? setIsAddModalOpen(true) : signInWithGoogle()}
               className="bg-white border border-[#141414]/10 px-8 py-4 rounded-full text-sm uppercase tracking-widest font-bold hover:bg-[#f5f5f0] transition-colors flex items-center gap-2"
            >
              {user ? 'Share a Discovery' : 'Link Google to Share'}
            </button>
            <button
               onClick={() => handleShare('World Explorer', 'Explore the world with World Explorer! Architecture, heritage, and hidden gems.')}
               className="rgb-bg animate-rgb text-white p-4 rounded-full shadow-lg transition-all flex items-center justify-center group"
               title="Share App"
            >
              <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {viewMode === 'map' && hasMapsKey ? (
              <motion.div key="global-map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <WorldView 
                  continent={null} 
                  country={null} 
                  state={null} 
                  showFavoritesOnly={showFavoritesOnly}
                  showTourOnly={showTourOnly}
                  showUserAddedOnly={showUserWorldOnly}
                  searchQuery={searchQuery} 
                  onSelect={setSelectedLocationData} 
                />
              </motion.div>
            ) : (
              <motion.div 
                key="continent-grid" 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="space-y-16"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {CONTINENT_DATA.map((continent, i) => (
                    <motion.button 
                      key={continent.name} 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => handleSelection(continent.name, null, null)}
                      className="group relative h-[300px] overflow-hidden rounded-[40px] shadow-sm transition-all hover:shadow-xl hover:-translate-y-2 text-left"
                    >
                      <img 
                        src={continent.image} 
                        alt={continent.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#141414]/90 via-[#141414]/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 p-8 w-full">
                        <div className="flex items-center gap-2 text-white/50 text-[10px] uppercase tracking-widest font-bold mb-2">
                          <Compass className="w-3 h-3" /> Explore Region
                        </div>
                        <h3 className="text-3xl font-serif italic text-white mb-1 tracking-tight">{continent.name}</h3>
                        <p className="text-white/60 text-xs leading-relaxed max-w-[200px]">{continent.description}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>

                <div className="pt-12 border-t border-[#141414]/5">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-4xl font-serif italic tracking-tight">Trending <span className="text-[#00af87]">Suggestions</span></h3>
                    <div className="flex gap-2">
                       {['Adventurous', 'Cultural', 'Relaxing'].map(cat => (
                         <button key={cat} className="px-5 py-2.5 rounded-full bg-[#f8f8f5] border border-[#141414]/5 text-[10px] font-black uppercase tracking-widest hover:bg-[#141414] hover:text-white transition-all shadow-sm">
                           {cat}
                         </button>
                       ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[
                      { 
                        title: "Taj Mahal, Agra", 
                        type: "Heritage", 
                        img: "/images/taj_mahal.png" 
                      },
                      { 
                        title: "Hawa Mahal, Jaipur", 
                        type: "Heritage", 
                        img: "/images/hawa_mahal.png" 
                      },
                      { 
                        title: "Varanasi Ghats", 
                        type: "Spiritual", 
                        img: "/images/varanasi.png" 
                      },
                      { 
                        title: "Kerala Backwaters", 
                        type: "Nature", 
                        img: "/images/kerala.png" 
                      }
                    ].map((item, i) => (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 + (i * 0.1) }}
                        onClick={() => handleSuggestionClick(item.title, item.img)}
                        className="group cursor-pointer active:scale-95 transition-all"
                      >
                        <div className="relative h-64 rounded-[40px] overflow-hidden mb-6 shadow-sm group-hover:shadow-2xl group-hover:-translate-y-2 transition-all duration-500">
                          <img 
                            src={item.img} 
                            alt={item.title}
                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="absolute bottom-6 left-6 right-6 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500">
                             <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#00af87] mb-1 block">Live Prediction</span>
                             <div className="text-white font-serif italic text-lg">Detailed analysis available</div>
                          </div>
                          <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-sm">{item.type}</div>
                        </div>
                        <h4 className="font-serif italic text-2xl group-hover:text-[#00af87] transition-colors leading-tight">{item.title}</h4>
                      </motion.div>
                    ))}
                  </div>
                </div>


              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Breadcrumbs for easier navigation */}
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-black opacity-30 mb-8 px-1">
          {selectedContinent} 
          {selectedCountry && <><ChevronRight className="w-3 h-3" /> {selectedCountry}</>}
          {selectedState && <><ChevronRight className="w-3 h-3" /> {selectedState}</>}
        </div>

        <DiscoveryHero 
          locationName={selectedState || selectedCountry || selectedContinent || ""} 
          imageUrl={selectedContinent ? CONTINENT_DATA.find(c => c.name === selectedContinent)?.image : undefined}
          description={selectedContinent ? CONTINENT_DATA.find(c => c.name === selectedContinent)?.description : undefined}
        />

        <div className="flex items-center justify-end gap-4 pt-8">
          <div className="flex items-center gap-4">
            {hasMapsKey && (
              <button
                onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
                className="p-4 rounded-full bg-white border border-[#141414]/10 shadow-sm hover:shadow-md transition-all text-[#5A5A40]"
              >
                {viewMode === 'list' ? <MapIcon className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
              </button>
            )}
            <button
               onClick={() => user ? setIsAddModalOpen(true) : signInWithGoogle()}
               className="bg-[#5A5A40] text-white px-8 py-4 rounded-full flex items-center gap-2 hover:bg-[#4a4a30] transition-colors shadow-xl shadow-[#5A5A40]/30 font-bold uppercase text-xs tracking-widest"
            >
              <Plus className="w-4 h-4" /> {user ? 'Add Location' : 'Connect Google'}
            </button>
            <button
               onClick={() => handleShare(
                 `Discovering ${selectedState || selectedCountry || selectedContinent || 'Places'}`,
                 `I'm exploring amazing places in ${selectedState || selectedCountry || selectedContinent || 'World Explorer'}!`
               )}
               className="rgb-bg animate-rgb text-white p-4 rounded-full shadow-lg transition-all flex items-center justify-center group"
               title="Share Context"
            >
               <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>

        <div className="mt-12 mb-8">
          {/* Spacing for content */}
        </div>

        <AnimatePresence mode="wait">
          {viewMode === 'map' && hasMapsKey ? (
            <motion.div key="filtered-map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <WorldView 
                continent={selectedContinent} 
                country={selectedCountry} 
                state={selectedState} 
                showFavoritesOnly={showFavoritesOnly}
                showTourOnly={showTourOnly}
                showUserAddedOnly={showUserWorldOnly}
                searchQuery={searchQuery} 
                onSelect={setSelectedLocationData} 
              />
            </motion.div>
          ) : (
            <motion.div key="filtered-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {selectedState ? (
                <LocationList 
                  continent={selectedContinent} 
                  country={selectedCountry} 
                  state={selectedState} 
                  searchQuery={searchQuery} 
                  onSelect={setSelectedLocationData}
                />
              ) : selectedCountry ? (
                <div className="space-y-6">
                  {/* LocationList handles the filtering of countries even if state is null now based on previous edits */}
                  <LocationList 
                    continent={selectedContinent} 
                    country={selectedCountry} 
                    state={null} 
                    searchQuery={searchQuery} 
                    onSelect={setSelectedLocationData}
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  <LocationList 
                    continent={selectedContinent} 
                    country={null} 
                    state={null} 
                    searchQuery={searchQuery} 
                    onSelect={setSelectedLocationData}
                  />
               </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0] font-sans text-[#141414]">
      <Header 
        user={user} 
        searchQuery={searchQuery} 
        onSearchChange={setSearchQuery} 
        onProfileClick={() => setIsProfileOpen(true)}
        onBadgesClick={() => setIsBadgesOpen(true)}
        onLeaderboardClick={() => setIsLeaderboardOpen(true)}
        onGuideClick={() => setIsGuideOpen(true)}
      />
      
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row min-h-[calc(100-80px)]">
        {/* Mobile Nav Toggle */}
        <div className="md:hidden px-6 py-4 border-b border-[#141414]/5 flex items-center justify-between sticky top-0 bg-[#f5f5f0]/80 backdrop-blur-md z-40">
           <button 
             onClick={() => setIsSidebarOpen(!isSidebarOpen)}
             className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold opacity-60"
           >
             {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
             {isSidebarOpen ? 'Close' : "Menu"}
           </button>
           
           <div className="flex items-center gap-1.5">
             <button 
               onClick={() => setIsLeaderboardOpen(true)}
               className="w-8 h-8 rounded-lg bg-[#141414] text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform"
               title="Leaderboard"
             >
               <Trophy className="w-4 h-4" />
             </button>
             <button 
               onClick={() => setIsBadgesOpen(true)}
               className="w-8 h-8 rounded-lg bg-red-500 text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform"
               title="Achievement Hold"
             >
               <Trophy className="w-4 h-4" />
             </button>
             <button onClick={() => handleSelection(null, null, null)} className={`p-2 rounded-lg ${!selectedContinent && !showTourOnly && !showArchiveOnly && !showFavoritesOnly && !showTrashOnly && !showUserWorldOnly ? 'bg-[#5A5A40] text-white' : 'text-[#141414]/40'}`}>
               <Globe className="w-4 h-4" />
             </button>
             <button onClick={() => handleSelection(null, null, null, false, false, false, false, true)} className={`p-2 rounded-lg ${showUserWorldOnly ? 'bg-[#5A5A40] text-white' : 'text-[#141414]/40'}`}>
               <Compass className="w-4 h-4" />
             </button>
             <button onClick={() => handleSelection(null, null, null, false, true)} className={`p-2 rounded-lg ${showTourOnly ? 'bg-[#00af87] text-white' : 'text-[#141414]/40'}`}>
               <Calendar className="w-4 h-4" />
             </button>
             <button onClick={() => handleSelection(null, null, null, false, false, true)} className={`p-2 rounded-lg ${showArchiveOnly ? 'bg-[#141414] text-white' : 'text-[#141414]/40'}`}>
               <Bookmark className="w-4 h-4" />
             </button>
             <button onClick={() => handleSelection(null, null, null, true)} className={`p-2 rounded-lg ${showFavoritesOnly ? 'bg-[#5A5A40] text-white' : 'text-[#141414]/40'}`}>
               <Heart className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
             </button>
             <button onClick={() => handleSelection(null, null, null, false, false, false, true)} className={`p-2 rounded-lg ${showTrashOnly ? 'bg-red-500 text-white' : 'text-[#141414]/40'}`}>
               <Trash2 className="w-4 h-4" />
             </button>
           </div>
        </div>

        {/* Unified Mini Menu Sidebar */}
        <aside className={`
          ${isSidebarOpen ? 'w-full md:w-[320px] translate-x-0 opacity-100' : 'w-0 -translate-x-full opacity-0 md:opacity-100'} 
          transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] 
          fixed md:sticky top-0 md:top-20 h-screen md:h-[calc(100vh-80px)] 
          bg-[#f5f5f0] border-r border-[#141414]/5 overflow-y-auto z-30
        `}>
          <SidebarNav 
            selectedContinent={selectedContinent}
            selectedCountry={selectedCountry}
            selectedState={selectedState}
            showFavoritesOnly={showFavoritesOnly}
            showTourOnly={showTourOnly}
            showArchiveOnly={showArchiveOnly}
            showTrashOnly={showTrashOnly}
            showUserWorldOnly={showUserWorldOnly}
            onSelect={handleSelection}
          />
        </aside>

        {/* Main Dynamic Content Area */}
        <main className="flex-1 px-6 md:px-16 py-12 pb-32">
          {/* Self Assist Bot - Interactive Bar */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setIsSelfAssistOpen(true)}
            className="w-full bg-[#141414] h-12 md:h-16 mb-12 rounded-[20px] flex items-center justify-center cursor-pointer hover:bg-black transition-all group relative overflow-hidden shadow-xl shadow-black/10 border border-white/5"
          >
            <div className="absolute inset-0 border-2 border-white/10 m-1.5 rounded-[14px] pointer-events-none" />
            <div className="flex items-center gap-3 text-white font-black uppercase tracking-[0.2em] text-[9px] md:text-[11px] relative z-10">
              <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-white/10 bg-blue-500 shadow-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="group-hover:scale-105 transition-transform">Access Self Assist Bot</span>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse ml-2" />
            </div>
          </motion.div>

          {/* Floating Action Button for Traveler Guide Bot */}
          <motion.div 
            drag
            dragConstraints={{ left: -window.innerWidth + 100, right: 0, top: -window.innerHeight + 100, bottom: 0 }}
            dragElastic={0.1}
            whileDrag={{ scale: 1.1, cursor: 'grabbing' }}
            className="fixed bottom-6 right-6 z-[100]"
          >
            <button 
              onClick={() => setIsTravelerGuideOpen(true)}
              className="group relative flex items-center justify-center w-14 h-14 bg-[#141414] rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all border border-white/10"
              title="Traveler Guide Bot"
            >
              <Bot className="w-6 h-6 text-white" />
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-[#00af87] rounded-full border-2 border-white flex items-center justify-center"
              >
                <div className="w-1 h-1 bg-white rounded-full" />
              </motion.div>
            </button>

            {/* Quick Guide Trigger */}
            <button
              onClick={() => setIsGuideOpen(true)}
              className="absolute -top-10 right-0 py-1.5 px-3 bg-white border border-[#141414]/10 rounded-full shadow-lg text-[9px] font-black uppercase tracking-widest text-[#141414] hover:bg-[#141414] hover:text-white transition-all whitespace-nowrap"
            >
              Need Help?
            </button>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${selectedContinent}-${selectedCountry}-${selectedState}-${viewMode}-${showFavoritesOnly}-${showTourOnly}-${showArchiveOnly}-${showTrashOnly}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {renderActiveContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AddLocationModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        continent={selectedContinent || "Asia"}
        user={user}
      />

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-[#141414]/10 mt-20">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 opacity-40 text-sm uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4" /> World Explorer &copy; 2026
          </div>
          <div>Built with passion for travelers</div>
        </div>
      </footer>


      <PlaceDetailsModal 
        isOpen={!!selectedPlace || !!selectedLocationData}
        placeName={selectedPlace || selectedLocationData?.name || ""}
        onClose={() => {
          setSelectedPlace(null);
          setSelectedLocationData(null);
        }}
        details={selectedLocationData ? { 
          description: selectedLocationData.description, 
          imageUrl: selectedLocationData.imageUrl 
        } : placeDetails}
        loading={loadingDetails}
        locationId={selectedLocationData?.id}
        userId={selectedLocationData?.userId}
        isDeleted={selectedLocationData?.isDeleted}
      />
      <GlobalRotatingEarth />
      <InteractiveBackground />
      <UserProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        user={user} 
      />

      <BadgesOverlay
        isOpen={isBadgesOpen}
        onClose={() => setIsBadgesOpen(false)}
        stats={stats}
      />
      <LeaderboardModal 
        isOpen={isLeaderboardOpen} 
        onClose={() => setIsLeaderboardOpen(false)} 
      />
      <AppGuideModal 
        isOpen={isGuideOpen} 
        onClose={() => setIsGuideOpen(false)} 
      />
      <SelfAssistBot 
        isOpen={isSelfAssistOpen} 
        onClose={() => setIsSelfAssistOpen(false)} 
        onAction={handleAssistantAction}
      />
      <TravelerGuide 
        isOpen={isTravelerGuideOpen} 
        onClose={() => setIsTravelerGuideOpen(false)} 
        onAction={handleAssistantAction}
      />
    </div>
  );
}

