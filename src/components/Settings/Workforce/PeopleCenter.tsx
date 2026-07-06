import { useNavigate } from 'react-router-dom';
import { useUsers, TenantMember } from '../../../hooks/useUsers';
import { Table } from '../../UI/Table';
import { Badge, cn, Button } from '../../UI/Primitives';
import { User, Bot, Mail, Users, Clock, Zap, Briefcase, FileBadge, Search, Plus } from 'lucide-react';

interface PeopleCenterProps {
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  activeFilter?: string;
  mode?: 'people' | 'agents' | 'all';
  onPrimaryAction?: () => void;
}

export const PeopleCenter = ({ 
  searchQuery = '', 
  onSearchChange, 
  activeFilter = 'all', 
  mode = 'all',
  onPrimaryAction 
}: PeopleCenterProps) => {
  const navigate = useNavigate();
  const { members, loading } = useUsers();
  const filteredMembers = members.filter(m => {
    // Phase 0: Mode Filter
    let matchesMode = true;
    if (mode === 'people') matchesMode = !m.isSynthetic;
    else if (mode === 'agents') matchesMode = m.isSynthetic;

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
                          (m.licenceType && m.licenceType.toLowerCase().includes(query)) ||
                          m.team.toLowerCase().includes(query) ||
                          (m.position && m.position.toLowerCase().includes(query));

    return matchesMode && matchesFilter && matchesSearch;
  });

  const columns = [
    {
      header: 'Name',
      accessor: (m: TenantMember) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-white/5 transition-colors group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 overflow-hidden">
            {m.avatarUrl ? (
              <img src={m.avatarUrl} alt={m.name} className="h-full w-full object-cover" />
            ) : (
              m.isSynthetic ? <Bot size={20} className="text-blue-600" /> : <User size={20} className="text-zinc-600" />
            )}
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
      header: 'Licence',
      accessor: (m: TenantMember) => (
        <div className="flex items-center gap-2">
          <FileBadge size={14} className="text-zinc-400" />
          <Badge className={cn(
            "font-black border-none text-[10px]",
            m.licenceType === 'Developer' ? "text-indigo-500 bg-indigo-500/10" : "text-zinc-500 bg-zinc-500/10"
          )}>
            {m.licenceType || 'Standard'}
          </Badge>
        </div>
      )
    },
    {
      header: 'Team',
      accessor: (m: TenantMember) => (
        <div className="flex items-center gap-2">
          <Users size={14} className="text-zinc-400" />
          <span className="text-zinc-600 dark:text-zinc-400 font-medium">{m.team}</span>
        </div>
      )
    },
    {
      header: 'Position',
      accessor: (m: TenantMember) => (
        <div className="flex items-center gap-2">
          <Briefcase size={14} className="text-zinc-400" />
          <span className="text-zinc-600 dark:text-zinc-400">{m.position || 'Unassigned'}</span>
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
    ...(mode === 'all' ? [{
      header: 'Type',
      accessor: (m: TenantMember) => (
        <div className="flex items-center gap-2">
           {m.isSynthetic ? (
             <div className="flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-tight text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 ring-1 ring-blue-700/10">
               <Zap size={10} /> AI Agent
             </div>
           ) : (
             <div className="flex items-center gap-1.5 rounded-md bg-zinc-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-tight text-zinc-600 dark:bg-white/10 dark:text-zinc-400 ring-1 ring-zinc-900/5">
               <User size={10} /> Person
             </div>
           )}
        </div>
      )
    }] : []),
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
      <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] border border-white/20 dark:border-white/5 p-6 lg:p-8 shadow-2xl overflow-hidden">
        <div className="relative max-w-md mb-8 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-600 transition-colors" size={16} />
          <input 
            type="text" 
            placeholder={
              mode === 'people' 
                ? "Search people, positions or teams..." 
                : mode === 'agents'
                  ? "Search agents, positions or teams..."
                  : "Search people, agents, positions or teams..."
            }
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="h-11 w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 pl-10 pr-4 text-xs font-bold outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-white/5 dark:backdrop-blur-md shadow-sm"
          />
        </div>

        {filteredMembers.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white/50 dark:bg-zinc-900/40 dark:backdrop-blur-xl border border-dashed border-zinc-200 dark:border-zinc-800 rounded-[3rem] space-y-6 shadow-sm">
             <div className="h-20 w-20 rounded-[2rem] bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-lg shadow-blue-500/5">
                {mode === 'agents' ? <Bot size={40} /> : <User size={40} />}
             </div>
             <div className="space-y-2 max-w-md">
                <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
                  {searchQuery 
                    ? (mode === 'agents' ? 'No Matching Agents' : 'No Matching People') 
                    : (mode === 'agents' ? 'No AI Agents Provisioned' : 'No People Found')
                  }
                </h3>
                <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                  {searchQuery 
                    ? `No digital coworkers or staff members matched "${searchQuery}". Try adjusting your keywords or active filters.`
                    : (mode === 'agents' 
                      ? 'Provision a digital coworker to handle repetitive work, conduct deep analysis, or execute automated tasks 24/7.'
                      : 'Invite team members to collaborate, assign positions, and organize department structures.'
                    )
                  }
                </p>
             </div>
             {onPrimaryAction && !searchQuery && (
                <Button variant="primary" size="sm" onClick={onPrimaryAction} className="gap-2 font-bold px-6">
                  <Plus size={14} /> {mode === 'agents' ? 'Provision AI Agent' : 'Add Person'}
                </Button>
             )}
             {searchQuery && (
                <Button variant="secondary" size="sm" onClick={() => onSearchChange?.('')} className="gap-2 font-bold px-6">
                  Reset Search Query
                </Button>
             )}
          </div>
        ) : (
          <Table 
            data={filteredMembers} 
            columns={columns} 
            loading={loading}
            pagination={true}
            onRowClick={(m) => navigate(`/workspace/settings/workforce/member/${m.id}`)}
            className="bg-transparent dark:bg-transparent border-none shadow-none"
          />
        )}
      </div>
    </div>
  );
};

