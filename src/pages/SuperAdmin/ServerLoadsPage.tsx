import { Activity, Server } from 'lucide-react';
import { motion } from 'motion/react';
import { PageHeader } from '../../components/UI/PageHeader';

export const ServerLoadsPage = () => {
  const clusters = [
    { name: 'US-East-Primary (N. Virginia)', cpu: 42, ram: 58, connections: 142, status: 'Optimal' },
    { name: 'EU-West-Node (Ireland)', cpu: 28, ram: 44, connections: 89, status: 'Optimal' },
    { name: 'AP-South-Cell (Singapore)', cpu: 74, ram: 81, connections: 310, status: 'High Load' },
    { name: 'US-West-Edge (Oregon)', cpu: 15, ram: 30, connections: 45, status: 'Optimal' }
  ];

  return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 space-y-8">
      <PageHeader 
        title="Server Loads & Infrastructure"
        description="Real-time CPU, RAM, connection pool saturation, and API Gateway throughput metrics."
        icon={Activity}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {clusters.map((c, i) => (
          <motion.div 
            key={c.name}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-6 bg-white/40 dark:bg-white/[0.03] border border-white/20 dark:border-white/5 rounded-3xl backdrop-blur-xl shadow-xl space-y-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                  <Server size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">{c.name}</h3>
                  <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest">{c.status}</span>
                </div>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  <span>CPU Utilization</span>
                  <span>{c.cpu}%</span>
                </div>
                <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${c.cpu}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  <span>RAM Consumption</span>
                  <span>{c.ram}%</span>
                </div>
                <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${c.ram}%` }} />
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between text-xs font-mono text-zinc-500">
                <span>Active DB Connections:</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{c.connections} / 500</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
