import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Pin,
  PinOff,
  X,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  Clock,
  StickyNote,
  Bell,
  Layers,
  GitBranch,
  DollarSign,
  ArrowLeft,
  Send,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  PartyProfileCardData,
  PartyProfileTrigger,
  usePartyProfileCard,
} from '../../context/PartyProfileCardContext';
import { UserAvatarWithPresence, UserProfileTrigger } from './UserPresenceBadge';
import { useAuth } from '../../hooks/useAuth';
import { usePlatform } from '../../context/PlatformContext';
import { API_BASE_URL } from '../../config';

interface PartyProfileHoverCardProps {
  partyId: string;
  anchorRect: DOMRect;
  data: PartyProfileCardData | null;
  isLoading: boolean;
  isPinned: boolean;
  canGoBack: boolean;
  onGoBack: () => void;
  onSwitchParty: (partyId: string) => void;
  onPinToggle: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClose: () => void;
  onRefresh: () => void;
}

const CARD_WIDTH = 390;
const CARD_DEFAULT_HEIGHT = 380;
const VIEWPORT_PADDING = 12;

function computeCardCoords(
  anchorRect: DOMRect,
  cardHeight: number,
  cardWidth = CARD_WIDTH
): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Prefer placing below anchor; if insufficient viewport room, place above
  let top = anchorRect.bottom + 8;
  if (top + cardHeight > vh - VIEWPORT_PADDING) {
    const aboveTop = anchorRect.top - cardHeight - 8;
    top =
      aboveTop >= VIEWPORT_PADDING
        ? aboveTop
        : Math.max(VIEWPORT_PADDING, vh - cardHeight - VIEWPORT_PADDING);
  }

  // Horizontal positioning with viewport boundary clamping
  let left = anchorRect.left;
  if (left + cardWidth > vw - VIEWPORT_PADDING) {
    left = Math.max(VIEWPORT_PADDING, vw - cardWidth - VIEWPORT_PADDING);
  }
  if (left < VIEWPORT_PADDING) {
    left = VIEWPORT_PADDING;
  }

  return { top, left };
}

