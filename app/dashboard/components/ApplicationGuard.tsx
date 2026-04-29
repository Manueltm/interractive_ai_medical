'use client';

import { ReactNode, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

interface ApplicationGuardProps {
  children: ReactNode;
  applicationSlug: string;
  fallback?: ReactNode;
  adminBypass?: boolean;
}

export const ApplicationGuard = ({ 
  children, 
  applicationSlug, 
  fallback,
  adminBypass = true 
}: ApplicationGuardProps) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<any>(null);
  const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'approved' | 'requesting'>('none');

  useEffect(() => {
    const checkAccess = async () => {
      if (status === "loading") return;
      
      if (!session?.user?.id) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      // Admin bypass if enabled
      if (adminBypass && session.user.role === "admin") {
        setHasAccess(true);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/applications/check-access?slug=${applicationSlug}`);
        const data = await res.json();
        
        setHasAccess(data.hasAccess);
        setApplication(data.application || { name: applicationSlug, id: applicationSlug });
        
        // Check if user has a pending request
        if (data.pendingRequest) {
          setRequestStatus('pending');
        } else if (data.hasAccess) {
          setRequestStatus('approved');
        } else {
          setRequestStatus('none');
        }
        
        if (!data.hasAccess && data.requiresApproval && !data.pendingRequest) {
          toast.info(`You need approval to access this application.`);
        }
      } catch (error) {
        console.error("Error checking application access:", error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [session, status, applicationSlug, adminBypass]);

  const handleRequestAccess = async () => {
    if (!application) {
      toast.error("Application not found");
      return;
    }

    setRequestStatus('requesting');
    try {
      const res = await fetch("/api/applications/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          applicationId: application.id,
          slug: applicationSlug 
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setRequestStatus('pending');
        toast.success(data.message || "Access request submitted successfully");
      } else {
        setRequestStatus('none');
        toast.error(data.error || "Failed to request access");
      }
    } catch (error) {
      console.error("Error requesting access:", error);
      setRequestStatus('none');
      toast.error("Failed to request access");
    }
  };

  const handleReturnToDashboard = () => {
    console.log("Return to dashboard clicked"); // Debug log
    try {
      router.push("/dashboard");
    } catch (error) {
      console.error("Navigation error:", error);
      // Fallback to window.location if router fails
      window.location.href = "/dashboard";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  // Default no access UI with working buttons
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-white rounded-2xl shadow-lg border border-amber-100">
      <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mb-6">
        <i className={`fas ${requestStatus === 'pending' ? 'fa-clock' : 'fa-lock'} text-amber-600 text-3xl`}></i>
      </div>
      
      <h3 className="text-2xl font-semibold text-slate-800 mb-3">
        {requestStatus === 'pending' ? 'Request Pending' : 'Access Restricted'}
      </h3>
      
      <p className="text-slate-600 text-center max-w-md mb-8">
        {requestStatus === 'pending' 
          ? `Your request for ${application?.name || 'this application'} has been sent to an administrator. You'll receive access once approved.`
          : `You don't have access to ${application?.name || 'this application'}. Please request approval from an administrator to continue.`
        }
      </p>
      

<div className="flex flex-col sm:flex-row gap-4">
  {/* Show request button only when status is 'none' */}
  {requestStatus === 'none' && (
    <button
      onClick={handleRequestAccess}
      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 cursor-pointer"
    >
      <i className="fas fa-paper-plane mr-2"></i>
      Request Access
    </button>
  )}

  {/* Show requesting state */}
  {requestStatus === 'requesting' && (
    <button
      disabled
      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl opacity-50 cursor-not-allowed"
    >
      <i className="fas fa-spinner fa-spin mr-2"></i>
      Requesting...
    </button>
  )}

  {/* Show pending message */}
  {requestStatus === 'pending' && (
    <div className="px-6 py-3 bg-amber-100 text-amber-700 rounded-xl flex items-center">
      <i className="fas fa-clock mr-2"></i>
      Request Sent - Pending Approval
    </div>
  )}

  {/* Use Link directly for dashboard navigation */}
  <Link
    href="/dashboard"
    className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 cursor-pointer inline-flex items-center justify-center"
  >
    <i className="fas fa-arrow-left mr-2"></i>
    Return to Dashboard
  </Link>
</div>
      {requestStatus === 'pending' && (
        <p className="text-sm text-slate-500 mt-4">
          You'll be notified once an admin approves your request.
        </p>
      )}
    </div>
  );
};

// Higher-order component for page-level protection
export function withApplicationGuard(
  Component: React.ComponentType<any>,
  applicationSlug: string,
  options?: { adminBypass?: boolean }
) {
  return function ProtectedComponent(props: any) {
    return (
      <ApplicationGuard applicationSlug={applicationSlug} {...options}>
        <Component {...props} />
      </ApplicationGuard>
    );
  };
}