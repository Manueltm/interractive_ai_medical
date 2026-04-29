// app/dashboard/components/FlashcardsSection.tsx
import { FC, useState, useEffect } from "react";
import { toast } from 'sonner';
import { cn } from "@/utils";
import { Badge, AllBadge } from './Badge';
import Spinner from "./Spinner";
import { DepartmentType } from '@/lib/types/department';
import { Session } from "next-auth";
import type { AsDate } from '@/lib/types';
import { Department, FlashcardTopic, SessionType, FlashcardType, FlashcardHistory, ManageType } from "@/lib/db/schema";
import type { StringOrDate } from '@/lib/types';
import { useTheme } from "next-themes";

export type FlashcardsSectionProps = {
  currentSection: string;
  switchSection: (section: string) => void;
  session: Session | null;
  departments: DepartmentType[];
  currentDepartment: string;
  setCurrentDepartment: (dept: string) => void;
  newDepartmentName: string;
  setNewDepartmentName: (name: string) => void;
  newDepartmentSlug: string;
  setNewDepartmentSlug: (slug: string) => void;
  topics: AsDate<FlashcardTopic>[];
  setTopics: (topics: FlashcardTopic[]) => void;
  currentTopic: string;
  setCurrentTopic: (topic: string) => void;
  newTopic: string;
  setNewTopic: (topic: string) => void;
  selectedNumCards: number;
  setSelectedNumCards: (num: number) => void;
  flashDuration: number;
  setFlashDuration: (dur: number) => void;
  currentFlashSession: AsDate<SessionType & { stations?: { index: number; patientId: string }[] | null }> | null;
  setCurrentFlashSession: (session: SessionType | null) => void;
  currentFlashIndex: number;
  setCurrentFlashIndex: (index: number) => void;
  isFlipped: boolean;
  setIsFlipped: (flipped: boolean) => void;
  timeLeft: number;
  setTimeLeft: (time: number) => void;
  isLoadingQuestions: boolean;
  setIsLoadingQuestions: (loading: boolean) => void;
  flashcardQuestions: FlashcardType[];
  setFlashcardQuestions: (questions: FlashcardType[]) => void;
  savedSessions: AsDate<SessionType & { stations?: { index: number; patientId: string }[] | null }>[];
  setSavedSessions: (sessions: SessionType[]) => void;
  selectedHistory: AsDate<FlashcardHistory>[];
  setSelectedHistory: (history: FlashcardHistory[]) => void;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
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
  fetchDepartments: () => Promise<void>;
  fetchTopicsByDepartment: (departmentId: string) => Promise<void>;
  fetchSavedSessions: () => Promise<void>;
  fetchFlashcardQuestions: (departmentId: string, topic: string, numQuestions: number) => Promise<void>;
  fetchFlashcardHistory: (sessionId: string) => Promise<void>;
  handleDepartmentSelect: (dept: string) => void;
  handleTopicSelect: (topic: string) => void;
  handleCreateDepartment: (section: 'clerking' | 'counselling' | 'physical_exam' | 'flashcards') => Promise<void>;
  handleCreateTopic: () => Promise<void>;
  handleDeckConfigSubmit: () => Promise<void>;
  handleSaveFlashcardHistory: () => Promise<void>;
  handleFlip: () => void;
  handleNext: () => void;
  handleSaveSession: () => Promise<void>;
  formatAnswer: (answer: string) => string;
  openManageList: (type: ManageType) => void;
  openEditItem: (item: any) => void;
  handleUpdate: () => Promise<void>;
  handleEditChange: (field: string, value: any) => void;
};

