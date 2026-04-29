"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AdManagement } from "@/app/dashboard/components/AdManagement";
import { ApplicationGuard } from "@/app/dashboard/components/ApplicationGuard";

export default function AdminAdsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/login");
      return;
    }
    
    if (session.user?.role !== "admin") {
      router.push("/dashboard");
      return;
    }
    
    setIsAuthorized(true);
    setIsLoading(false);
  }, [session, status, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <ApplicationGuard applicationSlug="ads">
      <AdManagement onClose={() => {}} />
    </ApplicationGuard>
  );
}