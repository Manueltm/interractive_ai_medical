// app/dashboard/components/CbtHistory.tsx - ENHANCED VERSION
import { FC, useState, useEffect } from "react";
import { toast } from 'sonner';
import { getRandomMedicalQuote } from '@/lib/utils';

type DateFilter = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';
type CbtTypeFilter = 'all' | 'mdcn' | 'mbbs';
type ModeFilter = 'all' | 'practice' | 'timed' | 'exam';
type QuestionStatusFilter = 'all' | 'correct' | 'incorrect' | 'unanswered';

interface CbtSession {
  id: string;
  cbtType: string;
  mode: string;
  categoryId: string | null;
  categoryName: string | null;
  numQuestions: number;
  duration: number | null;
  score: number | null;
  correctAnswers: number;
  wrongAnswers: number;
  unanswered: number;
  completedAt: string | null;
  createdAt: string;
}

interface CbtSessionDetail {
  session: CbtSession;
  questions: CbtHistoryItem[];
}

interface CbtHistoryItem {
  id: string;
  questionId: string;
  questionContent: string;
  selectedOption: number | null;
  correctOption: number;
  options: { text: string; correct: boolean }[];
  explanation: string;
  cbtType: string;
  categoryName: string;
  createdAt: string;
  isCorrect: boolean;
  figureUrl?: string;
}

type CbtHistoryProps = {
  switchSection: (section: string) => void;
  showLoadingPopup: boolean;
  setShowLoadingPopup: (show: boolean) => void;
  loadingMessage: string;
  setLoadingMessage: (msg: string) => void;
  currentMedicalQuote: { text: string; author: string } | null;
  setCurrentMedicalQuote: (quote: { text: string; author: string } | null) => void;
};

