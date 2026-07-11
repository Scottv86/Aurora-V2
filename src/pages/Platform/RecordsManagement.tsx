import { useState } from 'react';
import { PageHeader } from '../../components/UI/PageHeader';
import { Button } from '../../components/UI/Primitives';
import { 
  Archive, 
  Clock, 
  Trash2, 
  Plus, 
  Search, 
  Database, 
  CheckCircle, 
  AlertTriangle,
  History,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface RetentionRule {
  id: string;
  name: string;
  module: string;
  duration: string;
  action: 'ARCHIVE' | 'DELETE' | 'SOFT_DELETE' | 'REVIEW';
  status: 'ACTIVE' | 'DRAFT' | 'PAUSED';
  lastRun: string;
}

interface LegalHold {
  id: string;
  name: string;
  targetModule: string;
  reason: string;
  activeRecords: number;
  creator: string;
  dateCreated: string;
}

const MOCK_RULES: RetentionRule[] = [
  { id: '1', name: 'Tax & Financial Invoices', module: 'Pricing Catalog', duration: '7 Years', action: 'ARCHIVE', status: 'ACTIVE', lastRun: '2026-07-10' },
  { id: '2', name: 'Customer Chat Sessions', module: 'Inbox', duration: '90 Days', action: 'DELETE', status: 'ACTIVE', lastRun: '2026-07-11' },
  { id: '3', name: 'Employee Contract Records', module: 'Workforce Management', duration: 'Permanent', action: 'REVIEW', status: 'ACTIVE', lastRun: 'N/A' },
  { id: '4', name: 'Temporary Session Audits', module: 'System Logs', duration: '30 Days', action: 'DELETE', status: 'ACTIVE', lastRun: '2026-07-11' },
  { id: '5', name: 'Knowledge Base Drafts', module: 'Knowledge Base', duration: '1 Year', action: 'SOFT_DELETE', status: 'DRAFT', lastRun: 'N/A' },
];

const MOCK_HOLDS: LegalHold[] = [
  { id: '1', name: 'Q2 2026 SEC Audit Hold', targetModule: 'Pricing Catalog', reason: 'Routine regulatory inquiry into transaction histories.', activeRecords: 14820, creator: 'Sarah Jenkins (Compliance Lead)', dateCreated: '2026-06-15' },
  { id: '2', name: 'HR Internal Dispute (Orion Project)', targetModule: 'Workforce Management', reason: 'Active arbitration regarding team assignments and records.', activeRecords: 14, creator: 'David Vance (Legal Counsel)', dateCreated: '2026-07-02' },
];

const MOCK_AUDIT_LOGS = [
  { time: '11:42 AM', date: '2026-07-11', event: 'Auto-purge completed', details: 'Purged 1,294 expired records from Temporary Session Audits (30d retention).', icon: Trash2, color: 'text-red-500 bg-red-500/10' },
  { time: '09:15 AM', date: '2026-07-11', event: 'Retention schedule run', details: 'Scanned 14,820 records in "Tax & Financial Invoices". Zero records expired.', icon: CheckCircle, color: 'text-emerald-500 bg-emerald-500/10' },
  { time: '04:30 PM', date: '2026-07-10', event: 'Legal hold applied', details: 'Sarah Jenkins created Q2 2026 SEC Audit Hold on module Pricing Catalog.', icon: Lock, color: 'text-indigo-500 bg-indigo-500/10' },
  { time: '11:00 AM', date: '2026-07-08', event: 'Retention rule modified', details: 'Customer Chat Sessions retention changed from 120 days to 90 days.', icon: Clock, color: 'text-amber-500 bg-amber-500/10' },
];

export const RecordsManagement = () => {
  const [activeTab, setActiveTab] = useState<'schedules' | 'holds' | 'audit'>('schedules');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 relative">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[100px] -ml-48 -mb-48 pointer-events-none" />

      <PageHeader 
        title="Records Management"
        description="Configure compliance retention policies, manage immutable WORM storage locks, and review auto-disposition logs."
        actions={
          <Button className="gap-2 shadow-lg shadow-indigo-500/10" onClick={() => alert('Feature coming soon: This will allow administrators to create a new compliance retention schedule.')}>
            <Plus size={16} /> New Retention Schedule
          </Button>
        }
      />

      {/* Placeholder Banner */}
      <div className="relative z-10 mb-8 p-4 bg-indigo-500/5 border border-indigo-500/15 dark:border-indigo-500/10 rounded-2xl flex items-start gap-4">
        <div className="p-2 bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
          <AlertTriangle size={20} className="animate-pulse" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-widest">🚧 System Placeholder Page</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            This module is currently set up as a **placeholder**. The interface below showcases a high-fidelity visual preview of retention schedules, compliance locks, and legal hold rules. Database actions and settings are simulation-only for now.
          </p>
        </div>
      </div>

      {/* Metrics Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 relative z-10">
        <div className="p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl transition-all shadow-xl shadow-black/5 hover:border-indigo-500/30">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Clock size={20} />
            </div>
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Simulated</span>
          </div>
          <span className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">14</span>
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mt-1">Active Rules</p>
        </div>

        <div className="p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl transition-all shadow-xl shadow-black/5 hover:border-indigo-500/30">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl">
              <Database size={20} />
            </div>
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Simulated</span>
          </div>
          <span className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">384,102</span>
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mt-1">Managed Records</p>
        </div>

        <div className="p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl transition-all shadow-xl shadow-black/5 hover:border-indigo-500/30">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <Lock size={20} />
            </div>
            <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">Immutable</span>
          </div>
          <span className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">2</span>
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mt-1">Active Legal Holds</p>
        </div>

        <div className="p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl transition-all shadow-xl shadow-black/5 hover:border-indigo-500/30">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl">
              <Trash2 size={20} />
            </div>
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Auto-Run</span>
          </div>
          <span className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">1,294</span>
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mt-1">Purged (30 Days)</p>
        </div>
      </div>

      {/* Tabs Menu Navigation */}
      <div className="flex bg-zinc-100/30 dark:bg-white/[0.02] border border-zinc-250/20 dark:border-white/5 rounded-2xl p-1 mb-8 w-fit shrink-0 relative z-10">
        <button
          onClick={() => setActiveTab('schedules')}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            activeTab === 'schedules' 
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          )}
        >
          <Clock size={12} />
          Retention Schedules
        </button>
        <button
          onClick={() => setActiveTab('holds')}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            activeTab === 'holds'
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          )}
        >
          <Lock size={12} />
          Compliance Holds
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            activeTab === 'audit'
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          )}
        >
          <History size={12} />
          Disposition Audit Log
        </button>
      </div>

      {/* Tab Content Panels */}
      <div className="flex-1 relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === 'schedules' && (
            <motion.div
              key="schedules"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Filter controls */}
              <div className="flex items-center gap-4 bg-white/40 dark:bg-white/[0.02] border border-white/20 dark:border-white/5 rounded-2xl p-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search retention schedules..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden bg-white/30 dark:bg-zinc-950/20 backdrop-blur-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                      <th className="px-6 py-4">Schedule Details</th>
                      <th className="px-6 py-4">Source System Module</th>
                      <th className="px-6 py-4">Retention Period</th>
                      <th className="px-6 py-4">Action On Expiry</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Last Run</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_RULES.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase())).map((rule) => (
                      <tr key={rule.id} className="border-b border-zinc-200/50 dark:border-zinc-800/50 hover:bg-white/40 dark:hover:bg-white/[0.01] transition-colors text-xs">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
                              <Archive size={14} />
                            </div>
                            <span className="font-bold text-zinc-800 dark:text-zinc-200">{rule.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{rule.module}</td>
                        <td className="px-6 py-4 font-medium text-zinc-700 dark:text-zinc-300">
                          <span className="flex items-center gap-1.5">
                            <Clock size={12} className="text-zinc-400" />
                            {rule.duration}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                            rule.action === 'ARCHIVE' && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                            rule.action === 'DELETE' && "bg-red-500/10 text-red-600 dark:text-red-400",
                            rule.action === 'SOFT_DELETE' && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                            rule.action === 'REVIEW' && "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
                          )}>
                            {rule.action}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                            rule.status === 'ACTIVE' && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                            rule.status === 'DRAFT' && "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
                            rule.status === 'PAUSED' && "bg-red-500/10 text-red-600 dark:text-red-400"
                          )}>
                            {rule.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-zinc-400">{rule.lastRun}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'holds' && (
            <motion.div
              key="holds"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {MOCK_HOLDS.map((hold) => (
                <div key={hold.id} className="p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl shadow-xl shadow-black/5 hover:border-indigo-500/30 transition-all flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                  <div className="space-y-2 max-w-xl">
                    <div className="flex items-center gap-2">
                      <Lock size={16} className="text-amber-500" />
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white">{hold.name}</h3>
                      <span className="text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full uppercase tracking-wider">Active Lock</span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{hold.reason}</p>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-zinc-400 pt-2">
                      <span>Target module: <strong className="text-zinc-600 dark:text-zinc-300 font-medium">{hold.targetModule}</strong></span>
                      <span>Created by: <strong className="text-zinc-600 dark:text-zinc-300 font-medium">{hold.creator}</strong></span>
                      <span>Dated: <strong className="text-zinc-600 dark:text-zinc-300 font-medium">{hold.dateCreated}</strong></span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 min-w-[140px]">
                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 block tracking-tight">{hold.activeRecords.toLocaleString()}</span>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Locked Records</span>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'audit' && (
            <motion.div
              key="audit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="p-6 bg-white/40 dark:bg-white/[0.02] border border-white/20 dark:border-white/5 rounded-3xl">
                <div className="flow-root">
                  <ul className="-mb-8">
                    {MOCK_AUDIT_LOGS.map((log, i) => {
                      const LogIcon = log.icon;
                      return (
                        <li key={i}>
                          <div className="relative pb-8">
                            {i !== MOCK_AUDIT_LOGS.length - 1 && (
                              <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-zinc-200 dark:bg-zinc-800" aria-hidden="true" />
                            )}
                            <div className="relative flex space-x-3">
                              <div>
                                <span className={cn(
                                  "h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white dark:ring-zinc-950",
                                  log.color
                                )}>
                                  <LogIcon size={14} aria-hidden="true" />
                                </span>
                              </div>
                              <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                                <div>
                                  <p className="text-xs text-zinc-800 dark:text-zinc-200 font-bold">{log.event} <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-normal">({log.details})</span></p>
                                </div>
                                <div className="text-right text-[11px] whitespace-nowrap text-zinc-400">
                                  <time dateTime={log.date}>{log.date} {log.time}</time>
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
