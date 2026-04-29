// app/dashboard/components/HintPopup.tsx
'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from "@/utils";
import { useTheme } from "next-themes";

interface HintMessage {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  category: string;
  rationale?: string;
  suggestion?: string;
}

interface HintPopupProps {
  isEnabled: boolean;
  milestones?: {
    introduced: boolean;
    consent: boolean;
    patientInfo: boolean;
    chiefComplaint: boolean;
    historyTaking: boolean;
    redFlags: boolean;
    ice: boolean;
    [key: string]: boolean;
  };
  patientCondition?: string;
  departmentName?: string;
  conversationType?: string;
  recentMessages?: Array<{ role: string; content: string }>;
  onClose?: () => void;
  isVoiceConnected?: boolean;
  isVoiceConnecting?: boolean;
  hasMessages?: boolean;
  onStartVoice?: () => void;
  onPauseVoice?: () => void;
  inline?: boolean;
}

export function HintPopup({ 
  isEnabled, 
  milestones, 
  patientCondition = 'General',
  departmentName = 'General Medicine',
  conversationType = 'clerking',
  recentMessages = [],
  onClose,
  isVoiceConnected = false,
  isVoiceConnecting = false,
  hasMessages = false,
  onStartVoice,
  onPauseVoice,
  inline = false,
}: HintPopupProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isMobilePopup = !inline;
  const [isOpen, setIsOpen] = useState(false);
  const [currentHint, setCurrentHint] = useState<HintMessage | null>(null);
  const [pendingHints, setPendingHints] = useState<HintMessage[]>([]);
  const [activeTab, setActiveTab] = useState<'hints' | 'progress'>('hints');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBeeping, setIsBeeping] = useState(false);
  
  const shownHintHashesRef = useRef<Set<string>>(new Set());
  const lastHintTimeRef = useRef<number>(0);
  
  const getHintHash = useCallback((hint: HintMessage): string => {
    return `${hint.category}-${hint.message.slice(0, 50)}`;
  }, []);
  
  const showHint = useCallback((hint: HintMessage) => {
    const hintHash = getHintHash(hint);
    
    if (shownHintHashesRef.current.has(hintHash)) {
      console.log('🔄 Skipping duplicate hint:', hint.category);
      return false;
    }
    
    const now = Date.now();
    if (now - lastHintTimeRef.current < 8000 && currentHint) {
      setPendingHints(prev => {
        if (prev.some(p => getHintHash(p) === hintHash)) return prev;
        return [...prev, hint];
      });
      return false;
    }
    
    shownHintHashesRef.current.add(hintHash);
    if (shownHintHashesRef.current.size > 20) {
      const toDelete = Array.from(shownHintHashesRef.current).slice(0, 10);
      toDelete.forEach(key => shownHintHashesRef.current.delete(key));
    }
    
    setCurrentHint(hint);
    lastHintTimeRef.current = now;
    setFeedback(null);
    return true;
  }, [getHintHash, currentHint]);
  
  useEffect(() => {
    if (!currentHint && pendingHints.length > 0) {
      const timeout = setTimeout(() => {
        const nextHint = pendingHints[0];
        setPendingHints(prev => prev.slice(1));
        showHint(nextHint);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [currentHint, pendingHints, showHint]);
  
  useEffect(() => {
    if (!isEnabled) return;
    if (inline) {
      setIsOpen(true);
    } else {
      setIsBeeping(true);
      const timer = setTimeout(() => setIsBeeping(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isEnabled, inline]);
  
  useEffect(() => {
    if (!isEnabled) return;
    
    const handleShowHint = (event: CustomEvent) => {
      const hint = event.detail;
      console.log('🎯 Received hint from main component:', hint.category);
      
      const formattedHint: HintMessage = {
        id: hint.id || `${Date.now()}-${hint.category}`,
        message: hint.message,
        type: hint.type === 'error' ? 'error' : hint.type === 'warning' ? 'warning' : hint.type === 'success' ? 'success' : 'info',
        category: hint.category,
        rationale: hint.rationale,
        suggestion: hint.suggestion
      };
      
      showHint(formattedHint);
    };
    
    window.addEventListener('showHint', handleShowHint as EventListener);
    
    return () => {
      window.removeEventListener('showHint', handleShowHint as EventListener);
    };
  }, [isEnabled, showHint]);
  
  const nextHint = useCallback(() => {
    setCurrentHint(null);
    setFeedback(null);
    
    if (pendingHints.length > 0) {
      const next = pendingHints[0];
      setPendingHints(prev => prev.slice(1));
      showHint(next);
    } else {
      setFeedback({ message: "No more hints in queue. Keep speaking to get more hints!", type: 'info' });
      setTimeout(() => setFeedback(null), 3000);
    }
  }, [pendingHints, showHint]);
  
  const skipHint = useCallback(() => {
    setFeedback({ message: "⏭️ Skipped. Moving to next hint...", type: 'info' });
    setCurrentHint(null);
    setTimeout(() => nextHint(), 300);
  }, [nextHint]);
  
  const getHintStyles = (type: HintMessage['type']) => {
    const useDarkCard = isDark || isMobilePopup;
    switch(type) {
      case 'success':
        return useDarkCard ? 'bg-emerald-900/90 border-emerald-500 text-emerald-100' : 'bg-emerald-50 border-emerald-400 text-emerald-800';
      case 'warning':
        return useDarkCard ? 'bg-amber-900/90 border-amber-500 text-amber-100' : 'bg-amber-50 border-amber-400 text-amber-800';
      case 'error':
        return useDarkCard ? 'bg-red-900/90 border-red-500 text-red-100' : 'bg-red-50 border-red-400 text-red-800';
      default:
        return useDarkCard ? 'bg-blue-900/90 border-blue-500 text-blue-100' : 'bg-blue-50 border-blue-400 text-blue-800';
    }
  };

  const getIcon = (type: HintMessage['type']) => {
    switch(type) {
      case 'success': return 'fa-check-circle';
      case 'warning': return 'fa-exclamation-triangle';
      case 'error': return 'fa-times-circle';
      default: return 'fa-info-circle';
    }
  };

  const milestoneList = [
    { key: 'introduced', label: 'Introduction', icon: 'fa-user-md', required: true },
    { key: 'consent', label: 'Consent', icon: 'fa-handshake', required: true },
    { key: 'patientInfo', label: 'Patient Information', icon: 'fa-id-card', required: true },
    { key: 'chiefComplaint', label: 'Chief Complaint', icon: 'fa-comments', required: true },
    { key: 'historyTaking', label: 'History Taking', icon: 'fa-stethoscope', required: false },
    { key: 'redFlags', label: 'Red Flags', icon: 'fa-exclamation-triangle', required: false },
    { key: 'ice', label: 'ICE', icon: 'fa-brain', required: false },
  ];

  const getStartButtonText = (): string => {
    if (isVoiceConnecting) return 'Connecting...';
    if (hasMessages && !isVoiceConnected) return 'Resume Session';
    return 'Start Voice Session';
  };

  const getStartButtonIcon = (): string => {
    if (isVoiceConnecting) return 'fa-spinner fa-spin';
    if (hasMessages && !isVoiceConnected) return 'fa-play';
    return 'fa-microphone';
  };

  if (!isEnabled) return null;

  const displayPanel = inline || isOpen;

  // Deep blue gradient style for mobile popup in light mode only
  const mobilePopupStyle = (!isDark && isMobilePopup) 
    ? { background: 'linear-gradient(to bottom, #1e3a8a, #0f172a)', borderColor: '#1e40af' } 
    : undefined;

  return (
    <>
      {/* Mobile floating button */}
      {!inline && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            "fixed right-4 z-50 rounded-2xl shadow-2xl transition-all duration-300 hover:scale-110 flex flex-col items-center justify-center gap-1",
            "w-[88px] h-[88px] sm:w-24 sm:h-24",
            "bottom-32 sm:bottom-36",
            currentHint?.type === 'error' ? "bg-gradient-to-r from-red-500 to-rose-600" :
            currentHint?.type === 'warning' ? "bg-gradient-to-r from-amber-500 to-orange-600" :
            "bg-gradient-to-r from-emerald-500 to-green-600",
            isBeeping && "animate-hint-beep"
          )}
        >
          <i className="fas fa-lightbulb text-white text-2xl sm:text-3xl"></i>
          <span className="text-white text-[10px] sm:text-xs font-bold uppercase tracking-wide leading-tight text-center">
            Show<br className="sm:hidden" /> Hints
          </span>
          
          {isBeeping && (
            <span className="absolute inset-0 rounded-2xl animate-hint-beep-ring bg-white/30" />
          )}
          
          {(currentHint || pendingHints.length > 0) && !isBeeping && (
            <>
              <span className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-yellow-500 rounded-full animate-pulse"></span>
              <span className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-yellow-500 rounded-full animate-ping"></span>
            </>
          )}
          
          {pendingHints.length > 0 && (
            <span className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-red-500 rounded-full text-white text-[10px] sm:text-xs flex items-center justify-center font-bold animate-bounce">
              {pendingHints.length}
            </span>
          )}
        </button>
      )}

      {/* Hint Popup / Inline Panel */}
      {displayPanel && (
        <div 
          style={mobilePopupStyle}
          className={cn(
            "rounded-2xl shadow-2xl overflow-hidden animate-slide-up border",
            inline 
              ? "relative w-full" 
              : "fixed bottom-24 left-1/2 transform -translate-x-1/2 z-40 w-[98vw] max-w-[600px]",
            isDark 
              ? "bg-gray-800 border-gray-700" 
              : isMobilePopup 
                ? "bg-gradient-to-b from-blue-900 to-slate-900 border-blue-800" 
                : "bg-white border-gray-200"
          )}
        >
          <div className={cn(
            "px-4 py-3 flex items-center justify-between border-b",
            isDark 
              ? "bg-gray-900 border-gray-700" 
              : isMobilePopup 
                ? "bg-blue-950/50 border-blue-800/50 backdrop-blur-sm" 
                : "bg-gray-50 border-gray-200"
          )}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 flex items-center justify-center">
                <i className="fas fa-graduation-cap text-white text-sm"></i>
              </div>
              <div>
                <h3 className={cn("font-semibold text-sm", 
                  isDark ? "text-white" : isMobilePopup ? "text-blue-50" : "text-gray-800"
                )}>
                  {inline ? 'Hints & Progress' : 'Hint Display'}
                </h3>
                <p className={cn("text-[10px]", 
                  isDark ? "text-gray-400" : isMobilePopup ? "text-blue-300" : "text-gray-500"
                )}>
                  {inline ? 'Real-time guidance' : 'Real-time hints as you speak'}
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              <button 
                onClick={() => setActiveTab(activeTab === 'hints' ? 'progress' : 'hints')}
                className={cn("px-2 py-1 rounded-lg text-[11px] font-medium transition", 
                  isDark 
                    ? "hover:bg-gray-700 text-gray-300" 
                    : isMobilePopup 
                      ? "hover:bg-blue-800/50 text-blue-200" 
                      : "hover:bg-gray-200 text-gray-600"
                )}
              >
                {activeTab === 'hints' ? '📊 Progress' : '💡 Hints'}
              </button>
              {!inline && (
                <button 
                  onClick={() => setIsOpen(false)} 
                  className={cn("px-2 py-1 rounded-lg transition flex items-center gap-1 text-[11px] font-medium", 
                    isDark 
                      ? "hover:bg-gray-700 text-gray-300" 
                      : isMobilePopup 
                        ? "hover:bg-blue-800/50 text-blue-200" 
                        : "hover:bg-gray-200 text-gray-600"
                  )}
                  title="Hide hints"
                >
                  <i className="fas fa-chevron-down text-[10px]"></i>
                  <span className="text-[10px] font-semibold">Hide</span>
                </button>
              )}
            </div>
          </div>

          <div className={cn(
            "overflow-y-auto",
            inline ? "max-h-[calc(100vh-10rem)]" : "max-h-[450px]"
          )}>
            {activeTab === 'hints' ? (
              <div className="p-4">
                {onStartVoice && (
                  <div className="mb-4">
                    {!isVoiceConnected && !isVoiceConnecting ? (
                      <button
                        onClick={onStartVoice}
                        className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 flex items-center justify-center gap-2 font-semibold shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <i className={`fas ${getStartButtonIcon()} text-sm`}></i>
                        <span>{getStartButtonText()}</span>
                        {!hasMessages && <i className="fas fa-play text-xs opacity-70"></i>}
                      </button>
                    ) : isVoiceConnecting ? (
                      <button
                        disabled
                        className="w-full py-3 bg-gray-500 text-white rounded-xl flex items-center justify-center gap-2 font-semibold opacity-70 cursor-not-allowed"
                      >
                        <i className="fas fa-spinner fa-spin text-sm"></i>
                        <span>Connecting...</span>
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <div className="flex-1 py-2 bg-green-500/20 rounded-xl flex items-center justify-center gap-2 border border-green-500/30">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                          </span>
                          <span className={cn("text-xs font-medium", 
                            isDark ? "text-green-400" : isMobilePopup ? "text-green-300" : "text-green-600"
                          )}>
                            Voice Active
                          </span>
                        </div>
                        {onPauseVoice && (
                          <button
                            onClick={onPauseVoice}
                            className={cn("px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 text-sm",
                              isDark 
                                ? "bg-gray-500/20 text-gray-400 hover:bg-gray-500/30" 
                                : isMobilePopup 
                                  ? "bg-blue-800/30 text-blue-200 hover:bg-blue-800/50" 
                                  : "bg-gray-500/20 text-gray-600 hover:bg-gray-500/30"
                            )}
                          >
                            <i className="fas fa-pause text-xs"></i>
                            <span className="hidden sm:inline">Pause</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {!currentHint ? (
                  <div className="text-center py-8 px-4">
                    <div className={cn("w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center", 
                      isDark ? "bg-gray-700" : isMobilePopup ? "bg-blue-800/30" : "bg-gray-100"
                    )}>
                      <i className="fas fa-microphone-alt text-2xl text-emerald-500"></i>
                    </div>
                    <h4 className={cn("font-semibold mb-1 text-sm", 
                      isDark ? "text-white" : isMobilePopup ? "text-blue-50" : "text-gray-800"
                    )}>
                      {recentMessages.length === 0 ? "Waiting for conversation" : "Listening to you"}
                    </h4>
                    <p className={cn("text-xs", 
                      isDark ? "text-gray-400" : isMobilePopup ? "text-blue-200" : "text-gray-600"
                    )}>
                      {recentMessages.length === 0 
                        ? "Click the button above to start, then speak with the patient."
                        : hasMessages && !isVoiceConnected
                          ? "Click 'Resume Session' to continue where you left off."
                          : "Hints will appear here automatically as you speak."}
                    </p>
                    {recentMessages.length === 0 && !isVoiceConnected && (
                      <div className={cn(
                        "mt-4 p-3 rounded-xl",
                        isDark 
                          ? "bg-amber-900/20" 
                          : isMobilePopup 
                            ? "bg-amber-900/30 border border-amber-800/40" 
                            : "bg-amber-100 border border-amber-200 shadow-sm"
                      )}>
                        <p className={cn(
                          "text-xs flex items-start gap-1.5",
                          isDark ? "text-amber-400" : isMobilePopup ? "text-amber-300" : "text-amber-800 font-medium"
                        )}>
                          <i className="fas fa-info-circle mt-0.5 text-amber-500"></i>
                          <span>Start the voice session and introduce yourself to the patient</span>
                        </p>
                      </div>
                    )}
                    {hasMessages && !isVoiceConnected && recentMessages.length > 0 && (
                      <div className={cn(
                        "mt-4 p-3 rounded-xl",
                        isDark 
                          ? "bg-blue-900/20" 
                          : isMobilePopup 
                            ? "bg-blue-800/30 border border-blue-700/50" 
                            : "bg-blue-100 border border-blue-200 shadow-sm"
                      )}>
                        <p className={cn(
                          "text-xs flex items-start gap-1.5",
                          isDark ? "text-blue-400" : isMobilePopup ? "text-blue-300" : "text-blue-800 font-medium"
                        )}>
                          <i className="fas fa-history mt-0.5 text-blue-500"></i>
                          <span>You have {recentMessages.length} previous message{recentMessages.length !== 1 ? 's' : ''}. Resume to continue.</span>
                        </p>
                      </div>
                    )}
                    {pendingHints.length > 0 && (
                      <div className={cn(
                        "mt-4 p-3 rounded-xl",
                        isDark ? "bg-blue-900/20" : isMobilePopup ? "bg-blue-800/30" : "bg-blue-50"
                      )}>
                        <p className={cn(
                          "text-xs",
                          isDark ? "text-blue-400" : isMobilePopup ? "text-blue-300" : "text-blue-700"
                        )}>
                          <i className="fas fa-queue mr-1"></i>
                          {pendingHints.length} hint{pendingHints.length !== 1 ? 's' : ''} queued
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className={cn("p-3 rounded-xl border-l-4 shadow-lg mb-3", getHintStyles(currentHint.type))}>
                      <div className="flex items-start gap-2">
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                          currentHint.type === 'success' ? "bg-emerald-500/20" :
                          currentHint.type === 'warning' ? "bg-amber-500/20" :
                          currentHint.type === 'error' ? "bg-red-500/20" : "bg-blue-500/20"
                        )}>
                          <i className={cn(`fas ${getIcon(currentHint.type)} text-sm`,
                            currentHint.type === 'success' ? "text-emerald-500" :
                            currentHint.type === 'warning' ? "text-amber-500" :
                            currentHint.type === 'error' ? "text-red-500" : "text-blue-500"
                          )}></i>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                              currentHint.type === 'success' 
                                ? `bg-emerald-500/20 ${isDark || isMobilePopup ? "text-emerald-300" : "text-emerald-700"}` :
                              currentHint.type === 'warning' 
                                ? `bg-amber-500/20 ${isDark || isMobilePopup ? "text-amber-300" : "text-amber-700"}` :
                              currentHint.type === 'error' 
                                ? `bg-red-500/20 ${isDark || isMobilePopup ? "text-red-300" : "text-red-700"}` :
                              `bg-blue-500/20 ${isDark || isMobilePopup ? "text-blue-300" : "text-blue-700"}`
                            )}>
                              {currentHint.category}
                            </span>
                            {currentHint.type === 'error' && (
                              <span className="text-[10px] text-red-500">⚠️ Required step</span>
                            )}
                          </div>
                          <p className="text-sm font-medium leading-relaxed">{currentHint.message}</p>
                          {currentHint.suggestion && (
                            <p className={cn("text-xs mt-2 pt-2 border-t", 
                              isDark ? "text-emerald-400 border-gray-700" : isMobilePopup ? "text-emerald-300 border-blue-800/50" : "text-emerald-600 border-gray-200"
                            )}>
                              <i className="fas fa-comment-dots mr-1"></i>
                              <span className="italic">"{currentHint.suggestion}"</span>
                            </p>
                          )}
                          {currentHint.rationale && (
                            <p className={cn("text-[10px] mt-1", 
                              isDark ? "text-gray-400" : isMobilePopup ? "text-blue-300" : "text-gray-500"
                            )}>
                              <i className="fas fa-info-circle mr-1"></i>
                              {currentHint.rationale}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {feedback && (
                      <div className={cn("p-2 rounded-lg mb-3 text-xs animate-slide-in",
                        feedback.type === 'success' 
                          ? (isDark ? "bg-emerald-900/50 text-emerald-300" : isMobilePopup ? "bg-emerald-900/40 text-emerald-300" : "bg-emerald-100 text-emerald-800") :
                          (isDark ? "bg-blue-900/50 text-blue-300" : isMobilePopup ? "bg-blue-800/40 text-blue-200" : "bg-blue-100 text-blue-800")
                      )}>
                        <div className="flex items-center gap-2">
                          <i className={cn("fas text-xs", feedback.type === 'success' ? "fa-check-circle" : "fa-info-circle")}></i>
                          <span>{feedback.message}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={nextHint}
                        className="flex-1 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg text-sm font-medium hover:from-emerald-600 hover:to-green-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-md"
                      >
                        <i className="fas fa-arrow-right text-xs"></i>
                        Next Hint
                      </button>
                      <button
                        onClick={skipHint}
                        className={cn("py-2 px-4 border rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1",
                          isDark 
                            ? "border-gray-600 text-gray-300 hover:bg-gray-700" 
                            : isMobilePopup 
                              ? "border-blue-700 text-blue-200 hover:bg-blue-800/50" 
                              : "border-gray-300 text-gray-700 hover:bg-gray-100"
                        )}
                      >
                        <i className="fas fa-forward text-xs"></i>
                        Skip
                      </button>
                    </div>

                    {pendingHints.length > 0 && (
                      <div className="mt-3 pt-2 border-t" style={{ borderColor: isDark ? '#374151' : isMobilePopup ? '#1e40af' : '#e5e7eb' }}>
                        <p className={cn("text-[10px] mb-1 flex items-center gap-1", 
                          isDark ? "text-gray-400" : isMobilePopup ? "text-blue-300" : "text-gray-500"
                        )}>
                          <i className="fas fa-queue text-xs"></i>
                          Queue: {pendingHints.length} more hint{pendingHints.length !== 1 ? 's' : ''} available
                        </p>
                      </div>
                    )}

                    <div className="mt-3 pt-2 border-t text-center" style={{ borderColor: isDark ? '#374151' : isMobilePopup ? '#1e40af' : '#e5e7eb' }}>
                      <p className={cn("text-[10px]", 
                        isDark ? "text-gray-400" : isMobilePopup ? "text-blue-300" : "text-gray-400"
                      )}>
                        <i className="fas fa-microphone-alt mr-1"></i>
                        Keep speaking - new hints appear automatically
                      </p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="p-4">
                <h4 className={cn("text-xs font-semibold mb-3 flex items-center gap-2", 
                  isDark ? "text-gray-300" : isMobilePopup ? "text-blue-100" : "text-gray-700"
                )}>
                  <i className="fas fa-clipboard-list text-emerald-500"></i>
                  OSCE Checklist
                </h4>
                <div className="space-y-2">
                  {milestoneList.map((milestone) => {
                    const isComplete = milestones?.[milestone.key];
                    return (
                      <div key={milestone.key} className={cn("flex items-center gap-2 p-2 rounded-xl transition-all duration-200",
                        isComplete ? (isDark ? "bg-emerald-900/20 border border-emerald-800" : "bg-emerald-50 border border-emerald-200") :
                        (isDark ? "bg-gray-700/30 border border-gray-700" : isMobilePopup ? "bg-blue-800/30 border border-blue-700/50" : "bg-gray-100 border border-gray-200")
                      )}>
                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                          isComplete ? "bg-emerald-500 text-white" : (isDark ? "bg-gray-600 text-gray-400" : isMobilePopup ? "bg-blue-800 text-blue-300" : "bg-gray-300 text-gray-500")
                        )}>
                          {isComplete ? <i className="fas fa-check text-white text-[10px]"></i> : <i className={cn("fas", milestone.icon, "text-[10px]")}></i>}
                        </div>
                        <div className="flex-1">
                          <span className={cn("text-xs font-medium", 
                            isComplete ? (isDark ? "text-emerald-300" : "text-emerald-800") : (isDark ? "text-gray-300" : isMobilePopup ? "text-blue-200" : "text-gray-700")
                          )}>
                            {milestone.label}
                          </span>
                        </div>
                        {milestone.required && !isComplete && <i className="fas fa-exclamation-circle text-red-400 text-xs"></i>}
                      </div>
                    );
                  })}
                </div>
                <div className={cn(
                  "mt-4 p-3 rounded-xl border",
                  isDark 
                    ? "bg-emerald-900/20 border-emerald-800" 
                    : isMobilePopup 
                      ? "bg-emerald-900/20 border-emerald-800/50" 
                      : "bg-emerald-50 border-emerald-200"
                )}>
                  <p className={cn(
                    "text-xs flex items-start gap-2",
                    isDark ? "text-emerald-400" : isMobilePopup ? "text-emerald-300" : "text-emerald-700"
                  )}>
                    <i className="fas fa-microphone-alt text-emerald-500 mt-0.5"></i>
                    <span>The hint system analyzes your conversation in real-time and provides hints for the OSCE sequence (Introduction → Consent → Patient Info → Chief Complaint → History Taking).</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-in { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes bounce { 0% { transform: scale(0.8); opacity: 0; } 60% { transform: scale(1.2); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes hint-beep {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes hint-beep-ring {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(2); opacity: 0; }
        }
        .animate-slide-in { animation: slide-in 0.2s ease-out; }
        .animate-slide-up { animation: slide-up 0.2s ease-out; }
        .animate-hint-beep {
          animation: hint-beep 0.5s ease-in-out 10;
        }
        .animate-hint-beep-ring {
          animation: hint-beep-ring 0.5s ease-out 10;
        }
        .animate-pulse { animation: pulse 1s ease-in-out infinite; }
        .animate-ping { animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; }
        .animate-bounce { animation: bounce 0.5s ease-out; }
        @keyframes ping { 0% { transform: scale(0.8); opacity: 1; } 75%, 100% { transform: scale(1.5); opacity: 0; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </>
  );
}