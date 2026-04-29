// app/dashboard/components/admin/AdminUploadModal.tsx
'use client';
import { FC, useState } from "react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { cn } from "@/utils";

interface AdminUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (data: any[]) => Promise<void>;
  title: string;
  uploadType: 'clincher' | 'mini-mock-cbt' | 'mini-mock-osce' | 'main-mock-cbt' | 'main-mock-osce' | 'qblock' | 'qtopic' | 'quiz' | 'games';
}

const AdminUploadModal: FC<AdminUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  title,
  uploadType
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ count: number; errors?: string[] } | null>(null);

  const handleFileUpload = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', uploadType);

    try {
      const response = await fetch('/api/admin/upload-content', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }
      
      setUploadResult({
        count: result.count || 0,
        errors: result.errors
      });
      
      toast.success(result.message || `Uploaded ${result.count} items`);
      
      await onUpload([]);
      
      setTimeout(() => {
        onClose();
        setFile(null);
        setUploadResult(null);
      }, 2000);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className={cn("rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto",
        isDark ? "bg-gray-800" : "bg-white"
      )}>
        <h3 className={cn("text-xl font-bold mb-6", isDark ? "text-gray-100" : "text-slate-800")}>{title}</h3>
        
        <div className="space-y-4">
          <div className={cn("border-2 border-dashed rounded-xl p-8 text-center",
            isDark ? "border-blue-700" : "border-blue-300"
          )}>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <i className="fas fa-cloud-upload-alt text-4xl text-blue-500 mb-4"></i>
              <p className={isDark ? "text-gray-300 mb-2" : "text-slate-600 mb-2"}>Click to upload or drag and drop</p>
              <p className={cn("text-sm", isDark ? "text-gray-500" : "text-slate-400")}>CSV or Excel files only</p>
            </label>
            {file && (
              <p className="mt-4 text-sm text-green-600">
                Selected: {file.name}
              </p>
            )}
          </div>

          {uploadType === 'clincher' && (
            <div className={cn("p-4 rounded-xl", isDark ? "bg-blue-950/50" : "bg-blue-50")}>
              <h4 className={cn("font-semibold mb-2", isDark ? "text-blue-300" : "text-blue-800")}>Expected Format:</h4>
              <p className={cn("text-sm mb-2", isDark ? "text-blue-400" : "text-blue-600")}>
                Question, Answer (HTML), Main Figure URL, Category, 
                Extra Question 1-7, Extra Answer 1-7
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-lg">
                <div>
                  <span className="font-semibold">Required:</span>
                  <ul className="list-disc pl-4 mt-1">
                    <li>Question</li>
                    <li>Answer (HTML)</li>
                  </ul>
                </div>
                <div>
                  <span className="font-semibold">Optional:</span>
                  <ul className="list-disc pl-4 mt-1">
                    <li>Main Figure URL</li>
                    <li>Category</li>
                    <li>Extra Questions 1-7</li>
                    <li>Extra Answers 1-7</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {uploadType === 'main-mock-cbt' && (
            <div className={cn("p-4 rounded-xl", isDark ? "bg-blue-950/50" : "bg-blue-50")}>
              <h4 className={cn("font-semibold mb-2", isDark ? "text-blue-300" : "text-blue-800")}>Main Mock CBT Format:</h4>
              <p className={cn("text-sm", isDark ? "text-blue-400" : "text-blue-600")}>
                Mock Name, Question ID, Question, Figure URL, Explanation (Raw HTML), Answer, Is Correct
              </p>
              <p className={cn("text-xs mt-2", isDark ? "text-blue-500" : "text-blue-500")}>
                <span className="font-semibold">Optional column:</span> Time Limit (seconds) - if not provided, defaults to 180 minutes
              </p>
            </div>
          )}

          {uploadType === 'main-mock-osce' && (
            <div className={cn("p-4 rounded-xl", isDark ? "bg-green-950/50" : "bg-green-50")}>
              <h4 className={cn("font-semibold mb-2", isDark ? "text-green-300" : "text-green-800")}>Main Mock OSCE Format:</h4>
              <p className={cn("text-sm", isDark ? "text-green-400" : "text-green-600")}>
                OSCE Name, Question ID, Question, Figure URL, Explanation (Raw HTML), Answer, Is Correct
              </p>
            </div>
          )}

          {uploadType === 'mini-mock-cbt' && (
            <div className={cn("p-4 rounded-xl", isDark ? "bg-blue-950/50" : "bg-blue-50")}>
              <h4 className={cn("font-semibold mb-2", isDark ? "text-blue-300" : "text-blue-800")}>Mini Mock CBT Format:</h4>
              <p className={cn("text-sm", isDark ? "text-blue-400" : "text-blue-600")}>
                Quiz Name, Question ID, Question, Figure URL, Explanation (Raw HTML), Answer, Is Correct
              </p>
            </div>
          )}

          {uploadType === 'mini-mock-osce' && (
            <div className={cn("p-4 rounded-xl", isDark ? "bg-green-950/50" : "bg-green-50")}>
              <h4 className={cn("font-semibold mb-2", isDark ? "text-green-300" : "text-green-800")}>Mini Mock OSCE Format:</h4>
              <p className={cn("text-sm", isDark ? "text-green-400" : "text-green-600")}>
                OSCE Name, Question ID, Question, Figure URL, Correct Answers (Raw HTML)
              </p>
            </div>
          )}

          {uploadType === 'qblock' && (
            <div className={cn("p-4 rounded-xl", isDark ? "bg-rose-950/50" : "bg-rose-50")}>
              <h4 className={cn("font-semibold mb-2", isDark ? "text-rose-300" : "text-rose-800")}>QBlock Format:</h4>
              <p className={cn("text-sm", isDark ? "text-rose-400" : "text-rose-600")}>
                Question, Quiz Name, Answer 1, Answer 2, Answer 3, Answer 4, Correct Answer (1-4 or A-D)
              </p>
              <p className={cn("text-xs mt-2", isDark ? "text-rose-500" : "text-rose-500")}>
                Note: Quiz Name becomes the category. Correct Answer can be 1,2,3,4 or A,B,C,D
              </p>
            </div>
          )}

          {uploadType === 'qtopic' && (
            <div className={cn("p-4 rounded-xl", isDark ? "bg-cyan-950/50" : "bg-cyan-50")}>
              <h4 className={cn("font-semibold mb-2", isDark ? "text-cyan-300" : "text-cyan-800")}>QTopic Format:</h4>
              <p className={cn("text-sm mb-2", isDark ? "text-cyan-400" : "text-cyan-600")}>
                Category, Topic, Question, Explanation (HTML), Figure URL, Answer 1, Answer 2, Answer 3, Answer 4, Answer 5 (optional), Correct Answer
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-lg">
                <div>
                  <span className="font-semibold">Required:</span>
                  <ul className="list-disc pl-4 mt-1">
                    <li>Category</li>
                    <li>Topic</li>
                    <li>Question</li>
                    <li>Answer 1-4</li>
                    <li>Correct Answer (1-5 or A-E)</li>
                  </ul>
                </div>
                <div>
                  <span className="font-semibold">Optional:</span>
                  <ul className="list-disc pl-4 mt-1">
                    <li>Explanation (HTML)</li>
                    <li>Figure URL</li>
                    <li>Answer 5</li>
                  </ul>
                </div>
              </div>
              <p className={cn("text-xs mt-2", isDark ? "text-cyan-500" : "text-cyan-500")}>
                Note: Correct Answer can be 1,2,3,4,5 or A,B,C,D,E
              </p>
            </div>
          )}

          {uploadType === 'games' && (
            <div className={cn("p-4 rounded-xl", isDark ? "bg-purple-950/50" : "bg-purple-50")}>
              <h4 className={cn("font-semibold mb-2", isDark ? "text-purple-300" : "text-purple-800")}>Games Format:</h4>
              <p className={cn("text-sm mb-2", isDark ? "text-purple-400" : "text-purple-600")}>
                Required columns: Game Title, Game Slug, Question, Answer (HTML)
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-lg">
                <div>
                  <span className="font-semibold">Required:</span>
                  <ul className="list-disc pl-4 mt-1">
                    <li>Game Title</li>
                    <li>Question</li>
                    <li>Answer (HTML)</li>
                  </ul>
                </div>
                <div>
                  <span className="font-semibold">Optional:</span>
                  <ul className="list-disc pl-4 mt-1">
                    <li>Game Slug (auto-generated if empty)</li>
                    <li>Time (seconds) - per question timer</li>
                    <li>Figure URL</li>
                    <li>Seen (true/false)</li>
                    <li>Seen By</li>
                  </ul>
                </div>
              </div>
              <p className={cn("text-xs mt-2", isDark ? "text-purple-500" : "text-purple-500")}>
                Note: Multiple questions with the same Game Title will be grouped into one game.
                Each question will have its own timer if Time (seconds) is provided.
              </p>
            </div>
          )}

          {uploadType === 'quiz' && (
            <div className={cn("p-4 rounded-xl", isDark ? "bg-blue-950/50" : "bg-blue-50")}>
              <h4 className={cn("font-semibold mb-2", isDark ? "text-blue-300" : "text-blue-800")}>Quiz Format:</h4>
              <p className={cn("text-sm mb-2", isDark ? "text-blue-400" : "text-blue-600")}>
                Required columns: content, Category, Answer 1, Answer 2, Answer 3, Answer 4, Correct Answer (must match one of the answer texts exactly)
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-lg">
                <div>
                  <span className="font-semibold">Boolean Flags:</span>
                  <ul className="list-disc pl-4 mt-1">
                    <li>Is Dental (true/false) - marks as Dental quiz</li>
                    <li>Is Image (true/false) - marks as Picture Test</li>
                  </ul>
                </div>
                <div>
                  <span className="font-semibold">Optional:</span>
                  <ul className="list-disc pl-4 mt-1">
                    <li>Explanation (HTML)</li>
                    <li>Figure URL</li>
                  </ul>
                </div>
              </div>
              <p className={cn("text-xs mt-2", isDark ? "text-blue-500" : "text-blue-500")}>
                Note: The Correct Answer must contain the exact text of the correct option, not just the letter.
                The system will automatically match it to the correct answer number.
              </p>
            </div>
          )}

          {uploadResult && (
            <div className={cn("p-4 rounded-xl", 
              uploadResult.errors ? (isDark ? "bg-yellow-950/50" : "bg-yellow-50") : (isDark ? "bg-green-950/50" : "bg-green-50")
            )}>
              <p className={cn("font-semibold", 
                uploadResult.errors ? (isDark ? "text-yellow-300" : "text-yellow-800") : (isDark ? "text-green-300" : "text-green-800")
              )}>
                Upload Complete: {uploadResult.count} items processed
              </p>
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="mt-2">
                  <p className={cn("text-sm font-semibold", isDark ? "text-yellow-400" : "text-yellow-700")}>Errors:</p>
                  <ul className={cn("text-xs list-disc pl-4 mt-1 max-h-32 overflow-y-auto",
                    isDark ? "text-yellow-500" : "text-yellow-600"
                  )}>
                    {uploadResult.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-4 mt-8">
          <button
            onClick={onClose}
            className={cn("px-6 py-3 border-2 rounded-xl transition-all duration-300",
              isDark ? "border-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-700" : "border-slate-300 text-slate-700 hover:border-slate-500"
            )}
          >
            Cancel
          </button>
          <button
            onClick={handleFileUpload}
            disabled={!file || isUploading}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 flex items-center"
          >
            {isUploading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-3"></i>
                Uploading...
              </>
            ) : (
              <>
                <i className="fas fa-upload mr-3"></i>
                Upload
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminUploadModal;