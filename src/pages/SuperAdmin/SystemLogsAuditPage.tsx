import { useState, useEffect } from 'react';
import { FileText, Search, Loader2, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { Table } from '../../components/UI/Table';
import { useAuth } from '../../hooks/useAuth';
import { PageHeader } from '../../components/UI/PageHeader';

export const SystemLogsAuditPage = () => {
  const { session } = useAuth();
  const [logsData, setLogsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        if (!session?.access_token) return;
        const res = await fetch('http://localhost:3001/api/admin/logs', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await res.json();
        setLogsData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [session?.access_token]);

  if (loading) {
    return (
      <div className="h-[calc(100vh-12rem)] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin opacity-50" />
      </div>
    );
  }

  const auditLogs = logsData?.auditLogs || [];
  const filteredAudit = auditLogs.filter((log: any) => 
    log.action.toLowerCase().includes(searchQuery.toLowerCase()) || 
    log.actorId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.tenant?.name && log.tenant.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 space-y-8">
      <PageHeader 
        title="System Logs & Audit"
        description="Centralized platform execution log, actor audit history, and security event traces."
        icon={FileText}
        actions={
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input 
              type="text" 
              placeholder="Search audit logs..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/40 dark:bg-white/[0.02] border border-zinc-250/20 dark:border-white/5 rounded-2xl pl-11 pr-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-indigo-500/50 w-72 backdrop-blur-xl"
            />
          </div>
        }
      />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-white/40 dark:bg-white/[0.03] border border-white/20 dark:border-white/5 rounded-3xl backdrop-blur-xl shadow-xl"
      >
        <Table 
          data={filteredAudit}
          noContainer={true}
          className="bg-transparent dark:bg-transparent border-none"
          columns={[
            {
              header: 'Action / Event',
              sortable: true,
              accessor: (log: any) => (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-xs">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white">{log.action}</p>
                    <p className="text-[9px] font-mono text-zinc-500">Resource: {log.resourceId}</p>
                  </div>
                </div>
              ),
              sortKey: 'action'
            },
            {
              header: 'Tenant',
              sortable: true,
              accessor: (log: any) => (
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  {log.tenant?.name || 'Global Registry'}
                </span>
              )
            },
            {
              header: 'Actor ID',
              sortable: true,
              accessor: (log: any) => (
                <span className="text-xs font-mono text-zinc-400">
                  {log.actorId}
                </span>
              ),
              sortKey: 'actorId'
            },
            {
              header: 'Timestamp',
              sortable: true,
              className: 'text-right',
              accessor: (log: any) => (
                <span className="text-xs font-mono text-zinc-500">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              ),
              sortKey: 'timestamp'
            }
          ]}
          emptyMessage="No audit logs recorded."
        />
      </motion.div>
    </div>
  );
};
