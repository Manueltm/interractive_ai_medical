// app/dashboard/components/mocks/MainMockCBT.tsx
'use client';
import { FC, useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from '@tanstack/react-query';
import { toast } from "sonner";
import QuestionCard from "./QuestionCard";
import QuestionSidebar from "./QuestionSidebar";
import Pagination from "./Pagination";

interface MainMockCBTProps {
  categoryId?: string;
  onStatsUpdate?: (stats: { correct: number; wrong: number; total: number }) => void;
}

interface Answer {
  text: string;
  isCorrect: boolean;
  id: string;
}

interface GroupedQuestion {
  questionId: string;
  quizName: string;
  question: string;
  figureUrl?: string | null;
  explanation?: string;
  answers: Answer[];
}

interface QuestionState {
  selectedAnswer: number | null;
  showResult: boolean;
  isCorrect: boolean;
}

// API fetch function
const fetchQuestions = async (page: number, categoryId?: string) => {
  const url = new URL('/api/main-mock-cbt', window.location.origin);
  url.searchParams.append('page', page.toString());
  url.searchParams.append('limit', '6');
  
  if (categoryId) {
    url.searchParams.append('categoryId', categoryId);
  }
  
  const res = await fetch(url.toString(), {
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to fetch questions');
  }
  
  return res.json();
};

// Group questions by questionId
const groupQuestions = (items: any[]): GroupedQuestion[] => {
  const groupedMap = new Map<string, GroupedQuestion>();
  
  items.forEach((item) => {
    if (!item.questionId) return;
    
    if (!groupedMap.has(item.questionId)) {
      groupedMap.set(item.questionId, {
        questionId: item.questionId,
        quizName: item.quizName || 'Quiz',
        question: item.question || '',
        figureUrl: item.figureUrl,
        explanation: item.explanation,
        answers: []
      });
    }
    
    const group = groupedMap.get(item.questionId)!;
    if (item.answer && !group.answers.some(a => a.text === item.answer)) {
      group.answers.push({
        text: item.answer,
        isCorrect: item.isCorrect || false,
        id: item.id
      });
    }
  });

  return Array.from(groupedMap.values());
};

const MainMockCBT: FC<MainMockCBTProps> = ({ categoryId, onStatsUpdate }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [questionStates, setQuestionStates] = useState<Record<string, QuestionState>>({});
  const [stats, setStats] = useState({ correct: 0, wrong: 0, total: 0 });
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  // Log when categoryId changes
  useEffect(() => {
    console.log('MainMockCBT received categoryId:', categoryId);
  }, [categoryId]);

  // Fetch questions with React Query
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['main-mock-cbt', currentPage, categoryId],
    queryFn: () => fetchQuestions(currentPage, categoryId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
    enabled: !!categoryId,
  });

  // Update parent component with stats
  useEffect(() => {
    onStatsUpdate?.(stats);
  }, [stats, onStatsUpdate]);

  // Reset states when category changes
  useEffect(() => {
    setQuestionStates({});
    setStats({ correct: 0, wrong: 0, total: 0 });
    setLoadedImages(new Set());
  }, [categoryId]);

  // Process and group questions
  const questions = useMemo(() => {
    if (!data?.items) return [];
    console.log('Processing items:', data.items.length);
    return groupQuestions(data.items);
  }, [data?.items]);

  const totalPages = useMemo(() => data?.totalPages || 1, [data?.totalPages]);

  // Handle answer selection
  const handleAnswerSelect = useCallback((questionId: string, answerIndex: number) => {
    setQuestionStates(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        selectedAnswer: answerIndex,
        showResult: false
      }
    }));
  }, []);

  // Handle answer check
  const handleCheckAnswer = useCallback((questionId: string, correctAnswerIndex: number) => {
    const state = questionStates[questionId];
    if (!state || state.selectedAnswer === null) {
      toast.error('Please select an answer');
      return;
    }

    const isCorrect = state.selectedAnswer === correctAnswerIndex;
    
    setQuestionStates(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        showResult: true,
        isCorrect
      }
    }));

    setStats(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      wrong: prev.wrong + (isCorrect ? 0 : 1),
      total: prev.total + 1
    }));
  }, [questionStates]);

  // Get question state
  const getQuestionState = useCallback((questionId: string): QuestionState => {
    return questionStates[questionId] || { selectedAnswer: null, showResult: false, isCorrect: false };
  }, [questionStates]);

  // Get question color for sidebar
  const getQuestionColor = useCallback((questionId: string): 'unanswered' | 'correct' | 'wrong' => {
    const state = questionStates[questionId];
    if (!state || !state.showResult) return 'unanswered';
    return state.isCorrect ? 'correct' : 'wrong';
  }, [questionStates]);

  // Handle image load
  const handleImageLoad = useCallback((questionId: string) => {
    setLoadedImages(prev => new Set(prev).add(questionId));
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
            <div className="h-20 bg-slate-200 rounded mb-4"></div>
            <div className="space-y-2">
              <div className="h-10 bg-slate-200 rounded"></div>
              <div className="h-10 bg-slate-200 rounded"></div>
              <div className="h-10 bg-slate-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 rounded-xl p-8 max-w-md mx-auto">
          <i className="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to Load Questions</h3>
          <p className="text-red-600 mb-4">{error instanceof Error ? error.message : 'Unknown error'}</p>
          <button
            onClick={() => refetch()}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show empty state if no questions
  if (questions.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12">
        <div className="bg-rose-50 rounded-xl p-8 max-w-md mx-auto">
          <i className="fas fa-file-alt text-4xl text-rose-500 mb-4"></i>
          <h3 className="text-lg font-semibold text-rose-800 mb-2">No Questions Found</h3>
          <p className="text-rose-600">No questions available for the selected category.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Question Sidebar */}
      <QuestionSidebar
        questions={questions.map(q => ({ id: q.questionId }))}
        getQuestionColor={getQuestionColor}
        onQuestionClick={(id) => {
          document.getElementById(`q-${id}`)?.scrollIntoView({ behavior: 'smooth' });
        }}
      />
      
      {/* Questions Grid */}
      <div className="flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {questions.map((q) => {
            const state = getQuestionState(q.questionId);
            const correctIndex = q.answers.findIndex(a => a.isCorrect);
            
            return (
              <div key={q.questionId} id={`q-${q.questionId}`} className="scroll-mt-24">
                <QuestionCard
                  title={q.quizName}
                  question={q.question}
                  figureUrl={q.figureUrl}
                  answers={q.answers.map(a => a.text)}
                  selectedAnswer={state.selectedAnswer}
                  showResult={state.showResult}
                  isCorrect={state.isCorrect}
                  correctAnswerIndex={correctIndex}
                  explanation={q.explanation}
                  questionId={q.questionId}
                  imageLoaded={loadedImages.has(q.questionId)}
                  onAnswerSelect={(idx) => handleAnswerSelect(q.questionId, idx)}
                  onCheck={() => handleCheckAnswer(q.questionId, correctIndex)}
                  onImageLoad={() => handleImageLoad(q.questionId)}
                />
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MainMockCBT;