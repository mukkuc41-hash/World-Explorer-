import { useState, useEffect } from 'react';
import { Continent } from '../App.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronDown, Globe, MapPin, Map, Compass, Heart, Calendar, Bookmark, Trash2, Activity, Zap, Star } from 'lucide-react';
import { TRAVEL_GEOGRAPHY } from '../constants/geography';
import { db } from '../lib/firebase.ts';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

interface SidebarNavProps {
  selectedContinent: Continent | null;
  selectedCountry: string | null;
  selectedState: string | null;
  showFavoritesOnly?: boolean;
  showTourOnly?: boolean;
  showArchiveOnly?: boolean;
  showTrashOnly?: boolean;
  showUserWorldOnly?: boolean;
  onSelect: (continent: Continent | null, country: string | null, state: string | null, showFavorites?: boolean, showTour?: boolean, showArchive?: boolean, showTrash?: boolean, showUserWorld?: boolean) => void;
}

const CONTINENTS: Continent[] = ["Africa", "Asia", "Europe", "North America", "South America", "Oceania", "Antarctica"];

export default function SidebarNav({ selectedContinent, selectedCountry, selectedState, showFavoritesOnly, showTourOnly, showArchiveOnly, showTrashOnly, showUserWorldOnly, onSelect }: SidebarNavProps) {
  // Internal expansion state to allow browsing without changing the main view
  const [expandedContinent, setExpandedContinent] = useState<Continent | null>(selectedContinent);
  const [expandedCountry, setExpandedCountry] = useState<string | null>(selectedCountry);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'locations'), orderBy('createdAt', 'desc'), limit(3));
    return onSnapshot(q, (snap) => {
      setRecentActivity(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const handleRandom = () => {
    const continents = Object.keys(TRAVEL_GEOGRAPHY) as Continent[];
    const randomContinent = continents[Math.floor(Math.random() * continents.length)];
    const countries = Object.keys(TRAVEL_GEOGRAPHY[randomContinent]);
    const randomCountry = countries[Math.floor(Math.random() * countries.length)];
    const states = TRAVEL_GEOGRAPHY[randomContinent][randomCountry];
    const randomState = states && states.length > 0 ? states[Math.floor(Math.random() * states.length)] : null;
    
    onSelect(randomContinent, randomCountry, randomState);
  };

  // Sync internal state with props when they change externally
  useEffect(() => {
    if (selectedContinent) setExpandedContinent(selectedContinent);
    if (selectedCountry) setExpandedCountry(selectedCountry);
  }, [selectedContinent, selectedCountry]);

  const toggleContinent = (continent: Continent) => {
    if (expandedContinent === continent) {
      setExpandedContinent(null);
    } else {
      setExpandedContinent(continent);
      onSelect(continent, null, null);
    }
  };

  const handleBack = () => {
    onSelect(null, null, null);
    setExpandedContinent(null);
    setExpandedCountry(null);
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
    <div className="space-y-4 py-4">
      {(selectedContinent || selectedCountry || selectedState) && (
        <div className="px-4 mb-2">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2 bg-[#141414] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-all shadow-md active:scale-95"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            <span>
              Back to World View
            </span>
          </button>
        </div>
      )}
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
            onSelect(null, null, null, false, false, false, false, true);
            setExpandedContinent(null);
            setExpandedCountry(null);
          }}
          className={`flex items-center gap-3 w-full p-3 rounded-2xl transition-all mt-1 ${showUserWorldOnly ? 'bg-[#5A5A40] text-white shadow-lg' : 'hover:bg-white/50 text-[#141414]/60'}`}
        >
          <Compass className="w-4 h-4" />
          <span className="text-sm font-bold">Community Discoveries</span>
        </button>

        <button 
          onClick={() => {
            onSelect(null, null, null, false, true);
            setExpandedContinent(null);
            setExpandedCountry(null);
          }}
          className={`flex items-center gap-3 w-full p-3 rounded-2xl transition-all mt-1 ${showTourOnly ? 'bg-[#00af87] text-white shadow-lg shadow-[#00af87]/30' : 'hover:bg-white/50 text-[#141414]/60'}`}
        >
          <Calendar className="w-4 h-4" />
          <span className="text-sm font-bold">Next Tour</span>
        </button>

        <button 
          onClick={() => {
            onSelect(null, null, null, false, false, true);
            setExpandedContinent(null);
            setExpandedCountry(null);
          }}
          className={`flex items-center gap-3 w-full p-3 rounded-2xl transition-all mt-1 ${showArchiveOnly ? 'bg-[#141414] text-white shadow-lg' : 'hover:bg-white/50 text-[#141414]/60'}`}
        >
          <Bookmark className="w-4 h-4" />
          <span className="text-sm font-bold">Archived</span>
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

        <button 
          onClick={() => {
            onSelect(null, null, null, false, false, false, true);
            setExpandedContinent(null);
            setExpandedCountry(null);
          }}
          className={`flex items-center gap-3 w-full p-3 rounded-2xl transition-all mt-1 ${showTrashOnly ? 'bg-red-500 text-white shadow-lg' : 'hover:bg-white/50 text-[#141414]/60'}`}
        >
          <Trash2 className="w-4 h-4" />
          <span className="text-sm font-bold">Trash</span>
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
                        {(() => {
                          const countries = expandedContinent ? Object.keys(TRAVEL_GEOGRAPHY[expandedContinent] || {}).sort() : [];
                          return countries.length === 0 ? (
                            <div className="px-10 py-3 text-[10px] uppercase tracking-widest opacity-30 italic">No locations mapped yet</div>
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
                                          {(() => {
                                            const statesArray = (expandedContinent && expandedCountry) ? (TRAVEL_GEOGRAPHY[expandedContinent][expandedCountry] || []).sort() : [];
                                            return statesArray.length === 0 ? (
                                              <div className="px-4 py-1 text-[10px] opacity-40 italic">Coming soon</div>
                                            ) : (
                                              statesArray.map(state => (
                                                <button
                                                  key={state}
                                                  onClick={() => onSelect(continent, country, state)}
                                                  className={`flex items-center gap-2 w-full px-4 py-1.5 text-xs transition-all ${selectedState === state ? 'text-[#5A5A40] font-black translate-x-1' : 'text-[#141414]/50 hover:text-[#141414] hover:translate-x-1'}`}
                                                >
                                                  <MapPin className={`w-3 h-3 ${selectedState === state ? 'opacity-100' : 'opacity-20'}`} />
                                                  {state}
                                                </button>
                                              ))
                                            );
                                          })()}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })
                          );
                        })()}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-6 py-8">
        <button 
          onClick={handleRandom}
          className="w-full bg-[#141414] text-white p-6 rounded-[32px] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/10 flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform">
                <Zap className="w-5 h-5 text-yellow-400 fill-current" />
             </div>
             <div className="text-left">
               <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Feeling Lost?</span>
               <div className="font-serif italic text-lg leading-tight">Teleport Me</div>
             </div>
          </div>
          <ChevronRight className="w-4 h-4 opacity-40" />
        </button>

        <div className="mt-12">
          <div className="flex items-center gap-2 mb-6 px-2">
            <Activity className="w-3 h-3 text-[#00af87]" />
            <h4 className="text-[10px] uppercase font-black tracking-widest opacity-30">Live Insights</h4>
          </div>
          <div className="space-y-4">
            {recentActivity.map((act, i) => (
              <motion.div 
                key={act.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 p-3 bg-white/40 rounded-2xl border border-[#141414]/5"
              >
                <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-[#f8f8f5]">
                  <img src={act.imageUrl} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold truncate">{act.name}</div>
                  <div className="flex items-center gap-1">
                    <Star className="w-2 h-2 text-[#00af87] fill-current" />
                    <span className="text-[8px] opacity-40 uppercase tracking-widest">Added recently</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
