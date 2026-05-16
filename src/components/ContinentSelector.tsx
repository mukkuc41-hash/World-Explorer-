import { Continent } from '../App.tsx';
import { motion } from 'motion/react';

interface ContinentSelectorProps {
  onSelect: (continent: Continent) => void;
}

const continents: { name: Continent; image: string; count: string }[] = [
  { name: "Africa", image: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&q=80&w=800", count: "Explore the cradle of life" },
  { name: "Asia", image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=800", count: "Vibrant cultures & traditions" },
  { name: "Europe", image: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&q=80&w=800", count: "Historical landmarks & art" },
  { name: "North America", image: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&q=80&w=800", count: "Diverse landscapes & cities" },
  { name: "South America", image: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&q=80&w=800", count: "Aventurous spirits area" },
  { name: "Oceania", image: "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?auto=format&fit=crop&q=80&w=800", count: "Islands & coral reefs" },
  { name: "Antarctica", image: "https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?auto=format&fit=crop&q=80&w=800", count: "The edge of the world" },
];

export default function ContinentSelector({ onSelect }: ContinentSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {continents.map((continent, index) => (
        <motion.div
          key={continent.name}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ y: -10 }}
          onClick={() => onSelect(continent.name)}
          className="group relative h-[400px] rounded-3xl overflow-hidden cursor-pointer shadow-2xl"
        >
          <img 
            src={continent.image} 
            alt={continent.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414]/90 via-[#141414]/20 to-transparent" />
          
          <div className="absolute bottom-0 left-0 p-8 w-full">
            <span className="text-xs uppercase tracking-[0.3em] text-white/60 font-bold mb-2 block">Continent</span>
            <h3 className="text-4xl font-serif italic text-white tracking-tighter mb-1">{continent.name}</h3>
            <p className="text-sm text-white/80 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {continent.count}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
