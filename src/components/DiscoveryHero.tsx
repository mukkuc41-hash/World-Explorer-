import { useState } from 'react';
import { Calendar, Users, Search as SearchIcon, MapPin, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface DiscoveryHeroProps {
  locationName: string;
  imageUrl?: string;
  description?: string;
}

export default function DiscoveryHero({ locationName, imageUrl, description }: DiscoveryHeroProps) {
  const [date, setDate] = useState('17 May');
  const [guests, setGuests] = useState('2');

  const defaultImage = "https://images.unsplash.com/photo-1590422119958-86811fc7b98d?auto=format&fit=crop&q=80&w=1600";
  const defaultDescription = `Discover unique experiences, hidden gems, and local favorites in the heart of ${locationName}.`;

  return (
    <div className="space-y-8 mb-16">
      {/* Hero section with Image */}
      <div className="relative h-[400px] md:h-[500px] rounded-[40px] overflow-hidden group">
        <img 
          src={imageUrl || defaultImage} 
          alt={locationName}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 text-white/60 text-[10px] uppercase font-black tracking-[0.2em] mb-4">
              <Sparkles className="w-3 h-3 text-[#00af87]" /> Recommended
            </div>
            <h1 className="text-white text-6xl md:text-8xl font-bold tracking-tighter mb-4 leading-[0.8]">
              {locationName}
            </h1>
            <p className="text-white/70 text-xl max-w-xl leading-relaxed italic">
              {description || defaultDescription}
            </p>
          </motion.div>
        </div>
      </div>

    </div>
  );
}
