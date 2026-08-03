import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRightLeft, 
  Upload, 
  Download, 
  Layers, 
  History, 
  Database, 
  FileCode, 
  CheckCircle2, 
  RotateCcw, 
  ArrowRight, 
  Plus,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/UI/Primitives';
import { SettingsSubNavLayout, SettingsSubNavItem } from '../../components/Settings/SettingsSubNavLayout';
import { ImportWizardModal } from '../../components/Settings/Migration/ImportWizardModal';
import { ExportEngineModal } from '../../components/Settings/Migration/ExportEngineModal';

interface MigrationJob {
  id: string;
  type: 'Import' | 'Export' | 'Blueprint Sync' | 'Connector';
  entity: string;
  records: number;
  status: 'Completed' | 'Processing' | 'Failed' | 'Rolled Back';
  initiatedBy: string;
  timestamp: string;
}

const INITIAL_HISTORY: MigrationJob[] = [
  { id: 'MIG-8091', type: 'Import', entity: 'Module Records (Pipeline)', records: 450, status: 'Completed', initiatedBy: 'Daniela V.', timestamp: '2026-08-03 12:45' },
  { id: 'MIG-8090', type: 'Blueprint Sync', entity: 'Document Generation Schema', records: 1, status: 'Completed', initiatedBy: 'Scott V.', timestamp: '2026-08-02 16:20' },
  { id: 'MIG-8089', type: 'Export', entity: 'Workforce Members', records: 48, status: 'Completed', initiatedBy: 'Admin User', timestamp: '2026-08-01 09:15' },
  { id: 'MIG-8088', type: 'Import', entity: 'Global Lists (Taxonomy)', records: 1200, status: 'Completed', initiatedBy: 'Daniela V.', timestamp: '2026-07-30 14:10' },
  { id: 'MIG-8087', type: 'Import', entity: 'Legacy Deals CSV', records: 88, status: 'Failed', initiatedBy: 'John Doe', timestamp: '2026-07-28 11:05' },
  { id: 'MIG-8086', type: 'Export', entity: 'Full Workspace Backup', records: 14500, status: 'Completed', initiatedBy: 'System Cron', timestamp: '2026-07-25 02:00' },
];

const PREBUILT_CONNECTORS = [
  { id: 'salesforce', name: 'Salesforce CRM', desc: 'Sync leads, contacts, opportunities, and custom objects', icon: '☁️', tag: 'Popular' },
  { id: 'hubspot', name: 'HubSpot', desc: 'Import contact pipelines, deals, and engagement history', icon: '🟠', tag: 'Native' },
  { id: 'airtable', name: 'Airtable', desc: 'Map bases, views, and relational tables to Aurora modules', icon: '🟡', tag: 'Beta' },
  { id: 'notion', name: 'Notion Databases', desc: 'Convert Notion database pages into structured records', icon: '📝', tag: 'New' },
  { id: 'postgres', name: 'PostgreSQL / SQL Dump', desc: 'Direct database table ingestion via connection string', icon: '🐘', tag: 'Direct' },
];

