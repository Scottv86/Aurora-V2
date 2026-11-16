import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Building2, 
  User as UserIcon, 
  Search, 
  X, 
  ChevronDown, 
  Check, 
  Plus, 
  Loader2,
  Briefcase,
  Building
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config';
import { CreatePartyModal } from '../Platform/CreatePartyModal';

export interface DirectoryParty {
  id: string;
  displayName: string;
  partyType?: 'PERSON' | 'ORGANIZATION';
  partyCode?: string;
  avatarUrl?: string;
  email?: string;
  phone?: string;
  classifications?: string[];
  person?: {
    firstName?: string;
    lastName?: string;
    jobTitle?: string;
    department?: string;
    primaryOrgName?: string;
  };
  organization?: {
    legalName?: string;
    tradingName?: string;
    industry?: string;
  };
}

export interface DirectoryLookupProps {
  value?: string; // partyId
  onChange: (partyId: string, party?: DirectoryParty | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  className?: string;
  dropdownWidth?: string; // e.g. "w-[340px]" or "w-full"
  filterPartyType?: 'ALL' | 'PERSON' | 'ORGANIZATION';
  filterClassification?: string;
  showCreateButton?: boolean;
  disabled?: boolean;
  includeInternalOption?: boolean;
  internalLabel?: string;
}

export const DirectoryLookup: React.FC<DirectoryLookupProps> = ({
  value,
  onChange,
  placeholder = 'Select client...',
  allowClear = true,
  className,
  dropdownWidth = 'w-[320px]',
  filterPartyType = 'ALL',
  filterClassification,
  showCreateButton = true,
  disabled = false,
  includeInternalOption = true,
  internalLabel = 'Internal / General (Non-client)'
}) => {
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
  const tenantId = tenant?.id;

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'ORGANIZATION' | 'PERSON'>(filterPartyType);
  const [parties, setParties] = useState<DirectoryParty[]>([]);
  const [selectedParty, setSelectedParty] = useState<DirectoryParty | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<any>(null);

  // Fetch / search directory entities
  const fetchParties = useCallback(async (query: string = '') => {
    if (!tenantId) return;
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('search', query.trim());
      if (typeFilter !== 'ALL') params.set('partyType', typeFilter);
      if (filterClassification && filterClassification !== 'ALL') {
        params.set('classification', filterClassification);
      }
      params.set('limit', '40');

      const headers: HeadersInit = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'x-tenant-id': tenantId
      };

      const res = await fetch(`${API_BASE_URL}/api/people-organisations?${params.toString()}`, { headers });
      if (res.ok) {
        const data = await res.json();
        const rawList = Array.isArray(data) ? data : (data.parties || data.records || []);
        
        const mappedList: DirectoryParty[] = rawList.map((p: any) => ({
          id: p.id,
          displayName: p.displayName || 
            (p.partyType === 'PERSON' 
              ? `${p.person?.firstName || ''} ${p.person?.lastName || ''}`.trim() 
              : (p.organization?.legalName || p.organization?.tradingName)) || 'Unnamed Entity',
          partyType: p.partyType || (p.organization ? 'ORGANIZATION' : 'PERSON'),
          partyCode: p.partyCode,
          avatarUrl: p.avatarUrl,
          email: p.email || p.person?.contactDetails?.email || p.organization?.contactDetails?.email,
          phone: p.phone || p.mobile,
          classifications: p.classifications || [],
          person: p.person,
          organization: p.organization
        }));

        setParties(mappedList);

        // If we have an active value and haven't populated selectedParty yet, resolve it
        if (value && !selectedParty) {
          const match = mappedList.find(p => p.id === value);
          if (match) setSelectedParty(match);
        }
      }
    } catch (err) {
      console.error('[DirectoryLookup] Failed to fetch directory parties:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, token, typeFilter, filterClassification, value, selectedParty]);

  // Initial fetch and value sync
  useEffect(() => {
    fetchParties();
  }, [fetchParties]);

  // When value changes from parent, resolve selected party details if not present
  useEffect(() => {
    if (!value) {
      setSelectedParty(null);
      return;
    }
    const existing = parties.find(p => p.id === value);
    if (existing) {
      setSelectedParty(existing);
    } else if (tenantId && (!selectedParty || selectedParty.id !== value)) {
      // Fetch specific party by id
      const headers: HeadersInit = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'x-tenant-id': tenantId
      };
      fetch(`${API_BASE_URL}/api/people-organisations/${value}`, { headers })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            const p = data.party || data;
            const mapped: DirectoryParty = {
              id: p.id,
              displayName: p.displayName || 
                (p.partyType === 'PERSON' 
                  ? `${p.person?.firstName || ''} ${p.person?.lastName || ''}`.trim() 
                  : (p.organization?.legalName || p.organization?.tradingName)) || 'Unnamed Entity',
              partyType: p.partyType,
              partyCode: p.partyCode,
              avatarUrl: p.avatarUrl,
              email: p.email,
              classifications: p.classifications || [],
              person: p.person,
              organization: p.organization
            };
            setSelectedParty(mapped);
          }
        })
        .catch(() => {});
    }
  }, [value, parties, tenantId, token]);

  // Debounced live search
  const handleSearchChange = (q: string) => {
    setSearch(q);
    setActiveIndex(0);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetchParties(q);
    }, 250);
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Auto focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  // Flatten options for keyboard navigation
  const selectableItems = useMemo(() => {
    const items: Array<{ type: 'internal' | 'party'; data?: DirectoryParty }> = [];
    if (includeInternalOption) {
      items.push({ type: 'internal' });
    }
    parties.forEach(p => items.push({ type: 'party', data: p }));
    return items;
  }, [includeInternalOption, parties]);

  const handleSelectInternal = () => {
    setSelectedParty(null);
    onChange('', null);
    setIsOpen(false);
  };

  const handleSelectParty = (p: DirectoryParty) => {
    setSelectedParty(p);
    onChange(p.id, p);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedParty(null);
    onChange('', null);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => (selectableItems.length > 0 ? (prev + 1) % selectableItems.length : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => (selectableItems.length > 0 ? (prev - 1 + selectableItems.length) % selectableItems.length : 0));
        break;
      case 'Enter':
        e.preventDefault();
        const current = selectableItems[activeIndex];
        if (current) {
          if (current.type === 'internal') handleSelectInternal();
          else if (current.data) handleSelectParty(current.data);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  return (
    <>
      <div className={cn('relative w-full select-none', className)} ref={containerRef}>
        {/* Trigger Button */}
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          className={cn(
            'group flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg border text-xs transition-all cursor-pointer',
            'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800',
            'hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-100/60 dark:hover:bg-zinc-900/60',
            isOpen && 'border-indigo-500/80 ring-2 ring-indigo-500/10 shadow-sm',
            disabled && 'opacity-50 pointer-events-none'
          )}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {selectedParty ? (
              <>
                {selectedParty.avatarUrl ? (
                  <img
                    src={selectedParty.avatarUrl}
                    alt={selectedParty.displayName}
                    className="w-4 h-4 rounded-md object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                  />
                ) : (
                  <span
                    className={cn(
                      'w-4 h-4 rounded-md flex items-center justify-center shrink-0 text-[9px] font-bold',
                      selectedParty.partyType === 'ORGANIZATION'
                        ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/20'
                        : 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20'
                    )}
                  >
                    {selectedParty.partyType === 'ORGANIZATION' ? (
                      <Building2 size={10} />
                    ) : (
                      <UserIcon size={10} />
                    )}
                  </span>
                )}
                <span className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
                  {selectedParty.displayName}
                </span>
                {selectedParty.partyCode && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-mono shrink-0">
                    {selectedParty.partyCode}
                  </span>
                )}
              </>
            ) : (
              <>
                <Briefcase size={12} className="text-zinc-400 shrink-0" />
                <span className="truncate text-zinc-400 dark:text-zinc-500">
                  {placeholder}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {allowClear && selectedParty && (
              <button
                type="button"
                onClick={handleClear}
                className="p-0.5 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors"
                title="Clear client (Reset to Internal)"
              >
                <X size={11} />
              </button>
            )}
            <ChevronDown
              size={12}
              className={cn(
                'text-zinc-400 transition-transform duration-200',
                isOpen && 'rotate-180 text-indigo-500'
              )}
            />
          </div>
        </div>

        {/* Search Popover Dropdown */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute left-0 top-full mt-1.5 z-[100] flex flex-col',
                'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden',
                dropdownWidth
              )}
            >
              {/* Search Bar Header */}
              <div className="p-2 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-950/70">
                <div className="relative flex items-center">
                  <Search size={13} className="absolute left-2.5 text-zinc-400 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search client by name, code, or email..."
                    className="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none placeholder:text-zinc-400 text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  />
                  {loading ? (
                    <Loader2 size={12} className="absolute right-2.5 text-indigo-500 animate-spin" />
                  ) : search ? (
                    <button
                      type="button"
                      onClick={() => handleSearchChange('')}
                      className="absolute right-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      <X size={12} />
                    </button>
                  ) : null}
                </div>

                {/* Filter Tabs (All / Orgs / People) */}
                <div className="flex items-center gap-1 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTypeFilter('ALL');
                      setActiveIndex(0);
                    }}
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-semibold transition-colors',
                      typeFilter === 'ALL'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-zinc-200/60 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                    )}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTypeFilter('ORGANIZATION');
                      setActiveIndex(0);
                    }}
                    className={cn(
                      'flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-colors',
                      typeFilter === 'ORGANIZATION'
                        ? 'bg-violet-600 text-white'
                        : 'bg-zinc-200/60 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                    )}
                  >
                    <Building size={10} />
                    <span>Companies</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTypeFilter('PERSON');
                      setActiveIndex(0);
                    }}
                    className={cn(
                      'flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-colors',
                      typeFilter === 'PERSON'
                        ? 'bg-sky-600 text-white'
                        : 'bg-zinc-200/60 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                    )}
                  >
                    <UserIcon size={10} />
                    <span>People</span>
                  </button>
                </div>
              </div>

              {/* List of Directory Entities */}
              <div className="max-h-60 overflow-y-auto p-1 divide-y divide-zinc-100/50 dark:divide-zinc-800/40">
                {/* Internal / General Option */}
                {includeInternalOption && (
                  <div
                    onClick={handleSelectInternal}
                    className={cn(
                      'flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors text-xs',
                      !selectedParty
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300',
                      activeIndex === 0 && 'ring-1 ring-indigo-500/40'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-400 shrink-0">
                        <Briefcase size={11} />
                      </span>
                      <div className="flex flex-col text-left">
                        <span className="font-semibold">{internalLabel}</span>
                        <span className="text-[10px] text-zinc-400">Non-billable or internal tasks</span>
                      </div>
                    </div>
                    {!selectedParty && <Check size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0" />}
                  </div>
                )}

                {/* Directory Clients */}
                {parties.length > 0 ? (
                  parties.map((party, idx) => {
                    const itemIndex = includeInternalOption ? idx + 1 : idx;
                    const isSelected = selectedParty?.id === party.id;
                    const isHighlighted = activeIndex === itemIndex;

                    const subtitle = [
                      party.partyCode,
                      party.person?.jobTitle || party.organization?.industry || party.email
                    ].filter(Boolean).join(' • ');

                    return (
                      <div
                        key={party.id}
                        onClick={() => handleSelectParty(party)}
                        onMouseEnter={() => setActiveIndex(itemIndex)}
                        className={cn(
                          'flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors text-xs',
                          isSelected
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200'
                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300',
                          isHighlighted && !isSelected && 'bg-zinc-100/80 dark:bg-zinc-800/80'
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {party.avatarUrl ? (
                            <img
                              src={party.avatarUrl}
                              alt={party.displayName}
                              className="w-5 h-5 rounded-md object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                            />
                          ) : (
                            <span
                              className={cn(
                                'w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold',
                                party.partyType === 'ORGANIZATION'
                                  ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/20'
                                  : 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20'
                              )}
                            >
                              {party.partyType === 'ORGANIZATION' ? (
                                <Building2 size={11} />
                              ) : (
                                <UserIcon size={11} />
                              )}
                            </span>
                          )}

                          <div className="flex flex-col text-left min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold truncate text-zinc-900 dark:text-zinc-100">
                                {party.displayName}
                              </span>
                              {party.classifications?.includes('CLIENT') && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold shrink-0">
                                  Client
                                </span>
                              )}
                            </div>
                            {subtitle && (
                              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
                                {subtitle}
                              </span>
                            )}
                          </div>
                        </div>

                        {isSelected && (
                          <Check size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0 ml-2" />
                        )}
                      </div>
                    );
                  })
                ) : !loading ? (
                  <div className="p-4 text-center">
                    <p className="text-xs text-zinc-400">No directory entities match "{search}"</p>
                  </div>
                ) : null}
              </div>

              {/* Footer: Create or Browse Directory */}
              {showCreateButton && (
                <div className="p-2 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/50 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      setIsCreateModalOpen(true);
                    }}
                    className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors"
                  >
                    <Plus size={12} />
                    <span>New Directory Client</span>
                  </button>

                  <span className="text-[10px] text-zinc-400">
                    {parties.length} available
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick Create Party Modal */}
      {isCreateModalOpen && (
        <CreatePartyModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          initialName={search.trim()}
          initialPartyType={typeFilter === 'ORGANIZATION' ? 'ORGANIZATION' : 'PERSON'}
          onSuccess={(createdParty) => {
            setIsCreateModalOpen(false);
            if (createdParty?.id) {
              const mapped: DirectoryParty = {
                id: createdParty.id,
                displayName: createdParty.displayName || 
                  (createdParty.partyType === 'PERSON' 
                    ? `${createdParty.person?.firstName || ''} ${createdParty.person?.lastName || ''}`.trim() 
                    : createdParty.organization?.legalName) || 'New Client',
                partyType: createdParty.partyType,
                partyCode: createdParty.partyCode,
                avatarUrl: createdParty.avatarUrl,
                email: createdParty.email,
                classifications: createdParty.classifications || ['CLIENT']
              };
              setParties(prev => [mapped, ...prev]);
              setSelectedParty(mapped);
              onChange(mapped.id, mapped);
            }
          }}
        />
      )}
    </>
  );
};
