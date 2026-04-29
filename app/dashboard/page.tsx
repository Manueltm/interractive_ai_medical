// app/dashboard/page.tsx
'use client';
import React, { useState, useEffect, FC, useCallback, useRef, useMemo, Suspense } from "react";
import { ApplicationGuard } from './components/ApplicationGuard';
import { useSession } from "next-auth/react";
import FloatingInsightsWidget from "./components/FloatingInsightsWidget";

import { ThemeToggle } from "@/components/ThemeToggle";
import SettingsPage from './settings/page'
import { pickHumeVoice } from '@/utils/voicePreset';
import Link from "next/link";
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { getRandomMedicalQuote } from '@/lib/utils';
import { cn } from "@/utils";
import { Line, Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from "@/components/ui/sonner";
import HomeSection from "./components/HomeSection";
import OsceSection from "./components/OsceSection";
import FlashcardsSection from "./components/FlashcardsSection";
// import { TokenService } from '@/lib/services/tokenService';
import TokenBalance from './components/TokenBalance';
import CbtSection from "./components/CbtSection";
import CbtHistory from "./components/CbtHistory";
import type { StringOrDate } from '@/lib/types';
import type { AsDate } from '@/lib/types';
import type { Session } from "next-auth";
import { DeleteGuardModal } from '@/app/dashboard/components/DeleteGuardModal';
import LectureNotesSection from "./components/LectureNotesSection";
import RandomizerSection from "./components/RandomizerSection";
import ClincherSection from "./components/ClincherSection";
import ChecklistSection from "./components/ChecklistSection";
import MockSection from "./components/MockSection";
import QTopicSection from "./components/QTopicSection";
import KeypointLecturesSection from "./components/KeypointLecturesSection";
import CoursesSection from "./components/CoursesSection";
import GamesSection from "./components/GamesSection";
import QuizSection from "./components/QuizSection";
// Add these imports at the top

import ReactDOM from 'react-dom';
import { useDebounce } from 'use-debounce'; 
// Add this component after the imports but before DashboardPage

const OptimizedLoadingModal = React.memo(({ 
  show, 
  message, 
  quote 
}: { 
  show: boolean;
  message: string;
  quote: {text: string, author: string} | null;
}) => {
  const [shouldRender, setShouldRender] = useState(show);
  
  useEffect(() => {
    if (show) {
      setShouldRender(true);
    } else {
      // Delay unmounting for smooth exit
      const timer = setTimeout(() => setShouldRender(false), 150);
      return () => clearTimeout(timer);
    }
  }, [show]);
  
  if (!shouldRender) return null;
  
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-150 ${show ? 'opacity-100' : 'opacity-0'}`}>
      <div className="bg-card rounded-xl p-8 max-w-md text-center border border-blue-100 shadow-2xl">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground mb-4">{message}</p>
        {quote && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
            <div className="flex items-start">
              <i className="fas fa-user-md text-blue-500 mr-3 mt-1"></i>
              <div>
                <p className="text-sm text-gray-700 italic">{quote.text}</p>
                <p className="text-xs text-gray-600 mt-1">{quote.author}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

OptimizedLoadingModal.displayName = 'OptimizedLoadingModal';
type ChatHistoryItemFixed = AsDate<ChatHistoryItem>;
type PatientCaseFixed = AsDate<PatientCase>;
type PatientFixed = AsDate<Patient> & { gender?: string | null };
function asDate<T extends { createdAt: string; updatedAt?: string | null }>(
  arr: T[]
): AsDate<T>[] {
  return arr.map((i) => ({
    ...i,
    createdAt: new Date(i.createdAt),
    updatedAt: i.updatedAt ? new Date(i.updatedAt) : null,
  })) as AsDate<T>[]; // <- widen to AsDate
}
/** Single-object converter */
function asDateObj<T extends { createdAt: string; updatedAt?: string | null }>(
  obj: T | null
): AsDate<T> | null {
  if (!obj) return null;
  return {
    ...obj,
    createdAt: new Date(obj.createdAt),
    updatedAt: obj.updatedAt ? new Date(obj.updatedAt) : null,
  } as AsDate<T>; // <- widen to AsDate
}
// Type-safe conversion functions
const safeConvertPatient = (patient: AsDate<Patient>): PatientFixed => {
  return {
    ...patient,
    gender: (patient.gender as 'male' | 'female' | 'other') || 'male'
  };
};
const safeConvertSession = (session: AsDate<SessionType>): any => {
  return {
    ...session,
    stations: session.stations || null
  };
};
const safeConvertChat = (chat: AsDate<Chat>): any => {
  return {
    ...chat,
    examSteps: chat.examSteps || null
  };
};
const safeConvertChatWithPatientName = (chat: AsDate<Chat> & { patientName?: string }): any => {
  return {
    ...chat,
    examSteps: chat.examSteps || null
  };
};
const generateUUID = () => crypto.randomUUID();
type UserType = "guest" | "regular" | "google";
interface SessionUser {
  id: string;
  type: UserType;
  name?: string | null;
  email?: string | null;
  role?: "user" | "admin";
}
interface AuthSession {
  user: SessionUser;
}
interface SubmenuItem {
  title: string;
  href: string;
  target: string;
  icon: string;
}

interface ChatResponse {
  id: string;
  sessionId: string;
  userId: string;
  patientId: string;
  title: string;
  visibility: string;
  status: string;
  stationIndex: number;
  totalStations: number;
  examSteps?: any;
  createdAt: string;
  updatedAt: string;
  latestScore: number | null;
  latestGrade: string | null;
  latestFeedback: string | null;
}

const getExistingChatForStation = async (sessionId: string, stationIndex: number): Promise<ChatResponse | null> => {
  try {
    const res = await fetch(`/api/chats?sessionId=${sessionId}&stationIndex=${stationIndex}`, {
      credentials: 'include',
    });
    if (res.ok) {
      const chats = await res.json();
      if (chats && chats.length > 0) {
        // Return the most recent incomplete chat
        const incompleteChat = chats.find((c: ChatResponse) => c.status === 'incomplete');
        return incompleteChat || chats[0];
      }
    }
  } catch (error) {
    console.error('Error checking existing chat:', error);
  }
  return null;
};


interface ActiveSubmenu {
  title: string;
  icon: string;
  color: string;
  children?: SubmenuItem[];
}
// API call function for token deduction
const deductTokensViaAPI = async (service: string, quantity: number, metadata?: any) => {
  console.log('🔶 Token Deduction Request:', {
    service,
    quantity,
    metadata
  });
  
  try {
    const response = await fetch('/api/tokens/deduct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service,
        quantity,
        metadata
      }),
    });

    const result = await response.json();
    console.log('🔶 Token Deduction Response:', result);
    
    if (result.newBalance !== undefined) {
      // Dispatch the event on the client side
      const updateBalanceEvent = new CustomEvent('balanceUpdated', {
        detail: { 
          balance: result.newBalance,
          fromOperation: true,
          timestamp: Date.now()
        }
      });
      window.dispatchEvent(updateBalanceEvent);
    }
    
    return result;
  } catch (error) {
    console.error('API token deduction error:', error);
    return { 
      success: false, 
      message: 'Network error during token deduction' 
    };
  }
};


type Department = {
  id: string;
  name: string;
  slug: string;
  color: string;
  fontColor: string;
  isFlashcardDept: boolean;
  createdAt: string;
  updatedAt: string;
};
type PatientCase = {
  id: string;
  departmentId: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  sessionType: "clerking" | "counselling" | "physical_exam" | "flashcards";
  topic: string | null;
  createdAt: string;
  updatedAt: string;
};
type Patient = {
  id: string;
  caseId: string;
  name: string;
  age: string;
  gender: "male" | "female" | "other";
  location: string | null;
  condition: string;
  prompt: string | null;
  question: string | null;
  answer: string | null;
  createdAt: string;
  updatedAt: string;
  imageUrl: string | null; // NEW: Added imageUrl
};
type FlashcardType = {
  question: string;
  answer: string;
};
type FlashcardHistory = {
  id: string;
  sessionId: string;
  departmentId: string;
  topic: string;
  question: string;
  answer: string;
  createdAt: string;
};
type FlashcardTopic = {
  id: string;
  departmentId: string;
  topic: string;
  createdAt: string;
  updatedAt: string;
};
type SessionType = {
  id: string;
  userId: string;
  type: "clerking" | "counselling" | "physical_exam" | "flashcards";
  departmentId: string;
  caseId: string | null;
  patientId: string | null;
  numStations: number;
  duration: number;
  topic: string | null;
  numQuestions: number | null;
  status: "active" | "completed" | "saved";
  chatId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  stations?: { index: number; patientId: string }[];
};
type Chat = {
  id: string;
  sessionId: string | null;
  createdAt: string;
  title: string;
  userId: string;
  patientId: string;
  visibility: "public" | "private";
  lastContext: any | null;
  latestScore: number | null;
  latestGrade: string | null;
  latestFeedback: string | null;
  status: "incomplete" | "completed";
  examSteps?: { name: string; videoUrl: string }[];
  stationIndex?: number;
};
type ChatHistoryItem = {
  id: string;
  createdAt: string;
  title: string;
  userId: string;
  patientId: string;
  patientName: string;
  status: "incomplete" | "completed";
  type?: string | null;
  latestFeedback?: string | null;
};
type DBMessage = {
  id: string;
  chatId: string;
  role: "student" | "patient" | "ai" | "system";
  content: string;
  attachments: any | null;
  createdAt: string;
};
type Suggestion = {
  id: string;
  chatId: string;
  originalText: string;
  suggestedText: string;
  description: string | null;
  isResolved: boolean;
  createdAt: string;
  userId: string;
};
type Stream = {
  id: string;
  chatId: string;
  url: string | null;
  createdAt: string;
};
type Rubric = {
  id: string;
  departmentId: string;
  title: string;
  description: string | null;
  createdAt: string;
};
type RubricCriteria = {
  id: string;
  rubricId: string;
  name: string;
  description: string | null;
  maxScore: number;
  weight: number;
};
type Evaluation = {
  id: string;
  chatId: string;
  rubricId: string | null;
  evaluatorId: string | null;
  criteriaScores: Record<string, number> | null;
  totalScore: number | null;
  grade: string | null;
  feedback: string | null;
  createdAt: string;
};
type StepFeedback = {
  id: string;
  chatId: string;
  stepIndex: number;
  feedback: any;
  createdAt: string;
};
type Feedback = {
  rating: number;
  percentage: number;
  strengths: { category: string; score: number; evidence: string }[];
  improvements: { category: string; score: number; evidence: string }[];
  suggestions: string[];
  overall_assessment: string;
};
type SectionKey =
  | 'selection'
  | 'clerking' | 'create-clerking' | 'setup-clerking' | 'create-clerking-department' | 'create-clerking-case' | 'create-clerking-patient'
  | 'counselling' | 'create-counselling' | 'setup-counselling' | 'create-counselling-department' | 'create-counselling-case' | 'create-counselling-patient'
  | 'physical_exam' | 'create-physical_exam' | 'setup-physical_exam' | 'create-physical_exam-department' | 'create-physical_exam-case' | 'create-physical_exam-patient'
  | 'flashcards-departments' | 'flashcards-create-department' | 'flashcards-create-topic' | 'flashcards-topic-list' | 'flashcards-deck-config' | 'flashcards-session' | 'flashcards-review' | 'flashcards-saved'
  | 'stations-info' 
  | 'cbt-history' 
  | 'voice-session' 
  | 'dashboard' 
  | 'chat-history'
  | 'cases' | 'forum' | 'settings'  // Make sure 'settings' is here
  | 'cbt-examination' | 'cbt-intro' | 'cbt-mode' | 'cbt-question-display' | 'cbt-feedback' | 'cbt-summary' | 'cbt-create-category' | 'cbt-create-question' 
  | 'lecture-notes' | 'randomizer' | 'clincher' | 'checklist' | 'mock' | 'qtopic' | 'keypoint-lectures' | 'courses' | 'games' | 'quiz';
type ManageType = 'department' | 'case' | 'patient' | 'topic' | 'cbt-category' | 'cbt-question' | null;
type StationConfig = {
  index: number;
  isAllDepartments: boolean;
  departments: string[];
  cases: { [deptId: string]: string[] };
};
// Add these conversion functions
const convertChatHistory = (chats: ChatHistoryItem[]): AsDate<ChatHistoryItem>[] => {
  return chats.map(chat => ({
    ...chat,
    createdAt: new Date(chat.createdAt),
    visibility: 'private' as const, // Default value
    patientName: chat.patientName || 'Unknown'
  }));
};
const convertStepFeedbacks = (feedbacks: StepFeedback[]): AsDate<StepFeedback>[] => {
  return feedbacks.map(feedback => ({
    ...feedback,
    createdAt: new Date(feedback.createdAt)
  }));
};
const Badge: FC<{ text: string; value: string }> = ({ text }) => {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
      {text}
    </span>
  );
};
const AllBadge: FC<{ text: string }> = ({ text }) => {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
      {text}
    </span>
  );
};

const Spinner = () => {
  const [currentMedicalQuote, setCurrentMedicalQuote] = useState<{text: string, author: string} | null>(null);
  useEffect(() => {
    setCurrentMedicalQuote(getRandomMedicalQuote());
  }, []);
  return (
    <div className="flex flex-col items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      <p className="mt-4 text-gray-600">Loading questions from AI...</p>
      {/* Medical Quote */}
      {currentMedicalQuote && (
        <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg max-w-md">
          <div className="flex items-start">
            <i className="fas fa-user-md text-blue-500 mr-3 mt-1"></i>
            <div>
              <p className="text-sm text-gray-700 italic">{currentMedicalQuote.text}</p>
              <p className="text-xs text-gray-600 mt-1">{currentMedicalQuote.author}</p>
            </div>
          </div>
        </div>
      )}
      {/* Animated Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mt-4 max-w-xs">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-1000 ease-out"
          style={{
            width: '100%',
            background: 'linear-gradient(90deg, #3b82f6, #60a5fa, #3b82f6)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s infinite'
          }}
        />
      </div>
    </div>
  );
};
const MultiSelect: FC<{
  options: { id: string; name: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
}> = ({ options, selected, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const displaySelected = options.filter((o) => selected.includes(o.id));
  const filteredOptions = options
    .filter((o) => !selected.includes(o.id))
    .filter((o) => o.name.toLowerCase().includes(search.toLowerCase()));
  const toggle = (id: string) => {
    const newSelected = selected.includes(id)
      ? selected.filter((s) => s !== id)
      : [...selected, id];
    onChange(newSelected);
    setIsOpen(false);
    setSearch('');
  };
  const remove = (id: string) => {
    onChange(selected.filter((s) => s !== id));
  };
  const handleInputClick = () => {
    setSearch('');
    setIsOpen(true);
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setIsOpen(true);
  };
  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsOpen(false);
  };
  const handleOptionClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    toggle(id);
  };
  return (
    <div className="relative" onBlur={handleBlur}>
      <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-xl focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all duration-300 shadow-sm hover:shadow-md">
        {displaySelected.map((item) => (
          <div
            key={item.id}
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 shadow-sm"
          >
            {item.name}
            <button
              onClick={(e) => {
                e.stopPropagation();
                remove(item.id);
              }}
              className="ml-2 text-blue-600 hover:text-blue-800 font-bold text-sm transition-colors"
            >
              ×
            </button>
          </div>
        ))}
        <input
          type="text"
          placeholder={selected.length === 0 ? placeholder : `${selected.length} selected`}
          value={search}
          onChange={handleInputChange}
          onClick={handleInputClick}
          className="flex-1 min-w-[200px] outline-none bg-transparent text-sm"
        />
      </div>
      {isOpen && (
        <div className="absolute z-20 w-full mt-2 bg-white border border-gray-300 rounded-xl shadow-xl max-h-60 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            <ul className="py-1">
              {filteredOptions.map((option) => (
                <li
                  key={option.id}
                  className="px-4 py-3 flex items-center cursor-pointer hover:bg-blue-50 transition-colors duration-200 text-sm"
                  onMouseDown={(e) => handleOptionClick(e, option.id)} // Use mousedown to prevent blur
                >
                  <div className="flex items-center mr-3">
                    <div className={`w-4 h-4 rounded border-2 transition-colors ${selected.includes(option.id) ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`} />
                  </div>
                  <span className="text-gray-700">{option.name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-3 text-gray-500 text-sm text-center">No matching options</p>
          )}
        </div>
      )}
    </div>
  );
};
const MaleIcon: FC = () => (
  <svg className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg ">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-2.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
);
const FemaleIcon: FC = () => (
  <svg className="w-16 h-16 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg ">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
function DashboardContent() {
  // Add this with your other state declarations
const [loadingPortalRoot, setLoadingPortalRoot] = useState<HTMLElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 });
// Add drag functionality functions
const handleMouseDown = (e: React.MouseEvent) => {
  setIsDragging(true);
  setDragOffset({
    x: e.clientX - buttonPosition.x,
    y: e.clientY - buttonPosition.y
  });
};
const handleMouseMove = (e: React.MouseEvent) => {
  if (isDragging) {
    setButtonPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    });
  }
};
const handleMouseUp = () => {
  setIsDragging(false);
  // Save position to localStorage for persistence
  localStorage.setItem('floatingButtonPosition', JSON.stringify(buttonPosition));
};
// Load saved position on mount
useEffect(() => {
  const saved = localStorage.getItem('floatingButtonPosition');
  if (saved) {
    setButtonPosition(JSON.parse(saved));
  }
}, []);
  const { data: session, status } = useSession();

  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
  const section = searchParams.get('section');
  if (section === 'chat-history') {
    setCurrentSection('chat-history'); // <-- NEW
  }
  if (section === 'stations-info') {
    const sessionIdParam = searchParams.get('sessionId');
    if (sessionIdParam) {
      loadResumedSession(sessionIdParam);
    }
  }
}, [searchParams]);
  const loadResumedSession = async (sessionId: string) => {
  setCurrentMedicalQuote(getRandomMedicalQuote());
  setSwitchingMessage('Loading next station...');
  setShowSwitchingModal(true);
    try {
      const sessionRes = await fetch(`/api/sessions/${sessionId}`);
      if (!sessionRes.ok) {
        toast.error('Session not found');
        switchSection('selection'); // Changed to 'selection' for better UX
        return;
      }
      const sessionData: SessionType = await sessionRes.json();
      if (sessionData.userId !== session?.user?.id) {
        toast.error('Unauthorized access to session');
        switchSection('selection'); // Changed to 'selection'
        return;
      }
      setCurrentSession(sessionData);
      setSelectedStations(sessionData.numStations);
      setSelectedDuration(sessionData.duration);
      setCurrentSessionType(sessionData.type as any);
      const chatsRes = await fetch(`/api/sessions/${sessionId}/chats`);
      if (!chatsRes.ok) {
        toast.error('Failed to fetch chats for session');
        return;
      }
      const chats = await chatsRes.json();
      const completedCount = Array.isArray(chats) ? chats.filter(c => c.status === 'completed').length : 0; // Handle non-array
      if (completedCount >= sessionData.numStations) {
        setCurrentSection('chat-history');
        return;
      }
      setCurrentStation(completedCount);
      const stationPatientsList = await Promise.all(
        (sessionData.stations || []).map(async (s: {index: number, patientId: string}) => ({
          index: s.index,
          patient: await (await fetch(`/api/patients/${s.patientId}`)).json()
        }))
      );
      setStationPatients(stationPatientsList);
      setCurrentSection('stations-info');
      setShowSwitchingModal(false);
    } catch (e) {
      console.error('Failed to load resumed session:', e);
      toast.error('Failed to load session');
      switchSection('selection'); // Changed to 'selection'
    }
  };
  const [navHistory, setNavHistory] = useState<SectionKey[]>(['selection']);
  // DELETE GUARD MODALS
const [deleteGuard, setDeleteGuard] = useState<{
  type: ManageType;
  id: string;
  name: string;
} | null>(null);
/* ---------- Generic guarded delete ---------- */
const handleDeleteGuarded = async (type: ManageType, id: string, name: string) => {
  try {
    /* 1. COUNT ATTACHED CHILDREN -------------------------------------- */
    let attached = 0;
    if (type === 'department') {
      // OSCE / Flash departments
      const deps = await fetch('/api/departments').then(r => r.json()) as Department[];
      const dept = deps.find(d => d.id === id)!;
      const [patientsRes, casesRes, topicsRes] = await Promise.all([
        fetch('/api/patients').then(r => r.json()).catch(() => []),
        fetch('/api/patient-cases').then(r => r.json()).catch(() => []),
        fetch(`/api/topics/${id}`).then(r => r.json()).catch(() => []),
      ]);
      const patients = (patientsRes as Patient[]).filter(p => {
        const c = (casesRes as PatientCase[]).find(cc => cc.id === p.caseId);
        return c?.departmentId === id;
      });
      const cases = (casesRes as PatientCase[]).filter(c => c.departmentId === id);
      const topics = (topicsRes as FlashcardTopic[]);
      attached = patients.length + cases.length + topics.length;
      if (attached) {
        toast.error(`Patient Assigned! Delete ${patients.length} patient(s), ${cases.length} case(s), ${topics.length} topic(s) first`);
        return;
      }
    }
    if (type === 'case') {
      const patients = await fetch('/api/patients').then(r => r.json()).catch(() => []) as Patient[];
      attached = patients.filter(p => p.caseId === id).length;
      if (attached) {
        toast.error(`Patient Assigned! Delete ${attached} patient(s) first or move to another case`);
        return;
      }
    }
    if (type === 'topic') {
      // Topics only exist inside flashcard departments
      attached = 0; // no child table yet
    }
    if (type === 'patient') {
      attached = 0; // patient is a leaf
    }
    /* 2. NOTHING ATTACHED – ASK CONFIRMATION -------------------------- */
    setDeleteGuard({ type, id, name });
  } catch (e) {
    toast.error('Could not verify dependencies');
  }
};
  // ------------------------------------------------------------------
// Department-type badge (re-used in two places)
// ------------------------------------------------------------------
const DepartmentTypeBadge: FC<{ isFlashcardDept: boolean }> = ({ isFlashcardDept }) => {
  if (isFlashcardDept) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <i className="fas fa-book-open mr-1" /> Flashcards
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
      <i className="fas fa-stethoscope mr-1" /> OSCE
    </span>
  );
};
// Add a state variable near your other state declarations (around line 550-600)
const [showAceMedixMenus, setShowAceMedixMenus] = useState(false); // Set to false to hide, true to show

// Update the navItems array to conditionally include AceMedix Academy menus
const navItems = [
  // CBT Examination section
  // {
  //   title: "CBT Examination",
  //   icon: "fa-laptop-medical",
  //   children: [
  //     { title: "MDCN", href: "/dashboard/cbt-mdcn", target: "cbt-mdcn", icon: "fa-file-medical" },
  //     { title: "MBBS", href: "/dashboard/cbt-mbbs", target: "cbt-mbbs", icon: "fa-graduation-cap" },
  //   ]
  // },
  
  // Clinical Skills section
 {
  title: "Clerking",
  href: "/dashboard/clerking",
  target: "clerking",
  icon: "fa-stethoscope"
},
{
  title: "Counseling",
  href: "/dashboard/counselling",
  target: "counselling",
  icon: "fa-hand-holding-heart"
},
{
  title: "Physical Examination",
  href: "/dashboard/examination",
  target: "physical_exam",
  icon: "fa-heartbeat"
},

// Flashcards section
{
  title: "Flashcards",
  icon: "fa-book-open",
  children: [
    { title: "Create Flashcards", href: "/dashboard/flashcards", target: "flashcards", icon: "fa-plus-circle" },
    { title: "Saved Flashcards", href: "/dashboard/saved-flashcards", target: "flashcards-saved", icon: "fa-save" },
  ]
},
  
  // AceMedix Academy - CONDITIONALLY HIDDEN
  ...(showAceMedixMenus ? [
    { 
      title: "Lecture Notes", 
      href: "/dashboard/lecture-notes", 
      target: "lecture-notes", 
      icon: "fa-book",
      section: "lecture-notes"
    },
    { 
      title: "Randomizer", 
      href: "/dashboard/randomizer", 
      target: "randomizer", 
      icon: "fa-random",
      section: "randomizer"
    },
    { 
      title: "Clincher", 
      href: "/dashboard/clincher", 
      target: "clincher", 
      icon: "fa-lightbulb",
      section: "clincher"
    },
    { 
      title: "Checklist", 
      href: "/dashboard/checklist", 
      target: "checklist", 
      icon: "fa-check-circle",
      section: "checklist"
    },
    { 
      title: "Mock", 
      href: "/dashboard/mock", 
      target: "mock", 
      icon: "fa-laptop-medical",
      section: "mock"
    },
    { 
      title: "QTopic", 
      href: "/dashboard/qtopic", 
      target: "qtopic", 
      icon: "fa-tag",
      section: "qtopic"
    },
    { 
      title: "Keypoint Lectures", 
      href: "/dashboard/keypoint-lectures", 
      target: "keypoint-lectures", 
      icon: "fa-chalkboard-teacher",
      section: "keypoint-lectures"
    },
    { 
      title: "Courses", 
      href: "/dashboard/courses", 
      target: "courses", 
      icon: "fa-layer-group",
      section: "courses"
    },
    { 
      title: "Games", 
      href: "/dashboard/games", 
      target: "games", 
      icon: "fa-gamepad",
      section: "games"
    },
    { 
      title: "Quiz", 
      href: "/dashboard/quiz", 
      target: "quiz", 
      icon: "fa-question-circle",
      section: "quiz"
    },
  ] : []),
  
  // Other sections
  { 
    title: "Chat History", 
    href: "/dashboard/chat-history", 
    target: "chat-history", 
    icon: "fa-history" 
  },
  { 
    title: "Settings & Profile", 
    href: "/dashboard/settings", 
    target: "settings",
    icon: "fa-user-cog" 
  },
  { 
    title: "Tokens", 
    href: "/dashboard/tokens", 
    target: "tokens", 
    icon: "fa-coins",
    component: ({ isActive }: { isActive?: boolean }) => (
      <Link
        href="/dashboard/tokens"
        className={cn(
          "block w-full text-left rounded-xl px-4 py-3 text-white hover:text-white flex items-center group",
          isActive ? 'bg-blue-700/40' : ''
        )}
        onClick={(e) => {
          e.stopPropagation();
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('dashboardSection');
          }
        }}
      >
        <i className="fas fa-coins mr-3 text-lg text-amber-400 group-hover:scale-110 transition-transform" />
        Tokens
      </Link>
    )
  },
];

// Update the mobile menu section (around line 4440) to conditionally show AceMedix menus

// Admin items remain separate

const adminNavItems = [
  { title: "Manage Tokens", href: "/dashboard/admin/tokens", target: "admin/tokens", icon: "fa-cog" },
  // { title: "Application Access", href: "/dashboard/admin/application-access", target: "admin/application-access", icon: "fa-shield-alt" },
  { title: "Users Management", href: "/dashboard/admin/users", target: "admin/users", icon: "fa-user" },
  { title: "Manage Ads", href: "/dashboard/admin/ads", target: "admin/ads", icon: "fa-images" },
];
const [profileImage, setProfileImage] = useState<string | null>(null);
// In dashboard page, update the voiceSessionData state declaration (around line 600-700)
// Replace the existing voiceSessionData state declaration with this updated version
const [voiceSessionData, setVoiceSessionData] = useState<{
  accessToken: string;
  patient: any;
  chatId: string;
  type: 'clerking' | 'counselling' | 'physical_exam' | 'flashcards';
  examSteps: { name: string; videoUrl: string }[];
  stationInfo: { current: number; total: number };
  durationMinutes?: number;
  mode?: 'practice' | 'exam';
  existingMessages?: Array<{ role: string; content: string; createdAt: string }>;
  elapsedTime?: number;
  department?: { id: string; name: string; slug?: string } | null; // ADD THIS LINE
} | null>(null);
const [isMobileTrayOpen, setIsMobileTrayOpen] = useState(false);
// Add near your other state declarations
const [activeSubmenu, setActiveSubmenu] = useState<{
  title: string;
  icon: string;
  color: string;
  children?: SubmenuItem[];
} | null>(null);
const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSwitchingModal, setShowSwitchingModal] = useState(false);
const [switchingMessage, setSwitchingMessage] = useState('');
 const [currentMedicalQuote, setCurrentMedicalQuote] = useState<{text: string, author: string} | null>(null);
  const [currentSection, setCurrentSection] = useState<SectionKey>('selection');
  const [previousSection, setPreviousSection] = useState<SectionKey | null>(null);
  const [balance, setBalance] = useState(0);
  const [currentSessionType, setCurrentSessionType] = useState<'clerking' | 'counselling' | 'physical_exam' | 'flashcards' | null>(null);
  const [selectedStations, setSelectedStations] = useState(1);
  const [selectedDuration, setSelectedDuration] = useState(5);
  const [stationConfigs, setStationConfigs] = useState<StationConfig[]>([{ index: 0, isAllDepartments: false, departments: [], cases: {} }]);
  const [isProceedClicked, setIsProceedClicked] = useState(false);
  const [isStartClicked, setIsStartClicked] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [patientCases, setPatientCases] = useState<PatientCase[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedCase, setSelectedCase] = useState<PatientCase | null>(null);
  const [currentSession, setCurrentSession] = useState<SessionType | null>(null);
  const [currentDepartment, setCurrentDepartment] = useState('');
  const [currentTopic, setCurrentTopic] = useState('');
  const [topics, setTopics] = useState<FlashcardTopic[]>([]);
  const [selectedNumCards, setSelectedNumCards] = useState(5);
  const [flashDuration, setFlashDuration] = useState(10);
  const [currentFlashSession, setCurrentFlashSession] = useState<SessionType | null>(null);
  const [currentFlashIndex, setCurrentFlashIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [savedSessions, setSavedSessions] = useState<SessionType[]>([]);
  const [flashcardQuestions, setFlashcardQuestions] = useState<FlashcardType[]>([]);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [newDepartmentSlug, setNewDepartmentSlug] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newCaseTitle, setNewCaseTitle] = useState('');
  const [newCaseDescription, setNewCaseDescription] = useState('');
  const [newCaseDifficulty, setNewCaseDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [newCaseTopic, setNewCaseTopic] = useState('');
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientAge, setNewPatientAge] = useState('');
  const [newPatientGender, setNewPatientGender] = useState<'male' | 'female' | 'other'>('male');
  const [newPatientLocation, setNewPatientLocation] = useState('');
  const [newPatientCondition, setNewPatientCondition] = useState('');
  const [newPatientPrompt, setNewPatientPrompt] = useState('');
  const [newPatientImage, setNewPatientImage] = useState<string | null>(null); // CHANGED: string | null
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<FlashcardHistory[]>([]);
  const [showModal, setShowModal] = useState(false);
  // New states for manage modals
  const [showListModal, setShowListModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [manageType, setManageType] = useState<ManageType>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  // New states for stations info
  const [stationPatients, setStationPatients] = useState<{ index: number; patient: Patient | null }[]>([]);
  const [currentStation, setCurrentStation] = useState(0);
  // New states for incomplete sessions and chat history
  const [incompleteSession, setIncompleteSession] = useState<(Chat & { patientName?: string }) | null>(null);
  const [showIncompletePrompt, setShowIncompletePrompt] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  // New states for delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  // New states for preview
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewChatId, setPreviewChatId] = useState<string | null>(null);
  const [previewMessages, setPreviewMessages] = useState<DBMessage[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  // Resolver for incomplete prompt
  const resolverRef = useRef<(value: boolean) => void>();
  // Add new states
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<Feedback | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedChatId, setAnalyzedChatId] = useState<string | null>(null);
  // Loading popup states
  const [showLoadingPopup, setShowLoadingPopup] = useState(false);
const [debouncedShowLoading] = useDebounce(showLoadingPopup, 50);
  const [loadingMessage, setLoadingMessage] = useState('');
  // Exam result states
  const [showExamResultModal, setShowExamResultModal] = useState(false);
  const [examStepFeedbacks, setExamStepFeedbacks] = useState<StepFeedback[]>([]);
 const [examOverallFeedback, setExamOverallFeedback] = useState<Feedback | null>(null);
  // Exam chat steps
  const [chatExamSteps, setChatExamSteps] = useState<{ name: string; videoUrl: string }[]>([]);
  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Open menus state
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const toggleMenu = (title: string) => {
    setOpenMenus(prev => prev.includes(title) ? [] : [title]);
  };
  // NEW STATES FOR QUICK SIMULATION
  const [quickFilterType, setQuickFilterType] = useState<'clerking' | 'counselling' | 'physical_exam' | ''>('');
  const [quickFilterDepartment, setQuickFilterDepartment] = useState('');
  const [quickSearch, setQuickSearch] = useState('');
  const [quickCurrentIndex, setQuickCurrentIndex] = useState(0);
  const [quickDurations, setQuickDurations] = useState<Record<string, number>>({});
  // Add these states with your other state declarations
const [showSmartInputModal, setShowSmartInputModal] = useState(false);
const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
const [smartInputText, setSmartInputText] = useState('');
const [smartUploadedFile, setSmartUploadedFile] = useState<File | null>(null);
const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  // NEW STATES FOR STATS
  const [voiceChatStatsFilter, setVoiceChatStatsFilter] = useState<'clerking' | 'counselling' | 'physical_exam' | 'all'>('all');
  const [cbtType, setCbtType] = useState<'mdcn' | 'mbbs' | 'smart' | null>(null);
const [cbtMode, setCbtMode] = useState<'practice' | 'timed' | 'exam' | null>(null);
const [cbtCategories, setCbtCategories] = useState<any[]>([]);
const [cbtQuestions, setCbtQuestions] = useState<any[]>([]);
const [cbtSelectedCategory, setCbtSelectedCategory] = useState<string | null>(null);
const [currentCbtSessionId, setCurrentCbtSessionId] = useState<string | null>(null);
const [cbtCurrentQuestionIndex, setCbtCurrentQuestionIndex] = useState(0);
const [cbtAnswers, setCbtAnswers] = useState<Record<number, number>>({});
const [cbtSessionId, setCbtSessionId] = useState<string | null>(null);
const [cbtSessionScore, setCbtSessionScore] = useState<number>(0);
// CBT Creation states
const [newCbtCategoryName, setNewCbtCategoryName] = useState('');
const [newCbtCategorySlug, setNewCbtCategorySlug] = useState('');
const [newCbtQuestionCategoryId, setNewCbtQuestionCategoryId] = useState('');
const [newCbtQuestionContent, setNewCbtQuestionContent] = useState('');
const [newCbtQuestionExplanation, setNewCbtQuestionExplanation] = useState('');
const [newCbtQuestionFigureUrl, setNewCbtQuestionFigureUrl] = useState('');
const [newCbtQuestionOptions, setNewCbtQuestionOptions] = useState([
  { text: '', correct: false },
  { text: '', correct: false },
  { text: '', correct: false },
  { text: '', correct: false },
  { text: '', correct: false },
]);
// Icon color functions - Modern, bright, colorful icons
const getIconColor = (index: number) => {
  const colors = [
    'text-cyan-400',    // Bright cyan
    'text-emerald-400', // Vibrant green
    'text-amber-400',   // Golden amber
    'text-purple-400',  // Electric purple
    'text-rose-400',    // Pink rose
    'text-blue-400',    // Sky blue
    'text-indigo-400',  // Royal indigo
  ];
  return colors[index % colors.length];
};

const getChildIconColor = (index: number) => {
  const colors = [
    'text-cyan-300',
    'text-emerald-300', 
    'text-amber-300',
    'text-purple-300',
    'text-rose-300',
    'text-blue-300',
  ];
  return colors[index % colors.length];
};
  // NEW: CBT specific states
  const [cbtNumQuestions, setCbtNumQuestions] = useState(50);
  const [cbtDuration, setCbtDuration] = useState(60);
  const [cbtTimeLeft, setCbtTimeLeft] = useState(0);
  const [cbtSelectedAnswer, setCbtSelectedAnswer] = useState<number | null>(null);
  const [showCbtFeedbackModal, setShowCbtFeedbackModal] = useState(false);
  const [cbtFeedback, setCbtFeedback] = useState<any>(null);
  const [cbtOverallFeedback, setCbtOverallFeedback] = useState<string>('');
  const [cbtShowSummary, setCbtShowSummary] = useState(false);
  // const [cbtOptionPercentages, setCbtOptionPercentages] = useState<Record<string, number[]>>({});
  const [cbtShowEndConfirm, setCbtShowEndConfirm] = useState(false);
  const [cbtIsChecking, setCbtIsChecking] = useState(false);
  const [cbtAiExplanation, setCbtAiExplanation] = useState('');
  type OptionStats = { pct: number; totalPicked: number; isCorrect: boolean };
  const [cbtOptionPercentages, setCbtOptionPercentages] = useState<Record<string, OptionStats[]>>({});
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showChiefComplaint, setShowChiefComplaint] = useState(true);
const [showPresentingCondition, setShowPresentingCondition] = useState(true);
const [hintsEnabled, setHintsEnabled] = useState(true);
const [aiTutorEnabled, setAiTutorEnabled] = useState(false);
  const [voiceChatStats, setVoiceChatStats] = useState<{
  total: number;
  avgScore: number;
  absoluteAvgScore: number;
  completed: number;
  incomplete: number;
  scoresData: number[];
  validScoresCount: number;
}>({
  total: 0,
  avgScore: 0,
  absoluteAvgScore: 0,
  completed: 0,
  incomplete: 0,
  scoresData: [],
  validScoresCount: 0
});
  const [flashStats, setFlashStats] = useState<{ total: number; avgQuestions: number; sessionsData: number[] }>({ total: 0, avgQuestions: 0, sessionsData: [] });
  // NEW: CBT Stats states
  const [cbtStats, setCbtStats] = useState<{
    totalAttempts: number;
    correct: number;
    wrong: number;
    unanswered: number;
    avgScore: number;
    completedSessions: number;
    scoresData: number[];
  }>({
    totalAttempts: 0,
    correct: 0,
    wrong: 0,
    unanswered: 0,
    avgScore: 0,
    completedSessions: 0,
    scoresData: [],
  });
  const [cbtStatsFilter, setCbtStatsFilter] = useState<'mdcn' | 'mbbs' | 'all'>('all');
  const [cbtStatsDateFilter, setCbtStatsDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year' | 'custom'>('all');
  const [cbtStatsCustomStart, setCbtStatsCustomStart] = useState('');
  const [cbtStatsCustomEnd, setCbtStatsCustomEnd] = useState('');
  // NEW: VoiceChat date filter states
  const [voiceDateFilter, setVoiceDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year' | 'custom'>('all');
  const [voiceCustomStart, setVoiceCustomStart] = useState('');
  const [voiceCustomEnd, setVoiceCustomEnd] = useState('');
  // NEW: Flashcard date filter states
  const [flashDateFilter, setFlashDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year' | 'custom'>('all');
  const [flashCustomStart, setFlashCustomStart] = useState('');
  const [flashCustomEnd, setFlashCustomEnd] = useState('');
  // NEW STATES FOR LEADERBOARD
  const [leaderboardFilter, setLeaderboardFilter] = useState<'scenarios' | 'flashcards'>('scenarios');
  // Update this state declaration
const [leaderboardData, setLeaderboardData] = useState<{
  username: string;
  avgScore: number;
  validScores?: number;
  totalChats?: number;
}[]>([]);
const [loadingQuestions, setLoadingQuestions] = useState(false);
const [leaderboardScoreType, setLeaderboardScoreType] = useState<'valid' | 'absolute'>('valid');
const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  useEffect(() => {
    if (currentDepartment && currentSection === 'flashcards-topic-list') {
      fetchTopicsByDepartment(currentDepartment);
    }
  }, [currentDepartment, currentSection]);
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentSection === 'flashcards-session' && currentFlashSession && !isLoadingQuestions) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleSaveFlashcardHistory();
            switchSection('flashcards-review');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentSection, currentFlashSession, isLoadingQuestions]);
  useEffect(() => {
    if (isFlipped && currentSection === 'flashcards-session') {
      const timer = setTimeout(() => {
        handleNext();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isFlipped, currentSection]);
  useEffect(() => {
    if (selectedItem) {
      setEditFormData(selectedItem);
    }
  }, [selectedItem]);
  const handleProceedStation = () => {
  if (currentStation < selectedStations - 1) {
    // Clear voice session data BEFORE moving to next station
    setVoiceSessionData(null);
    setCurrentChat(null);
    
    // Clear localStorage for the completed chat
    if (currentChat?.id) {
      localStorage.removeItem(`vapi_session_${currentChat.id}`);
      localStorage.removeItem(`duration_${currentChat.id}`);
      localStorage.removeItem(`chat_${currentChat.id}`);
    }
    
    // Move to next station
    setCurrentStation(currentStation + 1);
    setCurrentSection('stations-info');
    
    // Small delay to ensure cleanup
    setTimeout(() => {
      console.log(`Ready for station ${currentStation + 2}`);
    }, 100);
  } else {
    // All stations completed - use the defined function
    handleCompleteSession();
  }
};
  useEffect(() => {
  if (cbtType && cbtType !== 'smart') {
    fetchCbtCategories();
  } else if (cbtType === 'smart') {
    setCbtCategories([]);
  }
}, [cbtType]);
useEffect(() => {
  // 1. wipe old questions immediately
  setCbtQuestions([]);
  // 2. fetch new ones
  if (cbtType && cbtSelectedCategory) {
    fetchCbtQuestions(cbtSelectedCategory === 'all' ? undefined : cbtSelectedCategory);
  }
}, [cbtType, cbtSelectedCategory]);

// Handle device back button for in-app navigation
useEffect(() => {
  const handleDeviceBack = (event: PopStateEvent) => {
    // If we have internal history, handle it within the app
    if (navHistory.length > 1) {
      // Prevent browser from leaving the page
      event.preventDefault();
      
      // Trigger internal back navigation
      setNavHistory(prev => {
        const newHistory = [...prev];
        newHistory.pop(); // Remove current
        const previousSection = newHistory[newHistory.length - 1];
        
        setCurrentSection(previousSection);
        setPreviousSection(newHistory.length > 1 ? newHistory[newHistory.length - 2] : null);
        return newHistory;
      });
    }
    // If no history (at root), let the browser exit the app normally
  };

  window.addEventListener('popstate', handleDeviceBack);
  return () => window.removeEventListener('popstate', handleDeviceBack);
}, [navHistory.length]); // Only re-bind when history length changes significantly

// Add this useEffect in DashboardPage component

useEffect(() => {
  const handleChatHistoryUpdate = () => {
    fetchChatHistory();
  };
  
  window.addEventListener('chatHistoryUpdated', handleChatHistoryUpdate);
  
  return () => {
    window.removeEventListener('chatHistoryUpdated', handleChatHistoryUpdate);
  };
}, []);

useEffect(() => {
  const fetchProfileImage = async () => {
    if (session?.user?.id) {
      try {
        const res = await fetch('/api/user/profile-image');
        if (res.ok) {
          const data = await res.json();
          setProfileImage(data.profileImage);
        }
      } catch (error) {
        console.error('Error fetching profile image:', error);
      }
    }
  };
  
  fetchProfileImage();
}, [session?.user?.id]);

useEffect(() => {
  const handleProfileUpdate = () => {
    // Refresh profile image when profile is updated
    if (session?.user?.id) {
      fetch('/api/user/profile-image')
        .then(res => res.json())
        .then(data => {
          if (data.profileImage) {
            setProfileImage(data.profileImage);
          }
        })
        .catch(console.error);
    }
  };

  window.addEventListener('profileUpdated', handleProfileUpdate);
  return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
}, [session?.user?.id]);

useEffect(() => {
  const handleFocus = () => {
    if (session?.user?.id) {
      fetch('/api/user/profile-image')
        .then(res => res.json())
        .then(data => {
          if (data.profileImage) {
            setProfileImage(data.profileImage);
          }
        })
        .catch(console.error);
    }
  };

  window.addEventListener('focus', handleFocus);
  return () => window.removeEventListener('focus', handleFocus);
}, [session?.user?.id]);
// NEW: Timer for timed and exam modes
useEffect(() => {
  let timer: NodeJS.Timeout;
  if (['timed', 'exam'].includes(cbtMode || '') && cbtTimeLeft > 0 && currentSection === 'cbt-question-display') {
    timer = setInterval(() => {
      setCbtTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleCbtEndSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }
  return () => clearInterval(timer);
}, [cbtTimeLeft, cbtMode, currentSection]);
useEffect(() => {
  if (!cbtQuestions.length) return;
  cbtQuestions.forEach(async (q) => {
    const res = await fetch(`/api/cbt-option-stats?questionId=${q.id}`);
    if (!res.ok) return;
    const { stats }: { stats: OptionStats[] } = await res.json();
    setCbtOptionPercentages((prev) => ({ ...prev, [q.id]: stats }));
  });
}, [cbtQuestions]);
  useEffect(() => {
  const mql = window.matchMedia('(min-width: 768px)');
  setIsSidebarOpen(mql.matches);
  const listener = (e: MediaQueryListEvent) => setIsSidebarOpen(e.matches);
  mql.addEventListener('change', listener);
  return () => mql.removeEventListener('change', listener);
}, []);
  const debugPatientSelection = () => {
  console.log('=== DEBUG PATIENT SELECTION ===');
  console.log('Current Session Type:', currentSessionType);
  console.log('Total Patients:', patients.length);
  console.log('Total Cases:', patientCases.length);
  console.log('Station Configs:', stationConfigs);
  // Log patients by session type
  const patientsByType = patients.filter(p => {
    const caseItem = patientCases.find(c => c.id === p.caseId);
    return caseItem && caseItem.sessionType === currentSessionType;
  });
  console.log('Patients matching session type:', patientsByType.length);
  console.log('Patients details:', patientsByType);
  // Log cases by session type
  const casesByType = patientCases.filter(c => c.sessionType === currentSessionType);
  console.log('Cases matching session type:', casesByType.length);
  console.log('Cases details:', casesByType);
};
  const startSimulation = useCallback(() => {
     console.log('=== START SIMULATION DEBUG ===');
  console.log('Selected Stations:', selectedStations);
  console.log('Station Configs Length:', stationConfigs.length);
  console.log('Station Configs:', stationConfigs);
  // Ensure stationConfigs has the correct number of stations
  const actualStationConfigs = [...stationConfigs];
  if (actualStationConfigs.length < selectedStations) {
    console.warn(`Fixing station configs: expected ${selectedStations}, got ${actualStationConfigs.length}`);
    for (let i = actualStationConfigs.length; i < selectedStations; i++) {
      actualStationConfigs.push({ index: i, isAllDepartments: false, departments: [], cases: {} });
    }
  }
  const computePatients = () => {
    const patientsList: {index: number, patient: Patient}[] = [];
    const usedPatientIds = new Set<string>();
    console.log('=== PATIENT SELECTION DEBUG ===');
    console.log('Session Type:', currentSessionType);
    console.log('Total Patients:', patients.length);
    console.log('Total Cases:', patientCases.length);
    console.log('Selected Stations:', selectedStations);
    console.log('Actual Actual Configs:', actualStationConfigs);
    // Get all patients that match the current session type
    const allEligiblePatients = patients.filter(p => {
      const caseItem = patientCases.find(c => c.id === p.caseId);
      return caseItem && caseItem.sessionType === currentSessionType;
    });
    console.log('Eligible patients for session type:', allEligiblePatients.length, allEligiblePatients);
    // Early validation for insufficient patients
    if (allEligiblePatients.length < selectedStations) {
      const maxStations = allEligiblePatients.length;
      toast.error(`Not enough unique patients! You selected ${selectedStations} stations but only have ${maxStations} available patients. Please reduce to ${maxStations} station(s) or add more patients.`);
      return [];
    }
    const failedStations: number[] = [];
    actualStationConfigs.forEach((config, i) => {
      console.log(`--- Processing Station ${i + 1} ---`);
      console.log('Config:', config);
      let availablePatients: Patient[] = [];
      // If no departments selected OR all departments selected, use all all eligible patients
      if (config.departments.length === 0 || config.isAllDepartments) {
        console.log(`Using all eligible eligible patients (${allEligiblePatients.length} available)`);
        availablePatients = [...allEligiblePatients];
      } else {
        // Specific departments selected
        console.log(`Processing ${config.departments.length} departments`);
  
        config.departments.forEach(deptId => {
          const deptCases = patientCases.filter(c =>
            c.departmentId === deptId && c.sessionType === currentSessionType
          );
    
          console.log(`Department ${deptId}: ${deptCases.length} cases`);
    
          let caseIdsToUse: string[];
    
          if (config.cases[deptId] && config.cases[deptId].length > 0) {
            // Use selected cases
            caseIdsToUse = config.cases[deptId];
            console.log(`Using selected cases:`, caseIdsToUse);
          } else {
            // Use all cases in department
            caseIdsToUse = deptCases.map(c => c.id);
            console.log(`Using all cases in department:`, caseIdsToUse);
          }
    
          const deptPatients = allEligiblePatients.filter(p =>
            caseIdsToUse.includes(p.caseId)
          );
    
          console.log(`Found ${deptPatients.length} patients for department ${deptId}`);
          availablePatients.push(...deptPatients);
        });
      }
      // Remove duplicates and used patients
      availablePatients = availablePatients
        .filter((patient, index, self) => index === self.findIndex(p => p.id === patient.id))
        .filter(p => !usedPatientIds.has(p.id));
      console.log(`Station ${i + 1} - Final available patients:`, availablePatients.length, availablePatients);
      if (availablePatients.length === 0) {
        console.error(`No patients available for station ${i + 1}`);
        failedStations.push(i + 1);
        return;
      }
      const selectedPatient = availablePatients[Math.floor(Math.random() * availablePatients.length)];
      usedPatientIds.add(selectedPatient.id);
      patientsList.push({index: i, patient: selectedPatient});
      console.log(`✅ Selected patient for station ${i + 1}:`, selectedPatient.name);
    });
    console.log('=== FINAL PATIENT LIST ===', patientsList);
    // Check if we successfully assigned patients to all stations
    if (patientsList.length < selectedStations) {
      if (failedStations.length > 0) {
        toast.error(`Stations ${failedStations.join(', ')} could not be assigned patients. Only ${patientsList.length} out of ${selectedStations} stations are ready.`);
      } else {
        toast.error(`Only ${patientsList.length} out of ${selectedStations} stations could be assigned patients.`);
      }
      return [];
    }
    return patientsList;
  };
  const patientsList = computePatients();
  if (patientsList.length === 0) {
    return;
  }
  console.log('Successfully assigned patients to all stations:', patientsList);
  // Save stations and proceed
  const saveStations = async () => {
    if (!currentSession?.id) {
      toast.error('Session ID not available.');
      return;
    }
    try {
      await fetch(`/api/sessions/${currentSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stations: patientsList.map(({index, patient}) => ({index, patientId: patient.id}))
        }),
      });
      setStationPatients(patientsList);
      setCurrentStation(0);
      switchSection('stations-info');
    } catch (e) {
      toast.error('Failed to save station configurations.');
      console.error(e);
    }
  };
  saveStations();
}, [stationConfigs, patientCases, patients, currentSessionType, selectedStations, currentSession]);

