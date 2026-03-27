import { 
  ShieldCheck, 
  Users, 
  Globe, 
  Layers, 
  BarChart3, 
  Activity, 
  Settings, 
  Plus, 
  MoreVertical,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

export const SuperAdmin = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tenantsRef = collection(db, 'tenants');
    const q = query(tenantsRef, orderBy('name', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tenantsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      setTenants(tenantsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tenants');
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20">
            <ShieldCheck size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Platform Control Plane</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">Super Admin governance and tenant management.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20">
          <Plus size={18} />
          <span>Provision Tenant</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Tenants', value: '142', icon: Globe, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Platform Health', value: '99.98%', icon: Activity, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Monthly Revenue', value: '$242,500', icon: BarChart3, color: 'text-amber-600 dark:text-amber-400' },
        ].map((stat, i) => (
          <div key={i} className="p-6 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800", stat.color)}>
                <stat.icon size={20} />
              </div>
            </div>
            <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="p-6 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Active Tenants</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input 
              type="text" 
              placeholder="Filter tenants..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-10 pr-4 py-1.5 text-sm text-zinc-900 dark:text-zinc-300 focus:outline-none focus:border-indigo-500 w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="pb-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-4">Tenant</th>
                <th className="pb-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-4">Plan</th>
                <th className="pb-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-4">Status</th>
                <th className="pb-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-4">Users</th>
                <th className="pb-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-4">Health</th>
                <th className="pb-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-900 dark:text-white">
                        {tenant.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-900 dark:text-white">{tenant.name}</p>
                        <p className="text-[10px] text-zinc-500">{tenant.slug}.aurora.app</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", 
                      tenant.plan === 'ENTERPRISE' ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20" :
                      tenant.plan === 'GROWTH' ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20" :
                      "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                    )}>
                      {tenant.plan}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-1.5 h-1.5 rounded-full", 
                        tenant.status === 'ACTIVE' ? "bg-emerald-500" : "bg-rose-500"
                      )} />
                      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{tenant.status}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm text-zinc-500 dark:text-zinc-400">N/A</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-500" />
                      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Healthy</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button className="p-1.5 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="p-6 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-6">Platform Catalog Governance</h3>
          <div className="space-y-4">
            {[
              { name: 'Core CRM Suite', version: 'v2.4.0', status: 'Published' },
              { name: 'Finance Accelerator', version: 'v1.1.2', status: 'Staging' },
              { name: 'HR Operations', version: 'v3.0.1', status: 'Published' },
            ].map((pkg, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <Layers size={18} className="text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">{pkg.name}</p>
                    <p className="text-[10px] text-zinc-500">{pkg.version}</p>
                  </div>
                </div>
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", 
                  pkg.status === 'Published' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                )}>
                  {pkg.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-6">Recent Platform Events</h3>
          <div className="space-y-4">
            {[
              { event: 'New Tenant Provisioned', detail: 'Acme Corp (t1)', time: '12m ago' },
              { event: 'Platform Update', detail: 'v2.5.0 Rollout Started', time: '1h ago' },
              { event: 'Security Alert', detail: 'Failed login attempt (t3)', time: '3h ago' },
            ].map((ev, i) => (
              <div key={i} className="flex gap-3">
                <Clock size={14} className="text-zinc-400 dark:text-zinc-600 mt-1" />
                <div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-white">{ev.event}</p>
                  <p className="text-[10px] text-zinc-500">{ev.detail} • {ev.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
