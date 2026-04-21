import { useState } from 'react';
import { Button, Select, Input } from '../../UI/Primitives';
import { Save, Settings2, Shield, Zap, Archive, Globe } from 'lucide-react';

interface WorkspaceSettingsProps {
  tenant: any;
  onUpdate: (updates: any) => Promise<void>;
}

export const WorkspaceSettings = ({ tenant, onUpdate }: WorkspaceSettingsProps) => {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    defaultModuleVisibility: tenant?.workspaceSettings?.defaultModuleVisibility || 'private',
    autoCategorization: tenant?.workspaceSettings?.autoCategorization ?? true,
    archivingPolicyDays: tenant?.workspaceSettings?.archivingPolicyDays || 90,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onUpdate({
        workspaceSettings: {
          ...settings
        }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-12">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white uppercase tracking-tight">Workspace Governance</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Define global rules for how data and modules are handled across all user workspaces.
            </p>
          </div>

          <div className="lg:col-span-2 space-y-10">
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

            <div className="p-8 rounded-[2rem] bg-zinc-50 border border-zinc-100 dark:bg-zinc-900/50 dark:border-zinc-800 space-y-8">
              <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Zap size={16} className="text-blue-500 fill-current" />
                        <p className="text-sm font-bold text-zinc-900 dark:text-white">Enhanced Auto-Categorization</p>
                    </div>
                    <p className="text-xs text-zinc-500">Automatically group and tag records using semantic intelligence.</p>
                  </div>
                  <div 
                    onClick={() => setSettings(prev => ({ ...prev, autoCategorization: !prev.autoCategorization }))}
                    className={`h-6 w-11 rounded-full relative cursor-pointer transition-colors ${settings.autoCategorization ? 'bg-blue-600' : 'bg-zinc-200 dark:bg-zinc-800'}`}
                  >
                    <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${settings.autoCategorization ? 'right-1' : 'left-1'}`} />
                  </div>
              </div>

              <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
                        <Globe size={20} />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-bold text-zinc-900 dark:text-white">Global Workspace Enforcement</p>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                          Enabling these settings will apply to all existing and future modules. 
                          Individual workspace owners may override visibility settings unless "Strict Enforcement" is set in Security.
                        </p>
                    </div>
                  </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end pt-8 border-t border-zinc-200 dark:border-zinc-800">
        <Button 
          type="submit" 
          variant="primary" 
          loading={loading}
          className="gap-2 px-8 font-bold shadow-lg shadow-blue-500/20"
        >
          <Settings2 size={18} /> Save Workspace Rules
        </Button>
      </div>
    </form>
  );
};
