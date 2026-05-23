import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, X, Send, Sparkles, MapPin, Compass, Search, Link as LinkIcon, ShieldAlert, CheckCircle2, AlertTriangle, Database, Info, Minimize2, Maximize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { User } from 'firebase/auth';

interface WorldExplorerAIProps {
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

export default function WorldExplorerAI({ isOpen, onClose, onAction, user }: WorldExplorerAIProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Minimization & Edge Resizing States
  const [isMinimized, setIsMinimized] = useState(false);
  const [width, setWidth] = useState(500);
  const [isResizing, setIsResizing] = useState(false);

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

  // Initialize with a warm welcoming message from World Explorer AI
  useEffect(() => {
    if (messages.length === 0) {
      const displayName = user?.displayName || "Explorer";
      setMessages([
        {
          role: 'model',
          text: `👋 Hello **${displayName}**! I am **World Explorer AI**, your intelligent, multi-capable travel data and synthesis companion.

I specialize in **comprehensive app support and travel place intelligence**:
* 📊 **Synthesize Data**: I can summarize reviews, highlight trends, and synthesize region-specific itineraries.
* 🔍 **Search & Find**: I can query our active community archive and grounding web results to discover gems.
* 📐 **Real-Life Logic Checks**: I can validate geographic coordinates, check state/country alignments, and verify travel distances.
* 📍 **Add Sights Directly**: Ask me to add a location, and I will list it under your Explorer profile username (\`${displayName}\`).
* 📜 **Explain Geography**: I can explain historical background, architectural designs, and physical geography.

🛡️ **Privacy & Security Guarantee**:
To protect your privacy, I am strictly restricted to travel-related queries. I have **zero access** to your credentials, emails, passwords, owner profile IDs, or any sensitive system configuration. No private profiling files are available to me.`
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
      // Server expects: { role: 'user' | 'model', parts: [{ text: string }] }
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
        currentUserName: user?.displayName || user?.email || "Explorer"
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
        text: data.text || "I was unable to formulate a response.",
        links: data.links || [],
        actions: data.actions || []
      };

      setMessages(prev => [...prev, aiMsg]);

      // If any specific actions were returned, trigger callback
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
          text: `⚠️ **System Notification**: ${err.message || 'Failed to connect. Please verify your connection or retry shortly.'}`,
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
      title: "📊 Synthesize Sights",
      desc: "Summarize top landmarks in Asia",
      prompt: "Synthesize a clean and helpful summary listing key highlights of Taj Mahal, Hawa Mahal, and standard Asian destinations in our community database."
    },
    {
      title: "📐 Coordinate Logic Check",
      desc: "Check coordinates accuracy",
      prompt: "Can you do a math and logic coordinates check on latitude 27.1751° N and longitude 78.0421° E? Tell me what landmark exists there, if it matches, and explain its historical architectural style."
    },
    {
      title: "🔍 Search Community",
      desc: "Search database for sights",
      prompt: "Search existing database locations to see what active entries we have for travel sights, then list them for me."
    },
    {
      title: "📍 Add Location with My Profile",
      desc: "Add place via AI",
      prompt: `Please add a beautiful travel location to the database:
Name: Grand Canyon
Description: A steep-sided canyon carved by the Colorado River in Arizona, revealing millions of years of geological history.
Continent: North America
Country: USA
State: Arizona`
    }
  ];

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[160]" id="world-explorer-ai-minimized-bubble">
        <motion.div
          drag
          dragMomentum={false}
          dragElastic={0.15}
          whileDrag={{ scale: 1.05, cursor: 'grabbing' }}
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2.5 px-5 py-3.5 bg-[#141414] text-white rounded-full shadow-2xl border border-white/10 transition-all cursor-pointer group hover:scale-[1.02] active:scale-[0.98] select-none"
        >
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-emerald-800 via-emerald-600 to-emerald-400 flex items-center justify-center relative shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
          </div>
          <span className="font-sans font-bold tracking-wider text-xs">WORLD EXPLORER AI</span>
          <div className="flex items-center gap-1 shrink-0 ml-1.5 border-l border-white/15 pl-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(false);
              }}
              className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              title="Restore World Explorer AI"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1 rounded hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
              title="Close Panel"
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
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      {/* Slideout Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        style={{ width: isMobile ? '100vw' : `${width}px`, maxWidth: '100vw' }}
        className="relative h-full bg-[#fafafa] shadow-2xl flex flex-col z-10 border-l border-[#141414]/10 overflow-hidden"
      >
        {/* Resize Handle (Left edge) */}
        {!isMobile && (
          <div
            onMouseDown={startResizing}
            onTouchStart={startResizingTouch}
            className={`absolute top-0 bottom-0 left-0 w-2.5 h-full cursor-col-resize group flex items-center justify-center transition-colors hover:bg-emerald-500/10 z-20 ${
              isResizing ? 'bg-emerald-500/25 border-l border-emerald-500' : 'border-l border-transparent'
            }`}
            title="Drag from left margin to resize World Explorer AI"
          >
            <div className="absolute top-1/2 -translate-y-1/2 left-0.5 flex flex-col gap-1 opacity-10 group-hover:opacity-100 transition-opacity">
              <div className="w-1 h-1 rounded-full bg-[#141414]/40" />
              <div className="w-1 h-1 rounded-full bg-[#141414]/40" />
              <div className="w-1 h-1 rounded-full bg-[#141414]/40" />
            </div>
          </div>
        )}

        {/* Header */}
        <div className="p-6 bg-[#141414] text-white flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-[#5A5A40] to-emerald-700 rounded-xl shadow-lg border border-white/15">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif italic text-lg leading-none">World Explorer AI</h2>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="System Online" />
              </div>
              <p className="text-[10px] text-white/60 tracking-wider uppercase mt-1">Multi-Tool Intelligence & Synthesis Companion</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-white/80 hover:text-white"
              title="Minimize to Widget"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-white/80 hover:text-white"
              title="Close Dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Security Alert Header Strip */}
        <div className="px-6 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-900 text-[10px] flex items-center gap-2 tracking-wide">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span><strong>Privacy Bound:</strong> Zero access to passwords, user credentials, emails, or developer IDs. Displaying username: <strong>{currentDisplayName}</strong></span>
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
                      ? 'bg-[#141414] text-white rounded-br-none border-transparent' 
                      : msg.isSystemNotice 
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-900 rounded-bl-none text-xs'
                        : 'bg-white text-[#141414] border-[#141414]/10 rounded-bl-none'
                  }`}>
                    {/* Header line for AI attribution */}
                    {!mrkUser && !msg.isSystemNotice && (
                      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider font-semibold opacity-50 mb-1.5">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        <span>World Explorer AI</span>
                      </div>
                    )}

                    <div className="prose prose-sm max-w-none break-words text-sm leading-relaxed">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>

                    {/* Render action notification in container */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mt-3 pt-2 coordinate-info border-t border-dashed border-[#141414]/10 flex flex-wrap gap-1.5 items-center">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-[10px] font-mono text-[#141414]/60">Triggered Interfaces:</span>
                        {msg.actions.map((act) => (
                          <span key={act} className="px-1.5 py-0.5 bg-[#141414]/5 text-[#141414] rounded font-mono text-[9px]">
                            {act}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Grounding Source Web Links */}
                    {msg.links && msg.links.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-dashed border-[#141414]/10">
                        <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-[#141414]/40 mb-2">
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
                              className="text-xs text-emerald-700 hover:text-emerald-900 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/15 p-2 rounded-lg flex items-center justify-between transition-all group"
                            >
                              <span className="font-semibold truncate max-w-[90%]">{link.title || "Ref link"}</span>
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
              className="flex justify-start items-center gap-2 text-xs text-[#141414]/50 p-2 font-mono uppercase tracking-widest pl-4"
            >
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-[#141414]/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-[#141414]/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-[#141414]/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>Analyzing & Synthesizing Data...</span>
            </motion.div>
          )}

          <div ref={messagesEndRef} />

          {/* Prompt suggestions when chat is empty or fresh */}
          {messages.length <= 1 && (
            <div className="space-y-3 pt-4 border-t border-[#141414]/5">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#141414]/40 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Discover capabilities
              </span>
              <div className="grid grid-cols-1 gap-2.5">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestClick(s.prompt)}
                    disabled={isLoading}
                    className="text-left p-3.5 bg-white border border-[#141414]/5 hover:border-[#141414]/20 rounded-xl transition-all hover:shadow-md group flex items-start gap-3 disabled:opacity-50"
                  >
                    <div className="mt-0.5 p-1.5 bg-[#141414]/5 group-hover:bg-[#141414] text-[#141414] group-hover:text-white rounded-lg transition-colors shrink-0">
                      <Compass className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[#141414] group-hover:text-emerald-700 transition-colors">{s.title}</h4>
                      <p className="text-[11px] text-[#141414]/60 mt-0.5 font-medium">{s.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-[#141414]/10">
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
              placeholder="Ask about coords math, summarize Asia, add location..."
              disabled={isLoading}
              className="flex-1 text-sm bg-neutral-100 hover:bg-neutral-200/50 focus:bg-white text-[#141414] placeholder-[#141414]/45 px-4 py-3.5 rounded-2xl border border-neutral-200 hover:border-neutral-300 focus:border-[#141414] focus:outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="p-3.5 bg-[#141414] hover:bg-black text-white rounded-2xl transition-all shadow-md active:scale-95 disabled:opacity-30 disabled:pointer-events-none shrink-0"
              title="Send Prompt"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Tiny Safe Usage notice */}
          <div className="text-[9px] text-center text-[#141414]/40 mt-2.5 flex items-center justify-center gap-1 font-mono uppercase">
            <Info className="w-3 h-3 shrink-0" />
            <span>AI cannot edit email, logins, credentials or read owner profiles.</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
