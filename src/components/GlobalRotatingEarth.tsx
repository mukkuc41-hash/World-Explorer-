import React from 'react';
import { motion } from 'motion/react';
import { Globe } from 'lucide-react';

interface GlobalRotatingEarthProps {
  speed?: number;
}

const GlobalRotatingEarth: React.FC<GlobalRotatingEarthProps> = ({ speed = 1.0 }) => {
  // Compute dynamic speeds
  const rotateDuration1 = speed <= 0 ? 9999999 : 160 / speed;
  const rotateDuration2 = speed <= 0 ? 9999999 : 240 / speed;
  const rotateDuration3 = speed <= 0 ? 9999999 : 400 / speed;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 opacity-[0.2] md:opacity-[0.15] select-none">
      <motion.div
        animate={{ 
          rotate: 360,
          scale: [1, 1.1, 1],
        }}
        transition={{ 
          rotate: { duration: rotateDuration1, repeat: Infinity, ease: "linear" },
          scale: { duration: 30, repeat: Infinity, ease: "easeInOut" }
        }}
        className="absolute -bottom-64 -right-64 w-[1000px] h-[1000px] flex items-center justify-center blur-[1px]"
      >
        <Globe className="w-full h-full text-[#0ea5e9]" strokeWidth={0.2} />
      </motion.div>

      <motion.div
        animate={{ 
          rotate: -360,
          scale: [1.1, 1, 1.1],
        }}
        transition={{ 
          rotate: { duration: rotateDuration2, repeat: Infinity, ease: "linear" },
          scale: { duration: 40, repeat: Infinity, ease: "easeInOut" }
        }}
        className="absolute -top-48 -left-48 w-[800px] h-[800px] flex items-center justify-center blur-[2px]"
      >
        <Globe className="w-full h-full text-[#10b981]" strokeWidth={0.15} />
      </motion.div>
      
      {/* Central large faint one - higher scale and slower rotation */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1400px] h-[1400px] opacity-[0.2]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: rotateDuration3, repeat: Infinity, ease: "linear" }}
          className="w-full h-full flex items-center justify-center"
        >
          <Globe className="w-full h-full text-[#0369a1]" strokeWidth={0.03} />
        </motion.div>
      </div>

      {/* Atmospheric glow effects - adding some variety */}
      <div className="absolute -bottom-48 -right-48 w-[800px] h-[800px] bg-cyan-500/5 blur-[120px] rounded-full" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-indigo-500/5 blur-[160px] rounded-full" />
      <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-emerald-500/5 blur-[120px] rounded-full" />
    </div>
  );
};

export default GlobalRotatingEarth;
