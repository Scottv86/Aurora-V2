import { ShieldCheck, Lock, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { PageHeader } from '../../components/UI/PageHeader';

export const RolesAccessPage = () => {
  const roles = [
    {
      title: 'Super Admin',
      badge: 'ROOT PLATFORM',
      color: 'purple',
      description: 'Unrestricted cross-tenant root access. Full registry, provisioner, and telemetry controls.',
      capabilities: ['Manage Tenants', 'Spawn Isolated Cells', 'Global User Directory', 'Grant/Revoke SuperAdmin', 'View Financial Telemetry', 'Bypass RLS Controls']
    },
    {
      title: 'Tenant Admin',
      badge: 'TENANT BOUND',
      color: 'indigo',
      description: 'Full workspace authority within an assigned tenant. Cannot access global registry or cross-tenant data.',
      capabilities: ['Manage Workspace Users', 'Configure Modules', 'Assign Team Roles', 'Document Automations', 'Integration Connectors', 'Tenant Billing']
    },
    {
      title: 'Developer',
      badge: 'BUILDER ROLE',
      color: 'teal',
      description: 'Access to module creation, page layout editor, database schema inspection, and workflow builders.',
      capabilities: ['Module Builder', 'Page Layout Editor', 'API Key Management', 'Automation Workflows', 'Query Explorer', 'Global Lists']
    },
    {
      title: 'Standard User',
      badge: 'OPERATIONAL',
      color: 'zinc',
      description: 'Standard end-user access restricted strictly to assigned modules, queues, and task queues.',
      capabilities: ['View Authorized Modules', 'Create Records', 'Execute Workflow Actions', 'My Work Queue', 'Aurora Chat Assistant']
    }
  ];

  return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 space-y-8">
      <PageHeader 
        title="Roles & Access Policy"
        description="Platform role definitions, capability matrices, and security perimeter enforcement."
        icon={ShieldCheck}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {roles.map((r, i) => (
          <motion.div 
            key={r.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-6 bg-white/40 dark:bg-white/[0.03] border border-white/20 dark:border-white/5 rounded-3xl backdrop-blur-xl shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500">
                  <Lock size={20} />
                </div>
                <span className="text-[9px] font-extrabold px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-500 uppercase tracking-widest border border-indigo-500/20">
                  {r.badge}
                </span>
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">{r.title}</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">{r.description}</p>
              
              <div className="space-y-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Granted Capabilities</p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {r.capabilities.map(cap => (
                    <div key={cap} className="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
