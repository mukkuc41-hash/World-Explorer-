import React, { useState, useEffect } from 'react';
import { User, deleteUser } from 'firebase/auth';
import { db, handleFirestoreError, OperationType, logout } from '../lib/firebase';
import { safelyConvertToDate } from '../lib/dateUtils';
import { collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { X, User as UserIcon, Calendar, Mail, Phone, ChevronDown, Check, Award, MapPin, Bookmark, Compass, Lock, Trophy, Clock, LogOut, Trash2, ShieldAlert, Camera, RefreshCw, Share2 } from 'lucide-react';
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
  avatarId?: string;
  customAvatarUrl?: string;
  isWorldChampion?: boolean;
  streakCount?: number;
  longestStreak?: number;
  lastActiveDate?: string;
}

const EXPLORER_EMBLEMS = [
  {
    id: 'compass',
    name: 'Classic Compass',
    bgColor: 'from-teal-900 to-slate-900',
    color: '#00af87',
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full text-teal-400">
        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
        <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="1" />
        <polygon points="50,15 55,45 50,50" fill="currentColor" />
        <polygon points="50,85 45,55 50,50" fill="currentColor" opacity="0.6" />
        <polygon points="15,50 45,45 50,50" fill="currentColor" opacity="0.8" />
        <polygon points="85,50 55,55 50,50" fill="currentColor" opacity="0.4" />
        <circle cx="50" cy="50" r="4" fill="#fff" />
        <path d="M25 70 L40 50 L55 70 L70 45 L85 70 Z" fill="currentColor" opacity="0.15" />
        <circle cx="30" cy="30" r="1.5" fill="#fff" />
        <circle cx="70" cy="30" r="1" fill="#fff" />
        <circle cx="75" cy="40" r="1.5" fill="#fff" />
      </svg>
    )
  },
  {
    id: 'scout',
    name: 'Wilderness Scout',
    bgColor: 'from-emerald-950 to-stone-900',
    color: '#10b981',
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full text-emerald-400">
        <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M35 65 L45 45 L40 45 L48 33 L45 33 L50 24 L55 33 L52 33 L60 45 L55 45 L65 65 Z" fill="currentColor" />
        <rect x="48" y="65" width="4" height="8" fill="currentColor" opacity="0.8" />
        <path d="M42 75 L58 75 M46 72 L54 72" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M50 63 Q46 71 50 71 Q54 71 50 63 Z" fill="#f97316" />
        <path d="M50 66 Q48 71 50 71 Q52 71 50 66 Z" fill="#eab308" />
        <path d="M72 25 A 12 12 0 0 1 60 37 A 10 10 0 0 0 72 25" fill="#fef08a" />
      </svg>
    )
  },
  {
    id: 'sea',
    name: 'Deep Sea Navigator',
    bgColor: 'from-blue-950 to-indigo-950',
    color: '#0284c7',
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full text-sky-400">
        <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="50" cy="50" r="18" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="50" cy="50" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
        <line x1="50" y1="18" x2="50" y2="44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="50" y1="56" x2="50" y2="82" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="18" y1="50" x2="44" y2="50" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="56" y1="50" x2="82" y2="50" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="27" y1="27" x2="46" y2="46" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="54" y1="54" x2="73" y2="73" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="73" y1="27" x2="54" y2="46" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="46" y1="54" x2="27" y2="73" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M50 12 L50 22 M40 22 L60 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        <path d="M15 78 Q 25 73, 35 78 T 55 78 T 75 78 T 85 78" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'cosmic',
    name: 'Cosmic Wayfarer',
    bgColor: 'from-purple-950 to-black',
    color: '#a855f7',
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full text-purple-400">
        <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="50" cy="50" r="15" fill="currentColor" opacity="0.8" />
        <ellipse cx="50" cy="50" rx="32" ry="6" fill="none" stroke="currentColor" strokeWidth="4" transform="rotate(-15 50 50)" />
        <path d="M72 22 L62 32 L58 28 Z" fill="#ef4444" />
        <path d="M68 26 L55 39 C52 42, 48 44, 46 44 C46 42, 48 38, 51 35 L64 22 Z" fill="currentColor" />
        <circle cx="59" cy="31" r="1.5" fill="#1e293b" />
        <path d="M46 44 L41 49 L44 44 Z" fill="#f97316" />
        <circle cx="25" cy="30" r="1" fill="#fff" />
        <circle cx="35" cy="20" r="1.5" fill="#fff" />
        <circle cx="28" cy="65" r="1" fill="#fff" />
        <circle cx="70" cy="70" r="1.5" fill="#fff" stroke="currentColor" strokeWidth="0.5" />
      </svg>
    )
  },
  {
    id: 'aviator',
    name: 'Vintage Aviator',
    bgColor: 'from-amber-950 to-stone-900',
    color: '#d97706',
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full text-amber-500">
        <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M15 50 C25 40, 45 40, 50 50 C55 40, 75 40, 85 50" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M15 50 C25 45, 45 45, 50 50 C55 45, 75 45, 85 50" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <circle cx="33" cy="52" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="67" cy="52" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
        <line x1="43" x2="57" y1="52" y2="52" stroke="currentColor" strokeWidth="4" />
        <path d="M22 65 C32 75, 68 75, 78 65" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        <path d="M22 35 C32 25, 68 25, 78 35" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        <line x1="50" x2="50" y1="42" y2="58" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
        <circle cx="50" cy="50" r="3" fill="currentColor" />
      </svg>
    )
  }
];

