// app/dashboard/components/AdminGuard.tsx
'use client';
import { ReactNode } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface AdminGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const AdminGuard = ({ children, fallback }: AdminGuardProps) => {
  const { data: session } = useSession();
  
  if (session?.user?.role === 'admin') {
    return <>{children}</>;
  }
  
  return fallback ? <>{fallback}</> : null;
};

export const withAdminGuard = (Component: any) => {
  return function AdminGuardedComponent(props: any) {
    const { data: session } = useSession();
    
    if (session?.user?.role !== 'admin') {
      return null;
    }
    
    return <Component {...props} />;
  };
};