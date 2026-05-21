import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lightbulb, X, Check, MapPin, Search, Image, MessageSquare, Plus, ArrowRight, Award, Compass, Grab } from 'lucide-react';

interface LocationHintButtonProps {
  onLaunchUploader: () => void;
  isLoggedIn: boolean;
  onLogin: () => void;
}

export default function LocationHintButton({ onLaunchUploader, isLoggedIn, onLogin }: LocationHintButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'flow' | 'pro-tips' | 'playground'>('flow');

  // Input state for coordinate check playground
  const [testCoords, setTestCoords] = useState({ lat: '', lng: '' });
  const [coordsFormatResult, setCoordsFormatResult] = useState<string | null>(null);

  const handleTestCoords = () => {
    const latNum = parseFloat(testCoords.lat);
    const lngNum = parseFloat(testCoords.lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      setCoordsFormatResult('❌ Invalid coordinates. Please enter numerical values.');
      return;
    }

    if (latNum < -90 || latNum > 90) {
      setCoordsFormatResult('❌ Latitude must be between -90 and 90 degrees.');
      return;
    }

    if (lngNum < -180 || lngNum > 180) {
      setCoordsFormatResult('❌ Longitude must be between -180 and 180 degrees.');
      return;
    }

    setCoordsFormatResult(`✅ Verified! Decimals resolved perfectly. Mapping to: ${latNum.toFixed(4)}°N, ${lngNum.toFixed(4)}°E`);
  };

  return (
    <>
      {/* Floating Draggable Bubble */}
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.15}
        whileDrag={{ scale: 1.08, cursor: 'grabbing' }}
        className="fixed bottom-24 right-6 z-[95] select-none"
        title="Drag me anywhere! Click for Upload Guide & Help"
      >
        <div className="relative group">
          {/* Subtle Outer Glow Accent */}
          <div className="absolute inset-0 bg-amber-400/20 blur-xl rounded-full opacity-60 group-hover:opacity-100 transition-opacity" />
          
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all outline-none border border-amber-300/25 font-bold text-xs uppercase tracking-wider cursor-grab"
          >
            <span className="flex items-center justify-center w-5 h-5 bg-white/20 rounded-full animate-bounce">
              <Lightbulb className="w-3.5 h-3.5" />
            </span>
            <span>Upload Hint</span>
            
            {/* Grab HUD Indicator */}
            <Grab className="w-3.5 h-3.5 opacity-45 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
      </motion.div>

      {/* Interactive Expanded Panel Modal/Dialog */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-[#121210]/60 backdrop-blur-sm"
            />

            {/* Content Container */}
            <motion.div
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 30, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative bg-white w-full max-w-lg rounded-[36px] overflow-hidden shadow-2xl border border-amber-100 overflow-y-auto max-h-[90vh]"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-8 text-white relative">
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute top-6 right-6 p-2 bg-black/15 hover:bg-black/30 text-white rounded-full transition-colors outline-none"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-3 mb-2">
                  <span className="p-1 px-3 bg-amber-400 text-amber-950 text-[9px] font-black uppercase tracking-widest rounded-full">
                    Step-by-Step Guide
                  </span>
                </div>
                <h3 className="text-3xl font-serif italic tracking-tight flex items-center gap-2.5">
                  How to Upload a Location
                </h3>
                <p className="text-white/80 text-xs mt-2 max-w-sm tracking-wide">
                  Help map the world's most breathtaking human designs and natural escapes.
                </p>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-gray-100 bg-amber-50/30 p-2 gap-2">
                <button
                  onClick={() => setActiveTab('flow')}
                  className={`flex-1 py-3 text-center rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeTab === 'flow'
                      ? 'bg-amber-100 text-amber-800'
                      : 'text-gray-500 hover:text-black hover:bg-gray-100/55'
                  }`}
                >
                  📖 Upload Flow
                </button>
                <button
                  onClick={() => setActiveTab('pro-tips')}
                  className={`flex-1 py-3 text-center rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeTab === 'pro-tips'
                      ? 'bg-amber-100 text-amber-800'
                      : 'text-gray-500 hover:text-black hover:bg-gray-100/55'
                  }`}
                >
                  💡 Pro Tips
                </button>
                <button
                  onClick={() => setActiveTab('playground')}
                  className={`flex-1 py-3 text-center rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeTab === 'playground'
                      ? 'bg-amber-100 text-amber-800'
                      : 'text-gray-500 hover:text-black hover:bg-gray-100/55'
                  }`}
                >
                  🧭 Geo Helper
                </button>
              </div>

              {/* View Panel Content */}
              <div className="p-6 md:p-8 space-y-6">
                {activeTab === 'flow' && (
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-sm">
                        1
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                          <Search className="w-4 h-4 text-amber-500" /> Search for the Landmark
                        </h4>
                        <p className="text-gray-600 text-xs mt-1.5 leading-relaxed">
                          In the "Search Location" box, start typing. Google Autocomplete fetches verified geocodes, automatically resolving the Country, State, and exact coordinates.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-sm">
                        2
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                          <Image className="w-4 h-4 text-amber-500" /> Grant Permissions & Upload
                        </h4>
                        <p className="text-gray-600 text-xs mt-1.5 leading-relaxed">
                          To display real-time activity, the app prompts you <strong>all over the app</strong> via standard systems. You can upload landmarks directly from your device.
                        </p>
                        <div className="mt-2 text-[10px] text-amber-900 bg-amber-50 rounded-lg p-2.5 space-y-1">
                          <p>📸 <strong>Gallery File Picker:</strong> Browse from your phone gallery and capture with local camera securely. Images are resized completely on-device.</p>
                          <p>🍿 <strong>Interactive App Popups:</strong> Real-time discovery banners fly onto your screen immediately when someone pins a location anywhere on the globe!</p>
                          <p>🔒 <strong>Strict AI Safety Guard:</strong> Artificial intelligence networks and scraping agents are <strong>strictly forbidden</strong> from ever reading, indexing, or processing your uploaded photos and device media files.</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-sm">
                        3
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-amber-500" /> Describe the Experience
                        </h4>
                        <p className="text-gray-600 text-xs mt-1.5 leading-relaxed">
                          Write what makes the place special (e.g. entry hours, historical significance, scenic view spots, tips for visitors).
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-sm">
                        4
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                          <Award className="w-4 h-4 text-amber-500" /> Earn Traveler Points
                        </h4>
                        <p className="text-gray-600 text-xs mt-1.5 leading-relaxed">
                          Every successfully published spot unlocks **+50 Explorer Points**, contributing to global badges and showing your contribution on the live User Leaderboard!
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'pro-tips' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1.5">
                      <span className="text-[9px] font-black uppercase tracking-wider text-amber-700">Coordinates Trick</span>
                      <h5 className="text-xs font-bold text-black font-sans">Using Right-Click in Maps</h5>
                      <p className="text-gray-500 text-[11px] leading-relaxed">
                        If you want exact GPS coordinates, go to Google Maps, find your beautiful landmark, and right-click on it. Click on the latitude & longitude listed at the top to copy them instantly!
                      </p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1.5">
                      <span className="text-[9px] font-black uppercase tracking-wider text-[#00af87]">Unsplash Secret</span>
                      <h5 className="text-xs font-bold text-black font-sans">Free Stock Images</h5>
                      <p className="text-gray-500 text-[11px] leading-relaxed">
                        Search any place on <span className="font-semibold text-gray-700">unsplash.com</span>, right-click any magnificent photo, copy its image link, and paste it into our Image URL slot for stunning visuals!
                      </p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-2xl border border-[#5A5A40]/15 space-y-1.5">
                      <span className="text-[9px] font-black uppercase tracking-wider text-[#5A5A40]">🔔 Live Bell Alerts</span>
                      <h5 className="text-xs font-bold text-black font-sans">Instant Network Pop-ups</h5>
                      <p className="text-gray-500 text-[11px] leading-relaxed">
                        Whenever someone adds a location, an instant simulated mobile notification pops up on everyone's screen with a beautiful, synchronized synthetic chime sound! Enable your notification permissions inside the uploader to join the broadcast.
                      </p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1.5">
                      <span className="text-[9px] font-black uppercase tracking-wider text-blue-700 font-sans">State & Country Hierarchy</span>
                      <h5 className="text-xs font-bold text-black font-sans">Adding Local Regions</h5>
                      <p className="text-gray-500 text-[11px] leading-relaxed">
                        Verify that the continent grid matches your country’s location. Our interactive region filters and cascading drop-downs makes navigation super smooth when states are structured correctly.
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === 'playground' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-100/50">
                      <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-amber-600" /> Geographic Checker Tool
                      </h4>
                      <p className="text-[11px] text-amber-800/80 mt-1 leading-relaxed">
                        Insert custom decimal coordinate values below to simulate coordinate standards before entering them on the live uploader.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] uppercase tracking-wider font-bold text-gray-500 block mb-1">Latitude</label>
                        <input
                          type="text"
                          value={testCoords.lat}
                          onChange={(e) => setTestCoords(prev => ({ ...prev, lat: e.target.value }))}
                          placeholder="e.g. 35.6762"
                          className="w-full bg-[#f5f5f0] border-none rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] uppercase tracking-wider font-bold text-gray-500 block mb-1">Longitude</label>
                        <input
                          type="text"
                          value={testCoords.lng}
                          onChange={(e) => setTestCoords(prev => ({ ...prev, lng: e.target.value }))}
                          placeholder="e.g. 139.6503"
                          className="w-full bg-[#f5f5f0] border-none rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleTestCoords}
                      className="w-full py-2.5 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors uppercase tracking-widest mt-1"
                    >
                      Verify Coordinates
                    </button>

                    {coordsFormatResult && (
                      <div className="p-3.5 bg-gray-50 rounded-xl text-xs text-gray-700 border border-gray-100 font-mono text-[10px] whitespace-pre-line text-center">
                        {coordsFormatResult}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Bar Footer */}
              <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-4">
                <div className="text-[10px] text-gray-400 font-medium">
                  Have everything ready?
                </div>
                
                {isLoggedIn ? (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onLaunchUploader();
                    }}
                    className="py-3 px-5 bg-[#141414] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#5A5A40] transition-colors flex items-center gap-2 shadow-lg"
                  >
                    <Plus className="w-3.5 h-3.5" /> Start Uploading
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onLogin();
                    }}
                    className="py-3 px-5 bg-[#141414] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#5A5A40] transition-colors flex items-center gap-2 shadow-lg"
                  >
                    Login to Contribute
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
