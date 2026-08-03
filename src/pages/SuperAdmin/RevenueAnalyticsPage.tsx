import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Sparkles, Loader2, CreditCard, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../hooks/useAuth';
import { PageHeader } from '../../components/UI/PageHeader';

export const RevenueAnalyticsPage = () => {
  const { session } = useAuth();
  const [revenue, setRevenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        if (!session?.access_token) return;
        const res = await fetch('http://localhost:3001/api/admin/revenue', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await res.json();
        setRevenue(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRevenue();
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
        title="Revenue Analytics"
        description="Platform recurring revenue metrics (MRR/ARR), plan tier distributions, and usage-based billables."
        icon={TrendingUp}
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-white/40 dark:bg-white/[0.03] border border-white/20 dark:border-white/5 rounded-3xl backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Monthly Recurring (MRR)</span>
            <DollarSign size={18} className="text-emerald-500" />
          </div>
          <p className="text-3xl font-extrabold text-zinc-900 dark:text-white font-mono">${revenue?.mrr?.toLocaleString()}</p>
          <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 mt-2">
            <ArrowUpRight size={12} /> +14.2% from last month
          </span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="p-6 bg-white/40 dark:bg-white/[0.03] border border-white/20 dark:border-white/5 rounded-3xl backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Annual Run Rate (ARR)</span>
            <TrendingUp size={18} className="text-indigo-500" />
          </div>
          <p className="text-3xl font-extrabold text-zinc-900 dark:text-white font-mono">${revenue?.arr?.toLocaleString()}</p>
          <span className="text-[10px] font-bold text-indigo-500 mt-2 block">Projected 12-month value</span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-6 bg-white/40 dark:bg-white/[0.03] border border-white/20 dark:border-white/5 rounded-3xl backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Subscription Subtotal</span>
            <CreditCard size={18} className="text-purple-500" />
          </div>
          <p className="text-3xl font-extrabold text-zinc-900 dark:text-white font-mono">${revenue?.subscriptionMRR?.toLocaleString()}</p>
          <span className="text-[10px] font-bold text-zinc-500 mt-2 block">Base SaaS license tiers</span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="p-6 bg-white/40 dark:bg-white/[0.03] border border-white/20 dark:border-white/5 rounded-3xl backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">AI Token Billables</span>
            <Sparkles size={18} className="text-teal-500" />
          </div>
          <p className="text-3xl font-extrabold text-zinc-900 dark:text-white font-mono">${revenue?.aiBillableMRR?.toLocaleString()}</p>
          <span className="text-[10px] font-bold text-teal-500 mt-2 block">Usage metering calculation</span>
        </motion.div>
      </div>

      {/* Revenue Trend Chart */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 bg-white/40 dark:bg-white/[0.03] border border-white/20 dark:border-white/5 rounded-3xl backdrop-blur-xl shadow-xl space-y-6"
      >
        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Revenue Growth Trajectory</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart data={revenue?.trends || []}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} opacity={0.2} />
              <XAxis dataKey="month" stroke="#71717a" fontSize={11} axisLine={false} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={11} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.9)', borderRadius: '12px', border: '1px solid #3f3f46', fontSize: '12px', color: '#fff' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
};
