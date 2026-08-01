import { useState, useEffect } from 'react';
import { CreditCard, Zap, Loader2, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { Table } from '../../components/UI/Table';
import { useAuth } from '../../hooks/useAuth';
import { PageHeader } from '../../components/UI/PageHeader';

export const BillingSubscriptionsPage = () => {
  const { session } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!session?.access_token) return;
        const res = await fetch('http://localhost:3001/api/admin/subscriptions', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        const resData = await res.json();
        setData(resData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
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
      {/* Page Header */}
      <PageHeader 
        title="Billing & Subscriptions"
        description="Manage commercial software tier subscriptions, seat limits, and invoice cycles per tenant."
        icon={CreditCard}
        actions={
          <div className="p-4 bg-white/40 dark:bg-white/[0.03] border border-white/20 dark:border-white/5 rounded-2xl backdrop-blur-xl text-right">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Total Subscription MRR</span>
            <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">${data?.totalMRR?.toLocaleString() || 0}</span>
          </div>
        }
      />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-white/40 dark:bg-white/[0.03] border border-white/20 dark:border-white/5 rounded-3xl backdrop-blur-xl shadow-xl"
      >
        <Table 
          data={data?.subscriptions || []}
          noContainer={true}
          className="bg-transparent dark:bg-transparent border-none"
          columns={[
            {
              header: 'Tenant',
              sortable: true,
              accessor: (sub: any) => (
                <div>
                  <p className="text-sm font-bold text-zinc-900 dark:text-white">{sub.name}</p>
                  <p className="text-[10px] font-mono text-zinc-500">{sub.subdomain}.aurora.app</p>
                </div>
              ),
              sortKey: 'name'
            },
            {
              header: 'Plan Tier',
              sortable: true,
              accessor: (sub: any) => (
                <span className="text-[9px] font-bold px-2.5 py-1 bg-indigo-500/10 text-indigo-500 rounded-lg uppercase tracking-wider border border-indigo-500/20 inline-flex items-center gap-1">
                  <Zap size={10} />
                  {sub.planTier}
                </span>
              ),
              sortKey: 'planTier'
            },
            {
              header: 'Assigned Seats',
              sortable: true,
              accessor: (sub: any) => (
                <span className="text-xs font-bold font-mono text-zinc-800 dark:text-zinc-200">
                  {sub.memberCount} Seats
                </span>
              ),
              sortKey: 'memberCount'
            },
            {
              header: 'Monthly Rate',
              sortable: true,
              accessor: (sub: any) => (
                <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  ${sub.monthlyRate}/mo
                </span>
              ),
              sortKey: 'monthlyRate'
            },
            {
              header: 'Next Renewal',
              sortable: true,
              accessor: (sub: any) => (
                <span className="text-xs font-mono text-zinc-500 flex items-center gap-1">
                  <RefreshCw size={12} className="text-indigo-400" />
                  {sub.renewalDate}
                </span>
              )
            }
          ]}
        />
      </motion.div>
    </div>
  );
};
