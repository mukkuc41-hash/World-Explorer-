import { LocationData } from './LocationList.tsx';
import { motion } from 'motion/react';
import { MapPin, User, Calendar, Heart, Star, Award, Clock } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

interface LocationCardProps {
  location: LocationData;
  index: number;
  isFavorite: boolean;
}

export default function LocationCard({ location, index, isFavorite }: LocationCardProps) {
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
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  };

  // Simulated data for TripAdvisor look
  const rating = 4.5 + (Math.random() * 0.5);
  const reviewsCount = Math.floor(Math.random() * 500) + 50;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05 }}
      className="group bg-white rounded-[32px] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-[#141414]/5"
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

        <button 
          onClick={toggleFavorite}
          className={`absolute top-4 right-4 p-3 rounded-full backdrop-blur-md transition-all shadow-sm ${isFavorite ? 'bg-[#ef4444] text-white' : 'bg-white/90 text-[#141414]/40 hover:text-[#ef4444] hover:scale-110'}`}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
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
