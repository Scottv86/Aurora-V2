import { useState } from 'react';
import { Tabs } from '../../components/UI/TabsAndModal';
import { 
  Building2, 
  Palette, 
  Globe2, 
  Search, 
  Settings2, 
  Zap
} from 'lucide-react';
import { usePlatform } from '../../hooks/usePlatform';
import { LicenseGate, LicenseRestrictedPlaceholder } from '../../components/Auth/LicenseGate';
import { GeneralSettings } from '../../components/Settings/Organization/GeneralSettings';
import { BrandingSettings } from '../../components/Settings/Organization/BrandingSettings';
import { RegionalSettings } from '../../components/Settings/Organization/RegionalSettings';
import { MetadataSettings } from '../../components/Settings/Organization/MetadataSettings';
import { WorkspaceSettings } from '../../components/Settings/Organization/WorkspaceSettings';

export const OrganizationPage = () => {
  const { tenant, updateTenant, isLoading } = usePlatform();
  const [activeTab, setActiveTab] = useState('general');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-indigo-600" />
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Building2 },
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'regional', label: 'Localization', icon: Globe2 },
    { id: 'metadata', label: 'SEO & Social', icon: Search },
    { id: 'workspace', label: 'Workspace', icon: Settings2 },
  ];

  return (
    <LicenseGate fallback={<div className="p-10"><LicenseRestrictedPlaceholder /></div>}>
      <div className="flex min-h-full flex-col @container bg-zinc-50/30 dark:bg-zinc-950/30">
        {/* Header */}
        <div className="flex flex-col border-b border-zinc-200 bg-white/50 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/50">
          <div className="mx-auto max-w-7xl w-full">
            <div className="flex flex-col gap-6 px-10 pt-10 pb-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.25em] text-indigo-600 dark:text-indigo-400">
                    <Zap size={12} className="fill-current" /> System Configuration
                  </div>
                  <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                    Organisation
                  </h1>
                </div>
              </div>
            </div>

            <div className="px-10 pb-10">
              <p className="max-w-3xl text-sm font-medium leading-relaxed text-zinc-500">
                Configure your organization's core identity, visual branding, and global system defaults. 
                These settings apply to all members and workspaces within your tenancy.
              </p>
            </div>

            <div className="px-10">
              <Tabs 
                tabs={tabs} 
                activeTab={activeTab} 
                onChange={setActiveTab} 
                className="border-none" 
              />
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 px-10 py-10">
          <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-2 duration-700">
            {activeTab === 'general' && (
              <GeneralSettings tenant={tenant} onUpdate={updateTenant} />
            )}
            {activeTab === 'branding' && (
              <BrandingSettings tenant={tenant} onUpdate={updateTenant} />
            )}
            {activeTab === 'regional' && (
              <RegionalSettings tenant={tenant} onUpdate={updateTenant} />
            )}
            {activeTab === 'metadata' && (
              <MetadataSettings tenant={tenant} onUpdate={updateTenant} />
            )}
            {activeTab === 'workspace' && (
              <WorkspaceSettings tenant={tenant} onUpdate={updateTenant} />
            )}
          </div>
        </div>
      </div>
    </LicenseGate>
  );
};
