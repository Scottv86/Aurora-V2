import { Code } from 'lucide-react';
import { motion } from 'motion/react';
import { PageHeader } from '../../components/UI/PageHeader';

export const DevelopmentPage = () => {
  const flags = [
    { name: 'AURORA_V2_DEEPSEEK_R1_STREAMING', description: 'Enable DeepSeek R1 reasoning stream in Aurora Chat', enabled: true },
    { name: 'MULTI_TENANT_RLS_ENFORCEMENT', description: 'Strict PostgreSQL RLS policy enforcement per tenant session', enabled: true },
    { name: 'AUTONOMOUS_SWARM_WORKFLOWS', description: 'Background agent swarm triggering for document pipeline', enabled: true },
    { name: 'STRIPE_LIVE_WEBHOOK_LISTENER', description: 'Production Stripe billing webhook listener', enabled: false }
  ];

  return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 space-y-8">
      <PageHeader 
        title="Development & Feature Flags"
        description="Global feature flags, environment variable status, schema migrations, and release deployments."
        icon={Code}
      />

      <div className="space-y-4">
        <h2 className="text-sm font-extrabold uppercase tracking-widest text-zinc-400">Platform Feature Flags</h2>
        {flags.map((f, i) => (
          <motion.div 
            key={f.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-6 bg-white/40 dark:bg-white/[0.03] border border-white/20 dark:border-white/5 rounded-3xl backdrop-blur-xl shadow-xl flex items-center justify-between"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-indigo-500">{f.name}</span>
              </div>
              <p className="text-xs text-zinc-500">{f.description}</p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider ${f.enabled ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                {f.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
