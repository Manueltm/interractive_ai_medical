// app/dashboard/components/mocks/CategoryCards.tsx
'use client';
import { FC, useEffect } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/utils";
import { ExamType, ExamSubType } from "../MockSection";

interface CategoryCardsProps {
  type: ExamType;
  subType: ExamSubType | null;
  categories: any[];
  onSelect: (category: any) => void;
  onBack: () => void;
}

const CategoryCards: FC<CategoryCardsProps> = ({
  type,
  subType,
  categories,
  onSelect,
  onBack
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const getCategoryIcon = () => {
    if (type === 'main') return 'fa-star';
    if (type === 'mini') return 'fa-leaf';
    return 'fa-cube';
  };

  const getCategoryColor = () => {
    if (type === 'main') return 'from-rose-500 to-pink-600';
    if (type === 'mini') return 'from-blue-500 to-cyan-600';
    return 'from-emerald-500 to-teal-600';
  };

  const formatTime = (seconds: number | null): string => {
    if (!seconds) return 'Default';
    
    const mins = Math.floor(seconds / 60);
    const remainingSecs = seconds % 60;
    
    if (mins > 0) {
      return remainingSecs > 0 ? `${mins}min ${remainingSecs}s` : `${mins}min`;
    }
    return `${seconds}s`;
  };

  const getTimeDisplay = (category: any) => {
    if (category.timeLimit) {
      return formatTime(category.timeLimit);
    }
    
    if (type === 'main' && subType === 'cbt') return '180 min';
    if (type === 'main' && subType === 'osce') return '30 min';
    if (type === 'mini' && subType === 'cbt') return '2 min';
    if (type === 'mini' && subType === 'osce') return '20 min';
    if (type === 'qblock') return '20 min';
    return 'Default';
  };

  const getQuestionCount = (category: any) => {
    return category.questionCount || Math.floor(Math.random() * 30) + 20;
  };

  if (!categories || categories.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-all flex items-center gap-2"
          >
            <i className="fas fa-arrow-left"></i>
            Back
          </button>
          <h2 className={cn("text-2xl font-bold", isDark ? "text-gray-100" : "text-slate-800")}>
            Select {type === 'main' ? 'Main Mock' : type === 'mini' ? 'Mini Mock' : 'QBlock'} Category
            {subType && ` - ${subType.toUpperCase()}`}
          </h2>
        </div>
        <div className={cn("text-center py-12 rounded-xl shadow-lg", 
          isDark ? "bg-gray-800" : "bg-white"
        )}>
          <i className={cn("fas fa-folder-open text-5xl mb-4", isDark ? "text-gray-600" : "text-slate-300")}></i>
          <p className={isDark ? "text-gray-400" : "text-slate-500"}>No categories available</p>
          <p className={cn("text-sm mt-2", isDark ? "text-gray-500" : "text-slate-400")}>
            Upload questions first using the upload button
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-all flex items-center gap-2"
        >
          <i className="fas fa-arrow-left"></i>
          Back
        </button>
        <h2 className={cn("text-2xl font-bold", isDark ? "text-gray-100" : "text-slate-800")}>
          Select {type === 'main' ? 'Main Mock' : type === 'mini' ? 'Mini Mock' : 'QBlock'} Category
          {subType && ` - ${subType.toUpperCase()}`}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelect(category)}
            className={cn("group rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:scale-105 overflow-hidden",
              isDark ? "bg-gray-800" : "bg-white"
            )}
          >
            <div className={`bg-gradient-to-r ${getCategoryColor()} p-4 text-white`}>
              <div className="flex items-center justify-between">
                <i className={`fas ${getCategoryIcon()} text-3xl`}></i>
                <span className="bg-white/20 rounded-full px-3 py-1 text-sm">
                  {getQuestionCount(category)} Qs
                </span>
              </div>
            </div>
            
            <div className="p-6">
              <h3 className={cn("font-bold text-lg mb-2 line-clamp-2", 
                isDark ? "text-gray-100" : "text-slate-800"
              )}>
                {category.name}
              </h3>
              
              <div className={cn("space-y-2 text-sm", isDark ? "text-gray-400" : "text-slate-600")}>
                <div className="flex items-center gap-2">
                  <i className={cn("fas fa-clock w-5", isDark ? "text-gray-500" : "text-slate-400")}></i>
                  <span>
                    {getTimeDisplay(category)}
                    {category.timeLimit && <span className="ml-1 text-xs text-rose-500">(custom)</span>}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <i className={cn("fas fa-layer-group w-5", isDark ? "text-gray-500" : "text-slate-400")}></i>
                  <span>{category.type || 'Mixed questions'}</span>
                </div>
              </div>

              <div className={cn("mt-4 pt-4 border-t", isDark ? "border-gray-700" : "border-slate-100")}>
                <span className="text-rose-500 group-hover:text-rose-600 font-semibold flex items-center justify-between">
                  Start Exam
                  <i className="fas fa-arrow-right group-hover:translate-x-2 transition-transform"></i>
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategoryCards;