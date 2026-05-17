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

      {/* Quick Discovery Links */}
      <div className="flex flex-wrap gap-4 text-sm font-medium">
        <span className="text-[#141414]/40 uppercase tracking-widest text-[10px] font-bold w-full mb-2">Check out must-see sights:</span>
        {['Amber Palace', 'Hawa Mahal', 'Historic Sites', 'Nature & Wildlife Areas', 'Local Markets'].map((tag) => (
          <button key={tag} className="underline decoration-2 transition-colors hover:text-[#5A5A40] underline-offset-4">
            {tag}
          </button>
        ))}
      </div>

      {/* TripAdvisor-style Search Section */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#00af87] rounded-[40px] p-8 md:p-12 shadow-xl shadow-[#00af87]/20"
      >
        <div className="flex flex-col gap-8">
          <div>
            <span className="inline-flex items-center gap-2 bg-[#141414] text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg mb-4">
              New
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-[#141414] tracking-tight">
              Find unique experiences
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative group lg:col-span-1">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-[#141414]/40 group-focus-within:text-[#141414]">
                <Calendar className="w-5 h-5" />
              </div>
              <input 
                type="text" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white/90 border-none rounded-3xl py-5 pl-14 pr-6 text-lg font-bold text-[#141414] focus:ring-4 focus:ring-white/20 transition-all outline-none"
                placeholder="Date"
              />
            </div>

            <div className="relative group lg:col-span-1">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-[#141414]/40 group-focus-within:text-[#141414]">
                <Users className="w-5 h-5" />
              </div>
              <input 
                type="text" 
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                className="w-full bg-white/90 border-none rounded-3xl py-5 pl-14 pr-6 text-lg font-bold text-[#141414] focus:ring-4 focus:ring-white/20 transition-all outline-none"
                placeholder="Guests"
              />
            </div>

            <button className="lg:col-span-2 bg-[#141414] text-white rounded-3xl py-5 text-xl font-bold hover:bg-[#141414]/90 transition-all shadow-lg active:scale-[0.98]">
              Search
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
