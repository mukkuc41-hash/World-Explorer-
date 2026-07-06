import { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { signInWithGoogle, logout } from '../lib/firebase.ts';
import { LogIn, LogOut, Compass, Search, Info, Trophy, Bell, Check, MapPin, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ExplorerNotification {
  id: string;
  type: 'new_location';
  locationName: string;
  locationId: string;
  userName: string;
  timestamp: string;
  read: boolean;
  locationData: any;
}

interface HeaderProps {
  user: User | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onProfileClick: () => void;
  onBadgesClick: () => void;
  onLeaderboardClick: () => void;
  onGuideClick: () => void;
  notifications: ExplorerNotification[];
  onNotificationClick: (notif: ExplorerNotification) => void;
  onMarkAllAsRead: () => void;
  onSimulateNotification?: () => void;
  onSettingsClick?: () => void;
}

export default function Header({ 
  user, 
  searchQuery, 
  onSearchChange, 
  onProfileClick,
  onBadgesClick,
  onLeaderboardClick,
  onGuideClick,
  notifications = [],
  onNotificationClick,
  onMarkAllAsRead,
  onSimulateNotification,
  onSettingsClick
}: HeaderProps) {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function formatTimeAgo(timestampString: string): string {
    try {
      const elapsed = Date.now() - new Date(timestampString).getTime();
      if (elapsed < 60000) return 'Just now';
      const mins = Math.floor(elapsed / 60000);
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return new Date(timestampString).toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  }

  return (
    <header className="px-6 py-6 border-b border-[#141414]/10 sticky top-10 bg-[#f5f5f0]/80 backdrop-blur-md z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
        <div className="flex items-center gap-2 group cursor-pointer shrink-0" onClick={() => window.location.reload()}>
          <motion.div
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.5 }}
          >
            <Compass className="w-8 h-8 text-[#5A5A40]" />
          </motion.div>
          <span className="font-serif italic text-2xl tracking-tighter hidden sm:inline">Traveler</span>
        </div>

        <div className="flex items-center gap-6 flex-1 justify-center max-w-2xl px-8">
          <div className="flex-1 max-w-md relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#141414]/30 group-focus-within:text-[#5A5A40] transition-colors" />
            <input 
              type="text"
              placeholder="Search locations, countries..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-[#141414]/5 border border-transparent focus:border-[#5A5A40]/20 focus:bg-white px-10 py-2 rounded-full text-sm outline-none transition-all placeholder:text-[#141414]/30"
            />
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button 
              onClick={onLeaderboardClick}
              className="flex items-center gap-2 px-3 md:px-4 py-2 hover:bg-[#141414]/5 rounded-xl transition-all group"
            >
              <div className="w-8 h-8 bg-[#141414] rounded-lg flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                 <Trophy className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                 <div className="text-[8px] font-black uppercase tracking-widest opacity-40">Global</div>
                 <div className="text-[10px] font-bold text-[#141414]">Leaderboard</div>
              </div>
            </button>

            <button 
              onClick={onBadgesClick}
              className="flex items-center gap-2 px-3 md:px-4 py-2 hover:bg-[#141414]/5 rounded-xl transition-all group"
            >
              <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                 <Trophy className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                 <div className="text-[8px] font-black uppercase tracking-widest opacity-40">Collection</div>
                 <div className="text-[10px] font-bold text-[#141414]">Achievement</div>
              </div>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <button 
            onClick={onGuideClick}
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#141414] text-white rounded-xl hover:bg-[#333] transition-all"
          >
             <Info className="w-4 h-4" />
             <span className="text-xs font-bold">How it Works</span>
          </button>

          {/* New Interactive Bell Notification Component */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className={`p-2.5 relative hover:bg-[#141414]/5 rounded-xl transition-all h-10 w-10 flex items-center justify-center ${isNotifOpen ? 'bg-[#141414]/5 text-[#5A5A40]' : 'text-[#141414]/70'}`}
              title="Activity Alerts"
              id="notification-bell-btn"
            >
              <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'animate-bounce' : ''}`} />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-ping" />
              )}
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full flex items-center justify-center text-[7px] font-bold text-white leading-none">
                  {unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {isNotifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.95 }}
                  className="absolute right-0 mt-3 w-80 bg-[#fbfbfa]/95 backdrop-blur-xl border border-[#141414]/10 rounded-[32px] p-5 shadow-2xl z-50 flex flex-col gap-4 text-left text-[#141414] select-none text-sm pointer-events-auto"
                  id="notifications-panel"
                >
                  <div className="flex items-center justify-between border-b border-[#141414]/5 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-[#5A5A40]/10 rounded-lg text-[#5A5A40]">
                        <Bell className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-serif italic font-bold">Activity Feed</span>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => {
                          onMarkAllAsRead();
                        }}
                        className="flex items-center gap-1 text-[9px] uppercase font-black tracking-wider text-[#5A5A40] hover:opacity-75 transition-opacity"
                        title="Mark all notifications as read"
                      >
                        <Check className="w-3 h-3" />
                        read all
                      </button>
                    )}
                  </div>

                  <div className="max-h-60 overflow-y-auto flex flex-col gap-1.5 pr-1 scrollbar-thin">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs opacity-50 px-2 flex flex-col items-center">
                        <Bell className="w-8 h-8 mx-auto opacity-15 mb-2.5 text-[#5A5A40]" />
                        <p className="font-serif italic font-bold text-sm mb-1">Pristine Broadcast</p>
                        <p className="text-[9px] leading-relaxed max-w-[200px] mx-auto opacity-60">
                          When fellow travelers share new personal discoveries, alerts will stream here in real-time.
                        </p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <button
                          key={notif.id}
                          onClick={() => {
                            onNotificationClick(notif);
                            setIsNotifOpen(false);
                          }}
                          className={`w-full flex items-start gap-2.5 p-3 rounded-2xl transition-all text-left group border ${
                            notif.read 
                              ? 'border-transparent hover:bg-[#141414]/5 opacity-60' 
                              : 'bg-white border-[#141414]/5 shadow-sm hover:border-[#141414]/15'
                          }`}
                        >
                          <div className={`p-2 rounded-xl shrink-0 ${notif.read ? 'bg-[#141414]/5 text-[#141414]/40' : 'bg-[#5A5A40]/10 text-[#5A5A40]'}`}>
                            <MapPin className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-xs leading-tight line-clamp-1 group-hover:text-[#5A5A40] transition-colors">
                              {notif.locationName}
                            </div>
                            <div className="text-[10px] opacity-50 mt-0.5 line-clamp-1">
                              Added by <span className="font-medium opacity-80">{notif.userName}</span>
                            </div>
                            <div className="text-[8px] opacity-40 font-mono mt-1">
                              {formatTimeAgo(notif.timestamp)}
                            </div>
                          </div>
                          {!notif.read && (
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 shrink-0" />
                          )}
                        </button>
                      ))
                    )}
                  </div>

                  {onSimulateNotification && (
                    <div className="border-t border-[#141414]/5 pt-3 mt-1">
                      <button
                        onClick={() => {
                          onSimulateNotification();
                        }}
                        className="w-full py-2.5 bg-[#141414] hover:bg-[#5A5A40] text-white rounded-xl text-[10px] font-black uppercase tracking-widest text-center transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
                      >
                        <span className="animate-pulse w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        Simulate Realtime Alert
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Privacy & Notification Settings Gear */}
          {onSettingsClick && (
            <button
              onClick={onSettingsClick}
              className="p-2.5 hover:bg-[#141414]/5 text-[#141414]/70 hover:text-[#141414] rounded-xl transition-all h-10 w-10 flex items-center justify-center"
              title="Privacy & Permission Settings"
              id="header-settings-btn"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-4">
              <div className="hidden lg:flex flex-col items-end">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest opacity-40 font-black">Logged In</span>
                  {user.email === 'mukkuc41@gmail.com' && (
                    <span className="px-1.5 py-0.5 bg-[#141414] text-white text-[7px] font-black uppercase tracking-widest rounded leading-none">Admin</span>
                  )}
                </div>
                <span className="text-sm font-serif italic">{user.displayName}</span>
              </div>
              <img 
                src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                alt={user.displayName || 'User'} 
                onClick={onProfileClick}
                className="w-10 h-10 rounded-full border border-[#141414]/10 shadow-sm cursor-pointer hover:border-[#141414] transition-all"
                referrerPolicy="no-referrer"
              />
              <button 
                onClick={logout}
                className="p-2 hover:bg-red-50 text-red-500 rounded-full transition-colors"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={signInWithGoogle}
              className="flex items-center gap-2 px-6 py-2 rounded-full border border-[#141414]/20 hover:border-[#141414] hover:bg-[#141414] hover:text-white transition-all text-sm uppercase tracking-widest font-bold"
            >
              <LogIn className="w-4 h-4" /> Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

