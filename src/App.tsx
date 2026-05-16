/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase.ts';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Plus, Compass, LogOut, ChevronLeft, Search, Map as MapIcon, LayoutGrid } from 'lucide-react';
import Header from './components/Header.tsx';
import ContinentSelector from './components/ContinentSelector.tsx';
import CountrySelector from './components/CountrySelector.tsx';
import LocationList from './components/LocationList.tsx';
import AddLocationModal from './components/AddLocationModal.tsx';
import WorldView from './components/WorldView.tsx';
import GoogleMapsSplash from './components/GoogleMapsSplash.tsx';

export type Continent = "Africa" | "Asia" | "Europe" | "North America" | "South America" | "Oceania" | "Antarctica";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasMapsKey = Boolean(GOOGLE_MAPS_API_KEY) && GOOGLE_MAPS_API_KEY !== 'YOUR_API_KEY';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedContinent, setSelectedContinent] = useState<Continent | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleBackToContinents = () => {
    setSelectedContinent(null);
    setSelectedCountry(null);
  };

  const handleBackToCountries = () => {
    setSelectedCountry(null);
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

  return (
    <div className="min-h-screen bg-[#f5f5f0] font-sans text-[#141414]">
      <Header user={user} />
      
      <main className="max-w-7xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {!selectedContinent ? (
            <motion.div
              key="continent-selector"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div>
                  <h1 className="font-serif italic text-6xl md:text-8xl mb-4 tracking-tighter">
                    World Explorer
                  </h1>
                  <p className="text-xl opacity-60 max-w-2xl">
                    A user-generated travel guide. Share your favorite corners of the world and discover new adventures.
                  </p>
                </div>
                
                {hasMapsKey && (
                  <button
                    onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
                    className="flex items-center gap-3 bg-white/50 backdrop-blur-sm px-6 py-3 rounded-full border border-[#141414]/10 hover:bg-white transition-all text-sm uppercase tracking-widest font-bold"
                  >
                    {viewMode === 'list' ? (
                      <><MapIcon className="w-4 h-4" /> Global Map</>
                    ) : (
                      <><LayoutGrid className="w-4 h-4" /> Continents</>
                    )}
                  </button>
                )}
              </div>

              {viewMode === 'map' && hasMapsKey ? (
                <WorldView continent={null} />
              ) : (
                <ContinentSelector onSelect={setSelectedContinent} />
              )}
            </motion.div>
          ) : !selectedCountry ? (
            <motion.div
              key="country-selector"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
                <div>
                  <button 
                    onClick={handleBackToContinents}
                    className="flex items-center gap-2 text-sm uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity mb-4"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back to Continents
                  </button>
                  <h2 className="font-serif italic text-5xl md:text-7xl tracking-tighter capitalize leading-[0.9]">
                    Select Country <br /> <span className="text-[#5A5A40]">in {selectedContinent}</span>
                  </h2>
                </div>
                
                <div className="flex items-center gap-4">
                  {hasMapsKey && (
                    <button
                      onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
                      className="p-4 rounded-full bg-white border border-[#141414]/10 shadow-sm hover:shadow-md transition-all"
                    >
                      {viewMode === 'list' ? <MapIcon className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
                    </button>
                  )}
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    disabled={!user}
                    className="bg-[#5A5A40] text-white px-8 py-4 rounded-full flex items-center gap-2 hover:bg-[#4a4a30] transition-colors disabled:opacity-50 shadow-xl shadow-[#5A5A40]/20"
                  >
                    <Plus className="w-5 h-5" /> Add Location
                  </button>
                </div>
              </div>

              {viewMode === 'map' && hasMapsKey ? (
                <WorldView continent={selectedContinent} />
              ) : (
                <CountrySelector continent={selectedContinent} onSelect={setSelectedCountry} />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="location-list"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
                <div>
                  <button 
                    onClick={handleBackToCountries}
                    className="flex items-center gap-2 text-sm uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity mb-4"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back to Countries
                  </button>
                  <h2 className="font-serif italic text-5xl md:text-7xl tracking-tighter capitalize">
                    {selectedCountry}
                  </h2>
                  <p className="text-sm uppercase tracking-widest opacity-40 mt-2 font-bold">{selectedContinent}</p>
                </div>
                
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    disabled={!user}
                    className="bg-[#5A5A40] text-white px-8 py-4 rounded-full flex items-center gap-2 hover:bg-[#4a4a30] transition-colors disabled:opacity-50 shadow-xl shadow-[#5A5A40]/20"
                  >
                    <Plus className="w-5 h-5" /> Add Location
                  </button>
                </div>
              </div>

              <LocationList continent={selectedContinent} country={selectedCountry} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AddLocationModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        continent={selectedContinent || "Asia"}
        user={user}
      />

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-[#141414]/10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 opacity-40 text-sm uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4" /> World Explorer &copy; 2026
          </div>
          <div>Built with passion for travelers</div>
        </div>
      </footer>
    </div>
  );
}

