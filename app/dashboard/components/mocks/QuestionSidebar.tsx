// app/dashboard/components/mocks/QuestionSidebar.tsx
'use client';
import { FC } from "react";

interface QuestionSidebarProps {
  questions: Array<{ id: string }>;
  getQuestionColor: (id: string) => 'unanswered' | 'correct' | 'wrong';
  onQuestionClick: (id: string) => void;
}

const QuestionSidebar: FC<QuestionSidebarProps> = ({
  questions,
  getQuestionColor,
  onQuestionClick
}) => {
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'correct':
        return 'bg-green-500 text-white hover:bg-green-600';
      case 'wrong':
        return 'bg-red-500 text-white hover:bg-red-600';
      default:
        return 'bg-slate-200 text-slate-700 hover:bg-slate-300';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
      <h3 className="font-semibold text-slate-800 mb-4">Questions</h3>
      <div className="grid grid-cols-5 gap-2">
        {questions.map((q, index) => {
          const color = getQuestionColor(q.id);
          return (
            <button
              key={q.id}
              onClick={() => onQuestionClick(q.id)}
              className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${getColorClasses(color)}`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
      
      <div className="mt-6 pt-6 border-t border-slate-200">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-slate-600">Correct</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-slate-600">Wrong</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-slate-200 rounded"></div>
            <span className="text-slate-600">Unanswered</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionSidebar;