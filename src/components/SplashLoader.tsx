import { motion } from 'motion/react';
import { Compass } from 'lucide-react';

export default function SplashLoader() {
  return (
    <div className="fixed inset-0 z-[100] bg-[#f5f5f0] flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative"
      >
        {/* Outer Orbit */}
        <div className="absolute inset-0 -m-4 border border-[#141414]/5 rounded-full animate-ping opacity-20" />
        
        {/* Main Compass Container */}
        <div className="bg-white p-8 rounded-full shadow-2xl border border-[#141414]/5 flex items-center justify-center relative bg-white overflow-hidden">
          {/* Subtle spinning background texture */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
            className="absolute inset-0 opacity-[0.03] flex items-center justify-center"
          >
            <Compass className="w-64 h-64" />
          </motion.div>

          {/* Actual Rotating Compass */}
          <motion.div
            animate={{ 
              rotate: [0, 90, 180, 270, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              rotate: { repeat: Infinity, duration: 4, ease: "easeInOut" },
              scale: { repeat: Infinity, duration: 2, ease: "easeInOut" }
            }}
          >
            <Compass className="w-16 h-16 text-[#5A5A40]" />
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mt-8 text-center"
      >
        <h1 className="font-serif italic text-3xl tracking-tighter mb-2">World <span className="text-[#5A5A40]">Explorer</span></h1>
        <div className="flex items-center gap-4 justify-center">
          <div className="w-12 h-[1px] bg-[#141414]/10" />
          <span className="text-[10px] uppercase tracking-[0.3em] font-black opacity-30">Calibrating Discovery</span>
          <div className="w-12 h-[1px] bg-[#141414]/10" />
        </div>
      </motion.div>
    </div>
  );
}
