import { useState, useEffect } from 'react';
import { Database, HardDrive, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Table } from '../../components/UI/Table';
import { useAuth } from '../../hooks/useAuth';
import { PageHeader } from '../../components/UI/PageHeader';

export const StorageManagementPage = () => {
  const { session } = useAuth();
  const [storageData, setStorageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStorage = async () => {
      try {
        if (!session?.access_token) return;
        const res = await fetch('http://localhost:3001/api/admin/storage', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await res.json();
        setStorageData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStorage();
  }, [session?.access_token]);

  if (loading) {
    return (
      <div className="h-[calc(100vh-12rem)] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin opacity-50" />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 space-y-8">
      <PageHeader 
        title="Storage Management"
        description="Database disk utilization, media asset allocations, and vector store indices across tenants."
        icon={Database}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-white/40 dark:bg-white/[0.03] border border-white/20 dark:border-white/5 rounded-3xl backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total Postgres Allocation</span>
            <Database size={20} className="text-indigo-500" />
          </div>
          <p className="text-3xl font-extrabold text-zinc-900 dark:text-white font-mono">{storageData?.totalDbStorageGb || 128} GB</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="p-6 bg-white/40 dark:bg-white/[0.03] border border-white/20 dark:border-white/5 rounded-3xl backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Media & Blob Assets</span>
            <HardDrive size={20} className="text-purple-500" />
          </div>
          <p className="text-3xl font-extrabold text-zinc-900 dark:text-white font-mono">{storageData?.totalFileStorageGb || 512} GB</p>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-white/40 dark:bg-white/[0.03] border border-white/20 dark:border-white/5 rounded-3xl backdrop-blur-xl shadow-xl"
      >
        <Table 
          data={storageData?.tenantStorage || []}
          noContainer={true}
          className="bg-transparent dark:bg-transparent border-none"
          columns={[
            {
              header: 'Tenant Name',
              sortable: true,
              accessor: (item: any) => (
                <span className="text-sm font-bold text-zinc-900 dark:text-white">{item.name}</span>
              ),
              sortKey: 'name'
            },
            {
              header: 'Database Usage',
              sortable: true,
              accessor: (item: any) => (
                <span className="text-xs font-mono font-bold text-indigo-500">{item.dbUsedMb} MB</span>
              ),
              sortKey: 'dbUsedMb'
            },
            {
              header: 'File Storage',
              sortable: true,
              accessor: (item: any) => (
                <span className="text-xs font-mono font-bold text-purple-500">{item.fileStorageMb} MB</span>
              ),
              sortKey: 'fileStorageMb'
            },
            {
              header: 'Vector Index Count',
              sortable: true,
              accessor: (item: any) => (
                <span className="text-xs font-mono text-zinc-400">{item.vectorIndexes} Indexes</span>
              ),
              sortKey: 'vectorIndexes'
            }
          ]}
        />
      </motion.div>
    </div>
  );
};
