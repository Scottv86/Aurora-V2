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
  const { user, loading, isSuperAdmin } = useAuth();
  const { isLoading: platformLoading } = usePlatform();
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

  // If user is superadmin (and not currently impersonating a tenant), redirect away from /workspace to /admin (except for AI Chat mode)
  const isImpersonating = typeof window !== 'undefined' && !!sessionStorage.getItem('impersonatingTenantId');
  const isChatRoute = location.pathname.startsWith('/workspace/aurora-vibe');
  if (isSuperAdmin && !isImpersonating && !location.pathname.startsWith('/admin') && !isChatRoute) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};