useEffect(() => {
  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowLogoutModal(false);
    }
  };
  
  if (showLogoutModal) {
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }
}, [showLogoutModal]);

// In your dashboard.tsx or main layout
useEffect(() => {
  const checkForLeakedSessions = () => {
    const activeKeys = Object.keys(localStorage).filter(k => k.startsWith('vapi_session_'));
    if (activeKeys.length > 0) {
      // Simple message that vanishes after 4 seconds
      toast.message('Voice session active', {
        description: `${activeKeys.length} session(s) running in background`,
        duration: 4000,
        icon: '🔊',
      });
      
      // Optional: Auto-cleanup without asking
      activeKeys.forEach(key => localStorage.removeItem(key));
    }
  };

  checkForLeakedSessions();
}, []);
// Add this with your other useEffect hooks, around line 2900 (where you have other useEffects)
useEffect(() => {
  // Check for section from query params
  const urlSection = searchParams.get('section');
  
  if (urlSection) {
    // Convert the section string to a valid SectionKey
    const validSectionKeys: SectionKey[] = [
      'selection', 'chat-history', 'settings', 'forum', 'cases',
      'clerking', 'counselling', 'physical_exam', 'flashcards-departments',
      'cbt-examination', 'cbt-intro', 'cbt-mode', 'cbt-question-display'
    ];
    
    if (validSectionKeys.includes(urlSection as SectionKey)) {
      // Use a small delay to ensure component is fully mounted
      setTimeout(() => {
        switchSection(urlSection as SectionKey);
      }, 100);
    }
  }
}, [searchParams]);

// Add this useEffect to handle stored sections
// useEffect(() => {
//   // Check for stored section from other pages
//   const storedSection = sessionStorage.getItem('dashboardSection');
//   const storedCbtType = sessionStorage.getItem('cbtType');
  
//   if (storedSection && storedSection !== 'tokens') { 
//     console.log('Navigating to stored section:', storedSection);
    
//     // Convert to valid SectionKey
//     const sectionMap: Record<string, SectionKey> = {
//       'selection': 'selection',
//       'chat-history': 'chat-history',
//       'settings': 'settings',
//       'forum': 'forum',
//       'cases': 'cases',
//       'clerking': 'clerking',
//       'counselling': 'counselling',
//       'physical_exam': 'physical_exam',
//       'flashcards-departments': 'flashcards-departments',
//       'flashcards-saved': 'flashcards-saved',
//       'cbt-examination': 'cbt-examination',
//     };
    
//     const validSection = sectionMap[storedSection] || 'selection';
    
//     // Clear the stored value first
//     sessionStorage.removeItem('dashboardSection');
    
//     // Set the section
//     setTimeout(() => {
//       switchSection(validSection);
      
//       // Handle CBT type if specified
//       if (storedCbtType) {
//         setCbtType(storedCbtType as 'mdcn' | 'mbbs' | 'smart');
//         sessionStorage.removeItem('cbtType');
//       }
//     }, 100);
//   }
// }, []);

// // Also handle URL parameters
// useEffect(() => {
//   const urlSection = searchParams.get('section');
//   if (urlSection) {
//     console.log('URL Section:', urlSection);
    
//     // Small delay to ensure component is mounted
//     setTimeout(() => {
//       // Map URL sections to internal sections
//       if (urlSection === 'tokens') {
//         // For tokens, make sure HomeSection shows token content
//         switchSection('selection');
//         // You might want to auto-scroll to tokens section in HomeSection
//       } else {
//         const validSection = urlSection as SectionKey;
//         if (isValidSectionKey(validSection)) {
//           switchSection(validSection);
//         }
//       }
//     }, 150);
//   }
// }, [searchParams]);

// Helper function to check if a string is a valid SectionKey

