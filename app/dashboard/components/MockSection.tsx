// app/dashboard/components/MockSection.tsx
'use client';
import { FC, useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { cn } from "@/utils";
import { AdminGuard } from "./AdminGuard";
import AdminUploadModal from "./admin/AdminUploadModal";
import MockExamLayout from "./mocks/MockExamLayout";
import CategoryCards from "./mocks/CategoryCards";
import SubCategoryCards from "./mocks/SubCategoryCards";
import MainMockCBT from "./mocks/MainMockCBT";
import MainMockOSCE from "./mocks/MainMockOSCE";
import MiniMockCBT from "./mocks/MiniMockCBT";
import MiniMockOSCE from "./mocks/MiniMockOSCE";
import QBlock from "./mocks/QBlock";

type MockSectionProps = {
  switchSection: (section: string) => void;
};

export type ExamType = 'main' | 'mini' | 'qblock' | null;
export type ExamSubType = 'cbt' | 'osce' | null;
export type ViewState = 'main' | 'sub' | 'categories' | 'exam';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const MockSectionContent: FC<MockSectionProps> = ({ switchSection }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [viewState, setViewState] = useState<ViewState>('main');
  const [selectedType, setSelectedType] = useState<ExamType>(null);
  const [selectedSubType, setSelectedSubType] = useState<ExamSubType>(null);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<'main-mock-cbt' | 'main-mock-osce' | 'mini-mock-cbt' | 'mini-mock-osce' | 'qblock' | 'quiz'>('quiz');
  const [stats, setStats] = useState({ total: 0, correct: 0, wrong: 0 });

  // Fetch categories based on type and subtype
  useEffect(() => {
    if (selectedType && selectedSubType) {
      fetchCategories();
    } else if (selectedType === 'qblock') {
      fetchCategories();
    }
  }, [selectedType, selectedSubType]);

  const fetchCategories = async () => {
    try {
      let apiType = '';
      if (selectedType === 'main' && selectedSubType === 'cbt') {
        apiType = 'main-mock-cbt';
      } else if (selectedType === 'main' && selectedSubType === 'osce') {
        apiType = 'main-mock-osce';
      } else if (selectedType === 'mini' && selectedSubType === 'cbt') {
        apiType = 'mini-mock-cbt';
      } else if (selectedType === 'mini' && selectedSubType === 'osce') {
        apiType = 'mini-mock-osce';
      } else if (selectedType === 'qblock') {
        apiType = 'qblock';
      }
      
      if (!apiType) return;
      
      const res = await fetch(`/api/academy-categories?type=${apiType}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
      setCategories([]);
    }
  };

  const handleTypeSelect = (type: ExamType) => {
    setSelectedType(type);
    if (type === 'qblock') {
      setSelectedSubType(null);
      setViewState('categories');
    } else {
      setViewState('sub');
    }
  };

  const handleSubTypeSelect = (subType: ExamSubType) => {
    setSelectedSubType(subType);
    setViewState('categories');
  };

  const handleCategorySelect = (category: any) => {
    setSelectedCategory(category);
    setViewState('exam');
  };

  const handleBack = () => {
    if (viewState === 'exam') {
      setViewState('categories');
      setSelectedCategory(null);
    } else if (viewState === 'categories') {
      if (selectedType === 'qblock') {
        setViewState('main');
        setSelectedType(null);
      } else {
        setViewState('sub');
        setSelectedSubType(null);
      }
      setCategories([]);
    } else if (viewState === 'sub') {
      setViewState('main');
      setSelectedType(null);
    } else {
      switchSection('selection');
    }
  };

  const handleUpload = async () => {
    if (selectedType && (selectedSubType || selectedType === 'qblock')) {
      await fetchCategories();
    }
  };

  const openUploadModal = (type: 'main-mock-cbt' | 'main-mock-osce' | 'mini-mock-cbt' | 'mini-mock-osce' | 'qblock') => {
    setUploadType(type);
    setShowUploadModal(true);
  };

  const getUploadButtonTitle = () => {
    if (selectedType === 'main' && selectedSubType === 'cbt') return 'Upload Main Mock CBT';
    if (selectedType === 'main' && selectedSubType === 'osce') return 'Upload Main Mock OSCE';
    if (selectedType === 'mini' && selectedSubType === 'cbt') return 'Upload Mini Mock CBT';
    if (selectedType === 'mini' && selectedSubType === 'osce') return 'Upload Mini Mock OSCE';
    if (selectedType === 'qblock') return 'Upload QBlock';
    return 'Upload';
  };

  const renderUploadButton = () => {
    if (viewState !== 'categories' && viewState !== 'exam') return null;
    
    let uploadTypeVal: 'main-mock-cbt' | 'main-mock-osce' | 'mini-mock-cbt' | 'mini-mock-osce' | 'qblock' | null = null;
    
    if (selectedType === 'main' && selectedSubType === 'cbt') {
      uploadTypeVal = 'main-mock-cbt';
    } else if (selectedType === 'main' && selectedSubType === 'osce') {
      uploadTypeVal = 'main-mock-osce';
    } else if (selectedType === 'mini' && selectedSubType === 'cbt') {
      uploadTypeVal = 'mini-mock-cbt';
    } else if (selectedType === 'mini' && selectedSubType === 'osce') {
      uploadTypeVal = 'mini-mock-osce';
    } else if (selectedType === 'qblock') {
      uploadTypeVal = 'qblock';
    }
    
    if (!uploadTypeVal) return null;
    
    return (
      <AdminGuard>
        <button
          onClick={() => openUploadModal(uploadTypeVal)}
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 flex items-center gap-2 shadow-lg"
        >
          <i className="fas fa-upload"></i>
          {getUploadButtonTitle()}
        </button>
      </AdminGuard>
    );
  };

  const handleStatsUpdate = (newStats: { correct: number; wrong: number; total?: number }) => {
    setStats({
      total: newStats.total || newStats.correct + newStats.wrong,
      correct: newStats.correct,
      wrong: newStats.wrong
    });
  };

  const renderContent = () => {
    switch (viewState) {
      case 'main':
        return (
          <div className="space-y-6">
            <h2 className={cn("text-2xl font-bold mb-6", isDark ? "text-gray-100" : "text-slate-800")}>Select Exam Type</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Main Mock Card */}
              <button
                onClick={() => handleTypeSelect('main')}
                className="group relative bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-2xl transition-all transform hover:scale-105"
              >
                <div className="absolute top-4 right-4 bg-white/20 rounded-full px-3 py-1 text-sm">
                  Popular
                </div>
                <i className="fas fa-laptop-medical text-5xl mb-4"></i>
                <h3 className="text-2xl font-bold mb-2">Main Mock</h3>
                <p className="text-rose-100 mb-4">Full-length practice exams</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-clock"></i>
                    <span>CBT: 180 mins (300 Qs)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className="fas fa-clock"></i>
                    <span>OSCE: 30 mins per category</span>
                  </div>
                </div>
              </button>

              {/* Mini Mock Card */}
              <button
                onClick={() => handleTypeSelect('mini')}
                className="group relative bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-2xl transition-all transform hover:scale-105"
              >
                <i className="fas fa-flask text-5xl mb-4"></i>
                <h3 className="text-2xl font-bold mb-2">Mini Mock</h3>
                <p className="text-blue-100 mb-4">Quick practice sessions</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-clock"></i>
                    <span>CBT: 2 mins per category</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className="fas fa-clock"></i>
                    <span>OSCE: 20 mins per category</span>
                  </div>
                </div>
              </button>

              {/* QBlock Card */}
              <button
                onClick={() => handleTypeSelect('qblock')}
                className="group bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-2xl transition-all transform hover:scale-105"
              >
                <i className="fas fa-cubes text-5xl mb-4"></i>
                <h3 className="text-2xl font-bold mb-2">QBlock</h3>
                <p className="text-emerald-100 mb-4">Topic-based question blocks</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-clock"></i>
                    <span>20 mins per block (40 Qs)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className="fas fa-layer-group"></i>
                    <span>Focused topics</span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        );

      case 'sub':
        return (
          <SubCategoryCards
            type={selectedType}
            onSelect={handleSubTypeSelect}
            onBack={handleBack}
          />
        );

      case 'categories':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className={cn("text-2xl font-bold", isDark ? "text-gray-100" : "text-slate-800")}>
                Select {selectedType === 'main' ? 'Main Mock' : selectedType === 'mini' ? 'Mini Mock' : 'QBlock'} Category
                {selectedSubType && ` - ${selectedSubType.toUpperCase()}`}
              </h2>
              {renderUploadButton()}
            </div>
            <CategoryCards
              type={selectedType}
              subType={selectedSubType}
              categories={categories}
              onSelect={handleCategorySelect}
              onBack={handleBack}
            />
          </div>
        );

      case 'exam':
        return (
          <div className="space-y-4">
            <div className="flex justify-end">
              {renderUploadButton()}
            </div>
            {selectedType === 'main' && selectedSubType === 'cbt' && (
              <MainMockCBT
                categoryId={selectedCategory?.id}
                onStatsUpdate={handleStatsUpdate}
              />
            )}
            {selectedType === 'main' && selectedSubType === 'osce' && (
              <MainMockOSCE
                categoryId={selectedCategory?.id}
                onStatsUpdate={handleStatsUpdate}
              />
            )}
            {selectedType === 'mini' && selectedSubType === 'cbt' && (
              <MiniMockCBT
                categoryId={selectedCategory?.id}
                onStatsUpdate={handleStatsUpdate}
              />
            )}
            {selectedType === 'mini' && selectedSubType === 'osce' && (
              <MiniMockOSCE
                categoryId={selectedCategory?.id}
                onStatsUpdate={handleStatsUpdate}
              />
            )}
            {selectedType === 'qblock' && (
              <QBlock
                categoryId={selectedCategory?.id}
                onStatsUpdate={handleStatsUpdate}
              />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const getTitle = () => {
    if (viewState === 'exam' && selectedCategory) {
      return `${selectedCategory.name} - ${selectedType?.toUpperCase()} ${selectedSubType?.toUpperCase() || ''}`;
    }
    if (viewState === 'categories' && selectedType) {
      return `${selectedType === 'main' ? 'Main Mock' : selectedType === 'mini' ? 'Mini Mock' : 'QBlock'} ${selectedSubType ? `- ${selectedSubType.toUpperCase()}` : ''}`;
    }
    if (viewState === 'sub' && selectedType) {
      return `${selectedType === 'main' ? 'Main Mock' : 'Mini Mock'} - Select Format`;
    }
    return 'Mock Exams';
  };

  return (
    <>
      <MockExamLayout
        title={getTitle()}
        onBack={handleBack}
        stats={stats}
      >
        {renderContent()}
      </MockExamLayout>

      <AdminUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUpload}
        title={getUploadButtonTitle()}
        uploadType={uploadType}
      />
    </>
  );
};

const MockSection: FC<MockSectionProps> = (props) => {
  return (
    <QueryClientProvider client={queryClient}>
      <MockSectionContent {...props} />
    </QueryClientProvider>
  );
};

export default MockSection;