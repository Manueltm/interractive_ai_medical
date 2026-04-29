// C:\Users\User\Desktop\New Cloned\academy\acemedixacademy\app\(auth)\register\page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";

export default function Page() {
  const router = useRouter();
  const { update: updateSession } = useSession();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Check password strength
  useEffect(() => {
    const calculateStrength = () => {
      let strength = 0;
      if (formData.password.length >= 8) strength += 25;
      if (/[A-Z]/.test(formData.password)) strength += 25;
      if (/[0-9]/.test(formData.password)) strength += 25;
      if (/[^A-Za-z0-9]/.test(formData.password)) strength += 25;
      setPasswordStrength(strength);
    };
    calculateStrength();
  }, [formData.password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!formData.agreeTerms) {
      setError("You must agree to the terms and conditions");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      // Auto login after registration
      const result = await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });

      if (result?.error) {
        throw new Error("Auto-login failed");
      }

      await updateSession();
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  };

  const getStrengthColor = () => {
    if (passwordStrength >= 75) return "bg-green-500";
    if (passwordStrength >= 50) return "bg-amber-500";
    if (passwordStrength >= 25) return "bg-orange-500";
    return "bg-red-500";
  };

  const getStrengthText = () => {
    if (passwordStrength >= 75) return "Strong";
    if (passwordStrength >= 50) return "Medium";
    if (passwordStrength >= 25) return "Weak";
    return "Very Weak";
  };

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Left Side - Registration Form */}
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
              Create Your Account
            </h2>
            <p className="text-base text-slate-600">
              Start your medical education journey with AI-powered learning
            </p>
          </div>

          {/* Registration Card */}
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
                  Full Name
                </label>
                <div className="relative">
                  <i className="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full pl-11 pr-4 py-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-slate-900 placeholder:text-slate-400"
                    placeholder="Dr. John Doe"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
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
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full pl-11 pr-4 py-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-slate-900 placeholder:text-slate-400"
                    placeholder="Create a strong password"
                    required
                  />
                </div>
                {formData.password && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-600">Password strength:</span>
                      <span className={`font-medium ${
                        passwordStrength >= 75 ? 'text-green-600' :
                        passwordStrength >= 50 ? 'text-amber-600' :
                        passwordStrength >= 25 ? 'text-orange-600' :
                        'text-red-600'
                      }`}>
                        {getStrengthText()} ({passwordStrength}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getStrengthColor()} transition-all duration-300`}
                        style={{ width: `${passwordStrength}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {passwordStrength < 75 && "Use 8+ characters with uppercase, numbers, and symbols for a strong password"}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <i className="fas fa-check-circle absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    className="w-full pl-11 pr-4 py-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-slate-900 placeholder:text-slate-400"
                    placeholder="Confirm your password"
                    required
                  />
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-red-600 mt-1">
                    <i className="fas fa-exclamation-circle mr-1"></i>
                    Passwords do not match
                  </p>
                )}
              </div>

              <div className="flex items-start">
                <input
                  type="checkbox"
                  checked={formData.agreeTerms}
                  onChange={(e) => setFormData({...formData, agreeTerms: e.target.checked})}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-1 cursor-pointer w-4 h-4"
                />
                <label className="ml-2 text-sm text-slate-600">
                  I agree to the{" "}
                  <Link href="/terms" className="text-blue-600 hover:text-blue-800 font-medium">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-blue-600 hover:text-blue-800 font-medium">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-user-plus"></i>
                    <span>Create Account</span>
                  </>
                )}
              </button>

              <div className="relative flex items-center justify-center my-6">
                <div className="flex-grow border-t border-slate-300"></div>
                <span className="mx-4 text-sm text-slate-500">Or sign up with</span>
                <div className="flex-grow border-t border-slate-300"></div>
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleGoogleSignUp}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 border border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors text-slate-700"
                >
                  <i className="fab fa-google text-red-500"></i>
                  <span>Continue with Google</span>
                </button>
              </div>

              <div className="text-center mt-6">
                <p className="text-sm text-slate-600">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="text-blue-600 font-semibold hover:text-blue-800 transition-colors"
                  >
                    Sign in
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
          src="/uploads/ace_reg.jpg"
          alt="Medical Education Registration"
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
                  <i class="fas fa-user-plus text-6xl mb-4"></i>
                  <h2 class="text-3xl font-bold mb-2">Join Acemedix Academy</h2>
                  <p class="text-lg">Start your journey to medical excellence today</p>
                </div>
              `;
              parent.appendChild(fallbackDiv);
            }
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-8 z-20">
          <div className="text-white text-center">
            <h3 className="text-2xl font-bold mb-2">Join Our Community</h3>
            <p className="text-white/90">Get access to AI-powered learning, expert content, and personalized study plans</p>
          </div>
        </div>
      </div>
    </div>
  );
}