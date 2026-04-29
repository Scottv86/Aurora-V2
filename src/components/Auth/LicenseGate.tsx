import React from 'react';
import { usePlatform } from '../../hooks/usePlatform';
import { ShieldAlert } from 'lucide-react';

interface LicenseGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * LicenseGate
 * Only renders children if the current user has a 'Developer' license.
 * Otherwise, renders nothing or the provided fallback.
 */
export const LicenseGate = ({ children, fallback }: LicenseGateProps) => {
  const { isDeveloper, isLoading } = usePlatform();

  if (isLoading) {
    return null; // Or a subtle loading indicator
  }

  if (isDeveloper) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return null;
};

/**
 * Default fallback UI for restricted areas
 */
export const LicenseRestrictedPlaceholder = () => (
  <div className="flex flex-col w-full px-6 lg:px-12 py-10 items-center justify-center text-center">
    <div className="bg-zinc-50 dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl p-12 flex flex-col items-center">
      <div className="h-16 w-16 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center text-blue-600 mb-6 border border-blue-500/10">
        <ShieldAlert size={32} />
      </div>
      <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight mb-2">
        Developer Seat Required
      </h3>
      <p className="text-sm text-zinc-500 max-w-sm font-medium leading-relaxed">
        This area contains platform configuration settings. Please contact your organization owner 
        to upgrade your license type to a <strong>Developer</strong> seat.
      </p>
    </div>
  </div>
);
