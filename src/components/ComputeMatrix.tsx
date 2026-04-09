import { 
  Cpu, 
  Activity, 
  Zap, 
  Server, 
  Globe, 
  AlertCircle,
  Loader2,
  Thermometer
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const API_BASE = 'http://localhost:3001/api/admin';

export const ComputeMatrix = () => {
  const navigate = useNavigate();
  const [compute, setCompute] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompute = async () => {
    try {
      const res = await fetch(`${API_BASE}/compute`);
      const data = await res.json();
      setCompute(data);
    } catch (error) {
      if (loading) toast.error('Compute Swarm Offline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompute();
    const interval = setInterval(fetchCompute, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="h-[calc(100vh-12rem)] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin opacity-50" />
      </div>
    );
  }

  if (!compute || compute.error) {
    return (
      <div className="h-[calc(100vh-12rem)] flex flex-col items-center justify-center space-y-4 text-center px-6">
        <AlertCircle size={64} className="text-rose-500 animate-pulse" />
        <h2 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-widest">Initialization Error</h2>
        <p className="text-zinc-500 text-xs font-mono uppercase tracking-tighter max-w-md italic mt-2">
          {compute?.error || 'Compute telemetry matrix is currently unreachable.'}
        </p>
        <button onClick={() => navigate('/admin')} className="mt-8 px-10 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 font-black text-[10px] uppercase rounded-xl hover:scale-105 transition-transform shadow-xl">
          Return to Hub Registry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      {/* 🧬 AI Swarm Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-3xl shadow-2xl relative overflow-hidden group">
            <Cpu size={32} className="relative z-10" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic">Compute Matrix</h1>
              <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black text-indigo-500 uppercase rounded-lg shadow-sm">
                Swarm Active
              </span>
            </div>
            <p className="text-zinc-500 text-xs font-mono tracking-tighter mt-1 italic uppercase">Global GPU Token Execution & Inference Nodes</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden xl:flex items-center gap-8 px-6 py-2.5 bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl backdrop-blur-xl">
             <div className="flex flex-col">
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">Processed</span>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 font-mono">{compute.globalMetrics.totalTokensProcessed}</span>
             </div>
             <div className="flex flex-col">
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">Kernels</span>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 font-mono">{compute.globalMetrics.activeKernels}</span>
             </div>
             <div className="flex flex-col">
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">Avg Latency</span>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 font-mono">{compute.globalMetrics.averageLatency}</span>
             </div>
          </div>
        </div>
      </div>

      {/* 📡 GPU Cluster Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {compute.nodes.map((node: any, i: number) => (
          <motion.div 
            key={node.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-8 bg-white/70 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-sm flex flex-col justify-between group backdrop-blur-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
               <Server size={60} className={cn(node.status === 'high-load' ? "text-rose-500" : "text-emerald-500")} />
            </div>

            <div className="flex justify-between items-start relative z-10">
               <div className={cn(
                 "p-3 rounded-xl shadow-inner",
                 node.status === 'optimal' ? "bg-emerald-500/10 text-emerald-500" : 
                 node.status === 'high-load' ? "bg-rose-500/10 text-rose-500" : "bg-zinc-500/10 text-zinc-500"
               )}>
                 <Activity size={20} />
               </div>
               <div className="text-right">
                  <p className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tighter">{node.id}</p>
                  <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest mt-0.5">{node.region}</p>
               </div>
            </div>

            <div className="mt-8 space-y-4 relative z-10">
               <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Cluster Utilization</span>
                  <span className={cn("text-xs font-black", node.status === 'high-load' ? "text-rose-500" : "text-emerald-500")}>
                    {node.load}
                  </span>
               </div>
               <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-700">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: node.load }}
                    transition={{ duration: 1, delay: i * 0.2 }}
                    className={cn(
                      "h-full shadow-[0_0_10px_-2px_rgba(0,0,0,0.1)]",
                      node.status === 'high-load' ? "bg-rose-500" : "bg-emerald-500"
                    )} 
                  />
               </div>

               <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-4">
                     <div className="flex items-center gap-1.5 grayscale opacity-50">
                        <Zap size={12} className="text-amber-500" />
                        <span className="text-[9px] font-bold text-zinc-400">{node.gpus}x H100</span>
                     </div>
                     <div className="flex items-center gap-1.5 grayscale opacity-50">
                        <Thermometer size={12} className="text-rose-400" />
                        <span className="text-[9px] font-bold text-zinc-400">{node.temp}</span>
                     </div>
                  </div>
                  <span className={cn(
                    "text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest border",
                    node.status === 'optimal' ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/20" : 
                    node.status === 'high-load' ? "text-rose-400 border-rose-400/20" : "text-zinc-500 border-zinc-700"
                  )}>
                    {node.status}
                  </span>
               </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="p-10 bg-zinc-900 border border-zinc-800 rounded-[3rem] shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
            <div className="relative z-10">
               <div className="flex items-center justify-between mb-10">
                  <div>
                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Swarm Orchestration</h3>
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-1">Cross-regional token load balancing</p>
                  </div>
               </div>
               
               <div className="space-y-6">
                  {[
                    { label: 'Priority Queues', val: '84.2%', color: 'bg-emerald-500' },
                    { label: 'Background Inference', val: '22.8%', color: 'bg-indigo-500' },
                    { label: 'System Validation', val: '5.1%', color: 'bg-purple-500' },
                  ].map((item, i) => (
                    <div key={i} className="space-y-2">
                       <div className="flex justify-between text-[10px] font-bold uppercase tracking-[0.2em]">
                          <span className="text-zinc-400">{item.label}</span>
                          <span className="text-white">{item.val}</span>
                       </div>
                       <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: item.val }}
                             transition={{ duration: 1.5, delay: i * 0.3 }}
                             className={cn("h-full", item.color)} 
                          />
                       </div>
                    </div>
                  ))}
               </div>
            </div>
         </div>

         <div className="p-10 bg-white/70 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-[3rem] shadow-sm backdrop-blur-xl flex flex-col justify-center text-center">
            <Globe size={48} className="mx-auto text-indigo-500 mb-6 animate-pulse" />
            <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic">Global Edge Mesh</h3>
            <p className="max-w-xs mx-auto text-xs text-zinc-500 italic mt-2 uppercase tracking-tight">Node propagation latency verified across 14 zones</p>
            <div className="mt-8 flex justify-center gap-4">
               <span className="px-4 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-full text-[9px] font-bold text-zinc-500 uppercase tracking-[0.1em]">12ms West-US</span>
               <span className="px-4 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-full text-[9px] font-bold text-zinc-500 uppercase tracking-[0.1em]">28ms East-EU</span>
               <span className="px-4 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-full text-[9px] font-bold text-zinc-500 uppercase tracking-[0.1em]">42ms AU-Mesh</span>
            </div>
         </div>
      </div>
    </div>
  );
};
