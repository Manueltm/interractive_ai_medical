// app/dashboard/components/mocks/OSCEQuestionCard.tsx
'use client';
import { FC } from "react";

interface OSCEQuestionCardProps {
  title: string;
  question: string;
  figureUrl?: string | null;
  userAnswer: string;
  showResult: boolean;
  isCorrect?: boolean;
  correctAnswer: string;
  onAnswerChange: (value: string) => void;
  onSubmit: () => void;
}

const OSCEQuestionCard: FC<OSCEQuestionCardProps> = ({
  title,
  question,
  figureUrl,
  userAnswer,
  showResult,
  isCorrect,
  correctAnswer,
  onAnswerChange,
  onSubmit
}) => {
  const renderHtml = (html: string) => {
    return <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-rose-200 overflow-hidden hover:shadow-xl transition-all h-full flex flex-col">
      <div className="p-6 flex-1">
        <div className="mb-4">
          <span className="inline-block px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-semibold mb-2">
            {title}
          </span>
          <h3 className="font-bold text-lg text-slate-800 line-clamp-3">{question}</h3>
        </div>

        {figureUrl && (
          <div className="mb-4">
            <img 
              src={figureUrl} 
              alt="Question" 
              className="w-full h-40 object-cover rounded-lg border border-rose-200"
              loading="lazy"
              onError={(e) => e.currentTarget.style.display = 'none'}
            />
          </div>
        )}

        {!showResult ? (
          <div className="space-y-4">
            <textarea
              value={userAnswer}
              onChange={(e) => onAnswerChange(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-rose-500 focus:outline-none h-32 resize-none"
            />
            <button
              onClick={onSubmit}
              disabled={!userAnswer.trim()}
              className="w-full px-4 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg hover:from-rose-600 hover:to-pink-700 disabled:opacity-50 font-semibold"
            >
              Submit Answer
            </button>
          </div>
        ) : (
          <div className={`p-4 rounded-lg ${isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
            <p className={`font-semibold mb-2 ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
              {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
            </p>
            <div className="bg-white p-4 rounded-lg max-h-60 overflow-y-auto">
              <h4 className="font-semibold text-slate-700 mb-2">Your Answer:</h4>
              <p className="text-slate-600 mb-4 p-2 bg-slate-50 rounded">{userAnswer}</p>
              <h4 className="font-semibold text-slate-700 mb-2">Correct Answer:</h4>
              {renderHtml(correctAnswer)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OSCEQuestionCard;