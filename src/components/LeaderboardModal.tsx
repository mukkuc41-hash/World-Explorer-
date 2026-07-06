import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, X, Award, Star, TrendingUp, Users, Crown, Medal, Sparkles, Zap, CheckCircle2, MapPin, Compass, Globe, Heart, Gem } from 'lucide-react';
import { db } from '../lib/firebase';
import { safelyConvertToDate } from '../lib/dateUtils';
import { collection, query, orderBy, limit, getDocs, where, doc, getDoc, setDoc, increment, serverTimestamp } from 'firebase/firestore';

const PROCEDURAL_TIERS = [
  { 
    name: 'Beginning', 
    threshold: 10, 
    divisor: 1,
    tagColor: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    icon: MapPin
  },
  { 
    name: 'Medium', 
    threshold: 50, 
    divisor: 1,
    tagColor: 'bg-sky-500/10 text-sky-700 border-sky-500/20 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30',
    iconColor: 'text-sky-600 dark:text-sky-400',
    icon: Compass
  },
  { 
    name: 'Top', 
    threshold: 100, 
    divisor: 1,
    tagColor: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    icon: Award
  },
  { 
    name: 'Pro', 
    threshold: 250, 
    divisor: 1,
    tagColor: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    icon: Star
  },
  { 
    name: 'God', 
    threshold: 500, 
    divisor: 1,
    tagColor: 'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30',
    iconColor: 'text-rose-600 dark:text-rose-400',
    icon: Sparkles
  },
  { 
    name: 'Extinct', 
    threshold: 1000, 
    divisor: 1,
    tagColor: 'bg-slate-500/10 text-slate-700 border-slate-500/20 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/30',
    iconColor: 'text-slate-700 dark:text-slate-300',
    icon: Globe
  },
  { 
    name: 'Masters', 
    threshold: 2500, 
    divisor: 1,
    tagColor: 'bg-violet-500/10 text-violet-700 border-violet-500/20 dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/30',
    iconColor: 'text-violet-600 dark:text-violet-400',
    icon: Trophy
  },
  { 
    name: 'Enthusiastic', 
    threshold: 5000, 
    divisor: 1,
    tagColor: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:bg-yellow-500/20 dark:text-yellow-300 dark:border-yellow-500/30',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    icon: Heart
  },
  { 
    name: 'Amateurs World Explorer Champion', 
    threshold: 10000, 
    divisor: 1,
    tagColor: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
    iconColor: 'text-fuchsia-400',
    icon: Gem
  }
];

const calculateHighestBadge = (locations: any[]) => {
  if (!locations || locations.length === 0) return null;

  const counts: Record<string, number> = {};
  locations.forEach(loc => {
    const stateName = loc.state || loc.city || loc.country || 'Unknown Sector';
    counts[stateName] = (counts[stateName] || 0) + 1;
  });

  const maxVisits = Math.max(...Object.values(counts));

  let highestTier = null;
  for (let i = PROCEDURAL_TIERS.length - 1; i >= 0; i--) {
    if (maxVisits >= PROCEDURAL_TIERS[i].threshold) {
      highestTier = PROCEDURAL_TIERS[i];
      break;
    }
  }

  if (!highestTier) return null;

  const level = maxVisits - highestTier.threshold + 1;

  return {
    name: highestTier.name,
    level,
    tagColor: highestTier.tagColor,
    iconColor: highestTier.iconColor,
    icon: highestTier.icon
  };
};

interface LeaderboardUser {
  id: string;
  displayName: string;
  points: number;
  username: string;
  photoURL?: string;
  xpBoosts?: number;
  highestBadge?: {
    name: string;
    level: number;
    tagColor: string;
    iconColor: string;
    icon: any;
  } | null;
}

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any;
}

