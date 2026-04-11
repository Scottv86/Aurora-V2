import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUsers, TenantMember } from '../../../hooks/useUsers';
import { Table } from '../../UI/Table';
import { Badge, Button } from '../../UI/Primitives';
import { User, Bot, Mail, Shield, Users, Clock, Plus, Zap } from 'lucide-react';

interface DirectoryAppletProps {
  onInviteHuman: () => void;
  onProvisionAgent: () => void;
}

export const DirectoryApplet = ({ onInviteHuman, onProvisionAgent }: DirectoryAppletProps) => {
  const navigate = useNavigate();
  const { members, loading } = useUsers();
  const [filter, setFilter] = useState<'all' | 'human' | 'synthetic'>('all');

  const filteredMembers = members.filter(m => {
    if (filter === 'human') return !m.isSynthetic;
    if (filter === 'synthetic') return m.isSynthetic;
    return true;
  });

  const columns = [
    {
      header: 'Identity',
      accessor: (m: TenantMember) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            {m.isSynthetic ? <Bot size={20} className="text-blue-600" /> : <User size={20} className="text-zinc-600" />}
          </div>
          <div>
            <div className="font-semibold text-zinc-900 dark:text-zinc-100">{m.name}</div>
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              <Mail size={12} /> {m.email}
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'Role',
      accessor: (m: TenantMember) => (
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-zinc-400" />
          <Badge variant={m.role === 'Admin' ? 'blue' : m.role === 'Lead' ? 'purple' : 'zinc'}>
            {m.role}
          </Badge>
        </div>
      )
    },
    {
      header: 'Team',
      accessor: (m: TenantMember) => (
        <div className="flex items-center gap-2">
          <Users size={14} className="text-zinc-400" />
          <span className="text-zinc-600 dark:text-zinc-400">{m.team}</span>
        </div>
      )
    },
    {
      header: 'Status',
      accessor: (m: TenantMember) => (
        <Badge variant={m.status === 'Active' ? 'green' : m.status === 'Pending' ? 'orange' : 'zinc'}>
          {m.status}
        </Badge>
      )
    },
    {
      header: 'Type',
      accessor: (m: TenantMember) => (
        <div className="flex items-center gap-2">
           {m.isSynthetic ? (
             <div className="flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-tight text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
               <Zap size={10} /> Digital Coworker
             </div>
           ) : (
             <div className="flex items-center gap-1.5 rounded-md bg-zinc-50 px-2 py-1 text-[10px] font-bold uppercase tracking-tight text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
               <User size={10} /> Human
             </div>
           )}
        </div>
      )
    },
    {
      header: 'Last Active',
      accessor: (m: TenantMember) => (
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Clock size={12} /> {m.lastActive}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${filter === 'all' ? 'bg-white shadow text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            All Members
          </button>
          <button
            onClick={() => setFilter('human')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${filter === 'human' ? 'bg-white shadow text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            Humans
          </button>
          <button
            onClick={() => setFilter('synthetic')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${filter === 'synthetic' ? 'bg-white shadow text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            Digital Coworkers
          </button>
        </div>

        <div className="flex items-center gap-3">
           <Button variant="secondary" onClick={onInviteHuman} className="gap-2">
             <Plus size={16} /> Invite Human
           </Button>
           <Button variant="primary" onClick={onProvisionAgent} className="gap-2">
             <Zap size={16} /> Provision Agent
           </Button>
        </div>
      </div>

      <Table 
        data={filteredMembers} 
        columns={columns} 
        loading={loading}
        onRowClick={(m) => navigate(`/dashboard/settings/users/${m.id}`)}
      />
    </div>
  );
};
