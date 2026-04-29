'use client';

import { FC, useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { cn } from '@/utils';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from 'next-themes';

interface AdImage {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  linkUrl: string | null;
  order: number;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

interface AdManagementProps {
  onClose: () => void;
}

export const AdManagement: FC<AdManagementProps> = ({ onClose }) => {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [ads, setAds] = useState<AdImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingAd, setEditingAd] = useState<AdImage | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSidepanelOpen, setIsSidepanelOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    linkUrl: '',
    order: 0,
    isActive: true,
    startDate: '',
    endDate: '',
    imageFile: null as File | null,
  });

  const navigationItems = [
    { name: "Dashboard", href: "/dashboard", icon: "fa-home", color: "blue" },
    { name: "Manage Tokens", href: "/dashboard/admin/tokens", icon: "fa-cog", color: "red" },
    { name: "Application Access", href: "/dashboard/admin/application-access", icon: "fa-shield-alt", color: "purple" },
    { name: "Manage Ads", href: "/dashboard/admin/ads", icon: "fa-images", color: "green", active: true },
  ];

  const getColorClass = (color: string, isDarkMode: boolean = false) => {
    const colors: Record<string, { bg: string, text: string, border: string, darkBg: string, darkText: string, darkBorder: string }> = {
      blue: { 
        bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200",
        darkBg: "bg-blue-900/30", darkText: "text-blue-300", darkBorder: "border-blue-800/50"
      },
      red: { 
        bg: "bg-red-100", text: "text-red-800", border: "border-red-200",
        darkBg: "bg-red-900/30", darkText: "text-red-300", darkBorder: "border-red-800/50"
      },
      purple: { 
        bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-200",
        darkBg: "bg-purple-900/30", darkText: "text-purple-300", darkBorder: "border-purple-800/50"
      },
      green: { 
        bg: "bg-green-100", text: "text-green-800", border: "border-green-200",
        darkBg: "bg-green-900/30", darkText: "text-green-300", darkBorder: "border-green-800/50"
      },
      amber: { 
        bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200",
        darkBg: "bg-amber-900/30", darkText: "text-amber-300", darkBorder: "border-amber-800/50"
      },
      yellow: { 
        bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-200",
        darkBg: "bg-yellow-900/30", darkText: "text-yellow-300", darkBorder: "border-yellow-800/50"
      },
    };
    const colorStyle = colors[color] || colors.blue;
    if (isDarkMode) {
      return {
        bg: colorStyle.darkBg,
        text: colorStyle.darkText,
        border: colorStyle.darkBorder
      };
    }
    return {
      bg: colorStyle.bg,
      text: colorStyle.text,
      border: colorStyle.border
    };
  };

  const fetchAds = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/ads');
      if (!res.ok) throw new Error('Failed to fetch ads');
      const data = await res.json();
      setAds(data);
    } catch (error) {
      console.error('Error fetching ads:', error);
      toast.error('Failed to fetch ads');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to upload image');
    }
    
    const { url } = await res.json();
    return url;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, WEBP, GIF)');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }
    
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setFormData({ ...formData, imageFile: file });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title) {
      toast.error('Please enter a title');
      return;
    }
    
    if (!formData.imageFile && !editingAd?.imageUrl) {
      toast.error('Please select an image');
      return;
    }
    
    setIsUploading(true);
    
    try {
      let imageUrl = editingAd?.imageUrl || '';
      
      if (formData.imageFile) {
        imageUrl = await uploadImage(formData.imageFile);
      }

      const adData = {
        title: formData.title,
        description: formData.description || null,
        imageUrl: imageUrl,
        linkUrl: formData.linkUrl || null,
        order: formData.order,
        isActive: formData.isActive,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
      };

      const url = editingAd 
        ? `/api/ads/${editingAd.id}` 
        : '/api/ads';
      
      const method = editingAd ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save ad');
      }

      toast.success(editingAd ? 'Ad updated successfully' : 'Ad created successfully');
      setShowForm(false);
      setEditingAd(null);
      setFormData({
        title: '',
        description: '',
        linkUrl: '',
        order: 0,
        isActive: true,
        startDate: '',
        endDate: '',
        imageFile: null,
      });
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchAds();
    } catch (error) {
      console.error('Error saving ad:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save ad');
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = (ad: AdImage) => {
    setEditingAd(ad);
    setFormData({
      title: ad.title,
      description: ad.description || '',
      linkUrl: ad.linkUrl || '',
      order: ad.order,
      isActive: ad.isActive,
      startDate: ad.startDate?.split('T')[0] || '',
      endDate: ad.endDate?.split('T')[0] || '',
      imageFile: null,
    });
    setPreviewUrl(ad.imageUrl);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ad?')) return;
    
    try {
      const res = await fetch(`/api/ads/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete ad');
      toast.success('Ad deleted successfully');
      fetchAds();
    } catch (error) {
      console.error('Error deleting ad:', error);
      toast.error('Failed to delete ad');
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/ads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (!res.ok) throw new Error('Failed to update ad');
      toast.success(`Ad ${!currentActive ? 'activated' : 'deactivated'}`);
      fetchAds();
    } catch (error) {
      console.error('Error toggling ad:', error);
      toast.error('Failed to update ad');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className={cn(isDark ? "text-gray-400" : "text-gray-600")}>Loading ads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex h-screen overflow-hidden",
      isDark ? "bg-gradient-to-br from-gray-900 to-gray-800" : "bg-gradient-to-br from-purple-50 to-pink-50"
    )}>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsSidepanelOpen(!isSidepanelOpen)}
        className={cn(
          "fixed top-4 left-4 z-50 md:hidden p-3 rounded-xl shadow-lg transition-all",
          isDark 
            ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
            : "bg-gradient-to-r from-purple-500 to-pink-600 text-white"
        )}
      >
        <i className={`fas ${isSidepanelOpen ? 'fa-times' : 'fa-bars'}`}></i>
      </button>

      {/* Sidepanel Overlay - Mobile only */}
      {isSidepanelOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidepanelOpen(false)}
        />
      )}

      {/* Sidepanel */}
      <div
        className={cn(
          "fixed md:static top-0 left-0 h-full w-64 z-50 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:z-0 flex-shrink-0",
          isDark 
            ? "bg-gradient-to-b from-gray-900 to-gray-800 text-white"
            : "bg-gradient-to-b from-purple-900 to-pink-900 text-white",
          isSidepanelOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className={cn(
          "p-6 border-b",
          isDark ? "border-gray-700" : "border-purple-700"
        )}>
          <h2 className="text-xl font-bold flex items-center">
            <i className="fas fa-images mr-2 text-pink-300"></i>
            Ad Management
          </h2>
        </div>

        <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-80px)]">
          {navigationItems.map((item) => {
            const colorStyle = getColorClass(item.color, isDark);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsSidepanelOpen(false)}
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all",
                  item.active
                    ? isDark
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                      : 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg'
                    : isDark
                      ? 'text-gray-300 hover:bg-gray-800/50'
                      : 'text-purple-100 hover:bg-purple-800/50'
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  item.active 
                    ? 'bg-white/20' 
                    : isDark
                      ? `${colorStyle.bg} ${colorStyle.text}`
                      : `${colorStyle.bg} ${colorStyle.text}`
                )}>
                  <i className={`fas ${item.icon} text-sm`}></i>
                </div>
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            );
          })}

          <div className={cn(
            "pt-4 mt-4 border-t",
            isDark ? "border-gray-700" : "border-purple-700"
          )}>
            <Link
              href="/"
              onClick={() => setIsSidepanelOpen(false)}
              className={cn(
                "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all",
                isDark 
                  ? "text-gray-300 hover:bg-gray-800/50"
                  : "text-purple-100 hover:bg-purple-800/50"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                isDark 
                  ? "bg-gray-800 text-gray-400"
                  : "bg-purple-800 text-purple-300"
              )}>
                <i className="fas fa-globe text-sm"></i>
              </div>
              <span className="text-sm font-medium">Homepage</span>
            </Link>
            
            <button
              onClick={() => {
                setIsSidepanelOpen(false);
                router.push('/api/auth/signout');
              }}
              className={cn(
                "w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all mt-2",
                isDark 
                  ? "text-gray-300 hover:bg-gray-800/50"
                  : "text-purple-100 hover:bg-purple-800/50"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                isDark 
                  ? "bg-gray-800 text-gray-400"
                  : "bg-purple-800 text-purple-300"
              )}>
                <i className="fas fa-sign-out-alt text-sm"></i>
              </div>
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-8">
          {/* Header */}
          <div className={cn(
            "rounded-2xl shadow-xl p-6 md:p-8 mb-6 border",
            isDark 
              ? "bg-gray-800/90 border-gray-700"
              : "bg-white border-purple-100"
          )}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className={cn(
                  "text-2xl md:text-3xl font-bold",
                  isDark 
                    ? "bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
                    : "bg-gradient-to-r from-purple-600 to-pink-700 bg-clip-text text-transparent"
                )}>
                  Ad Management
                </h1>
                <p className={cn(
                  "mt-2",
                  isDark ? "text-gray-400" : "text-gray-600"
                )}>
                  Manage promotional ads and banners displayed to users
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingAd(null);
                  setFormData({
                    title: '',
                    description: '',
                    linkUrl: '',
                    order: ads.length,
                    isActive: true,
                    startDate: '',
                    endDate: '',
                    imageFile: null,
                  });
                  setPreviewUrl(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                  setShowForm(true);
                }}
                className={cn(
                  "px-4 md:px-6 py-2 md:py-3 rounded-xl font-medium transition-all flex items-center gap-2",
                  isDark
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-lg"
                    : "bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700 shadow-lg"
                )}
              >
                <i className="fas fa-plus"></i>
                Add New Ad
              </button>
            </div>
          </div>

          {/* Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className={cn(
                "rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto",
                isDark ? "bg-gray-800" : "bg-white"
              )}>
                <h3 className={cn(
                  "text-xl font-bold mb-4",
                  isDark ? "text-white" : "text-gray-800"
                )}>
                  {editingAd ? 'Edit Ad' : 'Create New Ad'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className={cn(
                      "block text-sm font-medium mb-2",
                      isDark ? "text-gray-300" : "text-gray-700"
                    )}>
                      Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      className={cn(
                        "w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500",
                        isDark 
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-900"
                      )}
                      placeholder="Enter ad title"
                    />
                  </div>
                  
                  <div>
                    <label className={cn(
                      "block text-sm font-medium mb-2",
                      isDark ? "text-gray-300" : "text-gray-700"
                    )}>
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className={cn(
                        "w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500",
                        isDark 
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-900"
                      )}
                      placeholder="Optional description text"
                    />
                  </div>
                  
                  <div>
                    <label className={cn(
                      "block text-sm font-medium mb-2",
                      isDark ? "text-gray-300" : "text-gray-700"
                    )}>
                      Ad Image *
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                        onChange={handleImageSelect}
                        className={cn(
                          "flex-1 p-3 border rounded-lg",
                          isDark 
                            ? "bg-gray-700 border-gray-600 text-white"
                            : "bg-white border-gray-300"
                        )}
                      />
                      {previewUrl && (
                        <div className="relative w-20 h-20">
                          <img 
                            src={previewUrl} 
                            alt="Preview" 
                            className="w-full h-full object-cover rounded-lg border"
                          />
                        </div>
                      )}
                    </div>
                    <p className={cn(
                      "text-xs mt-1",
                      isDark ? "text-gray-400" : "text-gray-500"
                    )}>
                      Recommended size: 1200x600px. Max size: 5MB. Formats: JPG, PNG, WEBP, GIF
                    </p>
                  </div>
                  
                  <div>
                    <label className={cn(
                      "block text-sm font-medium mb-2",
                      isDark ? "text-gray-300" : "text-gray-700"
                    )}>
                      Link URL (optional)
                    </label>
                    <input
                      type="url"
                      value={formData.linkUrl}
                      onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                      placeholder="https://example.com"
                      className={cn(
                        "w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500",
                        isDark 
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-900"
                      )}
                    />
                    <p className={cn(
                      "text-xs mt-1",
                      isDark ? "text-gray-400" : "text-gray-500"
                    )}>
                      Users will be redirected to this URL when clicking the ad
                    </p>
                  </div>
                  
                  <div>
                    <label className={cn(
                      "block text-sm font-medium mb-2",
                      isDark ? "text-gray-300" : "text-gray-700"
                    )}>
                      Display Order
                    </label>
                    <input
                      type="number"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                      min="0"
                      className={cn(
                        "w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500",
                        isDark 
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-900"
                      )}
                    />
                    <p className={cn(
                      "text-xs mt-1",
                      isDark ? "text-gray-400" : "text-gray-500"
                    )}>
                      Lower numbers appear first
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={cn(
                        "block text-sm font-medium mb-2",
                        isDark ? "text-gray-300" : "text-gray-700"
                      )}>
                        Start Date (optional)
                      </label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className={cn(
                          "w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500",
                          isDark 
                            ? "bg-gray-700 border-gray-600 text-white"
                            : "bg-white border-gray-300 text-gray-900"
                        )}
                      />
                    </div>
                    <div>
                      <label className={cn(
                        "block text-sm font-medium mb-2",
                        isDark ? "text-gray-300" : "text-gray-700"
                      )}>
                        End Date (optional)
                      </label>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className={cn(
                          "w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500",
                          isDark 
                            ? "bg-gray-700 border-gray-600 text-white"
                            : "bg-white border-gray-300 text-gray-900"
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="mr-2 w-4 h-4"
                    />
                    <label htmlFor="isActive" className={cn(
                      "text-sm font-medium cursor-pointer",
                      isDark ? "text-gray-300" : "text-gray-700"
                    )}>
                      Active (show this ad)
                    </label>
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setEditingAd(null);
                        setPreviewUrl(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className={cn(
                        "px-4 py-2 border rounded-lg transition-colors",
                        isDark 
                          ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                          : "border-gray-300 text-gray-700 hover:bg-gray-100"
                      )}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isUploading}
                      className={cn(
                        "px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2",
                        isDark
                          ? "bg-purple-600 text-white hover:bg-purple-700"
                          : "bg-purple-500 text-white hover:bg-purple-600"
                      )}
                    >
                      {isUploading && <i className="fas fa-spinner fa-spin"></i>}
                      {editingAd ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Ads List */}
          <div className={cn(
            "rounded-xl shadow-xl overflow-hidden",
            isDark ? "bg-gray-800/90" : "bg-white"
          )}>
            <div className={cn(
              "p-4 md:p-6 border-b",
              isDark ? "border-gray-700" : "border-gray-200"
            )}>
              <h2 className={cn(
                "text-lg md:text-xl font-semibold",
                isDark ? "text-white" : "text-gray-800"
              )}>
                All Ads
              </h2>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {ads.length === 0 ? (
                <div className="text-center py-12">
                  <div className={cn(
                    "w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-4",
                    isDark ? "bg-gray-700" : "bg-gray-100"
                  )}>
                    <i className={cn(
                      "fas fa-images text-2xl md:text-3xl",
                      isDark ? "text-gray-500" : "text-gray-400"
                    )}></i>
                  </div>
                  <p className={isDark ? "text-gray-400" : "text-gray-600"}>
                    No ads created yet. Click "Add New Ad" to get started.
                  </p>
                </div>
              ) : (
                ads.map((ad) => {
                  const colorStyle = getColorClass('green', isDark);
                  return (
                    <div key={ad.id} className={cn(
                      "p-4 md:p-6 transition-colors",
                      isDark ? "hover:bg-gray-700/50" : "hover:bg-gray-50"
                    )}>
                      <div className="flex flex-col md:flex-row gap-4">
                        <img
                          src={ad.imageUrl}
                          alt={ad.title}
                          className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className={cn(
                            "font-semibold text-lg truncate",
                            isDark ? "text-white" : "text-gray-800"
                          )}>
                            {ad.title}
                          </h3>
                          {ad.description && (
                            <p className={cn(
                              "text-sm mt-1 line-clamp-2",
                              isDark ? "text-gray-400" : "text-gray-600"
                            )}>
                              {ad.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                            <span className={cn(
                              "flex items-center gap-1",
                              isDark ? "text-gray-400" : "text-gray-500"
                            )}>
                              <i className="fas fa-sort-numeric-down text-xs"></i>
                              Order: {ad.order}
                            </span>
                            <span className="flex items-center gap-1">
                              <i className={`fas fa-circle text-xs ${ad.isActive ? 'text-green-500' : 'text-red-500'}`}></i>
                              <span className={isDark ? "text-gray-400" : "text-gray-600"}>
                                {ad.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </span>
                            {ad.linkUrl && (
                              <span className={cn(
                                "flex items-center gap-1",
                                isDark ? "text-gray-400" : "text-gray-500"
                              )}>
                                <i className="fas fa-link text-xs"></i>
                                Has Link
                              </span>
                            )}
                            {ad.startDate && (
                              <span className={cn(
                                "flex items-center gap-1 text-xs",
                                isDark ? "text-gray-400" : "text-gray-500"
                              )}>
                                <i className="far fa-calendar-alt"></i>
                                {new Date(ad.startDate).toLocaleDateString()} - 
                                {ad.endDate ? new Date(ad.endDate).toLocaleDateString() : 'No end date'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-row md:flex-col gap-2">
                          <button
                            onClick={() => handleToggleActive(ad.id, ad.isActive)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                              ad.isActive
                                ? isDark
                                  ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                                  : "bg-yellow-500 hover:bg-yellow-600 text-white"
                                : isDark
                                  ? "bg-green-600 hover:bg-green-700 text-white"
                                  : "bg-green-500 hover:bg-green-600 text-white"
                            )}
                          >
                            {ad.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleEdit(ad)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1",
                              isDark
                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                : "bg-blue-500 hover:bg-blue-600 text-white"
                            )}
                          >
                            <i className="fas fa-edit"></i>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(ad.id)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1",
                              isDark
                                ? "bg-red-600 hover:bg-red-700 text-white"
                                : "bg-red-500 hover:bg-red-600 text-white"
                            )}
                          >
                            <i className="fas fa-trash"></i>
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};