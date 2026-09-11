import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Sparkles, 
  Database, 
  RefreshCw, 
  Check, 
  FileSpreadsheet, 
  FileCode,
  Briefcase,
  Users,
  CheckSquare,
  DollarSign,
  HeartPulse,
  ShoppingCart
} from 'lucide-react';
import { generateMockDataset, exportRecordsToCsv, MockDataOptions } from '../../utils/mockDataGenerator';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

interface MockDataGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  fields: any[];
  moduleName?: string;
  onApplyDataset: (dataset: any[]) => void;
}

const DOMAINS: { id: MockDataOptions['domain']; label: string; icon: any; desc: string }[] = [
  { id: 'general', label: 'General Business', icon: Briefcase, desc: 'Corporate records, accounts, and tasks' },
  { id: 'crm', label: 'CRM & Sales', icon: DollarSign, desc: 'Leads, deals, pipelines, and customer contacts' },
  { id: 'hr', label: 'HR & People', icon: Users, desc: 'Employees, job titles, departments, and onboarding' },
  { id: 'projects', label: 'Projects & Tasks', icon: CheckSquare, desc: 'Deliverables, milestones, sprints, and statuses' },
  { id: 'finance', label: 'Finance & Invoices', icon: DollarSign, desc: 'Orders, pricing, payment states, and billing' },
  { id: 'healthcare', label: 'Healthcare & Clinic', icon: HeartPulse, desc: 'Patients, appointments, triage, and records' },
  { id: 'ecommerce', label: 'E-Commerce', icon: ShoppingCart, desc: 'Products, shipments, delivery statuses, and orders' }
];

export const MockDataGeneratorModal: React.FC<MockDataGeneratorModalProps> = ({
  isOpen,
  onClose,
  fields,
  moduleName = 'Module',
  onApplyDataset
}) => {
  const [count, setCount] = useState<number>(15);
  const [selectedDomain, setSelectedDomain] = useState<MockDataOptions['domain']>('general');
  const [seed, setSeed] = useState<number>(0);

  const cleanFields = useMemo(() => {
    return fields.filter(f => f && f.id && !['heading', 'divider', 'spacer', 'card'].includes(f.type));
  }, [fields]);

  // Live generated preview records based on current parameters and seed
  const generatedRecords = useMemo(() => {
    if (!isOpen) return [];
    // seed triggers regeneration
    return generateMockDataset(cleanFields, {
      count,
      domain: selectedDomain
    });
  }, [isOpen, cleanFields, count, selectedDomain, seed]);

  const handleApply = () => {
    onApplyDataset(generatedRecords);
    toast.success(`Generated and applied ${generatedRecords.length} mock records to Preview`);
    onClose();
  };

  const handleExportCsv = () => {
    exportRecordsToCsv(generatedRecords, cleanFields, `${moduleName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-mock-data.csv`);
    toast.success('Downloaded mock data as CSV');
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(generatedRecords, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${moduleName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-mock-data.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success('Downloaded mock data as JSON');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-zinc-950/70 backdrop-blur-xl transition-opacity"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] shadow-2xl overflow-hidden z-10 flex flex-col my-auto max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-8 pt-8 pb-5 border-b border-zinc-100 dark:border-zinc-800 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                <Sparkles size={22} />
              </div>
              <div>
                <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                  Mock Data Sandbox Generator
                </h2>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">
                  Generate realistic test datasets tailored to your schema to evaluate views, formulas, and rules.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
            {/* Domain Selection */}
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">
                1. Select Industry / Domain Preset
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {DOMAINS.map((domain) => {
                  const Icon = domain.icon;
                  const isSelected = selectedDomain === domain.id;
                  return (
                    <button
                      key={domain.id}
                      type="button"
                      onClick={() => setSelectedDomain(domain.id)}
                      className={cn(
                        "p-3 rounded-2xl border text-left flex flex-col justify-between transition-all group relative overflow-hidden",
                        isSelected
                          ? "bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-sm ring-2 ring-indigo-500/20"
                          : "bg-zinc-50/50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                      )}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <div className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                          isSelected ? "bg-indigo-600 text-white" : "bg-zinc-200/70 dark:bg-zinc-800 text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white"
                        )}>
                          <Icon size={16} />
                        </div>
                        {isSelected && <Check size={16} className="text-indigo-600 dark:text-indigo-400" />}
                      </div>
                      <div>
                        <div className="font-bold text-xs">{domain.label}</div>
                        <div className="text-[10px] text-zinc-400 dark:text-zinc-500 line-clamp-1 mt-0.5">{domain.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Record Count Selector */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                  2. Dataset Size
                </label>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {count} Records
                </span>
              </div>
              <div className="flex items-center gap-2">
                {[5, 10, 15, 25, 50, 100].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setCount(num)}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs font-bold transition-all border",
                      count === num
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Sample Preview Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <span>3. Sample Preview (Showing First 3 Rows)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setSeed(s => s + 1)}
                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <RefreshCw size={13} />
                  <span>Randomize</span>
                </button>
              </div>

              <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-zinc-50/50 dark:bg-zinc-900/60">
                <div className="overflow-x-auto max-h-48 custom-scrollbar">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-zinc-100/70 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                        <th className="px-4 py-2.5">Key</th>
                        {cleanFields.slice(0, 4).map(f => (
                          <th key={f.id} className="px-4 py-2.5">{f.label || f.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800">
                      {generatedRecords.slice(0, 3).map((rec, i) => (
                        <tr key={i} className="hover:bg-white dark:hover:bg-zinc-800/40">
                          <td className="px-4 py-2 font-mono text-[11px] text-zinc-400 font-bold">{rec._record_key || rec.id}</td>
                          {cleanFields.slice(0, 4).map(f => (
                            <td key={f.id} className="px-4 py-2 text-zinc-700 dark:text-zinc-300">
                              {typeof rec[f.id] === 'object' ? JSON.stringify(rec[f.id]) : String(rec[f.id] ?? '-')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-8 py-5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all shadow-sm"
              >
                <FileSpreadsheet size={14} className="text-emerald-500" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={handleExportJson}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all shadow-sm"
              >
                <FileCode size={14} className="text-amber-500" />
                <span>Export JSON</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-white dark:bg-zinc-800 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20"
              >
                <Database size={15} />
                <span>Apply to Preview ({count} Rows)</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