// Update the getDepartmentIcon function with more specific icons
function getDepartmentIcon(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('cardio') || lower.includes('heart')) return 'fa-heartbeat';
  if (lower.includes('neuro') || lower.includes('brain')) return 'fa-brain';
  if (lower.includes('ortho') || lower.includes('bone')) return 'fa-bone';
  if (lower.includes('pediatric') || lower.includes('child')) return 'fa-child';
  if (lower.includes('surgery') || lower.includes('surgical')) return 'fa-scalpel';
  if (lower.includes('psych') || lower.includes('mental')) return 'fa-brain';
  if (lower.includes('derma') || lower.includes('skin')) return 'fa-hand-sparkles';
  if (lower.includes('onco') || lower.includes('cancer')) return 'fa-microscope';
  if (lower.includes('gastro') || lower.includes('stomach')) return 'fa-stomach';
  if (lower.includes('respiratory') || lower.includes('lung')) return 'fa-lungs';
  if (lower.includes('renal') || lower.includes('kidney')) return 'fa-kidneys';
  if (lower.includes('endocrine') || lower.includes('hormone')) return 'fa-thyroid';
  if (lower.includes('infectious')) return 'fa-virus';
  if (lower.includes('emergency')) return 'fa-ambulance';
  if (lower.includes('family') || lower.includes('primary')) return 'fa-users';
  if (lower.includes('ophthalmology') || lower.includes('eye')) return 'fa-eye';
  if (lower.includes('ent') || lower.includes('ear')) return 'fa-ear-deaf';
  if (lower.includes('radiology')) return 'fa-x-ray';
  if (lower.includes('pathology')) return 'fa-microscope';
  return 'fa-hospital-user';
}

