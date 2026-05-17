import { User } from 'firebase/auth';
import { signInWithGoogle, logout } from '../lib/firebase.ts';
import { LogIn, LogOut, Compass, Search } from 'lucide-react';
import { motion } from 'motion/react';

interface HeaderProps {
  user: User | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function Header({ user, searchQuery, onSearchChange }: HeaderProps) {
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

        <div className="flex items-center gap-6 shrink-0">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-xs uppercase tracking-widest opacity-40 font-bold">Authenticated</span>
                <span className="text-sm font-medium">{user.displayName}</span>
              </div>
              <img 
                src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                alt={user.displayName || 'User'} 
                className="w-10 h-10 rounded-full border border-[#141414]/10 shadow-sm"
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
              <LogIn className="w-4 h-4" /> Sign In with Google
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
