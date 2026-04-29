// app/dashboard/components/QTopicSection.tsx
'use client';
import { FC, useState, useEffect } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { cn } from "@/utils";
import AdminUploadModal from "./admin/AdminUploadModal";
import { AdminGuard } from "./AdminGuard";

type QTopicSectionProps = {
  switchSection: (section: string) => void;
};

const QTopicSection: FC<QTopicSectionProps> = ({ switchSection }) => {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [view, setView] = useState<'categories' | 'topics' | 'questions'>('categories');
  const [categories, setCategories] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<Record<string, number>>({});
  const [showResult, setShowResult] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (view === 'categories') {
      fetchCategories();
    }
  }, [view]);

  useEffect(() => {
    if (view === 'topics' && selectedCategory) {
      fetchTopics();
    }
  }, [view, selectedCategory]);

  useEffect(() => {
    if (view === 'questions' && selectedCategory && selectedTopic) {
      fetchQuestions();
    }
  }, [view, selectedCategory, selectedTopic]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/qtopic/categories');
      const data = await res.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const fetchTopics = async () => {
    try {
      const res = await fetch(`/api/qtopic/topics?category=${encodeURIComponent(selectedCategory)}`);
      const data = await res.json();
      setTopics(data);
    } catch (error) {
      console.error('Error fetching topics:', error);
      toast.error('Failed to load topics');
    }
  };

  const fetchQuestions = async () => {
    try {
      const res = await fetch(`/api/qtopic?category=${encodeURIComponent(selectedCategory)}&topic=${encodeURIComponent(selectedTopic)}`);
      const data = await res.json();
      setQuestions(data);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Failed to load questions');
    }
  };

  const handleUpload = async (data: any[]) => {
    if (view === 'categories') {
      await fetchCategories();
    } else if (view === 'topics') {
      await fetchTopics();
    } else {
      await fetchQuestions();
    }
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setView('topics');
  };

  const handleTopicSelect = (topic: string) => {
    setSelectedTopic(topic);
    setView('questions');
  };

  const handleBack = () => {
    if (view === 'topics') {
      setView('categories');
      setSelectedCategory('');
    } else if (view === 'questions') {
      setView('topics');
      setSelectedTopic('');
      setQuestions([]);
    }
  };

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    setSelectedAnswer(prev => ({ ...prev, [questionId]: answerIndex }));
    setShowResult(prev => ({ ...prev, [questionId]: false }));
  };

  const handleCheckAnswer = (questionId: string, correctAnswer: number) => {
    setShowResult(prev => ({ ...prev, [questionId]: true }));
    
    const isCorrect = selectedAnswer[questionId] === correctAnswer;
    if (isCorrect) {
      toast.success('✓ Correct!', { duration: 2000 });
    } else {
      toast.error('✗ Incorrect. Check the explanation below.', { duration: 3000 });
    }
  };

  const renderHtml = (html: string) => {
    return <div className={cn("prose max-w-none", isDark ? "prose-invert" : "")} dangerouslySetInnerHTML={{ __html: html }} />;
  };

  // Get all available answers (up to 5)
  const getAnswers = (question: any) => {
    const answers = [];
    if (question.answer1) answers.push({ text: question.answer1, index: 1 });
    if (question.answer2) answers.push({ text: question.answer2, index: 2 });
    if (question.answer3) answers.push({ text: question.answer3, index: 3 });
    if (question.answer4) answers.push({ text: question.answer4, index: 4 });
    if (question.answer5) answers.push({ text: question.answer5, index: 5 });
    return answers;
  };

  // Render Categories View
  const renderCategories = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {categories.map((cat) => (
        <button
          key={cat.category}
          onClick={() => handleCategorySelect(cat.category)}
          className={cn("group rounded-xl p-8 border-2 hover:shadow-xl transition-all duration-300 text-left",
            isDark 
              ? "bg-gradient-to-br from-gray-800 to-cyan-950/50 border-cyan-800 hover:border-cyan-600"
              : "bg-gradient-to-br from-white to-cyan-50 border-cyan-200 hover:border-cyan-500"
          )}
        >
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
              <i className="fas fa-folder text-white text-xl"></i>
            </div>
            <h3 className={cn("text-xl font-bold", isDark ? "text-gray-100" : "text-slate-800")}>{cat.category}</h3>
          </div>
          <div className={cn("space-y-2", isDark ? "text-gray-400" : "text-slate-600")}>
            <p className="flex items-center">
              <i className="fas fa-layer-group w-6 text-cyan-500"></i>
              <span>{cat.topicCount} Topics</span>
            </p>
            <p className="flex items-center">
              <i className="fas fa-question-circle w-6 text-cyan-500"></i>
              <span>{cat.questionCount} Questions</span>
            </p>
          </div>
        </button>
      ))}
    </div>
  );

  // Render Topics View
  const renderTopics = () => (
    <div>
      <div className={cn("mb-6 p-4 rounded-xl border", 
        isDark ? "bg-cyan-950/50 border-cyan-800" : "bg-cyan-50 border-cyan-200"
      )}>
        <div className="flex items-center">
          <i className="fas fa-folder-open text-cyan-600 text-2xl mr-3"></i>
          <div>
            <p className={cn("text-sm", isDark ? "text-gray-400" : "text-slate-600")}>Selected Category</p>
            <h3 className={cn("text-xl font-bold", isDark ? "text-cyan-400" : "text-cyan-800")}>{selectedCategory}</h3>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {topics.map((topic) => (
          <button
            key={topic.topic}
            onClick={() => handleTopicSelect(topic.topic)}
            className={cn("group rounded-xl p-8 border-2 hover:shadow-xl transition-all duration-300 text-left",
              isDark 
                ? "bg-gradient-to-br from-gray-800 to-cyan-950/50 border-cyan-800 hover:border-cyan-600"
                : "bg-gradient-to-br from-white to-cyan-50 border-cyan-200 hover:border-cyan-500"
            )}
          >
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                <i className="fas fa-tag text-white text-xl"></i>
              </div>
              <h3 className={cn("text-xl font-bold", isDark ? "text-gray-100" : "text-slate-800")}>{topic.topic}</h3>
            </div>
            <p className={cn("flex items-center", isDark ? "text-gray-400" : "text-slate-600")}>
              <i className="fas fa-question-circle w-6 text-cyan-500"></i>
              <span>{topic.questionCount} Questions</span>
            </p>
          </button>
        ))}
      </div>
    </div>
  );

  // Render Questions View
  const renderQuestions = () => (
    <div>
      <div className={cn("mb-6 p-4 rounded-xl border",
        isDark ? "bg-cyan-950/50 border-cyan-800" : "bg-cyan-50 border-cyan-200"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <i className="fas fa-tag text-cyan-600 text-2xl mr-3"></i>
            <div>
              <p className={cn("text-sm", isDark ? "text-gray-400" : "text-slate-600")}>
                {selectedCategory} / {selectedTopic}
              </p>
              <h3 className={cn("text-xl font-bold", isDark ? "text-cyan-400" : "text-cyan-800")}>{selectedTopic}</h3>
            </div>
          </div>
          <span className={cn("px-4 py-2 rounded-lg font-semibold",
            isDark ? "bg-cyan-900/50 text-cyan-300" : "bg-cyan-100 text-cyan-800"
          )}>
            {questions.length} Questions
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {questions.map((question, index) => {
          const answers = getAnswers(question);
          const hasSelected = selectedAnswer[question.id] !== undefined;
          const showResultForQuestion = showResult[question.id];
          const isCorrect = showResultForQuestion && selectedAnswer[question.id] === question.correctAnswer;
          
          return (
            <div key={question.id} className={cn("rounded-xl p-6 border hover:shadow-lg transition-all",
              isDark ? "bg-gray-800/80 border-cyan-800" : "bg-white/80 border-cyan-200"
            )}>
              <div className="flex items-center gap-3 mb-4">
                <span className={cn("px-3 py-1 rounded-full text-sm font-semibold",
                  isDark ? "bg-cyan-900/50 text-cyan-300" : "bg-cyan-100 text-cyan-800"
                )}>
                  Question {index + 1}
                </span>
              </div>

              <div className="flex justify-between items-start mb-4">
                <h3 className={cn("text-lg font-semibold flex-1", isDark ? "text-gray-100" : "text-slate-800")}>
                  {question.question}
                </h3>
                <button
                  onClick={() => setExpandedId(expandedId === question.id ? null : question.id)}
                  className={cn("ml-4 flex-shrink-0", isDark ? "text-cyan-400 hover:text-cyan-300" : "text-cyan-600 hover:text-cyan-800")}
                >
                  <i className={`fas fa-chevron-${expandedId === question.id ? 'up' : 'down'} text-xl`}></i>
                </button>
              </div>

              {/* Question Figure */}
              {question.figureUrl && (
                <div className="mb-6 flex justify-center">
                  <img 
                    src={question.figureUrl} 
                    alt="Question figure" 
                    className={cn("max-w-full max-h-64 rounded-lg border shadow-sm",
                      isDark ? "border-cyan-800" : "border-cyan-200"
                    )}
                  />
                </div>
              )}

              {/* Answer Options */}
              <div className="space-y-3 mb-6">
                {answers.map((answer) => {
                  const isSelected = selectedAnswer[question.id] === answer.index;
                  const showCorrect = showResultForQuestion && answer.index === question.correctAnswer;
                  const showWrong = showResultForQuestion && isSelected && !isCorrect;
                  
                  return (
                    <button
                      key={answer.index}
                      onClick={() => !showResultForQuestion && handleAnswerSelect(question.id, answer.index)}
                      disabled={showResultForQuestion}
                      className={cn("w-full text-left p-4 rounded-xl border-2 transition-all",
                        showCorrect
                          ? isDark 
                            ? "border-green-700 bg-green-950/50"
                            : "border-green-500 bg-green-50"
                          : showWrong
                          ? isDark
                            ? "border-red-700 bg-red-950/50"
                            : "border-red-500 bg-red-50"
                          : isSelected
                          ? isDark
                            ? "border-cyan-600 bg-cyan-950/50"
                            : "border-cyan-500 bg-cyan-50"
                          : isDark
                            ? "border-gray-700 hover:border-cyan-700 hover:bg-cyan-950/30"
                            : "border-slate-200 hover:border-cyan-300 hover:bg-cyan-50/50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span className={cn("font-bold w-6",
                          showCorrect
                            ? "text-green-600"
                            : showWrong
                            ? "text-red-600"
                            : isSelected
                            ? "text-cyan-600"
                            : isDark ? "text-gray-400" : "text-slate-600"
                        )}>
                          {String.fromCharCode(64 + answer.index)}.
                        </span>
                        <span className={cn("flex-1", isDark ? "text-gray-300" : "text-slate-700")}>{answer.text}</span>
                        {showCorrect && (
                          <i className="fas fa-check-circle text-green-500 text-xl"></i>
                        )}
                        {showWrong && (
                          <i className="fas fa-times-circle text-red-500 text-xl"></i>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Check Answer Button */}
              {!showResultForQuestion && hasSelected && (
                <button
                  onClick={() => handleCheckAnswer(question.id, question.correctAnswer)}
                  className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-xl hover:from-cyan-600 hover:to-cyan-700 transition-all font-semibold"
                >
                  Check Answer
                </button>
              )}

              {/* Result and Explanation */}
              {showResultForQuestion && (
                <div className="mt-6 space-y-4">
                  <div className={cn("p-4 rounded-xl",
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
                  </div>
                  
                  {question.explanation && (
                    <div className={cn("p-4 rounded-xl",
                      isDark ? "bg-blue-950/50" : "bg-blue-50"
                    )}>
                      <h4 className={cn("font-semibold mb-2 flex items-center",
                        isDark ? "text-blue-300" : "text-blue-800"
                      )}>
                        <i className="fas fa-info-circle mr-2"></i>
                        Explanation:
                      </h4>
                      <div className={isDark ? "text-gray-300 prose-sm" : "text-slate-700 prose-sm"}>
                        {renderHtml(question.explanation)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={cn("rounded-2xl shadow-lg p-8 border backdrop-blur-sm",
      isDark ? "bg-gray-800/95 border-cyan-800" : "bg-gradient-to-br from-white/95 to-cyan-50/95 border-cyan-300"
    )}>
      <div className="flex justify-between items-center mb-8">
        <h2 className={cn("text-3xl font-bold flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
          <i className="fas fa-tag mr-4 text-cyan-500"></i>
          QTopic - Practice Questions
        </h2>
        <div className="flex gap-3">
          {view !== 'categories' && (
            <button
              onClick={handleBack}
              className="px-6 py-3 bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-xl hover:from-slate-600 hover:to-slate-700 transition-all duration-300 flex items-center font-semibold shadow-lg"
            >
              <i className="fas fa-arrow-left mr-3"></i>
              Back
            </button>
          )}
          <button
            onClick={() => switchSection('selection')}
            className="px-6 py-3 bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-xl hover:from-slate-600 hover:to-slate-700 transition-all duration-300 flex items-center font-bold shadow-lg"
          >
            <i className="fas fa-arrow-left mr-3"></i>
            Dashboard
          </button>
        </div>
      </div>

      {/* Admin Upload Button */}
      <AdminGuard>
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 flex items-center font-semibold shadow-lg"
          >
            <i className="fas fa-upload mr-3"></i>
            Admin: Upload QTopic Questions
          </button>
        </div>
      </AdminGuard>

      {/* Content based on view */}
      {view === 'categories' && renderCategories()}
      {view === 'topics' && renderTopics()}
      {view === 'questions' && renderQuestions()}

      {/* Admin Upload Modal */}
      <AdminUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUpload}
        title="Upload QTopic Questions"
        uploadType="qtopic"
      />
    </div>
  );
};

export default QTopicSection;