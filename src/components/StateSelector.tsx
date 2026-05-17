import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { Continent } from '../App.tsx';
import { motion } from 'motion/react';
import { ChevronRight, Map } from 'lucide-react';

interface StateSelectorProps {
  continent: Continent;
  country: string;
  onSelect: (state: string) => void;
}

export default function StateSelector({ continent, country, onSelect }: StateSelectorProps) {
  const [states, setStates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'locations'),
      where('continent', '==', continent),
      where('country', '==', country)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const uniqueStates = new Set<string>();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.state) {
          uniqueStates.add(data.state);
        }
      });
      setStates(Array.from(uniqueStates).sort());
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'locations');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [continent, country]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-[#5A5A40] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (states.length === 0) {
    return (
      <div className="text-center py-20 bg-white/50 rounded-[40px] border border-[#141414]/5">
        <Map className="w-12 h-12 mx-auto opacity-10 mb-4" />
        <p className="text-[#141414]/40">No regions discovered in {country} yet.</p>
        <p className="text-sm mt-2 font-medium">Be the first to share one!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {states.map((state, index) => (
        <motion.button
          key={state}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onSelect(state)}
          className="flex items-center justify-between p-8 bg-white rounded-[32px] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group border border-[#141414]/5"
        >
          <div className="text-left">
            <span className="text-[10px] uppercase tracking-widest font-bold opacity-40 block mb-1">Region / State</span>
            <h3 className="text-2xl font-serif italic tracking-tighter group-hover:text-[#5A5A40] transition-colors">{state}</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#f5f5f0] flex items-center justify-center group-hover:bg-[#5A5A40] group-hover:text-white transition-all">
            <ChevronRight className="w-5 h-5" />
          </div>
        </motion.button>
      ))}
    </div>
  );
}