export const PartyProfileHoverCard: React.FC<PartyProfileHoverCardProps> = ({
  partyId,
  anchorRect,
  data,
  isLoading,
  isPinned,
  canGoBack,
  onGoBack,
  onSwitchParty,
  onPinToggle,
  onMouseEnter,
  onMouseLeave,
  onClose,
  onRefresh,
}) => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { tenant } = usePlatform();
  const cardRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'linked' | 'relationships'>('overview');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [quickMode, setQuickMode] = useState<'none' | 'note' | 'reminder'>('none');
  const [quickText, setQuickText] = useState('');
  const [quickDueAt, setQuickDueAt] = useState('');
  const [isSavingQuick, setIsSavingQuick] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  // Reset tab when switching only if not navigating history
  useEffect(() => {
    setQuickMode('none');
    setQuickText('');
  }, [partyId]);

  // Compute viewport-clamped position dynamically based on actual rendered card height
  useLayoutEffect(() => {
    if (!anchorRect) {
      setCoords(null);
      return;
    }

    const updateCoords = () => {
      const height = cardRef.current?.offsetHeight || CARD_DEFAULT_HEIGHT;
      const width = cardRef.current?.offsetWidth || CARD_WIDTH;
      setCoords(computeCardCoords(anchorRect, height, width));
    };

    updateCoords();

    let ro: ResizeObserver | null = null;
    if (cardRef.current && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        updateCoords();
      });
      ro.observe(cardRef.current);
    }

    return () => {
      if (ro) ro.disconnect();
    };
  }, [anchorRect, data, activeTab, quickMode, isLoading, partyId]);

  // Close on Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Close on outside click when pinned
  useEffect(() => {
    if (!isPinned) return;
    const onMouseDown = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isPinned, onClose]);

  const activeCoords = coords ?? computeCardCoords(anchorRect, CARD_DEFAULT_HEIGHT, CARD_WIDTH);

  const isOrg = data?.partyType === 'ORGANIZATION';
  const displayName =
    data?.displayName ||
    (isOrg
      ? data?.organization?.legalName || 'Organisation'
      : `${data?.person?.firstName || ''} ${data?.person?.lastName || ''}`.trim() || 'Person');

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleCopy = (val: string, field: string) => {
    navigator.clipboard.writeText(val);
    setCopiedField(field);
    toast.success(`Copied ${field} to clipboard`);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const getStatusBadge = (status?: string) => {
    const s = (status || 'VERIFIED').toUpperCase();
    if (s === 'VERIFIED' || s === 'ACTIVE') {
      return {
        label: s === 'VERIFIED' ? 'Verified' : 'Active',
        icon: ShieldCheck,
        cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
      };
    }
    if (s === 'FLAGGED') {
      return {
        label: 'Flagged',
        icon: AlertTriangle,
        cls: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25',
      };
    }
    return {
      label: s.replace('_', ' '),
      icon: Clock,
      cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25',
    };
  };

  const statusMeta = getStatusBadge(data?.status);
  const StatusIcon = statusMeta.icon;

  const primaryAddress = Array.isArray(data?.addresses) && data!.addresses.length > 0 ? data!.addresses[0] : null;
  const formattedAddress = primaryAddress
    ? [primaryAddress.line1, primaryAddress.city, primaryAddress.state, primaryAddress.postalCode]
        .filter(Boolean)
        .join(', ')
    : null;

  const handleSaveQuickItem = async () => {
    if (!quickText.trim() || !tenant?.id) return;
    setIsSavingQuick(true);
    const token =
      (import.meta as any).env?.VITE_DEV_TOKEN || session?.access_token || localStorage.getItem('aurora_token');

    try {
      if (quickMode === 'note') {
        const res = await fetch(`${API_BASE_URL}/api/notes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'x-tenant-id': tenant.id,
          },
          body: JSON.stringify({
            title: `Note on ${displayName}`,
            body: quickText.trim(),
            content: quickText.trim(),
            entityType: 'PARTY',
            entityId: partyId,
            color: 'sky',
          }),
        });
        if (!res.ok) throw new Error('Failed to save note');
        toast.success(`Added note to ${displayName}`);
      } else if (quickMode === 'reminder') {
        const dueAt = quickDueAt
          ? new Date(quickDueAt).toISOString()
          : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const res = await fetch(`${API_BASE_URL}/api/reminders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'x-tenant-id': tenant.id,
          },
          body: JSON.stringify({
            title: quickText.trim(),
            dueAt,
            priority: 'MEDIUM',
            entityType: 'PARTY',
            entityId: partyId,
          }),
        });
        if (!res.ok) throw new Error('Failed to create reminder');
        toast.success(`Scheduled reminder for ${displayName}`);
      }
      setQuickMode('none');
      setQuickText('');
      setQuickDueAt('');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setIsSavingQuick(false);
    }
  };

  return createPortal(
    <motion.div
      key={partyId}
      ref={cardRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        top: activeCoords.top,
        left: activeCoords.left,
        width: CARD_WIDTH,
        maxHeight: 'calc(100vh - 24px)',
        zIndex: 9999,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={(e) => e.stopPropagation()}
      className="bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl shadow-2xl shadow-zinc-950/20 dark:shadow-black/60 overflow-hidden text-zinc-900 dark:text-zinc-100"
      role="dialog"
      aria-label={`Profile card for ${displayName}`}
    >
      {/* Top Banner Accent */}
      <div
        className={`h-16 relative ${
          isOrg
            ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-sky-600'
            : 'bg-gradient-to-r from-sky-600 via-indigo-600 to-blue-600'
        }`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_60%)]" />

        {/* Back button if user navigated across related entities */}
        {canGoBack && (
          <button
            type="button"
            onClick={onGoBack}
            className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-black/25 hover:bg-black/40 text-white text-[10px] font-semibold backdrop-blur-md transition-colors cursor-pointer"
            title="Back to previous entity"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Back</span>
          </button>
        )}

        {/* Entity Type & Party Code Pill */}
        <div className={`absolute top-2.5 ${canGoBack ? 'left-16' : 'left-3'} flex items-center gap-1.5`}>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/25 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
            {isOrg ? <Building2 className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
            {isOrg ? data?.organization?.orgStructureType || 'Organisation' : 'Person'}
          </span>
          {data?.partyCode && (
            <span className="px-1.5 py-0.5 rounded bg-white/15 text-white/90 text-[9px] font-mono font-semibold backdrop-blur-md">
              {data.partyCode}
            </span>
          )}
        </div>

        {/* Pin & Close Controls */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
          <button
            type="button"
            onClick={onPinToggle}
            title={isPinned ? 'Unpin card' : 'Pin card to screen'}
            className={`p-1.5 rounded-lg border backdrop-blur-md transition-colors cursor-pointer ${
              isPinned
                ? 'bg-white/30 border-white/40 text-white shadow-xs'
                : 'bg-black/25 border-white/10 text-white/90 hover:bg-black/40 hover:text-white'
            }`}
          >
            {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close card"
            className="p-1.5 rounded-lg bg-black/25 border border-white/10 text-white/90 hover:bg-black/40 hover:text-white backdrop-blur-md transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Identity Header */}
      <div className="px-4 pb-3 -mt-7 relative">
        <div className="flex items-end justify-between gap-2">
          <div className="relative">
            {data?.avatarUrl ? (
              <img
                src={data.avatarUrl}
                alt={displayName}
                className="w-14 h-14 rounded-2xl object-cover ring-4 ring-white dark:ring-zinc-900 bg-zinc-100 dark:bg-zinc-800 shadow-md"
              />
            ) : (
              <div
                className={`w-14 h-14 rounded-2xl ring-4 ring-white dark:ring-zinc-900 flex items-center justify-center font-bold text-base text-white shadow-md ${
                  isOrg
                    ? 'bg-gradient-to-br from-violet-600 to-indigo-700'
                    : 'bg-gradient-to-br from-sky-500 to-indigo-600'
                }`}
              >
                {isOrg ? <Building2 className="w-6 h-6" /> : initials || <User className="w-6 h-6" />}
              </div>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1.5 pb-0.5">
            {data?.email && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(`/workspace/apps/inbox?composeTo=${encodeURIComponent(data.email!)}`);
                }}
                title={`Email ${data.email} in Aurora Inbox`}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-[11px] font-semibold transition-all shadow-xs hover:shadow cursor-pointer shrink-0"
              >
                <Mail className="w-3 h-3" />
                <span>Email</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setQuickMode((prev) => (prev === 'note' ? 'none' : 'note'))}
              title={quickMode === 'note' ? 'Close Quick Note' : 'Add Quick Note'}
              className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-all shadow-2xs hover:shadow-xs cursor-pointer shrink-0 ${
                quickMode === 'note'
                  ? 'bg-amber-100 dark:bg-amber-950/70 border-amber-300 dark:border-amber-700/80 text-amber-800 dark:text-amber-200 shadow-xs'
                  : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200/90 dark:border-zinc-700 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <StickyNote className="w-3 h-3 text-amber-500 dark:text-amber-400" />
              <span>Note</span>
            </button>
            <button
              type="button"
              onClick={() => setQuickMode((prev) => (prev === 'reminder' ? 'none' : 'reminder'))}
              title={quickMode === 'reminder' ? 'Close Quick Reminder' : 'Schedule Quick Reminder'}
              className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-all shadow-2xs hover:shadow-xs cursor-pointer shrink-0 ${
                quickMode === 'reminder'
                  ? 'bg-purple-100 dark:bg-purple-950/70 border-purple-300 dark:border-purple-700/80 text-purple-800 dark:text-purple-200 shadow-xs'
                  : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200/90 dark:border-zinc-700 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Bell className="w-3 h-3 text-purple-500 dark:text-purple-400" />
              <span>Remind</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/workspace/apps/directory/${partyId}`);
              }}
              title="Open Directory Profile"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-zinc-100 dark:bg-zinc-800 border-zinc-200/90 dark:border-zinc-700 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/80 text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white transition-all shadow-2xs hover:shadow-xs cursor-pointer shrink-0"
            >
              <span>Profile</span>
              <ExternalLink className="w-3 h-3 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200" />
            </button>
          </div>
        </div>

        {/* Name, Subtitle & Badges */}
        <div className="mt-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3
              onClick={() => {
                onClose();
                navigate(`/workspace/people-organisations/${partyId}`);
              }}
              className="text-sm font-bold text-zinc-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer truncate max-w-[230px]"
            >
              {displayName}
            </h3>
            <span
              className={`inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded-full border ${statusMeta.cls}`}
            >
              <StatusIcon className="w-2.5 h-2.5" />
              {statusMeta.label}
            </span>
          </div>

          {/* Role @ Org (for Person) or Industry + Tax ID (for Org) */}
          {!isOrg ? (
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1 flex-wrap">
              {(data?.roleAtOrganization || data?.person?.jobTitle) && (
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {data?.roleAtOrganization || data?.person?.jobTitle}
                </span>
              )}
              {(data?.primaryOrganization || data?.person?.primaryOrgName) && (
                <>
                  {(data?.roleAtOrganization || data?.person?.jobTitle) && <span>at</span>}
                  {data?.primaryOrganization ? (
                    <button
                      type="button"
                      onClick={() => onSwitchParty(data.primaryOrganization!.id)}
                      className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      title="Inspect Organisation in card"
                    >
                      <Building2 className="w-3 h-3" />
                      <span>{data.primaryOrganization.displayName}</span>
                    </button>
                  ) : (
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {data?.person?.primaryOrgName}
                    </span>
                  )}
                </>
              )}
              {!data?.roleAtOrganization &&
                !data?.person?.jobTitle &&
                !data?.primaryOrganization &&
                !data?.person?.primaryOrgName && <span>Individual Directory Contact</span>}
            </div>
          ) : (
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-2 flex-wrap">
              {data?.organization?.tradingName && data.organization.tradingName !== displayName && (
                <span>t/a {data.organization.tradingName}</span>
              )}
              {data?.organization?.industry && (
                <span className="font-medium text-zinc-700 dark:text-zinc-300">{data.organization.industry}</span>
              )}
              {data?.organization?.taxIdentifier && (
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  Tax ID: {data.organization.taxIdentifier}
                </span>
              )}
            </div>
          )}

          {/* Classifications / Tags */}
          {Array.isArray(data?.classifications) && data!.classifications.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap mt-1.5">
              {data!.classifications.map((cls) => (
                <span
                  key={cls}
                  className="px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 text-[9.5px] font-bold uppercase tracking-wider"
                >
                  {cls}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Inline Quick Note or Reminder Composer */}
        {quickMode !== 'none' && (
          <div className="mt-2.5 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                {quickMode === 'note' ? (
                  <>
                    <StickyNote className="w-3 h-3 text-amber-500" /> Quick Note for {displayName}
                  </>
                ) : (
                  <>
                    <Bell className="w-3 h-3 text-purple-500" /> Schedule Follow-up Reminder
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={() => setQuickMode('none')}
                className="text-zinc-400 hover:text-zinc-600 text-[10px]"
              >
                Cancel
              </button>
            </div>
            <textarea
              rows={2}
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              placeholder={
                quickMode === 'note'
                  ? 'Write a note linked to this entity...'
                  : 'What needs to be followed up?'
              }
              className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex items-center justify-between gap-2">
              {quickMode === 'reminder' ? (
                <input
                  type="datetime-local"
                  value={quickDueAt}
                  onChange={(e) => setQuickDueAt(e.target.value)}
                  className="text-[10px] px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
                />
              ) : (
                <span className="text-[10px] text-zinc-400">Saved to Timeline & Notes</span>
              )}
              <button
                type="button"
                disabled={isSavingQuick || !quickText.trim()}
                onClick={handleSaveQuickItem}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[10.5px] font-semibold cursor-pointer"
              >
                <Send className="w-2.5 h-2.5" />
                <span>{isSavingQuick ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-4 text-xs font-semibold bg-zinc-50/50 dark:bg-zinc-900/50">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`py-2 px-2.5 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('linked')}
          className={`py-2 px-2.5 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'linked'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <span>Anything Linked</span>
          {data?.linkedSummary?.totalLinkedItems !== undefined && (
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
              {data.linkedSummary.totalLinkedItems}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('relationships')}
          className={`py-2 px-2.5 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'relationships'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <span>Relationships</span>
          {data?.relationships && data.relationships.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-bold">
              {data.relationships.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content Body */}
      <div className="p-4 max-h-64 overflow-y-auto space-y-3 text-xs custom-scrollbar">
        {isLoading && !data ? (
          <div className="py-8 text-center text-zinc-400 text-xs">Loading directory profile...</div>
        ) : activeTab === 'overview' ? (
          <>
            {/* Vital Pulse Strip */}
            <div className="grid grid-cols-3 gap-2">
              <div
                onClick={() => setActiveTab('linked')}
                className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800 cursor-pointer hover:border-indigo-500/40 transition-colors"
              >
                <div className="text-[10px] text-zinc-400 font-medium">Linked Records</div>
                <div className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  {data?.linkedSummary?.moduleRecordsCount ?? 0}
                </div>
              </div>
              <div
                onClick={() => {
                  onClose();
                  navigate(`/workspace/apps/directory/${partyId}?tab=financials`);
                }}
                className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800 cursor-pointer hover:border-emerald-500/40 transition-colors"
              >
                <div className="text-[10px] text-zinc-400 font-medium">
                  {data?.financialSnapshot?.outstandingPayables && !data?.financialSnapshot?.outstandingReceivables
                    ? 'AP Balance'
                    : 'AR Balance'}
                </div>
                <div className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5 flex items-center gap-0.5 font-mono">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  {(
                    data?.financialSnapshot?.outstandingReceivables ||
                    data?.financialSnapshot?.outstandingPayables ||
                    0
                  ).toLocaleString()}
                </div>
              </div>
              <div
                onClick={() => setActiveTab('relationships')}
                className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800 cursor-pointer hover:border-sky-500/40 transition-colors"
              >
                <div className="text-[10px] text-zinc-400 font-medium">Relationships</div>
                <div className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5 flex items-center gap-1">
                  <GitBranch className="w-3.5 h-3.5 text-sky-500" />
                  {data?.relationships?.length ?? 0}
                </div>
              </div>
            </div>

            {/* Contact Channels */}
            <div className="space-y-1.5">
              {data?.email && (
                <div className="flex items-center justify-between group py-1 px-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <a
                      href={`mailto:${data.email}`}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                    >
                      {data.email}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(data.email!, 'email')}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-700 transition-opacity"
                    title="Copy email"
                  >
                    {copiedField === 'email' ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              )}

              {(data?.phone || data?.mobile) && (
                <div className="flex items-center justify-between group py-1 px-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <a
                      href={`tel:${data.phone || data.mobile}`}
                      className="text-zinc-700 dark:text-zinc-200 font-medium hover:underline truncate"
                    >
                      {data.phone || data.mobile}
                    </a>
                    {data.mobile && data.phone && data.mobile !== data.phone && (
                      <span className="text-[10px] text-zinc-400">({data.mobile})</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy((data.phone || data.mobile)!, 'phone')}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-700 transition-opacity"
                    title="Copy phone"
                  >
                    {copiedField === 'phone' ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              )}

              {data?.website && (
                <div className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <Globe className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <a
                    href={data.website.startsWith('http') ? data.website : `https://${data.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                  >
                    {data.website}
                  </a>
                </div>
              )}

              {formattedAddress && (
                <div className="flex items-start gap-2 py-1 px-2 rounded-lg">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                  <span className="text-zinc-600 dark:text-zinc-300 leading-snug">{formattedAddress}</span>
                </div>
              )}

              {!data?.email && !data?.phone && !data?.mobile && !data?.website && !formattedAddress && (
                <div className="py-1.5 px-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-dashed border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
                  <span>No contact channels recorded yet</span>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate(`/workspace/apps/directory/${partyId}?tab=overview`);
                    }}
                    className="text-indigo-500 hover:underline font-semibold cursor-pointer"
                  >
                    + Add Details
                  </button>
                </div>
              )}
            </div>

            {/* Quick Preview of Linked Module Records right inside Overview */}
            {data?.linkedSummary?.recentModuleRecords &&
              data.linkedSummary.recentModuleRecords.length > 0 && (
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Recent Linked Records ({data.linkedSummary.moduleRecordsCount})
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('linked')}
                      className="text-[10px] font-semibold text-indigo-500 hover:underline cursor-pointer"
                    >
                      View all
                    </button>
                  </div>
                  {data.linkedSummary.recentModuleRecords.slice(0, 2).map((rec) => (
                    <div
                      key={rec.id}
                      onClick={() => {
                        onClose();
                        navigate(`/workspace/modules/${rec.moduleId}/records/${rec.id}`);
                      }}
                      className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 border border-zinc-200/60 dark:border-zinc-800 cursor-pointer transition-colors group"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold text-zinc-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                          {rec.title}
                        </div>
                        <div className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                          <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                            {rec.recordKey}
                          </span>
                          <span>•</span>
                          <span className="truncate">{rec.moduleName}</span>
                        </div>
                      </div>
                      <ExternalLink className="w-3 h-3 text-zinc-400 group-hover:text-indigo-500 shrink-0" />
                    </div>
                  ))}
                </div>
              )}

            {/* Associated Primary Contact (if Org) or Primary Org (if Person) */}
            {isOrg && data?.primaryContact && (
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Primary Contact
                </div>
                <div
                  onClick={() => onSwitchParty(data.primaryContact!.id)}
                  className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 border border-zinc-200/60 dark:border-zinc-800 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-[11px] shrink-0">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-zinc-900 dark:text-white truncate">
                        {data.primaryContact.displayName}
                      </div>
                      <div className="text-[10px] text-zinc-500 truncate">
                        {data.primaryContact.jobTitle || data.primaryContact.email || 'Primary Contact'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                </div>
              </div>
            )}

            {/* Internal Account Owner */}
            {data?.accountOwner && (
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Account Owner</span>
                <UserProfileTrigger userId={data.accountOwner.id}>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                    <UserAvatarWithPresence
                      avatarUrl={data.accountOwner.avatarUrl}
                      name={data.accountOwner.name}
                      size="xs"
                    />
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      {data.accountOwner.name}
                    </span>
                  </div>
                </UserProfileTrigger>
              </div>
            )}
          </>
        ) : activeTab === 'linked' ? (
          <div className="space-y-2.5">
            {/* Module Records Section */}
            <div>
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                <span>Referenced in Module Records ({data?.linkedSummary?.moduleRecordsCount ?? 0})</span>
              </div>
              {data?.linkedSummary?.recentModuleRecords && data.linkedSummary.recentModuleRecords.length > 0 ? (
                <div className="space-y-1.5">
                  {data.linkedSummary.recentModuleRecords.map((rec) => (
                    <div
                      key={rec.id}
                      onClick={() => {
                        onClose();
                        navigate(`/workspace/modules/${rec.moduleId}/records/${rec.id}`);
                      }}
                      className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 border border-zinc-200/60 dark:border-zinc-800 cursor-pointer transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {rec.recordKey}
                          </span>
                          <span className="text-[10px] text-zinc-400">• {rec.moduleName}</span>
                        </div>
                        <div className="font-semibold text-zinc-900 dark:text-white truncate mt-0.5">
                          {rec.title}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-zinc-200/70 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[9.5px] font-bold shrink-0">
                        {rec.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-2 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 text-zinc-400 text-[11px]">
                  No module records directly referencing this entity yet.
                </div>
              )}
            </div>

            {/* Recent Invoices */}
            {data?.linkedSummary?.recentInvoices && data.linkedSummary.recentInvoices.length > 0 && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Recent Invoices
                </div>
                <div className="space-y-1">
                  {data.linkedSummary.recentInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => {
                        onClose();
                        navigate(`/workspace/finance`);
                      }}
                      className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                        {inv.invoiceNumber}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                          ${inv.total.toLocaleString()}
                        </span>
                        <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ecosystem Pill Counters */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <div className="p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 text-center">
                <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  {data?.linkedSummary?.serviceDeskSessionsCount ?? 0}
                </div>
                <div className="text-[9.5px] text-zinc-400">Chats / Calls</div>
              </div>
              <div className="p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 text-center">
                <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  {data?.linkedSummary?.notesCount ?? 0}
                </div>
                <div className="text-[9.5px] text-zinc-400">Notes</div>
              </div>
              <div className="p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 text-center">
                <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  {data?.linkedSummary?.openRemindersCount ?? 0}
                </div>
                <div className="text-[9.5px] text-zinc-400">Open Tasks</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/workspace/apps/directory/${partyId}?tab=linked`);
              }}
              className="w-full py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>View All Linked Records</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          /* Relationships Tab */
          <div className="space-y-1.5">
            {data?.relationships && data.relationships.length > 0 ? (
              data.relationships.map((rel) => (
                <div
                  key={rel.id}
                  onClick={() => onSwitchParty(rel.otherParty.id)}
                  className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 border border-zinc-200/60 dark:border-zinc-800 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        rel.otherParty.partyType === 'ORGANIZATION'
                          ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400'
                          : 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                      }`}
                    >
                      {rel.otherParty.partyType === 'ORGANIZATION' ? (
                        <Building2 className="w-3.5 h-3.5" />
                      ) : (
                        <User className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-zinc-900 dark:text-white truncate">
                        {rel.otherParty.displayName}
                      </div>
                      <div className="text-[10px] text-zinc-500 truncate flex items-center gap-1">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                          {rel.relationshipType}
                        </span>
                        {rel.roleTitle && <span>• {rel.roleTitle}</span>}
                        {rel.ownershipPercentage ? <span>• {rel.ownershipPercentage}% Equity</span> : null}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-zinc-400">
                No corporate or personal relationships mapped yet.
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>,
    document.body
  );
};

/**
 * Reusable Semantic Directory Badge with Built-In MS365 Hover Card Trigger.
 * Drop this anywhere a partyId is rendered (Module tables, Kanban cards, Record Detail fields, Finance, POS, Inbox).
 */
export const PartyEntityBadge: React.FC<{
  partyId?: string | null;
  fallbackName?: string | null;
  partyType?: 'PERSON' | 'ORGANIZATION';
  subtitle?: string | null;
  size?: 'xs' | 'sm' | 'md';
  showSubtitle?: boolean;
  onClickBehavior?: 'hover_only' | 'open_card' | 'navigate_profile';
  className?: string;
}> = ({
  partyId,
  fallbackName,
  partyType,
  subtitle,
  size = 'sm',
  showSubtitle = false,
  onClickBehavior = 'open_card',
  className = '',
}) => {
  const { getPartySummary } = usePartyProfileCard();
  const resolved = partyId ? getPartySummary(partyId) : null;

  const effectiveType = resolved?.partyType || partyType || 'PERSON';
  const isOrg = effectiveType === 'ORGANIZATION';
  const resolvedName = resolved?.displayName || fallbackName || null;
  const displayName = resolvedName || 'Directory Entity';

  const resolvedSubtitle =
    subtitle ||
    (isOrg
      ? resolved?.organization?.industry || resolved?.organization?.taxIdentifier
      : resolved?.person?.jobTitle || resolved?.person?.primaryOrgName);

  if (!partyId && !fallbackName) {
    return <span className="text-zinc-400">-</span>;
  }

  const avatarSizeCls =
    size === 'xs' ? 'w-5 h-5 text-[9px]' : size === 'md' ? 'w-7 h-7 text-xs' : 'w-6 h-6 text-[10px]';

  return (
    <PartyProfileTrigger
      partyId={partyId}
      fallbackData={
        resolved ||
        (fallbackName
          ? {
              id: partyId || '',
              partyType: effectiveType,
              displayName: fallbackName,
            }
          : undefined)
      }
      onClickBehavior={onClickBehavior}
      className={`inline-flex items-center gap-2 group/party max-w-full ${className}`}
    >
      {resolved?.avatarUrl ? (
        <img
          src={resolved.avatarUrl}
          alt={displayName}
          className={`${avatarSizeCls} rounded-lg object-cover shrink-0 border border-zinc-200 dark:border-zinc-700`}
        />
      ) : (
        <span
          className={`${avatarSizeCls} rounded-lg flex items-center justify-center shrink-0 font-bold border ${
            isOrg
              ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20'
              : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
          }`}
        >
          {isOrg ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
        </span>
      )}
      <span className="min-w-0 flex flex-col">
        {resolvedName ? (
          <span className="text-xs font-bold text-zinc-900 dark:text-white group-hover/party:text-indigo-600 dark:group-hover/party:text-indigo-400 transition-colors truncate">
            {resolvedName}
          </span>
        ) : (
          <span className="h-3.5 w-28 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse inline-block" />
        )}
        {showSubtitle && resolvedSubtitle && (
          <span className="text-[10px] text-zinc-400 truncate leading-tight">{resolvedSubtitle}</span>
        )}
      </span>
    </PartyProfileTrigger>
  );
};
