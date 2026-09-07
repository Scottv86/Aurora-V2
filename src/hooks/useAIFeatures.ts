import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePlatform } from './usePlatform';
import { useAuth } from './useAuth';
import { AIFeatureKey, AI_FEATURES_CATALOG } from '../types/aiGovernance';
import { API_BASE_URL } from '../config';

export interface UserAIPolicy {
  allowed: boolean;
  reason: string;
  level: string;
}

export const useAIFeatures = () => {
  const { user, tenant } = usePlatform();
  const { isSuperAdmin, session } = useAuth();
  const [policies, setPolicies] = useState<Record<string, UserAIPolicy>>({});
  const [loading, setLoading] = useState<boolean>(true);

  const capabilities = useMemo(() => user?.capabilities || [], [user?.capabilities]);

  const fetchUserPolicies = useCallback(async () => {
    if (!session?.access_token || !tenant?.id) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/governance/user-policies`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'x-tenant-id': tenant.id
        }
      });

      if (res.ok) {
        const data = await res.json();
        setPolicies(data);
      }
    } catch (err) {
      console.warn('[useAIFeatures] Error fetching user AI policies:', err);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, tenant?.id]);

  useEffect(() => {
    fetchUserPolicies();
  }, [fetchUserPolicies]);

  /**
   * Evaluates if a given AI feature is enabled for the logged-in user.
   * Checks server policies first, with synchronous client fallback.
   */
  const isAIFeatureEnabled = useCallback(
    (featureKey: AIFeatureKey | string): boolean => {
      // SuperAdmins & Developers always bypass
      if (isSuperAdmin || user?.licenceType === 'Developer' || user?.role === 'Admin') {
        return true;
      }

      // Check server resolved policies if available
      if (policies[featureKey] !== undefined) {
        return policies[featureKey].allowed;
      }

      // Synchronous Client Fallback:
      // 1. User Overrides
      const userOverrides = (user as any)?.aiOverrides as Record<string, string> | undefined;
      if (userOverrides?.[featureKey] === 'ALLOW') return true;
      if (userOverrides?.[featureKey] === 'DENY') return false;

      // 2. Capability Wildcards
      if (capabilities.includes('*:*') || capabilities.includes('ai:*') || capabilities.includes(featureKey)) {
        if (capabilities.includes(`!${featureKey}`) || capabilities.includes('!ai:*')) {
          return false;
        }
        return true;
      }

      // 3. Fallback to catalog default (true)
      const catalogDef = AI_FEATURES_CATALOG.find(f => f.key === featureKey);
      return catalogDef ? catalogDef.defaultEnabled : true;
    },
    [policies, isSuperAdmin, user, capabilities]
  );

  return {
    isAIFeatureEnabled,
    policies,
    loading,
    refresh: fetchUserPolicies,
    catalog: AI_FEATURES_CATALOG
  };
};
