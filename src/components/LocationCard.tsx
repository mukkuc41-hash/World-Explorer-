import { LocationData } from './LocationList.tsx';
import { motion } from 'motion/react';
import { MapPin, User, Calendar, Heart, Star, Award, Clock, Trash2, RefreshCw } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { safelyConvertToDate } from '../lib/dateUtils.ts';
import { doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

interface LocationCardProps {
  location: LocationData;
  index: number;
  isFavorite: boolean;
  onSelect?: (location: LocationData) => void;
}

export default function LocationCard({ location, index, isFavorite, onSelect }: LocationCardProps) {
  const user = auth.currentUser;
  const isOwner = user?.uid === location.userId;
  const isAdmin = user?.email === 'mukkuc41@gmail.com';

  const handleClick = () => {
    if (onSelect) onSelect(location);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (location.isDeleted) {
      if (!window.confirm("Are you sure you want to permanently delete this discovery? This action cannot be undone.")) return;
      try {
        await deleteDoc(doc(db, 'locations', location.id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `locations/${location.id}`);
      }
    } else {
      if (!window.confirm("Are you sure you want to delete this discovery? It will be moved to the Trash for 30 days.")) return;
      try {
        await updateDoc(doc(db, 'locations', location.id), {
          isDeleted: true,
          deletedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `locations/${location.id}`);
      }
    }
  };

  const handleRestore = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'locations', location.id), {
        isDeleted: false,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `locations/${location.id}`);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const user = auth.currentUser;
    if (!user) {
      alert("Please sign in to favorite locations");
      return;
    }

    const favId = `${user.uid}_${location.id}`;
    const favRef = doc(db, 'favorites', favId);

    try {
      if (isFavorite) {
        await deleteDoc(favRef);
      } else {
        await setDoc(favRef, {
          userId: user.uid,
          locationId: location.id,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `favorites/${favId}`);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = safelyConvertToDate(timestamp);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  };

  // Deleting simulated reviews to prefer real ones if available
  // const rating = 4.5 + (Math.random() * 0.5);
  // const reviewsCount = Math.floor(Math.random() * 500) + 50;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05 }}
      onClick={handleClick}
      className="group bg-white rounded-[32px] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-[#141414]/5 cursor-pointer"
    >
      <div className="relative h-64 overflow-hidden">
        <img 
          src={location.imageUrl} 
          alt={location.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${location.id}/800/600`;
          }}
          referrerPolicy="no-referrer"
        />
        
        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <span className="bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
            <MapPin className="w-3 h-3 text-[#5A5A40]" /> {location.continent}
          </span>
        </div>

        <div className="absolute top-4 right-4 flex gap-2">
          {(isOwner || isAdmin) && (
            <>
              {location.isDeleted && (
                <button 
                  onClick={handleRestore}
                  className="p-3 rounded-full backdrop-blur-md bg-[#00af87] text-white hover:bg-[#009472] hover:scale-110 transition-all shadow-sm cursor-pointer"
                  title="Restore Discovery"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
              <button 
                onClick={handleDelete}
                className="p-3 rounded-full backdrop-blur-md bg-white/90 text-[#141414]/40 hover:bg-[#ef4444] hover:text-white transition-all shadow-sm group/delete cursor-pointer"
                title={location.isDeleted ? "Permanently Delete Discovery" : "Delete Discovery"}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          {user && (
            <button 
              onClick={toggleFavorite}
              className={`p-3 rounded-full backdrop-blur-md transition-all shadow-sm cursor-pointer ${isFavorite ? 'bg-[#ef4444] text-white' : 'bg-white/90 text-[#141414]/40 hover:text-[#ef4444] hover:scale-110'}`}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>
      </div>

      <div className="p-8">
        <h3 className="font-serif italic text-3xl tracking-tighter mb-4 group-hover:text-[#5A5A40] transition-colors leading-none">
          {location.name}
        </h3>
        
        <p className="text-[#141414]/60 line-clamp-3 text-sm leading-relaxed mb-8">
          {location.description}
        </p>

        <div className="flex items-center justify-between pt-6 border-t border-[#141414]/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#f5f5f0] flex items-center justify-center border border-[#141414]/5 font-black text-[10px] uppercase opacity-60">
              {location.userName.charAt(0)}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest opacity-20 leading-none mb-1">Explorer</span>
              <span className="text-xs font-bold text-[#141414]/80">{location.userName}</span>
            </div>
          </div>
          
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest opacity-20 leading-none mb-1">Added on</span>
            <span className="text-xs font-bold text-[#141414]/60">{formatDate(location.createdAt)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
