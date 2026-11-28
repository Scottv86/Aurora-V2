import { useState } from 'react';
import { Select, Input } from '../../UI/Primitives';
import { Shield, Zap, Archive, Globe, ShieldCheck, Check } from 'lucide-react';

interface WorkspaceSettingsProps {
  tenant: any;
  onUpdate: (updates: any) => Promise<void>;
}

const COMPLIANCE_FRAMEWORK_OPTIONS = [
  {
    id: 'AU_PRIVACY_ACT',
    label: 'Australian Privacy Act (OAIC)',
    desc: 'Masks TFN, Medicare, ABN & personal details on non-admin roles; enforces public form consent.',
  },
  {
    id: 'GDPR',
    label: 'GDPR (EU)',
    desc: 'Masks personal data, requires explicit consent on external forms, disables non-admin bulk export.',
  },
  {
    id: 'SOC2_ISO27001',
    label: 'SOC 2 / ISO 27001',
    desc: 'Enforces least-privilege RBAC and approval guardrails on sensitive workflows.',
  },
  {
    id: 'GOV_LICENSING',
    label: 'Government & Licensing',
    desc: 'Verifies applicant identity capture and statutory assessment/review workflow stages.',
  },
  {
    id: 'FINANCIAL_PCI',
    label: 'Financial & PCI-DSS',
    desc: 'Masks bank/BSB/card/margin fields and caps non-admin monetary approval thresholds.',
  },
] as const;

export const WorkspaceSettings = ({ tenant, onUpdate }: WorkspaceSettingsProps) => {
  const existingCompliance = tenant?.workspaceSettings?.complianceProfile || {};
  const [settings, setSettings] = useState({
    defaultModuleVisibility: tenant?.workspaceSettings?.defaultModuleVisibility || 'private',
    autoCategorization: tenant?.workspaceSettings?.autoCategorization ?? true,
    archivingPolicyDays: tenant?.workspaceSettings?.archivingPolicyDays || 90,
  });
  const [complianceProfile, setComplianceProfile] = useState({
    frameworks: Array.isArray(existingCompliance.frameworks) ? (existingCompliance.frameworks as string[]) : [],
    approvalThresholdAmount: typeof existingCompliance.approvalThresholdAmount === 'number' ? existingCompliance.approvalThresholdAmount : 5000,
    retentionYears: typeof existingCompliance.retentionYears === 'number' ? existingCompliance.retentionYears : 7,
    requirePublicFormConsent: Boolean(existingCompliance.requirePublicFormConsent),
  });

  const toggleFramework = (id: string) => {
    setComplianceProfile((prev) => ({
      ...prev,
      frameworks: prev.frameworks.includes(id)
        ? prev.frameworks.filter((f) => f !== id)
        : [...prev.frameworks, id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate({
      workspaceSettings: {
        ...(tenant?.workspaceSettings || {}),
        ...settings,
        complianceProfile,
      },
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

      {/* Compliance-as-Code Regulatory Profile */}
      <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200/80 dark:border-white/5 rounded-3xl p-6 lg:p-8 shadow-xl shadow-black/5 dark:shadow-none space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <ShieldCheck size={16} className="text-indigo-500" />
              <span>Compliance-as-Code Profile</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Active frameworks are automatically enforced by Solution Studio AI, Solution Audit, and Pre-Flight checks.
            </p>
          </div>
          {complianceProfile.frameworks.length > 0 && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 shrink-0">
              {complianceProfile.frameworks.length} active
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {COMPLIANCE_FRAMEWORK_OPTIONS.map((fw) => {
            const selected = complianceProfile.frameworks.includes(fw.id);
            return (
              <button
                key={fw.id}
                type="button"
                onClick={() => toggleFramework(fw.id)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start justify-between gap-3 ${
                  selected
                    ? 'bg-indigo-50/70 dark:bg-indigo-500/10 border-indigo-400 dark:border-indigo-500/50'
                    : 'bg-white/60 dark:bg-zinc-900/40 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="space-y-1">
                  <div className="text-xs font-bold text-zinc-900 dark:text-white">{fw.label}</div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">{fw.desc}</p>
                </div>
                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                    selected
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-zinc-300 dark:border-zinc-700'
                  }`}
                >
                  {selected && <Check size={12} />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <Input
            label="Default Approval Threshold ($)"
            type="number"
            value={complianceProfile.approvalThresholdAmount}
            onChange={(e) =>
              setComplianceProfile((prev) => ({
                ...prev,
                approvalThresholdAmount: Math.max(0, parseInt(e.target.value) || 0),
              }))
            }
            placeholder="5000"
          />
          <Input
            label="Record Retention Target (Years)"
            type="number"
            value={complianceProfile.retentionYears}
            onChange={(e) =>
              setComplianceProfile((prev) => ({
                ...prev,
                retentionYears: Math.max(1, parseInt(e.target.value) || 7),
              }))
            }
            placeholder="7"
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-zinc-200/80 dark:border-zinc-800/80">
          <div>
            <p className="text-xs font-bold text-zinc-900 dark:text-white">Require Privacy Consent on External Forms</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Automatically flags and adds a required consent checkbox to public and portal intake forms.
            </p>
          </div>
          <div
            onClick={() =>
              setComplianceProfile((prev) => ({ ...prev, requirePublicFormConsent: !prev.requirePublicFormConsent }))
            }
            className={`h-6 w-11 rounded-full relative cursor-pointer transition-colors ${
              complianceProfile.requirePublicFormConsent ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-white/10'
            }`}
          >
            <div
              className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
                complianceProfile.requirePublicFormConsent ? 'right-1' : 'left-1'
              }`}
            />
          </div>
        </div>
      </div>
    </form>
  );
};
