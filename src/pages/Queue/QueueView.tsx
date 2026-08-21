import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as LucideIcons from 'lucide-react';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config';
import { slugify } from '../../lib/utils';
import { DynamicIcon } from '../../components/UI/DynamicIcon';
import { QueueRenderer } from '../../components/Builders/QueueBuilder/QueueRenderer';
import { QueueEntity } from '../../types/platform';

export const QueueView: React.FC = () => {
  const { queueId } = useParams<{ queueId: string }>();
  const { session } = useAuth();
  const { tenant, menuConfig } = usePlatform();
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Synchronously resolve from menu configuration
  const navQueue = useMemo(() => {
    if (!menuConfig?.sections || !queueId) return null;
    let found: any = null;
    const walk = (items: any[]) => {
      for (const item of items || []) {
        if (item.id === queueId || slugify(item.label || '') === queueId || item.label?.toLowerCase() === queueId.toLowerCase()) {
          found = item;
          return;
        }
        if (item.children) walk(item.children);
      }
    };
    for (const sec of menuConfig.sections) {
      walk(sec.items);
      if (found) break;
    }
    return found;
  }, [menuConfig, queueId]);

  // 2. Fetch queue metadata if not in navigation
  const { data: fetchedQueue } = useQuery<QueueEntity | null>({
    queryKey: ['queue-view-header-entity', tenant?.id, queueId],
    queryFn: async () => {
      if (!queueId || !tenant?.id || navQueue) return null;
      try {
        const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
        const res = await fetch(`${API_BASE_URL}/api/queues/${queueId}`, {
          headers: { 'x-tenant-id': tenant.id, 'Authorization': token ? `Bearer ${token}` : '' }
        });
        if (res.ok) return res.json();
      } catch (err) {
        console.error('Failed to fetch queue header in QueueView', err);
      }
      return null;
    },
    enabled: !!queueId && !navQueue && !!tenant?.id,
    staleTime: 60000
  });

  const activeQueue = navQueue || fetchedQueue || {
    name: queueId ? queueId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Work Queue',
    description: 'Workspace work distribution and task queue',
    iconName: 'ClipboardList'
  };

  return (
    <div className="flex flex-col w-full flex-1 min-h-0 h-full bg-transparent overflow-hidden">
      {/* Header Panel (matching ModuleView) */}
      <div className="px-6 py-4 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-900/10 backdrop-blur-md shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
            <DynamicIcon name={activeQueue.iconName || activeQueue.icon || 'ClipboardList'} size={20} />
          </div>
          <div>
            <h1 className="text-base font-bold text-zinc-950 dark:text-white leading-none">
              {activeQueue.label || activeQueue.name}
            </h1>
            {activeQueue.description && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {activeQueue.description}
              </p>
            )}
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
          <div className="relative">
            <LucideIcons.Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={13} />
            <input 
              type="text" 
              placeholder="Search queue records..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-52 sm:w-60 bg-zinc-100/80 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 rounded-lg pl-8 pr-3 text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 outline-none focus:border-indigo-500 transition-all shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area - Full Bleed Edge-to-Edge */}
      <div className="flex-1 w-full min-h-0 flex flex-col relative z-10 overflow-hidden">
        <QueueRenderer 
          queueId={queueId} 
          showHeader={false} 
          noContainer={true}
          searchable={false}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          pageSize={25}
          className="w-full h-full flex-1"
        />
      </div>
    </div>
  );
};
