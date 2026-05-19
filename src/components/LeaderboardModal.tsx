import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, X, Award, Star, TrendingUp, Users, Crown, Medal } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

interface LeaderboardUser {
  id: string;
  displayName: string;
  points: number;
  username: string;
  photoURL?: string;
}

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose }) => {
  const [leadingUsers, setLeadingUsers] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard();
    }
  }, [isOpen]);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      // Query the public_profiles collection which has broad read access
      const q = query(collection(db, 'public_profiles'), orderBy('points', 'desc'), limit(10));
      const snap = await getDocs(q);
      const users = snap.docs.map(d => ({ id: d.id, ...d.data() } as LeaderboardUser));
      setLeadingUsers(users);
    } catch (e) {
      console.error("Error fetching leaderboard:", e);
    } finally {
      setIsLoading(false);
    }
  };

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
            className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden border border-[#141414]/10"
          >
            <div className="p-10 md:p-14">
              <div className="flex justify-between items-start mb-12">
                <div>
                  <div className="flex items-center gap-3 text-[#141414] mb-2 px-1">
                    <div className="w-8 h-8 bg-[#141414] rounded-lg flex items-center justify-center shadow-sm">
                      <Trophy className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Season 04</span>
                  </div>
                  <h2 className="text-5xl font-serif italic tracking-tighter text-[#141414]">Exploration <span className="opacity-40">Leaders</span></h2>
                  <p className="text-sm text-[#141414]/40 mt-4 leading-relaxed max-w-sm">
                    Points are awarded for each architectural discovery shared, detailed archives created, and community engagements.
                  </p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-4 hover:bg-[#f5f5f0] rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 border-4 border-t-[#5A5A40] border-[#5A5A40]/10 rounded-full"
                  />
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-20">Syncing Data...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {leadingUsers.length > 0 ? (
                    leadingUsers.map((user, index) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        key={user.id} 
                        className={`flex items-center gap-6 p-4 rounded-3xl transition-all border ${
                          index === 0 
                            ? 'bg-[#141414] border-black text-white shadow-xl shadow-black/20' 
                            : 'bg-[#f8f8f5] border-[#141414]/5 hover:bg-white hover:border-[#141414]/10'
                        }`}
                      >
                        <div className="flex items-center justify-center w-12 h-12 font-serif italic text-2xl">
                          {index === 0 ? <Crown className="w-6 h-6 text-yellow-500" /> : index === 1 ? <Medal className="w-6 h-6 text-slate-400" /> : index === 2 ? <Medal className="w-6 h-6 text-amber-700" /> : `#${index + 1}`}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className={`text-lg font-bold truncate ${index === 0 ? 'text-white' : 'text-[#141414]'}`}>
                            {user.displayName || 'Anonymous Explorer'}
                          </div>
                          <div className={`text-[10px] font-medium tracking-widest uppercase truncate ${index === 0 ? 'text-white/40' : 'text-[#141414]/40'}`}>
                            {user.username || '@explorer'}
                          </div>
                        </div>

                        <div className="text-right flex flex-col items-end">
                          <div className={`text-xl font-serif italic ${index === 0 ? 'text-white' : 'text-[#141414]'}`}>
                            {user.points || 0}
                          </div>
                          <div className={`text-[8px] font-black uppercase tracking-widest ${index === 0 ? 'text-[#00af87]' : 'text-[#5A5A40]'}`}>
                            XP Points
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-20">
                       <Users className="w-12 h-12 mx-auto mb-4 opacity-10" />
                       <p className="text-sm font-serif italic opacity-30">No active explorers found in this region yet.</p>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-12 pt-10 border-t border-[#141414]/5 grid grid-cols-3 gap-6 text-center">
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
