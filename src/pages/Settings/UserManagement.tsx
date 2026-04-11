import React, { useState } from 'react';
import { Tabs } from '../../components/UI/TabsAndModal';
import { DirectoryApplet } from '../../components/Settings/UserManagement/DirectoryApplet';
import { TeamsApplet } from '../../components/Settings/UserManagement/TeamsApplet';
import { PositionsApplet } from '../../components/Settings/UserManagement/PositionsApplet';
import { OrgChartApplet } from '../../components/Settings/UserManagement/OrgChartApplet';
import { AuditLogsApplet } from '../../components/Settings/UserManagement/AuditLogsApplet';
import { InviteProvisionModal } from '../../components/Settings/UserManagement/InviteProvisionModal';
import { CreateTeamModal } from '../../components/Settings/UserManagement/CreateTeamModal';
import { Users, LayoutGrid, ShieldCheck, Search, Filter } from 'lucide-react';

export const UserManagementPage = () => {
  const [activeTab, setActiveTab] = useState('directory');
  const [modalMode, setModalMode] = useState<{ open: boolean; type: 'human' | 'agent' }>({
    open: false,
    type: 'human'
  });
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  const tabs = [
    { id: 'directory', label: 'Directory' },
    { id: 'teams', label: 'Teams' },
    { id: 'positions', label: 'Positions' },
    { id: 'org-chart', label: 'Org Chart' },
    { id: 'audit', label: 'Audit Logs' }
  ];

  return (
    <div className="flex min-h-full flex-col @container">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-zinc-200 bg-white/80 px-8 py-6 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Staff Management
          </h1>
          <p className="text-zinc-500">
            Orchestrate your hybrid workforce of human experts and autonomous digital coworkers.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
          
          <div className="flex items-center gap-2">
            <div className="relative hidden @[800px]:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input 
                type="text" 
                placeholder="Search resources..." 
                className="h-9 w-64 rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-zinc-900"
              />
            </div>
            <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <Filter size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="mx-auto max-w-7xl">
          {activeTab === 'directory' && (
            <DirectoryApplet 
              onInviteHuman={() => setModalMode({ open: true, type: 'human' })}
              onProvisionAgent={() => setModalMode({ open: true, type: 'agent' })}
            />
          )}
          {activeTab === 'teams' && <TeamsApplet onCreateTeam={() => setIsTeamModalOpen(true)} />}
          {activeTab === 'positions' && <PositionsApplet />}
          {activeTab === 'org-chart' && <OrgChartApplet />}
          {activeTab === 'audit' && <AuditLogsApplet />}
        </div>
      </div>

      {/* Modal */}
      <InviteProvisionModal 
        isOpen={modalMode.open}
        onClose={() => setModalMode(prev => ({ ...prev, open: false }))}
        type={modalMode.type}
      />
      
      <CreateTeamModal 
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
      />
    </div>
  );
};
