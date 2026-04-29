// app/dashboard/components/mocks/MockExamPlayer.tsx
'use client';
import { FC, useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from '@tanstack/react-query';
import { toast } from "sonner";
import QuestionSidebar from "./QuestionSidebar";
import QuestionCard from "./QuestionCard";
import Timer from "./Timer";
import Pagination from "./Pagination"; // Add this import

interface MockExamPlayerProps {
  type: 'main' | 'mini' | 'qblock' | null;
  subType: 'cbt' | 'osce' | null;
  category: any;
  config: any;
  onBack: () => void;
  onStatsUpdate: (stats: { correct: number; wrong: number; total: number }) => void;
}

interface QuestionState {
  selectedAnswer: number | null;
  showResult: boolean;
  isCorrect: boolean;
  userAnswer?: string;
  isBookmarked?: boolean;
}

interface GroupedQuestion {
  questionId: string;
  quizName: string;
  question: string;
  figureUrl?: string | null;
  explanation?: string;
  answers: Array<{
    text: string;
    isCorrect: boolean;
    id: string;
  }>;
}

const MockExamPlayer: FC<MockExamPlayerProps> = ({
  type,
  subType,
  category,
  config,
  onBack,
  onStatsUpdate
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [questions, setQuestions] = useState<any[]>([]);
  const [groupedQuestions, setGroupedQuestions] = useState<GroupedQuestion[]>([]);
  const [questionStates, setQuestionStates] = useState<Record<string, QuestionState>>({});
  const [stats, setStats] = useState({ correct: 0, wrong: 0, total: 0 });
  const [timeLeft, setTimeLeft] = useState(config?.timeLimit || 0);
  const [isPaused, setIsPaused] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch questions based on type
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['mock-exam', type, subType, category?.id, currentPage],
    queryFn: async () => {
      if (!type) return { items: [], total: 0 };
      
      let endpoint = '';
      if (type === 'main' && subType === 'cbt') endpoint = '/api/main-mock-cbt';
      else if (type === 'main' && subType === 'osce') endpoint = '/api/main-mock-osce';
      else if (type === 'mini' && subType === 'cbt') endpoint = '/api/mini-mock-cbt';
      else if (type === 'mini' && subType === 'osce') endpoint = '/api/mini-mock-osce';
      else if (type === 'qblock') endpoint = '/api/qblocks';
      
      if (!endpoint) {
        console.error('No endpoint found for:', { type, subType });
        return { items: [], total: 0 };
      }
      
      const url = new URL(endpoint, window.location.origin);
      url.searchParams.append('page', currentPage.toString());
      url.searchParams.append('limit', '12');
      if (category?.id) {
        url.searchParams.append('categoryId', category.id);
      }
      
      console.log('Fetching from:', url.toString());
      
      const res = await fetch(url.toString());
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch');
      }
      
      const responseData = await res.json();
      console.log('Received data:', responseData);
      return responseData;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!type, // Only run if type exists
  });

  // Process questions based on type
  useEffect(() => {
    if (data?.items && data.items.length > 0) {
      console.log('Processing items:', data.items.length);
      
      if ((type === 'main' || type === 'mini') && subType === 'cbt') {
        // Group CBT questions
        const grouped = groupCBTQuestions(data.items);
        console.log('Grouped questions:', grouped.length);
        setGroupedQuestions(grouped);
        setQuestions([]);
      } else {
        console.log('Setting questions directly');
        setQuestions(data.items);
        setGroupedQuestions([]);
      }
    } else {
      console.log('No items in data or empty array');
      if (data?.items && data.items.length === 0) {
        toast.info('No questions found for this category');
      }
    }
  }, [data, type, subType]);

  // Timer logic
  useEffect(() => {
    if (timeLeft > 0 && !isPaused && !isSubmitting) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev: number) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timeLeft, isPaused, isSubmitting]);

  // Update parent stats
  useEffect(() => {
    onStatsUpdate(stats);
  }, [stats, onStatsUpdate]);

  const handleTimeUp = () => {
    toast.warning('Time is up! Submitting your answers...');
    handleSubmitExam();
  };

  const groupCBTQuestions = (items: any[]): GroupedQuestion[] => {
    const groupedMap = new Map<string, GroupedQuestion>();
    
    items.forEach((item) => {
      if (!item.questionId) {
        console.warn('Item missing questionId:', item);
        return;
      }
      
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
      if (item.answer && !group.answers.some((a: any) => a.text === item.answer)) {
        group.answers.push({
          text: item.answer,
          isCorrect: item.isCorrect || false,
          id: item.id
        });
      }
    });
    
    return Array.from(groupedMap.values());
  };

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

  const handleOSCEAnswerChange = (questionId: string, value: string) => {
    setQuestionStates(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        userAnswer: value
      }
    }));
  };

  const handleOSCESubmit = (questionId: string, correctAnswer: string) => {
    const state = questionStates[questionId];
    if (!state?.userAnswer?.trim()) {
      toast.error('Please provide an answer');
      return;
    }

    const isCorrect = state.userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
    
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

  const handleBookmark = (questionId: string) => {
    setQuestionStates(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        isBookmarked: !prev[questionId]?.isBookmarked
      }
    }));
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

  const handleSubmitExam = async () => {
    setIsSubmitting(true);
    
    const totalAnswered = Object.values(questionStates).filter(s => s.showResult).length;
    const correctCount = Object.values(questionStates).filter(s => s.isCorrect).length;
    const score = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
    
    try {
      await fetch('/api/mock-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          subType,
          categoryId: category?.id,
          totalQuestions: questions.length + groupedQuestions.length,
          answered: totalAnswered,
          correct: correctCount,
          score,
          timeSpent: config?.timeLimit - timeLeft
        })
      });
    } catch (error) {
      console.error('Error saving session:', error);
    }

    setShowSubmitModal(true);
    setIsSubmitting(false);
  };

  const handleRetry = () => {
    refetch();
  };

  const getQuestionColor = (id: string): 'unanswered' | 'correct' | 'wrong' => {
    const state = questionStates[id];
    if (!state || !state.showResult) return 'unanswered';
    return state.isCorrect ? 'correct' : 'wrong';
  };

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? `${hrs}:` : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Log state for debugging
  useEffect(() => {
    console.log('Current state:', {
      type,
      subType,
      category: category?.name,
      questionsCount: questions.length,
      groupedCount: groupedQuestions.length,
      isLoading,
      hasError: !!error
    });
  }, [type, subType, category, questions.length, groupedQuestions.length, isLoading, error]);

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

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 rounded-xl p-8 max-w-md mx-auto">
          <i className="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to Load Questions</h3>
          <p className="text-red-600 mb-4">{error instanceof Error ? error.message : 'Unknown error'}</p>
          <button
            onClick={handleRetry}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (showSubmitModal) {
    const totalAnswered = Object.values(questionStates).filter(s => s.showResult).length;
    const correctCount = Object.values(questionStates).filter(s => s.isCorrect).length;
    const score = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4">
          <h3 className="text-2xl font-bold text-slate-800 mb-6">Exam Complete!</h3>
          
          <div className="space-y-4 mb-8">
            <div className="text-center">
              <div className="text-5xl font-bold text-rose-600 mb-2">{score}%</div>
              <p className="text-slate-600">Your Score</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-600">Total Questions:</span>
                <span className="font-bold">{questions.length + groupedQuestions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Answered:</span>
                <span className="font-bold">{totalAnswered}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Correct:</span>
                <span className="font-bold text-green-600">{correctCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Wrong:</span>
                <span className="font-bold text-red-600">{totalAnswered - correctCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Time Spent:</span>
                <span className="font-bold">{formatTime(config?.timeLimit - timeLeft)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="flex-1 px-6 py-3 bg-slate-500 text-white rounded-xl hover:bg-slate-600"
            >
              Back to Categories
            </button>
            <button
              onClick={() => {
                setShowSubmitModal(false);
                setCurrentPage(1);
                setQuestionStates({});
                setStats({ correct: 0, wrong: 0, total: 0 });
                refetch();
              }}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl hover:from-rose-600 hover:to-pink-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

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

  // Check if we have questions to display
  const hasQuestions = questions.length > 0 || groupedQuestions.length > 0;

  if (!hasQuestions) {
    return (
      <div className="text-center py-12">
        <div className="bg-amber-50 rounded-xl p-8 max-w-md mx-auto">
          <i className="fas fa-question-circle text-4xl text-amber-500 mb-4"></i>
          <h3 className="text-lg font-semibold text-amber-800 mb-2">No Questions Found</h3>
          <p className="text-amber-600 mb-4">
            No questions available for {category?.name} ({type} - {subType})
          </p>
          <button
            onClick={onBack}
            className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Timer and Controls */}
      <div className="lg:w-80 order-first lg:order-last">
        <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
          <Timer
            timeLeft={timeLeft}
            formatTime={formatTime}
            onPause={handlePause}
            onSubmit={handleSubmitExam}
          />
          
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h4 className="font-semibold text-slate-800 mb-4">Exam Info</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Category:</span>
                <span className="font-medium text-slate-800">{category?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Format:</span>
                <span className="font-medium text-slate-800">{subType?.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Questions:</span>
                <span className="font-medium text-slate-800">
                  {type === 'main' && subType === 'cbt' ? '300' : 
                   type === 'qblock' ? '40' : 
                   questions.length + groupedQuestions.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Progress:</span>
                <span className="font-medium text-rose-600">
                  {Object.values(questionStates).filter(s => s.showResult).length} / {
                    type === 'main' && subType === 'cbt' ? 300 :
                    type === 'qblock' ? 40 :
                    questions.length + groupedQuestions.length
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Question Sidebar */}
      <div className="lg:w-80">
        <QuestionSidebar
          questions={
            groupedQuestions.length > 0
              ? groupedQuestions.map(q => ({ id: q.questionId }))
              : questions.map((q: any) => ({ id: q.id }))
          }
          getQuestionColor={getQuestionColor}
          onQuestionClick={(id) => {
            document.getElementById(`q-${id}`)?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      </div>

      {/* Questions Grid */}
      <div className="flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Render grouped CBT questions */}
          {groupedQuestions.length > 0 && groupedQuestions.map((q) => {
            const state = questionStates[q.questionId] || { 
              selectedAnswer: null, 
              showResult: false, 
              isCorrect: false 
            };
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
                  isBookmarked={state.isBookmarked}
                  imageLoaded={loadedImages.has(q.questionId)}
                  onAnswerSelect={(idx) => handleAnswerSelect(q.questionId, idx)}
                  onCheck={() => handleCheckAnswer(q.questionId, correctIndex)}
                  onBookmark={() => handleBookmark(q.questionId)}
                  onImageLoad={() => handleImageLoad(q.questionId)}
                />
              </div>
            );
          })}

          {/* Render non-grouped questions (OSCE, QBlock) */}
          {questions.length > 0 && questions.map((q: any) => (
            <div key={q.id} id={`q-${q.id}`} className="scroll-mt-24">
              <QuestionCard
                title={q.quizName || q.osceName || 'Question'}
                question={q.question || ''}
                figureUrl={q.figureUrl}
                answers={q.answer1 ? [q.answer1, q.answer2, q.answer3, q.answer4] : undefined}
                correctAnswer={q.correctAnswer}
                correctAnswers={q.correctAnswers}
                selectedAnswer={questionStates[q.id]?.selectedAnswer ?? null}
                showResult={questionStates[q.id]?.showResult || false}
                isCorrect={questionStates[q.id]?.isCorrect}
                explanation={q.explanation}
                questionId={q.id}
                isBookmarked={questionStates[q.id]?.isBookmarked}
                imageLoaded={loadedImages.has(q.id)}
                onAnswerSelect={q.answer1 ? (idx) => handleAnswerSelect(q.id, idx) : undefined}
                onCheck={q.answer1 ? () => handleCheckAnswer(q.id, (q.correctAnswer - 1)) : undefined}
                onOSCEAnswerChange={!q.answer1 ? (val: string) => handleOSCEAnswerChange(q.id, val) : undefined}
                onOSCESubmit={!q.answer1 ? () => handleOSCESubmit(q.id, q.correctAnswers || q.answer) : undefined}
                onBookmark={() => handleBookmark(q.id)}
                onImageLoad={() => handleImageLoad(q.id)}
              />
            </div>
          ))}
        </div>

        {/* Pagination - only show if needed */}
        {data?.totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={data.totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MockExamPlayer;