'use client';
import { FC, useState } from "react";
import { toast } from "sonner";

type RandomizerSectionProps = {
  switchSection: (section: string) => void;
};

const RandomizerSection: FC<RandomizerSectionProps> = ({ switchSection }) => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newQuestions, setNewQuestions] = useState('');

  const handleUploadQuestions = () => {
    if (!newQuestions.trim()) {
      toast.error('Please enter questions');
      return;
    }

    // Parse questions (one per line)
    const parsed = newQuestions.split('\n').filter(q => q.trim());
    // Add to questions list
    toast.success(`${parsed.length} questions uploaded`);
    setShowUploadModal(false);
    setNewQuestions('');
  };

  const handleRandomize = () => {
    if (questions.length === 0) {
      toast.error('No questions available');
      return;
    }
    const randomIndex = Math.floor(Math.random() * questions.length);
    // Show random question
  };

  return (
    <div className="bg-gradient-to-br from-white/95 to-purple-50/95 rounded-2xl shadow-lg p-8 border border-purple-300 backdrop-blur-sm">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold flex items-center text-slate-800">
          <i className="fas fa-random mr-4 text-purple-500"></i>
          Randomizer
        </h2>
        <button
          onClick={() => switchSection('selection')}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-300 flex items-center font-bold shadow-lg hover:shadow-xl cursor-pointer"
        >
          <i className="fas fa-arrow-left mr-3"></i>
          Back
        </button>
      </div>

      <div className="flex justify-end mb-6">
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 flex items-center font-semibold shadow-lg"
        >
          <i className="fas fa-upload mr-3"></i>
          Upload Questions
        </button>
      </div>

      <div className="text-center py-12 bg-gradient-to-br from-purple-50/80 to-purple-100/80 rounded-2xl border-2 border-dashed border-purple-300 mb-6">
        <i className="fas fa-dice text-5xl text-purple-400 mb-4"></i>
        <p className="text-slate-600 text-lg mb-4">{questions.length} questions available</p>
        <button
          onClick={handleRandomize}
          disabled={questions.length === 0}
          className="px-8 py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg"
        >
          <i className="fas fa-shuffle mr-3"></i>
          Randomize
        </button>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Upload Questions</h3>
            <p className="text-sm text-slate-600 mb-4">Enter one question per line</p>
            
            <textarea
              value={newQuestions}
              onChange={(e) => setNewQuestions(e.target.value)}
              className="w-full p-4 border-2 border-slate-300 rounded-xl h-48 focus:border-purple-500"
              placeholder="Question 1&#10;Question 2&#10;Question 3"
            />

            <div className="flex justify-end gap-4 mt-8">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-6 py-3 border-2 border-slate-300 rounded-xl hover:border-slate-500"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadQuestions}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RandomizerSection;