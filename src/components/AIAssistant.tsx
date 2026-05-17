import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Bot, User, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'model';
  parts: [{ text: string }];
}

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<Message[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', parts: [{ text: input }] };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, history: messages }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      const assistantMessage: Message = { role: 'model', parts: [{ text: data.text }] };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = { role: 'model', parts: [{ text: "I'm sorry, I encountered an error connecting to my server. Please try again later." }] };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-[#141414] text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-50 group"
      >
        <MessageSquare className="w-8 h-8 group-hover:rotate-12 transition-transform" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#00af87] rounded-full border-2 border-white animate-pulse" />
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-28 right-8 w-[400px] h-[600px] bg-white rounded-[40px] shadow-2xl border border-[#141414]/5 overflow-hidden flex flex-col z-50"
          >
            {/* Header */}
            <div className="bg-[#141414] p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#00af87] flex items-center justify-center">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif italic text-xl">Travel Guide</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
                    <span className="text-[10px] uppercase tracking-widest opacity-60">AI Assistant</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#f8f8f5]">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-20 h-20 rounded-[30px] bg-[#00af87]/10 flex items-center justify-center text-[#00af87] mb-6">
                    <Bot className="w-10 h-10" />
                  </div>
                  <h4 className="text-xl font-serif italic mb-2">Hello there!</h4>
                  <p className="text-sm opacity-40 leading-relaxed mb-6">
                    I'm your World Explorer AI. Ask me about Jaipur, architectural styles, or for travel recommendations anywhere in the world!
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {[
                      "Tell me about Jaipur",
                      "Best beaches in Goa?",
                      "Himalayan hidden gems",
                      "Trip to Taj Mahal tips"
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setInput(suggestion);
                          // Auto-send could be nice but let's just fill the input for user control
                        }}
                        className="px-4 py-2 bg-white border border-[#141414]/5 rounded-xl text-xs font-bold hover:bg-[#00af87] hover:text-white transition-all shadow-sm"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-start gap-3`}
                >
                  {msg.role === 'model' && (
                    <div className="w-8 h-8 rounded-full bg-[#00af87] flex items-center justify-center text-white shrink-0 mt-1">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                  <div 
                    className={`max-w-[80%] p-4 rounded-3xl text-sm leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-[#141414] text-white rounded-tr-none' 
                        : 'bg-white text-[#141414] shadow-sm rounded-tl-none border border-[#141414]/5'
                    }`}
                  >
                    <div className="markdown-body">
                      <ReactMarkdown>{msg.parts[0].text}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#00af87] flex items-center justify-center text-white shrink-0 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-white p-4 rounded-3xl rounded-tl-none border border-[#141414]/5 shadow-sm">
                    <Loader2 className="w-5 h-5 animate-spin opacity-20" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-[#141414]/5">
              <div className="relative group">
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask me anything..."
                  className="w-full bg-[#f8f8f5] border-none rounded-3xl py-4 pl-6 pr-14 text-sm focus:ring-2 focus:ring-[#00af87]/20 outline-none transition-all"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-2 w-10 h-10 bg-[#141414] text-white rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-20 disabled:scale-100 transition-all shadow-lg"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-center mt-3 opacity-20 uppercase tracking-widest font-black">
                AI can make mistakes. Verify important info.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
