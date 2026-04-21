import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Users, 
  Cpu,
  Zap
} from 'lucide-react';
import { Tabs } from '../../../components/UI/TabsAndModal';
import { PageHeader } from '../../../components/UI/PageHeader';

interface ModuleItem {
  id: string;
  name: string;
  slug: string;
  icon: React.ElementType;
  isCore: boolean;
  description: string;
}

const PLATFORM_MODULES: ModuleItem[] = [
  {
    id: 'people-organisations',
    name: 'People & Organisations',
    slug: 'people-organisations',
    icon: Users,
    isCore: true,
    description: 'Manage core entity taxonomies and global relationship rules.'
  }
];

export const PlatformModulesSettings = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = PLATFORM_MODULES.map(m => ({
    id: m.slug,
    label: m.name,
    icon: m.icon
  }));

  const activeTab = PLATFORM_MODULES.find(m => location.pathname.includes(m.slug))?.slug || tabs[0].id;

  const handleTabChange = (id: string) => {
    navigate(`/workspace/settings/platform-modules/${id}`);
  };

  return (
    <div className="flex min-h-full flex-col @container">
      <PageHeader 
        title="Platform Modules"
        description="Configure global modules that define the core data structures and governance rules across all tenant workspaces. These settings establish the foundational architecture for your platform ecosystem."
        tabs={
          <Tabs 
            tabs={tabs} 
            activeTab={activeTab} 
            onChange={handleTabChange} 
            className="border-none"
            firstTabPadding={false}
          />
        }
      />

      {/* Content Area */}
      <div className="flex-1">
        <div className="mx-auto max-w-7xl px-10 py-10 animate-in fade-in slide-in-from-bottom-2 duration-700">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

