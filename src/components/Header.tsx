import { User } from 'firebase/auth';
import { signInWithGoogle, logout } from '../lib/firebase.ts';
import { LogIn, LogOut, Compass, Search, Info, Trophy } from 'lucide-react';
import { motion } from 'motion/react';

interface HeaderProps {
  user: User | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onProfileClick: () => void;
  onBadgesClick: () => void;
  onLeaderboardClick: () => void;
  onGuideClick: () => void;
}

export default function Header({ 
  user, 
  searchQuery, 
  onSearchChange, 
  onProfileClick,
  onBadgesClick,
  onLeaderboardClick,
  onGuideClick
}: HeaderProps) {
  return (
    <header className="px-6 py-6 border-b border-[#141414]/10 sticky top-0 bg-[#f5f5f0]/80 backdrop-blur-md z-50">
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
