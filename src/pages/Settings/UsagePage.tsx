import { useState } from 'react';
import { 
  RefreshCw, 
  Zap, 
  BarChart3, 
  Wallet, 
  Activity, 
  PieChart, 
  Users, 
  Bot, 
  TrendingUp, 
  ArrowUpRight,
  MessageSquare,
  Code,
  FileSearch,
  BrainCircuit
} from 'lucide-react';
import { Button, cn } from '../../components/UI/Primitives';
import { LicenseGate, LicenseRestrictedPlaceholder } from '../../components/Auth/LicenseGate';
import { Tabs } from '../../components/UI/TabsAndModal';

const SegmentedProgress = ({ value }: { value: number }) => {
  return (
    <div className="flex gap-1.5 h-1.5 w-full">
      {[0, 25, 50, 75].map((threshold) => {
        const segmentValue = Math.max(0, Math.min(25, value - threshold));
        const percentage = (segmentValue / 25) * 100;
        return (
          <div key={threshold} className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-500 shadow-[0_0_8px_rgba(37,99,235,0.4)]" 
              style={{ width: `${percentage}%` }}
            />
          </div>
        );
      })}
    </div>
  );
};

const Switch = ({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) => {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        checked ? "bg-blue-600" : "bg-zinc-200 dark:bg-zinc-700"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full transition-transform",
          checked ? "translate-x-6 bg-white" : "translate-x-1 bg-white dark:bg-zinc-400"
        )}
      />
    </button>
  );
};

import { PageHeader } from '../../components/UI/PageHeader';

