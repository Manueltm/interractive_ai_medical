//C:\Users\User\Desktop\New Cloned\academy\acemedixacademy\app\dashboard\admin\application-access\page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

interface Application {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  requiresApproval: boolean;
  isActive: boolean;
}

interface AccessRequest {
  id: string;
  userId: string;
  applicationId: string;
  isApproved: boolean;
  notes: string | null;
  createdAt: string;
  approvedAt: string | null;
  user: {
    email: string;
    role: string;
  };
  application: {
    name: string;
    slug: string;
    icon: string;
    color: string;
  };
}

export default function ApplicationAccessConsole() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [pendingRequests, setPendingRequests] = useState<AccessRequest[]>([]);
  const [approvedAccess, setApprovedAccess] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'applications'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isSidepanelOpen, setIsSidepanelOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      if (session?.user?.role !== "admin") {
        router.push("/dashboard");
        return;
      }
      fetchData();
    }
  }, [session, status, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all applications
      const appsRes = await fetch("/api/applications");
      if (appsRes.ok) {
        const appsData = await appsRes.json();
        setApplications(appsData.applications || []);
      }

      // Fetch pending requests
      try {
        const pendingRes = await fetch("/api/admin/application-requests?status=pending");
        if (pendingRes.ok) {
          const pendingData = await pendingRes.json();
          setPendingRequests(pendingData.requests || []);
        }
      } catch (error) {
        console.error("Error fetching pending requests:", error);
      }

      // Fetch approved access
      try {
        const approvedRes = await fetch("/api/admin/application-requests?status=approved");
        if (approvedRes.ok) {
          const approvedData = await approvedRes.json();
          setApprovedAccess(approvedData.requests || []);
        }
      } catch (error) {
        console.error("Error fetching approved access:", error);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const res = await fetch("/api/admin/application-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          requestId, 
          action: "approve",
          approvedBy: session?.user?.id
        }),
      });

      if (res.ok) {
        toast.success("Access approved");
        fetchData();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to approve access");
      }
    } catch (error) {
      toast.error("Failed to approve access");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const res = await fetch("/api/admin/application-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          requestId, 
          action: "reject" 
        }),
      });

      if (res.ok) {
        toast.success("Request rejected");
        fetchData();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to reject request");
      }
    } catch (error) {
      toast.error("Failed to reject request");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRevokeAccess = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const res = await fetch("/api/admin/application-requests", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });

      if (res.ok) {
        toast.success("Access revoked");
        fetchData();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to revoke access");
      }
    } catch (error) {
      toast.error("Failed to revoke access");
    } finally {
      setProcessingId(null);
    }
  };

  const getIcon = (icon: string) => {
    return icon.replace('fa-', '');
  };

  const getColorClass = (color: string) => {
    const colors: Record<string, { bg: string, text: string, border: string }> = {
      blue: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200" },
      amber: { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200" },
      purple: { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-200" },
      green: { bg: "bg-green-100", text: "text-green-800", border: "border-green-200" },
      orange: { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-200" },
      red: { bg: "bg-red-100", text: "text-red-800", border: "border-red-200" },
      teal: { bg: "bg-teal-100", text: "text-teal-800", border: "border-teal-200" },
      emerald: { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-200" },
      indigo: { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-200" },
      pink: { bg: "bg-pink-100", text: "text-pink-800", border: "border-pink-200" },
      cyan: { bg: "bg-cyan-100", text: "text-cyan-800", border: "border-cyan-200" },
      violet: { bg: "bg-violet-100", text: "text-violet-800", border: "border-violet-200" },
      rose: { bg: "bg-rose-100", text: "text-rose-800", border: "border-rose-200" },
      sky: { bg: "bg-sky-100", text: "text-sky-800", border: "border-sky-200" },
    };
    return colors[color] || { bg: "bg-slate-100", text: "text-slate-800", border: "border-slate-200" };
  };

  const navigationItems = [
  { name: "Dashboard", href: "/dashboard", icon: "fa-home", color: "blue" },
  { name: "Manage Tokens", href: "/dashboard/admin/tokens", icon: "fa-cog", color: "red" },
  { name: "Application Access", href: "/dashboard/admin/application-access", icon: "fa-shield-alt", color: "purple" },
  { name: "User Management", href: "/dashboard/admin/users", icon: "fa-users", color: "green", active: true },
];
  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user?.role !== "admin") {
    return null;
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-purple-50 to-pink-50 overflow-hidden">
      {/* Mobile Menu Button - Only visible on mobile */}
      <button
        onClick={() => setIsSidepanelOpen(!isSidepanelOpen)}
        className="fixed top-4 left-4 z-50 md:hidden bg-gradient-to-r from-purple-500 to-pink-600 text-white p-3 rounded-xl shadow-lg"
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

      {/* Sidepanel - Fixed position */}
      <div
        className={`fixed md:static top-0 left-0 h-full w-64 bg-gradient-to-b from-purple-900 to-pink-900 text-white z-50 transform transition-transform duration-300 ease-in-out ${
          isSidepanelOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 md:z-0 flex-shrink-0`}
      >
        <div className="p-6 border-b border-purple-700">
          <h2 className="text-xl font-bold flex items-center">
            <i className="fas fa-shield-alt mr-2 text-pink-300"></i>
            Admin Panel
          </h2>
        </div>

        <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-80px)]">
          {navigationItems.map((item) => {
            const colorStyle = getColorClass(item.color);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsSidepanelOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                  item.active
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg'
                    : 'text-purple-100 hover:bg-purple-800/50'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  item.active ? 'bg-white/20' : colorStyle.bg + ' ' + colorStyle.text
                }`}>
                  <i className={`fas ${item.icon} text-sm`}></i>
                </div>
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            );
          })}

          <div className="pt-4 mt-4 border-t border-purple-700">
            <Link
              href="/"
              onClick={() => setIsSidepanelOpen(false)}
              className="flex items-center space-x-3 px-4 py-3 rounded-xl text-purple-100 hover:bg-purple-800/50 transition-all"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-800 text-purple-300">
                <i className="fas fa-globe text-sm"></i>
              </div>
              <span className="text-sm font-medium">Homepage</span>
            </Link>
            
            <button
              onClick={() => {
                setIsSidepanelOpen(false);
                router.push('/api/auth/signout');
              }}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-purple-100 hover:bg-purple-800/50 transition-all mt-2"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-800 text-purple-300">
                <i className="fas fa-sign-out-alt text-sm"></i>
              </div>
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content - Scrollable area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-8">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-6 border border-purple-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-700 bg-clip-text text-transparent">
                  Application Access Control
                </h1>
                <p className="text-gray-600 mt-2">
                  Manage user access to applications
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm">
                  <i className="fas fa-user-shield mr-2"></i>
                  {session.user?.email}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 md:px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap text-sm md:text-base ${
                activeTab === 'pending'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <i className="fas fa-clock mr-2"></i>
              Pending ({pendingRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`px-4 md:px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap text-sm md:text-base ${
                activeTab === 'approved'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <i className="fas fa-check-circle mr-2"></i>
              Approved ({approvedAccess.length})
            </button>
            <button
              onClick={() => setActiveTab('applications')}
              className={`px-4 md:px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap text-sm md:text-base ${
                activeTab === 'applications'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <i className="fas fa-apps mr-2"></i>
              Apps ({applications.length})
            </button>
          </div>

          {/* Content */}
          <div className="bg-white rounded-xl shadow-xl overflow-hidden">
            {/* Pending Requests Tab */}
            {activeTab === 'pending' && (
              <>
                <div className="p-4 md:p-6 border-b border-gray-200">
                  <h2 className="text-lg md:text-xl font-semibold text-gray-800">Pending Access Requests</h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {pendingRequests.length > 0 ? (
                    pendingRequests.map((request) => {
                      const colorStyle = getColorClass(request.application.color);
                      return (
                        <div key={request.id} className="p-4 md:p-6 hover:bg-gray-50 transition-colors">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center space-x-4">
                              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colorStyle.bg} ${colorStyle.text}`}>
                                <i className={`fas fa-${getIcon(request.application.icon)} text-base md:text-lg`}></i>
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-gray-800 text-sm md:text-base truncate">
                                  {request.user?.email || "Unknown User"}
                                </h3>
                                <p className="text-xs md:text-sm text-gray-600">
                                  Requested <span className="font-medium">{request.application.name}</span>
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(request.createdAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 ml-14 md:ml-0">
                              <button
                                onClick={() => handleApproveRequest(request.id)}
                                disabled={processingId === request.id}
                                className="px-3 md:px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors text-sm"
                              >
                                {processingId === request.id ? (
                                  <i className="fas fa-spinner fa-spin"></i>
                                ) : (
                                  "Approve"
                                )}
                              </button>
                              <button
                                onClick={() => handleRejectRequest(request.id)}
                                disabled={processingId === request.id}
                                className="px-3 md:px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors text-sm"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-inbox text-gray-400 text-2xl md:text-3xl"></i>
                      </div>
                      <p className="text-gray-600">No pending requests</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Approved Access Tab */}
            {activeTab === 'approved' && (
              <>
                <div className="p-4 md:p-6 border-b border-gray-200">
                  <h2 className="text-lg md:text-xl font-semibold text-gray-800">Approved Access</h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {approvedAccess.length > 0 ? (
                    approvedAccess.map((access) => {
                      const colorStyle = getColorClass(access.application.color);
                      return (
                        <div key={access.id} className="p-4 md:p-6 hover:bg-gray-50 transition-colors">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center space-x-4">
                              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colorStyle.bg} ${colorStyle.text}`}>
                                <i className={`fas fa-${getIcon(access.application.icon)} text-base md:text-lg`}></i>
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-gray-800 text-sm md:text-base truncate">
                                  {access.user?.email || "Unknown User"}
                                </h3>
                                <p className="text-xs md:text-sm text-gray-600">
                                  Has access to <span className="font-medium">{access.application.name}</span>
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(access.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRevokeAccess(access.id)}
                              disabled={processingId === access.id}
                              className="px-3 md:px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors text-sm ml-14 md:ml-0"
                            >
                              {processingId === access.id ? (
                                <i className="fas fa-spinner fa-spin"></i>
                              ) : (
                                "Revoke"
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-check-circle text-gray-400 text-2xl md:text-3xl"></i>
                      </div>
                      <p className="text-gray-600">No approved access records</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Applications Tab */}
            {activeTab === 'applications' && (
              <>
                <div className="p-4 md:p-6 border-b border-gray-200">
                  <h2 className="text-lg md:text-xl font-semibold text-gray-800">Applications</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 md:p-6">
                  {applications.length > 0 ? (
                    applications.map((app) => {
                      const colorStyle = getColorClass(app.color);
                      return (
                        <div key={app.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorStyle.bg} ${colorStyle.text}`}>
                              <i className={`fas fa-${getIcon(app.icon)} text-sm md:text-lg`}></i>
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-semibold text-gray-800 text-sm md:text-base truncate">{app.name}</h3>
                              <p className="text-xs text-gray-500 truncate">slug: {app.slug}</p>
                            </div>
                          </div>
                          <p className="text-xs md:text-sm text-gray-600 mb-3 line-clamp-2">{app.description}</p>
                          <div className="flex items-center justify-between">
                            <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium ${
                              app.requiresApproval
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {app.requiresApproval ? 'Requires Approval' : 'Open Access'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-2 text-center py-12">
                      <p className="text-gray-600">No applications found</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}