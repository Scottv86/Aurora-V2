import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { 
  Search, 
  ArrowRight, 
  ShieldCheck, 
  Globe, 
  Users, 
  TrendingUp, 
  HeartPulse
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { PageHeader } from '../../components/UI/PageHeader';

interface AdminMenuItem {
  id: string;
  label: string;
  description: string;
  icon: keyof typeof LucideIcons;
  to: string;
  category: string;
  badge?: string;
}

const SUPER_ADMIN_ITEMS: AdminMenuItem[] = [
  // Overview & Intelligence
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Platform command center with real-time telemetry and network compute heatmap.',
    icon: 'LayoutDashboard',
    to: '/admin',
    category: 'Overview & Intelligence'
  },
  // Tenants & Workforce
  {
    id: 'tenant-management',
    label: 'Tenant Management',
    description: 'Provision, inspect, isolate, and manage multi-tenant database cells.',
    icon: 'Globe',
    to: '/admin/tenants',
    category: 'Tenants & Workforce'
  },
  {
    id: 'user-management',
    label: 'User Management',
    description: 'Global user directory across all tenants, superadmin roles, and user impersonation.',
    icon: 'Users',
    to: '/admin/users',
    category: 'Tenants & Workforce'
  },
  {
    id: 'roles-access',
    label: 'Roles & Access',
    description: 'System capabilities matrix, superadmin permissions, and role assignment.',
    icon: 'ShieldCheck',
    to: '/admin/roles-access',
    category: 'Tenants & Workforce'
  },
  // Monetization & Commercials
  {
    id: 'billing-subscriptions',
    label: 'Billing & Subscriptions',
    description: 'Tenant tier distributions, active licenses, seat limits, and renewal dates.',
    icon: 'CreditCard',
    to: '/admin/subscriptions',
    category: 'Monetization & Commercials'
  },
  {
    id: 'revenue',
    label: 'Revenue',
    description: 'Monthly & Annual Recurring Revenue (MRR/ARR), plan tier earnings, and usage billables.',
    icon: 'TrendingUp',
    to: '/admin/revenue',
    category: 'Monetization & Commercials'
  },
  // Infrastructure & Provisioning
  {
    id: 'provisioning',
    label: 'Provisioning & Resources',
    description: 'Automated tenant spawning engine, dedicated database cell setup, and quotas.',
    icon: 'Zap',
    to: '/admin/provisioning',
    category: 'Infrastructure & Provisioning'
  },
  {
    id: 'server-loads',
    label: 'Server Loads',
    description: 'CPU, RAM, connection pool saturation, and API gateway throughput.',
    icon: 'Activity',
    to: '/admin/server-loads',
    category: 'Infrastructure & Provisioning'
  },
  {
    id: 'storage',
    label: 'Storage',
    description: 'Database disk utilization, media asset storage, and vector DB index footprints.',
    icon: 'Database',
    to: '/admin/storage',
    category: 'Infrastructure & Provisioning'
  },
  // Monitoring & Performance
  {
    id: 'system-health',
    label: 'System Health',
    description: 'Microservice heartbeats, uptime telemetry, and response latency monitors.',
    icon: 'HeartPulse',
    to: '/admin/health',
    category: 'Monitoring & Performance'
  },
  {
    id: 'ai-monitoring',
    label: 'AI Monitoring',
    description: 'AI Swarm execution matrix, token consumption trends, and model latency metrics.',
    icon: 'Sparkles',
    to: '/admin/ai-monitoring',
    category: 'Monitoring & Performance'
  },
  {
    id: 'system-monitoring',
    label: 'System Monitoring',
    description: 'Background worker queues, scheduled task runners, and webhook delivery status.',
    icon: 'Gauge',
    to: '/admin/system-monitoring',
    category: 'Monitoring & Performance'
  },
  // Audit & Engineering
  {
    id: 'logs',
    label: 'System Logs & Audit',
    description: 'Platform audit trails, security events, API execution logs, and payload traces.',
    icon: 'FileText',
    to: '/admin/logs',
    category: 'Audit & Engineering'
  },
  {
    id: 'bugs',
    label: 'Bugs & Support',
    description: 'Uncaught platform exceptions, error stack aggregation, and support triage.',
    icon: 'Bug',
    to: '/admin/bugs',
    category: 'Audit & Engineering'
  },
  {
    id: 'development',
    label: 'Development',
    description: 'Feature flag toggles, environment variables, schema migrations, and version deployments.',
    icon: 'Code',
    to: '/admin/development',
    category: 'Audit & Engineering'
  },
  // Platform Controls
  {
    id: 'settings',
    label: 'Settings',
    description: 'Super admin portal preferences, global security policies, and maintenance toggles.',
    icon: 'Settings2',
    to: '/admin/settings',
    category: 'Platform Controls'
  }
];

