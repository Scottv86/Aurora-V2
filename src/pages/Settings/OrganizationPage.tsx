import { useState } from 'react';
import { 
  Building2, 
  Globe2, 
  Search, 
  Settings2,
  Building,
  Save
} from 'lucide-react';
import { Button } from '../../components/UI/Primitives';
import { usePlatform } from '../../hooks/usePlatform';
import { LicenseGate, LicenseRestrictedPlaceholder } from '../../components/Auth/LicenseGate';
import { GeneralSettings } from '../../components/Settings/Organization/GeneralSettings';
import { RegionalSettings } from '../../components/Settings/Organization/RegionalSettings';
import { MetadataSettings } from '../../components/Settings/Organization/MetadataSettings';
import { WorkspaceSettings } from '../../components/Settings/Organization/WorkspaceSettings';
import { SettingsSubNavLayout, SettingsSubNavItem } from '../../components/Settings/SettingsSubNavLayout';
import { PageLoader } from '../../components/UI/PageLoader';

export const OrganizationPage = () => {
  const { tenant, updateTenant, isLoading } = usePlatform();
  const [activeTab, setActiveTab] = useState('general');

  if (isLoading) {
    return <PageLoader label="Syncing Organisation..." fullscreen={false} className="min-h-[500px]" />;
  }

  const subNavItems: SettingsSubNavItem[] = [
    { 
      id: 'general', 
      label: 'General', 
      icon: Building2,
      description: 'Profile & identity' 
    },
    { 
      id: 'regional', 
      label: 'Localization', 
      icon: Globe2,
      description: 'Timezones & currency' 
    },
    { 
      id: 'metadata', 
      label: 'SEO & Social', 
      icon: Search,
      description: 'Meta tags & sharing' 
    },
    { 
      id: 'workspace', 
      label: 'Workspace', 
      icon: Settings2,
      description: 'Default layouts & home' 
    },
  ];

  return (
    <LicenseGate fallback={<div className="p-10"><LicenseRestrictedPlaceholder /></div>}>
      <SettingsSubNavLayout
        title="Organisation"
        description="Configure your organization's core identity, visual branding, and global system defaults."
        icon={Building}
        items={subNavItems}
        activeId={activeTab}
        onTabChange={setActiveTab}
        actions={
          <Button 
            type="submit" 
            form="org-settings-form"
            className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-500/20"
          >
            <Save size={18} />
            Save Changes
          </Button>
        }
      >
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
      </SettingsSubNavLayout>
    </LicenseGate>
  );
};
