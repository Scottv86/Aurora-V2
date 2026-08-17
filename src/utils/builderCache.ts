/**
 * Ultra-fast Stale-While-Revalidate Memory Cache for Builder Collections & Workspace Views
 * Provides instant 0ms paints on page navigation across all builder landing pages and workspace views.
 */

const memoryCache = new Map<string, any>();

export const builderCache = {
  get: <T>(key: string): T | null => {
    if (memoryCache.has(key)) {
      return memoryCache.get(key) as T;
    }
    try {
      const stored = sessionStorage.getItem(`aurora_builder_cache_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        memoryCache.set(key, parsed);
        return parsed as T;
      }
    } catch (e) {}
    return null;
  },

  set: <T>(key: string, data: T): void => {
    memoryCache.set(key, data);
    try {
      sessionStorage.setItem(`aurora_builder_cache_${key}`, JSON.stringify(data));
    } catch (e) {}
  },

  has: (key: string): boolean => {
    if (memoryCache.has(key)) return true;
    try {
      return sessionStorage.getItem(`aurora_builder_cache_${key}`) !== null;
    } catch (e) {
      return false;
    }
  },

  invalidate: (key: string): void => {
    memoryCache.delete(key);
    try {
      sessionStorage.removeItem(`aurora_builder_cache_${key}`);
    } catch (e) {}
  },

  clear: (): void => {
    memoryCache.clear();
  }
};

export const workspaceCache = builderCache;

/**
 * Standardized Framer Motion animation tokens for Workspace & Builder Views
 */
export const workspaceMotion = {
  container: {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -4 },
    transition: { duration: 0.2, ease: 'easeOut' }
  },
  item: (index = 0) => ({
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.2, delay: Math.min(index, 8) * 0.02, ease: 'easeOut' }
  }),
  card: {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.2, ease: 'easeOut' }
  }
};
