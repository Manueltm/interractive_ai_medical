// app/dashboard/components/VapiHint.tsx
'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from "@/utils";
import { useTheme } from "next-themes";
import Vapi from '@vapi-ai/web';
import { toast } from 'sonner';

interface VapiHintProps {
  isEnabled: boolean;
  context: {
    departmentName: string;
    patientCondition: string;
    conversationType: string;
  };
}

// REPLACE THIS WITH YOUR ACTUAL HINT ASSISTANT ID FROM VAPI DASHBOARD
const HINT_ASSISTANT_ID = "bd8434f5-5f35-4921-8db9-bf68b5065ea2";

export function VapiHint({ isEnabled, context }: VapiHintProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [hints, setHints] = useState<Array<{ id: string; type: string; message: string; category: string }>>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  const vapiRef = useRef<Vapi | null>(null);
  const messageQueueRef = useRef<string[]>([]);
  
  // Track what student has done
  const [hasIntroduced, setHasIntroduced] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [hasChiefComplaint, setHasChiefComplaint] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  
  // Initialize hint assistant
  useEffect(() => {
    if (!isEnabled) return;
    
    const initHintVapi = async () => {
      if (!process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY) {
        console.error('Vapi public key not found');
        return;
      }
      
      try {
        vapiRef.current = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY);
        const vapi = vapiRef.current;
        
        vapi.on('call-start', () => {
          console.log('💡 Hint assistant started');
          setIsConnected(true);
        });
        
        vapi.on('call-end', () => {
          console.log('💡 Hint assistant ended');
          setIsConnected(false);
        });
        
        vapi.on('message', (message: any) => {
          if (message.type === 'transcript' && message.role === 'assistant' && message.transcript) {
            try {
              let hintData = message.transcript;
              hintData = hintData.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
              const hint = JSON.parse(hintData);
              
              if (hint.type && hint.message) {
                const newHint = {
                  id: Date.now().toString(),
                  type: hint.type,
                  message: hint.message,
                  category: hint.category || 'General'
                };
                
                setHints(prev => {
                  const newHints = [newHint, ...prev];
                  return newHints.slice(0, 3);
                });
                
                setTimeout(() => {
                  setHints(prev => prev.filter(h => h.id !== newHint.id));
                }, 5000);
              }
            } catch (e) {
              console.error('Failed to parse hint:', e);
            }
          }
        });
        
        vapi.on('error', (error: any) => {
          console.error('Hint assistant error:', error);
        });
        
        // Start with initial context
        await vapi.start(HINT_ASSISTANT_ID, {
          variableValues: {
            departmentName: context.departmentName,
            patientCondition: context.patientCondition,
            conversationType: context.conversationType
          },
          firstMessage: "Hint system ready"
        });
        
      } catch (error) {
        console.error('Failed to initialize hint assistant:', error);
        toast.error('Hint system unavailable');
      }
    };
    
    initHintVapi();
    
    return () => {
      if (vapiRef.current) {
        try {
          vapiRef.current.stop();
        } catch (e) {}
        vapiRef.current = null;
      }
    };
  }, [isEnabled, context]);
  
  // Listen for student messages and send to hint assistant
  useEffect(() => {
    if (!isEnabled || !isConnected || !vapiRef.current) return;
    
    const handleNewMessage = (event: CustomEvent) => {
      const { studentMessage, patientMessage, fullHistory } = event.detail;
      
      // Update local tracking
      const msg = studentMessage.toLowerCase();
      if (!hasIntroduced && (msg.includes('dr.') || msg.includes('doctor') || msg.includes('name is'))) {
        setHasIntroduced(true);
      }
      if (!hasConsent && (msg.includes('consent') || msg.includes('permission') || msg.includes('okay') || msg.includes('agree'))) {
        setHasConsent(true);
      }
      if (!hasChiefComplaint && (msg.includes('bring you') || msg.includes('what brings') || msg.includes('problem'))) {
        setHasChiefComplaint(true);
      }
      
      // Build the analysis prompt with full context
      const analysisPrompt = `Student: ${studentMessage}
Patient: ${patientMessage || 'No response'}

Student has already:
- Introduced themselves: ${hasIntroduced ? 'YES' : 'NO'}
- Obtained consent: ${hasConsent ? 'YES' : 'NO'}
- Asked chief complaint: ${hasChiefComplaint ? 'YES' : 'NO'}

Provide hint.`;
      
      // Send as a simulated user message to trigger analysis
      // Note: Vapi doesn't have a direct "send" method, so we need to use the assistant's capabilities
      console.log('Sending to hint assistant:', analysisPrompt);
    };
    
    window.addEventListener('newStudentMessage', handleNewMessage as EventListener);
    return () => window.removeEventListener('newStudentMessage', handleNewMessage as EventListener);
  }, [isEnabled, isConnected, hasIntroduced, hasConsent, hasChiefComplaint]);
  
  const getHintStyles = (type: string) => {
    switch(type) {
      case 'success':
        return isDark 
          ? 'bg-green-900/90 border-green-500 text-green-100'
          : 'bg-green-100 border-green-400 text-green-800';
      case 'warning':
        return isDark
          ? 'bg-yellow-900/90 border-yellow-500 text-yellow-100'
          : 'bg-yellow-100 border-yellow-400 text-yellow-800';
      case 'error':
        return isDark
          ? 'bg-red-900/90 border-red-500 text-red-100'
          : 'bg-red-100 border-red-400 text-red-800';
      default:
        return isDark
          ? 'bg-blue-900/90 border-blue-500 text-blue-100'
          : 'bg-blue-100 border-blue-400 text-blue-800';
    }
  };
  
  const getIcon = (type: string) => {
    switch(type) {
      case 'success': return 'fa-check-circle';
      case 'warning': return 'fa-exclamation-triangle';
      case 'error': return 'fa-times-circle';
      default: return 'fa-info-circle';
    }
  };
  
  if (!isEnabled) return null;
  
  return (
    <>
      <button
        onClick={() => setIsMinimized(!isMinimized)}
        className={cn(
          "fixed bottom-24 right-6 z-50 w-12 h-12 rounded-full shadow-lg transition-all duration-300 hover:scale-110",
          "bg-gradient-to-r from-amber-500 to-orange-600",
          "flex items-center justify-center"
        )}
      >
        <i className="fas fa-lightbulb text-white text-lg"></i>
        {hints.length > 0 && !isMinimized && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center animate-pulse">
            {hints.length}
          </span>
        )}
        {isConnected && (
          <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping"></span>
        )}
      </button>
      
      {!isMinimized && (
        <div className={cn(
          "fixed bottom-36 right-6 z-50 w-80 rounded-xl shadow-2xl overflow-hidden animate-slide-up border",
          isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        )}>
          <div className={cn(
            "px-4 py-3 flex items-center justify-between border-b",
            isDark ? "bg-gray-900 border-gray-700" : "bg-gray-50 border-gray-200"
          )}>
            <div className="flex items-center gap-2">
              <i className="fas fa-lightbulb text-amber-500"></i>
              <h3 className={cn("font-semibold", isDark ? "text-white" : "text-gray-800")}>AI Hints</h3>
              <span className={cn("text-xs px-2 py-0.5 rounded-full", isDark ? "bg-amber-900 text-amber-300" : "bg-amber-100 text-amber-700")}>
                Active
              </span>
            </div>
            <button onClick={() => setIsMinimized(true)} className={cn("p-1 rounded", isDark ? "hover:bg-gray-700" : "hover:bg-gray-200")}>
              <i className="fas fa-minus text-sm"></i>
            </button>
          </div>
          
          <div className="max-h-96 overflow-y-auto p-3 space-y-2">
            {hints.length === 0 ? (
              <div className="text-center py-8">
                <i className="fas fa-microphone-alt text-3xl text-gray-400 mb-2"></i>
                <p className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>Hints will appear here</p>
                <p className={cn("text-xs mt-1", isDark ? "text-gray-500" : "text-gray-400")}>Based on your conversation</p>
              </div>
            ) : (
              hints.map((hint) => (
                <div key={hint.id} className={cn("p-3 rounded-xl border-l-4 animate-slide-in", getHintStyles(hint.type))}>
                  <div className="flex items-start gap-2">
                    <i className={`fas ${getIcon(hint.type)} mt-0.5 text-sm`}></i>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{hint.message}</p>
                      <p className="text-xs opacity-75 mt-1">{hint.category}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      
      <style jsx>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
        .animate-pulse { animation: pulse 1s ease-in-out infinite; }
        .animate-ping { animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes ping { 0% { transform: scale(1); opacity: 1; } 75%, 100% { transform: scale(2); opacity: 0; } }
      `}</style>
    </>
  );
}