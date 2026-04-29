import React, { useState, useEffect, useCallback } from 'react';
import { Table } from '../../UI/Table';
import { Shield, Clock, Info, ShieldCheck, UserCog, Database, Search } from 'lucide-react';
import { Badge, Button } from '../../UI/Primitives';
import { useAuth } from '../../../hooks/useAuth';
import { usePlatform } from '../../../hooks/usePlatform';
import { API_BASE_URL } from '../../../config';
import { formatDistanceToNow } from 'date-fns';

interface ActivityLogProps {
  refreshTrigger?: number;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  activeFilter?: string;
}

export const ActivityLog = ({ refreshTrigger, searchQuery = '', onSearchChange, activeFilter = 'all' }: ActivityLogProps) => {
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/audit`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'x-tenant-id': tenant.id
        }
      });
      if (!res.ok) throw new Error('Failed to fetch logs');
      const data = await res.json();
      setLogs(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, session?.access_token]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs, refreshTrigger]);

  const getActionSummary = (action: string) => {
    const parts = action.split('_');
    const verb = parts[1] === 'CREATE' ? 'Created' : 
                 parts[1] === 'UPDATE' ? 'Updated' : 
                 parts[1] === 'DELETE' ? 'Removed' :
                 parts[1] === 'INVITE' ? 'Invited' :
                 parts[1] === 'PROVISION' ? 'Hired' : 'Modified';
    
    const subject = parts[0] === 'MEMBER' ? 'Staff Member' :
                    parts[0] === 'TEAM' ? 'Team' :
                    parts[0] === 'ROLE' ? 'Role' :
                    parts[0] === 'GROUP' ? 'Group' : 'System Resource';

    return `${verb} a ${subject}`;
  };

  const getActionIcon = (action: string) => {
    if (action.includes('GROUP')) return <ShieldCheck size={16} className="text-blue-500" />;
    if (action.includes('MEMBER')) return <UserCog size={16} className="text-purple-500" />;
    return <Database size={16} className="text-zinc-500" />;
  };

  const columns = [
    {
      header: 'Action',
      accessor: (l: any) => (
        <div className="flex items-center gap-3 py-1">
           <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 ring-1 ring-zinc-900/5">
             {getActionIcon(l.action)}
           </div>
           <div className="flex flex-col">
             <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
               {getActionSummary(l.action)}
             </span>
             <span className="text-[10px] text-zinc-400 font-mono tracking-tighter uppercase">
               {l.action.replace('_', ' ')} • {l.resourceId.substring(0, 8)}
             </span>
           </div>
        </div>
      )
    },
    {
      header: 'User',
      accessor: (l: any) => (
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
            {l.actorId.substring(0, 8)}
          </span>
        </div>
      )
    },
    {
      header: 'Status',
      accessor: (l: any) => (
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-wider dark:bg-green-500/10 dark:text-green-400">
          <ShieldCheck size={10} /> Success
        </div>
      )
    },
    {
      header: 'Time',
      accessor: (l: any) => (
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
           <Clock size={12} /> 
           {formatDistanceToNow(new Date(l.timestamp), { addSuffix: true })}
        </div>
      )
    }
  ];

  const query = searchQuery.toLowerCase();
  const filteredLogs = logs.filter(l => {
    // Phase 1: Contextual Filters
    let matchesFilter = true;
    if (activeFilter.startsWith('action:')) {
      const actionType = activeFilter.split(':')[1];
      matchesFilter = l.action.startsWith(actionType);
    }

    // Phase 2: Search Query
    if (!query) return matchesFilter;
    if (!matchesFilter) return false;

    const summary = getActionSummary(l.action).toLowerCase();
    const actionKey = l.action.toLowerCase();
    const resourceId = l.resourceId.toLowerCase();
    return summary.includes(query) || actionKey.includes(query) || resourceId.includes(query);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-200 border-t-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] border border-white/20 dark:border-white/5 p-6 lg:p-8 shadow-2xl overflow-hidden">
        <div className="relative max-w-md mb-8 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-600 transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="Search activity logs..." 
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="h-11 w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 pl-10 pr-4 text-xs font-bold outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-white/5 dark:backdrop-blur-md shadow-sm"
          />
        </div>

        {filteredLogs.length > 0 ? (
          <Table 
            data={filteredLogs} 
            columns={columns} 
            pagination={true} 
            pageSize={20}
            className="bg-transparent dark:bg-transparent border-none shadow-none"
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <Database className="text-zinc-200 dark:text-zinc-800 mb-4" size={48} />
            <p className="text-lg font-bold text-zinc-400 dark:text-zinc-600">No activity recorded</p>
            <p className="text-sm text-zinc-400 dark:text-zinc-500">Activity logs will appear here as members perform actions.</p>
          </div>
        )}
      </div>
    </div>
  );
};

