import { 
  Activity,
  ShieldCheck,
  Zap,
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Database,
  Globe,
  RefreshCw,
  Clock,
  ExternalLink
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const API_BASE = 'http://localhost:3001/api/admin';

export const HealthMonitor = () => {
  const navigate = useNavigate();
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState(new Date());

  const fetchHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/nodes`);
      const data = await res.json();
      setHealth(data);
      setLastSync(new Date());
    } catch (error) {
       if (loading) toast.error('Stability Telemetry Offline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 5000); 
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="h-[calc(100vh-12rem)] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin opacity-50" />
      </div>
    );
  }

  if (!health || health.error) {
    return (
      <div className="h-[calc(100vh-12rem)] flex flex-col items-center justify-center space-y-4 text-center px-6">
        <AlertCircle size={64} className="text-rose-500 animate-pulse" />
        <h2 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-widest">Instance Registry Error</h2>
        <p className="text-zinc-500 text-xs font-mono uppercase tracking-tighter max-w-md italic mt-2">
          {health?.error || 'Initialization sequence interrupted by null response.'}
        </p>
        <button onClick={() => navigate('/admin')} className="mt-8 px-10 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 font-black text-[10px] uppercase rounded-xl hover:scale-105 transition-transform shadow-xl">
          Return to Hub Registry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      {/* 🚀 Infrastructure HUD Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-emerald-500 rounded-3xl shadow-2xl shadow-emerald-500/40 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50" />
            <Activity size={32} className="text-white relative z-10" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic">Stability HUD</h1>
              <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-black text-emerald-500 uppercase rounded-lg flex items-center gap-1.5 shadow-[0_0_15px_-5px_rgba(16,185,129,0.5)]">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Operational
              </span>
            </div>
            <p className="text-zinc-500 text-xs font-mono tracking-tighter mt-1 italic uppercase">Last Engine Pulse: {lastSync.toLocaleTimeString()}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <button 
             onClick={() => fetchHealth()}
             className="px-6 py-2.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-zinc-200 dark:hover:bg-zinc-800/50 transition-all"
           >
             <RefreshCw size={14} className={cn("text-zinc-500", "hover:animate-spin")} />
             Force Sync
           </button>
        </div>
      </div>

      {/* 🛰️ Core Cluster Status */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
         {[
           { label: 'Registry Sync', value: health.registrySync, icon: ShieldCheck, color: 'text-indigo-400', sub: 'Global index consistent' },
           { label: 'Network Latency', value: health.latency, icon: Clock, color: 'text-amber-400', sub: 'Hub-to-Edge roundtrip' },
           { label: 'Database Nodes', value: health.databaseNodes, icon: Database, color: 'text-purple-400', sub: 'Prisma 7 active clusters' },
           { label: 'AI Execution Swarm', value: health.aiExecutionSwarm, icon: Zap, color: 'text-indigo-500', sub: 'Gemini flash-2 nodes' },
         ].map((stat, i) => (
           <motion.div 
             key={i}
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: i * 0.1 }}
             className="p-8 bg-white/70 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-sm flex flex-col justify-between group backdrop-blur-xl"
           >
             <div className="flex justify-between items-start">
               <div className={cn("p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-950 shadow-inner group-hover:scale-110 transition-transform", stat.color)}>
                 <stat.icon size={24} />
               </div>
               <div className="text-right">
                 <p className="text-3xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic">{stat.value}</p>
                 <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest mt-1">{stat.label}</p>
               </div>
             </div>
             <p className="mt-8 text-[10px] font-bold text-zinc-500 italic uppercase flex items-center gap-2">
                <CheckCircle2 size={12} className="text-emerald-500" />
                {stat.sub}
             </p>
           </motion.div>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Service Matrix */}
        <div className="lg:col-span-2 space-y-8">
           <div className="p-8 bg-white/70 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-sm backdrop-blur-xl">
              <div className="flex items-center justify-between mb-10">
                 <div>
                   <h3 className="text-xl font-bold text-zinc-900 dark:text-white uppercase tracking-tight italic">Service Cluster Matrix</h3>
                   <p className="text-xs text-zinc-500 mt-1 italic uppercase font-mono">Querying service availability across regions</p>
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {health.services.map((service: any, i: number) => (
                  <div key={i} className="p-6 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-800 rounded-[1.5rem] flex items-center justify-between group hover:border-emerald-500/30 transition-all">
                    <div className="flex items-center gap-4">
                       <div className={cn(
                         "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
                         service.status === 'optimal' ? "bg-emerald-500 text-white" : "bg-amber-500 text-white shadow-amber-500/20"
                       )}>
                         {service.status === 'optimal' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                       </div>
                       <div>
                         <p className="text-md font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tighter italic">{service.name}</p>
                         <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5 italic">Uptime: {service.uptime}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className={cn(
                         "text-[10px] font-black uppercase tracking-widest",
                         service.status === 'optimal' ? "text-emerald-500" : "text-amber-500"
                       )}>
                        {service.status}
                       </p>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </div>

        {/* Console Log */}
        <div className="space-y-6">
           <div className="p-8 bg-zinc-950 border border-zinc-800 rounded-[2.5rem] shadow-2xl h-full flex flex-col relative overflow-hidden group">
              <div className="flex items-center gap-2 mb-6 text-zinc-500">
                <Globe size={16} />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] italic">Operational Ledger</span>
              </div>
              <div className="flex-1 font-mono text-[10px] space-y-3 opacity-80 overflow-y-auto pr-2 no-scrollbar">
                {[
                  { time: '19:12:44', msg: 'System.Registry: Sync complete [ID: zoqnvkg...]' },
                  { time: '19:12:40', msg: 'Compute.Node: Atomic provisioning successful' },
                  { time: '19:10:12', msg: 'Security.Shield: Cross-tenant isolation verified' },
                  { time: '18:55:22', msg: 'Engine.Swarm: Scaling execution nodes to 14' },
                  { time: '18:42:01', msg: 'Platform.Shell: Dark mode transition successful' },
                  { time: '18:00:00', msg: 'Maintenance: DB indexing cycle complete' },
                ].map((log, i) => (
                  <div key={i} className="flex gap-4 group/item">
                    <span className="text-indigo-500 shrink-0">[{log.time}]</span>
                    <span className="text-zinc-300 group-hover/item:text-white transition-colors">{log.msg}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t border-zinc-800">
                 <button className="w-full py-3 bg-zinc-900 text-zinc-400 border border-zinc-800 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:text-white transition-all flex items-center justify-center gap-2">
                    <ExternalLink size={12} />
                    Export Telemetry
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
