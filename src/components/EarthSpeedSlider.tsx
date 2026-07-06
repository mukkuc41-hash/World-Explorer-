import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Play, Pause, FastForward, Gauge, Move, RefreshCw } from 'lucide-react';

interface EarthSpeedSliderProps {
  speed: number;
  onChangeSpeed: (newSpeed: number) => void;
}

export default function EarthSpeedSlider({ speed, onChangeSpeed }: EarthSpeedSliderProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.1}
      whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
      className="fixed bottom-6 left-6 z-[95] select-none"
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1 }}
    >
      <div className="relative group">
        {/* Ambient neon gradient back-glow */}
        <div className="absolute inset-0 bg-cyan-500/10 dark:bg-cyan-500/20 blur-2xl rounded-3xl opacity-75 group-hover:opacity-100 transition-all duration-300 pointer-events-none" />

        <div className="relative bg-white/80 dark:bg-stone-900/90 backdrop-blur-xl border border-stone-200/50 dark:border-white/10 p-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] max-w-[280px] sm:max-w-[320px] transition-all">
          
          {/* Header & Grab Handle */}
          <div className="flex items-center justify-between gap-4 pb-2.5 mb-2.5 border-b border-stone-200/50 dark:border-white/5 cursor-grab active:cursor-grabbing">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#5A5A40]/10 dark:bg-cyan-500/10 rounded-xl text-[#5A5A40] dark:text-cyan-400">
                <Globe className={`w-4 h-4 ${speed > 0 ? 'animate-spin' : ''}`} style={{ animationDuration: speed > 0 ? `${12 / speed}s` : '0s' }} />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#5A5A40]/50 dark:text-stone-400/50">SYSTEM CORE</span>
                <h4 className="text-xs font-black uppercase tracking-wider text-stone-800 dark:text-stone-200">Orbit Controller</h4>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-mono opacity-40 uppercase mr-1 flex items-center gap-0.5">
                <Move className="w-2.5 h-2.5" /> DRAG
              </span>
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 rounded-lg hover:bg-stone-200/50 dark:hover:bg-white/5 transition-colors text-stone-500 dark:text-stone-400"
              >
                <span className="text-[10px] font-bold px-1">{isExpanded ? 'Hide' : 'Show'}</span>
              </button>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-3.5"
              >
                {/* Speed Dial Visual HUD */}
                <div className="flex items-center justify-between bg-stone-100/60 dark:bg-stone-950/60 p-2.5 rounded-2xl border border-stone-200/20">
                  <div className="flex items-center gap-2 text-[10px] font-mono text-stone-600 dark:text-stone-400">
                    <Gauge className="w-3.5 h-3.5 text-cyan-500" />
                    <span>VELOCITY STATUS:</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black font-mono text-[#5A5A40] dark:text-cyan-400 tracking-wider">
                      {speed === 0 ? 'STATIC' : `${speed.toFixed(1)}x`}
                    </span>
                  </div>
                </div>

                {/* Range Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] font-mono opacity-50">
                    <span>PAUSE</span>
                    <span>1.0x (DEFAULT)</span>
                    <span>5.0x</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={speed}
                    onChange={(e) => onChangeSpeed(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-stone-200 dark:bg-stone-800 rounded-lg appearance-none cursor-pointer accent-[#5A5A40] dark:accent-cyan-400"
                  />
                </div>

                {/* Quick Presets Grid */}
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => onChangeSpeed(0)}
                    className={`flex flex-col items-center justify-center p-1.5 rounded-xl border text-[9px] font-bold uppercase transition-all ${
                      speed === 0
                        ? 'bg-stone-950 text-white border-transparent'
                        : 'bg-stone-100 dark:bg-stone-800/40 border-stone-200/50 dark:border-white/5 hover:bg-stone-200/40 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <Pause className="w-3.5 h-3.5 mb-1" />
                    <span>0x</span>
                  </button>
                  <button
                    onClick={() => onChangeSpeed(1.0)}
                    className={`flex flex-col items-center justify-center p-1.5 rounded-xl border text-[9px] font-bold uppercase transition-all ${
                      speed === 1.0
                        ? 'bg-[#5A5A40] text-white border-transparent'
                        : 'bg-stone-100 dark:bg-stone-800/40 border-stone-200/50 dark:border-white/5 hover:bg-stone-200/40 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 mb-1" />
                    <span>1x</span>
                  </button>
                  <button
                    onClick={() => onChangeSpeed(2.5)}
                    className={`flex flex-col items-center justify-center p-1.5 rounded-xl border text-[9px] font-bold uppercase transition-all ${
                      speed === 2.5
                        ? 'bg-[#5A5A40] text-white border-transparent'
                        : 'bg-stone-100 dark:bg-stone-800/40 border-stone-200/50 dark:border-white/5 hover:bg-stone-200/40 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <FastForward className="w-3.5 h-3.5 mb-1" />
                    <span>2.5x</span>
                  </button>
                  <button
                    onClick={() => onChangeSpeed(5.0)}
                    className={`flex flex-col items-center justify-center p-1.5 rounded-xl border text-[9px] font-bold uppercase transition-all ${
                      speed === 5.0
                        ? 'bg-cyan-500 text-black font-black border-transparent shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                        : 'bg-stone-100 dark:bg-stone-800/40 border-stone-200/50 dark:border-white/5 hover:bg-stone-200/40 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5 mb-1 animate-pulse" />
                    <span>5x</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