const isValidSectionKey = (key: string): key is SectionKey => {
  const validKeys: SectionKey[] = [
    'selection', 'clerking', 'counselling', 'physical_exam', 'flashcards-departments',
    'flashcards-create-department', 'flashcards-create-topic', 'flashcards-topic-list',
    'flashcards-deck-config', 'flashcards-session', 'flashcards-review', 'flashcards-saved',
    'stations-info', 'cbt-history', 'voice-session', 'dashboard', 'chat-history',
    'cases', 'forum', 'settings', 'cbt-examination', 'cbt-intro', 'cbt-mode',
    'cbt-question-display', 'cbt-feedback', 'cbt-summary', 'cbt-create-category',
    'cbt-create-question'
  ];
  return validKeys.includes(key as SectionKey);
};
// Add this near your other useEffect hooks
useEffect(() => {
  const storedTheme = localStorage.getItem('theme');
  if (storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
}, []);

// Add with your other useEffect hooks
useEffect(() => {
  // Theme persistence
  const storedTheme = localStorage.getItem('theme');
  if (storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
  
  // Sidebar initialization
  const mql = window.matchMedia('(min-width: 768px)');
  setIsSidebarOpen(mql.matches);
  
  const listener = (e: MediaQueryListEvent) => setIsSidebarOpen(e.matches);
  mql.addEventListener('change', listener);
  
  return () => mql.removeEventListener('change', listener);
}, []);
// Add this useEffect
useEffect(() => {
  // Create portal root if it doesn't exist
  if (typeof document !== 'undefined') {
    let portalRoot = document.getElementById('loading-portal');
    if (!portalRoot) {
      portalRoot = document.createElement('div');
      portalRoot.id = 'loading-portal';
      portalRoot.className = 'fixed z-[100]';
      document.body.appendChild(portalRoot);
    }
    setLoadingPortalRoot(portalRoot);
  }
  
  return () => {
    // Cleanup on unmount
    if (loadingPortalRoot && loadingPortalRoot.parentNode) {
      loadingPortalRoot.parentNode.removeChild(loadingPortalRoot);
    }
  };
}, []);
const handleExitVoiceSession = () => {
  // Clear voice session data to unmount the component
  setVoiceSessionData(null);
  
  // Clear localStorage for this chat
  if (currentChat?.id) {
    localStorage.removeItem(`vapi_session_${currentChat.id}`);
    localStorage.removeItem(`duration_${currentChat.id}`);
    localStorage.removeItem(`chat_${currentChat.id}`);
  }
  
  setCurrentChat(null);
  
  // Return to the appropriate section
  if (currentStation < selectedStations - 1) {
    setCurrentStation(currentStation + 1);
    setCurrentSection('stations-info');
  } else {
    setCurrentSection('clerking');
    setCurrentSession(null);
    setStationPatients([]);
  }
};

const getExistingChatForStation = async (sessionId: string, stationIndex: number): Promise<Chat | null> => {
  try {
    const res = await fetch(`/api/chats?sessionId=${sessionId}&stationIndex=${stationIndex}`, {
      credentials: 'include',
    });
    if (res.ok) {
      const chats = await res.json();
      if (chats && chats.length > 0) {
        return chats[0];
      }
    }
  } catch (error) {
    console.error('Error checking existing chat:', error);
  }
  return null;
};

 const handleStartStationSimulation = async () => {
  const currentPatient = stationPatients[currentStation]?.patient;
  if (!currentPatient) {
    toast.error('No patient available for this station.');
    return;
  }
  
  if (!currentSession || !session?.user?.id || !stationPatients[currentStation]?.patient) {
    toast.error('Cannot start simulation: Missing session, user, or patient.');
    return;
  }
  
  // ✅ CRITICAL: Clear existing voice session data FIRST
  setVoiceSessionData(null);
  setCurrentChat(null);
  
  // Clear any stale localStorage for previous sessions
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('vapi_session_')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Small delay to ensure cleanup
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // ✅ CHECK FOR EXISTING CHAT FIRST
  const existingChat = await getExistingChatForStation(currentSession.id, currentStation);
  
  if (existingChat && existingChat.status === 'incomplete') {
    // Resume existing chat
    console.log('🔄 Resuming existing chat:', existingChat.id);
    
    // Fetch messages for this chat
    const messagesRes = await fetch(`/api/messages?chatId=${existingChat.id}`, {
      credentials: 'include',
    });
    
    let existingMessages = [];
    if (messagesRes.ok) {
      existingMessages = await messagesRes.json();
    }
    
    // Get stored duration
    const storedDuration = localStorage.getItem(`duration_${existingChat.id}`);
    const durationMinutes = storedDuration ? parseInt(storedDuration, 10) : selectedDuration;
    
    // Calculate elapsed time if there are messages
    let elapsedSeconds = 0;
    if (existingMessages.length > 0) {
      const firstMessageTime = new Date(existingMessages[0].createdAt).getTime();
      const lastMessageTime = new Date(existingMessages[existingMessages.length - 1].createdAt).getTime();
      elapsedSeconds = Math.floor((lastMessageTime - firstMessageTime) / 1000);
    }
    
    // Get voice token
    const voiceTokenRes = await fetch('/api/chat/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        voiceId: pickHumeVoice(currentPatient),
        systemPrompt: `${currentPatient.name}, ${currentPatient.age}-yr-old ${currentPatient.gender} from ${currentPatient.location || 'unknown location'}, presents with: ${currentPatient.condition}. ${currentPatient.prompt || ''} Never mention the name "AI" or any name other than ${currentPatient.name}. Speak only when the student addresses you.`,
      }),
    });
    
    if (!voiceTokenRes.ok) {
      toast.error('Failed to get voice token');
      setShowLoadingPopup(false);
      return;
    }
    
    const { accessToken } = await voiceTokenRes.json();

    if (!accessToken) {
      toast.error('Failed to get voice access token');
      setShowLoadingPopup(false);
      return;
    }
    
    // ✅ CRITICAL: Add a timestamp to force remount
    const voiceSessionKey = `${currentStation}-${existingChat.id}-${Date.now()}`;
    
    setVoiceSessionData({
      accessToken: accessToken,
      patient: currentPatient,
      chatId: existingChat.id,
      type: currentSession.type,
      examSteps: existingChat.examSteps || [],
      stationInfo: { 
        current: existingChat.stationIndex || 0, 
        total: currentSession.numStations || 1 
      },
      durationMinutes: durationMinutes,
      mode: sessionStorage.getItem('current_session_mode') as 'practice' | 'exam' || 'practice',
      existingMessages: existingMessages,
      elapsedTime: elapsedSeconds,
      // remountKey: voiceSessionKey, // ✅ Add this field
    });
    
    setCurrentChat(existingChat);
    setShowLoadingPopup(false);
    switchSection('voice-session');
    return;
  }
  
  await createNewStationChat(currentPatient, currentSession, currentStation);
};

// Add this function in your page.tsx (around line 1200)
const handleCompleteSession = () => {
  // Reset all session-related state
  setVoiceSessionData(null);
  setCurrentChat(null);
  setCurrentSession(null);
  setStationPatients([]);
  setCurrentStation(0);
  
  // Clear all localStorage for this session
  if (currentChat?.id) {
    localStorage.removeItem(`vapi_session_${currentChat.id}`);
    localStorage.removeItem(`duration_${currentChat.id}`);
    localStorage.removeItem(`chat_${currentChat.id}`);
  }
  
  // Redirect back to main section
  setCurrentSection('clerking');
  
  // Show success message
  toast.success('Session completed! Great job!');
  

};
// Add the createNewStationChat helper function
// Replace your createNewStationChat function with this updated version
// In app/dashboard/page.tsx - Complete corrected function
// app/dashboard/page.tsx - Replace your createNewStationChat function

const createNewStationChat = async (patient: Patient, session: SessionType, stationIndex: number) => {
  React.startTransition(() => {
    setCurrentMedicalQuote(getRandomMedicalQuote());
    setLoadingMessage(`Preparing Simulation for ${patient.name}`);
    setShowLoadingPopup(true);
  });
  
  await new Promise(res => setTimeout(res, 0));
  
  // ✅ CRITICAL: Check for existing chat FIRST
  const existingChat = await getExistingChatForStation(session.id, stationIndex);
  
  if (existingChat && existingChat.status === 'incomplete') {
    console.log('🔄 Found existing incomplete chat, resuming instead of creating new');
    
    // Resume existing chat
    const messagesRes = await fetch(`/api/messages?chatId=${existingChat.id}`, {
      credentials: 'include',
    });
    
    let existingMessages = [];
    if (messagesRes.ok) {
      existingMessages = await messagesRes.json();
    }
    
    const storedDuration = localStorage.getItem(`duration_${existingChat.id}`);
    const durationMinutes = storedDuration ? parseInt(storedDuration, 10) : selectedDuration;
    
    let elapsedSeconds = 0;
    if (existingMessages.length > 0) {
      const firstMessageTime = new Date(existingMessages[0].createdAt).getTime();
      const lastMessageTime = new Date(existingMessages[existingMessages.length - 1].createdAt).getTime();
      elapsedSeconds = Math.floor((lastMessageTime - firstMessageTime) / 1000);
    }
    
    const voiceTokenRes = await fetch('/api/chat/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        voiceId: pickHumeVoice(patient),
        systemPrompt: `${patient.name}, ${patient.age}-yr-old ${patient.gender} from ${patient.location || 'unknown location'}, presents with: ${patient.condition}. ${patient.prompt || ''} Never mention the name "AI" or any name other than ${patient.name}. Speak only when the student addresses you.`,
      }),
    });
    
    if (!voiceTokenRes.ok) {
      toast.error('Failed to get voice token');
      setShowLoadingPopup(false);
      return;
    }
    
    const { accessToken } = await voiceTokenRes.json();
    
    const caseItem = patientCases.find(c => c.id === patient.caseId);
    const departmentInfo = departments.find(d => d.id === caseItem?.departmentId);
    const departmentForSession = departmentInfo ? {
      id: departmentInfo.id,
      name: departmentInfo.name,
      slug: departmentInfo.slug
    } : null;
    
    // ✅ CRITICAL: Add a timestamp to force remount
    const voiceSessionKey = `${stationIndex}-${existingChat.id}-${Date.now()}`;
    
    setVoiceSessionData({
      accessToken: accessToken,
      patient: patient,
      chatId: existingChat.id,
      type: session.type,
      examSteps: existingChat.examSteps || [],
      stationInfo: { current: stationIndex, total: selectedStations },
      durationMinutes: durationMinutes,
      mode: sessionStorage.getItem('current_session_mode') as 'practice' | 'exam' || 'practice',
      existingMessages: existingMessages,
      elapsedTime: elapsedSeconds,
      department: departmentForSession,
      // remountKey: voiceSessionKey, // ✅ Add this field
    });
    
    setCurrentChat(existingChat);
    setShowLoadingPopup(false);
    switchSection('voice-session');
    return;
  }
  
  // ✅ Only create new chat if no incomplete chat exists
  const sessionType = session.type;
  const prefix = sessionType === 'clerking' ? 'CLERK' : sessionType === 'counselling' ? 'COUNSEL' : 'EXAM';
  const chatId = generateUUID();
  const title = `${prefix}: Simulation for ${patient.name} - Station ${stationIndex + 1} of ${selectedStations}`;
  
  try {
    const caseItem = patientCases.find(c => c.id === patient.caseId);
    if (!caseItem) {
      toast.error('Case not found for this patient');
      setShowLoadingPopup(false);
      return;
    }
    
    const maxDurationInSeconds = selectedDuration * 60;
    const tokenReservation = await fetch('/api/tokens/reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service: 'voice_chat_session',
        maxQuantity: maxDurationInSeconds,
        metadata: {
          sessionType: sessionType,
          patientId: patient.id,
          maxDuration: maxDurationInSeconds,
          estimatedMaxTokens: Math.ceil(maxDurationInSeconds * 0.05)
        }
      }),
    });

    if (!tokenReservation.ok) {
      const errorData = await tokenReservation.json();
      toast.error(`Insufficient tokens: ${errorData.message}`);
      setShowLoadingPopup(false);
      return;
    }

    const reservationData = await tokenReservation.json();
    
    const chatRes = await fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        id: chatId,
        sessionId: session.id,
        userId: session.userId,
        patientId: patient.id,
        title,
        visibility: 'private',
        status: 'incomplete',
        stationIndex: stationIndex,
        totalStations: selectedStations,
        departmentId: caseItem.departmentId,
        metadata: {
          tokenReservation: {
            reservedAmount: reservationData.reservedAmount,
            maxDuration: maxDurationInSeconds,
            service: 'voice_chat_session'
          }
        }
      }),
    });
    
    if (!chatRes.ok) throw new Error(`Chat create failed: ${chatRes.statusText}`);
    const newChat = await chatRes.json();
    localStorage.setItem(`duration_${newChat.id}`, String(selectedDuration));
    
    let examSteps = [];
    if (sessionType === 'physical_exam') {
      const res = await fetch('/api/generate-exam-steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          condition: patient.condition,
          prompt: patient.prompt || '',
          caseId: patient.caseId
        }),
      });
      
      if (res.ok) {
        const { steps } = await res.json();
        examSteps = steps;
        await fetch(`/api/chats/${newChat.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ examSteps: steps }),
        });
      }
    }
    
    const voiceTokenRes = await fetch('/api/chat/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        voiceId: pickHumeVoice(patient),
        systemPrompt: `${patient.name}, ${patient.age}-yr-old ${patient.gender} from ${patient.location || 'unknown location'}, presents with: ${patient.condition}. ${patient.prompt || ''} Never mention the name "AI" or any name other than ${patient.name}. Speak only when the student addresses you.`,
      }),
    });
    
    if (!voiceTokenRes.ok) {
      toast.error('Failed to get voice token');
      setShowLoadingPopup(false);
      return;
    }
    
    const { accessToken } = await voiceTokenRes.json();

    if (!accessToken) {
      toast.error('Failed to get voice access token');
      setShowLoadingPopup(false);
      return;
    }
    
    const departmentInfo = departments.find(d => d.id === caseItem.departmentId);
    const departmentForSession = departmentInfo ? {
      id: departmentInfo.id,
      name: departmentInfo.name,
      slug: departmentInfo.slug
    } : null;
    
    // ✅ CRITICAL: Add a timestamp to force remount
    const voiceSessionKey = `${stationIndex}-${newChat.id}-${Date.now()}`;
    
    setVoiceSessionData({
      accessToken: accessToken,
      patient: patient,
      chatId: newChat.id,
      type: sessionType,
      examSteps: examSteps,
      stationInfo: { current: stationIndex, total: selectedStations },
      durationMinutes: selectedDuration,
      mode: sessionStorage.getItem('current_session_mode') as 'practice' | 'exam' || 'practice',
      department: departmentForSession,
      // remountKey: voiceSessionKey, // ✅ Add this field
    });
    
    setCurrentChat(newChat);
    setShowLoadingPopup(false);
    switchSection('voice-session');
    
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    toast.error(`Error starting simulation: ${msg}`);
    setShowLoadingPopup(false);
  }
};
  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments', {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch departments: ${res.statusText} (${res.status})`);
      }
      const data = await res.json();
      setDepartments(Array.isArray(data) ? data : []);
    } catch (error: unknown) {
      console.error('Error fetching departments:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setDepartments([]);
      toast.error(`Error fetching departments: ${errorMessage}`);
    }
  };
  const fetchPatientCases = async () => {
    try {
      const res = await fetch('/api/patient-cases', {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch patient cases: ${res.statusText} (${res.status})`);
      }
      const data = await res.json();
      setPatientCases(Array.isArray(data) ? data : []);
    } catch (error: unknown) {
      console.error('Error fetching patient cases:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setPatientCases([]);
      toast.error(`Error fetching patient cases: ${errorMessage}`);
    }
  };
  const fetchPatients = async () => {
    try {
      const res = await fetch('/api/patients', {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch patients: ${res.statusText} (${res.status})`);
      }
      const data = await res.json();
      setPatients(Array.isArray(data) ? data : []);
    } catch (error: unknown) {
      console.error('Error fetching patients:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setPatients([]);
      toast.error(`Error fetching patients: ${errorMessage}`);
    }
  };
  const fetchTopicsByDepartment = async (departmentId: string) => {
    try {
      const res = await fetch(`/api/topics/${departmentId}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch topics: ${res.statusText} (${res.status})`);
      }
      const data = await res.json();
      setTopics(Array.isArray(data) ? data : []);
    } catch (error: unknown) {
      console.error('Error fetching topics:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setTopics([]);
      toast.error(`Error fetching topics: ${errorMessage}`);
    }
  };
  const fetchSavedSessions = async () => {
    try {
      const res = await fetch('/api/sessions/saved', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) {
        if (res.status === 401) {
          console.warn('Unauthorized when fetching saved sessions, session may be invalid');
          setSavedSessions([]);
          return;
        }
        const errorData = await res.json();
        throw new Error(`Failed to fetch saved sessions: ${errorData.error || res.statusText} (${res.status})`);
      }
      const data = await res.json();
      setSavedSessions(Array.isArray(data) ? data : []);
    } catch (error: unknown) {
      console.error('Error fetching saved sessions:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSavedSessions([]);
      toast.error(`Error fetching saved sessions: ${errorMessage}`);
    }
  };
   const refreshTokenBalance = async (fromOperation = false) => {
  try {
    const res = await fetch('/api/tokens/balance', {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    if (res.ok) {
      const data = await res.json();
      setBalance(data.balance);
      
      // Only dispatch event for operation-based updates
      if (fromOperation) {
        const updateBalanceEvent = new CustomEvent('balanceUpdated', {
          detail: { 
            balance: data.balance,
            fromOperation: true,
            timestamp: Date.now()
          }
        });
        window.dispatchEvent(updateBalanceEvent);
      }
      
      return data.balance;
    }
  } catch (error) {
    console.error('Error refreshing token balance:', error);
  }
  return null;
};

const fetchFlashcardQuestions = async (departmentId: string, topic: string, numQuestions: number) => {
  setIsLoadingQuestions(true);
  try {
    // Add null checks for session
    if (!session?.user?.id) {
      toast.error('You must be logged in to generate flashcards');
      return;
    }

    

    // ✅ PROCEED WITH ORIGINAL WORKING CODE
    const res = await fetch(
      `/api/flashcard-questions?departmentId=${departmentId}&topic=${encodeURIComponent(topic)}&num=${numQuestions}`,
      { credentials: 'include' }
    );
    
    if (!res.ok) throw new Error(`Failed to fetch flashcard questions: ${res.statusText} (${res.status})`);
    
    const data = await res.json();
    setFlashcardQuestions(Array.isArray(data) ? data : []);
    
    // Refresh balance
    await refreshTokenBalance();
    
  } catch (error: unknown) {
    console.error('Error fetching flashcard questions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    setFlashcardQuestions([]);
    toast.error(`Error fetching flashcard questions: ${errorMessage}`);
  } finally {
    setIsLoadingQuestions(false);
  }
};
  const fetchFlashcardHistory = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/flashcard-history`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch flashcard history: ${res.statusText} (${res.status})`);
      }
      const data = await res.json();
      setSelectedHistory(Array.isArray(data) ? data : []);
      setShowModal(true);
    } catch (error: unknown) {
      console.error('Error fetching flashcard history:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error fetching flashcard history: ${errorMessage}`);
    }
  };
  const fetchChatHistory = async () => {
    try {
      const res = await fetch('/api/chats/history', {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch chat history: ${res.statusText} (${res.status})`);
      }
      const data = await res.json();
      setChatHistory(Array.isArray(data) ? data : []);
    } catch (error: unknown) {
      console.error('Error fetching chat history:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error fetching chat history: ${errorMessage}`);
    }
  };
  const fetchIncompleteSession = async () => {
  try {
    const res = await fetch('/api/chats/incomplete', { credentials: 'include' })
      .catch(() => ({ ok: false } as Response)); // silence network / 404
    if (!res.ok) return null; // no incomplete row
    const data = await res.json();
    if (!data) return null;
    if (data.patientId) {
      const patientRes = await fetch(`/api/patients/${data.patientId}`, { credentials: 'include' })
        .catch(() => ({ ok: false } as Response));
      if (patientRes.ok) {
        const patient = await patientRes.json();
        return { ...data, patientName: patient.name || 'a patient' };
      }
    }
    return { ...data, patientName: 'a patient' };
  } catch (e) {
    console.warn('Unable to fetch incomplete chat:', e);
    return null;
  }
};
const fetchCbtCategories = async () => {
  if (!cbtType) return;
  
  // For smart type, don't fetch categories from API
  if (cbtType === 'smart') {
    console.log('🤖 Smart type - setting empty categories');
    setCbtCategories([]);
    return;
  }
  
  try {
    const res = await fetch(`/api/cbt-categories?cbtType=${cbtType}`, {
      credentials: 'include',
    });
    
    if (!res.ok) {
      throw new Error('Failed to fetch CBT categories');
    }
    
    const data = await res.json();
    setCbtCategories(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('Error fetching CBT categories:', error);
    setCbtCategories([]);
  }
};
const latestCbtTypeRef = useRef(cbtType);
const fetchCbtQuestions = useCallback(async (categoryId?: string) => {
  if (!cbtType || !session?.user?.id) return;
  
  // For smart type, we don't fetch questions from API
  if (cbtType === 'smart') {
    console.log('🤖 Smart type - using generated questions');
    setLoadingQuestions(false);
    return;
  }
  
  // Token check for CBT questions (only for mdcn/mbbs)
  const tokenCheck = await deductTokensViaAPI(
    'cbt_question',
    cbtNumQuestions || 50,
    { 
      cbtType, 
      categoryId: categoryId || 'all', 
      mode: cbtMode,
      service: 'cbt_question_access'
    }
  );

  if (!tokenCheck.success) {
    toast.error(`Insufficient tokens: ${tokenCheck.message}`);
    setLoadingQuestions(false);
    return;
  }

  setLoadingQuestions(true);
  const requestType = cbtType;
  latestCbtTypeRef.current = requestType;

  const limit =
    cbtMode === 'exam' ? 300
    : cbtMode === 'timed' ? cbtNumQuestions
    : undefined; // practice = unlimited

  const url =
    categoryId && categoryId !== 'all'
      ? `/api/cbt-questions?cbtType=${cbtType}&categoryId=${categoryId}&limit=${limit ?? ''}`
      : `/api/cbt-questions?cbtType=${cbtType}&limit=${limit ?? ''}`;
  
  try {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
      const { message } = await res.json();
      toast.info(message || 'No questions found for this selection.');
      setCbtQuestions([]);
      return;
    }
    const data = await res.json();
    if (latestCbtTypeRef.current !== requestType) return;
    setCbtQuestions(Array.isArray(data) ? data : []);
    
    // Refresh token balance after successful deduction
    await refreshTokenBalance();
    
  } catch (e) {
    console.error(e);
    setCbtQuestions([]);
  } finally {
    setLoadingQuestions(false);
  }
}, [cbtType, cbtMode, cbtNumQuestions, session, refreshTokenBalance]); 

const handleCbtCategorySelect = (categoryId: string) => {
  // For smart type, handle differently
  if (cbtType === 'smart') {
    if (generatedQuestions.length === 0) {
      toast.error('Please generate questions first');
      setShowSmartInputModal(true);
      return;
    }
    setCbtSelectedCategory('smart-generated');
    setCbtQuestions(generatedQuestions);
    switchSection('cbt-question-display');
    setCbtCurrentQuestionIndex(0);
    setCbtAnswers({});
    setCbtSelectedAnswer(null);
    return;
  }
  
  // Original logic for mdcn/mbbs
  setCbtSelectedCategory(categoryId);
  fetchCbtQuestions(categoryId === 'all' ? undefined : categoryId);
  switchSection('cbt-question-display');
  setCbtCurrentQuestionIndex(0);
  setCbtAnswers({});
  setCbtSelectedAnswer(null);
  if (cbtMode === 'timed') {
    setCbtTimeLeft(cbtDuration * 60);
  } else if (cbtMode === 'exam') {
    setCbtTimeLeft(180 * 60);
  }
};
const handleSmartGenerateQuestions = async () => {
  if (!smartInputText.trim() && !smartUploadedFile) {
    toast.error('Please enter text or upload a document');
    return;
  }

  if (smartInputText.length > 5000) {
    toast.error('Text input exceeds 5000 characters limit');
    return;
  }

  setIsGeneratingQuestions(true);
  setCurrentMedicalQuote(getRandomMedicalQuote());

  try {
    const formData = new FormData();
    
    if (smartInputText) {
      formData.append('text', smartInputText);
    }
    
    if (smartUploadedFile) {
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];
      
      if (!allowedTypes.includes(smartUploadedFile.type)) {
        toast.error('Invalid file type. Please upload PDF, DOC, DOCX, or TXT files only.');
        setIsGeneratingQuestions(false);
        return;
      }
      
      formData.append('file', smartUploadedFile);
    }

    // Token check first
    const tokenCheck = await fetch('/api/tokens/deduct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service: 'smart_question_generation',
        quantity: 1,
        metadata: { service: 'smart_question_generation' }
      }),
    }).then(res => res.json());

    if (!tokenCheck.success) {
      toast.error(`Insufficient tokens: ${tokenCheck.message}`);
      setIsGeneratingQuestions(false);
      return;
    }

    // Generate questions
    console.log('🚀 Calling generate-smart-questions API');
    const response = await fetch('/api/generate-smart-questions', {
      method: 'POST',
      body: formData,
    });

    console.log('📊 API Response status:', response.status);
    
    if (!response.ok) {
      let errorText = 'Failed to generate questions';
      try {
        const errorData = await response.json();
        errorText = errorData.error || errorText;
      } catch (e) {
        errorText = await response.text();
      }
      throw new Error(errorText);
    }

    const data = await response.json();
    console.log('✅ Generated questions:', data);
    
    if (data.questions && Array.isArray(data.questions)) {
      const formattedQuestions = data.questions.map((q: any, index: number) => ({
        id: `smart-${Date.now()}-${index}`,
        content: q.question,
        explanation: q.explanation || 'Explanation not available',
        options: q.options.map((opt: string, idx: number) => ({
          text: opt,
          correct: idx === q.correctAnswer
        })),
        category: { name: 'Smart Generated', id: 'smart-generated' }
      }));

      setGeneratedQuestions(formattedQuestions);
      setCbtQuestions(formattedQuestions);
      
      setSmartInputText('');
      setSmartUploadedFile(null);
      
      setCbtMode('practice');
      setShowSmartInputModal(false);
      switchSection('cbt-mode');
      
      toast.success(`Generated ${formattedQuestions.length} questions successfully!`);
    } else {
      throw new Error('Invalid response format');
    }
    
  } catch (error: any) {
    console.error('❌ Error generating questions:', error);
    toast.error(error.message || 'Failed to generate questions');
  } finally {
    setIsGeneratingQuestions(false);
  }
};

// Add file upload handler
const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    setSmartUploadedFile(file);
  }
};

// Add clear file handler
const handleClearFile = () => {
  setSmartUploadedFile(null);
};

const createCbtSession = async () => {
  try {
    // For smart type, create a temporary session
    if (cbtType === 'smart') {
      const tempSessionId = `smart-${Date.now()}`;
      setCurrentCbtSessionId(tempSessionId);
      return tempSessionId;
    }
    
    const sessionData = {
      userId: session?.user?.id!,
      cbtType: cbtType!,
      mode: cbtMode!,
      categoryId: cbtSelectedCategory === 'all' ? null : cbtSelectedCategory,
      numQuestions: cbtQuestions.length,
      duration: cbtMode === 'practice' ? null : cbtDuration,
    };

    const response = await fetch('/api/cbt-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData),
    });

    if (!response.ok) throw new Error('Failed to create session');
    const newSession = await response.json();
    setCurrentCbtSessionId(newSession.id);
    return newSession.id;
  } catch (error) {
    console.error('Error creating CBT session:', error);
    toast.error('Failed to start session');
    return null;
  }
};
// In your handleCbtAnswerSelect function in CbtSection
const handleCbtAnswerSelect = async (questionIndex: number, answerIndex: number) => {
  setCbtSelectedAnswer(answerIndex);
  
  // Update local answers state
  setCbtAnswers(prev => ({
    ...prev,
    [questionIndex]: answerIndex
  }));
  
  // For smart type, save to sessionStorage instead of API
  if (cbtType === 'smart') {
    const answerKey = `smart_answer_${cbtQuestions[questionIndex].id}`;
    sessionStorage.setItem(answerKey, answerIndex.toString());
  }
  // For mdcn/mbbs, save via API
  else if (cbtSessionId) {
    await fetch('/api/save-cbt-selection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: cbtQuestions[questionIndex].id,
        selectedOption: answerIndex,
        sessionId: cbtSessionId,
        firstAttempt: true
      })
    });
  }
  
  // Update local answers state
  setCbtAnswers(prev => ({
    ...prev,
    [questionIndex]: answerIndex
  }));
};


