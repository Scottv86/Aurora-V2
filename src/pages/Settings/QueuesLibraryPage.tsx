import React, { useState, useEffect, useMemo } from 'react';
import { 
  ListOrdered, Plus, Search, Trash2, Eye, Layers, ArrowRight,
  Filter, MapPin 
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { QueueEntity } from '../../types/platform';
import { PageHeader } from '../../components/UI/PageHeader';
import { Button } from '../../components/UI/Primitives';
import { EmptyState } from '../../components/UI/EmptyState';
import { InContextBuilderModal } from '../../components/Builders/Common/InContextBuilderModal';
import { DeleteConfirmationModal } from '../../components/Common/DeleteConfirmationModal';
import { DependencyDrawer, DependencyItem } from '../../components/Builders/Common/DependencyDrawer';
import { Modal } from '../../components/UI/TabsAndModal';
import { QueueBuilder } from '../../components/Builders/QueueBuilder/QueueBuilder';
import { QueueRenderer } from '../../components/Builders/QueueBuilder/QueueRenderer';
import { DynamicIcon } from '../../components/UI/DynamicIcon';
import { API_BASE_URL } from '../../config';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { TrashService } from '../../services/trashService';
import { slugify } from '../../lib/utils';
import { builderCache } from '../../utils/builderCache';

export const QueuesLibraryPage: React.FC = () => {
  const { tenant, modules, menuConfig, updateMenuConfig } = usePlatform();
  const { session } = useAuth();
  const cacheKey = `queues_${tenant?.id || 'default'}`;
  const [queues, setQueues] = useState<QueueEntity[]>(() => builderCache.get<QueueEntity[]>(cacheKey) || []);
  const [loading, setLoading] = useState(() => !builderCache.has(cacheKey));
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unified' | 'single'>('all');

  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedQueue, setSelectedQueue] = useState<QueueEntity | null>(null);
  const [previewQueue, setPreviewQueue] = useState<QueueEntity | null>(null);
  const [depQueue, setDepQueue] = useState<QueueEntity | null>(null);
  const [queueToDelete, setQueueToDelete] = useState<QueueEntity | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchQueues = async () => {
    if (!builderCache.has(cacheKey)) {
      setLoading(true);
    }
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/queues`, {
        headers: {
          'x-tenant-id': tenant?.id || '',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        const next = data || [];
        setQueues(next);
        builderCache.set(cacheKey, next);
      } else {
        if (!builderCache.has(cacheKey)) setQueues([]);
      }
    } catch (err) {
      console.error('Failed to fetch queues:', err);
      if (!builderCache.has(cacheKey)) setQueues([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueues();
  }, [tenant?.id, session?.access_token]);

  // Combine standalone queues with navigation architect queues and page modules
  const allQueues = useMemo(() => {
    const extractedQueues: QueueEntity[] = [];

    const processSectionItems = (sectionsList: any[]) => {
      if (!Array.isArray(sectionsList)) return;

      const walk = (items: any[]) => {
        if (!Array.isArray(items)) return;
        for (const item of items) {
          // Exclude demo mock IDs and unconfigured default my-work personal inbox
          const isDemoMock = item.id === 'queue_support_priority' || item.id === 'queue_global_triage';
          const isGenericPersonalInbox = (item.to === '/workspace/my-work' || item.to === '/workspace/queue') && !item.queueConfig && !item.moduleId && (!item.moduleIds || item.moduleIds.length === 0);

          const isQueue = !isDemoMock && !isGenericPersonalInbox && Boolean(
            item.queueConfig ||
            item.isUnifiedQueue ||
            (item.moduleIds && item.moduleIds.length > 0) ||
            item.to?.startsWith('/workspace/queues/') ||
            item.to?.includes('queueId=')
          );

          if (isQueue) {
            const isUnified = Boolean(
              item.isUnifiedQueue ||
              item.to?.startsWith('/workspace/queues/') ||
              (item.moduleIds && item.moduleIds.length > 1)
            );

            let targetModId = item.moduleId;
            let targetModIds = item.moduleIds || [];

            if (!targetModId && item.to?.includes('/workspace/modules/')) {
              try {
                const parts = item.to.split('?')[0].split('/');
                const slugOrId = parts[parts.length - 1];
                const matched = (modules || []).find((m: any) => m.id === slugOrId || slugify(m.name) === slugOrId);
                if (matched) targetModId = matched.id;
              } catch (_) {}
            }

            if (targetModId && targetModIds.length === 0) {
              targetModIds = [targetModId];
            }

            const targetMod = targetModId ? (modules || []).find((m: any) => m.id === targetModId) : undefined;
            const qSlug = item.to?.startsWith('/workspace/queues/')
              ? item.to.replace('/workspace/queues/', '')
              : (item.to?.includes('queueId=')
                ? item.to.split('queueId=')[1]?.split('&')[0]
                : slugify(item.label || item.id || 'queue'));

            extractedQueues.push({
              id: item.id || `queue_${qSlug}`,
              tenantId: tenant?.id || 't1',
              name: item.label || 'Work Queue',
              slug: qSlug,
              description: item.description || (isUnified ? 'Unified Multi-Module Queue' : (targetMod ? `Work Queue for ${targetMod.name}` : 'Custom Workspace Queue')),
              iconName: item.iconName || (isUnified ? 'Inbox' : 'ListOrdered'),
              isGlobal: true,
              isUnifiedQueue: isUnified,
              moduleId: isUnified ? undefined : targetModId,
              moduleName: targetMod?.name,
              moduleIds: targetModIds.length > 0 ? targetModIds : ((modules || [])[0]?.id ? [(modules || [])[0].id] : []),
              queueConfig: item.queueConfig || {
                conditions: { type: 'group', logicalOperator: 'AND', rules: [] },
                columns: ['id', 'moduleId', 'title', 'status', 'priority', 'assigneeId', 'createdAt'],
                defaultSort: { key: 'createdAt', direction: 'desc' }
              },
              status: 'PUBLISHED'
            });
          }

          if (item.children) {
            walk(item.children);
          }
        }
      };

      for (const sec of sectionsList) {
        if (sec.items) walk(sec.items);
      }
    };

    // 1. Check live menuConfig
    if (menuConfig?.sections) processSectionItems(menuConfig.sections);
    if ((menuConfig as any)?.default?.sections) processSectionItems((menuConfig as any).default.sections);

    // 2. Check tenant.menuConfig
    if ((tenant?.menuConfig as any)?.sections) processSectionItems((tenant.menuConfig as any).sections);
    if ((tenant?.menuConfig as any)?.default?.sections) processSectionItems((tenant.menuConfig as any).default.sections);
    if ((tenant?.menuConfig as any)?.roles) {
      Object.values((tenant.menuConfig as any).roles).forEach((r: any) => {
        if (r?.sections) processSectionItems(r.sections);
      });
    }
    if ((tenant?.menuConfig as any)?.teams) {
      Object.values((tenant.menuConfig as any).teams).forEach((t: any) => {
        if (t?.sections) processSectionItems(t.sections);
      });
    }

    // 3. Check Page modules - only for standalone un-bound custom queues
    (modules || []).forEach((m: any) => {
      if (m.type === 'PAGE' && m.config?.widgets) {
        m.config.widgets.forEach((w: any) => {
          // If it references an existing queue via queueId, skip extracting duplicate definition
          if (w.properties?.queueId) return;

          // Only extract if it has unique inline queueConfig rules
          if ((w.type === 'work-queue' || w.type === 'queue') && w.properties?.queueConfig?.conditions?.rules?.length > 0) {
            extractedQueues.push({
              id: w.id || `queue_page_${m.id}`,
              tenantId: tenant?.id || 't1',
              name: w.title || `${m.name} Queue`,
              slug: slugify(w.title || `${m.name} Queue`),
              description: `Inline work queue on "${m.name}" page.`,
              iconName: 'ClipboardList',
              isGlobal: true,
              isUnifiedQueue: Boolean(w.properties?.isUnifiedQueue),
              moduleId: w.properties?.moduleId,
              moduleIds: w.properties?.moduleIds || (w.properties?.moduleId ? [w.properties.moduleId] : []),
              queueConfig: w.properties?.queueConfig || {
                conditions: { type: 'group', logicalOperator: 'AND', rules: [] },
                columns: ['id', 'moduleId', 'title', 'status', 'priority', 'assigneeId', 'createdAt']
              },
              status: 'PUBLISHED'
            });
          }
        });
      }
      if (m.config?.queues && Array.isArray(m.config.queues)) {
        m.config.queues.forEach((q: any) => {
          extractedQueues.push({
            id: q.id || `mod_queue_${m.id}`,
            tenantId: tenant?.id || 't1',
            name: q.name || `${m.name} Queue`,
            slug: slugify(q.name || m.name),
            description: q.description || `Queue defined in ${m.name} module.`,
            iconName: q.iconName || 'ListOrdered',
            isGlobal: false,
            moduleId: m.id,
            moduleName: m.name,
            moduleIds: [m.id],
            queueConfig: q.queueConfig || {
              conditions: q.conditions || { type: 'group', logicalOperator: 'AND', rules: [] },
              columns: q.columns || ['id', 'title', 'status', 'priority', 'assigneeId', 'createdAt']
            },
            status: 'PUBLISHED'
          });
        });
      }
    });

    // Merge by canonical ID and Slug avoiding duplicate ghost cards
    const map = new Map<string, QueueEntity>();
    const knownSlugs = new Set<string>();

    queues
      .filter(q => q.id !== 'queue_support_priority' && q.id !== 'queue_global_triage')
      .forEach(q => {
        map.set(q.id, q);
        if (q.slug) knownSlugs.add(q.slug);
      });

    extractedQueues.forEach(q => {
      // Don't add if already registered under same ID or same slug
      if (!map.has(q.id) && !knownSlugs.has(q.slug)) {
        map.set(q.id, q);
        if (q.slug) knownSlugs.add(q.slug);
      }
    });

    return Array.from(map.values());
  }, [queues, menuConfig, tenant?.menuConfig, modules, tenant?.id]);

  // Compute host locations and dependencies for a queue
  const getQueueDependencies = (queue: QueueEntity): DependencyItem[] => {
    const deps: DependencyItem[] = [];

    // 1. Navigation Menu usages
    const checkMenuItems = (items: any[], pathPrefix = '') => {
      for (const it of items || []) {
        const matches =
          it.id === queue.id ||
          it.queueId === queue.id ||
          (queue.slug && it.to === `/workspace/queues/${queue.slug}`) ||
          (queue.slug && it.to?.includes(`queueId=${queue.slug}`)) ||
          (queue.id && it.to?.includes(`queueId=${queue.id}`));

        if (matches && !deps.some(d => d.id === `nav_${it.id}`)) {
          deps.push({
            id: `nav_${it.id}`,
            name: `${pathPrefix ? pathPrefix + ' > ' : ''}${it.label || queue.name} (Sidebar Menu)`,
            type: 'workspace',
            url: it.to || `/workspace/queues/${queue.slug}`
          });
        }
        if (it.children) {
          checkMenuItems(it.children, it.label);
        }
      }
    };

    if (menuConfig?.sections) {
      for (const sec of menuConfig.sections) {
        checkMenuItems(sec.items || [], sec.title || 'Navigation');
      }
    }
    if ((tenant?.menuConfig as any)?.sections) {
      for (const sec of (tenant?.menuConfig as any).sections) {
        checkMenuItems(sec.items || [], sec.title || 'Navigation');
      }
    }

    // 2. Custom Page widgets
    (modules || []).forEach((m: any) => {
      if (m.type === 'PAGE' && m.config?.widgets) {
        const found = m.config.widgets.some((w: any) =>
          (w.type === 'work-queue' || w.type === 'queue') &&
          (w.properties?.queueId === queue.id || w.properties?.queueId === queue.slug || w.id === queue.id)
        );
        if (found && !deps.some(d => d.id === `page_${m.id}`)) {
          deps.push({
            id: `page_${m.id}`,
            name: `${m.name} (Page Canvas)`,
            type: 'workspace',
            url: `/workspace/pages/${slugify(m.name)}`
          });
        }
      }
    });

    // 3. Target Business Data Module(s)
    const targetIds = queue.isUnifiedQueue ? (queue.moduleIds || []) : (queue.moduleId ? [queue.moduleId] : []);
    targetIds.forEach((mId) => {
      const mod = (modules || []).find((m: any) => m.id === mId);
      if (mod && !deps.some(d => d.id === `mod_${mod.id}`)) {
        deps.push({
          id: `mod_${mod.id}`,
          name: `${mod.name} (Data Schema)`,
          type: 'module',
          url: `/workspace/modules/${slugify(mod.name)}`
        });
      }
    });

    // 4. Default Direct Route if no specific placement
    if (deps.length === 0) {
      deps.push({
        id: `direct_${queue.id}`,
        name: `Direct Route (/workspace/queues/${queue.slug || queue.id})`,
        type: 'workspace',
        url: `/workspace/queues/${queue.slug || queue.id}`
      });
    }

    return deps;
  };

  const filteredQueues = allQueues.filter((q) => {
    const matchesSearch =
      q.name.toLowerCase().includes(search.toLowerCase()) ||
      (q.description && q.description.toLowerCase().includes(search.toLowerCase()));

    if (filter === 'unified') return matchesSearch && q.isUnifiedQueue;
    if (filter === 'single') return matchesSearch && !q.isUnifiedQueue;
    return matchesSearch;
  });

  // Handle Save
  const handleSaveQueue = async (queueData: QueueEntity) => {
    try {
      const targetId = selectedQueue?.id || queueData.id;
      const targetSlug = selectedQueue?.slug || queueData.slug;
      const newSlug = slugify(queueData.name);

      // 1. Immediately update local state
      setQueues(prev => {
        const idx = prev.findIndex(q => q.id === targetId || q.id === queueData.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...queueData, slug: newSlug };
          return next;
        }
        return [{ ...queueData, slug: newSlug }, ...prev];
      });

      // 2. If this queue exists in Navigation Menu, update menu item strictly by ID or unique route
      if (menuConfig?.sections) {
        let menuUpdated = false;
        const updateItems = (items: any[]): any[] => {
          return (items || []).map(item => {
            const isMatch =
              item.id === targetId ||
              item.id === queueData.id ||
              item.queueId === targetId ||
              item.queueId === queueData.id ||
              (targetSlug && item.to === `/workspace/queues/${targetSlug}`) ||
              (targetSlug && item.to?.includes(`queueId=${targetSlug}`)) ||
              (targetId && item.to?.includes(`queueId=${targetId}`));

            if (isMatch) {
              menuUpdated = true;
              let updatedTo = item.to;
              if (queueData.isUnifiedQueue) {
                updatedTo = `/workspace/queues/${newSlug}`;
              } else if (queueData.moduleId) {
                const mod = modules.find((m: any) => m.id === queueData.moduleId);
                const modSlug = mod ? slugify(mod.name) : queueData.moduleId;
                updatedTo = `/workspace/modules/${modSlug}?queueId=${newSlug}`;
              }

              return {
                ...item,
                label: queueData.name,
                iconName: queueData.iconName || item.iconName,
                description: queueData.description,
                to: updatedTo || item.to,
                isUnifiedQueue: queueData.isUnifiedQueue,
                moduleId: queueData.moduleId,
                moduleIds: queueData.moduleIds,
                queueConfig: queueData.queueConfig
              };
            }
            if (item.children) {
              return { ...item, children: updateItems(item.children) };
            }
            return item;
          });
        };

        const updatedSections = menuConfig.sections.map((sec: any) => ({
          ...sec,
          items: updateItems(sec.items || [])
        }));

        if (menuUpdated) {
          const newMenuConfig = { ...menuConfig, sections: updatedSections };
          await updateMenuConfig(newMenuConfig, 'tenant').catch(() => {});
        }
      }

      // 3. Persist to API store
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const apiRes = await fetch(`${API_BASE_URL}/api/queues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant?.id || '',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ ...queueData, slug: newSlug })
      });

      if (!apiRes.ok) {
        const errJson = await apiRes.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with ${apiRes.status}`);
      }

      toast.success(`Queue "${queueData.name}" saved successfully`);
      setIsBuilderOpen(false);
      setSelectedQueue(null);
      await fetchQueues();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save queue');
    }
  };

  // Handle Delete
  const confirmDeleteQueue = async () => {
    if (!queueToDelete) return;
    const queue = queueToDelete;
    setIsDeleting(true);

    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      if (tenant?.id) {
        await TrashService.softDelete({
          tenantId: tenant.id,
          token,
          itemType: 'MODULE',
          itemId: queue.id,
          title: queue.name,
          subtitle: queue.description || `Work Queue: ${queue.name}`,
          payload: queue
        });
      }

      await fetch(`${API_BASE_URL}/api/queues/${queue.id}`, {
        method: 'DELETE',
        headers: {
          'x-tenant-id': tenant?.id || '',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      toast.success('Queue moved to Recycling Bin');
      setQueues(prev => {
        const next = prev.filter(q => q.id !== queue.id);
        builderCache.set(cacheKey, next);
        return next;
      });
    } catch (err) {
      toast.error('Failed to delete queue');
    } finally {
      setIsDeleting(false);
      setQueueToDelete(null);
    }
  };

  return (
    <div className="flex flex-col w-full relative min-h-[calc(100vh-4rem)] bg-zinc-50/50 dark:bg-zinc-950/50 overflow-y-auto">
      {/* Standardized PageHeader */}
      <PageHeader
        title="Queues"
        description="Centralized studio for building and managing work queues, unified triage inboxes, and custom view filters."
        actions={
          <Button
            onClick={() => {
              setSelectedQueue(null);
              setIsBuilderOpen(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Create</span>
          </Button>
        }
      />

      {/* Main Content Body */}
      <div className="flex-1 px-6 lg:px-12 pt-8 pb-20 relative z-10 space-y-6">
        {/* Search & Scope Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search queues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-zinc-900 dark:text-zinc-100 font-medium"
            />
          </div>

          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl w-full sm:w-auto">
            {[
              { id: 'all', label: 'All' },
              { id: 'unified', label: 'Unified Multi-Module' },
              { id: 'single', label: 'Single Module' }
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setFilter(mode.id as any)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  filter === mode.id
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3-Column Glassmorphic Cards Grid */}
        {loading ? null : filteredQueues.length === 0 ? (
          <EmptyState
            icon={ListOrdered}
            title="No queues found"
            description="Create custom work queues with visual condition rules, custom columns, and single or multi-module scope."
            action={{
              label: "Create",
              onClick: () => {
                setSelectedQueue(null);
                setIsBuilderOpen(true);
              }
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQueues.map((queue, i) => {
              const ruleCount = queue.queueConfig?.conditions?.rules?.length || 0;
              const columnCount = queue.queueConfig?.columns?.length || 0;
              const moduleCount = queue.isUnifiedQueue
                ? (queue.moduleIds?.length || 0)
                : 1;
              const deps = getQueueDependencies(queue);

              return (
                <motion.div
                  key={queue.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.03, ease: 'easeOut' }}
                  onClick={() => {
                    setSelectedQueue(queue);
                    setIsBuilderOpen(true);
                  }}
                  className="group p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-3xl transition-[border-color,box-shadow,background-color] duration-200 shadow-xl shadow-black/5 dark:shadow-none hover:shadow-indigo-500/10 cursor-pointer flex flex-col justify-between h-full relative overflow-hidden min-h-[240px]"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.1] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-500 group-hover:text-indigo-500 group-hover:border-indigo-500/30 transition-colors duration-200">
                          <DynamicIcon name={queue.iconName || 'ListOrdered'} size={22} />
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                            queue.isUnifiedQueue
                              ? 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                              : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
                          }`}>
                            {queue.isUnifiedQueue ? `Unified (${moduleCount} mods)` : 'Single Module'}
                          </span>

                          <button
                            onClick={(e) => { e.stopPropagation(); setDepQueue(queue); }}
                            className="p-2 rounded-xl bg-zinc-100/80 hover:bg-indigo-500/10 text-zinc-500 hover:text-indigo-500 dark:bg-zinc-800/80 dark:hover:bg-indigo-500/20 transition-colors duration-150 opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
                            title="View Locations & Where Used"
                          >
                            <Layers size={14} />
                          </button>

                          <button
                            onClick={(e) => { e.stopPropagation(); setPreviewQueue(queue); }}
                            className="p-2 rounded-xl bg-zinc-100/80 hover:bg-indigo-500/10 text-zinc-500 hover:text-indigo-500 dark:bg-zinc-800/80 dark:hover:bg-indigo-500/20 transition-colors duration-150 opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
                            title="Live Preview"
                          >
                            <Eye size={14} />
                          </button>

                          <button
                            onClick={(e) => { e.stopPropagation(); setQueueToDelete(queue); }}
                            className="p-2 rounded-xl bg-zinc-100/80 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 dark:bg-zinc-800/80 dark:hover:bg-red-500/20 transition-colors duration-150 opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
                            title="Delete Queue"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-150">
                        {queue.name}
                      </h3>

                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                        {queue.description || 'Configured dynamic work queue with custom rule evaluation.'}
                      </p>

                      {/* Where Used / Host Locations Summary */}
                      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-zinc-400">
                        <MapPin size={12} className="text-indigo-500 shrink-0" />
                        <span className="truncate">
                          Used in: <strong className="text-zinc-700 dark:text-zinc-200 font-semibold">{deps[0]?.name || 'Direct Route'}</strong>
                          {deps.length > 1 && (
                            <span className="text-indigo-500 font-bold ml-1">
                              (+{deps.length - 1} more)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                        <span className="flex items-center gap-1 font-medium">
                          <Filter size={11} className="text-zinc-500" /> {ruleCount} {ruleCount === 1 ? 'Rule' : 'Rules'}
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          <ListOrdered size={11} className="text-zinc-500" /> {columnCount} Cols
                        </span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setDepQueue(queue); }}
                          className="flex items-center gap-1 font-medium hover:text-indigo-500 transition-colors duration-150 cursor-pointer"
                        >
                          <Layers size={11} className="text-indigo-500" /> {deps.length} {deps.length === 1 ? 'Location' : 'Locations'}
                        </button>
                      </div>

                      <div className="flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 transform duration-200">
                        Configure <ArrowRight size={14} className="ml-1" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Standalone In-Context Builder Modal */}
      <InContextBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => {
          setIsBuilderOpen(false);
          setSelectedQueue(null);
        }}
        builderContext={{ mode: 'global' }}
        title={selectedQueue ? `Edit ${selectedQueue.name}` : 'Create New Work Queue'}
      >
        <QueueBuilder
          initialQueue={selectedQueue}
          onSave={handleSaveQueue}
          onCancel={() => {
            setIsBuilderOpen(false);
            setSelectedQueue(null);
          }}
        />
      </InContextBuilderModal>

      {/* Live Preview Modal */}
      {previewQueue && (
        <Modal
          isOpen={!!previewQueue}
          onClose={() => setPreviewQueue(null)}
          title={`Queue Preview: ${previewQueue.name}`}
          size="xl"
        >
          <div className="p-4 space-y-4">
            <QueueRenderer
              queue={previewQueue}
              showHeader={false}
              readOnly={false}
            />
            <div className="flex justify-end pt-2">
              <Button onClick={() => setPreviewQueue(null)} variant="secondary" size="sm">
                Close Preview
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Where Used / Dependency Lineage Drawer */}
      {depQueue && (
        <DependencyDrawer
          isOpen={Boolean(depQueue)}
          onClose={() => setDepQueue(null)}
          entityName={depQueue.name}
          entityType="Queue"
          dependencies={getQueueDependencies(depQueue)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!queueToDelete}
        onClose={() => setQueueToDelete(null)}
        onConfirm={confirmDeleteQueue}
        title="Delete Work Queue"
        itemName={queueToDelete?.name}
        description="Are you sure you want to delete this queue? It will be moved to the Recycling Bin."
        isDeleting={isDeleting}
      />
    </div>
  );
};
