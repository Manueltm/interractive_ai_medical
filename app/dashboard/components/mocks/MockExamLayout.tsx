// app/dashboard/components/mocks/MockExamLayout.tsx
'use client';
import { FC, ReactNode } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/utils";

interface MockExamLayoutProps {
  title: string;
  onBack: () => void;
  stats: { total: number; correct: number; wrong: number };
  children: ReactNode;
  uploadButton?: ReactNode;
  filters?: ReactNode;
}

const MockExamLayout: FC<MockExamLayoutProps> = ({
  title,
  onBack,
  stats,
  children,
  uploadButton,
  filters
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={cn("min-h-screen",
      isDark ? "bg-gradient-to-br from-gray-900 to-rose-950/30" : "bg-gradient-to-br from-slate-50 to-rose-50/30"
    )}>
      {/* Header */}
      <div className={cn("sticky top-0 z-30 backdrop-blur-md border-b shadow-sm",
        isDark ? "bg-gray-800/80 border-rose-800" : "bg-white/80 border-rose-200"
      )}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h1 className={cn("text-2xl md:text-3xl font-bold", isDark ? "text-gray-100" : "text-slate-800")}>
              <i className="fas fa-laptop-medical mr-3 text-rose-500"></i>
              {title}
            </h1>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className={cn("px-4 py-2 rounded-lg shadow-sm border",
                isDark ? "bg-gray-800 border-rose-800" : "bg-white border-rose-200"
              )}>
                <span className={isDark ? "text-gray-400" : "text-slate-600"}>Progress:</span>
                <span className="font-bold ml-2 text-rose-600">
                  {stats.total > 0 ? `${Math.round((stats.correct / stats.total) * 100)}%` : '0%'}
                </span>
              </div>
              <button
                onClick={onBack}
                className="px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-all"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                <span className="hidden md:inline">Back</span>
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex gap-6 mt-4 text-sm">
            <div className="flex items-center">
              <span className={isDark ? "text-gray-400" : "text-slate-600"}>Correct:</span>
              <span className="font-bold text-green-600 ml-2">{stats.correct}</span>
            </div>
            <div className="flex items-center">
              <span className={isDark ? "text-gray-400" : "text-slate-600"}>Wrong:</span>
              <span className="font-bold text-red-600 ml-2">{stats.wrong}</span>
            </div>
            <div className="flex items-center">
              <span className={isDark ? "text-gray-400" : "text-slate-600"}>Total:</span>
              <span className={cn("font-bold ml-2", isDark ? "text-gray-300" : "text-slate-600")}>{stats.total}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {uploadButton && <div className="mb-6 flex justify-end">{uploadButton}</div>}
        {filters && <div className="mb-6">{filters}</div>}
        {children}
      </div>
    </div>
  );
};

export default MockExamLayout;