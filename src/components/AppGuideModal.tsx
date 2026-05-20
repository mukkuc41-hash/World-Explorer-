import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Shield, Award, Map, Rocket, Info, ChevronRight, Lock, Eye, Compass } from 'lucide-react';

interface AppGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AppGuideModal: React.FC<AppGuideModalProps> = ({ isOpen, onClose }) => {
  const [page, setPage] = React.useState(1);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#141414]/90 backdrop-blur-xl"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-5xl h-[85vh] bg-white rounded-[48px] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white/20"
          >
            {/* Left: Visual Media Side */}
            <div className="w-full md:w-3/5 bg-[#141414] relative overflow-hidden group">
              <div className="absolute inset-0 opacity-60">
                <iframe 
                  className="w-full h-full object-cover scale-110 pointer-events-none"
                  src="https://www.youtube.com/embed/PjG8pAdPnbU?autoplay=1&mute=1&controls=0&loop=1&playlist=PjG8pAdPnbU&showinfo=0&rel=0"
                  title="App Introduction"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                ></iframe>
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/20 to-transparent" />
              
              <div className="absolute bottom-10 left-10 right-10">
                <div className="flex items-center gap-3 text-white/60 mb-4 px-1">
                  <Play className="w-4 h-4 fill-white/60" />
                  <span className="text-[10px] font-black uppercase tracking-[0.4em]">
                    {page === 1 ? 'Page 1: The Vision' : 'Page 2: The Logic'}
                  </span>
                </div>
                <h2 className="text-5xl font-serif italic text-white tracking-tighter mb-4 leading-tight">
                  {page === 1 ? (
                    <>Where <span className="text-[#0ea5e9]">History</span> Meets Discovery.</>
                  ) : (
                    <>Archiving <span className="text-green-500">Humanity's</span> Footprint.</>
                  )}
                </h2>
                <p className="text-white/40 text-sm max-w-sm leading-relaxed">
                  {page === 1 
                    ? "Welcome to World Explorer. Our platform uses state-of-the-art AI to help you discover architectural wonders across seven continents."
                    : "Every entry you contribute is verified and archived. Earn badges, climb the leaderboard, and become a legendary explorer."}
                </p>
                
                <div className="mt-8 flex gap-2">
                  <div className={`h-1 rounded-full transition-all duration-300 ${page === 1 ? 'w-8 bg-white' : 'w-2 bg-white/20'}`} />
                  <div className={`h-1 rounded-full transition-all duration-300 ${page === 2 ? 'w-8 bg-white' : 'w-2 bg-white/20'}`} />
                </div>
              </div>
            </div>

            {/* Right: Informational Side */}
            <div className="w-full md:w-2/5 p-8 md:p-12 overflow-y-auto bg-[#f8f8f5] flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-12">
                  <div className="flex items-center gap-2">
                     <div className="w-8 h-8 rounded-lg bg-[#141414] flex items-center justify-center">
                        <Compass className="w-4 h-4 text-white" />
                     </div>
                     <span className="text-[10px] font-black uppercase tracking-widest opacity-20">Guide v4.0</span>
                  </div>
                  <button 
                    onClick={onClose}
                    className="p-3 hover:bg-[#141414]/5 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {page === 1 ? (
                    <motion.div
                      key="page1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-10"
                    >
                      <section>
                        <div className="flex items-center gap-3 text-[#0ea5e9] mb-4">
                          <Rocket className="w-5 h-5" />
                          <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Our Motive</h3>
                        </div>
                        <p className="text-lg font-serif italic text-[#141414] leading-relaxed">
                          "The world is a book, and those who do not travel read only one page."
                        </p>
                        <p className="text-sm text-[#141414]/60 mt-4 leading-relaxed">
                          World Explorer was built to democratize geographical knowledge. We believe every hidden alleyway deserves to be archived for eternity.
                        </p>
                      </section>

                      <section>
                        <div className="flex items-center gap-3 text-[#5A5A40] mb-6">
                          <Map className="w-5 h-5" />
                          <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Core Functions</h3>
                        </div>
                        <div className="space-y-3">
                          {[
                            { title: 'Interactive Geodata', desc: 'Real-time map exploration.' },
                            { title: 'AI Recommendation', desc: 'Gemini-powered location insights.' },
                            { title: 'Live Vibe Engine', desc: 'Instant local weather and atmosphere.' }
                          ].map((item, i) => (
                            <div key={i} className="flex gap-4 p-4 bg-white rounded-2xl border border-[#141414]/5 shadow-sm">
                              <div className="w-2 h-2 rounded-full bg-[#5A5A40] mt-1.5 shrink-0" />
                              <div>
                                <div className="text-sm font-bold text-[#141414]">{item.title}</div>
                                <div className="text-[11px] text-[#141414]/40">{item.desc}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="page2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-10"
                    >
                      <section>
                        <div className="flex items-center gap-3 text-red-500 mb-6">
                          <Award className="w-5 h-5" />
                          <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">The Badge System</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex justify-between items-center">
                            <div>
                              <div className="text-[10px] font-bold text-red-900 uppercase tracking-widest">Discovery</div>
                              <div className="text-xs text-red-900/60">Contribute new gems</div>
                            </div>
                            <div className="text-2xl font-serif italic text-red-900">+50 XP</div>
                          </div>
                          <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex justify-between items-center">
                            <div>
                              <div className="text-[10px] font-bold text-red-900 uppercase tracking-widest">Community Insight</div>
                              <div className="text-xs text-red-900/60">Write helpful reviews</div>
                            </div>
                            <div className="text-2xl font-serif italic text-red-900">+10 XP</div>
                          </div>
                        </div>
                      </section>

                      <section>
                        <div className="flex items-center gap-3 text-green-600 mb-6">
                          <Shield className="w-5 h-5" />
                          <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Security & Safety</h3>
                        </div>
                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 italic text-[11px] text-amber-900 leading-relaxed mb-4">
                          "Our AI systems are governed by strict ethical and legal protocols. They are technically barred from accessing private identifiers."
                        </div>
                        <div className="space-y-2">
                           <div className="flex items-center gap-2 text-[10px] font-bold text-[#141414]/60">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" /> Military-Grade Firebase Encryption
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-[#141414]/60">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" /> Secure Server-Side Firestore Rules
                          </div>
                        </div>
                      </section>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="pt-8 flex gap-4">
                {page === 1 ? (
                  <button 
                    onClick={() => setPage(2)}
                    className="w-full py-4 bg-[#141414] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-xl"
                  >
                    Next Page <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex gap-4 w-full">
                    <button 
                      onClick={() => setPage(1)}
                      className="w-1/3 py-4 border border-[#141414]/10 rounded-2xl font-bold text-[11px] uppercase tracking-widest"
                    >
                      Back
                    </button>
                    <button 
                      onClick={onClose}
                      className="w-2/3 py-4 bg-[#00af87] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-xl"
                    >
                      Start Exploring <Rocket className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AppGuideModal;
