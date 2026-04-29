// app/dashboard/components/CbtSection.tsx
import React, { FC, useState, useEffect, useRef, useCallback } from "react";
import type { ChangeEvent } from "react";
import { cn } from "@/utils";
import { toast } from 'sonner';
import { getRandomMedicalQuote } from '@/lib/utils';
import { Session } from "next-auth";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

type OptionStats = { pct: number; totalPicked: number; isCorrect: boolean };
type ManageType = 'department' | 'case' | 'patient' | 'topic' | 'cbt-category' | 'cbt-question' | null;
type StringOrDate = string | Date;

const useTypingAnimation = (text: string, speed = 30) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const startTyping = useCallback(() => {
    if (!text) return;
    
    setIsTyping(true);
    setDisplayedText('');
    let i = 0;
    
    const typeWriter = () => {
      if (i < text.length) {
        setDisplayedText(prev => prev + text.charAt(i));
        i++;
        timeoutRef.current = setTimeout(typeWriter, speed);
      } else {
        setIsTyping(false);
      }
    };
    
    typeWriter();
  }, [text, speed]);

  useEffect(() => {
    if (text) {
      startTyping();
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [text, startTyping]);

  return { displayedText, isTyping };
};

const parseStructuredContent = (text: string) => {
  if (!text) return { analysis: '', insights: [], relevance: '', hasStructure: false };
  
  console.log('📝 Parsing AI response for structure');
  
  const lines = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  if (lines.length === 0) {
    return { analysis: '', insights: [], relevance: '', hasStructure: false };
  }
  
  let analysis = '';
  const insights: string[] = [];
  let relevance = '';
  
  let currentSection: 'analysis' | 'insights' | 'relevance' | null = null;
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.startsWith('analysis:')) {
      currentSection = 'analysis';
      const content = line.substring('analysis:'.length).trim();
      if (content) analysis = content;
      continue;
    }
    
    if (lowerLine.startsWith('key insights:') || lowerLine.startsWith('key clinical insights:')) {
      currentSection = 'insights';
      continue;
    }
    
    if (lowerLine.startsWith('clinical relevance:') || lowerLine.startsWith('relevance:')) {
      currentSection = 'relevance';
      const content = line.substring(line.indexOf(':') + 1).trim();
      if (content) relevance = content;
      continue;
    }
    
    if (currentSection === 'analysis' && line) {
      if (analysis && !analysis.endsWith('.') && !analysis.endsWith('!') && !analysis.endsWith('?')) {
        analysis += ' ';
      }
      analysis += line;
    }
    
    if (currentSection === 'insights' && line) {
      if (line.startsWith('•') || line.startsWith('-')) {
        const insight = line.substring(1).trim();
        if (insight.length > 15) {
          insights.push(insight);
        }
      }
    }
    
    if (currentSection === 'relevance' && line) {
      if (relevance && !relevance.endsWith('.') && !relevance.endsWith('!') && !relevance.endsWith('?')) {
        relevance += ' ';
      }
      relevance += line;
    }
  }
  
  if (insights.length === 0 && lines.length > 0) {
    lines.slice(0, 5).forEach(line => {
      if (line.length > 20 && !line.toLowerCase().includes('analysis') && !line.toLowerCase().includes('relevance')) {
        insights.push(line);
      }
    });
  }
  
  const result = {
    analysis: analysis,
    insights: insights.slice(0, 5),
    relevance: relevance,
    hasStructure: insights.length > 0 || !!analysis || !!relevance
  };
  
  console.log('📝 Parsed structure (simple):', {
    hasAnalysis: !!result.analysis,
    insightCount: result.insights.length,
    hasRelevance: !!result.relevance
  });
  
  return result;
};

const validateAndCleanContent = (content: {
  analysis: string;
  insights: string[];
  relevance: string;
}) => {
  const simpleClean = (text: string): string => {
    if (!text) return text;
    
    let result = text;
    while (result.includes('  ')) {
      result = result.replace('  ', ' ');
    }
    
    return result.trim();
  };

  return {
    analysis: simpleClean(content.analysis),
    insights: content.insights.map(simpleClean).filter(insight => insight.length > 10),
    relevance: simpleClean(content.relevance),
    hasStructure: content.insights.length > 0 || !!content.analysis || !!content.relevance
  };
};

