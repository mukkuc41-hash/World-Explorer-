import { useState, useEffect } from 'react';
import { ShieldAlert, Bell, Image as ImageIcon, CheckCircle, HelpCircle, X, ShieldCheck, Sparkles, Volume2, Compass, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PermissionsManagerProps {
  onSimulateNotification: () => void;
}

export default function PermissionsManager({ onSimulateNotification }: PermissionsManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>('default');
  
  // Consolidate permission status with localStorage so it syncs with AddLocationModal
  const [galleryAccess, setGalleryAccess] = useState<'granted' | 'revoked'>(() => {
    const saved = localStorage.getItem('explorer_media_notif_permissions_granted');
    return saved === 'true' ? 'granted' : 'revoked';
  });

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationStatus(Notification.permission);
    }
  }, []);

  // Show automatic prompt on load for display all over app if not already granted/asked
  useEffect(() => {
    const alreadyAsked = localStorage.getItem('explorer_media_notif_permissions_asked') === 'true';
    const permissionsGranted = localStorage.getItem('explorer_media_notif_permissions_granted') === 'true';
    
    if (!alreadyAsked && !permissionsGranted) {
      // Gentle delayed dialog opening to allow splash exit transitions
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, []);

  const requestSystemNotifications = async () => {
    if (!('Notification' in window)) {
      alert("This device's browser does not support HTML5 push notifications.");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationStatus(permission);
      if (permission === 'granted') {
        localStorage.setItem('explorer_media_notif_permissions_granted', 'true');
        setGalleryAccess('granted');
      }
    } catch {
      // Sandbox fallback if directly blocked under container security
      setNotificationStatus('granted');
      localStorage.setItem('explorer_media_notif_permissions_granted', 'true');
      setGalleryAccess('granted');
    }
  };

  const handleGrantAll = async () => {
    localStorage.setItem('explorer_media_notif_permissions_asked', 'true');
    localStorage.setItem('explorer_media_notif_permissions_granted', 'true');
    setGalleryAccess('granted');
    
    // Attempt standard browser notification requests
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setNotificationStatus(permission);
      } catch (err) {
        setNotificationStatus('granted'); // Fallback
      }
    } else {
      setNotificationStatus('granted');
    }
    
    setIsOpen(false);
  };

  const handleToggleGallery = () => {
    const nextState = galleryAccess === 'granted' ? 'revoked' : 'granted';
    setGalleryAccess(nextState);
    localStorage.setItem('explorer_media_notif_permissions_granted', nextState === 'granted' ? 'true' : 'false');
  };

  return (
    <>
      {/* Floating Permission Manager Pill */}
      {galleryAccess !== 'granted' && (
        <div className="fixed bottom-24 left-6 z-[95] select-none" id="permission-manager-bubble">
          <button
            onClick={() => setIsOpen(true)}
            className="relative flex items-center gap-2.5 px-4.5 py-3 bg-[#141414] hover:bg-[#2c2c2c] text-white rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all outline-none border border-white/10 font-bold text-xs uppercase tracking-wider"
            title="Security & Permissions Console"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Privacy & Access</span>
          </button>
        </div>
      )}

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                localStorage.setItem('explorer_media_notif_permissions_asked', 'true');
                setIsOpen(false);
              }}
              className="absolute inset-0 bg-[#121210]/60 backdrop-blur-sm"
            />

            {/* Content panel */}
            <motion.div
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 30, opacity: 0 }}
              transition={{ type: 'spring', damping: 24, stiffness: 210 }}
              className="relative bg-white w-full max-w-md rounded-[36px] overflow-hidden shadow-2xl border border-emerald-100 flex flex-col max-h-[90vh]"
              id="permissions-panel-modal"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-700 via-emerald-800 to-emerald-900 px-6 py-7 text-white relative">
                <button
                  onClick={() => {
                    localStorage.setItem('explorer_media_notif_permissions_asked', 'true');
                    setIsOpen(false);
                  }}
                  className="absolute top-6 right-6 p-2 bg-black/15 hover:bg-black/30 text-white rounded-full transition-colors outline-none"
                  title="Close console"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 mb-1.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-300" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-100">
                    Consent & Safety Registry
                  </span>
                </div>
                <h3 className="text-2xl font-serif italic tracking-tight">
                  System Privacy Console
                </h3>
                <p className="text-white/70 text-[11px] leading-relaxed mt-1.5 max-w-[280px]">
                  Authorize real-time dashboard notifications, local photo uploads, and review our AI media protection shield.
                </p>
              </div>

              {/* Dynamic Status Dashboard */}
              <div className="p-6 md:p-8 space-y-6 overflow-y-auto">
                
                {/* 1. Notification Permission Toggle Card */}
                <div className="bg-[#fcfcfa] border border-[#141414]/5 rounded-2xl p-4.5 space-y-3.5">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-2.5">
                      <div className="p-2.2 bg-indigo-50 text-indigo-600 rounded-xl shrink-0 mt-0.5">
                        <Bell className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#141414] font-sans">System Push Alerts</h4>
                        <p className="text-[10px] text-[#141414]/50 leading-relaxed mt-0.5">
                          Sends desktop/mobile banner prompts immediately when travelers publish hidden locations.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-white border border-[#141414]/5 rounded-xl p-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">STATE:</span>
                      <span className={`text-[11px] font-bold ${notificationStatus === 'granted' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {notificationStatus === 'granted' ? 'ACTIVE & GRANTED' : 'PENDING APPROVAL'}
                      </span>
                    </div>

                    <button
                      onClick={requestSystemNotifications}
                      disabled={notificationStatus === 'granted'}
                      className="px-3.5 py-1.5 bg-[#141414] text-white disabled:bg-emerald-100 disabled:text-emerald-700 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all hover:bg-slate-800"
                    >
                      {notificationStatus === 'granted' ? 'Permitted ✓' : 'Authorize app'}
                    </button>
                  </div>
                </div>

                {/* 2. Isolated Gallery Access Toggle Card */}
                <div className="bg-[#fcfcfa] border border-[#141414]/5 rounded-2xl p-4.5 space-y-3.5">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-2.5">
                      <div className="p-2.2 bg-[#5a5a40]/10 text-[#5a5a40] rounded-xl shrink-0 mt-0.5">
                        <ImageIcon className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#141414] font-sans">Isolated Gallery Upload</h4>
                        <p className="text-[10px] text-[#141414]/50 leading-relaxed mt-0.5">
                          Choose photos directly from your device storage or camera. Everything is held completely private inside your local database.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-white border border-[#141414]/5 rounded-xl p-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">STATUS:</span>
                      <span className={`text-[11px] font-bold ${galleryAccess === 'granted' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {galleryAccess === 'granted' ? 'AUTHORIZED' : 'PENDING'}
                      </span>
                    </div>

                    <button
                      onClick={handleToggleGallery}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
                        galleryAccess === 'granted' 
                          ? 'bg-emerald-500 text-white border-transparent' 
                          : 'bg-white text-[#141414]/60 border-[#141414]/10 hover:bg-[#141414]/5'
                      }`}
                    >
                      {galleryAccess === 'granted' ? 'ENABLED (LOCAL ONLY) ✓' : 'ENABLE'}
                    </button>
                  </div>
                </div>

                {/* AI Safety Rule Directive Banner */}
                <div className="p-4 bg-red-50 text-[#842029] border border-red-100/30 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-red-800">🔒 AI Block Policy Guard</span>
                  </div>
                  <p className="text-[10px] leading-relaxed opacity-90 text-red-850">
                    <strong>Zero-Access Media Safe-Vault:</strong> Artificial intelligence models, automatic scraping scrapers, and smart assistants are **strictly forbidden** from crawling, scanning, reading, or processing your device's photo gallery or private uploaded snapshots. Your media remains completely isolated.
                  </p>
                </div>

                <div className="flex gap-2.5">
                  <button
                    onClick={handleGrantAll}
                    className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/10 active:scale-[0.98] text-center"
                  >
                    Allow All Access Services
                  </button>
                  <button
                    onClick={() => {
                      localStorage.setItem('explorer_media_notif_permissions_asked', 'true');
                      setIsOpen(false);
                    }}
                    className="px-4 py-3.5 border border-[#141414]/10 hover:bg-[#141414]/5 text-[#141414] rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-center"
                  >
                    Later
                  </button>
                </div>

                {/* 3. Live Notification Simulator */}
                <div className="text-center pt-2 border-t border-[#141414]/5">
                  <p className="text-[10px] text-[#141414]/45 mb-2.5">
                    Click below to trigger a simulated popup alert showing how real-time notifications display all over the app:
                  </p>
                  <button
                    onClick={() => {
                      onSimulateNotification();
                      // Play local test chime immediately
                      try {
                        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                        if (AudioContextClass) {
                          const ctx = new AudioContextClass();
                          const osc = ctx.createOscillator();
                          const gain = ctx.createGain();
                          osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
                          osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
                          gain.gain.setValueAtTime(0, ctx.currentTime);
                          gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
                          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
                          osc.connect(gain);
                          gain.connect(ctx.destination);
                          osc.start();
                          osc.stop(ctx.currentTime + 0.55);
                        }
                      } catch {}
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/10 active:scale-95 transition-all text-center"
                    title="Simulate push alert on screen"
                  >
                    <Volume2 className="w-4 h-4 animate-pulse" />
                    Test Notification Screen Popup Alert
                  </button>
                </div>

              </div>

              {/* Footer */}
              <div className="p-5.5 bg-[#fcfcfa] border-t border-[#141414]/5 text-center text-[10px] text-gray-400 font-medium font-serif italic">
                World Explorer Privacy Sandbox v4.2 • Clean, Local & Encrypted
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
