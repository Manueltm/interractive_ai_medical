"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserApplicationsModal } from "./components/UserApplicationsModal";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

interface User {
  id: string;
  email: string | null;
  role: "user" | "admin";
  tokenBalance: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  approvedAppsCount: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function UserManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isEdgeHovering, setIsEdgeHovering] = useState(false);
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [showApplicationsModal, setShowApplicationsModal] = useState(false);
  const [selectedUserForApps, setSelectedUserForApps] = useState<User | null>(null);
  
  const fetchInProgress = useRef(false);
  const lastFetchParams = useRef<string>("");

  // Sidebar edge hover effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientX <= 20 && !isSidebarOpen) {
        setIsEdgeHovering(true);
      } else if (e.clientX > 250 && isEdgeHovering) {
        setIsEdgeHovering(false);
      }
    };

    const handleMouseLeave = () => setIsEdgeHovering(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isSidebarOpen, isEdgeHovering]);

  useEffect(() => {
    if (isEdgeHovering && !isSidebarOpen) {
      setIsSidebarOpen(true);
      setIsEdgeHovering(false);
    }
  }, [isEdgeHovering, isSidebarOpen]);

  // Desktop auto-open
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    setIsSidebarOpen(mql.matches);
    const listener = (e: MediaQueryListEvent) => setIsSidebarOpen(e.matches);
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-sidebar-open', String(isSidebarOpen));
  }, [isSidebarOpen]);

  const fetchUsers = useCallback(async (silent = false) => {
    if (fetchInProgress.current) return;
    
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      limit: pagination.limit.toString(),
      ...(searchTerm && { search: searchTerm }),
      ...(roleFilter && { role: roleFilter }),
      ...(statusFilter && { status: statusFilter }),
    });
    
    const paramsKey = params.toString();
    
    if (lastFetchParams.current === paramsKey && !silent) return;
    
    fetchInProgress.current = true;
    lastFetchParams.current = paramsKey;
    
    if (!silent) setLoading(true);
    
    try {
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      
      const data = await res.json();
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching users:", error);
      if (!silent) toast.error("Failed to load users");
    } finally {
      fetchInProgress.current = false;
      if (!silent) setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchTerm, roleFilter, statusFilter]);

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
      fetchUsers();
    }
  }, [session, status, router, fetchUsers]);

  const handleManageApplications = (user: User) => {
    setSelectedUserForApps(user);
    setShowApplicationsModal(true);
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    setProcessingId(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          action: "update-role",
          value: newRole,
        }),
      });

      if (res.ok) {
        toast.success("User role updated");
        fetchUsers(true);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to update role");
      }
    } catch (error) {
      toast.error("Failed to update role");
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdateTokens = async (userId: string, newBalance: number) => {
    setProcessingId(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          action: "update-tokens",
          value: newBalance,
        }),
      });

      if (res.ok) {
        toast.success("Token balance updated");
        fetchUsers(true);
        setShowEditModal(false);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to update tokens");
      }
    } catch (error) {
      toast.error("Failed to update tokens");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setProcessingId(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          action: "delete",
        }),
      });

      if (res.ok) {
        toast.success("User deleted");
        fetchUsers(true);
        setShowDeleteModal(false);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete user");
      }
    } catch (error) {
      toast.error("Failed to delete user");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      admin: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800",
      active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800",
      inactive: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700",
      banned: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800",
    };
    return colors[status] || colors.active;
  };

  const getRoleBadge = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-gradient-to-r from-purple-100 to-violet-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800';
      case 'premium':
        return 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
      default:
        return 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
    }
  };

  const navItems = [
    {
      title: 'User Management',
      icon: 'fa-users',
      children: [
        { title: 'All Users', href: '/dashboard/admin/users', target: 'users', icon: 'fa-users', active: true },
        { title: 'User Roles', href: '/dashboard/admin/roles', target: 'roles', icon: 'fa-user-shield' },
        { title: 'Activity Log', href: '/dashboard/admin/activity', target: 'activity', icon: 'fa-history' },
      ]
    },
    {
      title: 'Token Management',
      icon: 'fa-coins',
      children: [
        { title: 'Token Packages', href: '/dashboard/admin/tokens', target: 'packages', icon: 'fa-box' },
        { title: 'Usage Rates', href: '/dashboard/admin/tokens', target: 'rates', icon: 'fa-tachometer-alt' },
        { title: 'Assign Tokens', href: '/dashboard/admin/tokens', target: 'assign', icon: 'fa-user-plus' },
        { title: 'Analytics', href: '/dashboard/admin/tokens', target: 'analytics', icon: 'fa-chart-pie' },
      ]
    },
    {
      title: 'Content Management',
      icon: 'fa-cogs',
      children: [
        { title: 'CBT Questions', href: '/dashboard/admin/questions', target: 'questions', icon: 'fa-question-circle' },
        { title: 'OSCE Cases', href: '/dashboard/admin/cases', target: 'cases', icon: 'fa-briefcase-medical' },
        { title: 'Flashcards', href: '/dashboard/admin/flashcards', target: 'flashcards', icon: 'fa-book-open' },
        { title: 'Discussion Posts', href: '/dashboard/admin/posts', target: 'posts', icon: 'fa-comments' },
      ]
    },
    { title: 'Back to User Dashboard', href: '/dashboard', target: 'dashboard', icon: 'fa-arrow-left' },
  ];

  const getIconColor = (index: number) => {
    const colors = [
      'text-purple-400',
      'text-indigo-400',
      'text-violet-400',
      'text-fuchsia-400',
    ];
    return colors[index % colors.length];
  };

  const getChildIconColor = (index: number) => {
    const colors = [
      'text-purple-300',
      'text-indigo-300',
      'text-violet-300',
      'text-fuchsia-300',
    ];
    return colors[index % colors.length];
  };

  const toggleMenu = (title: string) => {
    setOpenMenus(prev => prev.includes(title) ? [] : [title]);
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user?.role !== "admin") {
    return null;
  }

  return (
    <>
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* SIDEBAR */}
        <aside className={cn(
          "fixed md:sticky top-0 h-screen z-50 shadow-lg overflow-y-auto transition-all duration-300 ease-in-out",
          isSidebarOpen ? "w-64" : "w-0 md:w-0",
          "bg-gradient-to-b from-slate-800 via-purple-900 to-violet-900 flex flex-col"
        )}>
          <div className="p-6 border-b border-purple-700 flex items-center justify-between flex-shrink-0">
            <Link href="/dashboard/admin" className="text-xl font-bold text-white hover:text-purple-200 transition-colors">
              <img src="/uploads/acedashboard.png" alt="Acemedix Academy" className="h-8 w-auto" />
              <span className="ml-2 text-sm text-purple-300">Admin</span>
            </Link>
            <button className="md:hidden text-white hover:text-purple-200" onClick={() => setIsSidebarOpen(false)}>
              <i className="fas fa-times" />
            </button>
            <button className="hidden md:block text-white hover:text-purple-200" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <i className={`fas fa-${isSidebarOpen ? 'chevron-left' : 'chevron-right'}`} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
            {navItems.map((item, index) => (
              <div key={item.title} className="border-b border-purple-700/50 last:border-b-0">
                {item.children ? (
                  <>
                    <button
                      onClick={() => toggleMenu(item.title)}
                      className="block w-full text-left rounded-xl px-4 py-3 text-white hover:bg-purple-700/30 flex items-center justify-between group"
                    >
                      <span className="flex items-center">
                        <i className={`fas ${item.icon} mr-3 text-lg ${getIconColor(index)} group-hover:scale-110 transition-transform`} />
                        {item.title}
                      </span>
                      <i className={`fas fa-chevron-${openMenus.includes(item.title) ? 'down' : 'right'} text-purple-300 text-xs`} />
                    </button>
                    {openMenus.includes(item.title) && (
                      <div className="ml-4 space-y-1 mt-2">
                        {item.children.map((child, childIndex) => (
                          <Link
                            key={child.title}
                            href={child.href}
                            className={cn(
                              "block w-full text-left rounded-lg px-4 py-2 text-sm text-purple-100 hover:text-white hover:bg-purple-600/30 flex items-center group",
                              child.active ? 'bg-purple-700/40' : ''
                            )}
                          >
                            <i className={`fas ${child.icon} mr-2 ${getChildIconColor(childIndex)} group-hover:scale-110 transition-transform`} />
                            {child.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href!}
                    className="block w-full text-left rounded-xl px-4 py-3 text-white hover:bg-purple-700/30 flex items-center group"
                  >
                    <i className={`fas ${item.icon} mr-3 text-lg ${getIconColor(index)} group-hover:scale-110 transition-transform`} />
                    {item.title}
                  </Link>
                )}
              </div>
            ))}
            <form action="/api/auth/signout" method="post">
              <button className="block w-full text-left rounded-xl px-4 py-3 text-white hover:bg-purple-700/30 flex items-center group mt-4">
                <i className="fas fa-sign-out-alt mr-3 text-lg text-rose-400 group-hover:scale-110 transition-transform" />
                Logout
              </button>
            </form>
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 flex flex-col min-h-screen overflow-y-auto w-full">
          {/* Top Bar */}
          <header className="flex items-center justify-between bg-white shadow-sm px-4 md:px-6 py-4 border-b border-purple-50 dark:bg-gray-900 dark:border-gray-800">
            <div className="flex items-center space-x-2 md:space-x-4">
              <button
                className="text-foreground hover:text-primary p-2 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                <i className="fas fa-bars text-lg"></i>
              </button>
              <h2 className="text-lg md:text-xl font-semibold text-gray-800 dark:text-white">User Management</h2>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="hidden sm:block">
                <div className="px-4 py-2 bg-gradient-to-r from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30 rounded-xl border border-purple-300 dark:border-purple-800">
                  <div className="flex items-center">
                    <i className="fas fa-user-shield text-purple-600 dark:text-purple-400 mr-2"></i>
                    <span className="font-semibold text-purple-800 dark:text-purple-300">Administrator</span>
                  </div>
                </div>
              </div>
              <ThemeToggle />
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(session?.user?.name || session?.user?.email || 'Admin')}&background=7c3aed&color=ffffff`}
                alt="avatar"
                className="h-8 w-8 rounded-full border-2 border-purple-300 dark:border-purple-700"
              />
            </div>
          </header>

          {/* Admin Badge Mobile */}
          <div className="sm:hidden mx-4 mt-4">
            <div className="px-4 py-2 bg-gradient-to-r from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30 rounded-xl border border-purple-300 dark:border-purple-800">
              <div className="flex items-center justify-center">
                <i className="fas fa-user-shield text-purple-600 dark:text-purple-400 mr-2"></i>
                <span className="font-semibold text-purple-800 dark:text-purple-300">Administrator</span>
              </div>
            </div>
          </div>

          {/* Breadcrumbs */}
          <nav className="bg-gradient-to-r from-purple-50/80 to-violet-100/60 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl p-4 mb-6 shadow-inner border border-purple-200/50 dark:border-purple-800/50 mx-4 md:mx-6 mt-4">
            <div className="flex items-center gap-2 md:gap-3 text-sm">
              <Link href="/dashboard/admin" className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-medium flex items-center">
                <i className="fas fa-home mr-1 md:mr-2"></i>
                <span className="hidden sm:inline">Admin Dashboard</span>
              </Link>
              <i className="fas fa-chevron-right text-purple-600/60 dark:text-purple-400/60 text-xs"></i>
              <span className="text-purple-800 dark:text-purple-300 font-semibold flex items-center">
                <i className="fas fa-users mr-1 md:mr-2"></i>
                User Management
              </span>
            </div>
          </nav>

          {/* Page Content */}
          <div className="flex-1 p-4 md:p-6 pb-24">
            {/* Header Section */}
            <div className="bg-gradient-to-br from-white/95 to-purple-50/95 dark:from-gray-800/95 dark:to-purple-900/30 rounded-2xl shadow-lg p-6 md:p-8 border border-purple-300 dark:border-purple-800 backdrop-blur-sm mb-8">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="flex-1">
                  <h2 className="text-2xl md:text-3xl font-bold flex items-center justify-center lg:justify-start text-slate-800 dark:text-white">
                    <i className="fas fa-users mr-3 md:mr-4 text-purple-500 dark:text-purple-400"></i>
                    User Management
                  </h2>
                  <p className="text-slate-600 dark:text-gray-400 mt-2 md:mt-3 text-base md:text-lg text-center lg:text-left">
                    Manage users, roles, and permissions
                  </p>
                </div>
                <div className="bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl p-5 md:p-6 shadow-lg w-full lg:w-auto">
                  <div className="text-center">
                    <div className="text-sm text-purple-100 mb-2 flex items-center justify-center">
                      <i className="fas fa-user-shield mr-2"></i>
                      Admin Privileges Active
                    </div>
                    <div className="text-2xl md:text-3xl font-bold text-white">
                      {session?.user?.name || 'Administrator'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{pagination.total}</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <i className="fas fa-users text-blue-600 dark:text-blue-400"></i>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Tokens</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">
                      {users.reduce((sum, user) => sum + user.tokenBalance, 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                    <i className="fas fa-coins text-amber-600 dark:text-amber-400"></i>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Avg Tokens/User</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">
                      {users.length > 0 
                        ? (users.reduce((sum, user) => sum + user.tokenBalance, 0) / users.length).toFixed(2)
                        : "0.00"}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <i className="fas fa-chart-line text-green-600 dark:text-green-400"></i>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 md:p-6 mb-6 border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Search Users
                  </label>
                  <div className="relative">
                    <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    <input
                      type="text"
                      placeholder="Search by email or ID..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setPagination(prev => ({ ...prev, page: 1 }));
                      }}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Role Filter
                  </label>
                  <select
                    value={roleFilter}
                    onChange={(e) => {
                      setRoleFilter(e.target.value);
                      setPagination(prev => ({ ...prev, page: 1 }));
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">All Roles</option>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status Filter
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPagination(prev => ({ ...prev, page: 1 }));
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="admin">Admin</option>
                    <option value="inactive">Inactive</option>
                    <option value="banned">Banned</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-purple-500 to-violet-600 text-white">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold">User</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Role</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Tokens</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Apps Access</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Joined</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                          </div>
                        </td>
                      </tr>
                    ) : users.length > 0 ? (
                      users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-violet-500 rounded-full flex items-center justify-center mr-3">
                                <i className="fas fa-user text-white text-sm"></i>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {user.email || "No email"}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  ID: {user.id.slice(0, 8)}...
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={user.role}
                              onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                              disabled={processingId === user.id}
                              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(user.status)}`}>
                              {user.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <i className="fas fa-coins text-amber-400 dark:text-amber-500"></i>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{user.tokenBalance.toFixed(4)}</span>
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowEditModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 ml-2"
                                title="Edit tokens"
                              >
                                <i className="fas fa-edit text-xs"></i>
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-medium">
                              {user.approvedAppsCount} apps
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {formatDate(user.createdAt)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleManageApplications(user)}
                                className="p-2 text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                                title="Manage application access"
                              >
                                <i className="fas fa-shield-alt"></i>
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowEditModal(true);
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                title="Edit user"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                onClick={() => router.push(`/dashboard/admin/analytics/user/${user.id}`)}
                                className="p-2 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                                title="View Analytics"
                              >
                                <i className="fas fa-chart-line"></i>
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowDeleteModal(true);
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                title="Delete user"
                                disabled={user.role === 'admin' && user.id !== session.user?.id}
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                          No users found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-lg">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page === pagination.totalPages}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Footer - Same as tokens page */}
      <footer className="fixed bottom-0 left-0 right-0 z-10 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-gray-900 dark:to-gray-800 border-t border-purple-100 dark:border-gray-700 py-4 md:py-6">
        <div className="max-w-7xl mx-auto px-4 md:px-6 text-center text-xs md:text-sm text-slate-600 dark:text-gray-400">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-2 md:mb-0">
              © 2025 Acemedix Academy Admin Dashboard. All rights reserved.
            </div>
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <i className="fas fa-user-shield text-purple-500 dark:text-purple-400 mr-2"></i>
                Administrator Mode
              </span>
              <span className="hidden md:inline">|</span>
              <span className="text-slate-500 dark:text-gray-500">
                Last updated: {new Date().toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* User Applications Modal */}
      {showApplicationsModal && selectedUserForApps && (
        <UserApplicationsModal
          isOpen={showApplicationsModal}
          onClose={() => {
            setShowApplicationsModal(false);
            setSelectedUserForApps(null);
            fetchUsers(true);
          }}
          userId={selectedUserForApps.id}
          userEmail={selectedUserForApps.email}
        />
      )}
      
      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Edit User</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={selectedUser.email || ""}
                  disabled
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Token Balance <span className="text-xs text-gray-500 dark:text-gray-400">(up to 4 decimal places)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={selectedUser.tokenBalance}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        const rounded = Math.round(value * 10000) / 10000;
                        setSelectedUser({
                          ...selectedUser,
                          tokenBalance: rounded
                        });
                      } else {
                        setSelectedUser({
                          ...selectedUser,
                          tokenBalance: 0
                        });
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                    placeholder="0.0000"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500">
                    max 4 decimals
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role
                </label>
                <select
                  value={selectedUser.role}
                  onChange={(e) => setSelectedUser({
                    ...selectedUser,
                    role: e.target.value as 'user' | 'admin'
                  })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleUpdateRole(selectedUser.id, selectedUser.role);
                  handleUpdateTokens(selectedUser.id, selectedUser.tokenBalance);
                }}
                disabled={processingId === selectedUser.id}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50 transition-all"
              >
                {processingId === selectedUser.id ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mr-4">
                <i className="fas fa-exclamation-triangle text-red-600 dark:text-red-400 text-xl"></i>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Delete User</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Are you sure you want to delete this user?
                </p>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This action cannot be undone. The user will be permanently deleted from the system.
            </p>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">User: {selectedUser.email}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">ID: {selectedUser.id}</p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(selectedUser.id)}
                disabled={processingId === selectedUser.id}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {processingId === selectedUser.id ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  "Delete User"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}