// app/dashboard/components/mocks/QBlockQuestionCard.tsx
'use client';
import { FC } from "react";

interface QBlockQuestionCardProps {
  title: string;
  question: string;
  figureUrl?: string | null;
  answers: string[];
  selectedAnswer: number | null;
  showResult: boolean;
  isCorrect?: boolean;
  correctAnswer: number;
  explanation?: string;
  onAnswerSelect: (index: number) => void;
  onCheck: () => void;
}

const QBlockQuestionCard: FC<QBlockQuestionCardProps> = ({
  title,
  question,
  figureUrl,
  answers,
  selectedAnswer,
  showResult,
  isCorrect,
  correctAnswer,
  explanation,
  onAnswerSelect,
  onCheck
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

        <div className="space-y-2 mb-4">
          {answers.map((ans, idx) => (
            <button
              key={idx}
              onClick={() => !showResult && onAnswerSelect(idx)}
              disabled={showResult}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                selectedAnswer === idx
                  ? showResult
                    ? (idx + 1) === correctAnswer
                      ? 'border-green-500 bg-green-50'
                      : 'border-red-500 bg-red-50'
                    : 'border-rose-500 bg-rose-50'
                  : showResult && (idx + 1) === correctAnswer
                    ? 'border-green-500 bg-green-50'
                    : 'border-slate-200 hover:border-rose-300'
              }`}
            >
              <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
              <span className="line-clamp-2">{ans}</span>
            </button>
          ))}
        </div>

        {!showResult ? (
          <button
            onClick={onCheck}
            disabled={selectedAnswer === null}
            className="w-full px-4 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg hover:from-rose-600 hover:to-pink-700 disabled:opacity-50 font-semibold"
          >
            Check Answer
          </button>
        ) : (
          <div className={`p-4 rounded-lg ${isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
            <p className={`font-semibold mb-2 ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
              {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
            </p>
            {explanation && (
              <div className="text-sm text-slate-700 max-h-40 overflow-y-auto">
                {renderHtml(explanation)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QBlockQuestionCard;