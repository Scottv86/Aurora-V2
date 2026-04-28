import { useState } from 'react';
import { Tabs } from '../../components/UI/TabsAndModal';
import { 
  Network, 
  Globe, 
  ExternalLink
} from 'lucide-react';
import { LicenseGate, LicenseRestrictedPlaceholder } from '../../components/Auth/LicenseGate';
import { ComingSoon } from '../../components/Common/ComingSoon';
import { PageHeader } from '../../components/UI/PageHeader';

export const SitesPage = () => {
  const [activeTab, setActiveTab] = useState('internal');

  const tabs = [
    { id: 'internal', label: 'Internal Hub', icon: Network },
    { id: 'external', label: 'External Portals', icon: Globe },
  ];

  return (
    <LicenseGate fallback={<div className="p-10"><LicenseRestrictedPlaceholder /></div>}>
      <div className="flex flex-col w-full px-6 lg:px-12 py-10">
        <PageHeader 
          title="Sites"
          description="Manage your organization's internal communication hubs and public-facing portals. Configure access controls, branding, and content delivery for all digital touchpoints."
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

        {/* Content Area */}
        <div className="flex-1">
          <div className="py-10 animate-in fade-in slide-in-from-bottom-2 duration-700">
            {activeTab === 'internal' && (
              <div className="space-y-6">
                <ComingSoon 
                  title="Intranet Hub" 
                  description="Internal corporate communication portal, employee directory, and centralized resource center." 
                />
              </div>
            )}
            {activeTab === 'external' && (
              <div className="space-y-6">
                <div className="flex justify-end px-4 mb-4">
                  <a 
                    href="/portal" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors"
                  >
                    View Public Portal <ExternalLink size={14} />
                  </a>
                </div>
                <ComingSoon 
                  title="Portal Management" 
                  description="Configure public-facing submission forms, tracking portals, and landing pages for external stakeholders." 
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </LicenseGate>
  );
};
