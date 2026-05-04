import React, { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { Search, ChevronDown, Check, User as UserIcon, Users, Bot, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useUsers, TenantMember } from '../../hooks/useUsers';
import { useTeams, Team } from '../../hooks/useTeams';

interface UserSelectorProps {
  value?: string;
  onChange: (userId: string, user: TenantMember) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
  readonly?: boolean;
}

export const UserSelector: React.FC<UserSelectorProps> = ({
  value,
  onChange,
  placeholder = 'Select a user...',
  className,
  error = false,
  readonly = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [openUp, setOpenUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const { members, loading: usersLoading } = useUsers();
  const { teams, loading: teamsLoading } = useTeams();

  const loading = usersLoading || teamsLoading;

  // Find selected user
  const selectedUser = useMemo(() => 
    members.find(m => m.id === value), 
    [members, value]
  );

  // Group members by team
  const groupedMembers = useMemo(() => {
    const groups: Record<string, TenantMember[]> = {};
    
    // Sort members first
    const sortedMembers = [...members].sort((a, b) => a.name.localeCompare(b.name));

    sortedMembers.forEach(member => {
      const teamName = member.team || 'Unassigned';
      if (!groups[teamName]) groups[teamName] = [];
      
      // Filter by search
      if (!search || 
          member.name.toLowerCase().includes(search.toLowerCase()) || 
          member.email.toLowerCase().includes(search.toLowerCase()) ||
          teamName.toLowerCase().includes(search.toLowerCase())) {
        groups[teamName].push(member);
      }
    });

    // Remove empty groups
    return Object.entries(groups)
      .filter(([_, users]) => users.length > 0)
      .sort(([a], [b]) => {
        if (a === 'Unassigned') return 1;
        if (b === 'Unassigned') return -1;
        return a.localeCompare(b);
      });
  }, [members, search]);

  // Flattened results for keyboard navigation
  const flattenedResults = useMemo(() => 
    groupedMembers.flatMap(([_, users]) => users),
    [groupedMembers]
  );

  useLayoutEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUp(spaceBelow < 300);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (readonly) return;
    
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => (flattenedResults.length > 0 ? (prev + 1) % flattenedResults.length : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => (flattenedResults.length > 0 ? (prev - 1 + flattenedResults.length) % flattenedResults.length : 0));
        break;
      case 'Enter':
        e.preventDefault();
        const user = flattenedResults[activeIndex];
        if (user) {
          onChange(user.id, user);
          setIsOpen(false);
          setSearch('');
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const UserAvatar = ({ user, size = 'sm' }: { user: TenantMember, size?: 'sm' | 'md' }) => {
    const dimensions = size === 'sm' ? 'w-5 h-5' : 'w-8 h-8';
    const iconSize = size === 'sm' ? 10 : 16;

    return (
      <div className={cn(
        dimensions,
        "rounded-full flex items-center justify-center overflow-hidden shrink-0 transition-all",
        user.isSynthetic 
          ? "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400" 
          : "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-400"
      )}>
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
        ) : (
          user.isSynthetic ? <Bot size={iconSize} /> : <UserIcon size={iconSize} />
        )}
      </div>
    );
  };

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      {/* Trigger */}
      <div 
        onClick={() => !readonly && setIsOpen(!isOpen)}
        className={cn(
          "group flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all cursor-pointer select-none",
          isOpen 
            ? "border-indigo-500 bg-white dark:bg-zinc-950 ring-4 ring-indigo-500/10 shadow-lg shadow-indigo-500/5" 
            : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 hover:bg-white dark:hover:bg-zinc-950",
          error && "border-rose-500 bg-rose-500/5 ring-rose-500/5",
          readonly && "cursor-default opacity-70 pointer-events-none"
        )}
      >
        <div className="flex-1 flex items-center gap-3 overflow-hidden">
          {selectedUser ? (
            <>
              <UserAvatar user={selectedUser} size="sm" />
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                  {selectedUser.name}
                </span>
                <span className="text-[10px] text-zinc-500 truncate opacity-60">
                  • {selectedUser.team || 'Unassigned'}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                <Search size={12} className="text-zinc-400" />
              </div>
              <span className="text-xs font-medium text-zinc-400 truncate">{placeholder}</span>
            </>
          )}
        </div>
        <ChevronDown 
          size={14} 
          className={cn("text-zinc-400 transition-transform duration-300", isOpen && "rotate-180 text-indigo-500")} 
        />
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: openUp ? 10 : -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: openUp ? 10 : -10, scale: 0.95 }}
            className={cn(
              "absolute z-[100] left-0 right-0 p-2 bg-white/90 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-80 min-w-[280px]",
              openUp ? "bottom-full mb-3" : "top-full mt-3"
            )}
          >
            {/* Search Input */}
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
              <input
                autoFocus
                type="text"
                placeholder="Search by name, email or team..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleKeyDown}
                className="w-full bg-zinc-100 dark:bg-zinc-800/50 border-none rounded-xl pl-9 pr-4 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              />
              {loading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-3 h-3 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Results */}
            <div className="overflow-y-auto custom-scrollbar flex-1 space-y-4 px-1 pb-1">
              {groupedMembers.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users size={16} className="text-zinc-400" />
                  </div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">No members found</p>
                </div>
              ) : (
                groupedMembers.map(([teamName, users]) => (
                  <div key={teamName} className="space-y-1">
                    <div className="px-3 py-1 flex items-center gap-2">
                      <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
                      <span className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] whitespace-nowrap">
                        {teamName}
                      </span>
                      <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
                    </div>
                    {users.map((user) => {
                      const isSelected = value === user.id;
                      const isFlatActive = flattenedResults[activeIndex]?.id === user.id;
                      
                      return (
                        <button
                          key={user.id}
                          onClick={() => {
                            onChange(user.id, user);
                            setIsOpen(false);
                            setSearch('');
                          }}
                          onMouseEnter={() => {
                            const idx = flattenedResults.findIndex(u => u.id === user.id);
                            if (idx !== -1) setActiveIndex(idx);
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-2xl transition-all group relative",
                            isSelected 
                              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                              : isFlatActive
                                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                          )}
                        >
                          <UserAvatar user={user} size="md" />
                          <div className="flex flex-col items-start min-w-0 flex-1">
                            <span className={cn(
                              "text-xs font-bold truncate",
                              isSelected ? "text-white" : "text-zinc-900 dark:text-zinc-100"
                            )}>
                              {user.name}
                            </span>
                            <span className={cn(
                              "text-[10px] truncate",
                              isSelected ? "text-indigo-100/80" : "text-zinc-500"
                            )}>
                              {user.email}
                            </span>
                          </div>
                          
                          <div className="shrink-0 flex items-center">
                            {isSelected ? (
                              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center animate-in zoom-in duration-200">
                                <Check size={12} strokeWidth={3} />
                              </div>
                            ) : isFlatActive && (
                              <ArrowRight size={14} className="text-indigo-500 opacity-50 group-hover:opacity-100 transition-all" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/50 px-2 flex items-center justify-between">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                {flattenedResults.length} Members total
              </span>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[9px] font-bold text-zinc-500">ESC</kbd>
                <span className="text-[9px] text-zinc-400">to close</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
