import React, { useMemo, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Compass } from 'lucide-react';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config';
import { Breadcrumbs } from '../../components/Navigation/Breadcrumbs';
import { QueueRenderer } from '../../components/Builders/QueueBuilder/QueueRenderer';
import { QueueEntity } from '../../types/platform';

export const QueueView: React.FC = () => {
  const { queueId } = useParams<{ queueId: string }>();
  const { session } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { tenant, menuConfig, user: platformUser, isDeveloper } = usePlatform();
  const [searchQuery, setSearchQuery] = useState('');

  const isTenantAdmin = isDeveloper || 
    platformUser?.role === 'TENANT_ADMIN' || 
    platformUser?.role?.toLowerCase() === 'tenant admin' || 
    platformUser?.role?.toLowerCase() === 'admin' || 
    platformUser?.isSuperAdmin === true || 
    platformUser?.licenceType === 'Developer';

  // 1. Synchronously resolve from menu configuration
  const navQueue = useMemo(() => {
    if (!menuConfig?.sections || !queueId) return null;
    let found: any = null;
    const walk = (items: any[]) => {
      for (const item of items || []) {
        if (item.id === queueId || item.label?.toLowerCase() === queueId.toLowerCase()) {
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

  return (
    <div className="flex flex-col w-full flex-1 min-h-0 h-full bg-transparent overflow-hidden">
      {/* Tier 1: Consistent Breadcrumbs & Context Action Bar */}
      <div className="sticky top-0 z-30 h-10 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between px-6 shrink-0">
        <Breadcrumbs />

        {/* Right: Configure Queue Context Action */}
        {isTenantAdmin && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                const currentPath = location.pathname + location.search;
                const targetUrl = '/workspace/settings/navigation/builder';
                navigate(`${targetUrl}?returnUrl=${encodeURIComponent(currentPath)}`, { state: { returnUrl: currentPath } });
              }}
              className="flex items-center gap-1.5 h-7.5 px-2.5 rounded-lg bg-indigo-50/70 hover:bg-indigo-100/80 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-500/20 text-xs font-semibold transition-all shadow-2xs group shrink-0 cursor-pointer"
              title="Configure Queue Navigation"
            >
              <Compass size={13} className="text-indigo-500 group-hover:rotate-45 transition-transform duration-300 shrink-0" />
              <span>Configure Queue</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area - Full Bleed Edge-to-Edge */}
      <div className="flex-1 w-full min-h-0 flex flex-col relative z-10 overflow-hidden">
        <QueueRenderer 
          queueId={queueId} 
          showHeader={false} 
          noContainer={true}
          searchable={true}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          pageSize={25}
          className="w-full h-full flex-1"
        />
      </div>
    </div>
  );
};