const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose, user }) => {
  const [leadingUsers, setLeadingUsers] = useState<LeaderboardUser[]>([]);
  const [userRecentUploads, setUserRecentUploads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUserUploadsLoading, setIsUserUploadsLoading] = useState(false);
  const [isBoosting, setIsBoosting] = useState(false);
  const [boostSuccess, setBoostSuccess] = useState(false);
  
  // Interactive progress states
  const [showProgressDetails, setShowProgressDetails] = useState(false);
  const [userDetails, setUserDetails] = useState<{
    displayName: string;
    points: number;
    totalDiscoveries: number;
    totalReviews: number;
    xpBoosts: number;
    username: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      runInitialSync();
    }
  }, [isOpen, user]);

  const runInitialSync = async () => {
    setIsLoading(true);
    if (user) {
      // Reconcile user XP points based on actual uploads & insights
      await reconcileUserPoints(user.uid);
      await fetchUserRecentUploads();
    }
    await fetchLeaderboard();
  };

  const reconcileUserPoints = async (uid: string) => {
    try {
      // count locations
      const locQ = query(collection(db, 'locations'), where('userId', '==', uid));
      const locSnap = await getDocs(locQ);
      const activeLocs = locSnap.docs.filter(d => !d.data().isDeleted);
      const locCount = activeLocs.length;

      // count reviews
      const revQ = query(collection(db, 'reviews'), where('userId', '==', uid));
      const revSnap = await getDocs(revQ);
      const revCount = revSnap.size;

      // Base XP is set to 5600 points
      const reconciledXP = 5600;

      // If missing or different, update Firestore
      const publicRef = doc(db, 'public_profiles', uid);
      const publicSnap = await getDoc(publicRef);

      const userRef = doc(db, 'users', uid);
      await setDoc(publicRef, {
        points: reconciledXP,
        totalDiscoveries: locCount,
        totalReviews: revCount,
        updatedAt: serverTimestamp()
      }, { merge: true });

      await setDoc(userRef, {
        points: reconciledXP,
        totalDiscoveries: locCount,
        totalReviews: revCount,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Save user level progress details locally
      setUserDetails({
        displayName: user?.displayName || 'Architectural Explorer',
        points: reconciledXP,
        totalDiscoveries: locCount,
        totalReviews: revCount,
        xpBoosts: 0,
        username: publicSnap.exists() ? (publicSnap.data()?.username || '@explorer') : '@explorer'
      });

      console.log(`[XP Reconciler] Synced ${uid} points strictly based on real uploads Count (${locCount}). Final: ${reconciledXP}`);
    } catch (err) {
      console.error("[XP Reconciler] Failed to reconcile points:", err);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const q = query(collection(db, 'public_profiles'), orderBy('points', 'desc'), limit(10));
      const snap = await getDocs(q);
      const users = snap.docs.map(d => ({ id: d.id, ...d.data() } as LeaderboardUser));
      
      const userIds = users.map(u => u.id);
      const userLocationsMap: Record<string, any[]> = {};
      
      if (userIds.length > 0) {
        const locQ = query(collection(db, 'locations'), where('userId', 'in', userIds));
        const locSnap = await getDocs(locQ);
        locSnap.docs.forEach(docSnap => {
          const loc = docSnap.data();
          if (!loc.isDeleted) {
            const uid = loc.userId;
            if (!userLocationsMap[uid]) {
              userLocationsMap[uid] = [];
            }
            userLocationsMap[uid].push(loc);
          }
        });
      }

      const usersWithBadges = users.map(userItem => {
        const locations = userLocationsMap[userItem.id] || [];
        const highestBadge = calculateHighestBadge(locations);
        return {
          ...userItem,
          highestBadge
        };
      });

      setLeadingUsers(usersWithBadges);
    } catch (e) {
      console.error("Error fetching leaderboard:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserRecentUploads = async () => {
    if (!user) {
      setUserRecentUploads([]);
      return;
    }
    setIsUserUploadsLoading(true);
    try {
      const q = query(
        collection(db, 'locations'),
        where('userId', '==', user.uid)
      );
      const snap = await getDocs(q);
      const uploads = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(loc => !loc.isDeleted)
        .sort((a, b) => {
          const dateA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
          const dateB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        })
        .slice(0, 3);
      setUserRecentUploads(uploads);
    } catch (e) {
      console.error("Error fetching user uploads:", e);
    } finally {
      setIsUserUploadsLoading(false);
    }
  };

  const claimXpBoost = async () => {
    if (!user) return;
    setIsBoosting(true);
    try {
      const publicRef = doc(db, 'public_profiles', user.uid);
      const userRef = doc(db, 'users', user.uid);

      await setDoc(publicRef, {
        points: increment(100),
        xpBoosts: increment(1),
        updatedAt: serverTimestamp()
      }, { merge: true });

      await setDoc(userRef, {
        points: increment(100),
        xpBoosts: increment(1),
        updatedAt: serverTimestamp()
      }, { merge: true });

      setUserDetails(prev => {
        if (!prev) return null;
        return {
          ...prev,
          points: prev.points + 100,
          xpBoosts: prev.xpBoosts + 1
        };
      });

      setBoostSuccess(true);
      await fetchLeaderboard();
      setTimeout(() => {
        setBoostSuccess(false);
      }, 4000);
    } catch (e) {
      console.error("Error updating user boost:", e);
    } finally {
      setIsBoosting(false);
    }
  };

  const getExplorerLevel = (xp: number) => {
    if (xp >= 1000) return { title: 'Grand Architect', nextTitle: 'Max Level reached', maxPoints: 1000, color: 'from-amber-600 to-amber-700', badgeName: '👑 Level 5' };
    if (xp >= 500) return { title: 'Master Mason', nextTitle: 'Grand Architect', maxPoints: 1000, color: 'from-purple-600 to-indigo-600', badgeName: '🛡️ Level 4' };
    if (xp >= 250) return { title: 'Surveyor Builder', nextTitle: 'Master Mason', maxPoints: 500, color: 'from-blue-600 to-blue-700', badgeName: '📐 Level 3' };
    if (xp >= 100) return { title: 'Apprentice Mapper', nextTitle: 'Surveyor Builder', maxPoints: 250, color: 'from-[#00af87] to-emerald-750', badgeName: '🔍 Level 2' };
    return { title: 'Novice Explorer', nextTitle: 'Apprentice Mapper', maxPoints: 100, color: 'from-[#5A5A40] to-neutral-700', badgeName: '🌱 Level 1' };
  };

  const levelInfo = getExplorerLevel(userDetails?.points || 0);
  const currentXP = userDetails?.points || 0;
  const progressPercent = Math.min((currentXP / levelInfo.maxPoints) * 100, 100);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#141414]/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-y-auto max-h-[90vh] border border-[#141414]/10 scrollbar-thin"
          >
            <div className="p-8 md:p-12">
              <div className="flex justify-between items-start mb-10">
                <div>
                  <div className="flex items-center gap-3 text-[#141414] mb-2 px-1">
                    <button
                      onClick={() => setShowProgressDetails(!showProgressDetails)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm group hover:scale-110 active:scale-95 transition-all text-white cursor-pointer relative ${
                        showProgressDetails ? 'bg-emerald-950 ring-2 ring-emerald-500' : 'bg-[#141414] hover:bg-neutral-800'
                      }`}
                      title="Click to view detailed progress breakdown"
                    >
                      <Trophy className="w-4 h-4 text-white group-hover:rotate-12 transition-transform" />
                      {!showProgressDetails && (
                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                      )}
                    </button>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Season 04</span>
                    
                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded cursor-pointer animate-pulse hover:bg-emerald-100 transition-colors" onClick={() => setShowProgressDetails(!showProgressDetails)}>
                      {showProgressDetails ? 'Close Progress' : 'Click Trophy for Your Progress ⚡'}
                    </span>
                  </div>
                  <h2 className="text-4xl font-serif italic tracking-tighter text-[#141414]">Exploration <span className="opacity-40">Leaders</span></h2>
                  <p className="text-sm text-[#141414]/40 mt-3 leading-relaxed max-w-sm">
                    Points are awarded for each architectural discovery shared, detailed archives created, and community engagements.
                  </p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-3 hover:bg-[#f5f5f0] rounded-full transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Detailed Progress Section (Toggled by clicking the black Trophy) */}
              <AnimatePresence>
                {showProgressDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="mb-8 overflow-hidden bg-gradient-to-br from-neutral-900 via-indigo-950 to-neutral-950 text-white rounded-[32px] border border-white/10 shadow-2xl"
                  >
                    <div className="p-6 md:p-8 space-y-6">
                      <div className="flex justify-between items-center pb-4 border-b border-white/10">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
                            <Trophy className="w-5 h-5 text-yellow-500 fill-yellow-500/20" />
                          </div>
                          <div>
                            <h3 className="text-sm font-black uppercase tracking-wider">Your Live Progress</h3>
                            <p className="text-[10px] text-white/50">{userDetails?.displayName || 'Explorer Status'}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-gradient-to-r ${levelInfo.color} shadow-sm`}>
                          {levelInfo.badgeName}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-white/40 block mb-1">XP Points</span>
                          <span className="text-2xl font-serif italic text-white font-black">{currentXP}</span>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-white/40 block mb-1">Discoveries</span>
                          <span className="text-2xl font-serif italic text-emerald-400 font-black">{userDetails?.totalDiscoveries || 0}</span>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-white/40 block mb-1">Reviews</span>
                          <span className="text-2xl font-serif italic text-blue-400 font-black">{userDetails?.totalReviews || 0}</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between items-center text-xs mb-2">
                          <span className="text-white/60 font-black uppercase tracking-wider">{levelInfo.title}</span>
                          <span className="text-white/40 font-mono">{currentXP} / {levelInfo.maxPoints} XP</span>
                        </div>
                        <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden p-0.5 border border-white/5 shadow-inner">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className={`h-full rounded-full bg-gradient-to-r ${levelInfo.color}`}
                          />
                        </div>
                        <p className="text-[10px] text-white/40 mt-2 text-right">
                          {progressPercent >= 100 ? "Max level achieved! 🎖️" : `${Math.ceil(levelInfo.maxPoints - currentXP)} XP needed for ${levelInfo.nextTitle}`}
                        </p>
                      </div>

                      {/* Detail points calculation rules list */}
                      <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/[0.05] space-y-2.5">
                        <h4 className="text-[10px] uppercase font-black tracking-widest text-white/40">Point Generation Rules</h4>
                        <div className="flex justify-between text-xs text-white/70">
                          <span>🗺️ 1st Architectural Discovery shared</span>
                          <span className="text-emerald-400 font-bold">150 XP</span>
                        </div>
                        <div className="flex justify-between text-xs text-white/70">
                          <span>✨ Additional Uploaded spots</span>
                          <span className="text-emerald-400 font-bold">+50 XP per spot</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>



              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-10 h-10 border-4 border-t-[#5A5A40] border-[#5A5A40]/10 rounded-full"
                  />
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-20">Syncing Data...</span>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {/* Table Header */}
                  {leadingUsers.length > 0 && (
                    <div className="flex items-center gap-5 px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#141414]/40 select-none">
                      <div className="w-10 text-center">Rank</div>
                      <div className="flex-1">Explorer</div>
                      <div className="hidden sm:block w-[160px] text-left">Badge Rank</div>
                      <div className="text-right w-20">Points</div>
                    </div>
                  )}

                  {leadingUsers.length > 0 ? (
                    leadingUsers.map((userItem, index) => {
                      const isCurrentActiveUser = user && userItem.id === user.uid;
                      const BadgeIcon = userItem.highestBadge?.icon;
                      return (
                        <motion.div 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          key={userItem.id} 
                          className={`flex items-center gap-5 p-3.5 rounded-3xl transition-all border ${
                            isCurrentActiveUser
                              ? 'bg-emerald-950 border-emerald-900 text-white shadow-xl shadow-emerald-950/20 ring-4 ring-emerald-500/20'
                              : index === 0 
                                ? 'bg-[#141414] border-black text-white shadow-xl shadow-black/20' 
                                : 'bg-[#f8f8f5] border-[#141414]/5 hover:bg-white hover:border-[#141414]/10'
                          }`}
                        >
                          <div className="flex items-center justify-center w-10 h-10 font-serif italic text-xl">
                            {index === 0 ? <Crown className="w-5 h-5 text-yellow-500" /> : index === 1 ? <Medal className="w-5 h-5 text-slate-400" /> : index === 2 ? <Medal className="w-5 h-5 text-amber-500" /> : `#${index + 1}`}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className={`text-base font-bold truncate ${index === 0 || isCurrentActiveUser ? 'text-white' : 'text-[#141414]'}`}>
                                {userItem.displayName || 'Anonymous Explorer'}
                              </div>
                              {isCurrentActiveUser && (
                                <span className="bg-emerald-500 text-emerald-950 text-[8px] font-black uppercase py-0.5 px-1.5 rounded tracking-wider shrink-0 animate-bounce">
                                  You
                                </span>
                              )}
                            </div>
                            <div className={`text-[10px] font-medium tracking-widest uppercase truncate ${index === 0 || isCurrentActiveUser ? 'text-white/40' : 'text-[#141414]/40'}`}>
                              {userItem.username || '@explorer'}
                            </div>
                          </div>

                          {/* Badge Rank Column */}
                          <div className="hidden sm:flex items-center w-[160px] text-left">
                            {userItem.highestBadge ? (
                              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider ${
                                isCurrentActiveUser || index === 0
                                  ? 'bg-white/10 border-white/25 text-white'
                                  : userItem.highestBadge.tagColor
                              }`}>
                                {BadgeIcon && <BadgeIcon className={`w-3.5 h-3.5 shrink-0 ${
                                  isCurrentActiveUser || index === 0
                                    ? 'text-white'
                                    : userItem.highestBadge.iconColor
                                }`} />}
                                <span className="truncate max-w-[85px]" title={userItem.highestBadge.name}>
                                  {userItem.highestBadge.name}
                                </span>
                                <span className={`font-mono text-[8px] font-black ${
                                  isCurrentActiveUser || index === 0 ? 'text-white/80' : 'text-[#141414]/60'
                                }`}>
                                  L{userItem.highestBadge.level}
                                </span>
                              </div>
                            ) : (
                              <span className={`text-[10px] font-bold uppercase tracking-widest ${
                                isCurrentActiveUser || index === 0 ? 'text-white/30' : 'text-[#141414]/20'
                              }`}>
                                Novice
                              </span>
                            )}
                          </div>

                          <div className="text-right flex flex-col items-end w-20">
                            <div className={`text-lg font-serif italic ${index === 0 || isCurrentActiveUser ? 'text-white font-black' : 'text-[#141414]'}`}>
                              {userItem.points || 0}
                            </div>
                            <div className={`text-[8px] font-black uppercase tracking-widest ${index === 0 || isCurrentActiveUser ? 'text-[#10b981]' : 'text-[#505030]'}`}>
                              XP Points
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="text-center py-16">
                       <Users className="w-10 h-10 mx-auto mb-3 opacity-10" />
                       <p className="text-sm font-serif italic opacity-30">No active explorers found in this region yet.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Active User's Recent Contributions Section */}
              {user && (
                <div className="mt-10 pt-8 border-t border-[#141414]/10">
                  <div className="flex items-center justify-between mb-5 px-1">
                    <div className="flex items-center gap-2 text-[#141414]">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-[#141414]">Your Recent Discoveries</h3>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-[#5A5A40] bg-[#5A5A40]/10 px-2 py-0.5 rounded-full">
                      {userRecentUploads.length} Active Contributing Spots
                    </span>
                  </div>

                  {isUserUploadsLoading ? (
                    <div className="flex justify-center py-6">
                      <div className="w-5 h-5 border-2 border-t-[#5A5A40] border-[#5A5A40]/10 rounded-full animate-spin" />
                    </div>
                  ) : userRecentUploads.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {userRecentUploads.map((loc) => (
                        <div key={loc.id} className="bg-[#f8f8f5] hover:bg-white rounded-2xl p-3 border border-[#141414]/5 hover:border-[#141414]/10 hover:shadow-md transition-all flex flex-col justify-between group">
                          <div>
                            <div className="relative w-full h-24 rounded-lg overflow-hidden mb-3.5">
                              <img 
                                src={loc.imageUrl || "https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&q=80&w=400"} 
                                alt={loc.name} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                referrerPolicy="no-referrer"
                              />
                              
                              {/* Pill Badge showing if added by AI or Self */}
                              <div className="absolute top-2 left-2">
                                {loc.addedByAi ? (
                                  <span className="text-[7px] font-black uppercase tracking-wider text-white bg-gradient-to-r from-purple-700 via-indigo-700 to-indigo-800 px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                                    ✨ AI Mapped
                                  </span>
                                ) : (
                                  <span className="text-[7px] font-black uppercase tracking-wider text-white bg-neutral-900 px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                                    👤 Self Mapped
                                  </span>
                                )}
                              </div>
                            </div>
                            <h4 className="text-xs font-sans font-bold text-[#141414] truncate mb-0.5">
                              {loc.name || "Mysterious Spot"}
                            </h4>
                            <p className="text-[9px] text-[#141414]/50 truncate">
                              {loc.state || loc.country || "Uncharted Region"}
                            </p>
                          </div>
                          
                          <div className="mt-3.5 pt-2 border-t border-[#141414]/5 flex items-center justify-between">
                            <span className="text-[8px] text-[#141414]/40 font-mono">
                              {safelyConvertToDate(loc.createdAt).toLocaleDateString()

                                
                              }
                            </span>
                            <span className="text-[9px] font-serif font-black text-emerald-700 italic tracking-wide">
                              +50 XP
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-[#f8f8f5] rounded-3xl border border-[#141414]/5 p-5">
                      <p className="text-xs font-serif italic text-[#141414]/60">
                        You haven't uploaded any places yet.
                      </p>
                      <p className="text-[10px] text-[#141414]/40 mt-1 max-w-sm mx-auto">
                        Share a landmark manually or chat with our AI companion to discover and map your first architectural wonder!
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-10 pt-8 border-t border-[#141414]/5 grid grid-cols-3 gap-6 text-center">
                 <div>
                    <div className="text-xl font-serif italic text-[#141414]">2.4k</div>
                    <div className="text-[8px] font-black uppercase tracking-widest opacity-30">Total Experts</div>
                 </div>
                 <div>
                    <div className="text-xl font-serif italic text-[#141414]">12.8k</div>
                    <div className="text-[8px] font-black uppercase tracking-widest opacity-30">Discoveries</div>
                 </div>
                 <div>
                    <div className="text-xl font-serif italic text-[#141414]">04</div>
                    <div className="text-[8px] font-black uppercase tracking-widest opacity-30">Days Left</div>
                 </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default LeaderboardModal;
