'use client';
import React, { useState, useEffect, useRef } from 'react';
import { cn } from "@/utils";
import { useTheme } from "next-themes";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface AITutorProps {
  context: {
    departmentName: string;
    patientCondition: string;
    currentStep: number;
    totalSteps: number;
    conversationType: string;
  };
  onRequestHelp: (question: string) => Promise<string>;
}

export function AITutor({ context, onRequestHelp }: AITutorProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: Date.now() }]);
    setIsLoading(true);

    try {
      const response = await onRequestHelp(userMessage);
      setMessages(prev => [...prev, { role: 'assistant', content: response, timestamp: Date.now() }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm having trouble connecting. Please try again.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedQuestions = [
    "What should I ask next?",
    "How do I take a smoking history?",
    "What are the red flags for this condition?",
    "How do I ask about allergies?",
    "What's the SOCRATES framework?",
    "How do I summarize findings?"
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl transition-all duration-300 hover:scale-110",
          "bg-gradient-to-r from-purple-500 to-indigo-600",
          "flex items-center justify-center group"
        )}
      >
        <i className="fas fa-robot text-white text-xl"></i>
        {messages.length > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
            {messages.filter(m => m.role === 'assistant').length}
          </span>
        )}
        <div className="absolute inset-0 rounded-full bg-purple-500 opacity-0 group-hover:opacity-20 transition-opacity"></div>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          
          <div className={cn(
            "fixed bottom-24 right-6 z-50 w-[400px] rounded-2xl shadow-2xl overflow-hidden animate-slide-up",
            isDark ? "bg-gray-900" : "bg-white"
          )}>
            <div className={cn(
              "px-5 py-4 flex items-center justify-between",
              "bg-gradient-to-r from-purple-600 to-indigo-600"
            )}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <i className="fas fa-robot text-white text-lg"></i>
                </div>
                <div>
                  <h3 className="font-bold text-white">AI Coach</h3>
                  <p className="text-xs text-white/80">Ask me anything about this case</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className={cn(
              "px-5 py-2 text-xs border-b flex gap-3",
              isDark ? "bg-gray-800 border-gray-700 text-gray-400" : "bg-gray-50 border-gray-200 text-gray-600"
            )}>
              <span className="flex items-center gap-1"><i className="fas fa-stethoscope"></i>{context.departmentName}</span>
              <span className="flex items-center gap-1"><i className="fas fa-user-injured"></i>{context.patientCondition || 'General'}</span>
              <span className="flex items-center gap-1"><i className="fas fa-layer-group"></i>Step {context.currentStep}/{context.totalSteps}</span>
            </div>

            <div className="h-[400px] overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <i className="fas fa-robot text-5xl text-purple-400 mb-4"></i>
                  <p className={cn("text-sm mb-4", isDark ? "text-gray-400" : "text-gray-600")}>Hi! Ask me for help with:</p>
                  <div className="space-y-2">
                    {suggestedQuestions.map((q, i) => (
                      <button key={i} onClick={() => setInputValue(q)} className={cn(
                        "block w-full text-left px-3 py-2 rounded-lg text-sm transition",
                        isDark ? "hover:bg-gray-800 text-gray-300" : "hover:bg-gray-100 text-gray-700"
                      )}>
                        <i className="fas fa-question-circle text-purple-500 mr-2 text-xs"></i>{q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={cn(
                        "max-w-[85%] p-3 rounded-2xl",
                        msg.role === 'user'
                          ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-br-none"
                          : isDark ? "bg-gray-800 text-gray-200 rounded-bl-none" : "bg-gray-100 text-gray-800 rounded-bl-none"
                      )}>
                        <p className="text-sm">{msg.content}</p>
                        <p className={cn("text-[10px] mt-1", msg.role === 'user' ? "text-white/60" : isDark ? "text-gray-500" : "text-gray-400")}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className={cn("p-3 rounded-2xl rounded-bl-none", isDark ? "bg-gray-800" : "bg-gray-100")}>
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-100"></div>
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-200"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className={cn("p-4 border-t", isDark ? "border-gray-800" : "border-gray-200")}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask a question..."
                  className={cn(
                    "flex-1 px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500",
                    isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-gray-50 border-gray-300 text-gray-900"
                  )}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputValue.trim()}
                  className={cn(
                    "px-4 py-2 rounded-xl transition-all disabled:opacity-50",
                    "bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:scale-105"
                  )}
                >
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>
              <p className={cn("text-xs mt-2 text-center", isDark ? "text-gray-500" : "text-gray-400")}>
                AI Tutor helps with history-taking, clinical reasoning, and OSCE preparation
              </p>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
        .animate-bounce { animation: bounce 0.5s ease-in-out infinite; }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>
    </>
  );
}