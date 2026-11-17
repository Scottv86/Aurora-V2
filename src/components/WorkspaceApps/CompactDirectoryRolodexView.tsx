import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  User,
  Building2,
  Mail,
  Phone,
  Star,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Copy,
  Check,
  Plus,
  Layers,
  List,
  Link2,
  Building,
  Hash,
  StickyNote,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config';
import { CreatePartyModal } from '../Platform/CreatePartyModal';

interface CompactDirectoryRolodexViewProps {
  compactLevel?: 'side' | 'bottom';
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');

export const CompactDirectoryRolodexView: React.FC<CompactDirectoryRolodexViewProps> = ({
  compactLevel: _compactLevel = 'bottom',
}) => {
  const navigate = useNavigate();
  const { tenant } = usePlatform();
  const { session } = useAuth();

  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PERSON' | 'ORGANIZATION' | 'STARRED'>('ALL');
  const [displayMode, setDisplayMode] = useState<'rolodex' | 'list'>('rolodex');

  // Rolodex active card index & 3D flip animation state
  const [activeIndex, setActiveIndex] = useState(0);
  const [flipDirection, setFlipDirection] = useState<1 | -1>(1);
  const [isRapidFlicking, setIsRapidFlicking] = useState(false);
  const [flickPreviewLetter, setFlickPreviewLetter] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Quick Note inline state on the Rolodex card
  const [quickNoteOpen, setQuickNoteOpen] = useState(false);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const flickTimersRef = useRef<number[]>([]);
  const wheelCooldownRef = useRef<number>(0);

  const getToken = useCallback(() => {
    return (
      (import.meta as any).env?.VITE_DEV_TOKEN ||
      session?.access_token ||
      localStorage.getItem('aurora_token')
    );
  }, [session?.access_token]);

  const fetchDirectory = useCallback(async () => {
    const token = getToken();
    if (!tenant?.id || !token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/people-organisations?limit=500`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-id': tenant.id,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.parties || [];
      setEntities(list);
    } catch {
      // Ignore error
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, getToken]);

  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  useEffect(() => {
    const handler = () => fetchDirectory();
    window.addEventListener('aurora:directory-updated', handler);
    return () => window.removeEventListener('aurora:directory-updated', handler);
  }, [fetchDirectory]);

  // Normalize & sort entities strictly in alphabetical order (A -> Z) like a real Rolodex
  const sortedEntities = useMemo(() => {
    const enriched = entities.map((e) => {
      const isPerson = e.partyType === 'PERSON';
      const displayName =
        e.displayName ||
        (isPerson
          ? `${e.person?.firstName || ''} ${e.person?.lastName || ''}`.trim()
          : e.organization?.legalName || e.organization?.tradingName) ||
        'Unnamed Entity';
      const firstChar = (displayName.trim()[0] || '#').toUpperCase();
      const indexLetter = /[A-Z]/.test(firstChar) ? firstChar : '#';
      return {
        ...e,
        _displayName: displayName,
        _indexLetter: indexLetter,
      };
    });

    const filtered = enriched.filter((e) => {
      if (typeFilter === 'PERSON' && e.partyType !== 'PERSON') return false;
      if (typeFilter === 'ORGANIZATION' && e.partyType !== 'ORGANIZATION') return false;
      if (typeFilter === 'STARRED' && !e.isStarred) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = e._displayName.toLowerCase().includes(q);
        const matchEmail = (e.email || '').toLowerCase().includes(q);
        const matchPhone = (e.phone || e.mobile || '').toLowerCase().includes(q);
        const matchCode = (e.partyCode || '').toLowerCase().includes(q);
        const matchOrg = (
          e.person?.primaryOrgName ||
          e.organization?.tradingName ||
          e.organization?.taxIdentifier ||
          ''
        )
          .toLowerCase()
          .includes(q);
        return matchName || matchEmail || matchPhone || matchCode || matchOrg;
      }
      return true;
    });

    return filtered.sort((a, b) =>
      a._displayName.localeCompare(b._displayName, undefined, { sensitivity: 'base' })
    );
  }, [entities, typeFilter, search]);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      flickTimersRef.current.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  // Trigger rapid Rolodex page-flicking animation when jumping across cards or searching
  const triggerRolodexFlickTo = useCallback(
    (targetIdx: number, totalCount: number) => {
      flickTimersRef.current.forEach((t) => window.clearTimeout(t));
      flickTimersRef.current = [];

      if (totalCount <= 0) {
        setActiveIndex(0);
        return;
      }

      const clampedTarget = Math.max(0, Math.min(totalCount - 1, targetIdx));
      const distance = Math.abs(clampedTarget - activeIndex);
      const dir: 1 | -1 = clampedTarget >= activeIndex ? 1 : -1;
      setFlipDirection(dir);

      if (distance <= 1) {
        setActiveIndex(clampedTarget);
        return;
      }

      // Multi-step rapid card flicking simulation (3 to 5 intermediate card flips)
      setIsRapidFlicking(true);
      const steps = Math.min(distance, 4);
      const stepDuration = 55;

      for (let i = 1; i <= steps; i++) {
        const intermediateIdx =
          i === steps
            ? clampedTarget
            : Math.round(activeIndex + ((clampedTarget - activeIndex) * i) / steps);
        const timer = window.setTimeout(() => {
          setActiveIndex(intermediateIdx);
          const item = sortedEntities[intermediateIdx];
          if (item) setFlickPreviewLetter(item._indexLetter);
          if (i === steps) {
            setIsRapidFlicking(false);
            window.setTimeout(() => setFlickPreviewLetter(null), 350);
          }
        }, i * stepDuration);
        flickTimersRef.current.push(timer);
      }
    },
    [activeIndex, sortedEntities]
  );

  // When search query changes, flick the Rolodex to the first matching result
  const prevSearchRef = useRef(search);
  useEffect(() => {
    if (prevSearchRef.current !== search) {
      prevSearchRef.current = search;
      setIsRapidFlicking(true);
      setFlipDirection(1);
      setActiveIndex(0);
      const t = window.setTimeout(() => {
        setIsRapidFlicking(false);
      }, 220);
      return () => window.clearTimeout(t);
    }
  }, [search]);

  // Keep activeIndex in bounds when list shrinks
  useEffect(() => {
    if (activeIndex >= sortedEntities.length && sortedEntities.length > 0) {
      setActiveIndex(sortedEntities.length - 1);
    }
  }, [sortedEntities.length, activeIndex]);

  // Map of which alphabet letters have entities
  const letterIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    sortedEntities.forEach((entity, idx) => {
      if (!map.has(entity._indexLetter)) {
        map.set(entity._indexLetter, idx);
      }
    });
    return map;
  }, [sortedEntities]);

  const activeEntity = sortedEntities[activeIndex] || null;
  const prevEntity = activeIndex > 0 ? sortedEntities[activeIndex - 1] : null;
  const nextEntity =
    activeIndex < sortedEntities.length - 1 ? sortedEntities[activeIndex + 1] : null;

  const stepCard = useCallback(
    (delta: 1 | -1) => {
      if (sortedEntities.length <= 1) return;
      setFlipDirection(delta);
      setQuickNoteOpen(false);
      setActiveIndex((prev) => {
        const next = prev + delta;
        if (next < 0) return sortedEntities.length - 1;
        if (next >= sortedEntities.length) return 0;
        return next;
      });
    },
    [sortedEntities.length]
  );

  const handleWheel = (e: React.WheelEvent) => {
    if (displayMode !== 'rolodex' || sortedEntities.length <= 1) return;
    const now = Date.now();
    if (now - wheelCooldownRef.current < 140) return;
    if (Math.abs(e.deltaY) < 12) return;
    wheelCooldownRef.current = now;
    stepCard(e.deltaY > 0 ? 1 : -1);
  };

  const handleCopy = (e: React.MouseEvent, text: string, label: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`Copied ${label}`);
    window.setTimeout(() => setCopiedField(null), 1500);
  };

  const handleToggleStar = async (e: React.MouseEvent, entity: any) => {
    e.stopPropagation();
    const token = getToken();
    if (!tenant?.id || !token) return;
    const nextStarred = !entity.isStarred;
    setEntities((prev) =>
      prev.map((item) => (item.id === entity.id ? { ...item, isStarred: nextStarred } : item))
    );
    try {
      await fetch(`${API_BASE_URL}/api/people-organisations/${entity.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-id': tenant.id,
        },
        body: JSON.stringify({ isStarred: nextStarred }),
      });
      window.dispatchEvent(new CustomEvent('aurora:directory-updated'));
    } catch {
      toast.error('Failed to update star');
    }
  };

