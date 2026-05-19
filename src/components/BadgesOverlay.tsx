import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, Lock, Info } from 'lucide-react';
import { TRAVEL_BADGES } from '../constants/badges.tsx';
import React from 'react';

interface BadgesOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  stats: {
    saved: number;
    planned: number;
    archived: number;
    contributed: number;
  };
}

export default function BadgesOverlay({ isOpen, onClose, stats }: BadgesOverlayProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 overflow-hidden"
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
            className="relative w-full max-w-4xl max-h-[85vh] bg-white rounded-[40px] shadow-2xl border border-[#141414]/5 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-8 border-b border-[#141414]/5 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="font-serif italic text-3xl tracking-tight leading-none">Achievement Hold</h2>
                  <p className="text-xs uppercase tracking-widest font-black opacity-30 mt-1">27 Mythical Collectibles</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full hover:bg-[#141414]/5 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-12">
              {['discovery', 'planning', 'social', 'explorer'].map((category) => {
                const categoryBadges = TRAVEL_BADGES.filter(b => b.category === category);
                return (
                  <div key={category} className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                       <div className="h-px flex-1 bg-[#141414]/5" />
                       <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 whitespace-nowrap">
                         {category} Badges
                       </h3>
                       <div className="h-px flex-1 bg-[#141414]/5" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
                            
                            <div className="text-center">
                              <div className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">
                                {badge.name}
                              </div>
                              <div className="text-[8px] opacity-40 font-medium px-2 leading-tight">
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

            {/* Footer */}
            <div className="p-6 bg-[#f8f8f5] border-t border-[#141414]/5 flex items-center justify-center gap-4">
               <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-[#141414]/5 shadow-sm">
                  <Info className="w-3 h-3 opacity-40" />
                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">Earn badges by sharing discoveries and planning tours</span>
               </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
