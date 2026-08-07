import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ArrowLeft
} from 'lucide-react';
import { SettingsSubNavLayout, SettingsSubNavItem } from '../../../components/Settings/SettingsSubNavLayout';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';

export const RecordsManagementSettings = () => {
  const navigate = useNavigate();
  const [retentionYears, setRetentionYears] = useState('7');
  const [storageProvider, setStorageProvider] = useState<'local' | 's3' | 'gcp' | 'azure'>('s3');
  const [enableWorm, setEnableWorm] = useState(true);
  const [auditLevel, setAuditLevel] = useState<'metadata' | 'full'>('full');
  const [hashAlgo, setHashAlgo] = useState('sha256');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('policy');

  const subNavItems: SettingsSubNavItem[] = [
    { id: 'policy', label: 'Retention Policy', icon: Shield, description: 'Compliance & hold schedules' },
    { id: 'storage', label: 'Storage Provider', icon: Cloud, description: 'S3/Azure/Local targets' },
    { id: 'security', label: 'WORM & Auditing', icon: Lock, description: 'Cryptographic immutability' }
  ];

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Records Management configuration saved (Simulated).');
    }, 800);
  };

  return (
    <SettingsSubNavLayout
      title="Records Management"
      description="Retention rules, immutable storage targets, and cryptographic auditing compliance."
      icon={Database}
      items={subNavItems}
      activeId={activeTab}
      onTabChange={setActiveTab}
      actions={
        <div className="flex items-center gap-2">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => navigate('/workspace/settings/platform-modules')}
            className="gap-2 font-bold"
          >
            <ArrowLeft size={16} /> Back to Modules
          </Button>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleSave} 
            disabled={saving}
            className="gap-2 font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20"
          >
            {saving ? 'Saving...' : (
              <>
                <Save size={16} /> Save Settings
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-8 text-left max-w-4xl">
        {/* Placeholder Banner */}
        <div className="p-4 bg-indigo-500/5 border border-indigo-500/15 dark:border-indigo-500/10 rounded-2xl flex items-start gap-4">
          <div className="p-2 bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <AlertTriangle size={20} className="animate-pulse" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200">Compliance & Archival Storage Engine</h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Configure automated retention policies and immutable ledger settings for generated reports, document attachments, and system logs.
            </p>
          </div>
        </div>

        {/* Section 1: Retention Schedules */}
        <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
                <Shield size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Retention & Purge Schedule</h3>
                <p className="text-xs text-zinc-400">Define maximum storage lifespan before records are flagged for disposition.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Default Retention Period</label>
              <select 
                value={retentionYears}
                onChange={(e) => setRetentionYears(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="1">1 Year (Basic operational logs)</option>
                <option value="3">3 Years (Financial transactions)</option>
                <option value="7">7 Years (Standard legal compliance)</option>
                <option value="10">10 Years (Extended statutory audit)</option>
                <option value="indefinite">Indefinite (Legal hold / No auto-purge)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Cryptographic Hash Standard</label>
              <select 
                value={hashAlgo}
                onChange={(e) => setHashAlgo(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="sha256">SHA-256 (FIPS 180-4 standard)</option>
                <option value="sha512">SHA-512 (High security requirement)</option>
                <option value="blake3">BLAKE3 (High speed verification)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Storage Target */}
        <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                <Cloud size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Primary Document Storage Provider</h3>
                <p className="text-xs text-zinc-400">Select where document blobs, PDF reports, and export bundles are persisted.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: 's3', name: 'Amazon S3', icon: Cloud },
              { id: 'gcp', name: 'Google Storage', icon: Server },
              { id: 'azure', name: 'Azure Blob', icon: Database },
              { id: 'local', name: 'Local Volume', icon: FileCheck },
            ].map((provider) => {
              const Icon = provider.icon;
              const isSelected = storageProvider === provider.id;
              return (
                <button
                  key={provider.id}
                  onClick={() => setStorageProvider(provider.id as any)}
                  className={cn(
                    "p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3",
                    isSelected 
                      ? "border-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" 
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  <Icon size={20} />
                  <span className="text-xs font-bold">{provider.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: WORM Immutability */}
        <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                <Lock size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Immutability & Cryptographic Controls</h3>
                <p className="text-xs text-zinc-400">Enforce Write-Once-Read-Many (WORM) storage protection to prevent deletion.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="space-y-0.5">
              <h5 className="text-xs font-bold text-zinc-900 dark:text-white">Enable WORM Object Lock</h5>
              <p className="text-[11px] text-zinc-450">Objects cannot be overwritten or deleted until retention period expires.</p>
            </div>
            <input 
              type="checkbox" 
              checked={enableWorm} 
              onChange={(e) => setEnableWorm(e.target.checked)}
              className="h-4 w-4 text-indigo-600 rounded border-zinc-300 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Audit Trail Logging Depth</label>
            <div className="flex gap-4">
              <label className={cn(
                "flex-1 p-4 border rounded-2xl cursor-pointer transition-all flex items-start gap-3",
                auditLevel === 'metadata' 
                  ? "border-indigo-500 bg-indigo-500/[0.03] dark:bg-indigo-500/10" 
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
              )} onClick={() => setAuditLevel('metadata')}>
                <input type="radio" checked={auditLevel === 'metadata'} onChange={() => {}} className="mt-1" />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">Metadata Only</span>
                  <span className="text-[10px] text-zinc-400 block leading-normal">Track user timestamps, actions, and record IDs without storing delta blobs.</span>
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
        </div>
      </div>
    </SettingsSubNavLayout>
  );
};
