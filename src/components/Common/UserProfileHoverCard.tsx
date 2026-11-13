import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Pin,
  X,
  MessageSquare,
  Mail,
  Phone,
  MapPin,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  ExternalLink,
  Users,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { API_BASE_URL } from '../../config';
import { usePlatform } from '../../hooks/usePlatform';
import { useUserProfileCard } from '../../context/UserProfileCardContext';
import { UserAvatarWithPresence, UserPresenceBadge } from './UserPresenceBadge';
import { cn } from '../../lib/utils';

interface ProfileCardData {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  workEmail: string;
  role: string;
  status: string;
  isSynthetic: boolean;
  jobTitle: string;
  positionNumber: string | null;
  avatarUrl: string | null;
  workArrangements: string | null;
  phoneNumbers: Array<{ id: string; label: string; number: string }>;
  team: { id: string; name: string; avatarUrl?: string | null } | null;
  reportsTo: {
    id: string;
    userId: string | null;
    name: string;
    jobTitle: string;
    avatarUrl: string | null;
  } | null;
  memberships: Array<{ id: string; name: string; kind: 'team' | 'group' }>;
}

const CARD_WIDTH = 340;
const CARD_MAX_HEIGHT = 520;
const VIEWPORT_PADDING = 12;

export const UserProfileHoverCard: React.FC = () => {
  const ctx = useUserProfileCard();
  const platform = usePlatform();
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [membershipsExpanded, setMembershipsExpanded] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const isOpen = ctx?.isOpen ?? false;
  const isPinned = ctx?.isPinned ?? false;
  const targetId = ctx?.targetId ?? null;
  const anchorRect = ctx?.anchorRect ?? null;
  const fallback = ctx?.fallback;

  // Reset local UI state when switching profiles
  useEffect(() => {
    setMembershipsExpanded(false);
    setCopiedEmail(false);
  }, [targetId]);

  const { data, isLoading, isError } = useQuery<ProfileCardData>({
    queryKey: ['member-profile-card', targetId, platform?.tenant?.id],
    enabled: Boolean(isOpen && targetId),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const { data: sessData } = await supabase.auth.getSession();
      const activeToken =
        sessData?.session?.access_token || localStorage.getItem('aurora_token') || 'dev-token';
      const tenantId =
        platform?.tenant?.id || sessData?.session?.user?.user_metadata?.tenant_id || 't1';

      const res = await fetch(`${API_BASE_URL}/api/members/${encodeURIComponent(targetId!)}/profile-card`, {
        headers: {
          Authorization: `Bearer ${activeToken}`,
          'x-tenant-id': tenantId
        }
      });

      if (!res.ok) {
        throw new Error(`Failed to load profile (${res.status})`);
      }
      return res.json();
    }
  });

  // Compute viewport-clamped position
  useLayoutEffect(() => {
    if (!isOpen || !anchorRect) return;

    const cardHeight = cardRef.current?.offsetHeight || 380;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Prefer below-right of anchor, flip up or left if needed
    let top = anchorRect.bottom + 8;
    if (top + cardHeight > vh - VIEWPORT_PADDING) {
      const aboveTop = anchorRect.top - cardHeight - 8;
      top = aboveTop >= VIEWPORT_PADDING ? aboveTop : Math.max(VIEWPORT_PADDING, vh - cardHeight - VIEWPORT_PADDING);
    }

    let left = anchorRect.left;
    if (left + CARD_WIDTH > vw - VIEWPORT_PADDING) {
      left = Math.max(VIEWPORT_PADDING, vw - CARD_WIDTH - VIEWPORT_PADDING);
    }
    if (left < VIEWPORT_PADDING) {
      left = VIEWPORT_PADDING;
    }

    setCoords({ top, left });
  }, [isOpen, anchorRect, data, membershipsExpanded, isLoading]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        ctx?.closeCard();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, ctx]);

  // Close on outside click when pinned
  useEffect(() => {
    if (!isOpen || !isPinned) return;
    const onMouseDown = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        ctx?.closeCard();
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isOpen, isPinned, ctx]);

  if (!isOpen || !targetId || !anchorRect) return null;

  const displayName = data?.name || fallback?.name || 'Loading...';
  const displayAvatar = data?.avatarUrl || fallback?.avatarUrl;
  const presenceStatus = fallback?.status || data?.status || 'AVAILABLE';
  const primaryEmail = data?.workEmail || data?.email || '';

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!primaryEmail) return;
    navigator.clipboard.writeText(primaryEmail);
    setCopiedEmail(true);
    toast.success('Email copied to clipboard');
    setTimeout(() => setCopiedEmail(false), 1800);
  };

  const handleOpenChat = () => {
    ctx?.closeCard();
    navigate('/workspace/apps/chat');
  };

  const handleOpenDirectory = () => {
    if (!data?.id) return;
    ctx?.closeCard();
    navigate(`/workspace/apps/directory/${data.id}`);
  };

  return createPortal(
    <div
      ref={cardRef}
      onMouseEnter={() => ctx?.cancelClose()}
      onMouseLeave={() => ctx?.scheduleClose()}
      style={{
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        width: CARD_WIDTH,
        maxHeight: CARD_MAX_HEIGHT,
        zIndex: 9999
      }}
      className={cn(
        'rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800',
        'shadow-2xl shadow-zinc-950/15 dark:shadow-black/50 overflow-y-auto',
        'text-zinc-900 dark:text-zinc-100 animate-in fade-in zoom-in-95 duration-150'
      )}
      role="dialog"
      aria-label={`Profile card for ${displayName}`}
    >
      {/* Top-right Pin & Close controls */}
      <div className="flex items-center justify-end gap-1 px-3 pt-2.5">
        <button
          type="button"
          onClick={() => ctx?.togglePin()}
          title={isPinned ? 'Unpin card' : 'Pin card'}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            isPinned
              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
              : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          )}
        >
          <Pin size={14} className={cn(isPinned && 'fill-current')} />
        </button>
        <button
          type="button"
          onClick={() => ctx?.closeCard()}
          title="Close"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Header: Avatar + Name + Title + Quick Actions */}
      <div className="px-4 pb-3.5 pt-1 flex items-start gap-3.5 border-b border-zinc-100 dark:border-zinc-800">
        <UserAvatarWithPresence
          avatarUrl={displayAvatar || undefined}
          name={displayName}
          status={presenceStatus}
          size="lg"
          enableProfileCard={false}
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
              {displayName}
            </h3>
            {data?.isSynthetic && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Sparkles size={9} /> AI
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate mt-0.5">
            {data?.jobTitle || (isLoading ? 'Loading role...' : '')}
          </p>
          {data?.positionNumber && (
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono mt-0.5">
              {data.positionNumber}
            </p>
          )}

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5 mt-2.5">
            <button
              type="button"
              onClick={handleOpenChat}
              title="Message in Chat"
              className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <MessageSquare size={15} />
            </button>
            {primaryEmail && (
              <a
                href={`mailto:${primaryEmail}`}
                title={`Email ${primaryEmail}`}
                className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                <Mail size={15} />
              </a>
            )}
            {data?.id && (
              <button
                type="button"
                onClick={handleOpenDirectory}
                title="Open full profile"
                className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                <ExternalLink size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading / Error State */}
      {isLoading && !data && (
        <div className="p-4 space-y-2.5">
          <div className="h-3 w-28 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          <div className="h-3 w-48 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          <div className="h-3 w-36 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        </div>
      )}

      {isError && !data && (
        <div className="p-4 text-xs text-zinc-500 dark:text-zinc-400">
          Additional profile details are unavailable for this user.
        </div>
      )}

      {/* Body Sections */}
      {data && (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {/* Contact Section */}
          <div className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Contact
              </span>
              <ChevronRight size={13} className="text-zinc-400" />
            </div>

            <div className="flex items-center gap-2.5 text-xs">
              <UserPresenceBadge status={presenceStatus} size="sm" showLabel />
            </div>

            {primaryEmail && (
              <div className="flex items-center justify-between gap-2 group">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Mail size={13} className="text-zinc-400 shrink-0" />
                  <a
                    href={`mailto:${primaryEmail}`}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                  >
                    {primaryEmail}
                  </a>
                </div>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  title="Copy email"
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-all shrink-0"
                >
                  {copiedEmail ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                </button>
              </div>
            )}

            {data.phoneNumbers.map((phone) => (
              <div key={phone.id} className="flex items-center gap-2.5 text-xs text-zinc-600 dark:text-zinc-300">
                <Phone size={13} className="text-zinc-400 shrink-0" />
                <span className="truncate">
                  {phone.number}
                  {phone.label ? (
                    <span className="text-zinc-400 dark:text-zinc-500 ml-1.5">({phone.label})</span>
                  ) : null}
                </span>
              </div>
            ))}

            {data.workArrangements && (
              <div className="flex items-center gap-2.5 text-xs text-zinc-600 dark:text-zinc-300">
                <MapPin size={13} className="text-zinc-400 shrink-0" />
                <span className="truncate">{data.workArrangements}</span>
              </div>
            )}
          </div>

          {/* Organization / Reports To Section */}
          {data.reportsTo && (
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Organization
                </span>
                <ChevronRight size={13} className="text-zinc-400" />
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Reports to</p>
              <button
                type="button"
                onClick={() =>
                  ctx?.switchProfile(data.reportsTo!.id, {
                    name: data.reportsTo!.name,
                    avatarUrl: data.reportsTo!.avatarUrl || undefined
                  })
                }
                className="w-full flex items-center gap-2.5 p-1.5 -mx-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors text-left"
              >
                <UserAvatarWithPresence
                  avatarUrl={data.reportsTo.avatarUrl || undefined}
                  name={data.reportsTo.name}
                  size="sm"
                  enableProfileCard={false}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {data.reportsTo.name}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    {data.reportsTo.jobTitle}
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* Membership Section */}
          {data.memberships.length > 0 && (
            <div className="px-4 py-3">
              <button
                type="button"
                onClick={() => setMembershipsExpanded((v) => !v)}
                className="w-full flex items-center justify-between text-left group"
              >
                <div>
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">
                    Membership
                  </span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 block">
                    {data.memberships.length}{' '}
                    {data.memberships.length === 1 ? 'membership' : 'memberships'}
                  </span>
                </div>
                {membershipsExpanded ? (
                  <ChevronDown size={14} className="text-zinc-400 group-hover:text-zinc-600" />
                ) : (
                  <ChevronRight size={14} className="text-zinc-400 group-hover:text-zinc-600" />
                )}
              </button>

              {membershipsExpanded && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {data.memberships.map((m) => (
                    <span
                      key={`${m.kind}-${m.id}`}
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium',
                        m.kind === 'team'
                          ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      )}
                    >
                      <Users size={10} />
                      {m.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>,
    document.body
  );
};
