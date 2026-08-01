import { useState, useEffect } from 'react';
import { Sparkles, Cpu, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import { PageHeader } from '../../components/UI/PageHeader';

export const AIMonitoringPage = () => {
  const { session } = useAuth();
  const [computeData, setComputeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompute = async () => {
      try {
        if (!session?.access_token) return;
        const res = await fetch('http://localhost:3001/api/admin/compute', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await res.json();
        setComputeData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCompute();
  }, [session?.access_token]);

  if (loading) {
    return (
      <div className="h-[calc(100vh-12rem)] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin opacity-50" />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 space-y-8">
      <PageHeader 
        title="AI Swarm Monitoring"
        description="Monitor GPU cluster nodes, active agent execution kernels, token throughput, and latency."
        icon={Sparkles}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-white/40 dark:bg-white/[0.03] border border-white/20 dark:border-white/5 rounded-3xl backdrop-blur-xl shadow-xl">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Total Tokens Processed</span>
          <p className="text-3xl font-extrabold text-indigo-500 font-mono">{computeData?.globalMetrics?.totalTokensProcessed || '1.4B'}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="p-6 bg-white/40 dark:bg-white/[0.03] border border-white/20 dark:border-white/5 rounded-3xl backdrop-blur-xl shadow-xl">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Active Execution Kernels</span>
          <p className="text-3xl font-extrabold text-purple-500 font-mono">{computeData?.globalMetrics?.activeKernels || 1420}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-6 bg-white/40 dark:bg-white/[0.03] border border-white/20 dark:border-white/5 rounded-3xl backdrop-blur-xl shadow-xl">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Average Swarm Latency</span>
          <p className="text-3xl font-extrabold text-emerald-500 font-mono">{computeData?.globalMetrics?.averageLatency || '18ms'}</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {computeData?.nodes?.map((node: any, i: number) => (
          <motion.div 
            key={node.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-6 bg-white/40 dark:bg-white/[0.03] border border-white/20 dark:border-white/5 rounded-3xl backdrop-blur-xl shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                  <Cpu size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">{node.id}</h3>
                  <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest">{node.region}</span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-500">{node.status}</span>
            </div>

            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="p-2 bg-zinc-50/50 dark:bg-zinc-950/40 rounded-xl">
                <span className="text-[9px] text-zinc-400 block">Load</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{node.load}</span>
              </div>
              <div className="p-2 bg-zinc-50/50 dark:bg-zinc-950/40 rounded-xl">
                <span className="text-[9px] text-zinc-400 block">GPUs</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{node.gpus} Units</span>
              </div>
              <div className="p-2 bg-zinc-50/50 dark:bg-zinc-950/40 rounded-xl">
                <span className="text-[9px] text-zinc-400 block">Temp</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{node.temp}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