// In CbtSection.tsx - Completely replace handleCbtCheckAnswer
// Update in DashboardPage.tsx
const handleCbtCheckAnswer = async () => {
  if (cbtSelectedAnswer === null || cbtIsChecking) return;
  
  setCbtIsChecking(true);
  const currentQuestion = cbtQuestions[cbtCurrentQuestionIndex];
  
  const correctIndex = currentQuestion.options.findIndex((opt: { text: string; correct: boolean }) => opt.correct);
  const isCorrect = cbtSelectedAnswer === correctIndex;

  try {
    // Reset states
    setCbtAiExplanation(''); // Clear previous AI explanation
    setCurrentMedicalQuote(getRandomMedicalQuote());
    
    // Set basic feedback IMMEDIATELY
    const basicFeedback = {
      isCorrect,
      explanation: currentQuestion.explanation,
      correctOption: correctIndex,
    };

    setCbtFeedback(basicFeedback);
    setShowCbtFeedbackModal(true);
    setIsAnalysing(true);
    
    console.log('🚀 Showing feedback immediately, AI loading in background...');
    
    // 🚀 NON-BLOCKING: Don't wait for AI, show result immediately
    setCbtIsChecking(false); // Release button immediately

    // Start AI explanation in background with immediate placeholder
    setTimeout(async () => {
      try {
        const response = await fetch('/api/cbt-explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: currentQuestion.content,
            selected: currentQuestion.options[cbtSelectedAnswer]?.text,
            correct: currentQuestion.options[correctIndex]?.text,
            explanation: currentQuestion.explanation,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ AI Explanation received');
          
          // Update with typing animation effect
          setCbtAiExplanation(data.aiExplanation);
          
          // Get stats in background
          fetch(`/api/cbt-option-stats?questionId=${currentQuestion.id}`)
            .then(res => res.json())
            .then(data => {
              setCbtOptionPercentages(prev => ({
                ...prev,
                [currentQuestion.id]: data.stats || []
              }));
            })
            .catch(console.error);
        }
      } catch (error) {
        console.error('AI failed:', error);
        setCbtAiExplanation('AI insights are currently being processed. Please review the explanation above.');
      } finally {
        setIsAnalysing(false);
      }
    }, 100); // Small delay to ensure UI is updated first
  } catch (error) {
    console.error('Error:', error);
    toast.error('Failed to check answer');
    setCbtIsChecking(false);
    setIsAnalysing(false);
  }
};
const saveCurrentAnswer = async () => {
  if (cbtSelectedAnswer === null) return;
  
  const question = cbtQuestions[cbtCurrentQuestionIndex];
  if (!question) return;

  try {
    await fetch('/api/save-cbt-selection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: question.id,
        selectedOption: cbtSelectedAnswer,
        firstAttempt: true,
      }),
    });
  } catch (error) {
    console.error('Failed to save answer:', error);
  }
};
const handleCbtNextQuestion = async () => {
  // Save current answer before moving
  if (cbtMode !== 'practice' && cbtSelectedAnswer !== null) {
    await saveCurrentAnswer();
  }
  
  if (cbtCurrentQuestionIndex < cbtQuestions.length - 1) {
    setCbtCurrentQuestionIndex(prev => prev + 1);
    setCbtSelectedAnswer(null);
  } else {
    setCbtShowEndConfirm(true);
  }
};

const handleCbtPrevQuestion = async () => {
  // Save current answer before moving
  if (cbtMode !== 'practice' && cbtSelectedAnswer !== null) {
    await saveCurrentAnswer();
  }
  
  if (cbtCurrentQuestionIndex > 0) {
    setCbtCurrentQuestionIndex(prev => prev - 1);
    setCbtSelectedAnswer(null);
  }
};

const handleCbtJumpToQuestion = async (index: number) => {
  // Save current answer before jumping
  if (cbtMode !== 'practice' && cbtSelectedAnswer !== null) {
    await saveCurrentAnswer();
  }
  
  setCbtCurrentQuestionIndex(index);
  setCbtSelectedAnswer(null);
};

// In CbtSection.tsx - Update handleCbtEndSession to ensure selections are saved
const handleCbtEndSession = async () => {
  setIsProcessing(true);
    // Use React.startTransition
  React.startTransition(() => {
    setCurrentMedicalQuote(getRandomMedicalQuote());
  });
  
  
  try {
    const totalQuestions = cbtQuestions.length;
    const unanswered = cbtQuestions.filter((_, i) => cbtAnswers[i] === undefined).length;
    const attemptedQuestions = totalQuestions - unanswered;
    const correctAnswers = cbtQuestions.filter((q, i) => cbtAnswers[i] !== undefined && q.options[cbtAnswers[i]].correct).length;
    
    // FIXED: Calculate percentages correctly
    const successRate = attemptedQuestions === 0 ? 0 : Math.round((correctAnswers / attemptedQuestions) * 100);
    
    // FIXED: Final score logic - always based on total questions for timed/exam, attempted for practice
    const finalScore = ['timed', 'exam'].includes(cbtMode || '') 
      ? Math.round((correctAnswers / totalQuestions) * 100)
      : successRate;

    console.log('📊 [SESSION DEBUG] Creating session with:', {
      totalQuestions,
      attemptedQuestions, 
      correctAnswers,
      unanswered,
      successRate,
      finalScore,
      mode: cbtMode
    });

    // Create session first
    const sessionRes = await fetch('/api/cbt-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cbtType: cbtType,
        mode: cbtMode,
        categoryId: cbtSelectedCategory === 'all' ? null : cbtSelectedCategory,
        numQuestions: totalQuestions,
        duration: cbtDuration,
        score: finalScore, // This is the final score that will be displayed
        correctAnswers: correctAnswers,
        wrongAnswers: attemptedQuestions - correctAnswers,
        unanswered: unanswered,
      }),
    });

    if (!sessionRes.ok) {
      const errorText = await sessionRes.text();
      throw new Error(`Session creation failed: ${errorText}`);
    }

    const sessionData = await sessionRes.json();
    const sessionId = sessionData.id;
    setCurrentCbtSessionId(sessionId);

    console.log('✅ [SESSION DEBUG] Created CBT session:', sessionId);

    // 🚨 CRITICAL FIX: Save ALL selections with session ID
    const savePromises = [];
    
    for (let i = 0; i < cbtQuestions.length; i++) {
      const question = cbtQuestions[i];
      const selectedOption = cbtAnswers[i];
      
      if (selectedOption !== undefined) {
        console.log(`💾 [SESSION DEBUG] Saving selection for question ${i}:`, {
          questionId: question.id,
          selectedOption,
          sessionId
        });
        
        savePromises.push(
          fetch('/api/save-cbt-selection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              questionId: question.id,
              selectedOption: selectedOption,
              sessionId: sessionId, // 🚨 MUST include sessionId
              firstAttempt: true,
            }),
          }).then(async (res) => {
            if (!res.ok) {
              const error = await res.text();
              console.error(`❌ Failed to save selection ${i}:`, error);
            } else {
              console.log(`✅ Saved selection ${i}`);
            }
            return res;
          })
        );
      }
    }

    console.log(`💾 [SESSION DEBUG] Saving ${savePromises.length} selections...`);
    
    // Wait for ALL selections to be saved
    const results = await Promise.allSettled(savePromises);
    const successfulSaves = results.filter(r => r.status === 'fulfilled').length;
    
    console.log('✅ [SESSION DEBUG] Selection save results:', {
      total: savePromises.length,
      successful: successfulSaves,
      failed: results.length - successfulSaves
    });

    // Continue with feedback and summary...
    const summaryMessages = cbtQuestions.map((q, i) => {
  const selected = cbtAnswers[i];
  const isCorrect = selected !== undefined && q.options[selected].correct;
  return `Q${i+1}: ${selected !== undefined ? (isCorrect ? 'CORRECT' : 'WRONG') : 'UNANSWERED'}`;
}).join(' | ');

const feedbackRes = await fetch('/api/cbt-feedback', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    summaryMessages,
    correctAnswers,
    totalQuestions,
    unansweredQuestions: unanswered,
    finalScore: finalScore, // 🚨 ADD THIS LINE - Send the actual final score
    mode: cbtMode, // 🚨 ADD THIS LINE - Send the mode for context
  }),
});