export const MigrationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [history, setHistory] = useState<MigrationJob[]>(INITIAL_HISTORY);
  const [searchQuery, setSearchQuery] = useState('');

  const subNavItems: SettingsSubNavItem[] = [
    { id: 'overview', label: 'Overview & Hub', icon: ArrowRightLeft, description: 'Migration status & tools' },
    { id: 'import', label: 'Import Data', icon: Upload, description: 'CSV/JSON batch wizard' },
    { id: 'export', label: 'Export Engine', icon: Download, description: 'Extract datasets & backups' },
    { id: 'blueprints', label: 'Blueprints & Schemas', icon: Layers, description: 'Environment sync & layouts' },
    { id: 'history', label: 'Migration History', icon: History, description: 'Audit log & 1-click rollback' },
  ];

  const handleRollback = (jobId: string) => {
    setHistory(prev => prev.map(job => {
      if (job.id === jobId) {
        return { ...job, status: 'Rolled Back' as const };
      }
      return job;
    }));
    toast.success(`Job ${jobId} rolled back successfully. Database snapshot restored.`);
  };

  const handleExportBlueprint = () => {
    const blueprintData = {
      workspace: 'Aurora V2 Main',
      exportedAt: new Date().toISOString(),
      modules: ['Document Generation', 'Records Management', 'Pricing Catalog'],
      schemaVersion: '2.4.0'
    };
    const blob = new Blob([JSON.stringify(blueprintData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aurora_workspace_blueprint.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Workspace blueprint exported successfully!');
  };

  const filteredHistory = history.filter(job => 
    job.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SettingsSubNavLayout
      title="Migration & Data Management Hub"
      description="Import CSV/JSON data, export platform records, and sync module blueprints across environments."
      icon={ArrowRightLeft}
      items={subNavItems}
      activeId={activeTab}
      onTabChange={setActiveTab}
      actions={
        <div className="flex items-center gap-2">
          <Button 
            variant="secondary"
            onClick={() => setIsExportModalOpen(true)} 
            className="gap-2 text-xs font-semibold"
          >
            <Download size={14} /> Export Data
          </Button>
          <Button 
            onClick={() => setIsImportModalOpen(true)} 
            className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-500/20"
          >
            <Plus size={14} /> New Import Wizard
          </Button>
        </div>
      }
    >
      <AnimatePresence mode="wait">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <motion.div
            key="overview-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-white/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 backdrop-blur-md space-y-2">
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Migrations</span>
                  <Database size={18} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-zinc-900 dark:text-white">142</span>
                  <span className="text-xs font-bold text-emerald-600">+12 this month</span>
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-white/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 backdrop-blur-md space-y-2">
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Records Processed</span>
                  <Upload size={18} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-zinc-900 dark:text-white">128.4K</span>
                  <span className="text-xs font-semibold text-zinc-400">across 6 modules</span>
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-white/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 backdrop-blur-md space-y-2">
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="text-xs font-bold uppercase tracking-wider">System Health</span>
                  <CheckCircle2 size={18} className="text-emerald-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">99.8%</span>
                  <span className="text-xs font-semibold text-zinc-400">Zero data loss</span>
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-white/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 backdrop-blur-md space-y-2">
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Schema Version</span>
                  <Layers size={18} className="text-amber-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-zinc-900 dark:text-white">v2.4.0</span>
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Synced</span>
                </div>
              </div>
            </div>

            {/* Quick Action Tiles */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">Migration Utilities</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div 
                  onClick={() => setIsImportModalOpen(true)}
                  className="p-6 rounded-3xl border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-500/5 hover:border-indigo-400 dark:hover:border-indigo-400/50 transition-all cursor-pointer group space-y-3"
                >
                  <div className="p-3 w-fit rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                    <Upload size={22} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      Import Data Wizard <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </h4>
                    <p className="text-xs text-zinc-500 mt-1">Upload CSV or JSON files with automated visual field mapping & validation dry-run.</p>
                  </div>
                </div>

                <div 
                  onClick={() => setIsExportModalOpen(true)}
                  className="p-6 rounded-3xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-500/5 hover:border-emerald-400 dark:hover:border-emerald-400/50 transition-all cursor-pointer group space-y-3"
                >
                  <div className="p-3 w-fit rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                    <Download size={22} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      Export Engine <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </h4>
                    <p className="text-xs text-zinc-500 mt-1">Extract selective entities, workspace records, or audit logs into CSV, JSON, or Excel.</p>
                  </div>
                </div>

                <div 
                  onClick={handleExportBlueprint}
                  className="p-6 rounded-3xl border border-purple-200 dark:border-purple-500/20 bg-purple-50/40 dark:bg-purple-500/5 hover:border-purple-400 dark:hover:border-purple-400/50 transition-all cursor-pointer group space-y-3"
                >
                  <div className="p-3 w-fit rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform">
                    <Layers size={22} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      Blueprint Migration <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </h4>
                    <p className="text-xs text-zinc-500 mt-1">Export custom module definitions & UI layout blueprints to deploy across tenants.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Importer Integrations Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">Platform Connectors</h3>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">5 Importers Ready</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {PREBUILT_CONNECTORS.map((conn) => (
                  <div 
                    key={conn.id}
                    className="p-5 rounded-3xl bg-white/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex items-start justify-between group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{conn.icon}</span>
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{conn.name}</h4>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          {conn.tag}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">{conn.desc}</p>
                    </div>
                    <Button 
                      variant="secondary" 
                      onClick={() => setIsImportModalOpen(true)}
                      className="p-2 rounded-xl text-xs shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors"
                    >
                      Connect
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Migration History Preview */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">Recent Migration Runs</h3>
                <button 
                  onClick={() => setActiveTab('history')}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                >
                  View Full Audit Log
                </button>
              </div>

              <div className="border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md">
                <table className="w-full text-xs text-left">
                  <thead className="bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 font-bold">
                    <tr>
                      <th className="p-3.5 pl-6">Job ID</th>
                      <th className="p-3.5">Type</th>
                      <th className="p-3.5">Target Entity</th>
                      <th className="p-3.5">Records</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 pr-6">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {history.slice(0, 4).map((job) => (
                      <tr key={job.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="p-3.5 pl-6 font-mono font-bold text-zinc-900 dark:text-white">{job.id}</td>
                        <td className="p-3.5 font-medium">{job.type}</td>
                        <td className="p-3.5 font-semibold text-zinc-800 dark:text-zinc-200">{job.entity}</td>
                        <td className="p-3.5 font-mono">{job.records.toLocaleString()}</td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            job.status === 'Completed' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                            job.status === 'Processing' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' :
                            job.status === 'Rolled Back' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                            'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="p-3.5 pr-6 text-zinc-400 font-mono">{job.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* IMPORT TAB */}
        {activeTab === 'import' && (
          <motion.div
            key="import-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="p-8 border border-dashed border-indigo-300 dark:border-indigo-500/30 rounded-3xl bg-indigo-50/20 dark:bg-indigo-500/5 text-center space-y-4">
              <div className="p-4 w-fit mx-auto rounded-3xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
                <Upload size={36} />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Batch Import CSV or JSON</h3>
                <p className="text-xs text-zinc-500">
                  Import contacts, deals, workforce members, or pricing catalog records into Aurora with our interactive visual mapper.
                </p>
              </div>
              <Button 
                onClick={() => setIsImportModalOpen(true)}
                className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-500/20"
              >
                Launch Import Wizard <ArrowRight size={16} />
              </Button>
            </div>
          </motion.div>
        )}

        {/* EXPORT TAB */}
        {activeTab === 'export' && (
          <motion.div
            key="export-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="p-8 border border-dashed border-emerald-300 dark:border-emerald-500/30 rounded-3xl bg-emerald-50/20 dark:bg-emerald-500/5 text-center space-y-4">
              <div className="p-4 w-fit mx-auto rounded-3xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/30">
                <Download size={36} />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Dataset Export Engine</h3>
                <p className="text-xs text-zinc-500">
                  Selectively extract records, platform settings, or audit log events formatted as CSV, JSON, or Excel.
                </p>
              </div>
              <Button 
                onClick={() => setIsExportModalOpen(true)}
                className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md shadow-emerald-500/20"
              >
                Open Export Engine <ArrowRight size={16} />
              </Button>
            </div>
          </motion.div>
        )}

        {/* BLUEPRINTS TAB */}
        {activeTab === 'blueprints' && (
          <motion.div
            key="blueprints-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Export Blueprint */}
              <div className="p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Download size={22} />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-zinc-900 dark:text-white">Export Workspace Blueprint</h4>
                    <p className="text-xs text-zinc-500">Generate JSON specification of all custom modules and layouts</p>
                  </div>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Exports field schemas, UI section configurations, automation triggers, and list taxonomies into a portable JSON blueprint.
                </p>
                <Button onClick={handleExportBlueprint} variant="secondary" className="gap-2 text-xs font-semibold">
                  <FileCode size={14} /> Download Blueprint JSON
                </Button>
              </div>

              {/* Import Blueprint */}
              <div className="p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <Upload size={22} />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-zinc-900 dark:text-white">Import Workspace Blueprint</h4>
                    <p className="text-xs text-zinc-500">Deploy module configurations from another environment</p>
                  </div>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Load a JSON blueprint to instantly create custom modules, forms, and workflows in this workspace tenant.
                </p>
                <Button onClick={() => setIsImportModalOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium">
                  <Upload size={14} /> Load Blueprint File
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <motion.div
            key="history-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Search and Filters */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search jobs by ID or entity name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredHistory.length} logs found</span>
            </div>

            {/* Audit Log Table */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 font-bold">
                  <tr>
                    <th className="p-3.5 pl-6">Job ID</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Target Entity</th>
                    <th className="p-3.5">Records</th>
                    <th className="p-3.5">Initiated By</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-600 dark:text-zinc-400">
                  {filteredHistory.map((job) => (
                    <tr key={job.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="p-3.5 pl-6 font-mono font-bold text-zinc-900 dark:text-white">{job.id}</td>
                      <td className="p-3.5 font-medium">{job.type}</td>
                      <td className="p-3.5 font-semibold text-zinc-800 dark:text-zinc-200">{job.entity}</td>
                      <td className="p-3.5 font-mono">{job.records.toLocaleString()}</td>
                      <td className="p-3.5 text-zinc-500">{job.initiatedBy}</td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          job.status === 'Completed' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                          job.status === 'Processing' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' :
                          job.status === 'Rolled Back' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                          'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        }`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-zinc-400 font-mono">{job.timestamp}</td>
                      <td className="p-3.5 pr-6 text-right">
                        {job.status === 'Completed' && job.type === 'Import' && (
                          <button
                            onClick={() => handleRollback(job.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 font-semibold text-[11px] transition-colors cursor-pointer"
                          >
                            <RotateCcw size={12} /> Rollback
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <ImportWizardModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          // add to top of history
          setHistory(prev => [
            {
              id: `MIG-${Math.floor(1000 + Math.random() * 9000)}`,
              type: 'Import',
              entity: 'Module Records',
              records: 4,
              status: 'Completed',
              initiatedBy: 'Current User',
              timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16)
            },
            ...prev
          ]);
        }}
      />

      <ExportEngineModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </SettingsSubNavLayout>
  );
};
