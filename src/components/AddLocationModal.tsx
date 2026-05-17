import { useState } from 'react';
import { User } from 'firebase/auth';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { Continent } from '../App.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { X, Camera, Upload, AlertCircle, MapPin } from 'lucide-react';
import PlaceAutocomplete from './PlaceAutocomplete.tsx';

interface AddLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  continent: Continent;
  user: User | null;
}

export default function AddLocationModal({ isOpen, onClose, continent, user }: AddLocationModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePlaceSelect = (place: google.maps.places.PlaceResult | null) => {
    if (place && place.geometry?.location) {
      setName(place.name || '');
      
      // Extract country from address components
      const countryComp = place.address_components?.find(c => c.types.includes('country'));
      if (countryComp) {
        setCountry(countryComp.long_name);
      }

      // Extract state/administrative_area_level_1 from address components
      const stateComp = place.address_components?.find(c => c.types.includes('administrative_area_level_1'));
      if (stateComp) {
        setState(stateComp.long_name);
      } else {
        // Fallback for places that might not have traditional states
        const cityComp = place.address_components?.find(c => c.types.includes('locality'));
        if (cityComp) setState(cityComp.long_name);
      }

      setCoords({
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!coords) {
      setError("Please search for and select a valid location from the search box.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const locationId = crypto.randomUUID();
    const path = `locations/${locationId}`;

    try {
      await setDoc(doc(db, 'locations', locationId), {
        name: name.trim(),
        description: description.trim(),
        imageUrl: imageUrl.trim() || `https://picsum.photos/seed/${locationId}/800/600`,
        continent: continent,
        country: country.trim() || 'Unknown',
        state: state.trim() || 'Unknown',
        userId: user.uid,
        userName: user.displayName || 'Anonymous Explorer',
        lat: coords.lat,
        lng: coords.lng,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Clear form and close
      setName('');
      setDescription('');
      setImageUrl('');
      setCountry('');
      setState('');
      setCoords(null);
      onClose();
    } catch (err: any) {
      setError("Failed to add location. Please check your inputs and try again.");
      handleFirestoreError(err, OperationType.CREATE, path);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#141414]/80 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative bg-white w-full max-w-2xl rounded-[40px] overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
        >
          <div className="p-8 md:p-12">
            <div className="flex justify-between items-start mb-12">
              <div>
                <span className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-40 block mb-2">Contribution</span>
                <h2 className="text-4xl md:text-5xl font-serif italic tracking-tighter">Share a Hidden Gem</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-3 hover:bg-[#f5f5f0] rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-6">
                <div className="group">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 group-focus-within:opacity-100 transition-opacity mb-2 block">Search Location</label>
                  <div className="relative">
                    <PlaceAutocomplete 
                      onPlaceSelect={handlePlaceSelect}
                      placeholder="Search for a place (e.g., Mount Fuji)..."
                      className="w-full bg-[#f5f5f0] border-none rounded-2xl px-6 py-4 pl-14 focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all font-medium"
                    />
                    <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 opacity-30" />
                  </div>
                  {coords && (
                    <p className="mt-2 text-[10px] text-green-600 font-bold uppercase tracking-widest flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Location verified: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                    </p>
                  )}
                </div>

                <div className="group">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 group-focus-within:opacity-100 transition-opacity mb-2 block">Display Name</label>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="The name as it will appear in the guide"
                    className="w-full bg-[#f5f5f0] border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all font-medium"
                    maxLength={200}
                  />
                </div>

                <div className="group">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 group-focus-within:opacity-100 transition-opacity mb-2 block">Description</label>
                  <textarea
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell us what makes this place special..."
                    rows={4}
                    className="w-full bg-[#f5f5f0] border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all font-medium resize-none"
                    maxLength={5000}
                  />
                </div>

                <div className="group">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 group-focus-within:opacity-100 transition-opacity mb-2 block">Image URL (Optional)</label>
                  <div className="relative">
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Paste an image link from Unsplash..."
                      className="w-full bg-[#f5f5f0] border-none rounded-2xl px-6 py-4 pl-14 focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all font-medium"
                    />
                    <Camera className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 opacity-30" />
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex items-center gap-4 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-[#141414] text-white py-5 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-[#2a2a2a] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-[#141414]/20"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-4 h-4" /> Publish in {continent}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-8 py-5 rounded-full font-bold uppercase tracking-widest text-xs border border-[#141414]/10 hover:bg-[#f5f5f0] transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// Add missing import
import { CheckCircle2 } from 'lucide-react';