if (feedbackRes.ok) {
  const feedbackData = await feedbackRes.json();
  setCbtOverallFeedback(feedbackData.feedback);
}

    setCbtShowSummary(true);
    setCbtShowEndConfirm(false);

  } catch (error) {
    console.error('❌ [SESSION DEBUG] Error ending session:', error);
    toast.error('Failed to end session');
  } finally {
    setIsProcessing(false);
    // Add small delay before hiding
    setTimeout(() => {
      React.startTransition(() => {
        setShowLoadingPopup(false);
      });
    }, 500);
  }
};
// Keep the fallback function
const generateFallbackFeedback = (finalScore: number, successRate: number, mode: string) => {
  let feedback = '';
  
  if (finalScore >= 80) {
    feedback = `Excellent performance! You scored ${finalScore}% in ${mode} mode. `;
    if (successRate >= 90) {
      feedback += 'Your accuracy on attempted questions is outstanding. Keep up the great work!';
    } else {
      feedback += 'Consider practicing more to improve your completion rate.';
    }
  } else if (finalScore >= 60) {
    feedback = `Good effort! You scored ${finalScore}% in ${mode} mode. `;
    feedback += 'Focus on areas where you struggled to improve your performance.';
  } else {
    feedback = `You scored ${finalScore}% in ${mode} mode. `;
    feedback += 'This is a learning opportunity. Review the questions you missed and try again.';
  }
  
  return feedback;
};
useEffect(() => {
  if (cbtQuestions.length > 0 && session?.user?.id && !cbtSessionId) {
    createCbtSession();
  }
}, [cbtQuestions, session, cbtSessionId]);
const handleCreateCbtCategory = async () => {
  if (!newCbtCategoryName || !newCbtCategorySlug || !cbtType) {
    toast.error('Please provide category name and slug');
    return;
  }
  try {
    const res = await fetch('/api/cbt-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: newCbtCategoryName,
        slug: newCbtCategorySlug,
        cbtType,
      }),
    });
    if (!res.ok) throw new Error('Failed to create CBT category');
    toast.success('CBT category created successfully');
    setNewCbtCategoryName('');
    setNewCbtCategorySlug('');
    await fetchCbtCategories();
  } catch (error) {
    console.error('Error creating CBT category:', error);
    toast.error('Failed to create CBT category');
  }
};
const handleCreateCbtQuestion = async () => {
  if (!newCbtQuestionCategoryId || !newCbtQuestionContent || !newCbtQuestionExplanation) {
    toast.error('Please fill in all required fields');
    return;
  }
  const correctOptions = newCbtQuestionOptions.filter(opt => opt.correct);
  if (correctOptions.length !== 1) {
    toast.error('Please select exactly one correct answer');
    return;
  }
  try {
    const res = await fetch('/api/cbt-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        categoryId: newCbtQuestionCategoryId,
        content: newCbtQuestionContent,
        explanation: newCbtQuestionExplanation,
        figureUrl: newCbtQuestionFigureUrl || null,
        options: newCbtQuestionOptions.filter(opt => opt.text.trim() !== ''),
      }),
    });
    if (!res.ok) throw new Error('Failed to create CBT question');
    toast.success('CBT question created successfully');
    setNewCbtQuestionCategoryId('');
    setNewCbtQuestionContent('');
    setNewCbtQuestionExplanation('');
    setNewCbtQuestionFigureUrl('');
    setNewCbtQuestionOptions([
      { text: '', correct: false },
      { text: '', correct: false },
      { text: '', correct: false },
      { text: '', correct: false },
      { text: '', correct: false },
    ]);
    await fetchCbtQuestions();
  } catch (error) {
    console.error('Error creating CBT question:', error);
    toast.error('Failed to create CBT question');
  }
};
const handleNewCbtOptionChange = (index: number, field: 'text' | 'correct', value: string | boolean) => {
  setNewCbtQuestionOptions(prev =>
    prev.map((opt, i) =>
      i === index ? { ...opt, [field]: value } : opt
    )
  );
};
const handleImportCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file || !cbtType) return;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('cbtType', cbtType);
  try {
    const res = await fetch('/api/import-questions', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to import questions');
    toast.success('Questions imported successfully');
    await fetchCbtQuestions();
  } catch (error) {
    console.error('Error importing questions:', error);
    toast.error('Failed to import questions');
  }
};
const handleImagePick = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  if (!res.ok) { toast.error('Upload failed'); return; }
  const { url } = await res.json();
  setPreviewImageUrl(url); 
  setNewPatientImage(url); 
};
  const confirmDeleteChat = (chatId: string) => {
    setChatToDelete(chatId);
    setShowDeleteConfirm(true);
  };
  const handleDeleteChat = async () => {
    if (!chatToDelete) return;
    try {
      const res = await fetch(`/api/chats/${chatToDelete}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`Failed to delete chat: ${res.statusText} (${res.status})`);
      }
      toast.success('Chat deleted successfully');
      fetchChatHistory();
    } catch (error: unknown) {
      console.error('Error deleting chat:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error deleting chat: ${errorMessage}`);
    } finally {
      setShowDeleteConfirm(false);
      setChatToDelete(null);
    }
  };
  const handleTerminateIncomplete = async () => {
  if (!incompleteSession) return;
  // If the row still exists, mark completed; if not, just move on.
  try {
    const check = await fetch(`/api/chats/${incompleteSession.id}`, { credentials: 'include' });
       if (check.ok) {
      await fetch(`/api/chats/${incompleteSession.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'completed' }),
      }).catch(() => {}); // ← silence 404
    }
  } catch (e) {
    // ignore – row missing is fine
  }
  // Always clean up and start fresh simulation
  setIncompleteSession(null);
  setShowIncompletePrompt(false);
  localStorage.removeItem(`chat_${incompleteSession.id}`);
  resolverRef.current?.(false);
  startSimulation();
};
  const handleContinueIncomplete = () => {
    if (!incompleteSession) return;
    router.push(`/chat/${incompleteSession.id}`);
    setShowIncompletePrompt(false);
    resolverRef.current?.(true);
  };
  // In app/dashboard/page.tsx, find the handleResumeChat function and replace it with this:

const handleResumeChat = async (chatId: string) => {
  setCurrentMedicalQuote(getRandomMedicalQuote());
  setLoadingMessage('Loading conversation history...');
  setShowLoadingPopup(true);
  
  try {
    // Step 1: Fetch chat
    const chatRes = await fetch(`/api/chats/${chatId}`, {
      credentials: 'include',
    });
    if (!chatRes.ok) throw new Error('Failed to load chat');
    const chat = await chatRes.json();
    
    // Step 2: Fetch patient
    const patientRes = await fetch(`/api/patients/${chat.patientId}`, {
      credentials: 'include',
    });
    if (!patientRes.ok) throw new Error('Failed to load patient');
    const patient = await patientRes.json();
    
    // Step 3: Fetch session
    const sessionRes = await fetch(`/api/sessions/${chat.sessionId}`, {
      credentials: 'include',
    });
    if (!sessionRes.ok) throw new Error('Failed to load session');
    const session = await sessionRes.json();
    
    // Step 4: Fetch department info if available
    let departmentInfo = null;
    if (chat.departmentId) {
      const deptRes = await fetch(`/api/departments/${chat.departmentId}`, {
        credentials: 'include',
      });
      if (deptRes.ok) {
        departmentInfo = await deptRes.json();
      }
    }
    
    // Step 5: Fetch existing messages
    const messagesRes = await fetch(`/api/messages?chatId=${chat.id}`, {
      credentials: 'include',
    });
    let existingMessages = [];
    if (messagesRes.ok) {
      existingMessages = await messagesRes.json();
    }
    
    // Step 6: Calculate elapsed time
    let elapsedSeconds = 0;
    if (existingMessages.length > 0) {
      const firstTime = new Date(existingMessages[0].createdAt).getTime();
      const lastTime = new Date(existingMessages[existingMessages.length - 1].createdAt).getTime();
      elapsedSeconds = Math.floor((lastTime - firstTime) / 1000);
    }
    
    // Step 7: Get duration
    const storedDuration = localStorage.getItem(`duration_${chat.id}`);
    const durationMinutes = storedDuration ? parseInt(storedDuration, 10) : session.duration || 5;
    
    // Step 8: Get voice token
    const voiceTokenRes = await fetch('/api/chat/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        voiceId: pickHumeVoice(patient),
        systemPrompt: `${patient.name}, ${patient.age}-yr-old ${patient.gender} from ${patient.location || 'unknown location'}, presents with: ${patient.condition}. ${patient.prompt || ''} Never mention the name "AI" or any name other than ${patient.name}. Speak only when the student addresses you.`,
      }),
    });
    if (!voiceTokenRes.ok) throw new Error('Failed to get voice token');
    const { accessToken } = await voiceTokenRes.json();
    
    if (!accessToken) {
      toast.error('Failed to get voice access token');
      setShowLoadingPopup(false);
      return;
    }
    
    // Create department object for voice session
    const departmentForSession = departmentInfo ? {
      id: departmentInfo.id,
      name: departmentInfo.name,
      slug: departmentInfo.slug
    } : null;

    setVoiceSessionData({
      accessToken: accessToken,
      patient: patient,
      chatId: chat.id,
      type: session.type,
      examSteps: chat.examSteps || [],
      stationInfo: { 
        current: chat.stationIndex || 0, 
        total: session.numStations || 1 
      },
      durationMinutes: durationMinutes,
      mode: sessionStorage.getItem('current_session_mode') as 'practice' | 'exam' || 'practice',
      existingMessages: existingMessages,
      elapsedTime: elapsedSeconds,
      department: departmentForSession // ADD THIS LINE
    });
    
    setCurrentChat(chat);
    setShowLoadingPopup(false);
    toast.success(`Resuming conversation with ${patient.name}`);
    switchSection('voice-session');
    
  } catch (error) {
    console.error('Error resuming chat:', error);
    toast.error('Failed to resume chat session');
    setShowLoadingPopup(false);
  }
};
  const handlePreviewChat = async (chatId: string) => {
  setIsLoadingPreview(true);
  setPreviewChatId(chatId);
  
  try {
    let messages: any[] = [];
    
    // First, try to fetch clean transcript from Vapi
    try {
      const vapiRes = await fetch(`/api/vapi/transcript/${chatId}`, {
        credentials: 'include',
      });
      
      if (vapiRes.ok) {
        const vapiData = await vapiRes.json();
        messages = vapiData.messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
        }));
        console.log(`✅ Got ${messages.length} clean messages from Vapi`);
      }
    } catch (vapiError) {
      console.log('Vapi transcript fetch failed, falling back to database:', vapiError);
    }
    
    // Fallback to database messages if Vapi fetch failed or returned no messages
    if (messages.length === 0) {
      console.log('📦 Falling back to database messages');
      const dbRes = await fetch(`/api/messages?chatId=${chatId}`, {
        credentials: 'include',
      });
      
      if (!dbRes.ok) {
        throw new Error(`Failed to fetch messages: ${dbRes.statusText}`);
      }
      
      const dbData = await dbRes.json();
      messages = Array.isArray(dbData) ? dbData : [];
    }
    
    setPreviewMessages(messages);
    setShowPreviewModal(true);
    
  } catch (error: unknown) {
    console.error('Error fetching messages for preview:', error);
    toast.error('Failed to load preview');
  } finally {
    setIsLoadingPreview(false);
  }
};
 const handleViewExamResult = async (chat: ChatHistoryItemFixed) => {
  try {
    const chatRes = await fetch(`/api/chats/${chat.id}`, { credentials: 'include' });
    if (!chatRes.ok) throw new Error('Failed to fetch chat');
    const chatData = await chatRes.json();
    const res = await fetch(`/api/step-feedback/${chat.id}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch step feedbacks');
    const steps = await res.json();
    setExamStepFeedbacks(steps);
    setExamOverallFeedback(chatData.latestFeedback ? JSON.parse(chatData.latestFeedback) : null);
    setChatExamSteps(chatData.examSteps || []);
    setShowExamResultModal(true);
  } catch (error) {
    console.error('Error fetching exam results:', error);
    toast.error('Failed to load exam results');
  }
};
  const switchSection = (section: SectionKey) => {
  // Push to browser history so device back button can intercept
  if (typeof window !== 'undefined') {
    window.history.pushState({ section, timestamp: Date.now() }, '', window.location.pathname);
  }
  
  setNavHistory(prev => [...prev, section]);
  setPreviousSection(currentSection);
  setCurrentSection(section);
  
  if (section.includes('clerking')) {
    setCurrentSessionType('clerking');
  } else if (section.includes('counselling')) {
    setCurrentSessionType('counselling');
  } else if (section.includes('physical_exam')) {
    setCurrentSessionType('physical_exam');
  } else if (section.includes('flashcards')) {
    setCurrentSessionType('flashcards');
  } else {
    setCurrentSessionType(null);
  }
};

const handleBack = () => {
  if (navHistory.length > 1) {
    // Remove current section from history
    const newHistory = [...navHistory];
    newHistory.pop(); // Remove current
    const previousSection = newHistory[newHistory.length - 1];
    
    setNavHistory(newHistory);
    setCurrentSection(previousSection);
    setPreviousSection(newHistory.length > 1 ? newHistory[newHistory.length - 2] : null);
  } else {
    // At root, let device handle it (exit app or go to previous browser page)
    router.back();
  }
};
  // Update the handleCardClick function (around line 2850)
const handleCardClick = (target?: string) => {
  if (!target) return;
  
  // Check if it's a full URL/path
  if (target.startsWith('/') || target.startsWith('http')) {
    router.push(target);
    return;
  }
  
  // Handle admin routes
  if (target === 'admin/tokens') {
    router.push('/dashboard/admin/tokens');
    return;
  }
  
  // if (target === 'admin/application-access') {
  //   router.push('/dashboard/admin/application-access');
  //   return;
  // }
  
  if (target === 'admin/users') {
    router.push('/dashboard/admin/users');
    return;
  }
  
  if (target === 'admin/ads') {
    router.push('/dashboard/admin/ads');
    return;
  }
  
  // Handle internal sections
  switch (target) {
    case 'clerking':
      switchSection('clerking');
      break;
    case 'counselling':
      switchSection('counselling');
      break;
    case 'physical_exam':
      switchSection('physical_exam');
      break;
    case 'flashcards':
      switchSection('flashcards-departments');
      break;
    case 'flashcards-saved':
      switchSection('flashcards-saved');
      break;
    case 'chat-history':
      switchSection('chat-history');
      break;
    case 'cbt-mdcn':
      setCbtType('mdcn');
      switchSection('cbt-intro');
      break;
    case 'cbt-mbbs':
      setCbtType('mbbs');
      switchSection('cbt-intro');
      break;
    case 'tokens':
      router.push('/dashboard/tokens');
      break;
    case 'settings':
      switchSection('settings');
      break;
    // NEW ACADEMY SECTIONS
    case 'lecture-notes':
      switchSection('lecture-notes');
      break;
    case 'randomizer':
      switchSection('randomizer');
      break;
    case 'clincher':
      switchSection('clincher');
      break;
    case 'checklist':
      switchSection('checklist');
      break;
    case 'mock':
      switchSection('mock');
      break;
    case 'qtopic':
      switchSection('qtopic');
      break;
    case 'keypoint-lectures':
      switchSection('keypoint-lectures');
      break;
    case 'courses':
      switchSection('courses');
      break;
    case 'games':
      switchSection('games');
      break;
    case 'quiz':
      switchSection('quiz');
      break;
    default:
      switchSection(target as SectionKey);
      break;
  }
};
  const updateStations = (value: number, type: 'clerking' | 'counselling' | 'physical_exam') => {
  if (value < 1 || value > 10) {
    toast.error('Number of stations must be between 1 and 10.');
    return;
  }
  setSelectedStations(value);
  // Initialize station configs with the correct number of stations
  const newStationConfigs = Array.from({ length: value }, (_, i) => {
    // If we're increasing stations, preserve existing configs, otherwise create new ones
    return stationConfigs[i] || { index: i, isAllDepartments: false, departments: [], cases: {} };
  });
  setStationConfigs(newStationConfigs);
};
  const handleStationChange = (index: number, field: keyof StationConfig, value: any) => {
    setStationConfigs((prev) => prev.map((config, i) => {
      if (i === index) {
        if (field === 'isAllDepartments') {
          const allDeptIds = value ? departments.map(d => d.id) : [];
          return { ...config, isAllDepartments: value, departments: allDeptIds, cases: {} };
        } else if (field === 'departments') {
          return { ...config, departments: value, cases: {} }; // Reset cases when departments change
        } else if (field === 'cases') {
          return { ...config, cases: value };
        }
      }
      return config;
    }));
  };
  const handleCaseChange = (index: number, deptId: string, caseIds: string[]) => {
    setStationConfigs((prev) => prev.map((config, i) => {
      if (i === index) {
        return { ...config, cases: { ...config.cases, [deptId]: caseIds } };
      }
      return config;
    }));
  };

  // Helper function to create patients for each station
// Helper function to create patients for each station
const createStationPatients = async (stationConfigs: StationConfig[], type: string) => {
  const stationPatients: { index: number; patient: Patient | null }[] = [];
  
  for (let i = 0; i < stationConfigs.length; i++) {
    const config = stationConfigs[i];
    // Get the first case from the first department for this station
    const firstDeptId = config.departments[0];
    const caseIds = config.cases[firstDeptId] || [];
    const firstCaseId = caseIds[0];
    
    if (firstCaseId) {
      // Find a patient for this case
      const patientsForCase = patients.filter(p => p.caseId === firstCaseId);
      const randomPatient = patientsForCase.length > 0 
        ? patientsForCase[Math.floor(Math.random() * patientsForCase.length)]
        : null;
      
      stationPatients.push({
        index: i,
        patient: randomPatient,
      });
    } else {
      stationPatients.push({
        index: i,
        patient: null,
      });
    }
  }
  
  return stationPatients;
};

  const handleProceed = async (
  type: 'clerking' | 'counselling' | 'physical_exam' | 'flashcards',
  overrideConfig?: {
    stationConfigs?: StationConfig[];
    selectedStations?: number;
    selectedDuration?: number;
  }
) => {
  if (isProceedClicked) return;
  if (!session?.user?.id) {
    toast.error('You must be logged in to create a session.');
    window.location.href = '/login';
    return;
  }
  
  const effectiveStationConfigs = overrideConfig?.stationConfigs ?? stationConfigs;
  const effectiveSelectedStations = overrideConfig?.selectedStations ?? selectedStations;
  const effectiveSelectedDuration = overrideConfig?.selectedDuration ?? selectedDuration;

  if (effectiveSelectedDuration < 1 || effectiveSelectedDuration > 30) {
    toast.error('Duration must be between 1 and 30 minutes.');
    setIsProceedClicked(false);
    return;
  }
  if (effectiveSelectedStations < 1 || effectiveSelectedStations > 10) {
    toast.error('Number of stations must be between 1 and 10.');
    setIsProceedClicked(false);
    return;
  }
  
  if (
    effectiveStationConfigs.length !== effectiveSelectedStations || 
    effectiveStationConfigs.some(config => config.departments.length === 0)
  ) {
    toast.error('Please configure all stations with at least one department.');
    setIsProceedClicked(false);
    return;
  }

  setIsProceedClicked(true);
  
  try {
    const stationPatientsData = await createStationPatients(effectiveStationConfigs, type);
    
    const tempSessionId = `temp_${Date.now()}`;
    localStorage.setItem(`session_${tempSessionId}_stationConfigs`, JSON.stringify(effectiveStationConfigs));
    localStorage.setItem(`session_${tempSessionId}_stationPatients`, JSON.stringify(stationPatientsData));
    
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        userId: session.user.id,
        type,
        departmentId: effectiveStationConfigs[0].departments[0],
        numStations: effectiveSelectedStations,
        duration: effectiveSelectedDuration,
        status: 'active',
        tempSessionId,
      }),
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`Failed to create session: ${errorData.error || res.statusText} (${res.status})`);
    }
    
    const newSession: SessionType = await res.json();
    setCurrentSession(newSession);
    
    setStationConfigs(effectiveStationConfigs);
    setSelectedStations(effectiveSelectedStations);
    setSelectedDuration(effectiveSelectedDuration);
    
    const savedPatients = localStorage.getItem(`session_${tempSessionId}_stationPatients`);
    if (savedPatients) {
      setStationPatients(JSON.parse(savedPatients));
      localStorage.removeItem(`session_${tempSessionId}_stationPatients`);
      localStorage.removeItem(`session_${tempSessionId}_stationConfigs`);
    }
    
    // CRITICAL CHANGE: Go directly to stations-info instead of setup page
    switchSection('stations-info');
    
  } catch (error: unknown) {
    console.error('Error creating session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    toast.error(`Error creating session: ${errorMessage}`);
  } finally {
    setIsProceedClicked(false);
  }
};

  const handleStart = async (type: 'clerking' | 'counselling' | 'physical_exam') => {
    if (!currentSession || !session?.user?.id) {
      toast.error('No active session or user not authenticated.');
      return;
    }
    if (incompleteSession) {
      setShowIncompletePrompt(true);
      const continueOld = await new Promise<boolean>((resolve) => {
        resolverRef.current = resolve;
      });
      if (continueOld) {
        return;
      }
      // If not continuing, terminate has been called, and now proceed
    }
    startSimulation();
  };
  const handleDepartmentSelect = (dept: string) => {
    setCurrentDepartment(dept);
    setCurrentTopic('');
    switchSection('flashcards-topic-list');
  };
  const handleTopicSelect = (topic: string) => {
    setCurrentTopic(topic);
    switchSection('flashcards-deck-config');
  };
  const handleCreateDepartment = async (
  section: 'clerking' | 'counselling' | 'physical_exam' | 'flashcards'
) => {
  if (!newDepartmentName || !newDepartmentSlug) {
    toast.error('Please provide both department name and slug.');
    return;
  }
  
  try {
    const isFlashcardDept = section === 'flashcards';
    const osceType = !isFlashcardDept ? section : null;
    
    const res = await fetch('/api/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: newDepartmentName,
        slug: newDepartmentSlug,
        isFlashcardDept,
        osceType, // ← This is the key addition
      }),
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      toast.error(errorData.error || 'Failed to create department');
      return;
    }
    
    toast.success('Department created successfully');
    setNewDepartmentName('');
    setNewDepartmentSlug('');
    await fetchDepartments();
    
    if (section === 'flashcards') {
      switchSection('flashcards-departments');
    } else {
      switchSection(section);
    }
  } catch (error: unknown) {
    console.error('Error creating department:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    toast.error(`Error creating department: ${errorMessage}`);
  }
};
  const handleCreateCase = async (type: 'clerking' | 'counselling' | 'physical_exam') => {
    if (!newCaseTitle || !newCaseDescription || !currentDepartment) {
      toast.error('Please provide title, description, and select a department.');
      return;
    }
    try {
      const res = await fetch('/api/patient-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          departmentId: currentDepartment,
          title: newCaseTitle,
          description: newCaseDescription,
          difficulty: newCaseDifficulty,
          sessionType: type,
          topic: newCaseTopic || null,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`Failed to create case: ${errorData.error || res.statusText} (${res.status})`);
      }
      toast.success('Case created successfully');
      setNewCaseTitle('');
      setNewCaseDescription('');
      setNewCaseDifficulty('medium');
      setNewCaseTopic('');
      await fetchPatientCases();
      switchSection(type);
    } catch (error: unknown) {
      console.error('Error creating case:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error creating case: ${errorMessage}`);
    }
  };
  const handleCreatePatient = async (section: 'clerking' | 'counselling' | 'physical_exam') => {
  if (!newPatientName || !newPatientAge || !newPatientCondition || !selectedCase) {
    toast.error('Please provide name, age, condition, and select a case.');
    return;
  }
  let imageUrl: string | null = newPatientImage; // already string from state
  try {
    const res = await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        caseId: selectedCase.id,
        name: newPatientName,
        age: newPatientAge,
        gender: newPatientGender,
        location: newPatientLocation || null,
        condition: newPatientCondition,
        prompt: newPatientPrompt || null,
        imageUrl: imageUrl || null, // ← 4. string (or null) saved to DB
      }),
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`Failed to create patient: ${errorData.error || res.statusText} (${res.status})`);
    }
    toast.success('Patient created successfully');
    setNewPatientName('');
    setNewPatientAge('');
    setNewPatientGender('male');
    setNewPatientLocation('');
    setNewPatientCondition('');
    setNewPatientPrompt('');
    setNewPatientImage(null); // ← 5. reset File input
    await fetchPatients();
    switchSection(section);
  } catch (error: unknown) {
    console.error('Error creating patient:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    toast.error(`Error creating patient: ${errorMessage}`);
  }
};
  const handleCreateTopic = async () => {
    if (!newTopic) {
      toast.error('Please provide a topic name.');
      return;
    }
    try {
      const res = await fetch(`/api/topics/${currentDepartment}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ topic: newTopic }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`Failed to create topic: ${errorData.error || res.statusText} (${res.status})`);
      }
      toast.success('Topic created successfully');
      setNewTopic('');
      await fetchTopicsByDepartment(currentDepartment);
      switchSection('flashcards-topic-list');
    } catch (error: unknown) {
      console.error('Error creating topic:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error creating topic: ${errorMessage}`);
    }
  };
  const handleDeckConfigSubmit = async () => {
    if (!session?.user?.id) {
      toast.error('You must be logged in to create a session.');
      window.location.href = '/login';
      return;
    }
    if (!currentDepartment) {
      toast.error('Please select a department.');
      return;
    }
    if (!flashDuration || flashDuration < 1 || flashDuration > 60) {
      toast.error('Duration must be between 1 and 60 minutes.');
      return;
    }
    if (!selectedNumCards || selectedNumCards < 1 || selectedNumCards > 50) {
      toast.error('Number of cards must be between 1 and 50.');
      return;
    }
    const newSession: Omit<SessionType, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'> = {
      userId: session.user.id,
      type: 'flashcards',
      departmentId: currentDepartment,
      caseId: null,
      patientId: null,
      numStations: 1,
      duration: flashDuration,
      topic: currentTopic || null,
      numQuestions: selectedNumCards,
      status: 'active',
      chatId: null,
    };
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newSession),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`Failed to create session: ${errorData.error || res.statusText} (${res.status})`);
      }
      const sessionData = await res.json();
      const typedSessionData: SessionType = sessionData;
      setCurrentFlashSession(typedSessionData);
      setCurrentFlashIndex(0);
      setIsFlipped(false);
      switchSection('flashcards-session');
      await fetchFlashcardQuestions(typedSessionData.departmentId, typedSessionData.topic || '', typedSessionData.numQuestions || 5);
      setTimeLeft(flashDuration * 60);
    } catch (error: unknown) {
      console.error('Error creating flashcard session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error creating flashcard session: ${errorMessage}`);
    }
  };
  const handleSaveFlashcardHistory = async () => {
    if (currentFlashSession && flashcardQuestions.length > 0) {
      try {
        for (const card of flashcardQuestions) {
          const res = await fetch(`/api/sessions/${currentFlashSession.id}/flashcard-history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              departmentId: currentFlashSession.departmentId,
              topic: currentFlashSession.topic,
              question: card.question,
              answer: card.answer,
            }),
          });
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(`Failed to save flashcard history: ${errorData.error || res.statusText} (${res.status})`);
          }
        }
      } catch (error: unknown) {
        console.error('Error saving flashcard history:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Error saving flashcard history: ${errorMessage}`);
      }
    }
  };
  const handleFlip = () => setIsFlipped(true);
  const handleNext = () => {
    if (currentFlashIndex < (currentFlashSession?.numQuestions ?? 0) - 1) {
      setCurrentFlashIndex((prev) => prev + 1);
      setIsFlipped(false);
    } else {
      handleSaveFlashcardHistory();
      switchSection('flashcards-review');
    }
  };
  const handleSaveSession = async () => {
    if (!currentFlashSession) {
      toast.error('No active flashcard session to save.');
      return;
    }
    try {
      const res = await fetch(`/api/sessions/${currentFlashSession.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'saved' }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`Failed to save session: ${errorData.error || res.statusText} (${res.status})`);
      }
      const updated: SessionType = { ...currentFlashSession, status: 'saved' };
      setCurrentFlashSession(updated);
      await fetchSavedSessions();
      toast.success('Session saved successfully!');
      switchSection('flashcards-saved');
    } catch (error: unknown) {
      console.error('Error saving session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error saving session: ${errorMessage}`);
    }
  };
  const formatAnswer = (answer: string) => {
    const sections = answer.split('\n\n');
    let formatted = '';
    sections.forEach(section => {
      section = section.trim();
      if (!section) return;
      if (section.includes('**Triggers:**')) {
        formatted += `<div class="triggers-section"><div class="section-title">Triggers</div>${section.replace('**Triggers:**', '')}</div>`;
      } else if (section.includes('**')) {
        const [title, ...content] = section.split('**');
        if (content.length >= 2) {
          const sectionTitle = content[0].replace(':', '');
          const sectionContent = content[1];
          formatted += `<div class="answer-section"><div class="section-title">${sectionTitle}</div><div>${sectionContent}</div></div>`;
        }
      } else {
        formatted += `<p>${section}</p>`;
      }
    });
    return formatted || '<p>Answer not available</p>';
  };
  const openManageList = (type: ManageType) => {
    setManageType(type);
    setShowListModal(true);
  };
  const openEditItem = (item: any) => {
    setSelectedItem(item);
    setShowListModal(false);
    setShowEditModal(true);
  };
  const handleUpdate = async () => {
    if (!selectedItem || !manageType) return;
    let url = '';
    let bodyData = { ...editFormData };
    delete bodyData.createdAt;
    delete bodyData.updatedAt; // Exclude timestamps to let DB handle
    switch (manageType) {
      case 'department':
        url = `/api/departments/${selectedItem.id}`;
        break;
      case 'case':
        url = `/api/patient-cases/${selectedItem.id}`;
        break;
      case 'patient':
        url = `/api/patients/${selectedItem.id}`;
        if (bodyData.imageUrl instanceof File) {
          const formData = new FormData();
          formData.append('file', bodyData.imageUrl);
          const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
          if (!uploadRes.ok) throw new Error('Failed to upload image');
          const { url } = await uploadRes.json();
          bodyData.imageUrl = url;
        }
        break;
      case 'topic':
        url = `/api/flashcard-topics/${selectedItem.id}`;
        break;
      case 'cbt-category':
        url = `/api/cbt-categories/${selectedItem.id}`;
        break;
      case 'cbt-question':
        url = `/api/cbt-questions/${selectedItem.id}`;
        break;
      default:
        return;
    }
    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(bodyData),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`Failed to update: ${errorData.error || res.statusText} (${res.status})`);
      }
      toast.success(`${manageType.charAt(0).toUpperCase() + manageType.slice(1)} updated successfully`);
      setShowEditModal(false);
      // Refresh lists
      if (manageType === 'department') await fetchDepartments();
      if (manageType === 'case') await fetchPatientCases();
      if (manageType === 'patient') await fetchPatients();
      if (manageType === 'topic' && currentDepartment) await fetchTopicsByDepartment(currentDepartment);
      if (manageType === 'cbt-category') await fetchCbtCategories();
      if (manageType === 'cbt-question') await fetchCbtQuestions();
    } catch (error) {
      console.error('Error updating:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error updating: ${errorMessage}`);
    }
  };
  const handleEditChange = (field: string, value: any) => {
    setEditFormData((prev: any) => ({ ...prev, [field]: value }));
  };
  const getSelectedDepartments = () => {
    const allDepts = new Set<string>();
    stationConfigs.forEach(config => {
      config.departments.forEach(d => allDepts.add(d));
    });
    return Array.from(allDepts).map(id => departments.find(d => d.id === id)?.name).filter(Boolean).join(', ') || 'All Departments';
  };
  const getSelectedCases = () => {
    const casesByDept = new Map<string, string[]>();
    stationConfigs.forEach(config => {
      for (const [deptId, caseIds] of Object.entries(config.cases)) {
        const deptName = departments.find(d => d.id === deptId)?.name || 'Unknown';
        if (!casesByDept.has(deptName)) {
          casesByDept.set(deptName, []);
        }
        caseIds.forEach(caseId => {
          const caseTitle = patientCases.find(c => c.id === caseId)?.title;
          if (caseTitle && !casesByDept.get(deptName)!.includes(caseTitle)) {
            casesByDept.get(deptName)!.push(caseTitle);
          }
        });
      }
    });
    return Array.from(casesByDept).map(([dept, titles]) => `${dept}: ${titles.join(', ')}`).join('\n') || 'All Cases';
  };
  const getFilteredCases = (): PatientCaseFixed[] => {
  return asDate(patientCases.filter(c => c.sessionType === currentSessionType)) as PatientCaseFixed[];
};
const getFilteredPatients = (): PatientFixed[] => {
  return asDate(patients.filter(p => {
    const caseItem = patientCases.find(c => c.id === p.caseId);
    return caseItem && caseItem.sessionType === currentSessionType;
  })).map(safeConvertPatient);
};
  const handleAnalyze = async (chatId: string, departmentName?: string) => {
  React.startTransition(() => {
    setCurrentMedicalQuote(getRandomMedicalQuote());
    setIsAnalyzing(true);
    setShowFeedbackModal(true);
    setAnalyzedChatId(chatId);
  });
  
  try {
    // Find the chat and get patient condition
    const chat = chatHistory.find(c => c.id === chatId);
    const patient = patients.find(p => p.id === chat?.patientId);
    const patientCondition = patient?.condition || '';
    
    console.log('🔍 Analyzing chat:', {
      chatId,
      departmentName: departmentName || 'General Medicine',
      patientCondition
    });
    
    // Pass department name AND patient condition in the request body
    const res = await fetch(`/api/analyze/${chatId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        departmentName: departmentName || 'General Medicine',
        patientCondition: patientCondition
      }),
    });
    
    if (!res.ok) throw new Error('Failed to analyze');
    const feedback = await res.json();
    
    // Add condition context to feedback for display (optional)
    if (patientCondition && !feedback.patientCondition) {
      feedback.patientCondition = patientCondition;
    }
    
    setCurrentFeedback(feedback);
  } catch (error) {
    console.error('Error analyzing:', error);
    toast.error('Failed to analyze chat');
    React.startTransition(() => {
      setShowFeedbackModal(false);
    });
  } finally {
    setIsAnalyzing(false);
  }
};

  // COMPREHENSIVE DEBUG VERSION with proper types
const fetchVoiceChatStats = async () => {
  try {
    const res = await fetch('/api/chats/history', {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to fetch chats');
    const chats = await res.json();
    const filtered = voiceChatStatsFilter === 'all'
      ? chats
      : chats.filter((c: any) => c.type === voiceChatStatsFilter);
    const total = filtered.length;
    // Extract all scores (including 0s and undefined)
    const allScores = filtered
      .map((c: any) => {
        const score = c.latestScore;
        if (score === null || score === undefined) return 0;
        if (typeof score === 'string') return parseFloat(score) || 0;
        if (typeof score === 'number') return score;
        return 0;
      });
    // Calculate absolute average (including zeros)
    const absoluteAvgScore = total > 0
      ? allScores.reduce((a: number, b: number) => a + b, 0) / total
      : 0;
    // Calculate adjusted average (excluding zeros)
    const validScores = allScores.filter((score: number) => score > 0);
    const avgScore = validScores.length > 0
      ? validScores.reduce((a: number, b: number) => a + b, 0) / validScores.length
      : 0;
    const completed = filtered.filter((c: any) => c.status === 'completed').length;
    const incomplete = total - completed;
    setVoiceChatStats({
      total,
      avgScore,
      absoluteAvgScore,
      completed,
      incomplete,
      scoresData: validScores,
      validScoresCount: validScores.length
    });
  } catch (error) {
    console.error('Error fetching voice chat stats:', error);
    toast.error('Failed to fetch voice chat statistics');
    // Set default values on error
    setVoiceChatStats({
      total: 0,
      avgScore: 0,
      absoluteAvgScore: 0,
      completed: 0,
      incomplete: 0,
      scoresData: [],
      validScoresCount: 0
    });
  }
};
// Add this function to compare leaderboard vs stats data with proper types
const debugCompareLeaderboardVsStats = async () => {
  console.log('=== COMPARING LEADERBOARD VS STATS ===');
  try {
    // Fetch both
    const leaderboardRes = await fetch(`/api/leaderboard?filter=${leaderboardFilter}`, {
      credentials: 'include',
    });
    const chatsRes = await fetch('/api/chats/history', {
      credentials: 'include',
    });
    const leaderboardData = await leaderboardRes.json();
    const chatsData = await chatsRes.json();
    console.log('Leaderboard data:', leaderboardData);
    console.log('Chats data (first 5):', chatsData.slice(0, 5));
    // Check if there's a mismatch in user identification
    const currentUserEmail = session?.user?.email;
    console.log('Current user email:', currentUserEmail);
    if (leaderboardData.length > 0) {
      const userInLeaderboard = leaderboardData.find((user: any) =>
        user.username?.includes(currentUserEmail?.substring(0, 8))
      );
      console.log('User in leaderboard:', userInLeaderboard);
    }
    // Check all scores in chats with proper typing
    const allScores = chatsData.map((c: any) => c.latestScore);
    const validScores = allScores.filter((s: any) => s && s > 0);
    console.log('All scores from chats:', allScores);
    console.log('Valid scores:', validScores);
    const manualAverage = validScores.length > 0 ?
      validScores.reduce((a: number, b: number) => a + b, 0) / validScores.length : 0;
    console.log('Manual average:', manualAverage);
  } catch (error) {
    console.error('Error in comparison debug:', error);
  }
};
 // UPDATED: Leaderboard query with score type toggle
const fetchLeaderboard = async (scoreType: 'valid' | 'absolute' = 'valid') => {
  try {
    const res = await fetch(`/api/leaderboard?filter=${leaderboardFilter}&scoreType=${scoreType}`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to fetch leaderboard');
    const data = await res.json();
    setLeaderboardData(data);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    toast.error('Failed to fetch leaderboard');
  }
};
useEffect(() => {
  if (session?.user?.id) {
    fetchVoiceChatStats();
  }
}, [voiceChatStatsFilter, session]);
useEffect(() => {
  if (session?.user?.id) {
    fetchLeaderboard(leaderboardScoreType);
  }
}, [leaderboardFilter, session, leaderboardScoreType]);
// NEW: Fetch Flashcard stats
const fetchFlashStats = async () => {
  try {
    const res = await fetch('/api/sessions/saved', {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to fetch sessions');
    const sessions = await res.json();
    const flashSessions = sessions.filter((s: any) => s.type === 'flashcards');
    const total = flashSessions.length;
    const questions = flashSessions.map((s: any) => s.numQuestions || 0);
    const avgQuestions = questions.length > 0
      ? questions.reduce((a: number, b: number) => a + b, 0) / questions.length
      : 0;
    setFlashStats({
      total,
      avgQuestions,
      sessionsData: questions
    });
  } catch (error) {
    console.error('Error fetching flash stats:', error);
    toast.error('Failed to fetch flashcard statistics');
    // Set default values on error
    setFlashStats({
      total: 0,
      avgQuestions: 0,
      sessionsData: []
    });
  }
};
  // NEW: Quick Simulation start
 const handleQuickStart = useCallback(async (patient: PatientFixed) => {
  const duration = quickDurations[patient.id] || 5;
  if (duration < 1 || duration > 30) {
    toast.error('Duration must be 1-30 minutes');
    return;
  }
  
  const caseItem = patientCases.find(c => c.id === patient.caseId);
  if (!caseItem) {
    toast.error('Case not found');
    return;
  }
  
  // Get department info
  const departmentInfo = departments.find(d => d.id === caseItem.departmentId);

  if (!session?.user?.id) {
    toast.error('You must be logged in to start a simulation');
    return;
  }
  
  React.startTransition(() => {
    setLoadingMessage(`Preparing Quick Simulation for ${patient.name}`);
    setShowLoadingPopup(true);
    setCurrentMedicalQuote(getRandomMedicalQuote());
  });
  
  try {
    const maxDurationInSeconds = duration * 60;
    const tokenReservation = await fetch('/api/tokens/reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service: 'voice_chat_session',
        maxQuantity: maxDurationInSeconds,
        metadata: {
          sessionType: caseItem.sessionType,
          patientId: patient.id,
          maxDuration: maxDurationInSeconds,
          quickStart: true,
          estimatedMaxTokens: Math.ceil(maxDurationInSeconds * 0.05)
        }
      }),
    });

    if (!tokenReservation.ok) {
      const errorData = await tokenReservation.json();
      toast.error(`Insufficient tokens: ${errorData.message}`);
      setShowLoadingPopup(false);
      return;
    }

    const reservationData = await tokenReservation.json();

    const sessionRes = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        userId: session.user.id,
        type: caseItem.sessionType,
        departmentId: caseItem.departmentId,
        caseId: caseItem.id,
        patientId: patient.id,
        numStations: 1,
        duration,
        status: 'active',
      }),
    });
    
    if (!sessionRes.ok) throw new Error('Failed to create session');
    const newSession = await sessionRes.json();
    
    const chatId = generateUUID();
    const title = `Quick ${caseItem.sessionType}: ${patient.name}`;
    const chatRes = await fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        id: chatId,
        sessionId: newSession.id,
        userId: session.user.id,
        patientId: patient.id,
        title,
        visibility: 'private',
        status: 'incomplete',
        stationIndex: 0,
        totalStations: 1,
        departmentId: caseItem.departmentId, // ✅ caseItem is defined
        metadata: {
          tokenReservation: {
            reservedAmount: reservationData.reservedAmount,
            maxDuration: maxDurationInSeconds,
            service: 'voice_chat_session',
            quickStart: true
          }
        }
      }),
    });
    
    if (!chatRes.ok) throw new Error('Failed to create chat');
    
    localStorage.setItem(`duration_${chatId}`, String(duration));
    
    let examSteps = [];
    if (caseItem.sessionType === 'physical_exam') {
      const stepsRes = await fetch('/api/generate-exam-steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          condition: patient.condition,
          prompt: patient.prompt || '',
          caseId: caseItem.id
        }),
      });
      
      if (stepsRes.ok) {
        const { steps } = await stepsRes.json();
        examSteps = steps || [];
        
        await fetch(`/api/chats/${chatId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ examSteps }),
        });
      }
    }
    
    const voiceTokenRes = await fetch('/api/chat/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        voiceId: pickHumeVoice(patient),
        systemPrompt: `${patient.name}, ${patient.age}-yr-old ${patient.gender} from ${patient.location || 'unknown location'}, presents with: ${patient.condition}. ${patient.prompt || ''} Never mention the name "AI" or any name other than ${patient.name}. Speak only when the student addresses you.`
      }),
    });
    
    if (!voiceTokenRes.ok) {
      toast.error('Failed to get voice token');
      setShowLoadingPopup(false);
      return;
    }
    
    const { accessToken } = await voiceTokenRes.json();

    if (!accessToken) {
      toast.error('Failed to get voice access token');
      setShowLoadingPopup(false);
      return;
    }
    
    const departmentForSession = departmentInfo ? {
      id: departmentInfo.id,
      name: departmentInfo.name,
      slug: departmentInfo.slug
    } : null;
    
    setVoiceSessionData({
      accessToken: accessToken,
      patient: patient, 
      chatId,
      type: caseItem.sessionType,
      examSteps,
      stationInfo: { current: 0, total: 1 },
      durationMinutes: duration,
      mode: sessionStorage.getItem('current_session_mode') as 'practice' | 'exam' || 'practice',
      department: departmentForSession
    });
    
    await refreshTokenBalance();
    setShowLoadingPopup(false);
    switchSection('voice-session' as SectionKey);
    
  } catch (error) {
    console.error('Error starting quick simulation:', error);
    toast.error('Failed to start quick simulation');
    setShowLoadingPopup(false);
  }
}, [quickDurations, patientCases, session, refreshTokenBalance, departments]);

const switchSectionStr = (s: string) => {
  if (s === 'tokens') {
    router.push('/dashboard/tokens');
    return;
  }
  switchSection(s as SectionKey);
};
 const cardGradients = [
  'from-white to-indigo-100',
  'from-white to-cyan-100',
  'from-white to-sky-100',
  'from-white to-violet-100',
  'from-white to-purple-100',
  'from-white to-blue-100',
  'from-white to-slate-100',
  'from-white to-emerald-100',
  'from-white to-rose-100',
  'from-white to-amber-100',
  'from-white to-teal-100',
  'from-white to-pink-100',
  'from-white to-green-100',
  'from-white to-yellow-100',
  'from-white to-red-100',
  'from-white to-orange-100',
  'from-white to-lime-100',
  'from-white to-fuchsia-100',
  'from-white to-gray-100',
  'from-white to-zinc-100',
];
const touchStartX = useRef<number | null>(null);
const touchEndX = useRef<number | null>(null);
const handleTouchStart = (e: React.TouchEvent) => {
  touchEndX.current = null;
  touchStartX.current = e.targetTouches[0].clientX;
};
const handleTouchMove = (e: React.TouchEvent) => {
  touchEndX.current = e.targetTouches[0].clientX;
};
const handleTouchEnd = () => {
  if (!touchStartX.current || !touchEndX.current) return;
  const deltaX = touchStartX.current - touchEndX.current;
  const swipeThreshold = 50; // minimum distance to count as swipe
  if (deltaX > swipeThreshold) {
    // Swipe left → next patient
    setQuickCurrentIndex((prev) =>
      Math.min(filteredQuickPatients.length - 1, prev + 1)
    );
  } else if (deltaX < -swipeThreshold) {
    // Swipe right → previous patient
    setQuickCurrentIndex((prev) => Math.max(0, prev - 1));
  }
};
// Add this debug function right after your existing useEffect
const debugVoiceChatData = async () => {
  try {
    const res = await fetch('/api/chats/history', {
      credentials: 'include',
    });
    if (!res.ok) return;
    const chats = await res.json();
    console.log('VoiceChat Data Structure Debug:', {
      totalChats: chats.length,
      firstChat: chats[0],
      allLatestScores: chats.map((c: any) => ({
        id: c.id,
        latestScore: c.latestScore,
        type: c.type,
        status: c.status,
        title: c.title
      })).slice(0, 10)
    });
  } catch (error) {
    console.error('Debug error:', error);
  }
};
// Helper functions for date ranges
  const getDateFilterStart = (filter: string) => {
    const now = new Date();
    switch (filter) {
      case 'today':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case 'month':
        return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString();
      case 'year':
        return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString();
      default:
        return '';
    }
  };
  const getDateFilterEnd = (filter: string) => {
    return new Date().toISOString();
  };

  // UseEffect for CBT stats
  useEffect(() => {
    if (session?.user?.id) {
      fetchCbtStats();
    }
  }, [cbtStatsFilter, cbtStatsDateFilter, cbtStatsCustomStart, cbtStatsCustomEnd, session]);
