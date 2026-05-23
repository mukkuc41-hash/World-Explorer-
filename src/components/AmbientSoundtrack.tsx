import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Music, Waves, HelpCircle, Wind, Sun, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SoundtrackProps {
  onSoundStateChange?: (isPlaying: boolean) => void;
}

type SoundPreset = 'himalayas' | 'horizon' | 'ruins' | 'sea';

interface PresetItem {
  id: SoundPreset;
  name: string;
  desc: string;
  color: string;
  icon: any;
}

const PRESETS: PresetItem[] = [
  {
    id: 'himalayas',
    name: 'Misty Himalayas',
    desc: 'Lush zen chords playing slow, meditative pentatonic harmonies.',
    color: '#5A5A40',
    icon: Compass
  },
  {
    id: 'horizon',
    name: 'Ethereal Horizon',
    desc: 'Deep warm resonant synth drones with slow cosmic sweeps.',
    color: '#00af87',
    icon: Sun
  },
  {
    id: 'ruins',
    name: 'Ancient Ruins',
    desc: 'Echoing wind whistling through stone structures and soft gongs.',
    color: '#8c7a6b',
    icon: Wind
  },
  {
    id: 'sea',
    name: 'Serene Sea',
    desc: 'Procedural white & pink noise shaped to sound like sea waves.',
    color: '#3482b5',
    icon: Waves
  }
];

