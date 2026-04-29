"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setSubmitted(true);
        toast.success(data.message || "Reset link sent successfully!");
      } else {
        // Handle 404 specifically for email not found
        if (res.status === 404) {
          toast.error(data.error || "Email does not exist on Acemedix Academy platform");
        } else {
          toast.error(data.error || "Failed to send reset link");
        }
      }
    } catch (error) {
      toast.error("Failed to send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-envelope text-green-600 text-3xl"></i>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Check Your Email</h2>
            <p className="text-slate-600 mb-6">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            <Link
              href="/login"
              className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all"
            >
              Return to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <i className="fas fa-stethoscope text-white text-xl"></i>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
              Acemedix Academy
            </span>
          </Link>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Reset Password</h2>
          <p className="text-slate-600">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-blue-100">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="student@example.com"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Sending...
                </span>
              ) : (
                "Send Reset Link"
              )}
            </button>

            <div className="text-center mt-6">
              <Link
                href="/login"
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Back to Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}