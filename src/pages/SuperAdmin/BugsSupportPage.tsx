import { Bug, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import { PageHeader } from '../../components/UI/PageHeader';

export const BugsSupportPage = () => {
  const issues = [
    { id: 'ERR-104', title: 'Vector Store Query Degraded Latency', severity: 'Medium', status: 'Investigating', count: 14, timestamp: '10m ago' },
    { id: 'ERR-102', title: 'Document Automation Merge Field Null Warning', severity: 'Low', status: 'Resolved', count: 2, timestamp: '2h ago' }
  ];

  return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 space-y-8">
      <PageHeader 
        title="Bugs & Support Triage"
        description="Runtime exception aggregation, platform bug traces, and customer support issue triage."
        icon={Bug}
      />

      <div className="space-y-4">
        {issues.map((iss, i) => (
          <motion.div 
            key={iss.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-6 bg-white/40 dark:bg-white/[0.03] border border-white/20 dark:border-white/5 rounded-3xl backdrop-blur-xl shadow-xl flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
                <AlertTriangle size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-zinc-400">{iss.id}</span>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{iss.title}</h3>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">Occurrences: {iss.count} &bull; Last seen: {iss.timestamp}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[9px] font-bold px-2.5 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg uppercase tracking-wider">
                {iss.status}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
