import { 
  Globe, 
  ChevronRight,
  Database,
  Workflow,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { usePlatform } from '../hooks/usePlatform';
import { useAuth } from '../hooks/useAuth';
import { PageWrapper, itemVariants } from './Common/PageWrapper';

export const Dashboard = () => {
  const { tenant, isLoading } = usePlatform();
  const { user, session, isSuperAdmin, loading } = useAuth();
  const navigate = useNavigate();

  // Forced Redirect Guard: SuperAdmins belong in the Admin Portal by default
  useEffect(() => {
    if (!loading && user && isSuperAdmin) {
      console.log('[Dashboard Guard] SuperAdmin detected on standard dashboard. Redirecting to portal...');
      navigate('/admin', { replace: true });
    }
  }, [user, isSuperAdmin, loading, navigate]);
  const [stats, setStats] = useState([
    { label: 'Active Cases', value: '0', icon: <Database size={20} />, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: 'Portal Submissions', value: '0', icon: <Globe size={20} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'AI Automations', value: '0', icon: <Cpu size={20} />, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'System Health', value: '99.9%', icon: <ShieldCheck size={20} />, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ]);


  useEffect(() => {
    if (!tenant?.id || !user) return;
    const tenantId = tenant.id;
    let socket: any = null;

    const fetchRecords = async () => {
      try {
        const token = session?.access_token;
        const res = await fetch('http://localhost:3001/api/data/records', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenantId
          }
        });
        if (res.ok) {
          const allCases = await res.json();
          updateStats(allCases);
        }
      } catch (err) {
        console.error('Failed to fetch records', err);
      }
    };

    const updateStats = (allCases: any[]) => {
      const activeCases = allCases.filter((c: any) => c.status !== 'Completed' && c.status !== 'Archived').length;
      const totalSubmissions = allCases.length;
      
      setStats(prev => [
        { ...prev[0], value: activeCases.toString() },
        { ...prev[1], value: totalSubmissions.toString() },
        { ...prev[2], value: (totalSubmissions * 0.8).toFixed(0) },
        prev[3]
      ]);
    };

    // Initial Fetch
    fetchRecords();

    // Setup Socket.IO for real-time updates
    if (session?.access_token) {
      const token = session.access_token;
      import('socket.io-client').then(({ io }) => {
        socket = io('http://localhost:3001', {
          auth: { token }
        });

        socket.on('connect', () => {
          socket.emit('join_tenant', tenantId);
        });

        // For simplicity in this demo we re-fetch all records on any record change, 
        // but normally we would incrementally patch the state.
        socket.on('record_added', fetchRecords);
        socket.on('record_updated', fetchRecords);
        socket.on('record_deleted', fetchRecords);
      });
    }

    return () => {
      if (socket) {
        socket.emit('leave_tenant', tenantId);
        socket.disconnect();
      }
    };
  }, [tenant?.id, user, session]);

  if (!tenant && !isLoading) {
    return (
      <PageWrapper className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-full text-zinc-300 dark:text-zinc-700">
          <Database size={48} />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">No Workspace Selected</h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-sm mt-2">
            You don't seem to be associated with a workspace. Please contact your administrator.
          </p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="flex flex-col w-full flex-1 min-h-full px-6 lg:px-12 pt-6 pb-10 space-y-8 relative">
      {/* Polymorphic Background Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] -ml-48 -mb-48 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            variants={itemVariants}
            className="p-6 bg-white/5 dark:bg-white/[0.03] backdrop-blur-xl border border-white/10 dark:border-white/5 rounded-3xl group shadow-2xl shadow-black/20 will-change-[transform,opacity] relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform relative z-10", stat.bg, stat.color)}>
              {stat.icon}
            </div>
            <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500 relative z-10">{stat.label}</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1 relative z-10">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <motion.div 
        variants={itemVariants} 
        className="p-8 bg-white/5 dark:bg-white/[0.03] backdrop-blur-2xl border border-white/10 dark:border-white/5 rounded-[2.5rem] shadow-2xl shadow-black/20 space-y-6 will-change-[transform,opacity] relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Workflow size={18} className="text-indigo-600 dark:text-indigo-400" />
            Active Workflows
          </h3>
            <Link to="/workspace/queue" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 flex items-center gap-1">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          <div className="space-y-4">
            {[
              { name: 'Customer Onboarding', status: 'Running', health: 'Healthy', items: 42 },
              { name: 'Invoice Approval', status: 'Running', health: 'Healthy', items: 128 },
              { name: 'Support Triage', status: 'Paused', health: 'Warning', items: 15 },
            ].map((wf, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shadow-sm dark:shadow-none">
                    <Workflow size={20} className="text-zinc-400 dark:text-zinc-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">{wf.name}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{wf.items} items in queue</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Status</p>
                    <p className={cn("text-xs font-medium", wf.status === 'Running' ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>{wf.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Health</p>
                    <p className={cn("text-xs font-medium", wf.health === 'Healthy' ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600 dark:text-rose-400")}>{wf.health}</p>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </motion.div>
    </PageWrapper>
  );
};
