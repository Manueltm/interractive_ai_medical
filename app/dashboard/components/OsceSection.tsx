// app/dashboard/components/OsceSection.tsx
'use client';

import { FC } from "react";
import { toast } from 'sonner';
import { Badge, AllBadge } from './Badge';
import MultiSelect from './MultiSelect';
import { MaleIcon, FemaleIcon } from './Icons';
import { getRandomMedicalQuote } from '@/lib/utils';
import VapiVoiceInterface from './VapiVoiceInterface';
import { DepartmentType } from '@/lib/types/department';
import { Session } from "next-auth";
import type { AsDate } from '@/lib/types';
import { Department, PatientCase, Patient, SessionType, StationConfig, Chat, ManageType } from "@/lib/db/schema";
import type { StringOrDate } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useDebounce } from 'use-debounce';
import { useTheme } from "next-themes";
import { cn } from "@/utils";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { VoiceProvider, useVoice, VoiceReadyState } from '@humeai/voice-react';
import { DBMessage } from '@/lib/db/schema';
import { pickHumeVoice } from '@/utils/voicePreset';

// ====================== FULL OsceSectionProps TYPE ======================
export type OsceSectionProps = {
  showChiefComplaint: boolean;
  showPresentingCondition: boolean;
  hintsEnabled: boolean;
  aiTutorEnabled: boolean;
  currentSection: string;
  switchSection: (section: string) => void;
  session: Session | null;
  isProceedClicked: boolean;
  setIsProceedClicked: (clicked: boolean) => void;
  selectedStations: number;
  setSelectedStations: (stations: number) => void;
  selectedDuration: number;
  setSelectedDuration: (duration: number) => void;
  stationConfigs: StationConfig[];
  setStationConfigs: (configs: StationConfig[]) => void;
  departments: DepartmentType[];
  currentDepartment: string;
  setCurrentDepartment: (dept: string) => void;
  newDepartmentName: string;
  setNewDepartmentName: (name: string) => void;
  newDepartmentSlug: string;
  setNewDepartmentSlug: (slug: string) => void;
  newCaseTitle: string;
  setNewCaseTitle: (title: string) => void;
  newCaseDescription: string;
  setNewCaseDescription: (desc: string) => void;
  newCaseDifficulty: 'easy' | 'medium' | 'hard';
  setNewCaseDifficulty: (diff: 'easy' | 'medium' | 'hard') => void;
  newCaseTopic: string;
  setNewCaseTopic: (topic: string) => void;
  selectedCase: PatientCase | null;
  setSelectedCase: (caseItem: PatientCase | null) => void;
  newPatientName: string;
  setNewPatientName: (name: string) => void;
  newPatientAge: string;
  setNewPatientAge: (age: string) => void;
  newPatientGender: 'male' | 'female' | 'other';
  setNewPatientGender: (gender: 'male' | 'female' | 'other') => void;
  newPatientLocation: string;
  setNewPatientLocation: (loc: string) => void;
  newPatientCondition: string;
  setNewPatientCondition: (cond: string) => void;
  newPatientPrompt: string;
  setNewPatientPrompt: (prompt: string) => void;
  newPatientImage: string | null;
  setNewPatientImage: (img: string | null) => void;
  currentSession: AsDate<SessionType & { stations?: { index: number; patientId: string }[] | null }> | null;
  setCurrentSession: (session: SessionType | null) => void;
  stationPatients: { index: number; patient: AsDate<Patient> }[];
  setStationPatients: (patients: { index: number; patient: Patient }[]) => void;
  currentStation: number;
  setCurrentStation: (station: number) => void;
  showLoadingPopup: boolean;
  setShowLoadingPopup: (show: boolean) => void;
  loadingMessage: string;
  setLoadingMessage: (msg: string) => void;
  currentMedicalQuote: { text: string; author: string } | null;
  setCurrentMedicalQuote: (quote: { text: string; author: string } | null) => void;
  showSwitchingModal: boolean;
  setShowSwitchingModal: (show: boolean) => void;
  switchingMessage: string;
  setSwitchingMessage: (msg: string) => void;
  isStartClicked: boolean;
  setIsStartClicked: (clicked: boolean) => void;
  incompleteSession: (AsDate<Chat> & { patientName?: string }) | null;
  setIncompleteSession: (session: (Chat & { patientName?: string }) | null) => void;
  showIncompletePrompt: boolean;
  setShowIncompletePrompt: (show: boolean) => void;
  resolverRef: React.MutableRefObject<(value: boolean) => void | undefined>;
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
  patientCases: PatientCase[];
  patients: Patient[];
  currentSessionType: 'clerking' | 'counselling' | 'physical_exam' | 'flashcards' | null;
  setCurrentSessionType: (type: 'clerking' | 'counselling' | 'physical_exam' | 'flashcards' | null) => void;
  fetchDepartments: () => Promise<void>;
  fetchPatientCases: () => Promise<void>;
  fetchPatients: () => Promise<void>;
  updateStations: (value: number, type: 'clerking' | 'counselling' | 'physical_exam') => void;
  handleStationChange: (index: number, field: keyof StationConfig, value: any) => void;
  handleCaseChange: (index: number, deptId: string, caseIds: string[]) => void;
  handleProceed: (
  type: 'clerking' | 'counselling' | 'physical_exam' | 'flashcards', 
  config?: {
    stationConfigs?: StationConfig[];
    selectedStations?: number;
    selectedDuration?: number;
  }
) => Promise<void>;
  handleStart: (type: 'clerking' | 'counselling' | 'physical_exam') => Promise<void>;
  handleCreateDepartment: (section: 'clerking' | 'counselling' | 'physical_exam' | 'flashcards') => Promise<void>;
  handleCreateCase: (type: 'clerking' | 'counselling' | 'physical_exam') => Promise<void>;
  handleCreatePatient: (section: 'clerking' | 'counselling' | 'physical_exam') => Promise<void>;
  handleStartStationSimulation: () => Promise<void>;
  handleProceedStation: () => void;
  getSelectedDepartments: () => string;
  getSelectedCases: () => string;
  getFilteredCases: () => AsDate<PatientCase>[];
  getFilteredPatients: () => AsDate<Patient>[];
  openManageList: (type: ManageType) => void;
  openEditItem: (item: any) => void;
  handleUpdate: () => Promise<void>;
  handleEditChange: (field: string, value: any) => void;
  handleTerminateIncomplete: () => Promise<void>;
  handleContinueIncomplete: () => void;
  fetchIncompleteSession: () => Promise<(Chat & { patientName?: string }) | null>;
  startSimulation: () => void;
  debugPatientSelection: () => void;
  currentChat: AsDate<Chat & { examSteps?: { name: string; videoUrl: string }[] | null }> | null;
  setCurrentChat: (chat: Chat | null) => void;
  // Update the voiceSessionData type in the OsceSectionProps interface
voiceSessionData: {
  accessToken: string;
  patient: AsDate<Patient> | null;
  chatId: string;
  type: 'clerking' | 'counselling' | 'physical_exam' | 'flashcards';
  examSteps: { name: string; videoUrl: string }[];
  stationInfo: { current: number; total: number };
  durationMinutes?: number;
  mode?: 'practice' | 'exam';
  existingMessages?: Array<{ role: string; content: string; createdAt: string }>;
  elapsedTime?: number;
  department?: { id: string; name: string; slug?: string } | null;
  remountKey?: string;  // ← ADD THIS LINE
} | null;
  setVoiceSessionData: (data: any) => void;
  handleExitVoiceSession: () => void;
};

