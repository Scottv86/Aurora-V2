import React, { createContext, useContext, useState, useCallback, useMemo, useId, useEffect } from 'react';
import { ActiveEntityContext, RegisterEntityOptions } from '../types/activeContext';

interface StackEntry {
  id: string;
  priority: number;
  context: ActiveEntityContext;
  addedAt: number;
}

interface ActiveEntityContextType {
  activeContext: ActiveEntityContext | null;      // Context delivered to AI (null if isDetached)
  rawActiveContext: ActiveEntityContext | null;   // Real-time top of stack regardless of detachment
  isPinned: boolean;
  isDetached: boolean;
  setIsPinned: (pinned: boolean) => void;
  setIsDetached: (detached: boolean) => void;
  registerEntity: (id: string, context: ActiveEntityContext, priority?: number) => void;
  unregisterEntity: (id: string) => void;
  clearActiveContext: () => void;
}

const ActiveEntityContextState = createContext<ActiveEntityContextType | null>(null);

export const ActiveEntityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stack, setStack] = useState<StackEntry[]>([]);
  const [pinnedContext, setPinnedContext] = useState<ActiveEntityContext | null>(null);
  const [isPinned, setIsPinnedState] = useState(false);
  const [isDetached, setIsDetached] = useState(false);

  const registerEntity = useCallback((id: string, context: ActiveEntityContext, priority = 10) => {
    setStack((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      return [...filtered, { id, priority, context, addedAt: Date.now() }];
    });
  }, []);

  const unregisterEntity = useCallback((id: string) => {
    setStack((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearActiveContext = useCallback(() => {
    setStack([]);
    setPinnedContext(null);
    setIsPinnedState(false);
    setIsDetached(false);
  }, []);

  // Compute top of the stack by priority (descending), then addedAt (descending)
  const rawActiveContext = useMemo(() => {
    if (isPinned && pinnedContext) {
      return pinnedContext;
    }
    if (stack.length === 0) return null;
    const sorted = [...stack].sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return b.addedAt - a.addedAt;
    });
    return sorted[0].context;
  }, [stack, isPinned, pinnedContext]);

  const setIsPinned = useCallback((pinned: boolean) => {
    setIsPinnedState(pinned);
    if (pinned) {
      // Pin current top of stack
      if (stack.length > 0) {
        const sorted = [...stack].sort((a, b) => {
          if (b.priority !== a.priority) return b.priority - a.priority;
          return b.addedAt - a.addedAt;
        });
        setPinnedContext(sorted[0].context);
      }
    } else {
      setPinnedContext(null);
    }
  }, [stack]);

  // When detached, activeContext is null so AI doesn't receive it, but user can re-attach
  const activeContext = useMemo(() => {
    if (isDetached) return null;
    return rawActiveContext;
  }, [isDetached, rawActiveContext]);

  // If stack becomes empty and not pinned, reset detached state so next entity automatically attaches
  useEffect(() => {
    if (stack.length === 0 && !isPinned) {
      setIsDetached(false);
    }
  }, [stack.length, isPinned]);

  return (
    <ActiveEntityContextState.Provider
      value={{
        activeContext,
        rawActiveContext,
        isPinned,
        isDetached,
        setIsPinned,
        setIsDetached,
        registerEntity,
        unregisterEntity,
        clearActiveContext,
      }}
    >
      {children}
    </ActiveEntityContextState.Provider>
  );
};

export const useActiveEntityContext = () => {
  const ctx = useContext(ActiveEntityContextState);
  if (!ctx) {
    throw new Error('useActiveEntityContext must be used within an ActiveEntityProvider');
  }
  return ctx;
};

/**
 * Hook to register an active record / entity in the context stack.
 * Automatically cleans up on unmount or when context changes.
 */
export const useRegisterActiveEntity = (
  context: ActiveEntityContext | null,
  options?: RegisterEntityOptions
) => {
  const { registerEntity, unregisterEntity } = useActiveEntityContext();
  const registrationId = useId();
  const priority = options?.priority ?? 10;
  const enabled = options?.enabled ?? true;

  useEffect(() => {
    if (!context || !enabled) {
      unregisterEntity(registrationId);
      return;
    }

    registerEntity(registrationId, context, priority);

    return () => {
      unregisterEntity(registrationId);
    };
  }, [context, priority, enabled, registerEntity, unregisterEntity, registrationId]);
};