const ExplorerMedalIcon = ({ level }: { level: number }) => {
  let ringColor = '#cd7f32';
  if (level >= 5) {
    ringColor = '#e5e7eb';
  } else if (level >= 3) {
    ringColor = '#fbbf24';
  } else if (level >= 2) {
    ringColor = '#94a3b8';
  }
  
  return (
    <div className="relative w-14 h-14 shrink-0 flex items-center justify-center select-none">
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
        <path d="M35 10 L50 35 L65 10 Z" fill="#ef4444" />
        <path d="M42 10 L50 35 L58 10 Z" fill="#ffffff" opacity="0.6" />
        
        <circle cx="50" cy="55" r="32" fill="url(#medalGrad)" stroke={ringColor} strokeWidth="3" />
        <circle cx="50" cy="55" r="27" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="3 2" opacity="0.5" />
        
        <polygon points="50,38 53,48 64,48 55,54 59,65 50,59 41,65 45,54 36,48 47,48" fill={ringColor} />
        
        <text x="50" y="76" textAnchor="middle" fontSize="12" fontWeight="900" fill={ringColor} fontFamily="sans-serif">
          Lvl {level}
        </text>

        <defs>
          <radialGradient id="medalGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#fafaf9" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#e7e5e4" stopOpacity="1" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
};

const PointsBadgeIcon = () => {
  return (
    <div className="relative w-14 h-14 shrink-0 flex items-center justify-center select-none">
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
        <path
          d="M50 15 L56 22 L65 20 L68 29 L77 30 L76 39 L83 43 L79 51 L83 60 L76 63 L77 72 L68 73 L65 82 L56 80 L50 87 L44 80 L35 82 L32 73 L23 72 L24 63 L17 60 L21 51 L17 43 L24 39 L23 30 L32 29 L35 20 L44 22 Z"
          fill="#ffffff"
        />
        <circle cx="50" cy="51" r="20" fill="#0178bc" />
        <text x="50" y="58" textAnchor="middle" fontSize="22" fontWeight="900" fill="#ffffff" fontFamily="sans-serif">
          P
        </text>
      </svg>
    </div>
  );
};

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
    gender: '',
    streakCount: 0,
    longestStreak: 0,
    lastActiveDate: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeView, setActiveView] = useState<'profile' | 'badges' | 'delete'>('profile');
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [copiedShare, setCopiedShare] = useState(false);
  
  // 1 Crore Badges & Quest states
  const [badgeTab, setBadgeTab] = useState<'standard' | 'almanac' | 'cosmic'>('standard');
  const [contributedCountries, setContributedCountries] = useState<string[]>([]);
  const [contributedStates, setContributedStates] = useState<string[]>([]);
  const [searchCountry, setSearchCountry] = useState('India');
  const [searchState, setSearchState] = useState('State Alpha');
  const [searchActivity, setSearchActivity] = useState('Wilderness Trailblazer');
  const [searchRank, setSearchRank] = useState('Aspirant (Lvl 1)');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [scanSuccess, setScanSuccess] = useState(false);
  const [scanSector, setScanSector] = useState('');
  const [scanAttempts, setScanAttempts] = useState(0);

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    // Safety verification check
    const requiredConfirmation = profile.username || user.email || 'DELETE';
    if (deleteConfirmationInput.trim() !== requiredConfirmation.trim()) {
      setDeleteError(`Please type "${requiredConfirmation}" exactly to confirm.`);
      return;
    }

    setIsDeleting(true);
    setDeleteError('');

    try {
      // 1. Delete user record from Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await deleteDoc(userDocRef);

      // 2. Delete user from Firebase Auth
      await deleteUser(user);
      
      // Close modal and the app will auto-redirect to login screen since user state changes to null
      onClose();
    } catch (error: any) {
      console.error("Account Deletion Error:", error);
      if (error.code === 'auth/requires-recent-login') {
        setDeleteError("For security, this action requires a recent sign-in. You will be signed out so you can log back in and delete your account.");
        setTimeout(async () => {
          await logout();
          onClose();
        }, 4500);
      } else {
        setDeleteError("Failed to delete account. Please try again or contact support.");
      }
    } finally {
      setIsDeleting(false);
    }
  };
  const [stats, setStats] = useState<{
    saved: number;
    planned: number;
    archived: number;
    contributed: number;
    isWorldChampion?: boolean;
  }>({
    saved: 0,
    planned: 0,
    archived: 0,
    contributed: 0,
    isWorldChampion: false
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
      
      const locationsData = results[3].docs.map(docSnap => docSnap.data());
      const countries = Array.from(new Set(locationsData.map(loc => loc.country).filter(Boolean))) as string[];
      const states = Array.from(new Set(locationsData.map(loc => loc.state).filter(Boolean))) as string[];
      setContributedCountries(countries);
      setContributedStates(states);

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};
      const hasWorldChampion = !!userData.isWorldChampion;
      setIsOwnerBypass(hasWorldChampion);

      setStats({
        saved: results[0].size,
        planned: results[1].size,
        archived: results[2].size,
        contributed: results[3].size,
        isWorldChampion: hasWorldChampion
      } as any);
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
        const data = docSnap.data() as UserProfile;
        setProfile({
          avatarId: 'compass',
          ...data
        });
      } else {
        // Pre-fill with user info if no profile exists
        const isAdminEmail = user.email === 'mukkuc41@gmail.com';
        setProfile(prev => ({
          ...prev,
          email: user.email || '',
          firstName: user.displayName?.split(' ')[0] || '',
          lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
          username: isAdminEmail ? '@Admin/owner-41@123' : '@' + (user.email?.split('@')[0] || 'user'),
          avatarId: 'compass',
          customAvatarUrl: ''
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
    const date = safelyConvertToDate(timestamp);
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

  const [isOwnerBypass, setIsOwnerBypass] = useState(false);

  const handleToggleWorldChampionDirectly = async (checked: boolean) => {
    if (!user) return;
    setIsOwnerBypass(checked);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        isWorldChampion: checked,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setStats(prev => ({ ...prev, isWorldChampion: checked } as any));
      setProfile(prev => ({ ...prev, isWorldChampion: checked }));
      
      if (checked) {
        setScanSuccess(true);
        setScanStatus("LEGENDARY EXPLORER COORDINATES RESOLVED VIA OWNER OVERRIDE!");
      } else {
        setScanSuccess(false);
        setScanStatus("Scanner state: Idle. World Champion status revoked via owner override.");
      }
    } catch (error) {
      console.error("Error toggling World Champion status:", error);
    }
  };

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
      }, (idx + 1) * 800);
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
          
          setStats(prev => ({ ...prev, isWorldChampion: true } as any));
          setProfile(prev => ({ ...prev, isWorldChampion: true }));
        } catch (error) {
          console.error("Error saving World Champion status:", error);
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
            <div className="overflow-y-auto max-h-[90vh]">
              <AnimatePresence mode="wait">
                {activeView === 'profile' && (
                  <motion.div
                    key="profile-view"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    {/* Explorer Royal-Blue Top Banner */}
                    <div className="bg-gradient-to-b from-[#1b3c5f] to-[#11263d] pt-8 pb-10 px-6 relative flex flex-col items-center">
                      {/* Header Row */}
                      <div className="w-full flex items-center justify-between text-white mb-6">
                        <button 
                          type="button"
                          onClick={onClose}
                          className="p-2 hover:bg-white/10 rounded-full transition-colors"
                          title="Close Modal"
                        >
                          <ChevronDown className="w-6 h-6 rotate-90" />
                        </button>
                        
                        <h3 className="text-xl font-sans font-bold tracking-tight">Profile</h3>
                        
                        <button 
                          type="button"
                          onClick={async () => {
                            await Promise.all([fetchStats(), fetchRecentActivity(), fetchProfile()]);
                          }}
                          className="p-2 hover:bg-white/10 rounded-full transition-colors active:rotate-180 duration-500"
                          title="Refresh Data"
                        >
                          <RefreshCw className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Large Circular Avatar */}
                      <div className="relative group mb-4">
                        <div className="w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden border-4 border-teal-400 shadow-2xl relative bg-slate-900 flex items-center justify-center">
                          {profile.customAvatarUrl ? (
                            <img 
                              src={profile.customAvatarUrl} 
                              alt="Profile Avatar" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : user?.photoURL && !profile.avatarId ? (
                            <img 
                              src={user.photoURL} 
                              alt="Profile Avatar" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                             <div className="w-full h-full p-4 flex items-center justify-center">
                               {EXPLORER_EMBLEMS.find(e => e.id === (profile.avatarId || 'compass'))?.icon || EXPLORER_EMBLEMS[0].icon}
                             </div>
                          )}
                        </div>
                        
                        {/* Camera button overlay */}
                        <button
                          type="button"
                          onClick={() => setShowAvatarSelector(!showAvatarSelector)}
                          className="absolute bottom-1 right-1 bg-white hover:bg-teal-50 text-slate-800 p-2.5 rounded-full shadow-lg border border-slate-200 hover:scale-110 active:scale-95 transition-all"
                          title="Choose Emblem"
                        >
                          <Camera className="w-4 h-4 text-slate-700" />
                        </button>
                      </div>

                      {/* Username / display name */}
                      <h4 className="text-xl font-bold text-white tracking-tight mt-1 text-center">
                        {profile.firstName ? `${profile.firstName} ${profile.lastName || ''}` : (user?.displayName || 'Adventurer')}
                      </h4>
                      <p className="text-[10px] uppercase font-black tracking-[0.2em] text-teal-400/80 mt-1">
                        {profile.username || '@explorer'}
                      </p>
                    </div>

                    {/* Avatar Selector Panel */}
                    <AnimatePresence>
                      {showAvatarSelector && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-slate-50 border-b border-slate-200/60 overflow-hidden"
                        >
                          <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black uppercase tracking-widest text-[#141414]/60">Choose Explorer Emblem</span>
                              <button 
                                type="button" 
                                onClick={() => setShowAvatarSelector(false)}
                                className="text-xs font-bold text-teal-600 hover:text-teal-800"
                              >
                                Done
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-5 gap-3">
                              {EXPLORER_EMBLEMS.map(emblem => {
                                const isSelected = profile.avatarId === emblem.id && !profile.customAvatarUrl;
                                return (
                                  <button
                                    key={emblem.id}
                                    type="button"
                                    onClick={() => setProfile({ ...profile, avatarId: emblem.id, customAvatarUrl: '' })}
                                    className={`p-2 rounded-2xl border-2 transition-all flex flex-col items-center justify-center bg-slate-900/5 hover:bg-slate-900/10 ${
                                      isSelected ? 'border-teal-500 scale-105 shadow-md bg-white' : 'border-transparent'
                                    }`}
                                    title={emblem.name}
                                  >
                                    <div className="w-10 h-10 flex items-center justify-center">
                                      {emblem.icon}
                                    </div>
                                    <span className="text-[8px] font-bold text-[#141414]/60 mt-1 text-center truncate w-full">
                                      {emblem.name.split(' ')[1] || emblem.name}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>

                            <div className="space-y-2 pt-2 border-t border-slate-200/50">
                              <label className="block text-[10px] font-bold text-[#141414]/50 uppercase tracking-widest">
                                Or paste a custom image URL (e.g. JPG, PNG)
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={customUrlInput}
                                  onChange={e => setCustomUrlInput(e.target.value)}
                                  placeholder="https://example.com/avatar.jpg"
                                  className="flex-1 bg-white border border-[#141414]/15 px-3 py-2 rounded-xl text-xs outline-none focus:border-teal-500 font-mono"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (customUrlInput.trim()) {
                                      setProfile({ ...profile, customAvatarUrl: customUrlInput.trim(), avatarId: '' });
                                      setShowAvatarSelector(false);
                                    }
                                  }}
                                  className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                                >
                                  Apply
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Cyan-to-Blue Split Level & Points Banner */}
                    {(() => {
                      const calculatedLevel = 5;
                      const calculatedPoints = 5600;
                      
                      let levelTitle = "Ranger";

                      const handleShare = () => {
                        const shareText = `Check out my Explorer profile! I am a Level ${calculatedLevel} ${levelTitle} with ${calculatedPoints} points! 🌍✨`;
                        navigator.clipboard.writeText(shareText);
                        setCopiedShare(true);
                        setTimeout(() => setCopiedShare(false), 2500);
                      };

                      return (
                        <div className="relative w-full bg-gradient-to-r from-[#00af87] via-[#009b91] to-[#0178bc] py-4 px-6 md:px-10 flex items-center justify-between text-white select-none">
                          {/* Arrow pointing up in the exact center */}
                          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-[#009b91] rotate-45" />

                          {/* Left half: Level details */}
                          <div className="flex items-center gap-3 flex-1 justify-center border-r border-white/20 pr-4">
                            <ExplorerMedalIcon level={calculatedLevel} />
                            <div className="text-left">
                              <div className="text-[10px] uppercase font-black tracking-widest text-white/60">Level {calculatedLevel}</div>
                              <div className="text-base font-black tracking-tight mt-0.5">{levelTitle}</div>
                            </div>
                          </div>

                          {/* Right half: Points details */}
                          <div className="flex items-center gap-3 flex-1 justify-center pl-4 relative pr-8">
                            <PointsBadgeIcon />
                            <div className="text-left">
                              <div className="text-lg font-black tracking-tighter text-white">{calculatedPoints.toLocaleString()}</div>
                              <div className="text-[10px] uppercase font-black tracking-widest text-white/60">Points</div>
                            </div>

                            {/* Share button */}
                            <button
                              type="button"
                              onClick={handleShare}
                              className="absolute right-0 hover:bg-white/10 p-2.5 rounded-full transition-all active:scale-95 text-white/90 hover:text-white"
                              title="Share stats"
                            >
                              {copiedShare ? (
                                <Check className="w-5 h-5 text-emerald-300 animate-bounce" />
                              ) : (
                                <Share2 className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Main Padded Content */}
                    <div className="p-8 md:p-12 space-y-10 bg-white">
                      {/* Owner indicator / last login inside the padded section */}
                      <div className="flex flex-wrap items-center justify-between gap-2 opacity-60">
                         <span className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/50">
                           Last Login: {formatDate(profile.lastLogin)}
                         </span>
                         {user?.email === 'mukkuc41@gmail.com' && (
                            <span className="px-2 py-0.5 bg-[#141414] text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-md">Site Owner</span>
                         )}
                      </div>

                      {/* Daily Explorer Streak Tracker Widget */}
                      <div className="bg-[#141414] text-white p-6 rounded-[32px] relative overflow-hidden shadow-xl select-none">
                        {/* Decorative Fire Flame Background Glow */}
                        <div className="absolute right-0 bottom-0 w-32 h-32 bg-gradient-to-tr from-amber-600/20 to-red-600/20 rounded-full blur-2xl pointer-events-none" />
                        
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-red-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-orange-950/20">
                              🔥
                            </div>
                            <div>
                              <h3 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                                Daily Explorer Streak
                                {profile.lastActiveDate === new Date().toLocaleDateString('en-CA') && (
                                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full">
                                    Completed Today
                                  </span>
                                )}
                              </h3>
                              <p className="text-[11px] text-white/60 mt-1 max-w-sm leading-relaxed">
                                Open the app and view any location's details daily to grow your streak and earn <strong className="text-amber-400 font-bold">+50 XP</strong> daily!
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-6 border-t md:border-t-0 border-white/10 pt-4 md:pt-0 w-full md:w-auto">
                            <div className="flex-1 md:flex-none text-center md:text-right">
                              <div className="text-3xl font-black tracking-tighter text-amber-400">
                                {profile.streakCount || 0}
                              </div>
                              <div className="text-[8px] uppercase font-black tracking-widest text-white/40 mt-1">Current Streak</div>
                            </div>
                            <div className="w-px bg-white/10 self-stretch" />
                            <div className="flex-1 md:flex-none text-center md:text-right">
                              <div className="text-3xl font-black tracking-tighter text-white/95">
                                {profile.longestStreak || 0}
                              </div>
                              <div className="text-[8px] uppercase font-black tracking-widest text-white/40 mt-1">Longest Streak</div>
                            </div>
                          </div>
                        </div>
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
                                      <Clock className="w-3 h-3" /> {safelyConvertToDate(loc.createdAt).toLocaleDateString()}
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
                      onClick={() => setActiveView('badges')}
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

                        {/* Danger Zone */}
                        <div className="mt-8 pt-8 border-t border-red-100 space-y-4">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-red-50/50 p-5 rounded-3xl border border-red-100">
                            <div>
                              <h4 className="text-xs font-bold text-red-600 uppercase tracking-widest">Danger Zone</h4>
                              <p className="text-[10px] text-[#141414]/50 mt-1">Permanently remove your account and all associated data.</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setActiveView('delete')}
                              className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm self-start md:self-auto"
                            >
                              Delete Account
                            </button>
                          </div>
                        </div>
                      </form>
                    )}
                    </div>
                  </motion.div>
                )}

                {activeView === 'badges' && (
                  <motion.div
                    key="badges-submenu"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-8 md:p-12 space-y-6"
                  >
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-4">
                      <button 
                        type="button"
                        onClick={() => setActiveView('profile')}
                        className="p-3 hover:bg-[#f5f5f0] rounded-full transition-colors rotate-90"
                      >
                        <ChevronDown className="w-6 h-6" />
                      </button>
                      <div>
                        <h2 className="text-3xl font-sans font-bold tracking-tight text-[#141414]">My Badges</h2>
                        <p className="text-xs uppercase tracking-widest font-black opacity-30 mt-1">Universal Explorer Registry</p>
                      </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex bg-[#141414]/5 p-1.5 rounded-[24px] gap-1 select-none border border-[#141414]/5">
                      <button
                        type="button"
                        onClick={() => setBadgeTab('standard')}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider rounded-[18px] transition-all ${
                          badgeTab === 'standard' 
                            ? 'bg-white text-[#141414] shadow-sm border border-[#141414]/5' 
                            : 'text-[#141414]/60 hover:text-[#141414] hover:bg-white/40'
                        }`}
                      >
                        Top 4 Registry
                      </button>
                      <button
                        type="button"
                        onClick={() => setBadgeTab('almanac')}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider rounded-[18px] transition-all ${
                          badgeTab === 'almanac' 
                            ? 'bg-white text-[#141414] shadow-sm border border-[#141414]/5' 
                            : 'text-[#141414]/60 hover:text-[#141414] hover:bg-white/40'
                        }`}
                      >
                        1 Crore Classic Medals
                      </button>
                      <button
                        type="button"
                        onClick={() => setBadgeTab('cosmic')}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider rounded-[18px] transition-all ${
                          badgeTab === 'cosmic' 
                            ? 'bg-white text-[#141414] shadow-sm border border-[#141414]/5' 
                            : 'text-[#141414]/60 hover:text-[#141414] hover:bg-white/40'
                        }`}
                      >
                        Champion Hold (0.001%)
                      </button>
                    </div>

                    {/* Tab content 1: Standard / Top 4 Registry Shelf + General Milestones */}
                    {badgeTab === 'standard' && (() => {
                      const top4Ids = ['diamond_explorer', 'gold_explorer', 'silver_explorer', 'bronze_explorer'];
                      const orderedTop4 = [
                        TRAVEL_BADGES.find(b => b.id === 'diamond_explorer'),
                        TRAVEL_BADGES.find(b => b.id === 'gold_explorer'),
                        TRAVEL_BADGES.find(b => b.id === 'silver_explorer'),
                        TRAVEL_BADGES.find(b => b.id === 'bronze_explorer')
                      ].filter(Boolean);
                      
                      const otherBadges = TRAVEL_BADGES.filter(
                        b => !top4Ids.includes(b.id) && b.id !== 'world_champion_explorer'
                      );

                      return (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-6"
                        >
                          {/* Top 4 Registry Showcase */}
                          <div className="space-y-3">
                            <h4 className="text-[10px] uppercase font-black tracking-[0.25em] text-[#141414]/40 ml-2">
                              🏆 Top 4 Registry Badges
                            </h4>
                            <div className="grid grid-cols-2 gap-3.5">
                              {orderedTop4.map((badge: any, index: number) => {
                                const isUnlocked = badge.requirement(stats);
                                const rankWords = ["1ST PLACE", "2ND PLACE", "3RD PLACE", "4TH PLACE"];
                                const tierStyles = [
                                  // Diamond
                                  "bg-gradient-to-br from-slate-900 to-[#0e273c] border-cyan-500/30 text-white shadow-cyan-950/10",
                                  // Gold
                                  "bg-gradient-to-br from-[#201509] to-slate-950 border-amber-500/20 text-white shadow-amber-950/10",
                                  // Silver
                                  "bg-gradient-to-br from-[#121929] to-slate-950 border-slate-400/20 text-white shadow-slate-950/10",
                                  // Bronze
                                  "bg-gradient-to-br from-[#180d07] to-slate-950 border-orange-800/20 text-white shadow-orange-950/10"
                                ];

                                return (
                                  <motion.div
                                    key={badge.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`relative p-5 rounded-[28px] border transition-all duration-300 flex flex-col justify-between aspect-square select-none overflow-hidden ${
                                      isUnlocked 
                                        ? `${tierStyles[index]} shadow-md scale-[1.01]` 
                                        : 'bg-[#141414]/5 opacity-40 border-[#141414]/10 text-[#141414]'
                                    }`}
                                  >
                                    {/* Glossy shine overlay for unlocked medals */}
                                    {isUnlocked && (
                                      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 rotate-12 -translate-y-full group-hover:translate-y-full transition-all duration-1000" />
                                    )}

                                    <div className="flex justify-between items-start">
                                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg ${
                                        isUnlocked ? 'bg-white/10' : 'bg-[#141414]/10'
                                      }`}>
                                        {badge.icon}
                                      </div>
                                      <span className={`text-[8px] font-black tracking-widest uppercase px-2.5 py-1 rounded-md ${
                                        isUnlocked ? 'bg-white/10 text-white/90' : 'bg-[#141414]/10 text-[#141414]/50'
                                      }`}>
                                        {rankWords[index]}
                                      </span>
                                    </div>

                                    <div className="mt-4">
                                      <h5 className="text-xs font-bold tracking-tight truncate">
                                        {badge.name}
                                      </h5>
                                      <p className={`text-[9px] mt-1 leading-snug line-clamp-2 ${
                                        isUnlocked ? 'opacity-80' : 'opacity-60'
                                      }`}>
                                        {isUnlocked ? badge.description : `Requirement: ${badge.hint}`}
                                      </p>
                                    </div>

                                    {!isUnlocked && (
                                      <div className="absolute right-4 bottom-4">
                                        <Lock className="w-3 h-3 opacity-30" />
                                      </div>
                                    )}
                                  </motion.div>
                                );
                              })}
                            </div>
                          </div>

                          {/* General Milestone Badges */}
                          <div className="space-y-4">
                            <h4 className="text-[10px] uppercase font-black tracking-[0.25em] opacity-30 ml-2">
                              🏅 Milestone Registry
                            </h4>
                            <div className="grid grid-cols-2 gap-3 max-h-[180px] overflow-y-auto pr-1 pb-2">
                               {otherBadges.map((badge) => {
                                 const isUnlocked = badge.requirement(stats);
                                 return (
                                   <motion.div 
                                     key={badge.id}
                                     initial={{ opacity: 0, y: 10 }}
                                     animate={{ opacity: 1, y: 0 }}
                                     className={`relative group flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                                       isUnlocked 
                                         ? 'bg-white border-[#141414]/10 shadow-sm' 
                                         : 'bg-[#141414]/5 opacity-45'
                                     }`}
                                   >
                                      <div 
                                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md" 
                                        style={{ backgroundColor: badge.color }}
                                      >
                                         {badge.icon}
                                      </div>
                                      <div className="min-w-0 pr-2">
                                         <div className="text-[11px] font-bold truncate">{isUnlocked ? badge.name : 'Locked Medal'}</div>
                                         <div className="text-[9px] opacity-50 truncate leading-none mt-1">
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
                      );
                    })()}


                    {/* Tab content 2: 1 Crore Procedural Registry */}
                    {badgeTab === 'almanac' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                      >
                        <div className="bg-[#141414]/5 border border-[#141414]/10 p-5 rounded-[28px] space-y-4">
                          <div>
                            <h3 className="text-sm font-bold text-[#141414]">Universal Procedural Engine</h3>
                            <p className="text-xs text-[#141414]/60 mt-1 leading-relaxed">
                              Every distinct coordinate, territory, and activity style combination produces a dynamically unique explorer achievement. There are exactly <strong className="text-[#141414]">10,000,000 (1 Crore)</strong> potential classic medals dynamically logged in the system!
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
                                Example: <strong className="text-[#141414]">India Metropolis Sector Scenic Spotter Voyager (Lvl 4)</strong>
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
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[8px] font-black uppercase tracking-widest text-[#141414]/40 mb-1 ml-1">Country Domain</label>
                            <select
                              value={searchCountry}
                              onChange={e => setSearchCountry(e.target.value)}
                              className="w-full bg-[#fdfdfc] border border-[#141414]/10 focus:border-teal-500 p-3 rounded-xl text-xs outline-none transition-all"
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
                              className="w-full bg-[#fdfdfc] border border-[#141414]/10 focus:border-teal-500 p-3 rounded-xl text-xs outline-none transition-all"
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
                              className="w-full bg-[#fdfdfc] border border-[#141414]/10 focus:border-teal-500 p-3 rounded-xl text-xs outline-none transition-all"
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
                              className="w-full bg-[#fdfdfc] border border-[#141414]/10 focus:border-teal-500 p-3 rounded-xl text-xs outline-none transition-all"
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
                            <div className={`relative border p-6 rounded-[32px] text-center select-none transition-all duration-300 ${
                              isUnlocked 
                                ? 'bg-gradient-to-br from-teal-900 to-slate-900 text-white border-teal-500/30 shadow-lg scale-[1.02]' 
                                : 'bg-slate-50 text-[#141414]/60 border-[#141414]/10'
                            }`}>
                              <div className="absolute top-4 right-4 text-[8px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded bg-[#141414]/10 border border-[#141414]/5">
                                Dynamic ID: #{Math.abs(searchCountry.charCodeAt(0) * searchState.charCodeAt(0) * searchActivity.charCodeAt(0) * 11).toString().slice(0, 6)}
                              </div>

                              <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-3 bg-white/10 text-white shadow-md">
                                <Compass className={`w-7 h-7 ${isUnlocked ? 'animate-spin [animation-duration:10s]' : 'opacity-40'}`} />
                              </div>

                              <h4 className="text-base font-bold tracking-tight text-white mb-1">
                                {isUnlocked ? `${searchCountry} ${searchActivity}` : '🔒 Procedural Sector Locked'}
                              </h4>
                              
                              <p className="text-[10px] uppercase font-black tracking-widest text-teal-400">
                                {searchState} • {searchRank}
                              </p>

                              <p className="text-xs mt-3 opacity-80 leading-normal max-w-md mx-auto">
                                {isUnlocked 
                                  ? `Sector Complete! You have explored and marked locations within ${searchCountry}.`
                                  : `To unlock this sector badge, add a discovery location within ${searchCountry}.`
                                }
                              </p>

                              {isUnlocked && (
                                <div className="mt-4 inline-flex items-center gap-1.5 bg-teal-400/20 text-teal-300 text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full border border-teal-400/30">
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
                                <span>1 Crore Unlocked Registry</span>
                                <span className="font-mono text-[#141414] font-bold">{unlockedProcedural.toLocaleString()} / 10,000,000</span>
                              </div>
                              <div className="w-full bg-[#141414]/5 rounded-full h-2.5 overflow-hidden border border-[#141414]/5">
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

                    {/* Tab content 3: Cosmic Coordinate Scanner */}
                    {badgeTab === 'cosmic' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                      >
                        <div className="bg-slate-900 text-white p-6 rounded-[36px] border border-slate-800 relative overflow-hidden shadow-xl text-center flex flex-col items-center">
                          {/* Absolute glowing mesh behind */}
                          <div className="absolute inset-0 bg-gradient-to-b from-teal-500/10 to-transparent pointer-events-none" />

                          <div className="relative w-28 h-28 flex items-center justify-center mb-4">
                            {/* Radar circular lines */}
                            <div className="absolute inset-0 rounded-full border border-teal-500/20 animate-ping [animation-duration:3s]" />
                            <div className="absolute inset-2 rounded-full border border-teal-500/30" />
                            <div className="absolute inset-6 rounded-full border border-teal-500/40" />
                            
                            {/* Rotating radar hand */}
                            {isScanning && (
                              <div className="absolute inset-0 rounded-full border-r-2 border-teal-400 animate-spin" />
                            )}

                            <Compass className={`w-12 h-12 text-teal-400 ${isScanning ? 'animate-spin' : ''}`} />
                          </div>

                          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-teal-400 bg-teal-950/80 px-3.5 py-1.5 rounded-full border border-teal-500/20 shadow-inner">
                            Cosmic Coordinate Scanner
                          </span>

                          {/* Live Hold Status indicator */}
                          <div className={`mt-3 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border transition-all duration-300 ${
                            stats.isWorldChampion 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                              : 'bg-slate-950/50 text-slate-400 border-slate-800'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${stats.isWorldChampion ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                            Hold Status: {stats.isWorldChampion ? 'HOLDING ACHIEVEMENT' : 'NOT HELD'}
                          </div>

                          <h3 className="text-xl font-bold tracking-tight text-white mt-3">
                            Search Legendary Coordinates
                          </h3>

                          <p className="text-xs text-slate-400 mt-2 leading-relaxed max-w-sm">
                            Scanning utilizes orbital telemetry to pinpoint the legendary coordinates of the <strong className="text-white">World Champion Explorer</strong> badge. Probability is locked at exactly <span className="text-teal-300 font-mono font-bold">0.001%</span> per sweep.
                          </p>

                          {/* Scanner Output Logs */}
                          <div className="w-full bg-slate-950/80 rounded-2xl p-4 mt-4 border border-slate-800/80 font-mono text-[10px] text-left text-teal-400/90 leading-normal min-h-[50px] flex items-center justify-center">
                            {isScanning ? (
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse shrink-0" />
                                <span>{scanStatus}</span>
                              </div>
                            ) : scanStatus ? (
                              <span className={scanSuccess ? "text-emerald-400 font-bold" : "text-slate-400"}>
                                {scanStatus}
                              </span>
                            ) : (
                              <span className="text-slate-500">Scanner state: Idle. Waiting for orbital telemetry...</span>
                            )}
                          </div>

                          {/* Trigger scan button */}
                          <button
                            type="button"
                            onClick={handleCosmicScan}
                            disabled={isScanning}
                            className={`w-full mt-5 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                              isScanning 
                                ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
                                : 'bg-teal-500 hover:bg-teal-400 text-slate-950 font-black shadow-lg shadow-teal-500/20 active:scale-[0.98]'
                            }`}
                          >
                            {isScanning ? 'Orbit Tracking Active...' : 'Initiate Cosmic Scan'}
                          </button>

                          {/* Stats counter */}
                          <div className="flex gap-4 mt-4 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                            <span>Scans: {scanAttempts}</span>
                            <span>Gain: {isOwnerBypass ? '100,000x' : '1x'}</span>
                          </div>

                          {/* Site Owner Overdrive Control Panel */}
                          {user?.email === 'mukkuc41@gmail.com' && (
                            <div className="mt-5 pt-4 border-t border-slate-800/80 w-full flex items-center justify-between">
                              <div className="text-left">
                                <div className="text-[9px] font-black uppercase tracking-widest text-teal-400">Site Owner Override</div>
                                <div className="text-[8px] text-slate-500">Toggle to instantly grant/revoke the World Champion Explorer badge</div>
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

                        {/* Celebratory World Champion Success Banner */}
                        {stats.isWorldChampion && (
                          <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 p-5 rounded-[28px] border border-yellow-300 shadow-xl flex items-center gap-4 relative overflow-hidden"
                          >
                            <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-20 pointer-events-none">
                              <Trophy className="w-24 h-24 rotate-12" />
                            </div>
                            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                              <Trophy className="w-6 h-6 text-white animate-bounce" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-black uppercase tracking-wider">Legendary Coordinates Plotted!</h4>
                              <p className="text-xs font-bold leading-tight mt-1 text-slate-900">
                                You hold the absolute legendary World Champion Explorer title. Earned by less than 0.001% of worldwide seekers.
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {activeView === 'delete' && (
                  <motion.div
                    key="delete-confirm-view"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-8 md:p-12 space-y-8"
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <button 
                        type="button"
                        onClick={() => {
                          setActiveView('profile');
                          setDeleteConfirmationInput('');
                          setDeleteError('');
                        }}
                        className="p-3 hover:bg-[#f5f5f0] rounded-full transition-colors rotate-90 text-[#141414]/70 hover:text-[#141414]"
                      >
                        <ChevronDown className="w-6 h-6" />
                      </button>
                      <div>
                        <h2 className="text-3xl font-sans font-bold tracking-tight text-red-600">Delete Account</h2>
                        <p className="text-xs uppercase tracking-widest font-black text-red-500 mt-1">Irreversible Operation</p>
                      </div>
                    </div>

                    <div className="bg-red-50 border border-red-200/50 rounded-3xl p-6 space-y-4">
                      <div className="flex gap-3 text-red-800">
                        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
                        <div className="text-xs leading-relaxed">
                          <strong className="block mb-1 text-red-900">Are you absolutely sure?</strong>
                          Deleting your account is final. You will lose access to all your registered spots, tour milestones, travel stats, and level badges. Other explorers will no longer see your name associated with saved routes.
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="block text-xs font-bold text-[#141414]/55 uppercase tracking-widest px-1">
                        To confirm, type <span className="font-mono text-red-600 font-black">{profile.username || user?.email || 'DELETE'}</span> below:
                      </label>
                      <input
                        type="text"
                        value={deleteConfirmationInput}
                        onChange={e => setDeleteConfirmationInput(e.target.value)}
                        className="w-full bg-[#fdfdfc] border border-red-200 focus:border-red-600 px-5 py-4 rounded-2xl text-base outline-none transition-all placeholder:text-[#141414]/20 font-medium font-mono"
                        placeholder={profile.username || user?.email || 'DELETE'}
                      />
                    </div>

                    {deleteError && (
                      <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs font-medium leading-relaxed flex gap-2">
                        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>{deleteError}</span>
                      </div>
                    )}

                    <div className="pt-4 space-y-3">
                      <button
                        type="button"
                        disabled={isDeleting || deleteConfirmationInput.trim() !== (profile.username || user?.email || 'DELETE').trim()}
                        onClick={handleDeleteAccount}
                        className="w-full py-4 rounded-[24px] bg-red-600 text-white font-bold text-base uppercase tracking-widest hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:pointer-events-none"
                      >
                        {isDeleting ? (
                          <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="w-5 h-5" />
                            Permanently Delete My Account
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => {
                          setActiveView('profile');
                          setDeleteConfirmationInput('');
                          setDeleteError('');
                        }}
                        className="w-full py-4 rounded-[24px] border border-[#141414]/10 text-[#141414]/60 font-bold text-base uppercase tracking-widest hover:bg-[#f5f5f0] transition-all flex items-center justify-center"
                      >
                        Cancel
                      </button>
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