// ====================== HELPER COMPONENTS ======================
const NumberInput = ({
  value,
  onChange,
  min = 1,
  max = 30,
  defaultValue = 5,
  className = "",
  placeholder = "",
  ...props
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  defaultValue?: number;
  className?: string;
  placeholder?: string;
  [key: string]: any;
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [inputValue, setInputValue] = useState<string>(value.toString());

  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setInputValue(rawValue);
    if (rawValue === '') return;
    const numValue = parseInt(rawValue, 10);
    if (!isNaN(numValue)) {
      const clampedValue = Math.min(Math.max(numValue, min), max);
      onChange(clampedValue);
    }
  };

  const handleBlur = () => {
    let finalValue = value;
    if (isNaN(value) || value === 0 || value < min) {
      finalValue = defaultValue;
      onChange(finalValue);
    } else if (value > max) {
      finalValue = max;
      onChange(finalValue);
    }
    setInputValue(finalValue.toString());
  };

  return (
    <input
      type="number"
      min={min}
      max={max}
      value={inputValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={cn(
        "w-full p-4 rounded-xl focus:ring-4 transition-all duration-200 text-lg",
        isDark
          ? "bg-gray-800 border-2 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200"
          : "bg-white border-2 border-blue-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 text-slate-800",
        className
      )}
      {...props}
    />
  );
};

const StepIndicator = ({ currentStep, steps }: { currentStep: number; steps: string[] }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <div className="mb-8">
      <div className="flex items-center justify-center max-w-2xl mx-auto">
        {steps.map((step, index) => {
          const isActive = currentStep === index + 1;
          const isCompleted = currentStep > index + 1;
          return (
            <React.Fragment key={index}>
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300",
                    isActive
                      ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg scale-110"
                      : isCompleted
                      ? "bg-green-500 text-white"
                      : isDark
                      ? "bg-gray-700 text-gray-400"
                      : "bg-blue-100 text-blue-600"
                  )}
                >
                  {isCompleted ? <i className="fas fa-check text-xs"></i> : index + 1}
                </div>
                <span
                  className={cn(
                    "mt-1 text-xs font-medium",
                    isActive ? "text-blue-600" : isDark ? "text-gray-400" : "text-slate-500"
                  )}
                >
                  {step}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "w-8 h-0.5 mx-1",
                    isCompleted ? "bg-green-500" : isDark ? "bg-gray-700" : "bg-blue-200"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

const NumberSelector = ({
  value,
  onChange,
  min,
  max,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  label?: string;
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div>
      {label && (
        <label className={cn("block text-sm font-semibold mb-3", isDark ? "text-gray-300" : "text-blue-700")}>
          {label}
        </label>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold transition-all duration-300",
            isDark
              ? "bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
              : "bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-200 shadow-sm"
          )}
        >
          −
        </button>
        <div className="flex-1 flex gap-2 overflow-x-auto py-2">
          {numbers.map((num) => (
            <button
              key={num}
              onClick={() => onChange(num)}
              className={cn(
                "w-14 h-14 rounded-xl font-bold text-lg transition-all duration-300",
                value === num
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg transform scale-110 ring-2 ring-blue-300"
                  : isDark
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600"
                  : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200 shadow-sm"
              )}
            >
              {num}
            </button>
          ))}
        </div>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold transition-all duration-300",
            isDark
              ? "bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
              : "bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-200 shadow-sm"
          )}
        >
          +
        </button>
      </div>
    </div>
  );
};

const ToggleSwitch = ({
  enabled,
  onChange,
  label,
  description,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label: string;
  description?: string;
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <div className="flex items-center justify-between py-4">
      <div>
        <p className={cn("font-medium", isDark ? "text-gray-200" : "text-slate-800")}>{label}</p>
        {description && <p className={cn("text-sm mt-1", isDark ? "text-gray-400" : "text-slate-500")}>{description}</p>}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          enabled ? "bg-blue-600" : isDark ? "bg-gray-600" : "bg-slate-300"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300",
            enabled ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
};

const ModeCard = ({
  mode,
  selected,
  onSelect,
  icon,
  title,
  badge,
  description,
  features,
}: {
  mode: string;
  selected: boolean;
  onSelect: () => void;
  icon: string;
  title: string;
  badge: string;
  description: string;
  features: string[];
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isPractice = mode === 'practice';
  const isExam = mode === 'exam';
  
  const getCardGradient = () => {
    if (selected) {
      return isPractice 
        ? "border-blue-500 bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl"
        : "border-green-500 bg-gradient-to-br from-green-500 to-emerald-600 shadow-xl";
    }
    if (isPractice) {
      return isDark 
        ? "border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:shadow-lg"
        : "border-blue-200 bg-white/90 hover:border-blue-300 hover:shadow-lg hover:bg-blue-50/50";
    }
    return isDark 
      ? "border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:shadow-lg"
      : "border-green-200 bg-white/90 hover:border-green-300 hover:shadow-lg hover:bg-green-50/50";
  };

  const getBadgeColors = () => {
    if (selected) {
      return "bg-white/90 text-gray-800 dark:bg-white/90 dark:text-gray-800";
    }
    if (badge === "Flexible") {
      return isDark
        ? "bg-green-900/50 text-green-300"
        : "bg-green-100 text-green-800 border border-green-300";
    }
    return isDark
      ? "bg-red-900/50 text-red-300"
      : "bg-amber-100 text-amber-800 border border-amber-300";
  };

  const getIconColors = () => {
    if (selected) {
      return "text-white";
    }
    return isPractice 
      ? (isDark ? "text-gray-400" : "text-blue-500")
      : (isDark ? "text-gray-400" : "text-green-500");
  };

  const getTextColors = () => {
    if (selected) {
      return "text-white";
    }
    return isDark ? "text-gray-200" : "text-slate-800";
  };

  const getDescriptionColors = () => {
    if (selected) {
      return "text-white/90";
    }
    return isDark ? "text-gray-400" : "text-slate-600";
  };

  const getFeatureColors = () => {
    if (selected) {
      return "bg-white/20 text-white/90";
    }
    return isDark ? "bg-gray-700 text-gray-300" : "bg-white/80 text-slate-600 shadow-sm";
  };

  const getBorderColor = () => {
    if (selected) return "";
    return isDark ? "border-gray-700" : "border-gray-200";
  };

  return (
    <div
      onClick={onSelect}
      className={cn(
        "relative cursor-pointer rounded-2xl p-6 transition-all duration-300 border-2",
        getCardGradient(),
        selected ? "transform scale-105" : getBorderColor()
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <i className={`fas ${icon} text-2xl ${getIconColors()}`}></i>
          <h3 className={cn("text-xl font-bold", getTextColors())}>{title}</h3>
        </div>
        <span
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm",
            getBadgeColors()
          )}
        >
          {badge}
        </span>
      </div>
      <p className={cn("mb-4", getDescriptionColors())}>{description}</p>
      <hr className={cn("my-4", selected ? "border-white/20" : isDark ? "border-gray-700" : "border-blue-200")} />
      <div className="flex flex-wrap gap-2">
        {features.map((feature, idx) => (
          <span
            key={idx}
            className={cn(
              "px-2 py-1 rounded-lg text-xs",
              getFeatureColors()
            )}
          >
            {feature}
          </span>
        ))}
      </div>
      {selected && (
        <div className="absolute top-4 right-4">
          <i className="fas fa-check-circle text-xl text-white drop-shadow-md"></i>
        </div>
      )}
    </div>
  );
};

const DepartmentBadge = ({
  department,
  selected,
  onToggle,
}: {
  department: Department;
  selected: boolean;
  onToggle: () => void;
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      onClick={onToggle}
      className={cn(
        "px-5 py-3 rounded-xl text-base font-medium transition-all duration-300",
        selected
          ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md transform scale-105"
          : isDark
          ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
          : "bg-cyan-100 text-cyan-800 hover:bg-cyan-200 border border-cyan-200 shadow-sm"
      )}
    >
      {department.name}
    </button>
  );
};

const TopicBadge = ({
  topic,
  selected,
  onToggle,
}: {
  topic: { id: string; name: string };
  selected: boolean;
  onToggle: () => void;
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      onClick={onToggle}
      className={cn(
        "px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-1",
        selected
          ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md transform scale-105"
          : isDark
          ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
          : "bg-teal-100 text-teal-800 hover:bg-teal-200 border border-teal-200 shadow-sm"
      )}
    >
      <i className={`fas ${selected ? 'fa-check-circle' : 'fa-circle'} text-xs`}></i>
      {topic.name}
    </button>
  );
};

const OsceLoadingModal = React.memo(
  ({
    show,
    message,
    quote,
  }: {
    show: boolean;
    message: string;
    quote: { text: string; author: string } | null;
  }) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [shouldRender, setShouldRender] = useState(show);
    useEffect(() => {
      if (show) {
        setShouldRender(true);
      } else {
        const timer = setTimeout(() => setShouldRender(false), 150);
        return () => clearTimeout(timer);
      }
    }, [show]);
    if (!shouldRender) return null;
    return (
      <div
        className={`fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-50 transition-opacity duration-150 ${
          show ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div
          className={cn(
            "rounded-2xl p-8 flex flex-col items-center min-w-[400px] max-w-md border shadow-2xl",
            isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-white/95 border-white/50"
          )}
        >
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-t-2 border-blue-300 animate-pulse"></div>
          </div>
          <p className={cn("font-bold text-xl mb-3 text-center", isDark ? "text-gray-100" : "text-slate-800")}>
            {message}
          </p>
          <div className={cn("flex items-center mb-6", isDark ? "text-gray-400" : "text-slate-600")}>
            <span className="animate-pulse">Loading</span>
            <span className="animate-pulse delay-100">.</span>
            <span className="animate-pulse delay-200">.</span>
            <span className="animate-pulse delay-300">.</span>
          </div>
          {quote && (
            <div
              className={cn(
                "border-l-4 p-6 rounded-xl mb-6 w-full",
                isDark ? "bg-blue-950/50 border-blue-600" : "bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-blue-500"
              )}
            >
              <div className="flex items-start">
                <i className={cn("fas fa-user-md mr-4 mt-1 text-xl", isDark ? "text-blue-400" : "text-blue-500")}></i>
                <div>
                  <p className={cn("text-base italic", isDark ? "text-gray-300" : "text-slate-700")}>"{quote.text}"</p>
                  <p className={cn("text-sm mt-2 font-medium", isDark ? "text-gray-400" : "text-slate-600")}>— {quote.author}</p>
                </div>
              </div>
            </div>
          )}
          <div className="w-full bg-gray-200/80 rounded-full h-3 mt-2 overflow-hidden">
            <div
              className="h-3 rounded-full transition-all duration-1000 ease-out"
              style={{
                width: '100%',
                background: 'linear-gradient(90deg, #3b82f6, #60a5fa, #3b82f6)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s infinite',
              }}
            ></div>
          </div>
        </div>
      </div>
    );
  }
);
OsceLoadingModal.displayName = 'OsceLoadingModal';

// ====================== VOICE INTERFACE ======================
interface VoiceInterfaceProps {
  accessToken: string;
  patient: AsDate<Patient> | null;
  chatId: string;
  systemPrompt: string;
  sendMessage: (chatId: string, role: 'student' | 'patient', content: string) => Promise<void>;
  type: 'clerking' | 'counselling' | 'physical_exam' | 'flashcards';
  examSteps: { name: string; videoUrl: string }[];
  stationInfo: { current: number; total: number };
  onExit: () => void;
  durationMinutes: number;
  mode?: 'practice' | 'exam';
  existingMessages?: Array<{ role: string; content: string; createdAt: string }>;
  initialElapsedTime?: number;
}

function VoiceInterface({
  accessToken,
  patient,
  chatId,
  systemPrompt,
  sendMessage,
  type,
  examSteps,
  stationInfo,
  onExit,
  durationMinutes,
  mode = 'exam',
  existingMessages = [],
  initialElapsedTime = 0,
}: VoiceInterfaceProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [voicePortalRoot, setVoicePortalRoot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (typeof document !== 'undefined') {
      let portalRoot = document.getElementById('voice-loading-portal');
      if (!portalRoot) {
        portalRoot = document.createElement('div');
        portalRoot.id = 'voice-loading-portal';
        portalRoot.className = 'fixed z-[100]';
        document.body.appendChild(portalRoot);
      }
      setVoicePortalRoot(portalRoot);
    }
    return () => {
      if (voicePortalRoot && voicePortalRoot.parentNode) {
        voicePortalRoot.parentNode.removeChild(voicePortalRoot);
      }
    };
  }, []);
  const router = useRouter();
  const { connect, disconnect, readyState, messages, sendAssistantInput, sendSessionSettings, pauseAssistant, resumeAssistant, mute, unmute, isPaused } = useVoice();
  const [hintEnabled, setHintEnabled] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [sessionDuration, setSessionDuration] = useState<number | null>(null);
  const [chatStatus, setChatStatus] = useState<'incomplete' | 'completed'>('incomplete');
  const [showLoadingPopup, setShowLoadingPopup] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepMessages, setStepMessages] = useState<DBMessage[][]>([[]]);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [overallFeedback, setOverallFeedback] = useState<any>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState('');
  const [showOverallModal, setShowOverallModal] = useState(false);
  const [showSwitchingModal, setShowSwitchingModal] = useState(false);
  const [switchingMessage, setSwitchingMessage] = useState('');
  const [showEndingModal, setShowEndingModal] = useState(false);
  const [showReturnLoader, setShowReturnLoader] = useState(false);
  const [currentMedicalQuote, setCurrentMedicalQuote] = useState<{text: string, author: string} | null>(null);
  const [remainingTokens, setRemainingTokens] = useState<number>(0);
  const [tokenWarningShown, setTokenWarningShown] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const connectionRef = useRef(false);
  const analysisInProgressRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const firstGreetRef = useRef(false);

  const buildMessage = (role: 'student' | 'patient', content = ''): DBMessage => ({
    id: crypto.randomUUID(),
    chatId,
    role,
    content,
    attachments: null,
    createdAt: new Date(),
  });

  const checkTokenBalance = async () => {
    try {
      const response = await fetch('/api/tokens/balance');
      if (response.ok) {
        const data = await response.json();
        setRemainingTokens(data.balance);
        if (data.balance < 10 && !tokenWarningShown) {
          toast.warning(`Low tokens! Only ${data.balance} tokens remaining.`, { duration: 5000, icon: '⚠️' });
          setTokenWarningShown(true);
        }
        if (data.balance <= 0) {
          toast.error('No tokens remaining! Session will end soon.', { duration: 8000, icon: '🔴' });
          setTimeout(() => {
            endSessionDueToNoTokens();
          }, 30000);
        }
        return data.balance;
      }
    } catch (error) {
      console.error('Error checking token balance:', error);
    }
  };

  const endSessionDueToNoTokens = async () => {
    try {
      const actualDurationInSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
      const response = await fetch(`/api/chat/${chatId}/end-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualDurationInSeconds,
          endedEarly: true,
          reason: 'insufficient_tokens'
        }),
      });
      if (response.ok) {
        toast.error('Session ended due to insufficient tokens. Please purchase more tokens to continue.');
        onExit();
      }
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  

  useEffect(() => {
    console.log('=== VOICE INTERFACE MOUNT ===');
    console.log('Props:', { type, examStepsLength: examSteps?.length, patient: patient?.name });
  }, []);

  useEffect(() => {
    const loadChatData = async () => {
      try {
        const chatRes = await fetch(`/api/chats/${chatId}`, { credentials: 'include' });
        if (!chatRes.ok) throw new Error('Chat not found');
        const chatData = await chatRes.json();
        setChatStatus(chatData.status);
        if (chatData.status === 'completed') {
          setTimeLeft(0);
          setSessionDuration(null);
          return;
        }
        const durationMinutes = Number(localStorage.getItem(`duration_${chatId}`)) || 5;
        const saved = localStorage.getItem(`chat_${chatId}`);
        if (saved) {
          const { remainingTime } = JSON.parse(saved);
          setTimeLeft(remainingTime);
          setSessionDuration(durationMinutes);
          setIsConnected(false);
          return;
        }
        setTimeLeft(durationMinutes * 60);
        setSessionDuration(durationMinutes);
        setIsConnected(false);
      } catch {
        setTimeLeft(5 * 60);
        setSessionDuration(5);
        setIsConnected(false);
      }
    };
    loadChatData();
  }, [chatId]);

  useEffect(() => {
    if (patient) {
      const voicePreset = pickHumeVoice(patient);
      console.log('Voice Interface - Patient:', {
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        selectedVoice: voicePreset
      });
    }
  }, [patient]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (isConnected && !isPaused && timeLeft !== null && timeLeft > 0 && !showFeedbackModal) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev && prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            handleTerminate();
            return 0;
          }
          return (prev || 0) - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isConnected, isPaused, timeLeft, showFeedbackModal, chatId]);

  useEffect(() => {
    if (!messages.length) return;
    const last = messages[messages.length - 1];
    if (last.type === 'assistant_message' && last.message?.content) {
      sendMessage(chatId, 'patient', last.message.content);
      if (type === 'physical_exam') {
        setStepMessages((prev) => {
          const next = [...prev];
          if (!next[currentStepIndex]) next[currentStepIndex] = [];
          next[currentStepIndex] = [...next[currentStepIndex], buildMessage('patient', last.message.content)];
          return next;
        });
      }
    } else if (last.type === 'user_message' && last.message?.content) {
      sendMessage(chatId, 'student', last.message.content);
      if (type === 'physical_exam') {
        setStepMessages((prev) => {
          const next = [...prev];
          if (!next[currentStepIndex]) next[currentStepIndex] = [];
          next[currentStepIndex] = [...next[currentStepIndex], buildMessage('student', last.message.content)];
          return next;
        });
      }
    }
  }, [messages, chatId, sendMessage, type, currentStepIndex]);

  useEffect(() => {
    if (
      readyState === VoiceReadyState.OPEN &&
      !firstGreetRef.current &&
      patient
    ) {
      firstGreetRef.current = true;
      sendSessionSettings({
        id: crypto.randomUUID(),
        name: 'GenderVoice',
        tts: {
          service: 'hume_ai',
          voice: getVoiceId(patient.gender ?? undefined),
        },
      } as any);
      sendMessage(chatId, 'patient', "I'm ready when you are.");
      sendAssistantInput("I'm ready when you are.");
    }
  }, [readyState, patient, chatId, sendSessionSettings, sendAssistantInput]);

  useEffect(() => {
    if (
      !connectionRef.current &&
      readyState !== VoiceReadyState.OPEN &&
      accessToken &&
      patient &&
      timeLeft !== null &&
      !isConnected
    ) {
      handleStart();
    }
  }, [accessToken, patient, timeLeft, readyState, isConnected]);

  const getVoiceId = (gender?: string) => (gender === 'female' ? 'AIME' : 'ITO');

  useEffect(() => {
    if (type === 'physical_exam' && examSteps.length > 0) {
      console.log('Initializing step messages for', examSteps.length, 'steps');
      const initialStepMessages = examSteps.map(() => []);
      setStepMessages(initialStepMessages);
    }
  }, [type, examSteps]);

  useEffect(() => {
    console.log('Step tracking:', {
      currentStepIndex,
      currentStepName: examSteps[currentStepIndex]?.name,
      totalSteps: examSteps.length,
      stepMessagesLength: stepMessages.length,
      examSteps: examSteps.map((s, i) => `${i}: ${s.name}`)
    });
  }, [currentStepIndex, examSteps, stepMessages]);

  const handleStart = useCallback(async () => {
    if (connectionRef.current) return;
    connectionRef.current = true;
    setShowLoadingPopup(true);
    setLoadingMessage(`Starting Chat with ${patient?.name || 'Patient'}`);
    setCurrentMedicalQuote(getRandomMedicalQuote());
    setSessionStartTime(Date.now());
    const fastTeardown = setTimeout(() => {
      setShowLoadingPopup(false);
    }, 0);
    try {
      await disconnect();
      const voiceId = pickHumeVoice(patient);
      const res = await fetch('/api/chat/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId, systemPrompt }),
      });
      if (!res.ok) {
        alert('Failed to obtain voice token');
        setShowLoadingPopup(false);
        connectionRef.current = false;
        return;
      }
      const { accessToken: newToken } = await res.json();
      connect({
        auth: { type: 'accessToken', value: newToken },
        sessionSettings: { type: 'session_settings', systemPrompt },
      })
        .then(() => {
          setIsConnected(true);
          clearTimeout(fastTeardown);
          if (timeLeft === null && sessionDuration !== null) setTimeLeft(sessionDuration * 60);
          setShowLoadingPopup(false);
          connectionRef.current = false;
          resumeAssistant();
          unmute();
          if (type === 'physical_exam' && stepMessages[currentStepIndex]?.length >= 2) {
            const lastTwo = stepMessages[currentStepIndex].slice(-2);
            lastTwo.forEach(m => sendAssistantInput(m.content));
          }
        })
        .catch((err) => {
          console.error('Failed to connect:', err);
          setShowLoadingPopup(false);
          connectionRef.current = false;
          setSessionStartTime(0);
          if (err.message?.includes('timeout') || err.code === 'UND_ERR_CONNECT_TIMEOUT') {
            alert('Connection to voice service timed out. This might be a temporary issue with the service. Please try again in a few moments.');
          } else if (err.message?.includes('auth') || err.status === 401) {
            alert('Authentication failed. Your session may have expired. Please try logging out and logging back in.');
          } else if (err.message?.includes('network')) {
            alert('Network error. Please check your internet connection and try again.');
          } else {
            alert(`Failed to connect to voice service: ${err.message || 'Unknown error'}. Please try again.`);
          }
        });
    } catch (error) {
      console.error('Error in handleStart:', error);
      setShowLoadingPopup(false);
      connectionRef.current = false;
      setSessionStartTime(0);
    }
  }, [connect, disconnect, patient, systemPrompt, timeLeft, sessionDuration, type, stepMessages, currentStepIndex]);

  const handlePause = useCallback(() => {
    pauseAssistant();
    mute();
    setIsConnected(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (timeLeft && timeLeft > 0) {
      localStorage.setItem(`chat_${chatId}`, JSON.stringify({ remainingTime: timeLeft }));
    }
  }, [pauseAssistant, mute, timeLeft, chatId]);

  const handleTerminate = useCallback(async () => {
    if (analysisInProgressRef.current) return;
    analysisInProgressRef.current = true;
    console.log('=== TERMINATE DEBUG START ===');
    console.log('Chat ID:', chatId);
    console.log('Current Step Index:', currentStepIndex);
    console.log('Exam Steps Length:', examSteps.length);
    console.log('Session Type:', type);
    console.log('Session Start Time:', sessionStartTime);
    console.log('Current Time:', Date.now());
    let actualDurationInSeconds = 0;
    if (sessionStartTime > 0) {
      const elapsedMillis = Date.now() - sessionStartTime;
      actualDurationInSeconds = Math.max(1, Math.floor(elapsedMillis / 1000));
      console.log('Elapsed milliseconds:', elapsedMillis);
      console.log('Calculated duration seconds:', actualDurationInSeconds);
    } else {
      const defaultDurationMinutes = sessionDuration || 5;
      const defaultDurationSeconds = defaultDurationMinutes * 60;
      actualDurationInSeconds = Math.max(1, defaultDurationSeconds - (timeLeft || 0));
      console.log('Using fallback duration seconds:', actualDurationInSeconds);
    }
    disconnect();
    setIsConnected(false);
    localStorage.removeItem(`chat_${chatId}`);
    try {
      await fetch(`/api/chats/${chatId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      const endSessionRes = await fetch(`/api/chat/${chatId}/end-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualDurationInSeconds,
          endedEarly: timeLeft !== null && timeLeft > 0,
          reason: timeLeft !== null && timeLeft > 0 ? 'user_terminated' : 'normal_completion'
        }),
      });
      if (!endSessionRes.ok) {
        const errorText = await endSessionRes.text();
        console.error('Token deduction failed:', errorText);
        throw new Error('Token deduction failed');
      }
      const chatRes = await fetch(`/api/chats/${chatId}`);
      const chatData = await chatRes.json();
      if (chatData.sessionId) {
        const sessionRes = await fetch(`/api/sessions/${chatData.sessionId}`);
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          let isLastStation = false;
          if (type === 'physical_exam') {
            const actualStationIndex = chatData.stationIndex ?? 0;
            isLastStation = actualStationIndex + 1 >= sessionData.numStations;
          } else {
            const actualStationIndex = chatData.stationIndex ?? 0;
            isLastStation = actualStationIndex + 1 >= sessionData.numStations;
          }
          if (isLastStation) {
            setCurrentMedicalQuote(getRandomMedicalQuote());
            setShowEndingModal(true);
            setTimeout(() => {
              router.push('/dashboard/chat-history');
            }, 3000);
            analysisInProgressRef.current = false;
            return;
          }
          setCurrentMedicalQuote(getRandomMedicalQuote());
          const actualStationIndex = chatData.stationIndex ?? 0;
          setSwitchingMessage(`Switching to Station ${actualStationIndex + 2}`);
          setShowSwitchingModal(true);
          setTimeout(() => {
            onExit();
          }, 2000);
          analysisInProgressRef.current = false;
          return;
        }
      }
      setCurrentMedicalQuote(getRandomMedicalQuote());
      setShowEndingModal(true);
      setTimeout(() => {
        router.push('/dashboard/chat-history');
      }, 3000);
      analysisInProgressRef.current = false;
    } catch (error) {
      console.error('Error in handleTerminate:', error);
      setCurrentMedicalQuote(getRandomMedicalQuote());
      setShowEndingModal(true);
      setTimeout(() => {
        router.push('/dashboard/chat-history');
      }, 3000);
      analysisInProgressRef.current = false;
    }
  }, [disconnect, chatId, currentStepIndex, examSteps.length, type, onExit, sessionStartTime, timeLeft, sessionDuration, router]);

  const confirmTerminate = useCallback(() => setShowEndConfirm(true), []);

  const handleReturnToDashboard = useCallback(() => {
    setShowReturnLoader(true);
    disconnect();
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 1500);
  }, [disconnect]);

  const handleEndStep = useCallback(async () => {
    if (analysisInProgressRef.current) return;
    analysisInProgressRef.current = true;
    setIsAnalyzing(true);
    setShowFeedbackModal(true);
    disconnect();
    setIsConnected(false);
    const stepTranscript = stepMessages[currentStepIndex]
      ?.map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n') || '';
    const stepName = examSteps[currentStepIndex].name;
    try {
      const res = await fetch('/api/analyze-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: stepTranscript, stepName }),
      });
      if (!res.ok) throw new Error('analyze-step failed');
      const feedback = await res.json();
      const stepFeedbackData = {
        stepName: examSteps[currentStepIndex].name,
        score: feedback.score,
        feedback: typeof feedback === 'string' ? feedback : feedback.overall_assessment,
        strengths: Array.isArray(feedback.strengths) ? feedback.strengths : [],
        improvements: Array.isArray(feedback.improvements) ? feedback.improvements : [],
        suggestions: Array.isArray(feedback.suggestions) ? feedback.suggestions : [],
        evidence: feedback.evidence || 'No specific evidence'
      };
      setCurrentFeedback(feedback);
      setCurrentVideoUrl(examSteps[currentStepIndex].videoUrl);
      await fetch('/api/step-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          stepIndex: currentStepIndex,
          feedback: stepFeedbackData
        }),
      });
    } catch (error) {
      console.error('Error analyzing step:', error);
    } finally {
      setIsAnalyzing(false);
      analysisInProgressRef.current = false;
    }
  }, [currentStepIndex, examSteps, stepMessages, chatId, disconnect]);

  const handleNextStep = useCallback(async () => {
    setShowFeedbackModal(false);
    setShowVideoModal(false);
    setCurrentFeedback(null);
    await new Promise(resolve => setTimeout(resolve, 0));
    if (currentStepIndex < examSteps.length - 1) {
      const nextStepIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextStepIndex);
      setStepMessages(prev => {
        const newSteps = [...prev];
        if (!newSteps[nextStepIndex]) {
          newSteps[nextStepIndex] = [];
        }
        return newSteps;
      });
      await new Promise(resolve => setTimeout(resolve, 0));
      const voicePreset = pickHumeVoice(patient);
      connect({
        auth: { type: 'accessToken', value: accessToken },
        sessionSettings: {
          type: 'session_settings',
          systemPrompt: systemPrompt,
        },
        voice: voicePreset
      } as any)
        .then(() => {
          setIsConnected(true);
        })
        .catch((err) => {
          console.error('Failed to reconnect for next step:', err);
        });
    } else {
      analyzeOverall();
    }
  }, [currentStepIndex, examSteps, patient, accessToken, systemPrompt, connect]);

  const handleSkipVideo = useCallback(() => {
    setShowVideoModal(false);
    handleNextStep();
  }, [handleNextStep]);

  const analyzeOverall = useCallback(async () => {
    setIsAnalyzing(true);
    const fullTranscript = stepMessages
      .flat()
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n');
    try {
      const res = await fetch('/api/analyze-overall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: fullTranscript }),
      });
      if (!res.ok) throw new Error('analyze-overall failed');
      const feedback = await res.json();
      setOverallFeedback(feedback);
      setShowOverallModal(true);
      await fetch(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latestScore: feedback.percentage,
          latestGrade: `${feedback.rating}/5`,
          latestFeedback: JSON.stringify(feedback),
        }),
      });
    } catch (error) {
      console.error('Error analyzing overall:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [stepMessages, chatId]);

  // Physical Exam Layout
  if (type === 'physical_exam' && examSteps?.length) {
    return (
      <div className={cn("min-h-screen relative",
        isDark ? "bg-gradient-to-br from-gray-900 to-purple-950/90" : "bg-gradient-to-br from-blue-50/90 to-purple-100/90"
      )}>
        <div className={cn("absolute inset-0", isDark ? "bg-black/20 backdrop-blur-sm" : "bg-white/20 backdrop-blur-sm")}></div>
        <div className="relative z-10 flex items-center justify-center p-4 min-h-screen">
          <div className={cn("w-full max-w-4xl backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border",
            isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-white/95 border-white/50"
          )}>
            <div className={cn("text-white p-6 flex items-center justify-between",
              isDark ? "bg-gradient-to-r from-indigo-800 to-purple-800" : "bg-gradient-to-r from-indigo-600 to-purple-600"
            )}>
              <div>
                <h1 className="text-2xl font-bold flex items-center">
                  <i className="fas fa-stethoscope mr-3"></i>
                  Physical Examination
                </h1>
                <p className="text-sm opacity-90 mt-1">
                  Step {currentStepIndex + 1} of {examSteps.length} • Station {stationInfo.current + 1} of {stationInfo.total}
                </p>
                <div className="mt-2 text-xs opacity-80">
                  <i className="fas fa-coins mr-1"></i>
                  Tokens: {remainingTokens}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">Patient: <span className="font-bold">{patient?.name}</span></p>
                <p className="text-xs opacity-90">{patient?.age} yr, {patient?.gender} — {patient?.condition}</p>
                {patient?.location && <p className="text-xs opacity-90">Location: {patient.location}</p>}
              </div>
            </div>
            <div className={cn("p-6 border-b", isDark ? "border-gray-700/50" : "border-gray-200/50")}>
              <label className={cn("block text-sm font-semibold mb-3 flex items-center",
                isDark ? "text-gray-300" : "text-slate-700"
              )}>
                <i className={cn("fas fa-list-ol mr-2", isDark ? "text-indigo-400" : "text-indigo-500")}></i>
                Current Step
              </label>
              <select
                value={currentStepIndex}
                onChange={(e) => {
                  const newIndex = parseInt(e.target.value);
                  if (newIndex !== currentStepIndex && !isConnected) {
                    setCurrentStepIndex(newIndex);
                  }
                }}
                disabled={isConnected}
                className={cn("w-full p-4 border-2 rounded-xl transition-all duration-200",
                  isDark
                    ? "bg-gray-800 border-gray-700 focus:border-indigo-500 focus:ring-indigo-900/30 text-gray-200"
                    : "bg-white border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 text-slate-800"
                )}
              >
                {examSteps.map((step, index) => (
                  <option key={index} value={index}>
                    {index + 1}. {step.name}
                  </option>
                ))}
              </select>
              <div className="mt-6 flex flex-wrap gap-3 justify-center md:justify-start">
                {isConnected ? (
                  <>
                    <button
                      onClick={handleEndStep}
                      className="px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
                    >
                      <i className="fas fa-stop mr-2"></i>
                      <span className="hidden sm:inline">End Step</span>
                    </button>
                    <button
                      onClick={handlePause}
                      className="px-4 py-3 bg-gradient-to-r from-gray-500 to-slate-600 text-white rounded-xl hover:from-gray-600 hover:to-slate-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
                    >
                      <i className="fas fa-pause mr-2"></i>
                      <span className="hidden sm:inline">Pause</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleStart}
                    className="px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
                  >
                    <i className="fas fa-play mr-2"></i>
                    <span className="hidden sm:inline">
                      {isPaused ? 'Resume conversation' : 'Start voice session'}
                    </span>
                  </button>
                )}
                <button
                  onClick={confirmTerminate}
                  className="px-4 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:from-red-600 hover:to-rose-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
                >
                  <i className="fas fa-stop-circle mr-2"></i>
                  <span className="hidden sm:inline">End Session</span>
                </button>
                <button
                  onClick={handleReturnToDashboard}
                  className="px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
                >
                  <i className="fas fa-home mr-2"></i>
                  <span className="hidden sm:inline">Dashboard</span>
                </button>
              </div>
            </div>
            {timeLeft !== null && (
              <div className={cn("px-6 py-4 border-b flex items-center justify-between",
                isDark ? "bg-gray-800/50 border-gray-700/50" : "bg-gradient-to-r from-gray-50 to-blue-50/50 border-gray-200/50"
              )}>
                <span className={cn("text-sm font-semibold flex items-center",
                  isDark ? "text-gray-300" : "text-slate-700"
                )}>
                  <i className={cn("fas fa-clock mr-2", isDark ? "text-indigo-400" : "text-indigo-500")}></i>
                  Time Left
                </span>
                <span className={cn("text-xl font-mono font-bold px-4 py-2 rounded-lg shadow-inner",
                  isDark ? "bg-gray-700 text-indigo-300" : "bg-white text-indigo-700"
                )}>
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>
            )}
            <div className={cn("p-6 max-h-96 overflow-y-auto rounded-b-3xl",
              isDark ? "bg-gradient-to-br from-gray-800/80 to-gray-900/80" : "bg-gradient-to-br from-gray-50/80 to-blue-50/50"
            )}>
              {messages.length ? (
                messages.map((msg, idx) => {
                  if (msg.type === 'user_message' || msg.type === 'assistant_message') {
                    return (
                      <div key={idx} className={`mb-4 flex ${msg.type === 'user_message' ? 'justify-end' : 'justify-start'}`}>
                        <div className={cn("max-w-[80%] p-4 rounded-2xl shadow-lg",
                          msg.type === 'user_message'
                            ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-br-none"
                            : isDark
                              ? "bg-gray-700/90 text-gray-200 border border-gray-600/50 rounded-bl-none"
                              : "bg-white/90 text-slate-800 border border-slate-200/50 rounded-bl-none"
                        )}>
                          <p className="text-sm opacity-80 mb-1">
                            {msg.type === 'user_message' ? 'You' : patient?.name || 'Patient'}
                          </p>
                          <p className="text-base leading-relaxed">{msg.message.content}</p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })
              ) : (
                <div className="text-center py-12">
                  <i className={cn("fas fa-comments text-4xl mb-4", isDark ? "text-gray-600" : "text-gray-300")}></i>
                  <p className={cn("text-lg", isDark ? "text-gray-500" : "text-slate-500")}>Press "Start Voice Session" to begin the step.</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* FULL MODALS FOR PHYSICAL EXAM */}
        {showSwitchingModal && (
          <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-50">
            <div className={cn("rounded-2xl p-8 flex flex-col items-center min-w-[400px] max-w-md border shadow-2xl",
              isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-white/95 border-white/50"
            )}>
              <div className="relative mb-6">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500"></div>
              </div>
              <p className={cn("font-bold text-xl mb-3 text-center", isDark ? "text-gray-100" : "text-slate-800")}>{switchingMessage}</p>
              {currentMedicalQuote && (
                <div className={cn("border-l-4 p-6 rounded-xl mb-6 w-full",
                  isDark ? "bg-green-950/50 border-green-600" : "bg-gradient-to-r from-green-50/80 to-emerald-50/80 border-green-500"
                )}>
                  <div className="flex items-start">
                    <i className={cn("fas fa-user-md mr-4 mt-1 text-xl", isDark ? "text-green-400" : "text-green-500")}></i>
                    <div>
                      <p className={cn("text-base italic", isDark ? "text-gray-300" : "text-slate-700")}>"{currentMedicalQuote.text}"</p>
                      <p className={cn("text-sm mt-2 font-medium", isDark ? "text-gray-400" : "text-slate-600")}>— {currentMedicalQuote.author}</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="w-full bg-gray-200/80 rounded-full h-3 mt-2 overflow-hidden">
                <div
                  className="h-3 rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: '100%',
                    background: 'linear-gradient(90deg, #10b981, #34d399, #10b981)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 2s infinite'
                  }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {showEndingModal && (
          <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-50">
            <div className={cn("rounded-2xl p-8 flex flex-col items-center min-w-[400px] max-w-md border shadow-2xl",
              isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-white/95 border-white/50"
            )}>
              <div className="relative mb-6">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500"></div>
              </div>
              <p className={cn("font-bold text-xl mb-3 text-center", isDark ? "text-gray-100" : "text-slate-800")}>Ending Session! Please analyze and preview chat in log</p>
              {currentMedicalQuote && (
                <div className={cn("border-l-4 p-6 rounded-xl mb-6 w-full",
                  isDark ? "bg-purple-950/50 border-purple-600" : "bg-gradient-to-r from-purple-50/80 to-pink-50/80 border-purple-500"
                )}>
                  <div className="flex items-start">
                    <i className={cn("fas fa-user-md mr-4 mt-1 text-xl", isDark ? "text-purple-400" : "text-purple-500")}></i>
                    <div>
                      <p className={cn("text-base italic", isDark ? "text-gray-300" : "text-slate-700")}>"{currentMedicalQuote.text}"</p>
                      <p className={cn("text-sm mt-2 font-medium", isDark ? "text-gray-400" : "text-slate-600")}>— {currentMedicalQuote.author}</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="w-full bg-gray-200/80 rounded-full h-3 mt-2 overflow-hidden">
                <div
                  className="h-3 rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: '100%',
                    background: 'linear-gradient(90deg, #8b5cf6, #a78bfa, #8b5cf6)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 2s infinite'
                  }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {showFeedbackModal && currentFeedback && (
          <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-50">
            <div className={cn("rounded-2xl p-8 max-w-4xl w-full max-h-[80vh] overflow-auto border shadow-2xl",
              isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-white/95 border-white/50"
            )}>
              <h3 className={cn("text-2xl font-bold mb-6 flex items-center",
                isDark ? "text-gray-100" : "text-slate-800"
              )}>
                <i className="fas fa-tasks mr-3 text-indigo-500"></i>
                {examSteps[currentStepIndex]?.name} Completed
              </h3>
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className={cn("p-6 rounded-xl border",
                  isDark ? "bg-blue-950/50 border-blue-800/50" : "bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-blue-200/50"
                )}>
                  <h4 className={cn("font-semibold text-lg mb-2 flex items-center",
                    isDark ? "text-gray-200" : "text-slate-800"
                  )}>
                    <i className="fas fa-chart-line mr-2 text-blue-500"></i>
                    Score
                  </h4>
                  <p className="text-3xl font-bold text-blue-600">{currentFeedback.score}/20</p>
                </div>
                <div className={cn("p-6 rounded-xl border",
                  isDark ? "bg-green-950/50 border-green-800/50" : "bg-gradient-to-r from-green-50/80 to-emerald-50/80 border-green-200/50"
                )}>
                  <h4 className={cn("font-semibold text-lg mb-2 flex items-center",
                    isDark ? "text-gray-200" : "text-slate-800"
                  )}>
                    <i className="fas fa-clipboard-check mr-2 text-green-500"></i>
                    Evidence
                  </h4>
                  <p className={isDark ? "text-gray-300" : "text-slate-700"}>{currentFeedback.evidence}</p>
                </div>
              </div>
              <div className="space-y-6">
                <div className={cn("p-6 rounded-xl border",
                  isDark ? "bg-emerald-950/50 border-emerald-800/50" : "bg-gradient-to-r from-emerald-50/80 to-green-50/80 border-emerald-200/50"
                )}>
                  <h4 className={cn("font-semibold text-lg mb-4 flex items-center",
                    isDark ? "text-gray-200" : "text-slate-800"
                  )}>
                    <i className="fas fa-star mr-2 text-emerald-500"></i>
                    Strengths
                  </h4>
                  <ul className="space-y-2">
                    {currentFeedback.strengths.map((s: any, i: number) => (
                      <li key={i} className="flex items-start">
                        <i className="fas fa-check-circle text-emerald-500 mr-3 mt-1"></i>
                        <span className={isDark ? "text-gray-300" : "text-slate-700"}>{typeof s === 'string' ? s : s.evidence || 'No feedback'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={cn("p-6 rounded-xl border",
                  isDark ? "bg-amber-950/50 border-amber-800/50" : "bg-gradient-to-r from-amber-50/80 to-yellow-50/80 border-amber-200/50"
                )}>
                  <h4 className={cn("font-semibold text-lg mb-4 flex items-center",
                    isDark ? "text-gray-200" : "text-slate-800"
                  )}>
                    <i className="fas fa-exclamation-triangle mr-2 text-amber-500"></i>
                    Improvements
                  </h4>
                  <ul className="space-y-2">
                    {currentFeedback.improvements.map((s: any, i: number) => (
                      <li key={i} className="flex items-start">
                        <i className="fas fa-lightbulb text-amber-500 mr-3 mt-1"></i>
                        <span className={isDark ? "text-gray-300" : "text-slate-700"}>{typeof s === 'string' ? s : s.evidence || 'No feedback'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={cn("p-6 rounded-xl border",
                  isDark ? "bg-blue-950/50 border-blue-800/50" : "bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-blue-200/50"
                )}>
                  <h4 className={cn("font-semibold text-lg mb-4 flex items-center",
                    isDark ? "text-gray-200" : "text-slate-800"
                  )}>
                    <i className="fas fa-lightbulb mr-2 text-blue-500"></i>
                    Suggestions
                  </h4>
                  <ul className="space-y-2">
                    {currentFeedback.suggestions.map((s: string, i: number) => (
                      <li key={i} className="flex items-start">
                        <i className="fas fa-arrow-right text-blue-500 mr-3 mt-1"></i>
                        <span className={isDark ? "text-gray-300" : "text-slate-700"}>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="flex justify-end mt-8 space-x-4">
                <button
                  onClick={() => setShowVideoModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
                >
                  <i className="fas fa-play mr-2"></i>
                  Watch Video
                </button>
                <button
                  onClick={handleNextStep}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
                >
                  <i className="fas fa-arrow-right mr-2"></i>
                  {currentStepIndex < examSteps.length - 1 ? 'Continue to Next Step' : 'Finish Examination'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showVideoModal && (
          <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-50">
            <div className={cn("rounded-2xl p-8 max-w-4xl w-full border shadow-2xl",
              isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-white/95 border-white/50"
            )}>
              <h3 className={cn("text-2xl font-bold mb-6 flex items-center",
                isDark ? "text-gray-100" : "text-slate-800"
              )}>
                <i className="fas fa-video mr-3 text-purple-500"></i>
                Video: {examSteps[currentStepIndex]?.name}
              </h3>
              <video controls src={currentVideoUrl} className="w-full rounded-xl shadow-lg" />
              <div className="flex justify-end mt-6 space-x-4">
                <button
                  onClick={() => setShowVideoModal(false)}
                  className={cn("px-6 py-3 border-2 rounded-xl transition-all duration-300 flex items-center font-semibold",
                    isDark ? "border-gray-700 text-gray-300 hover:bg-gray-700" : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <i className="fas fa-times mr-2"></i>
                  Close
                </button>
                <button
                  onClick={handleSkipVideo}
                  className="px-6 py-3 bg-gradient-to-r from-gray-500 to-slate-600 text-white rounded-xl hover:from-gray-600 hover:to-slate-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
                >
                  <i className="fas fa-forward mr-2"></i>
                  Skip Video
                </button>
                <button
                  onClick={handleNextStep}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
                >
                  <i className="fas fa-arrow-right mr-2"></i>
                  {currentStepIndex < examSteps.length - 1 ? 'Continue to Next Step' : 'Finish Examination'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showOverallModal && overallFeedback && (
          <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-50">
            <div className={cn("rounded-2xl p-8 max-w-4xl w-full max-h-[80vh] overflow-auto border shadow-2xl",
              isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-white/95 border-white/50"
            )}>
              <h3 className={cn("text-2xl font-bold mb-8 flex items-center",
                isDark ? "text-gray-100" : "text-slate-800"
              )}>
                <i className="fas fa-trophy mr-3 text-yellow-500"></i>
                Overall Feedback
              </h3>
              <div className="space-y-6">
                <div className={cn("p-6 rounded-xl border",
                  isDark ? "bg-yellow-950/50 border-yellow-800/50" : "bg-gradient-to-r from-yellow-50/80 to-amber-50/80 border-yellow-200/50"
                )}>
                  <h2 className={cn("text-xl font-semibold mb-4 flex items-center",
                    isDark ? "text-gray-200" : "text-slate-800"
                  )}>
                    <i className="fas fa-star text-yellow-500 mr-3"></i> Performance Rating
                  </h2>
                  <div className="flex items-center mb-3">
                    {Array.from({ length: 5 }, (_, i) => (
                      <i key={i} className={`${i < overallFeedback.rating ? 'fas fa-star text-yellow-500' : 'far fa-star text-gray-300'} text-2xl mr-1`}></i>
                    ))}
                    <span className={cn("ml-3 text-lg font-bold", isDark ? "text-gray-200" : "text-slate-800")}>({overallFeedback.rating}/5)</span>
                  </div>
                  <div className={cn("text-3xl font-bold", isDark ? "text-gray-100" : "text-slate-800")}>{overallFeedback.percentage}%</div>
                </div>
                <div className={cn("p-6 rounded-xl border",
                  isDark ? "bg-emerald-950/50 border-emerald-800/50" : "bg-gradient-to-r from-emerald-50/80 to-green-50/80 border-emerald-200/50"
                )}>
                  <h2 className={cn("text-xl font-semibold mb-4 flex items-center",
                    isDark ? "text-gray-200" : "text-slate-800"
                  )}>
                    <i className="fas fa-check-circle text-emerald-500 mr-3"></i> Strengths
                  </h2>
                  {overallFeedback.strengths.length > 0 ? (
                    <ul className="space-y-3">
                      {overallFeedback.strengths.map((item: any, i: number) => (
                        <li key={i} className={cn("flex items-start p-3 rounded-lg",
                          isDark ? "bg-gray-700/50" : "bg-white/50"
                        )}>
                          <i className="fas fa-plus-circle text-emerald-400 mr-3 mt-1"></i>
                          <div>
                            <span className={cn("font-semibold", isDark ? "text-gray-200" : "text-slate-800")}>{item.category}</span>
                            <span className={cn("ml-2", isDark ? "text-gray-400" : "text-slate-600")}>– Score: {item.score} (Reference: {item.evidence})</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-red-600 font-semibold flex items-center">
                      <i className="fas fa-exclamation-circle mr-2"></i>
                      No strengths observed! You need to do better.
                    </p>
                  )}
                </div>
                <div className={cn("p-6 rounded-xl border",
                  isDark ? "bg-amber-950/50 border-amber-800/50" : "bg-gradient-to-r from-amber-50/80 to-orange-50/80 border-amber-200/50"
                )}>
                  <h2 className={cn("text-xl font-semibold mb-4 flex items-center",
                    isDark ? "text-gray-200" : "text-slate-800"
                  )}>
                    <i className="fas fa-exclamation-triangle text-amber-500 mr-3"></i> Areas of Improvement
                  </h2>
                  <ul className="space-y-3">
                    {overallFeedback.improvements.map((item: any, i: number) => (
                      <li key={i} className={cn("flex items-start p-3 rounded-lg",
                        isDark ? "bg-gray-700/50" : "bg-white/50"
                      )}>
                        <i className="fas fa-exclamation-circle text-amber-400 mr-3 mt-1"></i>
                        <div>
                          <span className={cn("font-semibold", isDark ? "text-gray-200" : "text-slate-800")}>{item.category}</span>
                          <span className={cn("ml-2", isDark ? "text-gray-400" : "text-slate-600")}>– Score: {item.score} (Reference: {item.evidence})</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={cn("p-6 rounded-xl border",
                  isDark ? "bg-blue-950/50 border-blue-800/50" : "bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-blue-200/50"
                )}>
                  <h2 className={cn("text-xl font-semibold mb-4 flex items-center",
                    isDark ? "text-gray-200" : "text-slate-800"
                  )}>
                    <i className="fas fa-lightbulb text-blue-500 mr-3"></i> Suggestions
                  </h2>
                  <ul className="space-y-2">
                    {overallFeedback.suggestions.map((sug: string, i: number) => (
                      <li key={i} className="flex items-start">
                        <i className="fas fa-arrow-right text-blue-400 mr-3 mt-1"></i>
                        <span className={isDark ? "text-gray-300" : "text-slate-700"}>{sug}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={cn("p-6 rounded-xl border",
                  isDark ? "bg-purple-950/50 border-purple-800/50" : "bg-gradient-to-r from-purple-50/80 to-pink-50/80 border-purple-200/50"
                )}>
                  <h2 className={cn("text-xl font-semibold mb-4 flex items-center",
                    isDark ? "text-gray-200" : "text-slate-800"
                  )}>
                    <i className="fas fa-info-circle text-purple-500 mr-3"></i> Overall Assessment
                  </h2>
                  <p className={cn("text-lg leading-relaxed", isDark ? "text-gray-300" : "text-slate-700")}>{overallFeedback.overall_assessment}</p>
                </div>
              </div>
              <div className="flex justify-end mt-8">
                <button
                  onClick={() => { setShowOverallModal(false); handleTerminate(); }}
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
                >
                  <i className="fas fa-home mr-2"></i>
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}

        {showEndConfirm && (
          <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-50">
            <div className={cn("rounded-2xl p-8 max-w-md w-full border shadow-2xl",
              isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-white/95 border-white/50"
            )}>
              <h3 className={cn("text-xl font-bold mb-4 flex items-center",
                isDark ? "text-gray-100" : "text-slate-800"
              )}>
                <i className="fas fa-exclamation-triangle mr-3 text-red-500"></i>
                Confirm End Simulation
              </h3>
              <p className={cn("mb-6", isDark ? "text-gray-400" : "text-slate-600")}>You cannot resume if you end this session. Continue?</p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className={cn("px-6 py-3 border-2 rounded-xl transition-all duration-300 flex items-center font-semibold",
                    isDark ? "border-gray-700 text-gray-300 hover:bg-gray-700" : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <i className="fas fa-times mr-2"></i>
                  No
                </button>
                <button
                  onClick={() => { setShowEndConfirm(false); handleTerminate(); }}
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:from-red-600 hover:to-rose-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
                >
                  <i className="fas fa-check mr-2"></i>
                  Yes, End Session
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default layout (clerking / counselling)
  return (
    <div className={cn("min-h-screen relative",
      isDark ? "bg-gradient-to-br from-gray-900 to-purple-950/90" : "bg-gradient-to-br from-blue-50/90 to-purple-100/90"
    )}>
      <div className={cn("absolute inset-0", isDark ? "bg-black/20 backdrop-blur-sm" : "bg-white/20 backdrop-blur-sm")}></div>
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className={cn("backdrop-blur-md rounded-3xl shadow-2xl p-8 max-w-2xl w-full mx-auto border",
          isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-white/95 border-white/50"
        )}>
          <h1 className={cn("text-2xl md:text-3xl font-bold mb-6 flex items-center",
            isDark ? "text-gray-100" : "text-slate-800"
          )}>
            <i className="fas fa-user-md mr-4 text-blue-500"></i>
            Simulation with {patient?.name} - Station {stationInfo.current + 1} of {stationInfo.total}
          </h1>
          <p className={cn("mb-6 p-3 rounded-lg inline-block",
            isDark ? "bg-blue-950/50 text-gray-300" : "bg-blue-50/50 text-slate-600"
          )}>
            <i className="fas fa-hashtag mr-2 text-blue-500"></i>
            Chat ID: {chatId}
          </p>
          {patient && (
            <div className={cn("mb-8 p-6 rounded-2xl border",
              isDark ? "bg-blue-950/50 border-blue-800/50" : "bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-blue-200/50"
            )}>
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <img
                  src={patient.imageUrl || '/uploads/default-avatar.png'}
                  alt={patient.name}
                  className="w-32 h-32 rounded-2xl object-cover border-4 shadow-lg"
                />
                <div className="flex-1 text-center md:text-left">
                  <h2 className={cn("text-xl font-bold mb-2", isDark ? "text-gray-100" : "text-slate-800")}>{patient.name}</h2>
                  <div className="space-y-2">
                    <p className={cn("flex items-center justify-center md:justify-start", isDark ? "text-gray-300" : "text-slate-700")}>
                      <i className="fas fa-user mr-3 text-blue-500 w-5"></i>
                      Age: {patient.age}, Gender: {patient.gender}
                    </p>
                    {patient.location && (
                      <p className={cn("flex items-center justify-center md:justify-start", isDark ? "text-gray-300" : "text-slate-700")}>
                        <i className="fas fa-map-marker-alt mr-3 text-green-500 w-5"></i>
                        Location: {patient.location}
                      </p>
                    )}
                    <p className={cn("flex items-center justify-center md:justify-start", isDark ? "text-gray-300" : "text-slate-700")}>
                      <i className="fas fa-heartbeat mr-3 text-red-500 w-5"></i>
                      Condition: {patient.condition}
                    </p>
                    {/* Hide Chief Complaint in exam mode based on admin settings */}
                    {patient.prompt && mode !== 'exam' && (
                      <p className={cn("flex items-start justify-center md:justify-start", isDark ? "text-gray-300" : "text-slate-700")}>
                        <i className="fas fa-comment-medical mr-3 text-amber-500 w-5"></i>
                        Chief Complaint: {patient.prompt}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          {timeLeft !== null && (
            <div className={cn("mb-8 p-4 rounded-xl border",
              isDark ? "bg-amber-950/50 border-amber-800/50" : "bg-gradient-to-r from-amber-50/80 to-yellow-50/80 border-amber-200/50"
            )}>
              <p className={cn("font-semibold flex items-center justify-center",
                isDark ? "text-gray-300" : "text-slate-700"
              )}>
                <i className="fas fa-clock mr-3 text-amber-500"></i>
                Time Left: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </p>
            </div>
          )}
          <div className="mb-8">
            {chatStatus === 'completed' || timeLeft === 0 ? null : (
              <>
                {readyState === VoiceReadyState.OPEN ? (
                  <div className="flex flex-wrap gap-4 justify-center">
                    <button
                      onClick={() => {
                        if (isPaused) {
                          resumeAssistant();
                          unmute();
                        } else {
                          pauseAssistant();
                          mute();
                        }
                      }}
                      className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
                    >
                      <i className={`fas fa-${isPaused ? 'play' : 'pause'} mr-2`}></i>
                      <span className="hidden sm:inline">{isPaused ? 'Continue' : 'Pause'}</span>
                    </button>
                    <button
                      onClick={confirmTerminate}
                      className="px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:from-red-600 hover:to-rose-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
                    >
                      <i className="fas fa-stop mr-2"></i>
                      <span className="hidden sm:inline">End Simulation</span>
                    </button>
                  </div>
                ) : (
                  timeLeft !== null &&
                  timeLeft > 0 &&
                  !isConnected && (
                    <div className="flex justify-center">
                      <button
                        onClick={handleStart}
                        className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl text-lg"
                      >
                        <i className="fas fa-play mr-3"></i>
                        <span className="hidden sm:inline">Start voice session</span>
                        <span className="sm:hidden">Start</span>
                      </button>
                    </div>
                  )
                )}
              </>
            )}
            <div className="flex justify-center mt-6">
              <button
                onClick={handleReturnToDashboard}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
              >
                <i className="fas fa-home mr-2"></i>
                <span className="hidden sm:inline">Return to Dashboard</span>
                <span className="sm:hidden">Dashboard</span>
              </button>
            </div>
          </div>
          <div className={cn("rounded-2xl p-6 max-h-96 overflow-y-auto border",
            isDark ? "bg-gray-700/50 border-gray-600/50" : "bg-gradient-to-br from-gray-50/80 to-blue-50/50 border-gray-200/50"
          )}>
            {messages.length ? (
              messages.map((msg, idx) => {
                if (msg.type === 'user_message' || msg.type === 'assistant_message') {
                  return (
                    <div key={idx} className={`mb-4 ${msg.type === 'user_message' ? 'text-right' : 'text-left'}`}>
                      <div className={cn("inline-block max-w-[80%] p-4 rounded-2xl shadow-lg",
                        msg.type === 'user_message'
                          ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-br-none"
                          : isDark
                            ? "bg-gray-800/90 text-gray-200 border border-gray-700/50 rounded-bl-none"
                            : "bg-white/90 text-slate-800 border border-slate-200/50 rounded-bl-none"
                      )}>
                        <p className="text-sm opacity-80 mb-1">
                          {msg.type === 'user_message' ? 'You' : patient?.name || 'Patient'}
                        </p>
                        <p className="text-base leading-relaxed">{msg.message.content}</p>
                      </div>
                    </div>
                  );
                }
                return null;
              })
            ) : (
              <div className="text-center py-12">
                <i className={cn("fas fa-comments text-4xl mb-4", isDark ? "text-gray-600" : "text-gray-300")}></i>
                <p className={cn("text-lg", isDark ? "text-gray-500" : "text-slate-500")}>Click start to begin voice interaction</p>
              </div>
            )}
          </div>

          {/* DEFAULT LAYOUT MODALS */}
          {showEndConfirm && (
            <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-50">
              <div className={cn("rounded-2xl p-8 max-w-md w-full border shadow-2xl",
                isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-white/95 border-white/50"
              )}>
                <h3 className={cn("text-xl font-bold mb-4 flex items-center",
                  isDark ? "text-gray-100" : "text-slate-800"
                )}>
                  <i className="fas fa-exclamation-triangle mr-3 text-red-500"></i>
                  Confirm End Simulation
                </h3>
                <p className={cn("mb-6", isDark ? "text-gray-400" : "text-slate-600")}>You cannot resume if you end this session. Continue?</p>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => setShowEndConfirm(false)}
                    className={cn("px-6 py-3 border-2 rounded-xl transition-all duration-300 flex items-center font-semibold",
                      isDark ? "border-gray-700 text-gray-300 hover:bg-gray-700" : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <i className="fas fa-times mr-2"></i>
                    No
                  </button>
                  <button
                    onClick={() => { setShowEndConfirm(false); handleTerminate(); }}
                    className="px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:from-red-600 hover:to-rose-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
                  >
                    <i className="fas fa-check mr-2"></i>
                    Yes, End Session
                  </button>
                </div>
              </div>
            </div>
          )}

          {showReturnLoader && (
            <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-50">
              <div className={cn("rounded-2xl p-8 max-w-md w-full border shadow-2xl",
                isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-white/95 border-white/50"
              )}>
                <h3 className={cn("text-xl font-bold mb-6 text-center", isDark ? "text-gray-100" : "text-slate-800")}>Returning to Dashboard</h3>
                <div className="flex justify-center mb-6">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
                </div>
                <div className="w-full bg-gray-200/80 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-blue-500 h-3 rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: '100%',
                      background: 'linear-gradient(90deg, #3b82f6, #60a5fa, #3b82f6)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 2s infinite'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {showSwitchingModal && (
            <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-50">
              <div className={cn("rounded-2xl p-8 flex flex-col items-center min-w-[400px] max-w-md border shadow-2xl",
                isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-white/95 border-white/50"
              )}>
                <div className="relative mb-6">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500"></div>
                </div>
                <p className={cn("font-bold text-xl mb-3 text-center", isDark ? "text-gray-100" : "text-slate-800")}>{switchingMessage}</p>
                {currentMedicalQuote && (
                  <div className={cn("border-l-4 p-6 rounded-xl mb-6 w-full",
                    isDark ? "bg-green-950/50 border-green-600" : "bg-gradient-to-r from-green-50/80 to-emerald-50/80 border-green-500"
                  )}>
                    <div className="flex items-start">
                      <i className={cn("fas fa-user-md mr-4 mt-1 text-xl", isDark ? "text-green-400" : "text-green-500")}></i>
                      <div>
                        <p className={cn("text-base italic", isDark ? "text-gray-300" : "text-slate-700")}>"{currentMedicalQuote.text}"</p>
                        <p className={cn("text-sm mt-2 font-medium", isDark ? "text-gray-400" : "text-slate-600")}>— {currentMedicalQuote.author}</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="w-full bg-gray-200/80 rounded-full h-3 mt-2 overflow-hidden">
                  <div
                    className="h-3 rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: '100%',
                      background: 'linear-gradient(90deg, #10b981, #34d399, #10b981)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 2s infinite'
                    }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {showEndingModal && (
            <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-50">
              <div className={cn("rounded-2xl p-8 flex flex-col items-center min-w-[400px] max-w-md border shadow-2xl",
                isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-white/95 border-white/50"
              )}>
                <div className="relative mb-6">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500"></div>
                </div>
                <p className={cn("font-bold text-xl mb-3 text-center", isDark ? "text-gray-100" : "text-slate-800")}>Ending Session! Please analyze and preview chat in log</p>
                {currentMedicalQuote && (
                  <div className={cn("border-l-4 p-6 rounded-xl mb-6 w-full",
                    isDark ? "bg-purple-950/50 border-purple-600" : "bg-gradient-to-r from-purple-50/80 to-pink-50/80 border-purple-500"
                  )}>
                    <div className="flex items-start">
                      <i className={cn("fas fa-user-md mr-4 mt-1 text-xl", isDark ? "text-purple-400" : "text-purple-500")}></i>
                      <div>
                        <p className={cn("text-base italic", isDark ? "text-gray-300" : "text-slate-700")}>"{currentMedicalQuote.text}"</p>
                        <p className={cn("text-sm mt-2 font-medium", isDark ? "text-gray-400" : "text-slate-600")}>— {currentMedicalQuote.author}</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="w-full bg-gray-200/80 rounded-full h-3 mt-2 overflow-hidden">
                  <div
                    className="h-3 rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: '100%',
                      background: 'linear-gradient(90deg, #8b5cf6, #a78bfa, #8b5cf6)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 2s infinite'
                    }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ====================== DepartmentTypeBadge ======================
const DepartmentTypeBadge: FC<{ isFlashcardDept: boolean }> = ({ isFlashcardDept }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  if (isFlashcardDept) {
    return (
      <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        isDark ? "bg-green-900/50 text-green-300" : "bg-green-100 text-green-800"
      )}>
        <i className="fas fa-book-open mr-1"></i> Flashcards
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
      isDark ? "bg-blue-900/50 text-blue-300" : "bg-blue-100 text-blue-800"
    )}>
      <i className="fas fa-stethoscope mr-1"></i> OSCE
    </span>
  );
};

// ====================== ADMIN SETTINGS MODAL ======================
interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: { 
    showChiefComplaint: boolean; 
    showPresentingCondition: boolean;
    departmentSelectionMode: 'allow_select' | 'choose_number'; 
    selectedDepartmentCount: number;
    allowUserDepartmentChoice: boolean;
  }) => void;
  initialSettings: {
    showChiefComplaint: boolean;
    showPresentingCondition: boolean;
    departmentSelectionMode: 'allow_select' | 'choose_number';
    selectedDepartmentCount: number;
    allowUserDepartmentChoice: boolean;
  };
}

function AdminSettingsModal({ isOpen, onClose, onSave, initialSettings }: AdminSettingsModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showChiefComplaint, setShowChiefComplaint] = useState(initialSettings.showChiefComplaint);
  const [showPresentingCondition, setShowPresentingCondition] = useState(initialSettings.showPresentingCondition);
  const [departmentSelectionMode, setDepartmentSelectionMode] = useState<'allow_select' | 'choose_number'>(initialSettings.departmentSelectionMode);
  const [selectedDepartmentCount, setSelectedDepartmentCount] = useState(initialSettings.selectedDepartmentCount);
  const [allowUserDepartmentChoice, setAllowUserDepartmentChoice] = useState(initialSettings.allowUserDepartmentChoice);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showChiefComplaint,
          showPresentingCondition,
          departmentSelectionMode,
          selectedDepartmentCount,
          allowUserDepartmentChoice,
        }),
      });
      if (response.ok) {
        toast.success('Settings saved successfully');
        onSave({ 
          showChiefComplaint, 
          showPresentingCondition,
          departmentSelectionMode, 
          selectedDepartmentCount,
          allowUserDepartmentChoice,
        });
        onClose();
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-[200]">
      <div className={cn("rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border shadow-2xl",
        isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-white/95 border-white/50"
      )}>
        <div className="flex justify-between items-center mb-6">
          <h2 className={cn("text-2xl font-bold flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
            <i className="fas fa-cog mr-3 text-blue-500"></i>
            OSCE Admin Settings
          </h2>
          <button
            onClick={onClose}
            className={cn("p-2 rounded-lg transition-colors", isDark ? "hover:bg-gray-700" : "hover:bg-gray-100")}
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <p className={cn("mb-6 text-sm", isDark ? "text-gray-400" : "text-slate-500")}>
          These settings only apply to EXAM mode sessions.
        </p>

        <div className="space-y-8">
          {/* Setting 1: Chief Complaint & Presenting Condition - Separate toggles */}
          <div className={cn("p-6 rounded-2xl border", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
            <h3 className={cn("text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
              <i className="fas fa-comment-medical mr-2 text-amber-500"></i>
              Patient Information Display
            </h3>
            
            <div className="space-y-4">
              <ToggleSwitch
                enabled={showChiefComplaint}
                onChange={setShowChiefComplaint}
                label="Show Chief Complaint"
                description="Display the patient's chief complaint (subjective complaint)"
              />
              
              <ToggleSwitch
                enabled={showPresentingCondition}
                onChange={setShowPresentingCondition}
                label="Show Presenting Condition"
                description="Display the patient's presenting condition (objective findings)"
              />
            </div>
          </div>

          {/* Setting 2: Department Selection Mode */}
          <div className={cn("p-6 rounded-2xl border", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
            <h3 className={cn("text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
              <i className="fas fa-building mr-2 text-green-500"></i>
              Department Selection Mode
            </h3>
            
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  checked={departmentSelectionMode === 'allow_select'}
                  onChange={() => setDepartmentSelectionMode('allow_select')}
                  className="w-4 h-4 text-blue-500"
                />
                <div>
                  <p className={cn("font-medium", isDark ? "text-gray-200" : "text-slate-800")}>Allow Department Selection</p>
                  <p className={cn("text-sm", isDark ? "text-gray-400" : "text-slate-500")}>
                    Users can click/select specific departments they want to practice.
                  </p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  checked={departmentSelectionMode === 'choose_number'}
                  onChange={() => setDepartmentSelectionMode('choose_number')}
                  className="w-4 h-4 text-blue-500"
                />
                <div>
                  <p className={cn("font-medium", isDark ? "text-gray-200" : "text-slate-800")}>Choose Number of Departments</p>
                  <p className={cn("text-sm", isDark ? "text-gray-400" : "text-slate-500")}>
                    Users only specify how many departments to use (system randomly selects).
                  </p>
                </div>
              </label>

              {departmentSelectionMode === 'choose_number' && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <label className={cn("block text-sm font-semibold", isDark ? "text-gray-300" : "text-blue-700")}>
                      Number of Departments to Use
                    </label>
                    <ToggleSwitch
                      enabled={allowUserDepartmentChoice}
                      onChange={setAllowUserDepartmentChoice}
                      label="Allow users to choose"
                      description=""
                    />
                  </div>
                  
                  {allowUserDepartmentChoice ? (
                    <div className={cn("p-4 rounded-xl", isDark ? "bg-blue-950/50" : "bg-blue-50/80")}>
                      <p className={cn("text-sm mb-2", isDark ? "text-gray-300" : "text-slate-700")}>
                        <i className="fas fa-users mr-2 text-blue-500"></i>
                        Users will be able to select how many departments to use during session setup.
                      </p>
                      <p className={cn("text-xs", isDark ? "text-gray-400" : "text-slate-500")}>
                        The number selector will appear in the user's setup wizard.
                      </p>
                    </div>
                  ) : (
                    <>
                      <NumberSelector
                        value={selectedDepartmentCount}
                        onChange={setSelectedDepartmentCount}
                        min={1}
                        max={10}
                      />
                      <p className={cn("text-xs mt-2", isDark ? "text-gray-400" : "text-blue-600")}>
                        System will randomly select this many departments for each exam session.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className={cn("px-6 py-3 border-2 rounded-xl transition-all duration-300 flex items-center font-semibold",
              isDark ? "border-gray-700/50 hover:border-gray-500 hover:bg-gray-800/80 text-gray-300" : "border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700"
            )}
          >
            <i className="fas fa-times mr-3"></i>Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl disabled:opacity-50"
          >
            {saving ? (
              <>
                <i className="fas fa-spinner fa-spin mr-3"></i>
                Saving...
              </>
            ) : (
              <>
                <i className="fas fa-save mr-3"></i>
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ====================== MAIN COMPONENT ======================
const OsceSection: FC<OsceSectionProps> = (props) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [currentWizardStep, setCurrentWizardStep] = useState(1);
  const [selectedMode, setSelectedMode] = useState<'practice' | 'exam' | null>(null);
  const [numStations, setNumStations] = useState(1);
  const [selectedDepartments, setSelectedDepartments] = useState<Department[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<Array<{ departmentId: string; topicId: string }>>([]);
  const [physicalExamSelectedTopics, setPhysicalExamSelectedTopics] = useState<string[]>([]);
  const [timePerStation, setTimePerStation] = useState(5);
  const [hintsEnabled, setHintsEnabled] = useState(true);
  const [feedbackEnabled, setFeedbackEnabled] = useState(true);
  const [aiTutorEnabled, setAiTutorEnabled] = useState(false); 
  const [readingBreakEnabled, setReadingBreakEnabled] = useState(true);
  const [estimatedTokens, setEstimatedTokens] = useState(0);
  const [maxTopicsPerDepartment, setMaxTopicsPerDepartment] = useState(2);
  const [showChiefComplaint, setShowChiefComplaint] = useState(true);
  const [showPresentingCondition, setShowPresentingCondition] = useState(true);
  const [departmentSelectionMode, setDepartmentSelectionMode] = useState<'allow_select' | 'choose_number'>('allow_select');
  const [selectedDepartmentCount, setSelectedDepartmentCount] = useState(3);
  const [allowUserDepartmentChoice, setAllowUserDepartmentChoice] = useState(false);
  const [userSelectedDepartmentCount, setUserSelectedDepartmentCount] = useState(3);
  const [showAdminSettingsModal, setShowAdminSettingsModal] = useState(false);
  const steps = ["MODE", "STATIONS", "DEPT/TOPICS", "CONFIG", "REVIEW"];


  // ENFORCE: Hints and AI Tutor can NEVER both be on
  useEffect(() => {
    if (hintsEnabled && aiTutorEnabled) {
      setAiTutorEnabled(false);
      toast.warning('AI Tutor has been disabled. Hints and AI Tutor cannot be used together.', { duration: 3000 });
    }
  }, [hintsEnabled, aiTutorEnabled]);
  // Load admin settings
  const loadAdminSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const settings = await response.json();
        setShowChiefComplaint(settings.showChiefComplaint !== false);
        setShowPresentingCondition(settings.showPresentingCondition !== false);
        setDepartmentSelectionMode(settings.departmentSelectionMode || 'allow_select');
        setSelectedDepartmentCount(settings.selectedDepartmentCount || 3);
        setAllowUserDepartmentChoice(settings.allowUserDepartmentChoice || false);
      }
    } catch (error) {
      console.error('Error loading admin settings:', error);
    }
  }, []);

  useEffect(() => {
    loadAdminSettings();
  }, [loadAdminSettings]);

  // Reset wizard state when section changes to ensure clean state
  useEffect(() => {
    if (props.currentSection === 'clerking' || props.currentSection === 'counselling' || props.currentSection === 'physical_exam') {
      setCurrentWizardStep(1);
      setSelectedMode(null);
      setNumStations(1);
      setSelectedDepartments([]);
      setSelectedTopics([]); 
      setPhysicalExamSelectedTopics([]);
      setTimePerStation(5);
      setHintsEnabled(true);
      setAiTutorEnabled(false); 
      setFeedbackEnabled(true);
      setReadingBreakEnabled(true);
      props.setStationConfigs([]);
      props.setStationPatients([]);
      props.setCurrentSession(null);
    }
  }, [props.currentSection]);

  useEffect(() => {
    const totalMinutes = numStations * timePerStation;
    const estimatedSeconds = totalMinutes * 60;
    const baseTokens = Math.ceil(estimatedSeconds / 2);
    const overhead = 50;
    setEstimatedTokens(baseTokens + overhead);
  }, [numStations, timePerStation]);

  const handleModeSelect = (mode: 'practice' | 'exam') => {
    setSelectedMode(mode);
    if (mode === 'exam') {
      setNumStations(5);
      setTimePerStation(7);
      setHintsEnabled(false);
      setAiTutorEnabled(false);
      setFeedbackEnabled(true);
      setReadingBreakEnabled(true);
    }
    setCurrentWizardStep(2);
  };

  const handleStationCountChange = (value: number) => {
    setNumStations(value);
    if (selectedTopics.length > value) {
      setSelectedTopics(prev => prev.slice(0, value));
    }
    if (physicalExamSelectedTopics.length > value) {
      setPhysicalExamSelectedTopics(physicalExamSelectedTopics.slice(0, value));
    }
  };

  const handleDepartmentToggle = (department: Department) => {
    const isSelected = selectedDepartments.some(d => d.id === department.id);
    if (isSelected) {
      setSelectedDepartments(selectedDepartments.filter(d => d.id !== department.id));
      setSelectedTopics(prev => prev.filter(t => t.departmentId !== department.id));
    } else {
      setSelectedDepartments([...selectedDepartments, department]);
    }
  };

  const handleTopicToggle = (departmentId: string, topicId: string) => {
    const isSelected = selectedTopics.some(t => t.departmentId === departmentId && t.topicId === topicId);
    
    if (isSelected) {
      setSelectedTopics(prev => prev.filter(t => !(t.departmentId === departmentId && t.topicId === topicId)));
    } else {
      if (selectedTopics.length >= numStations) {
        toast.warning(`You can only select up to ${numStations} topic${numStations > 1 ? 's' : ''} (one per station).`);
        return;
      }
      setSelectedTopics(prev => [...prev, { departmentId, topicId }]);
    }
  };

  const handlePhysicalTopicToggle = (topicId: string) => {
    setPhysicalExamSelectedTopics(prev =>
      prev.includes(topicId) ? prev.filter(id => id !== topicId) : [...prev, topicId]
    );
  };

  const handleConfigNext = () => {
    setCurrentWizardStep(5);
  };

  const handleLaunch = async () => {
    props.setStationPatients([]);
    props.setCurrentSession(null);
    props.setCurrentStation(0);
    
    const sessionType = props.currentSessionType || 'clerking';
    const filteredCases = props.getFilteredCases();
    const allDepartments = props.departments.filter((d: Department) => !d.isFlashcardDept);
    
    let stationConfigs: StationConfig[] = [];
    sessionStorage.setItem('current_session_mode', selectedMode || 'practice');

    if (props.currentSection === 'physical_exam' && physicalExamSelectedTopics.length > 0) {
      const selectedPhysicalCases = physicalExamSelectedTopics
        .map((id) => filteredCases.find((c: PatientCase) => c.id === id))
        .filter((c): c is PatientCase => Boolean(c));
      for (let i = 0; i < numStations; i++) {
        const topic = selectedPhysicalCases[i % selectedPhysicalCases.length];
        if (topic) {
          stationConfigs.push({
            index: i,
            departments: [topic.departmentId],
            cases: { [topic.departmentId]: [topic.id] },
            isAllDepartments: false
          });
        }
      }
    } else if (selectedMode === 'exam') {
      // Exam mode logic with admin settings
      let eligibleDepts = allDepartments.filter(dept => {
        const deptCases = filteredCases.filter(c => c.departmentId === dept.id);
        return deptCases.some(c => props.patients.some(p => p.caseId === c.id));
      });
      
      if (eligibleDepts.length === 0) {
        toast.error('No departments with patients available for Exam mode. Please add patients first.');
        return;
      }

      // Apply department selection mode from admin settings
      let departmentsToUse: Department[] = [];
      let actualDeptCount = selectedDepartmentCount;
      
      if (departmentSelectionMode === 'choose_number') {
        if (allowUserDepartmentChoice) {
          // Use the user's selected count
          actualDeptCount = userSelectedDepartmentCount;
        }
        // Randomly select the specified number of departments
        const shuffled = [...eligibleDepts];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        departmentsToUse = shuffled.slice(0, Math.min(actualDeptCount, shuffled.length));
        
        if (departmentsToUse.length < actualDeptCount) {
          toast.warning(`Only ${departmentsToUse.length} departments available with patients. Using available departments.`);
        }
      } else {
        // Use selected departments (but they haven't selected any yet in exam mode wizard)
        // In exam mode, we need to let users select departments first
        if (selectedDepartments.length === 0) {
          toast.error('Please select at least one department for Exam mode.');
          return;
        }
        departmentsToUse = selectedDepartments.filter(dept => 
          eligibleDepts.some(ed => ed.id === dept.id)
        );
        
        if (departmentsToUse.length === 0) {
          toast.error('Selected departments have no patients available. Please add patients first or select different departments.');
          return;
        }
      }
      
      // Create station configs with randomly selected topics from chosen departments
      for (let i = 0; i < numStations; i++) {
        const dept = departmentsToUse[i % departmentsToUse.length];
        if (dept) {
          const casesForDept = filteredCases
            .filter((c: PatientCase) => c.departmentId === dept.id)
            .filter((c: PatientCase) => props.patients.some(p => p.caseId === c.id))
            .map((c: PatientCase) => c.id);
          
          // Randomly select topics up to maxTopicsPerDepartment
          let selectedCaseIds: string[] = [];
          if (casesForDept.length > 0) {
            const shuffledCases = [...casesForDept];
            for (let j = shuffledCases.length - 1; j > 0; j--) {
              const k = Math.floor(Math.random() * (j + 1));
              [shuffledCases[j], shuffledCases[k]] = [shuffledCases[k], shuffledCases[j]];
            }
            selectedCaseIds = shuffledCases.slice(0, Math.min(maxTopicsPerDepartment, shuffledCases.length));
          }
          
          stationConfigs.push({
            index: i,
            departments: [dept.id],
            cases: { [dept.id]: selectedCaseIds },
            isAllDepartments: false
          });
        }
      }
    } else {
      // Practice mode - use selectedTopics
      for (let i = 0; i < selectedTopics.length; i++) {
        const topic = selectedTopics[i];
        const dept = allDepartments.find(d => d.id === topic.departmentId);
        if (dept) {
          stationConfigs.push({
            index: i,
            departments: [dept.id],
            cases: { [dept.id]: [topic.topicId] },
            isAllDepartments: false
          });
        }
      }
      
      // Fill remaining stations with random topics if needed
      for (let i = selectedTopics.length; i < numStations; i++) {
        const randomDept = allDepartments[Math.floor(Math.random() * allDepartments.length)];
        const casesForDept = filteredCases
          .filter((c: PatientCase) => c.departmentId === randomDept?.id)
          .map((c: PatientCase) => c.id);
        stationConfigs.push({
          index: i,
          departments: randomDept ? [randomDept.id] : [],
          cases: randomDept ? { [randomDept.id]: casesForDept } : {},
          isAllDepartments: false
        });
      }
    }

    while (stationConfigs.length < numStations) {
      const randomDept = allDepartments[Math.floor(Math.random() * allDepartments.length)];
      const casesForDept = filteredCases
        .filter((c: PatientCase) => c.departmentId === randomDept?.id)
        .map((c: PatientCase) => c.id);
      stationConfigs.push({
        index: stationConfigs.length,
        departments: randomDept ? [randomDept.id] : [],
        cases: randomDept ? { [randomDept.id]: casesForDept } : {},
        isAllDepartments: false
      });
    }

    if (selectedMode === 'practice') {
  localStorage.setItem(`session_hints_${sessionType}`, hintsEnabled ? 'true' : 'false');
  localStorage.setItem(`session_ai_tutor_${sessionType}`, aiTutorEnabled ? 'true' : 'false');
  localStorage.setItem(`session_feedback_${sessionType}`, feedbackEnabled ? 'true' : 'false');
  localStorage.setItem(`session_break_${sessionType}`, readingBreakEnabled ? 'true' : 'false');
}

    props.setShowLoadingPopup(true);
    props.setLoadingMessage('Setting up your session...');

    const proceedType = sessionType === 'flashcards' ? 'clerking' : sessionType;
    
    try {
      await props.handleProceed(proceedType as 'clerking' | 'counselling' | 'physical_exam', {
        stationConfigs: stationConfigs,
        selectedStations: numStations,
        selectedDuration: timePerStation
      });
      
      setCurrentWizardStep(1);
      setSelectedMode(null);
      setSelectedDepartments([]);
      setSelectedTopics([]);
      setPhysicalExamSelectedTopics([]);
      setNumStations(1);
      setTimePerStation(5);
      // setHintsEnabled(true);
      // setFeedbackEnabled(true);
      // setReadingBreakEnabled(true);
      
    } catch (error) {
      console.error('Error during handleProceed:', error);
      props.setShowLoadingPopup(false);
      toast.error('Failed to create session. Please try again.');
      return;
    }

    props.setShowLoadingPopup(false);
  };

  // Voice session rendering
  // Voice session rendering in OsceSection.tsx
// Voice session rendering in OsceSection.tsx
// Voice session rendering in OsceSection.tsx
if (props.currentSection === 'voice-session' && props.voiceSessionData) {
  const currentStationConfig = props.stationConfigs?.[props.currentStation];
  const currentDepartmentId = currentStationConfig?.departments?.[0];
  const currentDepartment = props.departments?.find(d => d.id === currentDepartmentId);
  
  const systemPrompt = `${props.voiceSessionData.patient?.name}, ${props.voiceSessionData.patient?.age}-yr-old ${props.voiceSessionData.patient?.gender} from ${props.voiceSessionData.patient?.location || 'unknown location'}, presents with: ${props.voiceSessionData.patient?.condition}. ${props.voiceSessionData.patient?.prompt || ''} Never mention the name "AI" or any name other than ${props.voiceSessionData.patient?.name}. Speak only when the student addresses you.`;
  
  const sendMessage = async (chatId: string, role: 'student' | 'patient', content: string) => {
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ chatId, role, content }),
      });
      if (!res.ok) throw new Error(res.statusText);
    } catch (err) {
      console.error('Error saving message:', err);
    }
  };

  const voiceSessionKey = `${props.currentStation}-${props.voiceSessionData.chatId}-${Date.now()}`;

  return (
    <VapiVoiceInterface
      key={voiceSessionKey}
      patient={props.voiceSessionData?.patient || null}
      chatId={props.voiceSessionData?.chatId || ''}
      systemPrompt={systemPrompt}
      sendMessage={sendMessage}
      type={props.voiceSessionData?.type || 'clerking'}
      examSteps={props.voiceSessionData?.examSteps || []}
      stationInfo={props.voiceSessionData?.stationInfo || { current: 0, total: 1 }}
      onExit={props.handleExitVoiceSession}
      durationMinutes={props.selectedDuration}
      mode={props.voiceSessionData?.mode || 'exam'}
      existingMessages={props.voiceSessionData?.existingMessages || []}
      initialElapsedTime={props.voiceSessionData?.elapsedTime || 0}
      uiSettings={{
        showChiefComplaint: props.voiceSessionData?.mode === 'exam' ? props.showChiefComplaint : true,
        showPresentingCondition: props.voiceSessionData?.mode === 'exam' ? props.showPresentingCondition : true,
      }}
      department={currentDepartment ? { id: currentDepartment.id, name: currentDepartment.name, slug: currentDepartment.slug } : null}
      hintEnabled={hintsEnabled}        // ← FIXED: use local state, not props
      aiTutorEnabled={aiTutorEnabled}   // ← FIXED: use local state, not props
    />
  );
}
  // Stations-info
if (props.currentSection === 'stations-info' && props.currentSession) {
  const isExamSession = sessionStorage.getItem('current_session_mode') === 'exam';
  return (
    <div className="space-y-6">
      <div className={cn("rounded-2xl shadow-lg p-8 border backdrop-blur-sm",
        isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-gradient-to-br from-white/95 to-blue-50/95 border-blue-100/50"
      )}>
        <h2 className={cn("text-3xl font-bold mb-6 flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
          <i className="fas fa-hospital-user mr-4 text-blue-500"></i>Station {props.currentStation + 1} of {props.selectedStations}
        </h2>
        <div className="w-full bg-blue-100/80 rounded-full h-3 mb-8 overflow-hidden">
          <div
            className="bg-blue-500 h-3 rounded-full transition-all duration-300"
            style={{width: `${((props.currentStation + 1) / props.selectedStations) * 100}%`}}
          ></div>
        </div>
        {(() => {
          const currentPatient = props.stationPatients[props.currentStation]?.patient;
          if (!currentPatient) {
            return <p className="text-center text-rose-600 text-lg">No patient available for this station. Please check configuration.</p>;
          }
          return (
            <div className={cn("max-w-lg mx-auto rounded-2xl p-8 border shadow-sm",
              isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50"
            )}>
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center">
                  <img
                    src={currentPatient.imageUrl || '/uploads/default-avatar.png'}
                    alt={currentPatient.name}
                    className="w-16 h-16 rounded-full mr-4 border shadow-sm"
                  />
                  <div>
                    <h3 className={cn("text-2xl font-bold", isDark ? "text-gray-100" : "text-slate-800")}>{currentPatient.name}</h3>
                    <p className={cn("text-base", isDark ? "text-gray-400" : "text-slate-600")}>{currentPatient.age} years, {currentPatient.gender}</p>
                  </div>
                </div>
              </div>
              {currentPatient.location && (
                <p className={cn("text-base mb-3 flex items-center", isDark ? "text-gray-400" : "text-slate-600")}>
                  <i className="fas fa-map-marker-alt mr-3 text-slate-500"></i>
                  <span className="font-semibold">Location:</span> {currentPatient.location}
                </p>
              )}
          

{/* Presenting Condition: Show in practice OR if enabled in exam settings */}
{(!isExamSession || showPresentingCondition === true) && (
  <p className={cn("text-base mb-3 flex items-center", isDark ? "text-gray-400" : "text-slate-600")}>
    <i className="fas fa-notes-medical mr-3 text-slate-500"></i>
    <span className="font-semibold">Presenting Condition: </span> {currentPatient.condition}
  </p>
)}

{/* Chief Complaint: Show in practice OR if enabled in exam settings */}
{currentPatient.prompt && (!isExamSession || showChiefComplaint === true) && (
  <div className={cn("border-l-4 p-6 rounded-xl mb-6",
    isDark ? "bg-blue-950/50 border-blue-600" : "bg-blue-50/80 border-blue-300"
  )}>
    <h4 className={cn("font-semibold mb-3 flex items-center text-lg",
      isDark ? "text-gray-200" : "text-slate-800"
    )}>
      <i className="fas fa-comment-medical mr-3 text-blue-500"></i>Chief Complaint:
    </h4>
    <p className={cn("text-base leading-relaxed", isDark ? "text-gray-300" : "text-slate-600")}>{currentPatient.prompt}</p>
  </div>
)}
            </div>
          );
        })()}
        <div className="text-center mt-8">
          <p className={cn("text-base mb-4", isDark ? "text-gray-400" : "text-slate-600")}>Review the patient information above.</p>
        </div>
        <div className="flex flex-wrap justify-between mt-10 gap-4">
          <button
            onClick={() => props.setCurrentStation(Math.max(0, props.currentStation - 1))}
            disabled={props.currentStation === 0}
            className={cn("px-6 py-3 border-2 rounded-xl disabled:opacity-50 hover:shadow-lg transition-all duration-300 flex items-center font-semibold shadow-lg hover:scale-105 cursor-pointer",
              isDark
                ? "border-gray-700/50 hover:border-blue-500 hover:bg-gray-800/80 text-gray-300"
                : "border-slate-200/50 hover:border-blue-400 hover:bg-blue-50/80 text-slate-700"
            )}
          >
            <i className="fas fa-arrow-left mr-3"></i>Previous
          </button>
          <button
            onClick={props.handleStartStationSimulation}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl hover:scale-105 cursor-pointer"
          >
            <i className="fas fa-play mr-3"></i>Start Simulation for this Station
          </button>
          <button
            onClick={props.handleProceedStation}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl hover:scale-105 cursor-pointer"
          >
            <i className="fas fa-arrow-right mr-3"></i>{props.currentStation < props.selectedStations - 1 ? 'Next Station' : 'Finish Review'}
          </button>
        </div>
      </div>
      {/* BANNER SECTION - Shows on stations-info page */}
      <BannerCarousel isDark={isDark} />
    </div>
  );
}

  // Setup screen
  if (props.currentSection === `setup-${props.currentSessionType}`) {
    return (
      <div className={cn("rounded-2xl shadow-lg p-8 border backdrop-blur-sm",
        isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-gradient-to-br from-white/95 to-blue-50/95 border-blue-100/50"
      )}>
        <h2 className={cn("text-3xl font-bold mb-8 flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
          <i className="fas fa-cog mr-4 text-blue-500"></i>
          {props.currentSessionType === 'clerking' && 'Clerking Setup'}
          {props.currentSessionType === 'counselling' && 'Counseling Setup'}
          {props.currentSessionType === 'physical_exam' && 'Physical Exam Setup'}
        </h2>
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className={cn("group p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer",
            isDark ? "bg-indigo-950/80" : "bg-indigo-50/80"
          )}>
            <h3 className={cn("text-lg font-semibold mb-2 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
              <i className="fas fa-cog mr-2 text-blue-500"></i>Mode
            </h3>
            <p className={isDark ? "text-gray-400" : "text-slate-600"}>{selectedMode === 'practice' ? 'Practice' : 'Exam'}</p>
          </div>
          <div className={cn("group p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer",
            isDark ? "bg-indigo-950/80" : "bg-indigo-50/80"
          )}>
            <h3 className={cn("text-lg font-semibold mb-2 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
              <i className="fas fa-list-ol mr-2 text-blue-500"></i>Stations
            </h3>
            <p className={isDark ? "text-gray-400" : "text-slate-600"}>{props.selectedStations}</p>
          </div>
          <div className={cn("group p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer",
            isDark ? "bg-indigo-950/80" : "bg-indigo-50/80"
          )}>
            <h3 className={cn("text-lg font-semibold mb-2 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
              <i className="fas fa-clock mr-2 text-amber-500"></i>Duration
            </h3>
            <p className={isDark ? "text-gray-400" : "text-slate-600"}>{props.selectedDuration} minutes</p>
          </div>
          <div className={cn("group p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer",
            isDark ? "bg-indigo-950/80" : "bg-indigo-50/80"
          )}>
            <h3 className={cn("text-lg font-semibold mb-2 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
              <i className="fas fa-folder mr-2 text-blue-500"></i>Departments
            </h3>
            <p className={isDark ? "text-gray-400" : "text-slate-600"}>{props.getSelectedDepartments()}</p>
          </div>
          <div className={cn("col-span-full group p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer",
            isDark ? "bg-indigo-950/80" : "bg-indigo-50/80"
          )}>
            <h3 className={cn("text-lg font-semibold mb-2 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
              <i className="fas fa-file-medical mr-2 text-blue-500"></i>Case Titles
            </h3>
            <p className={cn("whitespace-pre-wrap", isDark ? "text-gray-400" : "text-slate-600")}>{props.getSelectedCases()}</p>
          </div>
        </div>
        <h3 className={cn("text-2xl font-bold mb-6 flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
          <i className="fas fa-info-circle mr-3 text-blue-500"></i>Instructions
        </h3>
        <div className={cn("space-y-4 mb-8 text-base", isDark ? "text-gray-400" : "text-slate-600")}>
          <p>Welcome to this {props.currentSessionType} Module! This simulation is designed to help you practice in a structured, exam-focused manner.</p>
          <div className={cn("border-l-4 p-4 rounded-xl",
            isDark ? "bg-blue-950/50 border-blue-600" : "bg-blue-50/80 border-blue-300"
          )}>
            You will be presented with patient cases including basic details and relevant prompts.
          </div>
        </div>
        <div className="flex justify-center">
          <button
            onClick={async () => {
              props.setIsStartClicked(true);
              const sessionType = props.currentSessionType === 'flashcards' ? 'clerking' : props.currentSessionType || 'clerking';
              await props.handleStart(sessionType as 'clerking' | 'counselling' | 'physical_exam');
              props.setIsStartClicked(false);
            }}
            disabled={props.isStartClicked}
            className="px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer text-lg min-w-[180px] justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {props.isStartClicked ? (
              <>
                <i className="fas fa-spinner fa-spin mr-3"></i>
                Starting...
              </>
            ) : (
              <>
                <i className="fas fa-play mr-3"></i>
                Start
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Create screens
  if (props.currentSection === `create-${props.currentSessionType}`) {
    const sessionType = props.currentSessionType || 'clerking';
    return (
      <div className={cn("rounded-2xl shadow-lg p-8 border backdrop-blur-sm",
        isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-gradient-to-br from-white/95 to-blue-50/95 border-blue-100/50"
      )}>
        <h2 className={cn("text-3xl font-bold mb-8 flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
          <i className="fas fa-plus mr-4 text-blue-500"></i>Create New {sessionType === 'clerking' ? 'Clerking' : sessionType === 'counselling' ? 'Counseling' : 'Physical Exam'} Session
        </h2>
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className={cn("p-6 rounded-2xl border shadow-sm", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
            <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
              <i className="fas fa-clock mr-3 text-amber-500"></i>Duration (minutes)
            </label>
            <NumberInput
              value={props.selectedDuration}
              onChange={props.setSelectedDuration}
              min={1}
              max={30}
              defaultValue={5}
              placeholder="1-30"
            />
          </div>
          <div className={cn("p-6 rounded-2xl border shadow-sm", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
            <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
              <i className="fas fa-list-ol mr-3 text-blue-500"></i>Number of Stations
            </label>
            <NumberInput
              value={props.selectedStations}
              onChange={(value) => props.updateStations(value, sessionType as any)}
              min={1}
              max={10}
              defaultValue={1}
              placeholder="1-10"
            />
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-4 mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => props.openManageList('department')}
            className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300",
              isDark ? "bg-purple-900/50 text-purple-300 hover:bg-purple-800/50" : "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-200"
            )}
          >
            <i className="fas fa-edit mr-2"></i>Manage Departments
          </button>
          <button
            onClick={() => props.openManageList('case')}
            className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300",
              isDark ? "bg-green-900/50 text-green-300 hover:bg-green-800/50" : "bg-green-100 text-green-700 hover:bg-green-200 border border-green-200"
            )}
          >
            <i className="fas fa-edit mr-2"></i>Manage Cases
          </button>
          <button
            onClick={() => props.openManageList('patient')}
            className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300",
              isDark ? "bg-blue-900/50 text-blue-300 hover:bg-blue-800/50" : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200"
            )}
          >
            <i className="fas fa-edit mr-2"></i>Manage Patients
          </button>
          <button
            onClick={() => props.switchSection(`create-${sessionType}-department`)}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 text-sm font-medium"
          >
            <i className="fas fa-plus mr-2"></i>Create Department
          </button>
          <button
            onClick={() => props.switchSection(`create-${sessionType}-case`)}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 text-sm font-medium"
          >
            <i className="fas fa-plus mr-2"></i>Create Case
          </button>
          <button
            onClick={() => props.switchSection(`create-${sessionType}-patient`)}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 text-sm font-medium"
          >
            <i className="fas fa-plus mr-2"></i>Create Patient
          </button>
          {props.session?.user?.role === 'admin' && (
            <button
              onClick={() => setShowAdminSettingsModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-300 text-sm font-medium"
            >
              <i className="fas fa-cog mr-2"></i>OSCE Settings
            </button>
          )}
        </div>

        {/* Admin Settings Modal */}
        <AdminSettingsModal
          isOpen={showAdminSettingsModal}
          onClose={() => setShowAdminSettingsModal(false)}
          onSave={(settings) => {
            setShowChiefComplaint(settings.showChiefComplaint);
            setShowPresentingCondition(settings.showPresentingCondition);
            setDepartmentSelectionMode(settings.departmentSelectionMode);
            setSelectedDepartmentCount(settings.selectedDepartmentCount);
            setAllowUserDepartmentChoice(settings.allowUserDepartmentChoice);
          }}
          initialSettings={{
            showChiefComplaint,
            showPresentingCondition,
            departmentSelectionMode,
            selectedDepartmentCount,
            allowUserDepartmentChoice,
          }}
        />
      </div>
    );
  }

  if (props.currentSection === `create-${props.currentSessionType}-department`) {
    const sessionType = props.currentSessionType || 'clerking';
    return (
      <div className={cn("rounded-2xl shadow-lg p-8 border backdrop-blur-sm",
        isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-gradient-to-br from-white/95 to-blue-50/95 border-blue-100/50"
      )}>
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
              value={props.newDepartmentName}
              onChange={(e) => props.setNewDepartmentName(e.target.value)}
              className={cn("w-full p-4 rounded-xl focus:ring-4 transition-all duration-200 text-lg",
                isDark ? "bg-gray-800 border-2 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200 placeholder:text-gray-500" : "bg-white border-2 border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 text-slate-800 placeholder:text-slate-400"
              )}
              placeholder="e.g., Cardiology"
            />
          </div>
          <div className={cn("p-6 rounded-2xl border shadow-sm", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
            <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
              <i className="fas fa-link mr-3 text-blue-500"></i>Department Slug
            </label>
            <input
              type="text"
              value={props.newDepartmentSlug}
              onChange={(e) => props.setNewDepartmentSlug(e.target.value)}
              className={cn("w-full p-4 rounded-xl focus:ring-4 transition-all duration-200 text-lg",
                isDark ? "bg-gray-800 border-2 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200 placeholder:text-gray-500" : "bg-white border-2 border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 text-slate-800 placeholder:text-slate-400"
              )}
              placeholder="e.g., cardiology"
            />
          </div>
        </div>
        <div className="flex justify-end gap-4">
          <button
            onClick={() => props.switchSection(sessionType)}
            className={cn("px-6 py-3 border-2 rounded-xl transition-all duration-300 flex items-center font-semibold",
              isDark ? "border-gray-700/50 hover:border-gray-500 hover:bg-gray-800/80 text-gray-300" : "border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700"
            )}
          >
            <i className="fas fa-times mr-3"></i>Cancel
          </button>
          <button
            onClick={() => props.handleCreateDepartment(sessionType as any)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
          >
            <i className="fas fa-check mr-3"></i>Create
          </button>
        </div>
      </div>
    );
  }

  if (props.currentSection === `create-${props.currentSessionType}-case`) {
    const sessionType = props.currentSessionType || 'clerking';
    const osceDepartments = props.departments.filter((dept: Department) => {
      if (dept.isFlashcardDept) return false;
      return dept.osceType === sessionType;
    });
    return (
      <div className={cn("rounded-2xl shadow-lg p-8 border backdrop-blur-sm",
        isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-gradient-to-br from-white/95 to-blue-50/95 border-blue-100/50"
      )}>
        <h2 className={cn("text-3xl font-bold mb-8 flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
          <i className="fas fa-file-medical mr-4 text-blue-500"></i>Create New Case
        </h2>
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className={cn("p-6 rounded-2xl border shadow-sm", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
            <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
              <i className="fas fa-folder mr-3 text-blue-500"></i>Department
            </label>
            <select
              value={props.currentDepartment}
              onChange={(e) => props.setCurrentDepartment(e.target.value)}
              className={cn("w-full p-4 rounded-xl focus:ring-4 transition-all duration-200 text-lg",
                isDark ? "bg-gray-800 border-2 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200" : "bg-white border-2 border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 text-slate-800"
              )}
            >
              <option value="">Select Department</option>
              {osceDepartments.map((dept: Department) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
          <div className={cn("p-6 rounded-2xl border shadow-sm", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
            <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
              <i className="fas fa-heading mr-3 text-blue-500"></i>Title
            </label>
            <input
              type="text"
              value={props.newCaseTitle}
              onChange={(e) => props.setNewCaseTitle(e.target.value)}
              className={cn("w-full p-4 rounded-xl focus:ring-4 transition-all duration-200 text-lg",
                isDark ? "bg-gray-800 border-2 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200 placeholder:text-gray-500" : "bg-white border-2 border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 text-slate-800 placeholder:text-slate-400"
              )}
              placeholder="e.g., Acute Chest Pain"
            />
          </div>
          <div className={cn("p-6 rounded-2xl border shadow-sm", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
            <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
              <i className="fas fa-file-text mr-3 text-blue-500"></i>Description
            </label>
            <textarea
              value={props.newCaseDescription}
              onChange={(e) => props.setNewCaseDescription(e.target.value)}
              className={cn("w-full p-4 rounded-xl focus:ring-4 transition-all duration-200 text-lg min-h-[120px]",
                isDark ? "bg-gray-800 border-2 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200 placeholder:text-gray-500" : "bg-white border-2 border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 text-slate-800 placeholder:text-slate-400"
              )}
              placeholder="Describe the case..."
            />
          </div>
          <div className={cn("p-6 rounded-2xl border shadow-sm", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
            <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
              <i className="fas fa-star mr-3 text-amber-500"></i>Difficulty
            </label>
            <select
              value={props.newCaseDifficulty}
              onChange={(e) => props.setNewCaseDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
              className={cn("w-full p-4 rounded-xl focus:ring-4 transition-all duration-200 text-lg",
                isDark ? "bg-gray-800 border-2 border-gray-700 focus:border-amber-500 focus:ring-amber-900/30 text-gray-200" : "bg-white border-2 border-slate-200 focus:border-amber-400 focus:ring-4 focus:ring-amber-100 text-slate-800"
              )}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div className={cn("p-6 rounded-2xl border shadow-sm", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
            <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
              <i className="fas fa-tags mr-3 text-blue-500"></i>Topic (Optional)
            </label>
            <input
              type="text"
              value={props.newCaseTopic}
              onChange={(e) => props.setNewCaseTopic(e.target.value)}
              className={cn("w-full p-4 rounded-xl focus:ring-4 transition-all duration-200 text-lg",
                isDark ? "bg-gray-800 border-2 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200 placeholder:text-gray-500" : "bg-white border-2 border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 text-slate-800 placeholder:text-slate-400"
              )}
              placeholder="e.g., Cardiovascular"
            />
          </div>
        </div>
        <div className="flex justify-end gap-4">
          <button
            onClick={() => props.switchSection(sessionType)}
            className={cn("px-6 py-3 border-2 rounded-xl transition-all duration-300 flex items-center font-semibold",
              isDark ? "border-gray-700/50 hover:border-gray-500 hover:bg-gray-800/80 text-gray-300" : "border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700"
            )}
          >
            <i className="fas fa-times mr-3"></i>Cancel
          </button>
          <button
            onClick={() => props.handleCreateCase(sessionType as any)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
          >
            <i className="fas fa-check mr-3"></i>Create
          </button>
        </div>
      </div>
    );
  }

  if (props.currentSection === `create-${props.currentSessionType}-patient`) {
    const sessionType = props.currentSessionType || 'clerking';
    const filteredCases = props.patientCases.filter((c: PatientCase) => c.sessionType === sessionType);
    return (
      <div className={cn("rounded-2xl shadow-lg p-8 border backdrop-blur-sm",
        isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-gradient-to-br from-white/95 to-blue-50/95 border-blue-100/50"
      )}>
        <h2 className={cn("text-3xl font-bold mb-8 flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
          <i className="fas fa-user-plus mr-4 text-blue-500"></i>Create New Patient
        </h2>
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className={cn("p-6 rounded-2xl border shadow-sm", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
            <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
              <i className="fas fa-briefcase-medical mr-3 text-blue-500"></i>Case
            </label>
            <select
              value={props.selectedCase?.id || ''}
              onChange={(e) => props.setSelectedCase(filteredCases.find((c: PatientCase) => c.id === e.target.value) || null)}
              className={cn("w-full p-4 rounded-xl focus:ring-4 transition-all duration-200 text-lg",
                isDark ? "bg-gray-800 border-2 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200" : "bg-white border-2 border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 text-slate-800"
              )}
            >
              <option value="">Select Case</option>
              {filteredCases.map((caseItem: PatientCase) => (
                <option key={caseItem.id} value={caseItem.id}>{caseItem.title}</option>
              ))}
            </select>
          </div>
          <div className={cn("p-6 rounded-2xl border shadow-sm", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
            <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
              <i className="fas fa-user mr-3 text-blue-500"></i>Name
            </label>
            <input
              type="text"
              value={props.newPatientName}
              onChange={(e) => props.setNewPatientName(e.target.value)}
              className={cn("w-full p-4 rounded-xl focus:ring-4 transition-all duration-200 text-lg",
                isDark ? "bg-gray-800 border-2 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200 placeholder:text-gray-500" : "bg-white border-2 border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 text-slate-800 placeholder:text-slate-400"
              )}
              placeholder="e.g., John Doe"
            />
          </div>
          <div className={cn("p-6 rounded-2xl border shadow-sm", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
            <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
              <i className="fas fa-birthday-cake mr-3 text-blue-500"></i>Age
            </label>
            <input
              type="text"
              value={props.newPatientAge}
              onChange={(e) => props.setNewPatientAge(e.target.value)}
              className={cn("w-full p-4 rounded-xl focus:ring-4 transition-all duration-200 text-lg",
                isDark ? "bg-gray-800 border-2 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200 placeholder:text-gray-500" : "bg-white border-2 border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 text-slate-800 placeholder:text-slate-400"
              )}
              placeholder="e.g., 45"
            />
          </div>
          <div className={cn("p-6 rounded-2xl border shadow-sm", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
            <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
              <i className="fas fa-venus-mars mr-3 text-blue-500"></i>Gender
            </label>
            <select
              value={props.newPatientGender}
              onChange={(e) => props.setNewPatientGender(e.target.value as 'male' | 'female' | 'other')}
              className={cn("w-full p-4 rounded-xl focus:ring-4 transition-all duration-200 text-lg",
                isDark ? "bg-gray-800 border-2 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200" : "bg-white border-2 border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 text-slate-800"
              )}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className={cn("p-6 rounded-2xl border shadow-sm", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
            <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
              <i className="fas fa-map-marker-alt mr-3 text-blue-500"></i>Location (Optional)
            </label>
            <input
              type="text"
              value={props.newPatientLocation}
              onChange={(e) => props.setNewPatientLocation(e.target.value)}
              className={cn("w-full p-4 rounded-xl focus:ring-4 transition-all duration-200 text-lg",
                isDark ? "bg-gray-800 border-2 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200 placeholder:text-gray-500" : "bg-white border-2 border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 text-slate-800 placeholder:text-slate-400"
              )}
              placeholder="e.g., New York"
            />
          </div>
          <div className={cn("p-6 rounded-2xl border shadow-sm", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
            <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
              <i className="fas fa-heartbeat mr-3 text-red-500"></i>Condition
            </label>
            <input
              type="text"
              value={props.newPatientCondition}
              onChange={(e) => props.setNewPatientCondition(e.target.value)}
              className={cn("w-full p-4 rounded-xl focus:ring-4 transition-all duration-200 text-lg",
                isDark ? "bg-gray-800 border-2 border-gray-700 focus:border-red-500 focus:ring-red-900/30 text-gray-200 placeholder:text-gray-500" : "bg-white border-2 border-slate-200 focus:border-red-400 focus:ring-4 focus:ring-red-100 text-slate-800 placeholder:text-slate-400"
              )}
              placeholder="e.g., Hypertension"
            />
          </div>
          <div className="col-span-2">
            <div className={cn("p-6 rounded-2xl border shadow-sm", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
              <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
                <i className="fas fa-comment-medical mr-3 text-blue-500"></i>Prompt (Optional)
              </label>
              <textarea
                value={props.newPatientPrompt}
                onChange={(e) => props.setNewPatientPrompt(e.target.value)}
                className={cn("w-full p-4 rounded-xl focus:ring-4 transition-all duration-200 text-lg min-h-[120px]",
                  isDark ? "bg-gray-800 border-2 border-gray-700 focus:border-blue-500 focus:ring-blue-900/30 text-gray-200 placeholder:text-gray-500" : "bg-white border-2 border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 text-slate-800 placeholder:text-slate-400"
                )}
                placeholder="e.g., Patient presents with chest pain..."
              />
            </div>
          </div>
          <div className="col-span-2">
            <div className={cn("p-6 rounded-2xl border shadow-sm", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
              <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
                <i className="fas fa-image mr-3 text-purple-500"></i>Patient Image (Optional, max 100kb)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 100 * 1024) {
                    toast.error('Image must be less than 100kb');
                    return;
                  }
                  const formData = new FormData();
                  formData.append('file', file);
                  const res = await fetch('/api/upload', { method: 'POST', body: formData });
                  if (!res.ok) {
                    toast.error('Upload failed');
                    return;
                  }
                  const { url } = await res.json();
                  props.setNewPatientImage(url);
                }}
                className={cn("w-full p-4 border-2 rounded-xl focus:ring-4 transition-all duration-200 text-lg file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold",
                  isDark
                    ? "bg-gray-800 border-gray-700 focus:border-purple-500 focus:ring-purple-900/30 text-gray-200 file:bg-blue-900/50 file:text-blue-300 hover:file:bg-blue-800/50"
                    : "bg-white border-slate-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                )}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-4">
          <button
            onClick={() => props.switchSection(sessionType)}
            className={cn("px-6 py-3 border-2 rounded-xl transition-all duration-300 flex items-center font-semibold",
              isDark ? "border-gray-700/50 hover:border-gray-500 hover:bg-gray-800/80 text-gray-300" : "border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700"
            )}
          >
            <i className="fas fa-times mr-3"></i>Cancel
          </button>
          <button
            onClick={() => props.handleCreatePatient(sessionType as any)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
          >
            <i className="fas fa-check mr-3"></i>Create
          </button>
        </div>
      </div>
    );
  }

  // WIZARD UI
  if (props.currentSection === 'clerking' || props.currentSection === 'counselling' || props.currentSection === 'physical_exam') {
    if (currentWizardStep === 1) {
  return (
    <div className="space-y-6">
      <div className={cn("rounded-2xl shadow-lg p-8 border backdrop-blur-sm",
        isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-gradient-to-br from-white/95 to-blue-50/95 border-blue-100/50"
      )}>
        <StepIndicator currentStep={1} steps={steps} />
        <div className="text-center mb-12">
          <h2 className={cn("text-3xl font-bold mb-4", isDark ? "text-gray-100" : "text-slate-800")}>
            Choose Your Mode
          </h2>
          <p className={cn("text-lg", isDark ? "text-gray-400" : "text-slate-600")}>
            Your mode determines what you configure. Pick before anything else.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <ModeCard
            mode="practice"
            selected={selectedMode === 'practice'}
            onSelect={() => handleModeSelect('practice')}
            icon="fa-book"
            title="Practice"
            badge="Flexible"
            description="Full Control. Pick departments, subtopics, and timing yourself. Hints and feedback available."
            features={['Custom Depts', 'Custom Subtopics', 'Hints on', 'Flexible Timing']}
          />
          <ModeCard
            mode="exam"
            selected={selectedMode === 'exam'}
            onSelect={() => handleModeSelect('exam')}
            icon="fa-clock"
            title="Exam"
            badge="STRICT"
            description="Mirrors MDCN OSCE conditions. Only pick your departments. All parameters are preset, no hints."
            features={['Dept Only', '5 Stations', '7 Mins each', 'No Hints']}
          />
        </div>
        {props.session?.user?.role === 'admin' && (
          <div className="flex flex-wrap justify-center gap-3 mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => props.openManageList('department')}
              className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300",
                isDark ? "bg-purple-900/50 text-purple-300 hover:bg-purple-800/50" : "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-200"
              )}
            >
              <i className="fas fa-edit mr-2"></i>Manage Departments
            </button>
            <button
              onClick={() => props.openManageList('case')}
              className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300",
                isDark ? "bg-green-900/50 text-green-300 hover:bg-green-800/50" : "bg-green-100 text-green-700 hover:bg-green-200 border border-green-200"
              )}
            >
              <i className="fas fa-edit mr-2"></i>Manage Cases
            </button>
            <button
              onClick={() => props.openManageList('patient')}
              className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300",
                isDark ? "bg-blue-900/50 text-blue-300 hover:bg-blue-800/50" : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200"
              )}
            >
              <i className="fas fa-edit mr-2"></i>Manage Patients
            </button>
            <button
              onClick={() => props.switchSection(`create-${props.currentSection}`)}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 text-sm font-medium"
            >
              <i className="fas fa-plus mr-2"></i>Create New
            </button>
          </div>
        )}
      </div>
      {/* BANNER SECTION - ONLY SHOW WHEN NO MODE SELECTED YET */}
      {!selectedMode && <BannerCarousel isDark={isDark} />}
    </div>
  );
}

    if (currentWizardStep === 2) {
  return (
    <div className="space-y-6">
      <div className={cn("rounded-2xl shadow-lg p-8 border backdrop-blur-sm",
        isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-gradient-to-br from-white/95 to-blue-50/95 border-blue-100/50"
      )}>
        <StepIndicator currentStep={2} steps={steps} />
        <div className="text-center mb-12">
          <h2 className={cn("text-3xl font-bold mb-4", isDark ? "text-gray-100" : "text-slate-800")}>
            How Many Stations?
          </h2>
          <p className={cn("text-lg", isDark ? "text-gray-400" : "text-slate-600")}>
            This sets how many departments or subtopics you can pick from
          </p>
        </div>
        <div className="max-w-2xl mx-auto">
          <NumberSelector
            value={numStations}
            onChange={handleStationCountChange}
            min={1}
            max={5}
            label="Number of Stations"
          />
          <div className="flex justify-between mt-12 gap-4">
            <button
              onClick={() => setCurrentWizardStep(1)}
              className={cn("px-6 py-3 border-2 rounded-xl transition-all duration-300 flex items-center font-semibold",
                isDark ? "border-gray-700/50 hover:border-gray-500 hover:bg-gray-800/80 text-gray-300" : "border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700"
              )}
            >
              <i className="fas fa-arrow-left mr-3"></i>Back
            </button>
            <button
              onClick={() => setCurrentWizardStep(3)}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
            >
              Continue <i className="fas fa-arrow-right ml-3"></i>
            </button>
          </div>
        </div>
      </div>
      {/* BANNER SECTION */}
      <BannerCarousel isDark={isDark} />
    </div>
  );
}

    if (currentWizardStep === 3) {
      const filteredCases = props.getFilteredCases();
      const casesByDepartment: Record<string, PatientCase[]> = {};
      const currentSessionType = props.currentSessionType || 'clerking';
      const casesForCurrentSession = props.patientCases.filter(
        (c: PatientCase) => c.sessionType === currentSessionType
      );
      casesForCurrentSession.forEach((c: PatientCase) => {
        if (!casesByDepartment[c.departmentId]) {
          casesByDepartment[c.departmentId] = [];
        }
        casesByDepartment[c.departmentId].push(c);
      });

      if (props.currentSection === 'physical_exam') {
  const physicalCases = casesForCurrentSession;
  return (
    <div className="space-y-6">
      <div className={cn("rounded-2xl shadow-lg p-8 border backdrop-blur-sm",
        isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-gradient-to-br from-white/95 to-blue-50/95 border-blue-100/50"
      )}>
        <StepIndicator currentStep={3} steps={steps} />
        <div className="text-center mb-8">
          <h2 className={cn("text-3xl font-bold mb-4", isDark ? "text-gray-100" : "text-slate-800")}>Select Physical Examination Topics</h2>
          <p className={cn("text-lg", isDark ? "text-gray-400" : "text-slate-600")}>Choose the examination steps for your stations</p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center max-w-4xl mx-auto">
          {physicalCases.map((topic: PatientCase) => (
            <TopicBadge
              key={topic.id}
              topic={{ id: topic.id, name: topic.title }}
              selected={physicalExamSelectedTopics.includes(topic.id)}
              onToggle={() => handlePhysicalTopicToggle(topic.id)}
            />
          ))}
        </div>
        {physicalExamSelectedTopics.length === 0 && (
          <div className="text-center py-8 text-amber-500">
            <i className="fas fa-info-circle mr-2"></i>Please select at least one topic
          </div>
        )}
        <div className="flex justify-between mt-12 gap-4">
          <button
            onClick={() => setCurrentWizardStep(2)}
            className={cn("px-6 py-3 border-2 rounded-xl transition-all duration-300 flex items-center font-semibold",
              isDark ? "border-gray-700/50 hover:border-gray-500 hover:bg-gray-800/80 text-gray-300" : "border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700"
            )}
          >
            <i className="fas fa-arrow-left mr-3"></i>Back
          </button>
          <button
            onClick={() => {
              if (physicalExamSelectedTopics.length === 0) {
                toast.warning("Please select at least one topic");
                return;
              }
              setCurrentWizardStep(4);
            }}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
          >
            Configure Session <i className="fas fa-arrow-right ml-3"></i>
          </button>
        </div>
      </div>
      {/* BANNER SECTION */}
      <BannerCarousel isDark={isDark} />
    </div>
  );
}

      const osceDepartments = props.departments.filter((dept: Department) => {
        if (dept.isFlashcardDept) return false;
        return dept.osceType === currentSessionType;
      });

      // For exam mode with 'choose_number' setting
      // For exam mode with 'choose_number' setting
// For exam mode with 'choose_number' setting
if (selectedMode === 'exam' && departmentSelectionMode === 'choose_number') {
  return (
    <div className="space-y-6">
      <div className={cn("rounded-2xl shadow-lg p-8 border backdrop-blur-sm",
        isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-gradient-to-br from-white/95 to-blue-50/95 border-blue-100/50"
      )}>
        <StepIndicator currentStep={3} steps={steps} />
        <div className="text-center mb-8">
          <h2 className={cn("text-3xl font-bold mb-4", isDark ? "text-gray-100" : "text-slate-800")}>
            Department Selection
          </h2>
          <p className={cn("text-lg", isDark ? "text-gray-400" : "text-slate-600")}>
            {allowUserDepartmentChoice 
              ? "Choose how many departments you want for your exam"
              : `System will randomly select ${selectedDepartmentCount} department(s) for your exam`}
          </p>
        </div>
        <div className="max-w-2xl mx-auto">
          <div className={cn("p-6 rounded-2xl border mb-6", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
            {allowUserDepartmentChoice ? (
              <>
                <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
                  <i className="fas fa-building mr-3 text-green-500"></i>
                  Number of Departments to Use
                </label>
                <NumberSelector
                  value={userSelectedDepartmentCount}
                  onChange={setUserSelectedDepartmentCount}
                  min={1}
                  max={Math.min(10, osceDepartments.length)}
                />
                <p className={cn("text-sm mt-3", isDark ? "text-gray-400" : "text-slate-500")}>
                  Available departments with patients: {osceDepartments.filter(dept => {
                    const deptCases = casesForCurrentSession.filter(c => c.departmentId === dept.id);
                    return deptCases.some(c => props.patients.some(p => p.caseId === c.id));
                  }).length}
                </p>
              </>
            ) : (
              <>
                <p className={cn("text-center py-4", isDark ? "text-gray-300" : "text-slate-700")}>
                  <i className="fas fa-random mr-2 text-blue-500"></i>
                  The system will randomly select <strong>{selectedDepartmentCount}</strong> department(s) from available departments with patients.
                </p>
                <p className={cn("text-sm mt-3 text-center", isDark ? "text-gray-400" : "text-slate-500")}>
                  Available departments with patients: {osceDepartments.filter(dept => {
                    const deptCases = casesForCurrentSession.filter(c => c.departmentId === dept.id);
                    return deptCases.some(c => props.patients.some(p => p.caseId === c.id));
                  }).length}
                </p>
              </>
            )}
            
            {/* Max Topics Per Department - Always show for exam mode */}
            <div className={cn("mt-6 pt-6 border-t", isDark ? "border-gray-700" : "border-gray-200")}>
              <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
                <i className="fas fa-layer-group mr-3 text-purple-500"></i>
                Max Topics Per Department
              </label>
              <NumberSelector
                value={maxTopicsPerDepartment}
                onChange={setMaxTopicsPerDepartment}
                min={1}
                max={5}
              />
              <p className={cn("text-sm mt-2", isDark ? "text-gray-400" : "text-purple-600")}>
                <i className="fas fa-info-circle mr-1"></i>
                System will randomly select up to {maxTopicsPerDepartment} topic(s) from each department.
                {maxTopicsPerDepartment > 1 && " This means each station may cover multiple related topics from the same department."}
              </p>
            </div>
          </div>
          
          <div className="flex justify-between gap-4">
            <button
              onClick={() => setCurrentWizardStep(2)}
              className={cn("px-6 py-3 border-2 rounded-xl transition-all duration-300 flex items-center font-semibold",
                isDark ? "border-gray-700/50 hover:border-gray-500 hover:bg-gray-800/80 text-gray-300" : "border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700"
              )}
            >
              <i className="fas fa-arrow-left mr-3"></i>Back
            </button>
            <button
              onClick={() => {
                const availableDepts = osceDepartments.filter(dept => {
                  const deptCases = casesForCurrentSession.filter(c => c.departmentId === dept.id);
                  return deptCases.some(c => props.patients.some(p => p.caseId === c.id));
                });
                if (availableDepts.length === 0) {
                  toast.error('No departments with patients available. Please add patients first.');
                  return;
                }
                if (allowUserDepartmentChoice && userSelectedDepartmentCount > availableDepts.length) {
                  toast.warning(`Only ${availableDepts.length} departments available. Using available departments.`);
                }
                setCurrentWizardStep(4);
              }}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
            >
              Configure Session <i className="fas fa-arrow-right ml-3"></i>
            </button>
          </div>
        </div>
      </div>
      {/* BANNER SECTION */}
      <BannerCarousel isDark={isDark} />
    </div>
  );
}

      // For exam mode with 'allow_select' setting, show department badges
      // For exam mode with 'allow_select' setting, show department badges
// For exam mode with 'allow_select' setting
if (selectedMode === 'exam' && departmentSelectionMode === 'allow_select') {
  return (
    <div className="space-y-6">
      <div className={cn("rounded-2xl shadow-lg p-8 border backdrop-blur-sm",
        isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-gradient-to-br from-white/95 to-blue-50/95 border-blue-100/50"
      )}>
        <StepIndicator currentStep={3} steps={steps} />
        <div className="text-center mb-8">
          <h2 className={cn("text-3xl font-bold mb-4", isDark ? "text-gray-100" : "text-slate-800")}>
            Select Departments
          </h2>
          <p className={cn("text-lg", isDark ? "text-gray-400" : "text-slate-600")}>
            Choose the departments for your exam (system will randomly pick topics)
          </p>
        </div>
        <div className="flex flex-wrap gap-4 justify-center mb-12 pb-6 border-b border-gray-200 dark:border-gray-700">
          {osceDepartments.map((dept: Department) => {
            const hasPatients = casesForCurrentSession
              .filter(c => c.departmentId === dept.id)
              .some(c => props.patients.some(p => p.caseId === c.id));
            return (
              <button
                key={dept.id}
                onClick={() => handleDepartmentToggle(dept)}
                disabled={!hasPatients}
                className={cn(
                  "px-5 py-3 rounded-xl text-base font-medium transition-all duration-300",
                  selectedDepartments.some(d => d.id === dept.id)
                    ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md transform scale-105"
                    : hasPatients
                      ? isDark
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-cyan-100 text-cyan-800 hover:bg-cyan-200 border border-cyan-200 shadow-sm"
                      : "opacity-50 cursor-not-allowed bg-gray-400 text-gray-200"
                )}
              >
                {dept.name}
                {!hasPatients && <span className="ml-2 text-xs">(no patients)</span>}
              </button>
            );
          })}
        </div>
        {selectedDepartments.length > 0 && (
          <div className={cn("rounded-2xl p-6 border", 
            isDark ? "bg-blue-950/50 border-blue-600" : "bg-blue-50/80 border-blue-400"
          )}>
            <h3 className={cn("font-semibold text-lg mb-3", isDark ? "text-gray-200" : "text-slate-800")}>
              <i className="fas fa-check-circle text-blue-500 mr-2"></i>
              Selected Departments ({selectedDepartments.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedDepartments.map((dept) => (
                <span key={dept.id} className={cn("px-3 py-1.5 rounded-lg text-sm",
                  isDark ? "bg-blue-900/50 text-blue-300" : "bg-blue-100 text-blue-800"
                )}>
                  {dept.name}
                </span>
              ))}
            </div>
            
            {/* Max Topics Per Department - Always show for exam mode */}
            <div className={cn("mt-6 pt-6 border-t", isDark ? "border-gray-700" : "border-gray-200")}>
              <label className={cn("block text-lg font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
                <i className="fas fa-layer-group mr-3 text-purple-500"></i>
                Max Topics Per Department
              </label>
              <NumberSelector
                value={maxTopicsPerDepartment}
                onChange={setMaxTopicsPerDepartment}
                min={1}
                max={5}
              />
              <p className={cn("text-sm mt-2", isDark ? "text-gray-400" : "text-purple-600")}>
                <i className="fas fa-info-circle mr-1"></i>
                System will randomly select up to {maxTopicsPerDepartment} topic(s) from each department.
                {maxTopicsPerDepartment > 1 && " This means each station may cover multiple related topics from the same department."}
              </p>
            </div>
          </div>
        )}
        {osceDepartments.length === 0 && (
          <div className="text-center py-12">
            <i className="fas fa-exclamation-triangle text-4xl text-amber-500 mb-4"></i>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No departments available for {currentSessionType}.
            </p>
          </div>
        )}
        <div className="flex justify-between mt-12 gap-4">
          <button
            onClick={() => setCurrentWizardStep(2)}
            className={cn("px-6 py-3 border-2 rounded-xl transition-all duration-300 flex items-center font-semibold",
              isDark ? "border-gray-700/50 hover:border-gray-500 hover:bg-gray-800/80 text-gray-300" : "border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700"
            )}
          >
            <i className="fas fa-arrow-left mr-3"></i>Back
          </button>
          <button
            onClick={() => {
              if (selectedDepartments.length === 0) {
                toast.warning("Please select at least one department");
                return;
              }
              setCurrentWizardStep(4);
            }}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
          >
            Configure Session <i className="fas fa-arrow-right ml-3"></i>
          </button>
        </div>
      </div>
      {/* BANNER SECTION */}
      <BannerCarousel isDark={isDark} />
    </div>
  );
}

      // Practice mode - show departments and topics
      return (
  <div className="space-y-6">
    <div className={cn("rounded-2xl shadow-lg p-8 border backdrop-blur-sm",
      isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-gradient-to-br from-white/95 to-blue-50/95 border-blue-100/50"
    )}>
      <StepIndicator currentStep={3} steps={steps} />
      <div className="text-center mb-8">
        <h2 className={cn("text-3xl font-bold mb-4", isDark ? "text-gray-100" : "text-slate-800")}>
          Select Departments & Topics
        </h2>
        <p className={cn("text-lg", isDark ? "text-gray-400" : "text-slate-600")}>
          Choose up to {numStations} topics (one per station)
        </p>
      </div>
      <div className="flex flex-wrap gap-4 justify-center mb-12 pb-6 border-b border-gray-200 dark:border-gray-700">
        {osceDepartments.map((dept: Department) => (
          <DepartmentBadge
            key={dept.id}
            department={dept}
            selected={selectedDepartments.some(d => d.id === dept.id)}
            onToggle={() => handleDepartmentToggle(dept)}
          />
        ))}
      </div>
      {osceDepartments.length === 0 && (
        <div className="text-center py-12">
          <i className="fas fa-exclamation-triangle text-4xl text-amber-500 mb-4"></i>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No departments available for {currentSessionType}.
            Please create departments with {currentSessionType} type first.
          </p>
          <button
            onClick={() => props.switchSection(`create-${currentSessionType}-department`)}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:bg-blue-600"
          >
            Create {currentSessionType} Department
          </button>
        </div>
      )}
      {selectedDepartments.length > 0 ? (
        <div className="space-y-6">
          {selectedDepartments.map((dept: Department) => {
            const topics = casesByDepartment[dept.id] || [];
            const selectedTopicsForDept = selectedTopics
              .filter(t => t.departmentId === dept.id)
              .map(t => t.topicId);
            
            if (topics.length === 0) {
              return (
                <div key={dept.id} className={cn("rounded-2xl p-6 border", isDark ? "bg-gray-800/50 border-gray-700" : "bg-white/50 border-gray-200")}>
                  <h3 className={cn("text-xl font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
                    <i className="fas fa-folder-open mr-2 text-blue-500"></i>
                    {dept.name}
                  </h3>
                  <div className="text-center py-8 text-amber-500">
                    <i className="fas fa-exclamation-triangle mr-2"></i>
                    No {currentSessionType} cases available for this department yet.
                    <button
                      onClick={() => props.switchSection(`create-${currentSessionType}-case`)}
                      className="ml-3 px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                    >
                      Create Case
                    </button>
                  </div>
                </div>
              );
            }
            
            return (
              <div key={dept.id} className={cn("rounded-2xl p-6 border", isDark ? "bg-gray-800/50 border-gray-700" : "bg-white/50 border-gray-200")}>
                <h3 className={cn("text-xl font-semibold mb-4 flex items-center", isDark ? "text-gray-200" : "text-slate-800")}>
                  <i className="fas fa-folder-open mr-2 text-blue-500"></i>
                  {dept.name}
                  <span className="ml-3 text-sm font-normal">
                    ({selectedTopicsForDept.length} selected)
                  </span>
                </h3>
                <div className="flex flex-wrap gap-3">
                  {topics.map((topic: PatientCase) => {
                    const hasPatient = props.patients.some(p => p.caseId === topic.id);
                    return (
                      <button
                        key={topic.id}
                        onClick={() => hasPatient && handleTopicToggle(dept.id, topic.id)}
                        disabled={!hasPatient}
                        className={cn(
                          "px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-1",
                          selectedTopicsForDept.includes(topic.id)
                            ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md transform scale-105"
                            : hasPatient
                              ? isDark
                                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                : "bg-teal-100 text-teal-800 hover:bg-teal-200 border border-teal-200 shadow-sm"
                              : "opacity-50 cursor-not-allowed bg-gray-400 text-gray-200"
                        )}
                      >
                        <i className={`fas ${selectedTopicsForDept.includes(topic.id) ? 'fa-check-circle' : 'fa-circle'} text-xs`}></i>
                        {topic.title}
                        {!hasPatient && <span className="ml-1 text-xs">(no patient)</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          
          {selectedTopics.length > 0 && (
            <div className={cn("rounded-2xl p-6 border-2", 
              isDark ? "bg-green-950/50 border-green-600" : "bg-green-50/80 border-green-400"
            )}>
              <h3 className={cn("font-semibold text-lg mb-3", isDark ? "text-gray-200" : "text-slate-800")}>
                <i className="fas fa-check-circle text-green-500 mr-2"></i>
                Selected Topics ({selectedTopics.length}/{numStations})
              </h3>
              <div className="flex flex-wrap gap-2">
                {selectedTopics.map((topic, idx) => {
                  const dept = selectedDepartments.find(d => d.id === topic.departmentId);
                  const topicData = casesByDepartment[topic.departmentId]?.find(c => c.id === topic.topicId);
                  return (
                    <span key={idx} className={cn("px-3 py-1.5 rounded-lg text-sm",
                      isDark ? "bg-green-900/50 text-green-300" : "bg-green-100 text-green-800"
                    )}>
                      {dept?.name}: {topicData?.title || topic.topicId}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : osceDepartments.length > 0 ? (
        <div className="text-center py-12 text-gray-500">
          <i className="fas fa-info-circle text-4xl mb-4"></i>
          <p>Click department badges above to begin selecting topics</p>
        </div>
      ) : null}
      <div className="flex justify-between mt-12 gap-4">
        <button
          onClick={() => setCurrentWizardStep(2)}
          className={cn("px-6 py-3 border-2 rounded-xl transition-all duration-300 flex items-center font-semibold",
            isDark ? "border-gray-700/50 hover:border-gray-500 hover:bg-gray-800/80 text-gray-300" : "border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700"
          )}
        >
          <i className="fas fa-arrow-left mr-3"></i>Back
        </button>
        <button
          onClick={() => {
            if (selectedDepartments.length === 0) {
              toast.warning("Please select at least one department");
              return;
            }
            if (selectedTopics.length !== numStations) {
              toast.warning(`Please select exactly ${numStations} topic${numStations > 1 ? 's' : ''} (one per station)`);
              return;
            }
            // Check if all selected topics have patients
            const missingPatients = selectedTopics.some(topic => {
              return !props.patients.some(p => p.caseId === topic.topicId);
            });
            if (missingPatients) {
              toast.error("Some selected topics have no patients. Please add patients first.");
              return;
            }
            setCurrentWizardStep(4);
          }}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
        >
          Configure Session <i className="fas fa-arrow-right ml-3"></i>
        </button>
      </div>
    </div>
    {/* BANNER SECTION */}
    <BannerCarousel isDark={isDark} />
  </div>
);
    }

    if (currentWizardStep === 4) {
      const totalMinutes = numStations * timePerStation;
      return (
        <div className={cn("rounded-2xl shadow-lg p-8 border backdrop-blur-sm",
          isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-gradient-to-br from-white/95 to-blue-50/95 border-blue-100/50"
        )}>
          <StepIndicator currentStep={4} steps={steps} />
          <div className="text-center mb-8">
            <h2 className={cn("text-3xl font-bold mb-4", isDark ? "text-gray-100" : "text-slate-800")}>
              Configure Session
            </h2>
            <p className={cn("text-lg", isDark ? "text-gray-400" : "text-slate-600")}>
              Set how long each station runs and your session preferences
            </p>
          </div>
          <div className="max-w-2xl mx-auto space-y-8">
            <div className={cn("rounded-2xl p-6 border", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
              <h3 className={cn("text-xl font-semibold mb-4", isDark ? "text-gray-200" : "text-slate-800")}>
                TIME PER STATION - {timePerStation} min
              </h3>
              <NumberSelector
                value={timePerStation}
                onChange={setTimePerStation}
                min={1}
                max={7}
              />
            </div>
            <div className={cn("rounded-2xl p-6 border", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
              <h3 className={cn("text-xl font-semibold mb-4", isDark ? "text-gray-200" : "text-slate-800")}>
                SESSION OPTIONS
              </h3>
              <div className="space-y-4">
  {/* Hint Toggle */}
  <div className="flex items-center justify-between py-4">
    <div>
      <p className={cn("font-medium", isDark ? "text-gray-200" : "text-slate-800")}>
        <i className="fas fa-lightbulb mr-2 text-amber-500"></i>
        Real-time Hints
      </p>
      <p className={cn("text-sm mt-1", isDark ? "text-gray-400" : "text-slate-500")}>
        Get automatic feedback during practice (green = good, yellow = warning, red = mistake)
      </p>
    </div>
    <button
      onClick={() => {
        if (!hintsEnabled && aiTutorEnabled) {
          toast.warning("Please turn off AI Tutor first before enabling Hints", { duration: 3000 });
        } else {
          setHintsEnabled(!hintsEnabled);
        }
      }}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        hintsEnabled ? "bg-blue-600" : isDark ? "bg-gray-600" : "bg-slate-300"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300",
          hintsEnabled ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  </div>

  {/* AI Tutor Toggle */}
  <div className="flex items-center justify-between py-4 border-t border-gray-200 dark:border-gray-700">
    <div>
      <p className={cn("font-medium", isDark ? "text-gray-200" : "text-slate-800")}>
        <i className="fas fa-chalkboard-teacher mr-2 text-emerald-500"></i>
        AI Tutor
      </p>
      <p className={cn("text-sm mt-1", isDark ? "text-gray-400" : "text-slate-500")}>
        Voice-based AI tutor to guide you through the consultation
      </p>
      {hintsEnabled && (
        <p className={cn("text-xs mt-1 flex items-center text-amber-500", isDark ? "text-amber-400" : "text-amber-600")}>
          <i className="fas fa-info-circle mr-1"></i>
          Hint must be off to use AI Tutor
        </p>
      )}
    </div>
    <button
      onClick={() => {
        if (!aiTutorEnabled && hintsEnabled) {
          toast.warning("Please turn off Hints first before enabling AI Tutor", { duration: 3000 });
        } else {
          setAiTutorEnabled(!aiTutorEnabled);
        }
      }}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2",
        aiTutorEnabled ? "bg-emerald-600" : isDark ? "bg-gray-600" : "bg-slate-300"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300",
          aiTutorEnabled ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  </div>

  <ToggleSwitch
    enabled={feedbackEnabled}
    onChange={setFeedbackEnabled}
    label="Post-station feedback"
    description="Receive AI marking and improvement notes after each station"
  />
  
  <ToggleSwitch
    enabled={readingBreakEnabled}
    onChange={setReadingBreakEnabled}
    label="Reading time between stations"
    description="2 mins interstation break to read the next case before it begins"
  />
</div>
            </div>
            <div className={cn("rounded-2xl p-6 border bg-gradient-to-r",
              isDark ? "from-blue-950/50 to-indigo-950/50 border-blue-800/50" : "from-blue-50/80 to-indigo-50/80 border-blue-200/50"
            )}>
              <h3 className={cn("text-xl font-semibold mb-4", isDark ? "text-gray-200" : "text-slate-800")}>
                Session Summary
              </h3>
              <div className="flex justify-between items-center py-2">
                <span className={isDark ? "text-gray-400" : "text-slate-600"}>Total Duration:</span>
                <span className={cn("font-bold text-lg", isDark ? "text-gray-200" : "text-slate-800")}>{totalMinutes} minutes</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className={isDark ? "text-gray-400" : "text-slate-600"}>Number of Stations:</span>
                <span className={cn("font-bold text-lg", isDark ? "text-gray-200" : "text-slate-800")}>{numStations}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className={isDark ? "text-gray-400" : "text-slate-600"}>Estimated Tokens:</span>
                <span className={cn("font-bold text-lg", isDark ? "text-gray-200" : "text-slate-800")}>{estimatedTokens}</span>
              </div>
            </div>
            <div className="flex justify-between gap-4">
              <button
                onClick={() => setCurrentWizardStep(3)}
                className={cn("px-6 py-3 border-2 rounded-xl transition-all duration-300 flex items-center font-semibold",
                  isDark ? "border-gray-700/50 hover:border-gray-500 hover:bg-gray-800/80 text-gray-300" : "border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700"
                )}
              >
                <i className="fas fa-arrow-left mr-3"></i>Back
              </button>
              <button
                onClick={handleConfigNext}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
              >
                Review <i className="fas fa-arrow-right ml-3"></i>
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (currentWizardStep === 5) {
      const totalMinutes = numStations * timePerStation;
      const filteredCases = props.getFilteredCases();
      const casesByDepartment: Record<string, PatientCase[]> = {};
      const currentSessionType = props.currentSessionType || 'clerking';
      filteredCases
        .filter((c: PatientCase) => c.sessionType === currentSessionType)
        .forEach((c: PatientCase) => {
          if (!casesByDepartment[c.departmentId]) {
            casesByDepartment[c.departmentId] = [];
          }
          casesByDepartment[c.departmentId].push(c);
        });
      return (
        <div className={cn("rounded-2xl shadow-lg p-8 border backdrop-blur-sm",
          isDark ? "bg-gray-800/95 border-gray-700/50" : "bg-gradient-to-br from-white/95 to-blue-50/95 border-blue-100/50"
        )}>
          <StepIndicator currentStep={5} steps={steps} />
          <div className="text-center mb-8">
            <h2 className={cn("text-3xl font-bold mb-4", isDark ? "text-gray-100" : "text-slate-800")}>
              Review & Launch
            </h2>
            <p className={cn("text-lg", isDark ? "text-gray-400" : "text-slate-600")}>
              Confirm your session details before starting
            </p>
          </div>
          <div className="max-w-2xl mx-auto space-y-6">
            <div className={cn("rounded-2xl p-6 border", isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/80 border-blue-100/50")}>
              <div className="flex justify-between items-center">
                <div>
                  <p className={cn("text-sm", isDark ? "text-gray-400" : "text-slate-500")}>Total Duration</p>
                  <p className={cn("text-2xl font-bold", isDark ? "text-gray-200" : "text-slate-800")}>{totalMinutes} minutes</p>
                </div>
                <div>
                  <p className={cn("text-sm", isDark ? "text-gray-400" : "text-slate-500")}>Stations</p>
                  <p className={cn("text-2xl font-bold", isDark ? "text-gray-200" : "text-slate-800")}>{numStations}</p>
                </div>
                <div>
                  <p className={cn("text-sm", isDark ? "text-gray-400" : "text-slate-500")}>Est. Tokens</p>
                  <p className={cn("text-2xl font-bold", isDark ? "text-gray-200" : "text-slate-800")}>{estimatedTokens}</p>
                </div>
              </div>
            </div>
            <div className={cn("rounded-2xl p-6 border cursor-pointer hover:shadow-lg transition-all",
              isDark ? "bg-gray-800/80 border-gray-700/50 hover:border-blue-600" : "bg-white/80 border-blue-100/50 hover:border-blue-300"
            )}
            onClick={() => setCurrentWizardStep(3)}>
              <div className="flex justify-between items-start mb-4">
                <h3 className={cn("font-semibold text-lg", isDark ? "text-gray-200" : "text-slate-800")}>
                  {selectedMode === 'exam' ? 'Departments' : 'Topics'}
                </h3>
                <i className="fas fa-pen text-blue-500 text-sm"></i>
              </div>
              <div className="space-y-4">
                {props.currentSection === 'physical_exam' ? (
                  <div>
                    <p className={cn("font-medium mb-2", isDark ? "text-gray-300" : "text-gray-700")}>Physical Exam Topics:</p>
                    <div className="flex flex-wrap gap-2">
                      {physicalExamSelectedTopics.map((id) => {
                        const topic = filteredCases.find((c: PatientCase) => c.id === id);
                        return topic ? (
                          <span key={id} className={cn("px-2 py-1 rounded-lg text-xs",
                            isDark ? "bg-blue-900/50 text-blue-300" : "bg-blue-100 text-blue-700"
                          )}>
                            {topic.title}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                ) : selectedMode === 'exam' ? (
                  departmentSelectionMode === 'choose_number' ? (
                    <div>
                      <p className={cn("font-medium mb-2", isDark ? "text-gray-300" : "text-gray-700")}>Department Selection:</p>
                      <p className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-600")}>
                        {allowUserDepartmentChoice 
                          ? `User will select ${userSelectedDepartmentCount} department(s)`
                          : `System will randomly select ${selectedDepartmentCount} department(s)`}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className={cn("font-medium mb-2", isDark ? "text-gray-300" : "text-gray-700")}>Selected Departments:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedDepartments.map((dept) => (
                          <span key={dept.id} className={cn("px-2 py-1 rounded-lg text-sm",
                            isDark ? "bg-blue-900/50 text-blue-300" : "bg-blue-100 text-blue-700"
                          )}>
                            {dept.name}
                          </span>
                        ))}
                      </div>
                      <p className={cn("text-sm mt-3", isDark ? "text-gray-400" : "text-gray-600")}>
                        <i className="fas fa-random mr-1"></i>
                        Topics will be randomly selected (up to {maxTopicsPerDepartment} per department)
                      </p>
                    </div>
                  )
                ) : (
                  <div>
                    <p className={cn("font-medium mb-2", isDark ? "text-gray-300" : "text-gray-700")}>Selected Topics ({selectedTopics.length}/{numStations}):</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTopics.map((topic, idx) => {
                        const dept = selectedDepartments.find(d => d.id === topic.departmentId);
                        const topicData = casesByDepartment[topic.departmentId]?.find(c => c.id === topic.topicId);
                        return (
                          <span key={idx} className={cn("px-2 py-1 rounded-lg text-sm",
                            isDark ? "bg-blue-900/50 text-blue-300" : "bg-blue-100 text-blue-700"
                          )}>
                            {dept?.name}: {topicData?.title || topic.topicId}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className={cn("rounded-2xl p-6 border cursor-pointer hover:shadow-lg transition-all",
  isDark ? "bg-gray-800/80 border-gray-700/50 hover:border-blue-600" : "bg-white/80 border-blue-100/50 hover:border-blue-300"
)}
onClick={() => setCurrentWizardStep(4)}>
  <div className="flex justify-between items-start mb-4">
    <h3 className={cn("font-semibold text-lg", isDark ? "text-gray-200" : "text-slate-800")}>Session Options</h3>
    <i className="fas fa-pen text-blue-500 text-sm"></i>
  </div>
  <div className="space-y-4">
    {/* Hint Toggle Section - Only show if hints are enabled OR if AI Tutor is on (to show which is active) */}
    {(hintsEnabled || aiTutorEnabled) && (
      <div className="flex items-center justify-between p-4 rounded-xl border">
        <div>
          <div className="flex items-center gap-2">
            <i className={`fas ${hintsEnabled ? 'fa-lightbulb text-yellow-500' : 'fa-chalkboard-teacher text-emerald-500'}`}></i>
            <span className={cn("font-semibold", isDark ? "text-gray-200" : "text-slate-700")}>
              {hintsEnabled ? 'Real-time Hints' : 'AI Tutor'}
            </span>
          </div>
          <p className={cn("text-sm mt-1", isDark ? "text-gray-400" : "text-slate-500")}>
            {hintsEnabled 
              ? 'Get automatic feedback during practice' 
              : aiTutorEnabled 
                ? 'Voice-based AI tutor to guide you through the consultation'
                : 'No active learning assistant'}
          </p>
          {hintsEnabled && (
            <p className={cn("text-xs mt-0.5", isDark ? "text-gray-500" : "text-slate-400")}>
              Green = Good, Yellow = Warning, Red = Mistake
            </p>
          )}
        </div>
        <div className={cn(
          "px-3 py-1 rounded-full text-sm font-medium",
          hintsEnabled 
            ? (isDark ? "bg-amber-900/50 text-amber-300" : "bg-amber-100 text-amber-700")
            : aiTutorEnabled
              ? (isDark ? "bg-emerald-900/50 text-emerald-300" : "bg-emerald-100 text-emerald-700")
              : (isDark ? "bg-gray-700 text-gray-400" : "bg-gray-200 text-gray-500")
        )}>
          {hintsEnabled ? 'ON' : aiTutorEnabled ? 'ON' : 'OFF'}
        </div>
      </div>
    )}

    {/* Existing status indicators */}
    <div className="grid grid-cols-2 gap-4 pt-2">
      <div className="flex items-center gap-2">
        <i className={`fas fa-${feedbackEnabled ? 'check-circle text-green-500' : 'times-circle text-red-500'}`}></i>
        <span className={isDark ? "text-gray-400" : "text-slate-600"}>Feedback: {feedbackEnabled ? 'On' : 'Off'}</span>
      </div>
      <div className="flex items-center gap-2">
        <i className={`fas fa-${readingBreakEnabled ? 'check-circle text-green-500' : 'times-circle text-red-500'}`}></i>
        <span className={isDark ? "text-gray-400" : "text-slate-600"}>Reading Breaks: {readingBreakEnabled ? 'On' : 'Off'}</span>
      </div>
      <div className="flex items-center gap-2">
        <i className="fas fa-tag text-blue-500"></i>
        <span className={isDark ? "text-gray-400" : "text-slate-600"}>Mode: {selectedMode === 'practice' ? 'Practice' : 'Exam'}</span>
      </div>
    </div>
  </div>
</div>
            <div className={cn("rounded-2xl p-6 border-2 text-center cursor-pointer transition-all hover:scale-105",
              isDark ? "bg-green-950/50 border-green-600 hover:bg-green-900/50" : "bg-green-50/80 border-green-400 hover:bg-green-100/80"
            )}
            onClick={handleLaunch}>
              <i className="fas fa-rocket text-3xl text-green-500 mb-3"></i>
              <h3 className={cn("text-xl font-bold", isDark ? "text-gray-200" : "text-slate-800")}>Ready to Launch</h3>
              <p className={cn("text-sm mt-2", isDark ? "text-gray-400" : "text-slate-600")}>Click to start your session</p>
            </div>
            <div className="flex justify-between gap-4">
              <button
                onClick={() => setCurrentWizardStep(4)}
                className={cn("px-6 py-3 border-2 rounded-xl transition-all duration-300 flex items-center font-semibold",
                  isDark ? "border-gray-700/50 hover:border-gray-500 hover:bg-gray-800/80 text-gray-300" : "border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700"
                )}
              >
                <i className="fas fa-arrow-left mr-3"></i>Back
              </button>
              <button
                onClick={handleLaunch}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 flex items-center font-semibold shadow-lg hover:shadow-xl"
              >
                Launch Session <i className="fas fa-arrow-right ml-3"></i>
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return null;
};

// First, add this new component after the ModeCard component and before OsceSection

// ====================== BANNER CAROUSEL COMPONENT ======================
// ====================== BANNER CAROUSEL COMPONENT ======================
const BannerCarousel = ({ isDark }: { isDark: boolean }) => {
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [banners, setBanners] = useState<string[]>([]);
  
  // List of available banner placeholder images (using public folder)
  const imagePaths = [
    '/acebanner1.png',
    '/acebanner2.png',
    '/acebanner3.png',
    '/acebanner4.png',
    '/acebanner5.png',
    '/acebanner6.png',
  ];
  
  // Placeholder data for when images don't exist
  const placeholderBanners = [
    { color: 'from-blue-500 to-cyan-500', text: 'ACE MEDIX', icon: 'fa-stethoscope', desc: 'Excellence in Medical Education' },
    { color: 'from-emerald-500 to-teal-500', text: 'CLINICAL EXCELLENCE', icon: 'fa-heartbeat', desc: 'Master Your Clinical Skills' },
    { color: 'from-purple-500 to-pink-500', text: 'OSCE READY', icon: 'fa-graduation-cap', desc: 'Pass Your Exams With Confidence' },
    { color: 'from-orange-500 to-red-500', text: 'AI-POWERED', icon: 'fa-robot', desc: 'Intelligent Learning Assistant' },
    { color: 'from-indigo-500 to-violet-500', text: 'PRACTICE MODE', icon: 'fa-book-open', desc: 'Learn at Your Own Pace' },
    { color: 'from-rose-500 to-amber-500', text: 'EXAM MODE', icon: 'fa-clock', desc: 'Real OSCE Simulation' },
  ];

  useEffect(() => {
    // Randomly select 3 unique banners for this screen
    const shuffled = [...imagePaths];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setBanners(shuffled.slice(0, 3));
  }, []);

  useEffect(() => {
    // Auto-slide every 4 seconds
    if (banners.length === 0) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const handleDotClick = (index: number) => {
    setCurrentBannerIndex(index);
  };

  if (banners.length === 0) return null;

  const currentImage = banners[currentBannerIndex];
  const currentPlaceholder = placeholderBanners[currentBannerIndex % placeholderBanners.length];

  return (
    <div className="mt-6 sm:mt-8 w-full max-w-5xl mx-auto">
      <div className="relative overflow-hidden rounded-2xl shadow-xl group">
        {/* Main Banner Container */}
        <div className="relative h-28 xs:h-32 sm:h-36 md:h-44 lg:h-52 cursor-pointer transition-all duration-500 hover:scale-[1.02]">
          {/* Try to load image, fallback to gradient */}
          <img
            src={currentImage}
            alt={`AceMedix Banner ${currentBannerIndex + 1}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              // If image doesn't exist, hide img and show gradient
              (e.target as HTMLImageElement).style.display = 'none';
              const parent = (e.target as HTMLImageElement).parentElement;
              if (parent) {
                parent.classList.add('gradient-fallback');
              }
            }}
          />
          
          {/* Gradient Fallback */}
          <div className={`absolute inset-0 bg-gradient-to-r ${currentPlaceholder.color} hidden img-fallback`}>
            <div className="w-full h-full flex items-center justify-between px-3 xs:px-4 sm:px-6 md:px-12">
              <div className="flex items-center space-x-2 xs:space-x-3 sm:space-x-4">
                <div className="bg-white/20 backdrop-blur-sm p-1.5 xs:p-2 sm:p-3 rounded-xl sm:rounded-2xl">
                  <i className={`fas ${currentPlaceholder.icon} text-xl xs:text-2xl sm:text-3xl md:text-4xl text-white`}></i>
                </div>
                <div>
                  <h3 className="text-sm xs:text-base sm:text-xl md:text-2xl font-bold text-white tracking-tight">
                    {currentPlaceholder.text}
                  </h3>
                  <p className="text-white/80 text-xs sm:text-sm md:text-base mt-0.5 sm:mt-1 hidden sm:block">
                    {currentPlaceholder.desc}
                  </p>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                  <span className="text-white font-semibold text-sm">Learn More →</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Arrows - Hide on mobile, show on tablet+ */}
        <button
          onClick={() => setCurrentBannerIndex((prev) => (prev - 1 + banners.length) % banners.length)}
          className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full w-7 h-7 md:w-8 md:h-8 items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
        >
          <i className="fas fa-chevron-left text-xs md:text-sm"></i>
        </button>
        <button
          onClick={() => setCurrentBannerIndex((prev) => (prev + 1) % banners.length)}
          className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full w-7 h-7 md:w-8 md:h-8 items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
        >
          <i className="fas fa-chevron-right text-xs md:text-sm"></i>
        </button>
      </div>

      {/* Dots - Hidden on mobile, visible on tablet+ */}
      <div className="hidden sm:flex justify-center gap-2 sm:gap-2.5 mt-3 sm:mt-4">
        {banners.map((_, idx) => (
          <button
            key={idx}
            onClick={() => handleDotClick(idx)}
            className={cn(
              "transition-all duration-300 rounded-full",
              // Desktop pill style
              "h-1.5",
              currentBannerIndex === idx
                ? "w-6 bg-blue-500 shadow-md"
                : "w-1.5 bg-gray-400/60 hover:bg-gray-500/80"
            )}
          />
        ))}
      </div>

      {/* Mobile swipe hint - only visible on mobile */}
      <div className="flex sm:hidden justify-center mt-2">
        <span className={cn("text-[10px] flex items-center gap-1", isDark ? "text-gray-500" : "text-gray-400")}>
          <i className="fas fa-hand-peace text-xs"></i>
          Swipe to see more
        </span>
      </div>

      {/* Banner Stats - Visible on ALL screens */}
      <div className="flex justify-center items-center gap-2 xs:gap-3 sm:gap-4 md:gap-6 mt-2 sm:mt-3">
        <span className={cn("flex items-center gap-1 text-[10px] xs:text-xs", isDark ? "text-gray-400" : "text-gray-500")}>
          <i className="fas fa-chart-line text-green-500 text-[10px] xs:text-xs"></i>
          <span>1,000+ Students</span>
        </span>
        <span className={cn("flex items-center gap-1 text-[10px] xs:text-xs", isDark ? "text-gray-400" : "text-gray-500")}>
          <i className="fas fa-trophy text-yellow-500 text-[10px] xs:text-xs"></i>
          <span>95% Pass Rate</span>
        </span>
        <span className={cn("flex items-center gap-1 text-[10px] xs:text-xs", isDark ? "text-gray-400" : "text-gray-500")}>
          <i className="fas fa-users text-blue-500 text-[10px] xs:text-xs"></i>
          <span>50+ Clinical Cases</span>
        </span>
      </div>

      <style jsx>{`
        .gradient-fallback .img-fallback {
          display: flex;
        }
        .img-fallback {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default OsceSection;