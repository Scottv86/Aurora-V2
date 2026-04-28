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
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-indigo-600" />
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


