"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";

interface UserAnalytics {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    createdAt: string;
  };
  overallStats: {
    totalSessions: number;
    totalTimeSpent: number;
    averageScore: number;
    uniqueApps: number;
  };
  appPerformance: Array<{
    applicationId: string;
    applicationName: string;
    applicationIcon: string;
    applicationColor: string;
    totalAttempts: number;
    correctAttempts: number;
    averageScore: number;
    totalTimeSpent: number;
    lastAttemptAt: string | null;
  }>;
  categoryPerformance: Array<{
    category: string;
    totalAttempts: number;
    correctAttempts: number;
    averageScore: number;
    successRate: number;
  }>;
  recentActivity: Array<{
    id: string;
    activityType: string;
    metadata: any;
    createdAt: string;
    applicationName: string;
    applicationIcon: string;
  }>;
  weakAreas: Array<{
    category: string;
    totalAttempts: number;
    correctAttempts: number;
    averageScore: number;
    successRate: number;
  }>;
  strongAreas: Array<{
    category: string;
    totalAttempts: number;
    correctAttempts: number;
    averageScore: number;
    successRate: number;
  }>;
  recommendations: Array<{
    type: string;
    title: string;
    description: string;
    priority: string;
  }>;
}

export default function UserAnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const userId = params?.userId as string;
  
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("all");
  const [selectedApp, setSelectedApp] = useState("all");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && session?.user?.role !== "admin") {
      router.push("/dashboard");
      return;
    }

    if (userId) {
      fetchAnalytics();
    }
  }, [session, status, router, userId, period, selectedApp]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/analytics/users/${userId}?period=${period}&app=${selectedApp}`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const data = await res.json();
      setAnalytics(data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-100";
    if (score >= 60) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "border-l-4 border-red-500 bg-red-50";
      case "medium": return "border-l-4 border-yellow-500 bg-yellow-50";
      default: return "border-l-4 border-green-500 bg-green-50";
    }
  };

  const getIcon = (icon: string) => {
    return icon.replace('fa-', '');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/dashboard/admin/users"
                className="text-blue-600 hover:text-blue-800 mb-2 inline-flex items-center"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Back to Users
              </Link>
              <h1 className="text-2xl font-bold text-gray-800">
                User Analytics: {analytics.user.name || analytics.user.email}
              </h1>
              <p className="text-gray-600 mt-1">Performance insights and recommendations</p>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="year">Last Year</option>
              </select>
              <select
                value={selectedApp}
                onChange={(e) => setSelectedApp(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Applications</option>
                {analytics.appPerformance.map((app) => (
                  <option key={app.applicationId} value={app.applicationName.toLowerCase()}>
                    {app.applicationName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-800">{analytics.overallStats.totalSessions}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <i className="fas fa-calendar-alt text-blue-600 text-xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Time</p>
                <p className="text-2xl font-bold text-gray-800">{formatTime(analytics.overallStats.totalTimeSpent)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <i className="fas fa-clock text-green-600 text-xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Average Score</p>
                <p className="text-2xl font-bold text-gray-800">{analytics.overallStats.averageScore.toFixed(1)}%</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <i className="fas fa-chart-line text-purple-600 text-xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Applications Used</p>
                <p className="text-2xl font-bold text-gray-800">{analytics.overallStats.uniqueApps}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <i className="fas fa-apps text-amber-600 text-xl"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {analytics.recommendations.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Recommendations</h2>
            <div className="space-y-3">
              {analytics.recommendations.map((rec, idx) => (
                <div key={idx} className={`p-4 rounded-xl ${getPriorityColor(rec.priority)}`}>
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      {rec.type === "improvement" && <i className="fas fa-chart-line text-red-600 text-lg"></i>}
                      {rec.type === "strength" && <i className="fas fa-trophy text-green-600 text-lg"></i>}
                      {rec.type === "engagement" && <i className="fas fa-rocket text-yellow-600 text-lg"></i>}
                      {rec.type === "general" && <i className="fas fa-lightbulb text-blue-600 text-lg"></i>}
                    </div>
                    <div className="ml-3">
                      <h3 className="font-semibold text-gray-800">{rec.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weak Areas */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <i className="fas fa-exclamation-triangle text-red-500 mr-2"></i>
              Weak Areas (Needs Improvement)
            </h2>
            {analytics.weakAreas.length > 0 ? (
              <div className="space-y-4">
                {analytics.weakAreas.map((area, idx) => (
                  <div key={idx} className="border-l-4 border-red-500 pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-800">{area.category}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(area.successRate)}`}>
                        {area.successRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full transition-all"
                        style={{ width: `${area.successRate}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {area.totalAttempts} attempts • {area.correctAttempts} correct
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No weak areas identified</p>
            )}
          </div>

          {/* Strong Areas */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <i className="fas fa-trophy text-green-500 mr-2"></i>
              Strong Areas (Excellent Performance)
            </h2>
            {analytics.strongAreas.length > 0 ? (
              <div className="space-y-4">
                {analytics.strongAreas.map((area, idx) => (
                  <div key={idx} className="border-l-4 border-green-500 pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-800">{area.category}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(area.successRate)}`}>
                        {area.successRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${area.successRate}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {area.totalAttempts} attempts • {area.correctAttempts} correct
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No strong areas identified yet</p>
            )}
          </div>
        </div>

        {/* Application Performance */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <i className="fas fa-chart-bar text-blue-500 mr-2"></i>
            Application Performance
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4">Application</th>
                  <th className="text-left py-3 px-4">Attempts</th>
                  <th className="text-left py-3 px-4">Correct</th>
                  <th className="text-left py-3 px-4">Avg Score</th>
                  <th className="text-left py-3 px-4">Time Spent</th>
                  <th className="text-left py-3 px-4">Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {analytics.appPerformance.map((app) => {
                  const colorClass = `bg-${app.applicationColor}-100 text-${app.applicationColor}-800`;
                  return (
                    <tr key={app.applicationId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClass}`}>
                            <i className={`fas fa-${getIcon(app.applicationIcon)} text-sm`}></i>
                          </div>
                          <span className="font-medium">{app.applicationName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">{app.totalAttempts}</td>
                      <td className="py-3 px-4">{app.correctAttempts}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(app.averageScore)}`}>
                          {app.averageScore.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4">{formatTime(app.totalTimeSpent)}</td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {app.lastAttemptAt ? new Date(app.lastAttemptAt).toLocaleDateString() : "Never"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <i className="fas fa-history text-purple-500 mr-2"></i>
            Recent Activity
          </h2>
          <div className="space-y-3">
            {analytics.recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between py-3 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <i className={`fas fa-${getIcon(activity.applicationIcon)} text-sm`}></i>
                  </div>
                  <div>
                    <p className="text-sm text-gray-800">
                      {activity.activityType === "session_complete" && "Completed a session"}
                      {activity.activityType === "question_attempt" && "Attempted a question"}
                      {activity.activityType === "score" && `Scored ${activity.metadata?.score}%`}
                    </p>
                    <p className="text-xs text-gray-500">{activity.applicationName}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(activity.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}