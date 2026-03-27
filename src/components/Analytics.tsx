import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  Download,
  Calendar
} from 'lucide-react';
import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { cn } from '../lib/utils';
import { useTheme } from '../hooks/useTheme';

const DATA = [
  { name: 'Mon', cases: 40, resolved: 24 },
  { name: 'Tue', cases: 30, resolved: 13 },
  { name: 'Wed', cases: 20, resolved: 98 },
  { name: 'Thu', cases: 27, resolved: 39 },
  { name: 'Fri', cases: 18, resolved: 48 },
  { name: 'Sat', cases: 23, resolved: 38 },
  { name: 'Sun', cases: 34, resolved: 43 },
];

const MODULE_DISTRIBUTION = [
  { name: 'Grants', value: 400 },
  { name: 'Licensing', value: 300 },
  { name: 'Service Requests', value: 300 },
  { name: 'HR Ops', value: 200 },
];

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef'];

export const Analytics = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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
        {[
          { label: 'Total Cases', value: '1,284', change: '+12.5%', trend: 'up', icon: BarChart3 },
          { label: 'Avg. Resolution', value: '4.2 days', change: '-8.1%', trend: 'down', icon: Clock },
          { label: 'Active Users', value: '482', change: '+4.3%', trend: 'up', icon: Users },
          { label: 'AI Efficiency', value: '94%', change: '+2.1%', trend: 'up', icon: TrendingUp },
        ].map((stat, i) => (
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
              <AreaChart data={DATA}>
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
                  data={MODULE_DISTRIBUTION}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {MODULE_DISTRIBUTION.map((entry, index) => (
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
            {MODULE_DISTRIBUTION.map((entry, index) => (
              <div key={entry.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">{entry.name}</span>
                </div>
                <span className="text-xs font-bold text-zinc-900 dark:text-white">{((entry.value / 1200) * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
