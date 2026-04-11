import React from 'react';
import { Table } from '../../UI/Table';
import { Shield, Clock, Info } from 'lucide-react';
import { Badge } from '../../UI/Primitives';

const MOCK_LOGS = [
  { id: 'l1', event: 'User Invited', actor: 'sarah.c@aurora.ai', target: 'mark.v@internal', status: 'Success', timestamp: '5m ago' },
  { id: 'l2', event: 'Agent Provisioned', actor: 'sarah.c@aurora.ai', target: 'A-1 Sweeper', status: 'Success', timestamp: '12m ago' },
  { id: 'l3', event: 'Security Policy Change', actor: 'james.w@aurora.ai', target: 'RBAC Policy v2', status: 'Warning', timestamp: '1h ago' },
  { id: 'l4', event: 'Login attempt denied', actor: 'Unknown', target: 'Admin API', status: 'Denied', timestamp: '2h ago' },
  { id: 'l5', event: 'Team Deleted', actor: 'sarah.c@aurora.ai', target: 'Legacy Support', status: 'Success', timestamp: '1d ago' },
];

export const AuditLogsApplet = () => {
  const columns = [
    {
      header: 'Event',
      accessor: (l: any) => (
        <div className="flex items-center gap-3">
           <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
             <Info size={16} className="text-zinc-500" />
           </div>
           <span className="font-medium text-zinc-900 dark:text-zinc-100">{l.event}</span>
        </div>
      )
    },
    {
      header: 'Actor',
      accessor: 'actor',
      className: 'text-zinc-500'
    },
    {
      header: 'Target',
      accessor: 'target',
      className: 'font-mono text-xs text-zinc-600 dark:text-zinc-400'
    },
    {
      header: 'Status',
      accessor: (l: any) => (
        <Badge variant={l.status === 'Success' ? 'green' : l.status === 'Warning' ? 'orange' : 'red'}>
          {l.status}
        </Badge>
      )
    },
    {
      header: 'Timestamp',
      accessor: (l: any) => (
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
           <Clock size={12} /> {l.timestamp}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-blue-600" />
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Audit Trail</h3>
        </div>
      </div>
      <Table data={MOCK_LOGS} columns={columns} />
    </div>
  );
};
