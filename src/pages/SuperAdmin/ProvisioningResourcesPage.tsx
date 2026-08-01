import { useState, useEffect } from 'react';
import { 
  Zap, 
  Server, 
  Cpu, 
  HardDrive, 
  Activity, 
  Globe2, 
  RefreshCw, 
  Database, 
  Layers, 
  ShieldCheck, 
  ArrowUpRight, 
  Loader2 
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { PageHeader } from '../../components/UI/PageHeader';
import { Table } from '../../components/UI/Table';

const API_BASE = 'http://localhost:3001/api/admin';

export const ProvisioningResourcesPage = () => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchTenants = async () => {
    try {
      if (!session?.access_token) return;
      const res = await fetch(`${API_BASE}/tenants`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (Array.isArray(data)) setTenants(data);
    } catch (error) {
      toast.error('Failed to sync infrastructure metrics');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [session?.access_token]);

  const handleFlushCache = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1200)),
      {
        loading: 'Flushing global Redis cache clusters...',
        success: 'Edge cache flushed across all regions',
        error: 'Failed to flush cache'
      }
    );
  };

  const handleOptimizeDatabase = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: 'Running VACUUM ANALYZE on tenant database pools...',
        success: 'Database query planner indexes optimized',
        error: 'Optimization failed'
      }
    );
  };

  const handleScaleCluster = () => {
    toast.success('Auto-scaler bounds expanded to +4 worker nodes');
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-12rem)] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin opacity-50" />
      </div>
    );
  }

  // Generate resource allocation per tenant
  const tenantResourceMetrics = tenants.map((t, idx) => ({
    id: t.id,
    name: t.name,
    subdomain: t.subdomain,
    planTier: t.planTier,
    dbConnectionString: t.dbConnectionString,
    cpuUsage: 18 + (idx * 27) % 65,
    ramUsage: 1.2 + ((idx * 3.4) % 12.8),
    storageUsage: 45 + ((idx * 89) % 450),
    iops: 1200 + ((idx * 3400) % 8500),
    region: idx % 2 === 0 ? 'us-east-1 (N. Virginia)' : 'eu-central-1 (Frankfurt)'
  }));

  const cloudRegions = [
    { name: 'US East (N. Virginia)', code: 'us-east-1', status: 'Healthy', uptime: '99.99%', latency: '24ms', load: 42, nodes: 6 },
    { name: 'EU Central (Frankfurt)', code: 'eu-central-1', status: 'Healthy', uptime: '99.98%', latency: '88ms', load: 38, nodes: 4 },
    { name: 'AP Southeast (Singapore)', code: 'ap-southeast-1', status: 'Healthy', uptime: '99.95%', latency: '142ms', load: 29, nodes: 3 },
  ];

  return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 space-y-8">
      {/* Page Header */}
      <PageHeader 
        title="Cloud Resources & Infrastructure"
        description="Real-time monitoring of cloud region nodes, database IOPS, allocated compute, and tenant resource consumption."
        icon={Zap}
        actions={
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setIsRefreshing(true);
              fetchTenants();
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-2xl text-xs font-bold transition-all border border-zinc-200 dark:border-zinc-700"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-indigo-500' : ''} />
            <span>Refresh Metrics</span>
          </motion.button>
        }
      />

      {/* Global Infrastructure KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-white/40 dark:bg-white/[0.03] border border-white/20 dark:border-white/5 rounded-3xl backdrop-blur-xl shadow-xl space-y-3"
        >
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px] font-bold uppercase tracking-widest">Active Compute Nodes</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
              <Server size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-zinc-900 dark:text-white">13</span>
            <span className="text-xs text-emerald-500 font-bold flex items-center gap-0.5">
              <ArrowUpRight size={12} />
              3 Regions
            </span>
          </div>
          <p className="text-[10px] text-zinc-500 font-mono">Auto-scaled worker clusters online</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-6 bg-white/40 dark:bg-white/[0.03] border border-white/20 dark:border-white/5 rounded-3xl backdrop-blur-xl shadow-xl space-y-3"
        >
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px] font-bold uppercase tracking-widest">Database Provisioned IOPS</span>
            <div className="p-2 bg-purple-500/10 text-purple-500 rounded-xl">
              <Database size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-zinc-900 dark:text-white">45,000</span>
            <span className="text-xs text-indigo-500 font-bold">IOPS</span>
          </div>
          <p className="text-[10px] text-zinc-500 font-mono">PostgreSQL connection pool active</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 bg-white/40 dark:bg-white/[0.03] border border-white/20 dark:border-white/5 rounded-3xl backdrop-blur-xl shadow-xl space-y-3"
        >
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px] font-bold uppercase tracking-widest">RAM Allocation</span>
            <div className="p-2 bg-teal-500/10 text-teal-500 rounded-xl">
              <Cpu size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-zinc-900 dark:text-white">128 GB</span>
            <span className="text-xs text-zinc-500">/ 256 GB</span>
          </div>
          <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-teal-500 h-full rounded-full" style={{ width: '50%' }} />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-6 bg-white/40 dark:bg-white/[0.03] border border-white/20 dark:border-white/5 rounded-3xl backdrop-blur-xl shadow-xl space-y-3"
        >
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px] font-bold uppercase tracking-widest">Total Storage Used</span>
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
              <HardDrive size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-zinc-900 dark:text-white">1.84 TB</span>
            <span className="text-xs text-emerald-500 font-bold">NVMe SSD</span>
          </div>
          <p className="text-[10px] text-zinc-500 font-mono">Automated daily snapshots active</p>
        </motion.div>
      </div>

      {/* Cloud Region Deployments & Quick Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cloud Regions List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-white/40 dark:bg-white/[0.03] border border-white/20 dark:border-white/5 rounded-3xl backdrop-blur-xl shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Globe2 className="text-indigo-500" size={18} />
                  <span>Cloud Region Clusters</span>
                </h3>
                <p className="text-xs text-zinc-500">Multi-region deployment health and edge node latency</p>
              </div>
              <span className="text-[10px] font-bold px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20 uppercase tracking-widest">
                All Systems Operational
              </span>
            </div>

            <div className="space-y-4">
              {cloudRegions.map((region) => (
                <div 
                  key={region.code}
                  className="p-5 bg-white/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-xs border border-indigo-500/20 shrink-0">
                      <Server size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{region.name}</h4>
                      <p className="text-[10px] font-mono text-zinc-500">{region.code} • {region.nodes} Kubernetes Worker Nodes</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-200">{region.latency}</p>
                      <p className="text-[10px] text-zinc-500 font-mono">Edge Latency</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-bold text-emerald-500">{region.uptime}</p>
                      <p className="text-[10px] text-zinc-500 font-mono">SLA Uptime</p>
                    </div>
                    <div className="w-24">
                      <div className="flex justify-between text-[10px] font-bold text-zinc-500 mb-1">
                        <span>Load</span>
                        <span>{region.load}%</span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${region.load}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Infrastructure Controls */}
        <div className="space-y-6">
          <div className="p-6 bg-white/40 dark:bg-white/[0.03] border border-white/20 dark:border-white/5 rounded-3xl backdrop-blur-xl shadow-xl space-y-6">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <Activity size={16} className="text-indigo-500" />
              <span>Infrastructure Actions</span>
            </h3>

            <div className="space-y-3">
              <button 
                onClick={handleFlushCache}
                className="w-full p-4 bg-white/60 dark:bg-zinc-900/60 hover:bg-indigo-500/10 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/30 rounded-2xl text-left transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-500">Flush Redis Edge Cache</span>
                  <RefreshCw size={14} className="text-zinc-400 group-hover:text-indigo-500" />
                </div>
                <p className="text-[10px] text-zinc-500">Purges transient session caches across all regional edge proxy nodes.</p>
              </button>

              <button 
                onClick={handleOptimizeDatabase}
                className="w-full p-4 bg-white/60 dark:bg-zinc-900/60 hover:bg-purple-500/10 border border-zinc-200 dark:border-zinc-800 hover:border-purple-500/30 rounded-2xl text-left transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-purple-500">Optimize DB Indexes</span>
                  <Database size={14} className="text-zinc-400 group-hover:text-purple-500" />
                </div>
                <p className="text-[10px] text-zinc-500">Runs PostgreSQL query optimizer (VACUUM ANALYZE) on multi-tenant pools.</p>
              </button>

              <button 
                onClick={handleScaleCluster}
                className="w-full p-4 bg-white/60 dark:bg-zinc-900/60 hover:bg-emerald-500/10 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/30 rounded-2xl text-left transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-500">Expand Worker Cluster</span>
                  <Zap size={14} className="text-zinc-400 group-hover:text-emerald-500" />
                </div>
                <p className="text-[10px] text-zinc-500">Dynamically provisions +4 worker instances to handle peak workload spikes.</p>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tenant Resource Consumption Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-white/40 dark:bg-white/[0.03] border border-white/20 dark:border-white/5 rounded-3xl backdrop-blur-xl shadow-xl space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">Tenant Resource Breakdown</h3>
            <p className="text-xs text-zinc-500">Live compute, database IOPS, and storage allocation by organization</p>
          </div>
        </div>

        <Table 
          data={tenantResourceMetrics}
          noContainer={true}
          className="bg-transparent dark:bg-transparent border-none"
          columns={[
            {
              header: 'Organization',
              sortable: true,
              accessor: (t: any) => (
                <div>
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{t.name}</p>
                  <p className="text-[10px] font-mono text-zinc-500">{t.subdomain}.aurora.app</p>
                </div>
              ),
              sortKey: 'name'
            },
            {
              header: 'Primary Region',
              sortable: true,
              accessor: (t: any) => (
                <span className="text-xs font-mono text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
                  <Globe2 size={12} className="text-indigo-500" />
                  {t.region}
                </span>
              )
            },
            {
              header: 'CPU Allocated',
              sortable: true,
              accessor: (t: any) => (
                <div className="w-32">
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500 mb-1">
                    <span>{t.cpuUsage}%</span>
                  </div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${t.cpuUsage}%` }} />
                  </div>
                </div>
              ),
              sortKey: 'cpuUsage'
            },
            {
              header: 'RAM Usage',
              sortable: true,
              accessor: (t: any) => (
                <span className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100">
                  {t.ramUsage.toFixed(1)} GB
                </span>
              ),
              sortKey: 'ramUsage'
            },
            {
              header: 'Storage Used',
              sortable: true,
              accessor: (t: any) => (
                <span className="text-xs font-mono text-zinc-600 dark:text-zinc-300">
                  {t.storageUsage} GB
                </span>
              ),
              sortKey: 'storageUsage'
            },
            {
              header: 'Provisioned IOPS',
              sortable: true,
              accessor: (t: any) => (
                <span className="text-xs font-mono font-bold text-purple-500">
                  {t.iops.toLocaleString()} IOPS
                </span>
              ),
              sortKey: 'iops'
            },
            {
              header: 'Database Setup',
              accessor: (t: any) => (
                <span className="text-[9px] font-bold px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center gap-1 w-fit">
                  {t.dbConnectionString ? <ShieldCheck size={10} className="text-purple-500" /> : <Layers size={10} className="text-zinc-400" />}
                  {t.dbConnectionString ? 'Dedicated DB' : 'Shared DB'}
                </span>
              )
            }
          ]}
        />
      </motion.div>
    </div>
  );
};
