// app/components/VoiceClient.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { VoiceProvider, useVoice, VoiceReadyState } from '@humeai/voice-react';
import type { Patient } from '@/lib/db/schema';
import { useRouter } from 'next/navigation';
import { DBMessage } from '@/lib/db/schema';
import { toast } from 'sonner'; // Add this import
import { getRandomMedicalQuote } from '@/lib/utils';
import { pickHumeVoice } from '@/utils/voicePreset';

interface VoiceClientProps {
  accessToken: string;
  patient: Patient | null;
  chatId: string;
  type: string;
  examSteps: { name: string; videoUrl: string }[];
  totalStations?: number;
  currentStation?: number;
}

const ModalSkeleton = () => (
  <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white/95 rounded-2xl p-8 flex flex-col items-center min-w-[400px] max-w-md border border-white/50 shadow-2xl">
      <div className="relative mb-6">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
        <div className="absolute inset-0 rounded-full h-16 w-16 border-t-2 border-blue-300 animate-pulse"></div>
      </div>
      <p className="text-gray-800 font-bold text-xl mb-3 text-center">Loading...</p>
      <div className="flex items-center text-gray-600 mb-6">
        <span className="animate-pulse">Loading</span>
        <span className="animate-pulse delay-100">.</span>
        <span className="animate-pulse delay-200">.</span>
        <span className="animate-pulse delay-300">.</span>
      </div>
      <div className="w-full bg-gray-200/80 rounded-full h-3 mt-2 overflow-hidden">
        <div 
          className="h-3 rounded-full transition-all duration-1000 ease-out"
          style={{
            width: '100%',
            background: 'linear-gradient(90deg, #3b82f6, #60a5fa, #3b82f6)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s infinite'
          }}
        ></div>
      </div>
    </div>
  </div>
);

export default function VoiceClient({ 
  accessToken, 
  patient, 
  chatId, 
  type, 
  examSteps, 
  totalStations = 1, 
  currentStation = 0 
}: VoiceClientProps) {
  const [stationInfo, setStationInfo] = useState({ current: currentStation, total: totalStations });
  
  console.log('VOICE_CLIENT_PROPS', { 
    type, 
    examStepsLen: examSteps?.length,
    patient: patient?.name,
    chatId 
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const stationFromUrl = urlParams.get('station');
      const totalFromUrl = urlParams.get('total');
      
      if (stationFromUrl && totalFromUrl) {
        setStationInfo({
          current: parseInt(stationFromUrl),
          total: parseInt(totalFromUrl)
        });
      }
    }
  }, []);
  
  const systemPrompt = `${patient?.name}, ${patient?.age}-yr-old ${patient?.gender} from ${patient?.location || 'unknown location'}, presents with: ${patient?.condition}. ${patient?.prompt || ''} Never mention the name "AI" or any name other than ${patient?.name}. Speak only when the student addresses you.`;
  
  const sendMessage = async (chatId: string, role: 'student' | 'patient', content: string) => {
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ chatId, role, content }),
      });
      if (!res.ok) throw new Error(res.statusText);
    } catch (err) {
      console.error('Error saving message:', err);
    }
  };

  return (
    <VoiceProvider>
      <ChatInterface
        accessToken={accessToken}
        patient={patient}
        chatId={chatId}
        systemPrompt={systemPrompt}
        sendMessage={sendMessage}
        type={type}
        examSteps={examSteps}
        stationInfo={stationInfo}
      />
    </VoiceProvider>
  );
}

interface ChatInterfaceProps {
  accessToken: string;
  patient: Patient | null;
  chatId: string;
  systemPrompt: string;
  sendMessage: (chatId: string, role: 'student' | 'patient', content: string) => void;
  type: string;
  examSteps: { name: string; videoUrl: string }[];
  stationInfo: { current: number; total: number };
}

