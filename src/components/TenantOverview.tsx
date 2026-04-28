import { 
  Globe, 
  Layers, 
  ChevronRight,
  TrendingUp,
  Users,
  Database,
  ArrowLeft,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const API_BASE = 'http://localhost:3001/api/admin';

// HUD Status Items
const HUD_STATUS = [
  { label: 'Latency', value: '3ms', status: 'optimal' },
  { label: 'Node Status', value: 'Cluster-Primary', status: 'nominal' },
  { label: 'Auth Sync', value: 'Synced', status: 'nominal' }
];

export const TenantOverview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const res = await fetch(`${API_BASE}/tenancy/${id}`);
        const data = await res.json();
        setTenant(data);
      } catch (error) {
        toast.error('Mission Briefing Access Failed');
      } finally {
        setLoading(false);
      }
    };
    fetchTenant();
  }, [id]);

  if (loading) {
    return (
      <div className="h-[calc(100vh-12rem)] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin opacity-50" />
      </div>
    );
  }

  if (!tenant || tenant.error) {
    return (
      <div className="h-[calc(100vh-12rem)] flex flex-col items-center justify-center space-y-4 text-center px-6">
        <AlertCircle size={64} className="text-rose-500 animate-pulse" />
        <h2 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-widest">Instance Registry Error</h2>
        <p className="text-zinc-500 text-xs font-mono uppercase tracking-tighter max-w-md italic mt-2">
          {tenant?.error || 'Initialization sequence interrupted by null response.'}
        </p>
        <button onClick={() => navigate('/admin')} className="mt-8 px-10 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 font-black text-[10px] uppercase rounded-xl hover:scale-105 transition-transform shadow-xl">
          Return to Hub Registry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-5 duration-700">
      {/* 🛡️ Mission Briefing Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/admin')}
            className="p-4 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:bg-zinc-200 dark:hover:border-zinc-700 transition-all group"
          >
            <ArrowLeft className="text-zinc-500 group-hover:text-indigo-500" size={24} />
          </button>
          <div>
            <div className="flex items-center gap-3">
               <h1 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic">Instance Briefing: {tenant.name}</h1>
               <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black text-indigo-500 uppercase rounded-lg shadow-sm">
                 Active Tenancy
               </span>
            </div>
            <p className="text-zinc-500 text-xs font-mono tracking-tighter mt-1 italic uppercase">UUID: {tenant.id} | Access: {tenant.subdomain}.aurora.app</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden xl:flex items-center gap-8 px-6 py-2.5 bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl backdrop-blur-xl">
            {HUD_STATUS.map((item, i) => (
              <div key={i} className="flex flex-col">
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">{item.label}</span>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 font-mono">{item.value}</span>
              </div>
            ))}
          </div>
          <button className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/30">
            Open Terminal
          </button>
        </div>
      </div>

      {/* 🚀 Mission Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Workspaces', value: tenant.stats.totalWorkspaces, icon: Globe, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: 'Active Modules', value: tenant.stats.totalModules, icon: Layers, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Provisioned Users', value: tenant.stats.totalUsers, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Database Isolation', value: tenant.dbConnectionString ? 'Dedicated' : 'Shared', icon: Database, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 bg-white/70 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-sm flex flex-col justify-between group hover:border-indigo-500/30 transition-all"
          >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform", stat.bg, stat.color)}>
              <stat.icon size={20} />
            </div>
            <div className="mt-6 text-right">
              <p className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter">{stat.value}</p>
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Computing Meter (Recent Logs) */}
        <div className="lg:col-span-2 space-y-8">
          <div className="p-8 bg-white/70 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-sm backdrop-blur-xl relative overflow-hidden group">
            <div className="flex items-center justify-between mb-8">
               <div>
                 <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-3 italic">
                   AI Execution Meter
                 </h3>
                 <p className="text-xs text-zinc-500 italic mt-1 uppercase tracking-tighter">Querying swarm telemetry for 24h cycle</p>
               </div>
               <TrendingUp className="text-indigo-500" size={24} />
            </div>
            {/* Table of logs */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800">
                    <th className="pb-4 text-[9px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Execution ID</th>
                    <th className="pb-4 text-[9px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Compute Type</th>
                    <th className="pb-4 text-[9px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Amount</th>
                    <th className="pb-4 text-[9px] font-bold text-zinc-400 uppercase tracking-[0.2em] text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
                  {tenant.usageLogs.map((log: any) => (
                    <tr key={log.id} className="group hover:bg-zinc-50 dark:hover:bg-indigo-500/[0.03] transition-colors">
                      <td className="py-4 text-[10px] font-mono text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors uppercase">
                        {log.id.slice(0, 12)}...
                      </td>
                      <td className="py-4 px-2">
                        <span className="text-[9px] font-black px-2 py-0.5 bg-indigo-500/10 text-indigo-500 rounded-md uppercase tracking-wider border border-indigo-500/20">
                          {log.type}
                        </span>
                      </td>
                      <td className="py-4 text-xs font-bold text-zinc-900 dark:text-white">
                        {log.amount.toLocaleString()}
                      </td>
                      <td className="py-4 text-right text-[10px] font-mono text-zinc-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                  {tenant.usageLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-xs text-zinc-500 italic uppercase">No swarm active in 24h cycle</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Workspace Inventory */}
        <div className="space-y-6">
          <div className="p-8 bg-zinc-900 dark:bg-zinc-900/60 border border-zinc-800 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
              <Layers size={100} className="text-white" />
            </div>
            <div className="relative z-10">
              <h3 className="text-lg font-black text-white italic flex items-center gap-3 uppercase tracking-tighter">
                Workspace Inventory
              </h3>
              <div className="mt-8 space-y-4">
                {tenant.workspaces.map((ws: any) => (
                  <div key={ws.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                          {ws.name.charAt(0)}
                       </div>
                       <div>
                         <p className="text-sm font-bold text-white uppercase tracking-tighter">{ws.name}</p>
                         <p className="text-[9px] text-zinc-500 font-mono tracking-widest">{ws.modules.length} modules provisioned</p>
                       </div>
                    </div>
                    <ChevronRight size={16} className="text-zinc-600 group-hover:text-indigo-400 transition-colors" />
                  </div>
                ))}
                {tenant.workspaces.length === 0 && (
                   <div className="p-10 border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center space-y-2 opacity-50">
                      <Globe className="text-zinc-700" size={32} />
                      <p className="text-[10px] font-black uppercase text-zinc-600">Grid Empty</p>
                   </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
