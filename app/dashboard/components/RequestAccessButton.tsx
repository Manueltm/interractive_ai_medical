'use client';

import { useState } from "react";
import { toast } from "sonner";

interface RequestAccessButtonProps {
  applicationId: string;
  applicationName: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const RequestAccessButton = ({ 
  applicationId, 
  applicationName,
  variant = 'primary',
  size = 'md'
}: RequestAccessButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handleRequestAccess = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/applications/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || "Access request submitted");
      } else {
        toast.error(data.error || "Failed to request access");
      }
    } catch (error) {
      toast.error("Failed to request access");
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg"
  };

  const variantClasses = {
    primary: "bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-lg",
    secondary: "bg-purple-100 text-purple-700 hover:bg-purple-200",
    outline: "border border-blue-300 text-blue-700 hover:bg-blue-50"
  };

  return (
    <button
      onClick={handleRequestAccess}
      disabled={loading}
      className={`rounded-lg font-medium transition-all ${sizeClasses[size]} ${variantClasses[variant]} disabled:opacity-50`}
    >
      {loading ? (
        <i className="fas fa-spinner fa-spin mr-2"></i>
      ) : (
        <i className="fas fa-paper-plane mr-2"></i>
      )}
      Request Access
    </button>
  );
};