import React from 'react';
import { useCapabilities } from '../../hooks/useCapabilities';

interface CapabilityGateProps {
  capability: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * CapabilityGate
 * Conditionally renders children if the current user has the required capability.
 * Useful for hiding buttons, tabs, or whole sections of the UI.
 */
export const CapabilityGate = ({ capability, children, fallback = null }: CapabilityGateProps) => {
  const { hasCapability } = useCapabilities();

  if (hasCapability(capability)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};