function ChatInterface({ 
  accessToken, 
  patient, 
  chatId, 
  systemPrompt, 
  sendMessage, 
  type, 
  examSteps,
  stationInfo
}: ChatInterfaceProps) {
  const { connect, disconnect, readyState, messages, sendAssistantInput, sendSessionSettings, pauseAssistant, resumeAssistant, mute, unmute, isPaused  } = useVoice();
  const [isConnected, setIsConnected] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const router = useRouter();
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [sessionDuration, setSessionDuration] = useState<number | null>(null);
  const [chatStatus, setChatStatus] = useState<'incomplete' | 'completed'>('incomplete');
  const [showLoadingPopup, setShowLoadingPopup] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepMessages, setStepMessages] = useState<DBMessage[][]>([[]]);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [overallFeedback, setOverallFeedback] = useState<any>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState('');
  const [showOverallModal, setShowOverallModal] = useState(false);
  const [showSwitchingModal, setShowSwitchingModal] = useState(false);
  const [switchingMessage, setSwitchingMessage] = useState('');
  const [showEndingModal, setShowEndingModal] = useState(false);
  const [stationMeta, setStationMeta] = useState<{current: number; total: number}>({current: 1, total: 1});
  const [showReturnLoader, setShowReturnLoader] = useState(false);
  const [currentMedicalQuote, setCurrentMedicalQuote] = useState<{text: string, author: string} | null>(null);

  // Token monitoring states
  const [remainingTokens, setRemainingTokens] = useState<number>(0);
  const [tokenWarningShown, setTokenWarningShown] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  
  // Performance optimization refs
  const connectionRef = useRef(false);
  const analysisInProgressRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const buildMessage = (role: 'student' | 'patient', content = ''): DBMessage => ({
    id: crypto.randomUUID(),
    chatId,
    role,
    content,
    attachments: null,
    createdAt: new Date(),
  });

  /* ---------- Token Monitoring Functions ---------- */
  // Function to check token balance in real-time
  const checkTokenBalance = async () => {
    try {
      const response = await fetch('/api/tokens/balance');
      if (response.ok) {
        const data = await response.json();
        setRemainingTokens(data.balance);
        
        // Show warnings based on remaining tokens
        if (data.balance < 10 && !tokenWarningShown) {
          toast.warning(`Low tokens! Only ${data.balance} tokens remaining.`, {
            duration: 5000,
            icon: '⚠️'
          });
          setTokenWarningShown(true);
        }
        
        if (data.balance <= 0) {
          toast.error('No tokens remaining! Session will end soon.', {
            duration: 8000,
            icon: '🔴'
          });
          // Force end session when tokens are completely exhausted
          setTimeout(() => {
            endSessionDueToNoTokens();
          }, 30000); // Give 30 seconds grace period
        }
        
        return data.balance;
      }
    } catch (error) {
      console.error('Error checking token balance:', error);
    }
  };

  // Function to end session due to no tokens
  const endSessionDueToNoTokens = async () => {
    try {
      // Calculate actual duration used so far
      const actualDurationInSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
      
      const response = await fetch(`/api/chat/${chatId}/end-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          actualDurationInSeconds,
          endedEarly: true,
          reason: 'insufficient_tokens'
        }),
      });

      if (response.ok) {
        toast.error('Session ended due to insufficient tokens. Please purchase more tokens to continue.');
        // Navigate back to dashboard or show purchase modal
        router.push('/dashboard/tokens');
      }
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  // In your VoiceClient, add this useEffect to debug
useEffect(() => {
  console.log('=== VOICE CLIENT MOUNT DEBUG ===');
  console.log('Props received:', { type, examStepsLength: examSteps?.length, patient: patient?.name });
  console.log('Will render physical exam layout?', type === 'physical_exam' && examSteps?.length > 0);
}, []);

  // Set up periodic token balance checks (every 30 seconds)
  useEffect(() => {
    if (!chatId) return;
    
    const tokenCheckInterval = setInterval(() => {
      checkTokenBalance();
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(tokenCheckInterval);
  }, [chatId]);

  // Also check balance when session starts
  useEffect(() => {
    if (chatId) {
      checkTokenBalance();
    }
  }, [chatId]);

  /* ---------- Optimized effects ---------- */
  useEffect(() => {
    const loadChatData = async () => {
      try {
        const chatRes = await fetch(`/api/chats/${chatId}`, { credentials: 'include' });
        if (!chatRes.ok) throw new Error('Chat not found');
        const chatData = await chatRes.json();
        setChatStatus(chatData.status);
        
        if (chatData.status === 'completed') {
          setTimeLeft(0);
          setSessionDuration(null);
          return;
        }
        
        const durationMinutes = Number(localStorage.getItem(`duration_${chatId}`)) || 5;
        const saved = localStorage.getItem(`chat_${chatId}`);
        
        if (saved) {
          const { remainingTime } = JSON.parse(saved);
          setTimeLeft(remainingTime);
          setSessionDuration(durationMinutes);
          setIsConnected(false);
          return;
        }
        
        setTimeLeft(durationMinutes * 60);
        setSessionDuration(durationMinutes);
        setIsConnected(false);
      } catch {
        setTimeLeft(5 * 60);
        setSessionDuration(5);
        setIsConnected(false);
      }
    };
    
    loadChatData();
  }, [chatId]);

  useEffect(() => {
    if (patient) {
      const voicePreset = pickHumeVoice(patient);
      console.log('Voice Client - Patient:', {
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        selectedVoice: voicePreset
      });
    }
  }, [patient]);

  // Optimized timer effect
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (isConnected && !isPaused && timeLeft !== null && timeLeft > 0 && !showFeedbackModal) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev && prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            handleTerminate();
            return 0;
          }
          return (prev || 0) - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isConnected, isPaused, timeLeft, showFeedbackModal, chatId]);

  // Optimized message handling
  useEffect(() => {
    if (!messages.length) return;
    
    const last = messages[messages.length - 1];
    if (last.type === 'assistant_message' && last.message?.content) {
      sendMessage(chatId, 'patient', last.message.content);
      if (type === 'physical_exam') {
        setStepMessages((prev) => {
          const next = [...prev];
          if (!next[currentStepIndex]) {
            next[currentStepIndex] = [];
          }
          next[currentStepIndex] = [...next[currentStepIndex], buildMessage('patient', last.message.content)];
          return next;
        });
      }
    } else if (last.type === 'user_message' && last.message?.content) {
      sendMessage(chatId, 'student', last.message.content);
      if (type === 'physical_exam') {
        setStepMessages((prev) => {
          const next = [...prev];
          if (!next[currentStepIndex]) {
            next[currentStepIndex] = [];
          }
          next[currentStepIndex] = [...next[currentStepIndex], buildMessage('student', last.message.content)];
          return next;
        });
      }
    }
  }, [messages, chatId, sendMessage, type, currentStepIndex]);

  const firstGreetRef = useRef(false);

  /* ── patient greets first (audible + gendered voice) ── */
  useEffect(() => {
    if (
      readyState === VoiceReadyState.OPEN &&
      !firstGreetRef.current &&
      patient
    ) {
      firstGreetRef.current = true;

      // 1. send voice directive as plain JSON (no TS complaints)
      sendSessionSettings({
        id: crypto.randomUUID(),          // required base field
        name: 'GenderVoice',
        tts: {                            // <-- custom payload
          service: 'hume_ai',
          voice: getVoiceId(patient.gender ?? undefined),
        },
      } as any); // <-- single `as any` to silence excess-key check

      // 2. persist to DB
      sendMessage(chatId, 'patient', "I'm ready when you are.");

      // 3. make the patient SAY it
      sendAssistantInput("I'm ready when you are.");
    }
  }, [readyState, patient, chatId, sendSessionSettings, sendAssistantInput]);

  // AUTO-START: fire once when everything is ready
  useEffect(() => {
    if (
      !connectionRef.current &&        // not already connecting/connected
      readyState !== VoiceReadyState.OPEN && // voice not already open
      accessToken &&                   // we have the token
      patient &&                       // patient data loaded
      timeLeft !== null &&             // timer initialized
      !isConnected                     // not connected yet
    ) {
      handleStart();                   // fire once
    }
  }, [accessToken, patient, timeLeft, readyState, isConnected]);

  const getVoiceId = (gender?: string) =>
    (gender === 'female' ? 'AIME' : 'ITO');

  useEffect(() => {
    if (type === 'physical_exam' && examSteps.length > 0) {
      console.log('Initializing step messages for', examSteps.length, 'steps');
      const initialStepMessages = examSteps.map(() => []);
      setStepMessages(initialStepMessages);
    }
  }, [type, examSteps]);

  // Debug effect to track step changes
  useEffect(() => {
    console.log('Current step changed:', {
      currentStepIndex,
      stepName: examSteps[currentStepIndex]?.name,
      totalSteps: examSteps.length,
      stepMessagesLength: stepMessages.length
    });
  }, [currentStepIndex, examSteps]);

  // Debug effect to track step changes and exam steps
  useEffect(() => {
    console.log('Step tracking:', {
      currentStepIndex,
      currentStepName: examSteps[currentStepIndex]?.name,
      totalSteps: examSteps.length,
      stepMessagesLength: stepMessages.length,
      examSteps: examSteps.map((s, i) => `${i}: ${s.name}`)
    });
  }, [currentStepIndex, examSteps, stepMessages]);

  /* ---------- Optimized handlers ---------- */
  const handleStart = useCallback(async () => {
  if (connectionRef.current) return;
  connectionRef.current = true;
  setShowLoadingPopup(true);
  setLoadingMessage(`Starting Chat with ${patient?.name || 'Patient'}`);
  setCurrentMedicalQuote(getRandomMedicalQuote());
  
  // FIXED: Set session start time HERE, not elsewhere
  setSessionStartTime(Date.now());
  console.log('Session start time set to:', Date.now());
  
  const fastTeardown = setTimeout(() => {
    setShowLoadingPopup(false);
  }, 0);
  
  try {
    await disconnect(); 

    const voiceId = pickHumeVoice(patient);

    const res = await fetch('/api/chat/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voiceId, systemPrompt }),
    });
    
    if (!res.ok) {
      alert('Failed to obtain voice token');
      setShowLoadingPopup(false);
      connectionRef.current = false;
      return;
    }
    
    const { accessToken: newToken } = await res.json();

    connect({
      auth: { type: 'accessToken', value: newToken },
      sessionSettings: { type: 'session_settings', systemPrompt },
    })
      .then(() => {
        setIsConnected(true);
        clearTimeout(fastTeardown); 
        if (timeLeft === null && sessionDuration !== null) setTimeLeft(sessionDuration * 60);
        setShowLoadingPopup(false);
        connectionRef.current = false;
        resumeAssistant();   // restart TTS
        unmute();
        if (type === 'physical_exam' && stepMessages[currentStepIndex]?.length >= 2) {
          const lastTwo = stepMessages[currentStepIndex].slice(-2);
          lastTwo.forEach(m => sendAssistantInput(m.content));
        }
      })
      .catch((err) => {
        console.error('Failed to connect:', err);
        setShowLoadingPopup(false);
        connectionRef.current = false;
        setSessionStartTime(0); // Reset on error

        if (err.message?.includes('timeout') || err.code === 'UND_ERR_CONNECT_TIMEOUT') {
          alert('Connection to voice service timed out. This might be a temporary issue with the service. Please try again in a few moments.');
        } else if (err.message?.includes('auth') || err.status === 401) {
          alert('Authentication failed. Your session may have expired. Please try logging out and logging back in.');
        } else if (err.message?.includes('network')) {
          alert('Network error. Please check your internet connection and try again.');
        } else {
          alert(`Failed to connect to voice service: ${err.message || 'Unknown error'}. Please try again.`);
        }
      });
  } catch (error) {
    console.error('Error in handleStart:', error);
    setShowLoadingPopup(false);
    connectionRef.current = false;
    setSessionStartTime(0); // Reset on error
  }
}, [connect, disconnect, patient, systemPrompt, timeLeft, sessionDuration]);

  const handlePause = useCallback(() => {
    pauseAssistant(); // stop TTS output
    mute();           // stop mic input
    setIsConnected(false); 
    if (timerRef.current) clearInterval(timerRef.current); 
    if (timeLeft && timeLeft > 0) {
      localStorage.setItem(`chat_${chatId}`, JSON.stringify({ remainingTime: timeLeft }));
    }
  }, [pauseAssistant, mute, timeLeft, chatId]);

  const handleTerminate = useCallback(async () => {
  if (analysisInProgressRef.current) return;
  analysisInProgressRef.current = true;

  console.log('=== TERMINATE DEBUG START ===');
  console.log('Chat ID:', chatId);
  console.log('Current Step Index:', currentStepIndex);
  console.log('Exam Steps Length:', examSteps.length);
  console.log('Session Type:', type);
  console.log('Session Start Time:', sessionStartTime);
  console.log('Current Time:', Date.now());
  
  // Calculate actual duration - FIXED to get seconds
  let actualDurationInSeconds = 0;
  if (sessionStartTime > 0) {
    const elapsedMillis = Date.now() - sessionStartTime;
    actualDurationInSeconds = Math.max(1, Math.floor(elapsedMillis / 1000)); // Convert to seconds, min 1
    console.log('Elapsed milliseconds:', elapsedMillis);
    console.log('Calculated duration seconds:', actualDurationInSeconds);
    console.log('Expected token deduction:', (actualDurationInSeconds * 0.05).toFixed(2));
  } else {
    // Fallback: use timeLeft to estimate
    const defaultDurationMinutes = sessionDuration || 5; // minutes
    const defaultDurationSeconds = defaultDurationMinutes * 60;
    actualDurationInSeconds = Math.max(1, defaultDurationSeconds - (timeLeft || 0));
    console.log('Using fallback duration seconds:', actualDurationInSeconds);
  }
  
  disconnect();
  setIsConnected(false);
  localStorage.removeItem(`chat_${chatId}`);
  
  try {
    // FIXED: First update chat status
    await fetch(`/api/chats/${chatId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });
    
    // FIXED: Then deduct tokens based on actual usage
    console.log('Calling token deduction with duration:', actualDurationInSeconds);
    const endSessionRes = await fetch(`/api/chat/${chatId}/end-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        actualDurationInSeconds,
        endedEarly: timeLeft !== null && timeLeft > 0, // Ended early if time still left
        reason: timeLeft !== null && timeLeft > 0 ? 'user_terminated' : 'normal_completion'
      }),
    });

    if (!endSessionRes.ok) {
      const errorText = await endSessionRes.text();
      console.error('Token deduction failed:', errorText);
      throw new Error('Token deduction failed');
    }

    const endSessionData = await endSessionRes.json();
    console.log('Token deduction result:', endSessionData);
    
    // Get chat data for session info
    const chatRes = await fetch(`/api/chats/${chatId}`);
    const chatData = await chatRes.json();
    console.log('Chat Data:', chatData);
    
    if (chatData.sessionId) {
      const sessionRes = await fetch(`/api/sessions/${chatData.sessionId}`);
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        console.log('Session Data:', sessionData);
        
        let isLastStation = false;
        
        if (type === 'physical_exam') {
          const actualStationIndex = chatData.stationIndex ?? 0;
          isLastStation = actualStationIndex + 1 >= sessionData.numStations;
          
          console.log('Physical Exam Manual Termination:', {
            actualStationIndex,
            totalStations: sessionData.numStations,
            isLastStation,
            currentStep: currentStepIndex,
            totalSteps: examSteps.length
          });
        } else {
          const actualStationIndex = chatData.stationIndex ?? 0;
          isLastStation = actualStationIndex + 1 >= sessionData.numStations;
          
          console.log('Clerking/Counselling Termination:', {
            actualStationIndex,
            totalStations: sessionData.numStations,
            isLastStation
          });
        }
        
        if (isLastStation) {
          console.log('Last station completed/terminated, going to history');
          setCurrentMedicalQuote(getRandomMedicalQuote());
          setShowEndingModal(true);
          setTimeout(() => {
            router.push('/dashboard/chat-history');
          }, 3000);
          analysisInProgressRef.current = false;
          return;
        }
        
        console.log('Not last station, showing switching modal');
        setCurrentMedicalQuote(getRandomMedicalQuote());
        
        const actualStationIndex = chatData.stationIndex ?? 0;
        setSwitchingMessage(`Switching to Station ${actualStationIndex + 2}`);
        
        setShowSwitchingModal(true);
        setTimeout(() => {
          router.push(`/dashboard?section=stations-info&sessionId=${chatData.sessionId}`);
        }, 2000);
        analysisInProgressRef.current = false;
        return;
      }
    }
    
    console.log('No session found, going to history');
    setCurrentMedicalQuote(getRandomMedicalQuote());
    setShowEndingModal(true);
    setTimeout(() => {
      router.push('/dashboard/chat-history');
    }, 3000);
    analysisInProgressRef.current = false;
    
  } catch (error) {
    console.error('Error in handleTerminate:', error);
    // Still show ending modal on error
    setCurrentMedicalQuote(getRandomMedicalQuote());
    setShowEndingModal(true);
    setTimeout(() => {
      router.push('/dashboard/chat-history');
    }, 3000);
    analysisInProgressRef.current = false;
  }
}, [disconnect, chatId, currentStepIndex, examSteps.length, type, router, sessionStartTime, timeLeft, sessionDuration]);

  const confirmTerminate = useCallback(() => setShowEndConfirm(true), []);
  
  const handleReturnToDashboard = useCallback(() => {
    setShowReturnLoader(true);
    router.push('/dashboard');
  }, [router]);

  const handleEndStep = useCallback(async () => {
    if (analysisInProgressRef.current) return;
    analysisInProgressRef.current = true;

    console.log('handleEndStep called for step:', currentStepIndex, examSteps[currentStepIndex]?.name);
    
    setIsAnalyzing(true);
    setShowFeedbackModal(true);
    disconnect();
    setIsConnected(false);
    
    const stepTranscript = stepMessages[currentStepIndex]
      ?.map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n') || '';
    const stepName = examSteps[currentStepIndex].name;

    console.log('Step transcript length:', stepTranscript.length);

    try {
      const res = await fetch('/api/analyze-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: stepTranscript, stepName }),
      });
      
      if (!res.ok) throw new Error('analyze-step failed');
      const feedback = await res.json();
      
      const stepFeedbackData = {
        stepName: examSteps[currentStepIndex].name,
        score: feedback.score,
        feedback: typeof feedback === 'string' ? feedback : feedback.overall_assessment,
        strengths: Array.isArray(feedback.strengths) ? feedback.strengths : [],
        improvements: Array.isArray(feedback.improvements) ? feedback.improvements : [],
        suggestions: Array.isArray(feedback.suggestions) ? feedback.suggestions : [],
        evidence: feedback.evidence || 'No specific evidence'
      };

      setCurrentFeedback(feedback);
      setCurrentVideoUrl(examSteps[currentStepIndex].videoUrl);
      console.log('Step analysis completed:', feedback);
      
      await fetch('/api/step-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chatId, 
          stepIndex: currentStepIndex, 
          feedback: stepFeedbackData
        }),
      });
    } catch (error) {
      console.error('Error analyzing step:', error);
    } finally {
      setIsAnalyzing(false);
      analysisInProgressRef.current = false;
    }
  }, [currentStepIndex, examSteps, stepMessages, chatId, disconnect]);

  const handleNextStep = useCallback(async () => {
    console.log('handleNextStep called', {
      currentStepIndex,
      examStepsLength: examSteps.length,
      isConnected
    });

    setShowFeedbackModal(false);
    setShowVideoModal(false);
    setCurrentFeedback(null);

    await new Promise(resolve => setTimeout(resolve, 0));

    if (currentStepIndex < examSteps.length - 1) {
      const nextStepIndex = currentStepIndex + 1;
      console.log('Moving to next step:', nextStepIndex, examSteps[nextStepIndex]?.name);
      
      setCurrentStepIndex(nextStepIndex);
      
      setStepMessages(prev => {
        const newSteps = [...prev];
        if (!newSteps[nextStepIndex]) {
          newSteps[nextStepIndex] = [];
        }
        return newSteps;
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      const voicePreset = pickHumeVoice(patient);

      connect({
        auth: { type: 'accessToken', value: accessToken },
        sessionSettings: { 
          type: 'session_settings', 
          systemPrompt: systemPrompt,
        },
        voice: voicePreset
      } as any)
        .then(() => {
          console.log('Reconnected for step:', nextStepIndex);
          setIsConnected(true);
        })
        .catch((err) => {
          console.error('Failed to reconnect for next step:', err);
        });
    } else {
      console.log('All steps completed, analyzing overall...');
      analyzeOverall();
    }
  }, [currentStepIndex, examSteps, patient, accessToken, systemPrompt, connect]);

  const handleSkipVideo = useCallback(() => {
    setShowVideoModal(false);
    handleNextStep();
  }, [handleNextStep]);

  const analyzeOverall = useCallback(async () => {
    setIsAnalyzing(true);
    const fullTranscript = stepMessages
      .flat()
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n');

    try {
      const res = await fetch('/api/analyze-overall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: fullTranscript }),
      });
      
      if (!res.ok) throw new Error('analyze-overall failed');
      const feedback = await res.json();
      
      setOverallFeedback(feedback);
      setShowOverallModal(true);
      
      await fetch(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latestScore: feedback.percentage,
          latestGrade: `${feedback.rating}/5`,
          latestFeedback: JSON.stringify(feedback),
        }),
      });
    } catch (error) {
      console.error('Error analyzing overall:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [stepMessages, chatId]);

  /* ---------- UI ---------- */
  /* ---------------  PHYSICAL-EXAM LAYOUT --------------- */
  if (type === 'physical_exam' && examSteps?.length) {
    return (
      <div 
        className="min-h-screen bg-gradient-to-br from-blue-50/90 to-purple-100/90 bg-cover bg-center bg-fixed relative"
        style={{
          backgroundImage: 'url(/voiceclient.jpg)',
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-white/20 backdrop-blur-sm"></div>
        
        <div className="relative z-10 flex items-center justify-center p-4 min-h-screen">
          <div className="w-full max-w-4xl bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border border-white/50">
            {/* HEADER BAR */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold flex items-center">
                  <i className="fas fa-stethoscope mr-3"></i>
                  Physical Examination
                </h1>
                <p className="text-sm opacity-90 mt-1">
                  Step {currentStepIndex + 1} of {examSteps.length} • Station {stationInfo.current + 1} of {stationInfo.total}
                </p>
                {/* Token Balance Display */}
                <div className="mt-2 text-xs opacity-80">
                  <i className="fas fa-coins mr-1"></i>
                  Tokens: {remainingTokens}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">Patient: <span className="font-bold">{patient?.name}</span></p>
                <p className="text-xs opacity-90">{patient?.age} yr, {patient?.gender} — {patient?.condition}</p>
                {patient?.location && <p className="text-xs opacity-90">Location: {patient.location}</p>}
              </div>
            </div>

            {/* STEP SELECTOR */}
            <div className="p-6 border-b border-gray-200/50">
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <i className="fas fa-list-ol mr-2 text-indigo-500"></i>
                Current Step
              </label>
              <select 
                value={currentStepIndex} 
                onChange={(e) => {
                  const newIndex = parseInt(e.target.value);
                  if (newIndex !== currentStepIndex && !isConnected) {
                    setCurrentStepIndex(newIndex);
                  }
                }}
                disabled={isConnected}
                className="w-full p-4 border-2 border-gray-200/50 rounded-xl bg-white/80 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all duration-200"
              >
                {examSteps.map((step, index) => (
                  <option key={index} value={index}>
                    {index + 1}. {step.name}
                  </option>
                ))}
              </select>
              
              {/* CONTROL BUTTONS */}
              <div className="mt-6 flex flex-wrap gap-3 justify-center md:justify-start">
                {isConnected ? (
                  <>
                    <button 
                      onClick={handleEndStep} 
                      className="px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
                    >
                      <i className="fas fa-stop mr-2"></i>
                      <span className="hidden sm:inline">End Step</span>
                    </button>
                    <button 
                      onClick={handlePause} 
                      className="px-4 py-3 bg-gradient-to-r from-gray-500 to-slate-600 text-white rounded-xl hover:from-gray-600 hover:to-slate-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
                    >
                      <i className="fas fa-pause mr-2"></i>
                      <span className="hidden sm:inline">Pause</span>
                    </button>
                  </>
                ) : (
                 <button 
  onClick={handleStart} 
  className="px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
>
  <i className="fas fa-play mr-2"></i>
  <span className="hidden sm:inline">
    {isPaused ? 'Resume conversation' : 'Start voice session'}
  </span>
</button>
                )}
                <button 
                  onClick={confirmTerminate} 
                  className="px-4 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:from-red-600 hover:to-rose-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
                >
                  <i className="fas fa-stop-circle mr-2"></i>
                  <span className="hidden sm:inline">End Session</span>
                </button>
                <button 
                  onClick={handleReturnToDashboard}
                  className="px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
                >
                  <i className="fas fa-home mr-2"></i>
                  <span className="hidden sm:inline">Dashboard</span>
                </button>
              </div>
            </div>

            {/* TIMER */}
            {timeLeft !== null && (
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50/50 border-b border-gray-200/50 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700 flex items-center">
                  <i className="fas fa-clock mr-2 text-indigo-500"></i>
                  Time Left
                </span>
                <span className="text-xl font-mono font-bold text-indigo-700 bg-white/80 px-4 py-2 rounded-lg shadow-inner">
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>
            )}

            {/* CHAT WINDOW */}
            <div className="p-6 bg-gradient-to-br from-gray-50/80 to-blue-50/50 max-h-96 overflow-y-auto rounded-b-3xl">
              {messages.length ? (
                messages.map((msg, idx) => {
                  if (msg.type === 'user_message' || msg.type === 'assistant_message') {
                    return (
                      <div key={idx} className={`mb-4 flex ${msg.type === 'user_message' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-4 rounded-2xl shadow-lg ${
                          msg.type === 'user_message' 
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-br-none' 
                            : 'bg-white/90 text-gray-800 border border-gray-200/50 rounded-bl-none'
                        }`}>
                          <p className="text-sm opacity-80 mb-1">
                            {msg.type === 'user_message' ? 'You' : patient?.name || 'Patient'}
                          </p>
                          <p className="text-base leading-relaxed">{msg.message.content}</p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })
              ) : (
                <div className="text-center py-12">
                  <i className="fas fa-comments text-4xl text-gray-300 mb-4"></i>
                  <p className="text-gray-500 text-lg">Press "Start Voice Session" to begin the step.</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* MODALS */}
        {showLoadingPopup && (
          <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white/95 rounded-2xl p-8 flex flex-col items-center min-w-[400px] max-w-md border border-white/50 shadow-2xl">
              <div className="relative mb-6">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
                <div className="absolute inset-0 rounded-full h-16 w-16 border-t-2 border-blue-300 animate-pulse"></div>
              </div>
              
              <p className="text-gray-800 font-bold text-xl mb-3 text-center">{loadingMessage}</p>
              <div className="flex items-center text-gray-600 mb-6">
                <span className="animate-pulse">Loading</span>
                <span className="animate-pulse delay-100">.</span>
                <span className="animate-pulse delay-200">.</span>
                <span className="animate-pulse delay-300">.</span>
              </div>
              
              {currentMedicalQuote && (
                <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-l-4 border-blue-500 p-6 rounded-xl mb-6 w-full">
                  <div className="flex items-start">
                    <i className="fas fa-user-md text-blue-500 mr-4 mt-1 text-xl"></i>
                    <div>
                      <p className="text-base text-gray-700 italic">"{currentMedicalQuote.text}"</p>
                      <p className="text-sm text-gray-600 mt-2 font-medium">— {currentMedicalQuote.author}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="w-full bg-gray-200/80 rounded-full h-3 mt-2 overflow-hidden">
                <div 
                  className="h-3 rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: '100%',
                    background: 'linear-gradient(90deg, #3b82f6, #60a5fa, #3b82f6)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 2s infinite'
                  }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {showSwitchingModal && (
          <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white/95 rounded-2xl p-8 flex flex-col items-center min-w-[400px] max-w-md border border-white/50 shadow-2xl">
              <div className="relative mb-6">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500"></div>
              </div>
              <p className="text-gray-800 font-bold text-xl mb-3 text-center">{switchingMessage}</p>
              
              {currentMedicalQuote && (
                <div className="bg-gradient-to-r from-green-50/80 to-emerald-50/80 border-l-4 border-green-500 p-6 rounded-xl mb-6 w-full">
                  <div className="flex items-start">
                    <i className="fas fa-user-md text-green-500 mr-4 mt-1 text-xl"></i>
                    <div>
                      <p className="text-base text-gray-700 italic">"{currentMedicalQuote.text}"</p>
                      <p className="text-sm text-gray-600 mt-2 font-medium">— {currentMedicalQuote.author}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="w-full bg-gray-200/80 rounded-full h-3 mt-2 overflow-hidden">
                <div 
                  className="h-3 rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: '100%',
                    background: 'linear-gradient(90deg, #10b981, #34d399, #10b981)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 2s infinite'
                  }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {showEndingModal && (
          <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white/95 rounded-2xl p-8 flex flex-col items-center min-w-[400px] max-w-md border border-white/50 shadow-2xl">
              <div className="relative mb-6">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500"></div>
              </div>
              <p className="text-gray-800 font-bold text-xl mb-3 text-center">Ending Session! Please analyze and preview chat in log</p>
              
              {currentMedicalQuote && (
                <div className="bg-gradient-to-r from-purple-50/80 to-pink-50/80 border-l-4 border-purple-500 p-6 rounded-xl mb-6 w-full">
                  <div className="flex items-start">
                    <i className="fas fa-user-md text-purple-500 mr-4 mt-1 text-xl"></i>
                    <div>
                      <p className="text-base text-gray-700 italic">"{currentMedicalQuote.text}"</p>
                      <p className="text-sm text-gray-600 mt-2 font-medium">— {currentMedicalQuote.author}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="w-full bg-gray-200/80 rounded-full h-3 mt-2 overflow-hidden">
                <div 
                  className="h-3 rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: '100%',
                    background: 'linear-gradient(90deg, #8b5cf6, #a78bfa, #8b5cf6)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 2s infinite'
                  }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {showFeedbackModal && currentFeedback && (
          <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white/95 rounded-2xl p-8 max-w-4xl w-full max-h-[80vh] overflow-auto border border-white/50 shadow-2xl">
              <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
                <i className="fas fa-tasks mr-3 text-indigo-500"></i>
                {examSteps[currentStepIndex]?.name} Completed
              </h3>
              
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 p-6 rounded-xl border border-blue-200/50">
                  <h4 className="font-semibold text-lg text-gray-800 mb-2 flex items-center">
                    <i className="fas fa-chart-line mr-2 text-blue-500"></i>
                    Score
                  </h4>
                  <p className="text-3xl font-bold text-blue-600">{currentFeedback.score}/20</p>
                </div>
                
                <div className="bg-gradient-to-r from-green-50/80 to-emerald-50/80 p-6 rounded-xl border border-green-200/50">
                  <h4 className="font-semibold text-lg text-gray-800 mb-2 flex items-center">
                    <i className="fas fa-clipboard-check mr-2 text-green-500"></i>
                    Evidence
                  </h4>
                  <p className="text-gray-700">{currentFeedback.evidence}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-gradient-to-r from-emerald-50/80 to-green-50/80 p-6 rounded-xl border border-emerald-200/50">
                  <h4 className="font-semibold text-lg text-gray-800 mb-4 flex items-center">
                    <i className="fas fa-star mr-2 text-emerald-500"></i>
                    Strengths
                  </h4>
                  <ul className="space-y-2">
                    {currentFeedback.strengths.map((s: any, i:number) => (
                      <li key={i} className="flex items-start text-gray-700">
                        <i className="fas fa-check-circle text-emerald-500 mr-3 mt-1"></i>
                        <span>{typeof s === 'string' ? s : s.evidence || 'No feedback'}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-gradient-to-r from-amber-50/80 to-yellow-50/80 p-6 rounded-xl border border-amber-200/50">
                  <h4 className="font-semibold text-lg text-gray-800 mb-4 flex items-center">
                    <i className="fas fa-exclamation-triangle mr-2 text-amber-500"></i>
                    Improvements
                  </h4>
                  <ul className="space-y-2">
                    {currentFeedback.improvements.map((s: any, i: number) => (
                      <li key={i} className="flex items-start text-gray-700">
                        <i className="fas fa-lightbulb text-amber-500 mr-3 mt-1"></i>
                        <span>{typeof s === 'string' ? s : s.evidence || 'No feedback'}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 p-6 rounded-xl border border-blue-200/50">
                  <h4 className="font-semibold text-lg text-gray-800 mb-4 flex items-center">
                    <i className="fas fa-lightbulb mr-2 text-blue-500"></i>
                    Suggestions
                  </h4>
                  <ul className="space-y-2">
                    {currentFeedback.suggestions.map((s: string, i: number) => (
                      <li key={i} className="flex items-start text-gray-700">
                        <i className="fas fa-arrow-right text-blue-500 mr-3 mt-1"></i>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="flex justify-end mt-8 space-x-4">
                <button 
                  onClick={() => setShowVideoModal(true)} 
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
                >
                  <i className="fas fa-play mr-2"></i>
                  Watch Video
                </button>
                <button 
                  onClick={handleNextStep} 
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
                >
                  <i className="fas fa-arrow-right mr-2"></i>
                  {currentStepIndex < examSteps.length - 1 ? 'Continue to Next Step' : 'Finish Examination'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showVideoModal && (
          <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white/95 rounded-2xl p-8 max-w-4xl w-full border border-white/50 shadow-2xl">
              <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
                <i className="fas fa-video mr-3 text-purple-500"></i>
                Video: {examSteps[currentStepIndex]?.name}
              </h3>
              <video controls src={currentVideoUrl} className="w-full rounded-xl shadow-lg" />
              <div className="flex justify-end mt-6 space-x-4">
                <button 
                  onClick={() => setShowVideoModal(false)} 
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-300 flex items-center font-semibold"
                >
                  <i className="fas fa-times mr-2"></i>
                  Close
                </button>
                <button 
                  onClick={handleSkipVideo} 
                  className="px-6 py-3 bg-gradient-to-r from-gray-500 to-slate-600 text-white rounded-xl hover:from-gray-600 hover:to-slate-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
                >
                  <i className="fas fa-forward mr-2"></i>
                  Skip Video
                </button>
                <button 
                  onClick={handleNextStep} 
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
                >
                  <i className="fas fa-arrow-right mr-2"></i>
                  {currentStepIndex < examSteps.length - 1 ? 'Continue to Next Step' : 'Finish Examination'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showOverallModal && overallFeedback && (
          <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white/95 rounded-2xl p-8 max-w-4xl w-full max-h-[80vh] overflow-auto border border-white/50 shadow-2xl">
              <h3 className="text-2xl font-bold mb-8 text-gray-800 flex items-center">
                <i className="fas fa-trophy mr-3 text-yellow-500"></i>
                Overall Feedback
              </h3>
              
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-yellow-50/80 to-amber-50/80 p-6 rounded-xl border border-yellow-200/50">
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <i className="fas fa-star text-yellow-500 mr-3"></i> Performance Rating
                  </h2>
                  <div className="flex items-center mb-3">
                    {Array.from({ length: 5 }, (_, i) => (
                      <i key={i} className={`${i < overallFeedback.rating ? 'fas fa-star text-yellow-500' : 'far fa-star text-gray-300'} text-2xl mr-1`}></i>
                    ))}
                    <span className="ml-3 text-lg font-bold">({overallFeedback.rating}/5)</span>
                  </div>
                  <div className="text-3xl font-bold text-gray-800">{overallFeedback.percentage}%</div>
                </div>

                <div className="bg-gradient-to-r from-emerald-50/80 to-green-50/80 p-6 rounded-xl border border-emerald-200/50">
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <i className="fas fa-check-circle text-emerald-500 mr-3"></i> Strengths
                  </h2>
                  {overallFeedback.strengths.length > 0 ? (
                    <ul className="space-y-3">
                      {overallFeedback.strengths.map((item: any, i: number) => (
                        <li key={i} className="flex items-start bg-white/50 p-3 rounded-lg">
                          <i className="fas fa-plus-circle text-emerald-400 mr-3 mt-1"></i>
                          <div>
                            <span className="font-semibold text-gray-800">{item.category}</span>
                            <span className="text-gray-600 ml-2">– Score: {item.score} (Reference: {item.evidence})</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-red-600 font-semibold flex items-center">
                      <i className="fas fa-exclamation-circle mr-2"></i>
                      No strengths observed! You need to do better.
                    </p>
                  )}
                </div>

                <div className="bg-gradient-to-r from-amber-50/80 to-orange-50/80 p-6 rounded-xl border border-amber-200/50">
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <i className="fas fa-exclamation-triangle text-amber-500 mr-3"></i> Areas of Improvement
                  </h2>
                  <ul className="space-y-3">
                    {overallFeedback.improvements.map((item: any, i: number) => (
                      <li key={i} className="flex items-start bg-white/50 p-3 rounded-lg">
                        <i className="fas fa-exclamation-circle text-amber-400 mr-3 mt-1"></i>
                        <div>
                          <span className="font-semibold text-gray-800">{item.category}</span>
                          <span className="text-gray-600 ml-2">– Score: {item.score} (Reference: {item.evidence})</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 p-6 rounded-xl border border-blue-200/50">
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <i className="fas fa-lightbulb text-blue-500 mr-3"></i> Suggestions
                  </h2>
                  <ul className="space-y-2">
                    {overallFeedback.suggestions.map((sug: string, i: number) => (
                      <li key={i} className="flex items-start text-gray-700">
                        <i className="fas fa-arrow-right text-blue-400 mr-3 mt-1"></i>
                        <span>{sug}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-gradient-to-r from-purple-50/80 to-pink-50/80 p-6 rounded-xl border border-purple-200/50">
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <i className="fas fa-info-circle text-purple-500 mr-3"></i> Overall Assessment
                  </h2>
                  <p className="text-gray-700 text-lg leading-relaxed">{overallFeedback.overall_assessment}</p>
                </div>
              </div>
              
              <div className="flex justify-end mt-8">
                <button 
                  onClick={() => { setShowOverallModal(false); handleTerminate(); }} 
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
                >
                  <i className="fas fa-home mr-2"></i>
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}

        {showEndConfirm && (
          <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white/95 rounded-2xl p-8 max-w-md w-full border border-white/50 shadow-2xl">
              <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center">
                <i className="fas fa-exclamation-triangle mr-3 text-red-500"></i>
                Confirm End Simulation
              </h3>
              <p className="text-gray-600 mb-6">You cannot resume if you end this session. Continue?</p>
              <div className="flex justify-end space-x-4">
                <button 
                  onClick={() => setShowEndConfirm(false)} 
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-300 flex items-center font-semibold"
                >
                  <i className="fas fa-times mr-2"></i>
                  No
                </button>
                <button 
                  onClick={() => { setShowEndConfirm(false); handleTerminate(); }} 
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:from-red-600 hover:to-rose-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
                >
                  <i className="fas fa-check mr-2"></i>
                  Yes, End Session
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  /* ---------------  END PHYSICAL-EXAM LAYOUT --------------- */

  /* ---------------  DEFAULT (CLERKING / COUNSELLING) LAYOUT --------------- */
  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-fixed relative"
      style={{
        backgroundImage: 'url(/voiceclient.jpg)',
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-white/20 backdrop-blur-sm"></div>
      
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 max-w-2xl w-full mx-auto border border-white/50">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 flex items-center">
            <i className="fas fa-user-md mr-4 text-blue-500"></i>
            Simulation with {patient?.name} - Station {stationInfo.current + 1} of {stationInfo.total}
          </h1>
          
          <p className="text-gray-600 mb-6 bg-blue-50/50 p-3 rounded-lg inline-block">
            <i className="fas fa-hashtag mr-2 text-blue-500"></i>
            Chat ID: {chatId}
          </p>
          
          {/* Token Balance Display */}
          <div className="mb-4 p-3 bg-gradient-to-r from-amber-50/80 to-yellow-50/80 rounded-xl border border-amber-200/50">
            <p className="text-gray-700 font-semibold flex items-center justify-center">
              <i className="fas fa-coins mr-2 text-amber-500"></i>
              Available Tokens: {remainingTokens}
            </p>
          </div>
          
          {patient && (
            <div className="mb-8 p-6 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 rounded-2xl border border-blue-200/50">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <img 
                  src={patient.imageUrl || '/uploads/default-avatar.png'} 
                  alt={patient.name} 
                  className="w-32 h-32 rounded-2xl object-cover border-4 border-white shadow-lg"
                />
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-xl font-bold text-gray-800 mb-2">{patient.name}</h2>
                  <div className="space-y-2 text-gray-700">
                    <p className="flex items-center justify-center md:justify-start">
                      <i className="fas fa-user mr-3 text-blue-500 w-5"></i>
                      Age: {patient.age}, Gender: {patient.gender}
                    </p>
                    {patient.location && (
                      <p className="flex items-center justify-center md:justify-start">
                        <i className="fas fa-map-marker-alt mr-3 text-green-500 w-5"></i>
                        Location: {patient.location}
                      </p>
                    )}
                    <p className="flex items-center justify-center md:justify-start">
                      <i className="fas fa-heartbeat mr-3 text-red-500 w-5"></i>
                      Condition: {patient.condition}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {timeLeft !== null && (
            <div className="mb-8 p-4 bg-gradient-to-r from-amber-50/80 to-yellow-50/80 rounded-xl border border-amber-200/50">
              <p className="text-gray-700 font-semibold flex items-center justify-center">
                <i className="fas fa-clock mr-3 text-amber-500"></i>
                Time Left: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </p>
            </div>
          )}

          <div className="mb-8">
  {chatStatus === 'completed' || timeLeft === 0 ? null : (
    <>
      {readyState === VoiceReadyState.OPEN ? (
        <div className="flex flex-wrap gap-4 justify-center">
          {/* PAUSE / CONTINUE toggle */}
          <button
            onClick={() => {
              if (isPaused) {
                resumeAssistant();
                unmute();
              } else {
                pauseAssistant();
                mute();
              }
            }}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
          >
            <i className={`fas fa-${isPaused ? 'play' : 'pause'} mr-2`}></i>
            <span className="hidden sm:inline">{isPaused ? 'Continue' : 'Pause'}</span>
          </button>

          {/* END SESSION */}
          <button
            onClick={confirmTerminate}
            className="px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:from-red-600 hover:to-rose-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
          >
            <i className="fas fa-stop mr-2"></i>
            <span className="hidden sm:inline">End Simulation</span>
          </button>
        </div>
      ) : (
        timeLeft !== null &&
        timeLeft > 0 &&
        !isConnected && (
          <div className="flex justify-center">
            <button
              onClick={handleStart}
              className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl text-lg"
            >
              <i className="fas fa-play mr-3"></i>
              <span className="hidden sm:inline">Start voice session</span>
              <span className="sm:hidden">Start</span>
            </button>
          </div>
        )
      )}
    </>
  )}

            
            <div className="flex justify-center mt-6">
              <button
                onClick={handleReturnToDashboard}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
              >
                <i className="fas fa-home mr-2"></i>
                <span className="hidden sm:inline">Return to Dashboard</span>
                <span className="sm:hidden">Dashboard</span>
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-50/80 to-blue-50/50 rounded-2xl p-6 max-h-96 overflow-y-auto border border-gray-200/50">
            {messages.length ? (
              messages.map((msg, idx) => {
                if (msg.type === 'user_message' || msg.type === 'assistant_message') {
                  return (
                    <div key={idx} className={`mb-4 ${msg.type === 'user_message' ? 'text-right' : 'text-left'}`}>
                      <div className={`inline-block max-w-[80%] p-4 rounded-2xl shadow-lg ${
                        msg.type === 'user_message' 
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-br-none' 
                          : 'bg-white/90 text-gray-800 border border-gray-200/50 rounded-bl-none'
                      }`}>
                        <p className="text-sm opacity-80 mb-1">
                          {msg.type === 'user_message' ? 'You' : patient?.name || 'Patient'}
                        </p>
                        <p className="text-base leading-relaxed">{msg.message.content}</p>
                      </div>
                    </div>
                  );
                }
                return null;
              })
            ) : (
              <div className="text-center py-12">
                <i className="fas fa-comments text-4xl text-gray-300 mb-4"></i>
                <p className="text-gray-500 text-lg">Click start to begin voice interaction</p>
              </div>
            )}
          </div>

          {/* MODALS FOR DEFAULT LAYOUT */}
          {showEndConfirm && (
            <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white/95 rounded-2xl p-8 max-w-md w-full border border-white/50 shadow-2xl">
                <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center">
                  <i className="fas fa-exclamation-triangle mr-3 text-red-500"></i>
                  Confirm End Simulation
                </h3>
                <p className="text-gray-600 mb-6">You cannot resume if you end this session. Continue?</p>
                <div className="flex justify-end space-x-4">
                  <button 
                    onClick={() => setShowEndConfirm(false)} 
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-300 flex items-center font-semibold"
                  >
                    <i className="fas fa-times mr-2"></i>
                    No
                  </button>
                  <button 
                    onClick={() => { setShowEndConfirm(false); handleTerminate(); }} 
                    className="px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:from-red-600 hover:to-rose-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
                  >
                    <i className="fas fa-check mr-2"></i>
                    Yes, End Session
                  </button>
                </div>
              </div>
            </div>
          )}

          {showReturnLoader && (
            <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white/95 rounded-2xl p-8 max-w-md w-full border border-white/50 shadow-2xl">
                <h3 className="text-xl font-bold mb-6 text-gray-800 text-center">Returning to Dashboard</h3>
                <div className="flex justify-center mb-6">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
                </div>
                <div className="w-full bg-gray-200/80 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-blue-500 h-3 rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: '100%',
                      background: 'linear-gradient(90deg, #3b82f6, #60a5fa, #3b82f6)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 2s infinite'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {showLoadingPopup && (
            <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white/95 rounded-2xl p-8 flex flex-col items-center min-w-[400px] max-w-md border border-white/50 shadow-2xl">
                <div className="relative mb-6">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
                  <div className="absolute inset-0 rounded-full h-16 w-16 border-t-2 border-blue-300 animate-pulse"></div>
                </div>
                
                <p className="text-gray-800 font-bold text-xl mb-3 text-center">{loadingMessage}</p>
                <div className="flex items-center text-gray-600 mb-6">
                  <span className="animate-pulse">Loading</span>
                  <span className="animate-pulse delay-100">.</span>
                  <span className="animate-pulse delay-200">.</span>
                  <span className="animate-pulse delay-300">.</span>
                </div>
                
                {currentMedicalQuote && (
                  <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-l-4 border-blue-500 p-6 rounded-xl mb-6 w-full">
                    <div className="flex items-start">
                      <i className="fas fa-user-md text-blue-500 mr-4 mt-1 text-xl"></i>
                      <div>
                        <p className="text-base text-gray-700 italic">"{currentMedicalQuote.text}"</p>
                        <p className="text-sm text-gray-600 mt-2 font-medium">— {currentMedicalQuote.author}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="w-full bg-gray-200/80 rounded-full h-3 mt-2 overflow-hidden">
                  <div 
                    className="bg-blue-500 h-3 rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: '100%',
                      background: 'linear-gradient(90deg, #3b82f6, #60a5fa, #3b82f6)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 2s infinite'
                    }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {showSwitchingModal && (
            <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white/95 rounded-2xl p-8 flex flex-col items-center min-w-[400px] max-w-md border border-white/50 shadow-2xl">
                <div className="relative mb-6">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500"></div>
                </div>
                <p className="text-gray-800 font-bold text-xl mb-3 text-center">{switchingMessage}</p>
                
                {currentMedicalQuote && (
                  <div className="bg-gradient-to-r from-green-50/80 to-emerald-50/80 border-l-4 border-green-500 p-6 rounded-xl mb-6 w-full">
                    <div className="flex items-start">
                      <i className="fas fa-user-md text-green-500 mr-4 mt-1 text-xl"></i>
                      <div>
                        <p className="text-base text-gray-700 italic">"{currentMedicalQuote.text}"</p>
                        <p className="text-sm text-gray-600 mt-2 font-medium">— {currentMedicalQuote.author}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="w-full bg-gray-200/80 rounded-full h-3 mt-2 overflow-hidden">
                  <div 
                    className="bg-green-500 h-3 rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: '100%',
                      background: 'linear-gradient(90deg, #10b981, #34d399, #10b981)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 2s infinite'
                    }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {showEndingModal && (
            <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white/95 rounded-2xl p-8 flex flex-col items-center min-w-[400px] max-w-md border border-white/50 shadow-2xl">
                <div className="relative mb-6">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500"></div>
                </div>
                <p className="text-gray-800 font-bold text-xl mb-3 text-center">Ending Session! Please analyze and preview chat in log</p>
                
                {currentMedicalQuote && (
                  <div className="bg-gradient-to-r from-purple-50/80 to-pink-50/80 border-l-4 border-purple-500 p-6 rounded-xl mb-6 w-full">
                    <div className="flex items-start">
                      <i className="fas fa-user-md text-purple-500 mr-4 mt-1 text-xl"></i>
                      <div>
                        <p className="text-base text-gray-700 italic">"{currentMedicalQuote.text}"</p>
                        <p className="text-sm text-gray-600 mt-2 font-medium">— {currentMedicalQuote.author}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="w-full bg-gray-200/80 rounded-full h-3 mt-2 overflow-hidden">
                  <div 
                    className="bg-purple-500 h-3 rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: '100%',
                      background: 'linear-gradient(90deg, #8b5cf6, #a78bfa, #8b5cf6)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 2s infinite'
                    }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}