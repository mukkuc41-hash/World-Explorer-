/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInWithGoogle, logout, signInAsGuest } from './lib/firebase.ts';
import { safelyConvertToDate } from './lib/dateUtils.ts';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Plus, Compass, LogOut, ChevronLeft, Search, Map as MapIcon, LayoutGrid, Menu, X, ChevronRight, Globe, Share2, Link, Heart, Calendar, Bookmark, Trash2, Bot, Sparkles, Trophy, Gamepad2, Wifi, Battery, Signal, BellRing, Mail } from 'lucide-react';
import { Laptop, Smartphone, BatteryCharging, WifiOff, Volume2, Bluetooth, HelpCircle, Activity, HardDrive, Monitor, ShieldAlert } from 'lucide-react';
import Header, { ExplorerNotification } from './components/Header.tsx';
import SidebarNav from './components/SidebarNav.tsx';
import LocationList from './components/LocationList.tsx';
import StateSelector from './components/StateSelector.tsx';
import AddLocationModal from './components/AddLocationModal.tsx';
import WorldView from './components/WorldView.tsx';
import GoogleMapsSplash from './components/GoogleMapsSplash.tsx';
import SplashLoader from './components/SplashLoader.tsx';
import DiscoveryHero from './components/DiscoveryHero.tsx';
import PlaceDetailsModal from './components/PlaceDetailsModal.tsx';
import InteractiveBackground from './components/InteractiveBackground.tsx';
import UserProfileModal from './components/UserProfileModal.tsx';
import LeaderboardModal from './components/LeaderboardModal.tsx';
import AppGuideModal from './components/AppGuideModal.tsx';
import BadgesOverlay from './components/BadgesOverlay.tsx';
import TermsModal from './components/TermsModal.tsx';
import LocationHintButton from './components/LocationHintButton.tsx';
import GlobalRotatingEarth from './components/GlobalRotatingEarth.tsx';
import EarthSpeedSlider from './components/EarthSpeedSlider.tsx';
import WorldExplorerAI from './components/WorldExplorerAI.tsx';
import AddLocationAI from './components/AddLocationAI.tsx';
import AmbientSoundtrack from './components/AmbientSoundtrack.tsx';
import PermissionsManager from './components/PermissionsManager.tsx';
import { db, handleFirestoreError, OperationType } from './lib/firebase.ts';
import { collection, query, where, getDocs, onSnapshot, doc, setDoc, serverTimestamp, orderBy, increment } from 'firebase/firestore';
import { LogIn } from 'lucide-react';
import OtpVerification from './components/OtpVerification.tsx';
import ExplorerDashboard from './components/ExplorerDashboard.tsx';
import GmailTravelHub from './components/GmailTravelHub.tsx';
import GameHub from './components/GameHub.tsx';

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBadgesOpen, setIsBadgesOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isAddAIOpen, setIsAddAIOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    saved: 0,
    planned: 0,
    archived: 0,
    contributed: 0,
    isWorldChampion: false
  });
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showTourOnly, setShowTourOnly] = useState(false);
  const [showArchiveOnly, setShowArchiveOnly] = useState(false);
  const [showTrashOnly, setShowTrashOnly] = useState(false);
  const [showUserWorldOnly, setShowUserWorldOnly] = useState(false);
  const [showDualDashboard, setShowDualDashboard] = useState(false);
  const [showGmailHub, setShowGmailHub] = useState(false);
  const [showGameHub, setShowGameHub] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const [selectedLocationData, setSelectedLocationData] = useState<any | null>(null);
  const [placeDetails, setPlaceDetails] = useState<{ description: string; imageUrl: string } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [isTermsAccepted, setIsTermsAccepted] = useState(false);
  const [isGuideSeen, setIsGuideSeen] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(() => {
    return sessionStorage.getItem('world_explorer_otp_verified') === 'true';
  });
  const [flowStep, setFlowStep] = useState<'splash' | 'login' | 'otp' | 'terms' | 'guide' | 'app'>('splash');
  const [currentTime, setCurrentTime] = useState('');
  const [backgroundEarthSpeed, setBackgroundEarthSpeed] = useState(1.0);
  const [deviceType, setDeviceType] = useState<'auto' | 'ios' | 'android' | 'macos' | 'windows' | 'hybrid'>('auto');
  const [resolvedDevice, setResolvedDevice] = useState<'ios' | 'android' | 'macos' | 'windows' | 'hybrid'>('hybrid');
  const [realBatteryLevel, setRealBatteryLevel] = useState<number>(98);
  const [realIsCharging, setRealIsCharging] = useState<boolean>(false);
  const [realIsOnline, setRealIsOnline] = useState<boolean>(navigator.onLine);
  const [realConnectionType, setRealConnectionType] = useState<string>('WiFi');
  const [showDeviceDropdown, setShowDeviceDropdown] = useState<boolean>(false);

  // Dynamic Device Detection
  useEffect(() => {
    if (deviceType !== 'auto') {
      setResolvedDevice(deviceType);
      return;
    }

    const ua = navigator.userAgent;
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
    if (/iPhone|iPad|iPod/i.test(ua)) {
      setResolvedDevice('ios');
    } else if (/Android/i.test(ua)) {
      setResolvedDevice('android');
    } else if (/Macintosh|MacIntel|MacPPC|Mac68K/i.test(ua)) {
      setResolvedDevice('macos');
    } else if (/Windows/i.test(ua)) {
      setResolvedDevice('windows');
    } else if (isMobile) {
      setResolvedDevice('android');
    } else {
      setResolvedDevice('hybrid');
    }
  }, [deviceType]);

  // Real-time Clock (highly responsive & supports different formats)
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      let timeStr = '';
      if (resolvedDevice === 'ios') {
        timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: false });
      } else if (resolvedDevice === 'macos') {
        const dayStr = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
        const tStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
        timeStr = `${dayStr} ${tStr}`;
      } else if (resolvedDevice === 'windows') {
        timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      }
      setCurrentTime(timeStr);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [resolvedDevice]);

  // Hardware integration (Battery, Network Status, Cellular speed)
  useEffect(() => {
    let batteryObj: any = null;
    let onLevelChange: (() => void) | null = null;
    let onChargingChange: (() => void) | null = null;

    // Battery Status API
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        batteryObj = battery;
        setRealBatteryLevel(Math.round(battery.level * 100));
        setRealIsCharging(battery.charging);

        onLevelChange = () => setRealBatteryLevel(Math.round(battery.level * 100));
        onChargingChange = () => setRealIsCharging(battery.charging);

        battery.addEventListener('levelchange', onLevelChange);
        battery.addEventListener('chargingchange', onChargingChange);
      }).catch((e: any) => console.warn("Battery API unavailable or blocked:", e));
    }

    // Online/Offline status
    const onOnline = () => setRealIsOnline(true);
    const onOffline = () => setRealIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // Connection type (LTE, WiFi, etc.)
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    let updateConn: (() => void) | null = null;
    if (conn) {
      updateConn = () => {
        if (conn.effectiveType) {
          setRealConnectionType(conn.effectiveType.toUpperCase());
        }
      };
      updateConn();
      conn.addEventListener('change', updateConn);
    }

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      if (conn && updateConn) {
        conn.removeEventListener('change', updateConn);
      }
      if (batteryObj) {
        if (onLevelChange) batteryObj.removeEventListener('levelchange', onLevelChange);
        if (onChargingChange) batteryObj.removeEventListener('chargingchange', onChargingChange);
      }
    };
  }, []);

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

    // Sync world champion status in real-time
    const userRef = doc(db, 'users', user.uid);
    const userUnsub = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStats(prev => ({
          ...prev,
          isWorldChampion: !!data?.isWorldChampion
        }));
      }
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
      userUnsub();
    };
  }, [user]);

  // Real-time notifications listener for new locations added by other explorers
  const [notifications, setNotifications] = useState<ExplorerNotification[]>([]);
  const [activeToast, setActiveToast] = useState<ExplorerNotification | null>(null);
  const [shareToast, setShareToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

  // Play beautiful, premium synthetic chime when an update arrives
  const playNotificationChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc1.type = 'sine';
      osc2.type = 'sine';
      
      // Multi-harmonic perfect chord (C5 followed rapidly by E5 and high G5)
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12); // E5
      osc1.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.24); // C6
      
      osc2.frequency.setValueAtTime(392.00, ctx.currentTime); // G4
      osc2.frequency.setValueAtTime(523.25, ctx.currentTime + 0.12); // C5
      osc2.frequency.setValueAtTime(783.99, ctx.currentTime + 0.24); // G5
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.06);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.75);
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc1.start();
      osc2.start();
      
      osc1.stop(ctx.currentTime + 0.85);
      osc2.stop(ctx.currentTime + 0.85);
    } catch (e) {
      console.warn("Audio chime play error:", e);
    }
  };

  // Securely request browser Push Notification permissions on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        Notification.requestPermission();
      } catch (err) {
        console.warn("HTML5 Notification request blocked in current sandbox:", err);
      }
    }
  }, []);

  // Watch Active Toast and automatically fade it out after 8.5 seconds
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      setActiveToast(null);
    }, 8500);
    return () => clearTimeout(timer);
  }, [activeToast]);

  const handleSimulateNotification = () => {
    const mockNotif: ExplorerNotification = {
      id: `sim-${Date.now()}`,
      type: 'new_location',
      locationName: 'Taj Mahal',
      locationId: 'sim-location-id',
      userName: 'Sophia Laurent',
      timestamp: new Date().toISOString(),
      read: false,
      locationData: {
        id: 'sim-location-id',
        name: 'Taj Mahal',
        imageUrl: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&q=80',
        userName: 'Sophia Laurent',
        description: 'The Taj Mahal is an ivory-white marble mausoleum on the south bank of the Yamuna River in Agra, India.',
        continent: 'Asia'
      }
    };
    
    setNotifications(prev => [mockNotif, ...prev]);
    setActiveToast(mockNotif);
    playNotificationChime();
  };

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, 'locations'),
      orderBy('createdAt', 'desc')
    );

    let isInitialLoad = true;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifications: ExplorerNotification[] = [];
      let latestLiveNotif: ExplorerNotification | null = null;
      
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (data && data.userId !== user.uid) {
            const locationId = change.doc.id;
            
            // Format fallback date properly using bulletproof helper
            const dateVal = safelyConvertToDate(data.createdAt);
            const dateString = dateVal.toISOString();

            const newNotif: ExplorerNotification = {
              id: `notif-${locationId}`,
              type: 'new_location',
              locationName: data.name || 'Mysterious Spot',
              locationId: locationId,
              userName: data.userName || 'Anonymous Traveler',
              timestamp: dateString,
              read: isInitialLoad, // auto-mark older historical items as read so they don't badge immediately on startup
              locationData: { id: locationId, ...data }
            };
            newNotifications.push(newNotif);

            if (!isInitialLoad) {
              latestLiveNotif = newNotif;
            }
          }
        }
      });

      if (newNotifications.length > 0) {
        setNotifications((prev) => {
          const merged = [...newNotifications, ...prev];
          // Filter duplicates strictly
          const unique = merged.filter((v, i, a) => a.findIndex(t => t.locationId === v.locationId) === i);
          // Sort by timestamp descending
          unique.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          return unique.slice(0, 30);
        });

        // Trigger notifications and sounds for live real-time additions
        if (latestLiveNotif) {
          setActiveToast(latestLiveNotif);
          playNotificationChime();

          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification("🌍 New Explorer Alert!", {
                body: `${(latestLiveNotif as ExplorerNotification).locationName} was discovered by ${(latestLiveNotif as ExplorerNotification).userName}!`,
              });
            } catch (err) {
              console.warn("Native Notification blocked in sandboxed iframe environment:", err);
            }
          }
        }
      }

      isInitialLoad = false;
    }, (error) => {
      console.warn("Real-time alerts subscription:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const handleNotificationClick = (notif: ExplorerNotification) => {
    // 1. Mark notification as read
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    // 2. Load the target location into details so it opens the info modal beautifully
    setSelectedLocationData(notif.locationData);
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Implement a 'Daily Explorer' streak tracker
  const updateDailyStreak = async (userId: string) => {
    try {
      const { doc, getDoc, setDoc, serverTimestamp, increment } = await import('firebase/firestore');
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return;

      const userData = userSnap.data();
      const lastActiveDate = userData.lastActiveDate || "";
      
      const getLocalDateString = (offsetDays = 0) => {
        const d = new Date();
        d.setDate(d.getDate() + offsetDays);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const today = getLocalDateString(0);
      const yesterday = getLocalDateString(-1);

      if (lastActiveDate === today) {
        // Already active today, streak is safe but no need to double increment
        console.log("[Streak] Already checked in today:", today);
        return;
      }

      let newStreak = 1;
      let existingStreakBonusPoints = userData.streakBonusPoints || 0;
      let earnedBonus = 50; // Each active day earns +50 XP bonus

      if (lastActiveDate === yesterday) {
        newStreak = (userData.streakCount || 0) + 1;
        console.log(`[Streak] Streak continued! New streak: ${newStreak}`);
      } else {
        console.log("[Streak] New streak started or reset.");
      }

      const newLongest = Math.max(userData.longestStreak || 0, newStreak);
      const newStreakBonusPoints = existingStreakBonusPoints + earnedBonus;

      // Update the user profile document in Firestore
      await setDoc(userRef, {
        streakCount: newStreak,
        longestStreak: newLongest,
        lastActiveDate: today,
        streakBonusPoints: newStreakBonusPoints,
        points: increment(earnedBonus),
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Update public profile points to match
      const publicRef = doc(db, 'public_profiles', userId);
      await setDoc(publicRef, {
        points: increment(earnedBonus),
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Play a satisfying sound/chime and show a custom celebratory toast!
      playNotificationChime();
      
      const streakToast: ExplorerNotification = {
        id: `streak-${Date.now()}`,
        type: 'streak_milestone' as any,
        locationName: `Daily Explorer Streak: ${newStreak} Days! 🔥`,
        locationId: '',
        userName: 'Streak Engine',
        timestamp: new Date().toISOString(),
        read: false,
        locationData: {
          id: '',
          name: `Daily Explorer Streak: ${newStreak} Days! 🔥`,
          description: `Consecutive active days: ${newStreak}. Longest streak: ${newLongest}. Rewarded +${earnedBonus} XP bonus!`,
          imageUrl: 'https://images.unsplash.com/photo-1519751138087-5bf79df62d5b?auto=format&fit=crop&q=80&w=400'
        }
      };
      
      setActiveToast(streakToast);
      
    } catch (err: any) {
      console.error("[Streak Error] Failed to update daily streak:", err.message || err);
    }
  };

  // Trigger 'Daily Explorer' streak tracker when viewing a location
  useEffect(() => {
    if (user && selectedLocationData) {
      updateDailyStreak(user.uid);
    }
  }, [selectedLocationData, user]);

  // Initial mount setup: clean onboarding slate & automatic logout so they must go through the login and guide steps
  useEffect(() => {
    localStorage.removeItem('world_explorer_terms_accepted');
    localStorage.removeItem('world_explorer_guide_seen');
    sessionStorage.removeItem('world_explorer_otp_verified');
    setIsTermsAccepted(false);
    setIsGuideSeen(false);
    setIsOtpVerified(false);

    const performOnboardingSignout = async () => {
      try {
        await logout();
      } catch (e) {
        console.error("Clean slate signout failed:", e);
      }
    };
    performOnboardingSignout();
  }, []);

  // Timer & Auth subscription
  useEffect(() => {
    // Initial splash duration of EXACTLY 3.0 seconds
    const splashTimer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    const handleCustomLogout = () => {
      localStorage.removeItem('world_explorer_guest_session_active');
      setUser(null);
    };
    window.addEventListener('explorer-logout', handleCustomLogout);

    const handleCenterLocation = (e: Event) => {
      const locationData = (e as CustomEvent).detail;
      if (locationData) {
        setSelectedLocationData(locationData);
        setViewMode('map');
      }
    };
    window.addEventListener('center-location', handleCenterLocation);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      let activeUser = currentUser;
      if (!currentUser) {
        const guestId = localStorage.getItem('world_explorer_guest_id');
        const hasSession = localStorage.getItem('world_explorer_guest_session_active') === 'true';
        if (guestId && hasSession) {
          activeUser = {
            uid: guestId,
            displayName: 'Guest Explorer',
            photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${guestId}`,
            email: 'guest@worldexplorer.com',
            isAnonymous: true,
            emailVerified: true
          } as any;
        }
      }

      setUser(activeUser);
      if (activeUser) {
        // Track last login and ensure profile exists
        const syncProfiles = async () => {
          try {
            const { doc, getDoc, setDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs } = await import('firebase/firestore');
            
            const publicRef = doc(db, 'public_profiles', activeUser.uid);
            const userDoc = doc(db, 'users', activeUser.uid);

            const isGuestUser = activeUser.isAnonymous || 
                               activeUser.email === 'guest@worldexplorer.com' || 
                               activeUser.uid.startsWith('guest_') || 
                               localStorage.getItem('world_explorer_guest_id') === activeUser.uid;

            if (isGuestUser) {
              console.log("[Guest Reset] Clearing guest progress, locations, and achievements to zero for session...");
              const collectionsToClear = ['favorites', 'tours', 'archives', 'locations', 'reviews'];
              for (const colName of collectionsToClear) {
                try {
                  const q = query(collection(db, colName), where('userId', '==', activeUser.uid));
                  const snap = await getDocs(q);
                  for (const document of snap.docs) {
                    await deleteDoc(doc(db, colName, document.id));
                  }
                  console.log(`[Guest Reset] Cleared ${colName} for guest user.`);
                } catch (clearErr) {
                  console.warn(`[Guest Reset Warning] Failed to clear ${colName} for guest:`, clearErr);
                }
              }
            }

            console.log("[Profile Sync] Fetching public profile for UID:", activeUser.uid);
            let publicSnap;
            try {
              publicSnap = await getDoc(publicRef);
            } catch (err: any) {
              console.error("[Profile Sync Error] Failed to get public_profile document:", err.message || err);
              throw err;
            }
            const exists = publicSnap.exists();

            console.log("[Profile Sync] Querying active locations for UID:", activeUser.uid);
            let locSnap;
            try {
              const locQ = query(collection(db, 'locations'), where('userId', '==', activeUser.uid));
              locSnap = await getDocs(locQ);
            } catch (err: any) {
              console.error("[Profile Sync Error] Failed to query locations database:", err.message || err);
              throw err;
            }
            const activeLocs = locSnap.docs.filter(d => !d.data().isDeleted);
            const locCount = isGuestUser ? 0 : activeLocs.length;

            console.log("[Profile Sync] Querying reviews for UID:", activeUser.uid);
            let revSnap;
            try {
              const revQ = query(collection(db, 'reviews'), where('userId', '==', activeUser.uid));
              revSnap = await getDocs(revQ);
            } catch (err: any) {
              console.error("[Profile Sync Error] Failed to query reviews database:", err.message || err);
              throw err;
            }
            const revCount = isGuestUser ? 0 : revSnap.size;

            // Retrieve streak bonus points so they are not wiped during reconciliation
            let streakBonusPoints = 0;
            let streakCount = 0;
            let longestStreak = 0;
            try {
              const userSnap = await getDoc(userDoc);
              if (userSnap.exists()) {
                streakBonusPoints = userSnap.data().streakBonusPoints || 0;
                streakCount = userSnap.data().streakCount || 0;
                longestStreak = userSnap.data().longestStreak || 0;
              }
            } catch (snapErr) {
              console.warn("[Profile Sync] Failed to load existing user document for points reconciliation:", snapErr);
            }

            // Reconcile user points strictly to 5600 points for normal users, 0 for guest
            const finalXP = isGuestUser ? 0 : 5600;

            const publicData: any = {
              displayName: activeUser.displayName || 'Architectural Explorer',
              photoURL: activeUser.photoURL || null,
              points: finalXP,
              totalDiscoveries: locCount,
              totalReviews: revCount,
              updatedAt: serverTimestamp()
            };

            if (!exists || !publicSnap.data()?.username) {
              publicData.username = activeUser.displayName 
                ? `@${activeUser.displayName.toLowerCase().replace(/\s+/g, '')}` 
                : `@explorer_${activeUser.uid.substring(0, 5)}`;
            }

            console.log("[Profile Sync] Writing public profile data:", publicData);
            try {
              await setDoc(publicRef, publicData, { merge: true });
            } catch (err: any) {
              console.error("[Profile Sync Error] Failed to set public_profile document:", err.message || err);
              throw err;
            }

            const userProfileData: any = {
              lastLogin: serverTimestamp(),
              email: activeUser.email || '',
              displayName: activeUser.displayName || '',
              points: finalXP,
              totalDiscoveries: locCount,
              totalReviews: revCount,
              streakCount: isGuestUser ? 0 : streakCount,
              longestStreak: isGuestUser ? 0 : longestStreak,
              streakBonusPoints: isGuestUser ? 0 : streakBonusPoints,
              updatedAt: serverTimestamp()
            };
            console.log("[Profile Sync] Writing user metadata profile:", userProfileData);
            try {
              await setDoc(userDoc, userProfileData, { merge: true });
            } catch (err: any) {
              console.error("[Profile Sync Error] Failed to set users document:", err.message || err);
              throw err;
            }
            console.log("[Profile Sync] Sync successfully completed!");
          } catch (e: any) {
            console.error("Profile Sync Failed:", e.message || e);
          }
        };
        
        syncProfiles();
      } else {
        sessionStorage.removeItem('world_explorer_otp_verified');
        setIsOtpVerified(false);
      }
    });

    return () => {
      clearTimeout(splashTimer);
      window.removeEventListener('explorer-logout', handleCustomLogout);
      window.removeEventListener('center-location', handleCenterLocation);
      unsubscribe();
    };
  }, []);

  // Compute flowStep dynamically to resolve any timing or race-condition flows beautifully
  useEffect(() => {
    if (isLoading) {
      setFlowStep('splash');
    } else if (!user) {
      setFlowStep('login');
    } else if (!isOtpVerified) {
      setFlowStep('otp');
    } else if (!isTermsAccepted) {
      setFlowStep('terms');
    } else if (!isGuideSeen) {
      setFlowStep('guide');
    } else {
      setFlowStep('app');
    }
  }, [isLoading, user, isOtpVerified, isTermsAccepted, isGuideSeen]);

  const handleAcceptTerms = () => {
    localStorage.setItem('world_explorer_terms_accepted', 'true');
    setIsTermsAccepted(true);
    if (!isOtpVerified) {
      setFlowStep('otp');
    } else if (!isGuideSeen) {
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

  const handleGuestLogin = async () => {
    try {
      let resultUser;
      try {
        resultUser = await signInAsGuest();
      } catch (authError: any) {
        console.warn("Firebase Guest Auth failed or is restricted. Creating a client-side guest session:", authError);
        let guestId = localStorage.getItem('world_explorer_guest_id');
        if (!guestId) {
          guestId = 'guest_' + Math.random().toString(36).substr(2, 9);
          localStorage.setItem('world_explorer_guest_id', guestId);
        }
        localStorage.setItem('world_explorer_guest_session_active', 'true');
        resultUser = {
          uid: guestId,
          displayName: 'Guest Explorer',
          photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${guestId}`,
          email: 'guest@worldexplorer.com',
          isAnonymous: true,
          emailVerified: true
        } as any;
        setUser(resultUser);
      }

      if (resultUser) {
        if (!isOtpVerified) {
          setFlowStep('otp');
        } else if (!isTermsAccepted) {
          setFlowStep('terms');
        } else if (!isGuideSeen) {
          setFlowStep('guide');
        } else {
          setFlowStep('app');
        }
      }
    } catch (error) {
      console.error("Guest login failed:", error);
    }
  };

  const handleLogin = async () => {
    try {
      const resultUser = await signInWithGoogle();
      if (resultUser) {
        if (!isOtpVerified) {
          setFlowStep('otp');
        } else if (!isTermsAccepted) {
          setFlowStep('terms');
        } else if (!isGuideSeen) {
          setFlowStep('guide');
        } else {
          setFlowStep('app');
        }
      }
    } catch (error: any) {
      console.error("Login failed:", error);
      const errMsg = error?.message || '';
      const errCode = error?.code || '';
      if (
        errCode === 'auth/cancelled-popup-request' || 
        errMsg.includes('cancelled-popup-request') || 
        errMsg.includes('popup-closed-by-user') ||
        errCode === 'auth/popup-closed-by-user' ||
        errCode === 'auth/popup-blocked'
      ) {
        console.warn("Popup authentication blocked or cancelled. Falling back to secure Guest access...");
        await handleGuestLogin();
      }
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
      let errorMessage = "World Explorer AI is currently overwhelmed with requests. Please try again in a moment.";
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        errorMessage = "Unable to connect to the World Explorer AI server. Please verify your connection.";
      }
      setPlaceDetails({
        description: errorMessage,
        imageUrl: initialImage || "https://images.unsplash.com/photo-1548013146-72479768b0fd?auto=format&fit=crop&q=80&w=800"
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const registerSharedLocationNotification = (title: string, text: string) => {
    const shareNotif: ExplorerNotification = {
      id: `notif-share-${Date.now()}`,
      type: 'new_location',
      locationName: `Shared Spot: ${title}`,
      locationId: 'shared-spot',
      userName: 'You',
      timestamp: new Date().toISOString(),
      read: false,
      locationData: { id: 'shared-spot', name: title, description: text }
    };
    
    // Add to notification bar (activity feed)
    setNotifications(prev => [shareNotif, ...prev]);
    
    // Play premium chime sound
    playNotificationChime();
    
    // Show on-screen notification popup/toast
    setActiveToast(shareNotif);
    
    // Try native browser desktop notification pop-up
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new window.Notification("🌍 Location Shared Successfully!", {
          body: `You shared "${title}" with fellow travelers!`,
        });
      } catch (err) {
        console.warn("Native Notification blocked or failed in sandbox iframe:", err);
      }
    }
  };

  const handleShare = async (title: string, text: string, url: string = window.location.href) => {
    const triggerSuccess = () => {
      registerSharedLocationNotification(title, text);
    };

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        setShareToast({ message: 'Shared successfully!', visible: true });
        setTimeout(() => {
          setShareToast(prev => ({ ...prev, visible: false }));
        }, 3000);
        triggerSuccess();
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
          // Fallback to clipboard if share dialog failed/canceled or restricted
          try {
            await navigator.clipboard.writeText(`${text} ${url}`);
            setShareToast({ message: 'Copied to clipboard!', visible: true });
            setTimeout(() => {
              setShareToast(prev => ({ ...prev, visible: false }));
            }, 3000);
            triggerSuccess();
          } catch (clipErr) {
            console.error('Clipboard fallback failed:', clipErr);
          }
        }
      }
    } else {
      // Try copying to clipboard first, then open fallback window
      try {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setShareToast({ message: 'Copied to clipboard!', visible: true });
        setTimeout(() => {
          setShareToast(prev => ({ ...prev, visible: false }));
        }, 3000);
        triggerSuccess();
      } catch (err) {
        console.error('Clipboard copy failed:', err);
      }
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
    setShowDualDashboard(false);
    setShowGmailHub(false);
    setShowGameHub(false);
    setSearchQuery(''); // Clear search when navigating categories
    
    // Close sidebar on mobile after selection
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleAIAction = async (action: string) => {
    if (action.startsWith('add_location_sync:')) {
      const jsonStr = action.substring('add_location_sync:'.length);
      try {
        const data = JSON.parse(jsonStr);
        if (user && db) {
          const locId = data.id || `loc-${Date.now()}`;
          
          // Robust continent normalization so it always satisfies firestore rules (enum check)
          const mapContinent = (c: string): "Africa" | "Asia" | "Europe" | "North America" | "South America" | "Oceania" | "Antarctica" => {
            const normalized = (c || '').trim().toLowerCase();
            if (normalized.includes('asia')) return 'Asia';
            if (normalized.includes('europe')) return 'Europe';
            if (normalized.includes('africa')) return 'Africa';
            if (normalized.includes('america') && (normalized.includes('north') || normalized.includes('usa') || normalized.includes('canada') || normalized.includes('mexico'))) return 'North America';
            if (normalized.includes('america') && (normalized.includes('south') || normalized.includes('brazil') || normalized.includes('argentina'))) return 'South America';
            if (normalized.includes('oceania') || normalized.includes('australia') || normalized.includes('nz')) return 'Oceania';
            if (normalized.includes('antarct')) return 'Antarctica';
            
            const allowed: Array<"Africa" | "Asia" | "Europe" | "North America" | "South America" | "Oceania" | "Antarctica"> = [
              "Africa", "Asia", "Europe", "North America", "South America", "Oceania", "Antarctica"
            ];
            for (const item of allowed) {
              if (item.toLowerCase() === normalized) return item;
            }
            return 'Europe'; // Safest fallback
          };

          const finalLocationPayload = {
            name: (data.name || 'Mysterious Discovery').trim().substring(0, 200),
            description: (data.description || 'A fascinating travel landmark mapped on World Explorer.').trim().substring(0, 5000),
            imageUrl: (data.imageUrl || `https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&q=80&w=800`).trim().substring(0, 250000),
            continent: mapContinent(data.continent),
            country: (data.country || '').trim().substring(0, 100),
            state: (data.state || '').trim().substring(0, 100),
            userId: user.uid,
            userName: (user.displayName || "Explorer").substring(0, 100),
            lat: typeof data.lat === 'number' && !isNaN(data.lat) ? data.lat : (typeof data.lat === 'string' && !isNaN(parseFloat(data.lat)) ? parseFloat(data.lat) : 0),
            lng: typeof data.lng === 'number' && !isNaN(data.lng) ? data.lng : (typeof data.lng === 'string' && !isNaN(parseFloat(data.lng)) ? parseFloat(data.lng) : 0),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            isDeleted: false,
            addedByAi: true
          };
          try {
            await setDoc(doc(db, 'locations', locId), finalLocationPayload);
            console.log(`[AI Sync] Successfully saved location client-side: ${finalLocationPayload.name}`);

            // Award points for AI discovery
            try {
              const userRef = doc(db, 'users', user.uid);
              await setDoc(userRef, {
                points: increment(50), 
                totalDiscoveries: increment(1),
                updatedAt: serverTimestamp()
              }, { merge: true });

              const publicRef = doc(db, 'public_profiles', user.uid);
              await setDoc(publicRef, {
                displayName: user.displayName || 'Anonymous Explorer',
                photoURL: user.photoURL,
                points: increment(50),
                totalDiscoveries: increment(1),
                updatedAt: serverTimestamp()
              }, { merge: true });
              console.log("[AI Sync] Points awarded successfully client-side!");
            } catch (pointsErr) {
              console.error("[AI Sync] Error awarding points:", pointsErr);
            }
          } catch (writeErr) {
            handleFirestoreError(writeErr, OperationType.WRITE, `locations/${locId}`);
          }
        }
      } catch (err) {
        console.error("Failed to sync AI added location:", err);
      }
      return;
    }

    switch (action) {
      case 'open_add_location':
        user ? setIsAddModalOpen(true) : handleLogin();
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
        <GlobalRotatingEarth speed={backgroundEarthSpeed} />
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

          <button
            onClick={handleGuestLogin}
            className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 py-4 rounded-[24px] font-bold text-xs uppercase tracking-wider active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-stone-200"
          >
            Or Enter as Guest / Demo Mode
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

  if (flowStep === 'otp' && user) {
    return (
      <OtpVerification
        user={user}
        onVerifySuccess={() => {
          sessionStorage.setItem('world_explorer_otp_verified', 'true');
          setIsOtpVerified(true);
        }}
        onCancel={async () => {
          try {
            await logout();
          } catch (e) {
            console.error("OTP Cancel Signout Failed:", e);
          }
        }}
      />
    );
  }

  if (flowStep === 'terms') {
    return <TermsModal onAccept={handleAcceptTerms} />;
  }

  if (flowStep === 'guide') {
    return <AppGuideModal isOpen={true} onClose={handleFinishGuide} />;
  }

  const renderActiveContent = () => {
    if (showGmailHub) {
      return <GmailTravelHub />;
    }

    if (showGameHub) {
      return <GameHub />;
    }

    if (showDualDashboard) {
      return <ExplorerDashboard />;
    }

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
            <button
              onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
              className="flex items-center gap-3 bg-[#5A5A40] text-white px-8 py-4 rounded-full shadow-xl shadow-[#5A5A40]/20 hover:bg-[#4a4a30] transition-all text-sm uppercase tracking-widest font-bold"
            >
              {viewMode === 'list' ? <><MapIcon className="w-4 h-4" /> Open Global Map</> : <><LayoutGrid className="w-4 h-4" /> View as Feed</>}
            </button>
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
            {viewMode === 'map' ? (
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
                  onSelectContinent={(c) => handleSelection(c, null, null)}
                  speed={backgroundEarthSpeed}
                  onChangeSpeed={setBackgroundEarthSpeed}
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
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-black mb-8 px-1">
          <button 
            onClick={() => handleSelection(null, null, null)}
            className="opacity-40 hover:opacity-100 transition-opacity hover:underline"
          >
            World View
          </button>
          {selectedContinent && (
            <>
              <ChevronRight className="w-3 h-3 opacity-20" />
              <button 
                onClick={() => handleSelection(selectedContinent, null, null)}
                className="opacity-45 hover:opacity-100 transition-opacity hover:underline"
              >
                {selectedContinent}
              </button>
            </>
          )} 
          {selectedCountry && (
            <>
              <ChevronRight className="w-3 h-3 opacity-20" />
              <button 
                onClick={() => handleSelection(selectedContinent, selectedCountry, null)}
                className="opacity-45 hover:opacity-100 transition-opacity hover:underline"
              >
                {selectedCountry}
              </button>
            </>
          )}
          {selectedState && (
            <>
              <ChevronRight className="w-3 h-3 opacity-20" />
              <span className="opacity-80 font-bold text-[#5A5A40]">
                {selectedState}
              </span>
            </>
          )}
        </div>

        <DiscoveryHero 
          locationName={selectedState || selectedCountry || selectedContinent || ""} 
          imageUrl={selectedContinent ? CONTINENT_DATA.find(c => c.name === selectedContinent)?.image : undefined}
          description={selectedContinent ? CONTINENT_DATA.find(c => c.name === selectedContinent)?.description : undefined}
        />

        <div className="flex items-center justify-end gap-4 pt-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
              className="p-4 rounded-full bg-white border border-[#141414]/10 shadow-sm hover:shadow-md transition-all text-[#5A5A40]"
            >
              {viewMode === 'list' ? <MapIcon className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
            </button>
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
          {viewMode === 'map' ? (
            <motion.div key="filtered-map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <WorldView 
                continent={selectedContinent} 
                country={selectedCountry} 
                state={selectedState} 
                showFavoritesOnly={showFavoritesOnly}
                showTourOnly={showTourOnly}
                showUserAddedOnly={showUserWorldOnly}
                searchQuery={searchQuery} 
                onSearchQueryChange={setSearchQuery}
                onSelect={setSelectedLocationData} 
                onSelectContinent={(c) => handleSelection(c, null, null)}
                speed={backgroundEarthSpeed}
                onChangeSpeed={setBackgroundEarthSpeed}
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
                <div className="space-y-12">
                  <div className="pt-4 pb-2 border-b border-[#141414]/5 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-3 bg-[#5A5A40] rounded-full" />
                      <h2 className="text-sm uppercase tracking-[0.2em] font-black opacity-50">Explore by Region / State</h2>
                    </div>
                    <StateSelector 
                      continent={selectedContinent!} 
                      country={selectedCountry} 
                      onSelect={(state) => handleSelection(selectedContinent, selectedCountry, state)} 
                    />
                  </div>
                  
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-3 bg-[#00af87] rounded-full" />
                      <h2 className="text-sm uppercase tracking-[0.2em] font-black opacity-50">Discoveries in {selectedCountry}</h2>
                    </div>
                    <LocationList 
                      continent={selectedContinent} 
                      country={selectedCountry} 
                      state={null} 
                      searchQuery={searchQuery} 
                      onSelect={setSelectedLocationData}
                    />
                  </div>
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

  const renderDeviceSelector = (isDarkTheme: boolean) => {
    return (
      <div className="relative shrink-0">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setShowDeviceDropdown(!showDeviceDropdown);
          }}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full border transition-all text-[9px] uppercase tracking-wider font-bold ${
            isDarkTheme 
              ? 'bg-white/10 hover:bg-white/20 text-white border-white/10' 
              : 'bg-[#141414]/5 hover:bg-[#141414]/10 text-[#141414] border-[#141414]/15'
          }`}
          title="Change Status Bar Device Theme"
        >
          <Smartphone className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
          <span>Bar: {deviceType === 'auto' ? `Auto (${resolvedDevice})` : deviceType}</span>
        </button>
        
        {showDeviceDropdown && (
          <>
            <div className="fixed inset-0 z-40 cursor-default" onClick={(e) => {
              e.stopPropagation();
              setShowDeviceDropdown(false);
            }} />
            <div className="absolute right-0 mt-1.5 w-48 bg-[#121312] border border-white/10 rounded-2xl p-1.5 shadow-2xl z-50 flex flex-col gap-1 text-left text-white text-[10px] pointer-events-auto">
              <div className="px-2 py-1 text-[#8e9185] font-black uppercase tracking-wider text-[8px] border-b border-white/5 font-sans">
                Select Status Bar Style
              </div>
              {[
                { id: 'auto', label: '📱 Auto-Detect Device', desc: 'Senses your actual browser' },
                { id: 'ios', label: '🍎 Apple iOS (iPhone)', desc: 'iOS with Dynamic Island' },
                { id: 'android', label: '🤖 Google Android', desc: 'Material Design bar' },
                { id: 'macos', label: '🖥️ Apple macOS', desc: 'frosted crystal menubar' },
                { id: 'windows', label: '💻 Microsoft Windows', desc: 'Windows 11 system tray' },
                { id: 'hybrid', label: '🌐 Classic Hybrid', desc: 'Pristine Traveler style' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeviceType(opt.id as any);
                    setShowDeviceDropdown(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded-xl transition-all font-sans ${
                    deviceType === opt.id 
                      ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30' 
                      : 'hover:bg-white/5 text-white/80'
                  }`}
                >
                  <div className="font-semibold">{opt.label}</div>
                  <div className="text-[8px] opacity-40 leading-none mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0] font-sans text-[#141414] pt-10">
      {/* Real-time Simulated Status Bar (Device-Adaptive Layout) */}
      <div className={`w-full py-2 px-4 md:px-8 flex items-center justify-between text-[11px] font-sans font-bold select-none fixed top-0 left-0 w-full z-[150] shadow-sm h-10 transition-all duration-300 ${
        resolvedDevice === 'ios' ? 'bg-[#090a09] text-white border-b border-[#2d2e2c]/30' :
        resolvedDevice === 'android' ? 'bg-[#121312] text-[#e3e3dc] border-b border-[#2d2e2c]/20' :
        resolvedDevice === 'macos' ? 'bg-[#f5f5f0]/85 backdrop-blur-md text-[#141414] border-b border-[#141414]/10' :
        resolvedDevice === 'windows' ? 'bg-[#202020] text-[#f3f3f3] border-b border-white/5' :
        'bg-[#121312] text-[#e3e3dc] border-b border-[#2d2e2c]/30'
      }`}>
        
        {/* ==================== iOS LAYOUT ==================== */}
        {resolvedDevice === 'ios' && (
          <>
            {/* Left: Compact bold time & dynamic notification pulse indicator */}
            <div className="flex items-center gap-2">
              <span className="tracking-tight text-white text-[12px] font-black">{currentTime || '9:41'}</span>
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[9px] text-emerald-400 font-mono">
                  <BellRing className="w-2.5 h-2.5 animate-bounce shrink-0" />
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </div>

            {/* Center: Beautiful Dynamic Island */}
            <div className="hidden md:flex items-center gap-2 px-3.5 py-1 rounded-full bg-black border border-white/10 text-[9px] text-white font-semibold shadow-inner group cursor-pointer relative hover:scale-105 transition-transform duration-200">
              <div className="w-2.5 h-2.5 rounded-full bg-[#0d0e0d] border border-white/5 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-blue-900/40" />
              </div>
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
              <span className="tracking-widest uppercase text-[8px] font-mono">TRAVELER COMPANION</span>
            </div>

            {/* Right: iOS Cellular icons + custom horizontal battery */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-0.5" title="Signal: Excellent">
                <div className="w-0.5 h-1 bg-white rounded-xs" />
                <div className="w-0.5 h-1.5 bg-white rounded-xs" />
                <div className="w-0.5 h-2 bg-white rounded-xs" />
                <div className="w-0.5 h-2.5 bg-white rounded-xs" />
              </div>
              
              {realIsOnline ? (
                <Wifi className="w-3.5 h-3.5 text-white" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-rose-500" />
              )}

              <div className="flex items-center gap-1.5" title={`Battery: ${realBatteryLevel}%`}>
                <div className="relative w-6 h-3 border border-white/50 rounded p-0.5 flex items-center">
                  <div className="h-full bg-emerald-500 rounded-xs transition-all duration-300" style={{ width: `${realBatteryLevel}%` }} />
                  <div className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-1 bg-white/50 rounded-r-2xs" />
                </div>
                {realIsCharging && <BatteryCharging className="w-3 h-3 text-emerald-400" />}
              </div>

              {/* Dynamic Interactive Controller Dropdown */}
              {renderDeviceSelector(true)}
            </div>
          </>
        )}

        {/* ==================== ANDROID LAYOUT ==================== */}
        {resolvedDevice === 'android' && (
          <>
            {/* Left: Time and standard Android notification icons */}
            <div className="flex items-center gap-2">
              <span className="text-white text-[12px] font-bold mr-1.5">{currentTime || '2:55 PM'}</span>
              {notifications.filter(n => !n.read).length > 0 && (
                <div className="flex items-center gap-1.5">
                  <BellRing className="w-3 h-3 text-emerald-400 animate-pulse" />
                  <Globe className="w-3 h-3 text-emerald-400" />
                  <span className="text-[10px] text-[#8e9185] font-mono">+{notifications.filter(n => !n.read).length}</span>
                </div>
              )}
            </div>

            {/* Center: Punch-hole camera lens dot */}
            <div className="hidden md:block w-3.5 h-3.5 bg-black rounded-full border border-white/10 shadow-inner" />

            {/* Right: VoLTE/5G, cellular strength triangle, battery percentage + vertical block */}
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-mono text-white/70">{realIsOnline ? realConnectionType : 'OFFLINE'}</span>
              <Signal className="w-3.5 h-3.5 text-white" />
              {realIsOnline ? <Wifi className="w-3.5 h-3.5 text-white" /> : <WifiOff className="w-3.5 h-3.5 text-rose-500" />}
              
              <div className="flex items-center gap-1" title={`Battery: ${realBatteryLevel}%`}>
                <span className="text-[10px] text-white/90">{realBatteryLevel}%</span>
                {realIsCharging ? (
                  <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <div className="relative w-3.5 h-5 border border-white/60 rounded flex flex-col justify-end p-0.5">
                    <div className="w-full bg-emerald-500 rounded-xs" style={{ height: `${realBatteryLevel}%` }} />
                    <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-0.5 bg-white/60 rounded-t-xs" />
                  </div>
                )}
              </div>

              {renderDeviceSelector(true)}
            </div>
          </>
        )}

        {/* ==================== macOS LAYOUT ==================== */}
        {resolvedDevice === 'macos' && (
          <>
            {/* Left: Classic Apple logo Compass replacement and custom menubar links */}
            <div className="flex items-center gap-4 text-[#141414] text-[12px]">
              <Compass className="w-4 h-4 text-[#5a5a40] cursor-pointer hover:rotate-180 transition-all duration-500 animate-none" onClick={() => window.location.reload()} />
              <span className="font-extrabold text-[#141414] hover:opacity-75 cursor-pointer" onClick={() => setIsGuideOpen(true)}>Traveler</span>
              <span className="hidden lg:inline font-medium opacity-70 hover:opacity-100 cursor-pointer" onClick={() => setIsLeaderboardOpen(true)}>Leaderboard</span>
              <span className="hidden lg:inline font-medium opacity-70 hover:opacity-100 cursor-pointer" onClick={() => setIsBadgesOpen(true)}>Achievements</span>
              <span className="hidden lg:inline font-medium opacity-70 hover:opacity-100 cursor-pointer" onClick={() => setIsSettingsOpen(true)}>Settings</span>
            </div>

            {/* Center: Full long-form time and date */}
            <div className="hidden sm:block text-[#141414] text-[11px] font-bold">
              {currentTime}
            </div>

            {/* Right: Mac icons, battery percentage, dynamic Spotlight */}
            <div className="flex items-center gap-3.5 text-[#141414]">
              {realIsOnline ? <Wifi className="w-3.5 h-3.5 opacity-80" /> : <WifiOff className="w-3.5 h-3.5 text-red-600" />}
              <Bluetooth className="w-3.5 h-3.5 opacity-60 hidden sm:inline" />
              <Volume2 className="w-3.5 h-3.5 opacity-60 hidden sm:inline" />
              
              <div className="flex items-center gap-1.5" title={`Battery: ${realBatteryLevel}%`}>
                <span className="text-[10px] opacity-70">{realBatteryLevel}%</span>
                {realIsCharging ? (
                  <BatteryCharging className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Battery className="w-3.5 h-3.5 opacity-80" />
                )}
              </div>

              {renderDeviceSelector(false)}
            </div>
          </>
        )}

        {/* ==================== WINDOWS LAYOUT ==================== */}
        {resolvedDevice === 'windows' && (
          <>
            {/* Left: Quick Explorer menu and custom search widget */}
            <div className="flex items-center gap-3">
              <Compass className="w-4 h-4 text-emerald-400 rotate-45 cursor-pointer hover:rotate-180 transition-transform duration-500" onClick={() => window.location.reload()} />
              <span className="text-white font-extrabold text-[12px] cursor-pointer" onClick={() => setIsGuideOpen(true)}>Start</span>
              
              <div className="hidden sm:flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-md px-2 py-0.5 text-[10px] text-white/50 w-32 md:w-44 hover:bg-white/10 transition-colors">
                <Search className="w-3 h-3" />
                <span>Search Traveler...</span>
              </div>
            </div>

            {/* Center: System Program title */}
            <div className="hidden md:flex items-center gap-1.5 text-white/70 text-[10px] tracking-wider uppercase font-mono">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>World Explorer Companion v3.5</span>
            </div>

            {/* Right: System Tray & Stacked DateTime */}
            <div className="flex items-center gap-4 text-white/80">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded px-2.5 py-0.5">
                {realIsOnline ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3 text-red-400" />}
                <Volume2 className="w-3 h-3 text-white/60 hidden sm:inline" />
                <div className="flex items-center gap-1" title={`Battery: ${realBatteryLevel}%`}>
                  {realIsCharging && <BatteryCharging className="w-3 h-3 text-emerald-400" />}
                  <span className="text-[10px]">{realBatteryLevel}%</span>
                </div>
              </div>

              {/* Stacked Time & Date */}
              <div className="text-right text-[10px] leading-none font-mono">
                <div>{currentTime}</div>
                <div className="text-[8px] opacity-50 mt-0.5">{new Date().toLocaleDateString([], { month: 'numeric', day: 'numeric', year: 'numeric' })}</div>
              </div>

              {renderDeviceSelector(true)}
            </div>
          </>
        )}

        {/* ==================== HYBRID / DEFAULT LAYOUT ==================== */}
        {resolvedDevice === 'hybrid' && (
          <>
            {/* Left Side: Time & Notification Badge Icons */}
            <div className="flex items-center gap-2.5">
              <span className="tracking-tight text-white/95">{currentTime || '02:55 PM'}</span>
              
              <AnimatePresence>
                {notifications.filter(n => !n.read).length > 0 && (
                  <motion.div 
                    initial={{ scale: 0, opacity: 0, x: -10 }}
                    animate={{ scale: 1, opacity: 1, x: 0 }}
                    exit={{ scale: 0, opacity: 0, x: -10 }}
                    className="flex items-center gap-1.5 pl-2 border-l border-white/15 ml-1"
                  >
                    <div className="relative flex items-center justify-center">
                      <BellRing className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
                      <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
                    </div>
                    <Globe className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="text-[10px] text-emerald-400 font-mono tracking-tighter shrink-0">
                      {notifications.filter(n => !n.read).length} Unread
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Center: Sleek notch/island design */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#1e1f1d] border border-white/5 text-[9px] text-[#8e9185] font-mono tracking-widest">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping shrink-0" />
              <span>COMPANION PUSH SYSTEM</span>
            </div>

            {/* Right Side: Signal, Wifi, Battery */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-0.5 text-white/70" title="Signal strength: Full">
                <Signal className="w-3.5 h-3.5 text-white/95" />
              </div>
              <div className="flex items-center gap-0.5" title="Connected to Secure Companion Server">
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="flex items-center gap-1.5" title={`Battery: ${realBatteryLevel}%`}>
                <span className="text-[9px] text-white/65">{realBatteryLevel}%</span>
                <Battery className="w-4 h-4 text-emerald-500" />
              </div>

              {renderDeviceSelector(true)}
            </div>
          </>
        )}
      </div>

      {/* iOS/Android Simulated Phone Notification Alert Card dropping from Status Bar */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ opacity: 0, y: -120, x: "-50%", scale: 0.9 }}
            animate={{ opacity: 1, y: 12, x: "-50%", scale: 1 }}
            exit={{ opacity: 0, y: -120, x: "-50%", scale: 0.9 }}
            transition={{ type: "spring", damping: 18, stiffness: 220 }}
            className="fixed top-10 left-1/2 w-[calc(100%-32px)] max-w-[390px] bg-[#fbfbfa]/95 backdrop-blur-2xl border border-emerald-500/30 rounded-[32px] p-4.5 shadow-2xl z-[145] flex flex-col gap-3 text-left hover:border-emerald-500/50 transition-colors pointer-events-auto"
            id="phone-notification-card"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </div>
                <span className="text-[10px] uppercase font-black tracking-wider text-emerald-600 block">
                  Realtime Discovery Alert
                </span>
              </div>
              <button
                onClick={() => setActiveToast(null)}
                className="p-1 hover:bg-[#141414]/5 rounded-full opacity-60 hover:opacity-100 transition-all active:scale-95"
                title="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-start gap-3">
              <div className="relative shrink-0 w-11 h-11 bg-emerald-600/10 text-emerald-700 rounded-2xl flex items-center justify-center overflow-hidden border border-emerald-500/10">
                {activeToast.locationData?.imageUrl ? (
                  <img 
                    src={activeToast.locationData.imageUrl} 
                    alt={activeToast.locationName} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <MapPin className="w-5 h-5 shrink-0" />
                )}
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#fbfbfa] rounded-full flex items-center justify-center border border-[#141414]/10 animate-bounce">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-serif italic font-bold text-xs leading-snug truncate">
                  {activeToast.locationName}
                </h4>
                <p className="text-[10px] opacity-60 mt-0.5 leading-snug">
                  Pinned by <span className="font-semibold">{activeToast.userName}</span>
                </p>
              </div>
            </div>

            <div className="flex gap-2 border-t border-[#141414]/5 pt-2 text-[10px] uppercase font-bold tracking-wider">
              <button
                onClick={() => {
                  handleNotificationClick(activeToast);
                  setActiveToast(null);
                }}
                className="flex-1 bg-[#141414] hover:bg-[#2c2c2c] active:scale-[0.98] text-white py-2 rounded-xl text-center transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Compass className="w-3 h-3 animate-spin" style={{ animationDuration: '6s' }} />
                Inspect Now
              </button>
              <button
                onClick={() => setActiveToast(null)}
                className="px-4 py-2 border border-[#141414]/10 hover:bg-[#141414]/5 rounded-xl text-[#141414] text-center active:scale-[0.98] transition-all"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Toast Notification */}
      <AnimatePresence>
        {shareToast.visible && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: "-50%", scale: 0.9 }}
            animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
            exit={{ opacity: 0, y: -20, x: "-50%", scale: 0.95 }}
            transition={{ type: "spring", damping: 18, stiffness: 250 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-[#141414] text-white px-6 py-3.5 rounded-full shadow-2xl flex items-center gap-3 border border-white/10 font-sans text-xs font-bold uppercase tracking-wider"
          >
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Share2 className="w-3 h-3" />
            </div>
            <span>{shareToast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <Header 
        user={user} 
        searchQuery={searchQuery} 
        onSearchChange={setSearchQuery} 
        onProfileClick={() => setIsProfileOpen(true)}
        onBadgesClick={() => setIsBadgesOpen(true)}
        onLeaderboardClick={() => setIsLeaderboardOpen(true)}
        onGuideClick={() => setIsGuideOpen(true)}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        onMarkAllAsRead={handleMarkAllAsRead}
        onSettingsClick={() => setIsSettingsOpen(true)}
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
             <button onClick={() => handleSelection(null, null, null)} className={`p-2 rounded-lg ${!selectedContinent && !showTourOnly && !showArchiveOnly && !showFavoritesOnly && !showTrashOnly && !showUserWorldOnly && !showGmailHub && !showDualDashboard ? 'bg-[#5A5A40] text-white' : 'text-[#141414]/40'}`}>
               <Globe className="w-4 h-4" />
             </button>
             <button 
               onClick={() => {
                 handleSelection(null, null, null);
                 setShowDualDashboard(true);
               }} 
               className={`p-2 rounded-lg ${showDualDashboard ? 'bg-cyan-600 text-white' : 'text-[#141414]/40'}`}
               title="Dual Map & Globe"
             >
               <Globe className={`w-4 h-4 ${showDualDashboard ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }} />
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
             <button 
               onClick={() => {
                 handleSelection(null, null, null);
                 setShowGmailHub(true);
               }} 
               className={`p-2 rounded-lg ${showGmailHub ? 'bg-red-600 text-white' : 'text-[#141414]/40'}`}
               title="Gmail Transit Hub"
             >
               <Mail className="w-4 h-4" />
             </button>
             <button 
                onClick={() => {
                  handleSelection(null, null, null);
                  setShowGameHub(true);
                }} 
                className={`p-2 rounded-lg ${showGameHub ? 'bg-emerald-600 text-white' : 'text-[#141414]/40'}`}
                title="10-Game Hub"
              >
                <Gamepad2 className="w-4 h-4" />
              </button>
              <button onClick={() => handleSelection(null, null, null, false, false, false, false, true)} className={`p-2 rounded-lg ${showUserWorldOnly ? 'bg-[#5A5A40] text-white' : 'text-[#141414]/40'}`}>
               <Compass className="w-4 h-4" />
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
            showDualDashboard={showDualDashboard}
            showGmailHub={showGmailHub}
            showGameHub={showGameHub}
            onSelect={handleSelection}
            onSelectDualDashboard={(show) => {
              handleSelection(null, null, null);
              setShowDualDashboard(show);
            }}
            onSelectGmailHub={(show) => {
              handleSelection(null, null, null);
              setShowGmailHub(show);
            }}
            onSelectGameHub={(show) => {
              handleSelection(null, null, null);
              setShowGameHub(show);
            }}
          />
        </aside>

        {/* Main Dynamic Content Area */}
        <main className="flex-1 px-6 md:px-16 py-12 pb-32">

          <AnimatePresence mode="wait">
            <motion.div
              key={`${selectedContinent}-${selectedCountry}-${selectedState}-${viewMode}-${showFavoritesOnly}-${showTourOnly}-${showArchiveOnly}-${showTrashOnly}-${showGameHub}`}
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
        lat={selectedLocationData?.lat}
        lng={selectedLocationData?.lng}
      />
      <GlobalRotatingEarth speed={backgroundEarthSpeed} />
      <InteractiveBackground />
      <EarthSpeedSlider speed={backgroundEarthSpeed} onChangeSpeed={setBackgroundEarthSpeed} />
      <LocationHintButton 
        onLaunchUploader={() => setIsAddModalOpen(true)}
        isLoggedIn={!!user}
        onLogin={handleLogin}
      />
      <PermissionsManager 
        onSimulateNotification={handleSimulateNotification}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      
      {/* World Explorer AI Trigger */}
      <motion.div 
        drag
        dragMomentum={false}
        dragElastic={0.15}
        whileDrag={{ scale: 1.06, cursor: 'grabbing' }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-[95] select-none"
        title="Drag me anywhere! Click to ask World Explorer AI"
      >
        <button
          onClick={() => setIsAIOpen(true)}
          className="px-5 py-3.5 bg-[#141414] text-white rounded-full shadow-2xl hover:shadow-[#141414]/25 flex items-center gap-2.5 border border-white/10 font-bold text-xs tracking-wider uppercase transition-all"
          title="World Explorer AI Chatbot"
        >
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-emerald-800 via-emerald-600 to-emerald-400 flex items-center justify-center relative shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
          </div>
          <span className="font-sans font-bold tracking-wider">WORLD EXPLORER AI</span>
        </button>
      </motion.div>

      {/* Add Location AI Trigger */}
      <motion.div 
        drag
        dragMomentum={false}
        dragElastic={0.15}
        whileDrag={{ scale: 1.06, cursor: 'grabbing' }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-36 right-6 z-[95] select-none shadow-2xl"
        title="Drag me anywhere! Click to discover & map landmarks with Add Location AI"
      >
        <button
          onClick={() => setIsAddAIOpen(true)}
          className="px-5 py-3.5 bg-[#17153b] text-white rounded-full shadow-2xl hover:shadow-indigo-500/25 flex items-center gap-2.5 border border-indigo-400/20 font-bold text-xs tracking-wider uppercase transition-all"
          title="Add Location AI Chatbot"
        >
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-800 via-indigo-600 to-indigo-400 flex items-center justify-center relative shrink-0">
            <MapPin className="w-3.5 h-3.5 text-white animate-pulse" />
          </div>
          <span className="font-sans font-bold tracking-wider">ADD LOCATION BOT</span>
        </button>
      </motion.div>

      <AddLocationAI 
        isOpen={isAddAIOpen}
        onClose={() => setIsAddAIOpen(false)}
        onAction={handleAIAction}
        user={user}
      />

      <WorldExplorerAI 
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
        onAction={handleAIAction}
        user={user}
      />
      <UserProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        user={user} 
      />

      <BadgesOverlay
        isOpen={isBadgesOpen}
        onClose={() => setIsBadgesOpen(false)}
        stats={stats}
        user={user}
      />
      <LeaderboardModal 
        isOpen={isLeaderboardOpen} 
        onClose={() => setIsLeaderboardOpen(false)} 
        user={user}
      />
      <AppGuideModal 
        isOpen={isGuideOpen} 
        onClose={() => setIsGuideOpen(false)} 
      />
      <AmbientSoundtrack />
    </div>
  );
}

