import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, Send, RefreshCw, Loader2, CheckCircle2, AlertCircle, 
  MapPin, Calendar, ArrowRight, Inbox, ChevronRight, Sparkles, 
  Plus, LogOut, ShieldCheck, Search, HelpCircle, Eye, Check, X
} from 'lucide-react';
import { auth, db } from '../lib/firebase.ts';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  category?: 'flight' | 'hotel' | 'ticket' | 'general';
}

export default function GmailTravelHub() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  // Travel inbox scanner states
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [emailSearchQuery, setEmailSearchQuery] = useState('subject:(flight OR booking OR hotel OR ticket OR itinerary OR travel)');
  const [selectedEmail, setSelectedEmail] = useState<GmailMessage | null>(null);
  const [inboxError, setInboxError] = useState<string | null>(null);

  // Send itinerary / landmark log states
  const [savedLocations, setSavedLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<any | null>(null);
  const [recipient, setRecipient] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Confirmation dialog state (MANDATORY per safety/security rules for mutating actions)
  const [showSendConfirm, setShowSendConfirm] = useState(false);

  // 1. Fetch saved locations from Firestore for the sharing dropdown
  useEffect(() => {
    async function loadSavedLocations() {
      if (!auth.currentUser) return;
      try {
        const q = query(
          collection(db, 'locations'), 
          where('userId', '==', auth.currentUser.uid)
        );
        const snap = await getDocs(q);
        const locs = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((loc: any) => !loc.isDeleted);
        setSavedLocations(locs);
        if (locs.length > 0) {
          setSelectedLocation(locs[0]);
        }
      } catch (err) {
        console.error('Error loading locations for Gmail share:', err);
      }
    }
    loadSavedLocations();
  }, [accessToken]);

  // Set default subject and body message when selected location changes
  useEffect(() => {
    if (selectedLocation) {
      setCustomSubject(`Travel Log: Exploring ${selectedLocation.name}`);
      setCustomMessage(`Hey! I wanted to share this amazing discovery with you: **${selectedLocation.name}** in ${selectedLocation.country || 'the world'}.\n\nIt is situated at coordinates [${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}].\n\nDescription: ${selectedLocation.description || 'No description provided.'}\n\nCheck it out on the World Explorer platform!`);
    }
  }, [selectedLocation]);

  // 2. Connect to Gmail using Google Auth Provider & Request scopes
  const handleConnectGmail = async () => {
    setIsConnecting(true);
    setInboxError(null);
    try {
      const provider = new GoogleAuthProvider();
      // Ensure we request the explicit Gmail scopes required
      provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
      provider.addScope('https://www.googleapis.com/auth/gmail.send');
      provider.addScope('https://www.googleapis.com/auth/gmail.compose');
      provider.addScope('https://www.googleapis.com/auth/gmail.modify');

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
        setCurrentUserEmail(result.user.email);
        // Automatically start scanning the inbox on connection
        scanGmailInbox(credential.accessToken);
      } else {
        throw new Error('No access token returned from Google authentication.');
      }
    } catch (err: any) {
      console.error('Gmail Connection Error:', err);
      setInboxError(err.message || 'Authentication failed. Please check popup permissions.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setAccessToken(null);
    setCurrentUserEmail(null);
    setEmails([]);
    setSelectedEmail(null);
  };

  // 3. Scan Gmail Inbox for travel-related documents via Gmail REST API
  const scanGmailInbox = async (token = accessToken) => {
    if (!token) return;
    setIsLoadingEmails(true);
    setInboxError(null);
    setEmails([]);
    try {
      // Step A: Search for messages matching query
      const searchUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(emailSearchQuery)}&maxResults=8`;
      const searchRes = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!searchRes.ok) {
        if (searchRes.status === 401) {
          handleDisconnect();
          throw new Error('Your session has expired. Please re-connect Gmail.');
        }
        throw new Error(`Gmail API returned status ${searchRes.status}`);
      }

      const searchData = await searchRes.json();
      if (!searchData.messages || searchData.messages.length === 0) {
        setEmails([]);
        setIsLoadingEmails(false);
        return;
      }

      // Step B: Fetch full details for each message concurrently
      const detailPromises = searchData.messages.map(async (msg: { id: string }) => {
        const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!detailRes.ok) return null;
        const detail = await detailRes.json();

        // Extract headers
        const headers = detail.payload.headers;
        const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
        const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';
        const rawDate = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';
        const date = new Date(rawDate).toLocaleDateString(undefined, { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        });

        // Determine category based on content keywords
        const lowerSubject = subject.toLowerCase() + ' ' + detail.snippet.toLowerCase();
        let category: 'flight' | 'hotel' | 'ticket' | 'general' = 'general';
        if (lowerSubject.includes('flight') || lowerSubject.includes('airline') || lowerSubject.includes('boarding')) {
          category = 'flight';
        } else if (lowerSubject.includes('hotel') || lowerSubject.includes('resort') || lowerSubject.includes('stay') || lowerSubject.includes('hostel')) {
          category = 'hotel';
        } else if (lowerSubject.includes('ticket') || lowerSubject.includes('booking') || lowerSubject.includes('reservation')) {
          category = 'ticket';
        }

        return {
          id: detail.id,
          threadId: detail.threadId,
          subject,
          from,
          date,
          snippet: detail.snippet,
          category
        };
      });

      const results = await Promise.all(detailPromises);
      setEmails(results.filter((r): r is GmailMessage => r !== null));
    } catch (err: any) {
      console.error('Error scanning travel inbox:', err);
      setInboxError(err.message || 'Failed to scan travel emails. Please try again.');
    } finally {
      setIsLoadingEmails(false);
    }
  };

  // 4. Send beautiful HTML itinerary via Gmail API
  const handleSendItinerary = async () => {
    if (!accessToken || !recipient) return;
    setIsSending(true);
    setSendError(null);
    setSendSuccess(false);

    try {
      const subject = customSubject;
      // Construct a premium, stylized HTML template matching the application's aesthetic
      const htmlBody = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #fcfcf9; border-radius: 16px; border: 1px solid #e1e1d8; color: #141414;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 900; color: #5a5a40; opacity: 0.7;">WORLD EXPLORER TRANSIT LOG</span>
            <h1 style="font-family: Georgia, serif; font-size: 28px; margin: 8px 0; color: #141414; font-style: italic;">Travel Discovery Shared</h1>
          </div>
          
          <div style="background-color: #ffffff; border-radius: 12px; border: 1px solid rgba(0, 0, 0, 0.05); padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.02); margin-bottom: 24px;">
            <h2 style="font-size: 20px; margin-top: 0; margin-bottom: 8px; color: #5a5a40;">${selectedLocation?.name || 'Incredible Landmark'}</h2>
            <p style="font-size: 12px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.1em; color: #00af87; margin-bottom: 16px;">
              📍 ${selectedLocation?.state ? `${selectedLocation.state}, ` : ''}${selectedLocation?.country || 'Earth'}
            </p>
            
            ${selectedLocation?.imageUrl ? `
              <div style="width: 100%; height: 200px; border-radius: 8px; overflow: hidden; margin-bottom: 16px;">
                <img src="${selectedLocation.imageUrl}" alt="${selectedLocation.name}" style="width: 100%; height: 100%; object-cover: cover; border-radius: 8px;" />
              </div>
            ` : ''}

            <p style="font-size: 14px; line-height: 1.6; color: #444; white-space: pre-line; margin-bottom: 16px;">
              ${customMessage.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
            </p>

            <div style="background-color: #f5f5f0; padding: 12px 16px; border-radius: 8px; font-size: 11px; font-family: monospace; color: #666; display: flex; justify-content: space-between;">
              <span>COORDINATES: ${selectedLocation?.lat.toFixed(6)}, ${selectedLocation?.lng.toFixed(6)}</span>
            </div>
          </div>

          <div style="text-align: center;">
            <a href="https://ai.studio/build" style="display: inline-block; background-color: #5a5a40; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; padding: 12px 24px; border-radius: 30px; box-shadow: 0 4px 10px rgba(90,90,64,0.3);">
              View Landmark in 3D Globe
            </a>
          </div>

          <hr style="border: 0; border-top: 1px solid #e1e1d8; margin: 24px 0;" />
          <p style="font-size: 10px; text-align: center; opacity: 0.4; line-height: 1.4;">
            This log was sent dynamically from the Google AI Studio 3D World Explorer application.<br />
            © 2026 World Explorer Engine.
          </p>
        </div>
      `;

      const emailParts = [
        `To: ${recipient}`,
        `Subject: ${subject}`,
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        '',
        htmlBody
      ];
      const rawEmail = emailParts.join('\r\n');
      // Secure base64url encoding for Gmail API compatibility
      const encodedEmail = btoa(unescape(encodeURIComponent(rawEmail)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: encodedEmail,
        }),
      });

      if (!res.ok) {
        throw new Error(`Gmail Send API error: ${res.statusText}`);
      }

      setSendSuccess(true);
      setRecipient('');
      
      // Save logs of shared itineraries into Firebase for achievement/stats tracking
      if (auth.currentUser) {
        await addDoc(collection(db, 'shares'), {
          userId: auth.currentUser.uid,
          recipientEmail: recipient,
          locationId: selectedLocation?.id || 'manual',
          locationName: selectedLocation?.name || 'Landmark',
          sharedAt: serverTimestamp(),
          channel: 'gmail'
        });
      }

      // Automatically close success alert after 5 seconds
      setTimeout(() => setSendSuccess(false), 5000);
    } catch (err: any) {
      console.error('Failed to send itinerary:', err);
      setSendError(err.message || 'Failed to send travel log. Please verify the recipient address.');
    } finally {
      setIsSending(false);
      setShowSendConfirm(false);
    }
  };

  const handleImportAdventure = async (email: GmailMessage) => {
    if (!auth.currentUser) return;
    try {
      // Save this adventure booking/note into user's flight tracking or next tour list
      await addDoc(collection(db, 'adventures'), {
        userId: auth.currentUser.uid,
        emailId: email.id,
        subject: email.subject,
        snippet: email.snippet,
        from: email.from,
        date: email.date,
        category: email.category,
        importedAt: serverTimestamp(),
        status: 'active'
      });

      alert(`"${email.subject}" successfully imported into your Adventure Diary!`);
    } catch (err) {
      console.error('Failed to import adventure booking:', err);
    }
  };

  return (
    <div className="space-y-12">
      {/* Page Header */}
      <div className="max-w-4xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
            <Mail className="w-5 h-5" />
          </div>
          <span className="text-xs uppercase font-black tracking-widest text-[#5a5a40]">Google Workspace Integration</span>
        </div>
        <h1 className="font-serif italic text-6xl md:text-8xl mb-6 tracking-tighter leading-[0.8] text-gray-900">
          Gmail <br /> <span className="text-[#5a5a40]">Transit Hub</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl leading-relaxed">
          Unlock your travel intelligence. Scan your Gmail inbox directly for travel bookings, flight itineraries, and hotel reservation documents, or send beautifully formatted transit logs to friends with a single click.
        </p>
      </div>

      {/* Connection Layer */}
      <AnimatePresence mode="wait">
        {!accessToken ? (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="p-8 md:p-12 bg-white rounded-[32px] border border-gray-200/80 shadow-xl shadow-gray-100/50 max-w-3xl text-center space-y-6"
          >
            <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-2 text-red-500 shadow-md">
              <Mail className="w-8 h-8" />
            </div>
            <h3 className="font-serif italic text-3xl text-gray-900">Authorize Secure Google Transit Access</h3>
            <p className="text-gray-500 max-w-md mx-auto text-sm leading-relaxed">
              Connect your Google Workspace account with secure permission. We only scan and list travel-related emails in memory. Your private emails never leave your browser.
            </p>

            <div className="pt-2">
              <button
                onClick={handleConnectGmail}
                disabled={isConnecting}
                className="gsi-material-button mx-auto group hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md"
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents text-sm font-semibold">
                    {isConnecting ? 'Connecting Transit Securely...' : 'Sign in with Google'}
                  </span>
                </div>
              </button>
            </div>

            {inboxError && (
              <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 text-xs rounded-2xl max-w-md mx-auto border border-red-100">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-left font-medium">{inboxError}</span>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-10"
          >
            {/* Connected State Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-[#fcfcf9] rounded-[24px] border border-gray-200 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="text-xs uppercase font-black tracking-wider text-green-600 flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                    Secure Transit Linked
                  </div>
                  <div className="font-mono text-sm text-gray-800 font-semibold">{currentUserEmail}</div>
                </div>
              </div>

              <button
                onClick={handleDisconnect}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-700 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Disconnect Hub</span>
              </button>
            </div>

            {/* BENTO GRID: SCANNER VS COMPOSER */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* LEFT COLUMN: Travel Inbox Document Scanner */}
              <div className="lg:col-span-7 bg-white rounded-[32px] border border-gray-200 shadow-sm p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif italic text-2xl text-gray-900">Travel Document Scanner</h3>
                    <p className="text-xs text-gray-400">Deep-scanning flight, lodging, & ticket emails</p>
                  </div>
                  <button 
                    onClick={() => scanGmailInbox()}
                    disabled={isLoadingEmails}
                    className="p-3 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl transition-all hover:rotate-45 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingEmails ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Filter and query customization */}
                <div className="flex gap-2 p-1.5 bg-gray-50 border border-gray-100 rounded-2xl">
                  <input 
                    type="text"
                    value={emailSearchQuery}
                    onChange={(e) => setEmailSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent px-3 text-xs outline-none font-mono text-gray-700"
                    placeholder="Search query (e.g. flight booking)"
                  />
                  <button
                    onClick={() => scanGmailInbox()}
                    className="px-4 py-2 bg-[#5a5a40] text-white text-[10px] uppercase font-bold tracking-widest rounded-xl hover:bg-[#4d4d36] transition-all flex items-center gap-1.5"
                  >
                    <Search className="w-3 h-3" />
                    <span>Scan</span>
                  </button>
                </div>

                {/* List of emails scanned */}
                <div className="space-y-3 min-h-[300px]">
                  {isLoadingEmails ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-3">
                      <Loader2 className="w-8 h-8 animate-spin text-[#5a5a40]" />
                      <span className="text-xs uppercase tracking-widest font-black opacity-60">Scanning Workspace Mail...</span>
                    </div>
                  ) : emails.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 text-center space-y-4">
                      <Inbox className="w-12 h-12 stroke-[1.2] opacity-40 text-gray-400" />
                      <div>
                        <div className="font-serif italic text-lg text-gray-600">No Travel Emails Detected</div>
                        <p className="text-xs text-gray-400 max-w-xs mx-auto mt-1">Try adjusting the search query filter above or verify if any upcoming itinerary emails are inside your connected account.</p>
                      </div>
                    </div>
                  ) : (
                    emails.map((email) => {
                      const isSelected = selectedEmail?.id === email.id;
                      return (
                        <div 
                          key={email.id}
                          className={`group p-4 rounded-2xl border transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-[#fcfcf9] border-[#5a5a40] shadow-sm' 
                              : 'bg-white hover:bg-gray-50/50 border-gray-100 hover:border-gray-200'
                          }`}
                          onClick={() => setSelectedEmail(email)}
                        >
                          <div className="flex justify-between items-start gap-4 mb-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[8px] uppercase tracking-widest font-black leading-none ${
                              email.category === 'flight' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                              email.category === 'hotel' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                              email.category === 'ticket' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                              'bg-gray-50 text-gray-600 border border-gray-200'
                            }`}>
                              {email.category}
                            </span>
                            <span className="text-[10px] font-mono text-gray-400">{email.date}</span>
                          </div>
                          
                          <h4 className="text-xs font-bold text-gray-800 line-clamp-1 mb-1 group-hover:text-[#5a5a40] transition-colors">{email.subject}</h4>
                          <p className="text-[11px] text-gray-500 font-semibold line-clamp-1 mb-2">From: {email.from}</p>
                          <p className="text-[11px] text-gray-400 line-clamp-2">{email.snippet}</p>

                          {/* Expansion drawer for travel bookings */}
                          <AnimatePresence>
                            {isSelected && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden mt-4 pt-4 border-t border-gray-100 space-y-4"
                              >
                                <div className="p-3.5 bg-gray-50 rounded-xl text-[11px] text-gray-600 leading-relaxed font-mono">
                                  {email.snippet}...
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleImportAdventure(email);
                                    }}
                                    className="flex-1 py-2 px-3 bg-[#5a5a40] text-white text-[10px] uppercase font-bold tracking-widest rounded-xl hover:bg-[#4d4d36] transition-all flex items-center justify-center gap-1.5"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Import Booking to Tour</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedEmail(null);
                                    }}
                                    className="px-3 py-2 bg-gray-100 text-gray-600 text-[10px] uppercase font-bold tracking-widest rounded-xl hover:bg-gray-200 transition-all"
                                  >
                                    Close
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: Send Itinerary / Landmark Share */}
              <div className="lg:col-span-5 bg-white rounded-[32px] border border-gray-200 shadow-sm p-6 md:p-8 space-y-6">
                <div>
                  <h3 className="font-serif italic text-2xl text-gray-900">Landmark Messenger</h3>
                  <p className="text-xs text-gray-400">Share your travel diary and landmark details</p>
                </div>

                {savedLocations.length === 0 ? (
                  <div className="p-6 bg-gray-50 border border-gray-100 rounded-2xl text-center space-y-3">
                    <MapPin className="w-6 h-6 text-gray-300 mx-auto" />
                    <div className="text-xs font-bold text-gray-500">No Saved Places Mapped</div>
                    <p className="text-[11px] text-gray-400">Please bookmark or add landmarks to your collection first to email them as formal itineraries.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Select landmark */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-black tracking-widest text-[#5a5a40]/70">1. Select Landmark</label>
                      <select 
                        value={selectedLocation?.id || ''}
                        onChange={(e) => {
                          const matched = savedLocations.find(l => l.id === e.target.value);
                          if (matched) setSelectedLocation(matched);
                        }}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:border-[#5a5a40]"
                      >
                        {savedLocations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            📍 {loc.name} ({loc.country || 'Global'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Recipient Address */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-black tracking-widest text-[#5a5a40]/70">2. Recipient Address</label>
                      <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl focus-within:border-[#5a5a40]">
                        <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <input 
                          type="email"
                          value={recipient}
                          onChange={(e) => setRecipient(e.target.value)}
                          placeholder="traveler@example.com"
                          className="w-full bg-transparent text-xs outline-none text-gray-800 font-medium"
                        />
                      </div>
                    </div>

                    {/* Email Subject */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-black tracking-widest text-[#5a5a40]/70">3. Subject Line</label>
                      <input 
                        type="text"
                        value={customSubject}
                        onChange={(e) => setCustomSubject(e.target.value)}
                        placeholder="Itinerary Log..."
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:border-[#5a5a40]"
                      />
                    </div>

                    {/* Personal Message */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-black tracking-widest text-[#5a5a40]/70">4. Personal Message</label>
                      <textarea
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        rows={6}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 outline-none focus:border-[#5a5a40] resize-none"
                      />
                    </div>

                    {/* Trigger sending button */}
                    <button
                      onClick={() => setShowSendConfirm(true)}
                      disabled={!recipient || !selectedLocation}
                      className="w-full py-3.5 bg-[#5a5a40] text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-[#4d4d36] hover:shadow-lg disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>Send HTML Transit Log</span>
                    </button>

                    {sendSuccess && (
                      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 text-green-700 text-xs rounded-2xl">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                        <span>Transit log successfully transmitted and filed via Gmail API!</span>
                      </div>
                    )}

                    {sendError && (
                      <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 text-red-700 text-xs rounded-2xl">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{sendError}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MANDATORY EXPLICIT CONFIRMATION MODAL for sending emails (safety rule compliance) */}
      <AnimatePresence>
        {showSendConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[32px] border border-gray-200 shadow-2xl p-6 md:p-8 max-w-md w-full space-y-6"
            >
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif italic text-xl text-gray-900">Transmit Mail?</h3>
                  <p className="text-[10px] text-gray-400">Verifying outgoing security parameters</p>
                </div>
              </div>

              <p className="text-xs text-gray-500 leading-relaxed">
                Are you sure you want to send this beautifully stylized HTML travel log of <strong>{selectedLocation?.name}</strong> to <strong>{recipient}</strong>? This will send a formal email on your behalf using your connected Google Workspace account.
              </p>

              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 text-[11px] font-mono text-gray-600 space-y-1">
                <div><span className="font-bold">FROM:</span> {currentUserEmail}</div>
                <div><span className="font-bold">TO:</span> {recipient}</div>
                <div className="truncate"><span className="font-bold">SUBJECT:</span> {customSubject}</div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSendItinerary}
                  disabled={isSending}
                  className="flex-1 py-3 bg-[#5a5a40] text-white text-[10px] uppercase font-bold tracking-widest rounded-xl hover:bg-[#4d4d36] transition-all flex items-center justify-center gap-1.5"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Transmitting...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm & Send</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowSendConfirm(false)}
                  disabled={isSending}
                  className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] uppercase font-bold tracking-widest rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
