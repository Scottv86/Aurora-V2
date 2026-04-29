import { useState } from 'react';
import { Tabs } from '../../components/UI/TabsAndModal';
import { PeopleCenter } from '../../components/Settings/Workforce/PeopleCenter';
import { TeamHub } from '../../components/Settings/Workforce/TeamHub';
import { OrgDesign } from '../../components/Settings/Workforce/OrgDesign';
import { OrgVisualizer } from '../../components/Settings/Workforce/OrgVisualizer';
import { SecurityGroups } from '../../components/Settings/Workforce/SecurityGroups';
import { ActivityLog } from '../../components/Settings/Workforce/ActivityLog';
import { OnboardingWizard } from '../../components/Settings/Workforce/OnboardingWizard';
import { CreateTeamModal } from '../../components/Settings/Workforce/CreateTeamModal';
import { LayoutGrid, Users, ShieldCheck, Search, Filter, Plus, Network, Shield, Activity } from 'lucide-react';
import { useCapabilities } from '../../hooks/useCapabilities';
import { Button } from '../../components/UI/Primitives';
import { LicenseGate, LicenseRestrictedPlaceholder } from '../../components/Auth/LicenseGate';
import { cn } from '../../lib/utils';

import { PageHeader } from '../../components/UI/PageHeader';

export const WorkforcePage = () => {
  const [activeTab, setActiveTab] = useState('directory');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { hasCapability } = useCapabilities();
  
  const tabs = [
    { id: 'directory', label: 'People', icon: Users },
    { id: 'teams', label: 'Teams', icon: Network },
    { id: 'roles', label: 'Roles', icon: Shield },
    ...(hasCapability('view:settings') ? [{ id: 'groups', label: 'Security Groups', icon: ShieldCheck }] : []),
    { id: 'visualizer', label: 'Org Visualizer', icon: LayoutGrid },
    ...(hasCapability('view:audit_logs') ? [{ id: 'audit', label: 'Activity Log', icon: Activity }] : [])
  ];

  const getFilterOptions = () => {
    switch (activeTab) {
      case 'directory':
        return [
          { id: 'all', label: 'All' },
          { id: 'human', label: 'People' },
          { id: 'synthetic', label: 'AI Agents' },
          { id: 'status:Active', label: 'Active Only' },
          { id: 'status:Pending', label: 'Open Slots' }
        ];
      case 'roles':
        return [
          { id: 'all', label: 'All Roles' },
          { id: 'filled', label: 'Filled Roles' },
          { id: 'open', label: 'Open Slots' }
        ];
      case 'audit':
        return [
          { id: 'all', label: 'All Events' },
          { id: 'action:MEMBER', label: 'Personnel Events' },
          { id: 'action:TEAM', label: 'Structure Events' }
        ];
      default:
        return [{ id: 'all', label: 'No Filters Available' }];
    }
  };

  const getPrimaryAction = () => {
    switch (activeTab) {
      case 'directory':
        return { label: 'Add Person', icon: Plus, onClick: () => setIsOnboardingOpen(true) };
      case 'teams':
        return { label: 'Create Team', icon: Plus, onClick: () => setIsTeamModalOpen(true) };
      case 'roles':
        return { label: 'Create Role', icon: Plus, onClick: () => setIsRoleModalOpen(true) };
      case 'groups':
        return { label: 'Create Group', icon: Shield, onClick: () => setIsGroupModalOpen(true) };
      case 'audit':
        return { label: 'Refresh Activity', icon: Activity, onClick: () => setRefreshTrigger(t => t + 1) };
      default:
        return null;
    }
  };

  const action = getPrimaryAction();
  const filterOptions = getFilterOptions();

  return (
    <LicenseGate fallback={<div className="p-10"><LicenseRestrictedPlaceholder /></div>}>
      <div className="flex flex-col w-full px-6 lg:px-12 py-10">
        <PageHeader 
        title="Workforce"
        description="Manage your team of people and AI agents in one place. Organize teams, define roles, and control access permissions."
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <button 
                onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                className={cn(
                  "flex h-9 items-center gap-2 px-4 rounded-xl border transition-all active:scale-95 shadow-sm text-[10px] font-bold uppercase tracking-widest",
                  activeFilter !== 'all' 
                    ? "border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10" 
                    : "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-white/5 dark:backdrop-blur-md"
                )}
              >
                <Filter size={14} /> 
                {activeFilter === 'all' ? 'Filter' : filterOptions.find(o => o.id === activeFilter)?.label || 'Filtered'}
              </button>

              {isFilterMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsFilterMenuOpen(false)} 
                  />
                  <div className="absolute right-0 top-11 z-50 w-56 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95 duration-200 dark:border-zinc-800 dark:bg-zinc-900/60 dark:backdrop-blur-xl">
                    <div className="mb-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                      Filter by Status & Type
                    </div>
                    {filterOptions.map(option => (
                      <button
                        key={option.id}
                        onClick={() => {
                          setActiveFilter(option.id);
                          setIsFilterMenuOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-colors",
                          activeFilter === option.id
                            ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10"
                            : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        )}
                      >
                        {option.label}
                        {activeFilter === option.id && <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {action && (
              <Button 
                variant="primary" 
                size="sm"
                className="gap-2 shadow-lg shadow-blue-500/20 px-6 font-bold h-9"
                onClick={action.onClick}
              >
                <action.icon size={16} /> {action.label}
              </Button>
            )}
          </div>
        }
        tabs={
          <Tabs 
            tabs={tabs} 
            activeTab={activeTab} 
            onChange={(id) => { setActiveTab(id); setActiveFilter('all'); }} 
            className="border-none"
            firstTabPadding={false}
          />
        }
      />


      {/* Content */}
      <div>
              {activeTab === 'directory' && (
                <PeopleCenter 
                  searchQuery={searchQuery} 
                  onSearchChange={setSearchQuery}
                  activeFilter={activeFilter} 
                />
              )}
              {activeTab === 'teams' && (
                <TeamHub 
                  onCreateTeam={() => setIsTeamModalOpen(true)} 
                  searchQuery={searchQuery} 
                  onSearchChange={setSearchQuery}
                  activeFilter={activeFilter}
                />
              )}
              {activeTab === 'roles' && (
                <OrgDesign 
                  isModalOpen={isRoleModalOpen} 
                  onCloseModal={() => setIsRoleModalOpen(false)} 
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  activeFilter={activeFilter}
                />
              )}
              {activeTab === 'groups' && (
                <SecurityGroups 
                  isModalOpen={isGroupModalOpen} 
                  onCloseModal={() => setIsGroupModalOpen(false)} 
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  activeFilter={activeFilter}
                />
              )}
              {activeTab === 'visualizer' && <OrgVisualizer />}
              {activeTab === 'audit' && (
                <ActivityLog 
                  refreshTrigger={refreshTrigger} 
                  searchQuery={searchQuery} 
                  onSearchChange={setSearchQuery}
                  activeFilter={activeFilter}
                />
              )}
            </div>
          <OnboardingWizard 
            isOpen={isOnboardingOpen}
            onClose={() => setIsOnboardingOpen(false)}
          />
          
          <CreateTeamModal 
            isOpen={isTeamModalOpen}
            onClose={() => setIsTeamModalOpen(false)}
          />
      </div>
    </LicenseGate>
  );
};



