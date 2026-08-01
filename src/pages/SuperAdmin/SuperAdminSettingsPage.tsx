import React, { useState } from 'react';
import { Settings2, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { PageHeader } from '../../components/UI/PageHeader';

export const SuperAdminSettingsPage = () => {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [requireMfa, setRequireMfa] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('60');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Super Admin platform settings saved');
  };

  return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 space-y-8">
      <PageHeader 
        title="Super Admin Settings"
        description="Global platform security policies, maintenance mode toggles, and root administrative keys."
        icon={Settings2}
      />

      <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-white/40 dark:bg-white/[0.03] border border-white/20 dark:border-white/5 rounded-3xl backdrop-blur-xl shadow-xl space-y-6">
          <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Lock size={18} className="text-indigo-500" />
            Security & Authentication Policy
          </h2>

          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Require MFA for SuperAdmin Login</p>
              <p className="text-xs text-zinc-500">Enforce 2FA/MFA verification on root administration accounts.</p>
            </div>
            <button 
              type="button" 
              onClick={() => setRequireMfa(!requireMfa)}
              className={`w-12 h-6 rounded-full transition-colors relative ${requireMfa ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${requireMfa ? 'right-0.5' : 'left-0.5'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div>
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Global Emergency Maintenance Mode</p>
              <p className="text-xs text-zinc-500">Restrict non-superadmin access and put standard workspaces into read-only mode.</p>
            </div>
            <button 
              type="button" 
              onClick={() => setMaintenanceMode(!maintenanceMode)}
              className={`w-12 h-6 rounded-full transition-colors relative ${maintenanceMode ? 'bg-rose-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${maintenanceMode ? 'right-0.5' : 'left-0.5'}`} />
            </button>
          </div>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">SuperAdmin Session Inactivity Timeout (Minutes)</label>
            <input 
              type="number" 
              value={sessionTimeout}
              onChange={e => setSessionTimeout(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
        </motion.div>

        <button 
          type="submit"
          className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-xs uppercase tracking-wider hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/30"
        >
          Save Governance Settings
        </button>
      </form>
    </div>
  );
};
