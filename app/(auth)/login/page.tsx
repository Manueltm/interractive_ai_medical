// C:\Users\User\Desktop\New Cloned\academy\acemedixacademy\app\(auth)\login\page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { useEffect, useState, Suspense } from "react";

// Create a separate component that uses useSearchParams
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { update: updateSession } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        await updateSession();
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  };

  useEffect(() => {
    if (searchParams.get("guest") === "1") {
      // Guest login removed - redirect to home
      router.push("/");
    }
  }, [searchParams]);

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Left Side - Sign In Form */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-lg py-8">
          {/* Header with Logo */}
          <div className="text-center mb-10">
            <Link href="/" className="inline-flex items-center space-x-3 mb-8 group">
              <div className="w-14 h-14 rounded-xl overflow-hidden shadow-md bg-white flex items-center justify-center transition-all group-hover:scale-110 border border-blue-100">
                <Image
                  src="/uploads/acelogo.png"
                  alt="Acemedix Academy Logo"
                  width={56}
                  height={56}
                  className="object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.classList.add('bg-gradient-to-r', 'from-blue-500', 'to-blue-600');
                      const icon = document.createElement('i');
                      icon.className = 'fas fa-stethoscope text-white text-2xl';
                      parent.appendChild(icon);
                    }
                  }}
                />
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                  Acemedix Academy
                </h1>
                <p className="text-sm text-slate-500">
                  Medical Education Platform
                </p>
              </div>
            </Link>
            
            <h2 className="text-3xl font-bold text-slate-800 mb-3">
              Welcome Back
            </h2>
            <p className="text-base text-slate-600">
              Sign in to continue your medical education journey
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-3xl shadow-2xl p-10 border border-blue-100">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                  <i className="fas fa-exclamation-circle mr-2"></i>
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-slate-900 placeholder:text-slate-400"
                    placeholder="student@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-slate-900 placeholder:text-slate-400"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4"
                  />
                  <span className="ml-2 text-sm text-slate-600 cursor-pointer">
                    Remember me
                  </span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:shadow-lg hover:from-blue-600 hover:to-indigo-700"
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-sign-in-alt"></i>
                    <span>Sign In</span>
                  </>
                )}
              </button>

              <div className="relative flex items-center justify-center my-6">
                <div className="flex-grow border-t border-slate-300"></div>
                <span className="mx-4 text-sm text-slate-500">
                  Or continue with
                </span>
                <div className="flex-grow border-t border-slate-300"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 border border-slate-300 rounded-xl transition-colors disabled:opacity-50 text-slate-700 hover:bg-slate-50"
              >
                <i className="fab fa-google text-red-500"></i>
                <span>Continue with Google</span>
              </button>

              <div className="text-center mt-6">
                <p className="text-sm text-slate-600">
                  Don't have an account?{" "}
                  <Link
                    href="/register"
                    className="font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Sign up free
                  </Link>
                </p>
              </div>
            </form>
          </div>

          {/* Back to Home Button */}
          <div className="text-center mt-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-blue-600 border border-slate-200 shadow-sm hover:shadow-md group"
            >
              <i className="fas fa-arrow-left text-sm group-hover:-translate-x-1 transition-transform"></i>
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Right Side - Hero Image */}
      <div className="hidden lg:block flex-1 relative bg-gradient-to-br from-blue-600 to-indigo-700 h-full">
        <div className="absolute inset-0 bg-black/20 z-10"></div>
        <Image
          src="/uploads/ace_signin.jpg"
          alt="Medical Education"
          fill
          className="object-cover"
          priority
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.classList.add('bg-gradient-to-br', 'from-blue-600', 'to-indigo-700');
              const fallbackDiv = document.createElement('div');
              fallbackDiv.className = 'absolute inset-0 flex items-center justify-center z-20';
              fallbackDiv.innerHTML = `
                <div class="text-center text-white p-8">
                  <i class="fas fa-stethoscope text-6xl mb-4"></i>
                  <h2 class="text-3xl font-bold mb-2">Acemedix Academy</h2>
                  <p class="text-lg">Your AI-Powered Medical Education Partner</p>
                </div>
              `;
              parent.appendChild(fallbackDiv);
            }
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-8 z-20">
          <div className="text-white text-center">
            <h3 className="text-2xl font-bold mb-2">Start Your Journey Today</h3>
            <p className="text-white/90">Join thousands of medical professionals who passed their exams with Acemedix Academy</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function Page() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-3xl text-blue-600"></i>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}