import React, { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePlatform } from './PlatformContext';
import { API_BASE_URL } from '../config';
import { PartyProfileHoverCard } from '../components/Common/PartyProfileHoverCard';

export interface PartySummary {
  id: string;
  partyType: 'PERSON' | 'ORGANIZATION';
  partyCode?: string | null;
  displayName: string;
  status: string;
  email?: string | null;
  secondaryEmail?: string | null;
  phone?: string | null;
  mobile?: string | null;
  website?: string | null;
  avatarUrl?: string | null;
  classifications?: string[];
  tags?: string[];
  accountOwnerMemberId?: string | null;
  person?: {
    salutation?: string | null;
    firstName: string;
    lastName: string;
    preferredName?: string | null;
    jobTitle?: string | null;
    department?: string | null;
    primaryOrgPartyId?: string | null;
    primaryOrgName?: string | null;
  } | null;
  organization?: {
    legalName: string;
    tradingName?: string | null;
    orgStructureType?: string | null;
    taxIdentifier?: string | null;
    industry?: string | null;
    primaryContactPartyId?: string | null;
  } | null;
}

export interface PartyProfileCardData extends PartySummary {
  addresses?: any[];
  socialLinks?: Record<string, string>;
  preferredContactMethod?: string | null;
  timezone?: string | null;
  currency?: string | null;
  notesSummary?: string | null;
  customData?: Record<string, any>;
  isStarred?: boolean;
  createdAt?: string;
  updatedAt?: string;
  accountOwner?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    role?: string | null;
    jobTitle?: string | null;
  } | null;
  primaryOrganization?: {
    id: string;
    displayName: string;
    industry?: string | null;
    taxIdentifier?: string | null;
    avatarUrl?: string | null;
  } | null;
  primaryContact?: {
    id: string;
    displayName: string;
    jobTitle?: string | null;
    email?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
  } | null;
  roleAtOrganization?: string | null;
  relationships?: Array<{
    id: string;
    relationshipType: string;
    roleTitle?: string | null;
    department?: string | null;
    isPrimary?: boolean;
    ownershipPercentage?: number | null;
    direction: 'OUTGOING' | 'INCOMING';
    otherParty: {
      id: string;
      displayName: string;
      partyType: 'PERSON' | 'ORGANIZATION';
      status: string;
      email?: string | null;
      phone?: string | null;
      avatarUrl?: string | null;
      jobTitle?: string | null;
      industry?: string | null;
    };
  }>;
  financialSnapshot?: {
    invoicesCount: number;
    totalInvoiced: number;
    outstandingReceivables: number;
    billsCount: number;
    outstandingPayables: number;
    posOrdersCount: number;
  };
  linkedSummary?: {
    moduleRecordsCount: number;
    recentModuleRecords: Array<{
      id: string;
      moduleId: string;
      moduleName: string;
      moduleIcon?: string;
      recordKey: string;
      title: string;
      status: string;
      updatedAt: string;
    }>;
    recentInvoices: Array<{
      id: string;
      invoiceNumber: string;
      total: number;
      balanceDue: number;
      status: string;
    }>;
    notesCount: number;
    openRemindersCount: number;
    serviceDeskSessionsCount: number;
    relationshipsCount: number;
    totalLinkedItems: number;
  };
}

interface PartyProfileCardContextType {
  openPartyCard: (partyId: string, anchorRect: DOMRect, fallbackData?: Partial<PartyProfileCardData>) => void;
  scheduleOpenPartyCard: (partyId: string, element: HTMLElement, fallbackData?: Partial<PartyProfileCardData>) => void;
  scheduleClosePartyCard: () => void;
  closePartyCardImmediately: () => void;
  isPinned: boolean;
  setIsPinned: (pinned: boolean) => void;
  switchCardParty: (partyId: string) => void;
  goBackParty: () => void;
  canGoBack: boolean;
  refreshActiveCard: () => void;
  // Global Directory lookup cache for instant resolution in tables, kanban, forms & apps
  directoryMap: Map<string, PartySummary>;
  isDirectoryLoading: boolean;
  getPartySummary: (partyId?: string | null) => PartySummary | null;
  refreshDirectoryMap: () => Promise<void>;
}

const DIRECTORY_CACHE_STORAGE_KEY = 'aurora_directory_summary_cache_v1';

function loadCachedDirectoryMap(): Map<string, PartySummary> {
  try {
    const raw = localStorage.getItem(DIRECTORY_CACHE_STORAGE_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Map(parsed);
    }
  } catch {
    // Ignore storage read errors
  }
  return new Map();
}

