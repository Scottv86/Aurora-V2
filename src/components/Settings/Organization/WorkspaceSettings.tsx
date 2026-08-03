import { useState } from 'react';
import { Select, Input } from '../../UI/Primitives';
import { Shield, Zap, Archive, Globe } from 'lucide-react';

interface WorkspaceSettingsProps {
  tenant: any;
  onUpdate: (updates: any) => Promise<void>;
}

export const WorkspaceSettings = ({ tenant, onUpdate }: WorkspaceSettingsProps) => {
  const [settings, setSettings] = useState({
    defaultModuleVisibility: tenant?.workspaceSettings?.defaultModuleVisibility || 'private',
    autoCategorization: tenant?.workspaceSettings?.autoCategorization ?? true,
    archivingPolicyDays: tenant?.workspaceSettings?.archivingPolicyDays || 90,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate({
      workspaceSettings: {
        ...settings
      }
    });
  };

  return (
    <form id="org-settings-form" onSubmit={handleSubmit} className="w-full space-y-6">
      <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200/80 dark:border-white/5 rounded-3xl p-6 lg:p-8 shadow-xl shadow-black/5 dark:shadow-none space-y-8">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider font-mono">Workspace Governance & Default Policies</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Define global rules for how data, privacy, and auto-archiving are handled.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Select 
            label="Default Module Privacy" 
            value={settings.defaultModuleVisibility}
            onChange={(e) => setSettings(prev => ({ ...prev, defaultModuleVisibility: e.target.value as any }))}
            options={[
              { label: 'Private (Invite Only)', value: 'private' },
              { label: 'Public (Organization-wide)', value: 'public' },
            ]}
            icon={<Shield size={18} />}
          />

          <Input 
            label="Auto-Archive Policy (Days)" 
            type="number"
            value={settings.archivingPolicyDays}
            onChange={(e) => setSettings(prev => ({ ...prev, archivingPolicyDays: parseInt(e.target.value) }))}
            icon={<Archive size={18} />}
            placeholder="90"
          />
        </div>

        <div className="p-6 rounded-2xl bg-white/40 dark:bg-white/[0.02] border border-zinc-200/80 dark:border-white/5 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-indigo-500 fill-current" />
                <p className="text-sm font-bold text-zinc-900 dark:text-white">Enhanced Auto-Categorization</p>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Automatically group and tag records using semantic intelligence.</p>
            </div>
            <div 
              onClick={() => setSettings(prev => ({ ...prev, autoCategorization: !prev.autoCategorization }))}
              className={`h-6 w-11 rounded-full relative cursor-pointer transition-colors ${settings.autoCategorization ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-white/10'}`}
            >
              <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${settings.autoCategorization ? 'right-1' : 'left-1'}`} />
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-200/80 dark:border-zinc-800/80">
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                <Globe size={20} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-zinc-900 dark:text-white">Global Workspace Enforcement</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Enabling these settings will apply to all existing and future modules. 
                  Individual workspace owners may override visibility settings unless "Strict Enforcement" is set.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
