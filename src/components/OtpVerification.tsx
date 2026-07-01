import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Compass, Mail, Phone, ArrowRight, RefreshCw, AlertTriangle, CheckCircle2, Lock, LogOut, Sparkles } from 'lucide-react';
import { User } from 'firebase/auth';

interface OtpVerificationProps {
  user: User;
  onVerifySuccess: () => void;
  onCancel: () => void;
}

export default function OtpVerification({ user, onVerifySuccess, onCancel }: OtpVerificationProps) {
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  
  // OTP flow state
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(''));
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Notification Toast for showing the simulated OTP delivery
  const [simulatedToast, setSimulatedToast] = useState<string | null>(null);
  
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Synthesize beautiful, premium sound waves using Web Audio API
  const playSound = (type: 'send' | 'success' | 'fail') => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const osc1 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc1.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      if (type === 'send') {
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        osc1.frequency.setValueAtTime(880.00, ctx.currentTime + 0.1); // A5
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc1.start();
        osc1.stop(ctx.currentTime + 0.4);
      } else if (type === 'success') {
        const osc2 = ctx.createOscillator();
        const osc3 = ctx.createOscillator();
        osc2.connect(gainNode);
        osc3.connect(gainNode);
        
        osc1.type = 'sine';
        osc2.type = 'sine';
        osc3.type = 'sine';
        
        // Perfect Major triad chord (C5, E5, G5) that resolves up to C6
        osc1.frequency.setValueAtTime(523.25, ctx.currentTime); 
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime); 
        osc3.frequency.setValueAtTime(783.99, ctx.currentTime); 
        
        osc1.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.15); // C6
        osc2.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.15); // E6
        osc3.frequency.setValueAtTime(1567.98, ctx.currentTime + 0.15); // G6
        
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
        
        osc1.start();
        osc2.start();
        osc3.start();
        
        osc1.stop(ctx.currentTime + 0.85);
        osc2.stop(ctx.currentTime + 0.85);
        osc3.stop(ctx.currentTime + 0.85);
      } else if (type === 'fail') {
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(120, ctx.currentTime); // Low buzz
        osc1.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.25);
        
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
        
        osc1.start();
        osc1.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {
      console.warn("OTP synthesizer block:", e);
    }
  };

  // Cooldown Resend Timer countdown
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer(t => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // Mask user email for beautiful visual layout (e.g. mu***c41@gmail.com)
  const maskEmail = (emailStr: string | null) => {
    if (!emailStr) return 'explorer@world.com';
    const parts = emailStr.split('@');
    if (parts.length !== 2) return emailStr;
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 3) return `${name[0]}***@${domain}`;
    return `${name.substring(0, 2)}***${name.substring(name.length - 2)}@${domain}`;
  };

  // Generate simulated 6-digit OTP code and present beautifully
  const handleSendOtp = () => {
    if (method === 'phone') {
      // Basic phone format check
      const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');
      if (cleanPhone.length < 8) {
        setPhoneError('Please enter a valid telephone number.');
        return;
      }
      setPhoneError('');
    }

    setIsVerifying(false);
    setErrorMsg('');
    setOtpDigits(Array(6).fill(''));

    // Generate random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setIsOtpSent(true);
    setTimer(60); // 60s cooldown

    // Play chime sound
    playSound('send');

    // Display beautiful simulation pop-up alert
    const targetRecipient = method === 'email' ? user.email || 'your email' : phoneNumber;
    setSimulatedToast(`SIMULATED METADATA RELAY: Code [${code}] dispatched to ${targetRecipient}`);
    
    // Auto focus the first input field
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 300);
  };

  // Handle single digit inputs
  const handleDigitChange = (index: number, val: string) => {
    const cleanVal = val.replace(/[^0-9]/g, '');
    if (!cleanVal) {
      const newDigits = [...otpDigits];
      newDigits[index] = '';
      setOtpDigits(newDigits);
      return;
    }

    // Capture the last character to handle fast typing/replacements
    const singleChar = cleanVal.substring(cleanVal.length - 1);
    const newDigits = [...otpDigits];
    newDigits[index] = singleChar;
    setOtpDigits(newDigits);

    // Shift focus to next input box
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle keydown for Backspace deletes to shift focus backwards
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const newDigits = [...otpDigits];
      newDigits[index - 1] = '';
      setOtpDigits(newDigits);
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle clipboard paste
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim().replace(/[^0-9]/g, '');
    if (pasteData.length >= 6) {
      const parsedDigits = pasteData.substring(0, 6).split('');
      setOtpDigits(parsedDigits);
      // Focus on the final or most relevant field
      inputRefs.current[5]?.focus();
    }
  };

  // Trigger quick demo fill to skip typing manual codes
  const handleQuickDemoFill = () => {
    if (!generatedOtp) return;
    setOtpDigits(generatedOtp.split(''));
    playSound('send');
    setTimeout(() => {
      inputRefs.current[5]?.focus();
    }, 100);
  };

  // Verify code logic
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredCode = otpDigits.join('');
    if (enteredCode.length < 6) {
      setErrorMsg('Please input all 6 digits of the verification code.');
      playSound('fail');
      return;
    }

    setIsVerifying(true);
    setErrorMsg('');

    // Simulate verification delay
    setTimeout(() => {
      if (enteredCode === generatedOtp) {
        setSuccess(true);
        playSound('success');
        
        // Final success callback after custom gorgeous delay
        setTimeout(() => {
          onVerifySuccess();
        }, 1500);
      } else {
        setErrorMsg('Invalid verification code. Please check and try again.');
        setIsVerifying(false);
        playSound('fail');
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0] flex flex-col items-center justify-center p-6 text-[#141414] relative overflow-hidden">
      
      {/* Background Rotating globe / elements to match App style */}
      <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none opacity-[0.03] select-none flex items-center justify-center">
        <Compass className="w-[600px] h-[600px] animate-spin" style={{ animationDuration: '180s' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        
        {/* Beautiful Simulated Toast Header */}
        <AnimatePresence>
          {simulatedToast && (
            <motion.div
              initial={{ opacity: 0, y: -40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="mb-6 w-full bg-[#141414] text-white p-4 rounded-[20px] shadow-xl border border-white/10 flex items-start gap-3.5 text-xs font-mono relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-1">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <Compass className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 animate-spin" style={{ animationDuration: '10s' }} />
              <div className="space-y-1">
                <div className="font-sans uppercase font-black text-[9px] tracking-widest text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-emerald-400" /> Simulated Delivery Relay Hub
                </div>
                <div className="opacity-90 leading-relaxed break-words">{simulatedToast}</div>
                <button
                  type="button"
                  onClick={handleQuickDemoFill}
                  className="mt-2 inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all shadow-inner uppercase tracking-wider"
                >
                  <Lock className="w-3 h-3" /> Auto-Fill Code
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full bg-white p-10 md:p-12 rounded-[48px] shadow-2xl border border-[#141414]/5 space-y-8 relative overflow-hidden"
        >
          {/* Active Success screen overlay */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white z-50 flex flex-col items-center justify-center p-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0.6, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 15 }}
                  className="w-24 h-24 bg-emerald-50 rounded-[40px] flex items-center justify-center mb-6 shadow-md border border-emerald-100"
                >
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 animate-pulse" />
                </motion.div>
                <h3 className="text-3xl font-serif italic text-emerald-900">Verification Complete</h3>
                <p className="text-sm text-[#141414]/50 max-w-[280px] mt-3">
                  Secured portal access validated successfully. Welcoming explorer...
                </p>
                <div className="mt-8 flex justify-center">
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-[#141414]/5 rounded-[24px] flex items-center justify-center border border-[#141414]/5">
              <ShieldCheck className="w-8 h-8 text-[#141414]" />
            </div>
            <div>
              <h2 className="text-3xl font-serif italic tracking-tight">Security Gateway</h2>
              <p className="text-[9px] uppercase font-black tracking-[0.25em] opacity-30 mt-1.5">Two-Factor Authentication</p>
            </div>
          </div>

          {!isOtpSent ? (
            /* Setup Step: Choose where to receive code */
            <div className="space-y-6">
              <p className="text-xs text-[#141414]/50 leading-relaxed text-center max-w-[300px] mx-auto">
                Before logging into your World Explorer dashboard, we require a verification check to safeguard your contributions and personal archives.
              </p>

              {/* Toggle verification method */}
              <div className="grid grid-cols-2 p-1 bg-[#f5f5f0] rounded-2xl border border-[#141414]/5">
                <button
                  type="button"
                  onClick={() => { setMethod('email'); setPhoneError(''); }}
                  className={`py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    method === 'email' ? 'bg-white shadow text-[#141414]' : 'text-[#141414]/40 hover:text-[#141414]/70'
                  }`}
                >
                  <Mail className="w-4 h-4" /> Email
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('phone')}
                  className={`py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    method === 'phone' ? 'bg-white shadow text-[#141414]' : 'text-[#141414]/40 hover:text-[#141414]/70'
                  }`}
                >
                  <Phone className="w-4 h-4" /> SMS / Phone
                </button>
              </div>

              {method === 'email' ? (
                <div className="bg-[#f5f5f0]/50 p-5 rounded-[24px] border border-[#141414]/5 space-y-2">
                  <div className="text-[10px] uppercase font-black tracking-widest text-[#141414]/30">Primary Email Destination</div>
                  <div className="font-serif italic text-base text-[#141414] flex items-center gap-2">
                    <Mail className="w-4 h-4 opacity-40 shrink-0" />
                    <span>{maskEmail(user.email)}</span>
                  </div>
                  <div className="text-[9px] text-[#141414]/40 leading-normal">
                    This matches the credentials verified through Google.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="text-[10px] uppercase font-black tracking-widest text-[#141414]/40 block pl-1">
                    Enter Mobile Number
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#141414]/40 font-mono flex items-center gap-1.5">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      placeholder="+1 (555) 019-2834"
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                        if(phoneError) setPhoneError('');
                      }}
                      className="w-full pl-12 pr-4 py-4 bg-[#f5f5f0] border border-[#141414]/10 rounded-[20px] text-sm focus:outline-none focus:ring-1 focus:ring-[#141414]/20 font-mono"
                    />
                  </div>
                  {phoneError && (
                    <p className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> {phoneError}
                    </p>
                  )}
                  <p className="text-[9px] text-[#141414]/40 leading-relaxed pl-1">
                    We will simulate routing an SMS token over our simulated global telecom network.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={handleSendOtp}
                className="w-full bg-[#141414] text-white py-4.5 rounded-[24px] font-bold text-xs uppercase tracking-widest hover:bg-[#333] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-xl mt-4"
              >
                Send Verification Code <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* OTP Digits Input Form */
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="text-center space-y-1 max-w-[280px] mx-auto">
                <p className="text-xs text-[#141414]/50 leading-relaxed">
                  We've sent a 6-digit confirmation key to{' '}
                  <span className="font-bold text-[#141414]/80">
                    {method === 'email' ? maskEmail(user.email) : phoneNumber}
                  </span>.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsOtpSent(false);
                    setOtpDigits(Array(6).fill(''));
                    setGeneratedOtp(null);
                  }}
                  className="text-[10px] font-bold uppercase tracking-wider text-[#141414]/40 hover:text-[#141414] underline"
                >
                  Change Destination
                </button>
              </div>

              {/* 6 Digit Input Boxes */}
              <div className="flex justify-between items-center gap-2 py-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    ref={(el) => { inputRefs.current[idx] = el; }}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={idx === 0 ? handlePaste : undefined}
                    className="w-12 h-14 md:w-14 md:h-16 text-center text-xl font-bold bg-[#f5f5f0] border border-[#141414]/10 rounded-2xl focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#141414] transition-all font-mono"
                  />
                ))}
              </div>

              {errorMsg && (
                <p className="text-xs font-bold text-red-600 text-center flex items-center justify-center gap-1 bg-red-50/50 py-2.5 px-4 rounded-xl border border-red-100">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {errorMsg}
                </p>
              )}

              <div className="space-y-4">
                <button
                  type="submit"
                  disabled={isVerifying || otpDigits.join('').length < 6}
                  className="w-full bg-[#141414] disabled:bg-[#141414]/30 text-white py-4.5 rounded-[24px] font-bold text-xs uppercase tracking-widest hover:bg-[#333] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-xl"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Verifying Access...
                    </>
                  ) : (
                    'Confirm Code & Open Explorer'
                  )}
                </button>

                {/* Resend Cooldown Counter */}
                <div className="text-center">
                  {timer > 0 ? (
                    <div className="text-[10px] uppercase font-black tracking-wider text-[#141414]/30">
                      Resend code in {timer}s
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#141414]/60 hover:text-[#141414] group"
                    >
                      <RefreshCw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" /> Send new OTP Code
                    </button>
                  )}
                </div>
              </div>
            </form>
          )}

          {/* Cancellation options */}
          <div className="pt-6 border-t border-[#141414]/5 flex justify-center">
            <button
              type="button"
              onClick={onCancel}
              className="text-[10px] font-bold uppercase tracking-widest text-red-600/60 hover:text-red-700 flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out & Return
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
