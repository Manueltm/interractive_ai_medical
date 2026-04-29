"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

interface Application {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  requiresApproval: boolean;
  hasAccess: boolean;
}

interface UserApplicationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string | null;
}

export const UserApplicationsModal = ({ 
  isOpen, 
  onClose, 
  userId, 
  userEmail 
}: UserApplicationsModalProps) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserApplications();
    }
  }, [isOpen, userId]);

  const fetchUserApplications = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/users/${userId}/applications`);
      if (!res.ok) throw new Error("Failed to fetch applications");
      const data = await res.json();
      setApplications(data.applications || []);
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const toggleApplicationAccess = async (applicationId: string, currentAccess: boolean) => {
    setUpdating(applicationId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          grant: !currentAccess,
        }),
      });

      if (res.ok) {
        setApplications(prev =>
          prev.map(app =>
            app.id === applicationId
              ? { ...app, hasAccess: !currentAccess }
              : app
          )
        );
        toast.success(!currentAccess ? "Access granted" : "Access revoked");
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to update access");
      }
    } catch (error) {
      toast.error("Failed to update access");
    } finally {
      setUpdating(null);
    }
  };

  const getColorClass = (color: string) => {
    const colors: Record<string, string> = {
      blue: "bg-blue-100 text-blue-800",
      amber: "bg-amber-100 text-amber-800",
      purple: "bg-purple-100 text-purple-800",
      green: "bg-green-100 text-green-800",
      orange: "bg-orange-100 text-orange-800",
      red: "bg-red-100 text-red-800",
      teal: "bg-teal-100 text-teal-800",
      emerald: "bg-emerald-100 text-emerald-800",
      indigo: "bg-indigo-100 text-indigo-800",
      pink: "bg-pink-100 text-pink-800",
      cyan: "bg-cyan-100 text-cyan-800",
      violet: "bg-violet-100 text-violet-800",
      rose: "bg-rose-100 text-rose-800",
      sky: "bg-sky-100 text-sky-800",
    };
    return colors[color] || "bg-slate-100 text-slate-800";
  };

  const getIcon = (icon: string) => {
    return icon.replace('fa-', '');
  };

  const filteredApplications = applications.filter(app =>
    app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const grantedCount = applications.filter(app => app.hasAccess).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden mx-4">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-indigo-600">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white flex items-center">
                <i className="fas fa-shield-alt mr-2"></i>
                Manage Application Access
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                User: {userEmail || "Unknown User"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>

        {/* Search and Stats */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1">
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                placeholder="Search applications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full">
                <i className="fas fa-check-circle mr-1"></i>
                {grantedCount} Granted
              </span>
              <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full">
                <i className="fas fa-times-circle mr-1"></i>
                {applications.length - grantedCount} Restricted
              </span>
            </div>
          </div>
        </div>

        {/* Applications Grid */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredApplications.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredApplications.map((app) => {
                const colorClass = getColorClass(app.color);
                return (
                  <div
                    key={app.id}
                    className={`border rounded-xl p-4 transition-all ${
                      app.hasAccess 
                        ? 'border-green-200 bg-green-50/50' 
                        : 'border-gray-200 hover:border-blue-200 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                        <i className={`fas fa-${getIcon(app.icon)} text-lg`}></i>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-800 truncate">
                            {app.name}
                          </h3>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={app.hasAccess}
                              onChange={() => toggleApplicationAccess(app.id, app.hasAccess)}
                              disabled={updating === app.id}
                              className="sr-only peer"
                            />
                            <div className={`w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                              app.hasAccess ? 'peer-checked:bg-green-600' : ''
                            } ${updating === app.id ? 'opacity-50' : ''}`}>
                            </div>
                            {updating === app.id && (
                              <i className="fas fa-spinner fa-spin ml-2 text-blue-500"></i>
                            )}
                          </label>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                          {app.description}
                        </p>
                        <div className="flex items-center mt-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            app.requiresApproval
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {app.requiresApproval ? 'Requires Approval' : 'Open Access'}
                          </span>
                          {app.hasAccess && (
                            <span className="text-xs text-green-600 ml-2">
                              <i className="fas fa-check-circle mr-1"></i>
                              Granted
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-search text-gray-400 text-3xl"></i>
              </div>
              <p className="text-gray-600">No applications found matching your search</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};