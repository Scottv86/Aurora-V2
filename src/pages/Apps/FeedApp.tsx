import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Rss, 
  Search, 
  ArrowUpDown, 
  RefreshCw, 
  Layers, 
  Users, 
  Loader2, 
  Clock
} from 'lucide-react';
import { PageHeader } from '../../components/UI/PageHeader';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config';
import { ActivityEventCard, ActivityEvent } from '../../components/Platform/ActivityEventCard';
import { cn } from '../../lib/utils';

export const FeedApp: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { tenant, modules, members } = usePlatform();

  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('all');
  const [selectedActorId, setSelectedActorId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchFeed = async (cursor?: string, append = false) => {
    if (!tenant?.id) return;
    if (!append) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token || '';
      const params = new URLSearchParams({
        limit: '40',
        order: sortOrder
      });

      if (selectedModuleId !== 'all') params.set('moduleId', selectedModuleId);
      if (selectedActorId !== 'all') params.set('actorId', selectedActorId);
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (cursor) params.set('cursor', cursor);

      const res = await fetch(`${API_BASE_URL}/api/audit/feed?${params.toString()}`, {
        headers: {
          'x-tenant-id': tenant.id,
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        const incomingEvents = data.events || [];
        setEvents(prev => append ? [...prev, ...incomingEvents] : incomingEvents);
        setNextCursor(data.nextCursor || null);
      } else {
        console.error('Failed to load feed:', await res.text());
      }
    } catch (err) {
      console.error('Feed fetch error:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [tenant?.id, selectedModuleId, selectedActorId, selectedCategory, sortOrder]);

  // Handle Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFeed();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Real-Time WebSocket Streaming
  useEffect(() => {
    const socket = (window as any)._auroraSocket;
    if (!socket) return;

    const handleFeedActivity = (activity: ActivityEvent) => {
      // Check if matches active module/category filter
      if (selectedModuleId !== 'all' && activity.moduleId !== selectedModuleId) return;
      if (selectedCategory !== 'all' && activity.category?.toLowerCase() !== selectedCategory.toLowerCase()) return;

      setEvents(prev => {
        if (prev.some(e => e.id === activity.id)) return prev;
        return sortOrder === 'desc' ? [activity, ...prev] : [...prev, activity];
      });
    };

    socket.on('FEED_ACTIVITY', handleFeedActivity);
    socket.on('RECORD_ACTIVITY', handleFeedActivity);

    return () => {
      socket.off('FEED_ACTIVITY', handleFeedActivity);
      socket.off('RECORD_ACTIVITY', handleFeedActivity);
    };
  }, [selectedModuleId, selectedCategory, sortOrder]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchFeed();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full bg-zinc-50 dark:bg-[#0c0c0e] overflow-hidden">
      {/* Platform Header */}
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-red-500/20">
              <Rss size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-zinc-900 dark:text-white">Workspace Feed</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Stream
                </span>
              </div>
            </div>
          </div>
        }
        description="Tenant-wide chronological activity stream, field-level audit trail, and cross-module workflow updates."
        actions={
          <div className="flex items-center gap-2">
            {/* Sort Toggle */}
            <button
              type="button"
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title={sortOrder === 'desc' ? 'Showing Newest First (Click for Oldest First)' : 'Showing Oldest First (Click for Newest First)'}
            >
              <ArrowUpDown size={13} className="text-red-500" />
              <span>{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={refreshing || loading}
              className="h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              title="Refresh Activity"
            >
              <RefreshCw size={13} className={cn(refreshing && "animate-spin text-red-500")} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        }
      />

      {/* Filter Toolbar */}
      <div className="px-6 lg:px-12 py-3 border-b border-zinc-200 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        {/* Left: Search Input & Category Pills */}
        <div className="flex items-center gap-2.5 flex-1 max-w-2xl flex-wrap">
          <div className="relative w-full sm:w-64 shrink-0">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search feed activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'field', label: 'Field Changes' },
              { id: 'status', label: 'Status & Workflow' },
              { id: 'assignment', label: 'Assignees' },
              { id: 'creation', label: 'Inception' },
              { id: 'comment', label: 'Comments' }
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border",
                  selectedCategory === cat.id
                    ? "bg-red-600 dark:bg-red-600 text-white border-red-500 shadow-xs"
                    : "bg-zinc-100 dark:bg-zinc-800/70 border-zinc-200/60 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/80 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Module & Member Dropdowns */}
        <div className="flex items-center gap-2">
          {/* Module Filter */}
          <div className="relative">
            <select
              value={selectedModuleId}
              onChange={(e) => setSelectedModuleId(e.target.value)}
              className="h-8 pl-7 pr-7 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-red-500 cursor-pointer appearance-none"
            >
              <option value="all">All Modules</option>
              {(modules || []).map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <Layers size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>

          {/* Member Filter */}
          <div className="relative">
            <select
              value={selectedActorId}
              onChange={(e) => setSelectedActorId(e.target.value)}
              className="h-8 pl-7 pr-7 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-red-500 cursor-pointer appearance-none"
            >
              <option value="all">All Members</option>
              {(members || []).map((mem: any) => (
                <option key={mem.id} value={mem.id}>
                  {mem.name}
                </option>
              ))}
            </select>
            <Users size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Activity Timeline Stream */}
      <div className="flex-1 overflow-y-auto px-6 lg:px-12 py-6 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-3">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-zinc-400">
              <Loader2 size={28} className="animate-spin text-red-500" />
              <p className="text-xs font-medium">Aggregating workspace events...</p>
            </div>
          ) : events.length > 0 ? (
            <>
              <div className="space-y-3">
                {events.map((ev) => (
                  <ActivityEventCard
                    key={ev.id}
                    event={ev}
                    showResourceLink={true}
                    onNavigateToRecord={(modId, recId) => navigate(`/workspace/modules/${modId}/records/${recId}`)}
                  />
                ))}
              </div>

              {/* Load More Pagination */}
              {nextCursor && (
                <div className="pt-4 pb-8 text-center">
                  <button
                    type="button"
                    onClick={() => fetchFeed(nextCursor, true)}
                    disabled={loadingMore}
                    className="px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-colors shadow-xs cursor-pointer inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Loading more...</span>
                      </>
                    ) : (
                      <span>Load older activities</span>
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="py-24 text-center space-y-3 bg-white/40 dark:bg-zinc-900/40 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl p-8">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
                <Clock size={24} />
              </div>
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                {searchQuery || selectedModuleId !== 'all' || selectedCategory !== 'all'
                  ? 'No matching activity found'
                  : 'No workspace activity logged yet'}
              </p>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                {searchQuery || selectedModuleId !== 'all' || selectedCategory !== 'all'
                  ? 'Try selecting different filters or searching for another keyword.'
                  : 'As records are created, fields are modified, and workflows transition across any module, they will stream here in real time.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