export const UsagePage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [overagesEnabled, setOveragesEnabled] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const tabs = [
    { id: 'overview', label: 'Quota Overview', icon: BarChart3 },
    { id: 'analytics', label: 'Analytics', icon: PieChart },
    { id: 'credits', label: 'Credits & Overages', icon: Wallet },
    { id: 'activity', label: 'Recent Activity', icon: Activity },
  ];

  const models = [
    { name: 'Gemini 3.1 Pro (High)', usage: 100, refresh: '4 hours, 28 minutes' },
    { name: 'Gemini 3.1 Pro (Low)', usage: 100, refresh: '4 hours, 28 minutes' },
    { name: 'Gemini 3 Flash', usage: 85, refresh: '4 hours, 30 minutes' },
    { name: 'Claude Sonnet 4.6 (Thinking)', usage: 100, refresh: '4 hours, 59 minutes' },
    { name: 'Claude Opus 4.6 (Thinking)', usage: 100, refresh: '4 hours, 59 minutes' },
    { name: 'GPT-OSS 120B (Medium)', usage: 100, refresh: '4 hours, 59 minutes' },
  ];

  const topUsers = [
    { name: 'Sarah Jenkins', email: 'sarah@aurora.io', tokens: '1.2M', growth: '+12%', color: 'bg-indigo-500' },
    { name: 'Michael Chen', email: 'm.chen@aurora.io', tokens: '840K', growth: '+5%', color: 'bg-emerald-500' },
    { name: 'Elena Rodriguez', email: 'elena@aurora.io', tokens: '620K', growth: '-2%', color: 'bg-amber-500' },
    { name: 'David Smith', email: 'd.smith@aurora.io', tokens: '410K', growth: '+18%', color: 'bg-rose-500' },
  ];

  const intents = [
    { label: 'Data Extraction', icon: FileSearch, percentage: 42, color: 'bg-blue-600' },
    { label: 'Summarization', icon: BrainCircuit, percentage: 28, color: 'bg-purple-600' },
    { label: 'Code Generation', icon: Code, percentage: 18, color: 'bg-emerald-600' },
    { label: 'Creative Chat', icon: MessageSquare, percentage: 12, color: 'bg-orange-600' },
  ];

  const topAgents = [
    { name: 'Procurement Specialist', usage: '2.4M tokens', active: '18h ago', icon: Bot },
    { name: 'Legal Analyst', usage: '1.8M tokens', active: '2h ago', icon: Bot },
    { name: 'Customer Support', usage: '1.1M tokens', active: 'Just now', icon: Bot },
  ];

  return (
    <LicenseGate fallback={<div className="p-10"><LicenseRestrictedPlaceholder /></div>}>
      <PageHeader 
        title="Model Usage"
        description="Monitor tokens, API calls, and resource consumption for your AI models. Manage quotas and credit overages to ensure uninterrupted service across your workspace."
        tabs={
          <Tabs 
            tabs={tabs} 
            activeTab={activeTab} 
            onChange={setActiveTab} 
            className="border-none"
            firstTabPadding={false}
          />
        }
      />

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                   <div className="space-y-1">
                      <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">System Quotas</h2>
                      <p className="text-sm text-zinc-500 font-medium">Real-time monitoring of your allocated model capacity.</p>
                   </div>

                   <Button 
                      variant="secondary" 
                      size="sm" 
                      className="bg-white border border-zinc-200 text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-700 h-9 px-4 rounded-lg font-bold transition-all shadow-sm"
                      onClick={handleRefresh}
                      loading={isRefreshing}
                   >
                      {!isRefreshing && <RefreshCw size={14} className="mr-2" />}
                      Refresh
                   </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {models.map((model) => (
                    <div key={model.name} className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">{model.name}</h3>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Refreshes: {model.refresh}</span>
                      </div>
                      <SegmentedProgress value={model.usage} />
                      <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest pt-1">
                         <span>Utilization</span>
                         <span className="text-blue-600 dark:text-blue-400">{model.usage}%</span>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                   {/* Intent Distribution */}
                   <div className="lg:col-span-2 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 space-y-8 shadow-sm">
                      <div className="flex items-center justify-between">
                         <div className="space-y-1">
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Usage by Intent</h3>
                            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Last 30 Days Breakdown</p>
                         </div>
                         <TrendingUp className="text-blue-600" size={20} />
                      </div>

                      <div className="space-y-6">
                         {intents.map((intent) => (
                            <div key={intent.label} className="space-y-2">
                               <div className="flex items-center justify-between text-sm font-bold">
                                  <div className="flex items-center gap-3 text-zinc-900 dark:text-zinc-100">
                                     <div className={cn("p-1.5 rounded-lg text-white", intent.color)}>
                                        <intent.icon size={14} />
                                     </div>
                                     {intent.label}
                                  </div>
                                  <span className="text-zinc-500">{intent.percentage}%</span>
                               </div>
                               <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                  <div className={cn("h-full rounded-full transition-all duration-1000", intent.color)} style={{ width: `${intent.percentage}%` }} />
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>

                   {/* Quick Stats Column */}
                   <div className="space-y-6">
                      <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-500/20">
                         <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Total Tokens Consumed</p>
                         <h4 className="text-3xl font-black tracking-tight mb-4">12.4M</h4>
                         <div className="flex items-center gap-1.5 text-[10px] font-bold bg-white/20 w-fit px-2 py-1 rounded-full">
                            <ArrowUpRight size={12} /> 14.2% from last month
                         </div>
                      </div>

                      <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-4 shadow-sm">
                         <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                               <MessageSquare size={18} />
                            </div>
                            <div>
                               <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Avg. Response Time</p>
                               <p className="text-lg font-black text-zinc-900 dark:text-zinc-100">1.24s</p>
                            </div>
                         </div>
                      </div>

                      <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-4 shadow-sm">
                         <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                               <Bot size={18} />
                            </div>
                            <div>
                               <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Active AI Agents</p>
                               <p className="text-lg font-black text-zinc-900 dark:text-zinc-100">12</p>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                   {/* Usage by User */}
                   <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 space-y-6 shadow-sm">
                      <div className="flex items-center justify-between">
                         <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-3">
                            <Users size={20} className="text-blue-600" /> Usage by User
                         </h3>
                         <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-blue-600">View All</Button>
                      </div>

                      <div className="space-y-1">
                         {topUsers.map((user) => (
                            <div key={user.email} className="group flex items-center justify-between p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded-2xl transition-all border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700">
                               <div className="flex items-center gap-4">
                                  <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center text-white font-black text-xs", user.color)}>
                                     {user.name.charAt(0)}
                                  </div>
                                  <div>
                                     <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{user.name}</p>
                                     <p className="text-[10px] font-medium text-zinc-500">{user.email}</p>
                                  </div>
                               </div>
                               <div className="text-right">
                                  <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">{user.tokens}</p>
                                  <p className={cn("text-[10px] font-bold", user.growth.startsWith('+') ? 'text-emerald-500' : 'text-rose-500')}>{user.growth}</p>
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>

                   {/* Usage by Agent */}
                   <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 space-y-6 shadow-sm">
                      <div className="flex items-center justify-between">
                         <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-3">
                            <Bot size={20} className="text-purple-600" /> Usage by Agent
                         </h3>
                         <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-purple-600">Manage Agents</Button>
                      </div>

                      <div className="space-y-4">
                         {topAgents.map((agent) => (
                            <div key={agent.name} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
                               <div className="flex items-center gap-4">
                                  <div className="h-10 w-10 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center text-purple-600 shadow-sm border border-zinc-100 dark:border-zinc-800">
                                     <agent.icon size={20} />
                                  </div>
                                  <div>
                                     <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{agent.name}</p>
                                     <p className="text-[10px] font-medium text-zinc-500 italic">Last active {agent.active}</p>
                                  </div>
                               </div>
                               <div className="text-right">
                                  <p className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">{agent.usage}</p>
                                  <div className="mt-1 h-1.5 w-24 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                     <div className="h-full bg-purple-600 rounded-full" style={{ width: '75%' }} />
                                  </div>
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>
                </div>
              </div>
            )}

            {activeTab === 'credits' && (
              <div className="space-y-8">
                <div className="space-y-1">
                   <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Credits & Overages</h2>
                   <p className="text-sm text-zinc-500 font-medium">Manage supplementary compute credits and overflow policies.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 space-y-6 shadow-sm">
                    <div className="flex items-start justify-between gap-8">
                      <div className="space-y-3">
                        <div className="h-12 w-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                           <Zap size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Enable AI Credit Overages</h3>
                        <p className="text-sm leading-relaxed text-zinc-500 font-medium">
                          When toggled on, Aurora will use your AI credits to fulfill model requests once you're out of model quota. Aurora will always use your model quota first before using AI credits.
                        </p>
                      </div>
                      <div className="pt-2">
                        <Switch checked={overagesEnabled} onChange={setOveragesEnabled} />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-blue-500/20 flex flex-col justify-between">
                     <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">Available AI Credits</p>
                        <h3 className="text-4xl font-black tracking-tight">$0.00</h3>
                     </div>
                     <div className="pt-8">
                        <Button className="w-full bg-white text-blue-600 hover:bg-zinc-100 font-black uppercase tracking-widest text-[11px] h-12 rounded-2xl">
                           Top up Credits
                        </Button>
                     </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                 <div className="h-16 w-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                    <Activity size={32} />
                 </div>
                 <div className="space-y-1">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">No recent activity</h3>
                    <p className="text-sm text-zinc-500 max-w-sm">Detailed logs of model calls and token consumption will appear here once you start using AI features.</p>
                 </div>
              </div>
            )}
      </div>
    </LicenseGate>
  );
};
