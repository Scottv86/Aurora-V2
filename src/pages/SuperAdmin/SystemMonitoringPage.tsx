import { Gauge } from 'lucide-react';
import { motion } from 'motion/react';
import { PageHeader } from '../../components/UI/PageHeader';

export const SystemMonitoringPage = () => {
  const queues = [
    { name: 'Automation Workflows Queue', active: 12, pending: 0, failed: 0, status: 'Healthy' },
    { name: 'Document Generation Engine', active: 4, pending: 2, failed: 0, status: 'Healthy' },
    { name: 'Scheduled Cron Jobs Runner', active: 8, pending: 1, failed: 0, status: 'Healthy' },
    { name: 'Webhook Subscriptions Gateway', active: 45, pending: 0, failed: 1, status: 'Active' },
  ];

  return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 space-y-8">
      <PageHeader 
        title="System Monitoring"
        description="Monitor background worker queues, scheduled task runners, and webhook delivery pipelines."
        icon={Gauge}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {queues.map((q, i) => (
          <motion.div 
            key={q.name}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-6 bg-white/40 dark:bg-white/[0.03] border border-white/20 dark:border-white/5 rounded-3xl backdrop-blur-xl shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                  <Gauge size={20} />
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">{q.name}</h3>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-500">{q.status}</span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <div className="p-2.5 bg-zinc-50/50 dark:bg-zinc-950/40 rounded-2xl">
                <span className="text-[9px] font-bold text-zinc-400 uppercase block">Active</span>
                <span className="text-lg font-mono font-bold text-indigo-500">{q.active}</span>
              </div>
              <div className="p-2.5 bg-zinc-50/50 dark:bg-zinc-950/40 rounded-2xl">
                <span className="text-[9px] font-bold text-zinc-400 uppercase block">Pending</span>
                <span className="text-lg font-mono font-bold text-amber-500">{q.pending}</span>
              </div>
              <div className="p-2.5 bg-zinc-50/50 dark:bg-zinc-950/40 rounded-2xl">
                <span className="text-[9px] font-bold text-zinc-400 uppercase block">Failed</span>
                <span className="text-lg font-mono font-bold text-rose-500">{q.failed}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