function saveCachedDirectoryMap(map: Map<string, PartySummary>) {
  try {
    const entries = Array.from(map.entries());
    localStorage.setItem(DIRECTORY_CACHE_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Validate that an entity ID looks like a plausible database identifier (e.g. CUID, CUID2, UUID)
 * and does not contain spaces, newlines, or sentence text.
 */
function isValidEntityId(id?: string | null): boolean {
  if (!id || typeof id !== 'string') return false;
  const trimmed = id.trim();
  if (trimmed.length < 10 || trimmed.length > 100) return false;
  if (/\s/.test(trimmed)) return false;
  return /^[a-zA-Z0-9_-]+$/.test(trimmed);
}

export const PartyProfileCardContext = createContext<PartyProfileCardContextType | undefined>(undefined);

export const PartyProfileCardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const { tenant } = usePlatform();

  const [activePartyId, setActivePartyId] = useState<string | null>(null);
  const [partyHistory, setPartyHistory] = useState<string[]>([]);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [cardData, setCardData] = useState<PartyProfileCardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPinned, setIsPinned] = useState<boolean>(false);

  // Directory summary cache across the tenant — hydrated synchronously from localStorage for 0ms instant rendering
  const [directoryMap, setDirectoryMap] = useState<Map<string, PartySummary>>(() => loadCachedDirectoryMap());
  const [isDirectoryLoading, setIsDirectoryLoading] = useState<boolean>(() => loadCachedDirectoryMap().size === 0);

  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const profileCacheRef = useRef<Map<string, { data: PartyProfileCardData; timestamp: number }>>(new Map());

  const clearTimers = useCallback(() => {
    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const getToken = useCallback(() => {
    return (import.meta as any).env?.VITE_DEV_TOKEN || session?.access_token || localStorage.getItem('aurora_token');
  }, [session?.access_token]);

  const refreshDirectoryMap = useCallback(async () => {
    if (!tenant?.id) return;
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/people-organisations?limit=500`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-id': tenant.id,
        },
      });
      if (!res.ok) return;
      const json = await res.json();
      const list: any[] = Array.isArray(json) ? json : json.parties || [];
      const nextMap = new Map<string, PartySummary>();
      for (const p of list) {
        if (!p?.id) continue;
        const displayName =
          p.displayName ||
          (p.partyType === 'PERSON'
            ? `${p.person?.firstName || ''} ${p.person?.lastName || ''}`.trim()
            : p.organization?.legalName || p.organization?.tradingName) ||
          'Unnamed Entity';
        nextMap.set(p.id, {
          ...p,
          displayName,
        });
      }
      setDirectoryMap(nextMap);
      saveCachedDirectoryMap(nextMap);
    } catch {
      // Non-fatal
    } finally {
      setIsDirectoryLoading(false);
    }
  }, [tenant?.id, getToken]);

  useEffect(() => {
    refreshDirectoryMap();
  }, [refreshDirectoryMap]);

  // Listen for global directory updates so caches stay fresh
  useEffect(() => {
    const handler = () => {
      profileCacheRef.current.clear();
      failedSummaryRef.current.clear();
      refreshDirectoryMap();
    };
    window.addEventListener('aurora:directory-updated', handler);
    return () => window.removeEventListener('aurora:directory-updated', handler);
  }, [refreshDirectoryMap]);

  const inFlightSummaryRef = useRef<Set<string>>(new Set());
  const failedSummaryRef = useRef<Set<string>>(new Set());

  const getPartySummary = useCallback(
    (partyId?: string | null): PartySummary | null => {
      if (!partyId || typeof partyId !== 'string') return null;
      const hit = directoryMap.get(partyId);
      if (hit) return hit;

      if (!isValidEntityId(partyId) || failedSummaryRef.current.has(partyId)) {
        return null;
      }

      // On-demand single-entity resolution if not in directoryMap yet
      if (tenant?.id && !inFlightSummaryRef.current.has(partyId)) {
        const token = getToken();
        if (token) {
          inFlightSummaryRef.current.add(partyId);
          fetch(`${API_BASE_URL}/api/people-organisations/${encodeURIComponent(partyId)}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'x-tenant-id': tenant.id,
            },
          })
            .then((r) => {
              if (r.ok) {
                return r.json();
              }
              if (r.status === 404 || !r.ok) {
                failedSummaryRef.current.add(partyId);
              }
              return null;
            })
            .then((p) => {
              if (p && p.id) {
                const displayName =
                  p.displayName ||
                  (p.partyType === 'PERSON'
                    ? `${p.person?.firstName || ''} ${p.person?.lastName || ''}`.trim()
                    : p.organization?.legalName || p.organization?.tradingName) ||
                  'Unnamed Entity';
                setDirectoryMap((prev) => {
                  const next = new Map(prev);
                  next.set(p.id, { ...p, displayName });
                  saveCachedDirectoryMap(next);
                  return next;
                });
              } else {
                failedSummaryRef.current.add(partyId);
              }
            })
            .catch(() => {
              failedSummaryRef.current.add(partyId);
            })
            .finally(() => {
              inFlightSummaryRef.current.delete(partyId);
            });
        }
      }
      return null;
    },
    [directoryMap, tenant?.id, getToken]
  );

  const fetchProfileCardData = useCallback(
    async (partyId: string, fallbackData?: Partial<PartyProfileCardData>, forceRefresh = false) => {
      if (!tenant?.id || !partyId || !isValidEntityId(partyId)) return;

      const cached = profileCacheRef.current.get(partyId);
      if (!forceRefresh && cached && Date.now() - cached.timestamp < 30000) {
        setCardData(cached.data);
        setIsLoading(false);
        return;
      }

      const summary = directoryMap.get(partyId);
      if (fallbackData || summary) {
        setCardData((prev) => {
          if (prev && prev.id === partyId && prev.linkedSummary) return prev;
          return {
            id: partyId,
            partyType: summary?.partyType || fallbackData?.partyType || 'PERSON',
            displayName: summary?.displayName || fallbackData?.displayName || 'Loading Entity...',
            status: summary?.status || fallbackData?.status || 'VERIFIED',
            email: summary?.email ?? fallbackData?.email ?? null,
            phone: summary?.phone ?? fallbackData?.phone ?? null,
            avatarUrl: summary?.avatarUrl ?? fallbackData?.avatarUrl ?? null,
            classifications: summary?.classifications || fallbackData?.classifications || [],
            person: summary?.person ?? fallbackData?.person ?? null,
            organization: summary?.organization ?? fallbackData?.organization ?? null,
            ...fallbackData,
            ...(summary ? { displayName: summary.displayName, partyCode: summary.partyCode } : {}),
          };
        });
      }

      setIsLoading(true);
      try {
        const token = getToken();
        const res = await fetch(
          `${API_BASE_URL}/api/people-organisations/${encodeURIComponent(partyId)}/profile-card`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'x-tenant-id': tenant.id,
            },
          }
        );

        if (res.ok) {
          const data: PartyProfileCardData = await res.json();
          profileCacheRef.current.set(partyId, { data, timestamp: Date.now() });
          setCardData(data);
          // Also keep directoryMap updated
          setDirectoryMap((prev) => {
            const next = new Map(prev);
            next.set(data.id, data);
            saveCachedDirectoryMap(next);
            return next;
          });
        }
      } catch (err) {
        console.error('Failed to load directory profile card:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [tenant?.id, getToken, directoryMap]
  );

  const openPartyCard = useCallback(
    (partyId: string, rect: DOMRect, fallbackData?: Partial<PartyProfileCardData>) => {
      if (!partyId) return;
      clearTimers();
      setPartyHistory([]);
      setActivePartyId(partyId);
      setAnchorRect(rect);
      fetchProfileCardData(partyId, fallbackData);
    },
    [clearTimers, fetchProfileCardData]
  );

  const scheduleOpenPartyCard = useCallback(
    (partyId: string, element: HTMLElement, fallbackData?: Partial<PartyProfileCardData>) => {
      if (!partyId || isPinned) return;
      clearTimers();
      openTimerRef.current = window.setTimeout(() => {
        const rect = element.getBoundingClientRect();
        setPartyHistory([]);
        setActivePartyId(partyId);
        setAnchorRect(rect);
        fetchProfileCardData(partyId, fallbackData);
      }, 320);
    },
    [clearTimers, fetchProfileCardData, isPinned]
  );

  const scheduleClosePartyCard = useCallback(() => {
    if (isPinned) return;
    clearTimers();
    closeTimerRef.current = window.setTimeout(() => {
      setActivePartyId(null);
      setPartyHistory([]);
      setAnchorRect(null);
      setCardData(null);
    }, 260);
  }, [clearTimers, isPinned]);

  const closePartyCardImmediately = useCallback(() => {
    clearTimers();
    setIsPinned(false);
    setActivePartyId(null);
    setPartyHistory([]);
    setAnchorRect(null);
    setCardData(null);
  }, [clearTimers]);

  const switchCardParty = useCallback(
    (nextPartyId: string) => {
      if (!nextPartyId || nextPartyId === activePartyId) return;
      if (activePartyId) {
        setPartyHistory((prev) => [...prev, activePartyId]);
      }
      setActivePartyId(nextPartyId);
      fetchProfileCardData(nextPartyId);
    },
    [activePartyId, fetchProfileCardData]
  );

  const goBackParty = useCallback(() => {
    if (partyHistory.length === 0) return;
    const prevId = partyHistory[partyHistory.length - 1];
    setPartyHistory((prev) => prev.slice(0, -1));
    setActivePartyId(prevId);
    fetchProfileCardData(prevId);
  }, [partyHistory, fetchProfileCardData]);

  const refreshActiveCard = useCallback(() => {
    if (activePartyId) {
      fetchProfileCardData(activePartyId, undefined, true);
    }
  }, [activePartyId, fetchProfileCardData]);

  const contextValue = useMemo(
    () => ({
      openPartyCard,
      scheduleOpenPartyCard,
      scheduleClosePartyCard,
      closePartyCardImmediately,
      isPinned,
      setIsPinned,
      switchCardParty,
      goBackParty,
      canGoBack: partyHistory.length > 0,
      refreshActiveCard,
      directoryMap,
      getPartySummary,
      refreshDirectoryMap,
    }),
    [
      openPartyCard,
      scheduleOpenPartyCard,
      scheduleClosePartyCard,
      closePartyCardImmediately,
      isPinned,
      switchCardParty,
      goBackParty,
      partyHistory.length,
      refreshActiveCard,
      directoryMap,
      isDirectoryLoading,
      getPartySummary,
      refreshDirectoryMap,
    ]
  );

  return (
    <PartyProfileCardContext.Provider value={contextValue}>
      {children}
      {activePartyId && anchorRect && (
        <PartyProfileHoverCard
          partyId={activePartyId}
          anchorRect={anchorRect}
          data={cardData}
          isLoading={isLoading}
          isPinned={isPinned}
          canGoBack={partyHistory.length > 0}
          onGoBack={goBackParty}
          onSwitchParty={switchCardParty}
          onPinToggle={() => setIsPinned((prev) => !prev)}
          onMouseEnter={clearTimers}
          onMouseLeave={scheduleClosePartyCard}
          onClose={closePartyCardImmediately}
          onRefresh={refreshActiveCard}
        />
      )}
    </PartyProfileCardContext.Provider>
  );
};