export default function AmbientSoundtrack({ onSoundStateChange }: SoundtrackProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activePreset, setActivePreset] = useState<SoundPreset>('himalayas');
  const [volume, setVolume] = useState(0.4);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Audio nodes and context refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mainGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const activeNodesRef = useRef<any[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const intervalRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize Audio Context lazily on user request
  const initAudio = () => {
    if (audioCtxRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const mainGain = ctx.createGain();
      mainGain.gain.setValueAtTime(volume, ctx.currentTime);
      mainGain.connect(ctx.destination);
      mainGainRef.current = mainGain;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.connect(mainGain);
      analyserRef.current = analyser;
    } catch (e) {
      console.error('Web Audio API not supported details:', e);
    }
  };

  // Safe volume changer
  useEffect(() => {
    if (mainGainRef.current && audioCtxRef.current) {
      const tgtVol = isMuted ? 0 : volume;
      mainGainRef.current.gain.linearRampToValueAtTime(tgtVol, audioCtxRef.current.currentTime + 0.1);
    }
  }, [volume, isMuted]);

  // Handle active preset changes or playing/stopping sound
  useEffect(() => {
    if (isPlaying) {
      startSoundtrack();
    } else {
      stopSoundtrack();
    }
    onSoundStateChange?.(isPlaying);

    return () => {
      stopSoundtrack();
    };
  }, [isPlaying, activePreset]);

  // Renders visualizer
  useEffect(() => {
    if (isPlaying) {
      startVisualizer();
    } else {
      stopVisualizer();
    }
    return () => {
      stopVisualizer();
    };
  }, [isPlaying]);

  // Clean-up on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const stopSoundtrack = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    activeNodesRef.current.forEach(node => {
      try {
        node.stop();
      } catch (e) {}
    });
    activeNodesRef.current = [];
  };

  // Start sound generation based on preset
  const startSoundtrack = () => {
    initAudio();
    stopSoundtrack();

    const ctx = audioCtxRef.current;
    const dest = analyserRef.current;
    if (!ctx || !dest) return;

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    if (activePreset === 'himalayas') {
      playZenPads(ctx, dest);
    } else if (activePreset === 'horizon') {
      playCosmicDrone(ctx, dest);
    } else if (activePreset === 'ruins') {
      playAncientWind(ctx, dest);
    } else if (activePreset === 'sea') {
      playOceanWaves(ctx, dest);
    }
  };

  // 1. Zen Pads preset: Slow swelling chord progression in A minor pentatonic scale (A3, C4, D4, E4, G4, A4)
  const playZenPads = (ctx: AudioContext, dest: AudioNode) => {
    const scales = [
      [110.00, 164.81, 220.00, 261.63, 329.63, 392.00], // Am7 / Am pentatonic
      [130.81, 164.81, 196.00, 261.63, 329.63, 392.00], // C Maj
      [98.00, 146.83, 196.00, 246.94, 293.66, 392.00]   // G Maj
    ];

    let chordIdx = 0;

    const triggerChord = () => {
      const scale = scales[chordIdx];
      chordIdx = (chordIdx + 1) % scales.length;

      // Select 3 random notes from the current scale
      const notes = [...scale].sort(() => 0.5 - Math.random()).slice(0, 3);
      
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = Math.random() > 0.5 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        filter.type = 'lowpass';
        // Evolving filter frequency
        filter.frequency.setValueAtTime(150 + Math.random() * 500, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(800 + Math.random() * 1000, ctx.currentTime + 4.0);
        filter.Q.setValueAtTime(1, ctx.currentTime);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        // Beautiful volume swells
        const attack = 2.0 + idx * 0.8 + Math.random() * 2;
        const sustain = 3.0 + Math.random() * 3;
        const release = 4.0 + Math.random() * 2;

        gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + attack);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + attack + sustain);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + attack + sustain + release);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(dest);

        try {
          osc.start();
          activeNodesRef.current.push(osc);
          osc.stop(ctx.currentTime + attack + sustain + release);
        } catch (e) {}
      });
    };

    // Trigger instantly then periodically
    triggerChord();
    intervalRef.current = setInterval(triggerChord, 8000);
  };

  // 2. Cosmic Drone preset: Resonant overlapping detuned saw waves at extreme low-pass with dynamic chorus sweeps
  const playCosmicDrone = (ctx: AudioContext, dest: AudioNode) => {
    // Ground drone roots
    const baseFreqs = [55.00, 110.00, 164.81]; // Low A, Octave A, and High E E5 resonant node
    
    baseFreqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const detuneOsc = ctx.createOscillator();
      const detuneGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 0.4, ctx.currentTime);

      // Low frequency oscillator (LFO) to sweep detuning
      detuneOsc.frequency.setValueAtTime(0.05 + i * 0.02, ctx.currentTime);
      detuneGain.gain.setValueAtTime(8, ctx.currentTime); // Modulation depth

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(80 + i * 70, ctx.currentTime);
      filter.Q.setValueAtTime(1.5, ctx.currentTime);

      // Simple constant low volumes for pads/drones
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 4.0);

      detuneOsc.connect(detuneGain);
      detuneGain.connect(osc.detune);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      try {
        osc.start();
        detuneOsc.start();
        activeNodesRef.current.push(osc, detuneOsc);
      } catch (e) {}
    });

    // Slow filter sweeper
    let goingUp = true;
    const lfoFilterInterval = setInterval(() => {
      const targetFreq = goingUp ? 350 : 100;
      goingUp = !goingUp;
      activeNodesRef.current.forEach(node => {
        if (node.type === 'sawtooth') {
          // Find filter attached
        }
      });
    }, 15000);

    // Save interval to handle cleanup
    intervalRef.current = lfoFilterInterval;
  };

  // 3. Ancient Wind & Bells preset: Bandpass noise for wind howling and resonant metal strikes (gongs) at slow periods
  const playAncientWind = (ctx: AudioContext, dest: AudioNode) => {
    // Create direct white noise source buffer
    const bufferSize = ctx.sampleRate * 2; // 2 seconds of noise loop
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, ctx.currentTime);
    filter.Q.setValueAtTime(2.5, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, ctx.currentTime);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    try {
      noiseSource.start();
      activeNodesRef.current.push(noiseSource);
    } catch (e) {}

    // Wind modulation
    let toggle = true;
    const windTimer = setInterval(() => {
      const nextFreq = toggle ? 180 + Math.random() * 400 : 300 + Math.random() * 500;
      const nextQ = toggle ? 1.5 + Math.random() * 2 : 2.0 + Math.random() * 3;
      toggle = !toggle;

      filter.frequency.exponentialRampToValueAtTime(nextFreq, ctx.currentTime + 4.0);
      filter.Q.exponentialRampToValueAtTime(nextQ, ctx.currentTime + 4.0);
    }, 5000);

    // Random Bell/Gong triggers (Ancient temples atmosphere)
    const bellFrequencies = [220.00, 329.63, 440.00, 523.25, 659.25];
    const bellTimer = setInterval(() => {
      if (Math.random() > 0.4) {
        const freq = bellFrequencies[Math.floor(Math.random() * bellFrequencies.length)];
        
        // Bell sound setup: high resonance sine waves with fast attack and very slow exponential decay
        const bellOsc = ctx.createOscillator();
        const bellFilter = ctx.createBiquadFilter();
        const bellGain = ctx.createGain();

        bellOsc.type = 'sine';
        bellOsc.frequency.setValueAtTime(freq, ctx.currentTime);

        bellFilter.type = 'highpass';
        bellFilter.frequency.setValueAtTime(80, ctx.currentTime);

        bellGain.gain.setValueAtTime(0, ctx.currentTime);
        bellGain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.05);
        bellGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 6.0);

        bellOsc.connect(bellFilter);
        bellFilter.connect(bellGain);
        bellGain.connect(dest);

        try {
          bellOsc.start();
          bellOsc.stop(ctx.currentTime + 7.0);
        } catch (e) {}
      }
    }, 4500);

    // Clean up both timers in a custom wrapper
    intervalRef.current = {
      close: () => {
        clearInterval(windTimer);
        clearInterval(bellTimer);
      }
    };
  };

  // 4. Ocean Waves preset: Filtered low bandpass noise sweeping between 50Hz and 180Hz smoothly in 6s cycles
  const playOceanWaves = (ctx: AudioContext, dest: AudioNode) => {
    // Generate pink-ish noise buffer
    const bufferSize = ctx.sampleRate * 4;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    // Pink noise approximation
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.11; // normalization
      b6 = white * 0.115926;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(100, ctx.currentTime);
    filter.Q.setValueAtTime(1.0, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 3.0);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    try {
      noiseSource.start();
      activeNodesRef.current.push(noiseSource);
    } catch (e) {}

    // Clean simulation of regular wave swells
    let isSwell = true;
    const wavesModulator = setInterval(() => {
      const targetVolume = isSwell ? 0.22 : 0.05;
      const targetCutoff = isSwell ? 320 : 100;
      isSwell = !isSwell;

      if (ctx.state !== 'closed') {
        filter.frequency.exponentialRampToValueAtTime(targetCutoff, ctx.currentTime + 5.5);
        gain.gain.linearRampToValueAtTime(targetVolume, ctx.currentTime + 5.5);
      }
    }, 6000);

    intervalRef.current = wavesModulator;
  };

  // Start rendering beautiful canvas frequency peaks
  const startVisualizer = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);

      const canvas = canvasRef.current;
      const analyser = analyserRef.current;
      if (!canvas || !analyser) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Draw graceful procedural glowing lines based on current volume and frequencies
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = PRESETS.find(p => p.id === activePreset)?.color || '#5A5A40';

      ctx.beginPath();
      const sliceWidth = width / (bufferLength - 4);
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        // Map frequency response smoothly
        const val = dataArray[i] / 255.0;
        const y = height / 2 + (val * (height - 8) * Math.sin(x * 0.05 + Date.now() * 0.003) * 0.5);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Soft particles jumping over coordinates
      ctx.fillStyle = ctx.strokeStyle;
      for (let i = 0; i < 4; i++) {
        const bin = Math.min(bufferLength - 1, Math.floor((i + 1) * (bufferLength / 5)));
        const amp = dataArray[bin] / 255.0;
        if (amp > 0.2) {
          ctx.beginPath();
          ctx.arc(
            15 + i * (width / 4) + Math.cos(Date.now() * 0.004 + i) * 6, 
            height / 2 + Math.sin(Date.now() * 0.003 + i) * 8 * amp, 
            1.5 + amp * 2.5, 
            0, 
            Math.PI * 2
          );
          ctx.fill();
        }
      }
    };

    draw();
  };

  const stopVisualizer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const currentPresetInfo = PRESETS.find(p => p.id === activePreset)!;
  const ActiveIcon = currentPresetInfo.icon;

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.1}
      whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
      className="fixed bottom-6 left-6 z-[90] flex flex-col items-start gap-3 pointer-events-auto select-none"
      title="Drag Sound Controller anywhere!"
    >
      
      {/* Expanded Sound Dashboard */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="w-80 bg-[#fbfbfa]/95 backdrop-blur-xl border border-[#141414]/10 rounded-[32px] p-6 shadow-2xl pointer-events-auto flex flex-col gap-5 text-left text-[#141414] select-none"
            id="soundtrack-dashboard"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#141414] rounded-xl text-white">
                  <Music className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-serif italic font-bold">Ambient Soundtrack</h4>
                  <p className="text-[8px] uppercase tracking-wider opacity-40 font-black">Evolving Explorer Music</p>
                </div>
              </div>
              <button 
                onClick={() => setIsExpanded(false)}
                className="p-1 px-2 text-xs font-serif italic hover:bg-[#141414]/5 rounded-lg opacity-50 hover:opacity-100 transition-all"
              >
                hide
              </button>
            </div>

            {/* Visualizer Canvas */}
            <div className="h-10 bg-[#141414]/5 rounded-2xl flex items-center justify-center p-3 relative overflow-hidden border border-[#141414]/5">
              <canvas ref={canvasRef} width={280} height={40} className="w-full h-full" />
              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black uppercase tracking-widest opacity-25">
                  Soundtrack Paused
                </div>
              )}
            </div>

            {/* Track preset choices */}
            <div className="flex flex-col gap-2">
              <div className="text-[9px] uppercase tracking-widest font-black opacity-30 px-1 mb-1">Select Sonic Atmosphere</div>
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((preset) => {
                  const IconComp = preset.icon;
                  const isPresetSelected = activePreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => {
                        setActivePreset(preset.id);
                        if (!isPlaying) setIsPlaying(true);
                      }}
                      className={`flex flex-col items-start gap-1 p-3 rounded-2xl transition-all border text-left cursor-pointer ${
                        isPresetSelected 
                          ? 'bg-white shadow-md border-[#141414]/20' 
                          : 'border-transparent hover:bg-[#141414]/5'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: preset.color }} />
                        <span className="font-serif italic text-xs font-bold">{preset.name.split(' ')[0]}</span>
                      </div>
                      <span className="text-[9px] opacity-40 line-clamp-1 leading-snug">{preset.name.split(' ').slice(1).join(' ')}</span>
                    </button>
                  );
                })}
              </div>
              
              <div className="bg-[#141414]/5 p-3 rounded-2xl text-[10px] text-[#141414]/75 italic leading-relaxed mt-1">
                {currentPresetInfo.desc}
              </div>
            </div>

            {/* Volume/Actions Slider */}
            <div className="flex items-center gap-4 border-t border-[#141414]/5 pt-4">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 hover:bg-[#141414]/5 rounded-xl transition-colors shrink-0"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-500" />
                ) : (
                  <Volume2 className="w-4 h-4 text-[#5A5A40]" />
                )}
              </button>
              
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => {
                    setVolume(parseFloat(e.target.value));
                    if (isMuted) setIsMuted(false);
                  }}
                  className="w-full accent-[#5A5A40] opacity-70 hover:opacity-100 transition-opacity cursor-pointer h-1.5 rounded-lg bg-gray-200"
                />
                <span className="font-mono text-[9px] opacity-40 w-6 text-right">
                  {Math.round(volume * 100)}%
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Floating Music Button */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <button
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onClick={() => {
            setIsPlaying(!isPlaying);
            initAudio();
          }}
          className={`h-14 w-14 rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-110 active:scale-95 group relative border border-[#141414]/5 ${
            isPlaying ? 'bg-white text-[#141414]' : 'bg-[#141414] text-white hover:bg-[#333]'
          }`}
          title="Toggle Ambient Soundtrack"
          id="soundtrack-play-toggle"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-[#5A5A40]" />
          ) : (
            <Play className="w-5 h-5 translate-x-0.5 text-white" />
          )}

          {/* Evolving background ripple during play */}
          {isPlaying && (
            <span className="absolute inset-0 rounded-full border-2 border-dashed border-[#5A5A40]/30 animate-spin" style={{ animationDuration: '8s' }} />
          )}
        </button>

        {/* Dashboard Expansion Control */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`h-11 w-11 flex items-center justify-center rounded-full shadow-lg border border-[#141414]/5 transition-all hover:scale-110 active:scale-95 ${
            isExpanded 
              ? 'bg-[#141414] text-white' 
              : 'bg-white text-[#141414] hover:bg-[#f5f5f0]'
          }`}
          id="soundtrack-preset-toggle"
          title="Sonic Atmosphere Settings"
        >
          <ActiveIcon className="w-4 h-4" style={{ color: isPlaying ? currentPresetInfo.color : undefined }} />
        </button>

        {/* Tooltip hint on hover */}
        <AnimatePresence>
          {showTooltip && !isExpanded && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="absolute left-36 bg-[#141414] text-white text-[10px] uppercase font-black tracking-widest py-1.5 px-3 rounded-lg shadow-md whitespace-nowrap hidden md:block"
            >
              {isPlaying ? 'Pause soundtrack' : 'Play organic ambient music'}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </motion.div>
  );
}
