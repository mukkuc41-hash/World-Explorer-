import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { Continent } from '../App.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronDown, Globe, MapPin, Map, Compass, Heart } from 'lucide-react';

interface SidebarNavProps {
  selectedContinent: Continent | null;
  selectedCountry: string | null;
  selectedState: string | null;
  showFavoritesOnly?: boolean;
  onSelect: (continent: Continent | null, country: string | null, state: string | null, showFavorites?: boolean) => void;
}

const CONTINENTS: Continent[] = ["Africa", "Asia", "Europe", "North America", "South America", "Oceania", "Antarctica"];

export default function SidebarNav({ selectedContinent, selectedCountry, selectedState, showFavoritesOnly, onSelect }: SidebarNavProps) {
  const [countries, setCountries] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  
  // Internal expansion state to allow browsing without changing the main view
  const [expandedContinent, setExpandedContinent] = useState<Continent | null>(selectedContinent);
  const [expandedCountry, setExpandedCountry] = useState<string | null>(selectedCountry);

  // Sync internal state with props when they change externally
  useEffect(() => {
    if (selectedContinent) setExpandedContinent(selectedContinent);
    if (selectedCountry) setExpandedCountry(selectedCountry);
  }, [selectedContinent, selectedCountry]);

  // Fetch countries when a continent is expanded
  useEffect(() => {
    if (!expandedContinent) {
      setCountries([]);
      return;
    }

    setLoadingCountries(true);
    const q = query(
      collection(db, 'locations'),
      where('continent', '==', expandedContinent)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const uniqueCountries = new Set<string>();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.country) uniqueCountries.add(data.country);
      });
      setCountries(Array.from(uniqueCountries).sort());
      setLoadingCountries(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'locations');
      setLoadingCountries(false);
    });

    return () => unsubscribe();
  }, [expandedContinent]);

  // Fetch states when a country is expanded
  useEffect(() => {
    if (!expandedContinent || !expandedCountry) {
      setStates([]);
      return;
    }

    setLoadingStates(true);
    const q = query(
      collection(db, 'locations'),
      where('continent', '==', expandedContinent),
      where('country', '==', expandedCountry)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const uniqueStates = new Set<string>();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.state) uniqueStates.add(data.state);
      });
      setStates(Array.from(uniqueStates).sort());
      setLoadingStates(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'locations');
      setLoadingStates(false);
    });

    return () => unsubscribe();
  }, [expandedContinent, expandedCountry]);

  const toggleContinent = (continent: Continent) => {
    if (expandedContinent === continent) {
      setExpandedContinent(null);
    } else {
      setExpandedContinent(continent);
      onSelect(continent, null, null);
    }
  };

  const toggleCountry = (continent: Continent, country: string) => {
    if (expandedCountry === country) {
      setExpandedCountry(null);
    } else {
      setExpandedCountry(country);
      onSelect(continent, country, null);
    }
  };

  return (
    <div className="space-y-2 py-4">
      <div className="px-4 mb-6">
        <h3 className="text-[10px] uppercase tracking-[0.2em] font-black opacity-30 mb-2">Navigation</h3>
        <button 
          onClick={() => {
            onSelect(null, null, null);
            setExpandedContinent(null);
            setExpandedCountry(null);
          }}
          className={`flex items-center gap-3 w-full p-3 rounded-2xl transition-all ${!selectedContinent ? 'bg-[#5A5A40] text-white shadow-lg shadow-[#5A5A40]/30' : 'hover:bg-white/50 text-[#141414]/60'}`}
        >
          <Globe className="w-4 h-4" />
          <span className="text-sm font-bold">World View</span>
        </button>

        <button 
          onClick={() => {
            onSelect(null, null, null, true);
            setExpandedContinent(null);
            setExpandedCountry(null);
          }}
          className={`flex items-center gap-3 w-full p-3 rounded-2xl transition-all mt-1 ${showFavoritesOnly ? 'bg-[#5A5A40] text-white shadow-lg shadow-[#5A5A40]/30' : 'hover:bg-white/50 text-[#141414]/60'}`}
        >
          <Heart className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
          <span className="text-sm font-bold">Saved Places</span>
        </button>
      </div>

      <div className="px-4">
        <h3 className="text-[10px] uppercase tracking-[0.2em] font-black opacity-30 mb-4 px-2">Continents</h3>
        <div className="space-y-1">
          {CONTINENTS.map((continent) => {
            const isSelected = selectedContinent === continent;
            const isExpanded = expandedContinent === continent;
            return (
              <div key={continent} className="space-y-1">
                <button
                  onClick={() => toggleContinent(continent)}
                  className={`flex items-center justify-between w-full p-3 rounded-2xl transition-all group ${isSelected ? 'bg-white shadow-sm font-bold text-[#5A5A40]' : 'hover:bg-white/40 text-[#141414]/70'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isSelected ? 'bg-[#5A5A40] text-white' : 'bg-white/50 group-hover:bg-white text-[#141414]/30 group-hover:text-[#5A5A40]'}`}>
                      <Compass className="w-4 h-4" />
                    </div>
                    <span className="text-sm">{continent}</span>
                  </div>
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-40 transition-opacity" />}
                </button>

                {/* Submenu: Countries */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-white/30 rounded-2xl mt-1 ml-4"
                    >
                      <div className="py-2 space-y-1">
                        {loadingCountries ? (
                          <div className="px-4 py-2 text-[10px] uppercase tracking-widest opacity-40">Scanning...</div>
                        ) : countries.length === 0 ? (
                          <div className="px-10 py-3 text-[10px] uppercase tracking-widest opacity-30 italic">No locations shared yet</div>
                        ) : (
                          countries.map(country => {
                            const isCountrySelected = selectedCountry === country;
                            const isCountryExpanded = expandedCountry === country;
                            return (
                              <div key={country} className="space-y-1">
                                <button
                                  onClick={() => toggleCountry(continent, country)}
                                  className={`flex items-center justify-between w-full px-4 py-2 text-sm transition-all ${isCountrySelected ? 'text-[#5A5A40] font-bold' : 'text-[#141414]/60 hover:text-[#141414] hover:pl-6'}`}
                                >
                                  <div className="flex items-center gap-2">
                                    <Map className={`w-3.5 h-3.5 ${isCountrySelected ? 'opacity-100' : 'opacity-20'}`} />
                                    <span>{country}</span>
                                  </div>
                                  {isCountryExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3 opacity-20" />}
                                </button>

                                {/* Submenu: States */}
                                <AnimatePresence>
                                  {isCountryExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden bg-[#5A5A40]/5 rounded-xl ml-4 mr-2 mb-2"
                                    >
                                      <div className="py-1 space-y-0.5 border-l-2 border-[#5A5A40]/10 ml-2">
                                        {loadingStates ? (
                                           <div className="px-4 py-1 text-[10px] opacity-40 animate-pulse">Loading...</div>
                                        ) : states.length === 0 ? (
                                          <div className="px-4 py-1 text-[10px] opacity-40 italic">Empty</div>
                                        ) : (
                                          states.map(state => (
                                            <button
                                              key={state}
                                              onClick={() => onSelect(continent, country, state)}
                                              className={`flex items-center gap-2 w-full px-4 py-1.5 text-xs transition-all ${selectedState === state ? 'text-[#5A5A40] font-black translate-x-1' : 'text-[#141414]/50 hover:text-[#141414] hover:translate-x-1'}`}
                                            >
                                              <MapPin className={`w-3 h-3 ${selectedState === state ? 'opacity-100' : 'opacity-20'}`} />
                                              {state}
                                            </button>
                                          ))
                                        )}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
