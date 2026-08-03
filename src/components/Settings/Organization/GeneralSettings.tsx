import { useState } from 'react';
import { Input, Select } from '../../UI/Primitives';
import { Building2, Globe, Mail, Zap } from 'lucide-react';

interface GeneralSettingsProps {
  tenant: any;
  onUpdate: (updates: any) => Promise<void>;
}

export const GeneralSettings = ({ tenant, onUpdate }: GeneralSettingsProps) => {
  const [formData, setFormData] = useState({
    name: tenant?.name || '',
    subdomain: tenant?.subdomain || '',
    industry: tenant?.metadata?.industry || 'Technology',
    website: tenant?.metadata?.website || '',
    contactEmail: tenant?.metadata?.contactEmail || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate({
      name: formData.name,
      subdomain: formData.subdomain,
      metadata: {
        ...tenant?.metadata,
        industry: formData.industry,
        website: formData.website,
        contactEmail: formData.contactEmail,
      }
    });
  };

  return (
    <form id="org-settings-form" onSubmit={handleSubmit} className="w-full space-y-6">
      <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200/80 dark:border-white/5 rounded-3xl p-6 lg:p-8 shadow-xl shadow-black/5 dark:shadow-none space-y-8">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider font-mono">Organization Profile & Identity</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Configure company name, primary industry domain, and contact email.</p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <Input 
              label="Organization Name" 
              placeholder="e.g. Acme Corp" 
              icon={<Building2 size={18} />}
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Workspace URL</label>
              <div className="flex items-stretch">
                <div className="flex items-center px-4 rounded-l-xl border border-r-0 border-zinc-200 bg-zinc-50 text-sm text-zinc-500 font-medium dark:border-zinc-800 dark:bg-white/5 dark:backdrop-blur-md">
                  https://
                </div>
                <input 
                  className="flex-1 h-11 border border-zinc-200 bg-white px-4 text-sm text-zinc-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-zinc-800 dark:bg-white/5 dark:backdrop-blur-md dark:text-zinc-100 outline-none transition-all"
                  placeholder="subdomain"
                  value={formData.subdomain}
                  onChange={(e) => setFormData(prev => ({ ...prev, subdomain: e.target.value }))}
                  required
                />
                <div className="flex items-center px-4 rounded-r-xl border border-l-0 border-zinc-200 bg-zinc-50 text-sm text-zinc-500 font-medium dark:border-zinc-800 dark:bg-white/5 dark:backdrop-blur-md">
                  .aurora.app
                </div>
              </div>
            </div>

            <Select 
              label="Primary Industry" 
              value={formData.industry}
              onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
              icon={<Building2 size={18} />}
              options={[
                { label: 'Technology', value: 'Technology' },
                { label: 'Finance', value: 'Finance' },
                { label: 'Manufacturing', value: 'Manufacturing' },
                { label: 'Healthcare', value: 'Healthcare' },
                { label: 'Education', value: 'Education' },
                { label: 'Retail', value: 'Retail' },
              ]}
            />
          </div>

          <div className="space-y-6">
            <Input 
              label="Public Website" 
              placeholder="https://acme.corp" 
              icon={<Globe size={18} />}
              value={formData.website}
              onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
            />
            
            <Input 
              label="Administrative Email" 
              placeholder="admin@acme.corp" 
              type="email"
              icon={<Mail size={18} />}
              value={formData.contactEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
            />

            <div className="p-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-xl shadow-lg shadow-indigo-500/5">
              <h4 className="flex items-center gap-2 text-sm font-bold text-indigo-900 dark:text-indigo-400">
                <Zap size={16} className="fill-current text-indigo-500" /> Identity & Access
              </h4>
              <p className="mt-2 text-xs text-indigo-700/70 dark:text-indigo-300/70 leading-relaxed">
                Updating your subdomain will redirect all existing workspace URLs. 
                Ensure your team is notified before making this change.
              </p>
            </div>
          </div>
        </div>
      </div>
    </form>

  );
};
