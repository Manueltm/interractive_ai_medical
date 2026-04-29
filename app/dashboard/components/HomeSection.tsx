// app/dashboard/components/HomeSection.tsx
import React, { FC, useState, useEffect, useMemo } from "react";
import { Line, Bar } from 'react-chartjs-2';
import { toast } from 'sonner';
import { cn } from "@/utils";
import { getRandomMedicalQuote } from '@/lib/utils';
import { Session } from "next-auth";
import Image from "next/image";
import { useTheme } from "next-themes";
import { DepartmentType } from '@/lib/types/department';
import type { StringOrDate } from '@/lib/types';
import type { AsDate } from '@/lib/types';
import { AdSlider } from './AdSlider';
import type { Department, Patient, ChatHistoryItem, StepFeedback, Feedback } from '@/lib/db/schema';

const gradients = [
  'from-blue-500 to-violet-600',
  'from-indigo-500 to-pink-600',
  'from-green-500 to-teal-600',
  'from-orange-500 to-red-600',
  'from-violet-500 to-indigo-700',
];

const getRandomGradient = (index: number) => {
  return gradients[index % gradients.length] as string;
};

// Add these new types for pagination and filtering
type ChatFilter = 'all' | 'clerking' | 'counselling' | 'physical_exam' | 'flashcards';
type ChatStatus = 'all' | 'completed' | 'incomplete';
type DateFilter = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

export type HomeSectionProps = {

  
  currentSection: string;
  switchSection: (section: string) => void;
  handleCardClick: (target: string) => void;
  session: Session | null;
  chatHistory: (AsDate<ChatHistoryItem> & { 
    department?: { id: string; name: string; slug: string } | null 
  })[];
  patients: Patient[];
  filteredQuickPatients: Patient[];
  departments: DepartmentType[];
  handleViewExamResult: (chat: AsDate<ChatHistoryItem>) => Promise<void>;
  handleQuickStart: (patient: AsDate<Patient> & { gender?: string | null }) => Promise<void>;
  setChatHistory: (history: (ChatHistoryItem & { createdAt: Date; patientName?: string })[]) => void;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (show: boolean) => void;
  chatToDelete: string | null;
  setChatToDelete: (id: string | null) => void;
  showPreviewModal: boolean;
  setShowPreviewModal: (show: boolean) => void;
  previewChatId: string | null;
  setPreviewChatId: (id: string | null) => void;
  previewMessages: any[];
  setPreviewMessages: (messages: any[]) => void;
  isLoadingPreview: boolean;
  setIsLoadingPreview: (loading: boolean) => void;
  showFeedbackModal: boolean;
  setShowFeedbackModal: (show: boolean) => void;
  currentFeedback: Feedback | null;
  setCurrentFeedback: (feedback: Feedback | null) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (analyzing: boolean) => void;
  analyzedChatId: string | null;
  setAnalyzedChatId: (id: string | null) => void;
  showExamResultModal: boolean;
  setShowExamResultModal: (show: boolean) => void;
  examStepFeedbacks: AsDate<StepFeedback>[];
  setExamStepFeedbacks: (feedbacks: StepFeedback[]) => void;
  examOverallFeedback: Feedback | null;
  setExamOverallFeedback: (feedback: Feedback | null) => void;
  chatExamSteps: { name: string; videoUrl: string }[];
  setChatExamSteps: (steps: { name: string; videoUrl: string }[]) => void;
  voiceChatStatsFilter: 'clerking' | 'counselling' | 'physical_exam' | 'all';
  setVoiceChatStatsFilter: (filter: 'clerking' | 'counselling' | 'physical_exam' | 'all') => void;
  voiceChatStats: {
    total: number;
    avgScore: number;
    absoluteAvgScore: number;
    completed: number;
    incomplete: number;
    scoresData: number[];
    validScoresCount: number;
  };
  cbtStats: {
    totalAttempts: number;
    correct: number;
    wrong: number;
    unanswered: number;
    avgScore: number;
    completedSessions: number;
    scoresData: number[];
  };
  voiceDateFilter: DateFilter;
  setVoiceDateFilter: (filter: DateFilter) => void;
  voiceCustomStart: string;
  setVoiceCustomStart: (date: string) => void;
  voiceCustomEnd: string;
  setVoiceCustomEnd: (date: string) => void;

  // Add Flashcard date filter props
  flashDateFilter: DateFilter;
  setFlashDateFilter: (filter: DateFilter) => void;
  flashCustomStart: string;
  setFlashCustomStart: (date: string) => void;
  flashCustomEnd: string;
  setFlashCustomEnd: (date: string) => void;
  setCbtStats: (stats: any) => void;
  cbtStatsFilter: 'mdcn' | 'mbbs' | 'all';
  setCbtStatsFilter: (filter: 'mdcn' | 'mbbs' | 'all') => void;
  cbtStatsDateFilter: DateFilter;
  setCbtStatsDateFilter: (filter: DateFilter) => void;
  cbtStatsCustomStart: string;
  setCbtStatsCustomStart: (date: string) => void;
  cbtStatsCustomEnd: string;
  setCbtStatsCustomEnd: (date: string) => void;
  fetchCbtStats: () => Promise<void>;
  setVoiceChatStats: (stats: any) => void;
  quickFilterType: 'clerking' | 'counselling' | 'physical_exam' | '';
  setQuickFilterType: (type: 'clerking' | 'counselling' | 'physical_exam' | '') => void;
  quickFilterDepartment: string;
  setQuickFilterDepartment: (dept: string) => void;
  quickSearch: string;
  setQuickSearch: (search: string) => void;
  quickCurrentIndex: number;
  setQuickCurrentIndex: (index: number) => void;
  quickDurations: Record<string, number>;
  setQuickDurations: (durations: Record<string, number>) => void;
  patientCases: any[];
  showLoadingPopup: boolean;
  setShowLoadingPopup: (show: boolean) => void;
  loadingMessage: string;
  setLoadingMessage: (msg: string) => void;
  currentMedicalQuote: { text: string; author: string } | null;
  setCurrentMedicalQuote: (quote: { text: string; author: string } | null) => void;
  flashStats: { total: number; avgQuestions: number; sessionsData: number[] };
  setFlashStats: (stats: any) => void;
  leaderboardFilter: 'scenarios' | 'flashcards';
  setLeaderboardFilter: (filter: 'scenarios' | 'flashcards') => void;
  leaderboardData: any[];
  setLeaderboardData: (data: any[]) => void;
  leaderboardScoreType: 'valid' | 'absolute';
  setLeaderboardScoreType: (type: 'valid' | 'absolute') => void;
  fetchChatHistory: () => Promise<void>;
  handleDeleteChat: () => Promise<void>;
  handleResumeChat: (chatId: string) => void;
  handlePreviewChat: (chatId: string) => Promise<void>;
   handleAnalyze: (chatId: string, departmentName?: string) => Promise<void>;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: () => void;
  fetchVoiceChatStats: () => Promise<void>;
  fetchFlashStats: () => Promise<void>;
  fetchLeaderboard: (scoreType?: 'valid' | 'absolute') => Promise<void>;
};

