import { Navigate } from "react-router-dom";
import { useAuth, AppRole, isAdminLike } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import NoAccess from "./NoAccess";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!role) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Admin & National Coordinator have access to everything
  if (isAdminLike(role)) return <>{children}</>;

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <NoAccess allowedRoles={allowedRoles} />;
  }

  return <>{children}</>;
}

