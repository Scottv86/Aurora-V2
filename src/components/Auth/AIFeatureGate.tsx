import React from 'react';
import { useAIFeatures } from '../../hooks/useAIFeatures';
import { AIFeatureKey } from '../../types/aiGovernance';

export interface AIFeatureGateProps {
  feature: AIFeatureKey | string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * AIFeatureGate
 * Conditionally renders children if the target AI feature is enabled for the current user.
 * Supports User Overrides, Team Overrides, Permission Group capabilities, and Tenant defaults.
 */
export const AIFeatureGate: React.FC<AIFeatureGateProps> = ({
  feature,
  children,
  fallback = null
}) => {
  const { isAIFeatureEnabled, loading } = useAIFeatures();

  // While initializing, avoid flickering
  if (loading) {
    return <>{children}</>;
  }

  if (isAIFeatureEnabled(feature)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

export default AIFeatureGate;
