// app/dashboard/components/mocks/MainMockOSCE.tsx
'use client';
import { FC, useState, useEffect } from "react";
import { toast } from "sonner";
import OSCEQuestionCard from "./OSCEQuestionCard";
import Pagination from "./Pagination";

interface MainMockOSCEProps {
  categoryId?: string;
  onStatsUpdate?: (stats: { correct: number; wrong: number; total: number }) => void;
}

interface OSCEItem {
  id: string;
  osceName: string;
  questionId: string;
  question: string;
  figureUrl?: string | null;
  correctAnswers?: string;
  answer?: string;
}

const MainMockOSCE: FC<MainMockOSCEProps> = ({ categoryId, onStatsUpdate }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [items, setItems] = useState<OSCEItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [questionStates, setQuestionStates] = useState<Record<string, any>>({});
  const [osceAnswers, setOsceAnswers] = useState<Record<string, string>>({});
  const [stats, setStats] = useState({ correct: 0, wrong: 0, total: 0 });

  useEffect(() => {
    fetchItems();
  }, [currentPage, categoryId]);

  useEffect(() => {
    onStatsUpdate?.(stats);
  }, [stats, onStatsUpdate]);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const url = new URL('/api/main-mock-osce', window.location.origin);
      url.searchParams.append('page', currentPage.toString());
      url.searchParams.append('limit', '6');
      if (categoryId) {
        url.searchParams.append('categoryId', categoryId);
      }

      const res = await fetch(url.toString());
      const data = await res.json();

      setItems(data.items || []);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Error fetching OSCE items:', error);
      toast.error('Failed to load OSCE questions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setOsceAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmit = (itemId: string, correctAnswer: string) => {
    const userAnswer = osceAnswers[itemId] || '';
    if (!userAnswer.trim()) {
      toast.error('Please provide an answer');
      return;
    }

    const isCorrect = userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
    
    setQuestionStates(prev => ({
      ...prev,
      [itemId]: {
        showResult: true,
        isCorrect,
        userAnswer
      }
    }));

    setStats(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      wrong: prev.wrong + (isCorrect ? 0 : 1),
      total: prev.total + 1
    }));
  };

  const getQuestionState = (itemId: string) => {
    return questionStates[itemId] || { showResult: false };
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
            <div className="h-20 bg-slate-200 rounded mb-4"></div>
            <div className="h-32 bg-slate-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => {
          const state = getQuestionState(item.id);
          const answer = osceAnswers[item.id] || '';
          
          return (
            <div key={item.id} id={`q-${item.id}`}>
              <OSCEQuestionCard
                title={item.osceName}
                question={item.question}
                figureUrl={item.figureUrl}
                userAnswer={answer}
                showResult={state.showResult}
                isCorrect={state.isCorrect}
                correctAnswer={item.correctAnswers || item.answer || ''}
                onAnswerChange={(value) => handleAnswerChange(item.id, value)}
                onSubmit={() => handleSubmit(item.id, item.correctAnswers || item.answer || '')}
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
  );
};

export default MainMockOSCE;