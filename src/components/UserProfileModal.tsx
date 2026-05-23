import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType, logout } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { X, User as UserIcon, Calendar, Mail, Phone, ChevronDown, Check, Award, MapPin, Bookmark, Compass, Lock, Trophy, Clock, LogOut } from 'lucide-react';
import { TRAVEL_BADGES } from '../constants/badges.tsx';

interface UserProfile {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phoneNumber: string;
  birthDate: string;
  gender: string;
  lastLogin?: any;
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export default function UserProfileModal({ isOpen, onClose, user }: UserProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile>({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phoneNumber: '',
    birthDate: '',
    gender: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showBadgesSubmenu, setShowBadgesSubmenu] = useState(false);
  const [stats, setStats] = useState({
    saved: 0,
    planned: 0,
    archived: 0,
    contributed: 0
  });
  const [recentContributions, setRecentContributions] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && user) {
      fetchProfile();
      fetchStats();
      fetchRecentActivity();
    }
  }, [isOpen, user]);

  const fetchStats = async () => {
    if (!user) return;
    try {
      const collections = ['favorites', 'tours', 'archives', 'locations'];
      const results = await Promise.all(collections.map(col => {
        const q = query(collection(db, col), where('userId', '==', user.uid));
        return getDocs(q);
      }));
      
      setStats({
        saved: results[0].size,
        planned: results[1].size,
        archived: results[2].size,
        contributed: results[3].size
      });
    } catch (e) {
      console.error("Error fetching stats:", e);
    }
  };

  const fetchRecentActivity = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'locations'), 
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(3)
      );
      const snap = await getDocs(q);
      setRecentContributions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Error fetching recent activity:", e);
    }
  };

  const fetchProfile = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      } else {
        // Pre-fill with user info if no profile exists
        const isAdminEmail = user.email === 'mukkuc41@gmail.com';
        setProfile(prev => ({
          ...prev,
          email: user.email || '',
          firstName: user.displayName?.split(' ')[0] || '',
          lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
          username: isAdminEmail ? '@Admin/owner-41@123' : '@' + (user.email?.split('@')[0] || 'user')
        }));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Never';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        ...profile,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    } finally {
      setIsSaving(false);
    }
  };

  const inputClasses = "w-full bg-[#fdfdfc] border border-[#141414]/15 focus:border-[#141414] px-5 py-4 rounded-2xl text-base outline-none transition-all placeholder:text-[#141414]/20 font-medium";
  const labelClasses = "block text-xs font-bold text-[#141414]/40 uppercase tracking-[0.15em] mb-2 px-1";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#f5f5f0]/90 backdrop-blur-xl"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[48px] shadow-2xl overflow-hidden border border-[#141414]/5"
          >
            <div className="p-8 md:p-12 overflow-y-auto max-h-[90vh]">
              <AnimatePresence mode="wait">
                {!showBadgesSubmenu ? (
                  <motion.div
                    key="profile-view"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                      <div className="flex justify-between items-start mb-10">
                        <div>
                          <h2 className="text-4xl font-sans font-bold tracking-tight text-[#141414]">Edit Profile</h2>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                             {user?.email === 'mukkuc41@gmail.com' && (
                                <span className="px-2 py-0.5 bg-[#141414] text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-md">Site Owner</span>
                             )}
                             <span className="px-2 py-0.5 bg-[#f5f5f0] border border-[#141414]/10 text-[8px] font-black uppercase tracking-[0.2em] rounded-md opacity-60">
                               Last Login: {formatDate(profile.lastLogin)}
                             </span>
                             {user?.email === 'mukkuc41@gmail.com' && (
                                <span className="text-[10px] font-bold text-[#141414]/40 italic">@Admin/owner-41@123</span>
                             )}
                          </div>
                        </div>
                        <button 
                          onClick={onClose}
                          className="p-3 hover:bg-[#f5f5f0] rounded-full transition-colors"
                        >
                          <X className="w-6 h-6" />
                        </button>
                      </div>

                      {/* Recent Activity Section */}
                      {recentContributions.length > 0 && (
                        <div className="mb-12">
                           <h3 className="text-[10px] uppercase font-black tracking-[0.2em] text-[#141414]/40 mb-4 px-1">Recent Contributions</h3>
                           <div className="space-y-3">
                              {recentContributions.map(loc => (
                                <div key={loc.id} className="flex items-center gap-4 p-3 bg-[#f8f8f5] rounded-2xl border border-[#141414]/5 group hover:bg-white transition-all">
                                   <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm">
                                      <img src={loc.imageUrl} alt={loc.name} className="w-full h-full object-cover" />
                                   </div>
                                   <div className="flex-1 min-w-0">
                                      <div className="text-xs font-bold text-[#141414] truncate">{loc.name}</div>
                                      <div className="text-[10px] text-[#141414]/40">{loc.continent} • {loc.country}</div>
                                   </div>
                                   <div className="text-[9px] font-bold text-[#141414]/20 mr-2 flex items-center gap-1">
                                      <Clock className="w-3 h-3" /> {new Date(loc.createdAt?.toDate ? loc.createdAt.toDate() : loc.createdAt).toLocaleDateString()}
                                   </div>
                                </div>
                              ))}
                           </div>
                        </div>
                      )}

                    {/* Stats Dashboard */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                       {[
                         { label: 'Saved', val: stats.saved, icon: <Bookmark className="w-4 h-4" />, color: 'bg-blue-500' },
                         { label: 'Tours', val: stats.planned, icon: <Calendar className="w-4 h-4" />, color: 'bg-[#00af87]' },
                         { label: 'Archives', val: stats.archived, icon: <MapPin className="w-4 h-4" />, color: 'bg-[#141414]' },
                         { label: 'Level', val: Math.floor(stats.contributed / 2) + 1, icon: <Award className="w-4 h-4" />, color: 'bg-yellow-500' }
                       ].map((s, i) => (
                         <div key={i} className="bg-[#f8f8f5] p-5 rounded-[28px] border border-[#141414]/5 flex flex-col items-center justify-center gap-2">
                            <div className={`${s.color} text-white p-2 rounded-xl shadow-lg`}>
                              {s.icon}
                            </div>
                            <div className="text-xl font-black tracking-tighter">{s.val}</div>
                            <div className="text-[8px] uppercase font-black tracking-widest opacity-30">{s.label}</div>
                         </div>
                       ))}
                    </div>

                    {/* Achievement Gallery - Clickable to open submenu */}
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowBadgesSubmenu(true)}
                      className="mb-12 p-6 bg-[#f8f8f5] rounded-[32px] border border-[#141414]/5 cursor-pointer group hover:bg-white hover:shadow-xl transition-all"
                    >
                      <div className="flex items-center justify-between mb-6 px-1">
                         <div className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-yellow-500" />
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#141414]">My Achievements</h3>
                         </div>
                         <div className="flex items-center gap-2 text-[10px] font-bold text-[#141414]/40">
                            <span>{TRAVEL_BADGES.filter(b => b.requirement(stats)).length} / {TRAVEL_BADGES.length} Badges</span>
                            <ChevronDown className="w-3 h-3 group-hover:rotate-180 transition-transform" />
                         </div>
                      </div>
                      
                      <div className="grid grid-cols-7 gap-2">
                         {TRAVEL_BADGES.slice(0, 14).map((badge) => {
                           const isUnlocked = badge.requirement(stats);
                           return (
                             <div 
                               key={badge.id}
                               className={`flex items-center justify-center aspect-square rounded-xl transition-all ${
                                 isUnlocked 
                                   ? 'bg-white shadow-sm' 
                                   : 'bg-[#141414]/5 opacity-20'
                               }`}
                             >
                                <div className="scale-75" style={{ color: isUnlocked ? badge.color : 'inherit' }}>
                                   {badge.icon}
                                </div>
                             </div>
                           );
                         })}
                      </div>
                    </motion.div>

                    {isLoading ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-12 h-12 border-4 border-[#141414]/10 border-t-[#141414] rounded-full animate-spin" />
                        <p className="text-sm font-bold uppercase tracking-widest opacity-30">Loading Profile...</p>
                      </div>
                    ) : (
                      <form onSubmit={handleSave} className="space-y-8">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={labelClasses}>First Name</label>
                            <input
                              type="text"
                              value={profile.firstName || ''}
                              onChange={e => setProfile({...profile, firstName: e.target.value})}
                              className={inputClasses}
                              placeholder="e.g. Sabrina"
                            />
                          </div>
                          <div>
                            <label className={labelClasses}>Last Name</label>
                            <input
                              type="text"
                              value={profile.lastName || ''}
                              onChange={e => setProfile({...profile, lastName: e.target.value})}
                              className={inputClasses}
                              placeholder="e.g. Aryan"
                            />
                          </div>
                        </div>

                        <div>
                          <label className={labelClasses}>Username</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={profile.username || ''}
                              onChange={e => setProfile({...profile, username: e.target.value})}
                              className={inputClasses}
                              placeholder="@username"
                            />
                            <UserIcon className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-20" />
                          </div>
                        </div>

                        <div>
                          <label className={labelClasses}>Email</label>
                          <div className="relative">
                            <input
                              type="email"
                              value={profile.email || ''}
                              readOnly
                              className={`${inputClasses} bg-[#f5f5f0] cursor-not-allowed`}
                            />
                            <Mail className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-20" />
                          </div>
                        </div>

                        <div>
                          <label className={labelClasses}>Phone Number</label>
                          <div className="relative group">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-2 border-r border-[#141414]/10 pr-3 mr-3 h-6">
                              <span className="text-sm font-bold opacity-40">+234</span>
                              <ChevronDown className="w-3 h-3 opacity-40" />
                            </div>
                            <input
                              type="tel"
                              value={profile.phoneNumber || ''}
                              onChange={e => setProfile({...profile, phoneNumber: e.target.value})}
                              className={`${inputClasses} pl-24`}
                              placeholder="904 6470"
                            />
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 w-px h-6 bg-[#00af87] animate-pulse" />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className={labelClasses}>Birth</label>
                            <div className="relative">
                              <input
                                type="date"
                                value={profile.birthDate || ''}
                                onChange={e => setProfile({...profile, birthDate: e.target.value})}
                                className={`${inputClasses} appearance-none`}
                              />
                              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                                 <ChevronDown className="w-5 h-5 opacity-40" />
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className={labelClasses}>Gender</label>
                            <div className="relative">
                              <select
                                value={profile.gender || ''}
                                onChange={e => setProfile({...profile, gender: e.target.value})}
                                className={`${inputClasses} appearance-none cursor-pointer`}
                              >
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Non-binary">Non-binary</option>
                                <option value="Prefer not to say">Prefer not to say</option>
                              </select>
                              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                                 <ChevronDown className="w-5 h-5 opacity-40" />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-6 space-y-3">
                          <button
                            type="submit"
                            disabled={isSaving}
                            className={`w-full py-5 rounded-[24px] font-bold text-lg uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${
                              saveSuccess 
                                ? 'bg-[#00af87] text-white' 
                                : 'bg-[#141414] text-white hover:bg-[#333] active:scale-95'
                            } disabled:opacity-50`}
                          >
                            {isSaving ? (
                              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : saveSuccess ? (
                              <><Check className="w-6 h-6" /> Profile Saved</>
                            ) : (
                              'Update Profile'
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await logout();
                                onClose();
                              } catch (e) {
                                console.error("Logout Error:", e);
                              }
                            }}
                            className="w-full py-4 rounded-[24px] border border-red-200 text-red-600 font-bold text-base uppercase tracking-widest hover:bg-red-50 active:scale-95 transition-all flex items-center justify-center gap-2"
                          >
                            <LogOut className="w-5 h-5" /> Log Out
                          </button>
                        </div>
                      </form>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="badges-submenu"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                    <div className="flex items-center gap-4 mb-10">
                      <button 
                        onClick={() => setShowBadgesSubmenu(false)}
                        className="p-3 hover:bg-[#f5f5f0] rounded-full transition-colors rotate-90"
                      >
                        <ChevronDown className="w-6 h-6" />
                      </button>
                      <div>
                        <h2 className="text-3xl font-sans font-bold tracking-tight text-[#141414]">My Badges</h2>
                        <p className="text-xs uppercase tracking-widest font-black opacity-30 mt-1">Personal Performance Score</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-[#141414] text-white p-8 rounded-[40px] flex flex-col justify-between aspect-square">
                          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                             <Compass className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="text-[42px] font-serif italic mb-0 leading-none">
                               {Math.floor((TRAVEL_BADGES.filter(b => b.requirement(stats)).length / TRAVEL_BADGES.length) * 100)}%
                            </div>
                            <div className="text-[10px] uppercase font-black tracking-widest opacity-40">World Mastery</div>
                          </div>
                       </div>
                       <div className="bg-[#00af87] text-white p-8 rounded-[40px] flex flex-col justify-between aspect-square">
                          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                             <Award className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="text-[42px] font-serif italic mb-0 leading-none">
                               {stats.contributed}
                            </div>
                            <div className="text-[10px] uppercase font-black tracking-widest opacity-40">Locations Shared</div>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-6">
                      <h4 className="text-[10px] uppercase font-black tracking-[0.2em] opacity-30 ml-2">Collection Registry</h4>
                      <div className="grid grid-cols-2 gap-3 pb-8">
                         {TRAVEL_BADGES.map((badge) => {
                           const isUnlocked = badge.requirement(stats);
                           return (
                             <motion.div 
                               key={badge.id}
                               initial={{ opacity: 0, y: 10 }}
                               animate={{ opacity: 1, y: 0 }}
                               className={`relative group flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                                 isUnlocked 
                                   ? 'bg-white border-[#141414]/10 shadow-sm' 
                                   : 'bg-[#141414]/5 opacity-40'
                               }`}
                             >
                                <div 
                                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md" 
                                  style={{ backgroundColor: badge.color }}
                                >
                                   {badge.icon}
                                </div>
                                <div className="min-w-0">
                                   <div className="text-[11px] font-bold truncate">{isUnlocked ? badge.name : '???'}</div>
                                   <div className="text-[9px] opacity-40 truncate leading-none mt-1">
                                      {isUnlocked ? badge.description : badge.hint}
                                   </div>
                                </div>
                                
                                {!isUnlocked && (
                                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Lock className="w-2.5 h-2.5 text-[#141414]/20" />
                                  </div>
                                )}
                             </motion.div>
                           );
                         })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
