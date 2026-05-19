import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Shield, Award, Map, Rocket, Info, ChevronRight, Lock, Eye } from 'lucide-react';

interface AppGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AppGuideModal: React.FC<AppGuideModalProps> = ({ isOpen, onClose }) => {
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
            {/* Left: Video & Creative Side */}
            <div className="w-full md:w-3/5 bg-[#141414] relative overflow-hidden group">
              <div className="absolute inset-0 opacity-40">
                {/* Placeholder for video - in production, this would be your explaination video */}
                <iframe 
                  className="w-full h-full object-cover scale-110 blur-[2px] group-hover:blur-0 transition-all duration-700"
                  src="https://www.youtube.com/embed/PjG8pAdPnbU?autoplay=1&mute=1&controls=0&loop=1&playlist=PjG8pAdPnbU"
                  title="App Introduction"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                ></iframe>
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />
              
              <div className="absolute bottom-10 left-10 right-10">
                <div className="flex items-center gap-3 text-white/60 mb-4 px-1">
                  <Play className="w-4 h-4 fill-white/60" />
                  <span className="text-[10px] font-black uppercase tracking-[0.4em]">Introductory Film</span>
                </div>
                <h2 className="text-5xl font-serif italic text-white tracking-tighter mb-4">
                  Where <span className="text-[#0ea5e9]">History</span> Meets Discovery.
                </h2>
                <p className="text-white/40 text-sm max-w-md leading-relaxed">
                  Join a global network of architectural explorers. Preserve the past, discover the future, and earn your place among the legends.
                </p>
              </div>

              {/* Central Play Button Overlay */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none group-hover:scale-110 transition-transform duration-500">
                <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                  <Play className="w-8 h-8 text-white fill-white" />
                </div>
              </div>
            </div>

            {/* Right: Detailed Information */}
            <div className="w-full md:w-2/5 p-8 md:p-12 overflow-y-auto bg-[#f8f8f5]">
              <div className="flex justify-end mb-8">
                <button 
                  onClick={onClose}
                  className="p-3 hover:bg-[#141414]/5 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-12">
                {/* Motive Section */}
                <section>
                  <div className="flex items-center gap-3 text-[#0ea5e9] mb-4">
                    <Rocket className="w-5 h-5" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Our Motive</h3>
                  </div>
                  <p className="text-lg font-serif italic text-[#141414] leading-relaxed">
                    "The world is a book, and those who do not travel read only one page."
                  </p>
                  <p className="text-sm text-[#141414]/60 mt-4">
                    World Explorer was built to democratize geographical knowledge. We believe every hidden alleyway and ancient tower has a story that deserves to be archived for eternity.
                  </p>
                </section>

                {/* Functions Section */}
                <section>
                  <div className="flex items-center gap-3 text-[#5A5A40] mb-6">
                    <Map className="w-5 h-5" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">App Functions</h3>
                  </div>
                  <div className="space-y-4">
                    {[
                      { title: 'Interactive Geodata', desc: 'Real-time discovery via dynamic map exploration.' },
                      { title: 'AI Recommendation', desc: 'Smarter planning with Gemini-powered suggestions.' },
                      { title: 'Live Vibe Engine', desc: 'Instant local weather and atmospheric data syncing.' }
                    ].map((item, i) => (
                      <div key={i} className="flex gap-4 p-4 bg-white rounded-2xl border border-[#141414]/5">
                        <div className="w-2 h-2 rounded-full bg-[#5A5A40] mt-1.5 shrink-0" />
                        <div>
                          <div className="text-sm font-bold text-[#141414]">{item.title}</div>
                          <div className="text-xs text-[#141414]/40">{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Badge System Section */}
                <section>
                  <div className="flex items-center gap-3 text-red-500 mb-6">
                    <Award className="w-5 h-5" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">The Badge System</h3>
                  </div>
                  <p className="text-sm text-[#141414]/60 mb-4">
                    Earn XP (Experience Points) by contributing to the world archive.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                      <div className="text-xl font-serif italic text-red-900">50 XP</div>
                      <div className="text-[8px] font-black uppercase tracking-widest text-red-900/40">New Discovery</div>
                    </div>
                    <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                      <div className="text-xl font-serif italic text-red-900">10 XP</div>
                      <div className="text-[8px] font-black uppercase tracking-widest text-red-900/40">Community Insight</div>
                    </div>
                  </div>
                </section>

                {/* Security Section */}
                <section>
                  <div className="flex items-center gap-3 text-green-600 mb-6">
                    <Shield className="w-5 h-5" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Information Security</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <Lock className="w-4 h-4 text-green-600 mt-1" />
                      <div>
                        <div className="text-sm font-bold text-[#141414]">Military-Grade Auth</div>
                        <div className="text-xs text-[#141414]/40">Secured via Google Firebase Authentication encryption.</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <Eye className="w-4 h-4 text-green-600 mt-1" />
                      <div>
                        <div className="text-sm font-bold text-[#141414]">Server-Side Rules</div>
                        <div className="text-xs text-[#141414]/40">Firestore security rules prevent unauthorized data access.</div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Legal & AI Constraints Section */}
                <section>
                  <div className="flex items-center gap-3 text-amber-600 mb-6">
                    <Shield className="w-5 h-5" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Compliance & Safety</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 italic text-[11px] text-amber-900 leading-relaxed">
                      "Our AI systems are governed by strict ethical and legal protocols. They are technically barred from accessing private identifiers or modifying the core architecture of this application."
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-[#141414]/60">
                        <div className="w-1 h-1 rounded-full bg-amber-600" /> Strictly follows Global Data Policies
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-[#141414]/60">
                        <div className="w-1 h-1 rounded-full bg-amber-600" /> Zero tolerance for Data Leakage
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-[#141414]/60">
                        <div className="w-1 h-1 rounded-full bg-amber-600" /> Non-overridable Safety Instructions
                      </div>
                    </div>
                  </div>
                </section>

                <div className="pt-8 border-t border-[#141414]/5">
                   <button 
                    onClick={onClose}
                    className="w-full py-4 bg-[#141414] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                   >
                     Understood <ChevronRight className="w-4 h-4" />
                   </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AppGuideModal;
