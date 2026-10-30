import {
  Globe,
  ChevronRight,
  Database,
  Workflow,
  ShieldCheck,
  Cpu,
  Plus,
  Inbox,
  ClipboardList,
  Sparkles,
  ArrowUpRight,
  Layers
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { cn, slugify } from '../lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { usePlatform } from '../hooks/usePlatform';
import { useAuth } from '../hooks/useAuth';
import { PageWrapper, itemVariants } from './Common/PageWrapper';
import { Skeleton } from './UI/Skeleton';
import { API_BASE_URL } from '../config';
import { getSharedSocket } from '../lib/socketClient';

export const Dashboard = () => {
  const { tenant, modules, isLoading } = usePlatform();
  const { user, session, isSuperAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [loadingStats, setLoadingStats] = useState(true);

  // Forced Redirect Guard: SuperAdmins belong in the Admin Portal by default
  useEffect(() => {
    if (!loading && user && isSuperAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [user, isSuperAdmin, loading, navigate]);

  const [stats, setStats] = useState([
    { label: 'Active Records', value: '0', icon: <Database size={18} />, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { label: 'Total Volume', value: '0', icon: <Globe size={18} />, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'AI Automations', value: '0', icon: <Cpu size={18} />, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'System Health', value: '99.9%', icon: <ShieldCheck size={18} />, color: 'text-amber-500', bg: 'bg-amber-500/10' }
  ]);

  const activeModules = useMemo(() => {
    return (modules || []).filter(
      (m: any) => m.type !== 'PAGE' && m.enabled !== false && !m.isGlobal && !m.isIntakeTriage && !m.config?.isIntakeTriage
    );
  }, [modules]);

  useEffect(() => {
    if (!tenant?.id || !user) return;
    const tenantId = tenant.id;
    const token = session?.access_token || localStorage.getItem('aurora_token') || '';

    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/data/stats`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-tenant-id': tenantId
          }
        });
        if (res.ok) {
          const json = await res.json();
          setStats((prev) => [
            { ...prev[0], value: (json.activeRecords ?? 0).toString() },
            { ...prev[1], value: (json.totalRecords ?? 0).toString() },
            { ...prev[2], value: (json.aiAutomations ?? 0).toString() },
            { ...prev[3], value: json.health || '99.9%' }
          ]);
        }
      } catch (err) {
        console.error('Failed to fetch stats', err);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();

    if (token) {
      const socket = getSharedSocket(token, tenantId);
      socket.on('record_added', fetchStats);
      socket.on('record_updated', fetchStats);
      socket.on('record_deleted', fetchStats);

      return () => {
        socket.off('record_added', fetchStats);
        socket.off('record_updated', fetchStats);
        socket.off('record_deleted', fetchStats);
      };
    }
  }, [tenant?.id, user, session?.access_token]);

  if (!tenant && !isLoading) {
    return (
      <PageWrapper className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-full text-zinc-300 dark:text-zinc-700">
          <Database size={48} />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">No Workspace Selected</h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-sm mt-2 text-xs">
            You don&apos;t seem to be associated with a workspace. Please contact your administrator.
          </p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="flex flex-col w-full flex-1 min-h-full px-6 lg:px-10 pt-6 pb-10 space-y-6 relative">
      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        {loadingStats ? (
          [1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={108} variant="rounded" className="rounded-2xl" />
          ))
        ) : (
          stats.map((stat, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl shadow-2xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  {stat.label}
                </span>
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', stat.bg, stat.color)}>
                  {stat.icon}
                </div>
              </div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">{stat.value}</p>
            </motion.div>
          ))
        )}
      </div>

      {/* Main Two-Column Grid: Active Workspace Modules + Quick Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Accessible Data Modules */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-2 p-6 bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl shadow-2xs flex flex-col space-y-4"
        >
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
              <Layers size={15} className="text-indigo-500" />
              <span>Workspace Modules</span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-md">
                {activeModules.length}
              </span>
            </h3>
          </div>

          {activeModules.length === 0 ? (
            <div className="py-12 text-center space-y-2 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
              <Database size={24} className="mx-auto text-zinc-300 dark:text-zinc-700" />
              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">No active modules configured yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeModules.slice(0, 8).map((mod: any) => {
                const ModIcon = (LucideIcons as any)[mod.iconName || mod.icon || 'Database'] || Database;
                return (
                  <div
                    key={mod.id}
                    onClick={() => navigate(`/workspace/modules/${slugify(mod.name)}`)}
                    className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-950/30 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 hover:border-indigo-500/30 transition-all cursor-pointer group flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <ModIcon size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {mod.name}
                        </p>
                        <p className="text-[11px] text-zinc-400 truncate">
                          {mod.category || mod.description || 'Workspace Module'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/workspace/modules/${slugify(mod.name)}?action=create`);
                        }}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-zinc-800 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 transition-all cursor-pointer"
                        title={`Create new ${mod.name}`}
                      >
                        <Plus size={13} />
                      </button>
                      <ArrowUpRight size={14} className="text-zinc-300 dark:text-zinc-600 group-hover:text-indigo-500 transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Right Column: Quick Operations & Daily Hubs */}
        <motion.div
          variants={itemVariants}
          className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl shadow-2xs flex flex-col justify-between space-y-4"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                <Workflow size={15} className="text-indigo-500" />
                <span>Operations Hub</span>
              </h3>
              <Link
                to="/workspace/my-work"
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
              >
                My Work <ChevronRight size={12} />
              </Link>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  title: 'My Work Queue',
                  desc: 'View & process records assigned to you',
                  to: '/workspace/my-work',
                  icon: <ClipboardList size={16} className="text-indigo-500" />,
                  badge: 'Queue'
                },
                {
                  title: 'Shared Inbox & Triage',
                  desc: 'AI email classification & record linking',
                  to: '/workspace/apps/inbox',
                  icon: <Inbox size={16} className="text-emerald-500" />,
                  badge: 'Live'
                },
                {
                  title: 'Aurora AI Co-Pilot',
                  desc: 'Query data, draft updates & automate tasks',
                  to: '/workspace/aurora-vibe',
                  icon: <Sparkles size={16} className="text-purple-500" />,
                  badge: 'AI'
                }
              ].map((hub) => (
                <Link
                  key={hub.to}
                  to={hub.to}
                  className="flex items-center justify-between p-3 rounded-xl bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-200/60 dark:border-zinc-800/80 hover:border-indigo-500/30 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-center shrink-0">
                      {hub.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {hub.title}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{hub.desc}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {hub.badge}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Tip: Press ⌘K anywhere to search</span>
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] font-mono">
              ⌘K
            </kbd>
          </div>
        </motion.div>
      </div>
    </PageWrapper>
  );
};