// Call this once when the component mounts (add to your existing useEffect)
useEffect(() => {
  if (status === 'authenticated' && session?.user?.id) {
    console.log("Fetching data for user:", session.user.id);
    fetchDepartments();
    fetchPatientCases();
    fetchPatients();
    fetchSavedSessions();
    fetchChatHistory();
    fetchIncompleteSession();
    // ADD THESE DEBUG CALLS with proper typing
    debugCompareLeaderboardVsStats(); // Call this first
    fetchVoiceChatStats(); // This will now show detailed debug
    fetchCbtStats(); // This function should exist in your component
    fetchLeaderboard(leaderboardScoreType);
    // NEW: Fetch stats and leaderboard
    fetchFlashStats();
    // fetchLeaderboard();
  }
}, [status, session, leaderboardScoreType]);
const [isEdgeHovering, setIsEdgeHovering] = useState(false);
const sidebarRef = useRef<HTMLDivElement>(null);


// Add this effect for low token warnings - around line 2930
useEffect(() => {
  const handleLowTokens = () => {
    if (balance > 0 && balance < 10) { // Increase threshold to 10
      toast.warning(`Low tokens: ${balance} remaining.`, {
        duration: 3000,
        id: 'low-tokens-warning' // Prevent duplicate toasts
      });
    } else if (balance <= 0) {
      // Only show if user is actively trying to use a service
      if (currentSection.includes('chat') || currentSection.includes('simulation')) {
        toast.error('Insufficient tokens for this session.', {
          duration: 5000,
          id: 'no-tokens-error'
        });
      }
    }
  };

  // Only check on balance updates from token operations
  const handleBalanceUpdate = (event: CustomEvent) => {
    if (event.detail?.fromOperation) {
      handleLowTokens();
    }
  };

  window.addEventListener('balanceUpdated', handleBalanceUpdate as EventListener);
  return () => window.removeEventListener('balanceUpdated', handleBalanceUpdate as EventListener);
}, [balance, currentSection]);

// Replace the balance refresh effect with this:
// Replace the balance refresh effect with this:
// =====================================================
// Replace the existing token warning effect (around line 2930)
// =====================================================

// Single source of truth for token warnings
useEffect(() => {
  let lastWarningTime = 0;
  const WARNING_COOLDOWN = 5000; // 5 seconds between warnings

  const showTokenWarning = (balance: number) => {
    const now = Date.now();
    
    // Don't show warnings too frequently
    if (now - lastWarningTime < WARNING_COOLDOWN) {
      return;
    }

    const tokenUsingSections = ['chat', 'simulation', 'cbt', 'flashcards'];
    const isTokenUsingSection = tokenUsingSections.some(section => 
      currentSection.toLowerCase().includes(section)
    );

    if (balance <= 0 && isTokenUsingSection) {
      toast.error('No tokens remaining! Please purchase more to continue.', {
        duration: 5000,
        icon: '🔴',
        id: 'no-tokens-error' // Same ID prevents duplicates
      });
      lastWarningTime = now;
    } else if (balance > 0 && balance < 5 && isTokenUsingSection) {
      toast.warning(`Low tokens: ${balance} remaining. Some features may be unavailable.`, {
        duration: 4000,
        icon: '⚠️',
        id: 'low-tokens-warning'
      });
      lastWarningTime = now;
    }
  };

  // Listen for balance updates
  const handleBalanceUpdate = (event: CustomEvent) => {
    const balance = event.detail?.balance;
    if (balance !== undefined) {
      // Only show warnings for operation-based updates, not periodic refreshes
      if (event.detail?.fromOperation) {
        showTokenWarning(balance);
      }
    }
  };

  window.addEventListener('balanceUpdated', handleBalanceUpdate as EventListener);
  return () => window.removeEventListener('balanceUpdated', handleBalanceUpdate as EventListener);
}, [currentSection]);

// =====================================================
// Replace the balance refresh effect with this cleaner version
// =====================================================
useEffect(() => {
  let isMounted = true;

  const refreshBalance = async () => {
    if (!session?.user?.id || !isMounted) return;
    
    try {
      const res = await fetch('/api/tokens/balance');
      if (res.ok && isMounted) {
        const data = await res.json();
        setBalance(data.balance);
      }
    } catch (error) {
      console.error('Error refreshing balance:', error);
    }
  };

  // Initial refresh
  refreshBalance();

  // Refresh every 30 seconds
  const interval = setInterval(refreshBalance, 30000);

  return () => {
    isMounted = false;
    clearInterval(interval);
  };
}, [session?.user?.id]);

useEffect(() => {
  const handleMouseMove = (e: MouseEvent) => {
 
    if (e.clientX <= 20 && !isSidebarOpen) {
      setIsEdgeHovering(true);
    } else if (e.clientX > 250 && isEdgeHovering) {
      setIsEdgeHovering(false);
    }
  };
  const handleMouseLeave = () => {
    setIsEdgeHovering(false);
  };
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseleave', handleMouseLeave);
  return () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseleave', handleMouseLeave);
  };
}, [isSidebarOpen, isEdgeHovering]);
// Auto-open sidebar when hovering near edge
useEffect(() => {
  if (isEdgeHovering && !isSidebarOpen) {
    setIsSidebarOpen(true);
    setIsEdgeHovering(false);
  }
}, [isEdgeHovering, isSidebarOpen]);



