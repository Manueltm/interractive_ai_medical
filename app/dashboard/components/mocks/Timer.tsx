// app/dashboard/components/mocks/Timer.tsx
'use client';
import { FC } from "react";

interface TimerProps {
  timeLeft: number;
  formatTime: (seconds: number) => string;
  onPause: () => void;
  onSubmit: () => void;
}

const Timer: FC<TimerProps> = ({ timeLeft, formatTime, onPause, onSubmit }) => {
  const getTimerColor = () => {
    if (timeLeft < 60) return 'text-red-600';
    if (timeLeft < 300) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="text-center">
      <div className="text-sm text-slate-600 mb-2">Time Remaining</div>
      <div className={`text-4xl font-mono font-bold ${getTimerColor()}`}>
        {formatTime(timeLeft)}
      </div>
      
      <div className="mt-6 space-y-3">
        <button
          onClick={onPause}
          className="w-full px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 flex items-center justify-center gap-2"
        >
          <i className="fas fa-pause"></i>
          Pause Exam
        </button>
        
        <button
          onClick={onSubmit}
          className="w-full px-4 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg hover:from-rose-600 hover:to-pink-700 flex items-center justify-center gap-2"
        >
          <i className="fas fa-check-circle"></i>
          Submit Exam
        </button>
      </div>
    </div>
  );
};

export default Timer;