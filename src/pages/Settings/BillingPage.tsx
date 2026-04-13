import { useState, useEffect } from 'react';
import { usePlatform } from '../../hooks/usePlatform';
import { 
  CreditCard, 
  ChevronRight, 
  Zap, 
  Users, 
  Shield, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  ArrowUpRight,
  Receipt
} from 'lucide-react';
import { Button, Badge, cn } from '../../components/UI/Primitives';
import { API_BASE_URL } from '../../config';
import { useAuth } from '../../hooks/useAuth';
import { Invoice } from '../../types/platform';

export const BillingPage = () => {
  const { tenant, billingUsage, billingLoading } = usePlatform();
  const { session } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!tenant?.id) return;
      setInvoicesLoading(true);
      try {
        const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
        const res = await fetch(`${API_BASE_URL}/api/billing/invoices`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenant.id
          }
        });
        if (res.ok) {
          const data = await res.json();
          setInvoices(data);
        }
      } catch (err) {
        console.error('Failed to fetch invoices:', err);
      } finally {
        setInvoicesLoading(false);
      }
    };

    fetchInvoices();
  }, [tenant?.id, session?.access_token]);

  if (billingLoading || !billingUsage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-sm text-zinc-500">Loading plan details...</p>
      </div>
    );
  }

  const { plan, quota, usage } = billingUsage;
  const devPercent = Math.min(100, (usage.developer / quota.developerSeats) * 100);
  const stdPercent = Math.min(100, (usage.standard / quota.standardSeats) * 100);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Plan Hero Card */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-950 shadow-2xl shadow-black/5">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 opacity-50" />
        <div className="relative flex flex-col md:flex-row items-stretch gap-1">
          {/* Left Side: Current Plan */}
          <div className="flex-1 p-10 space-y-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
                <Zap size={12} className="fill-current" /> Current Subscription
              </div>
              <h2 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 uppercase">
                {plan} <span className="text-zinc-400 font-medium">Plan</span>
              </h2>
            </div>

            <div className="flex flex-wrap gap-8">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Renewal Date</p>
                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">May 1, 2026</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Base Rate</p>
                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">${quota.price}/mo</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Status</p>
                <div className="flex items-center gap-2 text-emerald-500 font-bold">
                  <CheckCircle2 size={16} /> Active
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button variant="primary" className="px-8 font-black uppercase tracking-widest text-[10px] h-12 gap-3 group">
                Upgrade Plan <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Button>
              <Button variant="ghost" className="px-8 font-bold border border-zinc-200 dark:border-zinc-800 h-12">
                Manager Add-ons
              </Button>
            </div>
          </div>

          {/* Right Side: Quick Stats Summary */}
          <div className="md:w-96 bg-zinc-50 dark:bg-zinc-900/50 p-10 flex flex-col justify-center gap-8 border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 rounded-[2rem]">
             <div className="space-y-1">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total Active Seats</p>
                <p className="text-3xl font-black text-zinc-900 dark:text-zinc-50">{usage.developer + usage.standard}</p>
             </div>
             <div className="space-y-4">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
                   <span>Projected Spend</span>
                   <span className="text-zinc-900 dark:text-zinc-100">${quota.price}.00</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                   <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }} />
                </div>
                <p className="text-[10px] text-zinc-500 font-medium italic">Fixed monthly cost with no overage fees.</p>
             </div>
          </div>
        </div>
      </div>

      {/* Usage Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Developer Licenses */}
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-8 space-y-8 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/20">
                <Shield size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Developer Licenses</h3>
                <p className="text-xs text-zinc-500 font-medium">Required for settings & configuration access</p>
              </div>
            </div>
            <Badge variant="blue" className="font-black text-[10px] px-3">{usage.developer} / {quota.developerSeats} USED</Badge>
          </div>

          <div className="space-y-4">
            <div className="h-4 w-full bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden p-1 border border-zinc-200/50 dark:border-zinc-800/50">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-1000 ease-out",
                  devPercent > 90 ? "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]" : "bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                )} 
                style={{ width: `${devPercent}%` }} 
              />
            </div>
            <div className="flex justify-between items-center px-1 font-black text-[10px] uppercase tracking-widest text-zinc-400">
               <span>Capacity: {100 - devPercent}% Free</span>
               {devPercent > 90 && <span className="text-red-500 flex items-center gap-1"><AlertCircle size={10} /> Limits Reached</span>}
            </div>
          </div>

          <p className="text-xs text-zinc-500 leading-relaxed bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 font-medium italic">
             Developer licenses are assigned to members who need to manage teams, design org structures, and configure security groups.
          </p>
        </div>

        {/* Standard Licenses */}
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-8 space-y-8 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-purple-500 text-white shadow-lg shadow-purple-500/20">
                <Users size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Standard Licenses</h3>
                <p className="text-xs text-zinc-500 font-medium">For humans and digital coworkers</p>
              </div>
            </div>
            <Badge variant="purple" className="font-black text-[10px] px-3">{usage.standard} / {quota.standardSeats} USED</Badge>
          </div>

          <div className="space-y-4">
            <div className="h-4 w-full bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden p-1 border border-zinc-200/50 dark:border-zinc-800/50">
              <div 
                className="h-full bg-purple-500 rounded-full shadow-[0_0_12px_rgba(168,85,247,0.3)] transition-all duration-1000 ease-out" 
                style={{ width: `${stdPercent}%` }} 
              />
            </div>
            <div className="flex justify-between items-center px-1 font-black text-[10px] uppercase tracking-widest text-zinc-400">
               <span>Capacity: {100 - stdPercent}% Free</span>
            </div>
          </div>

          <p className="text-xs text-zinc-500 leading-relaxed bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 font-medium italic">
             Standard licenses apply to all workforce members without administrative needs, including provisioned AI agents.
          </p>
        </div>
      </div>

      {/* Billing History Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
            <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900">
                <Receipt size={16} className="text-zinc-600 dark:text-zinc-400" />
            </div>
            <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Invoice History</h3>
        </div>

        <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50 text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50">
                <th className="px-8 py-4">Invoice ID</th>
                <th className="px-8 py-4">Date</th>
                <th className="px-8 py-4">Amount</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {invoices.length > 0 ? invoices.map(inv => (
                <tr key={inv.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                  <td className="px-8 py-5 text-sm font-bold text-zinc-900 dark:text-zinc-100">{inv.id}</td>
                  <td className="px-8 py-5 text-sm font-medium text-zinc-500">{new Date(inv.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td>
                  <td className="px-8 py-5 text-sm font-bold text-zinc-900 dark:text-zinc-100">${inv.amount.toFixed(2)}</td>
                  <td className="px-8 py-5 text-sm font-medium">
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                       <CheckCircle2 size={12} /> {inv.status}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button className="p-2 text-zinc-400 hover:text-blue-500 transition-colors">
                      <Download size={18} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-sm text-zinc-500 italic">
                    {invoicesLoading ? 'Fetching invoices...' : 'No invoices found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Method Card */}
      <div className="rounded-[2.5rem] border border-zinc-200 bg-white p-10 dark:border-zinc-800 dark:bg-zinc-950 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
         <div className="flex items-center gap-6">
            <div className="h-16 w-16 flex items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800">
                <CreditCard size={32} />
            </div>
            <div>
               <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight mb-1 flex items-center gap-2">
                 Visa ending in 4242 <Badge variant="zinc" className="text-[8px] font-black tracking-widest uppercase">Primary</Badge>
               </h3>
               <p className="text-sm text-zinc-500 font-medium italic">Expires 12 / 2028</p>
            </div>
         </div>
         <Button variant="ghost" className="h-12 px-8 border border-zinc-200 dark:border-zinc-800 font-bold gap-2">
            Change Method <ChevronRight size={16} />
         </Button>
      </div>
    </div>
  );
};
