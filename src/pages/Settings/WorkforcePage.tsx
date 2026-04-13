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
import { LayoutGrid, Users, ShieldCheck, Search, Filter, Plus, Zap, Network, Shield, Activity, TrendingUp, UserCheck, Bot, BarChart3, Target } from 'lucide-react';
import { useCapabilities } from '../../hooks/useCapabilities';
import { Button, cn } from '../../components/UI/Primitives';
import { useUsers } from '../../hooks/useUsers';
import { useTeams } from '../../hooks/useTeams';
import { usePositions } from '../../hooks/usePositions';
import { usePermissionGroups } from '../../hooks/usePermissionGroups';
import { LicenseGate, LicenseRestrictedPlaceholder } from '../../components/Auth/LicenseGate';

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
  
  // Data for Pulse Stats
  const { members } = useUsers();
  const { teams } = useTeams();
  const { positions } = usePositions();
  const { groups } = usePermissionGroups();

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
        <div className="flex min-h-full flex-col @container bg-zinc-50/30 dark:bg-zinc-950/30">
          {/* Header */}
          <div className="flex flex-col border-b border-zinc-200 bg-white/50 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/50">
            <div className="flex flex-col gap-6 px-10 pt-10 pb-6">
              {/* Row 1: Title & Primary Action */}
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.25em] text-blue-600 dark:text-blue-400">
                    <Zap size={12} className="fill-current" /> Overview
                  </div>
                  <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                    Workforce
                  </h1>
                </div>
              </div>
            </div>
    
            {/* Row 2: Description */}
            <div className="px-10 pb-10">
              <p className="max-w-3xl text-sm font-medium leading-relaxed text-zinc-500">
                Manage your team of people and AI agents in one place. 
                Organize teams, define roles, and control access permissions.
              </p>
            </div>
    
            {/* Row 3: Tabs (Full Width) */}
            <div className="px-10">
              <Tabs 
                tabs={tabs} 
                activeTab={activeTab} 
                onChange={(id) => { setActiveTab(id); setActiveFilter('all'); }} 
                className="border-none" 
              />
            </div>
          </div>
    
          {/* Pulse Stats Section */}
          <div className="px-10 pt-8">
            <PulseSection 
              activeTab={activeTab} 
              members={members} 
              teams={teams}
              positions={positions}
              groups={groups}
            />
          </div>
    
          {/* Utility Bar */}
          <div className="flex items-center justify-between px-10 py-4 mt-4 bg-zinc-50/50 dark:bg-zinc-900/10 border-b border-zinc-200/50 dark:border-zinc-800/50">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-600 transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Search resource name, licence or ID..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-80 rounded-2xl border border-zinc-200 bg-white/80 pl-10 pr-4 text-xs font-bold outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm"
                />
              </div>
              
              <div className="relative">
                <button 
                  onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                  className={`flex h-10 items-center gap-2 px-4 rounded-2xl border transition-all active:scale-95 shadow-sm text-[10px] font-bold uppercase tracking-widest ${
                    activeFilter !== 'all' 
                    ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10' 
                    : 'border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900'
                  }`}
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
                    <div className="absolute left-0 top-12 z-50 w-56 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95 duration-200 dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="mb-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        Filter by Status & Type
                      </div>
                      {filterOptions.map(option => (
                        <button
                          key={option.id}
                          onClick={() => {
                            setActiveFilter(option.id);
                            setIsFilterMenuOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                            activeFilter === option.id
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10'
                            : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800'
                          }`}
                        >
                          {option.label}
                          {activeFilter === option.id && <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
    
            <div className="flex items-center gap-6">
              {action && (
                <Button 
                  variant="primary" 
                  size="sm"
                  className="gap-2 shadow-lg shadow-blue-500/20 px-6 font-bold"
                  onClick={action.onClick}
                >
                  <action.icon size={16} /> {action.label}
                </Button>
              )}
            </div>
          </div>
    
          {/* Content */}
          <div className="flex-1 px-10 py-10">
            <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-2 duration-700">
              {activeTab === 'directory' && (
                <PeopleCenter searchQuery={searchQuery} activeFilter={activeFilter} />
              )}
              {activeTab === 'teams' && (
                <TeamHub 
                  onCreateTeam={() => setIsTeamModalOpen(true)} 
                  searchQuery={searchQuery} 
                  activeFilter={activeFilter}
                />
              )}
              {activeTab === 'roles' && (
                <OrgDesign 
                  isModalOpen={isRoleModalOpen} 
                  onCloseModal={() => setIsRoleModalOpen(false)} 
                  searchQuery={searchQuery}
                  activeFilter={activeFilter}
                />
              )}
              {activeTab === 'groups' && (
                <SecurityGroups 
                  isModalOpen={isGroupModalOpen} 
                  onCloseModal={() => setIsGroupModalOpen(false)} 
                  searchQuery={searchQuery}
                  activeFilter={activeFilter}
                />
              )}
              {activeTab === 'visualizer' && <OrgVisualizer />}
              {activeTab === 'audit' && (
                <ActivityLog 
                  refreshTrigger={refreshTrigger} 
                  searchQuery={searchQuery} 
                  activeFilter={activeFilter}
                />
              )}
            </div>
          </div>
    
    
          {/* Modal */}
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
// --- Pulse Stats Components ---

const PulseSection = ({ activeTab, members, teams, positions, groups }: any) => {
  let stats = [];

  switch (activeTab) {
    case 'directory':
      const humanCount = members.filter((m: any) => !m.isSynthetic).length;
      const agentCount = members.filter((m: any) => m.isSynthetic).length;
      const activeRate = members.length > 0 
        ? Math.round((members.filter((m: any) => m.status === 'Active').length / members.length) * 100)
        : 0;

      stats = [
        { label: 'Total Members', value: members.length, icon: Users, color: 'blue' },
        { label: 'People', value: humanCount, icon: UserCheck, color: 'zinc' },
        { label: 'AI Agents', value: agentCount, icon: Bot, color: 'purple' },
        { label: 'Active Rate', value: `${activeRate}%`, icon: TrendingUp, color: 'green' },
      ];
      break;
    case 'teams':
      const totalHumans = teams.reduce((acc: number, t: any) => acc + t.memberCount, 0);
      const totalAgents = teams.reduce((acc: number, t: any) => acc + t.agentCount, 0);
      const avgSize = teams.length > 0 ? Math.round((totalHumans + totalAgents) / teams.length) : 0;

      stats = [
        { label: 'Total Teams', value: teams.length, icon: Network, color: 'blue' },
        { label: 'People Capacity', value: totalHumans, icon: Users, color: 'zinc' },
        { label: 'Agent Capacity', value: totalAgents, icon: Bot, color: 'purple' },
        { label: 'Avg. Team Size', value: avgSize, icon: BarChart3, color: 'orange' },
      ];
      break;
    case 'roles':
      const filledCount = positions.filter((p: any) => p.occupantCount > 0).length;
      const openCount = positions.filter((p: any) => p.occupantCount === 0).length;
      const depth = positions.length > 0 ? Math.round((filledCount / positions.length) * 100) : 0;

      stats = [
        { label: 'Total Roles', value: positions.length, icon: Shield, color: 'blue' },
        { label: 'Filled Roles', value: filledCount, icon: Target, color: 'green' },
        { label: 'Open Roles', value: openCount, icon: Plus, color: 'orange' },
        { label: 'Role Fill Rate', value: `${depth}%`, icon: TrendingUp, color: 'purple' },
      ];
      break;
    case 'groups':
      const systemGroups = groups.filter((g: any) => !g.parentGroupId).length;
      const customGroups = groups.filter((g: any) => g.parentGroupId).length;
      const totalPerms = groups.reduce((acc: number, g: any) => acc + (g.capabilities?.length || 0), 0);

      stats = [
        { label: 'Total Groups', value: groups.length, icon: ShieldCheck, color: 'blue' },
        { label: 'System Groups', value: systemGroups, icon: Shield, color: 'zinc' },
        { label: 'Custom Groups', value: customGroups, icon: Plus, color: 'orange' },
        { label: 'Permissions', value: totalPerms, icon: Target, color: 'purple' },
      ];
      break;
    default:
      return null;
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-top-4 duration-1000">
      {stats.map((stat, idx) => (
        <StatCard key={idx} {...stat} delay={idx * 100} />
      ))}
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color, delay }: any) => {
  const colorMap: any = {
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400 border-blue-100 dark:border-blue-500/20',
    zinc: 'text-zinc-600 bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-100 dark:border-zinc-800',
    purple: 'text-purple-600 bg-purple-50 dark:bg-purple-500/10 dark:text-purple-400 border-purple-100 dark:border-purple-500/20',
    green: 'text-green-600 bg-green-50 dark:bg-green-500/10 dark:text-green-400 border-green-100 dark:border-green-500/20',
    orange: 'text-orange-600 bg-orange-50 dark:bg-orange-500/10 dark:text-orange-400 border-orange-100 dark:border-orange-500/20',
  };

  return (
    <div 
      style={{ animationDelay: `${delay}ms` }}
      className="group flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5 dark:border-zinc-800 dark:bg-zinc-900 animate-in fade-in fill-mode-both"
    >
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 transition-colors group-hover:text-zinc-500">
          {label}
        </p>
        <p className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
          {value}
        </p>
      </div>
      <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl border transition-all group-hover:scale-110", colorMap[color])}>
        <Icon size={24} />
      </div>
    </div>
  );
};


