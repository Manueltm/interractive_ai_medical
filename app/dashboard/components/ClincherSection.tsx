// app/dashboard/components/ClincherSection.tsx
'use client';
import { FC, useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { cn } from "@/utils";
import AdminUploadModal from "./admin/AdminUploadModal";
import { AdminGuard } from "./AdminGuard";

type ClincherSectionProps = {
  switchSection: (section: string) => void;
};

const ClincherSection: FC<ClincherSectionProps> = ({ switchSection }) => {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [clinchers, setClinchers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const ITEMS_PER_PAGE = 4; // 2x2 grid on desktop
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    Promise.all([fetchClinchers(), fetchCategories()]).finally(() => {
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchTerm]);

  const fetchClinchers = async () => {
    try {
      const res = await fetch('/api/clinchers');
      const data = await res.json();
      setClinchers(data);
    } catch (error) {
      console.error('Error fetching clinchers:', error);
      toast.error('Failed to load clinchers');
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/academy-categories?type=clincher');
      const data = await res.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleUpload = async (data: any[]) => {
    await fetchClinchers();
    toast.success('Clinchers uploaded successfully');
  };

  const toggleCardExpand = (clincherId: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [clincherId]: !prev[clincherId]
    }));
  };

  const toggleRevealAnswer = (answerId: string) => {
    setRevealedAnswers(prev => ({
      ...prev,
      [answerId]: !prev[answerId]
    }));
  };

  // Filter questions based on selected category and search
  const filteredClinchers = useMemo(() => {
    let filtered = clinchers;
    
    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(c => c.categoryId === selectedCategory);
    }
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.question.toLowerCase().includes(term) ||
        (c.answer && c.answer.toLowerCase().includes(term)) ||
        [1,2,3,4,5,6,7].some(num => 
          c[`extraQuestion${num}`]?.toLowerCase().includes(term) ||
          c[`extraAnswer${num}`]?.toLowerCase().includes(term)
        )
      );
    }
    
    return filtered;
  }, [clinchers, selectedCategory, searchTerm]);

  // Pagination for questions
  const totalPages = Math.ceil(filteredClinchers.length / ITEMS_PER_PAGE);
  const paginatedClinchers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredClinchers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredClinchers, currentPage]);

  // Get category details
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Uncategorized';
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.icon || 'fas fa-folder';
  };

  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.color || '#3B82F6';
  };

  const getCategoryDescription = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.description || 'Explore clinchers in this category';
  };

  const getCategoryCount = (categoryId: string) => {
    return clinchers.filter(c => c.categoryId === categoryId).length;
  };

  const renderHtml = (html: string) => {
    return <div className={isDark ? "prose-invert" : ""} dangerouslySetInnerHTML={{ __html: html }} />;
  };

  // Handle category selection
  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    setCurrentPage(1);
    setSearchTerm('');
    setExpandedCards({});
    setRevealedAnswers({});
  };

  // Loading skeleton with dark mode
  if (isLoading) {
    return (
      <div className={cn("min-h-screen p-8",
        isDark ? "bg-gradient-to-br from-gray-900 via-gray-800 to-blue-950/30" : "bg-gradient-to-br from-slate-50 via-white to-blue-50/30"
      )}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className={cn("rounded-3xl shadow-lg p-8 animate-pulse",
                isDark ? "bg-gray-800" : "bg-white"
              )}>
                <div className={cn("w-20 h-20 rounded-2xl mb-6", isDark ? "bg-gray-700" : "bg-slate-200")}></div>
                <div className={cn("h-8 rounded-lg w-3/4 mb-3", isDark ? "bg-gray-700" : "bg-slate-200")}></div>
                <div className={cn("h-4 rounded-lg w-full mb-2", isDark ? "bg-gray-700" : "bg-slate-200")}></div>
                <div className={cn("h-4 rounded-lg w-2/3 mb-6", isDark ? "bg-gray-700" : "bg-slate-200")}></div>
                <div className={cn("h-12 rounded-xl w-full", isDark ? "bg-gray-700" : "bg-slate-200")}></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen",
      isDark ? "bg-gradient-to-br from-gray-900 via-gray-800 to-blue-950/30" : "bg-gradient-to-br from-slate-50 via-white to-blue-50/30"
    )}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg flex items-center justify-center transform hover:scale-105 transition-transform">
              <i className="fas fa-lightbulb text-2xl text-white"></i>
            </div>
            <div>
              <h1 className={cn("text-3xl md:text-4xl font-bold bg-clip-text text-transparent",
                isDark ? "bg-gradient-to-r from-gray-100 to-gray-300" : "bg-gradient-to-r from-slate-800 to-slate-600"
              )}>
                Clincher Lab
              </h1>
              <p className={cn("mt-1", isDark ? "text-gray-400" : "text-slate-500")}>
                {selectedCategory && selectedCategory !== 'all'
                  ? `${getCategoryName(selectedCategory)} • ${filteredClinchers.length} clinchers`
                  : `${clinchers.length} clinchers • ${categories.length} categories`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {selectedCategory && (
              <button
                onClick={() => handleCategorySelect(null)}
                className={cn("px-6 py-3 rounded-xl transition-all duration-300 flex items-center gap-3 shadow-md hover:shadow-lg border",
                  isDark 
                    ? "bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700" 
                    : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                )}
              >
                <i className="fas fa-arrow-left"></i>
                <span className="font-semibold">Back to Categories</span>
              </button>
            )}
            <button
              onClick={() => switchSection('selection')}
              className={cn("px-6 py-3 rounded-xl transition-all duration-300 flex items-center gap-3 shadow-md hover:shadow-lg border",
                isDark 
                  ? "bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700" 
                  : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
              )}
            >
              <i className="fas fa-arrow-left"></i>
              <span className="font-semibold">Dashboard</span>
            </button>
          </div>
        </div>

        {/* Admin Controls */}
        <AdminGuard>
          <div className="mb-8 flex justify-end">
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 flex items-center gap-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
            >
              <i className="fas fa-upload"></i>
              <span>Upload Clinchers</span>
            </button>
          </div>
        </AdminGuard>

        {/* Category Cards View */}
        {!selectedCategory && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className={cn("text-2xl font-semibold mb-2", isDark ? "text-gray-200" : "text-slate-700")}>Choose a Category</h2>
              <p className={isDark ? "text-gray-400" : "text-slate-500"}>Select a category to start practicing clinchers</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* All Categories Card */}
              <div
                onClick={() => handleCategorySelect('all')}
                className={cn("group rounded-3xl shadow-lg border-2 border-blue-200 overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 cursor-pointer",
                  isDark ? "bg-gray-800 border-blue-800" : "bg-white border-blue-200"
                )}
              >
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-8">
                  <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <i className="fas fa-layer-group text-4xl text-white"></i>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">All Categories</h3>
                  <p className="text-blue-100 text-lg">Browse all clinchers</p>
                </div>
                <div className={cn("p-8", isDark ? "bg-gray-800" : "bg-white")}>
                  <div className="flex items-center justify-between mb-4">
                    <span className={isDark ? "text-gray-400" : "text-slate-600"}>Total Clinchers</span>
                    <span className="text-3xl font-bold text-blue-600">{clinchers.length}</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-600 font-medium">
                    <span>Explore All</span>
                    <i className="fas fa-arrow-right group-hover:translate-x-2 transition-transform"></i>
                  </div>
                </div>
              </div>

              {/* Individual Category Cards */}
              {categories.map((category) => {
                const count = getCategoryCount(category.id);
                return (
                  <div
                    key={category.id}
                    onClick={() => handleCategorySelect(category.id)}
                    className={cn("group rounded-3xl shadow-lg border-2 overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 cursor-pointer",
                      isDark ? "bg-gray-800" : "bg-white"
                    )}
                    style={{ borderColor: category.color || '#3B82F6' }}
                  >
                    <div 
                      className="p-8"
                      style={{ background: `linear-gradient(135deg, ${category.color || '#3B82F6'} 0%, ${adjustColor(category.color || '#3B82F6', -20)} 100%)` }}
                    >
                      <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <i className={`${category.icon || 'fas fa-folder'} text-4xl text-white`}></i>
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">{category.name}</h3>
                      <p className="text-white/90 text-lg line-clamp-2">{category.description || 'Explore clinchers in this category'}</p>
                    </div>
                    <div className={cn("p-8", isDark ? "bg-gray-800" : "bg-white")}>
                      <div className="flex items-center justify-between mb-4">
                        <span className={isDark ? "text-gray-400" : "text-slate-600"}>Available Clinchers</span>
                        <span className="text-3xl font-bold" style={{ color: category.color || '#3B82F6' }}>{count}</span>
                      </div>
                      <div className="flex items-center gap-2 font-medium" style={{ color: category.color || '#3B82F6' }}>
                        <span>Start Learning</span>
                        <i className="fas fa-arrow-right group-hover:translate-x-2 transition-transform"></i>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Questions View */}
        {selectedCategory && (
          <div className="space-y-6">
            {/* Category Header */}
            <div className={cn("backdrop-blur-sm rounded-2xl shadow-lg border p-6 mb-6",
              isDark ? "bg-gray-800/80 border-gray-700" : "bg-white/80 border-slate-200"
            )}>
              <div className="flex items-center gap-4">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: selectedCategory === 'all' 
                    ? 'linear-gradient(135deg, #3B82F6, #1E40AF)' 
                    : `linear-gradient(135deg, ${getCategoryColor(selectedCategory)}, ${adjustColor(getCategoryColor(selectedCategory), -20)})`
                  }}
                >
                  <i className={`${selectedCategory === 'all' ? 'fas fa-layer-group' : getCategoryIcon(selectedCategory)} text-3xl text-white`}></i>
                </div>
                <div className="flex-1">
                  <h2 className={cn("text-2xl font-bold", isDark ? "text-gray-100" : "text-slate-800")}>
                    {selectedCategory === 'all' ? 'All Categories' : getCategoryName(selectedCategory)}
                  </h2>
                  <p className={isDark ? "text-gray-400" : "text-slate-500"}>
                    {selectedCategory === 'all' 
                      ? 'Browse all clinchers across all categories'
                      : getCategoryDescription(selectedCategory)}
                  </p>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative mb-6">
              <i className={cn("fas fa-search absolute left-4 top-1/2 -translate-y-1/2",
                isDark ? "text-gray-500" : "text-slate-400"
              )}></i>
              <input
                type="text"
                placeholder="Search questions, answers, or explanations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn("w-full pl-11 pr-4 py-4 border-2 rounded-xl focus:ring-2 outline-none transition-all text-lg",
                  isDark 
                    ? "bg-gray-800 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200 placeholder:text-gray-500"
                    : "bg-white border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                )}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className={cn("absolute right-4 top-1/2 -translate-y-1/2",
                    isDark ? "text-gray-500 hover:text-gray-300" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <i className="fas fa-times-circle text-xl"></i>
                </button>
              )}
            </div>

            {/* Results Summary */}
            <div className="flex justify-between items-center mb-4">
              <p className={cn("text-lg", isDark ? "text-gray-400" : "text-slate-600")}>
                Showing <span className="font-semibold text-blue-600">{paginatedClinchers.length}</span> of{' '}
                <span className="font-semibold">{filteredClinchers.length}</span> clinchers
              </p>
              {totalPages > 1 && (
                <div className={cn("flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm",
                  isDark ? "bg-gray-800" : "bg-white"
                )}>
                  <span className={cn("text-sm", isDark ? "text-gray-400" : "text-slate-500")}>Page</span>
                  <span className="font-semibold text-blue-600">{currentPage}</span>
                  <span className={isDark ? "text-gray-400" : "text-slate-500"}>of {totalPages}</span>
                </div>
              )}
            </div>

            {/* Clinchers Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12 auto-rows-min">
              {paginatedClinchers.map((clincher) => (
                <div
                  key={clincher.id}
                  ref={el => { cardRefs.current[clincher.id] = el; }}
                  className={cn("rounded-2xl shadow-lg border overflow-hidden hover:shadow-2xl transition-all duration-300 h-fit",
                    isDark ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200"
                  )}
                >
                  {/* Card Header - Gradient */}
                  <div 
                    className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 cursor-pointer"
                    onClick={() => toggleCardExpand(clincher.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-sm">Q</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white text-lg leading-tight">
                          {clincher.question}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {/* Category Badge */}
                          <span 
                            className="text-xs text-white px-2 py-1 rounded-full flex items-center gap-1"
                            style={{ backgroundColor: getCategoryColor(clincher.categoryId) }}
                          >
                            <i className={`${getCategoryIcon(clincher.categoryId)} text-[10px]`}></i>
                            {getCategoryName(clincher.categoryId)}
                          </span>
                          
                          {/* Extras Count Badge */}
                          {[1,2,3,4,5,6,7].filter(num => clincher[`extraQuestion${num}`]).length > 0 && (
                            <span className="text-xs bg-white/20 text-white px-2 py-1 rounded-full flex items-center gap-1">
                              <i className="fas fa-layer-group text-[10px]"></i>
                              {[1,2,3,4,5,6,7].filter(num => clincher[`extraQuestion${num}`]).length} extras
                            </span>
                          )}
                          
                          {/* Main Answer Badge */}
                          <span className="text-xs bg-emerald-500/80 text-white px-2 py-1 rounded-full flex items-center gap-1">
                            <i className="fas fa-check-circle text-[10px]"></i>
                            Main Q&A
                          </span>
                        </div>
                      </div>
                      <div className={`w-8 h-8 rounded-full bg-white/20 flex items-center justify-center transition-transform duration-300 ${expandedCards[clincher.id] ? 'rotate-180' : ''}`}>
                        <i className="fas fa-chevron-down text-white"></i>
                      </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-6">
                    {/* Main Figure - Always Visible */}
                    {clincher.mainFigureUrl && (
                      <div className={cn("mb-6 rounded-xl overflow-hidden border-2",
                        isDark ? "border-gray-700 bg-gray-700/50" : "border-slate-200 bg-slate-50"
                      )}>
                        <div className="relative aspect-video">
                          <img 
                            src={clincher.mainFigureUrl} 
                            alt="Figure" 
                            className="w-full h-full object-contain p-2"
                          />
                        </div>
                      </div>
                    )}

                    {/* Main Answer Section */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className={cn("font-semibold flex items-center gap-2",
                          isDark ? "text-gray-200" : "text-slate-700"
                        )}>
                          <i className="fas fa-check-circle text-emerald-500"></i>
                          Main Answer
                        </h4>
                        <button
                          onClick={() => toggleRevealAnswer(`main-${clincher.id}`)}
                          className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                            revealedAnswers[`main-${clincher.id}`]
                              ? isDark 
                                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          )}
                        >
                          <i className={`fas fa-${revealedAnswers[`main-${clincher.id}`] ? 'eye-slash' : 'eye'} mr-2`}></i>
                          {revealedAnswers[`main-${clincher.id}`] ? 'Hide' : 'Reveal'}
                        </button>
                      </div>
                      
                      {revealedAnswers[`main-${clincher.id}`] && (
                        <div className={cn("p-4 rounded-xl border-2 animate-slideDown",
                          isDark 
                            ? "bg-gradient-to-br from-emerald-950/50 to-emerald-900/50 border-emerald-800"
                            : "bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200"
                        )}>
                          <div className={cn("prose prose-sm max-w-none",
                            isDark ? "prose-invert text-gray-200" : "text-slate-700"
                          )}>
                            {renderHtml(clincher.answer)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Extra Questions Section */}
                    {expandedCards[clincher.id] && (
                      <div className={cn("space-y-4 mt-2 border-t pt-4 animate-fadeIn",
                        isDark ? "border-gray-700" : "border-slate-200"
                      )}>
                        <h4 className={cn("font-semibold flex items-center gap-2",
                          isDark ? "text-gray-200" : "text-slate-700"
                        )}>
                          <i className="fas fa-layer-group text-blue-500"></i>
                          Additional Questions
                        </h4>
                        
                        {[1,2,3,4,5,6,7].map((num) => {
                          const question = clincher[`extraQuestion${num}`];
                          const answer = clincher[`extraAnswer${num}`];
                          const answerId = `${clincher.id}-extra-${num}`;
                          
                          if (!question && !answer) return null;
                          
                          return (
                            <div key={num} className={cn("rounded-xl p-4 border",
                              isDark ? "bg-gray-700/50 border-gray-600" : "bg-slate-50 border-slate-200"
                            )}>
                              <div className="flex gap-3">
                                <div className="w-6 h-6 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-bold text-blue-700">{num}</span>
                                </div>
                                <div className="flex-1 space-y-3">
                                  {question && (
                                    <div>
                                      <p className={cn("text-sm font-medium mb-1",
                                        isDark ? "text-gray-400" : "text-slate-500"
                                      )}>Question</p>
                                      <p className={cn("text-sm", isDark ? "text-gray-300" : "text-slate-700")}>{question}</p>
                                    </div>
                                  )}
                                  
                                  {answer && (
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <p className={cn("text-sm font-medium", isDark ? "text-gray-400" : "text-slate-500")}>Answer</p>
                                        <button
                                          onClick={() => toggleRevealAnswer(answerId)}
                                          className={cn("px-3 py-1 rounded-lg text-xs font-medium transition-all duration-300",
                                            revealedAnswers[answerId]
                                              ? isDark 
                                                ? "bg-gray-600 text-gray-300 hover:bg-gray-500"
                                                : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                                              : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                          )}
                                        >
                                          <i className={`fas fa-${revealedAnswers[answerId] ? 'eye-slash' : 'eye'} mr-1`}></i>
                                          {revealedAnswers[answerId] ? 'Hide' : 'Reveal'}
                                        </button>
                                      </div>
                                      
                                      {revealedAnswers[answerId] && (
                                        <div className={cn("p-3 rounded-lg border animate-slideDown",
                                          isDark ? "bg-gray-800 border-blue-800" : "bg-white border-blue-200"
                                        )}>
                                          <div className={cn("prose prose-xs max-w-none",
                                            isDark ? "prose-invert text-gray-300" : "text-slate-600"
                                          )}>
                                            {renderHtml(answer)}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* No Extras Message */}
                        {![1,2,3,4,5,6,7].some(num => clincher[`extraQuestion${num}`]) && (
                          <div className={cn("text-center py-6 rounded-xl border border-dashed",
                            isDark ? "bg-gray-700/50 border-gray-600" : "bg-slate-50 border-slate-300"
                          )}>
                            <i className={cn("fas fa-comment-slash text-2xl mb-2",
                              isDark ? "text-gray-500" : "text-slate-400"
                            )}></i>
                            <p className={cn("text-sm", isDark ? "text-gray-400" : "text-slate-500")}>No additional questions</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Expand/Collapse Hint */}
                    {!expandedCards[clincher.id] && [1,2,3].some(num => clincher[`extraQuestion${num}`]) && (
                      <button
                        onClick={() => toggleCardExpand(clincher.id)}
                        className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 group"
                      >
                        <i className="fas fa-chevron-down text-xs"></i>
                        <span>Show {[1,2,3,4,5,6,7].filter(num => clincher[`extraQuestion${num}`]).length} additional questions</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col items-center gap-4 mt-8 mb-16">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                      currentPage === 1
                        ? isDark 
                          ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                          : "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : isDark
                          ? "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-blue-400 shadow-md hover:shadow-lg border border-gray-700"
                          : "bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-600 shadow-md hover:shadow-lg border border-slate-200"
                    )}
                  >
                    <i className="fas fa-angle-double-left"></i>
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                      currentPage === 1
                        ? isDark 
                          ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                          : "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : isDark
                          ? "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-blue-400 shadow-md hover:shadow-lg border border-gray-700"
                          : "bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-600 shadow-md hover:shadow-lg border border-slate-200"
                    )}
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>
                  
                  <div className="flex items-center gap-1">
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
                          className={cn("w-10 h-10 rounded-xl font-medium transition-all",
                            currentPage === pageNum
                              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-110"
                              : isDark
                                ? "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-blue-400 shadow-md hover:shadow-lg border border-gray-700"
                                : "bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-600 shadow-md hover:shadow-lg border border-slate-200"
                          )}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                      currentPage === totalPages
                        ? isDark 
                          ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                          : "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : isDark
                          ? "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-blue-400 shadow-md hover:shadow-lg border border-gray-700"
                          : "bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-600 shadow-md hover:shadow-lg border border-slate-200"
                    )}
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                      currentPage === totalPages
                        ? isDark 
                          ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                          : "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : isDark
                          ? "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-blue-400 shadow-md hover:shadow-lg border border-gray-700"
                          : "bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-600 shadow-md hover:shadow-lg border border-slate-200"
                    )}
                  >
                    <i className="fas fa-angle-double-right"></i>
                  </button>
                </div>
                
                <div className={cn("text-sm px-4 py-2 rounded-full shadow-sm backdrop-blur-sm",
                  isDark ? "bg-gray-800/80 text-gray-400" : "bg-white/80 text-slate-500"
                )}>
                  Page <span className="font-semibold text-blue-600">{currentPage}</span> of {totalPages}
                </div>
              </div>
            )}

            {/* Empty State for Questions */}
            {filteredClinchers.length === 0 && (
              <div className={cn("backdrop-blur-sm rounded-2xl shadow-lg border-2 border-dashed p-16 text-center mb-16",
                isDark ? "bg-gray-800/80 border-blue-800" : "bg-white/80 border-blue-200"
              )}>
                <div className="inline-flex flex-col items-center gap-4">
                  <div className={cn("w-24 h-24 rounded-full flex items-center justify-center",
                    isDark ? "bg-blue-950" : "bg-gradient-to-br from-blue-100 to-blue-200"
                  )}>
                    <i className="fas fa-lightbulb text-4xl text-blue-500"></i>
                  </div>
                  <h3 className={cn("text-2xl font-semibold", isDark ? "text-gray-200" : "text-slate-700")}>No Clinchers Found</h3>
                  <p className={isDark ? "text-gray-400 max-w-md" : "text-slate-500 max-w-md"}>
                    {searchTerm 
                      ? `No results matching "${searchTerm}"` 
                      : "No clinchers available in this category."}
                  </p>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                    >
                      Clear Search
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Admin Upload Modal */}
        <AdminUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUpload}
          title="Upload Clinchers"
          uploadType="clincher"
        />
      </div>

      {/* Animation Styles */}
      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

// Helper function to adjust color brightness
function adjustColor(hex: string, percent: number): string {
  // Simplified color adjustment - in production, use a proper color library
  return hex;
}

export default ClincherSection;