const AiExplanationWithTyping = React.memo(({ 
  explanation, 
  isAnalyzing 
}: { 
  explanation: string; 
  isAnalyzing: boolean;
}) => {
  const { displayedText, isTyping } = useTypingAnimation(explanation, 20);
  const [showMore, setShowMore] = useState(false);
  const [suggestedLinks, setSuggestedLinks] = useState<Array<{title: string, url: string, type: 'article' | 'video' | 'resource'}>>([]);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  useEffect(() => {
    if (explanation) {
      console.log('🔍 DEBUG - Raw AI Explanation:', {
        length: explanation.length,
        first300: explanation.substring(0, 300)
      });
    }
  }, [explanation]);
  
  useEffect(() => {
    if (explanation && !isTyping) {
      const links = [
        { title: "UpToDate Clinical Topic", url: "https://www.uptodate.com", type: "article" as const },
        { title: "NEJM Clinical Pearls", url: "https://www.nejm.org", type: "article" as const },
        { title: "Medscape CME", url: "https://www.medscape.org", type: "resource" as const },
        { title: "Khan Academy Medicine", url: "https://www.khanacademy.org/science/health-and-medicine", type: "video" as const },
      ];
      setSuggestedLinks(links);
    }
  }, [explanation, isTyping]);

  const rawContent = parseStructuredContent(displayedText);
  const content = validateAndCleanContent(rawContent);
  
  console.log('🔍 DEBUG - Parsed Content:', {
    analysisLength: content.analysis?.length,
    insightsCount: content.insights?.length,
    hasStructure: content.hasStructure
  });
  
  if (!explanation && isAnalyzing) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center">
          <div className={cn("h-10 w-10 rounded-full mr-3 flex items-center justify-center", isDark ? "bg-blue-900/30" : "bg-blue-100")}>
            <i className={cn("fas fa-stethoscope", isDark ? "text-blue-400" : "text-blue-400")}></i>
          </div>
          <div className="flex-1">
            <div className={cn("h-6 rounded w-3/4 mb-2", isDark ? "bg-blue-800/30" : "bg-gradient-to-r from-blue-100/50 to-blue-200/30")}></div>
            <div className={cn("h-4 rounded w-1/2", isDark ? "bg-blue-800/20" : "bg-gradient-to-r from-blue-50/30 to-blue-100/20")}></div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={cn("h-32 rounded-xl border p-4", isDark ? "bg-gray-800/50 border-gray-700/50" : "bg-gradient-to-br from-blue-50/40 to-indigo-50/30 border-blue-100/30")}>
            <div className={cn("h-4 rounded w-1/3 mb-3", isDark ? "bg-gray-700/50" : "bg-blue-100/50")}></div>
            <div className={cn("h-3 rounded w-full mb-2", isDark ? "bg-gray-700/30" : "bg-blue-100/30")}></div>
            <div className={cn("h-3 rounded w-4/5", isDark ? "bg-gray-700/30" : "bg-blue-100/30")}></div>
          </div>
          <div className={cn("h-32 rounded-xl border p-4", isDark ? "bg-gray-800/50 border-gray-700/50" : "bg-gradient-to-br from-purple-50/40 to-pink-50/30 border-purple-100/30")}>
            <div className={cn("h-4 rounded w-1/3 mb-3", isDark ? "bg-gray-700/50" : "bg-purple-100/50")}></div>
            <div className={cn("h-3 rounded w-full mb-2", isDark ? "bg-gray-700/30" : "bg-purple-100/30")}></div>
            <div className={cn("h-3 rounded w-3/4", isDark ? "bg-gray-700/30" : "bg-purple-100/30")}></div>
          </div>
        </div>
        
        <div className="flex items-center justify-center py-6">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <i className="fas fa-heartbeat text-blue-400 text-lg animate-pulse"></i>
            </div>
          </div>
          <div className="ml-4">
            <p className={cn("font-medium", isDark ? "text-blue-400" : "text-blue-600")}>Generating Clinical Insights</p>
            <p className={cn("text-sm", isDark ? "text-blue-400/70" : "text-blue-400")}>AI is analyzing medical concepts...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!explanation && !isAnalyzing) {
    return (
      <div className={cn("text-center py-8 px-4 rounded-2xl border", isDark ? "bg-gray-800/50 border-gray-700/50" : "bg-gradient-to-br from-slate-50/60 to-blue-50/30 border-blue-100/50")}>
        <i className="fas fa-microscope text-4xl text-blue-300 mb-4"></i>
        <p className={cn("text-lg font-medium mb-2", isDark ? "text-gray-300" : "text-slate-500")}>Clinical Insights Unavailable</p>
        <p className={cn("text-sm max-w-md mx-auto", isDark ? "text-gray-400" : "text-slate-400")}>
          AI-powered insights are being processed. Please review the detailed explanation above for comprehensive understanding.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isTyping && (
        <div className={cn("rounded-xl p-4", isDark ? "bg-blue-900/30 border border-blue-800/50" : "bg-gradient-to-r from-blue-50/80 to-indigo-50/60 border border-blue-200/30")}>
          <div className="flex items-center">
            <div className="relative mr-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              <i className="fas fa-brain text-blue-400 text-sm absolute inset-0 flex items-center justify-center"></i>
            </div>
            <div className="flex-1">
              <div className="flex items-center">
                <span className={cn("font-medium", isDark ? "text-blue-400" : "text-blue-700")}>AI is generating insights</span>
                <span className="ml-2 flex space-x-1">
                  <span className="h-1.5 w-1.5 bg-blue-400 rounded-full animate-bounce"></span>
                  <span className="h-1.5 w-1.5 bg-blue-400 rounded-full animate-bounce delay-100"></span>
                  <span className="h-1.5 w-1.5 bg-blue-400 rounded-full animate-bounce delay-200"></span>
                </span>
              </div>
              <p className={cn("text-sm mt-1", isDark ? "text-blue-400/70" : "text-blue-600/70")}>Analyzing medical concepts and structuring clinical pearls...</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {content.analysis && (
          <div className={cn("rounded-2xl border backdrop-blur-sm shadow-lg", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-gradient-to-br from-blue-50/80 to-indigo-50/60 border-blue-200/50")}>
            <div className="p-6">
              <div className="flex items-center mb-6">
                <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center mr-4", isDark ? "bg-blue-900/50" : "bg-gradient-to-br from-blue-100 to-blue-200")}>
                  <i className={cn("fas fa-search-medical text-lg", isDark ? "text-blue-400" : "text-blue-600")}></i>
                </div>
                <div>
                  <h5 className={cn("font-bold text-xl flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
                    Clinical Analysis
                  </h5>
                  <p className={cn("text-sm", isDark ? "text-blue-400/70" : "text-blue-600/70")}>Comprehensive breakdown of the question</p>
                </div>
              </div>
              
              <div className={cn("rounded-xl p-5", isDark ? "bg-gray-900/60 border border-gray-700/50" : "bg-white/60 border border-slate-200/50")}>
                <div className="space-y-4">
                  {content.analysis.split('. ').map((sentence, idx) => (
                    sentence.trim() && (
                      <div key={idx} className="flex items-start group cursor-pointer">
                        <div className="flex-shrink-0 mr-3 mt-1">
                          <div className={cn("h-5 w-5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform", isDark ? "bg-blue-900/50" : "bg-gradient-to-r from-blue-100 to-blue-200")}>
                            <i className={cn("fas fa-check text-xs", isDark ? "text-blue-400" : "text-blue-500")}></i>
                          </div>
                        </div>
                        <span className={cn("group-hover:transition-colors", isDark ? "text-gray-300 group-hover:text-gray-200" : "text-slate-700 group-hover:text-slate-800")}>
                          {sentence.trim().replace(/^[•\-\d\.]\s*/, '')}.
                        </span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {content.insights.length > 0 && (
          <div className={cn("rounded-2xl border backdrop-blur-sm shadow-lg", isDark ? "bg-gray-800/80 border-green-900/50" : "bg-gradient-to-br from-emerald-50/80 to-green-50/60 border-emerald-200/50")}>
            <div className="p-6">
              <div className="flex items-center mb-6">
                <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center mr-4", isDark ? "bg-green-900/50" : "bg-gradient-to-br from-emerald-100 to-emerald-200")}>
                  <i className={cn("fas fa-lightbulb-medical text-lg", isDark ? "text-green-400" : "text-emerald-600")}></i>
                </div>
                <div>
                  <h5 className={cn("font-bold text-xl flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
                    Key Clinical Pearls
                  </h5>
                  <p className={cn("text-sm", isDark ? "text-green-400/70" : "text-emerald-600/70")}>Essential insights for mastery</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {content.insights.map((insight, idx) => (
                  <div 
                    key={idx} 
                    className={cn("p-5 rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer", isDark ? "bg-gray-900/60 hover:bg-gray-900/80 border border-green-900/30 hover:border-green-800/50" : "group bg-white/70 hover:bg-white/90 border border-emerald-100/50 hover:border-emerald-300/50")}
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mr-3 mt-1">
                        <div className={cn("h-6 w-6 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300", isDark ? "bg-green-900/50" : "bg-gradient-to-r from-emerald-100 to-emerald-200")}>
                          <i className={cn("fas fa-star text-xs", isDark ? "text-green-400" : "text-emerald-500")}></i>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className={cn("transition-colors", isDark ? "text-gray-300 group-hover:text-gray-200" : "text-slate-700 group-hover:text-slate-800")}>
                          {insight}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {content.relevance && (
          <div className={cn("rounded-2xl border backdrop-blur-sm shadow-lg", isDark ? "bg-gray-800/80 border-purple-900/50" : "bg-gradient-to-br from-purple-50/80 to-violet-50/60 border-purple-200/50")}>
            <div className="p-6">
              <div className="flex items-center mb-6">
                <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center mr-4", isDark ? "bg-purple-900/50" : "bg-gradient-to-br from-purple-100 to-purple-200")}>
                  <i className={cn("fas fa-hand-holding-medical text-lg", isDark ? "text-purple-400" : "text-purple-600")}></i>
                </div>
                <div>
                  <h5 className={cn("font-bold text-xl flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
                    Clinical Relevance
                  </h5>
                  <p className={cn("text-sm", isDark ? "text-purple-400/70" : "text-purple-600/70")}>Real-world application & significance</p>
                </div>
              </div>
              
              <div className={cn("rounded-xl p-5", isDark ? "bg-gray-900/60 border border-purple-900/50" : "bg-white/60 border border-purple-200/50")}>
                <div className="flex items-start group cursor-pointer">
                  <div className="flex-shrink-0 mr-3 mt-1">
                    <div className={cn("h-5 w-5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform", isDark ? "bg-purple-900/50" : "bg-gradient-to-r from-purple-100 to-purple-200")}>
                      <i className={cn("fas fa-check text-xs", isDark ? "text-purple-400" : "text-purple-500")}></i>
                    </div>
                  </div>
                  <span className={cn("transition-colors", isDark ? "text-gray-300 group-hover:text-gray-200" : "text-slate-700 group-hover:text-slate-800")}>
                    {content.relevance}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {!content.hasStructure && displayedText && (
          <div className={cn("rounded-2xl border backdrop-blur-sm shadow-lg", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-gradient-to-br from-slate-50/80 to-gray-50/60 border-slate-200/50")}>
            <div className="p-6">
              <div className="flex items-center mb-6">
                <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center mr-4", isDark ? "bg-gray-700/50" : "bg-gradient-to-br from-slate-100 to-slate-200")}>
                  <i className={cn("fas fa-file-medical text-lg", isDark ? "text-gray-400" : "text-slate-600")}></i>
                </div>
                <div>
                  <h5 className={cn("font-bold text-xl flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
                    Clinical Insights
                  </h5>
                  <p className={cn("text-sm", isDark ? "text-gray-400" : "text-slate-600/70")}>AI-generated analysis</p>
                </div>
              </div>
              
              <div className={cn("rounded-xl p-5", isDark ? "bg-gray-900/60 border border-gray-700/50" : "bg-white/60 border border-slate-200/50")}>
                <div className="space-y-4">
                  {displayedText
                    .replace(/\*\*/g, '')
                    .split('\n\n')
                    .map((paragraph, idx) => (
                      paragraph.trim() && (
                        <div key={idx} className="flex items-start group cursor-pointer">
                          <div className="flex-shrink-0 mr-3 mt-1">
                            <div className={cn("h-5 w-5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform", isDark ? "bg-gray-700/50" : "bg-gradient-to-r from-slate-100 to-slate-200")}>
                              <i className={cn("fas fa-check text-xs", isDark ? "text-gray-400" : "text-slate-500")}></i>
                            </div>
                          </div>
                          <p className={cn("transition-colors", isDark ? "text-gray-300 group-hover:text-gray-200" : "text-slate-700 group-hover:text-slate-800")}>
                            {paragraph.trim()}
                          </p>
                        </div>
                      )
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {!isTyping && displayedText && (
        <div className={cn("pt-6", isDark ? "border-t border-gray-700/40" : "border-t border-slate-200/40")}>
          <button
            onClick={() => setShowMore(!showMore)}
            className={cn("group w-full rounded-2xl p-5 transition-all duration-300 hover:shadow-xl flex items-center justify-between", isDark ? "bg-gray-800/50 hover:bg-gray-800/80 border-2 border-gray-700/50 hover:border-blue-800/50" : "bg-gradient-to-r from-slate-50/80 to-blue-50/60 hover:from-blue-50/90 hover:to-indigo-50/80 border-2 border-blue-200/50 hover:border-blue-400/50")}
          >
            <div className="flex items-center">
              <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300", isDark ? "bg-blue-900/50" : "bg-gradient-to-br from-blue-100 to-blue-200")}>
                <i className={cn(`fas fa-${showMore ? 'chevron-up' : 'chevron-down'} text-lg`, isDark ? "text-blue-400" : "text-blue-600")}></i>
              </div>
              <div className="text-left">
                <h6 className={cn("font-semibold text-lg group-hover:transition-colors", isDark ? "text-gray-200 group-hover:text-blue-400" : "text-slate-800 group-hover:text-blue-700")}>
                  {showMore ? 'Collapse Deep Dive' : 'Explore Deep Dive Insights'}
                </h6>
                <p className={cn("text-sm transition-colors", isDark ? "text-gray-400 group-hover:text-blue-400/70" : "text-slate-500 group-hover:text-blue-500/70")}>
                  {showMore ? 'Hide advanced clinical context' : 'Advanced insights, related topics & resources'}
                </p>
              </div>
            </div>
            <i className={cn("fas fa-arrow-right group-hover:translate-x-1 transition-all duration-300", isDark ? "text-blue-400 group-hover:text-blue-300" : "text-blue-400 group-hover:text-blue-600")}></i>
          </button>
          
          {showMore && (
            <EnhancedAdditionalInsights 
              explanation={explanation} 
              isTyping={isTyping}
              suggestedLinks={suggestedLinks}
            />
          )}
        </div>
      )}
    </div>
  );
});

AiExplanationWithTyping.displayName = 'AiExplanationWithTyping';

const AdditionalInsights = React.memo(({ 
  explanation, 
  isTyping 
}: { 
  explanation: string; 
  isTyping: boolean;
}) => {
  const [additionalInsights, setAdditionalInsights] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const fetchAdditionalInsights = useCallback(async () => {
    if (!explanation || loadingMore) return;
    
    setLoadingMore(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockInsights = `
**Clinical Relevance**: This topic frequently appears in medical board exams due to its diagnostic importance.

**Common Pitfalls**: Students often confuse this with similar conditions. Key differentiating factors include timing of symptoms and associated findings.

**Memory Aid**: Consider the mnemonic "ABCDE" for remembering the diagnostic criteria.

**Latest Research**: Recent studies suggest updated treatment protocols that emphasize early intervention.
      `.trim();
      
      setAdditionalInsights(mockInsights);
    } catch (error) {
      console.error('Failed to load additional insights:', error);
      setAdditionalInsights('Additional insights are currently unavailable.');
    } finally {
      setLoadingMore(false);
    }
  }, [explanation, loadingMore]);

  useEffect(() => {
    if (expanded && !additionalInsights && !isTyping) {
      fetchAdditionalInsights();
    }
  }, [expanded, additionalInsights, isTyping, fetchAdditionalInsights]);

  return (
    <div className={cn("mt-4 p-4 rounded-xl border", isDark ? "bg-gray-800/50 border-gray-700/50" : "bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-blue-100/50")}>
      <div className="flex items-center justify-between mb-3">
        <h5 className={cn("font-semibold flex items-center", isDark ? "text-gray-300" : "text-slate-700")}>
          <i className="fas fa-microscope mr-2 text-blue-500"></i>
          Deep Dive Insights
        </h5>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn("text-sm", isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-800")}
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      
      {expanded && (
        <div className="space-y-3">
          {loadingMore ? (
            <div className="space-y-2">
              <div className={cn("h-3 rounded animate-pulse", isDark ? "bg-gray-700" : "bg-slate-200")}></div>
              <div className={cn("h-3 rounded animate-pulse w-3/4", isDark ? "bg-gray-700" : "bg-slate-200")}></div>
            </div>
          ) : (
            <>
              {additionalInsights ? (
                <div className={cn("text-sm space-y-2", isDark ? "text-gray-300" : "text-slate-600")}>
                  {additionalInsights.split('\n').map((line, idx) => (
                    <div key={idx} className="flex items-start">
                      {line.startsWith('**') && line.endsWith('**') ? (
                        <span className={cn("font-semibold", isDark ? "text-gray-200" : "text-slate-700")}>
                          {line.replace(/\*\*/g, '')}:
                        </span>
                      ) : (
                        <span>{line}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className={cn("text-sm italic", isDark ? "text-gray-400" : "text-slate-500")}>
                  Loading additional clinical insights...
                </p>
              )}
              
              <div className={cn("pt-3", isDark ? "border-t border-gray-700/50" : "border-t border-slate-200/50")}>
                <p className={cn("text-xs mb-2", isDark ? "text-gray-400" : "text-slate-500")}>Suggested for further study:</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full dark:bg-blue-900/50 dark:text-blue-300">Differential Diagnosis</span>
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full dark:bg-emerald-900/50 dark:text-emerald-300">Treatment Guidelines</span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full dark:bg-purple-900/50 dark:text-purple-300">Evidence-Based Medicine</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
});

AdditionalInsights.displayName = 'AdditionalInsights';

const EnhancedAdditionalInsights = React.memo(({ 
  explanation, 
  isTyping,
  suggestedLinks
}: { 
  explanation: string; 
  isTyping: boolean;
  suggestedLinks: Array<{title: string, url: string, type: 'article' | 'video' | 'resource'}>;
}) => {
  const [additionalInsights, setAdditionalInsights] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const fetchAdditionalInsights = useCallback(async () => {
    if (!explanation || loadingMore) return;
    
    setLoadingMore(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockInsights = `
**Pathophysiological Context:** This condition involves disruption of normal mucosal defense mechanisms, often mediated by NSAID use or H. pylori infection.

**Diagnostic Approach:** 
• Consider endoscopic evaluation for patients with alarm symptoms
• Utilize urea breath test for H. pylori detection
• Rule out Zollinger-Ellison syndrome in refractory cases

**Therapeutic Considerations:**
• First-line therapy typically involves PPI plus dual antibiotics
• Consider susceptibility testing in areas with high resistance
• Monitor for complications including bleeding and perforation

**Evidence-Based Updates:** Recent meta-analyses support 14-day regimens over 7-day courses for H. pylori eradication, with success rates approaching 90% with optimized therapy.

**Prognostic Indicators:** Factors predicting poor response include smoking, poor compliance, and bacterial resistance patterns.
      `.trim();
      
      setAdditionalInsights(mockInsights);
    } catch (error) {
      console.error('Failed to load additional insights:', error);
      setAdditionalInsights('Advanced clinical insights are currently being refined. Please check back soon.');
    } finally {
      setLoadingMore(false);
    }
  }, [explanation, loadingMore]);

  useEffect(() => {
    if (expanded && !additionalInsights && !isTyping) {
      fetchAdditionalInsights();
    }
  }, [expanded, additionalInsights, isTyping, fetchAdditionalInsights]);

  const parseInsights = (text: string) => {
    const sections: Record<string, string[]> = {};
    let currentSection = '';
    
    text.split('\n').forEach(line => {
      if (line.startsWith('**') && line.endsWith('**')) {
        currentSection = line.replace(/\*\*/g, '').replace(':', '').trim();
        sections[currentSection] = [];
      } else if (currentSection && line.trim()) {
        sections[currentSection].push(line.trim());
      }
    });
    
    return sections;
  };

  const insights = parseInsights(additionalInsights);

  return (
    <div className={cn("mt-6 p-6 rounded-2xl border backdrop-blur-sm shadow-lg", isDark ? "bg-gray-800/80 border-blue-900/50" : "bg-gradient-to-br from-blue-50/80 to-indigo-50/60 border-blue-200/50")}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center mr-4", isDark ? "bg-blue-900/50" : "bg-gradient-to-br from-blue-100 to-blue-200")}>
            <i className={cn("fas fa-brain-circuit text-lg", isDark ? "text-blue-400" : "text-blue-600")}></i>
          </div>
          <div>
            <h5 className={cn("font-bold text-xl flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
              Deep Dive Clinical Insights
            </h5>
            <p className={cn("text-sm", isDark ? "text-blue-400/70" : "text-blue-600/70")}>Advanced context for mastery</p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn("group rounded-xl px-4 py-2 transition-all duration-300 flex items-center", isDark ? "bg-gray-700/50 hover:bg-gray-700 border border-blue-800/50 hover:border-blue-700" : "bg-white/80 hover:bg-white border border-blue-300/50 hover:border-blue-400")}
        >
          <span className={cn("font-medium mr-2 transition-colors", isDark ? "text-blue-400 group-hover:text-blue-300" : "text-blue-700 group-hover:text-blue-800")}>
            {expanded ? 'Collapse' : 'Expand'}
          </span>
          <i className={cn(`fas fa-chevron-${expanded ? 'up' : 'down'} transition-colors`, isDark ? "text-blue-400 group-hover:text-blue-300" : "text-blue-500 group-hover:text-blue-600")}></i>
        </button>
      </div>
      
      {expanded && (
        <div className="space-y-6">
          {loadingMore ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center mb-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-400 mr-3"></div>
                <span className={cn("font-medium", isDark ? "text-blue-400" : "text-blue-600")}>Loading Advanced Insights</span>
              </div>
              <p className={cn("text-sm", isDark ? "text-gray-400" : "text-slate-500")}>Analyzing latest clinical guidelines...</p>
            </div>
          ) : (
            <>
              {Object.keys(insights).length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(insights).map(([section, points], idx) => (
                    <div 
                      key={section} 
                      className={cn("rounded-xl p-5 transition-colors duration-300", isDark ? "bg-gray-900/60 border border-gray-700/50 hover:border-blue-800/50" : "bg-white/60 border border-slate-200/50 hover:border-blue-300/50")}
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <h6 className={cn("font-semibold mb-3 flex items-center text-lg", isDark ? "text-gray-200" : "text-slate-800")}>
                        <i className="fas fa-notes-medical text-blue-500 mr-2"></i>
                        {section}
                      </h6>
                      <ul className="space-y-3">
                        {points.map((point, pointIdx) => (
                          <li key={pointIdx} className="flex items-start group cursor-pointer">
                            <div className="flex-shrink-0 mr-3 mt-1">
                              <div className={cn("h-5 w-5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform", isDark ? "bg-blue-900/50" : "bg-gradient-to-r from-blue-100 to-blue-200")}>
                                <i className={cn("fas fa-check text-xs", isDark ? "text-blue-400" : "text-blue-500")}></i>
                              </div>
                            </div>
                            <span className={cn("transition-colors", isDark ? "text-gray-300 group-hover:text-gray-200" : "text-slate-700 group-hover:text-slate-800")}>
                              {point.replace(/^[•\-]\s*/, '')}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <i className="fas fa-book-medical text-4xl text-blue-300 mb-3"></i>
                  <p className={isDark ? "text-gray-400" : "text-slate-600"}>Advanced insights are being prepared...</p>
                </div>
              )}
              
              <div className={cn("rounded-2xl p-6", isDark ? "bg-green-900/30 border border-green-800/50" : "bg-gradient-to-r from-emerald-50/60 to-teal-50/40 border border-emerald-200/50")}>
                <div className="flex items-center mb-5">
                  <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center mr-3", isDark ? "bg-green-900/50" : "bg-gradient-to-r from-emerald-100 to-emerald-200")}>
                    <i className={cn("fas fa-graduation-cap", isDark ? "text-green-400" : "text-emerald-600")}></i>
                  </div>
                  <h6 className={cn("font-semibold text-lg", isDark ? "text-gray-200" : "text-slate-800")}>Suggested for Further Study</h6>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {suggestedLinks.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn("group rounded-xl p-4 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] flex items-center", isDark ? "bg-gray-800/80 hover:bg-gray-800 border border-green-800/30 hover:border-green-700/50" : "bg-white/80 hover:bg-white border border-emerald-200/50 hover:border-emerald-400/50")}
                    >
                      <div className="flex-shrink-0 mr-4">
                        <div className={cn(`h-10 w-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform ${
                          link.type === 'article' ? (isDark ? "bg-blue-900/50" : "bg-blue-100/80") :
                          link.type === 'video' ? (isDark ? "bg-purple-900/50" : "bg-purple-100/80") :
                          (isDark ? "bg-emerald-900/50" : "bg-emerald-100/80")
                        }`)}>
                          <i className={`fas fa-${
                            link.type === 'article' ? (isDark ? "newspaper text-blue-400" : "newspaper text-blue-600") :
                            link.type === 'video' ? (isDark ? "play-circle text-purple-400" : "play-circle text-purple-600") :
                            (isDark ? "book-open text-emerald-400" : "book-open text-emerald-600")
                          }`}></i>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className={cn("font-medium transition-colors", isDark ? "text-gray-200 group-hover:text-white" : "text-slate-800 group-hover:text-slate-900")}>
                          {link.title}
                        </p>
                        <div className="flex items-center mt-1">
                          <span className={cn("text-xs px-2 py-1 rounded-full mr-2", isDark ? "bg-gray-700/50 text-gray-400" : "bg-slate-100/50 text-slate-600")}>
                            {link.type}
                          </span>
                          <span className={cn("text-xs flex items-center transition-colors", isDark ? "text-gray-400 group-hover:text-green-400" : "text-slate-400 group-hover:text-emerald-500")}>
                            Visit resource
                            <i className="fas fa-external-link-alt ml-1 text-xs"></i>
                          </span>
                        </div>
                      </div>
                      <i className={cn("fas fa-chevron-right ml-2 transition-colors", isDark ? "text-gray-400 group-hover:text-green-400" : "text-slate-400 group-hover:text-emerald-500")}></i>
                    </a>
                  ))}
                </div>
                
                <div className={cn("mt-6 pt-6", isDark ? "border-t border-green-800/30" : "border-t border-emerald-200/30")}>
                  <p className={cn("text-sm mb-3 font-medium", isDark ? "text-gray-300" : "text-slate-600")}>Mastery Pathways:</p>
                  <div className="flex flex-wrap gap-2">
                    <span className={cn("px-3 py-1.5 text-sm rounded-full transition-colors cursor-pointer hover:scale-105", isDark ? "bg-blue-900/50 text-blue-300 border border-blue-800/30 hover:border-blue-700/50" : "bg-gradient-to-r from-blue-100/80 to-blue-200/60 text-blue-700 border border-blue-300/30 hover:border-blue-400/50")}>
                      Board Review Questions
                    </span>
                    <span className={cn("px-3 py-1.5 text-sm rounded-full transition-colors cursor-pointer hover:scale-105", isDark ? "bg-purple-900/50 text-purple-300 border border-purple-800/30 hover:border-purple-700/50" : "bg-gradient-to-r from-purple-100/80 to-purple-200/60 text-purple-700 border border-purple-300/30 hover:border-purple-400/50")}>
                      Case-Based Learning
                    </span>
                    <span className={cn("px-3 py-1.5 text-sm rounded-full transition-colors cursor-pointer hover:scale-105", isDark ? "bg-emerald-900/50 text-emerald-300 border border-emerald-800/30 hover:border-emerald-700/50" : "bg-gradient-to-r from-emerald-100/80 to-emerald-200/60 text-emerald-700 border border-emerald-300/30 hover:border-emerald-400/50")}>
                      Interactive Simulations
                    </span>
                    <span className={cn("px-3 py-1.5 text-sm rounded-full transition-colors cursor-pointer hover:scale-105", isDark ? "bg-amber-900/50 text-amber-300 border border-amber-800/30 hover:border-amber-700/50" : "bg-gradient-to-r from-amber-100/80 to-amber-200/60 text-amber-700 border border-amber-300/30 hover:border-amber-400/50")}>
                      Flashcards & Mnemonics
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
});

EnhancedAdditionalInsights.displayName = 'EnhancedAdditionalInsights';

type CbtSectionProps = {
  currentSection: string;
  setShowLoadingPopup: (show: boolean) => void;
  cbtSessionId: string | null;
  setCurrentCbtSessionId: (id: string | null) => void;
  showSmartInputModal: boolean;
  setShowSmartInputModal: (show: boolean) => void;
  generatedQuestions: any[];
  setGeneratedQuestions: (questions: any[]) => void;
  smartInputText: string;
  setSmartInputText: (text: string) => void;
  smartUploadedFile: File | null;
  setSmartUploadedFile: (file: File | null) => void;
  isGeneratingQuestions: boolean;
  setIsGeneratingQuestions: (generating: boolean) => void;
  handleSmartGenerateQuestions: () => Promise<void>;
  handleFileUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  handleClearFile: () => void;
  switchSection: (section: string) => void;
  handleCardClick: (target: string) => void;
  cbtType: 'mdcn' | 'mbbs' | 'smart' | null;
  setCbtType: (type: 'mdcn' | 'mbbs' | 'smart' | null) => void;
  cbtMode: 'practice' | 'timed' | 'exam' | null;
  setCbtMode: (mode: 'practice' | 'timed' | 'exam' | null) => void;
  cbtCategories: any[];
  setCbtCategories: (categories: any[]) => void;
  cbtQuestions: any[];
  setCbtQuestions: (questions: any[]) => void;
  cbtSelectedCategory: string | null;
  setCbtSelectedCategory: (category: string | null) => void;
  cbtCurrentQuestionIndex: number;
  setCbtCurrentQuestionIndex: (index: number) => void;
  cbtAnswers: Record<number, number>;
  setCbtAnswers: (answers: Record<number, number>) => void;
  newCbtCategoryName: string;
  setNewCbtCategoryName: (name: string) => void;
  newCbtCategorySlug: string;
  setNewCbtCategorySlug: (slug: string) => void;
  newCbtQuestionCategoryId: string;
  setNewCbtQuestionCategoryId: (id: string) => void;
  newCbtQuestionContent: string;
  setNewCbtQuestionContent: (content: string) => void;
  newCbtQuestionExplanation: string;
  setNewCbtQuestionExplanation: (exp: string) => void;
  newCbtQuestionFigureUrl: string;
  setNewCbtQuestionFigureUrl: (url: string) => void;
  newCbtQuestionOptions: { text: string; correct: boolean }[];
  setNewCbtQuestionOptions: (options: { text: string; correct: boolean }[]) => void;
  cbtNumQuestions: number;
  setCbtNumQuestions: (num: number) => void;
  cbtDuration: number;
  setCbtDuration: (dur: number) => void;
  cbtTimeLeft: number;
  setCbtTimeLeft: (time: number) => void;
  cbtSelectedAnswer: number | null;
  setCbtSelectedAnswer: (ans: number | null) => void;
  showCbtFeedbackModal: boolean;
  setShowCbtFeedbackModal: (show: boolean) => void;
  cbtFeedback: any;
  setCbtFeedback: (feedback: any) => void;
  cbtOverallFeedback: string;
  setCbtOverallFeedback: (feedback: string) => void;
  cbtShowSummary: boolean;
  setCbtShowSummary: (show: boolean) => void;
  cbtShowEndConfirm: boolean;
  setCbtShowEndConfirm: (show: boolean) => void;
  cbtIsChecking: boolean;
  setCbtIsChecking: (checking: boolean) => void;
  cbtAiExplanation: string;
  setCbtAiExplanation: (exp: string) => void;
  cbtOptionPercentages: Record<string, OptionStats[]>;
  setCbtOptionPercentages: (pct: Record<string, OptionStats[]>) => void;
  isAnalysing: boolean;
  setIsAnalysing: (analysing: boolean) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  loadingQuestions: boolean;
  setLoadingQuestions: (loading: boolean) => void;
  currentMedicalQuote: { text: string, author: string } | null;
  setCurrentMedicalQuote: (quote: { text: string, author: string } | null) => void;
  showListModal: boolean;
  setShowListModal: (show: boolean) => void;
  showEditModal: boolean;
  setShowEditModal: (show: boolean) => void;
  manageType: ManageType;
  setManageType: (type: ManageType) => void;
  selectedItem: any;
  setSelectedItem: (item: any) => void;
  editFormData: any;
  setEditFormData: (data: any) => void;
  session: Session | null;
  fetchCbtCategories: () => Promise<void>;
  fetchCbtQuestions: (categoryId?: string) => Promise<void>;
  handleCbtCategorySelect: (categoryId: string) => void;
  handleCbtAnswerSelect: (questionIndex: number, answerIndex: number) => void;
  handleCbtCheckAnswer: () => Promise<void>;
  handleCbtNextQuestion: () => void;
  handleCbtPrevQuestion: () => void;
  handleCbtJumpToQuestion: (index: number) => void;
  handleCbtEndSession: () => Promise<void>;
  handleSmartCbtEndSession?: () => Promise<void>;
  handleCreateCbtCategory: () => Promise<void>;
  handleCreateCbtQuestion: () => Promise<void>;
  handleNewCbtOptionChange: (index: number, field: 'text' | 'correct', value: string | boolean) => void;
  handleImportCsv: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  openManageList: (type: ManageType) => void;
  openEditItem: (item: any) => void;
  handleUpdate: () => Promise<void>;
  handleEditChange: (field: string, value: any) => void;
};

const CbtSection: FC<CbtSectionProps> = ({
  currentSection,
  switchSection,
  handleCardClick,
  cbtType,
  setCbtType,
  cbtMode,
  setCbtMode,
  cbtCategories,
  setCbtCategories,
  cbtQuestions,
  setCbtQuestions,
  cbtSelectedCategory,
  setCbtSelectedCategory,
  cbtCurrentQuestionIndex,
  setCbtCurrentQuestionIndex,
  cbtAnswers,
  setCbtAnswers,
  newCbtCategoryName,
  setNewCbtCategoryName,
  newCbtCategorySlug,
  setNewCbtCategorySlug,
  newCbtQuestionCategoryId,
  setNewCbtQuestionCategoryId,
  newCbtQuestionContent,
  setNewCbtQuestionContent,
  newCbtQuestionExplanation,
  setNewCbtQuestionExplanation,
  newCbtQuestionFigureUrl,
  setNewCbtQuestionFigureUrl,
  newCbtQuestionOptions,
  setNewCbtQuestionOptions,
  cbtNumQuestions,
  setCbtNumQuestions,
  cbtDuration,
  setCbtDuration,
  cbtTimeLeft,
  setCbtTimeLeft,
  cbtSelectedAnswer,
  setCbtSelectedAnswer,
  showCbtFeedbackModal,
  setShowCbtFeedbackModal,
  cbtFeedback,
  setCbtFeedback,
  cbtOverallFeedback,
  setCbtOverallFeedback,
  cbtShowSummary,
  setCbtShowSummary,
  cbtShowEndConfirm,
  setCbtShowEndConfirm,
  cbtIsChecking,
  setCbtIsChecking,
  cbtAiExplanation,
  setCbtAiExplanation,
  cbtOptionPercentages,
  setCbtOptionPercentages,
  isAnalysing,
  setIsAnalysing,
  isProcessing,
  setIsProcessing,
  loadingQuestions,
  setLoadingQuestions,
  currentMedicalQuote,
  setCurrentMedicalQuote,
  showListModal,
  setShowListModal,
  showEditModal,
  setShowEditModal,
  manageType,
  setManageType,
  selectedItem,
  setSelectedItem,
  editFormData,
  setEditFormData,
  session,
  fetchCbtCategories,
  fetchCbtQuestions,
  handleCbtCategorySelect,
  handleCbtAnswerSelect,
  handleCbtCheckAnswer,
  handleCbtNextQuestion,
  handleCbtPrevQuestion,
  handleCbtJumpToQuestion,
  handleCbtEndSession,
  handleSmartCbtEndSession,
  handleCreateCbtCategory,
  handleCreateCbtQuestion,
  handleNewCbtOptionChange,
  handleImportCsv,
  openManageList,
  openEditItem,
  handleUpdate,
  handleEditChange,
  cbtSessionId,
  setCurrentCbtSessionId,
  setShowLoadingPopup,
}) => {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  const [showQuestionDrawer, setShowQuestionDrawer] = useState(false);
  const [smartInputText, setSmartInputText] = useState('');
  const [smartUploadedFile, setSmartUploadedFile] = useState<File | null>(null);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [showSmartInput, setShowSmartInput] = useState(false);
  const [showSmartInputModal, setShowSmartInputModal] = useState(false);
  const [smartNumQuestions, setSmartNumQuestions] = useState(10);
  const [smartDuration, setSmartDuration] = useState(60);

  const handleCloseFeedbackModal = () => {
    setShowCbtFeedbackModal(false);
    handleCbtNextQuestion();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleCloseFeedbackModal();
    }
  };

  useEffect(() => {
    if (currentSection !== 'cbt-question-display') {
      setShowQuestionDrawer(false);
    }
  }, [currentSection]);

  const getQuestionStatus = (index: number) => {
    if (cbtAnswers[index] === undefined) return 'unanswered';
    const isCorrect = cbtQuestions[index]?.options[cbtAnswers[index]]?.correct;
    return isCorrect ? 'correct' : 'incorrect';
  };

  const handleSmartGenerateQuestions = async () => {
    if (!smartInputText.trim() && !smartUploadedFile) {
      toast.error('Please enter text or upload a document');
      return;
    }

    if (smartInputText.length > 10000) {
      toast.error('Text input exceeds 10,000 characters limit');
      return;
    }

    if (smartNumQuestions < 1 || smartNumQuestions > 50) {
      toast.error('Number of questions must be between 1 and 50');
      return;
    }

    if (smartDuration < 1 || smartDuration > 300) {
      toast.error('Duration must be between 1 and 300 minutes');
      return;
    }

    setIsGeneratingQuestions(true);
    setCurrentMedicalQuote(getRandomMedicalQuote());

    try {
      const formData = new FormData();
      
      if (smartInputText) {
        formData.append('text', smartInputText);
      }
      
      if (smartUploadedFile) {
        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain'
        ];
        
        if (!allowedTypes.includes(smartUploadedFile.type)) {
          toast.error('Invalid file type. Please upload PDF, DOC, DOCX, or TXT files only.');
          setIsGeneratingQuestions(false);
          return;
        }
        
        formData.append('file', smartUploadedFile);
      }

      formData.append('numQuestions', smartNumQuestions.toString());
      formData.append('duration', smartDuration.toString());

      const tokenCheck = await fetch('/api/tokens/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'smart_question_generation',
          quantity: 1,
          metadata: { 
            service: 'smart_question_generation',
            numQuestions: smartNumQuestions,
            duration: smartDuration
          }
        }),
      }).then(res => res.json());

      if (!tokenCheck.success) {
        toast.error(`Insufficient tokens: ${tokenCheck.message}`);
        setIsGeneratingQuestions(false);
        return;
      }

      console.log('🚀 Calling generate-smart-questions API');
      console.log('📊 Request parameters:', {
        numQuestions: smartNumQuestions,
        duration: smartDuration,
        textLength: smartInputText?.length || 0,
        fileUploaded: !!smartUploadedFile
      });

      const response = await fetch('/api/generate-smart-questions', {
        method: 'POST',
        body: formData,
      });

      console.log('📊 API Response status:', response.status);
      
      if (!response.ok) {
        let errorText = 'Failed to generate questions';
        try {
          const errorData = await response.json();
          errorText = errorData.error || errorText;
        } catch (e) {
          errorText = await response.text();
        }
        throw new Error(errorText);
      }

      const data = await response.json();
      console.log('✅ Generated questions response:', data);
      
      if (!data || !data.success) {
        throw new Error(data?.error || 'Invalid response from server');
      }
      
      if (!data.questions || !Array.isArray(data.questions)) {
        console.error('Invalid questions format:', data);
        throw new Error('Received invalid questions format from server');
      }
      
      const validQuestions = data.questions.filter((q: any) => 
        q && 
        q.question && 
        Array.isArray(q.options) && 
        q.options.length >= 2 &&
        typeof q.correctAnswer === 'number' &&
        q.correctAnswer >= 0 &&
        q.correctAnswer < q.options.length
      );
      
      if (validQuestions.length === 0) {
        throw new Error('No valid questions generated. Please try again with different content.');
      }
      
      console.log(`✅ Found ${validQuestions.length} valid questions`);

      const formattedQuestions = validQuestions.map((q: any, index: number) => {
        const safeCorrectAnswer = Math.min(q.options.length - 1, Math.max(0, q.correctAnswer));
        
        return {
          id: `smart-${Date.now()}-${index}`,
          content: String(q.question || `Question ${index + 1}`),
          explanation: String(q.explanation || 'Explanation not available'),
          options: q.options.map((opt: string, idx: number) => ({
            text: String(opt || `Option ${idx + 1}`),
            correct: idx === safeCorrectAnswer
          })),
          category: { name: 'Smart Generated', id: 'smart-generated' }
        };
      });

      setGeneratedQuestions(formattedQuestions);
      setCbtQuestions(formattedQuestions);
      
      const sessionData = {
        id: `smart-session-${Date.now()}`,
        questions: formattedQuestions,
        numQuestions: smartNumQuestions,
        duration: smartDuration,
        createdAt: new Date().toISOString()
      };
      
      sessionStorage.setItem(`smart_session_${sessionData.id}`, JSON.stringify(sessionData));
      
      setSmartInputText('');
      setSmartUploadedFile(null);
      
      setCbtMode('practice');
      setShowSmartInputModal(false);
      switchSection('cbt-mode');
      
      toast.success(`Generated ${formattedQuestions.length} questions successfully! Duration: ${smartDuration} minutes`);
      
    } catch (error: any) {
      console.error('❌ Error generating questions:', error);
      toast.error(error.message || 'Failed to generate questions');
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSmartUploadedFile(file);
    }
  };

  const handleClearFile = () => {
    setSmartUploadedFile(null);
  };

  const initializeSmartSession = () => {
    if (generatedQuestions.length === 0) {
      toast.error('No questions generated yet');
      return;
    }

    const tempSessionId = `smart-session-${Date.now()}`;
    sessionStorage.setItem(`smart_questions_${tempSessionId}`, JSON.stringify(generatedQuestions));
    
    setCbtMode('practice');
    setCbtSelectedCategory(null);
    
    switchSection('cbt-question-display');
    setCbtCurrentQuestionIndex(0);
    setCbtAnswers({});
  };

  const handleSmartCategorySelect = () => {
    setCbtType('smart');
    setShowSmartInputModal(true);
  };

  const createCbtSession = async () => {
    if (cbtType === 'smart') {
      const tempSessionId = `smart-${Date.now()}`;
      return tempSessionId;
    }
    
    try {
      const sessionData = {
        userId: session?.user?.id!,
        cbtType: cbtType!,
        mode: cbtMode!,
        categoryId: cbtSelectedCategory === 'all' ? null : cbtSelectedCategory,
        numQuestions: cbtQuestions.length,
        duration: cbtMode === 'practice' ? null : cbtDuration,
      };

      const response = await fetch('/api/cbt-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) throw new Error('Failed to create session');
      const newSession = await response.json();
      return newSession.id;
    } catch (error) {
      console.error('Error creating CBT session:', error);
      toast.error('Failed to start session');
      return null;
    }
  };

  const saveCurrentAnswer = async () => {
    if (cbtSelectedAnswer === null) return;
    
    const question = cbtQuestions[cbtCurrentQuestionIndex];
    if (!question) return;

    if (cbtType === 'smart' || question.id.startsWith('smart-')) {
      const answerKey = `smart_answer_${question.id}`;
      sessionStorage.setItem(answerKey, cbtSelectedAnswer.toString());
      return;
    }

    try {
      await fetch('/api/save-cbt-selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: question.id,
          selectedOption: cbtSelectedAnswer,
          sessionId: cbtSessionId,
          firstAttempt: true,
        }),
      });
    } catch (error) {
      console.error('Failed to save answer:', error);
    }
  };

  const handleSmartCbtEndSessionInternal = async () => {
    setIsProcessing(true);
    React.startTransition(() => {
      setCurrentMedicalQuote(getRandomMedicalQuote());
    });
    
    try {
      const totalQuestions = cbtQuestions.length;
      const unanswered = cbtQuestions.filter((_, i) => cbtAnswers[i] === undefined).length;
      const attemptedQuestions = totalQuestions - unanswered;
      const correctAnswers = cbtQuestions.filter((q, i) => cbtAnswers[i] !== undefined && q.options[cbtAnswers[i]].correct).length;
      
      const successRate = attemptedQuestions === 0 ? 0 : Math.round((correctAnswers / attemptedQuestions) * 100);
      
      const finalScore = ['timed', 'exam'].includes(cbtMode || '') 
        ? Math.round((correctAnswers / totalQuestions) * 100)
        : successRate;

      if (cbtType === 'smart' || cbtQuestions[0]?.id?.startsWith('smart-')) {
        console.log('📊 Smart session completed:', {
          totalQuestions,
          attemptedQuestions,
          correctAnswers,
          successRate,
          finalScore,
          smartDuration
        });

        const summaryMessages = cbtQuestions.map((q, i) => {
          const selected = cbtAnswers[i];
          const isCorrect = selected !== undefined && q.options[selected].correct;
          return `Q${i+1}: ${selected !== undefined ? (isCorrect ? 'CORRECT' : 'WRONG') : 'UNANSWERED'}`;
        }).join(' | ');

        const feedbackRes = await fetch('/api/cbt-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            summaryMessages,
            correctAnswers,
            totalQuestions,
            unansweredQuestions: unanswered,
            finalScore: finalScore,
            mode: cbtMode,
          }),
        });

        if (feedbackRes.ok) {
          const feedbackData = await feedbackRes.json();
          setCbtOverallFeedback(feedbackData.feedback);
        }

        setCbtShowSummary(true);
        setCbtShowEndConfirm(false);
      } else {
        const sessionRes = await fetch('/api/cbt-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cbtType: cbtType,
            mode: cbtMode,
            categoryId: cbtSelectedCategory === 'all' ? null : cbtSelectedCategory,
            numQuestions: totalQuestions,
            duration: cbtDuration,
            score: finalScore,
            correctAnswers: correctAnswers,
            wrongAnswers: attemptedQuestions - correctAnswers,
            unanswered: unanswered,
          }),
        });

        if (!sessionRes.ok) {
          const errorText = await sessionRes.text();
          throw new Error(`Session creation failed: ${errorText}`);
        }

        const sessionData = await sessionRes.json();
        const sessionId = sessionData.id;
        setCurrentCbtSessionId(sessionId);

        const savePromises = [];
        
        for (let i = 0; i < cbtQuestions.length; i++) {
          const question = cbtQuestions[i];
          const selectedOption = cbtAnswers[i];
          
          if (selectedOption !== undefined) {
            savePromises.push(
              fetch('/api/save-cbt-selection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  questionId: question.id,
                  selectedOption: selectedOption,
                  sessionId: sessionId,
                  firstAttempt: true,
                }),
              }).then(async (res) => {
                if (!res.ok) {
                  const error = await res.text();
                  console.error(`❌ Failed to save selection ${i}:`, error);
                } else {
                  console.log(`✅ Saved selection ${i}`);
                }
                return res;
              })
            );
          }
        }

        const results = await Promise.allSettled(savePromises);
        const successfulSaves = results.filter(r => r.status === 'fulfilled').length;
        
        console.log('✅ [SESSION DEBUG] Selection save results:', {
          total: savePromises.length,
          successful: successfulSaves,
          failed: results.length - successfulSaves
        });

        const summaryMessages = cbtQuestions.map((q, i) => {
          const selected = cbtAnswers[i];
          const isCorrect = selected !== undefined && q.options[selected].correct;
          return `Q${i+1}: ${selected !== undefined ? (isCorrect ? 'CORRECT' : 'WRONG') : 'UNANSWERED'}`;
        }).join(' | ');

        const feedbackRes = await fetch('/api/cbt-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            summaryMessages,
            correctAnswers,
            totalQuestions,
            unansweredQuestions: unanswered,
            finalScore: finalScore,
            mode: cbtMode,
          }),
        });

        if (feedbackRes.ok) {
          const feedbackData = await feedbackRes.json();
          setCbtOverallFeedback(feedbackData.feedback);
        }

        setCbtShowSummary(true);
        setCbtShowEndConfirm(false);
      }

    } catch (error) {
      console.error('❌ [SESSION DEBUG] Error ending session:', error);
      toast.error('Failed to end session');
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        React.startTransition(() => {
          setShowLoadingPopup(false);
        });
      }, 500);
    }
  };

  useEffect(() => {
    const loadSmartQuestions = () => {
      const smartSessionKeys = Object.keys(sessionStorage)
        .filter(key => key.startsWith('smart_questions_'));
      
      if (smartSessionKeys.length > 0) {
        const latestKey = smartSessionKeys[smartSessionKeys.length - 1];
        const questions = JSON.parse(sessionStorage.getItem(latestKey) || '[]');
        if (questions.length > 0) {
          setGeneratedQuestions(questions);
          setCbtQuestions(questions);
        }
      }
    };
    
    loadSmartQuestions();
  }, []);

  useEffect(() => {
    const cleanOldSmartSessions = () => {
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('smart_questions_') || key.startsWith('smart_answer_')) {
          const timestamp = parseInt(key.split('-').pop() || '0');
          if (now - timestamp > oneDay) {
            sessionStorage.removeItem(key);
          }
        }
      });
    };
    
    cleanOldSmartSessions();
  }, []);

  const QuestionNumberGrid = () => (
    <div className={cn("backdrop-blur-sm rounded-2xl p-6 shadow-lg", isDark ? "bg-gray-800/80 border border-gray-700/50" : "bg-gradient-to-br from-blue-50/80 to-indigo-100/80 border border-blue-100/50")}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={cn("font-semibold flex items-center", isDark ? "text-gray-200" : "text-slate-700")}>
          <i className="fas fa-list-ol mr-2 text-blue-500"></i>
          Questions
        </h3>
        <span className={cn("text-sm px-3 py-1 rounded-full", isDark ? "bg-gray-700/50 text-gray-300" : "bg-white/80 text-slate-500")}>
          {cbtCurrentQuestionIndex + 1}/{cbtQuestions.length}
        </span>
      </div>
      
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 gap-3 max-h-[60vh] overflow-y-auto">
        {cbtQuestions.map((_, index) => {
          const status = getQuestionStatus(index);
          const isCurrent = index === cbtCurrentQuestionIndex;
          
          const statusConfig = {
            unanswered: { 
              bg: isDark ? 'bg-gray-700/50' : 'bg-white/80', 
              border: isDark ? 'border-gray-600' : 'border-slate-200', 
              text: isDark ? 'text-gray-300' : 'text-slate-600' 
            },
            correct: { 
              bg: isDark ? 'bg-emerald-900/30' : 'bg-emerald-500/20', 
              border: isDark ? 'border-emerald-800' : 'border-emerald-200', 
              text: isDark ? 'text-emerald-300' : 'text-emerald-700' 
            },
            incorrect: { 
              bg: isDark ? 'bg-rose-900/30' : 'bg-rose-500/20', 
              border: isDark ? 'border-rose-800' : 'border-rose-200', 
              text: isDark ? 'text-rose-300' : 'text-rose-700' 
            },
            current: { 
              bg: isDark ? 'bg-blue-900/30' : 'bg-blue-500/20', 
              border: isDark ? 'border-blue-700' : 'border-blue-300', 
              text: isDark ? 'text-blue-300' : 'text-blue-700' 
            }
          };

          const config = isCurrent ? statusConfig.current : statusConfig[status];

          return (
            <button
              key={index}
              onClick={() => {
                handleCbtJumpToQuestion(index);
                setShowQuestionDrawer(false);
              }}
              className={cn(
                "w-10 h-10 rounded-xl border-2 font-medium transition-all duration-200 hover:scale-105 hover:shadow-md flex items-center justify-center",
                config.bg,
                config.border,
                config.text,
                isCurrent && "ring-2 ring-blue-400/50 shadow-lg"
              )}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {isAnalysing && (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-800/20 to-purple-800/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={cn("rounded-2xl p-6 flex flex-col items-center min-w-[300px] md:min-w-[400px] max-w-md shadow-2xl", isDark ? "bg-gray-900/95 border border-gray-700/50" : "bg-white/95 border border-blue-100/50")}>
            <div className="relative mb-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
              <div className="absolute inset-0 rounded-full h-16 w-16 border-t-2 border-blue-300 animate-pulse"></div>
            </div>
           
            <p className={cn("font-semibold mb-2 text-center text-lg", isDark ? "text-gray-200" : "text-slate-700")}>Analyzing your answer...</p>
            <div className={cn("flex items-center mb-6", isDark ? "text-gray-400" : "text-slate-500")}>
              <span className="animate-pulse">Processing</span>
              <span className="animate-pulse delay-100">.</span>
              <span className="animate-pulse delay-200">.</span>
              <span className="animate-pulse delay-300">.</span>
            </div>
           
            {currentMedicalQuote && (
              <div className={cn("border-l-4 p-6 rounded-xl mb-6 w-full text-center backdrop-blur-sm", isDark ? "bg-blue-900/30 border-blue-400" : "bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-blue-400")}>
                <div className="flex flex-col items-center">
                  <i className="fas fa-user-md text-blue-500 mb-3 text-2xl"></i>
                  <p className={cn("text-base italic leading-relaxed", isDark ? "text-gray-300" : "text-slate-700")}>"{currentMedicalQuote.text}"</p>
                  <p className={cn("text-sm mt-3 font-medium", isDark ? "text-gray-400" : "text-slate-600")}>— {currentMedicalQuote.author}</p>
                </div>
              </div>
            )}
           
            <div className="w-full bg-slate-200/80 rounded-full h-3 mt-2 overflow-hidden">
              <div 
                className="h-3 rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: '100%',
                  background: 'linear-gradient(90deg, #3b82f6, #60a5fa, #3b82f6)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 2s infinite'
                }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {showCbtFeedbackModal && cbtFeedback && (
        <div 
          className="fixed inset-0 bg-gradient-to-br from-blue-800/20 to-purple-800/20 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={handleBackdropClick}
        >
          <div className={cn("rounded-2xl shadow-2xl p-8 max-w-4xl w-full md:w-3/4 max-h-[90vh] overflow-y-auto relative", isDark ? "bg-gray-900/95 border border-gray-700/50" : "bg-white/95 border border-blue-100/50")}>
            <button
              onClick={handleCloseFeedbackModal}
              className={cn("absolute top-6 right-6 transition-colors z-10 rounded-xl p-3 shadow-lg hover:shadow-xl", isDark ? "text-gray-400 hover:text-gray-200 bg-gray-800/90 hover:bg-gray-800" : "text-slate-400 hover:text-slate-600 bg-white/90 hover:bg-white")}
            >
              <i className="fas fa-times text-xl"></i>
            </button>

            <h3 className={cn("text-2xl font-bold mb-8 flex items-center justify-center", isDark ? "text-gray-100" : "text-slate-800")}>
              <i className="fas fa-comment-medical mr-3 text-blue-500" />Answer Feedback
            </h3>

            <div className="space-y-8">
              <div className="text-center">
                {cbtFeedback.isCorrect ? (
                  <i className="fas fa-check-circle text-emerald-500 text-8xl animate-bounce" />
                ) : (
                  <i className="fas fa-times-circle text-rose-500 text-8xl animate-bounce" />
                )}
                <p className={cn("text-center text-2xl mt-6 font-semibold", isDark ? "text-gray-300" : "text-slate-600")}>
                  {cbtFeedback.isCorrect ? 'Excellent! Correct Answer!' : 'Incorrect - Better Luck Next Time!'}
                </p>
              </div>

              <div className={cn("p-8 rounded-2xl border backdrop-blur-sm", isDark ? "bg-blue-900/30 border-blue-800/50" : "bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-blue-200/50")}>
                <h4 className={cn("font-bold mb-4 flex items-center text-xl", isDark ? "text-gray-200" : "text-slate-800")}>
                  <i className="fas fa-lightbulb mr-3 text-blue-500" />Detailed Explanation
                </h4>
                <div
                  className={cn("text-lg leading-relaxed prose prose-lg max-w-none", isDark ? "text-gray-300" : "text-slate-700")}
                  dangerouslySetInnerHTML={{
                    __html: cbtFeedback.explanation
                      .replace(/&quot;/g, '"')
                      .replace(/&#39;/g, "'")
                      .replace(/&amp;/g, '&')
                      .replace(/&lt;/g, '<')
                      .replace(/&gt;/g, '>'),
                  }}
                />
              </div>

              <div className={cn("p-6 rounded-2xl border backdrop-blur-sm", isDark ? "bg-purple-900/30 border-purple-800/50" : "bg-gradient-to-r from-purple-50/80 to-pink-50/80 border-purple-200/50")}>
                <h4 className={cn("font-bold mb-4 flex items-center text-xl", isDark ? "text-gray-200" : "text-slate-800")}>
                  <i className="fas fa-robot mr-3 text-purple-500" />
                  <span className="flex items-center">
                    AI Clinical Insights
                    {cbtAiExplanation && isAnalysing && (
                      <span className="ml-2 text-xs font-normal text-purple-600 bg-purple-100 px-2 py-1 rounded-full animate-pulse dark:bg-purple-900/50 dark:text-purple-300">
                        Typing...
                      </span>
                    )}
                  </span>
                </h4>
                
                <AiExplanationWithTyping 
                  explanation={cbtAiExplanation} 
                  isAnalyzing={isAnalysing}
                />
              </div>

              {cbtOptionPercentages[cbtQuestions[cbtCurrentQuestionIndex]?.id] && (
                <div className={cn("p-8 rounded-2xl border backdrop-blur-sm", isDark ? "bg-emerald-900/30 border-emerald-800/50" : "bg-gradient-to-r from-emerald-50/80 to-green-50/80 border-emerald-200/50")}>
                  <h4 className={cn("font-bold mb-6 flex items-center text-xl", isDark ? "text-gray-200" : "text-slate-800")}>
                    <i className="fas fa-chart-bar mr-3 text-emerald-500" />Community Performance
                  </h4>
                  <div className="space-y-6">
                    {cbtQuestions[cbtCurrentQuestionIndex]?.options.map(
                      (opt: { text: string; correct: boolean }, idx: number) => {
                        const st = cbtOptionPercentages[cbtQuestions[cbtCurrentQuestionIndex]?.id]?.[idx];
                        const pct = st?.pct ?? 0;
                        const total = st?.totalPicked ?? 0;
                        const barColor = st?.isCorrect 
                          ? 'bg-gradient-to-r from-emerald-500 to-green-500' 
                          : 'bg-gradient-to-r from-rose-500 to-pink-500';
                        const textColor = st?.isCorrect ? (isDark ? 'text-emerald-300' : 'text-emerald-700') : (isDark ? 'text-rose-300' : 'text-rose-700');
                        
                        return (
                          <div key={idx} className="flex items-center gap-6">
                            <span className={cn(`w-48 text-base font-semibold truncate`, textColor)}>
                              {opt.text}
                            </span>

                            <div className="flex-1 rounded-full h-7 overflow-hidden shadow-inner">
                              <div
                                className={`h-full ${barColor} transition-all duration-1000 ease-out rounded-full shadow-sm`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>

                            <span className={cn("text-sm font-bold whitespace-nowrap min-w-[100px] text-right", isDark ? "text-gray-400" : "text-slate-600")}>
                              {pct}% ({total})
                            </span>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              )}

              {(cbtAiExplanation || cbtOptionPercentages[cbtQuestions[cbtCurrentQuestionIndex]?.id]) && (
                <hr className={cn("my-8", isDark ? "border-t border-gray-700/60" : "border-t border-slate-200/60")} />
              )}
            </div>

            <div className="flex justify-center mt-10">
              <button
                onClick={handleCloseFeedbackModal}
                className="continue-next px-12 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center text-lg font-bold shadow-2xl hover:shadow-3xl relative overflow-hidden"
              >
                <i className="fas fa-arrow-right mr-4 transition-transform group-hover:translate-x-1" />
                Continue to Next Question
              </button>
            </div>
          </div>
        </div>
      )}

      {cbtShowEndConfirm && (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-800/20 to-purple-800/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={cn("rounded-2xl shadow-2xl p-8 max-w-md w-full", isDark ? "bg-gray-900/95 border border-gray-700/50" : "bg-white/95 border border-blue-100/50")}>
            {isProcessing ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-6" />
                <h3 className={cn("text-xl font-bold mb-4", isDark ? "text-gray-200" : "text-slate-800")}>Processing your results…</h3>
                {currentMedicalQuote && (
                  <div className={cn("border-l-4 p-6 rounded-xl mt-6", isDark ? "bg-blue-900/30 border-blue-400" : "bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-blue-400")}>
                    <div className="flex items-start">
                      <i className="fas fa-user-md text-blue-500 mr-4 mt-1 text-xl" />
                      <div>
                        <p className={cn("text-base italic", isDark ? "text-gray-300" : "text-slate-700")}>"{currentMedicalQuote.text}"</p>
                        <p className={cn("text-sm mt-2 font-medium", isDark ? "text-gray-400" : "text-slate-600")}>— {currentMedicalQuote.author}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <h3 className={cn("text-xl font-bold mb-6 flex items-center justify-center", isDark ? "text-gray-200" : "text-slate-800")}>
                  <i className="fas fa-exclamation-triangle mr-3 text-amber-500" />End Session?
                </h3>
                <p className={cn("text-center mb-8 text-lg", isDark ? "text-gray-300" : "text-slate-600")}>Are you sure you want to end this examination session?</p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => setCbtShowEndConfirm(false)}
                    className="hand-cursor hover-lift px-8 py-3 bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-xl hover:from-slate-600 hover:to-slate-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
                  >
                    <i className="fas fa-times mr-2"></i>Cancel
                  </button>
                  <button
                    onClick={() => {
                      setIsProcessing(true);
                      handleSmartCbtEndSessionInternal();
                    }}
                    className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
                  >
                    <i className="fas fa-check mr-2" />Yes, End Session
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {cbtShowSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-900/40 to-purple-900/40 backdrop-blur-sm">
          {isAnalysing && (
            <div className={cn("rounded-2xl p-10 max-w-md text-center shadow-2xl", isDark ? "bg-gray-900/95 border border-gray-700/50" : "bg-white/95 border border-blue-100/50")}>
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-6" />
              <p className={cn("mb-6 text-lg", isDark ? "text-gray-300" : "text-slate-600")}>Analysing your performance…</p>
              
              {currentMedicalQuote && (
                <div className={cn("border-l-4 p-6 rounded-xl mb-6", isDark ? "bg-blue-900/30 border-blue-400" : "bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-blue-400")}>
                  <div className="flex flex-col items-center">
                    <i className="fas fa-user-md text-blue-500 mb-3 text-2xl"></i>
                    <p className={cn("text-base italic leading-relaxed", isDark ? "text-gray-300" : "text-slate-700")}>"{currentMedicalQuote.text}"</p>
                    <p className={cn("text-sm mt-2 font-medium", isDark ? "text-gray-400" : "text-slate-600")}>— {currentMedicalQuote.author}</p>
                  </div>
                </div>
              )}
              
              <div className="w-full bg-slate-200/80 rounded-full h-3 overflow-hidden">
                <div 
                  className="h-3 rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: '100%',
                    background: 'linear-gradient(90deg, #3b82f6, #60a5fa, #3b82f6)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 2s infinite'
                  }}
                ></div>
              </div>
            </div>
          )}

          {!isAnalysing && (
            <div className={cn("rounded-2xl shadow-2xl w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto", isDark ? "bg-gray-900/95 border border-gray-700/50" : "bg-white/95 border border-blue-100/50")}>
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <h2 className={cn("text-3xl font-bold flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
                    <i className="fas fa-trophy mr-4 text-yellow-500" />Session Summary
                  </h2>
                  <button
                    onClick={() => {
                      setCbtShowSummary(false);
                      switchSection('cbt-intro');
                    }}
                    className={cn("transition-colors rounded-xl p-3 shadow-lg", isDark ? "text-gray-400 hover:text-gray-200 bg-gray-800/80 hover:bg-gray-800" : "text-slate-400 hover:text-slate-600 bg-white/80 hover:bg-white")}
                    aria-label="Close"
                  >
                    <i className="fas fa-times text-xl" />
                  </button>
                </div>

                {(() => {
                  const totalQuestions = cbtQuestions.length;
                  const unanswered = cbtQuestions.filter((_, i) => cbtAnswers[i] === undefined).length;
                  const attemptedQuestions = totalQuestions - unanswered;
                  const correctAnswers = cbtQuestions.filter((q, i) => cbtAnswers[i] !== undefined && q.options[cbtAnswers[i]].correct).length;
                  
                  const successRate = attemptedQuestions === 0 ? 0 : Math.round((correctAnswers / attemptedQuestions) * 100);
                  
                  const finalScore = ['timed', 'exam'].includes(cbtMode || '') 
                    ? Math.round((correctAnswers / totalQuestions) * 100)
                    : successRate;

                  console.log('📊 [SUMMARY DEBUG] Displaying:', {
                    totalQuestions,
                    attemptedQuestions,
                    correctAnswers,
                    successRate,
                    finalScore,
                    mode: cbtMode
                  });

                  return (
                    <div className={cn("border-l-4 p-8 rounded-2xl mb-8", isDark ? "bg-blue-900/30 border-blue-400" : "bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-blue-400")}>
                      <h3 className={cn("font-bold mb-6 text-xl flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
                        <i className="fas fa-chart-line mr-3 text-blue-500" />Performance Overview
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                        <div className={cn("text-center p-4 rounded-xl shadow-sm", isDark ? "bg-gray-800/80" : "bg-white/80")}>
                          <div className={cn("text-2xl font-bold mb-2", isDark ? "text-gray-200" : "text-slate-800")}>{totalQuestions}</div>
                          <div className={cn("text-sm", isDark ? "text-gray-400" : "text-slate-600")}>Total Questions</div>
                        </div>
                        <div className={cn("text-center p-4 rounded-xl shadow-sm", isDark ? "bg-gray-800/80" : "bg-white/80")}>
                          <div className={cn("text-2xl font-bold mb-2", isDark ? "text-gray-200" : "text-slate-800")}>{attemptedQuestions}</div>
                          <div className={cn("text-sm", isDark ? "text-gray-400" : "text-slate-600")}>Attempted</div>
                        </div>
                        <div className={cn("text-center p-4 rounded-xl shadow-sm", isDark ? "bg-gray-800/80" : "bg-white/80")}>
                          <div className={cn("text-2xl font-bold mb-2", isDark ? "text-gray-200" : "text-slate-800")}>{correctAnswers}</div>
                          <div className={cn("text-sm", isDark ? "text-gray-400" : "text-slate-600")}>Correct Answers</div>
                        </div>
                        <div className={cn("text-center p-4 rounded-xl shadow-sm", isDark ? "bg-gray-800/80" : "bg-white/80")}>
                          <div className={cn("text-2xl font-bold mb-2", isDark ? "text-gray-200" : "text-slate-800")}>{successRate}%</div>
                          <div className={cn("text-sm", isDark ? "text-gray-400" : "text-slate-600")}>Success Rate</div>
                          <div className={cn("text-xs mt-1", isDark ? "text-gray-500" : "text-slate-500")}>(Based on attempted)</div>
                        </div>
                        <div className={cn("text-center p-4 rounded-xl shadow-sm border", isDark ? "bg-emerald-900/30 border-emerald-800" : "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200")}>
                          <div className={cn("text-2xl font-bold mb-2", isDark ? "text-emerald-300" : "text-emerald-800")}>{finalScore}%</div>
                          <div className={cn("text-sm font-semibold", isDark ? "text-emerald-300" : "text-emerald-700")}>Final Score</div>
                          <div className={cn("text-xs mt-1", isDark ? "text-emerald-400/70" : "text-emerald-600")}>
                            {['timed', 'exam'].includes(cbtMode || '') 
                              ? 'Based on total questions' 
                              : 'Based on attempted'}
                          </div>
                        </div>
                      </div>
                      
                      <div className={cn("mt-6 p-4 rounded-xl border", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
                        <div className={cn("text-sm", isDark ? "text-gray-300" : "text-slate-700")}>
                          <strong>Scoring Explanation:</strong>
                          {['timed', 'exam'].includes(cbtMode || '') ? (
                            <span> Final score calculated relevant to <strong>(Correct Answers vs Total Questions)</strong> to simulate real exam conditions.</span>
                          ) : (
                            <span> Final score calculated as <strong>(Correct Answers vs Attempted Questions)</strong> to focus on learning progress peculiar to <strong>Practice Mode</strong>.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className={cn("p-8 rounded-2xl border mb-8", isDark ? "bg-emerald-900/30 border-emerald-800/50" : "bg-gradient-to-r from-emerald-50/80 to-green-50/80 border-emerald-200/50")}>
                  <h4 className={cn("font-bold mb-4 flex items-center text-xl", isDark ? "text-gray-200" : "text-slate-800")}>
                    <i className="fas fa-robot mr-3 text-emerald-500" />AI Performance Analysis
                  </h4>
                  <p className={cn("leading-relaxed text-lg", isDark ? "text-gray-300" : "text-slate-700")}>{cbtOverallFeedback}</p>
                </div>

                <div className="flex justify-center gap-6">
                  <button
                    onClick={() => {
                      setCbtShowSummary(false);
                      switchSection('cbt-intro');
                    }}
                    className="px-12 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center text-lg font-bold shadow-2xl hover:shadow-3xl transform hover:scale-105"
                  >
                    <i className="fas fa-home mr-3" />Back to Dashboard
                  </button>
                  
                  {cbtType === 'smart' && (
                    <button
                      onClick={() => {
                        router.push('/dashboard');
                      }}
                      className="px-12 py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-2xl hover:from-emerald-600 hover:to-green-700 transition-all duration-300 flex items-center text-lg font-bold shadow-2xl hover:shadow-3xl transform hover:scale-105"
                    >
                      <i className="fas fa-rocket mr-3" />Return to Main Dashboard
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showSmartInputModal && (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-800/20 to-purple-800/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={cn("rounded-2xl shadow-2xl p-8 max-w-4xl w-full md:w-3/4 max-h-[90vh] overflow-y-auto", isDark ? "bg-gray-900/95 border border-gray-700/50" : "bg-white/95 border border-blue-100/50")}>
            <div className="flex justify-between items-center mb-8">
              <h2 className={cn("text-3xl font-bold flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
                <i className="fas fa-brain mr-4 text-purple-500"></i>Smart Question Generator
              </h2>
              <button
                onClick={() => {
                  setShowSmartInputModal(false);
                  setCbtType(null);
                }}
                className={cn("transition-colors rounded-xl p-3 shadow-lg", isDark ? "text-gray-400 hover:text-gray-200 bg-gray-800/80 hover:bg-gray-800" : "text-slate-400 hover:text-slate-600 bg-white/80 hover:bg-white")}
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            
            <div className="space-y-8">
              <div className={cn("p-6 rounded-2xl border backdrop-blur-sm", isDark ? "bg-blue-900/30 border-blue-800/50" : "bg-gradient-to-r from-blue-50/80 to-indigo-50/60 border-blue-200/50")}>
                <h3 className={cn("font-bold mb-4 flex items-center text-xl", isDark ? "text-gray-200" : "text-slate-800")}>
                  <i className="fas fa-font mr-3 text-blue-500"></i>Text Input
                </h3>
                <div className="mb-4">
                  <label className={cn("block text-sm font-medium mb-2", isDark ? "text-gray-300" : "text-slate-600")}>
                    Enter medical text (max 10,000 characters)
                  </label>
                  <textarea
                    value={smartInputText}
                    onChange={(e) => setSmartInputText(e.target.value)}
                    maxLength={10000}
                    rows={8}
                    className={cn("w-full p-4 rounded-xl focus:ring-4 transition-all duration-200 text-lg", isDark ? "bg-gray-800 border-2 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200 placeholder:text-gray-500" : "border-2 border-slate-200/50 focus:border-blue-400 focus:ring-4 focus:ring-blue-100")}
                    placeholder="Paste medical content here. AI will generate questions from this text..."
                  />
                  <div className={cn("text-right text-sm mt-2", isDark ? "text-gray-400" : "text-slate-500")}>
                    {smartInputText.length}/10000 characters
                  </div>
                </div>
                
                <div className={cn("my-4 flex items-center justify-center", isDark ? "text-gray-400" : "text-slate-600")}>
                  <hr className={cn("flex-grow", isDark ? "border-gray-700" : "border-slate-300/50")} />
                  <span className="mx-4">OR</span>
                  <hr className={cn("flex-grow", isDark ? "border-gray-700" : "border-slate-300/50")} />
                </div>
                
                <div>
                  <h3 className={cn("font-bold mb-4 flex items-center text-xl", isDark ? "text-gray-200" : "text-slate-800")}>
                    <i className="fas fa-file-upload mr-3 text-emerald-500"></i>Document Upload
                  </h3>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2 text-slate-600 dark:text-gray-300">
                      Upload PDF, DOC, DOCX, or TXT files
                    </label>
                    <div className="flex items-center space-x-4">
                      <label className="flex-1 cursor-pointer">
                        <div className={cn("border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200", isDark ? "border-gray-700 hover:border-emerald-500 hover:bg-emerald-900/20" : "border-slate-300/50 hover:border-emerald-400 hover:bg-emerald-50/30")}>
                          <i className="fas fa-cloud-upload-alt text-3xl text-emerald-400 mb-4"></i>
                          <p className={cn("font-medium", isDark ? "text-gray-300" : "text-slate-600")}>Click to upload document</p>
                          <p className={cn("text-sm mt-2", isDark ? "text-gray-400" : "text-slate-500")}>Supports: .pdf, .doc, .docx, .txt</p>
                        </div>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.txt"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    
                    {smartUploadedFile && (
                      <div className={cn("mt-4 p-4 rounded-xl border", isDark ? "bg-emerald-900/30 border-emerald-800/50" : "bg-emerald-50/50 border-emerald-200/50")}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <i className="fas fa-file text-emerald-500 mr-3"></i>
                            <div>
                              <p className={cn("font-medium", isDark ? "text-gray-200" : "text-slate-800")}>{smartUploadedFile.name}</p>
                              <p className={cn("text-sm", isDark ? "text-gray-400" : "text-slate-600")}>
                                {(smartUploadedFile.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={handleClearFile}
                            className="text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className={cn("p-6 rounded-2xl border", isDark ? "bg-amber-900/30 border-amber-800/50" : "bg-gradient-to-r from-amber-50/80 to-yellow-50/80 border-amber-200/50")}>
                <h3 className={cn("font-bold mb-3 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
                  <i className="fas fa-coins mr-3 text-amber-500"></i>Token Information
                </h3>
                <p className={cn(isDark ? "text-gray-300" : "text-slate-700")}>
                  This operation costs <span className="font-bold text-amber-600 dark:text-amber-400">5 tokens</span>.
                  Questions are generated using AI and are not saved to the database.
                  All progress is stored temporarily in your browser session.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className={cn("p-6 rounded-2xl border shadow-sm", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
                  <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
                    <i className="fas fa-list-ol mr-3 text-blue-500"></i>Number of Questions to Generate
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={smartNumQuestions}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 10;
                      setSmartNumQuestions(Math.min(50, Math.max(1, val)));
                    }}
                    className={cn("w-full p-4 rounded-xl focus:ring-4 transition-all duration-200 text-lg", isDark ? "bg-gray-800 border-2 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200" : "border-2 border-slate-200/50 focus:border-blue-400 focus:ring-4 focus:ring-blue-100")}
                  />
                  <p className={cn("text-sm mt-2", isDark ? "text-gray-400" : "text-slate-500")}>Max: 50 questions</p>
                </div>
                
                <div className={cn("p-6 rounded-2xl border shadow-sm", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-amber-100/50")}>
                  <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
                    <i className="fas fa-clock mr-3 text-amber-500"></i>Duration to Complete (minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={300}
                    value={smartDuration}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 60;
                      setSmartDuration(Math.min(300, Math.max(1, val)));
                    }}
                    className={cn("w-full p-4 rounded-xl focus:ring-4 transition-all duration-200 text-lg", isDark ? "bg-gray-800 border-2 border-gray-700 focus:border-amber-500 focus:ring-amber-900/30 text-gray-200" : "border-2 border-slate-200/50 focus:border-amber-400 focus:ring-4 focus:ring-amber-100")}
                  />
                  <p className={cn("text-sm mt-2", isDark ? "text-gray-400" : "text-slate-500")}>Max: 300 minutes (5 hours)</p>
                </div>
              </div>
              
              <div className={cn("flex justify-end gap-4 pt-6", isDark ? "border-t border-gray-700/50" : "border-t border-slate-200/50")}>
                <button
                  onClick={() => {
                    setShowSmartInputModal(false);
                    setCbtType(null);
                  }}
                  className={cn("px-8 py-4 rounded-xl transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl", isDark ? "border-2 border-gray-700 hover:border-gray-600 hover:bg-gray-800/80 text-gray-300" : "border-2 border-slate-200/50 hover:border-slate-400 hover:bg-slate-50/80")}
                >
                  <i className="fas fa-times mr-3"></i>Cancel
                </button>
                
                <button
                  onClick={handleSmartGenerateQuestions}
                  disabled={isGeneratingQuestions || (!smartInputText.trim() && !smartUploadedFile)}
                  className={cn(
                    "px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl transform hover:scale-105",
                    (isGeneratingQuestions || (!smartInputText.trim() && !smartUploadedFile)) &&
                      "opacity-50 cursor-not-allowed hover:scale-100"
                  )}
                >
                  {isGeneratingQuestions ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-3"></i>
                      Generating Questions...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-bolt mr-3"></i>
                      Generate {smartNumQuestions} Questions ({smartDuration} min)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentSection === 'cbt-examination' && (
        <div className={cn("rounded-3xl shadow-xl p-10 backdrop-blur-sm relative overflow-hidden", isDark ? "bg-gray-800/90 border border-gray-700/50" : "bg-gradient-to-br from-white/95 to-blue-50/95 border border-blue-100/50")}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-200/30 to-purple-200/20 rounded-full -translate-y-32 translate-x-32 dark:from-blue-900/20 dark:to-purple-900/10"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-cyan-100/30 to-blue-100/30 rounded-full translate-y-24 -translate-x-24 dark:from-cyan-900/20 dark:to-blue-900/10"></div>
          
          <h2 className={cn("text-4xl font-bold mb-10 flex items-center relative z-10 font-sans tracking-tight", isDark ? "text-gray-100" : "text-slate-800")}>
            <i className="fas fa-laptop-medical mr-5 text-blue-500 text-3xl"></i>
            CBT Examination Portal
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto relative z-10">
            <button 
              onClick={() => handleCardClick('cbt-mdcn')} 
              className={cn("group border-2 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 backdrop-blur-sm relative overflow-hidden", isDark ? "bg-blue-900/30 border-blue-800/50 hover:border-blue-700" : "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300/60 hover:border-blue-400")}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="text-center relative z-10">
                <div className={cn("inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 transition-colors duration-300", isDark ? "bg-blue-800/50 group-hover:bg-blue-700/50" : "bg-blue-200/70 group-hover:bg-blue-300/80")}>
                  <i className="fas fa-file-medical text-2xl text-blue-600 group-hover:scale-110 transition-transform duration-300 dark:text-blue-400"></i>
                </div>
                <h3 className={cn("text-xl font-bold mb-3 font-sans tracking-wide", isDark ? "text-gray-100" : "text-slate-800")}>MDCN</h3>
                <p className={cn("text-sm font-medium", isDark ? "text-gray-300" : "text-slate-600")}>Medical and Dental Council</p>
              </div>
            </button>

            <button 
              onClick={() => handleCardClick('cbt-mbbs')} 
              className={cn("group border-2 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 backdrop-blur-sm relative overflow-hidden", isDark ? "bg-purple-900/30 border-purple-800/50 hover:border-purple-700" : "bg-gradient-to-br from-purple-50 to-purple-100 border-purple-300/60 hover:border-purple-400")}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="text-center relative z-10">
                <div className={cn("inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 transition-colors duration-300", isDark ? "bg-purple-800/50 group-hover:bg-purple-700/50" : "bg-purple-200/70 group-hover:bg-purple-300/80")}>
                  <i className="fas fa-graduation-cap text-2xl text-purple-600 group-hover:scale-110 transition-transform duration-300 dark:text-purple-400"></i>
                </div>
                <h3 className={cn("text-xl font-bold mb-3 font-sans tracking-wide", isDark ? "text-gray-100" : "text-slate-800")}>MBBS</h3>
                <p className={cn("text-sm font-medium", isDark ? "text-gray-300" : "text-slate-600")}>Bachelor of Medicine</p>
              </div>
            </button>

            <button 
              onClick={handleSmartCategorySelect} 
              className={cn("group border-2 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 backdrop-blur-sm relative overflow-hidden", isDark ? "bg-emerald-900/30 border-emerald-800/50 hover:border-emerald-700" : "bg-gradient-to-br from-emerald-50 to-green-100 border-emerald-300/60 hover:border-emerald-400")}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-green-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="text-center relative z-10">
                <div className={cn("inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 transition-colors duration-300", isDark ? "bg-emerald-800/50 group-hover:bg-emerald-700/50" : "bg-emerald-200/70 group-hover:bg-emerald-300/80")}>
                  <i className="fas fa-brain text-2xl text-emerald-600 group-hover:scale-110 transition-transform duration-300 dark:text-emerald-400"></i>
                </div>
                <h3 className={cn("text-xl font-bold mb-3 font-sans tracking-wide", isDark ? "text-gray-100" : "text-slate-800")}>Smart Generator</h3>
                <p className={cn("text-sm font-medium", isDark ? "text-gray-300" : "text-slate-600")}>AI-Powered Question Generation</p>
              </div>
            </button>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white/30 to-transparent pointer-events-none dark:from-gray-900/30"></div>
        </div>
      )}

      {currentSection === 'cbt-intro' && cbtType && cbtType !== 'smart' && (
        <div className={cn("rounded-2xl shadow-lg p-8 backdrop-blur-sm", isDark ? "bg-gray-800/90 border border-gray-700/50" : "bg-gradient-to-br from-white/95 to-blue-50/95 border border-blue-100/50")}>
          <h2 className={cn("text-3xl font-bold mb-8 flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
            <i className="fas fa-file-medical mr-4 text-blue-500"></i>{cbtType.toUpperCase()} Examination
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <button 
              onClick={() => { setCbtMode('practice'); switchSection('cbt-mode'); }} 
              className={cn("group border-2 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 text-left backdrop-blur-sm", isDark ? "bg-gray-900/50 border-emerald-800/50 hover:border-emerald-700" : "bg-gradient-to-br from-white to-emerald-100/80 border-emerald-200/50 hover:border-emerald-400")}
            >
              <i className="fas fa-book-open text-3xl text-emerald-500 mb-4 group-hover:scale-110 transition-transform"></i>
              <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-gray-100" : "text-slate-800")}>Practice Mode</h3>
              <p className={cn("text-sm", isDark ? "text-gray-300" : "text-slate-600")}>Learn at your own pace with instant feedback</p>
            </button>
            <button 
              onClick={() => { setCbtMode('timed'); switchSection('cbt-mode'); }} 
              className={cn("group border-2 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 text-left backdrop-blur-sm", isDark ? "bg-gray-900/50 border-amber-800/50 hover:border-amber-700" : "bg-gradient-to-br from-white to-amber-100/80 border-amber-200/50 hover:border-amber-400")}
            >
              <i className="fas fa-clock text-3xl text-amber-500 mb-4 group-hover:scale-110 transition-transform"></i>
              <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-gray-100" : "text-slate-800")}>Timed Mode</h3>
              <p className={cn("text-sm", isDark ? "text-gray-300" : "text-slate-600")}>Simulate real exam conditions with time limits</p>
            </button>
            <button 
              onClick={() => { setCbtMode('exam'); switchSection('cbt-mode'); }} 
              className={cn("group border-2 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 text-left backdrop-blur-sm", isDark ? "bg-gray-900/50 border-rose-800/50 hover:border-rose-700" : "bg-gradient-to-br from-white to-rose-100/80 border-rose-200/50 hover:border-rose-400")}
            >
              <i className="fas fa-file-alt text-3xl text-rose-500 mb-4 group-hover:scale-110 transition-transform"></i>
              <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-gray-100" : "text-slate-800")}>Exam Mode</h3>
              <p className={cn("text-sm", isDark ? "text-gray-300" : "text-slate-600")}>Full-length examination simulation</p>
            </button>
          </div>
          {session?.user?.role === 'admin' && (
            <div className={cn("flex flex-wrap justify-center gap-4 pt-6", isDark ? "border-t border-gray-700/50" : "border-t border-slate-200/50")}>
              <button onClick={() => switchSection('cbt-create-category')} className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl">
                <i className="fas fa-plus mr-3"></i>Create Department
              </button>
              <button onClick={() => switchSection('cbt-create-question')} className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl">
                <i className="fas fa-question mr-3"></i>Create Question
              </button>
              <button onClick={() => openManageList('cbt-category')} className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl">
                <i className="fas fa-edit mr-3"></i>Manage Department
              </button>
              <button onClick={() => openManageList('cbt-question')} className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl">
                <i className="fas fa-edit mr-3"></i>Manage Question
              </button>
              <label className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl cursor-pointer">
                <i className="fas fa-file-import mr-3"></i>Import CSV
                <input type="file" accept=".csv" onChange={handleImportCsv} className="hidden" />
              </label>
            </div>
          )}
        </div>
      )}

      {currentSection === 'cbt-mode' && cbtMode && cbtType && cbtType === 'smart' && (
        <div className={cn("rounded-2xl shadow-lg p-8 backdrop-blur-sm", isDark ? "bg-gray-800/90 border border-emerald-800/50" : "bg-gradient-to-br from-white/95 to-emerald-50/95 border border-emerald-100/50")}>
          <h2 className={cn("text-2xl font-bold mb-6 flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
            <i className="fas fa-brain mr-4 text-emerald-500"></i>Smart Question Generator Mode
          </h2>
          
          {generatedQuestions.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-question-circle text-6xl text-emerald-300 mb-6"></i>
              <p className={cn("text-lg mb-8", isDark ? "text-gray-300" : "text-slate-600")}>No questions generated yet. Please go back and generate questions first.</p>
              <button
                onClick={() => setShowSmartInputModal(true)}
                className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl mx-auto"
              >
                <i className="fas fa-bolt mr-3"></i>
                Generate Questions
              </button>
            </div>
          ) : (
            <>
              <div className={cn("border-l-4 p-6 rounded-2xl mb-8", isDark ? "bg-emerald-900/30 border-emerald-400" : "bg-gradient-to-r from-emerald-50/80 to-green-50/80 border-emerald-400")}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={cn("font-bold text-xl mb-2", isDark ? "text-gray-200" : "text-slate-800")}>
                      Generated Questions Ready!
                    </h3>
                    <p className={isDark ? "text-gray-300" : "text-slate-600"}>
                      {generatedQuestions.length} questions ready for practice | Duration: {smartDuration} minutes
                    </p>
                  </div>
                  <div className={cn("px-4 py-2 rounded-xl font-bold", isDark ? "bg-emerald-900/50 text-emerald-300" : "bg-emerald-100 text-emerald-800")}>
                    {generatedQuestions.length} Qs
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <button 
                  onClick={() => { 
                    setCbtMode('practice'); 
                    initializeSmartSession();
                  }} 
                  className={cn("group border-2 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 text-left backdrop-blur-sm", isDark ? "bg-gray-900/50 border-emerald-800/50 hover:border-emerald-700" : "bg-gradient-to-br from-white to-emerald-100/80 border-emerald-200/50 hover:border-emerald-400")}
                >
                  <i className="fas fa-book-open text-3xl text-emerald-500 mb-4 group-hover:scale-110 transition-transform"></i>
                  <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-gray-100" : "text-slate-800")}>Practice Mode</h3>
                  <p className={cn("text-sm", isDark ? "text-gray-300" : "text-slate-600")}>Learn at your own pace with instant feedback</p>
                </button>
                
                <button 
                  onClick={() => { 
                    setCbtMode('timed'); 
                    initializeSmartSession();
                  }} 
                  className={cn("group border-2 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 text-left backdrop-blur-sm", isDark ? "bg-gray-900/50 border-amber-800/50 hover:border-amber-700" : "bg-gradient-to-br from-white to-amber-100/80 border-amber-200/50 hover:border-amber-400")}
                >
                  <i className="fas fa-clock text-3xl text-amber-500 mb-4 group-hover:scale-110 transition-transform"></i>
                  <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-gray-100" : "text-slate-800")}>Timed Mode</h3>
                  <p className={cn("text-sm", isDark ? "text-gray-300" : "text-slate-600")}>Simulate real exam conditions with time limits</p>
                </button>
                
                <button 
                  onClick={() => { 
                    setCbtMode('exam'); 
                    initializeSmartSession();
                  }} 
                  className={cn("group border-2 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 text-left backdrop-blur-sm", isDark ? "bg-gray-900/50 border-rose-800/50 hover:border-rose-700" : "bg-gradient-to-br from-white to-rose-100/80 border-rose-200/50 hover:border-rose-400")}
                >
                  <i className="fas fa-file-alt text-3xl text-rose-500 mb-4 group-hover:scale-110 transition-transform"></i>
                  <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-gray-100" : "text-slate-800")}>Exam Mode</h3>
                  <p className={cn("text-sm", isDark ? "text-gray-300" : "text-slate-600")}>Full-length examination simulation</p>
                </button>
              </div>
              
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setShowSmartInputModal(true)}
                  className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
                >
                  <i className="fas fa-sync-alt mr-3"></i>
                  Generate New Questions
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {currentSection === 'cbt-mode' && cbtMode && cbtType && cbtType !== 'smart' && (
        <div className={cn("rounded-2xl shadow-lg p-8 backdrop-blur-sm", isDark ? "bg-gray-800/90 border border-blue-800/50" : "bg-gradient-to-br from-white/95 to-blue-50/95 border border-blue-100/50")}>
          <h2 className={cn("text-2xl font-bold mb-6 flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
            <i className="fas fa-file-medical mr-4 text-blue-500"></i>{cbtMode.charAt(0).toUpperCase() + cbtMode.slice(1)} Mode - {cbtType.toUpperCase()}
          </h2>
          {cbtMode === 'timed' && (
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className={cn("p-6 rounded-2xl border shadow-sm", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
                <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
                  <i className="fas fa-list-ol mr-3 text-blue-500"></i>Number of Questions
                </label>
                <input
                  type="number"
                  min={1}
                  max={300}
                  value={cbtNumQuestions}
                  onChange={(e) => setCbtNumQuestions(parseInt(e.target.value) || 50)}
                  className={cn("w-full p-4 rounded-xl focus:ring-4 transition-all duration-200 text-lg", isDark ? "bg-gray-800 border-2 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200" : "border-2 border-slate-200/50 focus:border-blue-400 focus:ring-4 focus:ring-blue-100")}
                />
              </div>
              <div className={cn("p-6 rounded-2xl border shadow-sm", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
                <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
                  <i className="fas fa-clock mr-3 text-amber-500"></i>Duration (minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={cbtDuration}
                  onChange={(e) => setCbtDuration(parseInt(e.target.value) || 60)}
                  className={cn("w-full p-4 rounded-xl focus:ring-4 transition-all duration-200 text-lg", isDark ? "bg-gray-800 border-2 border-gray-700 focus:border-amber-500 focus:ring-amber-900/30 text-gray-200" : "border-2 border-slate-200/50 focus:border-amber-400 focus:ring-4 focus:ring-amber-100")}
                />
              </div>
            </div>
          )}
          {cbtMode === 'exam' && (
            <div className={cn("border-l-4 p-6 rounded-2xl mb-8", isDark ? "bg-rose-900/30 border-rose-400" : "bg-gradient-to-r from-rose-50/80 to-pink-50/80 border-rose-400")}>
              <p className={cn("text-lg font-semibold flex items-center", isDark ? "text-gray-200" : "text-slate-700")}>
                <i className="fas fa-info-circle mr-3 text-rose-500"></i>
                Fixed Format: 300 questions, 180 minutes
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <button 
              onClick={() => handleCbtCategorySelect('all')} 
              className={cn("group border-2 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 text-left backdrop-blur-sm", isDark ? "bg-indigo-900/30 border-indigo-800/50 hover:border-indigo-700" : "bg-gradient-to-br from-white to-indigo-100/80 border-indigo-200/50 hover:border-indigo-400")}
            >
              <i className="fas fa-globe text-2xl text-indigo-500 mb-3 group-hover:scale-110 transition-transform"></i>
              <h3 className={cn("font-semibold mb-1", isDark ? "text-gray-100" : "text-slate-800")}>All Categories</h3>
              <p className={cn("text-sm", isDark ? "text-gray-300" : "text-slate-600")}>Mixed questions from all topics</p>
            </button>
            {cbtCategories.map((cat) => (
              <button 
                key={cat.id} 
                onClick={() => handleCbtCategorySelect(cat.id)} 
                className={cn("group border-2 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 text-left backdrop-blur-sm", isDark ? "bg-blue-900/30 border-blue-800/50 hover:border-blue-700" : "bg-gradient-to-br from-white to-blue-100/80 border-blue-200/50 hover:border-blue-400")}
              >
                <i className="fas fa-folder text-2xl text-blue-500 mb-3 group-hover:scale-110 transition-transform"></i>
                <h3 className={cn("font-semibold mb-1", isDark ? "text-gray-100" : "text-slate-800")}>{cat.name}</h3>
                <p className={cn("text-sm", isDark ? "text-gray-300" : "text-slate-600")}>Category-specific questions</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {currentSection === 'cbt-question-display' && cbtQuestions.length > 0 && (
        <div className={cn("min-h-screen", isDark ? "bg-gray-900" : "bg-gradient-to-br from-slate-50 to-blue-50/30")}>
          <div className="container mx-auto px-0 sm:px-4 lg:px-8 py-4 lg:py-8">
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1">
                <div className={cn("rounded-none sm:rounded-2xl shadow-2xl p-6 backdrop-blur-sm", isDark ? "bg-gray-800/90 border border-gray-700/50" : "bg-white/95 border border-blue-100/50")}>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                      <h2 className={cn("text-2xl font-bold flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
                        <i className="fas fa-question-circle mr-3 text-blue-500"></i>
                        Question {cbtCurrentQuestionIndex + 1} of {cbtQuestions.length}
                      </h2>
                      {cbtQuestions[cbtCurrentQuestionIndex]?.category && (
                        <p className={cn("mt-2 flex items-center", isDark ? "text-gray-400" : "text-slate-600")}>
                          <i className="fas fa-tag mr-2 text-slate-400"></i>
                          {cbtQuestions[cbtCurrentQuestionIndex].category.name}
                        </p>
                      )}
                    </div>
                    
                    {['timed', 'exam'].includes(cbtMode || '') && (
                      <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center">
                        <i className="fas fa-clock mr-3 text-xl"></i>
                        <span className="text-xl font-bold">
                          {Math.floor(cbtTimeLeft / 60)}:{(cbtTimeLeft % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                    )}

                    <button
                      onClick={() => setShowQuestionDrawer(!showQuestionDrawer)}
                      className="lg:hidden bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center font-semibold"
                    >
                      <i className="fas fa-list mr-2"></i>
                      Questions
                    </button>
                  </div>

                  <div className={cn("border-2 p-8 rounded-2xl mb-8 shadow-inner", isDark ? "bg-gray-900/50 border-gray-700/50" : "bg-gradient-to-br from-slate-50 to-blue-50/50 border-slate-200/50")}>
                    <p className={cn("text-lg leading-relaxed mb-4 font-medium", isDark ? "text-gray-200" : "text-slate-800")}>
                      {cbtQuestions[cbtCurrentQuestionIndex].content}
                    </p>
                    
                    {cbtQuestions[cbtCurrentQuestionIndex].figureUrl && (
                      <div className="mb-6 flex justify-center">
                        <img 
                          src={cbtQuestions[cbtCurrentQuestionIndex].figureUrl} 
                          alt="Figure" 
                          className="max-w-full rounded-2xl shadow-lg border border-slate-200/50 dark:border-gray-700/50"
                        />
                      </div>
                    )}

                    <div className="space-y-4">
                      {cbtQuestions[cbtCurrentQuestionIndex].options.map((opt: { text: string, correct: boolean }, idx: number) => (
                        <label 
                          key={idx} 
                          className={cn(
                            "flex items-center p-6 border-2 rounded-2xl transition-all duration-200 cursor-pointer group",
                            cbtSelectedAnswer === idx 
                              ? "border-blue-400 bg-blue-50/80 shadow-lg scale-105 dark:bg-blue-900/30 dark:border-blue-500" 
                              : isDark ? "border-gray-700/50 bg-gray-800/50 hover:border-blue-600 hover:shadow-md hover:scale-102" : "border-slate-200/50 bg-white/80 hover:border-blue-300 hover:shadow-md hover:scale-102"
                          )}
                        >
                          <input
                            type="radio"
                            name="cbt-answer"
                            checked={cbtSelectedAnswer === idx}
                            onChange={() => handleCbtAnswerSelect(cbtCurrentQuestionIndex, idx)}
                            className="mr-4 h-6 w-6 text-blue-500 border-2 border-slate-300 rounded-full focus:ring-4 focus:ring-blue-200 transition-all dark:border-gray-600 dark:bg-gray-700"
                          />
                          <span className={cn("text-lg font-medium flex-1", isDark ? "text-gray-200" : "text-slate-700")}>{opt.text}</span>
                          
                          {cbtSelectedAnswer === idx && (
                            <i className="fas fa-check-circle text-blue-500 text-xl ml-2"></i>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className={cn("flex flex-wrap justify-between gap-4 pt-6", isDark ? "border-t border-gray-700/50" : "border-t border-slate-200/50")}>
                    <button
                      onClick={handleCbtPrevQuestion}
                      disabled={cbtCurrentQuestionIndex === 0}
                      className={cn(
                        "px-8 py-4 border-2 rounded-xl transition-all duration-300 flex items-center font-semibold",
                        cbtCurrentQuestionIndex === 0 
                          ? "opacity-50 cursor-not-allowed" 
                          : isDark ? "border-gray-700 hover:border-blue-600 hover:bg-blue-900/30 hover:shadow-lg hover:scale-105 text-gray-300" : "border-slate-200/50 hover:border-blue-400 hover:bg-blue-50/80 hover:shadow-lg hover:scale-105"
                      )}
                    >
                      <i className="fas fa-arrow-left mr-3"></i>Previous
                    </button>

                    {cbtMode === 'practice' && (
                      <button
                        onClick={handleCbtCheckAnswer}
                        disabled={cbtSelectedAnswer === null || cbtIsChecking}
                        className={cn(
                          "px-8 py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl transition-all duration-300 flex items-center font-semibold shadow-lg",
                          (cbtSelectedAnswer === null || cbtIsChecking)
                            ? "opacity-50 cursor-not-allowed" 
                            : "hover:from-emerald-600 hover:to-green-700 hover:shadow-xl hover:scale-105"
                        )}
                      >
                        <i className="fas fa-check mr-3"></i>
                        {cbtIsChecking ? 'Checking...' : 'Check Answer'}
                      </button>
                    )}

                    <button
                      onClick={handleCbtNextQuestion}
                      className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl hover:scale-105"
                    >
                      <i className="fas fa-arrow-right mr-3"></i>Next
                    </button>

                    <button
                      onClick={() => setCbtShowEndConfirm(true)}
                      className="px-8 py-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl hover:from-rose-600 hover:to-pink-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl hover:scale-105"
                    >
                      <i className="fas fa-stop mr-3"></i>End Session
                    </button>
                  </div>
                </div>
              </div>

              <div className="hidden lg:block w-[30rem]">
                <QuestionNumberGrid />
              </div>

              {showQuestionDrawer && (
                <>
                  <div 
                    className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                    onClick={() => setShowQuestionDrawer(false)}
                  />
                  
                  <div className={cn("lg:hidden fixed bottom-0 left-0 right-0 rounded-t-3xl shadow-2xl z-50 max-h-[70vh] overflow-hidden", isDark ? "bg-gray-800/95 border-t border-gray-700/50" : "bg-white/95 border-t border-slate-200/50")}>
                    <div className={cn("p-4", isDark ? "border-b border-gray-700/50" : "border-b border-slate-200/50")}>
                      <div className="flex items-center justify-between">
                        <h3 className={cn("font-bold text-lg", isDark ? "text-gray-100" : "text-slate-800")}>Questions</h3>
                        <button 
                          onClick={() => setShowQuestionDrawer(false)}
                          className={cn("p-2 rounded-xl transition-colors", isDark ? "hover:bg-gray-700" : "hover:bg-slate-100")}
                        >
                          <i className={cn("fas fa-times", isDark ? "text-gray-400" : "text-slate-600")}></i>
                        </button>
                      </div>
                    </div>
                    <div className="p-4 overflow-y-auto max-h-[60vh]">
                      <QuestionNumberGrid />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {currentSection === 'cbt-feedback' && cbtFeedback && (
        <div className={cn("rounded-2xl shadow-lg p-8 backdrop-blur-sm", isDark ? "bg-gray-800/90 border border-gray-700/50" : "bg-gradient-to-br from-white/95 to-blue-50/95 border border-blue-100/50")}>
          <h2 className={cn("text-2xl font-bold mb-8 flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
            <i className="fas fa-comment-medical mr-4 text-blue-500" />Answer Feedback
          </h2>
          <div className="mb-8">
            <div className="text-center mb-8">
              {cbtFeedback.isCorrect ? (
                <i className="fas fa-check-circle text-emerald-500 text-7xl animate-bounce" />
              ) : (
                <i className="fas fa-times-circle text-rose-500 text-7xl animate-bounce" />
              )}
              <p className={cn("text-2xl mt-6 font-bold", isDark ? "text-gray-300" : "text-slate-600")}>
                {cbtFeedback.isCorrect ? 'Correct Answer! 🎉' : 'Incorrect - Keep Learning! 💪'}
              </p>
            </div>

            <div className={cn("p-8 rounded-2xl border mb-8 backdrop-blur-sm", isDark ? "bg-blue-900/30 border-blue-800/50" : "bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-blue-200/50")}>
              <h4 className={cn("font-bold mb-4 flex items-center text-xl", isDark ? "text-gray-200" : "text-slate-800")}>
                <i className="fas fa-lightbulb mr-3 text-blue-500" />Explanation
              </h4>
              <div
                className={cn("text-lg leading-relaxed prose prose-lg max-w-none", isDark ? "text-gray-300" : "text-slate-700")}
                dangerouslySetInnerHTML={{
                  __html: cbtFeedback.explanation
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>'),
                }}
              />
            </div>

            {cbtAiExplanation && (
              <div className={cn("p-8 rounded-2xl border-l-4 mb-8 backdrop-blur-sm", isDark ? "bg-amber-900/30 border-amber-400" : "bg-gradient-to-r from-amber-50/80 to-yellow-50/80 border-l-4 border-amber-400")}>
                <h4 className={cn("font-bold mb-4 flex items-center text-xl", isDark ? "text-gray-200" : "text-slate-800")}>
                  <i className="fas fa-lightbulb mr-3 text-amber-500" />Clinical Pearls
                </h4>
                <ul className={cn("text-lg space-y-3 list-disc list-inside", isDark ? "text-gray-300" : "text-slate-700")}>
                  {cbtAiExplanation
                    .split(/(?<=\s)-\s+/)
                    .map((chunk, i) => {
                      const clean = chunk
                        .trim()
                        .replace(/^-\s*/, '')
                        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-amber-700 dark:text-amber-400">$1</strong>');
                      return clean ? <li key={i} dangerouslySetInnerHTML={{ __html: clean }} /> : null;
                    })}
                </ul>
              </div>
            )}

            <div className={cn("p-8 rounded-2xl border backdrop-blur-sm", isDark ? "bg-emerald-900/30 border-emerald-800/50" : "bg-gradient-to-r from-emerald-50/80 to-green-50/80 border-emerald-200/50")}>
              <h4 className={cn("font-bold mb-6 flex items-center text-xl", isDark ? "text-gray-200" : "text-slate-800")}>
                <i className="fas fa-chart-bar mr-3 text-emerald-500" />Community Performance
              </h4>
              <div className="space-y-4">
                {cbtQuestions[cbtCurrentQuestionIndex].options.map(
                  (opt: { text: string; correct: boolean }, idx: number) => {
                    const st = cbtOptionPercentages[cbtQuestions[cbtCurrentQuestionIndex].id]?.[idx];
                    const pct = st?.pct ?? 0;
                    const total = st?.totalPicked ?? 0;
                    const barColor = st?.isCorrect 
                      ? 'bg-gradient-to-r from-emerald-500 to-green-500' 
                      : 'bg-gradient-to-r from-rose-500 to-pink-500';
                    return (
                      <div key={idx} className="flex items-center gap-4">
                        <span className={cn("w-40 text-base font-semibold truncate", isDark ? "text-gray-300" : "text-slate-700")}>
                          {opt.text}
                        </span>
                        <div className={cn("flex-1 rounded-full h-6 overflow-hidden shadow-inner", isDark ? "bg-gray-700" : "bg-slate-200/80")}>
                          <div
                            className={`h-full ${barColor} transition-all duration-1000 ease-out rounded-full`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={cn("text-sm font-bold whitespace-nowrap min-w-[100px] text-right", isDark ? "text-gray-400" : "text-slate-600")}>
                          {pct}% ({total})
                        </span>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-center">
            <button
              onClick={() => {
                setShowCbtFeedbackModal(false);
                switchSection('cbt-question-display');
              }}
              className="px-12 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center text-lg font-bold shadow-2xl hover:shadow-3xl transform hover:scale-105"
            >
              <i className="fas fa-arrow-right mr-3" />Continue to Next Question
            </button>
          </div>
        </div>
      )}

      {currentSection === 'cbt-create-category' && (
        <div className={cn("rounded-2xl shadow-lg p-8 backdrop-blur-sm", isDark ? "bg-gray-800/90 border border-gray-700/50" : "bg-gradient-to-br from-white/95 to-blue-50/95 border border-blue-100/50")}>
          <h2 className={cn("text-2xl font-bold mb-8 flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
            <i className="fas fa-plus mr-4 text-blue-500"></i>Create New Category
          </h2>
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className={cn("p-6 rounded-2xl border shadow-sm", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
              <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
                <i className="fas fa-tag mr-3 text-blue-500"></i>Category Name
              </label>
              <input
                type="text"
                value={newCbtCategoryName}
                onChange={(e) => setNewCbtCategoryName(e.target.value)}
                className={cn("w-full p-4 rounded-xl focus:ring-4 transition-all duration-200 text-lg", isDark ? "bg-gray-800 border-2 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200" : "border-2 border-slate-200/50 focus:border-blue-400 focus:ring-4 focus:ring-blue-100")}
                placeholder="Enter category name..."
              />
            </div>
            <div className={cn("p-6 rounded-2xl border shadow-sm", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
              <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
                <i className="fas fa-link mr-3 text-blue-500"></i>Slug
              </label>
              <input
                type="text"
                value={newCbtCategorySlug}
                onChange={(e) => setNewCbtCategorySlug(e.target.value)}
                className={cn("w-full p-4 rounded-xl focus:ring-4 transition-all duration-200 text-lg", isDark ? "bg-gray-800 border-2 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200" : "border-2 border-slate-200/50 focus:border-blue-400 focus:ring-4 focus:ring-blue-100")}
                placeholder="Enter URL slug..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-4">
            <button 
              onClick={() => switchSection('cbt-intro')} 
              className={cn("px-8 py-4 rounded-xl transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl", isDark ? "border-2 border-gray-700 hover:border-gray-600 hover:bg-gray-800/80 text-gray-300" : "border-2 border-slate-200/50 hover:border-slate-400 hover:bg-slate-50/80")}
            >
              <i className="fas fa-times mr-3"></i>Cancel
            </button>
            <button 
              onClick={handleCreateCbtCategory} 
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <i className="fas fa-check mr-3"></i>Create Category
            </button>
          </div>
        </div>
      )}

      {currentSection === 'cbt-create-question' && (
        <div className={cn("rounded-2xl shadow-lg p-8 backdrop-blur-sm", isDark ? "bg-gray-800/90 border border-gray-700/50" : "bg-gradient-to-br from-white/95 to-blue-50/95 border border-blue-100/50")}>
          <h2 className={cn("text-2xl font-bold mb-8 flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
            <i className="fas fa-question mr-4 text-blue-500"></i>Create New Question
          </h2>
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className={cn("p-6 rounded-2xl border shadow-sm", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
              <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
                <i className="fas fa-folder mr-3 text-blue-500"></i>Category
              </label>
              <select
                value={newCbtQuestionCategoryId}
                onChange={(e) => setNewCbtQuestionCategoryId(e.target.value)}
                className={cn("w-full p-4 rounded-xl focus:ring-4 transition-all duration-200 text-lg", isDark ? "bg-gray-800 border-2 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200" : "border-2 border-slate-200/50 focus:border-blue-400 focus:ring-4 focus:ring-blue-100")}
              >
                <option value="">Select Category</option>
                {cbtCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 p-6 rounded-2xl border shadow-sm">
              <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
                <i className="fas fa-file-alt mr-3 text-blue-500"></i>Question Content
              </label>
              <textarea
                value={newCbtQuestionContent}
                onChange={(e) => setNewCbtQuestionContent(e.target.value)}
                className={cn("w-full p-4 rounded-xl focus:ring-4 transition-all duration-200 text-lg min-h-[120px]", isDark ? "bg-gray-800 border-2 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200" : "border-2 border-slate-200/50 focus:border-blue-400 focus:ring-4 focus:ring-blue-100")}
                placeholder="Enter your question here..."
              />
            </div>
            <div className="md:col-span-2 p-6 rounded-2xl border shadow-sm">
              <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
                <i className="fas fa-lightbulb mr-3 text-amber-500"></i>Explanation
              </label>
              <textarea
                value={newCbtQuestionExplanation}
                onChange={(e) => setNewCbtQuestionExplanation(e.target.value)}
                className={cn("w-full p-4 rounded-xl focus:ring-4 transition-all duration-200 text-lg min-h-[120px]", isDark ? "bg-gray-800 border-2 border-gray-700 focus:border-amber-500 focus:ring-amber-900/30 text-gray-200" : "border-2 border-slate-200/50 focus:border-amber-400 focus:ring-4 focus:ring-amber-100")}
                placeholder="Provide detailed explanation..."
              />
            </div>
            <div className={cn("p-6 rounded-2xl border shadow-sm", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
              <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
                <i className="fas fa-image mr-3 text-purple-500"></i>Figure URL
              </label>
              <input
                type="text"
                value={newCbtQuestionFigureUrl}
                onChange={(e) => setNewCbtQuestionFigureUrl(e.target.value)}
                className={cn("w-full p-4 rounded-xl focus:ring-4 transition-all duration-200 text-lg", isDark ? "bg-gray-800 border-2 border-gray-700 focus:border-purple-500 focus:ring-purple-900/30 text-gray-200" : "border-2 border-slate-200/50 focus:border-purple-400 focus:ring-4 focus:ring-purple-100")}
                placeholder="Enter image URL..."
              />
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className={cn("p-6 rounded-2xl border shadow-sm", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
                <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
                  <i className="fas fa-circle mr-3 text-slate-400"></i>Option {i + 1}
                </label>
                <input
                  type="text"
                  value={newCbtQuestionOptions[i].text}
                  onChange={(e) => handleNewCbtOptionChange(i, 'text', e.target.value)}
                  className={cn("w-full p-4 rounded-xl focus:ring-4 transition-all duration-200 text-lg mb-4", isDark ? "bg-gray-800 border-2 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200" : "border-2 border-slate-200/50 focus:border-blue-400 focus:ring-4 focus:ring-blue-100")}
                  placeholder={`Option ${i + 1} text...`}
                />
                <label className={cn("flex items-center p-4 rounded-xl border cursor-pointer transition-colors", isDark ? "bg-gray-800/80 border-gray-700 hover:bg-gray-700/80" : "bg-slate-50/80 border-slate-200/50 hover:bg-slate-100/80")}>
                  <input
                    type="checkbox"
                    checked={newCbtQuestionOptions[i].correct}
                    onChange={(e) => handleNewCbtOptionChange(i, 'correct', e.target.checked)}
                    className="mr-4 h-5 w-5 text-blue-500 border-2 border-slate-300 rounded focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <span className={cn("font-medium", isDark ? "text-gray-300" : "text-slate-700")}>Mark as Correct Answer</span>
                </label>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-4">
            <button 
              onClick={() => switchSection('cbt-intro')} 
              className={cn("px-8 py-4 rounded-xl transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl", isDark ? "border-2 border-gray-700 hover:border-gray-600 hover:bg-gray-800/80 text-gray-300" : "border-2 border-slate-200/50 hover:border-slate-400 hover:bg-slate-50/80")}
            >
              <i className="fas fa-times mr-3"></i>Cancel
            </button>
            <button 
              onClick={handleCreateCbtQuestion} 
              className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <i className="fas fa-check mr-3"></i>Create Question
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default CbtSection;