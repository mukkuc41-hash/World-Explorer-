import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, X, Send, Sparkles, Compass, Search, Link as LinkIcon, ShieldAlert, CheckCircle2, Info, Minimize2, Maximize2, PlusCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { User } from 'firebase/auth';

interface AddLocationAIProps {
  isOpen: boolean;
  onClose: () => void;
  onAction?: (action: string) => void;
  user: User | null;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  links?: { title: string; uri: string }[];
  actions?: string[];
  isSystemNotice?: boolean;
}

export default function AddLocationAI({ isOpen, onClose, onAction, user }: AddLocationAIProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Minimization & Edge Resizing States
  const [isMinimized, setIsMinimized] = useState(false);
  const [width, setWidth] = useState(500);
  const [isResizing, setIsResizing] = useState(false);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (isOpen && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.warn("Geolocation permission denied or failed:", error);
        }
      );
    }
  }, [isOpen]);

  // Listen to escape key or layout resizes
  const startResizing = (mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsResizing(true);
  };

  const startResizingTouch = (touchEvent: React.TouchEvent) => {
    if (touchEvent.touches.length === 1) {
      setIsResizing(true);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const computedWidth = window.innerWidth - e.clientX;
      const minWidth = 360;
      const maxWidth = window.innerWidth * 0.85;
      if (computedWidth >= minWidth && computedWidth <= maxWidth) {
        setWidth(computedWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!isResizing) return;
      const computedWidth = window.innerWidth - e.touches[0].clientX;
      const minWidth = 320;
      const maxWidth = window.innerWidth * 0.95;
      if (computedWidth >= minWidth && computedWidth <= maxWidth) {
        setWidth(computedWidth);
      }
    };

    const handleTouchEnd = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isResizing]);

  // Initialize with specialized welcoming message from Add Location AI
  useEffect(() => {
    if (messages.length === 0) {
      const displayName = user?.displayName || "Explorer";
      setMessages([
        {
          role: 'model',
          text: `👋 Hello **${displayName}**! I am **Add Location AI**, your specialized, high-intensity geographic discovery co-pilot.
          
My sole design purpose is to help you search, discover, and **instantly register beautiful travel destinations, architectural landmarks, and scenic wonders directly onto your interactive map and the community database.**

✨ **Give me a prompt like:**
* *"Add Taj Mahal"*
* *"Where is Amer Fort? Resolve its location and add it to my map."*
* *"What are some major sightseeing tourist spots in Jaipur? Tell me about them and add them directly."*

🕵️‍♂️ **Under the hood:**
* I query **Google Search databases** to retrieve authentic countries, states, and coordinates.
* I invoke database tools in real-time to save and render them in your account under username: \`${displayName}\`.
* Every response runs under our strict secure guard so your credentials remain perfectly private.`
        }
      ]);
    }
  }, [user, messages.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    if (!textToSend) {
      setInputValue('');
    }

    // Append user message
    const userMsg: ChatMessage = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Build conversation history for the API
      const historyPayload = messages
        .filter(m => !m.isSystemNotice)
        .map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        }));

      const body = {
        message: text,
        history: historyPayload,
        currentUserId: user?.uid || null,
        currentUserName: user?.displayName || "Explorer",
        chatMode: "add_location", // Specialized parameter
        latitude: userCoords?.latitude || null,
        longitude: userCoords?.longitude || null
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Server error occurred.');
      }

      const data = await response.json();

      // Append AI response
      const aiMsg: ChatMessage = {
        role: 'model',
        text: data.text || "I was unable to locate and add that destination.",
        links: data.links || [],
        actions: data.actions || []
      };

      setMessages(prev => [...prev, aiMsg]);

      // Trigger action callback so UI registers the synchronized location
      if (data.actions && data.actions.length > 0) {
        data.actions.forEach((act: string) => {
          if (onAction) {
            onAction(act);
          }
        });
      }

    } catch (err: any) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          text: `⚠️ **System Notification**: ${err.message || 'Failed to map location. Please retry shortly.'}`,
          isSystemNotice: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestClick = (prompt: string) => {
    handleSend(prompt);
  };

  const currentDisplayName = user?.displayName || "Explorer";

  const suggestions = [
    {
      title: "📍 Direct Core Addition",
      desc: "Add Amber Fort Jaipur directly",
      prompt: "Find and directly add 'Amber Fort' in Jaipur, Rajasthan, India. Fetch its exact coordinates and describe it."
    },
    {
      title: "🔍 Spot Tourism Mapping",
      desc: "Get and map top Jaipur highlights",
      prompt: "What are the top 3-4 famous tourist attraction landmarks in Jaipur? Tell me about them and add them to my database in parallel!"
    },
    {
      title: "🏛️ Architectural Discovery",
      desc: "Add Colosseum in Rome",
      prompt: "Geotag and add 'The Colosseum' in Rome, Italy. Auto-populate its continent, state, and coordinates."
    },
    {
      title: "🏔️ Search & Map Wonders",
      desc: "Add Machu Picchu Peru",
      prompt: "Search the web to find the historical wonder Machu Picchu in Peru, resolve its precise coordinates, and map it."
    }
  ];

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[160]" id="add-location-ai-minimized-bubble">
        <motion.div
          drag
          dragMomentum={false}
          dragElastic={0.15}
          whileDrag={{ scale: 1.05, cursor: 'grabbing' }}
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2.5 px-5 py-3.5 bg-indigo-950 text-white rounded-full shadow-2xl border border-indigo-400/20 transition-all cursor-pointer group hover:scale-[1.02] active:scale-[0.98] select-none"
        >
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-800 via-indigo-600 to-indigo-400 flex items-center justify-center relative shrink-0">
            <MapPin className="w-3.5 h-3.5 text-white animate-pulse" />
          </div>
          <span className="font-sans font-bold tracking-wider text-xs">ADD LOCATION BOT</span>
          <div className="flex items-center gap-1 shrink-0 ml-1.5 border-l border-indigo-500/30 pl-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(false);
              }}
              className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              title="Restore Add Location AI Bot"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1 rounded hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
              title="Close Bot"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  return (
    <div className="fixed inset-0 z-[150] flex justify-end">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      {/* Slideout Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        style={{ width: isMobile ? '100vw' : `${width}px`, maxWidth: '100vw' }}
        className="relative h-full bg-[#fcfcff] shadow-2xl flex flex-col z-10 border-l border-indigo-200/50 overflow-hidden"
      >
        {/* Resize Handle (Left edge) */}
        {!isMobile && (
          <div
            onMouseDown={startResizing}
            onTouchStart={startResizingTouch}
            className={`absolute top-0 bottom-0 left-0 w-2.5 h-full cursor-col-resize group flex items-center justify-center transition-colors hover:bg-indigo-500/10 z-20 ${
              isResizing ? 'bg-indigo-500/25 border-l border-indigo-400' : 'border-l border-transparent'
            }`}
            title="Drag from left margin to resize Add Location Bot"
          >
            <div className="absolute top-1/2 -translate-y-1/2 left-0.5 flex flex-col gap-1 opacity-10 group-hover:opacity-100 transition-opacity">
              <div className="w-1 h-1 rounded-full bg-indigo-900/40" />
              <div className="w-1 h-1 rounded-full bg-indigo-900/40" />
              <div className="w-1 h-1 rounded-full bg-indigo-900/40" />
            </div>
          </div>
        )}

        {/* Header */}
        <div className="p-6 bg-indigo-950 text-white flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-800 to-violet-700 rounded-xl shadow-lg border border-white/10">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif italic text-lg leading-none text-indigo-100">Add Location AI</h2>
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" title="Geomapping Protocol Active" />
              </div>
              <p className="text-[10px] text-indigo-300 tracking-wider uppercase mt-1">Geotagging & Database Discovery Agent</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-indigo-200 hover:text-white"
              title="Minimize"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-indigo-200 hover:text-white"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Security Alert Header Strip */}
        <div className="px-6 py-2 bg-indigo-50 border-b border-indigo-100 text-indigo-950 text-[10px] flex items-center gap-2 tracking-wide font-medium">
          <ShieldAlert className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span><strong>Secure Integration:</strong> Saving verified landmark coordinates directly. Current User Profile name: <strong>{currentDisplayName}</strong></span>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => {
              const mrkUser = msg.role === 'user';
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className={`flex ${mrkUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm border ${
                    mrkUser 
                      ? 'bg-indigo-950 text-white rounded-br-none border-transparent' 
                      : msg.isSystemNotice 
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-900 rounded-bl-none text-xs'
                        : 'bg-white text-neutral-800 border-indigo-100 rounded-bl-none'
                  }`}>
                    {/* Header line for AI attribution */}
                    {!mrkUser && !msg.isSystemNotice && (
                      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider font-semibold text-indigo-600/70 mb-1.5">
                        <Sparkles className="w-3 h-3 text-indigo-600" />
                        <span>Add Location AI Bot</span>
                      </div>
                    )}

                    <div className="prose prose-sm max-w-none break-words text-sm leading-relaxed">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>

                    {/* Render actions list */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mt-3 pt-2 coordinate-info border-t border-dashed border-indigo-100 flex flex-wrap gap-1.5 items-center">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-[10px] font-mono text-neutral-500">Auto-mapped landmark:</span>
                        {msg.actions.map((act) => {
                          let label = act;
                          if (act.startsWith("add_location_sync:")) {
                            try {
                              const dat = JSON.parse(act.substring("add_location_sync:".length));
                              label = `📍 Created ${dat.name}`;
                            } catch(e) {
                              label = "📍 Location Added";
                            }
                          }
                          return (
                            <span key={act} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded font-mono text-[9px]">
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Grounding Source Web Links */}
                    {msg.links && msg.links.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-dashed border-indigo-100">
                        <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-indigo-400 mb-2">
                          <LinkIcon className="w-3 h-3" />
                          <span>Google Search References:</span>
                        </div>
                        <div className="grid grid-cols-1 gap-1.5">
                          {msg.links.map((link, linkIdx) => (
                            <a
                              key={linkIdx}
                              href={link.uri}
                              target="_blank"
                              referrerPolicy="no-referrer"
                              rel="noreferrer"
                              className="text-xs text-indigo-700 hover:text-indigo-900 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/15 p-2 rounded-lg flex items-center justify-between transition-all group"
                            >
                              <span className="font-semibold truncate max-w-[90%]">{link.title || "Reference link"}</span>
                              <LinkIcon className="w-3 h-3 opacity-50 group-hover:opacity-100 shrink-0 ml-1" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start items-center gap-2 text-xs text-indigo-600/70 p-2 font-mono uppercase tracking-widest pl-4"
            >
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>Geomapping & Resolving coordinates...</span>
            </motion.div>
          )}

          <div ref={messagesEndRef} />

          {/* Prompt suggestions when chat is empty or fresh */}
          {messages.length <= 1 && (
            <div className="space-y-3 pt-4 border-t border-indigo-100">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-800/60 flex items-center gap-1.5">
                <PlusCircle className="w-3.5 h-3.5 text-indigo-600" /> Start Instantly
              </span>
              <div className="grid grid-cols-1 gap-2.5">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestClick(s.prompt)}
                    disabled={isLoading}
                    className="text-left p-3.5 bg-white border border-indigo-50/50 hover:border-indigo-200 rounded-xl transition-all hover:shadow-md group flex items-start gap-3 disabled:opacity-50"
                  >
                    <div className="mt-0.5 p-1.5 bg-indigo-50 group-hover:bg-indigo-950 text-indigo-950 group-hover:text-white rounded-lg transition-colors shrink-0">
                      <Compass className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-neutral-800 group-hover:text-indigo-700 transition-colors">{s.title}</h4>
                      <p className="text-[11px] text-neutral-500 mt-0.5 font-medium">{s.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-indigo-100">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask me to find and add tourist landmarks anywhere..."
              disabled={isLoading}
              className="flex-1 text-sm bg-neutral-150 focus:bg-white text-neutral-800 placeholder-[#141414]/45 px-4 py-3.5 rounded-2xl border border-indigo-100 focus:border-indigo-600 focus:outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="p-3.5 bg-indigo-950 hover:bg-indigo-900 text-white rounded-2xl transition-all shadow-md active:scale-95 disabled:opacity-30 disabled:pointer-events-none shrink-0"
              title="Add Landmark"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Safe Usage notice */}
          <div className="text-[9px] text-center text-indigo-950/40 mt-2.5 flex items-center justify-center gap-1 font-mono uppercase font-bold">
            <Info className="w-3 h-3 shrink-0 text-indigo-600/70" />
            <span>Adds high-precision coordinates with Google Search data automatically.</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