const HomeSection: FC<HomeSectionProps> = ({
  currentSection,
  switchSection,
  handleCardClick,
  session,
  chatHistory,
  setChatHistory,
  showDeleteConfirm,
  setShowDeleteConfirm,
  chatToDelete,
  setChatToDelete,
  showPreviewModal,
  setShowPreviewModal,
  previewChatId,
  setPreviewChatId,
  previewMessages,
  setPreviewMessages,
  isLoadingPreview,
  setIsLoadingPreview,
  showFeedbackModal,
  setShowFeedbackModal,
  currentFeedback,
  setCurrentFeedback,
  isAnalyzing,
  setIsAnalyzing,
  analyzedChatId,
  setAnalyzedChatId,
  showExamResultModal,
  setShowExamResultModal,
  examStepFeedbacks,
  setExamStepFeedbacks,
  examOverallFeedback,
  setExamOverallFeedback,
  chatExamSteps,
  setChatExamSteps,
  voiceChatStatsFilter,
  setVoiceChatStatsFilter,
  voiceChatStats,
  setVoiceChatStats,
  quickFilterType,
  setQuickFilterType,
  quickFilterDepartment,
  setQuickFilterDepartment,
  quickSearch,
  setQuickSearch,
  quickCurrentIndex,
  setQuickCurrentIndex,
  quickDurations,
  setQuickDurations,
  departments,
  patients,
  showLoadingPopup,
  setShowLoadingPopup,
  loadingMessage,
  setLoadingMessage,
  currentMedicalQuote,
  setCurrentMedicalQuote,
  flashStats,
  setFlashStats,
  leaderboardFilter,
  setLeaderboardFilter,
  leaderboardData,
  setLeaderboardData,
  leaderboardScoreType,
  setLeaderboardScoreType,
  fetchChatHistory,
  handleDeleteChat,
  handleResumeChat,
  handlePreviewChat,
  handleAnalyze,
  handleQuickStart,
  filteredQuickPatients,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  fetchVoiceChatStats,
  fetchFlashStats,
  fetchLeaderboard,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  // New state variables for chat history features
  const [searchQuery, setSearchQuery] = useState('');
  const [chatTypeFilter, setChatTypeFilter] = useState<ChatFilter>('all');
  const [statusFilter, setStatusFilter] = useState<ChatStatus>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // NEW: States for CBT Stats
  const [cbtStatsFilter, setCbtStatsFilter] = useState<'mdcn' | 'mbbs' | 'all'>('all');
  const [cbtStatsDateFilter, setCbtStatsDateFilter] = useState<DateFilter>('all');
  const [cbtStatsCustomStart, setCbtStatsCustomStart] = useState('');
  const [cbtStatsCustomEnd, setCbtStatsCustomEnd] = useState('');
  
  const [showAdSlider, setShowAdSlider] = useState(false);

  // Add this useEffect to show ad slider on mount
// useEffect(() => {
//   // Check if user has opted out
//   const dontShowAds = localStorage.getItem('dontShowAds');
//   if (!dontShowAds) {
//     // Small delay to ensure component is mounted
//     setTimeout(() => {
//       setShowAdSlider(true);
//     }, 500);
//   }
// }, []);

  // In HomeSection.tsx, update the cbtStats state and type
  const [cbtStats, setCbtStats] = useState<{
    totalAttempts: number;
    totalQuestions: number;
    correct: number;
    wrong: number;
    unanswered: number;
    avgScore: number;
    completedSessions: number;
    scoresData: number[];
    modeBreakdown: {
      practice: number;
      timed: number;
      exam: number;
    };
    accuracy: number;
    completionRate: number;
  }>({
    totalAttempts: 0,
    totalQuestions: 0,
    correct: 0,
    wrong: 0,
    unanswered: 0,
    avgScore: 0,
    completedSessions: 0,
    scoresData: [],
    modeBreakdown: { practice: 0, timed: 0, exam: 0 },
    accuracy: 0,
    completionRate: 0
  });

  // NEW: States for VoiceChat date filter
  const [voiceDateFilter, setVoiceDateFilter] = useState<DateFilter>('all');
  const [voiceCustomStart, setVoiceCustomStart] = useState('');
  const [voiceCustomEnd, setVoiceCustomEnd] = useState('');
  
  // NEW: States for Flashcard date filter
  const [flashDateFilter, setFlashDateFilter] = useState<DateFilter>('all');
  const [flashCustomStart, setFlashCustomStart] = useState('');
  const [flashCustomEnd, setFlashCustomEnd] = useState('');
  
  // NEW: States for CBT Leaderboard
  const [cbtLeaderboardData, setCbtLeaderboardData] = useState<any[]>([]);
  const [cbtLeaderboardScoreType, setCbtLeaderboardScoreType] = useState<'valid' | 'absolute'>('valid');
  
  // NEW: Tab states for redesign
  const [currentStatsTab, setCurrentStatsTab] = useState<'voice' | 'flash' | 'cbt'>('voice');
  const [currentLeaderTab, setCurrentLeaderTab] = useState<'osce-flash' | 'cbt'>('osce-flash');
const deduplicatedChatHistory = React.useMemo(() => {
  const uniqueChats = new Map();
  
  // Sort by createdAt descending (newest first)
  const sortedChats = [...chatHistory].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  sortedChats.forEach(chat => {
    if (!uniqueChats.has(chat.id)) {
      uniqueChats.set(chat.id, chat);
    }
  });
  
  // Convert back to array and sort by createdAt descending again
  return Array.from(uniqueChats.values()).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}, [chatHistory]);
  // Filter and paginate chat history
  const filteredChats = deduplicatedChatHistory.filter(chat => {
    const matchesSearch = chat.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         chat.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         chat.type?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = chatTypeFilter === 'all' || chat.type === chatTypeFilter;
    const matchesStatus = statusFilter === 'all' || chat.status === statusFilter;
    
    // Date filtering
    const chatDate = new Date(chat.createdAt);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getFullYear(), now.getMonth() - 1, today.getDate());
    const yearAgo = new Date(today.getFullYear() - 1, now.getMonth(), today.getDate());
    
    let matchesDate = true;
    switch (dateFilter) {
      case 'today':
        matchesDate = chatDate >= today;
        break;
      case 'week':
        matchesDate = chatDate >= weekAgo;
        break;
      case 'month':
        matchesDate = chatDate >= monthAgo;
        break;
      case 'year':
        matchesDate = chatDate >= yearAgo;
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          matchesDate = chatDate >= start && chatDate <= end;
        }
        break;
      default:
        matchesDate = true;
    }
    
    return matchesSearch && matchesType && matchesStatus && matchesDate;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredChats.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedChats = filteredChats.slice(startIndex, startIndex + itemsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, chatTypeFilter, statusFilter, dateFilter, customStartDate, customEndDate]);

  // Simulate loading for chat history
  useEffect(() => {
    if (currentSection === 'chat-history' && chatHistory.length === 0) {
      setIsLoadingHistory(true);
      const timer = setTimeout(() => {
        setIsLoadingHistory(false);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setIsLoadingHistory(false);
    }
  }, [currentSection, chatHistory]);

  // Function to get patient image URL
  const getPatientImageUrl = (chat: AsDate<ChatHistoryItem>) => {
    const patient = patients.find(p =>
      chat.patientId ? p.id === chat.patientId : p.name === chat.patientName
    );
    return patient?.imageUrl || '/uploads/default-avatar.png';
  };

  // Function to get patient details
  const getPatientDetails = (chat: AsDate<ChatHistoryItem>) => {
    const patient = patients.find(p =>
      chat.patientId ? p.id === chat.patientId : p.name === chat.patientName
    );
    return patient || null;
  };

  const confirmDeleteChat = (id: string) => {
    setChatToDelete(id);
    setShowDeleteConfirm(true);
  };

  const handleViewPhysicalExamResult = async (chat: AsDate<ChatHistoryItem>) => {
    try {
      setShowLoadingPopup(true);
      setLoadingMessage('Generating comprehensive exam analysis...');
      const quote = getRandomMedicalQuote();
      setCurrentMedicalQuote(quote);
      
      const res = await fetch(`/api/step-feedback/${chat.id}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch step feedbacks');
      const stepFeedbacks = await res.json();
      
      const totalScore = stepFeedbacks.reduce((sum: number, step: any) => sum + (step.score || 0), 0);
      const maxPossibleScore = stepFeedbacks.length * 20;
      const calculatedPercentage = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;
      
      const chatRes = await fetch(`/api/chats/${chat.id}`, {
        credentials: 'include'
      });
      if (!chatRes.ok) throw new Error('Failed to fetch chat data');
      const chatData = await chatRes.json();
      
      let patientInfo = {
        name: 'Unknown Patient',
        age: 'Unknown',
        gender: 'Unknown',
        condition: 'Unknown condition'
      };
      
      if (chatData.patientId) {
        const patientRes = await fetch(`/api/patients/${chatData.patientId}`, {
          credentials: 'include'
        });
        if (patientRes.ok) {
          const patientData = await patientRes.json();
          patientInfo = {
            name: patientData.name || 'Unknown Patient',
            age: patientData.age || 'Unknown',
            gender: patientData.gender || 'Unknown',
            condition: patientData.condition || 'Unknown condition'
          };
        }
      }
      
      const analysisRes = await fetch('/api/analyze-physical-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepFeedbacks,
          patientInfo
        })
      });
      if (!analysisRes.ok) throw new Error('Analysis failed');
      const analysis = await analysisRes.json();
      
      setExamOverallFeedback(analysis);
      setExamStepFeedbacks(stepFeedbacks);
      setChatExamSteps(chatData.examSteps || []);
      setShowExamResultModal(true);
    } catch (error) {
      console.error('Error generating exam results:', error);
      toast.error('Failed to load exam results');
    } finally {
      setShowLoadingPopup(false);
      setCurrentMedicalQuote(null);
    }
  };

  // Helper function to get status badge color
  const getStatusBadge = (status: string) => {
    if (isDark) {
      switch (status) {
        case 'completed':
          return 'bg-green-900/50 text-green-300 border-green-700';
        case 'incomplete':
          return 'bg-yellow-900/50 text-yellow-300 border-yellow-700';
        default:
          return 'bg-gray-800/50 text-gray-300 border-gray-700';
      }
    } else {
      switch (status) {
        case 'completed':
          return 'bg-green-100 text-green-800 border-green-300';
        case 'incomplete':
          return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-300';
      }
    }
  };

  // Helper function to get type badge color
  const getTypeBadge = (type: string) => {
    if (isDark) {
      switch (type) {
        case 'clerking':
          return 'bg-blue-900/50 text-blue-300 border-blue-700';
        case 'counselling':
          return 'bg-green-900/50 text-green-300 border-green-700';
        case 'physical_exam':
          return 'bg-violet-900/50 text-violet-300 border-violet-700';
        case 'flashcards':
          return 'bg-orange-900/50 text-orange-300 border-orange-700';
        default:
          return 'bg-gray-800/50 text-gray-300 border-gray-700';
      }
    } else {
      switch (type) {
        case 'clerking':
          return 'bg-blue-100 text-blue-800 border-blue-300';
        case 'counselling':
          return 'bg-green-100 text-green-800 border-green-300';
        case 'physical_exam':
          return 'bg-violet-100 text-violet-800 border-violet-300';
        case 'flashcards':
          return 'bg-orange-100 text-orange-800 border-orange-300';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-300';
      }
    }
  };

  // NEW: Fetch CBT Stats
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
    
      if (!res.ok) {
        throw new Error('Failed to fetch CBT stats');
      }
      
      const data = await res.json();
      setCbtStats(data);
    } catch (error) {
      console.error('Error fetching CBT stats:', error);
      setCbtStats({
        totalAttempts: 0,
        totalQuestions: 0,
        correct: 0,
        wrong: 0,
        unanswered: 0,
        avgScore: 0,
        completedSessions: 0,
        scoresData: [],
        modeBreakdown: {
          practice: 0,
          timed: 0,
          exam: 0
        },
        accuracy: 0,
        completionRate: 0
      });
    }
  };

  // NEW: Fetch CBT Leaderboard
  const fetchCbtLeaderboard = async (scoreType: 'valid' | 'absolute' = 'valid') => {
    try {
      const res = await fetch(`/api/cbt-leaderboard?scoreType=${scoreType}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch CBT leaderboard');
      const data = await res.json();
      setCbtLeaderboardData(data);
    } catch (error) {
      console.error('Error fetching CBT leaderboard:', error);
      toast.error('Failed to fetch CBT leaderboard');
      setCbtLeaderboardData([]);
    }
  };

  // Helper function for date ranges
  const getDateFilterStart = (filter: DateFilter) => {
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

  const getDateFilterEnd = (filter: DateFilter) => {
    return new Date().toISOString();
  };

  // Update fetch calls with date filters
  const updatedFetchVoiceChatStats = async () => {
    try {
      const startDate = voiceDateFilter !== 'all' ? getDateFilterStart(voiceDateFilter) : '';
      const endDate = voiceDateFilter !== 'all' ? getDateFilterEnd(voiceDateFilter) : '';
      const customStart = voiceDateFilter === 'custom' ? voiceCustomStart : '';
      const customEnd = voiceDateFilter === 'custom' ? voiceCustomEnd : '';
      
      const res = await fetch(`/api/voice-stats?filter=${voiceChatStatsFilter}&startDate=${voiceDateFilter === 'custom' ? customStart : startDate}&endDate=${voiceDateFilter === 'custom' ? customEnd : endDate}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch voice stats');
      const data = await res.json();
      setVoiceChatStats(data);
    } catch (error) {
      console.error('Error fetching voice stats:', error);
      toast.error('Failed to fetch voice statistics');
    }
  };

  const updatedFetchFlashStats = async () => {
    try {
      const startDate = flashDateFilter !== 'all' ? getDateFilterStart(flashDateFilter) : '';
      const endDate = flashDateFilter !== 'all' ? getDateFilterEnd(flashDateFilter) : '';
      const customStart = flashDateFilter === 'custom' ? flashCustomStart : '';
      const customEnd = flashDateFilter === 'custom' ? flashCustomEnd : '';
      
      const res = await fetch(`/api/flash-stats?startDate=${flashDateFilter === 'custom' ? customStart : startDate}&endDate=${flashDateFilter === 'custom' ? customEnd : endDate}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch flash stats');
      const data = await res.json();
      setFlashStats(data);
    } catch (error) {
      console.error('Error fetching flash stats:', error);
      toast.error('Failed to fetch flash statistics');
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchCbtStats();
    }
  }, [cbtStatsFilter, cbtStatsDateFilter, cbtStatsCustomStart, cbtStatsCustomEnd, session]);

  useEffect(() => {
    updatedFetchVoiceChatStats();
  }, [voiceChatStatsFilter, voiceDateFilter, voiceCustomStart, voiceCustomEnd]);

  useEffect(() => {
    updatedFetchFlashStats();
  }, [flashDateFilter, flashCustomStart, flashCustomEnd]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchCbtLeaderboard(cbtLeaderboardScoreType);
    }
  }, [cbtLeaderboardScoreType, session]);

  useEffect(() => {
    if (session?.user?.id && currentLeaderTab === 'cbt') {
      fetch(`/api/cbt-leaderboard?scoreType=${leaderboardScoreType}`)
        .then(res => res.json())
        .then(data => setCbtLeaderboardData(data))
        .catch(err => console.error('Error fetching CBT leaderboard:', err));
    }
  }, [leaderboardScoreType, session, currentLeaderTab]);

  return (
    <>
      {/* Delete Confirmation Modal - Updated with dark mode */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-white/30 dark:bg-black/20 backdrop-blur-md flex items-center justify-center z-50"
          onClick={() => { setShowDeleteConfirm(false); setChatToDelete(null); }}
        >
          <div
            className={cn("rounded-2xl shadow-lg p-8 border backdrop-blur-sm max-w-md w-full mx-4",
              isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-gradient-to-br from-white/95 to-blue-50/95 border-blue-300"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {chatToDelete && (() => {
              const chat = chatHistory.find(c => c.id === chatToDelete);
              const patientDetails = chat ? getPatientDetails(chat) : null;
              return (
                <div className={cn("flex items-center space-x-4 mb-6 pb-6 border-b",
                  isDark ? "border-gray-700" : "border-blue-300"
                )}>
                  <img
                    src={chat ? getPatientImageUrl(chat) : '/uploads/default-avatar.png'}
                    alt={chat?.patientName || 'Patient'}
                    className="w-12 h-12 rounded-full border-2 object-cover shadow-sm"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className={cn("font-bold truncate text-lg", isDark ? "text-gray-100" : "text-slate-800")}>{chat?.patientName || 'Unknown Patient'}</h4>
                    <p className={cn("text-sm truncate", isDark ? "text-gray-400" : "text-slate-600")}>{chat?.title}</p>
                    {patientDetails && (
                      <p className={cn("text-sm", isDark ? "text-gray-500" : "text-slate-500")}>Age: {patientDetails.age || 'Unknown'}</p>
                    )}
                    <p className={cn("text-sm", isDark ? "text-gray-500" : "text-slate-500")}>Date: {new Date(chat?.createdAt || '').toLocaleDateString()}</p>
                  </div>
                </div>
              );
            })()}
            <h3 className={cn("text-xl font-bold mb-4 flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
              <i className="fas fa-exclamation-triangle text-amber-500 mr-3"></i>
              Confirm Delete
            </h3>
            <p className={cn("mb-8", isDark ? "text-gray-400" : "text-slate-600")}>Are you sure you want to delete this chat? This action cannot be undone.</p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => { setShowDeleteConfirm(false); setChatToDelete(null); }}
                className={cn("px-6 py-3 border-2 rounded-xl transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl cursor-pointer",
                  isDark ? "border-gray-700 hover:border-gray-500 hover:bg-gray-800/80 text-gray-300" : "border-slate-300 hover:border-slate-500 hover:bg-slate-50/80 text-slate-700"
                )}
              >
                <i className="fas fa-times mr-3"></i>
                Cancel
              </button>
              <button
                onClick={handleDeleteChat}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:from-red-600 hover:to-rose-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
              >
                <i className="fas fa-trash mr-3"></i>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal - Updated with dark mode */}
      {showPreviewModal && (
        <div
          className="fixed inset-0 bg-white/30 dark:bg-black/20 backdrop-blur-md flex items-center justify-center z-50"
          onClick={() => {
            setShowPreviewModal(false);
            setPreviewMessages([]);
            setPreviewChatId(null);
          }}
        >
          <div
            className={cn("rounded-2xl shadow-lg p-8 border backdrop-blur-sm max-w-4xl w-full mx-4 max-h-[85vh] overflow-y-auto",
              isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-gradient-to-br from-white/95 to-blue-50/95 border-blue-300"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={cn("flex items-center justify-between mb-8 pb-6 border-b",
              isDark ? "border-gray-700" : "border-blue-300"
            )}>
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                {previewChatId && (() => {
                  const chat = chatHistory.find(c => c.id === previewChatId);
                  const patientDetails = chat ? getPatientDetails(chat) : null;
                  return (
                    <>
                      <img
                        src={chat ? getPatientImageUrl(chat) : '/uploads/default-avatar.png'}
                        alt={chat?.patientName || 'Patient'}
                        className="w-14 h-14 rounded-full border-2 object-cover shadow-sm"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className={cn("text-xl font-bold truncate", isDark ? "text-gray-100" : "text-slate-800")}>
                          {chat?.patientName || 'Unknown Patient'}
                        </h3>
                        <p className={cn("text-sm truncate", isDark ? "text-gray-400" : "text-slate-600")}>{chat?.title}</p>
                        {patientDetails && (
                          <p className={cn("text-sm", isDark ? "text-gray-500" : "text-slate-500")}>Age: {patientDetails.age || 'Unknown'}</p>
                        )}
                        <p className={cn("text-sm", isDark ? "text-gray-500" : "text-slate-500")}>Date: {new Date(chat?.createdAt || '').toLocaleDateString()}</p>
                      </div>
                    </>
                  );
                })()}
              </div>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewMessages([]);
                  setPreviewChatId(null);
                }}
                className={cn("p-3 rounded-xl transition-all duration-300 text-slate-500 hover:text-slate-700 flex-shrink-0 ml-4",
                  isDark ? "hover:bg-gray-700" : "hover:bg-slate-100/80"
                )}
              >
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>
            <h3 className={cn("text-2xl font-bold mb-6 flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
              <i className="fas fa-eye mr-4 text-blue-500"></i>
              Chat Preview
            </h3>
            {isLoadingPreview ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mr-4"></div>
                <p className={cn("text-lg", isDark ? "text-gray-400" : "text-slate-600")}>Loading messages...</p>
              </div>
            ) : previewMessages.length === 0 ? (
              <div className={cn("text-center py-12 rounded-2xl border backdrop-blur-sm",
                isDark ? "bg-gray-700/50 border-gray-600" : "bg-gradient-to-br from-slate-50/80 to-blue-50/80 border-blue-300"
              )}>
                <i className="fas fa-comment-slash text-4xl text-slate-400 mb-4"></i>
                <p className={cn("text-lg", isDark ? "text-gray-400" : "text-slate-500")}>No messages in this chat.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {previewMessages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.role === 'student' ? 'justify-end' : 'justify-start'}`}>
                    <div className={cn("max-w-[80%] p-4 rounded-2xl backdrop-blur-sm shadow-lg",
                      msg.role === 'student'
                        ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-br-none"
                        : isDark
                          ? "bg-gray-700/90 text-gray-200 rounded-bl-none border border-gray-600"
                          : "bg-gradient-to-r from-slate-100/80 to-slate-200/80 text-slate-800 rounded-bl-none shadow-sm border border-slate-300"
                    )}>
                      <p className="text-base leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className={cn("flex justify-end mt-8 pt-6 border-t",
              isDark ? "border-gray-700" : "border-blue-300"
            )}>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewMessages([]);
                  setPreviewChatId(null);
                }}
                className={cn("px-6 py-3 border-2 rounded-xl transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl cursor-pointer",
                  isDark ? "border-gray-700 hover:border-gray-500 hover:bg-gray-800/80 text-gray-300" : "border-slate-300 hover:border-slate-500 hover:bg-slate-50/80 text-slate-700"
                )}
              >
                <i className="fas fa-times mr-3"></i>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Popup - Updated with dark mode */}
      {showLoadingPopup && (
        <div className="fixed inset-0 bg-white/40 dark:bg-black/30 backdrop-blur-lg flex items-center justify-center z-50">
          <div className={cn("rounded-2xl p-8 flex flex-col items-center min-w-[300px] md:min-w-[400px] max-w-md mx-4 border shadow-xl backdrop-blur-sm",
            isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-gradient-to-br from-white/95 to-blue-50/95 border-blue-300"
          )}>
            <div className="relative mb-6">
              <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-blue-500"></div>
              <div className="absolute inset-0 rounded-full h-14 w-14 border-t-2 border-blue-300 animate-pulse"></div>
            </div>
            <p className={cn("font-bold mb-3 text-center text-lg", isDark ? "text-gray-100" : "text-slate-800")}>{loadingMessage}</p>
            <div className={cn("flex items-center mb-6", isDark ? "text-gray-400" : "text-slate-600")}>
              <span className="animate-pulse">Loading</span>
              <span className="animate-pulse delay-100">.</span>
              <span className="animate-pulse delay-200">.</span>
              <span className="animate-pulse delay-300">.</span>
            </div>
            {currentMedicalQuote && (
              <div className={cn("border-l-4 p-6 rounded-xl mb-6 w-full text-center backdrop-blur-sm",
                isDark ? "bg-blue-950/50 border-blue-600" : "bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-blue-500"
              )}>
                <div className="flex flex-col items-center">
                  <p className={cn("text-base italic", isDark ? "text-gray-300" : "text-slate-700")}>{currentMedicalQuote.text}</p>
                  <p className={cn("text-sm mt-2", isDark ? "text-gray-400" : "text-slate-600")}>{currentMedicalQuote.author}</p>
                </div>
              </div>
            )}
            <div className="w-full bg-slate-300 rounded-full h-3 mt-2 backdrop-blur-sm">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: '100%',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 2s infinite'
                }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Analyzing Modal - Updated with dark mode */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-white/30 dark:bg-black/20 backdrop-blur-md flex items-center justify-center z-50">
          <div className={cn("rounded-2xl shadow-lg p-8 border backdrop-blur-sm max-w-md w-full mx-4",
            isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-gradient-to-br from-white/95 to-blue-50/95 border-blue-300"
          )}>
            {analyzedChatId && (() => {
              const chat = chatHistory.find(c => c.id === analyzedChatId);
              const patientDetails = chat ? getPatientDetails(chat) : null;
              return (
                <div className={cn("flex items-center space-x-4 mb-6 pb-6 border-b",
                  isDark ? "border-gray-700" : "border-blue-300"
                )}>
                  <img
                    src={chat ? getPatientImageUrl(chat) : '/uploads/default-avatar.png'}
                    alt={chat?.patientName || 'Patient'}
                    className="w-12 h-12 rounded-full border-2 object-cover shadow-sm"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className={cn("font-bold truncate text-lg", isDark ? "text-gray-100" : "text-slate-800")}>{chat?.patientName || 'Unknown Patient'}</h4>
                    <p className={cn("text-sm truncate", isDark ? "text-gray-400" : "text-slate-600")}>{chat?.title}</p>
                    {patientDetails && (
                      <p className={cn("text-sm", isDark ? "text-gray-500" : "text-slate-500")}>Age: {patientDetails.age || 'Unknown'}</p>
                    )}
                    <p className={cn("text-sm", isDark ? "text-gray-500" : "text-slate-500")}>Date: {new Date(chat?.createdAt || '').toLocaleDateString()}</p>
                  </div>
                </div>
              );
            })()}
            <h3 className={cn("text-xl font-bold mb-6 text-center flex items-center justify-center", isDark ? "text-gray-100" : "text-slate-800")}>
              <i className="fas fa-chart-line mr-4 text-blue-500"></i>
              Analyzing Conversation
            </h3>
            <div className="flex justify-center mb-6">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
            </div>
            <p className={cn("text-center mb-6 text-lg", isDark ? "text-gray-400" : "text-slate-600")}>
              Please wait while we analyze your conversation...
            </p>
            {currentMedicalQuote && (
              <div className={cn("border-l-4 p-6 rounded-xl mb-6 w-full text-center backdrop-blur-sm",
                isDark ? "bg-blue-950/50 border-blue-600" : "bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-blue-500"
              )}>
                <div className="flex flex-col items-center">
                  <p className={cn("text-base italic", isDark ? "text-gray-300" : "text-slate-700")}>{currentMedicalQuote.text}</p>
                  <p className={cn("text-sm mt-2", isDark ? "text-gray-400" : "text-slate-600")}>{currentMedicalQuote.author}</p>
                </div>
              </div>
            )}
            <div className="w-full bg-slate-300 rounded-full h-3 backdrop-blur-sm">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: '100%',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 2s infinite'
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal - Updated with dark mode */}
      {showFeedbackModal && !isAnalyzing && currentFeedback && (
        <div className="fixed inset-0 bg-white/30 dark:bg-black/20 backdrop-blur-md flex items-center justify-center z-50">
          <div className={cn("rounded-2xl shadow-lg p-8 border backdrop-blur-sm max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto",
            isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-gradient-to-br from-white/95 to-blue-50/95 border-blue-300"
          )}>
            {analyzedChatId && (() => {
              const chat = chatHistory.find(c => c.id === analyzedChatId);
              const patientDetails = chat ? getPatientDetails(chat) : null;
              return (
                <div className={cn("flex items-center justify-between mb-8 pb-6 border-b",
                  isDark ? "border-gray-700" : "border-blue-300"
                )}>
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <img
                      src={chat ? getPatientImageUrl(chat) : '/uploads/default-avatar.png'}
                      alt={chat?.patientName || 'Patient'}
                      className="w-14 h-14 rounded-full border-2 object-cover shadow-sm"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className={cn("text-xl font-bold truncate", isDark ? "text-gray-100" : "text-slate-800")}>{chat?.patientName || 'Unknown Patient'}</h3>
                      <p className={cn("text-sm truncate", isDark ? "text-gray-400" : "text-slate-600")}>{chat?.title}</p>
                      {patientDetails && (
                        <p className={cn("text-sm", isDark ? "text-gray-500" : "text-slate-500")}>Age: {patientDetails.age || 'Unknown'}</p>
                      )}
                      <p className={cn("text-sm", isDark ? "text-gray-500" : "text-slate-500")}>Date: {new Date(chat?.createdAt || '').toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowFeedbackModal(false); setCurrentFeedback(null); }}
                    className={cn("p-3 rounded-xl transition-all duration-300 text-slate-500 hover:text-slate-700 flex-shrink-0 ml-4",
                      isDark ? "hover:bg-gray-700" : "hover:bg-slate-100/80"
                    )}
                  >
                    <i className="fas fa-times text-lg"></i>
                  </button>
                </div>
              );
            })()}
            <h3 className={cn("text-2xl font-bold mb-8 flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
              <i className="fas fa-comment-medical mr-4 text-blue-500"></i>
              Feedback Analysis
            </h3>
            <div className="space-y-6">
              {/* Performance Rating */}
              <div className={cn("p-8 rounded-2xl border backdrop-blur-sm",
                isDark ? "bg-blue-950/50 border-blue-800/50" : "bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-blue-300"
              )}>
                <h2 className={cn("text-xl font-bold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
                  <i className="fas fa-chart-bar mr-4 text-blue-500"></i>
                  Performance Rating
                </h2>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {Array.from({ length: 5 }, (_, i) => (
                      <i key={i} className={`${i < currentFeedback.rating ? 'fas fa-star text-amber-500' : 'far fa-star text-slate-300'} text-2xl mr-2`}></i>
                    ))}
                    <span className={cn("ml-4 text-lg", isDark ? "text-gray-400" : "text-slate-600")}>({currentFeedback.rating}/5)</span>
                  </div>
                  <div className="text-4xl font-bold text-blue-600">{currentFeedback.percentage}%</div>
                </div>
              </div>
              
              {/* Points Considered Section
              <div className={cn("p-6 rounded-2xl border backdrop-blur-sm",
                isDark ? "bg-indigo-950/50 border-indigo-800/50" : "bg-gradient-to-br from-indigo-50/80 to-purple-50/80 border-indigo-300"
              )}>
                <h2 className={cn("text-lg font-bold mb-4 flex items-center", isDark ? "text-indigo-300" : "text-indigo-800")}>
                  <i className="fas fa-clipboard-list mr-3"></i>
                  Points Considered
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {((currentFeedback as any).points_considered || []).map((item: any, index: number) => (
                    <div key={index} className={cn("p-4 rounded-xl border backdrop-blur-sm",
                      item.score >= (item.score >= 15 ? 15 : 8) 
                        ? isDark ? "bg-green-950/50 border-green-800/50" : "bg-gradient-to-r from-green-50/80 to-emerald-50/80 border-green-300"
                        : item.score > 0 
                          ? isDark ? "bg-amber-950/50 border-amber-800/50" : "bg-gradient-to-r from-amber-50/80 to-orange-50/80 border-amber-300"
                          : isDark ? "bg-rose-950/50 border-rose-800/50" : "bg-gradient-to-r from-rose-50/80 to-pink-50/80 border-rose-300"
                    )}>
                      <div className="flex justify-between items-center mb-2">
                        <span className={cn("font-bold text-sm", isDark ? "text-gray-200" : "text-slate-800")}>{item.category}</span>
                        <span className={cn("px-3 py-1 rounded-lg text-xs font-bold",
                          item.score >= (item.score >= 15 ? 15 : 8)
                            ? isDark ? "bg-green-900/50 text-green-300 border border-green-700" : "bg-green-100 text-green-800 border border-green-300"
                            : item.score > 0
                              ? isDark ? "bg-amber-900/50 text-amber-300 border border-amber-700" : "bg-amber-100 text-amber-800 border border-amber-300"
                              : isDark ? "bg-rose-900/50 text-rose-300 border border-rose-700" : "bg-rose-100 text-rose-800 border border-rose-300"
                        )}>
                          {item.score}/{item.score >= 15 ? 20 : 10}
                        </span>
                      </div>
                      <p className={cn("text-xs truncate", isDark ? "text-gray-400" : "text-slate-600")} title={item.evidence}>
                        {item.evidence === "absent" ? (
                          <span className="text-rose-600 italic">Not addressed</span>
                        ) : (
                          <span className={isDark ? "text-gray-300" : "text-slate-700"}>"{item.evidence}"</span>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div> */}

              {/* Strengths & Areas of Improvement */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={cn("p-6 rounded-2xl border backdrop-blur-sm",
                  isDark ? "bg-green-950/50 border-green-800/50" : "bg-gradient-to-br from-green-50/80 to-emerald-50/80 border-green-300"
                )}>
                  <h2 className={cn("text-lg font-bold mb-4 flex items-center", isDark ? "text-green-300" : "text-green-800")}>
                    <i className="fas fa-thumbs-up mr-3"></i>
                    Strengths
                  </h2>
                  {currentFeedback.strengths && currentFeedback.strengths.length > 0 ? (
                    <ul className="space-y-3">
                      {currentFeedback.strengths.map((item: { category: string; score: number; evidence: string }, i: number) => (
                        <li key={i} className="flex items-start">
                          <i className="fas fa-check text-green-500 mt-1 mr-4 text-lg"></i>
                          <div>
                            <span className={cn("font-semibold text-lg", isDark ? "text-green-300" : "text-green-700")}>{item.category}</span>
                            <p className={cn("text-sm mt-2", isDark ? "text-green-400" : "text-green-600")}>Score: {item.score} | Evidence: {item.evidence}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-rose-600 font-semibold flex items-center text-lg">
                      <i className="fas fa-exclamation-circle mr-3"></i>
                      No key strengths noticed. Kindly improve.
                    </p>
                  )}
                </div>
                <div className={cn("p-6 rounded-2xl border backdrop-blur-sm",
                  isDark ? "bg-amber-950/50 border-amber-800/50" : "bg-gradient-to-br from-amber-50/80 to-orange-50/80 border-amber-300"
                )}>
                  <h2 className={cn("text-lg font-bold mb-4 flex items-center", isDark ? "text-amber-300" : "text-amber-800")}>
                    <i className="fas fa-tools mr-3"></i>
                    Areas of Improvement
                  </h2>
                  <ul className="space-y-3">
                    {((currentFeedback as any).areas_of_improvement || (currentFeedback as any).improvements || []).map((item: { category: string; score: number; evidence: string }, i: number) => (
                      <li key={i} className="flex items-start">
                        <i className="fas fa-exclamation-triangle text-amber-500 mt-1 mr-4 text-lg"></i>
                        <div>
                          <span className={cn("font-semibold text-lg", isDark ? "text-amber-300" : "text-amber-700")}>{item.category}</span>
                          <p className={cn("text-sm mt-2", isDark ? "text-amber-400" : "text-amber-600")}>Score: {item.score} | Evidence: {item.evidence}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              {/* Suggestions */}
              <div className={cn("p-6 rounded-2xl border backdrop-blur-sm",
                isDark ? "bg-blue-950/50 border-blue-800/50" : "bg-gradient-to-br from-blue-50/80 to-indigo-50/80 border-blue-300"
              )}>
                <h2 className={cn("text-lg font-bold mb-4 flex items-center", isDark ? "text-blue-300" : "text-blue-800")}>
                  <i className="fas fa-lightbulb mr-3"></i>
                  Suggestions
                </h2>
                <ul className="space-y-3">
                  {currentFeedback.suggestions.map((sug: string, i: number) => (
                    <li key={i} className="flex items-start">
                      <i className="fas fa-arrow-right text-blue-500 mt-1 mr-4 text-lg"></i>
                      <span className={cn("text-lg", isDark ? "text-gray-300" : "text-slate-700")}>{sug}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Overall Assessment */}
              <div className={cn("p-6 rounded-2xl border backdrop-blur-sm",
                isDark ? "bg-violet-950/50 border-violet-800/50" : "bg-gradient-to-br from-violet-50/80 to-violet-50/80 border-violet-300"
              )}>
                <h2 className={cn("text-lg font-bold mb-4 flex items-center", isDark ? "text-violet-300" : "text-violet-800")}>
                  <i className="fas fa-clipboard-check mr-3"></i>
                  Overall Assessment
                </h2>
                <p className={cn("leading-relaxed text-lg", isDark ? "text-gray-300" : "text-slate-700")}>{currentFeedback.overall_assessment}</p>
              </div>
            </div>
            <div className={cn("flex justify-end mt-8 pt-6 border-t",
              isDark ? "border-gray-700" : "border-blue-300"
            )}>
              <button
                onClick={() => { setShowFeedbackModal(false); setCurrentFeedback(null); }}
                className={cn("px-6 py-3 border-2 rounded-xl transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl cursor-pointer",
                  isDark ? "border-gray-700 hover:border-gray-500 hover:bg-gray-800/80 text-gray-300" : "border-slate-300 hover:border-slate-500 hover:bg-slate-50/80 text-slate-700"
                )}
              >
                <i className="fas fa-times mr-3"></i>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exam Result Modal - Updated with dark mode */}
      {showExamResultModal && examOverallFeedback && (
        <div
          className="fixed inset-0 bg-white/40 dark:bg-black/30 backdrop-blur-lg flex items-center justify-center z-50"
          onClick={() => setShowExamResultModal(false)}
        >
          <div
            className={cn("rounded-2xl shadow-lg p-8 border backdrop-blur-sm max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto",
              isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-gradient-to-br from-white/95 to-blue-50/95 border-blue-300"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={cn("flex justify-between items-center mb-8 pb-6 border-b",
              isDark ? "border-gray-700" : "border-blue-300"
            )}>
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                {analyzedChatId && (() => {
                  const chat = chatHistory.find(c => c.id === analyzedChatId);
                  const patientDetails = chat ? getPatientDetails(chat) : null;
                  return (
                    <>
                      <img
                        src={chat ? getPatientImageUrl(chat) : '/uploads/default-avatar.png'}
                        alt={chat?.patientName || 'Patient'}
                        className="w-14 h-14 rounded-full border-2 object-cover shadow-sm"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className={cn("text-xl font-bold truncate", isDark ? "text-gray-100" : "text-slate-800")}>{chat?.patientName || 'Unknown Patient'}</h3>
                        <p className={cn("text-sm truncate", isDark ? "text-gray-400" : "text-slate-600")}>{chat?.title}</p>
                        {patientDetails && (
                          <p className={cn("text-sm", isDark ? "text-gray-500" : "text-slate-500")}>Age: {patientDetails.age || 'Unknown'}</p>
                        )}
                        <p className={cn("text-sm", isDark ? "text-gray-500" : "text-slate-500")}>Date: {new Date(chat?.createdAt || '').toLocaleDateString()}</p>
                      </div>
                    </>
                  );
                })()}
              </div>
              <button
                onClick={() => setShowExamResultModal(false)}
                className={cn("p-3 rounded-xl transition-all duration-300 flex items-center",
                  isDark ? "hover:bg-gray-700" : "hover:bg-slate-100/80"
                )}
                aria-label="Close results"
              >
                <i className="fas fa-times text-lg text-slate-500 hover:text-slate-700"></i>
              </button>
            </div>
            {/* Overall Performance */}
            <div className={cn("rounded-2xl p-8 mb-8 border backdrop-blur-sm",
              isDark ? "bg-blue-950/50 border-blue-800/50" : "bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-blue-300"
            )}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className={cn("text-2xl font-bold mb-4 flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
                    <i className="fas fa-trophy mr-4 text-amber-500"></i>
                    Overall Performance
                  </h4>
                  <div className="flex items-center mb-4">
                    <div className="text-5xl font-bold text-blue-600 mr-8">
                      {examOverallFeedback.percentage}%
                    </div>
                    <div className="flex">
                      {Array.from({ length: 5 }, (_, i) => (
                        <i key={i} className={`text-3xl ${
                          i < examOverallFeedback.rating ? 'fas fa-star text-amber-500' : 'far fa-star text-slate-300'
                        } mr-2`}></i>
                      ))}
                    </div>
                  </div>
                  <p className={cn("text-lg", isDark ? "text-gray-300" : "text-slate-600")}>
                    {examOverallFeedback.overall_assessment}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 ml-8">
                  <div className={cn("rounded-2xl p-4 shadow-sm border backdrop-blur-sm",
                    isDark ? "bg-gray-700/50 border-gray-600" : "bg-white/80 border-blue-300"
                  )}>
                    <div className={cn("text-sm", isDark ? "text-gray-400" : "text-slate-500")}>Total Steps</div>
                    <div className={cn("text-2xl font-bold", isDark ? "text-gray-100" : "text-slate-800")}>
                      {examOverallFeedback.step_summary?.length || 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Step-by-Step + Category Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Step-by-Step Performance */}
              <div className={cn("rounded-2xl border flex flex-col h-full backdrop-blur-sm",
                isDark ? "bg-gray-700/50 border-gray-600" : "bg-gradient-to-br from-white/80 to-slate-50/80 border-slate-300"
              )}>
                <div className={cn("p-6 border-b", isDark ? "border-gray-600" : "border-slate-300")}>
                  <h4 className={cn("text-xl font-bold flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
                    <i className="fas fa-list-ol mr-4 text-blue-500"></i>
                    Step-by-Step Performance
                  </h4>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="space-y-4">
                    {examOverallFeedback.step_summary?.map((step: any, index: number) => (
                      <div key={index} className={cn("border-l-4 border-blue-500 pl-6 py-4 rounded-r-2xl backdrop-blur-sm",
                        isDark ? "bg-gray-800/50" : "bg-white/50"
                      )}>
                        <div className="flex justify-between items-start">
                          <h5 className={cn("font-bold text-lg", isDark ? "text-gray-100" : "text-slate-800")}>
                            {step.step_name}
                          </h5>
                          <span className={cn("px-3 py-2 rounded-xl text-sm font-bold",
                            (step.score || 0) >= 15 
                              ? isDark ? "bg-green-900/50 text-green-300 border border-green-700" : "bg-green-100 text-green-800 border border-green-300"
                              : (step.score || 0) >= 10 
                                ? isDark ? "bg-amber-900/50 text-amber-300 border border-amber-700" : "bg-amber-100 text-amber-800 border border-amber-300"
                                : isDark ? "bg-rose-900/50 text-rose-300 border border-rose-700" : "bg-rose-100 text-rose-800 border border-rose-300"
                          )}>
                            {step.score}/20
                          </span>
                        </div>
                        <p className={cn("mt-3 text-base", isDark ? "text-gray-400" : "text-slate-600")}>
                          {step.key_findings}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Category Analysis */}
              <div className={cn("rounded-2xl border flex flex-col h-full backdrop-blur-sm",
                isDark ? "bg-gray-700/50 border-gray-600" : "bg-gradient-to-br from-white/80 to-slate-50/80 border-slate-300"
              )}>
                <div className={cn("p-6 border-b", isDark ? "border-gray-600" : "border-slate-300")}>
                  <h4 className={cn("text-xl font-bold flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
                    <i className="fas fa-chart-pie mr-4 text-violet-500"></i>
                    Category Analysis
                  </h4>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="space-y-4">
                    {examOverallFeedback.category_analysis?.map((category: any, index: number) => (
                      <div key={index} className={cn("flex items-center justify-between p-4 rounded-2xl border backdrop-blur-sm",
                        isDark ? "bg-gray-800/50 border-gray-700" : "bg-gradient-to-r from-slate-50/80 to-blue-50/80 border-blue-300"
                      )}>
                        <span className={cn("font-bold text-lg", isDark ? "text-gray-200" : "text-slate-700")}>
                          {category.category}
                        </span>
                        <div className="flex items-center">
                          <div className={cn("w-24 rounded-full h-3 mr-4 backdrop-blur-sm",
                            isDark ? "bg-gray-600" : "bg-slate-300"
                          )}>
                            <div
                              className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full"
                              style={{ width: `${((category.score || 0) / 10) * 100}%` }}
                            ></div>
                          </div>
                          <span className={cn("text-base font-bold", isDark ? "text-gray-200" : "text-slate-700")}>
                            {category.score}/10
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {/* Strengths & Improvements */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className={cn("p-6 rounded-2xl border backdrop-blur-sm",
                isDark ? "bg-green-950/50 border-green-800/50" : "bg-gradient-to-br from-green-50/80 to-emerald-50/80 border-green-300"
              )}>
                <h4 className={cn("text-xl font-bold mb-6 flex items-center", isDark ? "text-green-300" : "text-green-800")}>
                  <i className="fas fa-check-circle mr-4"></i>
                  Key Strengths
                </h4>
                {examOverallFeedback.strengths && examOverallFeedback.strengths.length > 0 ? (
                  <ul className="space-y-4">
                    {examOverallFeedback.strengths.map((strength: any, index: number) => (
                      <li key={index} className="flex items-start">
                        <i className="fas fa-check text-green-500 mt-1 mr-4 text-lg"></i>
                        <div>
                          <span className={cn("font-bold text-lg", isDark ? "text-green-300" : "text-green-700")}>
                            {strength.category}
                          </span>
                          {strength.evidence && (
                            <p className={cn("mt-2 text-base", isDark ? "text-green-400" : "text-green-600")}>"{strength.evidence}"</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-rose-600 font-bold flex items-center text-lg">
                    <i className="fas fa-exclamation-circle mr-4"></i>
                    No key strengths noticed. Kindly improve.
                  </p>
                )}
              </div>
              <div className={cn("p-6 rounded-2xl border backdrop-blur-sm",
                isDark ? "bg-amber-950/50 border-amber-800/50" : "bg-gradient-to-br from-amber-50/80 to-orange-50/80 border-amber-300"
              )}>
                <h4 className={cn("text-xl font-bold mb-6 flex items-center", isDark ? "text-amber-300" : "text-amber-800")}>
                  <i className="fas fa-exclamation-triangle mr-4"></i>
                  Areas for Improvement
                </h4>
                <ul className="space-y-4">
                  {examOverallFeedback.improvements?.map((improvement: any, index: number) => (
                    <li key={index} className="flex items-start">
                      <i className="fas fa-arrow-right text-amber-500 mt-1 mr-4 text-lg"></i>
                      <div>
                        <span className={cn("font-bold text-lg", isDark ? "text-amber-300" : "text-amber-700")}>
                          {improvement.category}
                        </span>
                        {improvement.evidence && (
                          <p className={cn("mt-2 text-base", isDark ? "text-amber-400" : "text-amber-600")}>"{improvement.evidence}"</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {/* Actionable Suggestions */}
            {examOverallFeedback.suggestions?.length > 0 && (
              <div className={cn("p-6 rounded-2xl border backdrop-blur-sm mb-8",
                isDark ? "bg-blue-950/50 border-blue-800/50" : "bg-gradient-to-br from-blue-50/80 to-indigo-50/80 border-blue-300"
              )}>
                <h4 className={cn("text-xl font-bold mb-6 flex items-center", isDark ? "text-blue-300" : "text-blue-800")}>
                  <i className="fas fa-lightbulb mr-4"></i>
                  Actionable Suggestions
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {examOverallFeedback.suggestions.map((suggestion: any, index: number) => (
                    <div key={index} className={cn("flex items-start p-4 rounded-2xl backdrop-blur-sm border",
                      isDark ? "bg-gray-700/50 border-gray-600" : "bg-white/80 border-blue-300"
                    )}>
                      <i className="fas fa-bullseye text-blue-500 mt-1 mr-4 text-lg"></i>
                      <span className={cn("text-lg", isDark ? "text-gray-300" : "text-slate-700")}>
                        {suggestion}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Close Button */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowExamResultModal(false)}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center font-bold shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
              >
                <i className="fas fa-times mr-4"></i>
                Close Results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION CONTENT */}
      {currentSection === 'selection' && (
        <div className={cn("rounded-2xl shadow-lg p-8 border backdrop-blur-sm",
          isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-gradient-to-br from-white/95 to-blue-50/95 border-blue-300"
        )}>
          <h2 className={cn("text-3xl font-bold mb-8 flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
            <i className="fas fa-home mr-4 text-blue-500"></i>What would you like to do?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {/* <button onClick={() => switchSection('cbt-examination')} className={cn("group border-2 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 backdrop-blur-sm cursor-pointer text-left",
              isDark 
                ? "bg-gradient-to-br from-gray-800 to-rose-950/80 border-rose-800/60 hover:border-rose-700"
                : "bg-gradient-to-br from-white to-rose-100/80 border-rose-300 hover:border-rose-500"
            )}>
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl flex items-center justify-center mr-4">
                  <i className="fas fa-laptop-medical text-white text-xl"></i>
                </div>
                <h3 className={cn("text-xl font-bold", isDark ? "text-gray-100" : "text-slate-800")}>CBT Examination</h3>
              </div>
              <p className={isDark ? "text-gray-400" : "text-slate-600"}>Practice computer-based test scenarios</p>
            </button> */}
            <button onClick={() => handleCardClick('clerking')} className={cn("group border-2 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 backdrop-blur-sm cursor-pointer text-left",
              isDark 
                ? "bg-gradient-to-br from-gray-800 to-blue-950/80 border-blue-800/60 hover:border-blue-700"
                : "bg-gradient-to-br from-white to-blue-100/80 border-blue-300 hover:border-blue-500"
            )}>
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4">
                  <i className="fas fa-file-medical text-white text-xl"></i>
                </div>
                <h3 className={cn("text-xl font-bold", isDark ? "text-gray-100" : "text-slate-800")}>Clerking</h3>
              </div>
              <p className={isDark ? "text-gray-400" : "text-slate-600"}>Practice patient history taking</p>
            </button>
            <button onClick={() => handleCardClick('counselling')} className={cn("group border-2 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 backdrop-blur-sm cursor-pointer text-left",
              isDark 
                ? "bg-gradient-to-br from-gray-800 to-green-950/80 border-green-800/60 hover:border-green-700"
                : "bg-gradient-to-br from-white to-green-100/80 border-green-300 hover:border-green-500"
            )}>
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-4">
                  <i className="fas fa-comments text-white text-xl"></i>
                </div>
                <h3 className={cn("text-xl font-bold", isDark ? "text-gray-100" : "text-slate-800")}>Counselling</h3>
              </div>
              <p className={isDark ? "text-gray-400" : "text-slate-600"}>Practice patient communication skills</p>
            </button>
            <button onClick={() => handleCardClick('physical_exam')} className={cn("group border-2 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 backdrop-blur-sm cursor-pointer text-left",
              isDark 
                ? "bg-gradient-to-br from-gray-800 to-violet-950/80 border-violet-800/60 hover:border-violet-700"
                : "bg-gradient-to-br from-white to-violet-100/80 border-violet-300 hover:border-violet-500"
            )}>
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-violet-500 to-violet-600 rounded-xl flex items-center justify-center mr-4">
                  <i className="fas fa-stethoscope text-white text-xl"></i>
                </div>
                <h3 className={cn("text-xl font-bold", isDark ? "text-gray-100" : "text-slate-800")}>Physical Examination</h3>
              </div>
              <p className={isDark ? "text-gray-400" : "text-slate-600"}>Practice clinical examination skills</p>
            </button>
            <button onClick={() => handleCardClick('flashcards')} className={cn("group border-2 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 backdrop-blur-sm cursor-pointer text-left",
              isDark 
                ? "bg-gradient-to-br from-gray-800 to-orange-950/80 border-orange-800/60 hover:border-orange-700"
                : "bg-gradient-to-br from-white to-orange-100/80 border-orange-300 hover:border-orange-500"
            )}>
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl flex items-center justify-center mr-4">
                  <i className="fas fa-layer-group text-white text-xl"></i>
                </div>
                <h3 className={cn("text-xl font-bold", isDark ? "text-gray-100" : "text-slate-800")}>Flashcards</h3>
              </div>
              <p className={isDark ? "text-gray-400" : "text-slate-600"}>Study with interactive flashcards</p>
            </button>
          </div>

          {/* Redesigned Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* 1st Card: Quick Simulation */}
            <div className={cn("rounded-2xl p-8 border shadow-sm backdrop-blur-sm",
              isDark ? "bg-gray-700/50 border-green-800/50" : "bg-gradient-to-br from-white/80 to-green-50/80 border-green-300"
            )}>
              <h3 className={cn("text-2xl font-bold mb-6 flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
                <i className="fas fa-bolt mr-4 text-green-500"></i>
                Quick Simulation
              </h3>
              <div className="grid grid-cols-1 gap-4 mb-6">
                <select
                  value={quickFilterType}
                  onChange={(e) => setQuickFilterType(e.target.value as any)}
                  className={cn("p-4 border-2 rounded-xl focus:ring-4 transition-all duration-200 text-lg backdrop-blur-sm cursor-pointer",
                    isDark ? "bg-gray-800 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200" : "bg-white/80 border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  )}
                >
                  <option value="">All Types</option>
                  <option value="clerking">Clerking</option>
                  <option value="counselling">Counselling</option>
                  <option value="physical_exam">Physical Exam</option>
                </select>
                <select
                  value={quickFilterDepartment}
                  onChange={(e) => setQuickFilterDepartment(e.target.value)}
                  className={cn("p-4 border-2 rounded-xl focus:ring-4 transition-all duration-200 text-lg backdrop-blur-sm cursor-pointer",
                    isDark ? "bg-gray-800 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200" : "bg-white/80 border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  )}
                >
                  <option value="">All Departments</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <input
                  value={quickSearch}
                  onChange={(e) => setQuickSearch(e.target.value)}
                  placeholder="Search case/location..."
                  className={cn("p-4 border-2 rounded-xl focus:ring-4 transition-all duration-200 text-lg backdrop-blur-sm",
                    isDark ? "bg-gray-800 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200 placeholder:text-gray-500" : "bg-white/80 border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  )}
                />
              </div>
              {filteredQuickPatients.length === 0 ? (
                <div className={cn("text-center py-12 rounded-2xl border backdrop-blur-sm",
                  isDark ? "bg-gray-700/50 border-gray-600" : "bg-gradient-to-br from-slate-50/80 to-blue-50/80 border-blue-300"
                )}>
                  <i className="fas fa-user-injured text-4xl text-slate-400 mb-4"></i>
                  <p className={isDark ? "text-gray-400" : "text-slate-500"}>No patients match filters.</p>
                </div>
              ) : (
                <div className="relative w-full">
                  <div className="flex items-center justify-center w-full">
                    <button
                      onClick={() => setQuickCurrentIndex(Math.max(0, quickCurrentIndex - 1))}
                      disabled={quickCurrentIndex === 0}
                      className={cn("p-4 disabled:opacity-50 hidden sm:block rounded-xl transition-all duration-300 backdrop-blur-sm cursor-pointer",
                        isDark ? "hover:bg-gray-700" : "hover:bg-slate-100/80"
                      )}
                    >
                      <i className="fas fa-chevron-left text-2xl text-slate-600"></i>
                    </button>
                    <div
                      className={`bg-gradient-to-br ${getRandomGradient(quickCurrentIndex)} rounded-2xl p-8 shadow-2xl w-full max-w-sm text-center mx-4 cursor-grab active:cursor-grabbing transition-transform backdrop-blur-sm`}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    >
                      {filteredQuickPatients[quickCurrentIndex] && (
                        <>
                          <img
                            src={filteredQuickPatients[quickCurrentIndex].imageUrl || '/uploads/default-avatar.png'}
                            alt="Patient"
                            className="w-24 h-24 rounded-full mx-auto mb-6 border-4 border-white/80 shadow-lg object-cover"
                          />
                          <div className="text-white mb-6">
                            <h4 className="text-2xl font-bold mb-2">{filteredQuickPatients[quickCurrentIndex].name}</h4>
                            <p className="text-white/90 text-base mb-1">Age: {filteredQuickPatients[quickCurrentIndex].age}</p>
                            <p className="text-white/90 text-base mb-1">Location: {filteredQuickPatients[quickCurrentIndex].location || 'N/A'}</p>
                            <p className="text-white/90 text-base">Case: {filteredQuickPatients[quickCurrentIndex].condition}</p>
                          </div>
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={quickDurations[filteredQuickPatients[quickCurrentIndex].id] || 5}
                            onChange={(e) => setQuickDurations({
                              ...quickDurations,
                              [filteredQuickPatients[quickCurrentIndex].id]: parseInt(e.target.value) || 5
                            })}
                            className="mb-4 p-4 border-2 border-white/20 rounded-xl w-full bg-white/20 text-white placeholder-white/70 backdrop-blur-sm text-lg"
                            placeholder="Duration (minutes)"
                          />
                          <button
                            onClick={() => handleQuickStart(filteredQuickPatients[quickCurrentIndex])}
                            className="w-full px-6 py-4 bg-white text-slate-800 rounded-xl font-bold shadow-lg hover:bg-slate-100 transition-all duration-300 flex items-center justify-center transform hover:scale-105 cursor-pointer"
                          >
                            <i className="fas fa-play mr-4"></i>
                            Start Simulation
                          </button>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => setQuickCurrentIndex(Math.min(filteredQuickPatients.length - 1, quickCurrentIndex + 1))}
                      disabled={quickCurrentIndex === filteredQuickPatients.length - 1}
                      className={cn("p-4 disabled:opacity-50 hidden sm:block rounded-xl transition-all duration-300 backdrop-blur-sm cursor-pointer",
                        isDark ? "hover:bg-gray-700" : "hover:bg-slate-100/80"
                      )}
                    >
                      <i className="fas fa-chevron-right text-2xl text-slate-600"></i>
                    </button>
                  </div>
                  <div className="flex justify-center gap-6 mt-6 sm:hidden">
                    <button
                      onClick={() => setQuickCurrentIndex(Math.max(0, quickCurrentIndex - 1))}
                      disabled={quickCurrentIndex === 0}
                      className={cn("p-4 disabled:opacity-50 rounded-xl backdrop-blur-sm border cursor-pointer",
                        isDark ? "bg-gray-800/80 border-gray-700" : "bg-white/80 border-slate-300"
                      )}
                    >
                      <i className="fas fa-chevron-left text-slate-600"></i>
                    </button>
                    <button
                      onClick={() => setQuickCurrentIndex(Math.min(filteredQuickPatients.length - 1, quickCurrentIndex + 1))}
                      disabled={quickCurrentIndex === filteredQuickPatients.length - 1}
                      className={cn("p-4 disabled:opacity-50 rounded-xl backdrop-blur-sm border cursor-pointer",
                        isDark ? "bg-gray-800/80 border-gray-700" : "bg-white/80 border-slate-300"
                      )}
                    >
                      <i className="fas fa-chevron-right text-slate-600"></i>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 2nd Card: Statistics with Tabs */}
            <div className={cn("rounded-2xl p-8 border shadow-sm backdrop-blur-sm",
              isDark ? "bg-gray-700/50 border-indigo-800/50" : "bg-gradient-to-br from-white/80 to-indigo-50/80 border-indigo-300"
            )}>
              <h3 className={cn("text-2xl font-bold mb-6 flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
                <i className="fas fa-chart-line mr-4 text-blue-500"></i>
                Statistics
              </h3>
              
              {/* Tabs for Stats */}
              <div className={cn("flex mb-6 rounded-xl p-1 backdrop-blur-sm border",
                isDark ? "bg-gray-800/80 border-gray-700" : "bg-slate-100/80 border-slate-300"
              )}>
                <button
                  onClick={() => setCurrentStatsTab('voice')}
                  className={cn("flex-1 px-4 py-2 text-sm rounded-lg font-semibold transition-all duration-300 cursor-pointer",
                    currentStatsTab === 'voice' 
                      ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg border border-blue-400" 
                      : isDark ? "text-gray-400 hover:bg-gray-700 border border-transparent" : "text-slate-700 hover:bg-white/80 border border-transparent"
                  )}
                >
                  <i className="fas fa-microphone mr-2"></i>
                  VoiceChat
                </button>
                <button
                  onClick={() => setCurrentStatsTab('flash')}
                  className={cn("flex-1 px-4 py-2 text-sm rounded-lg font-semibold transition-all duration-300 cursor-pointer",
                    currentStatsTab === 'flash' 
                      ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg border border-blue-400" 
                      : isDark ? "text-gray-400 hover:bg-gray-700 border border-transparent" : "text-slate-700 hover:bg-white/80 border border-transparent"
                  )}
                >
                  <i className="fas fa-layer-group mr-2"></i>
                  Flashcards
                </button>
                <button
                  onClick={() => setCurrentStatsTab('cbt')}
                  className={cn("flex-1 px-4 py-2 text-sm rounded-lg font-semibold transition-all duration-300 cursor-pointer",
                    currentStatsTab === 'cbt' 
                      ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg border border-blue-400" 
                      : isDark ? "text-gray-400 hover:bg-gray-700 border border-transparent" : "text-slate-700 hover:bg-white/80 border border-transparent"
                  )}
                >
                  <i className="fas fa-laptop-medical mr-2"></i>
                  CBT
                </button>
              </div>

              {/* Conditional Content for Stats Tab */}
              {currentStatsTab === 'voice' && (
                <>
                  <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select
                      value={voiceChatStatsFilter}
                      onChange={(e) => setVoiceChatStatsFilter(e.target.value as any)}
                      className={cn("p-4 border-2 rounded-xl focus:ring-4 transition-all duration-200 text-lg backdrop-blur-sm cursor-pointer",
                        isDark ? "bg-gray-800 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200" : "bg-white/80 border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      )}
                    >
                      <option value="all">All Types</option>
                      <option value="clerking">Clerking</option>
                      <option value="counselling">Counselling</option>
                      <option value="physical_exam">Physical Exam</option>
                    </select>
                    <select
                      value={voiceDateFilter}
                      onChange={(e) => setVoiceDateFilter(e.target.value as DateFilter)}
                      className={cn("p-4 border-2 rounded-xl focus:ring-4 transition-all duration-200 text-lg backdrop-blur-sm cursor-pointer",
                        isDark ? "bg-gray-800 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200" : "bg-white/80 border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      )}
                    >
                      <option value="all">All Dates</option>
                      <option value="today">Today</option>
                      <option value="week">Past Week</option>
                      <option value="month">Past Month</option>
                      <option value="year">Past Year</option>
                      <option value="custom">Custom Range</option>
                    </select>
                  </div>
                  {voiceDateFilter === 'custom' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <input
                        type="date"
                        value={voiceCustomStart}
                        onChange={(e) => setVoiceCustomStart(e.target.value)}
                        className={cn("p-4 border-2 rounded-xl focus:ring-4 transition-all duration-200 text-lg backdrop-blur-sm cursor-pointer",
                          isDark ? "bg-gray-800 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200" : "bg-white/80 border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        )}
                      />
                      <input
                        type="date"
                        value={voiceCustomEnd}
                        onChange={(e) => setVoiceCustomEnd(e.target.value)}
                        className={cn("p-4 border-2 rounded-xl focus:ring-4 transition-all duration-200 text-lg backdrop-blur-sm cursor-pointer",
                          isDark ? "bg-gray-800 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200" : "bg-white/80 border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        )}
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className={cn("p-4 rounded-xl border backdrop-blur-sm",
                      isDark ? "bg-blue-950/50 border-blue-800/50" : "bg-gradient-to-br from-blue-50/80 to-indigo-50/80 border-blue-300"
                    )}>
                      <p className={isDark ? "text-gray-400" : "text-slate-600"}>Total Chats</p>
                      <p className={cn("text-2xl font-bold", isDark ? "text-gray-100" : "text-slate-800")}>{voiceChatStats.total}</p>
                    </div>
                    <div className={cn("p-4 rounded-xl border backdrop-blur-sm",
                      isDark ? "bg-green-950/50 border-green-800/50" : "bg-gradient-to-br from-green-50/80 to-emerald-50/80 border-green-300"
                    )}>
                      <p className={isDark ? "text-gray-400" : "text-slate-600"}>Avg Score (Valid)</p>
                      <p className={cn("text-2xl font-bold", isDark ? "text-gray-100" : "text-slate-800")}>{voiceChatStats.avgScore.toFixed(1)}%</p>
                    </div>
                    <div className={cn("p-4 rounded-xl border backdrop-blur-sm",
                      isDark ? "bg-amber-950/50 border-amber-800/50" : "bg-gradient-to-br from-amber-50/80 to-orange-50/80 border-amber-300"
                    )}>
                      <p className={isDark ? "text-gray-400" : "text-slate-600"}>Completed</p>
                      <p className={cn("text-2xl font-bold", isDark ? "text-gray-100" : "text-slate-800")}>{voiceChatStats.completed}</p>
                    </div>
                    <div className={cn("p-4 rounded-xl border backdrop-blur-sm",
                      isDark ? "bg-rose-950/50 border-rose-800/50" : "bg-gradient-to-br from-rose-50/80 to-pink-50/80 border-rose-300"
                    )}>
                      <p className={isDark ? "text-gray-400" : "text-slate-600"}>Incomplete</p>
                      <p className={cn("text-2xl font-bold", isDark ? "text-gray-100" : "text-slate-800")}>{voiceChatStats.incomplete}</p>
                    </div>
                  </div>
                  <div className="h-64">
                    <Line data={{
                      labels: voiceChatStats.scoresData.map((_, i) => `Chat ${i + 1}`),
                      datasets: [{
                        label: 'Scores %',
                        data: voiceChatStats.scoresData,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.3,
                        fill: true
                      }]
                    }} options={{
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: 100,
                          grid: {
                            color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                          },
                          ticks: {
                            color: isDark ? '#9ca3af' : '#475569'
                          }
                        },
                        x: {
                          ticks: {
                            color: isDark ? '#9ca3af' : '#475569'
                          }
                        }
                      }
                    }} />
                  </div>
                </>
              )}

              {currentStatsTab === 'flash' && (
                <>
                  <div className="mb-6">
                    <select
                      value={flashDateFilter}
                      onChange={(e) => setFlashDateFilter(e.target.value as DateFilter)}
                      className={cn("w-full p-4 border-2 rounded-xl focus:ring-4 transition-all duration-200 text-lg backdrop-blur-sm cursor-pointer",
                        isDark ? "bg-gray-800 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200" : "bg-white/80 border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      )}
                    >
                      <option value="all">All Dates</option>
                      <option value="today">Today</option>
                      <option value="week">Past Week</option>
                      <option value="month">Past Month</option>
                      <option value="year">Past Year</option>
                      <option value="custom">Custom Range</option>
                    </select>
                  </div>
                  {flashDateFilter === 'custom' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <input
                        type="date"
                        value={flashCustomStart}
                        onChange={(e) => setFlashCustomStart(e.target.value)}
                        className={cn("p-4 border-2 rounded-xl focus:ring-4 transition-all duration-200 text-lg backdrop-blur-sm cursor-pointer",
                          isDark ? "bg-gray-800 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200" : "bg-white/80 border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        )}
                      />
                      <input
                        type="date"
                        value={flashCustomEnd}
                        onChange={(e) => setFlashCustomEnd(e.target.value)}
                        className={cn("p-4 border-2 rounded-xl focus:ring-4 transition-all duration-200 text-lg backdrop-blur-sm cursor-pointer",
                          isDark ? "bg-gray-800 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200" : "bg-white/80 border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        )}
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className={cn("p-4 rounded-xl border backdrop-blur-sm",
                      isDark ? "bg-violet-950/50 border-violet-800/50" : "bg-gradient-to-br from-violet-50/80 to-violet-50/80 border-violet-300"
                    )}>
                      <p className={isDark ? "text-gray-400" : "text-slate-600"}>Total Sessions</p>
                      <p className={cn("text-2xl font-bold", isDark ? "text-gray-100" : "text-slate-800")}>{flashStats.total}</p>
                    </div>
                    <div className={cn("p-4 rounded-xl border backdrop-blur-sm",
                      isDark ? "bg-amber-950/50 border-amber-800/50" : "bg-gradient-to-br from-amber-50/80 to-orange-50/80 border-amber-300"
                    )}>
                      <p className={isDark ? "text-gray-400" : "text-slate-600"}>Avg Questions</p>
                      <p className={cn("text-2xl font-bold", isDark ? "text-gray-100" : "text-slate-800")}>{flashStats.avgQuestions.toFixed(1)}</p>
                    </div>
                  </div>
                  <div className="h-64">
                    <Bar data={{
                      labels: flashStats.sessionsData.map((_, i) => `Session ${i + 1}`),
                      datasets: [{
                        label: 'Questions Answered',
                        data: flashStats.sessionsData,
                        backgroundColor: 'rgba(139, 92, 246, 0.6)',
                        borderColor: 'rgba(139, 92, 246, 1)',
                        borderWidth: 1,
                        borderRadius: 8
                      }]
                    }} options={{
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false
                        }
                      },
                      scales: {
                        y: {
                          grid: {
                            color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                          },
                          ticks: {
                            color: isDark ? '#9ca3af' : '#475569'
                          }
                        },
                        x: {
                          ticks: {
                            color: isDark ? '#9ca3af' : '#475569'
                          }
                        }
                      }
                    }} />
                  </div>
                </>
              )}

              {currentStatsTab === 'cbt' && (
                <>
                  <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select
                      value={cbtStatsFilter}
                      onChange={(e) => setCbtStatsFilter(e.target.value as 'mdcn' | 'mbbs' | 'all')}
                      className={cn("p-4 border-2 rounded-xl focus:ring-4 transition-all duration-200 text-lg backdrop-blur-sm cursor-pointer",
                        isDark ? "bg-gray-800 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200" : "bg-white/80 border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      )}
                    >
                      <option value="all">All Types</option>
                      <option value="mdcn">MDCN</option>
                      <option value="mbbs">MBBS</option>
                    </select>
                    <select
                      value={cbtStatsDateFilter}
                      onChange={(e) => setCbtStatsDateFilter(e.target.value as DateFilter)}
                      className={cn("p-4 border-2 rounded-xl focus:ring-4 transition-all duration-200 text-lg backdrop-blur-sm cursor-pointer",
                        isDark ? "bg-gray-800 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200" : "bg-white/80 border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      )}
                    >
                      <option value="all">All Dates</option>
                      <option value="today">Today</option>
                      <option value="week">Past Week</option>
                      <option value="month">Past Month</option>
                      <option value="year">Past Year</option>
                      <option value="custom">Custom Range</option>
                    </select>
                  </div>
                  {cbtStatsDateFilter === 'custom' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <input
                        type="date"
                        value={cbtStatsCustomStart}
                        onChange={(e) => setCbtStatsCustomStart(e.target.value)}
                        className={cn("p-4 border-2 rounded-xl focus:ring-4 transition-all duration-200 text-lg backdrop-blur-sm cursor-pointer",
                          isDark ? "bg-gray-800 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200" : "bg-white/80 border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        )}
                      />
                      <input
                        type="date"
                        value={cbtStatsCustomEnd}
                        onChange={(e) => setCbtStatsCustomEnd(e.target.value)}
                        className={cn("p-4 border-2 rounded-xl focus:ring-4 transition-all duration-200 text-lg backdrop-blur-sm cursor-pointer",
                          isDark ? "bg-gray-800 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200" : "bg-white/80 border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        )}
                      />
                    </div>
                  )}
           
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className={cn("p-4 rounded-xl border backdrop-blur-sm",
                      isDark ? "bg-blue-950/50 border-blue-800/50" : "bg-gradient-to-br from-blue-50/80 to-indigo-50/80 border-blue-300"
                    )}>
                      <p className={isDark ? "text-gray-400" : "text-slate-600"}>Total Sessions</p>
                      <p className={cn("text-2xl font-bold", isDark ? "text-gray-100" : "text-slate-800")}>{cbtStats.totalAttempts}</p>
                    </div>
                    <div className={cn("p-4 rounded-xl border backdrop-blur-sm",
                      isDark ? "bg-green-950/50 border-green-800/50" : "bg-gradient-to-br from-green-50/80 to-emerald-50/80 border-green-300"
                    )}>
                      <p className={isDark ? "text-gray-400" : "text-slate-600"}>Avg Score</p>
                      <p className={cn("text-2xl font-bold", isDark ? "text-gray-100" : "text-slate-800")}>{cbtStats.avgScore.toFixed(1)}%</p>
                    </div>
                    <div className={cn("p-4 rounded-xl border backdrop-blur-sm",
                      isDark ? "bg-amber-950/50 border-amber-800/50" : "bg-gradient-to-br from-amber-50/80 to-orange-50/80 border-amber-300"
                    )}>
                      <p className={isDark ? "text-gray-400" : "text-slate-600"}>Accuracy</p>
                      <p className={cn("text-2xl font-bold", isDark ? "text-gray-100" : "text-slate-800")}>{cbtStats.accuracy.toFixed(1)}%</p>
                    </div>
                    <div className={cn("p-4 rounded-xl border backdrop-blur-sm",
                      isDark ? "bg-violet-950/50 border-violet-800/50" : "bg-gradient-to-br from-violet-50/80 to-violet-50/80 border-violet-300"
                    )}>
                      <p className={isDark ? "text-gray-400" : "text-slate-600"}>Total Questions Attempted</p>
                      <p className={cn("text-2xl font-bold", isDark ? "text-gray-100" : "text-slate-800")}>{cbtStats.totalQuestions}</p>
                    </div>
                    <div className={cn("p-4 rounded-xl border backdrop-blur-sm",
                      isDark ? "bg-rose-950/50 border-rose-800/50" : "bg-gradient-to-br from-rose-50/80 to-pink-50/80 border-rose-300"
                    )}>
                      <p className={isDark ? "text-gray-400" : "text-slate-600"}>Correct Answers</p>
                      <p className={cn("text-2xl font-bold", isDark ? "text-gray-100" : "text-slate-800")}>{cbtStats.correct}</p>
                    </div>
                    <div className={cn("p-4 rounded-xl border backdrop-blur-sm",
                      isDark ? "bg-teal-950/50 border-teal-800/50" : "bg-gradient-to-br from-teal-50/80 to-cyan-50/80 border-teal-300"
                    )}>
                      <p className={isDark ? "text-gray-400" : "text-slate-600"}>Mode Breakdown</p>
                      <p className={cn("text-sm font-bold", isDark ? "text-gray-200" : "text-slate-800")}>
                        P:{cbtStats.modeBreakdown.practice} T:{cbtStats.modeBreakdown.timed} E:{cbtStats.modeBreakdown.exam}
                      </p>
                    </div>
                  </div>
                  <div className="h-64 mb-6">
                    <Line data={{
                      labels: cbtStats.scoresData.map((_, i) => `Attempt ${i + 1}`),
                      datasets: [{
                        label: 'Scores %',
                        data: cbtStats.scoresData,
                        borderColor: '#e11d48',
                        backgroundColor: 'rgba(225, 29, 72, 0.1)',
                        tension: 0.3,
                        fill: true
                      }]
                    }} options={{
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: 100,
                          grid: {
                            color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                          },
                          ticks: {
                            color: isDark ? '#9ca3af' : '#475569'
                          }
                        },
                        x: {
                          ticks: {
                            color: isDark ? '#9ca3af' : '#475569'
                          }
                        }
                      }
                    }} />
                  </div>
                  <button
                    onClick={() => switchSection('cbt-history')}
                    className="px-6 py-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl hover:from-rose-600 hover:to-pink-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer mx-auto"
                  >
                    <i className="fas fa-history mr-3"></i>
                    Check CBT History
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 3rd Card: Leaderboards with Tabs (Full Width) *
          <div className={cn("rounded-2xl p-8 border shadow-sm backdrop-blur-sm",
            isDark ? "bg-gray-700/50 border-orange-800/50" : "bg-gradient-to-br from-white/80 to-orange-50/80 border-orange-300"
          )}>
            <div className="flex justify-between items-center mb-6">
              <h3 className={cn("text-2xl font-bold flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
                <i className="fas fa-trophy mr-4 text-amber-500"></i>
                Leaderboard (Top 20)
              </h3>
              <div className="flex items-center space-x-3">
                <div className={cn("flex rounded-xl p-1 backdrop-blur-sm border",
                  isDark ? "bg-gray-800/80 border-gray-700" : "bg-slate-100/80 border-slate-300"
                )}>
                  <button
                    onClick={() => setCurrentLeaderTab('osce-flash')}
                    className={cn("px-4 py-2 text-sm rounded-lg font-semibold transition-all duration-300 cursor-pointer",
                      currentLeaderTab === 'osce-flash' 
                        ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg border border-amber-400" 
                        : isDark ? "text-gray-400 hover:bg-gray-700 border border-transparent" : "text-slate-700 hover:bg-white/80 border border-transparent"
                    )}
                  >
                    OSCE & Flashcards
                  </button>
                  <button
                    onClick={() => setCurrentLeaderTab('cbt')}
                    className={cn("px-4 py-2 text-sm rounded-lg font-semibold transition-all duration-300 cursor-pointer",
                      currentLeaderTab === 'cbt' 
                        ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg border border-amber-400" 
                        : isDark ? "text-gray-400 hover:bg-gray-700 border border-transparent" : "text-slate-700 hover:bg-white/80 border border-transparent"
                    )}
                  >
                    CBT
                  </button>
                </div>
              </div>
            </div>

            {/* Conditional Content for Leader Tab 
            {currentLeaderTab === 'osce-flash' && (
              <>
                <div className="mb-6">
                  <select
                    value={leaderboardFilter}
                    onChange={(e) => setLeaderboardFilter(e.target.value as any)}
                    className={cn("w-full p-4 border-2 rounded-xl focus:ring-4 transition-all duration-200 text-lg backdrop-blur-sm cursor-pointer",
                      isDark ? "bg-gray-800 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200" : "bg-white/80 border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    )}
                  >
                    <option value="scenarios">Scenarios</option>
                    <option value="flashcards">Flashcards</option>
                  </select>
                </div>
                <div className="flex items-center space-x-3 mb-6">
                  <div className={cn("flex rounded-xl p-1 backdrop-blur-sm border",
                    isDark ? "bg-gray-800/80 border-gray-700" : "bg-slate-100/80 border-slate-300"
                  )}>
                    <button
                      onClick={() => setLeaderboardScoreType('valid')}
                      className={cn("px-4 py-2 text-sm rounded-lg font-semibold transition-all duration-300 cursor-pointer",
                        leaderboardScoreType === 'valid'
                          ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg border border-amber-400"
                          : isDark ? "text-gray-400 hover:bg-gray-700 border border-transparent" : "text-slate-700 hover:bg-white/80 border border-transparent"
                      )}
                    >
                      Valid
                    </button>
                    <button
                      onClick={() => setLeaderboardScoreType('absolute')}
                      className={cn("px-4 py-2 text-sm rounded-lg font-semibold transition-all duration-300 cursor-pointer",
                        leaderboardScoreType === 'absolute'
                          ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg border border-amber-400"
                          : isDark ? "text-gray-400 hover:bg-gray-700 border border-transparent" : "text-slate-700 hover:bg-white/80 border border-transparent"
                      )}
                    >
                      All
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-base">
                    <thead>
                      <tr className={cn("border-b", isDark ? "border-gray-700" : "border-slate-300")}>
                        <th className="text-left py-4 font-bold">Rank</th>
                        <th className="text-left py-4 font-bold">User</th>
                        <th className="text-left py-4 font-bold">Avg Score</th>
                        <th className="text-left py-4 font-bold">{leaderboardScoreType === 'valid' ? 'Valid' : 'Total'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboardData.map((user, i) => (
                        <tr key={i} className={cn("border-b last:border-0 transition-colors duration-200",
                          isDark ? "border-gray-700 hover:bg-gray-800/50" : "border-slate-300 hover:bg-white/50"
                        )}>
                          <td className={cn("py-4 font-semibold", isDark ? "text-gray-300" : "text-slate-700")}>
                            <div className="flex items-center">
                              {i < 3 && (
                                <i className={`fas fa-trophy mr-3 ${
                                  i === 0 ? 'text-amber-500' :
                                  i === 1 ? 'text-slate-400' :
                                  'text-amber-700'
                                }`}></i>
                              )}
                              {i + 1}
                            </div>
                          </td>
                          <td className={cn("py-4 font-bold", isDark ? "text-gray-100" : "text-slate-800")}>{user.username}</td>
                          <td className={cn("py-4 font-semibold", isDark ? "text-gray-300" : "text-slate-700")}>{user.avgScore.toFixed(1)}%</td>
                          <td className={cn("py-4 font-semibold", isDark ? "text-gray-300" : "text-slate-700")}>{user.validScores ?? user.totalChats ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className={cn("mt-6 p-4 rounded-xl text-sm border backdrop-blur-sm",
                  isDark ? "bg-amber-950/50 border-amber-800/50" : "bg-gradient-to-r from-amber-50/80 to-orange-50/80 border-amber-300"
                )}>
                  <p className={cn("font-bold text-base", isDark ? "text-amber-300" : "text-amber-800")}>
                    {leaderboardScoreType === 'valid' ? 'Valid Scores Only' : 'All Scores Included'}
                  </p>
                  <p className={cn("mt-2", isDark ? "text-amber-400" : "text-amber-700")}>
                    {leaderboardScoreType === 'valid'
                      ? 'Only completed & scored chats are counted'
                      : 'Includes incomplete and zero-score chats'}
                  </p>
                </div>
              </>
            )}

            {currentLeaderTab === 'cbt' && (
              <>
                <div className="flex items-center space-x-3 mb-6">
                  <div className={cn("flex rounded-xl p-1 backdrop-blur-sm border",
                    isDark ? "bg-gray-800/80 border-gray-700" : "bg-slate-100/80 border-slate-300"
                  )}>
                    <button
                      onClick={() => setCbtLeaderboardScoreType('valid')}
                      className={cn("px-4 py-2 text-sm rounded-lg font-semibold transition-all duration-300 cursor-pointer",
                        cbtLeaderboardScoreType === 'valid'
                          ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg border border-amber-400"
                          : isDark ? "text-gray-400 hover:bg-gray-700 border border-transparent" : "text-slate-700 hover:bg-white/80 border border-transparent"
                      )}
                    >
                      Valid
                    </button>
                    <button
                      onClick={() => setCbtLeaderboardScoreType('absolute')}
                      className={cn("px-4 py-2 text-sm rounded-lg font-semibold transition-all duration-300 cursor-pointer",
                        cbtLeaderboardScoreType === 'absolute'
                          ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg border border-amber-400"
                          : isDark ? "text-gray-400 hover:bg-gray-700 border border-transparent" : "text-slate-700 hover:bg-white/80 border border-transparent"
                      )}
                    >
                      All
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-base">
                    <thead>
                      <tr className={cn("border-b", isDark ? "border-gray-700" : "border-slate-300")}>
                        <th className="text-left py-4 font-bold">Rank</th>
                        <th className="text-left py-4 font-bold">User</th>
                        <th className="text-left py-4 font-bold">Avg Score</th>
                        <th className="text-left py-4 font-bold">{cbtLeaderboardScoreType === 'valid' ? 'Valid' : 'Total'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cbtLeaderboardData.map((user, i) => (
                        <tr key={i} className={cn("border-b last:border-0 transition-colors duration-200",
                          isDark ? "border-gray-700 hover:bg-gray-800/50" : "border-slate-300 hover:bg-white/50"
                        )}>
                          <td className={cn("py-4 font-semibold", isDark ? "text-gray-300" : "text-slate-700")}>
                            <div className="flex items-center">
                              {i < 3 && (
                                <i className={`fas fa-trophy mr-3 ${
                                  i === 0 ? 'text-amber-500' :
                                  i === 1 ? 'text-slate-400' :
                                  'text-amber-700'
                                }`}></i>
                              )}
                              {i + 1}
                            </div>
                          </td>
                          <td className={cn("py-4 font-bold", isDark ? "text-gray-100" : "text-slate-800")}>{user.username}</td>
                          <td className={cn("py-4 font-semibold", isDark ? "text-gray-300" : "text-slate-700")}>{user.avgScore.toFixed(1)}%</td>
                          <td className={cn("py-4 font-semibold", isDark ? "text-gray-300" : "text-slate-700")}>{user.validScores ?? user.totalChats ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className={cn("mt-6 p-4 rounded-xl text-sm border backdrop-blur-sm",
                  isDark ? "bg-amber-950/50 border-amber-800/50" : "bg-gradient-to-r from-amber-50/80 to-orange-50/80 border-amber-300"
                )}>
                  <p className={cn("font-bold text-base", isDark ? "text-amber-300" : "text-amber-800")}>
                    {cbtLeaderboardScoreType === 'valid' ? 'Valid Scores Only' : 'All Scores Included'}
                  </p>
                  <p className={cn("mt-2", isDark ? "text-amber-400" : "text-amber-700")}>
                    {cbtLeaderboardScoreType === 'valid'
                      ? 'Only completed & scored attempts are counted'
                      : 'Includes incomplete and zero-score attempts'}
                  </p>
                </div>
              </>
            )}
          </div>
          */}
        </div>
      )}

      {currentSection === 'chat-history' && (
        <div className={cn("rounded-2xl shadow-lg p-8 border backdrop-blur-sm",
          isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-gradient-to-br from-white/95 to-blue-50/95 border-blue-300"
        )}>
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
            <div className="flex-1">
              <h2 className={cn("text-3xl font-bold flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
                <i className="fas fa-history mr-4 text-blue-500"></i>
                Chat History
              </h2>
              <p className={cn("mt-3 text-lg", isDark ? "text-gray-400" : "text-slate-600")}>Review and manage your simulation sessions</p>
            </div>
            <button
              onClick={() => switchSection('selection')}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center font-bold shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
            >
              <i className="fas fa-arrow-left mr-4"></i>
              Back to Dashboard
            </button>
          </div>

          {/* Toggle Button for Filters on Mobile */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn("lg:hidden w-full px-6 py-4 rounded-2xl transition-all duration-300 flex items-center justify-center font-semibold mb-6 border backdrop-blur-sm cursor-pointer",
              isDark ? "bg-gray-700/80 text-gray-200 border-gray-600 hover:bg-gray-600/80" : "bg-gradient-to-r from-slate-100/80 to-blue-100/80 text-slate-700 border-slate-300 hover:bg-slate-200/80"
            )}
          >
            <i className={`fas ${showFilters ? 'fa-chevron-up' : 'fa-chevron-down'} mr-4`}></i>
            {showFilters ? 'Hide' : 'Show'} Search & Filters
          </button>

          {/* Search and Filter Section */}
          <div className={`${showFilters ? 'block' : 'hidden'} lg:block ${cn("rounded-2xl p-8 mb-8 border shadow-sm backdrop-blur-sm",
            isDark ? "bg-gray-700/50 border-gray-600" : "bg-gradient-to-br from-white/80 to-blue-50/80 border-blue-300"
          )}`}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              {/* Search Bar */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <i className="fas fa-search text-slate-400 text-lg"></i>
                </div>
                <input
                  type="text"
                  placeholder="Search by title, patient, or type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn("pl-12 w-full p-4 border-2 rounded-xl focus:ring-4 transition-all duration-200 text-lg backdrop-blur-sm",
                    isDark ? "bg-gray-800 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200 placeholder:text-gray-500" : "bg-white/80 border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  )}
                />
              </div>
              {/* Type Filter */}
              <select
                value={chatTypeFilter}
                onChange={(e) => setChatTypeFilter(e.target.value as ChatFilter)}
                className={cn("p-4 border-2 rounded-xl focus:ring-4 transition-all duration-200 text-lg backdrop-blur-sm cursor-pointer",
                  isDark ? "bg-gray-800 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200" : "bg-white/80 border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                )}
              >
                <option value="all">All Types</option>
                <option value="clerking">Clerking</option>
                <option value="counselling">Counselling</option>
                <option value="physical_exam">Physical Exam</option>
                <option value="flashcards">Flashcards</option>
              </select>
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ChatStatus)}
                className={cn("p-4 border-2 rounded-xl focus:ring-4 transition-all duration-200 text-lg backdrop-blur-sm cursor-pointer",
                  isDark ? "bg-gray-800 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200" : "bg-white/80 border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                )}
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="incomplete">Incomplete</option>
              </select>
              {/* Date Filter */}
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                className={cn("p-4 border-2 rounded-xl focus:ring-4 transition-all duration-200 text-lg backdrop-blur-sm cursor-pointer",
                  isDark ? "bg-gray-800 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200" : "bg-white/80 border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                )}
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="week">Past Week</option>
                <option value="month">Past Month</option>
                <option value="year">Past Year</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
            {/* Custom Date Range */}
            {dateFilter === 'custom' && (
              <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 p-6 rounded-2xl border backdrop-blur-sm",
                isDark ? "bg-blue-950/50 border-blue-800/50" : "bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-blue-300"
              )}>
                <div>
                  <label className={cn("block text-base font-semibold mb-3", isDark ? "text-gray-200" : "text-slate-700")}>Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className={cn("w-full p-4 border-2 rounded-xl focus:ring-4 transition-all duration-200 text-lg backdrop-blur-sm cursor-pointer",
                      isDark ? "bg-gray-800 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200" : "bg-white/80 border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    )}
                  />
                </div>
                <div>
                  <label className={cn("block text-base font-semibold mb-3", isDark ? "text-gray-200" : "text-slate-700")}>End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className={cn("w-full p-4 border-2 rounded-xl focus:ring-4 transition-all duration-200 text-lg backdrop-blur-sm cursor-pointer",
                      isDark ? "bg-gray-800 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200" : "bg-white/80 border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    )}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setCustomStartDate('');
                      setCustomEndDate('');
                    }}
                    className="w-full px-6 py-4 bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-xl hover:from-slate-600 hover:to-slate-700 transition-all duration-300 flex items-center justify-center font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
                  >
                    <i className="fas fa-times mr-3"></i>
                    Clear Dates
                  </button>
                </div>
              </div>
            )}
            {/* Results Summary */}
            <div className={cn("flex flex-wrap items-center justify-between text-base",
              isDark ? "text-gray-400" : "text-slate-600"
            )}>
              <span className="font-semibold">
                Showing {paginatedChats.length} of {filteredChats.length} chats
                {searchQuery && ` for "${searchQuery}"`}
              </span>
              {filteredChats.length > 0 && (
                <span className="font-semibold">Page {currentPage} of {totalPages}</span>
              )}
            </div>
          </div>

          {/* Loading Animation for Chat History */}
          {isLoadingHistory ? (
            <div className={cn("flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed backdrop-blur-sm",
              isDark ? "bg-gray-700/50 border-gray-600" : "bg-gradient-to-br from-slate-50/80 to-blue-50/80 border-slate-400"
            )}>
              <div className="relative mb-8">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
                <div className="absolute inset-0 rounded-full h-16 w-16 border-t-2 border-blue-300 animate-pulse"></div>
              </div>
              <p className={cn("text-xl font-bold mb-4 animate-pulse", isDark ? "text-gray-100" : "text-slate-700")}>Loading Chat History</p>
              <div className={cn("flex items-center", isDark ? "text-gray-400" : "text-slate-600")}>
                <span className="animate-pulse">Please wait</span>
                <span className="animate-pulse delay-100">.</span>
                <span className="animate-pulse delay-200">.</span>
                <span className="animate-pulse delay-300">.</span>
              </div>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className={cn("text-center py-16 rounded-2xl border-2 border-dashed backdrop-blur-sm",
              isDark ? "bg-gray-700/50 border-gray-600" : "bg-gradient-to-br from-slate-50/80 to-blue-50/80 border-slate-400"
            )}>
              <i className="fas fa-inbox text-5xl text-slate-400 mb-6"></i>
              <p className={cn("text-xl mb-4 font-semibold", isDark ? "text-gray-300" : "text-slate-500")}>No chat history found</p>
              <p className={isDark ? "text-gray-400" : "text-slate-400"}>
                {searchQuery || chatTypeFilter !== 'all' || statusFilter !== 'all' || dateFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Start a new simulation to see your history here'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {paginatedChats.map((chat, index) => {
                const patientDetails = getPatientDetails(chat);
                return (
                  <div
                    key={chat.id}
                    className={cn("border-2 rounded-2xl p-8 transition-all duration-300 hover:shadow-xl hover:border-blue-400 backdrop-blur-sm",
                      isDark 
                        ? `border-gray-700 ${index % 2 === 0 ? 'bg-gray-800/80' : 'bg-gray-700/80'}`
                        : `border-slate-300 ${index % 2 === 0 ? 'bg-gradient-to-br from-white/80 to-blue-50/80' : 'bg-gradient-to-br from-white/80 to-slate-50/80'}`
                    )}
                  >
                    <div className="flex flex-col xl:flex-row gap-8">
                      {/* Patient Image and Basic Info */}
                      <div className="flex items-start space-x-6 flex-1">
                        <img
                          src={getPatientImageUrl(chat)}
                          alt={chat.patientName || 'Patient'}
                          className="w-20 h-20 rounded-full border-2 object-cover flex-shrink-0 shadow-lg"
                        />
                        <div className="flex-1 min-w-0">
                          {/* Title and Badges */}
                          <h3 className={cn("font-bold text-xl mb-4 truncate", isDark ? "text-gray-100" : "text-slate-800")}>{chat.title}</h3>
                       
<div className="flex flex-wrap gap-3 mb-6">
  {/* Existing badges */}
  <span className={`px-4 py-2 rounded-xl text-base font-semibold border backdrop-blur-sm ${getTypeBadge(chat.type || '')}`}>
    <i className="fas fa-tag mr-3"></i>
    {chat.type?.replace('_', ' ') || 'Unknown'}
  </span>
  <span className={`px-4 py-2 rounded-xl text-base font-semibold border backdrop-blur-sm ${getStatusBadge(chat.status)}`}>
    <i className="fas fa-circle mr-3 text-xs"></i>
    {chat.status}
  </span>
  {/* ADD DEPARTMENT BADGE */}

{(chat as any).department && (
  <span className={cn(
    "px-4 py-2 rounded-xl text-base font-semibold border backdrop-blur-sm",
    isDark 
      ? "bg-purple-900/50 text-purple-300 border-purple-700" 
      : "bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border-purple-300 shadow-sm"
  )}>
    <i className="fas fa-building mr-3"></i>
    {(chat as any).department.name}
  </span>
)}
</div>

                          {/* Patient and Date Info */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 text-base">
                            <div className="flex items-center">
                              <i className="fas fa-user-injured mr-4 text-blue-500 text-lg"></i>
                              <span className={cn("truncate font-semibold", isDark ? "text-gray-300" : "text-slate-600")}>Patient: {chat.patientName || 'Unknown'}</span>
                            </div>
                            {patientDetails && (
                              <>
                                <div className="flex items-center">
                                  <i className="fas fa-birthday-cake mr-4 text-green-500 text-lg"></i>
                                  <span className={cn("font-semibold", isDark ? "text-gray-300" : "text-slate-600")}>Age: {patientDetails.age || 'Unknown'}</span>
                                </div>
                                <div className="flex items-center">
                                  <i className="fas fa-venus-mars mr-4 text-violet-500 text-lg"></i>
                                  <span className={cn("font-semibold", isDark ? "text-gray-300" : "text-slate-600")}>Gender: {patientDetails.gender || 'Unknown'}</span>
                                </div>
                              </>
                            )}
                            <div className="flex items-center">
                              <i className="fas fa-calendar mr-4 text-green-500 text-lg"></i>
                              <span className={cn("font-semibold", isDark ? "text-gray-300" : "text-slate-600")}>Created: {new Date(chat.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center">
                              <i className="fas fa-clock mr-4 text-violet-500 text-lg"></i>
                              <span className={cn("font-semibold", isDark ? "text-gray-300" : "text-slate-600")}>{new Date(chat.createdAt).toLocaleTimeString()}</span>
                            </div>
                            {patientDetails?.condition && (
                              <div className="flex items-center sm:col-span-2 xl:col-span-1">
                                <i className="fas fa-stethoscope mr-4 text-rose-500 text-lg"></i>
                                <span className={cn("truncate font-semibold", isDark ? "text-gray-300" : "text-slate-600")}>Condition: {patientDetails.condition}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-3 justify-start xl:justify-end xl:flex-nowrap">
                        {chat.status === 'incomplete' && (
                          <button
                            onClick={() => handleResumeChat(chat.id)}
                            className="px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
                          >
                            <i className="fas fa-play mr-3"></i>
                            Resume
                          </button>
                        )}
                        <button
                          onClick={() => handlePreviewChat(chat.id)}
                          className="px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
                        >
                          <i className="fas fa-eye mr-3"></i>
                          Preview
                        </button>
                       <button
  onClick={() => chat.type === 'physical_exam' 
    ? handleViewPhysicalExamResult(chat) 
    : handleAnalyze(chat.id, (chat as any).department?.name)
  }
  className="px-6 py-4 bg-gradient-to-r from-violet-500 to-violet-600 text-white rounded-xl hover:from-violet-600 hover:to-violet-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
>
  <i className="fas fa-chart-line mr-3"></i>
  {chat.type === 'physical_exam' ? 'Analyse Exam' : 'Analyze'}
</button>
                        <button
                          onClick={() => confirmDeleteChat(chat.id)}
                          className="px-6 py-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl hover:from-rose-600 hover:to-pink-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
                        >
                          <i className="fas fa-trash mr-3"></i>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}


          {/* Pagination */}
          {totalPages > 1 && !isLoadingHistory && (
            <div className="flex justify-center items-center mt-12 space-x-4">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={cn("px-6 py-4 border-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center backdrop-blur-sm transition-all duration-300 font-semibold shadow-lg hover:shadow-xl cursor-pointer",
                  isDark ? "border-gray-700 hover:border-gray-500 hover:bg-gray-800/80 text-gray-300 bg-gray-800/80" : "border-slate-300 hover:border-slate-500 hover:bg-slate-50/80 text-slate-700 bg-white/80"
                )}
              >
                <i className="fas fa-chevron-left mr-3"></i>
                <span className="hidden sm:inline">Previous</span>
              </button>
              <div className="flex space-x-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn("w-12 h-12 rounded-xl flex items-center justify-center font-semibold transition-all duration-300 cursor-pointer",
                        currentPage === pageNum
                          ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg transform scale-105"
                          : isDark
                            ? "border-2 border-gray-700 hover:border-blue-500 hover:bg-gray-800/80 bg-gray-800/80 text-gray-300 shadow-lg hover:shadow-xl"
                            : "border-2 border-slate-300 hover:border-blue-500 hover:bg-blue-50/80 bg-white/80 text-slate-700 shadow-lg hover:shadow-xl"
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={cn("px-6 py-4 border-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center backdrop-blur-sm transition-all duration-300 font-semibold shadow-lg hover:shadow-xl cursor-pointer",
                  isDark ? "border-gray-700 hover:border-gray-500 hover:bg-gray-800/80 text-gray-300 bg-gray-800/80" : "border-slate-300 hover:border-slate-500 hover:bg-slate-50/80 text-slate-700 bg-white/80"
                )}
              >
                <span className="hidden sm:inline">Next</span>
                <i className="fas fa-chevron-right ml-3"></i>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Ad Slider Popup */}
{/* <AdSlider 
  isOpen={showAdSlider} 
  onClose={() => setShowAdSlider(false)} 
/> */}
    </>
  );
};

export default HomeSection;