// app/dashboard/components/mocks/SubCategoryCards.tsx
'use client';
import { FC } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/utils";
import { ExamType, ExamSubType } from "../MockSection";

interface SubCategoryCardsProps {
  type: ExamType;
  onSelect: (subType: ExamSubType) => void;
  onBack: () => void;
}

const SubCategoryCards: FC<SubCategoryCardsProps> = ({ type, onSelect, onBack }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const getConfig = (subType: 'cbt' | 'osce') => {
    if (type === 'main') {
      return subType === 'cbt' 
        ? { time: '180 mins', questions: '300 Qs', desc: 'Computer-based testing format' }
        : { time: '30 mins', questions: 'Per category', desc: 'Objective Structured Clinical Examination' };
    } else {
      return subType === 'cbt'
        ? { time: '2 mins', questions: 'Per category', desc: 'Quick computer-based test' }
        : { time: '20 mins', questions: 'Per category', desc: 'Clinical skills assessment' };
    }
  };

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
          Select {type === 'main' ? 'Main Mock' : 'Mini Mock'} Format
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CBT Card */}
        <button
          onClick={() => onSelect('cbt')}
          className="group bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-2xl transition-all transform hover:scale-105"
        >
          <div className="flex items-start justify-between mb-4">
            <i className="fas fa-desktop text-5xl"></i>
            <span className="bg-white/20 rounded-full px-3 py-1 text-sm">
              {getConfig('cbt').time}
            </span>
          </div>
          <h3 className="text-2xl font-bold mb-2">CBT Format</h3>
          <p className="text-blue-100 mb-4">{getConfig('cbt').desc}</p>
          <div className="flex items-center gap-2 text-sm bg-white/10 rounded-lg p-3">
            <i className="fas fa-clock"></i>
            <span>Time: {getConfig('cbt').time}</span>
            <i className="fas fa-question-circle ml-4"></i>
            <span>Questions: {getConfig('cbt').questions}</span>
          </div>
        </button>

        {/* OSCE Card */}
        <button
          onClick={() => onSelect('osce')}
          className="group bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-2xl transition-all transform hover:scale-105"
        >
          <div className="flex items-start justify-between mb-4">
            <i className="fas fa-stethoscope text-5xl"></i>
            <span className="bg-white/20 rounded-full px-3 py-1 text-sm">
              {getConfig('osce').time}
            </span>
          </div>
          <h3 className="text-2xl font-bold mb-2">OSCE Format</h3>
          <p className="text-green-100 mb-4">{getConfig('osce').desc}</p>
          <div className="flex items-center gap-2 text-sm bg-white/10 rounded-lg p-3">
            <i className="fas fa-clock"></i>
            <span>Time: {getConfig('osce').time}</span>
            <i className="fas fa-question-circle ml-4"></i>
            <span>Questions: {getConfig('osce').questions}</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default SubCategoryCards;