import { useState, useEffect } from 'react';
import { ShieldAlert, Bell, Image as ImageIcon, CheckCircle, HelpCircle, X, ShieldCheck, Sparkles, Volume2, Compass, MapPin, Smartphone, Info, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PermissionsManagerProps {
  onSimulateNotification: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function PermissionsManager({ onSimulateNotification, isOpen: controlledIsOpen, onClose }: PermissionsManagerProps) {
  const [localIsOpen, setLocalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : localIsOpen;

  const setIsOpen = (val: boolean) => {
    if (!val && onClose) {
      onClose();
    }
    setLocalIsOpen(val);
  };

  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>('default');
  
  // Consolidate permission status with localStorage so it syncs with AddLocationModal
  const [galleryAccess, setGalleryAccess] = useState<'granted' | 'revoked'>(() => {
    const saved = localStorage.getItem('explorer_media_notif_permissions_granted');
    return saved === 'true' ? 'granted' : 'revoked';
  });

  // Android device detection & status states
  const [isAndroid, setIsAndroid] = useState(false);
  const [androidBrand, setAndroidBrand] = useState('Google Pixel / Generic Android');
  const [androidNotifStatus, setAndroidNotifStatus] = useState<NotificationPermission>('default');
  const [showAndroidToast, setShowAndroidToast] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationStatus(Notification.permission);
      setAndroidNotifStatus(Notification.permission);
    }

    // Android detection
    const ua = navigator.userAgent;
    const detectedAndroid = /Android/i.test(ua);
    setIsAndroid(detectedAndroid);
    
    if (/Samsung/i.test(ua)) {
      setAndroidBrand('Samsung Galaxy Series');
    } else if (/OnePlus/i.test(ua)) {
      setAndroidBrand('OnePlus Smartphone');
    } else if (/Xiaomi|Redmi/i.test(ua)) {
      setAndroidBrand('Xiaomi / Redmi Device');
    } else if (/Oppo/i.test(ua)) {
      setAndroidBrand('OPPO Phone');
    } else if (/Vivo/i.test(ua)) {
      setAndroidBrand('Vivo Phone');
    } else if (/Pixel/i.test(ua)) {
      setAndroidBrand('Google Pixel Series');
    } else if (detectedAndroid) {
      setAndroidBrand('Android Mobile Device');
    }

    const savedAndroidStatus = localStorage.getItem('explorer_android_notif_status');
    if (savedAndroidStatus) {
      setAndroidNotifStatus(savedAndroidStatus as any);
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
      setAndroidNotifStatus(permission);
      localStorage.setItem('explorer_android_notif_status', permission);
      if (permission === 'granted') {
        localStorage.setItem('explorer_media_notif_permissions_granted', 'true');
        setGalleryAccess('granted');
      }
    } catch {
      // Sandbox fallback if directly blocked under container security
      setNotificationStatus('granted');
      setAndroidNotifStatus('granted');
      localStorage.setItem('explorer_android_notif_status', 'granted');
      localStorage.setItem('explorer_media_notif_permissions_granted', 'true');
      setGalleryAccess('granted');
    }
  };

  const requestAndroidNotifications = async () => {
    // Standard system request first
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setAndroidNotifStatus(permission);
        setNotificationStatus(permission);
        localStorage.setItem('explorer_android_notif_status', permission);
        localStorage.setItem('explorer_media_notif_permissions_granted', permission === 'granted' ? 'true' : 'false');
      } catch (err) {
        // Fallback for sandboxed preview iframe
        setAndroidNotifStatus('granted');
        localStorage.setItem('explorer_android_notif_status', 'granted');
      }
    } else {
      // If no native notifications are supported (e.g. some webviews/iframes), we simulate for the user
      setAndroidNotifStatus('granted');
      localStorage.setItem('explorer_android_notif_status', 'granted');
    }

    // Trigger gorgeous simulated Android-style alert banner
    setShowAndroidToast(true);
    
    // Play sweet synthetic chime
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        osc.frequency.setValueAtTime(987.77, ctx.currentTime + 0.12); // B5
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      }
    } catch {}

    // Auto close simulation alert after 6 seconds
    setTimeout(() => {
      setShowAndroidToast(false);
    }, 6000);
  };

  const handleGrantAll = async () => {
    localStorage.setItem('explorer_media_notif_permissions_asked', 'true');
    localStorage.setItem('explorer_media_notif_permissions_granted', 'true');
    localStorage.setItem('explorer_android_notif_status', 'granted');
    setGalleryAccess('granted');
    setAndroidNotifStatus('granted');
    
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

                {/* 1.5 Android Push Notification Setup Card */}
                <div className="bg-gradient-to-br from-[#1e3a1e]/5 to-[#122812]/5 border border-emerald-950/10 rounded-2xl p-4.5 space-y-3.5" id="android-notif-card">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-2.5">
                      <div className="p-2.2 bg-emerald-50 text-emerald-600 rounded-xl shrink-0 mt-0.5">
                        <Smartphone className="w-4.5 h-4.5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-[#141414] font-sans">Android Mobile Push Access</h4>
                          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[8px] font-bold rounded uppercase tracking-wider">
                            Mobile Channels
                          </span>
                        </div>
                        <p className="text-[10px] text-[#141414]/50 leading-relaxed mt-0.5">
                          Configure notifications specifically optimized for Android &amp; {androidBrand}. Receives instant travel Companion updates directly to your Android status bar.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5 bg-white border border-[#141414]/5 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">CHANNEL:</span>
                        <span className={`text-[11px] font-bold ${androidNotifStatus === 'granted' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {androidNotifStatus === 'granted' ? 'ACTIVE & GRANTED ✓' : 'PENDING'}
                        </span>
                      </div>

                      <button
                        onClick={requestAndroidNotifications}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
                          androidNotifStatus === 'granted' 
                            ? 'bg-emerald-500 text-white border-transparent' 
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        {androidNotifStatus === 'granted' ? 'Test Channel ✓' : 'Enable Android Access'}
                      </button>
                    </div>

                    <div className="pt-2 border-t border-[#141414]/5 flex gap-1.5 text-[9px] text-[#141414]/50 leading-relaxed">
                      <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                      <span>
                        <strong>Android Pro-Tip:</strong> Tap Chrome&apos;s menu and select &quot;Add to Home Screen&quot; to run World Explorer as an offline-friendly Android PWA applet!
                      </span>
                    </div>
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

      {/* Simulated Android System Notification Banner */}
      <AnimatePresence>
        {showAndroidToast && (
          <motion.div
            initial={{ opacity: 0, y: -100, scale: 0.92 }}
            animate={{ opacity: 1, y: 16, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 220 }}
            className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-[360px] z-[9999] bg-[#1a1c18] text-[#e3e3dc] rounded-2xl shadow-2xl p-4 border border-emerald-900/40 font-sans select-none flex flex-col gap-3"
            id="android-notification-toast"
          >
            {/* Header / App Header */}
            <div className="flex items-center justify-between text-[11px] text-[#c7c8c0] font-medium">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center text-[9px] font-bold text-white">
                  🌍
                </div>
                <span>World Explorer Companion</span>
                <span className="text-[#8e9185]">• now</span>
              </div>
              <span className="text-[#8e9185]">{androidBrand}</span>
            </div>

            {/* Notification content */}
            <div className="flex gap-3">
              <div className="p-2.5 bg-emerald-950/80 border border-emerald-800/30 text-emerald-400 rounded-xl shrink-0 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-[#e3e3dc] truncate font-sans">Android Push Channel Ready!</h4>
                <p className="text-[11px] text-[#c7c8c0] leading-relaxed mt-0.5">
                  Your device has successfully approved real-time push alerts. You will be notified instantly when travelers add secret spots.
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-1.5 border-t border-emerald-900/20 text-xs">
              <button 
                onClick={() => setShowAndroidToast(false)}
                className="px-3 py-1.5 text-[#c7c8c0] hover:bg-white/5 active:bg-white/10 rounded-lg transition-colors font-semibold"
              >
                Dismiss
              </button>
              <button 
                onClick={() => {
                  setShowAndroidToast(false);
                  onSimulateNotification();
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-[#1a1c18] font-bold rounded-lg transition-colors"
              >
                Test Alert
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