const FlashcardsSection: FC<FlashcardsSectionProps> = ({
  currentSection,
  switchSection,
  session,
  departments,
  currentDepartment,
  setCurrentDepartment,
  newDepartmentName,
  setNewDepartmentName,
  newDepartmentSlug,
  setNewDepartmentSlug,
  topics,
  setTopics,
  currentTopic,
  setCurrentTopic,
  newTopic,
  setNewTopic,
  selectedNumCards,
  setSelectedNumCards,
  flashDuration,
  setFlashDuration,
  currentFlashSession,
  setCurrentFlashSession,
  currentFlashIndex,
  setCurrentFlashIndex,
  isFlipped,
  setIsFlipped,
  timeLeft,
  setTimeLeft,
  isLoadingQuestions,
  setIsLoadingQuestions,
  flashcardQuestions,
  setFlashcardQuestions,
  savedSessions,
  setSavedSessions,
  selectedHistory,
  setSelectedHistory,
  showModal,
  setShowModal,
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
  fetchDepartments,
  fetchTopicsByDepartment,
  fetchSavedSessions,
  fetchFlashcardQuestions,
  fetchFlashcardHistory,
  handleDepartmentSelect,
  handleTopicSelect,
  handleCreateDepartment,
  handleCreateTopic,
  handleDeckConfigSubmit,
  handleSaveFlashcardHistory,
  handleFlip,
  handleNext,
  handleSaveSession,
  formatAnswer,
  openManageList,
  openEditItem,
  handleUpdate,
  handleEditChange,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

 // app/dashboard/components/FlashcardsSection.tsx - Updated department section

if (currentSection === 'flashcards-departments') {
  const flashcardDepartments = departments.filter(dept => dept.isFlashcardDept);
  
  const departmentColors = [
    'from-green-50 to-green-100/80 border-green-300/60 hover:border-green-400 dark:from-green-950/50 dark:to-green-900/50 dark:border-green-800/60 dark:hover:border-green-700',
    'from-blue-50 to-blue-100/80 border-blue-300/60 hover:border-blue-400 dark:from-blue-950/50 dark:to-blue-900/50 dark:border-blue-800/60 dark:hover:border-blue-700',
    'from-orange-50 to-orange-100/80 border-orange-300/60 hover:border-orange-400 dark:from-orange-950/50 dark:to-orange-900/50 dark:border-orange-800/60 dark:hover:border-orange-700',
    'from-purple-50 to-purple-100/80 border-purple-300/60 hover:border-purple-400 dark:from-purple-950/50 dark:to-purple-900/50 dark:border-purple-800/60 dark:hover:border-purple-700',
    'from-rose-50 to-rose-100/80 border-rose-300/60 hover:border-rose-400 dark:from-rose-950/50 dark:to-rose-900/50 dark:border-rose-800/60 dark:hover:border-rose-700',
    'from-cyan-50 to-cyan-100/80 border-cyan-300/60 hover:border-cyan-400 dark:from-cyan-950/50 dark:to-cyan-900/50 dark:border-cyan-800/60 dark:hover:border-cyan-700',
    'from-amber-50 to-amber-100/80 border-amber-300/60 hover:border-amber-400 dark:from-amber-950/50 dark:to-amber-900/50 dark:border-amber-800/60 dark:hover:border-amber-700',
    'from-violet-50 to-violet-100/80 border-violet-300/60 hover:border-violet-400 dark:from-violet-950/50 dark:to-violet-900/50 dark:border-violet-800/60 dark:hover:border-violet-700',
    'from-emerald-50 to-emerald-100/80 border-emerald-300/60 hover:border-emerald-400 dark:from-emerald-950/50 dark:to-emerald-900/50 dark:border-emerald-800/60 dark:hover:border-emerald-700',
    'from-pink-50 to-pink-100/80 border-pink-300/60 hover:border-pink-400 dark:from-pink-950/50 dark:to-pink-900/50 dark:border-pink-800/60 dark:hover:border-pink-700',
  ];
  
  return (
    <div className={cn("rounded-2xl shadow-xl p-8 backdrop-blur-sm", 
      isDark ? "bg-gray-800/95 border border-gray-700/50" : "bg-gradient-to-br from-white to-blue-50/80 border border-blue-100/50"
    )}>
      <h2 className={cn("text-3xl font-bold mb-8 flex items-center", 
        isDark ? "text-gray-100" : "text-slate-800"
      )}>
        <i className="fas fa-book-open mr-4 text-blue-500 dark:text-blue-400"></i>
        Flashcards - Select Department
      </h2>
      
      {flashcardDepartments.length === 0 ? (
        <div className="text-center py-12">
          <i className="fas fa-folder-open text-5xl text-gray-400 dark:text-gray-600 mb-4"></i>
          <p className={cn("text-lg mb-2", isDark ? "text-gray-400" : "text-slate-600")}>
            No flashcard departments available.
          </p>
          <p className={isDark ? "text-gray-500" : "text-slate-500"}>
            Create a new department to get started with flashcards.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {flashcardDepartments.map((dept, index) => {
            const colorIndex = index % departmentColors.length;
            const colorClass = departmentColors[colorIndex];
            
            return (
              <div
                key={dept.id}
                onClick={() => handleDepartmentSelect(dept.id)}
                className={cn(
                  "group relative overflow-hidden bg-gradient-to-br",
                  colorClass,
                  "border-2 rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 backdrop-blur-sm cursor-pointer"
                )}
              >
                {/* Background gradient effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                
                <div className="relative z-10">
                  {/* Icon Container */}
                  <div className={cn(
                    "inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3",
                    isDark 
                      ? "bg-gray-800/80 text-blue-400 group-hover:bg-blue-900/50" 
                      : "bg-white/80 text-blue-600 group-hover:bg-blue-100"
                  )}>
                    <i className={`fas ${getDepartmentIcon(dept.name)} text-2xl`}></i>
                  </div>
                  
                  {/* Department Name */}
                  <h3 className={cn(
                    "text-xl font-bold mb-2 transition-colors duration-300",
                    isDark ? "text-gray-100 group-hover:text-blue-400" : "text-slate-800 group-hover:text-blue-600"
                  )}>
                    {dept.name}
                  </h3>
                  
                  {/* Optional description or badge */}
                  <div className="flex items-center mt-3">
                    <span className={cn(
                      "text-xs px-2 py-1 rounded-full",
                      isDark ? "bg-gray-700/50 text-gray-400" : "bg-gray-100/80 text-gray-600"
                    )}>
                      <i className="fas fa-layer-group mr-1 text-xs"></i>
                      Flashcards
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <div className="flex flex-wrap justify-end gap-4 mt-6">
        {session?.user?.role === 'admin' && (
          <button
            onClick={() => openManageList('department')}
            className={cn(
              "px-6 py-3 rounded-xl transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl cursor-pointer",
              isDark 
                ? "bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600" 
                : "bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-700 border border-blue-300"
            )}
          >
            <i className="fas fa-edit mr-3"></i>
            Manage Departments
          </button>
        )}
        {session?.user?.role === 'admin' && (
          <button
            onClick={() => switchSection('flashcards-create-department')}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white rounded-xl transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
          >
            <i className="fas fa-plus mr-3"></i>
            Create New Department
          </button>
        )}
        <button
          onClick={() => switchSection('flashcards-saved')}
          className={cn(
            "px-6 py-3 rounded-xl transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl cursor-pointer",
            isDark 
              ? "border-2 border-gray-700 hover:border-gray-500 hover:bg-gray-800/80 text-gray-300" 
              : "border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700"
          )}
        >
          <i className="fas fa-save mr-3"></i>
          View Saved Sessions
        </button>
      </div>
    </div>
  );
}
  if (currentSection === 'flashcards-create-department') {
    return (
      <div className={cn("rounded-2xl shadow-lg p-8 backdrop-blur-sm", isDark ? "bg-gray-800/90 border border-gray-700/50" : "bg-gradient-to-br from-white/95 to-blue-50/95 border border-blue-100/50")}>
        <h2 className={cn("text-3xl font-bold mb-8 flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
          <i className="fas fa-plus mr-4 text-blue-500"></i>Create New Department
        </h2>
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className={cn("p-6 rounded-2xl border shadow-sm", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
            <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
              <i className="fas fa-tag mr-3 text-blue-500"></i>Department Name
            </label>
            <input
              type="text"
              value={newDepartmentName}
              onChange={(e) => setNewDepartmentName(e.target.value)}
              className={cn("w-full p-4 rounded-xl focus:ring-4 transition-all duration-200 text-lg", isDark ? "bg-gray-800 border-2 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200 placeholder:text-gray-500" : "border-2 border-slate-200/50 focus:border-blue-400 focus:ring-4 focus:ring-blue-100")}
              placeholder="e.g., Cardiology"
            />
          </div>
          <div className={cn("p-6 rounded-2xl border shadow-sm", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
            <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
              <i className="fas fa-link mr-3 text-blue-500"></i>Department Slug
            </label>
            <input
              type="text"
              value={newDepartmentSlug}
              onChange={(e) => setNewDepartmentSlug(e.target.value)}
              className={cn("w-full p-4 rounded-xl focus:ring-4 transition-all duration-200 text-lg", isDark ? "bg-gray-800 border-2 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200 placeholder:text-gray-500" : "border-2 border-slate-200/50 focus:border-blue-400 focus:ring-4 focus:ring-blue-100")}
              placeholder="e.g., cardiology"
            />
          </div>
        </div>
        <div className="flex justify-end gap-4">
          <button
            onClick={() => switchSection('flashcards-departments')}
            className={cn("px-6 py-3 border-2 rounded-xl transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl cursor-pointer", isDark ? "border-gray-700/50 hover:border-gray-500 hover:bg-gray-800/80 text-gray-300" : "border-slate-200/50 hover:border-slate-400 hover:bg-slate-50/80 text-slate-700")}
          >
            <i className="fas fa-times mr-3"></i>Cancel
          </button>
          <button
            onClick={() => handleCreateDepartment('flashcards')}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-violet-600 text-white rounded-xl hover:from-blue-600 hover:to-violet-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
          >
            <i className="fas fa-check mr-3"></i>Create
          </button>
        </div>
      </div>
    );
  }
  
  if (currentSection === 'flashcards-topic-list') {
  const topicColors = [
    'from-green-50 to-green-100/80 border-green-300/60 hover:border-green-400 dark:from-green-950/50 dark:to-green-900/50 dark:border-green-800/60 dark:hover:border-green-700',
    'from-blue-50 to-blue-100/80 border-blue-300/60 hover:border-blue-400 dark:from-blue-950/50 dark:to-blue-900/50 dark:border-blue-800/60 dark:hover:border-blue-700',
    'from-orange-50 to-orange-100/80 border-orange-300/60 hover:border-orange-400 dark:from-orange-950/50 dark:to-orange-900/50 dark:border-orange-800/60 dark:hover:border-orange-700',
    'from-purple-50 to-purple-100/80 border-purple-300/60 hover:border-purple-400 dark:from-purple-950/50 dark:to-purple-900/50 dark:border-purple-800/60 dark:hover:border-purple-700',
    'from-rose-50 to-rose-100/80 border-rose-300/60 hover:border-rose-400 dark:from-rose-950/50 dark:to-rose-900/50 dark:border-rose-800/60 dark:hover:border-rose-700',
  ];
  
  return (
    <div className={cn("rounded-2xl shadow-xl p-8 backdrop-blur-sm", 
      isDark ? "bg-gray-800/95 border border-gray-700/50" : "bg-gradient-to-br from-white to-blue-50/80 border border-blue-100/50"
    )}>
      <h2 className={cn("text-3xl font-bold mb-8 flex items-center", 
        isDark ? "text-gray-100" : "text-slate-800"
      )}>
        <i className="fas fa-list mr-4 text-blue-500 dark:text-blue-400"></i>
        Select Topic
      </h2>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {topics.map((topicItem, index) => {
          const colorIndex = index % topicColors.length;
          const colorClass = topicColors[colorIndex];
          
          return (
            <div
              key={topicItem.id}
              onClick={() => handleTopicSelect(topicItem.topic)}
              className={cn(
                "group relative overflow-hidden bg-gradient-to-br",
                colorClass,
                "border-2 rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 backdrop-blur-sm cursor-pointer"
              )}
            >
              {/* Background gradient effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              
              <div className="relative z-10">
                {/* Icon Container */}
                <div className={cn(
                  "inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 transition-all duration-300 group-hover:scale-110",
                  isDark 
                    ? "bg-gray-800/80 text-purple-400 group-hover:bg-purple-900/50" 
                    : "bg-white/80 text-purple-600 group-hover:bg-purple-100"
                )}>
                  <i className="fas fa-tag text-xl"></i>
                </div>
                
                {/* Topic Name */}
                <h3 className={cn(
                  "text-lg font-bold transition-colors duration-300",
                  isDark ? "text-gray-100 group-hover:text-purple-400" : "text-slate-800 group-hover:text-purple-600"
                )}>
                  {topicItem.topic}
                </h3>
                
                {/* Optional card count badge */}
                <div className="flex items-center mt-3">
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-full",
                    isDark ? "bg-gray-700/50 text-gray-400" : "bg-gray-100/80 text-gray-600"
                  )}>
                    <i className="fas fa-copy mr-1 text-xs"></i>
                    Flashcards Available
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="flex flex-wrap justify-end gap-4">
        {session?.user?.role === 'admin' && (
          <button
            onClick={() => openManageList('topic')}
            className={cn(
              "px-6 py-3 rounded-xl transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl cursor-pointer",
              isDark 
                ? "bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600" 
                : "bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-700 border border-blue-300"
            )}
          >
            <i className="fas fa-edit mr-3"></i>
            Manage Topics
          </button>
        )}
        {session?.user?.role === 'admin' && (
          <button
            onClick={() => switchSection('flashcards-create-topic')}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white rounded-xl transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
          >
            <i className="fas fa-plus mr-3"></i>
            Create New Topic
          </button>
        )}
      </div>
    </div>
  );
}
  
  if (currentSection === 'flashcards-create-topic') {
    return (
      <div className={cn("rounded-2xl shadow-lg p-8 backdrop-blur-sm", isDark ? "bg-gray-800/90 border border-gray-700/50" : "bg-gradient-to-br from-white/95 to-blue-50/95 border border-blue-100/50")}>
        <h2 className={cn("text-3xl font-bold mb-8 flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
          <i className="fas fa-plus mr-4 text-blue-500"></i>Create New Topic
        </h2>
        <div className={cn("p-6 rounded-2xl border shadow-sm mb-8", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
          <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
            <i className="fas fa-tags mr-3 text-blue-500"></i>Topic Name
          </label>
          <input
            type="text"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            className={cn("w-full p-4 rounded-xl focus:ring-4 transition-all duration-200 text-lg", isDark ? "bg-gray-800 border-2 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200 placeholder:text-gray-500" : "border-2 border-slate-200/50 focus:border-blue-400 focus:ring-4 focus:ring-blue-100")}
            placeholder="e.g., Heart Failure"
          />
        </div>
        <div className="flex justify-end gap-4">
          <button
            onClick={() => switchSection('flashcards-topic-list')}
            className={cn("px-6 py-3 border-2 rounded-xl transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl cursor-pointer", isDark ? "border-gray-700/50 hover:border-gray-500 hover:bg-gray-800/80 text-gray-300" : "border-slate-200/50 hover:border-slate-400 hover:bg-slate-50/80 text-slate-700")}
          >
            <i className="fas fa-times mr-3"></i>Cancel
          </button>
          <button
            onClick={handleCreateTopic}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-violet-600 text-white rounded-xl hover:from-blue-600 hover:to-violet-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
          >
            <i className="fas fa-check mr-3"></i>Create
          </button>
        </div>
      </div>
    );
  }
  
  if (currentSection === 'flashcards-deck-config') {
    return (
      <div className={cn("rounded-2xl shadow-lg p-8 backdrop-blur-sm", isDark ? "bg-gray-800/90 border border-gray-700/50" : "bg-gradient-to-br from-white/95 to-blue-50/95 border border-blue-100/50")}>
        <h2 className={cn("text-3xl font-bold mb-8 flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
          <i className="fas fa-cog mr-4 text-blue-500"></i>Configure Flashcard Deck
        </h2>
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className={cn("p-6 rounded-2xl border shadow-sm", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
            <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
              <i className="fas fa-list-ol mr-3 text-blue-500"></i>Number of Cards
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={selectedNumCards}
              onChange={(e) => setSelectedNumCards(parseInt(e.target.value) || 5)}
              className={cn("w-full p-4 rounded-xl focus:ring-4 transition-all duration-200 text-lg", isDark ? "bg-gray-800 border-2 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200" : "border-2 border-slate-200/50 focus:border-blue-400 focus:ring-4 focus:ring-blue-100")}
              placeholder="1-50"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge text={`${selectedNumCards} cards`} value={selectedNumCards.toString()} />
            </div>
          </div>
          <div className={cn("p-6 rounded-2xl border shadow-sm", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
            <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
              <i className="fas fa-clock mr-3 text-amber-500"></i>Duration (minutes)
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={flashDuration}
              onChange={(e) => setFlashDuration(parseInt(e.target.value) || 10)}
              className={cn("w-full p-4 rounded-xl focus:ring-4 transition-all duration-200 text-lg", isDark ? "bg-gray-800 border-2 border-gray-700 focus:border-amber-500 focus:ring-amber-900/30 text-gray-200" : "border-2 border-slate-200/50 focus:border-amber-400 focus:ring-4 focus:ring-amber-100")}
              placeholder="1-60"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge text={`${flashDuration} minutes`} value={flashDuration.toString()} />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleDeckConfigSubmit}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-violet-600 text-white rounded-xl hover:from-blue-600 hover:to-violet-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
          >
            <i className="fas fa-play mr-3"></i>Start Flashcard Session
          </button>
        </div>
      </div>
    );
  }
  
  if (currentSection === 'flashcards-session' && currentFlashSession) {
    return (
      <div className={cn("rounded-2xl shadow-lg p-8 backdrop-blur-sm relative", isDark ? "bg-gray-800/90 border border-gray-700/50" : "bg-gradient-to-br from-white/95 to-blue-50/95 border border-blue-100/50")}>
        <h2 className={cn("text-3xl font-bold mb-8 flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
          <i className="fas fa-book-open mr-4 text-blue-500"></i>Flashcard Session
        </h2>
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className={cn("group p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer", 
  isDark ? "bg-violet-950/80" : "bg-violet-50/80"
)}>
  <h3 className={cn("text-lg font-semibold mb-2 flex items-center", 
    isDark ? "text-gray-200" : "text-slate-800"
  )}>
    <i className={cn("fas fa-clock mr-2", isDark ? "text-amber-400" : "text-amber-500")}></i>
    Time Left
  </h3>
  <p className={isDark ? "text-gray-400" : "text-slate-600"}>
    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
  </p>
</div>
          <div className={cn("group p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer", isDark ? "bg-violet-950/80" : "bg-violet-50/80")}>
            <h3 className={cn("text-lg font-semibold mb-2 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
              <i className="fas fa-question-circle mr-2 text-blue-500"></i>Card
            </h3>
            <p className={isDark ? "text-gray-400" : "text-slate-600"}>{currentFlashIndex + 1} of {currentFlashSession.numQuestions}</p>
          </div>
        </div>
        {isLoadingQuestions ? (
          <Spinner />
        ) : (
          flashcardQuestions.length > 0 && (
            <div className={cn("p-6 rounded-2xl border shadow-sm mb-8", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
              <h3 className={cn("text-xl font-bold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
                <i className="fas fa-question mr-3 text-blue-500"></i>Question
              </h3>
              <p className={cn("mb-6", isDark ? "text-gray-400" : "text-slate-600")}>{flashcardQuestions[currentFlashIndex].question}</p>
              {!isFlipped && (
                <button
                  onClick={handleFlip}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer mx-auto"
                >
                  <i className="fas fa-eye mr-3"></i>Reveal Answer
                </button>
              )}
              {isFlipped && (
                <div>
                  <h3 className={cn("text-xl font-bold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
                    <i className="fas fa-check mr-3 text-green-500"></i>Answer
                  </h3>
                  <div dangerouslySetInnerHTML={{ __html: formatAnswer(flashcardQuestions[currentFlashIndex].answer) }} className={isDark ? "text-gray-400" : "text-slate-600"} />
                </div>
              )}
            </div>
          )
        )}
        <div className="flex justify-between gap-4">
          <button
            onClick={() => switchSection('flashcards-deck-config')}
            className={cn("px-6 py-3 border-2 rounded-xl transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl cursor-pointer", isDark ? "border-gray-700/50 hover:border-gray-500 hover:bg-gray-800/80 text-gray-300" : "border-slate-200/50 hover:border-slate-400 hover:bg-slate-50/80 text-slate-700")}
          >
            <i className="fas fa-stop mr-3"></i>End Session
          </button>
          <button
            onClick={handleNext}
            disabled={!isFlipped}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-violet-600 text-white rounded-xl hover:from-blue-600 hover:to-violet-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 cursor-pointer"
          >
            <i className="fas fa-arrow-right mr-3"></i>Next
          </button>
        </div>
      </div>
    );
  }
  
  if (currentSection === 'flashcards-review') {
    return (
      <div className={cn("rounded-2xl shadow-lg p-8 backdrop-blur-sm", isDark ? "bg-gray-800/90 border border-gray-700/50" : "bg-gradient-to-br from-white/95 to-blue-50/95 border border-blue-100/50")}>
        <h2 className={cn("text-3xl font-bold mb-8 flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
          <i className="fas fa-search mr-4 text-blue-500"></i>Review Flashcards
        </h2>
        <div className="space-y-6 mb-8">
          {flashcardQuestions.map((card, index) => (
            <div key={index} className={cn("p-6 rounded-2xl border shadow-sm", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
              <h3 className={cn("text-xl font-bold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
                <i className="fas fa-question mr-3 text-blue-500"></i>Question {index + 1}
              </h3>
              <p className={cn("mb-4", isDark ? "text-gray-400" : "text-slate-600")}>{card.question}</p>
              <h3 className={cn("text-xl font-bold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
                <i className="fas fa-check mr-3 text-green-500"></i>Answer
              </h3>
              <div dangerouslySetInnerHTML={{ __html: formatAnswer(card.answer) }} className={isDark ? "text-gray-400" : "text-slate-600"} />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap justify-end gap-4">
          <button
            onClick={handleSaveSession}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
          >
            <i className="fas fa-save mr-3"></i>Save Session
          </button>
          <button
            onClick={() => switchSection('flashcards-saved')}
            className={cn("px-6 py-3 border-2 rounded-xl transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl cursor-pointer", isDark ? "border-gray-700/50 hover:border-gray-500 hover:bg-gray-800/80 text-gray-300" : "border-slate-200/50 hover:border-slate-400 hover:bg-slate-50/80 text-slate-700")}
          >
            <i className="fas fa-archive mr-3"></i>View Saved Sessions
          </button>
          <button
            onClick={() => switchSection('flashcards-departments')}
            className={cn("px-6 py-3 border-2 rounded-xl transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl cursor-pointer", isDark ? "border-gray-700/50 hover:border-gray-500 hover:bg-gray-800/80 text-gray-300" : "border-slate-200/50 hover:border-slate-400 hover:bg-slate-50/80 text-slate-700")}
          >
            <i className="fas fa-arrow-left mr-3"></i>Back to Departments
          </button>
        </div>
      </div>
    );
  }
  
  if (currentSection === 'flashcards-saved') {
    return (
      <div className={cn("rounded-2xl shadow-lg p-8 backdrop-blur-sm", isDark ? "bg-gray-800/90 border border-gray-700/50" : "bg-gradient-to-br from-white/95 to-blue-50/95 border border-blue-100/50")}>
        <h2 className={cn("text-3xl font-bold mb-8 flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
          <i className="fas fa-archive mr-4 text-blue-500"></i>Saved Flashcard Sessions
        </h2>
        <div className="space-y-6 mb-8">
          {savedSessions.length === 0 ? (
            <p className={cn("text-center text-lg", isDark ? "text-gray-400" : "text-slate-600")}>No saved sessions available.</p>
          ) : (
            savedSessions
              .filter((s) => s.type === 'flashcards')
              .map((session) => (
                <div key={session.id} className={cn("p-6 rounded-2xl border shadow-sm", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
                  <h3 className={cn("text-xl font-bold mb-2 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
                    <i className="fas fa-file mr-3 text-blue-500"></i>Session: {session.topic || 'Untitled'}
                  </h3>
                  <p className={cn("mb-1 flex items-center", isDark ? "text-gray-400" : "text-slate-600")}><i className="fas fa-calendar mr-3 text-slate-500"></i>Created: {new Date(session.createdAt).toLocaleString()}</p>
                  <p className={cn("mb-1 flex items-center", isDark ? "text-gray-400" : "text-slate-600")}><i className="fas fa-question mr-3 text-slate-500"></i>Number of Questions: {session.numQuestions || 'N/A'}</p>
                  <p className={cn("mb-4 flex items-center", isDark ? "text-gray-400" : "text-slate-600")}><i className="fas fa-clock mr-3 text-amber-500"></i>Duration: {session.duration} minutes</p>
                  <button
                    onClick={() => fetchFlashcardHistory(session.id)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-violet-600 text-white rounded-xl hover:from-blue-600 hover:to-violet-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
                  >
                    <i className="fas fa-search mr-3"></i>Review Questions
                  </button>
                </div>
              ))
          )}
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => switchSection('flashcards-departments')}
            className={cn("px-6 py-3 border-2 rounded-xl transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl cursor-pointer", isDark ? "border-gray-700/50 hover:border-gray-500 hover:bg-gray-800/80 text-gray-300" : "border-slate-200/50 hover:border-slate-400 hover:bg-slate-50/80 text-slate-700")}
          >
            <i className="fas fa-arrow-left mr-3"></i>Back to Departments
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default FlashcardsSection;