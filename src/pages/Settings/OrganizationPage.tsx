import { useState } from 'react';
import { Tabs } from '../../components/UI/TabsAndModal';
import { 
  Building2, 
  Globe2, 
  Search, 
  Settings2
} from 'lucide-react';
import { usePlatform } from '../../hooks/usePlatform';
import { LicenseGate, LicenseRestrictedPlaceholder } from '../../components/Auth/LicenseGate';
import { GeneralSettings } from '../../components/Settings/Organization/GeneralSettings';
import { RegionalSettings } from '../../components/Settings/Organization/RegionalSettings';
import { MetadataSettings } from '../../components/Settings/Organization/MetadataSettings';
import { WorkspaceSettings } from '../../components/Settings/Organization/WorkspaceSettings';

import { PageHeader } from '../../components/UI/PageHeader';

export const OrganizationPage = () => {
  const { tenant, updateTenant, isLoading } = usePlatform();
  const [activeTab, setActiveTab] = useState('general');

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="p-8 rounded-[2rem] bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200/20 border-t-indigo-600" />
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] animate-pulse">Syncing Organisation</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Building2 },
    { id: 'regional', label: 'Localization', icon: Globe2 },
    { id: 'metadata', label: 'SEO & Social', icon: Search },
    { id: 'workspace', label: 'Workspace', icon: Settings2 },
  ];

  return (
    <LicenseGate fallback={<div className="p-10"><LicenseRestrictedPlaceholder /></div>}>
      <div className="flex flex-col w-full px-6 lg:px-12 py-10">
        <PageHeader 
          title="Organisation"
          description="Configure your organization's core identity, visual branding, and global system defaults. These settings apply to all members and workspaces within your tenancy."
          tabs={
            <Tabs 
              tabs={tabs} 
              activeTab={activeTab} 
              onChange={setActiveTab} 
              className="border-none"
              firstTabPadding={false}
            />
          }
        />

        <div>
              {activeTab === 'general' && (
                <GeneralSettings tenant={tenant} onUpdate={updateTenant} />
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
    </LicenseGate>
  );
};


