// app/dashboard/components/mocks/QuestionCard.tsx
'use client';
import { FC, memo, useState } from "react";

export interface QuestionCardProps {
  title: string;
  question: string;
  figureUrl?: string | null;
  answers?: string[];
  selectedAnswer: number | null;
  showResult: boolean;
  isCorrect?: boolean;
  correctAnswerIndex?: number;
  correctAnswer?: number;
  correctAnswers?: string;
  explanation?: string;
  questionId: string;
  isBookmarked?: boolean;
  imageLoaded?: boolean;
  onAnswerSelect?: (index: number) => void;
  onCheck?: () => void;
  onOSCEAnswerChange?: (value: string) => void;
  onOSCESubmit?: () => void;
  onBookmark?: () => void;
  onImageLoad?: () => void;
}

const QuestionCard: FC<QuestionCardProps> = memo(({
  title,
  question,
  figureUrl,
  answers,
  selectedAnswer,
  showResult,
  isCorrect,
  correctAnswerIndex,
  correctAnswer,
  correctAnswers,
  explanation,
  questionId,
  isBookmarked,
  imageLoaded,
  onAnswerSelect,
  onCheck,
  onOSCEAnswerChange,
  onOSCESubmit,
  onBookmark,
  onImageLoad
}) => {
  const [isImageFullscreen, setIsImageFullscreen] = useState(false);
  
  const renderHtml = (html: string) => {
    return <div className="prose max-w-none text-sm" dangerouslySetInnerHTML={{ __html: html }} />;
  };

  // Check if this is an OSCE question (has correctAnswers but no answers array)
  const isOSCE = !answers && correctAnswers;
  
  // Determine the correct answer index for CBT/QBlock
  const getCorrectIndex = (): number => {
    if (correctAnswerIndex !== undefined) return correctAnswerIndex;
    if (correctAnswer !== undefined) return correctAnswer - 1;
    return -1;
  };

  const correctIdx = getCorrectIndex();

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg border border-rose-200 overflow-hidden hover:shadow-xl transition-all h-full flex flex-col">
        <div className="p-6 flex-1">
          {/* Header with bookmark */}
          <div className="flex justify-between items-start mb-4">
            <span className="inline-block px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-semibold">
              {title}
            </span>
            {onBookmark && (
              <button
                onClick={onBookmark}
                className={`p-2 rounded-full hover:bg-slate-100 transition-colors ${
                  isBookmarked ? 'text-yellow-500' : 'text-slate-400'
                }`}
              >
                <i className={`fas fa-${isBookmarked ? 'bookmark' : 'bookmark'}`}></i>
              </button>
            )}
          </div>

          {/* Question */}
          <h3 className="font-bold text-lg text-slate-800 mb-4">{question}</h3>

          {/* Image with improved display */}
          {figureUrl && (
            <div className="relative mb-6">
              {!imageLoaded && onImageLoad && (
                <div className="absolute inset-0 bg-slate-200 animate-pulse rounded-lg"></div>
              )}
              <div className="relative group">
                <img 
                  src={figureUrl} 
                  alt="Question figure" 
                  className={`w-full max-h-96 object-contain rounded-lg border-2 border-rose-200 bg-slate-50 transition-opacity duration-300 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  loading="lazy"
                  onLoad={onImageLoad}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    onImageLoad?.();
                  }}
                />
                {/* Image controls overlay */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button
                    onClick={() => setIsImageFullscreen(true)}
                    className="p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg hover:bg-white text-slate-700 transition-colors"
                    title="View fullscreen"
                  >
                    <i className="fas fa-expand text-lg"></i>
                  </button>
                </div>
              </div>
              
              {/* Image caption */}
              <p className="text-xs text-slate-500 mt-2 text-center">
                Click image to view larger • Double-click to zoom
              </p>
            </div>
          )}

          {/* OSCE Answer Input */}
          {isOSCE && !showResult && (
            <div className="space-y-4">
              <textarea
                onChange={(e) => onOSCEAnswerChange?.(e.target.value)}
                placeholder="Type your answer here..."
                className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-rose-500 focus:ring-2 focus:ring-rose-200 h-32"
              />
              <button
                onClick={onOSCESubmit}
                className="w-full px-4 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg hover:from-rose-600 hover:to-pink-700 font-semibold transition-all transform hover:scale-[1.02]"
              >
                Submit Answer
              </button>
            </div>
          )}

          {/* CBT/QBlock Answer Options */}
          {!isOSCE && answers && answers.length > 0 && (
            <div className="space-y-2 mb-4">
              {answers.map((ans, idx) => (
                <button
                  key={idx}
                  onClick={() => !showResult && onAnswerSelect?.(idx)}
                  disabled={showResult}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    selectedAnswer === idx
                      ? showResult
                        ? idx === correctIdx
                          ? 'border-green-500 bg-green-50'
                          : 'border-red-500 bg-red-50'
                        : 'border-rose-500 bg-rose-50'
                      : showResult && idx === correctIdx
                        ? 'border-green-500 bg-green-50'
                        : 'border-slate-200 hover:border-rose-300 hover:bg-rose-50/50'
                  }`}
                >
                  <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                  <span className="line-clamp-2">{ans}</span>
                </button>
              ))}
            </div>
          )}

          {/* Check Answer Button for CBT/QBlock */}
          {!isOSCE && !showResult && onCheck && (
            <button
              onClick={onCheck}
              disabled={selectedAnswer === null}
              className="w-full px-4 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg hover:from-rose-600 hover:to-pink-700 disabled:opacity-50 font-semibold transition-all transform hover:scale-[1.02] disabled:hover:scale-100"
            >
              Check Answer
            </button>
          )}

          {/* Result Display */}
          {showResult && (
            <div className={`p-4 rounded-lg ${isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
              <p className={`font-semibold mb-2 ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                {isCorrect ? (
                  <><i className="fas fa-check-circle mr-2"></i>Correct!</>
                ) : (
                  <><i className="fas fa-times-circle mr-2"></i>Incorrect</>
                )}
              </p>
              {explanation && (
                <div className="text-sm text-slate-700 max-h-40 overflow-y-auto prose prose-sm">
                  {renderHtml(explanation)}
                </div>
              )}
              {isOSCE && correctAnswers && (
                <div className="mt-2 text-sm text-slate-700">
                  <strong>Correct Answer:</strong> 
                  <div className="mt-1 prose prose-sm">
                    {renderHtml(correctAnswers)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Image Modal */}
      {isImageFullscreen && figureUrl && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setIsImageFullscreen(false)}
        >
          <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <button
              onClick={() => setIsImageFullscreen(false)}
              className="absolute top-4 right-4 p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/40 transition-colors z-10"
            >
              <i className="fas fa-times text-2xl"></i>
            </button>
            
            <img 
              src={figureUrl} 
              alt="Question figure fullscreen" 
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            
            <p className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white/80 text-sm bg-black/50 px-4 py-2 rounded-full">
              Click outside image to close • Scroll to zoom
            </p>
          </div>
        </div>
      )}
    </>
  );
});

QuestionCard.displayName = 'QuestionCard';

export default QuestionCard;