import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, MapPin, Loader2, Share2, Heart, Trash2, CalendarCheck, Calendar, Bookmark } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { doc, updateDoc, deleteDoc, setDoc, query, collection, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import ReviewSection from './ReviewSection.tsx';

interface PlaceDetailsModalProps {
  placeName: string;
  isOpen: boolean;
  onClose: () => void;
  details: {
    description: string;
    imageUrl: string;
  } | null;
  loading: boolean;
  locationId?: string;
  userId?: string;
  isDeleted?: boolean;
}

export default function PlaceDetailsModal({ placeName, isOpen, onClose, details, loading, locationId, userId, isDeleted }: PlaceDetailsModalProps) {
  const user = auth.currentUser;
  const isOwner = user?.uid === userId;
  const isAdmin = user?.email === 'mukkuc41@gmail.com';

  const [isPlanned, setIsPlanned] = useState(false);
  const [planningInfo, setPlanningInfo] = useState<any>(null);
  const [isArchived, setIsArchived] = useState(false);
  const [archiveInfo, setArchiveInfo] = useState<any>(null);

  useEffect(() => {
    if (!locationId || !user) return;

    const q = query(
      collection(db, 'tours'),
      where('userId', '==', user.uid),
      where('locationId', '==', locationId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setIsPlanned(!snapshot.empty);
      if (!snapshot.empty) {
        setPlanningInfo({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setPlanningInfo(null);
      }
    });

    return () => unsubscribe();
  }, [locationId, user]);

  useEffect(() => {
    if (!locationId || !user) return;

    const q = query(
      collection(db, 'archives'),
      where('userId', '==', user.uid),
      where('locationId', '==', locationId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setIsArchived(!snapshot.empty);
      if (!snapshot.empty) {
        setArchiveInfo({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setArchiveInfo(null);
      }
    });

    return () => unsubscribe();
  }, [locationId, user]);

  const toggleTour = async () => {
    if (!user || !locationId) return;

    try {
      if (isPlanned && planningInfo) {
        await deleteDoc(doc(db, 'tours', planningInfo.id));
      } else {
        const planId = `${user.uid}_${locationId}`;
        await setDoc(doc(db, 'tours', planId), {
          userId: user.uid,
          locationId,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'tours');
    }
  };

  const toggleArchive = async () => {
    if (!user || !locationId) return;

    try {
      if (isArchived && archiveInfo) {
        await deleteDoc(doc(db, 'archives', archiveInfo.id));
      } else {
        const archId = `${user.uid}_${locationId}`;
        await setDoc(doc(db, 'archives', archId), {
          userId: user.uid,
          locationId,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'archives');
    }
  };

  const handleRestore = async () => {
    if (!locationId) return;
    try {
      await updateDoc(doc(db, 'locations', locationId), {
        isDeleted: false,
        updatedAt: serverTimestamp()
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `locations/${locationId}`);
    }
  };

  const handleDelete = async () => {
    if (!locationId) return;
    if (!window.confirm("Are you sure you want to delete this discovery? It will be moved to the Trash for 30 days.")) return;

    try {
      await updateDoc(doc(db, 'locations', locationId), {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `locations/${locationId}`);
    }
  };

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
            <div className="md:w-1/2 p-8 md:p-16 overflow-y-auto bg-white flex flex-col relative">
               {/* Discovery Background Layer */}
               <div 
                 className="absolute inset-0 opacity-[0.03] pointer-events-none bg-cover bg-center"
                 style={{ backgroundImage: 'url("/src/assets/images/discovery_detail_bg_1779013628944.png")' }}
               />
               <div className="relative z-10 flex flex-col flex-1">
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
                   <>
                    <div className="prose prose-sm max-w-none">
                      <div className="markdown-body text-xl md:text-2xl font-serif italic leading-relaxed text-[#141414]/80">
                         <ReactMarkdown>
                           {details.description}
                         </ReactMarkdown>
                      </div>
                    </div>
                    {locationId && <ReviewSection locationId={locationId} />}
                   </>
                 ) : null}
               </div>

               <div className="mt-12 pt-12 border-t border-[#141414]/5 flex items-center justify-between">
                  <div className="flex gap-4">
                     {user && (
                       <>
                         <button 
                           onClick={toggleTour}
                           className={`flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold transition-all hover:scale-105 shadow-xl ${isPlanned ? 'bg-[#00af87] text-white' : 'bg-[#141414] text-white'}`}
                         >
                            {isPlanned ? <CalendarCheck className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                            {isPlanned ? 'Planned for Tour' : 'Plan Visit'}
                         </button>
                         <button 
                           onClick={() => {
                             const title = placeName;
                             const text = `Check out ${placeName} on World Explorer!`;
                             const url = window.location.href;
                             if (navigator.share) {
                               navigator.share({ title, text, url }).catch(e => console.error(e));
                             } else {
                               window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
                             }
                           }}
                           className="p-3 rounded-full border border-[#141414]/5 rgb-bg animate-rgb text-white transition-all group"
                           title="Share Discovery"
                         >
                            <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                         </button>
                       </>
                     )}
                     {(isOwner || isAdmin) && locationId && (
                       isDeleted ? (
                         <button 
                           onClick={handleRestore}
                           className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#00af87] text-white text-xs font-bold hover:scale-105 transition-all"
                         >
                           <CalendarCheck className="w-4 h-4" /> Restore Discovery
                         </button>
                       ) : (
                         <button 
                           onClick={handleDelete}
                           className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#ef4444] text-white text-xs font-bold hover:scale-105 transition-all"
                         >
                           <Trash2 className="w-4 h-4" /> Delete Discovery
                         </button>
                       )
                     )}
                  </div>
                  {user && (
                    <button 
                      onClick={toggleArchive}
                      className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${isArchived ? 'text-[#141414]' : 'text-[#00af87] hover:opacity-70'}`}
                    >
                       <Bookmark className={`w-4 h-4 ${isArchived ? 'fill-current' : ''}`} />
                       {isArchived ? 'In Archive' : 'Save to Archive'}
                    </button>
                  )}
               </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
