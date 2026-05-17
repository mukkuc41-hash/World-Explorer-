import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, MapPin, Loader2, Share2, Heart } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface PlaceDetailsModalProps {
  placeName: string;
  isOpen: boolean;
  onClose: () => void;
  details: {
    description: string;
    imageUrl: string;
  } | null;
  loading: boolean;
}

export default function PlaceDetailsModal({ placeName, isOpen, onClose, details, loading }: PlaceDetailsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#141414]/90 backdrop-blur-xl"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-5xl bg-white rounded-[48px] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
          >
            {/* Image Side */}
            <div className="md:w-1/2 relative h-[300px] md:h-auto bg-[#f8f8f5]">
              {details?.imageUrl ? (
                <img 
                  src={details.imageUrl.startsWith('http') ? `${details.imageUrl}&w=1000&q=80` : details.imageUrl} 
                  alt={placeName}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${loading && !details.description ? 'opacity-40 grayscale' : 'opacity-100'}`}
                />
              ) : loading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#f8f8f5]">
                  <div className="w-16 h-16 rounded-full border-4 border-[#00af87]/20 border-t-[#00af87] animate-spin" />
                  <p className="text-[10px] uppercase font-black tracking-widest opacity-30">Generating Vision...</p>
                </div>
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-12 left-12">
                <div className="flex items-center gap-2 text-white/60 text-[10px] uppercase font-black tracking-[0.2em] mb-4">
                   <Sparkles className="w-3 h-3 text-[#34D399]" /> AI Imagined
                </div>
                <h2 className="text-white text-4xl md:text-6xl font-bold tracking-tighter leading-none">
                  {placeName}
                </h2>
              </div>
            </div>

            {/* Content Side */}
            <div className="md:w-1/2 p-8 md:p-16 overflow-y-auto bg-white flex flex-col">
               <div className="flex items-center justify-between mb-12">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-20">
                     <MapPin className="w-3 h-3" /> Hidden Gem
                  </div>
                  <button 
                    onClick={onClose}
                    className="p-3 bg-[#f8f8f5] rounded-full hover:bg-[#141414] hover:text-white transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
               </div>

               <div className="flex-1">
                 {loading ? (
                   <div className="space-y-6">
                      <div className="h-8 bg-[#f8f8f5] rounded-xl w-3/4 animate-pulse" />
                      <div className="space-y-3">
                         <div className="h-4 bg-[#f8f8f5] rounded-lg w-full animate-pulse" />
                         <div className="h-4 bg-[#f8f8f5] rounded-lg w-5/6 animate-pulse" />
                         <div className="h-4 bg-[#f8f8f5] rounded-lg w-full animate-pulse" />
                         <div className="h-4 bg-[#f8f8f5] rounded-lg w-4/5 animate-pulse" />
                      </div>
                   </div>
                 ) : details ? (
                   <div className="prose prose-sm max-w-none">
                     <div className="markdown-body text-xl md:text-2xl font-serif italic leading-relaxed text-[#141414]/80">
                        <ReactMarkdown>
                          {details.description}
                        </ReactMarkdown>
                     </div>
                   </div>
                 ) : null}
               </div>

               <div className="mt-12 pt-12 border-t border-[#141414]/5 flex items-center justify-between">
                  <div className="flex gap-4">
                     <button className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#141414] text-white text-xs font-bold hover:scale-105 transition-all">
                        Plan Visit
                     </button>
                     <button className="p-3 rounded-full border border-[#141414]/5 hover:bg-[#f8f8f5] transition-all">
                        <Share2 className="w-5 h-5" />
                     </button>
                  </div>
                  <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#00af87]">
                     <Heart className="w-4 h-4" /> Save to Archive
                  </button>
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
