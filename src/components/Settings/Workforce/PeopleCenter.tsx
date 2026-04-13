import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUsers, TenantMember } from '../../../hooks/useUsers';
import { Table } from '../../UI/Table';
import { Badge, Button } from '../../UI/Primitives';
import { User, Bot, Mail, Shield, Users, Clock, Plus, Zap, Briefcase } from 'lucide-react';
import { CapabilityGate } from '../../Auth/CapabilityGate';

interface PeopleCenterProps {
  searchQuery?: string;
  activeFilter?: string;
}

export const PeopleCenter = ({ searchQuery = '', activeFilter = 'all' }: PeopleCenterProps) => {
  const navigate = useNavigate();
  const { members, loading } = useUsers();
  const filteredMembers = members.filter(m => {
    // Phase 1: Contextual Filters
    let matchesFilter = true;
    if (activeFilter === 'human') matchesFilter = !m.isSynthetic;
    if (activeFilter === 'synthetic') matchesFilter = m.isSynthetic;
    if (activeFilter.startsWith('status:')) {
      const status = activeFilter.split(':')[1];
      matchesFilter = m.status === status;
    }
    
    // Phase 2: Search Query
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query || 
                          m.name.toLowerCase().includes(query) || 
                          m.email.toLowerCase().includes(query) || 
                          m.role.toLowerCase().includes(query) || 
                          m.team.toLowerCase().includes(query) ||
                          (m.position && m.position.toLowerCase().includes(query));

    return matchesFilter && matchesSearch;
  });

  const columns = [
    {
      header: 'Identity',
      accessor: (m: TenantMember) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 transition-colors group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20">
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
      header: 'Strategic Role',
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
      header: 'Team Hub',
      accessor: (m: TenantMember) => (
        <div className="flex items-center gap-2">
          <Users size={14} className="text-zinc-400" />
          <span className="text-zinc-600 dark:text-zinc-400 font-medium">{m.team}</span>
        </div>
      )
    },
    {
      header: 'Position Slotted',
      accessor: (m: TenantMember) => (
        <div className="flex items-center gap-2">
          <Briefcase size={14} className="text-zinc-400" />
          <span className="text-zinc-600 dark:text-zinc-400">{m.position || 'Unassigned'}</span>
        </div>
      )
    },
    {
      header: 'Availability',
      accessor: (m: TenantMember) => (
        <Badge variant={m.status === 'Active' ? 'green' : m.status === 'Pending' ? 'orange' : 'zinc'}>
          {m.status}
        </Badge>
      )
    },
    {
      header: 'Workforce Type',
      accessor: (m: TenantMember) => (
        <div className="flex items-center gap-2">
           {m.isSynthetic ? (
             <div className="flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-tight text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 ring-1 ring-blue-700/10">
               <Zap size={10} /> Digital Coworker
             </div>
           ) : (
             <div className="flex items-center gap-1.5 rounded-md bg-zinc-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-tight text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 ring-1 ring-zinc-900/5">
               <User size={10} /> Human Expert
             </div>
           )}
        </div>
      )
    },
    {
      header: 'Last Pulse',
      accessor: (m: TenantMember) => (
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Clock size={12} /> {m.lastActive}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden dark:border-zinc-800 dark:bg-zinc-950">
        <Table 
          data={filteredMembers} 
          columns={columns} 
          loading={loading}
          pagination={true}
          onRowClick={(m) => navigate(`/dashboard/settings/workforce/member/${m.id}`)}
        />
      </div>
    </div>
  );
};

