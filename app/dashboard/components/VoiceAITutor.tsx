// app/dashboard/components/VoiceAITutor.tsx
'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from "@/utils";
import { useTheme } from "next-themes";
import Vapi from '@vapi-ai/web';
import { toast } from 'sonner';
import { initVapi, trackCall } from '@/lib/vapi/client';
import { extractVapiError } from '@/lib/vapi/errors';
import { VAPI_ACCOUNTS } from '@/lib/vapi/accounts';

interface VoiceAITutorProps {
  context: {
    departmentName: string;
    patientCondition: string;
    currentStep: number;
    totalSteps: number;
    conversationType: 'clerking' | 'counselling' | 'physical_exam' | 'flashcards';
  };
  recentConversation: Array<{ role: string; content: string }>;
  milestones?: {
    introduced: boolean;
    consent: boolean;
    patientInfo: boolean;
    chiefComplaint: boolean;
    historyTaking: boolean;
    redFlags: boolean;
    ice: boolean;
    systemsReview: boolean;
    pastHistory: boolean;
    drugHistory: boolean;
    socialHistory: boolean;
  };
  patientName?: string;
  patientCondition?: string;
  onTutorResponse?: (response: string) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function VoiceAITutor({ 
  context, 
  recentConversation, 
  milestones, 
  patientName = 'the patient',
  patientCondition = '',
  onTutorResponse,
  isOpen: controlledIsOpen,
  onOpenChange,  
}: VoiceAITutorProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value);
    } else {
      setInternalIsOpen(value);
    }
  };
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastResponse, setLastResponse] = useState<string>('');
  const [hasActivity, setHasActivity] = useState(false);
  
  const vapiRef = useRef<Vapi | null>(null);
  const accountIdRef = useRef<string | null>(null);
  const failoverInProgressRef = useRef(false);
  const isMountedRef = useRef(true);
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const resetActivityTimeout = useCallback(() => {
    setHasActivity(true);
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }
    activityTimeoutRef.current = setTimeout(() => {
      setHasActivity(false);
    }, 3000);
  }, []);
  
  const getFirstMessage = useCallback(() => {
    const conditionText = patientCondition || 'the presenting complaint';
    const nameText = patientName;
    
    switch (context.conversationType) {
      case 'clerking':
        return `Good afternoon, I'm Ace, your AI coach. You're to take a history from ${nameText} with ${conditionText}. How do you proceed?`;
      case 'counselling':
        return `Good afternoon, I'm Ace, your AI coach. You're to counsel ${nameText} with ${conditionText}. How do you proceed?`;
      case 'physical_exam':
        return `Good afternoon, I'm Ace, your AI coach. You're to physically examine ${nameText} with ${conditionText}. How do you proceed?`;
      case 'flashcards':
        return `Good afternoon, I'm Ace, your AI coach. Let's review some flashcards on ${conditionText}. Ready to begin?`;
      default:
        return `Good afternoon, I'm Ace, your AI coach. How can I help you with your OSCE practice today?`;
    }
  }, [context.conversationType, patientCondition, patientName]);
  
  const getTutorPrompt = useCallback(() => {
    const lastMessages = recentConversation.slice(-3);
    const conversationSummary = lastMessages
      .map(m => `${m.role === 'student' ? 'Student' : 'Patient'}: ${m.content}`)
      .join('\n');
    
    let practiceType = 'clinical skills';
    if (context.conversationType === 'clerking') practiceType = 'history taking';
    else if (context.conversationType === 'counselling') practiceType = 'patient counselling';
    else if (context.conversationType === 'physical_exam') practiceType = 'physical examination';
    else if (context.conversationType === 'flashcards') practiceType = 'flashcard study';
    
    const completedItems: string[] = [];
    if (milestones) {
      if (milestones.introduced) completedItems.push('✓ Introduction done');
      if (milestones.consent) completedItems.push('✓ Consent obtained');
      if (milestones.patientInfo) completedItems.push('✓ Patient info confirmed');
      if (milestones.chiefComplaint) completedItems.push('✓ Chief complaint asked');
      if (milestones.historyTaking) completedItems.push('✓ History taking in progress');
      if (milestones.redFlags) completedItems.push('✓ Red flags asked');
      if (milestones.ice) completedItems.push('✓ ICE explored');
      if (milestones.pastHistory) completedItems.push('✓ Past medical history');
      if (milestones.drugHistory) completedItems.push('✓ Drug history');
      if (milestones.socialHistory) completedItems.push('✓ Social history');
      if (milestones.systemsReview) completedItems.push('✓ Systems review');
    }
    
    const completedText = completedItems.length > 0 
      ? `\n**Completed Milestones:**\n${completedItems.join('\n')}` 
      : '\n⚠️ **CRITICAL:** Student has not completed Introduction or Consent yet - You MUST remind them! These affect their grade significantly.';
    
    const consentMissing = milestones && !milestones.consent;
    const consentWarning = consentMissing 
      ? '\n\n⚠️ **URGENT - GRADE IMPACT:** Student has NOT obtained consent! Remind them immediately: "Do I have your permission to ask you questions?" Grade will be 0 without consent.'
      : '';
    
    const introMissing = milestones && !milestones.introduced;
    const introWarning = introMissing && !consentMissing
      ? '\n\n⚠️ **REMINDER:** Student needs to introduce themselves first: "Hello, I\'m Dr. [Name], one of the doctors taking care of you."'
      : '';
    
    return `You are Ace, a world-class medical educator and OSCE tutor. Be warm, encouraging, and precise. Give actionable advice in 2-3 sentences.

## CURRENT SESSION:
- **Department:** ${context.departmentName}
- **Patient Condition:** ${context.patientCondition || 'General'}
- **Practice Type:** ${practiceType}
- **Progress:** Step ${context.currentStep} of ${context.totalSteps}
${completedText}
${consentWarning}
${introWarning}

## RECENT CONVERSATION:
${conversationSummary || 'The conversation is just starting.'}

## CRITICAL GRADING RULES:
1. CONSENT IS MANDATORY - Grade = 0 if consent not obtained
2. INTRODUCTION IS REQUIRED - Must state name and role
3. STRUCTURE MATTERS - Follow OSCE structure exactly

Give specific example phrases in quotes. Keep responses under 3 sentences. Be encouraging.`;
  }, [context, recentConversation, milestones]);
  
  // Main tutor initialization with failover
  const initTutorWithFailover = useCallback(async (excludedAccounts: string[] = []) => {
  if (failoverInProgressRef.current) return;
  
  try {
    setIsInitializing(true);
    
    console.log(`🎓 Initializing tutor with excluded accounts: ${excludedAccounts.join(', ') || 'none'}`);
    
    const { vapi, accountId, assistantId } = await initVapi('tutor', excludedAccounts);
    vapiRef.current = vapi;
    accountIdRef.current = accountId;
    
    console.log(`📞 Tutor using account: ${accountId}`);
    
    await trackCall(accountId, 'start');
    
    let callStarted = false;
    let startError: any = null;
    
    // Create a promise that will reject on error
    const startPromise = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (!callStarted && !startError) {
          reject(new Error('Tutor call start timeout'));
        }
      }, 10000);
      
      vapi.on('call-start', () => {
  callStarted = true;
  clearTimeout(timeout);
  console.log('🎓 Tutor voice session started successfully');
  
  if (isMountedRef.current) {
    // ✅ DISMISS ANY ERROR TOASTS that might be showing from failed attempts
    toast.dismiss();
    
    setIsListening(true);
    setIsSpeaking(false);
    setIsInitializing(false);
    resetActivityTimeout();
    toast.success('Ace is ready! Ask me anything about your OSCE practice.', { duration: 2000 });
  }
  resolve();
});
      
      vapi.on('call-end', () => {
        console.log('🎓 Tutor voice session ended');
        if (isMountedRef.current) {
          setIsListening(false);
          setIsSpeaking(false);
          setIsInitializing(false);
        }
        trackCall(accountId, 'end').catch(console.error);
      });
      
      vapi.on('speech-start', () => {
        setIsSpeaking(true);
        setIsListening(false);
        resetActivityTimeout();
      });
      
      vapi.on('speech-end', () => {
        setIsSpeaking(false);
        setIsListening(true);
      });
      
      vapi.on('message', (message: any) => {
        if (message.type === 'transcript' && message.role === 'user') {
          setTranscript(message.transcript);
          resetActivityTimeout();
        } else if (message.type === 'transcript' && message.role === 'assistant') {
          let cleanResponse = message.transcript;
          cleanResponse = cleanResponse.replace(/```[\s\S]*?```/g, '');
          cleanResponse = cleanResponse.replace(/\{[^}]+\}/g, '');
          cleanResponse = cleanResponse.replace(/`[^`]+`/g, '');
          cleanResponse = cleanResponse.replace(/\\n/g, ' ');
          cleanResponse = cleanResponse.replace(/\s+/g, ' ').trim();
          
          setLastResponse(cleanResponse);
          if (onTutorResponse) onTutorResponse(cleanResponse);
          resetActivityTimeout();
          
          setTimeout(() => setTranscript(''), 2000);
        }
      });
      
      vapi.on('error', (error: any) => {
        if (startError) return;
        
        const { message, isRetryable } = extractVapiError(error);
        console.error('❌ Tutor error during start:', { message, isRetryable });
        
        startError = error;
        clearTimeout(timeout);
        
        // IMPORTANT: Reject the promise so the catch block runs
        reject(error);
      });
      
      const tutorPrompt = getTutorPrompt();
      const firstMessage = getFirstMessage();
      const assistantOverrides = {
        variableValues: {
          patientName: patientName,
          patientAge: "N/A",
          patientGender: "N/A",
          patientLocation: "N/A",
          patientCondition: context.patientCondition || "General",
          patientPrompt: tutorPrompt,
        },
        firstMessage: firstMessage,
        stopSpeakingPlan: { numWords: 1, voiceSeconds: 0.25, backoffSeconds: 1.2 },
      };
      
      vapi.start(assistantId, assistantOverrides).catch((err) => {
        if (!startError) {
          startError = err;
          clearTimeout(timeout);
          reject(err);
        }
      });
    });
    
    // Wait for the start to complete or fail
    await startPromise;
    
    } catch (error: any) {
    console.error('❌ Failed to initialize tutor:', error);
    
    const { message, isRetryable } = extractVapiError(error);
    console.log(`📊 Tutor failover check: isRetryable=${isRetryable}, excludedCount=${excludedAccounts.length}, message="${message}"`);
    
    const failedAccountId = accountIdRef.current;
    
    const isAuthError = message.toLowerCase().includes('unauthorized') || 
                        message.toLowerCase().includes('invalid key') ||
                        isRetryable === true;
    
    if ((isRetryable || isAuthError) && excludedAccounts.length < 5) {
      if (failedAccountId) {
        console.log(`🏷️ Marking tutor account ${failedAccountId} as exhausted`);
        await trackCall(failedAccountId, 'exhausted').catch(() => {});
      }
      
      if (vapiRef.current) {
        try { vapiRef.current.stop(); } catch (e) { console.log('Stop error:', e); }
        vapiRef.current = null;
      }
      accountIdRef.current = null;
      
      const newExcluded = [...excludedAccounts, failedAccountId || 'unknown'];
      console.log(`🔄 Retrying tutor with excluded accounts: ${newExcluded.join(', ')}`);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      failoverInProgressRef.current = false;
      await initTutorWithFailover(newExcluded);
      return;
    }
    
    // ❌ REMOVED TOAST - silent failure
    console.log(`❌ All accounts exhausted for tutor.`);
    failoverInProgressRef.current = false;
    setIsInitializing(false);
  }
}, [context, getTutorPrompt, getFirstMessage, patientName, onTutorResponse, resetActivityTimeout]);
  
  // Initialize tutor when modal opens
  useEffect(() => {
    if (!isOpen) {
      // Clean up when modal closes
      if (vapiRef.current) {
        try { vapiRef.current.stop(); } catch (e) {}
        vapiRef.current = null;
      }
      setIsListening(false);
      setIsSpeaking(false);
      setIsInitializing(false);
      return;
    }
    
    isMountedRef.current = true;
    failoverInProgressRef.current = false;
    
    initTutorWithFailover();
    
    return () => {
      isMountedRef.current = false;
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      if (vapiRef.current) {
        try {
          vapiRef.current.stop();
        } catch (e) {}
        vapiRef.current = null;
      }
      if (accountIdRef.current) {
        trackCall(accountIdRef.current, 'end').catch(console.error);
        accountIdRef.current = null;
      }
    };
  }, [isOpen, initTutorWithFailover]);
  
  const startTutorSession = useCallback(async (excludedAccounts: string[] = []) => {
    if (isListening || isSpeaking) {
      toast.info('Tutor is already active');
      return;
    }
    if (failoverInProgressRef.current) return;
    
    try {
      setIsInitializing(true);
      
      console.log(`🎓 Starting tutor session with excluded: ${excludedAccounts.join(', ') || 'none'}`);
      
      const { vapi, accountId, assistantId } = await initVapi('tutor', excludedAccounts);
      vapiRef.current = vapi;
      accountIdRef.current = accountId;
      
      console.log(`📞 Tutor using account: ${accountId}`);
      
      await trackCall(accountId, 'start');
      
      let callStarted = false;
      let startError: any = null;
      
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (!callStarted && !startError) {
            reject(new Error('Tutor start timeout'));
          }
        }, 10000);
        
        vapi.on('call-start', () => {
  callStarted = true;
  clearTimeout(timeout);
  console.log('🎓 Tutor session started');
  
  // ✅ DISMISS ANY ERROR TOASTS
  toast.dismiss();
  
  setIsListening(true);
  setIsSpeaking(false);
  setIsInitializing(false);
  resetActivityTimeout();
  toast.success('Ace is ready! Ask me anything.', { duration: 2000 });
  resolve();
});
        
        vapi.on('call-end', () => {
          console.log('🎓 Tutor session ended');
          setIsListening(false);
          setIsSpeaking(false);
          setIsInitializing(false);
          trackCall(accountId, 'end').catch(console.error);
        });
        
        vapi.on('speech-start', () => {
          setIsSpeaking(true);
          setIsListening(false);
          resetActivityTimeout();
        });
        
        vapi.on('speech-end', () => {
          setIsSpeaking(false);
          setIsListening(true);
        });
        
        vapi.on('message', (message: any) => {
          if (message.type === 'transcript' && message.role === 'user') {
            setTranscript(message.transcript);
            resetActivityTimeout();
          } else if (message.type === 'transcript' && message.role === 'assistant') {
            let cleanResponse = message.transcript;
            cleanResponse = cleanResponse.replace(/```[\s\S]*?```/g, '');
            cleanResponse = cleanResponse.replace(/\{[^}]+\}/g, '');
            cleanResponse = cleanResponse.replace(/`[^`]+`/g, '');
            cleanResponse = cleanResponse.replace(/\\n/g, ' ');
            cleanResponse = cleanResponse.replace(/\s+/g, ' ').trim();
            
            setLastResponse(cleanResponse);
            if (onTutorResponse) onTutorResponse(cleanResponse);
            resetActivityTimeout();
            setTimeout(() => setTranscript(''), 2000);
          }
        });
        
        vapi.on('error', (error: any) => {
          if (startError) return;
          const { message, isRetryable } = extractVapiError(error);
          console.error('❌ Tutor error:', { message, isRetryable });
          startError = error;
          clearTimeout(timeout);
          reject(error);
        });
        
        const tutorPrompt = getTutorPrompt();
        const firstMessage = getFirstMessage();
        const assistantOverrides = {
          variableValues: {
            patientName: patientName,
            patientAge: "N/A",
            patientGender: "N/A",
            patientLocation: "N/A",
            patientCondition: context.patientCondition || "General",
            patientPrompt: tutorPrompt,
          },
          firstMessage: firstMessage,
          stopSpeakingPlan: { numWords: 1, voiceSeconds: 0.25, backoffSeconds: 1.2 },
        };
        
        vapi.start(assistantId, assistantOverrides).catch((err) => {
          if (!startError) {
            startError = err;
            clearTimeout(timeout);
            reject(err);
          }
        });
      });
      
    } catch (error: any) {
      console.error('❌ Tutor start failed:', error);
      
      const { message, isRetryable } = extractVapiError(error);
      console.log(`📊 Tutor start failover: isRetryable=${isRetryable}, excludedCount=${excludedAccounts.length}, message="${message}"`);
      
      const failedAccountId = accountIdRef.current;
      
      const totalValidAccounts = VAPI_ACCOUNTS.filter(a => a.publicKey && a.publicKey.trim() !== '').length;
      
      if (isRetryable && excludedAccounts.length < totalValidAccounts) {
        if (failedAccountId) {
          console.log(`🏷️ Marking tutor account ${failedAccountId} as exhausted`);
          await trackCall(failedAccountId, 'exhausted').catch(() => {});
        }
        
        if (vapiRef.current) {
          try { vapiRef.current.stop(); } catch (e) { console.log('Stop error:', e); }
          vapiRef.current = null;
        }
        accountIdRef.current = null;
        
        const newExcluded = [...excludedAccounts, failedAccountId || 'unknown'];
        console.log(`🔄 Retrying tutor with excluded accounts: ${newExcluded.join(', ')}`);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await startTutorSession(newExcluded);
        return; // Silent retry - no toast
      }
      
      // All accounts exhausted - just log, NO TOAST
      // initTutorWithFailover handles the user-facing error
      console.log('❌ startTutorSession exhausted all accounts - initTutorWithFailover will show error if needed');
      setIsInitializing(false);
    }
  }, [context, getTutorPrompt, getFirstMessage, isListening, isSpeaking, patientName, onTutorResponse, resetActivityTimeout]);
  
  const stopTutorSession = useCallback(() => {
    if (vapiRef.current) {
      try {
        vapiRef.current.stop();
      } catch (e) {}
    }
    if (accountIdRef.current) {
      trackCall(accountIdRef.current, 'end').catch(console.error);
      accountIdRef.current = null;
    }
    setIsListening(false);
    setIsSpeaking(false);
    setTranscript('');
    setIsInitializing(false);
  }, []);
  
  const suggestedQuestions = [
    "What should I do next?",
    "How do I get consent?",
    "Am I on the right track?",
    "What questions should I ask for this condition?",
    "Give me feedback on my last question",
    "What are the red flags here?",
    "How do I summarize findings?"
  ];

  const getStatusInfo = () => {
    if (isInitializing) {
      return { text: 'Initializing...', icon: 'fa-spinner fa-spin', color: 'text-yellow-500', bg: 'bg-yellow-500/20' };
    }
    if (isListening) {
      if (!hasActivity && transcript === '') {
        return { text: 'User Audio: Not speaking', icon: 'fa-microphone-slash', color: 'text-gray-400', bg: 'bg-gray-500/20' };
      }
      return { text: 'Listening to you...', icon: 'fa-microphone', color: 'text-emerald-500', bg: 'bg-emerald-500/20', animate: 'animate-pulse' };
    }
    if (isSpeaking) {
      return { text: 'Ace is speaking...', icon: 'fa-volume-up', color: 'text-blue-500', bg: 'bg-blue-500/20', animate: 'animate-pulse' };
    }
    return { text: 'Ready to help', icon: 'fa-microphone', color: 'text-gray-400', bg: 'bg-gray-500/20' };
  };

  const statusInfo = getStatusInfo();
  
  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-40 w-14 h-14 md:w-16 md:h-16 rounded-full shadow-2xl transition-all duration-300 hover:scale-110",
          isOpen 
            ? "bg-gradient-to-r from-red-500 to-rose-600" 
            : "bg-gradient-to-r from-emerald-500 to-teal-600",
          "flex items-center justify-center group"
        )}
      >
        {isOpen ? (
          <i className="fas fa-times text-white text-xl md:text-2xl"></i>
        ) : (
          <i className="fas fa-chalkboard-teacher text-white text-xl md:text-2xl"></i>
        )}
        
        {(isListening || isSpeaking || isInitializing) && !isOpen && (
          <>
            <span className="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-green-500 rounded-full animate-pulse"></span>
            <span className="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-green-500 rounded-full animate-ping"></span>
          </>
        )}
        
        {milestones && !milestones.consent && !isOpen && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center animate-bounce">
            <i className="fas fa-exclamation text-white text-[10px]"></i>
          </div>
        )}
      </button>
      
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-200"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Modal - Clean centered appearance without slide animation */}
          <div className={cn(
            "fixed inset-0 z-50 flex items-center justify-center p-4",
            "pointer-events-none"
          )}>
            <div className={cn(
              "w-full max-w-[550px] max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl",
              "pointer-events-auto",
              isDark ? "bg-gray-900 border border-gray-700" : "bg-white border border-gray-200",
              "flex flex-col"
            )}>
              {/* Header */}
              <div className={cn(
                "px-5 py-4 flex-shrink-0",
                "bg-gradient-to-r from-emerald-600 to-teal-600"
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-base">AI Coach</h3>
                    <p className="text-xs text-white/80">Your OSCE Assistant and Walk-through Guardian</p>
                  </div>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="text-white/80 hover:text-white transition p-2 rounded-lg hover:bg-white/10"
                  >
                    <i className="fas fa-times text-base"></i>
                  </button>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="relative mb-3">
                    <img
                      src="/acemodel.png"
                      alt="Ace - AI Coach"
                      className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover shadow-lg border-3 border-emerald-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=Ace&background=10b981&color=fff&bold=true&size=96';
                      }}
                    />
                    {(isListening || isSpeaking) && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center animate-pulse">
                        <span className="w-2 h-2 bg-white rounded-full"></span>
                      </div>
                    )}
                  </div>
                  
                  <h3 className={cn("text-lg md:text-xl font-bold mb-1", isDark ? "text-white" : "text-gray-800")}>
                    Ace
                  </h3>
                  <p className={cn("text-xs", isDark ? "text-emerald-400" : "text-emerald-600")}>
                    AI Coach
                  </p>
                  <p className={cn("text-xs mt-1", isDark ? "text-gray-400" : "text-gray-500")}>
                    Inspiring and ready to assist
                  </p>
                </div>
                
                <div className={cn("h-px w-full", isDark ? "bg-gray-700" : "bg-gray-200")}></div>
                
                <div className={cn(
                  "flex flex-col items-center justify-center p-6 rounded-2xl text-center",
                  statusInfo.bg,
                  "transition-all duration-300"
                )}>
                  <div className={cn(
                    "relative w-20 h-20 rounded-full flex items-center justify-center mb-4",
                    isListening || isSpeaking ? "shadow-lg" : "",
                    isListening ? "bg-emerald-500/30" : isSpeaking ? "bg-blue-500/30" : "bg-gray-500/30"
                  )}>
                    <div className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center",
                      isListening ? "bg-emerald-500" : isSpeaking ? "bg-blue-500" : "bg-gray-500"
                    )}>
                      <i className={cn(
                        `fas ${statusInfo.icon} text-white text-2xl`,
                        statusInfo.animate
                      )}></i>
                    </div>
                    
                    {isSpeaking && (
                      <>
                        <div className="absolute inset-0 rounded-full animate-ping-slow border-2 border-blue-500/50"></div>
                        <div className="absolute inset-0 rounded-full animate-ping border-2 border-blue-500/30" style={{ animationDelay: '0.3s' }}></div>
                      </>
                    )}
                    
                    {isListening && hasActivity && (
                      <>
                        <div className="absolute inset-0 rounded-full animate-ping-slow border-2 border-emerald-500/50"></div>
                      </>
                    )}
                  </div>
                  
                  <p className={cn(
                    "text-base font-semibold",
                    statusInfo.color
                  )}>
                    {statusInfo.text}
                  </p>
                  
                  {transcript && (isListening || isSpeaking) && (
                    <div className="mt-3 p-3 rounded-xl bg-black/20 w-full">
                      <p className="text-xs text-white/60 mb-1 flex items-center justify-center gap-1">
                        <i className="fas fa-comment-dots text-emerald-400 text-xs"></i>
                        You said:
                      </p>
                      <p className="text-sm text-white/90">
                        "{transcript}"
                      </p>
                    </div>
                  )}
                </div>
                
                {lastResponse && !isListening && !isSpeaking && (
                  <div className={cn(
                    "p-4 rounded-xl border-l-4 border-blue-500",
                    isDark ? "bg-blue-900/20" : "bg-blue-50"
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      <img
                        src="/acemodel.png"
                        alt="Ace"
                        className="w-5 h-5 rounded-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <i className="fas fa-chalkboard-teacher text-blue-500 text-sm"></i>
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Ace's Advice:</p>
                    </div>
                    <p className={cn("text-sm leading-relaxed", isDark ? "text-gray-300" : "text-gray-700")}>
                      {lastResponse}
                    </p>
                  </div>
                )}
                
                {!transcript && !lastResponse && !isListening && !isSpeaking && !isInitializing && (
                  <div className="text-center">
                    <p className={cn("text-sm mb-4", isDark ? "text-gray-400" : "text-gray-600")}>
                      {getFirstMessage()}
                    </p>
                    
                    {milestones && (
                      <div className="mb-5 text-left">
                        <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                          <i className="fas fa-chart-line text-emerald-500 text-xs"></i>
                          Your Progress:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {milestones.introduced && <span className="text-[10px] px-2 py-0.5 bg-green-500/20 text-green-600 dark:text-green-400 rounded-full">✓ Intro</span>}
                          {milestones.consent && <span className="text-[10px] px-2 py-0.5 bg-green-500/20 text-green-600 dark:text-green-400 rounded-full">✓ Consent</span>}
                          {milestones.patientInfo && <span className="text-[10px] px-2 py-0.5 bg-green-500/20 text-green-600 dark:text-green-400 rounded-full">✓ Patient Info</span>}
                          {milestones.chiefComplaint && <span className="text-[10px] px-2 py-0.5 bg-green-500/20 text-green-600 dark:text-green-400 rounded-full">✓ Chief Complaint</span>}
                          {milestones.historyTaking && <span className="text-[10px] px-2 py-0.5 bg-green-500/20 text-green-600 dark:text-green-400 rounded-full">✓ History</span>}
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 mb-2">Suggested questions:</p>
                      <div className="grid grid-cols-1 gap-2">
                        {suggestedQuestions.map((q, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              toast.info(`Ask Ace: "${q}"`, { duration: 3000 });
                            }}
                            className={cn(
                              "text-left px-4 py-2 rounded-xl text-sm transition-all",
                              isDark 
                                ? "hover:bg-gray-800 text-gray-300 bg-gray-800/50" 
                                : "hover:bg-gray-100 text-gray-700 bg-gray-100/50",
                              "flex items-center gap-2"
                            )}
                          >
                            <i className="fas fa-question-circle text-emerald-500 text-xs"></i>
                            <span>{q}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {isInitializing && !transcript && !lastResponse && (
                  <div className="text-center py-8">
                    <div className="relative w-16 h-16 mx-auto mb-4">
                      <img
                        src="/acemodel.png"
                        alt="Ace"
                        className="w-16 h-16 rounded-full object-cover opacity-50"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 rounded-full border-4 border-emerald-500/30"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
                    </div>
                    <p className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-600")}>
                      Waking up Ace...
                    </p>
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className={cn(
                "px-5 py-4 border-t flex-shrink-0",
                isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"
              )}>
                {!isListening && !isSpeaking && !isInitializing ? (
                  <button
                    onClick={() => startTutorSession()}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 hover:scale-105 shadow-lg"
                  >
                    <i className="fas fa-microphone text-sm"></i>
                    Ask Ace for Help
                  </button>
                ) : (
                  <button
                    onClick={stopTutorSession}
                    className="w-full py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 hover:scale-105 shadow-lg"
                  >
                    <i className="fas fa-stop text-sm"></i>
                    Stop Session
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      
      <style jsx>{`
        @keyframes ping-slow {
          0% {
            transform: scale(1);
            opacity: 0.5;
          }
          75%, 100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        @keyframes ping {
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          75%, 100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-ping {
          animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .animate-ping-slow {
          animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .animate-bounce {
          animation: bounce 0.5s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}