const CbtHistory: FC<CbtHistoryProps> = ({
  switchSection,
  showLoadingPopup,
  setShowLoadingPopup,
  loadingMessage,
  setLoadingMessage,
  currentMedicalQuote,
  setCurrentMedicalQuote,
}) => {
  const [sessions, setSessions] = useState<CbtSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<CbtSessionDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<CbtTypeFilter>('all');
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // New states for question pagination and filtering
  const [questionCurrentPage, setQuestionCurrentPage] = useState(1);
  const [questionsPerPage] = useState(20);
  const [questionStatusFilter, setQuestionStatusFilter] = useState<QuestionStatusFilter>('all');

  const fetchSessions = async () => {
    setIsLoading(true);
    setShowLoadingPopup(true);
    setLoadingMessage('Loading CBT sessions...');
    setCurrentMedicalQuote(getRandomMedicalQuote());
    
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (modeFilter !== 'all') params.append('mode', modeFilter);
      if (dateFilter !== 'all') {
        params.append('startDate', getDateFilterStart(dateFilter));
        params.append('endDate', getDateFilterEnd(dateFilter));
      }
      if (dateFilter === 'custom' && customStartDate && customEndDate) {
        params.append('startDate', customStartDate);
        params.append('endDate', customEndDate);
      }

      const res = await fetch(`/api/cbt-sessions?${params.toString()}`, {
        credentials: 'include',
      });
      
      if (!res.ok) throw new Error('Failed to fetch CBT sessions');
      const data = await res.json();
      setSessions(data);
    } catch (error) {
      console.error('Error fetching CBT sessions:', error);
      toast.error('Failed to fetch CBT sessions');
      setSessions([]);
    } finally {
      setIsLoading(false);
      setShowLoadingPopup(false);
      setCurrentMedicalQuote(null);
    }
  };

  const fetchSessionDetails = async (sessionId: string) => {
    setShowLoadingPopup(true);
    setLoadingMessage('Loading session details...');
    setCurrentMedicalQuote(getRandomMedicalQuote());
    
    try {
      console.log('🔄 Fetching session details for:', sessionId);
      
      const res = await fetch(`/api/cbt-sessions/${sessionId}`, {
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch session details: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('✅ Session details received:', {
        session: data.session?.id,
        questionsCount: data.questions?.length,
        firstQuestion: data.questions?.[0]?.questionContent?.substring(0, 50) + '...'
      });
      
      setSelectedSession(data);
      setQuestionCurrentPage(1); // Reset to first page when viewing new session
      setQuestionStatusFilter('all'); // Reset filter
    } catch (error) {
      console.error('❌ Error fetching session details:', error);
      toast.error('Failed to fetch session details');
    } finally {
      setShowLoadingPopup(false);
      setCurrentMedicalQuote(null);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [typeFilter, modeFilter, dateFilter, customStartDate, customEndDate]);

  // Helper for date ranges
  const getDateFilterStart = (filter: DateFilter) => {
    const now = new Date();
    switch (filter) {
      case 'today':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case 'month':
        return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString();
      case 'year':
        return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString();
      default:
        return '';
    }
  };

  const getDateFilterEnd = (filter: DateFilter) => {
    return new Date().toISOString();
  };

  // Filter sessions based on search and filters
  const filteredSessions = sessions.filter(session => {
    const matchesSearch = searchQuery === '' || 
      session.categoryName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.cbtType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.mode.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === 'all' || session.cbtType === typeFilter;
    const matchesMode = modeFilter === 'all' || session.mode === modeFilter;
    
    return matchesSearch && matchesType && matchesMode;
  });

  // Filter questions based on status
  const filteredQuestions = selectedSession?.questions.filter(question => {
    if (questionStatusFilter === 'all') return true;
    if (questionStatusFilter === 'correct') return question.isCorrect;
    if (questionStatusFilter === 'incorrect') return !question.isCorrect && question.selectedOption !== null;
    if (questionStatusFilter === 'unanswered') return question.selectedOption === null;
    return true;
  }) || [];

  // Pagination calculations
  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSessions = filteredSessions.slice(startIndex, startIndex + itemsPerPage);

  // Question pagination calculations
  const totalQuestionPages = Math.ceil(filteredQuestions.length / questionsPerPage);
  const questionStartIndex = (questionCurrentPage - 1) * questionsPerPage;
  const paginatedQuestions = filteredQuestions.slice(questionStartIndex, questionStartIndex + questionsPerPage);

  // Get score badge color
  const getScoreBadge = (score: number | null) => {
    if (score === null) return 'bg-gray-100 text-gray-800 border-gray-300';
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-300';
    if (score >= 60) return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-rose-100 text-rose-800 border-rose-300';
  };

  // Get type badge
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'mdcn': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'mbbs': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Get mode badge
  const getModeBadge = (mode: string) => {
    switch (mode) {
      case 'practice': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'timed': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'exam': return 'bg-rose-100 text-rose-800 border-rose-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Get status badge for questions
  const getQuestionStatusBadge = (item: CbtHistoryItem) => {
    if (item.selectedOption === null) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return item.isCorrect ? 'bg-green-100 text-green-800 border-green-300' : 'bg-rose-100 text-rose-800 border-rose-300';
  };

  const getQuestionStatusText = (item: CbtHistoryItem) => {
    if (item.selectedOption === null) return 'Unanswered';
    return item.isCorrect ? 'Correct' : 'Incorrect';
  };

  if (selectedSession) {
    return (
      <>
        {/* Loading Popup */}
        {showLoadingPopup && (
          <div className="fixed inset-0 bg-white/40 dark:bg-black/30 backdrop-blur-lg flex items-center justify-center z-50">
            <div className="bg-gradient-to-br from-white/95 to-blue-50/95 rounded-2xl p-8 flex flex-col items-center min-w-[300px] md:min-w-[400px] max-w-md mx-4 border border-blue-300 shadow-xl backdrop-blur-sm">
              <div className="relative mb-6">
                <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-blue-500"></div>
                <div className="absolute inset-0 rounded-full h-14 w-14 border-t-2 border-blue-300 animate-pulse"></div>
              </div>
              <p className="text-slate-800 font-bold mb-3 text-center text-lg">{loadingMessage}</p>
              {currentMedicalQuote && (
                <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-l-4 border-blue-500 p-6 rounded-xl mb-6 w-full text-center backdrop-blur-sm">
                  <div className="flex flex-col items-center">
                    <p className="text-base text-slate-700 italic">{currentMedicalQuote.text}</p>
                    <p className="text-sm text-slate-600 mt-2">{currentMedicalQuote.author}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-gradient-to-br from-white/95 to-blue-50/95 rounded-2xl shadow-lg p-8 border border-blue-300 backdrop-blur-sm">
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
            <div className="flex-1">
              <button
                onClick={() => setSelectedSession(null)}
                className="px-6 py-3 bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-xl hover:from-slate-600 hover:to-slate-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer mb-4"
              >
                <i className="fas fa-arrow-left mr-3"></i>
                Back to Sessions
              </button>
              <h2 className="text-3xl font-bold flex items-center text-slate-800">
                <i className="fas fa-file-alt mr-4 text-blue-500"></i>
                Session Details
              </h2>
              <p className="text-slate-600 mt-3 text-lg">
                {selectedSession.session.cbtType.toUpperCase()} - {selectedSession.session.mode.charAt(0).toUpperCase() + selectedSession.session.mode.slice(1)} Mode
                {selectedSession.session.categoryName && ` - ${selectedSession.session.categoryName}`}
              </p>
            </div>
            <button
              onClick={() => switchSection('selection')}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center font-bold shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
            >
              <i className="fas fa-home mr-4"></i>
              Back to Dashboard
            </button>
          </div>

          {/* Session Summary */}
          <div className="bg-gradient-to-br from-white/80 to-blue-50/80 rounded-2xl p-8 mb-8 border border-blue-300 shadow-sm backdrop-blur-sm">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
              <i className="fas fa-chart-bar mr-4 text-blue-500"></i>
              Session Performance
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              <div className="text-center bg-white/80 p-6 rounded-2xl shadow-sm border border-blue-300">
                <div className="text-3xl font-bold text-slate-800 mb-2">{selectedSession.session.score !== null ? `${selectedSession.session.score}%` : 'N/A'}</div>
                <div className="text-sm text-slate-600">Final Score</div>
              </div>
              <div className="text-center bg-white/80 p-6 rounded-2xl shadow-sm border border-green-300">
                <div className="text-3xl font-bold text-slate-800 mb-2">{selectedSession.session.correctAnswers}</div>
                <div className="text-sm text-slate-600">Correct</div>
              </div>
              <div className="text-center bg-white/80 p-6 rounded-2xl shadow-sm border border-rose-300">
                <div className="text-3xl font-bold text-slate-800 mb-2">{selectedSession.session.wrongAnswers}</div>
                <div className="text-sm text-slate-600">Wrong</div>
              </div>
              <div className="text-center bg-white/80 p-6 rounded-2xl shadow-sm border border-yellow-300">
                <div className="text-3xl font-bold text-slate-800 mb-2">{selectedSession.session.unanswered}</div>
                <div className="text-sm text-slate-600">Unanswered</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className={`px-4 py-2 rounded-xl text-base font-semibold border backdrop-blur-sm ${getTypeBadge(selectedSession.session.cbtType)}`}>
                <i className="fas fa-tag mr-3"></i>
                {selectedSession.session.cbtType.toUpperCase()}
              </span>
              <span className={`px-4 py-2 rounded-xl text-base font-semibold border backdrop-blur-sm ${getModeBadge(selectedSession.session.mode)}`}>
                <i className="fas fa-clock mr-3"></i>
                {selectedSession.session.mode.charAt(0).toUpperCase() + selectedSession.session.mode.slice(1)}
              </span>
              {selectedSession.session.categoryName && (
                <span className="px-4 py-2 rounded-xl text-base font-semibold border backdrop-blur-sm bg-gray-100 text-gray-800 border-gray-300">
                  <i className="fas fa-folder mr-3"></i>
                  {selectedSession.session.categoryName}
                </span>
              )}
              <span className="px-4 py-2 rounded-xl text-base font-semibold border backdrop-blur-sm bg-indigo-100 text-indigo-800 border-indigo-300">
                <i className="fas fa-list-ol mr-3"></i>
                {selectedSession.session.numQuestions} Questions
              </span>
              <span className="px-4 py-2 rounded-xl text-base font-semibold border backdrop-blur-sm bg-slate-100 text-slate-800 border-slate-300">
                <i className="fas fa-calendar mr-3"></i>
                {new Date(selectedSession.session.createdAt).toLocaleDateString()} {new Date(selectedSession.session.createdAt).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Questions Filter and Pagination */}
          <div className="bg-gradient-to-br from-white/80 to-purple-50/80 rounded-2xl p-6 mb-6 border border-purple-300 shadow-sm backdrop-blur-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <h3 className="text-xl font-bold text-slate-800 flex items-center">
                <i className="fas fa-filter mr-4 text-purple-500"></i>
                Questions Filter
              </h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <select
                  value={questionStatusFilter}
                  onChange={(e) => setQuestionStatusFilter(e.target.value as QuestionStatusFilter)}
                  className="p-4 border-2 border-slate-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-200 text-lg bg-white/80 backdrop-blur-sm cursor-pointer"
                >
                  <option value="all">All Questions</option>
                  <option value="correct">Correct Answers</option>
                  <option value="incorrect">Incorrect Answers</option>
                  <option value="unanswered">Unanswered</option>
                </select>
                <div className="flex items-center space-x-4">
                  <span className="text-slate-600 font-semibold text-lg">
                    Page {questionCurrentPage} of {totalQuestionPages}
                  </span>
                  <span className="text-slate-600 font-semibold text-lg">
                    {filteredQuestions.length} questions
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
              <i className="fas fa-question-circle mr-4 text-blue-500"></i>
              Questions & Answers
            </h3>
            
            {filteredQuestions.length === 0 ? (
              <div className="text-center py-12 bg-gradient-to-br from-amber-50/80 to-orange-50/80 rounded-2xl border border-amber-300">
                <i className="fas fa-exclamation-triangle text-4xl text-amber-500 mb-4"></i>
                <p className="text-amber-700 text-lg font-semibold mb-2">No questions match the current filter</p>
                <p className="text-amber-600">Try adjusting your filter settings to see more questions.</p>
              </div>
            ) : (
              paginatedQuestions.map((attempt, index) => (
                <div
                  key={attempt.id}
                  className={`border-2 border-slate-300 rounded-2xl p-8 transition-all duration-300 hover:shadow-xl hover:border-blue-400 backdrop-blur-sm ${
                    index % 2 === 0 ? 'bg-gradient-to-br from-white/80 to-blue-50/80' : 'bg-gradient-to-br from-white/80 to-slate-50/80'
                  }`}
                >
                  <div className="flex flex-col xl:flex-row gap-8">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <span className="text-lg font-bold text-slate-700">Question {questionStartIndex + index + 1}</span>
                        <span className={`px-3 py-1 rounded-xl text-sm font-semibold border backdrop-blur-sm ${getQuestionStatusBadge(attempt)}`}>
                          <i className="fas fa-circle mr-2 text-xs"></i>
                          {getQuestionStatusText(attempt)}
                        </span>
                      </div>
                      
                      <h3 className="font-bold text-xl text-slate-800 mb-4">{attempt.questionContent}</h3>
                      
                      {attempt.figureUrl && (
                        <div className="mb-6 flex justify-center">
                          <img 
                            src={attempt.figureUrl} 
                            alt="Figure" 
                            className="max-w-full rounded-2xl shadow-lg border border-slate-300"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base text-slate-600 mb-6">
                        <div className="flex items-center">
                          <i className="fas fa-check mr-4 text-blue-500 text-lg"></i>
                          <span className="font-semibold">Selected: {attempt.selectedOption !== null ? attempt.options[attempt.selectedOption]?.text : 'None'}</span>
                        </div>
                        <div className="flex items-center">
                          <i className="fas fa-check-double mr-4 text-green-500 text-lg"></i>
                          <span className="font-semibold">Correct: {attempt.options[attempt.correctOption]?.text}</span>
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-slate-50/80 to-blue-50/80 p-6 rounded-2xl border border-blue-300 backdrop-blur-sm">
                        <h4 className="font-bold text-lg mb-4 flex items-center text-slate-800">
                          <i className="fas fa-info-circle mr-3 text-blue-500"></i>
                          Explanation
                        </h4>
                        <p className="text-slate-700 text-base leading-relaxed">{attempt.explanation}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Question Pagination */}
          {totalQuestionPages > 1 && (
            <div className="flex justify-center items-center mt-12 space-x-4">
              <button
                onClick={() => setQuestionCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={questionCurrentPage === 1}
                className="px-6 py-4 border-2 border-slate-300 rounded-xl hover:border-slate-500 hover:bg-slate-50/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-slate-700 bg-white/80 backdrop-blur-sm transition-all duration-300 font-semibold shadow-lg hover:shadow-xl cursor-pointer"
              >
                <i className="fas fa-chevron-left mr-3"></i>
                <span className="hidden sm:inline">Previous</span>
              </button>
              <div className="flex space-x-2">
                {Array.from({ length: Math.min(5, totalQuestionPages) }, (_, i) => {
                  let pageNum;
                  if (totalQuestionPages <= 5) {
                    pageNum = i + 1;
                  } else if (questionCurrentPage <= 3) {
                    pageNum = i + 1;
                  } else if (questionCurrentPage >= totalQuestionPages - 2) {
                    pageNum = totalQuestionPages - 4 + i;
                  } else {
                    pageNum = questionCurrentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setQuestionCurrentPage(pageNum)}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-semibold transition-all duration-300 cursor-pointer ${
                        questionCurrentPage === pageNum
                          ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg transform scale-105'
                          : 'border-2 border-slate-300 hover:border-purple-500 hover:bg-purple-50/80 bg-white/80 text-slate-700 shadow-lg hover:shadow-xl'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setQuestionCurrentPage(prev => Math.min(totalQuestionPages, prev + 1))}
                disabled={questionCurrentPage === totalQuestionPages}
                className="px-6 py-4 border-2 border-slate-300 rounded-xl hover:border-slate-500 hover:bg-slate-50/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-slate-700 bg-white/80 backdrop-blur-sm transition-all duration-300 font-semibold shadow-lg hover:shadow-xl cursor-pointer"
              >
                <span className="hidden sm:inline">Next</span>
                <i className="fas fa-chevron-right ml-3"></i>
              </button>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      {/* Loading Popup */}
      {showLoadingPopup && (
        <div className="fixed inset-0 bg-white/40 dark:bg-black/30 backdrop-blur-lg flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-white/95 to-blue-50/95 rounded-2xl p-8 flex flex-col items-center min-w-[300px] md:min-w-[400px] max-w-md mx-4 border border-blue-300 shadow-xl backdrop-blur-sm">
            <div className="relative mb-6">
              <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-blue-500"></div>
              <div className="absolute inset-0 rounded-full h-14 w-14 border-t-2 border-blue-300 animate-pulse"></div>
            </div>
            <p className="text-slate-800 font-bold mb-3 text-center text-lg">{loadingMessage}</p>
            {currentMedicalQuote && (
              <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-l-4 border-blue-500 p-6 rounded-xl mb-6 w-full text-center backdrop-blur-sm">
                <div className="flex flex-col items-center">
                  <p className="text-base text-slate-700 italic">{currentMedicalQuote.text}</p>
                  <p className="text-sm text-slate-600 mt-2">{currentMedicalQuote.author}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-white/95 to-blue-50/95 rounded-2xl shadow-lg p-8 border border-blue-300 backdrop-blur-sm">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
          <div className="flex-1">
            <h2 className="text-3xl font-bold flex items-center text-slate-800">
              <i className="fas fa-history mr-4 text-rose-500"></i>
              CBT Sessions History
            </h2>
            <p className="text-slate-600 mt-3 text-lg">Review your CBT sessions and performance</p>
          </div>
          <button
            onClick={() => switchSection('selection')}
            className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center font-bold shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
          >
            <i className="fas fa-arrow-left mr-4"></i>
            Back to Dashboard
          </button>
        </div>

        {/* Mobile Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="lg:hidden w-full px-6 py-4 bg-gradient-to-r from-slate-100/80 to-blue-100/80 text-slate-700 rounded-2xl hover:bg-slate-200/80 transition-all duration-300 flex items-center justify-center font-semibold mb-6 border border-slate-300 backdrop-blur-sm cursor-pointer"
        >
          <i className={`fas ${showFilters ? 'fa-chevron-up' : 'fa-chevron-down'} mr-4`}></i>
          {showFilters ? 'Hide' : 'Show'} Search & Filters
        </button>

        {/* Filters */}
        <div className={`${showFilters ? 'block' : 'hidden'} lg:block bg-gradient-to-br from-white/80 to-blue-50/80 rounded-2xl p-8 mb-8 border border-blue-300 shadow-sm backdrop-blur-sm`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <i className="fas fa-search text-slate-400 text-lg"></i>
              </div>
              <input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 w-full p-4 border-2 border-slate-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 text-lg bg-white/80 backdrop-blur-sm"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as CbtTypeFilter)}
              className="p-4 border-2 border-slate-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 text-lg bg-white/80 backdrop-blur-sm cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="mdcn">MDCN</option>
              <option value="mbbs">MBBS</option>
            </select>
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value as ModeFilter)}
              className="p-4 border-2 border-slate-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 text-lg bg-white/80 backdrop-blur-sm cursor-pointer"
            >
              <option value="all">All Modes</option>
              <option value="practice">Practice</option>
              <option value="timed">Timed</option>
              <option value="exam">Exam</option>
            </select>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              className="p-4 border-2 border-slate-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 text-lg bg-white/80 backdrop-blur-sm cursor-pointer"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
              <option value="year">Past Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {dateFilter === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 p-6 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 rounded-2xl border border-blue-300 backdrop-blur-sm">
              <div>
                <label className="block text-base font-semibold text-slate-700 mb-3">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full p-4 border-2 border-slate-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 text-lg bg-white/80 backdrop-blur-sm cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-base font-semibold text-slate-700 mb-3">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full p-4 border-2 border-slate-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 text-lg bg-white/80 backdrop-blur-sm cursor-pointer"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setCustomStartDate('');
                    setCustomEndDate('');
                  }}
                  className="w-full px-6 py-4 bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-xl hover:from-slate-600 hover:to-slate-700 transition-all duration-300 flex items-center justify-center font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
                >
                  <i className="fas fa-times mr-3"></i>
                  Clear Dates
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between text-base text-slate-600">
            <span className="font-semibold">
              Showing {paginatedSessions.length} of {filteredSessions.length} sessions
              {searchQuery && ` for "${searchQuery}"`}
            </span>
            {filteredSessions.length > 0 && (
              <span className="font-semibold">Page {currentPage} of {totalPages}</span>
            )}
          </div>
        </div>

        {/* Sessions List */}
        {isLoading ? (
          <div className="text-center py-16 bg-gradient-to-br from-slate-50/80 to-blue-50/80 rounded-2xl border-2 border-dashed border-slate-400 backdrop-blur-sm">
            <i className="fas fa-spinner animate-spin text-5xl text-blue-500 mb-6"></i>
            <p className="text-slate-500 text-xl mb-4 font-semibold">Loading CBT sessions...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-16 bg-gradient-to-br from-slate-50/80 to-blue-50/80 rounded-2xl border-2 border-dashed border-slate-400 backdrop-blur-sm">
            <i className="fas fa-inbox text-5xl text-slate-400 mb-6"></i>
            <p className="text-slate-500 text-xl mb-4 font-semibold">No CBT sessions found</p>
            <p className="text-slate-400 text-lg">
              {searchQuery || typeFilter !== 'all' || modeFilter !== 'all' || dateFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Start a new CBT session to see your history here'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {paginatedSessions.map((session, index) => (
              <div
                key={session.id}
                className={`border-2 border-slate-300 rounded-2xl p-8 transition-all duration-300 hover:shadow-xl hover:border-blue-400 backdrop-blur-sm ${
                  index % 2 === 0 ? 'bg-gradient-to-br from-white/80 to-blue-50/80' : 'bg-gradient-to-br from-white/80 to-slate-50/80'
                }`}
              >
                <div className="flex flex-col lg:flex-row gap-8">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <h3 className="text-xl font-bold text-slate-800">
                        {session.cbtType.toUpperCase()} - {session.mode.charAt(0).toUpperCase() + session.mode.slice(1)} Mode
                      </h3>
                      {session.score !== null && (
                        <span className={`px-4 py-2 rounded-xl text-base font-semibold border backdrop-blur-sm ${getScoreBadge(session.score)}`}>
                          <i className="fas fa-chart-line mr-3"></i>
                          Score: {session.score}%
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-3 mb-6">
                      <span className={`px-4 py-2 rounded-xl text-base font-semibold border backdrop-blur-sm ${getTypeBadge(session.cbtType)}`}>
                        <i className="fas fa-tag mr-3"></i>
                        {session.cbtType.toUpperCase()}
                      </span>
                      <span className={`px-4 py-2 rounded-xl text-base font-semibold border backdrop-blur-sm ${getModeBadge(session.mode)}`}>
                        <i className="fas fa-clock mr-3"></i>
                        {session.mode.charAt(0).toUpperCase() + session.mode.slice(1)}
                      </span>
                      {session.categoryName && (
                        <span className="px-4 py-2 rounded-xl text-base font-semibold border backdrop-blur-sm bg-gray-100 text-gray-800 border-gray-300">
                          <i className="fas fa-folder mr-3"></i>
                          {session.categoryName}
                        </span>
                      )}
                    </div>

                    {/* Enhanced Session Details - Well Structured */}
                    <div className="bg-gradient-to-br from-slate-50/80 to-blue-50/80 rounded-2xl p-6 mb-6 border border-slate-300 backdrop-blur-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-base text-slate-600">
                        <div className="flex items-center justify-between sm:block">
                          <div className="flex items-center mb-2 sm:mb-0">
                            <i className="fas fa-list-ol mr-3 text-blue-500 text-lg"></i>
                            <span className="font-semibold">{session.numQuestions} Questions</span>
                          </div>
                          {session.duration && (
                            <div className="flex items-center sm:mt-2">
                              <i className="fas fa-clock mr-3 text-purple-500 text-lg"></i>
                              <span className="font-semibold">{session.duration} mins</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between sm:block">
                          <div className="flex items-center mb-2 sm:mb-0">
                            <i className="fas fa-calendar mr-3 text-green-500 text-lg"></i>
                            <span className="font-semibold">
                              {new Date(session.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center sm:mt-2">
                            <i className="fas fa-clock mr-3 text-amber-500 text-lg"></i>
                            <span className="font-semibold">
                              {new Date(session.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:block">
                          <div className="flex items-center mb-2 sm:mb-0">
                            <i className="fas fa-check-circle mr-3 text-emerald-500 text-lg"></i>
                            <span className="font-semibold">{session.correctAnswers} Correct</span>
                          </div>
                          <div className="flex items-center sm:mt-2">
                            <i className="fas fa-times-circle mr-3 text-rose-500 text-lg"></i>
                            <span className="font-semibold">{session.wrongAnswers} Wrong</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:block">
                          <div className="flex items-center mb-2 sm:mb-0">
                            <i className="fas fa-minus-circle mr-3 text-yellow-500 text-lg"></i>
                            <span className="font-semibold">{session.unanswered} Unanswered</span>
                          </div>
                          <div className="flex items-center sm:mt-2">
                            <i className="fas fa-percentage mr-3 text-indigo-500 text-lg"></i>
                            <span className="font-semibold">
                              {session.numQuestions > 0 
                                ? Math.round((session.correctAnswers / session.numQuestions) * 100) 
                                : 0}% Accuracy
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2 bg-white/80 px-4 py-2 rounded-xl border border-slate-300">
                          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                          <span className="text-sm text-slate-600 font-semibold">{session.correctAnswers} Correct</span>
                        </div>
                        <div className="flex items-center space-x-2 bg-white/80 px-4 py-2 rounded-xl border border-slate-300">
                          <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                          <span className="text-sm text-slate-600 font-semibold">{session.wrongAnswers} Wrong</span>
                        </div>
                        <div className="flex items-center space-x-2 bg-white/80 px-4 py-2 rounded-xl border border-slate-300">
                          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                          <span className="text-sm text-slate-600 font-semibold">{session.unanswered} Unanswered</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => fetchSessionDetails(session.id)}
                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
                      >
                        <i className="fas fa-eye mr-3"></i>
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center mt-12 space-x-4">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-6 py-4 border-2 border-slate-300 rounded-xl hover:border-slate-500 hover:bg-slate-50/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-slate-700 bg-white/80 backdrop-blur-sm transition-all duration-300 font-semibold shadow-lg hover:shadow-xl cursor-pointer"
            >
              <i className="fas fa-chevron-left mr-3"></i>
              <span className="hidden sm:inline">Previous</span>
            </button>
            <div className="flex space-x-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
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
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-semibold transition-all duration-300 cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg transform scale-105'
                        : 'border-2 border-slate-300 hover:border-blue-500 hover:bg-blue-50/80 bg-white/80 text-slate-700 shadow-lg hover:shadow-xl'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-6 py-4 border-2 border-slate-300 rounded-xl hover:border-slate-500 hover:bg-slate-50/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-slate-700 bg-white/80 backdrop-blur-sm transition-all duration-300 font-semibold shadow-lg hover:shadow-xl cursor-pointer"
            >
              <span className="hidden sm:inline">Next</span>
              <i className="fas fa-chevron-right ml-3"></i>
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CbtHistory;