import { useState, useEffect, useCallback, useRef } from 'react';
import { UserWidgetPreferences } from './types';
import { usePlatform } from '../../../hooks/usePlatform';
import { useAuth } from '../../../hooks/useAuth';
import { API_BASE_URL } from '../../../config';

const STORAGE_KEY = 'aurora_header_widget_prefs_v1';

export const DEFAULT_PREFERENCES: UserWidgetPreferences = {
  enabledIds: ['weather'], // default clean out of the box
  order: ['weather', 'calendar-next', 'time-tracker', 'scratchpad', 'focus-timer'],
  maxVisibleDesktop: 3
};

export function useHeaderWidgets() {
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const [preferences, setPreferences] = useState<UserWidgetPreferences>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          enabledIds: Array.isArray(parsed.enabledIds) ? parsed.enabledIds : DEFAULT_PREFERENCES.enabledIds,
          order: Array.isArray(parsed.order) ? parsed.order : DEFAULT_PREFERENCES.order,
          maxVisibleDesktop: parsed.maxVisibleDesktop || DEFAULT_PREFERENCES.maxVisibleDesktop
        };
      }
    } catch (e) {
      console.warn('Failed to parse cached widget preferences:', e);
    }
    return DEFAULT_PREFERENCES;
  });

  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hydrate preferences from database on load
  useEffect(() => {
    if (!tenant?.id) return;
    const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;

    fetch(`${API_BASE_URL}/api/platform/widget-preferences`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'x-tenant-id': tenant.id
      }
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch widget preferences');
        return res.json();
      })
      .then((remotePrefs: UserWidgetPreferences) => {
        if (remotePrefs && Array.isArray(remotePrefs.enabledIds)) {
          const validated: UserWidgetPreferences = {
            enabledIds: remotePrefs.enabledIds,
            order: Array.isArray(remotePrefs.order) ? remotePrefs.order : DEFAULT_PREFERENCES.order,
            maxVisibleDesktop: remotePrefs.maxVisibleDesktop || DEFAULT_PREFERENCES.maxVisibleDesktop
          };
          setPreferences(validated);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
        }
      })
      .catch((err) => {
        console.warn('[HeaderWidgets] Database sync fallback to cache:', err);
      });
  }, [tenant?.id, session?.access_token]);

  // Persist preferences to database
  const persistToDatabase = useCallback((newPrefs: UserWidgetPreferences) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      if (!tenant?.id) return;
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      try {
        await fetch(`${API_BASE_URL}/api/platform/widget-preferences`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'x-tenant-id': tenant.id
          },
          body: JSON.stringify({ preferences: newPrefs })
        });
      } catch (err) {
        console.error('[HeaderWidgets] Failed to persist preferences to DB:', err);
      }
    }, 400);
  }, [tenant?.id, session?.access_token]);

  const savePreferences = useCallback((newPrefs: UserWidgetPreferences) => {
    setPreferences(newPrefs);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
    } catch (e) {}
    persistToDatabase(newPrefs);
  }, [persistToDatabase]);

  const toggleWidget = useCallback((id: string) => {
    setPreferences((prev) => {
      const isEnabled = prev.enabledIds.includes(id);
      const newEnabled = isEnabled 
        ? prev.enabledIds.filter((item) => item !== id)
        : [...prev.enabledIds, id];
      
      const newPrefs = {
        ...prev,
        enabledIds: newEnabled,
        order: prev.order.includes(id) ? prev.order : [...prev.order, id]
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
      } catch (e) {}
      persistToDatabase(newPrefs);
      return newPrefs;
    });
  }, [persistToDatabase]);

  const reorderWidgets = useCallback((newOrder: string[]) => {
    setPreferences((prev) => {
      const newPrefs = {
        ...prev,
        order: newOrder
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
      } catch (e) {}
      persistToDatabase(newPrefs);
      return newPrefs;
    });
  }, [persistToDatabase]);

  const resetToDefaults = useCallback(() => {
    savePreferences(DEFAULT_PREFERENCES);
  }, [savePreferences]);

  return {
    preferences,
    toggleWidget,
    reorderWidgets,
    resetToDefaults,
    isCustomizeOpen,
    setIsCustomizeOpen
  };
}