  const handleSaveQuickNote = async () => {
    if (!activeEntity || !quickNoteText.trim() || !tenant?.id) return;
    const token = getToken();
    if (!token) return;
    setSavingNote(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-id': tenant.id,
        },
        body: JSON.stringify({
          title: `Rolodex Note: ${activeEntity._displayName}`,
          body: quickNoteText.trim(),
          content: quickNoteText.trim(),
          entityType: 'PARTY',
          entityId: activeEntity.id,
          color: 'amber',
        }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(`Pinned note to ${activeEntity._displayName}`);
      setQuickNoteText('');
      setQuickNoteOpen(false);
    } catch {
      toast.error('Could not save note');
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div
      onWheel={handleWheel}
      className="h-full w-full flex flex-col bg-zinc-100/70 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden select-none relative"
    >
      {/* Top Search & Rolodex Control Bar */}
      <div className="p-2.5 bg-white dark:bg-zinc-900/95 border-b border-zinc-200/80 dark:border-zinc-800/80 space-y-2 shrink-0 z-20">
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Flick Rolodex by name, email, code..."
              className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-indigo-500 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Mode Toggle: 3D Rolodex Deck vs A-Z List */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-950 p-0.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shrink-0">
            <button
              type="button"
              onClick={() => setDisplayMode('rolodex')}
              title="3D Rolodex Card Flipper"
              className={cn(
                'p-1.5 rounded-lg transition-all cursor-pointer',
                displayMode === 'rolodex'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              )}
            >
              <Layers size={13} />
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('list')}
              title="A–Z Compact Index List"
              className={cn(
                'p-1.5 rounded-lg transition-all cursor-pointer',
                displayMode === 'list'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              )}
            >
              <List size={13} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            title="Register New Directory Entity"
            className="p-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Filter Pills + Card Counter */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'PERSON', label: 'People' },
              { id: 'ORGANIZATION', label: 'Orgs' },
              { id: 'STARRED', label: '★ VIP' },
            ].map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => {
                  setTypeFilter(pill.id as any);
                  setActiveIndex(0);
                }}
                className={cn(
                  'px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer',
                  typeFilter === pill.id
                    ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                )}
              >
                {pill.label}
              </button>
            ))}
          </div>

          <span className="text-[10px] font-mono font-bold text-zinc-400">
            {sortedEntities.length > 0
              ? `${activeIndex + 1} / ${sortedEntities.length}`
              : '0 cards'}
          </span>
        </div>
      </div>

      {/* Main Rolodex Stage + Right A-Z Index Tab Rail */}
      <div className="flex-1 min-h-0 flex relative overflow-hidden">
        {/* Left/Center Stage */}
        <div className="flex-1 min-w-0 flex flex-col justify-between p-3 relative overflow-hidden">
          {/* Rapid Flicking Letter Watermark Overlay */}
          <AnimatePresence>
            {(isRapidFlicking || flickPreviewLetter) && activeEntity && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.12 }}
                className="pointer-events-none absolute top-3 right-4 z-30 w-10 h-10 rounded-2xl bg-indigo-600/90 text-white font-black text-lg flex items-center justify-center shadow-xl border border-white/20"
              >
                {flickPreviewLetter || activeEntity._indexLetter}
              </motion.div>
            )}
          </AnimatePresence>

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-zinc-400">
              <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              <span className="text-[11px] font-semibold">Loading Rolodex cards...</span>
            </div>
          ) : sortedEntities.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-2.5">
              <div className="w-11 h-11 rounded-2xl bg-zinc-200/70 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
                <User size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  No matching Rolodex cards
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Try another search or register a new entity.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={12} />
                <span>Register Entity</span>
              </button>
            </div>
          ) : displayMode === 'list' ? (
            /* COMPACT A-Z DIRECTORY LIST MODE */
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {sortedEntities.map((entity, idx) => {
                const isPerson = entity.partyType === 'PERSON';
                const showLetterDivider =
                  idx === 0 || sortedEntities[idx - 1]._indexLetter !== entity._indexLetter;

                return (
                  <React.Fragment key={entity.id}>
                    {showLetterDivider && (
                      <div className="sticky top-0 z-10 px-2 py-0.5 bg-zinc-200/80 dark:bg-zinc-900/90 backdrop-blur-xs rounded-md text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                        {entity._indexLetter}
                      </div>
                    )}
                    <div
                      onClick={() => {
                        setActiveIndex(idx);
                        setDisplayMode('rolodex');
                      }}
                      className={cn(
                        'p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2',
                        idx === activeIndex
                          ? 'bg-white dark:bg-zinc-900 border-indigo-500/40 shadow-xs'
                          : 'bg-white/60 dark:bg-zinc-900/40 border-zinc-200/60 dark:border-zinc-800/60 hover:bg-white dark:hover:bg-zinc-900'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {entity.avatarUrl ? (
                          <img
                            src={entity.avatarUrl}
                            alt={entity._displayName}
                            className="w-8 h-8 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                          />
                        ) : (
                          <div
                            className={cn(
                              'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border',
                              isPerson
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                                : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                            )}
                          >
                            {isPerson ? <User size={14} /> : <Building2 size={14} />}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                            {entity._displayName}
                          </p>
                          <p className="text-[10px] text-zinc-500 truncate">
                            {isPerson
                              ? entity.person?.jobTitle ||
                                entity.person?.primaryOrgName ||
                                entity.email ||
                                'Person'
                              : entity.organization?.industry ||
                                entity.organization?.taxIdentifier ||
                                'Organisation'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/workspace/apps/directory/${entity.id}`);
                        }}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors cursor-pointer shrink-0"
                        title="Open Profile"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          ) : (
            /* 3D ROLODEX MECHANICAL CARD STACK */
            <div
              className="flex-1 flex flex-col justify-between min-h-0"
              style={{ perspective: '1100px' }}
            >
              {/* Top Stacked Background Card Peek (Previous Card Edge) */}
              <div className="relative h-3 mx-3">
                <div
                  onClick={() => prevEntity && stepCard(-1)}
                  className={cn(
                    'inset-x-2 top-0 h-4 rounded-t-2xl border border-b-0 border-zinc-300/80 dark:border-zinc-800 bg-zinc-200/70 dark:bg-zinc-900/60 flex items-center justify-between px-3 text-[9px] font-bold text-zinc-400 transition-all',
                    prevEntity ? 'cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-800/80' : 'opacity-40'
                  )}
                >
                  <span className="truncate">
                    {prevEntity ? `▲ ${prevEntity._displayName}` : 'Top of Rolodex (A)'}
                  </span>
                  {prevEntity && (
                    <span className="font-mono text-[8px] uppercase">{prevEntity._indexLetter}</span>
                  )}
                </div>
              </div>

              {/* Active 3D Flipping Rolodex Index Card */}
              <div className="flex-1 min-h-0 relative flex flex-col">
                <AnimatePresence mode="popLayout" initial={false} custom={flipDirection}>
                  {activeEntity && (
                    <motion.div
                      key={activeEntity.id}
                      custom={flipDirection}
                      initial={{
                        rotateX: flipDirection > 0 ? -75 : 75,
                        y: flipDirection > 0 ? 18 : -18,
                        opacity: 0,
                        scale: 0.94,
                      }}
                      animate={{
                        rotateX: 0,
                        y: 0,
                        opacity: 1,
                        scale: 1,
                      }}
                      exit={{
                        rotateX: flipDirection > 0 ? 70 : -70,
                        y: flipDirection > 0 ? -16 : 16,
                        opacity: 0,
                        scale: 0.94,
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: isRapidFlicking ? 520 : 340,
                        damping: isRapidFlicking ? 34 : 26,
                        mass: 0.7,
                      }}
                      style={{ transformStyle: 'preserve-3d', transformOrigin: 'center bottom' }}
                      className="flex-1 min-h-0 flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden relative"
                    >
                      {/* Rolodex Top Divider Tab Header */}
                      <div className="px-3.5 py-2 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border-b border-zinc-200/70 dark:border-zinc-800 flex items-center justify-between gap-2 shrink-0">
                        <div className="flex items-center gap-2">
                          {/* Notched Alphabetical Tab Badge */}
                          <span className="px-2 py-0.5 rounded-t-lg rounded-b-sm bg-indigo-600 text-white text-[10px] font-black tracking-wider shadow-xs">
                            {activeEntity._indexLetter}
                          </span>
                          {activeEntity.partyCode && (
                            <span className="text-[10px] font-mono font-bold text-zinc-500 dark:text-zinc-400">
                              {activeEntity.partyCode}
                            </span>
                          )}
                          <span
                            className={cn(
                              'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider',
                              activeEntity.partyType === 'PERSON'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                            )}
                          >
                            {activeEntity.partyType === 'PERSON' ? 'Person' : 'Organisation'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleToggleStar(e, activeEntity)}
                            className="p-1 text-zinc-400 hover:text-amber-500 transition-colors cursor-pointer"
                            title={activeEntity.isStarred ? 'Unstar' : 'Star as VIP'}
                          >
                            <Star
                              size={13}
                              className={
                                activeEntity.isStarred ? 'fill-amber-500 text-amber-500' : ''
                              }
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/workspace/apps/directory/${activeEntity.id}`)
                            }
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold transition-colors cursor-pointer"
                            title="Open Directory Profile"
                          >
                            <span>Profile</span>
                            <ExternalLink size={10} />
                          </button>
                        </div>
                      </div>

                      {/* Rolodex Card Body */}
                      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 custom-scrollbar">
                        {/* Identity Row */}
                        <div className="flex items-start gap-3">
                          {activeEntity.avatarUrl ? (
                            <img
                              src={activeEntity.avatarUrl}
                              alt={activeEntity._displayName}
                              onClick={() =>
                                navigate(`/workspace/apps/directory/${activeEntity.id}`)
                              }
                              className="w-12 h-12 rounded-2xl object-cover border border-zinc-200 dark:border-zinc-700 shadow-xs shrink-0 cursor-pointer"
                            />
                          ) : (
                            <div
                              onClick={() =>
                                navigate(`/workspace/apps/directory/${activeEntity.id}`)
                              }
                              className={cn(
                                'w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 shadow-inner cursor-pointer',
                                activeEntity.partyType === 'PERSON'
                                  ? 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400'
                                  : 'bg-indigo-500/10 border-indigo-500/25 text-indigo-600 dark:text-indigo-400'
                              )}
                            >
                              {activeEntity.partyType === 'PERSON' ? (
                                <User size={22} />
                              ) : (
                                <Building2 size={22} />
                              )}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <h3
                              onClick={() =>
                                navigate(`/workspace/apps/directory/${activeEntity.id}`)
                              }
                              className="text-sm font-black text-zinc-900 dark:text-white truncate hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
                            >
                              {activeEntity._displayName}
                            </h3>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                              {activeEntity.partyType === 'PERSON'
                                ? [
                                    activeEntity.person?.jobTitle,
                                    activeEntity.person?.primaryOrgName ||
                                      activeEntity.primaryOrganization?.displayName,
                                  ]
                                    .filter(Boolean)
                                    .join(' @ ') || 'Individual Directory Contact'
                                : [
                                    activeEntity.organization?.orgStructureType,
                                    activeEntity.organization?.industry,
                                  ]
                                    .filter(Boolean)
                                    .join(' • ') || 'Corporate Organisation'}
                            </p>

                            {/* Classifications */}
                            {Array.isArray(activeEntity.classifications) &&
                              activeEntity.classifications.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {activeEntity.classifications.slice(0, 4).map((cls: string) => (
                                    <span
                                      key={cls}
                                      className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[9px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300"
                                    >
                                      {cls}
                                    </span>
                                  ))}
                                </div>
                              )}
                          </div>
                        </div>

                        {/* Punched Rolodex Contact Lines */}
                        <div className="space-y-1.5 pt-2 border-t border-dashed border-zinc-200 dark:border-zinc-800 text-xs">
                          {activeEntity.email && (
                            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/60 dark:border-zinc-800/60">
                              <div className="flex items-center gap-2 min-w-0">
                                <Mail size={12} className="text-indigo-500 shrink-0" />
                                <span className="text-[11px] font-medium truncate">
                                  {activeEntity.email}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => handleCopy(e, activeEntity.email, 'Email')}
                                  className="p-1 rounded hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                                  title="Copy Email"
                                >
                                  {copiedField === 'Email' ? (
                                    <Check size={11} className="text-emerald-500" />
                                  ) : (
                                    <Copy size={11} />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    navigate(
                                      `/workspace/apps/inbox?composeTo=${encodeURIComponent(
                                        activeEntity.email
                                      )}`
                                    )
                                  }
                                  className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold hover:bg-indigo-500/20 cursor-pointer"
                                >
                                  Email
                                </button>
                              </div>
                            </div>
                          )}

                          {(activeEntity.phone || activeEntity.mobile) && (
                            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/60 dark:border-zinc-800/60">
                              <div className="flex items-center gap-2 min-w-0">
                                <Phone size={12} className="text-emerald-500 shrink-0" />
                                <span className="text-[11px] font-medium truncate">
                                  {activeEntity.phone || activeEntity.mobile}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleCopy(
                                      e,
                                      activeEntity.phone || activeEntity.mobile,
                                      'Phone'
                                    )
                                  }
                                  className="p-1 rounded hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                                  title="Copy Phone"
                                >
                                  {copiedField === 'Phone' ? (
                                    <Check size={11} className="text-emerald-500" />
                                  ) : (
                                    <Copy size={11} />
                                  )}
                                </button>
                                <a
                                  href={`tel:${activeEntity.phone || activeEntity.mobile}`}
                                  className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold hover:bg-emerald-500/20"
                                >
                                  Call
                                </a>
                              </div>
                            </div>
                          )}

                          {activeEntity.organization?.taxIdentifier && (
                            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/60 dark:border-zinc-800/60">
                              <div className="flex items-center gap-2 min-w-0">
                                <Hash size={12} className="text-violet-500 shrink-0" />
                                <span className="text-[11px] font-mono truncate">
                                  ABN/Tax: {activeEntity.organization.taxIdentifier}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleCopy(
                                    e,
                                    activeEntity.organization.taxIdentifier,
                                    'Tax ID'
                                  )
                                }
                                className="p-1 rounded hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                              >
                                {copiedField === 'Tax ID' ? (
                                  <Check size={11} className="text-emerald-500" />
                                ) : (
                                  <Copy size={11} />
                                )}
                              </button>
                            </div>
                          )}

                          {activeEntity.person?.primaryOrgPartyId && (
                            <div
                              onClick={() => {
                                const orgIdx = sortedEntities.findIndex(
                                  (item) => item.id === activeEntity.person.primaryOrgPartyId
                                );
                                if (orgIdx >= 0) {
                                  triggerRolodexFlickTo(orgIdx, sortedEntities.length);
                                } else {
                                  navigate(
                                    `/workspace/apps/directory/${activeEntity.person.primaryOrgPartyId}`
                                  );
                                }
                              }}
                              className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Building size={12} className="text-indigo-500 shrink-0" />
                                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 truncate">
                                  {activeEntity.person?.primaryOrgName ||
                                    activeEntity.primaryOrganization?.displayName ||
                                    'Primary Organisation'}
                                </span>
                              </div>
                              <span className="text-[9px] font-bold text-indigo-500 shrink-0">
                                Flip to Org →
                              </span>
                            </div>
                          )}

                          {!activeEntity.email &&
                            !activeEntity.phone &&
                            !activeEntity.mobile &&
                            !activeEntity.organization?.taxIdentifier && (
                              <div className="px-2.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 text-[11px] text-zinc-400 italic">
                                No direct email or phone recorded on this card yet.
                              </div>
                            )}
                        </div>

                        {/* Quick Note Composer or 360° Ecosystem Strip */}
                        {quickNoteOpen ? (
                          <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/25 space-y-2">
                            <input
                              type="text"
                              value={quickNoteText}
                              onChange={(e) => setQuickNoteText(e.target.value)}
                              placeholder={`Pin quick note to ${activeEntity._displayName}...`}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveQuickNote();
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs focus:outline-none focus:border-amber-500"
                            />
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setQuickNoteOpen(false)}
                                className="px-2 py-1 rounded-lg text-[10px] font-bold text-zinc-500 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={savingNote || !quickNoteText.trim()}
                                onClick={handleSaveQuickNote}
                                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold disabled:opacity-50 cursor-pointer"
                              >
                                {savingNote ? 'Saving...' : 'Save Note'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-600 dark:text-zinc-300">
                                <Link2 size={10} className="text-indigo-500" />
                                {(activeEntity._count?.sourceRelationships || 0) +
                                  (activeEntity._count?.targetRelationships || 0)}{' '}
                                Connections
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setQuickNoteOpen(true)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              <StickyNote size={10} />
                              <span>+ Quick Note</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Classic Rolodex Bottom Spindle Cutouts & Flipper Bar */}
                      <div className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950/90 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between shrink-0 relative">
                        <button
                          type="button"
                          onClick={() => stepCard(-1)}
                          disabled={sortedEntities.length <= 1}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-600 dark:text-zinc-300 hover:border-indigo-500/40 disabled:opacity-40 cursor-pointer shadow-2xs"
                        >
                          <ChevronUp size={12} />
                          <span>Prev</span>
                        </button>

                        {/* Twin Rolodex Spindle Rail Notches */}
                        <div className="flex items-center gap-5 pointer-events-none">
                          <div className="w-3.5 h-4 rounded-t-full bg-zinc-200/90 dark:bg-zinc-800 border border-b-0 border-zinc-300 dark:border-zinc-700 shadow-inner" />
                          <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-400">
                            Rolodex
                          </span>
                          <div className="w-3.5 h-4 rounded-t-full bg-zinc-200/90 dark:bg-zinc-800 border border-b-0 border-zinc-300 dark:border-zinc-700 shadow-inner" />
                        </div>

                        <button
                          type="button"
                          onClick={() => stepCard(1)}
                          disabled={sortedEntities.length <= 1}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-600 dark:text-zinc-300 hover:border-indigo-500/40 disabled:opacity-40 cursor-pointer shadow-2xs"
                        >
                          <span>Next</span>
                          <ChevronDown size={12} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Bottom Stacked Card Peek (Next Card Edge) */}
              <div className="relative h-3 mx-3">
                <div
                  onClick={() => nextEntity && stepCard(1)}
                  className={cn(
                    'inset-x-2 bottom-0 h-4 rounded-b-2xl border border-t-0 border-zinc-300/80 dark:border-zinc-800 bg-zinc-200/70 dark:bg-zinc-900/60 flex items-center justify-between px-3 text-[9px] font-bold text-zinc-400 transition-all',
                    nextEntity ? 'cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-800/80' : 'opacity-40'
                  )}
                >
                  <span className="truncate">
                    {nextEntity ? `▼ ${nextEntity._displayName}` : 'End of Rolodex (Z)'}
                  </span>
                  {nextEntity && (
                    <span className="font-mono text-[8px] uppercase">{nextEntity._indexLetter}</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right-Hand Physical A–Z Rolodex Tab Rail */}
        <div className="w-7 py-1.5 px-0.5 bg-zinc-200/60 dark:bg-zinc-900/90 border-l border-zinc-200/80 dark:border-zinc-800 flex flex-col items-center justify-between shrink-0 z-20">
          {ALPHABET.map((letter) => {
            const targetIdx = letterIndexMap.get(letter);
            const hasEntries = targetIdx !== undefined;
            const isCurrentLetter = activeEntity?._indexLetter === letter;

            return (
              <button
                key={letter}
                type="button"
                disabled={!hasEntries}
                onClick={() => {
                  if (targetIdx !== undefined) {
                    triggerRolodexFlickTo(targetIdx, sortedEntities.length);
                  }
                }}
                title={
                  hasEntries
                    ? `Flip Rolodex to "${letter}"`
                    : `No entities starting with "${letter}"`
                }
                className={cn(
                  'w-5 h-3.5 rounded text-[8px] font-black leading-none flex items-center justify-center transition-all',
                  isCurrentLetter
                    ? 'bg-indigo-600 text-white shadow-xs scale-110'
                    : hasEntries
                    ? 'text-zinc-700 dark:text-zinc-200 hover:bg-indigo-500/20 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer'
                    : 'text-zinc-300 dark:text-zinc-700 cursor-default'
                )}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </div>

      {/* Inline Create Party Modal */}
      {isCreateModalOpen && (
        <CreatePartyModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={(created) => {
            fetchDirectory();
            if (created?.displayName) {
              setSearch('');
            }
          }}
        />
      )}
    </div>
  );
};
