/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase.ts';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Plus, Compass, LogOut, ChevronLeft, Search, Map as MapIcon, LayoutGrid, Menu, X, ChevronRight, Globe } from 'lucide-react';
import Header from './components/Header.tsx';
import SidebarNav from './components/SidebarNav.tsx';
import LocationList from './components/LocationList.tsx';
import AddLocationModal from './components/AddLocationModal.tsx';
import WorldView from './components/WorldView.tsx';
import GoogleMapsSplash from './components/GoogleMapsSplash.tsx';
import DiscoveryHero from './components/DiscoveryHero.tsx';
import AIAssistant from './components/AIAssistant.tsx';

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
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSelection = (continent: Continent | null, country: string | null, state: string | null, showFavorites: boolean = false) => {
    setSelectedContinent(continent);
    setSelectedCountry(country);
    setSelectedState(state);
    setShowFavoritesOnly(showFavorites);
    
    // Close sidebar on mobile after selection
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <Compass className="w-12 h-12 text-[#5A5A40]" />
        </motion.div>
      </div>
    );
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
          />
        </div>
      );
    }

    if (!selectedContinent) {
      return (
        <div className="space-y-12">
          <div className="max-w-3xl">
            <h1 className="font-serif italic text-6xl md:text-9xl mb-6 tracking-tighter leading-[0.8]">
              World <br /> <span className="text-[#5A5A40]">Explorer</span>
            </h1>
            <p className="text-xl opacity-60 leading-relaxed">
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
               onClick={() => setIsAddModalOpen(true)}
               disabled={!user}
               className="bg-white border border-[#141414]/10 px-8 py-4 rounded-full text-sm uppercase tracking-widest font-bold hover:bg-[#f5f5f0] transition-colors disabled:opacity-50"
            >
              Share a Discovery
            </button>
          </div>

          <AnimatePresence mode="wait">
            {viewMode === 'map' && hasMapsKey ? (
              <motion.div key="global-map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <WorldView continent={null} country={null} state={null} />
              </motion.div>
            ) : (
              <motion.div 
                key="continent-grid" 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
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

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 pt-8">
          <div>
            <h2 className="font-serif italic text-6xl md:text-8xl tracking-tighter leading-[0.9] capitalize">
              Explore {selectedState || selectedCountry || selectedContinent}
            </h2>
            <p className="text-xl opacity-40 mt-4 max-w-xl leading-relaxed italic">
              See the best tours, hidden spots, and community favorites in this region.
            </p>
          </div>

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
               onClick={() => setIsAddModalOpen(true)}
               disabled={!user}
               className="bg-[#5A5A40] text-white px-8 py-4 rounded-full flex items-center gap-2 hover:bg-[#4a4a30] transition-colors disabled:opacity-50 shadow-xl shadow-[#5A5A40]/30 font-bold uppercase text-xs tracking-widest"
            >
              <Plus className="w-4 h-4" /> Add Location
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-[#141414]/5 pb-4 mt-12 mb-8">
           <div className="flex gap-8 text-sm font-bold uppercase tracking-widest opacity-40">
              <button className="text-[#141414] border-b-2 border-[#141414] pb-4">Top Rated</button>
              <button className="hover:opacity-100 transition-opacity">Recent</button>
              <button className="hover:opacity-100 transition-opacity">Map View</button>
           </div>
           <button className="text-xs font-black uppercase tracking-widest text-[#5A5A40] bg-[#5A5A40]/10 px-6 py-2.5 rounded-full hover:bg-[#5A5A40]/20 transition-all">
              See all tours
           </button>
        </div>

        <AnimatePresence mode="wait">
          {viewMode === 'map' && hasMapsKey ? (
            <motion.div key="filtered-map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <WorldView continent={selectedContinent} country={selectedCountry} state={selectedState} />
            </motion.div>
          ) : (
            <motion.div key="filtered-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {selectedState ? (
                <LocationList continent={selectedContinent} country={selectedCountry} state={selectedState} />
              ) : selectedCountry ? (
                <div className="space-y-6">
                  {/* LocationList handles the filtering of countries even if state is null now based on previous edits */}
                  <LocationList continent={selectedContinent} country={selectedCountry} state={null} />
                </div>
              ) : (
                <div className="space-y-6">
                  <LocationList continent={selectedContinent} country={null} state={null} />
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
      <Header user={user} />
      
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row min-h-[calc(100-80px)]">
        {/* Mobile Nav Toggle */}
        <div className="md:hidden px-6 py-4 border-b border-[#141414]/5 flex items-center justify-between sticky top-0 bg-[#f5f5f0]/80 backdrop-blur-md z-40">
           <button 
             onClick={() => setIsSidebarOpen(!isSidebarOpen)}
             className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold opacity-60"
           >
             {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
             {isSidebarOpen ? 'Close Menu' : "Discover Menu"}
           </button>
           <div className="text-[10px] uppercase font-black tracking-widest opacity-20">Navigation</div>
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
            onSelect={handleSelection}
          />
        </aside>

        {/* Main Dynamic Content Area */}
        <main className="flex-1 px-6 md:px-16 py-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${selectedContinent}-${selectedCountry}-${selectedState}-${viewMode}-${showFavoritesOnly}`}
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

      <AIAssistant />
    </div>
  );
}

