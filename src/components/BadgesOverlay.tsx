import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { X, Trophy, Lock, Info, Gem, Award, Compass, Search, ChevronDown, Check, Globe, RefreshCw, Star, Heart, Calendar, Bookmark, Sparkles, MapPin, Sliders, Plus } from 'lucide-react';
import { TRAVEL_BADGES, Badge } from '../constants/badges.tsx';
import React from 'react';
import { db } from '../lib/firebase.ts';
import { doc, setDoc, getDocs, collection, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';

interface BadgesOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  stats: {
    saved: number;
    planned: number;
    archived: number;
    contributed: number;
    isWorldChampion?: boolean;
  };
  user: any;
}

export default function BadgesOverlay({ isOpen, onClose, stats: initialStats, user }: BadgesOverlayProps) {
  const [activeTab, setActiveTab] = useState<'showroom' | 'engine' | 'almanac' | 'cosmic'>('showroom');
  const [contributedCountries, setContributedCountries] = useState<string[]>([]);
  
  // Real-time stats with world champion state
  const [stats, setStats] = useState(initialStats);

  // Scanner states
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [scanSuccess, setScanSuccess] = useState(false);
  const [scanAttempts, setScanAttempts] = useState(0);
  const [isOwnerBypass, setIsOwnerBypass] = useState(false);

  // Dropdown states for procedural badges
  const [searchCountry, setSearchCountry] = useState('India');
  const [searchState, setSearchState] = useState('Historic Valley');
  const [searchActivity, setSearchActivity] = useState('Cultural Chronicler');
  const [searchRank, setSearchRank] = useState('Voyager (Lvl 4)');

  // Universal Procedural Badge Engine State
  const [userLocations, setUserLocations] = useState<any[]>([]);
  const [engineSubTab, setEngineSubTab] = useState<'my_achievements' | 'simulator'>('simulator');
  const [simRegion, setSimRegion] = useState('Jaipur, Rajasthan');
  const [simVisits, setSimVisits] = useState(10);

  // Confetti triggering trackers for mini-role unlocks
  const [prevUnlockedCount, setPrevUnlockedCount] = useState<number | null>(null);
  const [prevRealUnlockedCount, setPrevRealUnlockedCount] = useState<number | null>(null);

  // Universal Procedural Tiers Configurations
  const PROCEDURAL_TIERS = [
    { 
      name: 'Beginning', 
      threshold: 10, 
      divisor: 1,
      color: 'from-emerald-50 to-emerald-100/60 border-emerald-200/50 text-emerald-950',
      tagColor: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
      iconColor: 'text-emerald-600',
      progressColor: 'bg-emerald-500',
      icon: MapPin
    },
    { 
      name: 'Medium', 
      threshold: 50, 
      divisor: 1,
      color: 'from-sky-50 to-sky-100/60 border-sky-200/50 text-sky-950',
      tagColor: 'bg-sky-500/10 text-sky-700 border-sky-500/20',
      iconColor: 'text-sky-600',
      progressColor: 'bg-sky-500',
      icon: Compass
    },
    { 
      name: 'Top', 
      threshold: 100, 
      divisor: 1,
      color: 'from-indigo-50 to-indigo-100/60 border-indigo-200/50 text-indigo-950',
      tagColor: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20',
      iconColor: 'text-indigo-600',
      progressColor: 'bg-indigo-500',
      icon: Award
    },
    { 
      name: 'Pro', 
      threshold: 250, 
      divisor: 1,
      color: 'from-amber-50 to-amber-100/60 border-amber-200/50 text-amber-950',
      tagColor: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
      iconColor: 'text-amber-600',
      progressColor: 'bg-amber-500',
      icon: Star
    },
    { 
      name: 'God', 
      threshold: 500, 
      divisor: 1,
      color: 'from-rose-50 to-rose-100/60 border-rose-200/50 text-rose-950',
      tagColor: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
      iconColor: 'text-rose-600',
      progressColor: 'bg-rose-500',
      icon: Sparkles
    },
    { 
      name: 'Extinct', 
      threshold: 1000, 
      divisor: 1,
      color: 'from-slate-100 to-slate-200/60 border-slate-300/50 text-slate-950',
      tagColor: 'bg-slate-500/10 text-slate-700 border-slate-500/20',
      iconColor: 'text-slate-700',
      progressColor: 'bg-slate-600',
      icon: Globe
    },
    { 
      name: 'Masters', 
      threshold: 2500, 
      divisor: 1,
      color: 'from-violet-50 to-violet-100/60 border-violet-200/50 text-violet-950',
      tagColor: 'bg-violet-500/10 text-violet-700 border-violet-500/20',
      iconColor: 'text-violet-600',
      progressColor: 'bg-violet-500',
      icon: Trophy
    },
    { 
      name: 'Enthusiastic', 
      threshold: 5000, 
      divisor: 1,
      color: 'from-yellow-50 to-yellow-100/60 border-yellow-200/50 text-yellow-950',
      tagColor: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
      iconColor: 'text-yellow-600',
      progressColor: 'bg-yellow-500',
      icon: Heart
    },
    { 
      name: 'Amateurs World Explorer Champion', 
      threshold: 10000, 
      divisor: 1,
      color: 'from-slate-950 via-fuchsia-950 to-slate-900 border-fuchsia-500/30 text-white relative overflow-hidden',
      tagColor: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
      iconColor: 'text-fuchsia-400',
      progressColor: 'bg-fuchsia-500',
      icon: Gem
    },
  ];

  // Helper to generate the 6 dynamic mini-role titles for any tier
  const getMiniRoleName = (tierName: string, roleIndex: number) => {
    const isBeginning = tierName === 'Beginning';
    const base = isBeginning ? 'Beginner' : tierName;
    const roles = [
      base,
      `${base} explore`,
      `${base} tourist`,
      `${base} adventurers`,
      `${base} wonderers`,
      `${base} finder`
    ];
    return roles[roleIndex];
  };

  // Helper to calculate tier level based on visits
  const getTierLevel = (visits: number, threshold: number, divisor: number) => {
    if (visits < threshold) return 0;
    const rawLvl = Math.floor((visits - threshold) / divisor) + 1;
    return Math.min(rawLvl, 9999999);
  };

  // Helper to calculate progress percentage to next tier level
  const getTierProgress = (visits: number, threshold: number, divisor: number) => {
    if (visits < threshold) {
      return (visits / threshold) * 100;
    }
    const currentLevelCount = (visits - threshold) % divisor;
    return (currentLevelCount / divisor) * 100;
  };

  // Helper to aggregate real user locations from Firestore grouped by state/region
  const getRealGroupedLocations = () => {
    const counts: Record<string, number> = {};
    userLocations.forEach(loc => {
      const stateName = loc.state || loc.city || loc.country || 'Unknown Sector';
      counts[stateName] = (counts[stateName] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({
      name,
      count
    })).sort((a, b) => b.count - a.count);
  };

  // Helper to trigger confetti explosion
  const triggerConfettiCelebration = () => {
    const duration = 2 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  // Track Simulated Unlocks
  useEffect(() => {
    if (!isOpen) return;
    
    let simulatedUnlockedCount = 0;
    PROCEDURAL_TIERS.forEach(tier => {
      const level = getTierLevel(simVisits, tier.threshold, tier.divisor);
      if (level > 0) {
        simulatedUnlockedCount += Math.min(level, 6);
      }
    });

    if (prevUnlockedCount !== null && simulatedUnlockedCount > prevUnlockedCount) {
      triggerConfettiCelebration();
    }
    setPrevUnlockedCount(simulatedUnlockedCount);
  }, [simVisits, isOpen]);

  // Track Real Unlocks
  useEffect(() => {
    if (!isOpen || userLocations.length === 0) return;

    const counts: Record<string, number> = {};
    userLocations.forEach(loc => {
      const stateName = loc.state || loc.city || loc.country || 'Unknown Sector';
      counts[stateName] = (counts[stateName] || 0) + 1;
    });

    let realUnlockedCount = 0;
    Object.values(counts).forEach(visits => {
      PROCEDURAL_TIERS.forEach(tier => {
        const level = getTierLevel(visits, tier.threshold, tier.divisor);
        if (level > 0) {
          realUnlockedCount += Math.min(level, 6);
        }
      });
    });

    if (prevRealUnlockedCount !== null && realUnlockedCount > prevRealUnlockedCount) {
      triggerConfettiCelebration();
    }
    setPrevRealUnlockedCount(realUnlockedCount);
  }, [userLocations, isOpen]);

  // Synchronize stats and track world champion status
  useEffect(() => {
    setStats(initialStats);
  }, [initialStats]);

  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const unsub = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const champ = !!data.isWorldChampion;
        setIsOwnerBypass(champ);
        setStats(prev => ({
          ...prev,
          isWorldChampion: champ
        }));
      }
    });
    return () => unsub();
  }, [user]);

  // Query contributed countries & all locations for the procedural check
  useEffect(() => {
    if (!isOpen || !user) return;
    
    const q = query(collection(db, 'locations'), where('userId', '==', user.uid));
    getDocs(q).then((snap) => {
      const locationsData = snap.docs.map(docSnap => docSnap.data());
      setUserLocations(locationsData);
      const countries = Array.from(new Set(locationsData.map(loc => loc.country).filter(Boolean))) as string[];
      setContributedCountries(countries);
    }).catch(err => {
      console.error("[BadgesOverlay] Failed to fetch locations & countries:", err);
    });
  }, [isOpen, user, activeTab]);

  const handleCosmicScan = () => {
    if (isScanning || !user) return;
    setIsScanning(true);
    setScanSuccess(false);
    setScanStatus("Initializing deep-space sub-orbital sensors...");
    setScanAttempts(prev => prev + 1);

    const steps = [
      "Calibrating orbital telescope arrays...",
      "Probing coordinates for legendary explorer signatures...",
      "Filtering quantum telemetry background noise...",
      "Resolving high-precision coordinate sector..."
    ];

    steps.forEach((text, idx) => {
      setTimeout(() => {
        setScanStatus(text);
      }, (idx + 1) * 805);
    });

    setTimeout(async () => {
      const isOwner = user.email === 'mukkuc41@gmail.com';
      const randomWin = Math.random() < 0.00001; // 0.001% chance
      const isWin = randomWin || (isOwner && isOwnerBypass);

      if (isWin) {
        setScanSuccess(true);
        setScanStatus("LEGENDARY EXPLORER COORDINATES RESOLVED!");
        try {
          await setDoc(doc(db, 'users', user.uid), {
            isWorldChampion: true,
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (error) {
          console.error("[BadgesOverlay] Error setting world champion:", error);
        }
      } else {
        const randomLat = (Math.random() * 180 - 90).toFixed(4);
        const randomLng = (Math.random() * 360 - 180).toFixed(4);
        const sectors = ["Pacific Abyssal Zone", "Sahara Sector Delta-4", "Siberian Tundra", "Mariana Trench Sector 9", "Atacama Desert Plains", "Antarctic Ice Shelf"];
        const sectorName = sectors[Math.floor(Math.random() * sectors.length)];
        
        setScanSuccess(false);
        setScanStatus(`Sector scan finalized at: [${randomLat}° N, ${randomLng}° E] (${sectorName}). Empty of legendary signatures.`);
      }
      setIsScanning(false);
    }, 4200);
  };

  const handleToggleWorldChampionDirectly = async (checked: boolean) => {
    if (!user) return;
    setIsOwnerBypass(checked);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        isWorldChampion: checked,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      if (checked) {
        setScanSuccess(true);
        setScanStatus("LEGENDARY EXPLORER COORDINATES RESOLVED VIA OWNER OVERRIDE!");
      } else {
        setScanSuccess(false);
        setScanStatus("Scanner state: Idle. World Champion status revoked.");
      }
    } catch (error) {
      console.error("[BadgesOverlay] Error setting world champion bypass:", error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-12 overflow-hidden"
        >
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-[#f5f5f0]/95 backdrop-blur-xl"
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="relative w-full max-w-4xl h-full max-h-[94vh] sm:max-h-[90vh] md:max-h-[85vh] bg-white rounded-[40px] shadow-2xl border border-[#141414]/5 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 sm:p-8 border-b border-[#141414]/5 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6">
                  <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h2 className="font-serif italic text-2xl sm:text-3xl tracking-tight leading-none">Achievement Hold</h2>
                  <p className="text-[10px] sm:text-xs uppercase tracking-widest font-black opacity-30 mt-1">1 Crore &amp; 5 Mythical Collectibles</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full hover:bg-[#141414]/5 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="px-4 sm:px-8 pt-4 pb-2 border-b border-[#141414]/5 bg-white flex gap-1 select-none overflow-x-auto scrollbar-none">
              <button
                onClick={() => setActiveTab('showroom')}
                className={`py-2.5 sm:py-3 px-4 sm:px-6 text-xs font-black uppercase tracking-widest rounded-2xl transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'showroom'
                    ? 'bg-[#141414] text-white shadow-md'
                    : 'text-[#141414]/60 hover:text-[#141414] hover:bg-[#141414]/5'
                }`}
              >
                <Trophy className="w-4 h-4" />
                Showroom Badges
              </button>
              <button
                onClick={() => setActiveTab('engine')}
                className={`py-2.5 sm:py-3 px-4 sm:px-6 text-xs font-black uppercase tracking-widest rounded-2xl transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'engine'
                    ? 'bg-[#141414] text-white shadow-md'
                    : 'text-[#141414]/60 hover:text-[#141414] hover:bg-[#141414]/5'
                }`}
              >
                <Sliders className="w-4 h-4" />
                Procedural Badges
              </button>
              <button
                onClick={() => setActiveTab('almanac')}
                className={`py-2.5 sm:py-3 px-4 sm:px-6 text-xs font-black uppercase tracking-widest rounded-2xl transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'almanac'
                    ? 'bg-[#141414] text-white shadow-md'
                    : 'text-[#141414]/60 hover:text-[#141414] hover:bg-[#141414]/5'
                }`}
              >
                <Globe className="w-4 h-4" />
                1 Crore Classic Medals
              </button>
              <button
                onClick={() => setActiveTab('cosmic')}
                className={`py-2.5 sm:py-3 px-4 sm:px-6 text-xs font-black uppercase tracking-widest rounded-2xl transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'cosmic'
                    ? 'bg-[#141414] text-white shadow-md'
                    : 'text-[#141414]/60 hover:text-[#141414] hover:bg-[#141414]/5'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Champion Hold (0.001%)
              </button>
            </div>

            {/* Scrollable Tab Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
              
              {/* TAB 1: SHOWROOM BADGES */}
              {activeTab === 'showroom' && (
                <div className="space-y-12">
                  
                  {/* Top 4 Registry Showcase */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                       <div className="h-px flex-1 bg-[#141414]/5" />
                       <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 whitespace-nowrap text-amber-600 flex items-center gap-1.5">
                         🏆 Top 4 Registry Shelf
                       </h3>
                       <div className="h-px flex-1 bg-[#141414]/5" />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      {['diamond_explorer', 'gold_explorer', 'silver_explorer', 'bronze_explorer'].map((id, index) => {
                        const badge = TRAVEL_BADGES.find(b => b.id === id);
                        if (!badge) return null;
                        const isUnlocked = badge.requirement(stats);
                        const rankWords = ["1ST PLACE", "2ND PLACE", "3RD PLACE", "4TH PLACE"];
                        const tierStyles = [
                          "bg-gradient-to-br from-slate-950 via-[#0a2337] to-slate-900 border-cyan-500/30 text-white shadow-cyan-950/10",
                          "bg-gradient-to-br from-slate-950 via-[#26190a] to-slate-900 border-amber-500/20 text-white shadow-amber-950/10",
                          "bg-gradient-to-br from-slate-950 via-[#101726] to-slate-900 border-slate-400/20 text-white shadow-slate-950/10",
                          "bg-gradient-to-br from-slate-950 via-[#190e07] to-slate-900 border-orange-800/20 text-white shadow-orange-950/10"
                        ];

                        return (
                          <motion.div
                            key={badge.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            className={`relative p-6 rounded-[32px] border transition-all duration-300 flex flex-col justify-between aspect-[1.5/1] sm:aspect-square group overflow-hidden ${
                              isUnlocked 
                                ? `${tierStyles[index]} shadow-md hover:shadow-xl hover:-translate-y-1` 
                                : 'bg-[#f8f8f5] opacity-50 border-dashed border-[#141414]/10 text-[#141414]'
                            }`}
                          >
                            {/* Glass shine hover effect */}
                            {isUnlocked && (
                              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 rotate-12 -translate-y-full group-hover:translate-y-full transition-all duration-1000" />
                            )}

                            <div className="flex justify-between items-start">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${
                                isUnlocked ? 'bg-white/10 text-white' : 'bg-[#141414]/5 text-[#141414]'
                              }`}
                              style={isUnlocked ? {} : { backgroundColor: badge.color + '20', color: badge.color }}>
                                {badge.icon}
                              </div>
                              <span className={`text-[8px] font-black tracking-widest uppercase px-2.5 py-1 rounded-md ${
                                isUnlocked ? 'bg-white/10 text-white/90' : 'bg-[#141414]/5 text-[#141414]/40'
                              }`}>
                                {rankWords[index]}
                              </span>
                            </div>

                            <div className="mt-4">
                              <h4 className="text-sm font-black uppercase tracking-wider truncate">
                                {badge.name}
                              </h4>
                              <p className={`text-[10px] mt-1 leading-snug line-clamp-2 ${
                                isUnlocked ? 'opacity-85' : 'opacity-50'
                              }`}>
                                {isUnlocked ? badge.description : `Requirement: ${badge.hint}`}
                              </p>
                            </div>

                            {!isUnlocked && (
                              <div className="absolute right-4 bottom-4">
                                <Lock className="w-3.5 h-3.5 opacity-30" />
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Other standard milestones classified as Discovery, Planning, Social */}
                  {['discovery', 'planning', 'social', 'explorer'].map((category) => {
                    const categoryBadges = TRAVEL_BADGES.filter(
                      b => b.category === category && 
                      !['diamond_explorer', 'gold_explorer', 'silver_explorer', 'bronze_explorer', 'world_champion_explorer'].includes(b.id)
                    );
                    
                    return (
                      <div key={category} className="space-y-6">
                        <div className="flex items-center gap-3 px-2">
                           <div className="h-px flex-1 bg-[#141414]/5" />
                           <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 whitespace-nowrap">
                             {category} Badges
                           </h3>
                           <div className="h-px flex-1 bg-[#141414]/5" />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {categoryBadges.map((badge, i) => {
                            const isUnlocked = badge.requirement(stats);
                            return (
                              <motion.div
                                key={badge.id}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.02 }}
                                className={`relative aspect-square flex flex-col items-center justify-center p-4 rounded-[32px] transition-all group ${
                                  isUnlocked 
                                    ? 'bg-white border-2 border-[#141414]/10 shadow-sm hover:shadow-xl hover:-translate-y-1 cursor-default' 
                                    : 'bg-[#f8f8f5] opacity-60 border border-dashed border-[#141414]/10 truncate'
                                }`}
                              >
                                <div 
                                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2 transition-transform group-hover:scale-110 shadow-lg"
                                  style={{ 
                                    backgroundColor: badge.color,
                                    color: '#fff',
                                    boxShadow: isUnlocked ? `0 8px 16px -4px ${badge.color}60` : `0 4px 8px -2px ${badge.color}30`
                                  }}
                                >
                                  {badge.icon}
                                </div>
                                
                                <div className="text-center w-full px-1">
                                  <div className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 truncate">
                                    {badge.name}
                                  </div>
                                  <div className="text-[8px] opacity-40 font-medium px-1 leading-tight line-clamp-2">
                                    {isUnlocked ? badge.description : badge.hint}
                                  </div>
                                </div>
          
                                {!isUnlocked && (
                                  <div className="absolute top-4 right-4 text-[#141414]/20">
                                    <Lock className="w-2.5 h-2.5" />
                                  </div>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 2: UNIVERSAL PROCEDURAL BADGE ENGINE */}
              {activeTab === 'engine' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="bg-gradient-to-br from-indigo-900 to-slate-950 text-white p-6 rounded-[32px] border border-indigo-500/20 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none select-none">
                      <Sliders className="w-40 h-40" />
                    </div>
                    <div className="relative z-10 space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">STATE LEVEL MULTI-TIER SYSTEM</span>
                      <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-none text-white">Universal Procedural Badge Engine</h3>
                      <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                        Unlock legendary state-level badges on your travels. All 9 tiers start at Level 1 upon reaching their entry milestone and climb dynamically up to <span className="text-indigo-400 font-extrabold font-mono">Level 9,999,999</span>! Every single landmark/place visited adds exactly 1 level.
                      </p>
                    </div>

                    <div className="flex gap-2 mt-4 select-none">
                      <button
                        onClick={() => setEngineSubTab('simulator')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                          engineSubTab === 'simulator'
                            ? 'bg-white text-slate-950 shadow-md'
                            : 'bg-white/10 hover:bg-white/15 text-white'
                        }`}
                      >
                        Quest Simulator
                      </button>
                      <button
                        onClick={() => setEngineSubTab('my_achievements')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                          engineSubTab === 'my_achievements'
                            ? 'bg-white text-slate-950 shadow-md'
                            : 'bg-white/10 hover:bg-white/15 text-white'
                        }`}
                      >
                        My Real Achievements
                      </button>
                    </div>
                  </div>

                  {engineSubTab === 'simulator' ? (
                    <div className="bg-slate-50 border border-[#141414]/5 rounded-[32px] p-6 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Target Region Input */}
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black uppercase tracking-wider text-[#141414]/50">Target Travel Region / State</label>
                          <div className="relative">
                            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#141414]/40" />
                            <input
                              type="text"
                              value={simRegion}
                              onChange={e => setSimRegion(e.target.value)}
                              placeholder="e.g. Jaipur, Rajasthan"
                              className="w-full pl-10 pr-4 py-3 bg-white border border-[#141414]/15 rounded-2xl text-xs outline-none focus:border-indigo-500 transition-all text-[#141414]"
                            />
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {['Jaipur, Rajasthan', 'Tokyo, Japan', 'Paris, France', 'New York, USA', 'Cairo, Egypt'].map(r => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => setSimRegion(r)}
                                className={`text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-md border transition-all ${
                                  simRegion === r 
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                    : 'bg-white border-[#141414]/10 text-[#141414]/60 hover:border-[#141414]/20'
                                }`}
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Landmark Visits Input */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="block text-[10px] font-black uppercase tracking-wider text-[#141414]/50">Visited Landmarks Count</label>
                            <span className="font-mono text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">{simVisits.toLocaleString()} Places Visited</span>
                          </div>
                          
                          {/* Visits Slider */}
                          <input
                            type="range"
                            min="0"
                            max="10000"
                            step="1"
                            value={simVisits}
                            onChange={e => setSimVisits(Number(e.target.value))}
                            className="w-full h-1.5 bg-[#141414]/10 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />

                          {/* Quick Accelerators */}
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => setSimVisits(prev => Math.max(0, prev - 10))}
                              className="text-[9px] font-bold uppercase bg-white border border-[#141414]/10 hover:bg-[#141414]/5 rounded-md py-1 text-[#141414]/70"
                            >
                              -10
                            </button>
                            <button
                              type="button"
                              onClick={() => setSimVisits(prev => prev + 1)}
                              className="text-[9px] font-bold uppercase bg-white border border-[#141414]/10 hover:bg-[#141414]/5 rounded-md py-1 text-[#141414]/70"
                            >
                              +1 Place
                            </button>
                            <button
                              type="button"
                              onClick={() => setSimVisits(10)}
                              className="text-[9px] font-bold uppercase bg-white border border-[#141414]/10 hover:bg-[#141414]/5 rounded-md py-1 text-[#141414]/70"
                            >
                              Set 10 (Beg)
                            </button>
                            <button
                              type="button"
                              onClick={() => setSimVisits(100)}
                              className="text-[9px] font-bold uppercase bg-white border border-[#141414]/10 hover:bg-[#141414]/5 rounded-md py-1 text-[#141414]/70"
                            >
                              Set 100 (Top)
                            </button>
                            <button
                              type="button"
                              onClick={() => setSimVisits(10000)}
                              className="text-[9px] font-bold uppercase bg-white border border-[#141414]/10 hover:bg-[#141414]/5 rounded-md py-1 text-[#141414]/70"
                            >
                              Set 10k (Champ)
                            </button>
                            <button
                              type="button"
                              onClick={() => setSimVisits(9999999)}
                              className="text-[9px] font-bold uppercase bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-md py-1"
                            >
                              Set Max
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Displaying Live Unlocked Badges based on simulator state */}
                      <div className="space-y-4 pt-4 border-t border-[#141414]/5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-black uppercase tracking-wider text-[#141414]/40">Active Badge Levels for {simRegion || 'Your Selected Region'}</h4>
                          <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 border border-amber-500/20">Simulation Live</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {PROCEDURAL_TIERS.map((tier) => {
                            const level = getTierLevel(simVisits, tier.threshold, tier.divisor);
                            const isUnlocked = level > 0;
                            const progress = getTierProgress(simVisits, tier.threshold, tier.divisor);
                            const Icon = tier.icon || Compass;

                            // Mini-roles info
                            const activeRoleIndex = Math.min(level - 1, 5);
                            const activeRoleName = isUnlocked ? getMiniRoleName(tier.name, activeRoleIndex) : 'Locked';

                            return (
                              <div
                                key={tier.name}
                                className={`p-5 rounded-3xl border flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${
                                  isUnlocked 
                                    ? `bg-gradient-to-br ${tier.color} shadow-sm border-solid`
                                    : 'bg-white opacity-40 border-dashed border-[#141414]/15'
                                }`}
                              >
                                <div>
                                  <div className="flex justify-between items-start mb-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                      isUnlocked ? 'bg-white/80 shadow-inner' : 'bg-slate-100'
                                    }`}>
                                      <Icon className={`w-5 h-5 ${tier.iconColor || 'text-slate-600'}`} />
                                    </div>
                                    {isUnlocked ? (
                                      <span className={`text-[9px] font-black px-2.5 py-1 rounded-full border ${tier.tagColor}`}>
                                        Level {level.toLocaleString()}
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                                        <Lock className="w-2.5 h-2.5" /> Req: {tier.threshold}
                                      </span>
                                    )}
                                  </div>

                                  <h5 className="font-serif italic text-base leading-none text-[#141414] font-bold">
                                    {tier.name}
                                  </h5>
                                  <p className="text-[10px] text-[#141414]/50 mt-1 uppercase font-black tracking-widest leading-none">
                                    {simRegion}
                                  </p>

                                  {isUnlocked && (
                                    <div className="mt-3.5 bg-white/60 p-2.5 rounded-xl border border-white/40 space-y-1.5">
                                      <div className="flex justify-between items-center">
                                        <span className="text-[8px] uppercase font-black tracking-widest text-[#141414]/40">Active Title:</span>
                                        <span className="text-[10px] font-bold text-[#141414]">{activeRoleName}</span>
                                      </div>
                                      
                                      {/* Mini Roles Progress Tracker */}
                                      <div className="space-y-1">
                                        <div className="flex justify-between items-center text-[7px] font-extrabold uppercase text-[#141414]/40">
                                          <span>6 Mini Roles Unlock</span>
                                          <span>{Math.min(level, 6)} / 6</span>
                                        </div>
                                        <div className="grid grid-cols-6 gap-0.5">
                                          {[0, 1, 2, 3, 4, 5].map((idx) => {
                                            const roleUnlocked = level > idx;
                                            return (
                                              <div 
                                                key={idx}
                                                title={getMiniRoleName(tier.name, idx)}
                                                className={`h-1 rounded-full ${
                                                  roleUnlocked ? tier.progressColor : 'bg-[#141414]/5'
                                                }`}
                                              />
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Progress Slider towards next tier */}
                                <div className="mt-4 space-y-1">
                                  <div className="flex justify-between items-center text-[8px] font-black uppercase text-[#141414]/40">
                                    <span>Progress</span>
                                    <span>{Math.floor(progress)}%</span>
                                  </div>
                                  <div className="w-full bg-[#141414]/5 rounded-full h-1 overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full ${tier.progressColor}`} 
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* My Real Achievements */
                    <div className="bg-slate-50 border border-[#141414]/5 rounded-[32px] p-6 space-y-6">
                      {getRealGroupedLocations().length === 0 ? (
                        <div className="text-center py-12 space-y-3">
                          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-[#141414]/40">
                            <Lock className="w-5 h-5" />
                          </div>
                          <h4 className="text-sm font-bold text-[#141414]">No Real Achievements Unlocked Yet</h4>
                          <p className="text-xs text-[#141414]/50 max-w-sm mx-auto">
                            Pins are evaluated grouped by state or region. Share discoveries on the main map to automatically earn your state-level procedural badges!
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black uppercase tracking-wider text-[#141414]/40">Your Active Region Achievements</h4>
                            <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">Evaluation Live</span>
                          </div>

                          <div className="space-y-6">
                            {getRealGroupedLocations().map((grouped) => {
                              // Find all tiers that are unlocked for this group
                              const unlockedTiers = PROCEDURAL_TIERS.filter(t => grouped.count >= t.threshold);

                              return (
                                <div key={grouped.name} className="bg-white p-5 rounded-3xl border border-[#141414]/5 shadow-sm space-y-4">
                                  <div className="flex justify-between items-center border-b border-[#141414]/5 pb-3">
                                    <div>
                                      <h5 className="font-bold text-sm text-[#141414]">{grouped.name}</h5>
                                      <p className="text-[10px] text-[#141414]/50 uppercase font-black tracking-widest">{grouped.count} shared locations evaluated</p>
                                    </div>
                                    <div className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-xl">
                                      {unlockedTiers.length} Badge(s) Unlocked
                                    </div>
                                  </div>

                                  {unlockedTiers.length === 0 ? (
                                    <div className="text-xs text-slate-400 py-2 italic">
                                      Keep exploring {grouped.name}! You need at least 10 visits to unlock the "Beginning" Tier 1.
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                      {unlockedTiers.map(tier => {
                                        const level = getTierLevel(grouped.count, tier.threshold, tier.divisor);
                                        const roleIndex = Math.min(level - 1, 5);
                                        const roleName = getMiniRoleName(tier.name, roleIndex);
                                        const Icon = tier.icon || MapPin;

                                        return (
                                          <div key={tier.name} className={`p-3.5 rounded-2xl border bg-gradient-to-br ${tier.color} flex items-center gap-3`}>
                                            <div className="w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center shrink-0">
                                              <Icon className={`w-4 h-4 ${tier.iconColor}`} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <div className="text-[10px] font-black uppercase text-[#141414]/40 leading-none">Level {level}</div>
                                              <div className="text-xs font-extrabold text-[#141414] truncate mt-1">{roleName}</div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 3: 1 CRORE CLASSIC MEDALS */}
              {activeTab === 'almanac' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="bg-[#141414]/5 border border-[#141414]/10 p-6 rounded-[32px] space-y-4">
                    <div>
                      <h3 className="text-base font-black text-[#141414] flex items-center gap-2">
                        <Globe className="w-5 h-5 text-indigo-600" />
                        Universal 1 Crore Classic Medals Engine
                      </h3>
                      <p className="text-xs text-[#141414]/60 mt-1.5 leading-relaxed">
                        Every distinct coordinate, territory, and activity style combination produces a dynamically unique explorer achievement. There are exactly <strong className="text-[#141414] font-extrabold">10,000,000 (1 Crore)</strong> potential classic medals dynamically logged in the system!
                      </p>
                    </div>

                    <div className="border-t border-[#141414]/10 pt-4 space-y-3">
                      <h4 className="text-[10px] uppercase font-black tracking-widest text-[#141414]/40">
                        Decided Medal Naming Scheme
                      </h4>
                      <div className="bg-white/80 p-3.5 rounded-2xl border border-[#141414]/5 text-xs">
                        <span className="font-mono text-[#141414] font-bold block text-center mb-1">
                          [Country] • [Sector Region] • [Explorer Style] • [Milestone Rank]
                        </span>
                        <span className="text-[10px] text-[#141414]/50 block text-center">
                          Example: <strong className="text-[#141414]">India • Metropolis Sector • Scenic Spotter • Voyager (Lvl 4)</strong>
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <h4 className="text-[10px] uppercase font-black tracking-widest text-[#141414]/40">
                        How to Achieve Any Dynamic Medal:
                      </h4>
                      <ul className="text-xs text-[#141414]/70 space-y-2 list-none pl-1">
                        <li className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold text-[9px] mt-0.5 shrink-0">1</span>
                          <span><strong>Map the Country Domain:</strong> Share or contribute at least 1 discovery pin within the selected nation.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold text-[9px] mt-0.5 shrink-0">2</span>
                          <span><strong>Target the Sector Region:</strong> Match the sector traits (e.g. Ridge, Coastal, Woodland, Metropolis).</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold text-[9px] mt-0.5 shrink-0">3</span>
                          <span><strong>Practice the Explorer Style:</strong> Align with style activities (e.g. Cultural Chronicler, Midnight Ranger).</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold text-[9px] mt-0.5 shrink-0">4</span>
                          <span><strong>Level up your Rank:</strong> Rack up shared and saved coordinates to ascend from Aspirant (Lvl 1) to Sovereign (Lvl 10).</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Dropdown controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[8px] font-black uppercase tracking-widest text-[#141414]/40 mb-1 ml-1">Country Domain</label>
                      <select
                        value={searchCountry}
                        onChange={e => setSearchCountry(e.target.value)}
                        className="w-full bg-[#fdfdfc] border border-[#141414]/10 focus:border-indigo-500 p-3 rounded-xl text-xs outline-none transition-all"
                      >
                        {["India", "USA", "France", "Japan", "Spain", "Brazil", "Australia", "United Kingdom", "Canada", "Thailand", "Egypt", "Germany", "Italy", "Singapore"].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase tracking-widest text-[#141414]/40 mb-1 ml-1">Sector Region</label>
                      <select
                        value={searchState}
                        onChange={e => setSearchState(e.target.value)}
                        className="w-full bg-[#fdfdfc] border border-[#141414]/10 focus:border-indigo-500 p-3 rounded-xl text-xs outline-none transition-all"
                      >
                        {["Metropolis Sector", "High-Altitude Ridge", "Coastal Peninsula", "Historic Valley", "Northern Tundra", "Southern Woodlands", "State Alpha", "State Beta"].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase tracking-widest text-[#141414]/40 mb-1 ml-1">Explorer Style</label>
                      <select
                        value={searchActivity}
                        onChange={e => setSearchActivity(e.target.value)}
                        className="w-full bg-[#fdfdfc] border border-[#141414]/10 focus:border-indigo-500 p-3 rounded-xl text-xs outline-none transition-all"
                      >
                        {["Wilderness Trailblazer", "Cultural Chronicler", "Coastal Navigator", "Epicurean Scout", "Midnight Ranger", "Historic Archivist", "Scenic Spotter"].map(a => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase tracking-widest text-[#141414]/40 mb-1 ml-1">Milestone Rank</label>
                      <select
                        value={searchRank}
                        onChange={e => setSearchRank(e.target.value)}
                        className="w-full bg-[#fdfdfc] border border-[#141414]/10 focus:border-indigo-500 p-3 rounded-xl text-xs outline-none transition-all"
                      >
                        {["Aspirant (Lvl 1)", "Pilgrim (Lvl 2)", "Wanderer (Lvl 3)", "Voyager (Lvl 4)", "Cartographer (Lvl 5)", "Sovereign (Lvl 10)"].map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Live Procedural Badge Preview */}
                  {(() => {
                    const isUnlocked = contributedCountries.some(c => c?.toLowerCase() === searchCountry.toLowerCase());
                    return (
                      <div className={`relative border p-8 rounded-[36px] text-center select-none transition-all duration-300 ${
                        isUnlocked 
                          ? 'bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white border-indigo-500/30 shadow-lg scale-[1.01]' 
                          : 'bg-slate-50 text-[#141414]/60 border-[#141414]/10'
                      }`}>
                        <div className="absolute top-4 right-4 text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded bg-[#141414]/5 border border-[#141414]/5">
                          Dynamic ID: #{Math.abs(searchCountry.charCodeAt(0) * searchState.charCodeAt(0) * searchActivity.charCodeAt(0) * 11).toString().slice(0, 6)}
                        </div>

                        <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-white/10 text-white shadow-md">
                          <Compass className={`w-8 h-8 ${isUnlocked ? 'animate-spin [animation-duration:10s] text-indigo-400' : 'opacity-40 text-slate-400'}`} />
                        </div>

                        <h4 className={`text-lg font-black tracking-tight mb-1 ${isUnlocked ? 'text-white' : 'text-[#141414]'}`}>
                          {isUnlocked ? `${searchCountry} ${searchActivity}` : '🔒 Procedural Sector Locked'}
                        </h4>
                        
                        <p className={`text-[10px] uppercase font-black tracking-widest ${isUnlocked ? 'text-indigo-400' : 'text-slate-500'}`}>
                          {searchState} • {searchRank}
                        </p>

                        <p className="text-xs mt-3.5 opacity-80 leading-relaxed max-w-md mx-auto">
                          {isUnlocked 
                            ? `Sector Complete! You have explored and marked locations within ${searchCountry}.`
                            : `To unlock this sector badge, add a discovery location within ${searchCountry} on the main map.`
                          }
                        </p>

                        {isUnlocked && (
                          <div className="mt-4 inline-flex items-center gap-1.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-wider px-4 py-1.5 rounded-full border border-indigo-400/30">
                            <Check className="w-3.5 h-3.5" /> Dynamic Sector Unlocked
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Progress Tracker */}
                  {(() => {
                    const unlockedProcedural = (stats.contributed * 51) + (stats.saved * 12) + (stats.planned * 18);
                    const pct = Math.min((unlockedProcedural / 10000000) * 100, 100);
                    return (
                      <div className="space-y-2 pt-2">
                        <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-wider text-[#141414]/50">
                          <span>1 Crore Unlocked Registry Progress</span>
                          <span className="font-mono text-[#141414] font-bold">{unlockedProcedural.toLocaleString()} / 10,000,000</span>
                        </div>
                        <div className="w-full bg-[#141414]/5 rounded-full h-3 overflow-hidden border border-[#141414]/5">
                          <div 
                            className="bg-gradient-to-r from-teal-500 to-indigo-500 h-full rounded-full transition-all duration-1000"
                            style={{ width: `${Math.max(pct, 0.05)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
              )}

              {/* TAB 3: CHAMPION HOLD (0.001%) */}
              {activeTab === 'cosmic' && (
                <div className="space-y-6">
                  <div className="bg-slate-950 text-white p-8 rounded-[40px] border border-slate-800 relative overflow-hidden shadow-2xl text-center flex flex-col items-center">
                    
                    {/* Glowing mesh background */}
                    <div className="absolute inset-0 bg-gradient-to-b from-teal-500/10 to-transparent pointer-events-none" />

                    <div className="relative w-32 h-32 flex items-center justify-center mb-6">
                      {/* Telemetry radar ripples */}
                      <div className="absolute inset-0 rounded-full border border-teal-500/20 animate-ping [animation-duration:3s]" />
                      <div className="absolute inset-3 rounded-full border border-teal-500/30" />
                      <div className="absolute inset-8 rounded-full border border-teal-500/40" />
                      
                      {/* Sweeping scan arm */}
                      {isScanning && (
                        <div className="absolute inset-0 rounded-full border-r-4 border-teal-400 animate-spin" />
                      )}

                      <Compass className={`w-14 h-14 text-teal-400 transition-all duration-300 ${isScanning ? 'animate-pulse scale-105' : ''}`} />
                    </div>

                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-teal-400 bg-teal-950/80 px-4 py-2 rounded-full border border-teal-500/20 shadow-inner">
                      Cosmic Coordinate Scanner
                    </span>

                    {/* Lock state badge indicator */}
                    <div className={`mt-4 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border transition-all duration-300 ${
                      stats.isWorldChampion 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                        : 'bg-slate-900/80 text-slate-400 border-slate-800'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${stats.isWorldChampion ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                      Hold Status: {stats.isWorldChampion ? 'HOLDING ACHIEVEMENT' : 'NOT HELD'}
                    </div>

                    <h3 className="text-2xl font-black uppercase tracking-tight text-white mt-5">
                      Search World Champion Coordinates
                    </h3>

                    <p className="text-xs text-slate-400 mt-2.5 leading-relaxed max-w-md">
                      Telemetry scan sweep utilizes sub-orbital quantum sensors to detect legendary explorer signatures. Winning probability is locked at exactly <span className="text-teal-300 font-mono font-black">0.001%</span> per sweep.
                    </p>

                    {/* Scan Output Terminal Logs */}
                    <div className="w-full bg-slate-900/90 rounded-2xl p-4.5 mt-5 border border-slate-800 font-mono text-[11px] text-left text-teal-400 leading-normal min-h-[56px] flex items-center justify-center">
                      {isScanning ? (
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping shrink-0" />
                          <span>{scanStatus}</span>
                        </div>
                      ) : scanStatus ? (
                        <span className={scanSuccess ? "text-emerald-400 font-bold" : "text-slate-400"}>
                          {scanStatus}
                        </span>
                      ) : (
                        <span className="text-slate-500">Scanner status: Idle. Telemetry sweep channels are clear.</span>
                      )}
                    </div>

                    {/* Sweep Button */}
                    <button
                      type="button"
                      onClick={handleCosmicScan}
                      disabled={isScanning}
                      className={`w-full mt-6 py-5 rounded-[24px] text-xs font-black uppercase tracking-widest transition-all ${
                        isScanning 
                          ? 'bg-slate-850 text-slate-600 cursor-not-allowed border border-slate-800' 
                          : 'bg-teal-500 hover:bg-teal-400 text-slate-950 font-black shadow-lg shadow-teal-500/20 active:scale-[0.98]'
                      }`}
                    >
                      {isScanning ? 'Deep Telemetry Tracker Active...' : 'Initiate Sub-Orbital Sweep'}
                    </button>

                    {/* Scan counter */}
                    <div className="flex gap-4 mt-4 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      <span>Total Scans: {scanAttempts}</span>
                      <span>Scan multiplier: {isOwnerBypass ? '100,000x' : '1x'}</span>
                    </div>

                    {/* Site Owner Overdrive Control Panel */}
                    {user?.email === 'mukkuc41@gmail.com' && (
                      <div className="mt-6 pt-5 border-t border-slate-800/80 w-full flex items-center justify-between">
                        <div className="text-left">
                          <div className="text-[9px] font-black uppercase tracking-widest text-teal-400">Site Owner Override Tool</div>
                          <div className="text-[8px] text-slate-500">Toggle to instantly bypass coordinate scanner lock and secure World Champion status</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isOwnerBypass}
                            onChange={e => handleToggleWorldChampionDirectly(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500 peer-checked:after:bg-slate-950"></div>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Celebratory success card */}
                  {stats.isWorldChampion && (
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 p-6 rounded-[36px] border border-yellow-300 shadow-xl flex items-center gap-4 relative overflow-hidden"
                    >
                      <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-15 pointer-events-none select-none">
                        <Trophy className="w-28 h-28 rotate-12" />
                      </div>
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0 shadow-md">
                        <Trophy className="w-6 h-6 text-slate-950 animate-bounce" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-950">Legendary Title Active!</h4>
                        <p className="text-xs font-bold leading-tight mt-1 text-slate-900">
                          You currently hold the absolute pinnacle of global discovery. The World Champion Explorer status has been resolved for your account.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-[#f8f8f5] border-t border-[#141414]/5 flex items-center justify-center gap-4">
               <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-[#141414]/5 shadow-sm">
                  <Info className="w-3.5 h-3.5 opacity-40" />
                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">Earn badges by sharing discoveries and planning tours</span>
               </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