useEffect(() => {
  document.documentElement.setAttribute('data-sidebar-open', String(isSidebarOpen));
}, [isSidebarOpen]);
  // NEW: Filtered patients for quick sim
  const filteredQuickPatients = patients.filter(p => {
    const caseItem = patientCases.find(c => c.id === p.caseId);
    return (
      caseItem &&
      (!quickFilterType || caseItem.sessionType === quickFilterType) &&
      (!quickFilterDepartment || caseItem.departmentId === quickFilterDepartment) &&
      (!quickSearch ||
        p.name.toLowerCase().includes(quickSearch.toLowerCase()) ||
        p.location?.toLowerCase().includes(quickSearch.toLowerCase()) ||
        caseItem.title.toLowerCase().includes(quickSearch.toLowerCase()))
    );
  });
  if (status === 'loading')
  return (
    <div className="flex items-center justify-center min-h-screen">
  <img
    src="/uploads/acedashboard.png"
    alt="AceMedix Academy"
    className="w-32 sm:w-40 md:w-48 lg:w-56 h-auto animate-pulse object-contain"
  />
</div>
  );
  // NEW: Fetch CBT Stats function
  const fetchCbtStats = async () => {
    try {
      let dateParams = '';
      if (cbtStatsDateFilter !== 'all') {
        const startDate = getDateFilterStart(cbtStatsDateFilter);
        const endDate = getDateFilterEnd(cbtStatsDateFilter);
        dateParams = `&startDate=${startDate}&endDate=${endDate}`;
      }
      if (cbtStatsDateFilter === 'custom' && cbtStatsCustomStart && cbtStatsCustomEnd) {
        dateParams = `&startDate=${cbtStatsCustomStart}&endDate=${cbtStatsCustomEnd}`;
      }
      const res = await fetch(`/api/cbt-stats?type=${cbtStatsFilter}${dateParams}`, {
        credentials: 'include',
      });
    
      if (!res.ok) throw new Error('Failed to fetch CBT stats');
      const data = await res.json();
      setCbtStats(data);
    } catch (error) {
      console.error('Error fetching CBT stats:', error);
      setCbtStats({
        totalAttempts: 0,
        correct: 0,
        wrong: 0,
        unanswered: 0,
        avgScore: 0,
        completedSessions: 0,
        scoresData: [],
      });
    }
  };

  

  return (
    <>
      <div className="flex min-h-screen bg-background">

<aside
  ref={sidebarRef}
  className={cn(
    "fixed top-0 left-0 h-screen z-40 shadow-lg flex flex-col",
    "transition-all duration-300 ease-in-out",
    isSidebarOpen ? "w-80" : "w-0", // Changed from w-64 to w-80 (320px instead of 256px)
    "bg-gradient-to-b from-slate-800 via-blue-900 to-indigo-900",
    "md:block hidden"
  )}
  style={{
    transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
    boxShadow: isSidebarOpen ? '5px 0 15px rgba(0,0,0,0.1)' : 'none'
  }}
>

     {isSidebarOpen && (
    <div 
      className="fixed inset-0 bg-black/50 z-30 md:hidden"
      onClick={() => setIsSidebarOpen(false)}
    />
  )}
  <div className="p-6 border-b border-blue-700 flex items-center justify-between flex-shrink-0">
    <Link href="/dashboard" className="text-xl font-bold text-white hover:text-blue-200 transition-colors cursor-pointer">
      <img src="/uploads/acedashboard.png" alt="AceMedix Academy"     className="w-36 h-auto animate-pulse object-contain" />
    </Link>
    {/* mobile close */}
    <button className="md:hidden text-white hover:text-blue-200 transition-colors" onClick={() => setIsSidebarOpen(false)}>
      <i className="fas fa-times" />
    </button>
    {/* desktop collapse chevron */}
    <button className="hidden md:block text-white hover:text-blue-200 transition-colors" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
      <i className={`fas fa-${isSidebarOpen ? 'chevron-left' : 'chevron-right'}`} />
    </button>
  </div>

  <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
    {navItems.map((item, index) => (
  <div key={item.title} className={cn("border-b border-blue-700/50 last:border-b-0")}>
    {item.children ? (
      <>
        <button
          onClick={() => toggleMenu(item.title)}
          className={cn(
            "block w-full text-left rounded-xl px-4 py-3 text-white hover:text-white transition-colors flex items-center justify-between group",
            "hover:bg-blue-700/30 backdrop-blur-sm"
          )}
        >
          <span className="flex items-center">
            <i className={`fas ${item.icon} mr-3 text-lg ${getIconColor(index)} group-hover:scale-110 transition-transform`} />
            {item.title}
          </span>
          <i className={`fas fa-chevron-${openMenus.includes(item.title) ? 'down' : 'right'} text-blue-300 text-xs`} />
        </button>
        {openMenus.includes(item.title) && (
          <div className="ml-4 space-y-1 mt-2">
            {item.children.map((child, childIndex) => (
              <button
                key={child.title}
                onClick={() => handleCardClick(child.target)}
                className="block w-full text-left rounded-lg px-4 py-2 text-sm text-blue-100 hover:text-white hover:bg-blue-600/30 transition-colors flex items-center group"
              >
                <i className={`fas ${child.icon} mr-2 ${getChildIconColor(childIndex)} text-sm group-hover:scale-110 transition-transform`} />
                {child.title}
              </button>
            ))}
          </div>
        )}
      </>
    ) : item.component ? (
      // Use the custom component for items that need special handling (like Tokens)
      <item.component key={item.title} isActive={currentSection === item.target} />
    ) : (
      // Regular button for internal sections
      <button
        onClick={() => handleCardClick(item.target)}
        className={cn(
          "block w-full text-left rounded-xl px-4 py-3 text-white hover:text-white transition-colors flex items-center group",
          "hover:bg-blue-700/30 backdrop-blur-sm"
        )}
      >
        <i className={`fas ${item.icon} mr-3 text-lg ${getIconColor(index)} group-hover:scale-110 transition-transform`} />
        {item.title}
      </button>
    )}
  </div>
))}

{/* Add admin items conditionally */}
{session?.user?.role === 'admin' && adminNavItems.map((item, index) => {
  const navIndex = navItems.length + index;
  return (
    <div key={item.title} className={cn("border-b border-blue-700/50 last:border-b-0")}>
      <button
        onClick={() => {
          // For admin routes, use router directly
          router.push(item.href);
        }}
        className={cn(
          "block w-full text-left rounded-xl px-4 py-3 text-white hover:text-white transition-colors flex items-center group",
          "hover:bg-blue-700/30 backdrop-blur-sm"
        )}
      >
        <i className={`fas ${item.icon} mr-3 text-lg ${getIconColor(navIndex)} group-hover:scale-110 transition-transform`} />
        {item.title}
      </button>
    </div>
  );
})}
    <button
  onClick={() => setShowLogoutModal(true)}
  className="block w-full text-left rounded-xl px-4 py-3 text-white hover:text-white transition-colors flex items-center group hover:bg-blue-700/30 backdrop-blur-sm mt-4"
>
  <i className="fas fa-sign-out-alt mr-3 text-lg text-rose-400 group-hover:scale-110 transition-transform" />
  Logout
</button>
  </nav>
</aside>
      <main className={cn(
  "flex-1 flex flex-col min-h-screen w-full transition-all duration-300"
)} style={{
  marginLeft: isSidebarOpen ? 'calc(20rem - 8px)' : '0' // 20rem is w-80 (320px)
}}>
  <header className="flex items-center justify-between bg-white shadow-sm px-6 py-4 border-b border-blue-50 dark:bg-gray-900 dark:border-gray-800 sticky top-0 z-30 backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95">
  <div className="flex items-center space-x-4">
    <button 
  className="text-gray-800 hover:text-blue-600 dark:text-gray-200 dark:hover:text-blue-400 transition-colors p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-800 hidden md:block"
  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
>
  <i className="fas fa-bars"></i>
</button>
    <button 
      onClick={() => switchSection('selection')}
      className="text-xl font-semibold text-gray-900 hover:text-blue-700 dark:text-white dark:hover:text-blue-400 transition-colors"
    >
      <h2>Dashboard</h2>
    </button>
  </div>
  
  <div className="flex items-center space-x-4">
    <TokenBalance />
    
    {/* Dark/Light Mode Toggle */}

    <ThemeToggle />
    {/* <button 
      onClick={() => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
      }}
      className="text-gray-800 hover:text-blue-600 dark:text-gray-200 dark:hover:text-blue-400 transition-colors p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-800"
    >
      <i className="fas fa-moon dark:fa-sun"></i>
    </button> */}
    
    {/* Avatar - Now shows uploaded image if available */}
  {profileImage ? (
    <img
      src={profileImage}
      alt="Profile"
      className="h-8 w-8 rounded-full border-2 border-blue-300 dark:border-blue-500 object-cover"
    />
  ) : (
    <img
      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
        session?.user?.name || session?.user?.email || 'User'
      )}&background=3b82f6&color=ffffff`}
      alt="avatar"
      className="h-8 w-8 rounded-full border-2 border-blue-300 dark:border-blue-500"
    />
  )}
</div>
</header>
          <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-card/95 pb-20">
{/* Modern Elegant Breadcrumbs */}
<nav className="hidden md:block relative mb-6 mx-4 md:mx-0 mt-2">
  {/* Theme-aware gradient background */}
  <div className="absolute inset-0 bg-gradient-to-r from-blue-50/60 via-indigo-50/60 to-purple-50/60 dark:from-gray-800/50 dark:via-gray-800/50 dark:to-gray-800/50 rounded-2xl blur-xl" />
  
  <div className="relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md overflow-hidden">
    {/* Decorative corner accents - theme aware */}
    <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-blue-50/40 to-transparent dark:from-gray-800/40 rounded-bl-3xl" />
    <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-indigo-50/40 to-transparent dark:from-gray-800/40 rounded-tr-3xl" />
    
    <div className="relative px-4 py-3 md:px-6 md:py-4">
      <div className="flex flex-row items-center justify-between gap-3">
        {/* Left section - Navigation controls */}
        <div className="flex items-center flex-wrap gap-2 flex-1">
          {/* Back button */}
          <button 
            onClick={handleBack}
            disabled={navHistory.length <= 1}
            className="group flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-sm hover:shadow transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            title="Go back"
          >
            <i className="fas fa-arrow-left text-sm"></i>
          </button>
          
          {/* Home button */}
          <button
            onClick={() => {
              setNavHistory(['selection']);
              setCurrentSection('selection');
              setPreviousSection(null);
            }}
            className="group flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-sm hover:shadow transition-all duration-200 hover:scale-105"
            title="Go to Home"
          >
            <i className="fas fa-home text-sm"></i>
          </button>

          {/* Separator - hide on mobile */}
          <div className="hidden md:block w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
          
          {/* Breadcrumb trail - hide on mobile, show on desktop */}
          <div className="hidden md:flex items-center gap-2 flex-wrap">
            {navHistory.length > 1 && (
              <>
                {navHistory.slice(0, -1).map((section, idx, arr) => {
                  const isLast = idx === arr.length - 1;
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const newHistory = navHistory.slice(0, idx + 1);
                          setNavHistory(newHistory);
                          setCurrentSection(section);
                          setPreviousSection(newHistory[idx - 1] || null);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-200 text-sm font-medium"
                      >
                        <i className="fas fa-folder-open text-gray-500 dark:text-gray-400 text-xs"></i>
                        <span className="max-w-[120px] truncate">
                          {section === 'selection' ? 'Dashboard' : section.replace(/-/g, ' ')}
                        </span>
                      </button>
                      {!isLast && (
                        <i className="fas fa-chevron-right text-gray-400 dark:text-gray-500 text-xs"></i>
                      )}
                    </div>
                  );
                })}
                
                {/* Current page indicator */}
                <div className="flex items-center gap-2 ml-1">
                  <i className="fas fa-chevron-right text-gray-400 dark:text-gray-500 text-xs"></i>
                  <div className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 rounded-lg border border-blue-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-shield-alt text-blue-600 dark:text-blue-400 text-xs"></i>
                      <span className="text-blue-800 dark:text-blue-300 font-semibold text-sm capitalize">
                        {currentSection.replace(/-/g, ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Mobile current page indicator */}
          <div className="md:hidden flex items-center gap-2">
            <div className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 rounded-lg border border-blue-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <i className="fas fa-shield-alt text-blue-600 dark:text-blue-400 text-xs"></i>
                <span className="text-blue-800 dark:text-blue-300 font-semibold text-sm capitalize whitespace-nowrap">
                  {currentSection.replace(/-/g, ' ')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right section - User info & status */}
        <div className="flex items-center gap-2">
          {/* Live status indicator - hide on mobile */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-green-50 dark:bg-green-900/30 rounded-full border border-green-200 dark:border-green-800">
            <div className="relative">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            </div>
            <span className="text-xs font-medium text-green-700 dark:text-green-400">Active</span>
          </div>

          {/* User info - aligned right on mobile */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-gray-600 dark:to-gray-600 flex items-center justify-center">
              <i className="fas fa-user text-white text-xs"></i>
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[100px] sm:max-w-[150px]">
              {session?.user?.name || session?.user?.email || 'Guest'}
            </span>
          </div>

          {/* Time indicator - hide on mobile, show on desktop */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <i className="far fa-clock text-gray-500 dark:text-gray-400 text-xs"></i>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile back navigation - only show when needed */}
      {navHistory.length > 1 && (
        <div className="md:hidden mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              const prevSection = navHistory[navHistory.length - 2];
              const newHistory = navHistory.slice(0, -1);
              setNavHistory(newHistory);
              setCurrentSection(prevSection || 'selection');
              setPreviousSection(newHistory[newHistory.length - 2] || null);
            }}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            <i className="fas fa-arrow-left text-xs"></i>
            <span>Back to {navHistory[navHistory.length - 2]?.replace(/-/g, ' ') || 'Dashboard'}</span>
          </button>
        </div>
      )}
    </div>
  </div>
</nav>
          
      
{['selection', 'chat-history'].includes(currentSection) && (
  <HomeSection
    currentSection={currentSection}
    switchSection={switchSectionStr}
    handleCardClick={handleCardClick}
    session={session}
    chatHistory={chatHistory as any}
    setChatHistory={(h) => setChatHistory(h as any)}
    showDeleteConfirm={showDeleteConfirm}
    setShowDeleteConfirm={setShowDeleteConfirm}
    chatToDelete={chatToDelete}
    setChatToDelete={setChatToDelete}
    showPreviewModal={showPreviewModal}
    setShowPreviewModal={setShowPreviewModal}
    previewChatId={previewChatId}
    setPreviewChatId={setPreviewChatId}
    previewMessages={previewMessages}
    setPreviewMessages={setPreviewMessages}
    isLoadingPreview={isLoadingPreview}
    setIsLoadingPreview={setIsLoadingPreview}
    showFeedbackModal={showFeedbackModal}
    setShowFeedbackModal={setShowFeedbackModal}
    currentFeedback={currentFeedback}
    setCurrentFeedback={setCurrentFeedback}
    isAnalyzing={isAnalyzing}
    setIsAnalyzing={setIsAnalyzing}
    analyzedChatId={analyzedChatId}
    setAnalyzedChatId={setAnalyzedChatId}
    showExamResultModal={showExamResultModal}
    setShowExamResultModal={setShowExamResultModal}
    examStepFeedbacks={asDate(examStepFeedbacks)}
    setExamStepFeedbacks={(f) => setExamStepFeedbacks(f as any)}
    examOverallFeedback={examOverallFeedback}
    setExamOverallFeedback={setExamOverallFeedback}
    chatExamSteps={chatExamSteps}
    setChatExamSteps={setChatExamSteps}
    voiceChatStatsFilter={voiceChatStatsFilter}
    setVoiceChatStatsFilter={setVoiceChatStatsFilter}
    voiceChatStats={voiceChatStats}
    setVoiceChatStats={setVoiceChatStats}
    quickFilterType={quickFilterType}
    setQuickFilterType={setQuickFilterType}
    quickFilterDepartment={quickFilterDepartment}
    setQuickFilterDepartment={setQuickFilterDepartment}
    quickSearch={quickSearch}
    setQuickSearch={setQuickSearch}
    quickCurrentIndex={quickCurrentIndex}
    setQuickCurrentIndex={setQuickCurrentIndex}
    quickDurations={quickDurations}
    setQuickDurations={setQuickDurations}
    departments={asDate(departments) as any}
    patientCases={asDate(patientCases) as PatientCaseFixed[]}
    patients={asDate(patients)}
    showLoadingPopup={showLoadingPopup}
    setShowLoadingPopup={setShowLoadingPopup}
    loadingMessage={loadingMessage}
    setLoadingMessage={setLoadingMessage}
    currentMedicalQuote={currentMedicalQuote}
    setCurrentMedicalQuote={setCurrentMedicalQuote}
    flashStats={flashStats}
    setFlashStats={setFlashStats}
    leaderboardFilter={leaderboardFilter}
    setLeaderboardFilter={setLeaderboardFilter}
    leaderboardData={leaderboardData}
    setLeaderboardData={setLeaderboardData}
    leaderboardScoreType={leaderboardScoreType}
    setLeaderboardScoreType={setLeaderboardScoreType}
    fetchChatHistory={fetchChatHistory}
    handleDeleteChat={handleDeleteChat}
    handleResumeChat={handleResumeChat}
    handlePreviewChat={handlePreviewChat}
    handleViewExamResult={handleViewExamResult as any}
    handleAnalyze={handleAnalyze}
    handleQuickStart={handleQuickStart as any}
    filteredQuickPatients={filteredQuickPatients as any}
    handleTouchStart={handleTouchStart}
    handleTouchMove={handleTouchMove}
    handleTouchEnd={handleTouchEnd}
    fetchVoiceChatStats={fetchVoiceChatStats}
    fetchFlashStats={fetchFlashStats}
    fetchLeaderboard={fetchLeaderboard}
    // CBT Stats props
    cbtStats={cbtStats}
    setCbtStats={setCbtStats}
    cbtStatsFilter={cbtStatsFilter}
    setCbtStatsFilter={setCbtStatsFilter}
    cbtStatsDateFilter={cbtStatsDateFilter}
    setCbtStatsDateFilter={setCbtStatsDateFilter}
    cbtStatsCustomStart={cbtStatsCustomStart}
    setCbtStatsCustomStart={setCbtStatsCustomStart}
    cbtStatsCustomEnd={cbtStatsCustomEnd}
    setCbtStatsCustomEnd={setCbtStatsCustomEnd}
    // Voice date filter
    voiceDateFilter={voiceDateFilter}
    setVoiceDateFilter={setVoiceDateFilter}
    voiceCustomStart={voiceCustomStart}
    setVoiceCustomStart={setVoiceCustomStart}
    voiceCustomEnd={voiceCustomEnd}
    setVoiceCustomEnd={setVoiceCustomEnd}
    // Flash date filter
    flashDateFilter={flashDateFilter}
    setFlashDateFilter={setFlashDateFilter}
    flashCustomStart={flashCustomStart}
    setFlashCustomStart={setFlashCustomStart}
    flashCustomEnd={flashCustomEnd}
    setFlashCustomEnd={setFlashCustomEnd}
    fetchCbtStats={fetchCbtStats}
  />
)}
{[
  'clerking', 'create-clerking', 'setup-clerking', 'create-clerking-department', 'create-clerking-case', 'create-clerking-patient',
  'counselling', 'create-counselling', 'setup-counselling', 'create-counselling-department', 'create-counselling-case', 'create-counselling-patient',
  'physical_exam', 'create-physical_exam', 'setup-physical_exam', 'create-physical_exam-department', 'create-physical_exam-case', 'create-physical_exam-patient',
  'stations-info',
  'voice-session' as SectionKey
].includes(currentSection) && (
  <OsceSection
      showChiefComplaint={showChiefComplaint}
  showPresentingCondition={showPresentingCondition}
  hintsEnabled={hintsEnabled}
  aiTutorEnabled={aiTutorEnabled}
    currentSection={currentSection}
    switchSection={switchSectionStr}
    isStartClicked={isStartClicked}
    setIsStartClicked={setIsStartClicked}
    session={session}
    isProceedClicked={isProceedClicked}
    setIsProceedClicked={setIsProceedClicked}
    selectedStations={selectedStations}
    setSelectedStations={setSelectedStations}
    selectedDuration={selectedDuration}
    setSelectedDuration={setSelectedDuration}
    stationConfigs={stationConfigs}
    setStationConfigs={setStationConfigs}
    departments={asDate(departments) as any}
    currentDepartment={currentDepartment}
    setCurrentDepartment={setCurrentDepartment}
    newDepartmentName={newDepartmentName}
    setNewDepartmentName={setNewDepartmentName}
    newDepartmentSlug={newDepartmentSlug}
    setNewDepartmentSlug={setNewDepartmentSlug}
    newCaseTitle={newCaseTitle}
    setNewCaseTitle={setNewCaseTitle}
    newCaseDescription={newCaseDescription}
    setNewCaseDescription={setNewCaseDescription}
    newCaseDifficulty={newCaseDifficulty}
    setNewCaseDifficulty={setNewCaseDifficulty}
    newCaseTopic={newCaseTopic}
    setNewCaseTopic={setNewCaseTopic}
    selectedCase={asDateObj(selectedCase)}
    setSelectedCase={(c) => setSelectedCase(c as any)}
    newPatientName={newPatientName}
    setNewPatientName={setNewPatientName}
    newPatientAge={newPatientAge}
    setNewPatientAge={setNewPatientAge}
    newPatientGender={newPatientGender}
    setNewPatientGender={setNewPatientGender}
    newPatientLocation={newPatientLocation}
    setNewPatientLocation={setNewPatientLocation}
    newPatientCondition={newPatientCondition}
    setNewPatientCondition={setNewPatientCondition}
    newPatientPrompt={newPatientPrompt}
    setNewPatientPrompt={setNewPatientPrompt}
    newPatientImage={newPatientImage}
    setNewPatientImage={setNewPatientImage}
    currentSession={asDateObj(currentSession) as any}
    setCurrentSession={(s) => setCurrentSession(s as any)}
    stationPatients={stationPatients.map((sp) => ({
    index: sp.index,
    patient: asDateObj(sp.patient)!,
  }))}
    setStationPatients={(p) => setStationPatients(p as any)}
    currentStation={currentStation}
    setCurrentStation={setCurrentStation}
    showLoadingPopup={showLoadingPopup}
    setShowLoadingPopup={setShowLoadingPopup}
    loadingMessage={loadingMessage}
    setLoadingMessage={setLoadingMessage}
    currentMedicalQuote={currentMedicalQuote}
    setCurrentMedicalQuote={setCurrentMedicalQuote}
    showSwitchingModal={showSwitchingModal}
    setShowSwitchingModal={setShowSwitchingModal}
    switchingMessage={switchingMessage}
    setSwitchingMessage={setSwitchingMessage}
    incompleteSession={incompleteSession ? asDateObj(incompleteSession) as any : null}
    setIncompleteSession={(s) => setIncompleteSession(s as any)}
    showIncompletePrompt={showIncompletePrompt}
    setShowIncompletePrompt={setShowIncompletePrompt}
    resolverRef={resolverRef as React.MutableRefObject<(value: boolean) => void | undefined>}
    showListModal={showListModal}
    setShowListModal={setShowListModal}
    showEditModal={showEditModal}
    setShowEditModal={setShowEditModal}
    manageType={manageType}
    setManageType={setManageType}
    selectedItem={selectedItem}
    setSelectedItem={setSelectedItem}
    editFormData={editFormData}
    setEditFormData={setEditFormData}
    patientCases={asDate(patientCases)}
     patients={asDate(patients)}
    currentSessionType={currentSessionType}
    setCurrentSessionType={setCurrentSessionType}
    fetchDepartments={fetchDepartments}
    fetchPatientCases={fetchPatientCases}
    fetchPatients={fetchPatients}
    updateStations={updateStations}
    handleStationChange={handleStationChange}
    handleCaseChange={handleCaseChange}
    handleProceed={handleProceed}
    handleStart={handleStart}
    handleCreateDepartment={handleCreateDepartment}
    handleCreateCase={handleCreateCase}
    handleCreatePatient={handleCreatePatient}
    handleStartStationSimulation={handleStartStationSimulation}
    handleProceedStation={handleProceedStation}
    getSelectedDepartments={getSelectedDepartments}
    getSelectedCases={getSelectedCases}
    getFilteredCases={getFilteredCases}
    getFilteredPatients={getFilteredPatients}
    openManageList={openManageList}
    openEditItem={openEditItem}
    handleUpdate={handleUpdate}
    handleEditChange={handleEditChange}
    handleTerminateIncomplete={handleTerminateIncomplete}
    handleContinueIncomplete={handleContinueIncomplete}
    fetchIncompleteSession={fetchIncompleteSession}
    startSimulation={startSimulation}
    debugPatientSelection={debugPatientSelection}
    currentChat={asDateObj(currentChat) as any}
    setCurrentChat={(c) => setCurrentChat(c as any)}
    // Add the new props
    voiceSessionData={voiceSessionData}
    setVoiceSessionData={setVoiceSessionData}
    handleExitVoiceSession={handleExitVoiceSession}
  />
)}
{[
  'flashcards-departments', 'flashcards-create-department', 'flashcards-create-topic', 'flashcards-topic-list', 'flashcards-deck-config', 'flashcards-session', 'flashcards-review', 'flashcards-saved'
].includes(currentSection) && (
  <FlashcardsSection
    currentSection={currentSection}
    switchSection={switchSectionStr}
    session={session}
    departments={asDate(departments) as any}
    currentDepartment={currentDepartment}
    setCurrentDepartment={setCurrentDepartment}
    newDepartmentName={newDepartmentName}
    setNewDepartmentName={setNewDepartmentName}
    newDepartmentSlug={newDepartmentSlug}
    setNewDepartmentSlug={setNewDepartmentSlug}
    topics={asDate(topics)}
    setTopics={(t) => setTopics(t as any)}
    currentTopic={currentTopic}
    setCurrentTopic={setCurrentTopic}
    newTopic={newTopic}
    setNewTopic={setNewTopic}
    selectedNumCards={selectedNumCards}
    setSelectedNumCards={setSelectedNumCards}
    flashDuration={flashDuration}
    setFlashDuration={setFlashDuration}
    currentFlashSession={asDateObj(currentFlashSession) as any}
    setCurrentFlashSession={(s) => setCurrentFlashSession(s as any)}
    currentFlashIndex={currentFlashIndex}
    setCurrentFlashIndex={setCurrentFlashIndex}
    isFlipped={isFlipped}
    setIsFlipped={setIsFlipped}
    timeLeft={timeLeft}
    setTimeLeft={setTimeLeft}
    isLoadingQuestions={isLoadingQuestions}
    setIsLoadingQuestions={setIsLoadingQuestions}
    flashcardQuestions={flashcardQuestions}
    setFlashcardQuestions={setFlashcardQuestions}
    savedSessions={asDate(savedSessions) as any}
    setSavedSessions={(s) => setSavedSessions(s as any)}
    selectedHistory={asDate(selectedHistory)}
    setSelectedHistory={(h) => setSelectedHistory(h as any)}
    showModal={showModal}
    setShowModal={setShowModal}
    showListModal={showListModal}
    setShowListModal={setShowListModal}
    showEditModal={showEditModal}
    setShowEditModal={setShowEditModal}
    manageType={manageType}
    setManageType={setManageType}
    selectedItem={selectedItem}
    setSelectedItem={setSelectedItem}
    editFormData={editFormData}
    setEditFormData={setEditFormData}
    fetchDepartments={fetchDepartments}
    fetchTopicsByDepartment={fetchTopicsByDepartment}
    fetchSavedSessions={fetchSavedSessions}
    fetchFlashcardQuestions={fetchFlashcardQuestions}
    fetchFlashcardHistory={fetchFlashcardHistory}
    handleDepartmentSelect={handleDepartmentSelect}
    handleTopicSelect={handleTopicSelect}
    handleCreateDepartment={handleCreateDepartment}
    handleCreateTopic={handleCreateTopic}
    handleDeckConfigSubmit={handleDeckConfigSubmit}
    handleSaveFlashcardHistory={handleSaveFlashcardHistory}
    handleFlip={handleFlip}
    handleNext={handleNext}
    handleSaveSession={handleSaveSession}
    formatAnswer={formatAnswer}
    openManageList={openManageList}
    openEditItem={openEditItem}
    handleUpdate={handleUpdate}
    handleEditChange={handleEditChange}
  />
)}
          
            {['cbt-examination', 'cbt-intro', 'cbt-mode', 'cbt-question-display', 'cbt-feedback', 'cbt-summary', 'cbt-create-category', 'cbt-create-question'].includes(currentSection) && (
              <CbtSection
                currentSection={currentSection}
                switchSection={switchSectionStr}
                handleCardClick={handleCardClick}
                cbtType={cbtType}
              handleSmartCbtEndSession={handleCbtEndSession}
setShowLoadingPopup={setShowLoadingPopup}
cbtSessionId={cbtSessionId}
setCurrentCbtSessionId={setCurrentCbtSessionId}
showSmartInputModal={showSmartInputModal}
  setShowSmartInputModal={setShowSmartInputModal}
  generatedQuestions={generatedQuestions}
  setGeneratedQuestions={setGeneratedQuestions}
  smartInputText={smartInputText}
  setSmartInputText={setSmartInputText}
  smartUploadedFile={smartUploadedFile}
  setSmartUploadedFile={setSmartUploadedFile}
  isGeneratingQuestions={isGeneratingQuestions}
  setIsGeneratingQuestions={setIsGeneratingQuestions}
  handleSmartGenerateQuestions={handleSmartGenerateQuestions}
  handleFileUpload={handleFileUpload}
  handleClearFile={handleClearFile}
                setCbtType={setCbtType}
                cbtMode={cbtMode}
                setCbtMode={setCbtMode}
                cbtCategories={cbtCategories}
                setCbtCategories={setCbtCategories}
                cbtQuestions={cbtQuestions}
                setCbtQuestions={setCbtQuestions}
                cbtSelectedCategory={cbtSelectedCategory}
                setCbtSelectedCategory={setCbtSelectedCategory}
                cbtCurrentQuestionIndex={cbtCurrentQuestionIndex}
                setCbtCurrentQuestionIndex={setCbtCurrentQuestionIndex}
                cbtAnswers={cbtAnswers}
                setCbtAnswers={setCbtAnswers}
                newCbtCategoryName={newCbtCategoryName}
                setNewCbtCategoryName={setNewCbtCategoryName}
                newCbtCategorySlug={newCbtCategorySlug}
                setNewCbtCategorySlug={setNewCbtCategorySlug}
                newCbtQuestionCategoryId={newCbtQuestionCategoryId}
                setNewCbtQuestionCategoryId={setNewCbtQuestionCategoryId}
                newCbtQuestionContent={newCbtQuestionContent}
                setNewCbtQuestionContent={setNewCbtQuestionContent}
                newCbtQuestionExplanation={newCbtQuestionExplanation}
                setNewCbtQuestionExplanation={setNewCbtQuestionExplanation}
                newCbtQuestionFigureUrl={newCbtQuestionFigureUrl}
                setNewCbtQuestionFigureUrl={setNewCbtQuestionFigureUrl}
                newCbtQuestionOptions={newCbtQuestionOptions}
                setNewCbtQuestionOptions={setNewCbtQuestionOptions}
                cbtNumQuestions={cbtNumQuestions}
                setCbtNumQuestions={setCbtNumQuestions}
                cbtDuration={cbtDuration}
                setCbtDuration={setCbtDuration}
                cbtTimeLeft={cbtTimeLeft}
                setCbtTimeLeft={setCbtTimeLeft}
                cbtSelectedAnswer={cbtSelectedAnswer}
                setCbtSelectedAnswer={setCbtSelectedAnswer}
                showCbtFeedbackModal={showCbtFeedbackModal}
                setShowCbtFeedbackModal={setShowCbtFeedbackModal}
                cbtFeedback={cbtFeedback}
                setCbtFeedback={setCbtFeedback}
                cbtOverallFeedback={cbtOverallFeedback}
                setCbtOverallFeedback={setCbtOverallFeedback}
                cbtShowSummary={cbtShowSummary}
                setCbtShowSummary={setCbtShowSummary}
                cbtShowEndConfirm={cbtShowEndConfirm}
                setCbtShowEndConfirm={setCbtShowEndConfirm}
                cbtIsChecking={cbtIsChecking}
                setCbtIsChecking={setCbtIsChecking}
                cbtAiExplanation={cbtAiExplanation}
                setCbtAiExplanation={setCbtAiExplanation}
                cbtOptionPercentages={cbtOptionPercentages}
                setCbtOptionPercentages={setCbtOptionPercentages}
                isAnalysing={isAnalysing}
                setIsAnalysing={setIsAnalysing}
                isProcessing={isProcessing}
                setIsProcessing={setIsProcessing}
                loadingQuestions={loadingQuestions}
                setLoadingQuestions={setLoadingQuestions}
                currentMedicalQuote={currentMedicalQuote}
                setCurrentMedicalQuote={setCurrentMedicalQuote}
                showListModal={showListModal}
                setShowListModal={setShowListModal}
                showEditModal={showEditModal}
                setShowEditModal={setShowEditModal}
                manageType={manageType}
                setManageType={setManageType}
                selectedItem={selectedItem}
                setSelectedItem={setSelectedItem}
                editFormData={editFormData}
                setEditFormData={setEditFormData}
                session={session}
                fetchCbtCategories={fetchCbtCategories}
                fetchCbtQuestions={fetchCbtQuestions}
                handleCbtCategorySelect={handleCbtCategorySelect}
                handleCbtAnswerSelect={handleCbtAnswerSelect}
                handleCbtCheckAnswer={handleCbtCheckAnswer}
                handleCbtNextQuestion={handleCbtNextQuestion}
                handleCbtPrevQuestion={handleCbtPrevQuestion}
                handleCbtJumpToQuestion={handleCbtJumpToQuestion}
                handleCbtEndSession={handleCbtEndSession}
                handleCreateCbtCategory={handleCreateCbtCategory}
                handleCreateCbtQuestion={handleCreateCbtQuestion}
                handleNewCbtOptionChange={handleNewCbtOptionChange}
                handleImportCsv={handleImportCsv}
                openManageList={openManageList}
                openEditItem={openEditItem}
                handleUpdate={handleUpdate}
                handleEditChange={handleEditChange}
              />
            )}
            {currentSection === 'lecture-notes' && (
  <LectureNotesSection
    switchSection={switchSectionStr}
    session={session}
  />
)}

{currentSection === 'settings' && (
  <SettingsPage />
)}

{currentSection === 'randomizer' && (
  <RandomizerSection
    switchSection={switchSectionStr}
  />
)}

{currentSection === 'clincher' && (
  <ApplicationGuard applicationSlug="clincher">
    <ClincherSection
      switchSection={switchSectionStr}
    />
  </ApplicationGuard>
)}

{currentSection === 'checklist' && (
  <ApplicationGuard applicationSlug="checklist">
  <ChecklistSection
    switchSection={switchSectionStr}
  />
  </ApplicationGuard>
)}

{currentSection === 'mock' && (
  <ApplicationGuard applicationSlug="mock">
  <MockSection
    switchSection={switchSectionStr}
  />
  </ApplicationGuard>
)}

{currentSection === 'qtopic' && (
    <ApplicationGuard applicationSlug="qtopic">
  <QTopicSection
    switchSection={switchSectionStr}
  />
  </ApplicationGuard>
)}

{currentSection === 'keypoint-lectures' && (
  <ApplicationGuard applicationSlug="keypoint-lectures">
  <KeypointLecturesSection
    switchSection={switchSectionStr}
  />
  </ApplicationGuard>
)}

{currentSection === 'courses' && (
  <ApplicationGuard applicationSlug="courses">
  <CoursesSection
    switchSection={switchSectionStr}
  />
  </ApplicationGuard>
)}

{currentSection === 'games' && (
  <ApplicationGuard applicationSlug="games">
  <GamesSection
    switchSection={switchSectionStr}
  />
  </ApplicationGuard>
)}

{currentSection === 'quiz' && (
  <ApplicationGuard applicationSlug="quiz">
  <QuizSection
    switchSection={switchSectionStr}
  />
  </ApplicationGuard>
)}
{currentSection === 'cbt-history' && (
  <CbtHistory
    switchSection={switchSectionStr}
    showLoadingPopup={showLoadingPopup}
    setShowLoadingPopup={setShowLoadingPopup}
    loadingMessage={loadingMessage}
    setLoadingMessage={setLoadingMessage}
    currentMedicalQuote={currentMedicalQuote}
    setCurrentMedicalQuote={setCurrentMedicalQuote}
  />
)}
          </div>
        </main>
        {/* <FloatingInsightsWidget /> */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-30 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-card rounded-xl shadow-lg p-4 md:p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto border border-blue-50">
              <h3 className="text-lg font-semibold mb-4 text-primary flex items-center"><i className="fas fa-search mr-2"></i>Session Questions and Answers</h3>
              <div className="space-y-4">
                {selectedHistory.map((item, index) => (
                  <div key={index} className="border border-input p-4 rounded-lg bg-secondary/30">
                    <h4 className="font-medium text-card-foreground flex items-center"><i className="fas fa-question mr-2"></i>Question {index + 1}</h4>
                    <p className="text-muted-foreground">{item.question}</p>
                    <h4 className="font-medium mt-2 text-card-foreground flex items-center"><i className="fas fa-check mr-2"></i>Answer</h4>
                    <div dangerouslySetInnerHTML={{ __html: formatAnswer(item.answer) }} className="text-muted-foreground" />
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-input rounded-lg hover:bg-secondary transition-colors flex items-center"
                >
                  <i className="fas fa-times mr-2"></i>Close
                </button>
              </div>
            </div>
          </div>
        )}
        {showIncompletePrompt && incompleteSession && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-30 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-card rounded-xl shadow-lg p-6 max-w-md w-full border border-blue-50">
              <h3 className="text-lg font-semibold mb-4 text-primary flex items-center"><i className="fas fa-exclamation-triangle mr-2"></i>Incomplete Session</h3>
              <p className="text-muted-foreground mb-4">You have an incomplete session with {incompleteSession.patientName || 'a patient'}. Do you wish to continue?</p>
              <div className="flex justify-end gap-2">
                <button onClick={handleContinueIncomplete} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center"><i className="fas fa-play mr-2"></i>Yes</button>
                <button onClick={handleTerminateIncomplete} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center"><i className="fas fa-times mr-2"></i>No, Start New Case</button>
              </div>
            </div>
          </div>
        )}
        {showListModal && manageType && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-30 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-card rounded-xl shadow-lg p-6 max-w-4xl w-full md:w-3/4 max-h-[80vh] overflow-y-auto border border-blue-50">
              <h3 className="text-lg font-semibold mb-4 text-primary flex items-center"><i className="fas fa-list mr-2"></i>Manage {manageType.charAt(0).toUpperCase() + manageType.slice(1)}s</h3>
              <div className="space-y-4">
                {manageType === 'department' && departments
  .map((item: any) => {
    return (
      <div key={item.id} className="border border-input p-4 rounded-lg flex justify-between items-center bg-secondary/30">
        <div>
          <span className="text-muted-foreground">{item.name}</span>
          <p className="text-xs text-gray-500">{item.slug}</p>
          {item.osceType && (
            <span className="text-xs text-blue-500 ml-2">({item.osceType})</span>
          )}
          {!item.osceType && !item.isFlashcardDept && (
            <span className="text-xs text-red-500 ml-2">(No OSCE Type - Update needed)</span>
          )}
          {item.isFlashcardDept && (
            <span className="text-xs text-green-500 ml-2">(Flashcard)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DepartmentTypeBadge isFlashcardDept={item.isFlashcardDept} />
          <button
            onClick={() => openEditItem(item)}
            className="px-2 py-1 bg-yellow-400 text-white rounded hover:bg-yellow-500 transition-colors flex items-center"
          >
            <i className="fas fa-edit mr-1" /> Edit
          </button>
          <button
            onClick={() => handleDeleteGuarded('department', item.id, item.name)}
            className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          >
            <i className="fas fa-trash mr-1" /> Delete
          </button>
        </div>
      </div>
    );
  })}
                {manageType === 'case' && getFilteredCases().map((item) => (
    <div key={item.id} className="border border-input p-4 rounded-lg flex justify-between items-center bg-secondary/30">
      <span className="text-muted-foreground">{item.title}</span>
      <div className="flex items-center gap-2">
        <button onClick={() => openEditItem(item)} className="px-2 py-1 bg-yellow-400 text-white rounded hover:bg-yellow-500 transition-colors flex items-center"><i className="fas fa-edit mr-1"></i>Edit</button>
        <button
          onClick={() => handleDeleteGuarded('case', item.id, item.title)}
          className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
        >
          <i className="fas fa-trash mr-1" /> Delete
        </button>
      </div>
    </div>
  ))}
  {manageType === 'patient' && getFilteredPatients().map((item) => (
    <div key={item.id} className="border border-input p-4 rounded-lg flex justify-between items-center bg-secondary/30">
      <span className="text-muted-foreground">{item.name}</span>
      <div className="flex items-center gap-2">
        <button onClick={() => openEditItem(item)} className="px-2 py-1 bg-yellow-400 text-white rounded hover:bg-yellow-500 transition-colors flex items-center"><i className="fas fa-edit mr-1"></i>Edit</button>
        <button
          onClick={() => handleDeleteGuarded('patient', item.id, item.name)}
          className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
        >
          <i className="fas fa-trash mr-1" /> Delete
        </button>
      </div>
    </div>
  ))}
  {manageType === 'topic' && topics.map((item) => (
    <div key={item.id} className="border border-input p-4 rounded-lg flex justify-between items-center bg-secondary/30">
      <span className="text-muted-foreground">{item.topic}</span>
      <div className="flex items-center gap-2">
        <button onClick={() => openEditItem(item)} className="px-2 py-1 bg-yellow-400 text-white rounded hover:bg-yellow-500 transition-colors flex items-center"><i className="fas fa-edit mr-1"></i>Edit</button>
        <button
          onClick={() => handleDeleteGuarded('topic', item.id, item.topic)}
          className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
        >
          <i className="fas fa-trash mr-1" /> Delete
        </button>
      </div>
    </div>
  ))}
                {manageType === 'cbt-category' && cbtCategories.map((item) => (
                  <div key={item.id} className="border border-input p-4 rounded-lg flex justify-between items-center bg-secondary/30">
                    <span className="text-muted-foreground">{item.name}</span>
                    <button onClick={() => openEditItem(item)} className="px-2 py-1 bg-yellow-400 text-white rounded hover:bg-yellow-500 transition-colors flex items-center"><i className="fas fa-edit mr-1"></i>Edit</button>
                  </div>
                ))}
                {manageType === 'cbt-question' && cbtQuestions.map((item) => (
                  <div key={item.id} className="border border-input p-4 rounded-lg flex justify-between items-center bg-secondary/30">
                    <span className="text-muted-foreground">{item.content.substring(0, 50)}...</span>
                    <button onClick={() => openEditItem(item)} className="px-2 py-1 bg-yellow-400 text-white rounded hover:bg-yellow-500 transition-colors flex items-center"><i className="fas fa-edit mr-1"></i>Edit</button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-4">
                <button onClick={() => setShowListModal(false)} className="px-4 py-2 border border-input rounded-lg hover:bg-secondary transition-colors flex items-center"><i className="fas fa-times mr-2"></i>Close</button>
              </div>
            </div>
          </div>
        )}
        {showEditModal && selectedItem && manageType && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-30 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-card rounded-xl shadow-lg p-6 max-w-4xl w-full md:w-3/4 max-h-[80vh] overflow-y-auto border border-blue-50">
              <h3 className="text-lg font-semibold mb-4 text-primary flex items-center"><i className="fas fa-edit mr-2"></i>Edit {manageType.charAt(0).toUpperCase() + manageType.slice(1)}</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {manageType === 'department' && (
    <>
      {/* NEW: show type first */}
      <div className="col-span-2">
        <label className="block text-sm font-medium mb-2 text-card-foreground">
          Department Type
        </label>
        <div className="mt-1">
          <DepartmentTypeBadge isFlashcardDept={editFormData.isFlashcardDept} />
          <p className="text-xs text-gray-500 mt-1">
            {editFormData.isFlashcardDept
              ? 'This department is for flashcards only'
              : 'This department is for OSCE scenarios only'}
          </p>
        </div>
      </div>
      {/* existing fields unchanged */}
      <div>
        <label className="block text-sm font-medium mb-2 text-card-foreground">Name</label>
        <input
          value={editFormData.name ?? ''}
          onChange={(e) => handleEditChange('name', e.target.value)}
          className="w-full p-2 border border-input rounded-lg focus:border-ring focus:ring focus:ring-blue-50 transition-colors"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2 text-card-foreground">Slug</label>
        <input
          value={editFormData.slug ?? ''}
          onChange={(e) => handleEditChange('slug', e.target.value)}
          className="w-full p-2 border border-input rounded-lg focus:border-ring focus:ring focus:ring-blue-50 transition-colors"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2 text-card-foreground">Color</label>
        <input
          value={editFormData.color ?? ''}
          onChange={(e) => handleEditChange('color', e.target.value)}
          className="w-full p-2 border border-input rounded-lg focus:border-ring focus:ring focus:ring-blue-50 transition-colors"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2 text-card-foreground">Font Color</label>
        <input
          value={editFormData.fontColor ?? ''}
          onChange={(e) => handleEditChange('fontColor', e.target.value)}
          className="w-full p-2 border border-input rounded-lg focus:border-ring focus:ring focus:ring-blue-50 transition-colors"
        />
      </div>
    </>
  )}
                {manageType === 'case' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-card-foreground">Department</label>
                      <select
    value={editFormData.departmentId ?? ''}
    onChange={(e) => handleEditChange('departmentId', e.target.value)}
    className="w-full p-2 border border-input rounded-lg focus:border-ring focus:ring focus:ring-blue-50 transition-colors"
  >
    <option value="">Select Department</option>
    {departments
  .filter((d) => {
    // Only show departments that have cases for current session type
    const hasCasesForSession = patientCases.some(
      (c: PatientCase) => 
        c.departmentId === d.id && 
        c.sessionType === currentSessionType
    );
    return !d.isFlashcardDept && hasCasesForSession;
  })
  .map((dept) => (
        <option key={dept.id} value={dept.id}>
          {dept.name}
        </option>
      ))}
  </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-card-foreground">Title</label>
                      <input value={editFormData.title ?? ''} onChange={(e) => handleEditChange('title', e.target.value)} className="w-full p-2 border border-input rounded-lg focus:border-ring focus:ring focus:ring-blue-50 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-card-foreground">Description</label>
                      <textarea value={editFormData.description ?? ''} onChange={(e) => handleEditChange('description', e.target.value)} className="w-full p-2 border border-input rounded-lg focus:border-ring focus:ring focus:ring-blue-50 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-card-foreground">Difficulty</label>
                      <select value={editFormData.difficulty ?? 'medium'} onChange={(e) => handleEditChange('difficulty', e.target.value)} className="w-full p-2 border border-input rounded-lg focus:border-ring focus:ring focus:ring-blue-50 transition-colors">
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-card-foreground">Topic (Optional)</label>
                      <input value={editFormData.topic ?? ''} onChange={(e) => handleEditChange('topic', e.target.value)} className="w-full p-2 border border-input rounded-lg focus:border-ring focus:ring focus:ring-blue-50 transition-colors" />
                    </div>
                  </>
                )}
                {manageType === 'patient' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-card-foreground">Case</label>
                      <select value={editFormData.caseId ?? ''} onChange={(e) => handleEditChange('caseId', e.target.value)} className="w-full p-2 border border-input rounded-lg focus:border-ring focus:ring focus:ring-blue-50 transition-colors">
                        <option value="">Select Case</option>
                        {patientCases.map((caseItem) => (
                          <option key={caseItem.id} value={caseItem.id}>{caseItem.title}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-card-foreground">Name</label>
                      <input value={editFormData.name ?? ''} onChange={(e) => handleEditChange('name', e.target.value)} className="w-full p-2 border border-input rounded-lg focus:border-ring focus:ring focus:ring-blue-50 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-card-foreground">Age</label>
                      <input value={editFormData.age ?? ''} onChange={(e) => handleEditChange('age', e.target.value)} className="w-full p-2 border border-input rounded-lg focus:border-ring focus:ring focus:ring-blue-50 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-card-foreground">Gender</label>
                      <select value={editFormData.gender ?? 'male'} onChange={(e) => handleEditChange('gender', e.target.value)} className="w-full p-2 border border-input rounded-lg focus:border-ring focus:ring focus:ring-blue-50 transition-colors">
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-card-foreground">Location (Optional)</label>
                      <input value={editFormData.location ?? ''} onChange={(e) => handleEditChange('location', e.target.value)} className="w-full p-2 border border-input rounded-lg focus:border-ring focus:ring focus:ring-blue-50 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-card-foreground">Condition</label>
                      <input value={editFormData.condition ?? ''} onChange={(e) => handleEditChange('condition', e.target.value)} className="w-full p-2 border border-input rounded-lg focus:border-ring focus:ring focus:ring-blue-50 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-card-foreground">Prompt (Optional)</label>
                      <textarea value={editFormData.prompt ?? ''} onChange={(e) => handleEditChange('prompt', e.target.value)} className="w-full p-2 border border-input rounded-lg focus:border-ring focus:ring focus:ring-blue-50 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-card-foreground">Image (Optional)</label>
                      {editFormData.imageUrl && (
                        <img src={editFormData.imageUrl} alt="Current" className="w-24 h-24 rounded-full mb-2" />
                      )}
                      <input type="file" accept="image/*" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 100 * 1024) {
                          toast.error('Image must be less than 100kb');
                          return;
                        }
                        const formData = new FormData();
                        formData.append('file', file);
                        const res = await fetch('/api/upload', { method: 'POST', body: formData });
                        if (!res.ok) {
                          toast.error('Upload failed');
                          return;
                        }
                        const { url } = await res.json();
                        handleEditChange('imageUrl', url);
                      }} className="w-full p-2 border border-input rounded-lg focus:border-ring focus:ring focus:ring-blue-50 transition-colors" />
                    </div>
                  </>
                )}
                {manageType === 'topic' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-card-foreground">Topic</label>
                      <input value={editFormData.topic ?? ''} onChange={(e) => handleEditChange('topic', e.target.value)} className="w-full p-2 border border-input rounded-lg focus:border-ring focus:ring focus:ring-blue-50 transition-colors" />
                    </div>
                  </>
                )}
                {manageType === 'cbt-category' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-card-foreground">Name</label>
                      <input value={editFormData.name ?? ''} onChange={(e) => handleEditChange('name', e.target.value)} className="w-full p-2 border border-input rounded-lg focus:border-ring focus:ring focus:ring-blue-50 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-card-foreground">Slug</label>
                      <input value={editFormData.slug ?? ''} onChange={(e) => handleEditChange('slug', e.target.value)} className="w-full p-2 border border-input rounded-lg focus:border-ring focus:ring focus:ring-blue-50 transition-colors" />
                    </div>
                  </>
                )}
                {manageType === 'cbt-question' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-card-foreground">Category</label>
                      <select value={editFormData.categoryId ?? ''} onChange={(e) => handleEditChange('categoryId', e.target.value)} className="w-full p-2 border border-input rounded-lg focus:border-ring focus:ring focus:ring-blue-50 transition-colors">
                        <option value="">Select Category</option>
                        {cbtCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-card-foreground">Content</label>
                      <textarea value={editFormData.content ?? ''} onChange={(e) => handleEditChange('content', e.target.value)} className="w-full p-2 border border-input rounded-lg focus:border-ring focus:ring focus:ring-blue-50 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-card-foreground">Explanation</label>
                      <textarea value={editFormData.explanation ?? ''} onChange={(e) => handleEditChange('explanation', e.target.value)} className="w-full p-2 border border-input rounded-lg focus:border-ring focus:ring focus:ring-blue-50 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-card-foreground">Figure URL</label>
                      <input value={editFormData.figureUrl ?? ''} onChange={(e) => handleEditChange('figureUrl', e.target.value)} className="w-full p-2 border border-input rounded-lg focus:border-ring focus:ring focus:ring-blue-50 transition-colors" />
                    </div>
                    {editFormData.options.map((opt: {text: string, correct: boolean}, i: number) => (
                      <div key={i}>
                        <label className="block text-sm font-medium mb-2 text-card-foreground">Option {i+1}</label>
                        <input value={opt.text} onChange={(e) => {
                          const newOptions = [...editFormData.options];
                          newOptions[i].text = e.target.value;
                          handleEditChange('options', newOptions);
                        }} className="w-full p-2 border border-input rounded-lg focus:border-ring focus:ring focus:ring-blue-50 transition-colors" />
                        <label className="flex items-center mt-1">
                          <input type="checkbox" checked={opt.correct} onChange={(e) => {
                            const newOptions = [...editFormData.options];
                            newOptions[i].correct = e.target.checked;
                            handleEditChange('options', newOptions);
                          }} className="mr-2" />
                          Correct
                        </label>
                      </div>
                    ))}
                  </>
                )}
              </div>
              <div className="flex justify-end mt-4 gap-2">
                <button onClick={() => setShowEditModal(false)} className="px-4 py-2 border border-input rounded-lg hover:bg-secondary transition-colors flex items-center"><i className="fas fa-times mr-2"></i>Cancel</button>
                <button onClick={handleUpdate} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center"><i className="fas fa-save mr-2"></i>Update</button>
              </div>
            </div>
          </div>
        )}
    
            {/* Loading portal root */}
{loadingPortalRoot && ReactDOM.createPortal(
  <OptimizedLoadingModal 
    show={debouncedShowLoading}
    message={loadingMessage}
    quote={currentMedicalQuote}
  />,
  loadingPortalRoot
)}
<DeleteGuardModal
  open={!!deleteGuard}
  onClose={() => setDeleteGuard(null)}
  title={`Delete ${deleteGuard?.type}`}
  body={`Are you sure you want to delete "${deleteGuard?.name}"?`}
  onConfirm={async () => {
    if (!deleteGuard) return;
    const { type, id } = deleteGuard;
    try {
      let url = '';
      if (type === 'department') url = `/api/departments/${id}`;
      if (type === 'case') url = `/api/patient-cases/${id}`;
      if (type === 'patient') url = `/api/patients/${id}`;
      if (type === 'topic') url = `/api/flashcard-topics/${id}`;
      const res = await fetch(url, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error();
      toast.success(`${type} deleted`);
      // refresh lists
      if (type === 'department') await fetchDepartments();
      if (type === 'case') await fetchPatientCases();
      if (type === 'patient') await fetchPatients();
      if (type === 'topic' && currentDepartment)
        await fetchTopicsByDepartment(currentDepartment);
    } catch {
      toast.error(`Failed to delete ${type}`);
    } finally {
      setDeleteGuard(null);
    }
  }}
/>
      </div>
<footer className="fixed bottom-0 left-0 right-0 z-10 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 border-t border-blue-100 dark:border-gray-700 py-6 mt-auto">
  <div className="max-w-7xl mx-auto px-6 text-center text-sm text-muted-foreground">
    © 2026 ACEMEDIX ACADEMY. All rights reserved.
  </div>
</footer>
      {/* Modern Mobile Menu Buttons */}

{/* Floating Button for Mobile Menu (Always Visible) */}
<div className="md:hidden fixed bottom-6 right-6 z-40">
  <button
    onClick={() => setIsMobileTrayOpen(!isMobileTrayOpen)}
    className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl shadow-2xl font-bold flex items-center justify-center hover:from-blue-600 hover:to-indigo-700 hover:scale-110 transition-all duration-300 backdrop-blur-sm border border-white/20"
  >
    <i className={`fas ${isMobileTrayOpen ? 'fa-times' : 'fa-bars'} text-lg`}></i>
  </button>
</div>

{/* Floating Button for Mobile Menu (Always Visible) */}
<div className="md:hidden fixed bottom-6 right-6 z-40">
  <button
    onClick={() => setIsMobileTrayOpen(!isMobileTrayOpen)}
    className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl shadow-2xl font-bold flex items-center justify-center hover:from-blue-600 hover:to-indigo-700 hover:scale-110 transition-all duration-300 backdrop-blur-sm border border-white/20"
  >
    <i className={`fas ${isMobileTrayOpen ? 'fa-times' : 'fa-bars'} text-lg`}></i>
  </button>
</div>

{/* Mobile Menu Tray with Submenu Support */}
<AnimatePresence>
  {isMobileTrayOpen && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 md:hidden"
    >
      {/* Backdrop with gradient */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-gradient-to-t from-gray-900/95 via-gray-900/80 to-transparent backdrop-blur-sm"
        onClick={() => {
          setIsMobileTrayOpen(false);
          setActiveSubmenu(null);
        }}
      />
      
      {/* Tray from Bottom */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-slate-800 via-slate-900 to-gray-900 rounded-t-3xl shadow-2xl border-t border-slate-700/50"
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-4 pb-3">
          <div className="w-16 h-1.5 bg-slate-600/70 rounded-full"></div>
        </div>
        
        {/* Menu Content */}
        <div className="px-4 pb-8 h-[70vh] overflow-y-auto">
          {/* Section Title with Back Button for Submenu */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              {activeSubmenu ? (
                <button
                  onClick={() => setActiveSubmenu(null)}
                  className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl text-white"
                >
                  <i className="fas fa-arrow-left text-white text-lg"></i>
                </button>
              ) : (
                <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                  <i className="fas fa-bars text-white text-lg"></i>
                </div>
              )}
              <h3 className="text-white text-lg font-bold">
                {activeSubmenu ? activeSubmenu.title : 'Dashboard Menu'}
              </h3>
            </div>
            
            {/* Close Button */}
            <button 
              onClick={() => {
                setIsMobileTrayOpen(false);
                setActiveSubmenu(null);
              }}
              className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
            >
              <i className="fas fa-times text-white text-sm"></i>
            </button>
          </div>
          
          {/* SUBMENU VIEW */}
          {activeSubmenu ? (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/40 to-blue-800/30 border border-blue-800/40 mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 ${activeSubmenu.color} rounded-full flex items-center justify-center border-2 border-white/20`}>
                    <i className={`fas ${activeSubmenu.icon} text-white text-lg`}></i>
                  </div>
                  <div>
                    <p className="text-xs text-slate-300">Navigate to</p>
                    <p className="text-white font-semibold text-sm">{activeSubmenu.title}</p>
                  </div>
                </div>
              </div>
              
              {/* Submenu Items */}
              <div className="space-y-2">
                {activeSubmenu.children?.map((child: any, index: number) => (
                  <button
                    key={child.title}
                    onClick={() => {
                      if (child.target) {
                        handleCardClick(child.target);
                        setIsMobileTrayOpen(false);
                        setActiveSubmenu(null);
                      }
                    }}
                    className="w-full p-4 rounded-2xl bg-gradient-to-b from-slate-700/60 to-slate-800/40 hover:from-slate-700 hover:to-slate-800 border border-slate-700/40 transition-all duration-300 hover:scale-[1.02] active:scale-95 flex items-center justify-between group"
                  >
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${getChildIconColor(index)} bg-white/10 border border-white/20`}>
                        <i className={`fas ${child.icon} text-white`}></i>
                      </div>
                      <span className="text-white font-medium text-sm">{child.title}</span>
                    </div>
                    <i className="fas fa-chevron-right text-white/40 group-hover:text-white/70 text-xs"></i>
                  </button>
                ))}
              </div>
              
              {/* Back to Main Menu Button */}
              <button
                onClick={() => setActiveSubmenu(null)}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-slate-700 to-slate-800 text-white mt-4 hover:from-slate-600 hover:to-slate-700 transition-all duration-300 border border-slate-600/50 active:scale-95 flex items-center justify-center"
              >
                <i className="fas fa-arrow-left mr-2 text-sm"></i>
                <span>Back to Main Menu</span>
              </button>
            </div>
          ) : (
            /* MAIN MENU VIEW */
            <>
         

{/* Mobile Menu Grid - DYNAMIC from navItems */}
{/* Mobile Menu Grid */}
{/* Mobile Menu Grid */}
<div className="grid grid-cols-3 gap-3 mb-6">
  {/* Clerking - Standalone */}
  <button
    onClick={() => {
      handleCardClick('clerking');
      setIsMobileTrayOpen(false);
    }}
    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-slate-700/60 to-slate-800/40 hover:from-slate-700 hover:to-slate-800 border border-slate-700/40 transition-all duration-300 hover:scale-105 hover:shadow-lg group active:scale-95"
  >
    <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-emerald-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 border-2 border-white/20">
      <i className="fas fa-notes-medical text-white text-lg"></i>
    </div>
    <span className="text-white text-xs font-medium text-center">Clerking</span>
  </button>

  {/* Counseling - Standalone */}
  <button
    onClick={() => {
      handleCardClick('counselling');
      setIsMobileTrayOpen(false);
    }}
    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-slate-700/60 to-slate-800/40 hover:from-slate-700 hover:to-slate-800 border border-slate-700/40 transition-all duration-300 hover:scale-105 hover:shadow-lg group active:scale-95"
  >
    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 border-2 border-white/20">
      <i className="fas fa-hand-holding-heart text-white text-lg"></i>
    </div>
    <span className="text-white text-xs font-medium text-center">Counseling</span>
  </button>

  {/* Physical Examination - Standalone */}
  <button
    onClick={() => {
      handleCardClick('physical_exam');
      setIsMobileTrayOpen(false);
    }}
    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-slate-700/60 to-slate-800/40 hover:from-slate-700 hover:to-slate-800 border border-slate-700/40 transition-all duration-300 hover:scale-105 hover:shadow-lg group active:scale-95"
  >
    <div className="w-12 h-12 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 border-2 border-white/20">
      <i className="fas fa-heartbeat text-white text-lg"></i>
    </div>
    <span className="text-white text-xs font-medium text-center">Physical Exam</span>
  </button>

  {/* CBT Examination
  <button
    onClick={() => {
      setActiveSubmenu({
        title: 'CBT Examination',
        icon: 'fa-laptop-medical',
        color: 'bg-gradient-to-r from-blue-500 to-blue-600',
        children: [
          { title: "MDCN", href: "/dashboard/cbt-mdcn", target: "cbt-mdcn", icon: "fa-file-medical" },
          { title: "MBBS", href: "/dashboard/cbt-mbbs", target: "cbt-mbbs", icon: "fa-graduation-cap" },
        ]
      });
    }}
    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-slate-700/60 to-slate-800/40 hover:from-slate-700 hover:to-slate-800 border border-slate-700/40 transition-all duration-300 hover:scale-105 hover:shadow-lg group active:scale-95"
  >
    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 border-2 border-white/20">
      <i className="fas fa-laptop-medical text-white text-lg"></i>
    </div>
    <span className="text-white text-xs font-medium text-center">CBT</span>
  </button> */}

  {/* Create Flashcards - Standalone */}
  <button
    onClick={() => {
      handleCardClick('flashcards');
      setIsMobileTrayOpen(false);
    }}
    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-slate-700/60 to-slate-800/40 hover:from-slate-700 hover:to-slate-800 border border-slate-700/40 transition-all duration-300 hover:scale-105 hover:shadow-lg group active:scale-95"
  >
    <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 border-2 border-white/20">
      <i className="fas fa-plus-circle text-white text-lg"></i>
    </div>
    <span className="text-white text-xs font-medium text-center">FlashCards</span>
  </button>

  {/* Saved Flashcards - Standalone */}
  <button
    onClick={() => {
      handleCardClick('flashcards-saved');
      setIsMobileTrayOpen(false);
    }}
    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-slate-700/60 to-slate-800/40 hover:from-slate-700 hover:to-slate-800 border border-slate-700/40 transition-all duration-300 hover:scale-105 hover:shadow-lg group active:scale-95"
  >
    <div className="w-12 h-12 bg-gradient-to-r from-amber-600 to-orange-700 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 border-2 border-white/20">
      <i className="fas fa-save text-white text-lg"></i>
    </div>
    <span className="text-white text-xs font-medium text-center">Saved Cards</span>
  </button>

  {/* Conditionally show AceMedix Academy menus - HIDDEN by default */}
  {showAceMedixMenus && (
    <>
      <button
        onClick={() => {
          handleCardClick('lecture-notes');
          setIsMobileTrayOpen(false);
        }}
        className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-slate-700/60 to-slate-800/40 hover:from-slate-700 hover:to-slate-800 border border-slate-700/40 transition-all duration-300 hover:scale-105 hover:shadow-lg group active:scale-95"
      >
        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 border-2 border-white/20">
          <i className="fas fa-book text-white text-lg"></i>
        </div>
        <span className="text-white text-xs font-medium text-center">Notes</span>
      </button>

      <button
        onClick={() => {
          handleCardClick('randomizer');
          setIsMobileTrayOpen(false);
        }}
        className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-slate-700/60 to-slate-800/40 hover:from-slate-700 hover:to-slate-800 border border-slate-700/40 transition-all duration-300 hover:scale-105 hover:shadow-lg group active:scale-95"
      >
        <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 border-2 border-white/20">
          <i className="fas fa-random text-white text-lg"></i>
        </div>
        <span className="text-white text-xs font-medium text-center">Random</span>
      </button>

      <button
        onClick={() => {
          handleCardClick('clincher');
          setIsMobileTrayOpen(false);
        }}
        className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-slate-700/60 to-slate-800/40 hover:from-slate-700 hover:to-slate-800 border border-slate-700/40 transition-all duration-300 hover:scale-105 hover:shadow-lg group active:scale-95"
      >
        <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 border-2 border-white/20">
          <i className="fas fa-lightbulb text-white text-lg"></i>
        </div>
        <span className="text-white text-xs font-medium text-center">Clincher</span>
      </button>

      <button
        onClick={() => {
          handleCardClick('checklist');
          setIsMobileTrayOpen(false);
        }}
        className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-slate-700/60 to-slate-800/40 hover:from-slate-700 hover:to-slate-800 border border-slate-700/40 transition-all duration-300 hover:scale-105 hover:shadow-lg group active:scale-95"
      >
        <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 border-2 border-white/20">
          <i className="fas fa-check-circle text-white text-lg"></i>
        </div>
        <span className="text-white text-xs font-medium text-center">Checklist</span>
      </button>

      <button
        onClick={() => {
          handleCardClick('mock');
          setIsMobileTrayOpen(false);
        }}
        className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-slate-700/60 to-slate-800/40 hover:from-slate-700 hover:to-slate-800 border border-slate-700/40 transition-all duration-300 hover:scale-105 hover:shadow-lg group active:scale-95"
      >
        <div className="w-12 h-12 bg-gradient-to-r from-rose-500 to-red-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 border-2 border-white/20">
          <i className="fas fa-laptop-medical text-white text-lg"></i>
        </div>
        <span className="text-white text-xs font-medium text-center">Mock</span>
      </button>

      <button
        onClick={() => {
          handleCardClick('qtopic');
          setIsMobileTrayOpen(false);
        }}
        className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-slate-700/60 to-slate-800/40 hover:from-slate-700 hover:to-slate-800 border border-slate-700/40 transition-all duration-300 hover:scale-105 hover:shadow-lg group active:scale-95"
      >
        <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 border-2 border-white/20">
          <i className="fas fa-tag text-white text-lg"></i>
        </div>
        <span className="text-white text-xs font-medium text-center">QTopic</span>
      </button>

      <button
        onClick={() => {
          handleCardClick('keypoint-lectures');
          setIsMobileTrayOpen(false);
        }}
        className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-slate-700/60 to-slate-800/40 hover:from-slate-700 hover:to-slate-800 border border-slate-700/40 transition-all duration-300 hover:scale-105 hover:shadow-lg group active:scale-95"
      >
        <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 border-2 border-white/20">
          <i className="fas fa-chalkboard-teacher text-white text-lg"></i>
        </div>
        <span className="text-white text-xs font-medium text-center">Keypoint</span>
      </button>

      <button
        onClick={() => {
          handleCardClick('courses');
          setIsMobileTrayOpen(false);
        }}
        className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-slate-700/60 to-slate-800/40 hover:from-slate-700 hover:to-slate-800 border border-slate-700/40 transition-all duration-300 hover:scale-105 hover:shadow-lg group active:scale-95"
      >
        <div className="w-12 h-12 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 border-2 border-white/20">
          <i className="fas fa-layer-group text-white text-lg"></i>
        </div>
        <span className="text-white text-xs font-medium text-center">Courses</span>
      </button>

      <button
        onClick={() => {
          handleCardClick('games');
          setIsMobileTrayOpen(false);
        }}
        className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-slate-700/60 to-slate-800/40 hover:from-slate-700 hover:to-slate-800 border border-slate-700/40 transition-all duration-300 hover:scale-105 hover:shadow-lg group active:scale-95"
      >
        <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-rose-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 border-2 border-white/20">
          <i className="fas fa-gamepad text-white text-lg"></i>
        </div>
        <span className="text-white text-xs font-medium text-center">Games</span>
      </button>

      <button
        onClick={() => {
          handleCardClick('quiz');
          setIsMobileTrayOpen(false);
        }}
        className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-slate-700/60 to-slate-800/40 hover:from-slate-700 hover:to-slate-800 border border-slate-700/40 transition-all duration-300 hover:scale-105 hover:shadow-lg group active:scale-95"
      >
        <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 border-2 border-white/20">
          <i className="fas fa-question-circle text-white text-lg"></i>
        </div>
        <span className="text-white text-xs font-medium text-center">Quiz</span>
      </button>
    </>
  )}

  {/* Chat History */}
  {/* Chat History */}
<button
  onPointerDown={(e) => {
    e.preventDefault();
    e.stopPropagation();
    handleCardClick('chat-history');
    // Delay menu close so the pointer event completes
    requestAnimationFrame(() => {
      setTimeout(() => setIsMobileTrayOpen(false), 120);
    });
  }}
  className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-slate-700/60 to-slate-800/40 hover:from-slate-700 hover:to-slate-800 border border-slate-700/40 transition-all duration-300 hover:scale-105 hover:shadow-lg group active:scale-95 cursor-pointer touch-manipulation"
  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
>
  <div className="w-12 h-12 bg-gradient-to-r from-slate-500 to-gray-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 border-2 border-white/20 pointer-events-none">
    <i className="fas fa-history text-white text-lg"></i>
  </div>
  <span className="text-white text-xs font-medium text-center pointer-events-none">History</span>
</button>

  {/* Settings & Profile */}
  <button
    onClick={() => {
      handleCardClick('settings');
      setIsMobileTrayOpen(false);
    }}
    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-slate-700/60 to-slate-800/40 hover:from-slate-700 hover:to-slate-800 border border-slate-700/40 transition-all duration-300 hover:scale-105 hover:shadow-lg group active:scale-95"
  >
    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 border-2 border-white/20">
      <i className="fas fa-user-cog text-white text-lg"></i>
    </div>
    <span className="text-white text-xs font-medium text-center">Settings</span>
  </button>

  {/* Tokens */}
  <button
    onClick={() => {
      handleCardClick('tokens');
      setIsMobileTrayOpen(false);
    }}
    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-slate-700/60 to-slate-800/40 hover:from-slate-700 hover:to-slate-800 border border-slate-700/40 transition-all duration-300 hover:scale-105 hover:shadow-lg group active:scale-95"
  >
    <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 border-2 border-white/20">
      <i className="fas fa-coins text-white text-lg"></i>
    </div>
    <span className="text-white text-xs font-medium text-center">Tokens</span>
  </button>
</div>
{/* Quick Actions Section */}
<div className="space-y-3 mb-6">
  {/* User Info */}
  <div className="flex items-center space-x-3 p-3 rounded-2xl bg-gradient-to-r from-blue-900/40 to-blue-800/30 border border-blue-800/40">
    <div className="p-2 bg-blue-900/60 rounded-lg">
      <img
        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
          session?.user?.name || session?.user?.email || 'User'
        )}&background=3b82f6&color=ffffff`}
        alt="avatar"
        className="h-8 w-8 rounded-full"
      />
    </div>
    <div className="flex-1">
      <p className="text-xs text-slate-300">Logged in as</p>
      <p className="text-white font-semibold text-sm truncate">
        {session?.user?.name || session?.user?.email || 'Guest'}
      </p>
    </div>
  </div>

  {/* Token Balance */}
<div className="flex items-center space-x-3 p-3 rounded-2xl bg-gradient-to-r from-amber-900/40 to-amber-800/30 border border-amber-800/40">
  <div className="p-2 bg-amber-900/60 rounded-lg">
    <i className="fas fa-coins text-amber-300 text-base"></i>
  </div>
  <div className="flex-1">
    <p className="text-xs text-slate-300">Token Balance</p>
    <p className="text-white font-semibold text-sm">
      {typeof balance === 'number' ? balance.toFixed(3) : balance} Tokens
    </p>
  </div>
  <button
    onClick={() => {
      handleCardClick('tokens');
      setIsMobileTrayOpen(false);
    }}
    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium transition-colors"
  >
    Buy
  </button>
</div>
</div>

{/* Admin Section - Only show for admin users */}
{session?.user?.role === 'admin' && (
  <div className="mb-6">
    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2">
      Admin Controls
    </h4>
    <div className="grid grid-cols-3 gap-3">
      {/* Manage Tokens */}
      <button
        onClick={() => {
          router.push('/dashboard/admin/tokens');
          setIsMobileTrayOpen(false);
        }}
        className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-b from-slate-700/60 to-slate-800/40 hover:from-slate-700 hover:to-slate-800 border border-slate-700/40 transition-all duration-300 hover:scale-105 hover:shadow-lg group active:scale-95"
      >
        <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-rose-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 border-2 border-white/20">
          <i className="fas fa-cog text-white text-sm"></i>
        </div>
        <span className="text-white text-xs font-medium text-center">Tokens</span>
      </button>
      
      {/* Application Access */}
      <button
        onClick={() => {
          router.push('/dashboard/admin/users');
          setIsMobileTrayOpen(false);
        }}
        className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-b from-slate-700/60 to-slate-800/40 hover:from-slate-700 hover:to-slate-800 border border-slate-700/40 transition-all duration-300 hover:scale-105 hover:shadow-lg group active:scale-95"
      >
        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 border-2 border-white/20">
          <i className="fas fa-shield-alt text-white text-sm"></i>
        </div>
        <span className="text-white text-xs font-medium text-center">App Access</span>
      </button>
      
      {/* Manage Ads */}
      <button
        onClick={() => {
          router.push('/dashboard/admin/ads');
          setIsMobileTrayOpen(false);
        }}
        className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-b from-slate-700/60 to-slate-800/40 hover:from-slate-700 hover:to-slate-800 border border-slate-700/40 transition-all duration-300 hover:scale-105 hover:shadow-lg group active:scale-95"
      >
        <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 border-2 border-white/20">
          <i className="fas fa-images text-white text-sm"></i>
        </div>
        <span className="text-white text-xs font-medium text-center">Manage Ads</span>
      </button>
    </div>
  </div>
)}

{/* Logout Button */}
<button 
  onClick={() => {
    setIsMobileTrayOpen(false);
    setShowLogoutModal(true);
  }}
  className="w-full bg-gradient-to-r from-rose-600 to-rose-700 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:from-rose-700 hover:to-rose-800 transition-all duration-300 border border-rose-600/50 active:scale-95 shadow-lg"
>
  <i className="fas fa-sign-out-alt text-sm"></i>
  <span>Logout</span>
</button>

{/* Close Button */}
<button 
  onClick={() => setIsMobileTrayOpen(false)}
  className="w-full bg-gradient-to-r from-slate-700 to-slate-800 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:from-slate-600 hover:to-slate-700 transition-all duration-300 border border-slate-600/50 active:scale-95 mt-3"
>
  <i className="fas fa-times text-sm"></i>
  <span>Close Menu</span>
</button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
{/* Compact Logout Modal */}
{showLogoutModal && (
  <div className="fixed inset-0 flex items-center justify-center z-50">
    {/* Blurred background */}
    <div 
      className="fixed inset-0 backdrop-blur-md bg-black/20 transition-opacity"
      onClick={() => setShowLogoutModal(false)}
    />
    
    {/* Modal content */}
    <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 border border-gray-200 dark:border-gray-800">
      <div className="flex items-start mb-4">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 flex items-center justify-center bg-rose-100 dark:bg-rose-900/30 rounded-lg">
            <i className="fas fa-sign-out-alt text-rose-500 dark:text-rose-400"></i>
          </div>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Logout?
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            You'll need to sign in again to continue.
          </p>
        </div>
        <button
          onClick={() => setShowLogoutModal(false)}
          className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>
      
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => setShowLogoutModal(false)}
          className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 font-medium transition-colors"
        >
          Cancel
        </button>
        <form action="/api/auth/signout" method="post" className="flex-1">
          <button
            type="submit"
            className="w-full px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow"
          >
            Logout
          </button>
        </form>
      </div>
    </div>
  </div>
)}
      </>
    );
}
const getRandomGradient = (index: number) => {
  const gradients = [
    'from-blue-500 to-purple-600',
    'from-green-500 to-teal-600',
    'from-purple-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-violet-500 to-indigo-600'
  ];
  return gradients[index % gradients.length];
}


export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}