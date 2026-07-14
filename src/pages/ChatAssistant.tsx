import React, { useState, useRef, useEffect } from 'react';
import { User } from 'firebase/auth';
import { ChatMessage } from '../types';
import Markdown from 'react-markdown';
import { Send, Bot, MessageSquare, Sparkles } from 'lucide-react';
import { cn } from '../components/Layout';

export function ChatAssistant({ user }: { user: User }) {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: 'model',
    content: "Whats up bro."
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const newMsgs = [...messages, { role: 'user', content: input } as ChatMessage];
    setMessages(newMsgs);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMsgs })
      });
      const data = await res.json();
      
      if (res.ok) {
        setMessages([...newMsgs, { role: 'model', content: data.text }]);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to send message.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-8 animate-fade-in max-w-5xl">
      <header className="shrink-0 flex justify-between items-center border-b border-white/10 pb-6 mb-8">
        <div>
          <h1 className="text-2xl font-mono font-bold tracking-tight text-[#06B6D4] flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-[#06B6D4]" /> ASK BRO
          </h1>
        </div>
        <div className="flex items-center gap-2 bg-[#06B6D4]/10 border border-[#06B6D4]/20 px-3 py-1.5 text-xs font-mono text-[#06B6D4]">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" /> AI CAREER COACH
        </div>
      </header>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto space-y-6 scrollbar-hide border border-white/10 p-6">
        <div className="space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-4", msg.role === 'user' ? "justify-end" : "justify-start")}>
              {msg.role !== 'user' && (
                <div className="w-10 h-10 border border-[#FF4D00]/30 bg-[#FF4D00]/10 flex items-center justify-center shrink-0">
                  <Bot className="w-6 h-6 text-[#FF4D00]" />
                </div>
              )}
              <div className={cn(
                "px-5 py-4 text-sm max-w-2xl border",
                msg.role === 'user' 
                  ? "bg-[#111113] border-white/20 text-[#E4E4E4]" 
                  : "bg-white/5 border-white/10 text-[#E4E4E4]"
              )}>
                {msg.role === 'user' ? (
                  msg.content
                ) : (
                  <div className="markdown-body font-sans text-sm leading-relaxed">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-10 h-10 border border-white/20 bg-white/5 flex items-center justify-center shrink-0 font-mono font-bold text-xs">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                  ) : (
                    user.displayName?.charAt(0) || 'U'
                  )}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-4 justify-start">
              <div className="w-10 h-10 border border-[#FF4D00]/30 bg-[#FF4D00]/10 flex items-center justify-center shrink-0">
                <Bot className="w-6 h-6 text-[#FF4D00]" />
              </div>
              <div className="px-5 py-4 text-sm bg-white/5 border border-white/10 flex items-center gap-2">
                <div className="w-2 h-2 bg-white/50 animate-bounce"></div>
                <div className="w-2 h-2 bg-white/50 animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 bg-white/50 animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 pt-4">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask your coach anything..."
            className="w-full bg-transparent border-2 border-white/10 focus:border-[#FF4D00] text-[#E4E4E4] text-sm outline-none block p-4 pr-16 transition-colors placeholder:text-white/20"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="absolute right-2 p-2.5 bg-[#FF4D00] text-[#111113] hover:bg-[#FF4D00]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
