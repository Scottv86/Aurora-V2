import { useState } from 'react';
import { Button } from '../../../components/UI/Primitives';
import { 
  Database, 
  Cloud, 
  Lock, 
  Shield, 
  Server,
  FileCheck,
  AlertTriangle,
  Save,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';

export const RecordsManagementSettings = () => {
  const [retentionYears, setRetentionYears] = useState('7');
  const [storageProvider, setStorageProvider] = useState<'local' | 's3' | 'gcp' | 'azure'>('s3');
  const [enableWorm, setEnableWorm] = useState(true);
  const [auditLevel, setAuditLevel] = useState<'metadata' | 'full'>('full');
  const [hashAlgo, setHashAlgo] = useState('sha256');
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Records Management configuration saved (Simulated).');
    }, 800);
  };

  return (
    <div className="space-y-8 relative z-10 w-full">
      {/* Placeholder Banner */}
      <div className="p-4 bg-indigo-500/5 border border-indigo-500/15 dark:border-indigo-500/10 rounded-2xl flex items-start gap-4">
        <div className="p-2 bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
          <AlertTriangle size={20} className="animate-pulse" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-widest">🚧 Settings Placeholder Page</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            These settings configure the core compliance rules and archival database engines for the Records Management system. Saving rules here triggers simulated configurations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Retention Standards */}
        <div className="p-6 bg-white/40 dark:bg-white/[0.02] border border-white/20 dark:border-white/5 rounded-3xl space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="text-indigo-500" size={18} />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Default Retention Standards</h3>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Global Expiry Threshold</label>
            <select
              value={retentionYears}
              onChange={(e) => setRetentionYears(e.target.value)}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="1">1 Year (Temp Audits & Transients)</option>
              <option value="3">3 Years (Standard Operations Data)</option>
              <option value="5">5 Years (Extended Customer Logs)</option>
              <option value="7">7 Years (Tax, Invoices & Finance Default)</option>
              <option value="99">Permanent (Do not delete automatically)</option>
            </select>
            <p className="text-[10px] text-zinc-500 leading-normal">
              Unless overridden by a specific module retention schedule, this default period is applied to all eligible compliance records.
            </p>
          </div>
        </div>

        {/* Security & Verification */}
        <div className="p-6 bg-white/40 dark:bg-white/[0.02] border border-white/20 dark:border-white/5 rounded-3xl space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="text-indigo-500" size={18} />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Data Integrity Security</h3>
          </div>

          <div className="flex items-center justify-between p-3 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-zinc-850 dark:text-zinc-200 block">Immutable WORM Holds</span>
              <span className="text-[10px] text-zinc-400 block">Prevent manual deletion of records under active legal holds.</span>
            </div>
            <button
              onClick={() => setEnableWorm(!enableWorm)}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                enableWorm ? "bg-indigo-600" : "bg-zinc-200 dark:bg-zinc-800"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  enableWorm ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Integrity Hashing Algorithm</label>
            <select
              value={hashAlgo}
              onChange={(e) => setHashAlgo(e.target.value)}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="sha256">SHA-256 (High Security, Recommended)</option>
              <option value="sha512">SHA-512 (Ultra-high Compliance)</option>
              <option value="md5">MD5 (Legacy Compatibility)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Storage Targets */}
      <div className="p-6 bg-white/40 dark:bg-white/[0.02] border border-white/20 dark:border-white/5 rounded-3xl space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Server className="text-indigo-500" size={18} />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Archival Storage Targets</h3>
        </div>
        <p className="text-xs text-zinc-400 leading-normal">
          Select where records are stored once they expire from active operational databases and transition to cold archival states.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          {[
            { id: 'local', name: 'Database Archive', description: 'Internal DB partition table', icon: Database },
            { id: 's3', name: 'AWS S3 Glacier', description: 'Amazon WORM Glacier vaults', icon: Cloud },
            { id: 'gcp', name: 'GCP Coldline', description: 'Google Cloud Storage buckets', icon: Cloud },
            { id: 'azure', name: 'Azure Archive', description: 'Microsoft Blob Storage tiers', icon: Cloud }
          ].map((item) => {
            const ProviderIcon = item.icon;
            const isSelected = storageProvider === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setStorageProvider(item.id as any)}
                className={cn(
                  "p-4 border rounded-2xl cursor-pointer transition-all flex flex-col justify-between h-36 relative overflow-hidden",
                  isSelected
                    ? "border-indigo-500 bg-indigo-500/[0.03] dark:bg-indigo-500/10 shadow-lg shadow-indigo-500/5"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white/20 dark:bg-white/[0.01]"
                )}
              >
                <div className="flex justify-between items-start">
                  <div className={cn(
                    "p-2 rounded-lg border",
                    isSelected 
                      ? "bg-indigo-600 text-white border-indigo-600" 
                      : "bg-zinc-50 dark:bg-zinc-900 text-zinc-400 border-zinc-200 dark:border-zinc-800"
                  )}>
                    <ProviderIcon size={16} />
                  </div>
                  {isSelected && (
                    <div className="w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center text-white">
                      <Check size={10} strokeWidth={3} />
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-250 block">{item.name}</span>
                  <span className="text-[10px] text-zinc-450 dark:text-zinc-500 block leading-tight mt-1">{item.description}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Audit Logs Settings */}
      <div className="p-6 bg-white/40 dark:bg-white/[0.02] border border-white/20 dark:border-white/5 rounded-3xl space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <FileCheck className="text-indigo-500" size={18} />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Disposition Logs depth</h3>
        </div>
        <div className="flex gap-4">
          <label className={cn(
            "flex-1 p-4 border rounded-2xl cursor-pointer transition-all flex items-start gap-3",
            auditLevel === 'metadata'
              ? "border-indigo-500 bg-indigo-500/[0.03] dark:bg-indigo-500/10"
              : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
          )} onClick={() => setAuditLevel('metadata')}>
            <input type="radio" checked={auditLevel === 'metadata'} onChange={() => {}} className="mt-1" />
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">Metadata Logs Only</span>
              <span className="text-[10px] text-zinc-400 block leading-normal">Only log timestamps and quantity of purged records (Complies with strict deletion guidelines).</span>
            </div>
          </label>

          <label className={cn(
            "flex-1 p-4 border rounded-2xl cursor-pointer transition-all flex items-start gap-3",
            auditLevel === 'full'
              ? "border-indigo-500 bg-indigo-500/[0.03] dark:bg-indigo-500/10"
              : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
          )} onClick={() => setAuditLevel('full')}>
            <input type="radio" checked={auditLevel === 'full'} onChange={() => {}} className="mt-1" />
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">Full Record Diff Auditing</span>
              <span className="text-[10px] text-zinc-400 block leading-normal">Keep complete cryptographic hash signatures and metadata logs for trace compliance auditing.</span>
            </div>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <Button 
          variant="primary" 
          size="sm" 
          onClick={handleSave} 
          disabled={saving}
          className="gap-2 font-bold"
        >
          {saving ? 'Saving...' : (
            <>
              <Save size={16} /> Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
