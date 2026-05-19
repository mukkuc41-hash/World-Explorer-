import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bot, Send, User, Sparkles, MapPin, Search, Plus, Globe, ExternalLink, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  links?: { title: string, uri: string }[];
}

interface TravelerGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
}

export default function TravelerGuide({ isOpen, onClose, onAction }: TravelerGuideProps) {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      text: "Hello! I'm your **Traveler Guide**. I specialize in **Detailed Place Analysis**: I can research travel destinations, perform **Real-time Fact Checking** with Google Search, and provide comprehensive insights. \n\nPlease note: I'm dedicated strictly to place-related research. I do not handle profile information or sensitive personal data to maintain your **privacy**." 
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage,
          botType: 'traveler-guide',
          history: messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }]
          }))
        })
      });

      const data = await response.json();
      
      if (data.error) {
        let errorMsg = `Sorry, I encountered an error: ${data.error}`;
        if (response.status === 429) {
          errorMsg = "**Quota Exceeded:** My research tools are cooling down. Please try again in a minute.";
        }
        setMessages(prev => [...prev, { role: 'assistant', text: errorMsg }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          text: data.text,
          links: data.links
        }]);

        // Handle triggered UI actions
        if (data.actions && data.actions.length > 0) {
          data.actions.forEach((action: string) => onAction(action));
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: "Connection error. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[110] flex flex-col items-end pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="pointer-events-auto w-[90vw] md:w-[400px] h-[600px] bg-white shadow-2xl overflow-hidden rounded-[40px] border border-[#141414]/10 flex flex-col mb-4"
          >
            {/* Header - Dark Style */}
            <div className="p-6 bg-[#141414] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#00af87] flex items-center justify-center shadow-lg">
                   <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-serif italic text-xl tracking-tight leading-none">Travel Guide</h2>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-1.5 h-1.5 bg-[#00af87] rounded-full animate-pulse" />
                    <p className="text-[8px] uppercase tracking-[0.2em] font-black opacity-50">AI Assistant</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-all"
              >
                <X className="w-5 h-5 opacity-60 hover:opacity-100" />
              </button>
            </div>

            {/* Chat Content */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#f8f8f5] custom-scrollbar"
            >
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-[#00af87] flex-shrink-0 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className="space-y-3">
                      <div className={`p-4 rounded-[20px] text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-[#141414] text-white rounded-tr-none' : 'bg-white text-[#141414] rounded-tl-none border border-[#141414]/5'}`}>
                        <div className="prose prose-xs prose-stone max-w-none">
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                      </div>
                      
                      {msg.links && msg.links.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {msg.links.map((link, li) => (
                            <a 
                              key={li}
                              href={link.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-[#141414]/5 rounded-full text-[9px] font-bold uppercase tracking-widest hover:bg-[#141414] hover:text-white transition-all shadow-sm"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Source
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                   <div className="px-4 py-2 bg-white/50 rounded-full border border-[#141414]/5 flex items-center gap-2">
                     <div className="flex gap-1">
                        <span className="w-1 h-1 bg-[#141414]/30 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1 h-1 bg-[#141414]/30 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1 h-1 bg-[#141414]/30 rounded-full animate-bounce" />
                     </div>
                   </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-6 bg-white border-t border-[#141414]/5">
              <form onSubmit={handleSendMessage} className="relative mb-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything..."
                  className="w-full bg-[#f8f8f5] border-none rounded-full px-6 py-4 pr-14 focus:ring-2 focus:ring-[#141414]/10 transition-all text-sm font-light"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="absolute right-2 top-2 bottom-2 w-10 rounded-full bg-[#141414]/10 text-[#141414] flex items-center justify-center hover:bg-[#141414] hover:text-white disabled:opacity-20 transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <div className="text-center">
                <span className="text-[8px] uppercase tracking-[0.2em] font-black opacity-20">AI can make mistakes. Verify important info.</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
