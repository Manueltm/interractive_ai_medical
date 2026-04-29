// app/dashboard/components/mocks/MiniMockCBT.tsx
'use client';
import { FC, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery } from '@tanstack/react-query';
import { toast } from "sonner";
import QuestionCard from "./QuestionCard";
import QuestionSidebar from "./QuestionSidebar";
import Pagination from "./Pagination";
import Timer from "./Timer";

interface MiniMockCBTProps {
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

const fetchQuestions = async (page: number, categoryId?: string) => {
  const url = new URL('/api/mini-mock-cbt', window.location.origin);
  url.searchParams.append('page', page.toString());
  url.searchParams.append('limit', '1'); // Changed to 1 question per page
  if (categoryId) {
    url.searchParams.append('categoryId', categoryId);
  }
  
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

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

const MiniMockCBT: FC<MiniMockCBTProps> = ({ categoryId, onStatsUpdate }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [questionStates, setQuestionStates] = useState<Record<string, QuestionState>>({});
  const [stats, setStats] = useState({ correct: 0, wrong: 0, total: 0 });
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(180 * 60); // Default 180 minutes (3 hours)
  const [isPaused, setIsPaused] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('MiniMockCBT received categoryId:', categoryId);
  }, [categoryId]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['mini-mock-cbt', currentPage, categoryId],
    queryFn: () => fetchQuestions(currentPage, categoryId),
    staleTime: 5 * 60 * 1000,
    enabled: !!categoryId,
  });

  useEffect(() => {
    onStatsUpdate?.(stats);
  }, [stats, onStatsUpdate]);

  useEffect(() => {
    setCurrentPage(1);
    setQuestionStates({});
    setStats({ correct: 0, wrong: 0, total: 0 });
    setLoadedImages(new Set());
    setTimeLeft(180 * 60);
  }, [categoryId]);

  // Timer logic
  useEffect(() => {
    if (timeLeft > 0 && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev: number) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft, isPaused]);

  const questions = useMemo(() => {
    if (!data?.items) return [];
    return groupQuestions(data.items);
  }, [data?.items]);

  const totalPages = useMemo(() => data?.totalPages || 1, [data?.totalPages]);
  const currentQuestion = questions[0]; // Get the first (and only) question for current page

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    setQuestionStates(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        selectedAnswer: answerIndex,
        showResult: false
      }
    }));
  };

  const handleCheckAnswer = (questionId: string, correctAnswerIndex: number) => {
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
  };

  const getQuestionState = (questionId: string): QuestionState => {
    return questionStates[questionId] || { selectedAnswer: null, showResult: false, isCorrect: false };
  };

  const getQuestionColor = (id: string): 'unanswered' | 'correct' | 'wrong' => {
    const state = questionStates[id];
    if (!state || !state.showResult) return 'unanswered';
    return state.isCorrect ? 'correct' : 'wrong';
  };

  const handleImageLoad = (questionId: string) => {
    setLoadedImages(prev => new Set(prev).add(questionId));
  };

  const handlePause = () => {
    setIsPaused(true);
    setShowPauseModal(true);
  };

  const handleResume = () => {
    setIsPaused(false);
    setShowPauseModal(false);
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  if (showPauseModal) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
          <h3 className="text-2xl font-bold text-slate-800 mb-4">Exam Paused</h3>
          <p className="text-slate-600 mb-6">Take a break. Your progress is saved.</p>
          <button
            onClick={handleResume}
            className="w-full px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl hover:from-rose-600 hover:to-pink-700"
          >
            Resume Exam
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl w-full animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/2 mb-6"></div>
          <div className="h-32 bg-slate-200 rounded mb-6"></div>
          <div className="space-y-3">
            <div className="h-12 bg-slate-200 rounded"></div>
            <div className="h-12 bg-slate-200 rounded"></div>
            <div className="h-12 bg-slate-200 rounded"></div>
            <div className="h-12 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 rounded-xl p-8 max-w-md mx-auto">
          <i className="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to Load Questions</h3>
          <p className="text-red-600 mb-4">{error instanceof Error ? error.message : 'Unknown error'}</p>
          <button
            onClick={() => refetch()}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
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

  const state = getQuestionState(currentQuestion.questionId);
  const correctIndex = currentQuestion.answers.findIndex(a => a.isCorrect);

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-12rem)]">
      {/* Left Sidebar - Timer & Question Navigation */}
      <div className="lg:w-80 space-y-6">
        {/* Timer Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
          <Timer
            timeLeft={timeLeft}
            formatTime={formatTime}
            onPause={handlePause}
            onSubmit={() => {}}
          />
        </div>

        {/* Question Navigation Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 sticky top-80">
          <h3 className="font-semibold text-slate-800 mb-4">Questions</h3>
          <QuestionSidebar
            questions={questions.map(q => ({ id: q.questionId }))}
            getQuestionColor={getQuestionColor}
            onQuestionClick={(id) => {
              const index = questions.findIndex(q => q.questionId === id);
              setCurrentPage(index + 1);
            }}
          />
          
          {/* Progress Summary */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600">Progress:</span>
              <span className="font-medium text-slate-800">
                {stats.correct + stats.wrong}/{totalPages}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-rose-500 to-pink-600 rounded-full h-2 transition-all duration-300"
                style={{ width: `${((stats.correct + stats.wrong) / totalPages) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-4 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <span className="text-slate-600">Correct: {stats.correct}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-rose-500 rounded-full"></div>
                <span className="text-slate-600">Wrong: {stats.wrong}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Question Area */}
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Question Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-sm font-medium text-rose-600 mb-1">
                Question {currentPage} of {totalPages}
              </h2>
              <h3 className="text-xl font-bold text-slate-800">
                {currentQuestion.quizName}
              </h3>
            </div>
            {state.showResult && (
              <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                state.isCorrect 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'bg-rose-100 text-rose-700'
              }`}>
                {state.isCorrect ? '✓ Correct' : '✗ Incorrect'}
              </div>
            )}
          </div>

          {/* Question Card */}
          <QuestionCard
            title=""
            question={currentQuestion.question}
            figureUrl={currentQuestion.figureUrl}
            answers={currentQuestion.answers.map(a => a.text)}
            selectedAnswer={state.selectedAnswer}
            showResult={state.showResult}
            isCorrect={state.isCorrect}
            correctAnswerIndex={correctIndex}
            explanation={currentQuestion.explanation}
            questionId={currentQuestion.questionId}
            imageLoaded={loadedImages.has(currentQuestion.questionId)}
            onAnswerSelect={(idx) => handleAnswerSelect(currentQuestion.questionId, idx)}
            onCheck={() => handleCheckAnswer(currentQuestion.questionId, correctIndex)}
            onImageLoad={() => handleImageLoad(currentQuestion.questionId)}
          />

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-6 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>
            
            {/* Page Indicator */}
            <div className="flex items-center gap-2">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
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
                    key={i}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <>
                  <span className="text-slate-400">...</span>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className="w-10 h-10 rounded-lg font-medium text-slate-600 hover:bg-slate-100"
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-6 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MiniMockCBT;