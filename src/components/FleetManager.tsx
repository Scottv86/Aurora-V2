import { 
  CloudUpload, 
  ChevronRight, 
  RefreshCw, 
  Search,
  Box,
  AlertCircle,
  Loader2,
  PackageCheck
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { toast } from 'sonner';

const API_BASE = 'http://localhost:3001/api/admin';

// HUD Metrics
const HUD_METRICS = [
  { label: 'Fleet Sync', value: '100%', status: 'nominal' },
  { label: 'Active Builds', value: '0', status: 'idle' },
  { label: 'Rollout Nodes', value: '54', status: 'active' }
];

const COLORS = ['#6366f1', '#a855f7', '#10b981', '#f59e0b', '#ef4444'];

export const FleetManager = () => {
  const navigate = useNavigate();
  const [fleet, setFleet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchFleet = async () => {
    try {
      const res = await fetch(`${API_BASE}/versions`);
      const data = await res.json();
      setFleet(data);
    } catch (error) {
      if (loading) toast.error('Fleet Telemetry Offline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFleet(); }, []);

  if (loading) {
    return (
      <div className="h-[calc(100vh-12rem)] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin opacity-50" />
      </div>
    );
  }

  if (!fleet || fleet.error) {
    return (
      <div className="h-[calc(100vh-12rem)] flex flex-col items-center justify-center space-y-4 text-center px-6">
        <AlertCircle size={64} className="text-rose-500 animate-pulse" />
        <h2 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-widest">Instance Registry Error</h2>
        <p className="text-zinc-500 text-xs font-mono uppercase tracking-tighter max-w-md italic mt-2">
          {fleet?.error || 'Initialization sequence interrupted by null response.'}
        </p>
        <button onClick={() => navigate('/admin')} className="mt-8 px-10 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 font-black text-[10px] uppercase rounded-xl hover:scale-105 transition-transform shadow-xl">
          Return to Hub Registry
        </button>
      </div>
    );
  }

  const pieData = Object.entries(fleet.distribution).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-10 pb-20">
      {/* 🚀 Fleet Deployment Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-indigo-600 rounded-3xl shadow-2xl shadow-indigo-500/40 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50" />
            <CloudUpload size={32} className="text-white relative z-10" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic">Fleet Manager</h1>
              <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black text-indigo-500 uppercase rounded-lg shadow-sm">
                Control Plane Active
              </span>
            </div>
            <p className="text-zinc-500 text-xs font-mono tracking-tighter mt-1 italic uppercase underline decoration-indigo-500/30">Governance & Global Node Versioning</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden xl:flex items-center gap-8 px-6 py-2.5 bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl backdrop-blur-xl">
             {HUD_METRICS.map((item, i) => (
                <div key={i} className="flex flex-col">
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">{item.label}</span>
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 font-mono">{item.value}</span>
                </div>
             ))}
          </div>
          <button onClick={() => fetchFleet()} className="px-6 py-3 bg-zinc-900 text-white rounded-xl font-bold text-xs hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/10 border border-white/5 flex items-center gap-2 uppercase tracking-widest">
            <RefreshCw size={14} className="hover:animate-spin" />
            Check Updates
          </button>
        </div>
      </div>

      {/* 🛰️ Deployment Matrix & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Module Distribution Pie */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 bg-white/70 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] backdrop-blur-xl flex flex-col items-center justify-between"
        >
          <div className="w-full mb-6">
             <h3 className="text-xl font-bold text-zinc-900 dark:text-white uppercase tracking-tight italic">Module Cluster Map</h3>
             <p className="text-xs text-zinc-500 font-mono uppercase tracking-tighter mt-1">Usage by configuration type</p>
          </div>
          <div className="h-48 w-full mt-4">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid #27272a', fontSize: '10px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
             </ResponsiveContainer>
          </div>
          <div className="w-full mt-8 grid grid-cols-2 gap-3">
             {pieData.map((entry, i) => (
                <div key={i} className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                   <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest truncate">{entry.name}</span>
                </div>
             ))}
          </div>
        </motion.div>

        {/* Rolling Rollouts Status */}
        <div className="lg:col-span-2 space-y-6">
           <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-[3rem] shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                <RefreshCw size={120} className="text-white" />
              </div>
              <div className="relative z-10">
                 <div className="flex items-center justify-between mb-10 px-4">
                    <div>
                      <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Rolling Rollouts</h3>
                      <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mt-1">Global node version control</p>
                    </div>
                 </div>
                 <div className="space-y-4 px-2">
                    {fleet.deployments.map((deploy: any, i: number) => (
                       <div key={i} className="p-6 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between group/item hover:bg-white/10 transition-all cursor-default">
                          <div className="flex items-center gap-6">
                             <div className="p-4 bg-zinc-800 rounded-2xl border border-white/5 shadow-xl text-zinc-400 group-hover/item:text-white transition-colors">
                                <Box size={24} />
                             </div>
                             <div>
                                <div className="flex items-center gap-3">
                                   <p className="text-md font-bold text-white tracking-widest uppercase">{deploy.id}</p>
                                   <span className={cn(
                                     "text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-[0.2em] border",
                                     deploy.label === 'Stable' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
                                   )}>{deploy.label}</span>
                                </div>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1 italic">{deploy.nodes} active nodes on grid</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-12 text-right">
                             <div>
                                <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-1.5">Rollout</p>
                                <div className="w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-white/5">
                                   <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: deploy.rollout }}
                                      transition={{ duration: 1, delay: i * 0.2 }}
                                      className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                                   />
                                </div>
                             </div>
                             <div className="w-16">
                                <p className="text-xl font-black text-white uppercase tracking-tighter italic">{deploy.rollout}</p>
                             </div>
                             <button className="p-3 text-zinc-600 hover:text-white transition-colors">
                                <ChevronRight size={20} />
                             </button>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* 📡 Platform Node Indices */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 bg-white/70 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-sm backdrop-blur-xl relative"
      >
        <div className="flex items-center justify-between mb-8 px-4">
          <div>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white uppercase italic">Active Node Deployment Register</h3>
            <p className="text-zinc-500 text-[10px] font-bold mt-1 uppercase tracking-[0.15em]">Registry syncing in real-time with node gossip clusters</p>
          </div>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-500" size={16} />
            <input 
              type="text" 
              placeholder="Search registry index..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-50/50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-12 pr-6 py-2.5 text-xs text-zinc-900 dark:text-zinc-200 w-72 focus:outline-none focus:border-indigo-500/50 transition-all font-mono"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <th className="pb-6 text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em] px-4">Node Identity</th>
                <th className="pb-6 text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em] px-4">Runtime Layer</th>
                <th className="pb-6 text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em] px-4">Deployment Version</th>
                <th className="pb-6 text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em] px-4">Sync Status</th>
                <th className="pb-6 text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em] px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
              {[{ id: 'node-primary-alpha', type: 'CORE', version: 'v2.6.4', status: 'optimal', uptime: '142 days' },
                { id: 'node-replica-beta', type: 'EDGE', version: 'v2.6.4', status: 'optimal', uptime: '89 days' },
                { id: 'node-canary-gamma', type: 'CANARY', version: 'v2.7.0-beta', status: 'degraded', uptime: '12 hours' },
              ].map((node) => (
                <tr key={node.id} className="group hover:bg-zinc-50/50 dark:hover:bg-indigo-500/[0.03] transition-colors">
                  <td className="py-6 px-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-500">
                        <PackageCheck size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tighter">{node.id}</p>
                        <p className="text-[10px] text-zinc-500 font-mono italic">Uptime: {node.uptime}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-6 px-4">
                    <span className="text-[9px] font-black px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-md uppercase tracking-[0.1em] border border-zinc-200 dark:border-zinc-700">
                      {node.type}
                    </span>
                  </td>
                  <td className="py-6 px-4">
                    <p className="text-xs font-bold text-indigo-500 font-mono tracking-widest">{node.version}</p>
                  </td>
                  <td className="py-6 px-4">
                    <div className="flex items-center gap-2">
                       <div className={cn(
                         "w-1.5 h-1.5 rounded-full",
                         node.status === 'optimal' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                       )} />
                       <span className={cn(
                         "text-[10px] font-bold uppercase tracking-widest italic",
                         node.status === 'optimal' ? "text-emerald-500" : "text-amber-500"
                       )}>{node.status}</span>
                    </div>
                  </td>
                  <td className="py-6 px-4 text-right">
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-indigo-500 transition-all active:scale-95">
                      Promote
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};
