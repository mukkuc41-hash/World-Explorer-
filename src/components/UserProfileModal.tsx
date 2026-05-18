import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { X, User as UserIcon, Calendar, Mail, Phone, ChevronDown, Check } from 'lucide-react';

interface UserProfile {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phoneNumber: string;
  birthDate: string;
  gender: string;
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export default function UserProfileModal({ isOpen, onClose, user }: UserProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile>({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phoneNumber: '',
    birthDate: '',
    gender: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchProfile();
    }
  }, [isOpen, user]);

  const fetchProfile = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      } else {
        // Pre-fill with user info if no profile exists
        setProfile(prev => ({
          ...prev,
          email: user.email || '',
          firstName: user.displayName?.split(' ')[0] || '',
          lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
          username: '@' + (user.email?.split('@')[0] || 'user')
        }));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        ...profile,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    } finally {
      setIsSaving(false);
    }
  };

  const inputClasses = "w-full bg-[#fdfdfc] border border-[#141414]/15 focus:border-[#141414] px-5 py-4 rounded-2xl text-base outline-none transition-all placeholder:text-[#141414]/20 font-medium";
  const labelClasses = "block text-xs font-bold text-[#141414]/40 uppercase tracking-[0.15em] mb-2 px-1";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#f5f5f0]/90 backdrop-blur-xl"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[48px] shadow-2xl overflow-hidden border border-[#141414]/5"
          >
            <div className="p-8 md:p-12 overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-4xl font-sans font-bold tracking-tight text-[#141414]">Edit Profile</h2>
                <button 
                  onClick={onClose}
                  className="p-3 hover:bg-[#f5f5f0] rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-12 h-12 border-4 border-[#141414]/10 border-t-[#141414] rounded-full animate-spin" />
                  <p className="text-sm font-bold uppercase tracking-widest opacity-30">Loading Profile...</p>
                </div>
              ) : (
                <form onSubmit={handleSave} className="space-y-8">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClasses}>First Name</label>
                      <input
                        type="text"
                        value={profile.firstName}
                        onChange={e => setProfile({...profile, firstName: e.target.value})}
                        className={inputClasses}
                        placeholder="e.g. Sabrina"
                      />
                    </div>
                    <div>
                      <label className={labelClasses}>Last Name</label>
                      <input
                        type="text"
                        value={profile.lastName}
                        onChange={e => setProfile({...profile, lastName: e.target.value})}
                        className={inputClasses}
                        placeholder="e.g. Aryan"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClasses}>Username</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={profile.username}
                        onChange={e => setProfile({...profile, username: e.target.value})}
                        className={inputClasses}
                        placeholder="@username"
                      />
                      <UserIcon className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-20" />
                    </div>
                  </div>

                  <div>
                    <label className={labelClasses}>Email</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={profile.email}
                        readOnly
                        className={`${inputClasses} bg-[#f5f5f0] cursor-not-allowed`}
                      />
                      <Mail className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-20" />
                    </div>
                  </div>

                  <div>
                    <label className={labelClasses}>Phone Number</label>
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-2 border-r border-[#141414]/10 pr-3 mr-3 h-6">
                        <span className="text-sm font-bold opacity-40">+234</span>
                        <ChevronDown className="w-3 h-3 opacity-40" />
                      </div>
                      <input
                        type="tel"
                        value={profile.phoneNumber}
                        onChange={e => setProfile({...profile, phoneNumber: e.target.value})}
                        className={`${inputClasses} pl-24`}
                        placeholder="904 6470"
                      />
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 w-px h-6 bg-[#00af87] animate-pulse" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={labelClasses}>Birth</label>
                      <div className="relative">
                        <input
                          type="date"
                          value={profile.birthDate}
                          onChange={e => setProfile({...profile, birthDate: e.target.value})}
                          className={`${inputClasses} appearance-none`}
                        />
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                           <ChevronDown className="w-5 h-5 opacity-40" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className={labelClasses}>Gender</label>
                      <div className="relative">
                        <select
                          value={profile.gender}
                          onChange={e => setProfile({...profile, gender: e.target.value})}
                          className={`${inputClasses} appearance-none cursor-pointer`}
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Non-binary">Non-binary</option>
                          <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                           <ChevronDown className="w-5 h-5 opacity-40" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className={`w-full py-5 rounded-[24px] font-bold text-lg uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${
                        saveSuccess 
                          ? 'bg-[#00af87] text-white' 
                          : 'bg-[#141414] text-white hover:bg-[#333] active:scale-95'
                      } disabled:opacity-50`}
                    >
                      {isSaving ? (
                        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : saveSuccess ? (
                        <><Check className="w-6 h-6" /> Profile Saved</>
                      ) : (
                        'Update Profile'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
