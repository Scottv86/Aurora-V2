import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SettingsSubNavLayout, SettingsSubNavItem } from '../../components/Settings/SettingsSubNavLayout';
import { PeopleCenter } from '../../components/Settings/Workforce/PeopleCenter';
import { TeamHub } from '../../components/Settings/Workforce/TeamHub';
import { OrgDesign } from '../../components/Settings/Workforce/OrgDesign';
import { OrgVisualizer } from '../../components/Settings/Workforce/OrgVisualizer';
import { SecurityGroups } from '../../components/Settings/Workforce/SecurityGroups';
import { ActivityLog } from '../../components/Settings/Workforce/ActivityLog';
import { OnboardingWizard } from '../../components/Settings/Workforce/OnboardingWizard';
import { CreateTeamModal } from '../../components/Settings/Workforce/CreateTeamModal';
import { LayoutGrid, Users, ShieldCheck, Filter, Plus, Network, Shield, Activity, Bot, Sparkles } from 'lucide-react';
import { useCapabilities } from '../../hooks/useCapabilities';
import { Button } from '../../components/UI/Primitives';
import { LicenseGate, LicenseRestrictedPlaceholder } from '../../components/Auth/LicenseGate';
import { AgentBuilderStudio } from '../../components/Builders/AgentBuilder/AgentBuilderStudio';
import { cn } from '../../lib/utils';

export const WorkforcePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam && ['people', 'agents', 'teams', 'positions', 'groups', 'visualizer', 'audit'].includes(tabParam) ? tabParam : 'people');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['people', 'agents', 'teams', 'positions', 'groups', 'visualizer', 'audit'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);
  
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [onboardingType, setOnboardingType] = useState<'human' | 'agent' | undefined>(undefined);
  const [isAgentStudioOpen, setIsAgentStudioOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { hasCapability } = useCapabilities();
  
  const subNavItems: SettingsSubNavItem[] = [
    { id: 'people', label: 'People', icon: Users, description: 'Workspace members' },
    { id: 'agents', label: 'Digital Coworkers', icon: Bot, description: 'AI agents' },
    { id: 'teams', label: 'Teams & Squads', icon: Network, description: 'Organizational units' },
    { id: 'positions', label: 'Positions & Roles', icon: Shield, description: 'Job title hierarchy' },
    ...(hasCapability('view:settings') ? [{ id: 'groups', label: 'Security Groups', icon: ShieldCheck, description: 'Access permissions' }] : []),
    { id: 'visualizer', label: 'Org Visualizer', icon: LayoutGrid, description: 'Interactive org tree' },
    ...(hasCapability('view:audit_logs') ? [{ id: 'audit', label: 'Activity Log', icon: Activity, description: 'Audit trail' }] : [])
  ];

  const getFilterOptions = () => {
    switch (activeTab) {
      case 'people':
      case 'agents':
        return [
          { id: 'all', label: 'All' },
          { id: 'status:Active', label: 'Active Only' },
          { id: 'status:Pending', label: 'Open Slots' }
        ];
      case 'positions':
        return [
          { id: 'all', label: 'All Positions' },
          { id: 'filled', label: 'Filled Positions' },
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
      case 'people':
        return { label: 'Add Person', icon: Plus, onClick: () => { setOnboardingType('human'); setIsOnboardingOpen(true); } };
      case 'agents':
        return { label: 'Add Agent', icon: Plus, onClick: () => { setOnboardingType('agent'); setIsOnboardingOpen(true); } };
      case 'teams':
        return { label: 'Create Team', icon: Plus, onClick: () => setIsTeamModalOpen(true) };
      case 'positions':
        return { label: 'Create Position', icon: Plus, onClick: () => setIsPositionModalOpen(true) };
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
      <SettingsSubNavLayout
        title="Workforce Management"
        description="Organize workspace members, teams, positions, and control access permissions."
        icon={Users}
        items={subNavItems}
        activeId={activeTab}
        onTabChange={(id) => { 
          setActiveTab(id); 
          setActiveFilter('all'); 
          setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (id === 'people') {
              next.delete('tab');
            } else {
              next.set('tab', id);
            }
            return next;
          });
        }}
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

            {activeTab === 'agents' ? (
              <div className="flex items-center gap-2">
                <Button 
                  variant="secondary" 
                  size="sm"
                  className="gap-1.5 px-4 font-bold h-9 border-zinc-200 dark:border-zinc-700"
                  onClick={() => { setOnboardingType('agent'); setIsOnboardingOpen(true); }}
                >
                  <Plus size={14} /> Quick Provision
                </Button>
                <Button 
                  variant="primary" 
                  size="sm"
                  className="gap-2 shadow-lg shadow-indigo-500/20 px-5 font-bold h-9 bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => setIsAgentStudioOpen(true)}
                >
                  <Sparkles size={15} /> Agent Studio
                </Button>
              </div>
            ) : action && (
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
      >
        <div className="w-full">
          {activeTab === 'people' && (
            <PeopleCenter 
              mode="people"
              searchQuery={searchQuery} 
              onSearchChange={setSearchQuery}
              activeFilter={activeFilter} 
              onPrimaryAction={() => {
                setOnboardingType('human');
                setIsOnboardingOpen(true);
              }}
            />
          )}
          {activeTab === 'agents' && (
            <PeopleCenter 
              mode="agents"
              searchQuery={searchQuery} 
              onSearchChange={setSearchQuery}
              activeFilter={activeFilter} 
              onPrimaryAction={() => {
                setOnboardingType('agent');
                setIsOnboardingOpen(true);
              }}
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
          {activeTab === 'positions' && (
            <OrgDesign 
              isModalOpen={isPositionModalOpen} 
              onCloseModal={() => setIsPositionModalOpen(false)} 
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              activeFilter={activeFilter}
              onAddPosition={() => setIsPositionModalOpen(true)}
            />
          )}
          {activeTab === 'groups' && (
            <SecurityGroups 
              isModalOpen={isGroupModalOpen} 
              onCloseModal={() => setIsGroupModalOpen(false)} 
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              activeFilter={activeFilter}
              onAddGroup={() => setIsGroupModalOpen(true)}
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
          defaultType={onboardingType}
        />
        
        <CreateTeamModal 
          isOpen={isTeamModalOpen}
          onClose={() => setIsTeamModalOpen(false)}
        />

        {isAgentStudioOpen && (
          <AgentBuilderStudio 
            onClose={() => setIsAgentStudioOpen(false)}
            onDeploySuccess={() => {
              setIsAgentStudioOpen(false);
              setRefreshTrigger(t => t + 1);
            }}
          />
        )}
      </SettingsSubNavLayout>
    </LicenseGate>
  );
};
