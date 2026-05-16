import { User } from 'firebase/auth';
import { signInWithGoogle, logout } from '../lib/firebase.ts';
import { LogIn, LogOut, Compass, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface HeaderProps {
  user: User | null;
}

export default function Header({ user }: HeaderProps) {
  return (
    <header className="px-6 py-6 border-b border-[#141414]/10">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.location.reload()}>
          <motion.div
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.5 }}
          >
            <Compass className="w-8 h-8 text-[#5A5A40]" />
          </motion.div>
          <span className="font-serif italic text-2xl tracking-tighter">Traveler</span>
        </div>

        <div className="flex items-center gap-6">
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
              <LogIn className="w-4 h-4" /> Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