export const SuperAdminOverview = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<any>(null);
  const { session } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (!session?.access_token) return;
        const res = await fetch('http://localhost:3001/api/admin/stats', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch admin stats:', err);
      }
    };
    fetchStats();
  }, [session?.access_token]);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return SUPER_ADMIN_ITEMS;
    const query = searchQuery.toLowerCase();
    return SUPER_ADMIN_ITEMS.filter(item =>
      item.label.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(filteredItems.map(item => item.category)));
    const order = [
      'Overview & Intelligence',
      'Tenants & Workforce',
      'Monetization & Commercials',
      'Infrastructure & Provisioning',
      'Monitoring & Performance',
      'Audit & Engineering',
      'Platform Controls'
    ];
    return cats.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }, [filteredItems]);

  return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 relative">
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[100px] -ml-48 -mb-48 pointer-events-none" />

      {/* Page Header */}
      <PageHeader 
        title="Super Admin Portal"
        description="Primary Cluster Node: aurora-primary-alpha • Live Health: Optimal"
        icon={ShieldCheck}
        actions={
          <div className="relative group w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input 
              type="text"
              placeholder="Search admin catalog..."
              className="w-full bg-white/40 dark:bg-white/[0.02] border border-zinc-250/20 dark:border-white/5 rounded-2xl pl-11 pr-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500 backdrop-blur-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        }
      />

      {/* Prominent Quick Action Cards */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <QuickActionCard 
          icon={<Globe size={22} />}
          title="Tenant Registry"
          description="Manage businesses, provision cells, and toggle statuses."
          onClick={() => navigate('/admin/tenants')}
          color="indigo"
          count={stats?.overview?.totalTenants || '0'}
        />
        <QuickActionCard 
          icon={<Users size={22} />}
          title="User Directory"
          description="Manage superadmins, assign roles, and impersonate."
          onClick={() => navigate('/admin/users')}
          color="purple"
        />
        <QuickActionCard 
          icon={<TrendingUp size={22} />}
          title="Revenue Analytics"
          description="Track MRR, ARR, and AI token usage billables."
          onClick={() => navigate('/admin/revenue')}
          color="emerald"
        />
        <QuickActionCard 
          icon={<HeartPulse size={22} />}
          title="System Health"
          description="Monitor cluster nodes, latencies, and service status."
          onClick={() => navigate('/admin/health')}
          color="teal"
        />
      </div>

      {/* Categorized Admin Grid */}
      <div className="relative z-10 space-y-12">
        <AnimatePresence mode="popLayout">
          {categories.map((category, catIdx) => (
            <motion.section
              key={category}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ delay: catIdx * 0.04 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                  {category}
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-zinc-200 dark:from-zinc-800/80 to-transparent" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems
                  .filter(item => item.category === category)
                  .map((item, itemIdx) => {
                    const Icon = (LucideIcons as any)[item.icon] || LucideIcons.Box;
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: itemIdx * 0.02 }}
                        onClick={() => navigate(item.to)}
                        className="group p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl transition-all shadow-xl shadow-black/5 dark:shadow-none hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-indigo-500/10 cursor-pointer flex flex-col h-full relative overflow-hidden justify-between"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.1] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="relative z-10 flex flex-col h-full justify-between">
                          <div>
                            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform w-fit mb-4">
                              <Icon size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {item.label}
                            </h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
                              {item.description}
                            </p>
                          </div>
                          
                          <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center text-sm font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-4 group-hover:translate-x-0 transform duration-300">
                            Launch Module <ArrowRight size={16} className="ml-2" />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            </motion.section>
          ))}
        </AnimatePresence>

        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center relative z-10">
            <div className="w-16 h-16 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-2xl flex items-center justify-center mb-4 border border-zinc-200/50 dark:border-zinc-800/80">
              <Search size={32} className="text-zinc-300 dark:text-zinc-700" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">No modules found</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No super admin items matched your query "{searchQuery}"</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-20 pt-8 border-t border-zinc-200/50 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 relative z-10"
      >
        <p className="text-[10px] font-black text-zinc-450 dark:text-zinc-650 uppercase tracking-[0.2em]">
          Aurora Super Admin Suite &copy; 2026 &bull; Global Multi-Tenant Operations
        </p>
      </motion.div>
    </div>
  );
};

const QuickActionCard = ({ 
  icon, 
  title, 
  description, 
  onClick, 
  color,
  count
}: { 
  icon: React.ReactNode, 
  title: string, 
  description: string, 
  onClick: () => void,
  color: 'indigo' | 'teal' | 'emerald' | 'purple',
  count?: string
}) => {
  const colorClasses = {
    indigo: 'hover:border-indigo-500/50 hover:shadow-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    teal: 'hover:border-teal-500/50 hover:shadow-teal-500/10 text-teal-600 dark:text-teal-400',
    emerald: 'hover:border-emerald-500/50 hover:shadow-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    purple: 'hover:border-purple-500/50 hover:shadow-purple-500/10 text-purple-600 dark:text-purple-400'
  };

  const iconBgClasses = {
    indigo: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    teal: 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    purple: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400'
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      onClick={onClick}
      className={cn(
        "group p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl transition-all shadow-xl shadow-black/5 dark:shadow-none cursor-pointer flex flex-col relative overflow-hidden h-full justify-between",
        colorClasses[color]
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.1] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className={cn("p-3 rounded-xl w-fit group-hover:scale-110 transition-transform shadow-sm", iconBgClasses[color])}>
              {icon}
            </div>
            {count && (
              <span className="text-xl font-extrabold text-zinc-900 dark:text-white font-mono">
                {count}
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {title}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {description}
          </p>
        </div>
        
        <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-4 group-hover:translate-x-0 transform duration-300">
          Open Console <ArrowRight size={14} className="ml-2" />
        </div>
      </div>
    </motion.div>
  );
};
