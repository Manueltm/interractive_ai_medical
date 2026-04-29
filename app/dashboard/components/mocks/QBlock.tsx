// app/dashboard/components/mocks/QBlock.tsx
'use client';
import { FC, useState, useEffect } from "react";
import { toast } from "sonner";
import QuestionCard from "./QuestionCard";
import QuestionSidebar from "./QuestionSidebar";
import Pagination from "./Pagination";

interface QBlockProps {
  categoryId?: string;
  onStatsUpdate?: (stats: { correct: number; wrong: number; total: number }) => void;
}

interface Question {
  id: string;
  quizName: string;
  questionId: string;
  question: string;
  figureUrl?: string | null;
  explanation?: string;
  answer: string;
  isCorrect: boolean;
}

interface GroupedQuestion {
  questionId: string;
  quizName: string;
  question: string;
  figureUrl?: string | null;
  explanation?: string;
  answers: Array<{ text: string; isCorrect: boolean; id: string }>;
}

const QBlock: FC<QBlockProps> = ({ categoryId, onStatsUpdate }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [questions, setQuestions] = useState<GroupedQuestion[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [questionStates, setQuestionStates] = useState<Record<string, any>>({});
  const [stats, setStats] = useState({ correct: 0, wrong: 0, total: 0 });
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchQuestions();
  }, [currentPage, categoryId]);

  useEffect(() => {
    onStatsUpdate?.(stats);
  }, [stats, onStatsUpdate]);

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const url = new URL('/api/qblocks', window.location.origin);
      url.searchParams.append('page', currentPage.toString());
      url.searchParams.append('limit', '6');
      if (categoryId) {
        url.searchParams.append('categoryId', categoryId);
      }

      const res = await fetch(url.toString());
      const data = await res.json();

      // Group by questionId
      const groupedMap = new Map<string, GroupedQuestion>();
      
      data.items.forEach((item: Question) => {
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

      setQuestions(Array.from(groupedMap.values()));
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Error fetching QBlock questions:', error);
      toast.error('Failed to load questions');
    } finally {
      setIsLoading(false);
    }
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

  const handleImageLoad = (questionId: string) => {
    setLoadedImages(prev => new Set(prev).add(questionId));
  };

  const getQuestionState = (questionId: string) => {
    return questionStates[questionId] || { selectedAnswer: null, showResult: false, isCorrect: false };
  };

  const getQuestionColor = (questionId: string): 'unanswered' | 'correct' | 'wrong' => {
    const state = questionStates[questionId];
    if (!state || !state.showResult) return 'unanswered';
    return state.isCorrect ? 'correct' : 'wrong';
  };

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

  if (questions.length === 0) {
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
      <QuestionSidebar
        questions={questions.map(q => ({ id: q.questionId }))}
        getQuestionColor={getQuestionColor}
        onQuestionClick={(id) => {
          document.getElementById(`q-${id}`)?.scrollIntoView({ behavior: 'smooth' });
        }}
      />
      
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

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default QBlock;