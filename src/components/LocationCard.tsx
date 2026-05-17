import { LocationData } from './LocationList.tsx';
import { motion } from 'motion/react';
import { MapPin, User, Calendar, Heart } from 'lucide-react';
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05 }}
      className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-[#141414]/5"
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
        <div className="absolute top-4 left-4">
          <span className="bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
            <MapPin className="w-3 h-3 text-[#5A5A40]" /> {location.continent}
          </span>
        </div>
        <button 
          onClick={toggleFavorite}
          className={`absolute top-4 right-4 p-3 rounded-full backdrop-blur-md transition-all shadow-sm ${isFavorite ? 'bg-[#5A5A40] text-white' : 'bg-white/90 text-[#141414]/40 hover:text-[#5A5A40] hover:scale-110'}`}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
      </div>

      <div className="p-8">
        <h3 className="font-serif italic text-3xl tracking-tighter mb-4 group-hover:text-[#5A5A40] transition-colors">
          {location.name}
        </h3>
        <p className="text-[#141414]/60 line-clamp-3 text-sm leading-relaxed mb-8">
          {location.description}
        </p>

        <div className="flex items-center justify-between pt-6 border-t border-[#141414]/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#f5f5f0] flex items-center justify-center border border-[#141414]/5 font-bold text-xs uppercase opacity-60">
              {location.userName.charAt(0)}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest opacity-40 leading-none">Shared by</span>
              <span className="text-xs font-medium">{location.userName}</span>
            </div>
          </div>
          
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-widest opacity-40 block leading-none">Added on</span>
            <span className="text-xs font-medium text-[#141414]/60">{formatDate(location.createdAt)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
