import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, X, SendHorizonal, Sparkles, Globe, Loader2, Compass, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
  links?: { title: string; uri: string }[];
}

export default function TravelerGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (overrideInput?: string) => {
    const currentInput = overrideInput || input;
    if (!currentInput.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', parts: [{ text: currentInput }] };
    setMessages(prev => [...prev, userMessage]);
    if (!overrideInput) setInput('');
    setIsLoading(true);

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: currentInput,
        history: messages.map(m => ({ role: m.role, parts: m.parts }))
      })
    });

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }
      const modelMessage: Message = {
        role: 'model',
        parts: [{ text: data.text }],
        links: data.links
      };
      setMessages(prev => [...prev, modelMessage]);
    } else {
      const respText = await response.text();
      console.error("Server error response:", respText);
      throw new Error(`Server error (${response.status}). Please try again later.`);
    }
  } catch (error: any) {
    console.error('Chat error:', error);
    let errorMessage = "I'm sorry, I encountered an error connecting to my server. Please try again later.";
    
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      errorMessage = "Connection lost. Please check if the server is running and try again.";
    } else if (error.message) {
      errorMessage = error.message;
    }

    setMessages(prev => [...prev, {
      role: 'model',
      parts: [{ text: errorMessage }]
    }]);
  } finally {
    setIsLoading(false);
  }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-[#141414] text-white shadow-2xl hover:scale-110 transition-all group"
      >
        <div className="relative">
          <Bot className="w-6 h-6" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#00af87] rounded-full border-2 border-[#141414] animate-pulse" />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-[90vw] md:w-[420px] h-[700px] max-h-[85vh] bg-[#f8f9fa] rounded-[40px] shadow-[0_32px_80px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden border border-white/20"
          >
            {/* Mockup Header */}
            <div className="p-6 bg-[#141414] text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#00af87] flex items-center justify-center text-white shrink-0">
                  <Bot className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-serif italic text-2xl leading-none text-white tracking-tight">Travel Guide</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00af87]" />
                    <span className="text-[10px] font-black uppercase tracking-[0.1em] opacity-60">AI Assistant</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                id="close-chat"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Chat Body */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 bg-white/50 backdrop-blur-sm scroll-smooth"
            >
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-20 h-20 rounded-full bg-[#141414]/5 flex items-center justify-center mb-8">
                    <Compass className="w-10 h-10 opacity-10" />
                  </div>
                  <h4 className="font-serif italic text-3xl mb-4 tracking-tight">How can I help?</h4>
                  <p className="text-sm opacity-40 leading-relaxed max-w-[240px] mb-8">
                    Ask me anything about your next adventure, or let me analyze the world for you.
                  </p>

                  <div className="grid grid-cols-1 gap-2 w-full max-w-[280px]">
                    {[
                      "Best beaches in Goa?",
                      "Trip to Taj Mahal tips",
                      "Analyze Varanasi reviews",
                      "Add a new hidden gem"
                    ].map(prompt => (
                      <button
                        key={prompt}
                        onClick={() => handleSend(prompt)}
                        className="px-4 py-3 rounded-2xl bg-white border border-[#141414]/5 text-xs text-left hover:bg-[#141414] hover:text-white transition-all shadow-sm"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {messages.map((m, i) => (
                <div key={i} className={`flex items-start gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {m.role === 'model' && (
                    <div className="w-8 h-8 rounded-full bg-[#00af87] flex items-center justify-center text-white shrink-0">
                       <Bot className="w-5 h-5" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-[24px] p-5 shadow-sm ${
                    m.role === 'user' 
                      ? 'bg-[#141414] text-white rounded-tr-none' 
                      : 'bg-white border border-[#141414]/5 text-[#141414] rounded-tl-none'
                  }`}>
                    <div className="prose prose-sm max-w-none prose-p:leading-relaxed">
                      <ReactMarkdown>{m.parts[0].text}</ReactMarkdown>
                    </div>

                    {m.links && m.links.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-[#141414]/5 space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.1em] opacity-30 block">Sources</span>
                        <div className="flex flex-wrap gap-2">
                          {m.links.map((link, j) => (
                            <a 
                              key={j} 
                              href={link.uri} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#141414]/5 hover:bg-[#141414]/10 transition-colors text-[11px] font-medium text-[#141414]/60"
                            >
                              <span className="truncate max-w-[120px]">{link.title}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#00af87] flex items-center justify-center text-white shrink-0">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="bg-white border border-[#141414]/5 rounded-[24px] rounded-tl-none px-6 py-4 flex items-center gap-2 shadow-sm">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00af87] animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00af87] animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00af87] animate-bounce" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Mockup Footer */}
            <div className="p-8 bg-white">
              <div className="relative group">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask me anything..."
                  className="w-full bg-[#f1f3f5] border-none rounded-[32px] pl-6 pr-16 py-5 text-base focus:ring-2 focus:ring-[#141414]/5 transition-all placeholder:text-[#141414]/30"
                  id="chat-input"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full transition-all text-white shadow-lg ${
                    input.trim() ? 'bg-[#141414]' : 'bg-[#adb5bd]'
                  } hover:scale-105 active:scale-95 disabled:opacity-50`}
                  id="send-button"
                >
                  <SendHorizonal className="w-5 h-5" />
                </button>
              </div>
              <p className="mt-4 text-center text-[10px] font-black uppercase tracking-[0.15em] text-[#141414]/20">
                AI can make mistakes. Verify important info.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,400;1,700&display=swap');
        .font-serif { font-family: 'Playfair Display', serif; }
      `}</style>
    </>
  );
}
