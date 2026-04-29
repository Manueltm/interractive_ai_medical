'use client';
import { FC, useState } from "react";
import { toast } from "sonner";

type ChecklistSectionProps = {
  switchSection: (section: string) => void;
};

const ChecklistSection: FC<ChecklistSectionProps> = ({ switchSection }) => {
  const [checklists, setChecklists] = useState<any[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newChecklist, setNewChecklist] = useState({ title: '', items: [''] });

  const addItem = () => {
    setNewChecklist({ ...newChecklist, items: [...newChecklist.items, ''] });
  };

  const updateItem = (index: number, value: string) => {
    const updated = [...newChecklist.items];
    updated[index] = value;
    setNewChecklist({ ...newChecklist, items: updated });
  };

  const removeItem = (index: number) => {
    const updated = newChecklist.items.filter((_, i) => i !== index);
    setNewChecklist({ ...newChecklist, items: updated });
  };

  const handleUpload = () => {
    if (!newChecklist.title || newChecklist.items.filter(i => i.trim()).length === 0) {
      toast.error('Please provide title and at least one checklist item');
      return;
    }
    toast.success('Checklist created successfully');
    setShowUploadModal(false);
    setNewChecklist({ title: '', items: [''] });
  };

  return (
    <div className="bg-gradient-to-br from-white/95 to-green-50/95 rounded-2xl shadow-lg p-8 border border-green-300 backdrop-blur-sm">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold flex items-center text-slate-800">
          <i className="fas fa-check-circle mr-4 text-green-500"></i>
          Checklist
        </h2>
        <button
          onClick={() => switchSection('selection')}
          className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 flex items-center font-bold shadow-lg hover:shadow-xl cursor-pointer"
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
          Create Checklist
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {checklists.map((checklist, index) => (
          <div key={index} className="bg-white/80 rounded-xl p-6 border border-green-200 hover:shadow-lg transition-all">
            <h3 className="font-bold text-lg text-slate-800 mb-4">{checklist.title}</h3>
            <ul className="space-y-2">
              {checklist.items.map((item: string, i: number) => (
                <li key={i} className="flex items-center">
                  <input type="checkbox" className="mr-3 h-4 w-4 text-green-600" />
                  <span className="text-slate-600">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {checklists.length === 0 && (
          <div className="col-span-full text-center py-12 bg-gradient-to-br from-green-50/80 to-green-100/80 rounded-2xl border-2 border-dashed border-green-300">
            <i className="fas fa-clipboard-list text-5xl text-green-400 mb-4"></i>
            <p className="text-slate-500 text-lg">No checklists yet. Create your first checklist!</p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Create Checklist</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Title</label>
                <input
                  type="text"
                  value={newChecklist.title}
                  onChange={(e) => setNewChecklist({ ...newChecklist, title: e.target.value })}
                  className="w-full p-3 border-2 border-slate-300 rounded-xl focus:border-green-500"
                  placeholder="e.g., Physical Exam Checklist"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Checklist Items</label>
                {newChecklist.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => updateItem(index, e.target.value)}
                      className="flex-1 p-3 border-2 border-slate-300 rounded-xl focus:border-green-500"
                      placeholder={`Item ${index + 1}`}
                    />
                    {newChecklist.items.length > 1 && (
                      <button
                        onClick={() => removeItem(index)}
                        className="p-3 text-red-500 hover:text-red-700"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addItem}
                  className="mt-2 text-green-600 hover:text-green-800 text-sm font-semibold"
                >
                  <i className="fas fa-plus mr-2"></i>Add Item
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
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChecklistSection;