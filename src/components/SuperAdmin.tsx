import { 
  ShieldCheck, 
  Globe, 
  Layers, 
  Activity, 
  Plus, 
  MoreVertical,
  Search,
  X,
  Loader2,
  Cpu,
  Zap,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';

const API_BASE = 'http://localhost:3001/api/admin';

// HUD Status Ticker Items
const STATUS_TICKER = [
  { label: 'Registry Sync', value: '100%', status: 'nominal' },
  { label: 'Platform Engine', value: 'v2.6.4', status: 'nominal' },
  { label: 'Cloud Gateway', value: '4ms latency', status: 'nominal' },
  { label: 'AI Swarm', value: '12 active', status: 'nominal' }
];



export const SuperAdmin = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [tenants, setTenants] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [usageTrend, setUsageTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    subdomain: '',
    adminEmail: '',
    plan: 'standard'
  });

  const { session } = useAuth();

  const fetchData = async () => {
    try {
      if (!session?.access_token) return;

      const headers = { 
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json' 
      };

      const [tenantsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/tenants`, { headers }),
        fetch(`${API_BASE}/stats`, { headers })
      ]);
      
      const tenantsData = await tenantsRes.json();
      const statsData = await statsRes.json();
      
      if (Array.isArray(tenantsData)) {
        setTenants(tenantsData);
      } else {
        console.warn('Tenants registry index is not an array:', tenantsData);
        setTenants([]);
        if (tenantsData.error) toast.error(tenantsData.error);
      }

      if (statsData && !statsData.error) {
        setStats(statsData);
        if (statsData.usageTrend) {
          setUsageTrend(statsData.usageTrend);
        }
      }
    } catch (error) {
      toast.error('Platform Sync Failed');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/tenants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Provisioning failed');
      toast.success('New Registry Instance Spawned');
      setIsProvisioning(false);
      setFormData({ name: '', subdomain: '', adminEmail: '', plan: 'standard' });
      fetchData();
    } catch (error) {
      toast.error('Provisioning Collision Detected');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-12rem)] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin opacity-50" />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* 🚀 Platform HUD (Heads-Up Display) Header */}
      <div className="relative">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pointer-events-auto">
          <div className="flex items-center gap-6">
            <motion.div 
              initial={{ rotate: -20, scale: 0.8, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              className="p-4 bg-indigo-600 rounded-3xl shadow-2xl shadow-indigo-500/40 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50" />
              <ShieldCheck size={32} className="text-white relative z-10" />
            </motion.div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Platform Control</h1>
                <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-500 uppercase rounded-md flex items-center gap-1.5 shadow-[0_0_15px_-5px_rgba(16,185,129,0.5)]">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-zinc-500 dark:text-zinc-500 mt-1 font-mono text-xs tracking-tighter">Root Registry Node: aurora-primary-alpha</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* HUD Stats Ticker */}
            <div className="hidden lg:flex items-center gap-8 px-6 py-2.5 bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl backdrop-blur-xl">
              {STATUS_TICKER.map((item, i) => (
                <div key={i} className="flex flex-col group cursor-default">
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">{item.label}</span>
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 font-mono">{item.value}</span>
                </div>
              ))}
            </div>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsProvisioning(true)}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/30 group relative overflow-hidden"
            >
              <Plus size={16} />
              <span>Provision Instance</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* 📊 Global Registry Metrics (Mission Control View) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Resource Heatmap Chart */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 p-8 bg-white/70 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] backdrop-blur-xl relative overflow-hidden group shadow-sm dark:shadow-none"
        >
          <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
            <Cpu size={120} />
          </div>
          <div className="relative z-10 flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
                <TrendingUp size={20} className="text-indigo-500" />
                Network Compute Usage
              </h3>
              <p className="text-sm text-zinc-500 mt-1 italic">Real-time token distribution across the swarm.</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={usageTrend}>
                <defs>
                  <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis dataKey="time" stroke="#71717a" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '12px', border: '1px solid #e4e4e7', fontSize: '12px' }}
                  itemStyle={{ color: '#6366f1' }}
                />
                <Area type="monotone" dataKey="usage" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#usageGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Rapid Stat Cards */}
        <div className="grid grid-cols-1 gap-6">
          {[
            { label: 'Active Tenancies', value: stats?.overview?.totalTenants || '0', icon: Globe, color: 'text-indigo-500 dark:text-indigo-400', bg: 'bg-indigo-500/10', sub: 'Nodes globally synced' },
            { label: 'Registry Health', value: stats?.overview?.platformHealth || '100%', icon: Zap, color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-500/10', sub: 'Engine core latency 2ms' },
            { label: 'Registry Events', value: '412', icon: Activity, color: 'text-purple-500 dark:text-purple-400', bg: 'bg-purple-500/10', sub: 'Last 24h operational log' },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-6 bg-white/70 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] flex flex-col justify-between group hover:border-indigo-500/50 transition-all shadow-sm dark:shadow-none backdrop-blur-sm"
            >
              <div className="flex justify-between items-start">
                <div className={cn("p-3 rounded-2xl shadow-sm transition-transform group-hover:scale-110", stat.bg, stat.color)}>
                  <stat.icon size={20} />
                </div>
                <div className="text-right">
                   <p className="text-2xl font-bold text-zinc-900 dark:text-white">{stat.value}</p>
                   <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest mt-1">{stat.label}</p>
                </div>
              </div>
              <p className="text-[10px] text-zinc-500 mt-4 flex items-center gap-2">
                <div className="w-1 h-1 bg-zinc-500 rounded-full animate-ping" />
                {stat.sub}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 📡 Platform Instance Matrix (Refined Registry) */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 bg-white/70 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-sm dark:shadow-none backdrop-blur-xl relative"
      >
        <div className="flex items-center justify-between mb-8 px-2">
          <div>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">Active Tenant Registry</h3>
            <p className="text-zinc-500 text-sm italic mt-1 font-mono tracking-tighter">Querying database registry cluster: zoqnvkg... supabase</p>
          </div>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search registry indices..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-50/50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-12 pr-6 py-2.5 text-sm text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-indigo-500/50 w-72 shadow-inner group-hover:border-zinc-300 dark:group-hover:border-zinc-700 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <th className="pb-6 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] px-4">Instance Entity</th>
                <th className="pb-6 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] px-4">Access Layer</th>
                <th className="pb-6 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] px-4">Cloud Status</th>
                <th className="pb-6 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] px-4">Isolation</th>
                <th className="pb-6 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] px-4 text-right">Ops</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
              <AnimatePresence mode='popLayout'>
                {tenants
                  .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.subdomain.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((tenant, idx) => (
                  <motion.tr 
                    key={tenant.id} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group hover:bg-zinc-50 dark:hover:bg-indigo-500/[0.03] transition-colors"
                  >
                    <td className="py-5 px-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shadow-sm overflow-hidden relative">
                           {tenant.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{tenant.name}</p>
                          <p className="text-[10px] font-mono text-zinc-500 flex items-center gap-1.5 uppercase tracking-widest mt-0.5">
                            {tenant.subdomain}.aurora.app
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-4">
                      <div className="flex flex-col gap-1">
                        <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider w-fit inline-flex items-center gap-1.5 shadow-sm", 
                          tenant.planTier === 'enterprise' ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20" :
                          tenant.planTier === 'growth' ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20" :
                          "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                        )}>
                          <Zap size={10} />
                          {tenant.planTier}
                        </span>
                      </div>
                    </td>
                    <td className="py-5 px-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-2 h-2 rounded-full", 
                          tenant.status === 'active' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)] animate-pulse" : "bg-rose-500"
                        )} />
                        <div>
                          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-200 capitalize">{tenant.status}</p>
                          <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Stable</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-4">
                      <div className="flex items-center gap-2">
                        {tenant.dbConnectionString ? <ShieldCheck size={14} className="text-purple-500" /> : <Layers size={14} className="text-zinc-400" />}
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">
                          {tenant.dbConnectionString ? 'DEDICATED_CELL' : 'LOGICAL_SLICE'}
                        </span>
                      </div>
                    </td>
                    <td className="py-5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-1 group-hover:translate-x-0">
                        <button 
                          onClick={() => navigate(`/admin/tenants/${tenant.id}`)}
                          className="p-2 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                           <ChevronRight size={18} />
                        </button>
                        <button className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* 🔮 Registry Provisioning Modal (Adaptive Theme Style) */}
      <AnimatePresence>
        {isProvisioning && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/40 dark:bg-zinc-950/80 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/40">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg">
                    <Plus size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Provision Registry Node</h3>
                    <p className="text-xs text-zinc-500 font-mono tracking-tighter">Initializing new tenanted cloud infrastructure...</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsProvisioning(false)}
                  className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleProvision} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] pl-1">Entity Descriptor</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. Stark Industries"
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] pl-1">Grid Subdomain</label>
                    <input 
                      required
                      type="text" 
                      placeholder="stark-net"
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                      value={formData.subdomain}
                      onChange={e => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] pl-1">Root Admin Protocol</label>
                  <input 
                    required
                    type="email" 
                    placeholder="admin@stark.id"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    value={formData.adminEmail}
                    onChange={e => setFormData({ ...formData, adminEmail: e.target.value })}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] pl-1">Priority Layer (Tier)</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['standard', 'growth', 'enterprise'].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setFormData({ ...formData, plan: p })}
                        className={cn(
                          "py-3 rounded-xl text-[10px] font-bold border uppercase tracking-widest transition-all",
                          formData.plan === p 
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20" 
                            : "bg-zinc-50 dark:bg-zinc-950 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-4">
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-indigo-600 text-white text-sm font-bold rounded-2xl uppercase tracking-[0.1em] hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Zap size={18} fill="white" />
                        <span>Execute Provisioning</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
