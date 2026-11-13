import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

export interface ProfileCardFallback {
  name?: string;
  avatarUrl?: string;
  status?: string;
}

interface ProfileCardState {
  isOpen: boolean;
  isPinned: boolean;
  targetId: string | null;
  anchorRect: DOMRect | null;
  fallback?: ProfileCardFallback;
}

interface UserProfileCardContextValue extends ProfileCardState {
  scheduleOpen: (targetId: string, anchorEl: HTMLElement, fallback?: ProfileCardFallback) => void;
  openImmediately: (targetId: string, anchorEl: HTMLElement, fallback?: ProfileCardFallback) => void;
  scheduleClose: () => void;
  cancelClose: () => void;
  togglePin: () => void;
  closeCard: () => void;
  switchProfile: (targetId: string, fallback?: ProfileCardFallback) => void;
}

const PROFILE_CARD_CONTEXT_KEY = '__aurora_user_profile_card_context__';
const UserProfileCardContext: React.Context<UserProfileCardContextValue | null> =
  (globalThis as any)[PROFILE_CARD_CONTEXT_KEY] ??
  ((globalThis as any)[PROFILE_CARD_CONTEXT_KEY] = createContext<UserProfileCardContextValue | null>(null));

const OPEN_DELAY_MS = 200;
const CLOSE_DELAY_MS = 220;

export const UserProfileCardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ProfileCardState>({
    isOpen: false,
    isPinned: false,
    targetId: null,
    anchorRect: null,
    fallback: undefined
  });

  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const isPinnedRef = useRef(false);

  useEffect(() => {
    isPinnedRef.current = state.isPinned;
  }, [state.isPinned]);

  const clearTimers = useCallback(() => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const openImmediately = useCallback(
    (targetId: string, anchorEl: HTMLElement, fallback?: ProfileCardFallback) => {
      if (!targetId) return;
      clearTimers();
      const rect = anchorEl.getBoundingClientRect();
      setState((prev) => ({
        isOpen: true,
        isPinned: prev.targetId === targetId ? prev.isPinned : false,
        targetId,
        anchorRect: rect,
        fallback
      }));
    },
    [clearTimers]
  );

  const scheduleOpen = useCallback(
    (targetId: string, anchorEl: HTMLElement, fallback?: ProfileCardFallback) => {
      if (!targetId) return;
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      // If pinned to a different user, don't auto-switch on passive hover
      if (isPinnedRef.current && state.isOpen && state.targetId !== targetId) {
        return;
      }
      if (openTimerRef.current !== null) {
        window.clearTimeout(openTimerRef.current);
      }
      const rect = anchorEl.getBoundingClientRect();
      openTimerRef.current = window.setTimeout(() => {
        openTimerRef.current = null;
        setState((prev) => ({
          isOpen: true,
          isPinned: prev.targetId === targetId ? prev.isPinned : false,
          targetId,
          anchorRect: rect,
          fallback
        }));
      }, OPEN_DELAY_MS);
    },
    [state.isOpen, state.targetId]
  );

  const scheduleClose = useCallback(() => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (isPinnedRef.current) return;
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      if (!isPinnedRef.current) {
        setState((prev) => ({ ...prev, isOpen: false }));
      }
    }, CLOSE_DELAY_MS);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const togglePin = useCallback(() => {
    setState((prev) => ({ ...prev, isPinned: !prev.isPinned }));
  }, []);

  const closeCard = useCallback(() => {
    clearTimers();
    setState({
      isOpen: false,
      isPinned: false,
      targetId: null,
      anchorRect: null,
      fallback: undefined
    });
  }, [clearTimers]);

  const switchProfile = useCallback((targetId: string, fallback?: ProfileCardFallback) => {
    if (!targetId) return;
    clearTimers();
    setState((prev) => ({
      ...prev,
      isOpen: true,
      targetId,
      fallback
    }));
  }, [clearTimers]);

  return (
    <UserProfileCardContext.Provider
      value={{
        ...state,
        scheduleOpen,
        openImmediately,
        scheduleClose,
        cancelClose,
        togglePin,
        closeCard,
        switchProfile
      }}
    >
      {children}
    </UserProfileCardContext.Provider>
  );
};

export const useUserProfileCard = () => {
  return useContext(UserProfileCardContext);
};
