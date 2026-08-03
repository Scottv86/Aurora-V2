import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { 
  Download, 
  X, 
  Database, 
  FileText, 
  CheckSquare,
  Square
} from 'lucide-react';
import { Button } from '../../UI/Primitives';
import { toast } from 'sonner';

interface ExportEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEntity?: string;
}

const EXPORT_ENTITIES = [
  { id: 'records', label: 'All Module Records & Deals', count: '1,420 records' },
  { id: 'workforce', label: 'Workforce Members & Positions', count: '48 members' },
  { id: 'global_lists', label: 'Global System Lists & Options', count: '12 lists' },
  { id: 'catalog', label: 'Pricing Catalog Items & Services', count: '340 items' },
  { id: 'audit_logs', label: 'Security & System Audit Logs', count: '8,950 events' },
  { id: 'blueprints', label: 'Platform Blueprints & Module Specs', count: '8 modules' },
];

const AVAILABLE_FIELDS: Record<string, string[]> = {
  records: ['ID', 'Title', 'Primary Email', 'Value', 'Stage', 'Assignee', 'Created At', 'Updated At'],
  workforce: ['Member ID', 'Full Name', 'Email', 'Role', 'Department', 'Status', 'Joined Date'],
  global_lists: ['List Code', 'Label', 'Category', 'Description', 'Active Status'],
  catalog: ['SKU', 'Product Name', 'Unit Price', 'Category', 'Tax Rate', 'Created At'],
  audit_logs: ['Event ID', 'Timestamp', 'User', 'Action', 'Resource', 'IP Address'],
  blueprints: ['Module ID', 'Display Name', 'Field Schema', 'Workflow Actions', 'Version']
};

export const ExportEngineModal: React.FC<ExportEngineModalProps> = ({
  isOpen,
  onClose,
  defaultEntity = 'records'
}) => {
  const [selectedEntity, setSelectedEntity] = useState<string>(defaultEntity);
  const [format, setFormat] = useState<'csv' | 'json' | 'xlsx'>('csv');
  const [dateRange, setDateRange] = useState<'all' | '30d' | '90d' | 'year'>('all');
  const [isExporting, setIsExporting] = useState(false);

  // Field toggling state
  const initialFields = AVAILABLE_FIELDS[selectedEntity] || [];
  const [selectedFields, setSelectedFields] = useState<string[]>(initialFields);

  if (!isOpen) return null;

  const toggleField = (field: string) => {
    if (selectedFields.includes(field)) {
      setSelectedFields(selectedFields.filter(f => f !== field));
    } else {
      setSelectedFields([...selectedFields, field]);
    }
  };

  const selectAllFields = () => {
    setSelectedFields(AVAILABLE_FIELDS[selectedEntity] || []);
  };

  const handleEntityChange = (entityId: string) => {
    setSelectedEntity(entityId);
    setSelectedFields(AVAILABLE_FIELDS[entityId] || []);
  };

  const handleRunExport = () => {
    if (selectedFields.length === 0) {
      toast.error('Please select at least one field to export');
      return;
    }

    setIsExporting(true);

    setTimeout(() => {
      setIsExporting(false);

      // Create a mock blob download
      const content = format === 'csv' 
        ? `${selectedFields.join(',')}\n"DEMO-001","Sample Record Data","2026-08-03"`
        : JSON.stringify({ entity: selectedEntity, fields: selectedFields, exportedAt: new Date().toISOString() }, null, 2);

      const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aurora_${selectedEntity}_export.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Export created! Downloaded aurora_${selectedEntity}_export.${format}`);
      onClose();
    }, 1200);
  };

  const modalNode = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Download size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Export Engine</h3>
              <p className="text-xs text-zinc-500">Configure and extract platform datasets to CSV, JSON, or Excel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
          {/* Target Dataset Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
              1. Target Dataset
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {EXPORT_ENTITIES.map((ent) => (
                <button
                  key={ent.id}
                  onClick={() => handleEntityChange(ent.id)}
                  className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    selectedEntity === ent.id
                      ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 font-semibold'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Database size={16} className={selectedEntity === ent.id ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'} />
                    <span className="text-xs truncate">{ent.label}</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">{ent.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Export File Format */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
              2. File Format
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'csv', label: 'CSV (.csv)', desc: 'Comma Separated Values' },
                { id: 'json', label: 'JSON (.json)', desc: 'Structured Payload' },
                { id: 'xlsx', label: 'Excel (.xlsx)', desc: 'Formatted Spreadsheet' },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => setFormat(fmt.id as any)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    format === fmt.id
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 font-semibold'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText size={16} className={format === fmt.id ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'} />
                    <span className="text-xs font-bold">{fmt.label}</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1">{fmt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Date Filter & Options */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
              3. Filter Date Scope
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'all', label: 'All Time' },
                { id: '30d', label: 'Last 30 Days' },
                { id: '90d', label: 'Last 90 Days' },
                { id: 'year', label: 'This Year' },
              ].map((range) => (
                <button
                  key={range.id}
                  onClick={() => setDateRange(range.id as any)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    dateRange === range.id
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fields Selection Toggles */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                4. Select Columns / Attributes ({selectedFields.length} selected)
              </label>
              <button
                onClick={selectAllFields}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
              >
                Select All
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50">
              {(AVAILABLE_FIELDS[selectedEntity] || []).map((f) => {
                const isChecked = selectedFields.includes(f);
                return (
                  <button
                    key={f}
                    onClick={() => toggleField(f)}
                    className="flex items-center gap-2.5 p-1.5 rounded-lg text-xs text-left text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                  >
                    {isChecked ? (
                      <CheckSquare size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <Square size={16} className="text-zinc-400 shrink-0" />
                    )}
                    <span className="truncate">{f}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 flex items-center justify-between">
          <span className="text-xs text-zinc-500 font-mono">Payload: ~2.4 MB</span>

          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button 
              onClick={handleRunExport}
              loading={isExporting}
              className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md shadow-emerald-500/20"
            >
              <Download size={14} /> Generate & Download Export
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : null;
};