export const usePartyProfileCard = () => {
  const ctx = useContext(PartyProfileCardContext);
  if (!ctx) {
    throw new Error('usePartyProfileCard must be used within a PartyProfileCardProvider');
  }
  return ctx;
};

/**
 * Universal wrapper component to trigger the MS365-Style Directory Hover Card on any Person or Organisation
 */
export const PartyProfileTrigger: React.FC<{
  partyId?: string | null;
  fallbackData?: Partial<PartyProfileCardData>;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClickBehavior?: 'hover_only' | 'open_card' | 'navigate_profile';
}> = ({
  partyId,
  fallbackData,
  children,
  className = 'inline-flex items-center cursor-pointer',
  disabled = false,
  onClickBehavior = 'open_card',
}) => {
  const ctx = useContext(PartyProfileCardContext);
  const triggerRef = useRef<HTMLSpanElement>(null);

  if (!ctx || !partyId || disabled) {
    return <span className={className}>{children}</span>;
  }

  return (
    <span
      ref={triggerRef}
      className={className}
      onMouseEnter={() => {
        if (triggerRef.current) {
          ctx.scheduleOpenPartyCard(partyId, triggerRef.current, fallbackData);
        }
      }}
      onMouseLeave={() => {
        ctx.scheduleClosePartyCard();
      }}
      onClick={(e) => {
        if (onClickBehavior === 'hover_only') return;
        e.stopPropagation();
        if (onClickBehavior === 'navigate_profile') {
          ctx.closePartyCardImmediately();
          window.location.href = `/workspace/apps/directory/${partyId}`;
          return;
        }
        if (triggerRef.current) {
          ctx.openPartyCard(partyId, triggerRef.current.getBoundingClientRect(), fallbackData);
        }
      }}
    >
      {children}
    </span>
  );
};
