import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight,
  Download,
  Calendar
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { cn } from '../lib/utils';
import { useTheme } from '../hooks/useTheme';
import { usePlatform } from '../hooks/usePlatform';
import { useData } from '../hooks/useData';
import { useEffect, useMemo, useState } from 'react';



const MODULE_DISTRIBUTION = [
  { name: 'Grants', value: 400 },
  { name: 'Licensing', value: 300 },
  { name: 'Service Requests', value: 300 },
  { name: 'HR Ops', value: 200 },
];

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef'];

export const Analytics = () => {
  const { theme } = useTheme();
  const { tenant } = usePlatform();
  const isDark = theme === 'dark';

  const { data: cases } = useData('records');
  const { data: modules } = useData('modules');
  const users: any[] = []; // Need to implement user API later
  const [activeModuleIds, setActiveModuleIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!modules) return;
    const activeIds = new Set<string>();
    modules.forEach(m => {
      if (m.enabled !== false) {
        activeIds.add(m.id);
      }
    });
    setActiveModuleIds(activeIds);
  }, [modules]);

  // Process data for stats and charts 
  const stats = useMemo(() => {
    if (!cases) return { totalCases: 0, avgResolution: '0.0', activeUsers: 0, aiEfficiency: 0 };
    // ONLY show cases associated with ACTIVE modules (consistency with Work Queue)
    const activeCases = cases.filter(c => c.moduleId && activeModuleIds.has(c.moduleId));
    const totalCases = activeCases.length;
    
    // Average Resolution
    const completedCases = activeCases.filter(c => c.status === 'Completed' && c.submittedAt && c.updatedAt);
    let avgResolution = 0;
    if (completedCases.length > 0) {
      const totalDiff = completedCases.reduce((acc, c) => {
        const start = c.submittedAt.toDate ? c.submittedAt.toDate() : new Date(c.submittedAt);
        const end = c.updatedAt.toDate ? c.updatedAt.toDate() : new Date(c.updatedAt);
        return acc + (end.getTime() - start.getTime());
      }, 0);
      avgResolution = totalDiff / completedCases.length / (1000 * 60 * 60 * 24); // in days
    }

    // AI Efficiency (percentage of cases with AI summary)
    const aiCases = activeCases.filter(c => c.aiSummary && c.aiSummary !== '');
    const aiEfficiency = totalCases > 0 ? (aiCases.length / totalCases) * 100 : 94;

    // Active Users (count users for this tenant)
    const tenantUsers = users.filter(u => u.tenantId === tenant?.id);

    return {
      totalCases,
      avgResolution: avgResolution.toFixed(1),
      activeUsers: tenantUsers.length || users.length, // Fallback if no specific tenant users
      aiEfficiency: Math.round(aiEfficiency)
    };
  }, [cases, users, tenant?.id, activeModuleIds]);

  const chartData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - (6 - i));
      return {
        name: days[d.getDay()],
        date: d.toDateString(),
        cases: 0,
        resolved: 0
      };
    });

    if (!cases) return last7Days;

    cases.forEach(c => {
      // Filter out orphaned cases from chart data too
      if (!c.moduleId || !activeModuleIds.has(c.moduleId)) return;
      
      const submittedDate = c.submittedAt?.toDate ? c.submittedAt.toDate() : new Date(c.submittedAt);
      const dayIndex = last7Days.findIndex(d => d.date === submittedDate.toDateString());
      if (dayIndex >= 0) {
        last7Days[dayIndex].cases++;
        if (c.status === 'Completed') {
          last7Days[dayIndex].resolved++;
        }
      }
    });

    return last7Days;
  }, [cases, activeModuleIds]);

  const moduleDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!cases) return MODULE_DISTRIBUTION;

    cases.forEach(c => {
      // Filter out orphaned cases from distribution
      if (!c.moduleId || !activeModuleIds.has(c.moduleId)) return;
      
      const moduleName = c.module || 'Uncategorized';
      counts[moduleName] = (counts[moduleName] || 0) + 1;
    });

    const data = Object.entries(counts).map(([name, value]) => ({ name, value }));
    return data.length > 0 ? data : MODULE_DISTRIBUTION; // Fallback to placeholder if no data
  }, [cases, activeModuleIds]);

  const statsConfig = [
    { label: 'Total Cases', value: stats.totalCases.toLocaleString(), change: '+12.5%', trend: 'up', icon: BarChart3 },
    { label: 'Avg. Resolution', value: `${stats.avgResolution} days`, change: '-8.1%', trend: 'down', icon: Clock },
    { label: 'Active Users', value: stats.activeUsers.toString(), change: '+4.3%', trend: 'up', icon: Users },
    { label: 'AI Efficiency', value: `${stats.aiEfficiency}%`, change: '+2.1%', trend: 'up', icon: TrendingUp },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Analytics</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Real-time performance metrics and system insights.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors shadow-sm dark:shadow-none">
            <Calendar size={16} />
            <span>Last 30 Days</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors shadow-sm dark:shadow-none">
            <Download size={16} />
            <span>Export</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsConfig.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-4 shadow-sm dark:shadow-none"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-xl text-zinc-400 dark:text-zinc-500">
                <stat.icon size={20} />
              </div>
              <div className={cn("flex items-center gap-1 text-xs font-bold", 
                stat.trend === 'up' ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              )}>
                {stat.trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {stat.change}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-8 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-8 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Case Volume vs. Resolution</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-500" />
                <span className="text-xs text-zinc-500 dark:text-zinc-400">New Cases</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Resolved</span>
              </div>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#27272a" : "#e4e4e7"} vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke={isDark ? "#52525b" : "#a1a1aa"} 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10}
                />
                <YAxis 
                  stroke={isDark ? "#52525b" : "#a1a1aa"} 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#18181b' : '#ffffff', 
                    border: isDark ? '1px solid #27272a' : '1px solid #e4e4e7', 
                    borderRadius: '12px',
                    color: isDark ? '#ffffff' : '#18181b'
                  }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="cases" stroke="#6366f1" fillOpacity={1} fill="url(#colorCases)" strokeWidth={2} />
                <Area type="monotone" dataKey="resolved" stroke="#a855f7" fillOpacity={1} fill="url(#colorResolved)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-8 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-8 shadow-sm dark:shadow-none">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Module Distribution</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={moduleDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {moduleDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#18181b' : '#ffffff', 
                    border: isDark ? '1px solid #27272a' : '1px solid #e4e4e7', 
                    borderRadius: '12px',
                    color: isDark ? '#ffffff' : '#18181b'
                  }}
                  itemStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {moduleDistribution.map((entry, index) => (
              <div key={entry.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">{entry.name}</span>
                </div>
                <span className="text-xs font-bold text-zinc-900 dark:text-white">{((entry.value / (cases?.filter(c => c.moduleId && activeModuleIds.has(c.moduleId)).length || 1)) * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
