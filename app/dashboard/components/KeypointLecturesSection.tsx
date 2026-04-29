'use client';
import { FC, useState } from "react";
import { toast } from "sonner";

type KeypointLecturesSectionProps = {
  switchSection: (section: string) => void;
};

const KeypointLecturesSection: FC<KeypointLecturesSectionProps> = ({ switchSection }) => {
  const [lectures, setLectures] = useState<any[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newLecture, setNewLecture] = useState({ title: '', keypoints: '', file: null as File | null });

  const handleUpload = () => {
    if (!newLecture.title || !newLecture.keypoints) {
      toast.error('Please provide title and keypoints');
      return;
    }
    toast.success('Lecture added successfully');
    setShowUploadModal(false);
    setNewLecture({ title: '', keypoints: '', file: null });
  };

  return (
    <div className="bg-gradient-to-br from-white/95 to-indigo-50/95 rounded-2xl shadow-lg p-8 border border-indigo-300 backdrop-blur-sm">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold flex items-center text-slate-800">
          <i className="fas fa-graduation-cap mr-4 text-indigo-500"></i>
          Keypoint Lectures
        </h2>
        <button
          onClick={() => switchSection('selection')}
          className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl hover:from-indigo-600 hover:to-indigo-700 transition-all duration-300 flex items-center font-bold shadow-lg hover:shadow-xl cursor-pointer"
        >
          <i className="fas fa-arrow-left mr-3"></i>
          Back
        </button>
      </div>

      <div className="mb-6 flex justify-end">
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 flex items-center font-semibold shadow-lg"
        >
          <i className="fas fa-plus-circle mr-3"></i>
          Add Lecture
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {lectures.map((lecture, index) => (
          <div key={index} className="bg-white/80 rounded-xl p-6 border border-indigo-200 hover:shadow-lg transition-all">
            <h3 className="font-bold text-lg text-slate-800 mb-4">{lecture.title}</h3>
            <p className="text-slate-600 whitespace-pre-line">{lecture.keypoints}</p>
            {lecture.file && (
              <button className="mt-4 text-indigo-600 hover:text-indigo-800">
                <i className="fas fa-download mr-2"></i>Download
              </button>
            )}
          </div>
        ))}
        {lectures.length === 0 && (
          <div className="text-center py-12 bg-gradient-to-br from-indigo-50/80 to-indigo-100/80 rounded-2xl border-2 border-dashed border-indigo-300">
            <i className="fas fa-chalkboard-teacher text-5xl text-indigo-400 mb-4"></i>
            <p className="text-slate-500 text-lg">No lectures yet. Add your first lecture!</p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Add Keypoint Lecture</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Title</label>
                <input
                  type="text"
                  value={newLecture.title}
                  onChange={(e) => setNewLecture({ ...newLecture, title: e.target.value })}
                  className="w-full p-3 border-2 border-slate-300 rounded-xl focus:border-indigo-500"
                  placeholder="e.g., Heart Failure Management"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Key Points</label>
                <textarea
                  value={newLecture.keypoints}
                  onChange={(e) => setNewLecture({ ...newLecture, keypoints: e.target.value })}
                  className="w-full p-3 border-2 border-slate-300 rounded-xl focus:border-indigo-500 h-32"
                  placeholder="• Point 1&#10;• Point 2&#10;• Point 3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Attachment (Optional)</label>
                <input
                  type="file"
                  onChange={(e) => setNewLecture({ ...newLecture, file: e.target.files?.[0] || null })}
                  className="w-full p-3 border-2 border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-8">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-6 py-3 border-2 border-slate-300 rounded-xl hover:border-slate-500"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl hover:from-indigo-600 hover:to-indigo-700"
              >
                Add Lecture
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KeypointLecturesSection;