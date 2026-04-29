"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  role: string;
  tokenBalance: number;
  createdAt: string;
}

export default function PasswordResetConsole() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [resetInProgress, setResetInProgress] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (session?.user?.role !== "admin") {
      router.push("/dashboard");
    } else {
      fetchUsers();
    }
  }, [session, status, router]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetLink = async (user: User) => {
    setSelectedUser(user);
    setShowConfirmModal(true);
  };

  const confirmSendResetLink = async () => {
    if (!selectedUser) return;

    setResetInProgress(selectedUser.id);
    setShowConfirmModal(false);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: selectedUser.email }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`Password reset link sent to ${selectedUser.email}`);
      } else {
        toast.error(data.error || "Failed to send reset link");
      }
    } catch (error) {
      toast.error("Failed to send reset link");
    } finally {
      setResetInProgress(null);
      setSelectedUser(null);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                Password Reset Console
              </h1>
              <p className="text-slate-600 mt-2">
                Manage password resets for imported users
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6 border border-blue-100">
          <div className="relative">
            <i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
            <input
              type="text"
              placeholder="Search users by email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-blue-100">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Token Balance</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Joined</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mr-3">
                          <i className="fas fa-user text-white text-sm"></i>
                        </div>
                        <span className="text-sm font-medium text-slate-800">
                          {user.email || "No email"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <i className="fas fa-coins text-amber-400 mr-2"></i>
                        <span className="text-sm text-slate-800">{user.tokenBalance}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleSendResetLink(user)}
                        disabled={resetInProgress === user.id}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50 transition-all duration-300 text-sm"
                      >
                        {resetInProgress === user.id ? (
                          <i className="fas fa-spinner fa-spin"></i>
                        ) : (
                          <>
                            <i className="fas fa-key mr-2"></i>
                            Send Reset Link
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-users text-slate-400 text-3xl"></i>
              </div>
              <p className="text-slate-600">No users found</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedUser && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mr-4">
                <i className="fas fa-exclamation-triangle text-amber-600 text-xl"></i>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Confirm Password Reset</h3>
                <p className="text-sm text-slate-600">
                  Send reset link to {selectedUser.email}
                </p>
              </div>
            </div>
            <p className="text-slate-600 mb-6">
              This will send a password reset email to the user. They will have 1 hour to reset their password.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSendResetLink}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all"
              >
                Send Reset Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}