'use client';
import { FC, useState } from "react";
import { toast } from "sonner";
import type { Session } from "next-auth";

type LectureNotesSectionProps = {
  switchSection: (section: string) => void;
  session: Session | null;
};

const LectureNotesSection: FC<LectureNotesSectionProps> = ({
  switchSection,
  session
}) => {
  const [notes, setNotes] = useState<any[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '', file: null as File | null });

  const handleUpload = async () => {
    if (!newNote.title || (!newNote.content && !newNote.file)) {
      toast.error('Please provide title and content or file');
      return;
    }

    try {
      // Handle file upload logic here
      toast.success('Lecture note uploaded successfully');
      setShowUploadModal(false);
      setNewNote({ title: '', content: '', file: null });
    } catch (error) {
      toast.error('Failed to upload lecture note');
    }
  };

  return (
    <div className="bg-gradient-to-br from-white/95 to-blue-50/95 rounded-2xl shadow-lg p-8 border border-blue-300 backdrop-blur-sm">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold flex items-center text-slate-800">
          <i className="fas fa-book mr-4 text-blue-500"></i>
          Lecture Notes
        </h2>
        <button
          onClick={() => switchSection('selection')}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center font-bold shadow-lg hover:shadow-xl cursor-pointer"
        >
          <i className="fas fa-arrow-left mr-3"></i>
          Back
        </button>
      </div>

      <div className="mb-6 flex justify-end">
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 flex items-center font-semibold shadow-lg"
        >
          <i className="fas fa-upload mr-3"></i>
          Upload Notes
        </button>
      </div>

      {/* Notes List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {notes.length > 0 ? (
          notes.map((note, index) => (
            <div key={index} className="bg-white/80 rounded-xl p-6 border border-blue-200 hover:shadow-lg transition-all">
              <h3 className="font-bold text-lg text-slate-800 mb-2">{note.title}</h3>
              <p className="text-slate-600 text-sm line-clamp-3">{note.content}</p>
              <div className="mt-4 flex justify-end">
                <button className="text-blue-600 hover:text-blue-800 text-sm font-semibold">
                  <i className="fas fa-download mr-2"></i>Download
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 bg-gradient-to-br from-slate-50/80 to-blue-50/80 rounded-2xl border-2 border-dashed border-slate-400">
            <i className="fas fa-book-open text-5xl text-slate-400 mb-4"></i>
            <p className="text-slate-500 text-lg">No lecture notes yet. Upload your first note!</p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Upload Lecture Notes</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Title</label>
                <input
                  type="text"
                  value={newNote.title}
                  onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                  className="w-full p-3 border-2 border-slate-300 rounded-xl focus:border-blue-500"
                  placeholder="Enter title"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Content</label>
                <textarea
                  value={newNote.content}
                  onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                  className="w-full p-3 border-2 border-slate-300 rounded-xl focus:border-blue-500 h-32"
                  placeholder="Enter notes or upload a file"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Or Upload File</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => setNewNote({ ...newNote, file: e.target.files?.[0] || null })}
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
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700"
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

export default LectureNotesSection;