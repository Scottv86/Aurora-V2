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
  Receipt,
  BarChart3,
  Wallet,
  ShieldCheck,
  Search,
  Bot
} from 'lucide-react';
import { Button, Badge, cn } from '../../components/UI/Primitives';
import { API_BASE_URL } from '../../config';
import { useAuth } from '../../hooks/useAuth';
import { Invoice } from '../../types/platform';
import { LicenseGate, LicenseRestrictedPlaceholder } from '../../components/Auth/LicenseGate';
import { Tabs } from '../../components/UI/TabsAndModal';
import { useUsers } from '../../hooks/useUsers';

export const BillingPage = () => {
  const { tenant, billingUsage, billingLoading, refreshBilling } = usePlatform();
  const { session } = useAuth();
  const { members, loading: membersLoading, updateMember } = useUsers();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-600" />
      </div>
    );
  }

  const { plan, quota, usage } = billingUsage;
  const devPercent = Math.min(100, (usage.developer / quota.developerSeats) * 100);
  const stdPercent = Math.min(100, (usage.standard / quota.standardSeats) * 100);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'licenses', label: 'Licenses', icon: ShieldCheck },
    { id: 'invoices', label: 'Invoices', icon: Receipt },
    { id: 'payment', label: 'Payment', icon: Wallet },
  ];

  const handleLicenseChange = async (memberId: string, newType: string) => {
    try {
      await updateMember(memberId, { licenceType: newType });
      await refreshBilling();
    } catch (err) {
      // Error handled in hook
    }
  };

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.licenceType?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <LicenseGate fallback={<div className="p-10"><LicenseRestrictedPlaceholder /></div>}>
      <div className="flex min-h-full flex-col @container bg-zinc-50/30 dark:bg-zinc-950/30">
        {/* Header */}
        <div className="flex flex-col border-b border-zinc-200 bg-white/50 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/50">
          <div className="mx-auto max-w-7xl w-full">
            <div className="flex flex-col gap-6 px-10 pt-10 pb-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.25em] text-blue-600 dark:text-blue-400">
                    <Zap size={12} className="fill-current" /> Commercial & Subscription
                  </div>
                  <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                    Billing & Plan
                  </h1>
                </div>
              </div>
            </div>

            <div className="px-10 pb-10">
              <p className="max-w-3xl text-sm font-medium leading-relaxed text-zinc-500">
                Manage your subscription, licenses, and invoice history. 
                Ensure your workspace has the capacity to grow and your payment methods are up to date.
              </p>
            </div>

            <div className="px-10">
              <Tabs 
                tabs={tabs} 
                activeTab={activeTab} 
                onChange={setActiveTab} 
                className="border-none" 
              />
            </div>
          </div>
        </div>



        {/* Content Area */}
        <div className="flex-1 px-10 py-10">
          <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-2 duration-700">
            {activeTab === 'overview' && (
              <div className="space-y-10">
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
              </div>
            )}

            {activeTab === 'licenses' && (
              <div className="space-y-8">
                {/* Seats Summary Bar */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between p-6 rounded-[2rem] bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20">
                     <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-blue-500 flex items-center justify-center text-white">
                           <Shield size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Developer Licenses</p>
                          <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50 uppercase">{usage.developer} / {quota.developerSeats}</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Utilization</p>
                        <p className="text-xl font-black text-blue-600">{Math.round(devPercent)}%</p>
                     </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-6 rounded-[2rem] bg-purple-50 dark:bg-purple-500/5 border border-purple-100 dark:border-purple-500/20">
                     <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-purple-500 flex items-center justify-center text-white">
                           <Users size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400">Standard Licenses</p>
                          <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50 uppercase">{usage.standard} / {quota.standardSeats}</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Utilization</p>
                        <p className="text-xl font-black text-purple-600">{Math.round(stdPercent)}%</p>
                     </div>
                  </div>
                </div>

                {/* Table Header / Search */}
                <div className="flex items-center justify-between gap-4">
                  <div className="relative group flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-600 transition-colors" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search member name, email or licence..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-12 w-full max-w-md rounded-2xl border border-zinc-200 bg-white/80 pl-10 pr-4 text-xs font-bold outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm"
                    />
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-[2.5rem] border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                   <table className="w-full text-left">
                     <thead>
                       <tr className="border-b border-zinc-100 bg-zinc-50/50 text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50">
                         <th className="px-8 py-5">Member</th>
                         <th className="px-8 py-5">Type</th>
                         <th className="px-8 py-5">Current Licence</th>
                         <th className="px-8 py-5 text-right">Actions</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {membersLoading ? (
                          <tr>
                            <td colSpan={4} className="px-8 py-20 text-center">
                               <div className="flex flex-col items-center gap-3">
                                  <div className="h-6 w-6 rounded-full border-2 border-zinc-200 border-t-blue-500 animate-spin" />
                                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Loading members...</p>
                               </div>
                            </td>
                          </tr>
                        ) : filteredMembers.map(member => (
                          <tr key={member.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                             <td className="px-8 py-4">
                                <div className="flex items-center gap-3">
                                   <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden border border-zinc-200 dark:border-zinc-700">
                                      {member.avatarUrl ? (
                                        <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" />
                                      ) : (
                                        <div className="h-full w-full flex items-center justify-center text-zinc-400">
                                           {member.isSynthetic ? <Bot size={20} /> : <Users size={18} />}
                                        </div>
                                      )}
                                   </div>
                                   <div>
                                      <p className="text-sm font-black text-zinc-900 dark:text-zinc-50">{member.name}</p>
                                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{member.email}</p>
                                   </div>
                                </div>
                             </td>
                             <td className="px-8 py-4">
                               <Badge variant={member.isSynthetic ? 'purple' : 'zinc'} className="text-[8px] font-black tracking-[0.1em] uppercase px-2">
                                  {member.isSynthetic ? 'AI Agent' : 'Human'}
                               </Badge>
                             </td>
                             <td className="px-8 py-4">
                                <Badge 
                                  variant={member.licenceType === 'Developer' ? 'blue' : 'zinc'} 
                                  className="text-[10px] font-black tracking-widest uppercase py-1 px-3"
                                >
                                   {member.licenceType || 'None'}
                                </Badge>
                             </td>
                             <td className="px-8 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                   <button 
                                     onClick={() => handleLicenseChange(member.id, 'Standard')}
                                     disabled={member.licenceType === 'Standard'}
                                     className={cn(
                                       "h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                       member.licenceType === 'Standard' 
                                       ? "bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600 cursor-default"
                                       : "bg-white border border-zinc-200 text-zinc-500 hover:border-blue-500 hover:text-blue-600 dark:bg-zinc-900 dark:border-zinc-800"
                                     )}
                                   >
                                      Standard
                                   </button>
                                   <button 
                                     onClick={() => handleLicenseChange(member.id, 'Developer')}
                                     disabled={member.licenceType === 'Developer'}
                                     className={cn(
                                       "h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                       member.licenceType === 'Developer' 
                                       ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20 cursor-default"
                                       : "bg-white border border-zinc-200 text-zinc-500 hover:border-blue-500 hover:text-blue-600 dark:bg-zinc-900 dark:border-zinc-800"
                                     )}
                                   >
                                      Developer
                                   </button>
                                </div>
                             </td>
                          </tr>
                        ))}
                     </tbody>
                   </table>
                </div>
              </div>
            )}

            {activeTab === 'invoices' && (
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
            )}

            {activeTab === 'payment' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900">
                        <Wallet size={16} className="text-zinc-600 dark:text-zinc-400" />
                    </div>
                    <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Payment Methods</h3>
                </div>

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
            )}
          </div>
        </div>
      </div>
    </LicenseGate>
  );
};


