import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { Continent } from '../App.tsx';
import { motion } from 'motion/react';
import { ChevronRight, Globe2 } from 'lucide-react';

interface CountrySelectorProps {
  continent: Continent;
  onSelect: (country: string) => void;
}

export default function CountrySelector({ continent, onSelect }: CountrySelectorProps) {
  const [countries, setCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'locations'),
      where('continent', '==', continent)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const uniqueCountries = new Set<string>();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.country) {
          uniqueCountries.add(data.country);
        }
      });
      setCountries(Array.from(uniqueCountries).sort());
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'locations');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [continent]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-[#5A5A40] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (countries.length === 0) {
    return (
      <div className="text-center py-20 bg-white/50 rounded-[40px] border border-[#141414]/5">
        <Globe2 className="w-12 h-12 mx-auto opacity-10 mb-4" />
        <p className="text-[#141414]/40">No countries discovered in {continent} yet.</p>
        <p className="text-sm mt-2 font-medium">Be the first to add a location!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {countries.map((country, index) => (
        <motion.button
          key={country}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onSelect(country)}
          className="flex items-center justify-between p-8 bg-white rounded-[32px] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group border border-[#141414]/5"
        >
          <div className="text-left">
            <span className="text-[10px] uppercase tracking-widest font-bold opacity-40 block mb-1">Destination</span>
            <h3 className="text-2xl font-serif italic tracking-tighter group-hover:text-[#5A5A40] transition-colors">{country}</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#f5f5f0] flex items-center justify-center group-hover:bg-[#5A5A40] group-hover:text-white transition-all">
            <ChevronRight className="w-5 h-5" />
          </div>
        </motion.button>
      ))}
    </div>
  );
}
