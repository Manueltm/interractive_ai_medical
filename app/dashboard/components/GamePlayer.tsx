// app/dashboard/components/GamePlayer.tsx
'use client';
import { FC, useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { cn } from "@/utils";

interface GamePlayerProps {
  game: any;
  onExit: () => void;
  onComplete: () => Promise<void>;
}

interface AnswerCheckResult {
  isCorrect: boolean;
  feedback: string;
  matchedItems: string[];
  missedItems: string[];
  hasSpellingIssues: boolean;
  suggestions?: string[];
}

const GamePlayer: FC<GamePlayerProps> = ({ game, onExit, onComplete }) => {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [selectedTrueFalse, setSelectedTrueFalse] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [totalTime, setTotalTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Safety check - if game or questions are not loaded yet
  if (!game || !game.questions || game.questions.length === 0) {
    return (
      <div className={cn("rounded-2xl shadow-lg p-8 border backdrop-blur-sm",
        isDark ? "bg-gray-800/95 border-orange-800" : "bg-gradient-to-br from-white/95 to-orange-50/95 border-orange-300"
      )}>
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-orange-500 mb-4"></i>
          <p className={isDark ? "text-gray-400" : "text-slate-600"}>Loading game...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = game.questions[currentIndex];

  const isTrueFalseQuestion = () => {
    if (!currentQuestion?.answer) return false;
    const answer = currentQuestion.answer.replace(/<[^>]*>/g, '').trim();
    return answer.match(/TRUE|FALSE/i) !== null;
  };

  if (!currentQuestion) {
    return (
      <div className={cn("rounded-2xl shadow-lg p-8 border backdrop-blur-sm",
        isDark ? "bg-gray-800/95 border-orange-800" : "bg-gradient-to-br from-white/95 to-orange-50/95 border-orange-300"
      )}>
        <div className="text-center">
          <i className="fas fa-exclamation-triangle text-4xl text-orange-500 mb-4"></i>
          <p className={isDark ? "text-gray-400" : "text-slate-600"}>Question not found</p>
          <button
            onClick={onExit}
            className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Back to Games
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    setSelectedTrueFalse(null);
  }, [currentIndex]);

  useEffect(() => {
    const startSession = async () => {
      if (!session?.user?.id) return;

      try {
        const res = await fetch('/api/games/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: game.id,
            totalQuestions: game.questions.length
          })
        });
        const data = await res.json();
        setSessionId(data.id);
        startTimeRef.current = Date.now();
      } catch (error) {
        console.error('Error starting game session:', error);
        toast.error('Failed to start game session');
      }
    };

    startSession();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [game.id, game.questions?.length, session?.user?.id]);

  useEffect(() => {
    if (currentQuestion?.timeLimit && !showResult && !isCompleted) {
      setTimeLeft(currentQuestion.timeLimit);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev && prev <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            handleTimeUp();
            return 0;
          }
          return prev ? prev - 1 : null;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentIndex, currentQuestion?.timeLimit, showResult, isCompleted]);

  const handleTimeUp = () => {
    if (!showResult) {
      toast.info('Time\'s up!');
      handleSubmitAnswer(true);
    }
  };

  // Answer checking functions (same as before, but with dark mode in feedback rendering)
  const detectAnswerType = (answer: string): string => {
    if (!answer) return 'single';
    
    const lines = answer.split('\n').filter(l => l.trim().length > 0);
    
    if (answer.match(/TRUE|FALSE/i) && lines.length <= 2) {
      return 'truefalse';
    }
    
    if (answer.includes('•') || answer.includes('-') || answer.match(/^\d+\./m)) {
      return 'list';
    }
    
    if (lines.length === 1 && lines[0].length < 100) {
      return 'single';
    }
    
    if (answer.match(/\b(is a|refers to|defined as|means)\b/i)) {
      return 'definition';
    }
    
    return 'mixed';
  };

  const extractListItems = (text: string): string[] => {
    if (!text) return [];
    
    const cleanText = text.replace(/<[^>]*>/g, '');
    const lines = cleanText.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);
    
    const items: string[] = [];
    
    for (const line of lines) {
      const cleanLine = line
        .replace(/^[•\-*\d+\.\s]+/, '')
        .replace(/<[^>]*>/g, '')
        .trim();
      
      if (cleanLine.length > 0) {
        items.push(cleanLine);
      }
    }
    
    return items;
  };

  const extractKeyTerms = (text: string): string[] => {
    if (!text) return [];
    
    const cleanText = text.replace(/<[^>]*>/g, '');
    const terms = cleanText.match(/\b[A-Z][a-z]+\b|\b[a-z]{4,}\b/g) || [];
    const stopWords = ['the', 'this', 'that', 'with', 'from', 'have', 'been', 'were', 'will', 'answer'];
    
    return terms.filter(term => 
      term.length > 3 && 
      !stopWords.includes(term.toLowerCase()) &&
      !term.match(/^\d+$/)
    );
  };

  const levenshteinDistance = (a: string, b: string): number => {
    if (!a || !b) return Math.max(a?.length || 0, b?.length || 0);
    
    const matrix = [];
    
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[b.length][a.length];
  };

  const calculateSimilarity = (str1: string, str2: string): number => {
    if (!str1 || !str2) return 0;
    
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1.0;
    if (s1.includes(s2) || s2.includes(s1)) return 0.9;
    
    const distance = levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);
    
    if (maxLength === 0) return 1.0;
    return 1 - (distance / maxLength);
  };

  const findCloseMatch = (word: string, candidates: string[]): string | null => {
    if (!word || !candidates || candidates.length === 0) return null;
    
    let bestMatch: string | null = null;
    let bestScore = 0;
    
    for (const candidate of candidates) {
      const score = calculateSimilarity(word, candidate);
      if (score > 0.6 && score > bestScore) {
        bestScore = score;
        bestMatch = candidate;
      }
    }
    
    return bestMatch;
  };

  const findCloseMatchInText = (text: string, target: string): string | null => {
    if (!text || !target) return null;
    const words = text.split(/\s+/);
    return findCloseMatch(target, words);
  };

  const checkTrueFalseAnswer = (userAns: string, correctAns: string): AnswerCheckResult => {
    const correctMatch = correctAns.match(/\b(TRUE|FALSE)\b/i);
    const correctValue = correctMatch ? correctMatch[0].toUpperCase() : null;
    const userValue = userAns.toUpperCase();
    const isCorrect = userValue === correctValue;
    const explanation = correctAns.replace(/\b(TRUE|FALSE)\b/i, '').trim();
    
    return {
      isCorrect,
      feedback: isCorrect 
        ? `✓ Correct! ${userValue} is right. ${explanation ? 'Note: ' + explanation : ''}`
        : `✗ Incorrect. The correct answer is ${correctValue}. ${explanation}`,
      matchedItems: userValue ? [userValue] : [],
      missedItems: !isCorrect && correctValue ? [correctValue] : [],
      hasSpellingIssues: false
    };
  };

  const checkListAnswer = (userAns: string, correctAns: string): AnswerCheckResult => {
    const correctItems = extractListItems(correctAns);
    const userItems = extractListItems(userAns);
    
    if (correctItems.length === 0) {
      return {
        isCorrect: false,
        feedback: 'Error: No correct answer items found',
        matchedItems: [],
        missedItems: [],
        hasSpellingIssues: false
      };
    }
    
    const matchedItems: string[] = [];
    const missedItems: string[] = [];
    const suggestions: string[] = [];
    let hasSpellingIssues = false;
    
    for (const correctItem of correctItems) {
      let bestMatch: { item: string; similarity: number } | null = null;
      
      for (const userItem of userItems) {
        const similarity = calculateSimilarity(correctItem, userItem);
        if (similarity > 0.8) {
          bestMatch = { item: userItem, similarity };
          break;
        } else if (similarity > 0.6 && (!bestMatch || similarity > bestMatch.similarity)) {
          bestMatch = { item: userItem, similarity };
        }
      }
      
      if (bestMatch) {
        matchedItems.push(correctItem);
        if (bestMatch.similarity < 0.9) {
          hasSpellingIssues = true;
          suggestions.push(`"${bestMatch.item}" → "${correctItem}"`);
        }
      } else {
        missedItems.push(correctItem);
      }
    }
    
    const extraItems = userItems.filter(userItem => {
      return !matchedItems.some(matched => 
        calculateSimilarity(userItem, matched) > 0.8
      );
    });
    
    const matchPercentage = (matchedItems.length / correctItems.length) * 100;
    const isCorrect = matchPercentage >= 70;
    
    let feedback = '';
    if (isCorrect) {
      feedback = `✓ Correct! You identified ${matchedItems.length} out of ${correctItems.length} items.`;
      if (hasSpellingIssues) feedback += ' Check your spelling: ' + suggestions.join(', ');
      if (extraItems.length > 0) feedback += ` Note: You mentioned ${extraItems.length} additional item(s) not in the answer.`;
    } else {
      feedback = `✗ You got ${matchedItems.length} out of ${correctItems.length} items correct.\n`;
      feedback += `Missing: ${missedItems.join(', ')}`;
      if (suggestions.length > 0) feedback += `\nSpelling suggestions: ${suggestions.join(', ')}`;
    }
    
    return {
      isCorrect,
      feedback,
      matchedItems,
      missedItems,
      hasSpellingIssues
    };
  };

  const checkSingleAnswer = (userAns: string, correctAns: string): AnswerCheckResult => {
    const similarity = calculateSimilarity(userAns, correctAns);
    const isCorrect = similarity >= 0.7;
    
    let feedback = '';
    if (isCorrect) {
      feedback = '✓ Correct!';
      if (similarity < 0.9) feedback += ' Your answer is close but check the spelling.';
    } else {
      feedback = `✗ Incorrect. The correct answer is "${correctAns}".`;
      const suggestion = findCloseMatch(userAns, [correctAns]);
      if (suggestion) feedback += ` Did you mean "${suggestion}"?`;
    }
    
    return {
      isCorrect,
      feedback,
      matchedItems: isCorrect ? [userAns] : [],
      missedItems: isCorrect ? [] : [correctAns],
      hasSpellingIssues: similarity < 0.9 && similarity >= 0.7
    };
  };

  const checkDefinitionAnswer = (userAns: string, correctAns: string): AnswerCheckResult => {
    const keyTerms = extractKeyTerms(correctAns);
    
    if (keyTerms.length === 0) {
      return checkSingleAnswer(userAns, correctAns);
    }
    
    const matchedTerms: string[] = [];
    const missedTerms: string[] = [];
    const suggestions: string[] = [];
    let hasSpellingIssues = false;
    
    for (const term of keyTerms) {
      if (userAns.toLowerCase().includes(term.toLowerCase())) {
        matchedTerms.push(term);
      } else {
        const found = findCloseMatchInText(userAns, term);
        if (found) {
          matchedTerms.push(term);
          hasSpellingIssues = true;
          suggestions.push(`"${found}" → "${term}"`);
        } else {
          missedTerms.push(term);
        }
      }
    }
    
    const matchPercentage = (matchedTerms.length / keyTerms.length) * 100;
    const isCorrect = matchPercentage >= 60;
    
    let feedback = '';
    if (isCorrect) {
      feedback = `✓ Correct! You covered ${matchedTerms.length} out of ${keyTerms.length} key concepts.`;
      if (hasSpellingIssues) feedback += ' Check your spelling: ' + suggestions.join(', ');
    } else {
      feedback = `✗ Your answer is missing key concepts: ${missedTerms.join(', ')}`;
      if (suggestions.length > 0) feedback += `\nSpelling suggestions: ${suggestions.join(', ')}`;
    }
    
    return {
      isCorrect,
      feedback,
      matchedItems: matchedTerms,
      missedItems: missedTerms,
      hasSpellingIssues
    };
  };

  const checkMixedAnswer = (userAns: string, correctAns: string): AnswerCheckResult => {
    const correctLines = correctAns.split('\n').filter(l => l.trim().length > 0);
    const userLines = userAns.split('\n').filter(l => l.trim().length > 0);
    
    if (correctLines.length === 0) {
      return checkSingleAnswer(userAns, correctAns);
    }
    
    const matchedLines: string[] = [];
    const missedLines: string[] = [];
    const suggestions: string[] = [];
    let hasSpellingIssues = false;
    
    for (const correctLine of correctLines) {
      let bestMatch: { line: string; similarity: number } | null = null;
      
      for (const userLine of userLines) {
        const similarity = calculateSimilarity(correctLine, userLine);
        if (similarity > 0.7) {
          bestMatch = { line: userLine, similarity };
          break;
        }
      }
      
      if (bestMatch) {
        matchedLines.push(correctLine);
        if (bestMatch.similarity < 0.9) {
          hasSpellingIssues = true;
        }
      } else {
        missedLines.push(correctLine);
      }
    }
    
    const matchPercentage = (matchedLines.length / correctLines.length) * 100;
    const isCorrect = matchPercentage >= 70;
    
    let feedback = '';
    if (isCorrect) {
      feedback = `✓ Correct! You covered ${matchedLines.length} out of ${correctLines.length} points.`;
      if (hasSpellingIssues) feedback += ' Some answers have spelling issues.';
    } else {
      feedback = `✗ You covered ${matchedLines.length} out of ${correctLines.length} points.\n`;
      feedback += `Missing points:\n${missedLines.map(l => `• ${l}`).join('\n')}`;
    }
    
    return {
      isCorrect,
      feedback,
      matchedItems: matchedLines,
      missedItems: missedLines,
      hasSpellingIssues
    };
  };

  const checkAnswerWithFeedback = (userAns: string, correctAns: string): AnswerCheckResult => {
    const cleanCorrectAns = correctAns
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
    
    const cleanUserAns = userAns.trim();
    const answerType = detectAnswerType(cleanCorrectAns);
    
    switch (answerType) {
      case 'truefalse':
        return checkTrueFalseAnswer(cleanUserAns, cleanCorrectAns);
      case 'list':
        return checkListAnswer(cleanUserAns, cleanCorrectAns);
      case 'single':
        return checkSingleAnswer(cleanUserAns, cleanCorrectAns);
      case 'definition':
        return checkDefinitionAnswer(cleanUserAns, cleanCorrectAns);
      default:
        return checkMixedAnswer(cleanUserAns, cleanCorrectAns);
    }
  };

  const handleSubmitAnswer = async (autoSubmit = false) => {
    if (isTrueFalseQuestion()) {
      if (!autoSubmit && !selectedTrueFalse) {
        toast.error('Please select True or False');
        return;
      }
    } else {
      if (!autoSubmit && !userAnswer.trim()) {
        toast.error('Please provide an answer');
        return;
      }
    }

    let result: AnswerCheckResult;
    
    if (autoSubmit) {
      result = {
        isCorrect: false,
        feedback: '⏰ Time expired!',
        matchedItems: [],
        missedItems: [],
        hasSpellingIssues: false
      };
    } else {
      const answerToCheck = isTrueFalseQuestion() ? (selectedTrueFalse || '') : userAnswer;
      result = checkAnswerWithFeedback(answerToCheck, currentQuestion.answer);
    }

    setIsCorrect(result.isCorrect);
    setShowResult(true);

    if (result.hasSpellingIssues) {
      toast.info('Check your spelling for better accuracy!', { duration: 3000 });
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const timeSpent = currentQuestion.timeLimit 
      ? currentQuestion.timeLimit - (timeLeft || 0)
      : Math.floor((Date.now() - startTimeRef.current) / 1000);

    if (sessionId) {
      try {
        await fetch('/api/games/sessions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            action: 'submitAnswer',
            data: {
              questionId: currentQuestion.id,
              userAnswer: autoSubmit ? '(Time Expired)' : (isTrueFalseQuestion() ? (selectedTrueFalse || '') : userAnswer),
              isCorrect: result.isCorrect,
              timeSpent,
              metadata: {
                matchedItems: result.matchedItems,
                missedItems: result.missedItems,
                hasSpellingIssues: result.hasSpellingIssues
              }
            }
          })
        });
      } catch (error) {
        console.error('Error saving answer:', error);
      }
    }

    setAnswers(prev => [...prev, { 
      correct: result.isCorrect, 
      answer: autoSubmit ? 'Time Expired' : (isTrueFalseQuestion() ? (selectedTrueFalse || '') : userAnswer),
      feedback: result.feedback,
      hasSpellingIssues: result.hasSpellingIssues
    }]);
    
    setTotalTime(prev => prev + timeSpent);
  };

  const handleNext = () => {
    if (currentIndex < game.questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setUserAnswer('');
      setSelectedTrueFalse(null);
      setShowResult(false);
      setTimeLeft(null);
      startTimeRef.current = Date.now();
    } else {
      completeGame();
    }
  };

  const completeGame = async () => {
    if (sessionId) {
      try {
        await fetch('/api/games/sessions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            action: 'complete',
            data: { timeTaken: totalTime }
          })
        });
      } catch (error) {
        console.error('Error completing game:', error);
      }
    }
    
    setIsCompleted(true);
    await onComplete();
  };

  const handleRestart = async () => {
    if (!sessionId) return;
    
    setIsRestarting(true);
    try {
      await fetch('/api/games/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          action: 'restart'
        })
      });
      
      setCurrentIndex(0);
      setUserAnswer('');
      setSelectedTrueFalse(null);
      setShowResult(false);
      setIsCorrect(false);
      setAnswers([]);
      setIsCompleted(false);
      setTimeLeft(null);
      setTotalTime(0);
      startTimeRef.current = Date.now();
      
      toast.success('Game restarted!');
    } catch (error) {
      console.error('Error restarting game:', error);
      toast.error('Failed to restart game');
    } finally {
      setIsRestarting(false);
    }
  };

  const handleExit = () => {
    setShowExitConfirm(true);
  };

  const confirmExit = () => {
    setShowExitConfirm(false);
    onExit();
  };

  const renderHtml = (html: string) => {
    if (!html) return null;
    return <div className={cn("prose max-w-none", isDark ? "prose-invert" : "")} dangerouslySetInnerHTML={{ __html: html }} />;
  };

  if (isCompleted) {
    const correctCount = answers.filter(a => a.correct).length;
    const score = game.questions.length > 0 
      ? Math.round((correctCount / game.questions.length) * 100) 
      : 0;

    return (
      <div className={cn("rounded-2xl shadow-lg p-4 md:p-8 border backdrop-blur-sm",
        isDark ? "bg-gray-800/95 border-green-800" : "bg-gradient-to-br from-white/95 to-green-50/95 border-green-300"
      )}>
        <h2 className={cn("text-2xl md:text-3xl font-bold mb-6", isDark ? "text-gray-100" : "text-slate-800")}>Game Completed!</h2>
        
        <div className={cn("rounded-xl p-6 md:p-8 mb-6", isDark ? "bg-gray-700/50" : "bg-white")}>
          <div className="text-center mb-8">
            <div className="text-5xl md:text-6xl font-bold text-green-600 mb-4">{score}%</div>
            <p className={cn("text-lg", isDark ? "text-gray-300" : "text-slate-600")}>
              You got {correctCount} out of {game.questions.length} questions correct
            </p>
            <p className={cn("text-sm mt-2", isDark ? "text-gray-400" : "text-slate-500")}>
              Total time: {Math.floor(totalTime / 60)}m {totalTime % 60}s
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between text-sm md:text-base">
              <span className={isDark ? "text-gray-400" : "text-slate-600"}>Correct Answers:</span>
              <span className="font-bold text-green-600">{correctCount}</span>
            </div>
            <div className="flex justify-between text-sm md:text-base">
              <span className={isDark ? "text-gray-400" : "text-slate-600"}>Wrong Answers:</span>
              <span className="font-bold text-red-600">{answers.length - correctCount}</span>
            </div>
            <div className={cn("h-2 rounded-full overflow-hidden", isDark ? "bg-gray-700" : "bg-slate-200")}>
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-green-600"
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <button
            onClick={handleRestart}
            disabled={isRestarting}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 font-semibold disabled:opacity-50"
          >
            {isRestarting ? (
              <><i className="fas fa-spinner fa-spin mr-2"></i> Restarting...</>
            ) : (
              <><i className="fas fa-redo-alt mr-2"></i> Play Again</>
            )}
          </button>
          <button
            onClick={onExit}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-xl hover:from-slate-600 hover:to-slate-700 font-semibold"
          >
            <i className="fas fa-arrow-left mr-2"></i> Back to Games
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl shadow-lg p-4 md:p-8 border backdrop-blur-sm",
      isDark ? "bg-gray-800/95 border-orange-800" : "bg-gradient-to-br from-white/95 to-orange-50/95 border-orange-300"
    )}>
      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={cn("rounded-2xl p-6 max-w-sm w-full mx-4",
            isDark ? "bg-gray-800" : "bg-white"
          )}>
            <h3 className={cn("text-xl font-bold mb-4", isDark ? "text-gray-100" : "text-slate-800")}>Exit Game?</h3>
            <p className={cn("mb-6", isDark ? "text-gray-400" : "text-slate-600")}>Your progress will be lost. Are you sure?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className={cn("flex-1 px-4 py-2 border-2 rounded-xl transition-all",
                  isDark ? "border-gray-700 text-gray-300 hover:border-gray-500" : "border-slate-300 text-slate-700 hover:border-slate-500"
                )}
              >
                Cancel
              </button>
              <button
                onClick={confirmExit}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className={cn("text-xl md:text-2xl font-bold", isDark ? "text-gray-100" : "text-slate-800")}>{game.title}</h2>
          <p className={cn("text-sm capitalize", isDark ? "text-gray-400" : "text-slate-500")}>{game.type} Game</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className={cn("px-3 md:px-4 py-2 rounded-lg shadow text-sm md:text-base",
            isDark ? "bg-gray-700" : "bg-white"
          )}>
            <span className={isDark ? "text-gray-400" : "text-slate-600"}>Question:</span>
            <span className={cn("font-bold ml-2", isDark ? "text-gray-100" : "text-slate-800")}>{currentIndex + 1}/{game.questions.length}</span>
          </div>
          {timeLeft !== null && (
            <div className={cn("px-3 md:px-4 py-2 rounded-lg shadow text-sm md:text-base",
              timeLeft < 10 ? "text-red-600 font-bold animate-pulse" : "",
              isDark ? "bg-gray-700" : "bg-white"
            )}>
              <i className="fas fa-clock mr-2"></i>
              {timeLeft}s
            </div>
          )}
          <div className="flex gap-1">
            <button
              onClick={handleRestart}
              disabled={isRestarting}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              title="Restart Game"
            >
              <i className="fas fa-redo-alt"></i>
            </button>
            <button
              onClick={handleExit}
              className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              title="Exit Game"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Question */}
      <div className={cn("rounded-xl p-4 md:p-8 mb-6", isDark ? "bg-gray-700/50" : "bg-white")}>
        {currentQuestion.figureUrl && (
          <div className="mb-6 flex justify-center">
            <img 
              src={currentQuestion.figureUrl} 
              alt="Question" 
              className={cn("max-w-full max-h-48 md:max-h-96 rounded-lg border shadow-sm",
                isDark ? "border-orange-800" : "border-orange-200"
              )}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}

        <div className="mb-6">
          <h3 className={cn("text-base md:text-lg font-semibold mb-4", isDark ? "text-gray-300" : "text-slate-700")}>Question:</h3>
          <p className={isDark ? "text-gray-200" : "text-slate-800"}>{currentQuestion.question}</p>
        </div>

        {!showResult ? (
          <div>
            {isTrueFalseQuestion() ? (
              <div className="space-y-4">
                <label className={cn("block text-sm font-semibold mb-2", isDark ? "text-gray-300" : "text-slate-700")}>
                  Select your answer:
                </label>
                <div className="flex flex-col md:flex-row gap-4 md:gap-8">
                  <label className={cn("flex items-center space-x-3 p-4 border-2 rounded-xl cursor-pointer transition-all",
                    isDark ? "border-gray-700 hover:border-orange-700 hover:bg-orange-950/30" : "border-slate-200 hover:border-orange-300 hover:bg-orange-50"
                  )}>
                    <input
                      type="radio"
                      name="trueFalse"
                      value="TRUE"
                      checked={selectedTrueFalse === 'TRUE'}
                      onChange={(e) => setSelectedTrueFalse(e.target.value)}
                      className="w-5 h-5 text-orange-500 focus:ring-orange-500"
                    />
                    <span className={cn("text-lg font-medium", isDark ? "text-gray-200" : "text-slate-700")}>TRUE</span>
                  </label>
                  <label className={cn("flex items-center space-x-3 p-4 border-2 rounded-xl cursor-pointer transition-all",
                    isDark ? "border-gray-700 hover:border-orange-700 hover:bg-orange-950/30" : "border-slate-200 hover:border-orange-300 hover:bg-orange-50"
                  )}>
                    <input
                      type="radio"
                      name="trueFalse"
                      value="FALSE"
                      checked={selectedTrueFalse === 'FALSE'}
                      onChange={(e) => setSelectedTrueFalse(e.target.value)}
                      className="w-5 h-5 text-orange-500 focus:ring-orange-500"
                    />
                    <span className={cn("text-lg font-medium", isDark ? "text-gray-200" : "text-slate-700")}>FALSE</span>
                  </label>
                </div>
              </div>
            ) : (
              <div>
                <label className={cn("block text-sm font-semibold mb-2", isDark ? "text-gray-300" : "text-slate-700")}>
                  Your Answer:
                </label>
                <textarea
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  className={cn("w-full p-3 md:p-4 border-2 rounded-xl focus:border-orange-500 h-32 text-sm md:text-base",
                    isDark ? "bg-gray-800 border-gray-700 text-gray-200 placeholder:text-gray-500" : "bg-white border-slate-300"
                  )}
                  placeholder="Type your answer here..."
                  disabled={showResult}
                />
                <p className={cn("text-xs mt-2", isDark ? "text-gray-400" : "text-slate-500")}>
                  <i className="fas fa-info-circle mr-1"></i>
                  Spelling errors are acceptable - we'll do our best to understand!
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className={cn("p-4 rounded-xl", 
            isCorrect 
              ? isDark ? "bg-green-950/50" : "bg-green-100"
              : isDark ? "bg-red-950/50" : "bg-red-100"
          )}>
            <p className={cn("font-semibold mb-3",
              isCorrect 
                ? isDark ? "text-green-300" : "text-green-800"
                : isDark ? "text-red-300" : "text-red-800"
            )}>
              {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
            </p>
            
            {answers[currentIndex]?.feedback && (
              <div className={cn("mb-3 text-sm whitespace-pre-line p-3 rounded-lg",
                isDark ? "bg-gray-800/50 text-gray-300" : "bg-white/50 text-slate-700"
              )}>
                {answers[currentIndex].feedback}
              </div>
            )}
            
            {answers[currentIndex]?.hasSpellingIssues && isCorrect && (
              <div className="mb-3 p-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm">
                <i className="fas fa-exclamation-triangle mr-2"></i>
                Your answer was accepted but check the spelling for better accuracy.
              </div>
            )}
            
            <div className={cn("p-4 rounded-lg", isDark ? "bg-gray-700" : "bg-white")}>
              <h4 className={cn("font-semibold mb-2", isDark ? "text-gray-200" : "text-slate-700")}>Correct Answer:</h4>
              {renderHtml(currentQuestion.answer)}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col md:flex-row gap-3">
        {!showResult ? (
          <button
            onClick={() => handleSubmitAnswer()}
            disabled={isTrueFalseQuestion() ? !selectedTrueFalse : !userAnswer.trim()}
            className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 font-semibold"
          >
            Submit Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 font-semibold"
          >
            {currentIndex < game.questions.length - 1 ? (
              <>
                Next Question <i className="fas fa-arrow-right ml-2"></i>
              </>
            ) : (
              'Complete Game'
            )}
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className={cn("h-2 rounded-full overflow-hidden", isDark ? "bg-gray-700" : "bg-slate-200")}>
          <div 
            className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-300"
            style={{ width: `${((currentIndex + (showResult ? 1 : 0)) / game.questions.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default GamePlayer;