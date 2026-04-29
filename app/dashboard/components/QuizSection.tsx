// app/dashboard/components/QuizSection.tsx
'use client';
import { FC, useState, useEffect } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { cn } from "@/utils";
import AdminUploadModal from "./admin/AdminUploadModal";
import { AdminGuard } from "./AdminGuard";

type QuizSectionProps = {
  switchSection: (section: string) => void;
};

const QuizSection: FC<QuizSectionProps> = ({ switchSection }) => {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [quizType, setQuizType] = useState<'mcq' | 'picture_test' | 'dental'>('mcq');
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [stats, setStats] = useState({ total: 0, correct: 0, wrong: 0 });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [quizSession, setQuizSession] = useState<string | null>(null);
  const [showQuestionSidebar, setShowQuestionSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  const [questionStates, setQuestionStates] = useState<Array<'unanswered' | 'correct' | 'wrong'>>([]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setShowQuestionSidebar(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [quizType]);

  useEffect(() => {
    if (selectedCategory) {
      fetchQuestions();
    }
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`/api/quiz-categories?type=${quizType}`);
      const data = await res.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchQuestions = async () => {
    try {
      const res = await fetch(`/api/quiz-questions?categoryId=${selectedCategory}`);
      const data = await res.json();
      
      if (data.length > 0) {
        const withFigures = data.filter((q: any) => q.figureUrl);
        console.log(`Questions with figures: ${withFigures.length}/${data.length}`);
      }
      
      setQuestions(data);
      setQuestionStates(new Array(data.length).fill('unanswered'));
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setShowResult(false);
      setStats({ total: 0, correct: 0, wrong: 0 });
      
      if (data.length > 0 && session?.user?.id) {
        const sessionRes = await fetch('/api/quiz-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            categoryId: selectedCategory,
            totalQuestions: data.length
          })
        });
        const sessionData = await sessionRes.json();
        setQuizSession(sessionData.id);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Failed to load questions');
    }
  };

  const handleAnswerSelect = (index: number) => {
    if (!showResult) {
      setSelectedAnswer(index);
    }
  };

  const handleCheckAnswer = async () => {
    if (selectedAnswer === null) {
      toast.error('Please select an answer');
      return;
    }
    
    const currentQuestion = questions[currentIndex];
    const correct = selectedAnswer === currentQuestion.correctAnswer;
    
    setIsCorrect(correct);
    
    setQuestionStates(prev => {
      const newStates = [...prev];
      newStates[currentIndex] = correct ? 'correct' : 'wrong';
      return newStates;
    });
    
    if (quizSession) {
      await fetch('/api/quiz-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: quizSession,
          questionId: currentQuestion.id,
          selectedAnswer,
          isCorrect: correct
        })
      });
    }
    
    setStats(prev => ({
      total: prev.total + 1,
      correct: prev.correct + (correct ? 1 : 0),
      wrong: prev.wrong + (correct ? 0 : 1)
    }));
    
    setShowResult(true);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  };

  const handleJumpToQuestion = (index: number) => {
    setCurrentIndex(index);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  const handleUpload = async (data: any[]) => {
    await fetchCategories();
    if (selectedCategory) {
      await fetchQuestions();
    }
  };

  const renderHtml = (html: string) => {
    return <div className={cn("prose max-w-none", isDark ? "prose-invert" : "")} dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const getImageUrl = (url: string | null): string | undefined => {
    if (!url) return undefined;
    if (url.startsWith('/')) {
      return url;
    }
    return url;
  };

  const getQuestionButtonColor = (state: 'unanswered' | 'correct' | 'wrong', isCurrent: boolean) => {
    if (isCurrent) {
      return 'bg-emerald-500 text-white ring-2 ring-emerald-300 ring-offset-2 dark:ring-offset-gray-800';
    }
    
    switch (state) {
      case 'correct':
        return 'bg-green-500 text-white hover:bg-green-600';
      case 'wrong':
        return 'bg-red-500 text-white hover:bg-red-600';
      default:
        return isDark 
          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200';
    }
  };

  if (selectedCategory && questions.length > 0) {
    const currentQuestion = questions[currentIndex];
    
    return (
      <div className="flex gap-3 md:gap-6 h-[calc(100vh-120px)] md:h-[calc(100vh-200px)] relative">
        {/* Question Sidebar - Mobile Tray */}
        <div
          className={cn(`
            fixed md:relative inset-x-0 bottom-0 md:inset-auto z-50
            transition-transform duration-300 ease-in-out transform
            ${showQuestionSidebar ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
            md:translate-y-0
            rounded-t-3xl md:rounded-2xl
            shadow-2xl md:shadow-lg
            p-4 md:p-4
            max-h-[80vh] md:max-h-full
            overflow-y-auto
            w-full md:w-64
            flex-shrink-0
            border-t-4 md:border-t-0
            border-emerald-500 md:border-emerald-200
          `,
            isDark 
              ? "bg-gray-800 md:bg-transparent"
              : "bg-white md:bg-transparent"
          )}
        >
          {/* Mobile Enhanced Handle with Close Button */}
          <div className="md:hidden flex items-center justify-between mb-4 pt-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-1.5 bg-slate-300 rounded-full" />
              <span className={cn("text-xs font-medium", isDark ? "text-gray-500" : "text-slate-400")}>Slide down to close</span>
            </div>
            <button 
              onClick={() => setShowQuestionSidebar(false)}
              className={cn("p-2 rounded-full transition-colors", isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-slate-100 hover:bg-slate-200")}
            >
              <i className={cn("fas fa-chevron-down", isDark ? "text-gray-400" : "text-slate-600")}></i>
            </button>
          </div>

          {/* Tray Header with Icon */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <i className="fas fa-list-check text-white text-sm"></i>
              </div>
              <h3 className={cn("font-bold", isDark ? "text-gray-100" : "text-slate-800")}>Questions List</h3>
            </div>
            <button 
              onClick={() => setShowQuestionSidebar(false)}
              className={cn("md:hidden p-2", isDark ? "text-gray-400 hover:text-gray-200" : "text-slate-400 hover:text-slate-600")}
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
          
          <div className={cn("mb-4 p-3 rounded-lg", isDark ? "bg-emerald-950/50" : "bg-emerald-50")}>
            <div className="flex justify-between text-sm">
              <span className={isDark ? "text-gray-400" : "text-slate-600"}>Progress:</span>
              <span className="font-bold text-emerald-600">
                {questionStates.filter(s => s !== 'unanswered').length}/{questions.length}
              </span>
            </div>
            <div className={cn("mt-2 h-2 rounded-full overflow-hidden", isDark ? "bg-gray-700" : "bg-slate-200")}>
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600"
                style={{ width: `${(questionStates.filter(s => s !== 'unanswered').length / questions.length) * 100}%` }}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-5 md:grid-cols-4 gap-2">
            {questions.map((_, idx) => {
              const state = questionStates[idx];
              const isCurrent = idx === currentIndex;
              
              return (
                <button
                  key={idx}
                  onClick={() => {
                    handleJumpToQuestion(idx);
                    if (isMobile) setShowQuestionSidebar(false);
                  }}
                  className={`
                    p-2 rounded-lg text-center font-medium transition-all
                    ${getQuestionButtonColor(state, isCurrent)}
                  `}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
          
          <div className={cn("mt-4 pt-4 border-t", isDark ? "border-gray-700" : "border-slate-200")}>
            <div className="grid grid-cols-2 md:grid-cols-1 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-500 rounded"></div>
                <span className={isDark ? "text-gray-400" : "text-slate-600"}>Current</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className={isDark ? "text-gray-400" : "text-slate-600"}>Correct</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className={isDark ? "text-gray-400" : "text-slate-600"}>Wrong</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn("w-4 h-4 border rounded", 
                  isDark ? "bg-gray-700 border-gray-600" : "bg-slate-100 border-slate-300"
                )}></div>
                <span className={isDark ? "text-gray-400" : "text-slate-600"}>Unanswered</span>
              </div>
            </div>
          </div>
        </div>

        {/* Overlay for mobile when sidebar is open */}
        {showQuestionSidebar && isMobile && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setShowQuestionSidebar(false)}
          />
        )}

        {/* Main Content */}
        <div className={cn("flex-1 rounded-2xl shadow-lg p-4 md:p-8 border overflow-y-auto",
          isDark ? "bg-gray-800/95 border-emerald-800" : "bg-gradient-to-br from-white/95 to-emerald-50/95 border-emerald-300"
        )}>
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8">
            <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
              <button
                onClick={() => setShowQuestionSidebar(true)}
                className="md:hidden flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 shadow-lg hover:shadow-xl transition-all"
                title="Show questions list"
              >
                <i className="fas fa-chevron-up text-sm"></i>
                <i className="fas fa-grid-2 text-lg"></i>
                <span className="text-sm font-medium">Questions</span>
                <div className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
                  {questionStates.filter(s => s !== 'unanswered').length}/{questions.length}
                </div>
              </button>
              
              <h2 className={cn("text-xl md:text-3xl font-bold flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
                <i className="fas fa-question-circle mr-2 md:mr-4 text-emerald-500"></i>
                <span className="truncate">
                  {quizType === 'mcq' ? 'MCQ Quiz' : quizType === 'picture_test' ? 'Picture Test' : 'Dental Quiz'}
                </span>
              </h2>
            </div>
            
            <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto justify-between md:justify-end">
              <div className={cn("px-3 md:px-4 py-2 rounded-lg shadow text-sm md:text-base",
                isDark ? "bg-gray-700" : "bg-white"
              )}>
                <span className={isDark ? "text-gray-400" : "text-slate-600"}>Progress:</span>
                <span className={cn("font-bold ml-1 md:ml-2", isDark ? "text-gray-100" : "text-slate-800")}>{currentIndex + 1}/{questions.length}</span>
              </div>
              <button
                onClick={() => {
                  setSelectedCategory('');
                  setQuestions([]);
                  setCurrentIndex(0);
                }}
                className="px-3 md:px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 text-sm md:text-base"
              >
                <i className="fas fa-times mr-1 md:mr-2"></i>
                <span className="hidden md:inline">Exit</span>
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className={cn("rounded-xl p-3 md:p-4 mb-4 md:mb-6 flex gap-4 md:gap-6 overflow-x-auto",
            isDark ? "bg-gray-700" : "bg-white"
          )}>
            <div className="flex items-center flex-shrink-0">
              <span className={cn("text-xs md:text-sm", isDark ? "text-gray-400" : "text-slate-600")}>Correct:</span>
              <span className="font-bold text-green-600 ml-1 md:ml-2 text-sm md:text-base">{stats.correct}</span>
            </div>
            <div className="flex items-center flex-shrink-0">
              <span className={cn("text-xs md:text-sm", isDark ? "text-gray-400" : "text-slate-600")}>Wrong:</span>
              <span className="font-bold text-red-600 ml-1 md:ml-2 text-sm md:text-base">{stats.wrong}</span>
            </div>
            <div className="flex items-center flex-shrink-0">
              <span className={cn("text-xs md:text-sm", isDark ? "text-gray-400" : "text-slate-600")}>Accuracy:</span>
              <span className="font-bold text-blue-600 ml-1 md:ml-2 text-sm md:text-base">
                {stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Question */}
          <div className={cn("rounded-xl p-4 md:p-8 mb-4 md:mb-6", isDark ? "bg-gray-700" : "bg-white")}>
            <div className="flex flex-col md:flex-row justify-between items-start gap-2 mb-4">
              <h3 className={cn("text-base md:text-lg font-semibold", isDark ? "text-gray-200" : "text-slate-700")}>
                Question {currentIndex + 1}
              </h3>
              {currentQuestion.figureUrl && (
                <span className="bg-emerald-100 text-emerald-800 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm whitespace-nowrap">
                  <i className="fas fa-image mr-1"></i> Has Image
                </span>
              )}
            </div>

            {/* Image */}
            {currentQuestion.figureUrl && (
              <div className="mb-4 md:mb-6 flex justify-center">
                <img 
                  src={getImageUrl(currentQuestion.figureUrl)} 
                  alt="Question" 
                  className={cn("max-w-full max-h-48 md:max-h-96 rounded-lg border shadow-sm",
                    isDark ? "border-emerald-800" : "border-emerald-200"
                  )}
                  onError={(e) => {
                    console.error('Image failed to load:', currentQuestion.figureUrl);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            
            <p className={cn("text-base md:text-lg mb-4 md:mb-6", isDark ? "text-gray-200" : "text-slate-800")}>{currentQuestion.content}</p>
            
            <div className="space-y-2 md:space-y-3">
              {[currentQuestion.answer1, currentQuestion.answer2, currentQuestion.answer3, currentQuestion.answer4].map((answer, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswerSelect(idx)}
                  disabled={showResult}
                  className={cn("w-full text-left p-3 md:p-4 rounded-xl border-2 transition-all text-sm md:text-base",
                    selectedAnswer === idx
                      ? showResult
                        ? idx === currentQuestion.correctAnswer
                          ? isDark ? "border-green-700 bg-green-950/50" : "border-green-500 bg-green-50"
                          : isDark ? "border-red-700 bg-red-950/50" : "border-red-500 bg-red-50"
                        : isDark ? "border-emerald-600 bg-emerald-950/50" : "border-emerald-500 bg-emerald-50"
                      : showResult && idx === currentQuestion.correctAnswer
                        ? isDark ? "border-green-700 bg-green-950/50" : "border-green-500 bg-green-50"
                        : isDark 
                          ? "border-gray-700 hover:border-emerald-700"
                          : "border-slate-200 hover:border-emerald-300"
                  )}
                >
                  <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span> 
                  <span className="break-words">{answer}</span>
                </button>
              ))}
            </div>

            {showResult && (
              <div className="mt-4 md:mt-6">
                <div className={cn("p-3 md:p-4 rounded-xl", 
                  isCorrect 
                    ? isDark ? "bg-green-950/50" : "bg-green-100"
                    : isDark ? "bg-red-950/50" : "bg-red-100"
                )}>
                  <p className={cn("font-semibold", 
                    isCorrect 
                      ? isDark ? "text-green-300" : "text-green-800"
                      : isDark ? "text-red-300" : "text-red-800"
                  )}>
                    {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                  </p>
                  
                  {currentQuestion.explanation && (
                    <div className={cn("mt-3 md:mt-4 p-3 md:p-4 rounded-lg",
                      isDark ? "bg-blue-950/50" : "bg-blue-50"
                    )}>
                      <h4 className={cn("font-semibold mb-2 flex items-center text-sm md:text-base",
                        isDark ? "text-blue-300" : "text-blue-800"
                      )}>
                        <i className="fas fa-info-circle mr-2"></i>
                        Explanation:
                      </h4>
                      <div className={cn("prose-sm max-w-none text-sm md:text-base",
                        isDark ? "text-gray-300" : "text-slate-700"
                      )}>
                        {renderHtml(currentQuestion.explanation)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex flex-col md:flex-row justify-between gap-3 md:gap-4">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className={`w-full md:w-auto px-4 md:px-6 py-3 rounded-xl flex items-center justify-center font-semibold text-sm md:text-base ${
                currentIndex === 0
                  ? isDark
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-slate-500 to-slate-600 text-white hover:from-slate-600 hover:to-slate-700'
              }`}
            >
              <i className="fas fa-arrow-left mr-2 md:mr-3"></i>
              Previous
            </button>
            
            {!showResult ? (
              <button
                onClick={handleCheckAnswer}
                disabled={selectedAnswer === null}
                className="w-full px-4 md:px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm md:text-base"
              >
                Check Answer
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="w-full px-4 md:px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 font-semibold text-sm md:text-base"
              >
                {currentIndex < questions.length - 1 ? (
                  <>Next <i className="fas fa-arrow-right ml-2 md:ml-3"></i></>
                ) : (
                  'Complete Quiz'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Category Selection View - Mobile Responsive
  return (
    <div className={cn("rounded-2xl shadow-lg p-4 md:p-8 border backdrop-blur-sm",
      isDark ? "bg-gray-800/95 border-emerald-800" : "bg-gradient-to-br from-white/95 to-emerald-50/95 border-emerald-300"
    )}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8">
        <h2 className={cn("text-2xl md:text-3xl font-bold flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
          <i className="fas fa-question-circle mr-3 md:mr-4 text-emerald-500"></i>
          Quiz Center
        </h2>
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={() => switchSection('selection')}
            className="flex-1 md:flex-none px-4 md:px-6 py-3 bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-xl hover:from-slate-600 hover:to-slate-700 transition-all duration-300 flex items-center justify-center font-bold shadow-lg text-sm md:text-base"
          >
            <i className="fas fa-arrow-left mr-2 md:mr-3"></i>
            Back
          </button>
        </div>
      </div>

      {/* Admin Upload Button */}
      <AdminGuard>
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => setShowUploadModal(true)}
            className="w-full md:w-auto px-4 md:px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 flex items-center justify-center font-semibold shadow-lg text-sm md:text-base"
          >
            <i className="fas fa-upload mr-2 md:mr-3"></i>
            Admin: Upload Questions
          </button>
        </div>
      </AdminGuard>

      {/* Quiz Type Selection */}
      <div className="flex gap-3 md:gap-4 mb-6 md:mb-8 overflow-x-auto pb-2 md:pb-0">
        <button
          onClick={() => setQuizType('mcq')}
          className={cn("flex-1 min-w-[120px] md:min-w-0 p-4 md:p-6 rounded-xl border-2 transition-all",
            quizType === 'mcq' 
              ? isDark ? 'border-emerald-600 bg-emerald-950/50' : 'border-emerald-500 bg-emerald-50'
              : isDark ? 'border-gray-700 hover:border-emerald-700' : 'border-slate-200 hover:border-emerald-300'
          )}
        >
          <i className="fas fa-list-ul text-2xl md:text-3xl text-emerald-500 mb-2 md:mb-3"></i>
          <h3 className={cn("font-bold text-sm md:text-lg", isDark ? "text-gray-100" : "text-slate-800")}>MCQ</h3>
          <p className={cn("text-xs md:text-sm hidden md:block", isDark ? "text-gray-400" : "text-slate-600")}>Multiple Choice Questions</p>
        </button>
        
        <button
          onClick={() => setQuizType('picture_test')}
          className={cn("flex-1 min-w-[120px] md:min-w-0 p-4 md:p-6 rounded-xl border-2 transition-all",
            quizType === 'picture_test' 
              ? isDark ? 'border-emerald-600 bg-emerald-950/50' : 'border-emerald-500 bg-emerald-50'
              : isDark ? 'border-gray-700 hover:border-emerald-700' : 'border-slate-200 hover:border-emerald-300'
          )}
        >
          <i className="fas fa-image text-2xl md:text-3xl text-emerald-500 mb-2 md:mb-3"></i>
          <h3 className={cn("font-bold text-sm md:text-lg", isDark ? "text-gray-100" : "text-slate-800")}>Picture Test</h3>
          <p className={cn("text-xs md:text-sm hidden md:block", isDark ? "text-gray-400" : "text-slate-600")}>Image-based Questions</p>
        </button>
        
        <button
          onClick={() => setQuizType('dental')}
          className={cn("flex-1 min-w-[120px] md:min-w-0 p-4 md:p-6 rounded-xl border-2 transition-all",
            quizType === 'dental' 
              ? isDark ? 'border-emerald-600 bg-emerald-950/50' : 'border-emerald-500 bg-emerald-50'
              : isDark ? 'border-gray-700 hover:border-emerald-700' : 'border-slate-200 hover:border-emerald-300'
          )}
        >
          <i className="fas fa-tooth text-2xl md:text-3xl text-emerald-500 mb-2 md:mb-3"></i>
          <h3 className={cn("font-bold text-sm md:text-lg", isDark ? "text-gray-100" : "text-slate-800")}>Dental</h3>
          <p className={cn("text-xs md:text-sm hidden md:block", isDark ? "text-gray-400" : "text-slate-600")}>Dental-specific Questions</p>
        </button>
      </div>

      {/* Category Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={cn("rounded-xl p-4 md:p-6 border hover:shadow-lg transition-all text-left group",
              isDark ? "bg-gray-700/50 border-emerald-800" : "bg-white/80 border-emerald-200"
            )}
          >
            <div className="flex items-center mb-2 md:mb-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center mr-2 md:mr-3 group-hover:scale-110 transition-transform">
                <i className="fas fa-folder text-white text-sm md:text-base"></i>
              </div>
              <h3 className={cn("font-bold text-base md:text-lg truncate", isDark ? "text-gray-100" : "text-slate-800")}>{category.name}</h3>
            </div>
            <div className="flex items-center justify-between">
              <span className={cn("text-xs md:text-sm", isDark ? "text-gray-400" : "text-slate-600")}>
                <i className="fas fa-question-circle mr-1 text-emerald-500"></i>
                Questions:
              </span>
              <span className={cn("font-bold px-2 md:px-3 py-1 rounded-full text-sm md:text-base",
                isDark ? "bg-emerald-950/50 text-emerald-400" : "bg-emerald-50 text-emerald-600"
              )}>
                {category.questionCount || 0}
              </span>
            </div>
          </button>
        ))}
        
        {categories.length === 0 && (
          <div className={cn("col-span-full text-center py-8 md:py-12 rounded-2xl border-2 border-dashed",
            isDark ? "bg-emerald-950/30 border-emerald-800" : "bg-gradient-to-br from-emerald-50/80 to-emerald-100/80 border-emerald-300"
          )}>
            <i className={cn("fas fa-puzzle-piece text-4xl md:text-5xl mb-3 md:mb-4", isDark ? "text-emerald-600" : "text-emerald-400")}></i>
            <p className={cn("text-base md:text-lg", isDark ? "text-gray-400" : "text-slate-500")}>No quizzes available in this category.</p>
            <AdminGuard>
              <button
                onClick={() => setShowUploadModal(true)}
                className="mt-3 md:mt-4 px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 text-sm md:text-base"
              >
                <i className="fas fa-upload mr-2"></i>
                Upload Questions
              </button>
            </AdminGuard>
          </div>
        )}
      </div>

      {/* Admin Upload Modal */}
      <AdminUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUpload}
        title="Upload Quiz Questions"
        uploadType="quiz"
      />
    </div>
  );
};

export default QuizSection;