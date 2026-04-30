import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { AuroraSpinner } from '../UI/Primitives';
import { usePlatform } from '../../hooks/usePlatform';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const { isDeveloper, isLoading: platformLoading } = usePlatform();
  const location = useLocation();

  if (loading || platformLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <AuroraSpinner size="md" className="text-indigo-500" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If superadmin access is required but user is not superadmin
  if (requireAdmin && !isSuperAdmin) {
    return <Navigate to="/workspace" replace />;
  }

  // If standard user dashboard access is requested but user is superadmin (and we want to restrict them, per prompt)
  // Actually, the prompt says: "If is_superadmin == true, grant access to the /admin portal routes. 
  // If is_superadmin == false, restrict access to the /dashboard portal routes."
  // Wait, if I'm a superadmin, should I be restricted from the dashboard? 
  // The phrasing "If is_superadmin == false, restrict access to the /dashboard portal routes" is still ambiguous.
  // I'll assume standard users get dashboard and superadmins get admin (and maybe dashboard too, unless explicitly told otherwise).
  // But I'll follow the "restrict" logic if I can map it.
  
  return <>{children}</>;
};
