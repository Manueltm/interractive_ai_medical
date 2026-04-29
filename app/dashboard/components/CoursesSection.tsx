'use client';
import { FC, useState } from "react";
import { toast } from "sonner";

type CoursesSectionProps = {
  switchSection: (section: string) => void;
};

const CoursesSection: FC<CoursesSectionProps> = ({ switchSection }) => {
  const [courses, setCourses] = useState<any[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newCourse, setNewCourse] = useState({ 
    title: '', 
    description: '', 
    modules: [''],
    image: null as File | null 
  });

  const addModule = () => {
    setNewCourse({ ...newCourse, modules: [...newCourse.modules, ''] });
  };

  const updateModule = (index: number, value: string) => {
    const updated = [...newCourse.modules];
    updated[index] = value;
    setNewCourse({ ...newCourse, modules: updated });
  };

  const removeModule = (index: number) => {
    const updated = newCourse.modules.filter((_, i) => i !== index);
    setNewCourse({ ...newCourse, modules: updated });
  };

  const handleUpload = () => {
    if (!newCourse.title || !newCourse.description || newCourse.modules.filter(m => m.trim()).length === 0) {
      toast.error('Please provide title, description and at least one module');
      return;
    }
    toast.success('Course created successfully');
    setShowUploadModal(false);
    setNewCourse({ title: '', description: '', modules: [''], image: null });
  };

  return (
    <div className="bg-gradient-to-br from-white/95 to-violet-50/95 rounded-2xl shadow-lg p-8 border border-violet-300 backdrop-blur-sm">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold flex items-center text-slate-800">
          <i className="fas fa-layer-group mr-4 text-violet-500"></i>
          Courses
        </h2>
        <button
          onClick={() => switchSection('selection')}
          className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl hover:from-violet-600 hover:to-purple-700 transition-all duration-300 flex items-center font-bold shadow-lg hover:shadow-xl cursor-pointer"
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
          Create Course
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {courses.map((course, index) => (
          <div key={index} className="bg-white/80 rounded-xl p-6 border border-violet-200 hover:shadow-lg transition-all">
            <h3 className="font-bold text-lg text-slate-800 mb-2">{course.title}</h3>
            <p className="text-slate-600 text-sm mb-4">{course.description}</p>
            <p className="text-slate-500 text-xs mb-4">{course.modules.length} modules</p>
            <button className="w-full px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600">
              View Course
            </button>
          </div>
        ))}
        {courses.length === 0 && (
          <div className="col-span-full text-center py-12 bg-gradient-to-br from-violet-50/80 to-violet-100/80 rounded-2xl border-2 border-dashed border-violet-300">
            <i className="fas fa-book text-5xl text-violet-400 mb-4"></i>
            <p className="text-slate-500 text-lg">No courses yet. Create your first course!</p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Create Course</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Title</label>
                <input
                  type="text"
                  value={newCourse.title}
                  onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                  className="w-full p-3 border-2 border-slate-300 rounded-xl focus:border-violet-500"
                  placeholder="e.g., Internal Medicine"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                <textarea
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                  className="w-full p-3 border-2 border-slate-300 rounded-xl focus:border-violet-500 h-24"
                  placeholder="Course description..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Course Image (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewCourse({ ...newCourse, image: e.target.files?.[0] || null })}
                  className="w-full p-3 border-2 border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Modules</label>
                {newCourse.modules.map((module, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={module}
                      onChange={(e) => updateModule(index, e.target.value)}
                      className="flex-1 p-3 border-2 border-slate-300 rounded-xl focus:border-violet-500"
                      placeholder={`Module ${index + 1}`}
                    />
                    {newCourse.modules.length > 1 && (
                      <button
                        onClick={() => removeModule(index)}
                        className="p-3 text-red-500 hover:text-red-700"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addModule}
                  className="mt-2 text-violet-600 hover:text-violet-800 text-sm font-semibold"
                >
                  <i className="fas fa-plus mr-2"></i>Add Module
                </button>
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
                className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl hover:from-violet-600 hover:to-purple-700"
              >
                Create Course
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursesSection;