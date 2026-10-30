import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import * as LucideIcons from 'lucide-react';
import {
  Search,
  Database,
  Plus,
  LayoutDashboard,
  Inbox,
  ClipboardList,
  Sparkles,
  Sun,
  Moon,
  Settings,
  ArrowRight,
  FileText,
  Layers,
  CornerDownLeft,
  LayoutGrid,
  Bell,
  Trash2,
  X
} from 'lucide-react';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { getAllCachedRecordsAcrossWorkspace, primeRecordCache } from '../../services/dataService';
import { DATA_API_URL } from '../../config';
import { cn, slugify } from '../../lib/utils';

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  category: 'records' | 'modules' | 'pages' | 'create' | 'actions';
  icon: React.ReactNode;
  keywords?: string;
  onSelect: () => void;
}

interface WorkspaceCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkspaceCommandPalette: React.FC<WorkspaceCommandPaletteProps> = ({
  isOpen,
  onClose
}) => {
  const navigate = useNavigate();
  const {
    tenant,
    modules,
    menuConfig,
    isDeveloper,
    user: platformUser,
    setIsAIAssistantOpen,
    setIsAppLauncherOpen,
    setIsNotificationsOpen,
    setIsRecyclingBinOpen,
    setIsCalculatorLaunchModalOpen
  } = usePlatform();
  const { session } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'records' | 'modules' | 'create' | 'actions'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [liveRecords, setLiveRecords] = useState<{ record: any; moduleId: string }[]>([]);
  const [searchingRecords, setSearchingRecords] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveFilter('all');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [isOpen]);

  const dataModules = useMemo(() => {
    return (modules || []).filter(
      (m: any) => m.type !== 'PAGE' && m.enabled !== false && !m.isGlobal && !m.isIntakeTriage && !m.config?.isIntakeTriage
    );
  }, [modules]);

  const workspacePages = useMemo(() => {
    return (modules || []).filter((m: any) => m.type === 'PAGE' && m.enabled !== false);
  }, [modules]);

  const queueItems = useMemo(() => {
    const items: { id: string; label: string; to: string; iconName?: string }[] = [];
    const walk = (list: any[]) => {
      for (const item of list || []) {
        if (item.to && (item.to.includes('queue') || item.id?.startsWith('queue:'))) {
          items.push({
            id: item.id,
            label: item.label,
            to: item.to,
            iconName: item.iconName
          });
        }
        if (Array.isArray(item.children)) walk(item.children);
      }
    };
    for (const sec of menuConfig?.sections || []) {
      walk(sec.items || []);
    }
    return items;
  }, [menuConfig]);

  // Seed with in-memory cached records & optionally fetch across top modules when searching
  useEffect(() => {
    if (!isOpen) return;
    const cached = getAllCachedRecordsAcrossWorkspace();
    setLiveRecords(cached);

    const trimmed = query.trim();
    if (trimmed.length < 2 || !tenant?.id) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token || localStorage.getItem('aurora_token');
      if (!token) return;
      setSearchingRecords(true);
      try {
        // Fetch recent records across up to 4 active modules if not already cached
        const targetMods = dataModules.slice(0, 4);
        const responses = await Promise.all(
          targetMods.map((m: any) =>
            fetch(`${DATA_API_URL}/records?moduleId=${m.id}&page=1&limit=25`, {
              headers: {
                Authorization: `Bearer ${token}`,
                'x-tenant-id': tenant.id
              }
            })
              .then((r) => (r.ok ? r.json() : ({ records: [] as any[] })))
              .catch(() => ({ records: [] as any[] }))
          )
        );
        if (cancelled) return;
        const merged = new Map<string, { record: any; moduleId: string }>();
        for (const item of cached) {
          if (item.record?.id) merged.set(item.record.id, item);
        }
        responses.forEach((res, idx) => {
          const modId = targetMods[idx]?.id;
          const list = Array.isArray(res) ? res : res?.records || [];
          for (const rec of list) {
            if (rec?.id) {
              primeRecordCache(rec);
              merged.set(rec.id, { record: rec, moduleId: rec.moduleId || modId });
            }
          }
        });
        setLiveRecords(Array.from(merged.values()));
      } finally {
        if (!cancelled) setSearchingRecords(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, query, tenant?.id, session?.access_token, dataModules]);

  const resolveRecordTitle = (rec: any, mod?: any): string => {
    const dataObj = rec?.data || rec || {};
    if (rec?.title) return String(rec.title);
    if (rec?.name) return String(rec.name);
    if (rec?.subject) return String(rec.subject);
    if (dataObj.title) return String(dataObj.title);
    if (dataObj.name) return String(dataObj.name);
    if (mod?.config?.primaryFieldId && dataObj[mod.config.primaryFieldId]) {
      return String(dataObj[mod.config.primaryFieldId]);
    }
    const firstStringKey = Object.keys(dataObj).find(
      (k) => !k.startsWith('_') && k !== 'id' && k !== 'moduleId' && k !== 'tenantId' && typeof dataObj[k] === 'string' && dataObj[k].trim().length > 0
    );
    if (firstStringKey) return String(dataObj[firstStringKey]);
    return rec?._record_key || `Record #${String(rec?.id || '').slice(-6)}`;
  };

  const allItems = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [];

    // 1. Modules
    for (const mod of dataModules) {
      const IconComp = (LucideIcons as any)[(mod as any).iconName || (mod as any).icon || 'Database'] || Database;
      items.push({
        id: `mod:${mod.id}`,
        title: mod.name,
        subtitle: mod.category || 'Data Module',
        badge: 'Module',
        category: 'modules',
        icon: <IconComp size={15} className="text-indigo-500" />,
        keywords: `${mod.name} ${mod.category || ''} ${mod.description || ''} module table view`,
        onSelect: () => {
          navigate(`/workspace/modules/${slugify(mod.name)}`);
          onClose();
        }
      });
    }

    // 2. Quick Create in Module
    for (const mod of dataModules) {
      items.push({
        id: `create:${mod.id}`,
        title: `Create new ${mod.name}`,
        subtitle: `Open creation form in ${mod.name}`,
        badge: 'Quick Create',
        badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        category: 'create',
        icon: <Plus size={15} className="text-emerald-500" />,
        keywords: `create new add ${mod.name} entry record`,
        onSelect: () => {
          navigate(`/workspace/modules/${slugify(mod.name)}?action=create`);
          onClose();
        }
      });
    }

    // 3. Pages & Queues
    for (const page of workspacePages) {
      const IconComp = (LucideIcons as any)[(page as any).iconName || 'LayoutDashboard'] || LayoutDashboard;
      items.push({
        id: `page:${page.id}`,
        title: page.name,
        subtitle: 'Workspace Page',
        badge: 'Page',
        category: 'pages',
        icon: <IconComp size={15} className="text-purple-500" />,
        keywords: `${page.name} dashboard page overview`,
        onSelect: () => {
          navigate(`/workspace/pages/${slugify(page.name)}`);
          onClose();
        }
      });
    }

    for (const q of queueItems) {
      items.push({
        id: `queue:${q.id}`,
        title: q.label,
        subtitle: 'Work Queue',
        badge: 'Queue',
        category: 'pages',
        icon: <ClipboardList size={15} className="text-amber-500" />,
        keywords: `${q.label} queue work list`,
        onSelect: () => {
          navigate(q.to);
          onClose();
        }
      });
    }

    // 4. Records
    for (const { record, moduleId } of liveRecords) {
      const mod = dataModules.find((m: any) => m.id === moduleId);
      const title = resolveRecordTitle(record, mod);
      const recordKey = record._record_key || `#${String(record.id || '').slice(-6)}`;
      const status = record.status || record.data?.status || '';
      items.push({
        id: `rec:${record.id}`,
        title,
        subtitle: mod ? `${mod.name} • ${recordKey}` : recordKey,
        badge: status ? String(status) : recordKey,
        badgeColor: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
        category: 'records',
        icon: <FileText size={15} className="text-sky-500" />,
        keywords: `${title} ${recordKey} ${status} ${mod?.name || ''} ${JSON.stringify(record.data || {})}`,
        onSelect: () => {
          primeRecordCache(record);
          const targetModSlug = mod ? slugify(mod.name) : moduleId;
          navigate(`/workspace/modules/${targetModSlug}/records/${record.id}`);
          onClose();
        }
      });
    }

    // 5. Global Workspace Actions
    items.push(
      {
        id: 'act:my-work',
        title: 'Go to My Work Queue',
        subtitle: 'View records assigned to you or your teams',
        badge: 'Navigation',
        category: 'actions',
        icon: <ClipboardList size={15} className="text-indigo-500" />,
        keywords: 'my work queue assigned tasks inbox',
        onSelect: () => {
          navigate('/workspace/my-work');
          onClose();
        }
      },
      {
        id: 'act:triage',
        title: 'Open Triage & Shared Inbox',
        subtitle: 'AI email triage and intake submissions',
        badge: 'Navigation',
        category: 'actions',
        icon: <Inbox size={15} className="text-indigo-500" />,
        keywords: 'triage email inbox intake submissions',
        onSelect: () => {
          navigate('/workspace/apps/inbox');
          onClose();
        }
      },
      {
        id: 'act:aurora-ai',
        title: 'Ask Aurora AI Workspace Co-Pilot',
        subtitle: 'Open full-page Aurora Vibe AI assistant',
        badge: 'AI',
        badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        category: 'actions',
        icon: <Sparkles size={15} className="text-indigo-500" />,
        keywords: 'ai assistant chat copilot aurora vibe prompt',
        onSelect: () => {
          navigate('/workspace/aurora-vibe');
          onClose();
        }
      },
      {
        id: 'act:ai-drawer',
        title: 'Toggle AI Side Panel',
        subtitle: 'Open contextual AI assistant drawer on current view',
        badge: 'Shortcut',
        category: 'actions',
        icon: <Sparkles size={15} className="text-purple-500" />,
        keywords: 'ai side panel drawer assistant',
        onSelect: () => {
          onClose();
          setIsAIAssistantOpen(true);
        }
      },
      {
        id: 'act:app-launcher',
        title: 'Open Workspace App Launcher',
        subtitle: 'Access Docs, Drive, Sheets, Slides, Notes & Utilities',
        badge: 'Apps',
        category: 'actions',
        icon: <LayoutGrid size={15} className="text-emerald-500" />,
        keywords: 'apps launcher docs sheets slides drive calculator notes',
        onSelect: () => {
          onClose();
          setIsAppLauncherOpen(true);
        }
      },
      {
        id: 'act:calculator',
        title: 'Open Aurora Calculator',
        subtitle: 'Choose display mode: docked side pane, full suite app, or floating calc',
        badge: 'Calculator',
        badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        category: 'actions',
        icon: <LucideIcons.Calculator size={15} className="text-indigo-500" />,
        keywords: 'calculator math compute numbers calculate docked suite finance formula',
        onSelect: () => {
          onClose();
          setIsCalculatorLaunchModalOpen(true);
        }
      },
      {
        id: 'act:theme',
        title: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
        subtitle: `Current theme: ${theme === 'dark' ? 'Dark' : 'Light'}`,
        badge: 'Appearance',
        category: 'actions',
        icon: theme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-indigo-500" />,
        keywords: 'theme dark light mode appearance toggle',
        onSelect: () => {
          toggleTheme();
          onClose();
        }
      },
      {
        id: 'act:notifications',
        title: 'Open Notifications Center',
        subtitle: 'View recent assignments, SLA alerts, and background tasks',
        badge: 'Drawer',
        category: 'actions',
        icon: <Bell size={15} className="text-amber-500" />,
        keywords: 'notifications alerts bell inbox',
        onSelect: () => {
          onClose();
          setIsNotificationsOpen(true);
        }
      },
      {
        id: 'act:recycle-bin',
        title: 'Open Recycling Bin',
        subtitle: 'Restore or permanently purge deleted records',
        badge: 'Drawer',
        category: 'actions',
        icon: <Trash2 size={15} className="text-rose-500" />,
        keywords: 'trash recycle bin deleted restore records',
        onSelect: () => {
          onClose();
          setIsRecyclingBinOpen(true);
        }
      }
    );

    if (isDeveloper || platformUser?.role === 'TENANT_ADMIN') {
      items.push({
        id: 'act:settings',
        title: 'Open Workspace Builder & Settings',
        subtitle: 'Configure modules, workflows, automations, roles, and pages',
        badge: 'Admin',
        category: 'actions',
        icon: <Settings size={15} className="text-zinc-500" />,
        keywords: 'settings admin builder modules automations workflows',
        onSelect: () => {
          navigate('/workspace/settings');
          onClose();
        }
      });
    }

    return items;
  }, [dataModules, workspacePages, queueItems, liveRecords, theme, isDeveloper, platformUser?.role]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = allItems;

    if (activeFilter !== 'all') {
      list = list.filter((item) =>
        activeFilter === 'modules' ? item.category === 'modules' || item.category === 'pages' : item.category === activeFilter
      );
    }

    if (!q) {
      // Default curated view when query is empty: top modules, pages, recent records, quick create, actions
      const topModules = list.filter((i) => i.category === 'modules').slice(0, 6);
      const topPages = list.filter((i) => i.category === 'pages').slice(0, 4);
      const topRecords = list.filter((i) => i.category === 'records').slice(0, 5);
      const topCreate = list.filter((i) => i.category === 'create').slice(0, 4);
      const topActions = list.filter((i) => i.category === 'actions').slice(0, 6);
      return [...topModules, ...topPages, ...topRecords, ...topCreate, ...topActions];
    }

    const terms = q.split(/\s+/);
    return list
      .map((item) => {
        const hayTitle = item.title.toLowerCase();
        const haySub = (item.subtitle || '').toLowerCase();
        const hayKey = (item.keywords || '').toLowerCase();
        let score = 0;

        for (const t of terms) {
          if (hayTitle === t) score += 100;
          else if (hayTitle.startsWith(t)) score += 60;
          else if (hayTitle.includes(t)) score += 35;
          else if (haySub.includes(t)) score += 20;
          else if (hayKey.includes(t)) score += 10;
          else return { item, score: -1 };
        }
        return { item, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map((entry) => entry.item);
  }, [allItems, query, activeFilter]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeFilter]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (filteredItems.length > 0 ? (prev + 1) % filteredItems.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (filteredItems.length > 0 ? (prev - 1 + filteredItems.length) % filteredItems.length : 0));
      } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
        e.preventDefault();
        filteredItems[selectedIndex].onSelect();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  useEffect(() => {
    const activeEl = listRef.current?.querySelector(`[data-cmd-index="${selectedIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1200] flex items-start justify-center pt-[11vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-xs"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl shadow-2xl shadow-black/30 overflow-hidden flex flex-col max-h-[74vh]"
          >
            {/* Top Search Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-200/80 dark:border-zinc-800">
              <Search size={17} className="text-indigo-500 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search records, jump to a module, create an entry, or run a command..."
                className="flex-1 bg-transparent text-sm font-medium text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none"
              />
              {searchingRecords && (
                <span className="text-[10px] font-semibold text-indigo-500 animate-pulse">Searching...</span>
              )}
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-md cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md">
                ESC
              </kbd>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 px-4 py-2 bg-zinc-50/70 dark:bg-zinc-950/40 border-b border-zinc-200/60 dark:border-zinc-800/70 overflow-x-auto no-scrollbar">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'modules', label: 'Modules & Pages' },
                  { id: 'records', label: 'Records' },
                  { id: 'create', label: 'Quick Create' },
                  { id: 'actions', label: 'Commands' }
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer select-none whitespace-nowrap',
                    activeFilter === tab.id
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-800'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Results List */}
            <div ref={listRef} className="flex-1 overflow-y-auto p-2 custom-scrollbar divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {filteredItems.length === 0 ? (
                <div className="py-14 text-center space-y-2">
                  <Layers size={26} className="mx-auto text-zinc-300 dark:text-zinc-700" />
                  <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    No matching modules, records, or commands found
                  </p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    Try searching by module name, record key, or action
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filteredItems.map((item, idx) => {
                    const isSelected = idx === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-cmd-index={idx}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={item.onSelect}
                        className={cn(
                          'w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer',
                          isSelected
                            ? 'bg-indigo-50/90 dark:bg-indigo-500/15 text-zinc-900 dark:text-white'
                            : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors',
                              isSelected
                                ? 'bg-white dark:bg-zinc-800 border-indigo-500/30 shadow-2xs'
                                : 'bg-zinc-50 dark:bg-zinc-800/70 border-zinc-200/70 dark:border-zinc-700/60'
                            )}
                          >
                            {item.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                              {item.title}
                            </div>
                            {item.subtitle && (
                              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                                {item.subtitle}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.badge && (
                            <span
                              className={cn(
                                'px-2 py-0.5 text-[10px] font-semibold rounded-md border',
                                item.badgeColor ||
                                  'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200/70 dark:border-zinc-700/70'
                              )}
                            >
                              {item.badge}
                            </span>
                          )}
                          <ArrowRight
                            size={13}
                            className={cn(
                              'transition-transform',
                              isSelected ? 'text-indigo-500 translate-x-0.5' : 'text-zinc-300 dark:text-zinc-600'
                            )}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Keybinding Hints */}
            <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950/60 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-[10px] font-mono">↑</kbd>
                  <kbd className="px-1 py-0.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-[10px] font-mono">↓</kbd>
                  <span>Navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-[10px] font-mono flex items-center gap-0.5">
                    <CornerDownLeft size={10} /> Enter
                  </kbd>
                  <span>Open</span>
                </span>
              </div>
              <span className="font-medium text-zinc-400 dark:text-zinc-500">
                Aurora Command Palette
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
