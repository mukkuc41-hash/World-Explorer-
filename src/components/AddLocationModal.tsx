import { useState, useRef, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, doc, setDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { Continent } from '../App.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { X, Camera, Upload, AlertCircle, MapPin, Image as ImageIcon, Trash2, Check, RefreshCw, CheckCircle2, Sparkles, Minimize2, Maximize2 } from 'lucide-react';
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

  // AI Co-pilot State Additions
  const [aiSearchText, setAiSearchText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Location format validation states: Continent, Country, State, District, Landmark
  const [typedLocationText, setTypedLocationText] = useState('');
  const [formatStatus, setFormatStatus] = useState<'neutral' | 'valid' | 'invalid'>('neutral');

  const handleLocationTextChange = (text: string) => {
    setTypedLocationText(text);
    
    const trimmed = text.trim();
    if (!trimmed) {
      setFormatStatus('neutral');
      return;
    }
    
    // Split by comma
    const parts = trimmed.split(',').map(p => p.trim());
    
    // Check if parts match exactly 5 parts, and none of them is empty
    const isValidStructure = parts.length === 5 && parts.every(part => part.length > 0);
    
    if (isValidStructure) {
      // Validate continent name
      const validContinents = ['asia', 'africa', 'europe', 'north america', 'south america', 'antarctica', 'australia', 'oceania'];
      const firstPartLower = parts[0].toLowerCase();
      const isValidContinent = validContinents.some(c => firstPartLower.includes(c) || c.includes(firstPartLower));
      
      if (isValidContinent) {
        setFormatStatus('valid');
        
        // Auto-populate form input fields automatically for high convenience!
        const countryVal = parts[1];
        const stateVal = parts[2];
        const landmarkVal = parts[4];
        
        if (countryVal) setCountry(countryVal);
        if (stateVal) setState(stateVal);
        if (landmarkVal) {
          setName(landmarkVal);
          setAiSearchText(landmarkVal); // sync with AI autofill
        }
      } else {
        setFormatStatus('invalid');
      }
    } else {
      setFormatStatus('invalid');
    }
  };

  // AI Co-pilot Handlers
  const handleAiAutofill = async () => {
    const targetPlace = aiSearchText.trim() || name.trim();
    if (!targetPlace) {
      setAiMessage({ text: "Please enter a landmark or landmark name to autofill.", isError: true });
      return;
    }

    setIsAiLoading(true);
    setAiMessage(null);
    setError(null);

    try {
      const response = await fetch('/api/ai-autofill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ place: targetPlace }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'AI Auto-fill failed.');
      }

      const data = await response.json();

      // Populate states with AI recommendations
      setName(data.name || name || targetPlace);
      setDescription(data.description || '');
      setCountry(data.country || '');
      setState(data.state || '');
      if (typeof data.lat === 'number' && typeof data.lng === 'number') {
        setCoords({ lat: data.lat, lng: data.lng });
      }

      // Autofill search location format: Continent, Country, State, District, Landmark
      if (data.formattedSearchLocation) {
        handleLocationTextChange(data.formattedSearchLocation);
      }

      // Sync the AI input text if they left it empty
      if (!aiSearchText) {
        setAiSearchText(data.name || targetPlace);
      }

      // Suggest Unsplash image using keywords if no image is loaded OR if they are using URL link method
      if (data.imageKeywords) {
        setUploadMethod('url');
        setImageUrl(`https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&q=80&w=800&keywords=${encodeURIComponent(data.imageKeywords)}`);
      }

      setAiMessage({ text: "✨ AI Smart Fill successfully configured all fields, coordinates and Unsplash image! ✨", isError: false });
    } catch (err: any) {
      console.error(err);
      setAiMessage({ text: err.message || "Failed to contact AI copilot.", isError: true });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleGenerateDescription = async () => {
    const targetPlace = name.trim() || aiSearchText.trim();
    if (!targetPlace) {
      setError("Please put a Display Name first so the AI knows what place to write about!");
      return;
    }

    setIsAiLoading(true);
    setError(null);
    setAiMessage(null);

    try {
      const response = await fetch('/api/generate-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ place: targetPlace }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'AI details generation failed.');
      }

      const data = await response.json();
      setDescription(data.description || '');
      
      if (data.imageKeywords) {
        setUploadMethod('url');
        setImageUrl(`https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&q=80&w=800&keywords=${encodeURIComponent(data.imageKeywords)}`);
      }

      setAiMessage({ text: "AI has finished writing a travel description!", isError: false });
    } catch (err: any) {
      console.error(err);
      setError(`AI generation failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleResolveCoordinates = async () => {
    const targetPlace = name.trim() || aiSearchText.trim();
    if (!targetPlace) {
      setError("Please enter a Display Name first so AI can lookup its coordinates!");
      return;
    }

    setIsAiLoading(true);
    setError(null);
    setAiMessage(null);

    try {
      const response = await fetch('/api/ai-autofill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ place: targetPlace }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'AI coordinate lookup failed.');
      }

      const data = await response.json();
      setCountry(data.country || '');
      setState(data.state || '');
      if (typeof data.lat === 'number' && typeof data.lng === 'number') {
        setCoords({ lat: data.lat, lng: data.lng });
      }

      // Autofill search location format: Continent, Country, State, District, Landmark
      if (data.formattedSearchLocation) {
        handleLocationTextChange(data.formattedSearchLocation);
      }

      setAiMessage({ text: `AI found coordinates: ${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}`, isError: false });
    } catch (err: any) {
      console.error(err);
      setError(`Failed to resolve coordinates: ${err.message || 'Unknown error'}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Gallery Upload additions
  const [uploadMethod, setUploadMethod] = useState<'gallery' | 'url'>('gallery');
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // App Permissions Management (Notification, Gallery & strict AI privacy shield)
  const [permissionsGranted, setPermissionsGranted] = useState(() => {
    return localStorage.getItem('explorer_media_notif_permissions_granted') === 'true';
  });
  const [isUploadHintCollapsed, setIsUploadHintCollapsed] = useState(false);

  // Keep permissions state synchronized in real-time when modal opens
  useEffect(() => {
    if (isOpen) {
      setPermissionsGranted(localStorage.getItem('explorer_media_notif_permissions_granted') === 'true');
    } else {
      setTypedLocationText('');
      setFormatStatus('neutral');
    }
  }, [isOpen]);

  const promptAndRequestPermissions = async () => {
    try {
      if ('Notification' in window) {
        await Notification.requestPermission();
      }
    } catch (err) {
      console.warn("System Notification permission request rejected:", err);
    }
    localStorage.setItem('explorer_media_notif_permissions_granted', 'true');
    setPermissionsGranted(true);
    
    // Auto-open file picker right after granting permission
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 150);
  };

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError("Please select a valid image file from your library.");
      return;
    }

    setIsCompressing(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1000;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round(height * (MAX_WIDTH / width));
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round(width * (MAX_HEIGHT / height));
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            setImageUrl(event.target?.result as string);
            setIsCompressing(false);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          
          // Compress with 0.76 quality (perfect sweet spot for sharp detail and tiny file size: ~55kb)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.76);
          setImageUrl(dataUrl);
        } catch (compressErr) {
          console.warn("Compression fallback used:", compressErr);
          setImageUrl(event.target?.result as string);
        } finally {
          setIsCompressing(false);
        }
      };
      
      img.onerror = () => {
        setError("Failed to process the image. Please try another one.");
        setIsCompressing(false);
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      setError("Unable to read image file. Please try selecting it again.");
      setIsCompressing(false);
    };

    reader.readAsDataURL(file);
  };

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError("Drop event canceled: Only images can be dropped.");
        return;
      }
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
        handleFileChange({ target: fileInputRef.current } as any);
      }
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

      // Award points for discovery
      try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          points: increment(50), 
          totalDiscoveries: increment(1),
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Update public profile for leaderboard
        const publicRef = doc(db, 'public_profiles', user.uid);
        await setDoc(publicRef, {
          displayName: user.displayName || 'Anonymous Explorer',
          photoURL: user.photoURL,
          points: increment(50),
          totalDiscoveries: increment(1),
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (e) {
        console.error("Error awarding points:", e);
      }

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
                type="button"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-6">
                {/* AI Co-pilot Smart Fill Box */}
                <div className="p-6 bg-[#141414] text-white rounded-3xl shadow-xl space-y-4 relative overflow-hidden group border border-white/5">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
                    <h3 className="font-serif italic text-lg leading-none">World Explorer AI • Smart Co-pilot</h3>
                  </div>
                  <p className="text-[11px] text-white/70 leading-relaxed">
                    This smart tool is connected directly to the master <strong>World Explorer AI</strong> network and Google Search. Enter any global landmark (e.g. Kyoto Golden Pavilion, Petra Jordan) to automatically download geotags, resolve coordinates, and write accurate travel descriptions!
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter a landmark or city..."
                      className="flex-1 bg-white/5 hover:bg-white/10 focus:bg-white/12 border border-white/10 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-xs outline-none transition-all placeholder:text-white/30 font-medium"
                      value={aiSearchText}
                      onChange={(e) => setAiSearchText(e.target.value)}
                    />
                    <button
                      type="button"
                      disabled={isAiLoading || !aiSearchText.trim()}
                      onClick={handleAiAutofill}
                      className="px-5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 active:scale-95 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5 shrink-0"
                    >
                      {isAiLoading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 hover:scale-110 transition-transform" />
                      )}
                      <span>Autofill</span>
                    </button>
                  </div>
                  {aiMessage && (
                    <p className={`text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 ${aiMessage.isError ? 'text-red-400' : 'text-emerald-400'}`}>
                      {aiMessage.isError ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />}
                      {aiMessage.text}
                    </p>
                  )}
                </div>

                <div className="group">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 group-focus-within:opacity-100 transition-opacity mb-2 block">Search Location</label>
                  <p className="text-[10px] text-[#5A5A40]/80 italic mb-2.5">
                    Format: <span className="font-mono bg-[#5A5A40]/5 px-1.5 py-0.5 rounded text-xs">Continent, Country, State, District, Landmark</span> (e.g. <span className="font-mono bg-[#5A5A40]/10 px-1 py-0.2 rounded text-xs text-[#141414]">Asia, India, Rajasthan, ajmer, Amber fort</span>)
                  </p>
                  <div className="relative">
                    <PlaceAutocomplete 
                      onPlaceSelect={handlePlaceSelect}
                      placeholder="Continent, Country, State, District, Landmark (e.g. Asia, India, Rajasthan, ajmer, Amber fort)..."
                      onTextChange={handleLocationTextChange}
                      status={formatStatus}
                      value={typedLocationText}
                      className="w-full bg-[#f5f5f0] border rounded-2xl px-6 py-4 pl-14 outline-none transition-all font-medium"
                    />
                    <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 opacity-30" />
                  </div>
                  
                  {/* Validation Feedback Messages */}
                  {formatStatus === 'valid' && (
                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-2 flex items-center gap-1.5 bg-emerald-500/5 px-3 py-2 rounded-xl border border-emerald-500/20">
                      <Check className="w-3.5 h-3.5 text-emerald-600 animate-bounce" /> Correct Format Detected! Landmark autofilled.
                    </p>
                  )}
                  {formatStatus === 'invalid' && (
                    <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest mt-2 flex items-center gap-1.5 bg-rose-500/5 px-3 py-2 rounded-xl border border-rose-500/20">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" /> Invalid Format! Ensure you have exactly 5 elements: Continent, Country, State, District, Landmark (with comma separations)
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                    {coords ? (
                      <p className="text-[10px] text-green-600 font-bold uppercase tracking-widest flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-600" /> Location verified: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                      </p>
                    ) : (
                      <span className="text-[9px] opacity-40 uppercase font-bold tracking-widest">No coordinates verified yet</span>
                    )}
                    <button
                      type="button"
                      onClick={handleResolveCoordinates}
                      disabled={isAiLoading || (!name && !aiSearchText)}
                      className="text-[10px] text-[#5A5A40] hover:text-[#7A7A50] disabled:opacity-40 font-bold uppercase tracking-widest flex items-center gap-1 bg-[#5A5A40]/5 hover:bg-[#5A5A40]/10 px-2.5 py-1 rounded-md transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Resolve Coords with World Explorer AI</span>
                    </button>
                  </div>
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
                    className="w-full bg-[#f5f5f0] border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all font-medium resize-none resize-none"
                    maxLength={5000}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <button
                      type="button"
                      onClick={handleGenerateDescription}
                      disabled={isAiLoading || (!name && !aiSearchText)}
                      className="flex items-center gap-1.5 py-1.5 px-3 bg-[#5A5A40]/10 hover:bg-[#5A5A40]/25 rounded-xl text-[10px] font-bold text-[#5A5A40] uppercase tracking-wider transition-all disabled:opacity-40"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Generate Description with World Explorer AI</span>
                    </button>
                    <span className="text-[10px] opacity-40 font-mono">{description.length} / 5000 characters</span>
                  </div>
                </div>

                {/* Beautiful Dual-Mode image selector (Gallery upload & Web URL paste) */}
                <div className="group">
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-45 block">Select Place Image</label>
                    <div className="flex bg-[#f2f2eb] rounded-lg p-0.5" id="image-method-toggle">
                      <button
                        type="button"
                        onClick={() => setUploadMethod('gallery')}
                        className={`px-3 py-1 text-[9px] uppercase font-black tracking-wider rounded-md transition-all ${
                          uploadMethod === 'gallery' ? 'bg-[#141414] text-white shadow-sm' : 'text-[#141414]/50'
                        }`}
                      >
                        Local Gallery
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadMethod('url')}
                        className={`px-3 py-1 text-[9px] uppercase font-black tracking-wider rounded-md transition-all ${
                          uploadMethod === 'url' ? 'bg-[#141414] text-white shadow-sm' : 'text-[#141414]/50'
                        }`}
                      >
                        Web Link
                      </button>
                    </div>
                  </div>

                  {uploadMethod === 'gallery' ? (
                    <div className="space-y-3">
                      {/* Hidden Input to system gallery */}
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        id="device-gallery-picker"
                      />

                      {!permissionsGranted ? (
                        /* Beautiful interactive iOS/Android device authorization overlay card */
                        <div 
                          className="bg-[#fcfcf9] border border-amber-500/25 rounded-3xl p-6.5 shadow-md flex flex-col gap-4 text-left relative overflow-hidden transition-all duration-350"
                          id="required-media-notification-permission-prompt"
                        >
                          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-amber-500/10 text-amber-650 rounded-2xl shrink-0">
                              <span className="relative flex h-5 w-5 items-center justify-center">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-30"></span>
                                <ImageIcon className="w-5 h-5 shrink-0" />
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="font-serif italic font-bold text-sm text-[#141414] truncate">
                                  Permit Gallery Access?
                                </h4>
                                <button
                                  type="button"
                                  onClick={() => setIsUploadHintCollapsed(!isUploadHintCollapsed)}
                                  className="p-1 px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 transition-all flex items-center gap-1.5 text-[9px] uppercase font-bold tracking-wider"
                                  title={isUploadHintCollapsed ? "Show details & privacy policy" : "Minimize details"}
                                >
                                  {isUploadHintCollapsed ? (
                                    <>
                                      <Maximize2 className="w-3 h-3" />
                                      <span>Show Hint</span>
                                    </>
                                  ) : (
                                    <>
                                      <Minimize2 className="w-3 h-3" />
                                      <span>Hide Hint</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <p className="text-[11px] text-[#141414]/65 mt-0.5 leading-snug">
                                World Explorer requests system permissions to streamline your travel experience.
                              </p>
                            </div>
                          </div>

                          {!isUploadHintCollapsed && (
                            <div className="space-y-2.5 border-t border-b border-[#141414]/5 py-3 text-[11px] transition-all">
                              <div className="flex items-start gap-2 text-[#141414]/75">
                                <span className="text-emerald-600 font-bold shrink-0">✓</span>
                                <p>
                                  <strong>Media Picker Access</strong>: Select photos directly from your local camera roll or device files to display beautiful cards.
                                </p>
                              </div>
                              <div className="flex items-start gap-2 text-[#141414]/75">
                                <span className="text-emerald-600 font-bold shrink-0">✓</span>
                                <p>
                                  <strong>Push Alert Stream</strong>: Enable live audio chimes and native notification pop-ups instantly when fellow explorers pin landmark gems.
                                </p>
                              </div>
                              <div className="flex items-start gap-2 bg-red-500/5 border border-red-500/5 p-2 rounded-xl text-red-800">
                                <span className="text-red-500 font-black tracking-widest uppercase text-[9px] shrink-0 mt-0.5 px-1 py-0.5 bg-red-500/10 rounded">AI BLOCK</span>
                                <p className="text-[10px] leading-relaxed">
                                  <strong>Strict Privacy Shield Safe-Vault</strong>: AI models, search agents, and LLMs are strictly, structurally <strong>prohibited</strong> from indexing, accessing, reading, or analyzing your local device gallery photography or personal media.
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2.5">
                            <button
                              type="button"
                              onClick={promptAndRequestPermissions}
                              className="flex-1 bg-[#141414] hover:bg-[#5A5A40] active:scale-[0.98] text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center transition-all shadow-md"
                            >
                              Grant Secure Access
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                // Default back to URL Web Link mode
                                setUploadMethod('url');
                              }}
                              className="px-4 py-3 border border-[#141414]/10 hover:bg-[#141414]/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center transition-all text-[#141414]/70"
                            >
                              No thanks
                            </button>
                          </div>
                        </div>
                      ) : imageUrl && imageUrl.startsWith('data:') ? (
                        /* Beautiful Image picked Preview Card */
                        <div className="relative group/preview rounded-2xl overflow-hidden h-44 border border-[#141414]/10 shadow-sm flex items-center justify-center bg-[#f5f5f0]" id="image-upload-preview">
                          <img 
                            src={imageUrl} 
                            alt="Uploaded place preview" 
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent flex flex-col justify-end p-4">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] text-white/90 bg-[#141414]/80 backdrop-blur-md font-sans uppercase font-bold px-2 py-1 rounded-full border border-white/10 flex items-center gap-1">
                                <Check className="w-2.5 h-2.5 text-green-400" /> Loaded from Gallery
                              </span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={triggerFilePicker}
                                  className="p-2 bg-white/15 hover:bg-white/25 active:scale-95 border border-white/20 text-white rounded-xl transition-all"
                                  title="Change photo from gallery"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setImageUrl('')}
                                  className="p-2 bg-red-600/90 hover:bg-red-700 hover:text-white text-white rounded-xl transition-all"
                                  title="Remove image"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Empty/Ready dropzone with system browser permissions */
                        <button
                          type="button"
                          onClick={triggerFilePicker}
                          onDragOver={handleDragOver}
                          onDrop={handleDrop}
                          className="w-full border-2 border-dashed border-[#141414]/15 hover:border-[#141414]/30 rounded-2xl p-8 flex flex-col items-center justify-center gap-2.5 transition-all outline-none bg-[#fbfbfa]/50 hover:bg-[#f5f5f0]/30 cursor-pointer text-center group"
                          id="gallery-dropzone-btn"
                        >
                          <div className="p-3.5 bg-[#5A5A40]/10 text-[#5A5A40] rounded-full group-hover:scale-110 transition-transform">
                            {isCompressing ? (
                              <RefreshCw className="w-5 h-5 animate-spin text-[#5A5A40]" />
                            ) : (
                              <ImageIcon className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <span className="text-xs font-serif italic text-[#141414] font-bold block">
                              {isCompressing ? "Formatting file details..." : "Browse Library or Take Photo"}
                            </span>
                            <span className="text-[10px] opacity-40 font-medium block mt-0.5">
                              This requests secure, isolated photo library access. AI models are strictly blocked from accessing your files/media.
                            </span>
                          </div>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="url"
                        value={imageUrl.startsWith('data:') ? '' : imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="Paste an absolute image web link (e.g., Unsplash url)..."
                        className="w-full bg-[#f5f5f0] border-none rounded-2xl px-6 py-4 pl-14 focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all font-medium"
                      />
                      <Camera className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 opacity-30" />
                    </div>
                  )}
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
                  disabled={isSubmitting || isCompressing}
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
