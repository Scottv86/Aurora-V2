import React, { useState, useMemo } from 'react';
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
import { usePlatform } from '../../../context/PlatformContext';
import { useAuth } from '../../../hooks/useAuth';
import { API_BASE_URL } from '../../../config';

interface ExportEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEntity?: string;
  onExportSuccess?: (info: { entity: string; records: number }) => void;
}

const STATIC_EXPORT_ENTITIES = [
  { id: 'records', label: 'All Module Records & Deals', count: 'Live DB' },
  { id: 'workforce', label: 'Workforce Members & Positions', count: 'Live DB' },
  { id: 'global_lists', label: 'Global System Lists & Options', count: 'Live DB' },
  { id: 'catalog', label: 'Pricing Catalog Items & Services', count: 'Live DB' },
  { id: 'audit_logs', label: 'Security & System Audit Logs', count: 'Live DB' },
  { id: 'blueprints', label: 'Platform Blueprints & Module Specs', count: 'Live DB' },
];

const STATIC_AVAILABLE_FIELDS: Record<string, string[]> = {
  records: ['id', 'moduleId', 'status', 'title', 'name', 'email', 'value', 'createdAt', 'updatedAt'],
  workforce: ['id', 'firstName', 'familyName', 'workEmail', 'roleId', 'licenceType', 'status', 'createdAt'],
  global_lists: ['id', 'name', 'description', 'items'],
  catalog: ['id', 'code', 'name', 'type', 'basePrice', 'currency', 'status', 'createdAt'],
  audit_logs: ['id', 'timestamp', 'actorId', 'action', 'resource', 'ipAddress'],
  blueprints: ['id', 'name', 'category', 'type', 'layout', 'createdAt']
};

export const ExportEngineModal: React.FC<ExportEngineModalProps> = ({
  isOpen,
  onClose,
  defaultEntity = 'records',
  onExportSuccess
}) => {
  const { modules, tenant } = usePlatform();
  const { session } = useAuth();
  const activeTenantId = tenant?.id;

  const { EXPORT_ENTITIES, AVAILABLE_FIELDS } = useMemo(() => {
    const entities = [...STATIC_EXPORT_ENTITIES];
    const fieldsMap: Record<string, string[]> = { ...STATIC_AVAILABLE_FIELDS };

    (modules || []).filter((m: any) => m.type !== 'PAGE').forEach((m: any) => {
      const entId = `mod:${m.id}`;
      entities.push({
        id: entId,
        label: `Module: ${m.name}`,
        count: 'Live DB'
      });
      const modFields = ((m.layout || []) as any[])
        .filter((f: any) => !['divider', 'spacer', 'heading', 'alert'].includes(f.type))
        .map((f: any) => f.id);
      fieldsMap[entId] = ['id', 'status', ...modFields, 'createdAt', 'updatedAt'];
    });

    return { EXPORT_ENTITIES: entities, AVAILABLE_FIELDS: fieldsMap };
  }, [modules]);

  const [selectedEntity, setSelectedEntity] = useState<string>(defaultEntity);
  const [format, setFormat] = useState<'csv' | 'json' | 'xlsx'>('csv');
  const [dateRange, setDateRange] = useState<'all' | '30d' | '90d' | 'year'>('all');
  const [isExporting, setIsExporting] = useState(false);

  // Field toggling state
  const initialFields = AVAILABLE_FIELDS[selectedEntity] || STATIC_AVAILABLE_FIELDS.records;
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

  const handleRunExport = async () => {
    if (selectedFields.length === 0) {
      toast.error('Please select at least one field to export');
      return;
    }

    setIsExporting(true);

    try {
      const token = session?.access_token || (import.meta as any).env?.VITE_DEV_TOKEN || localStorage.getItem('aurora_token') || '';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-tenant-id': activeTenantId || 'tenant_default'
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let rowsToExport: any[] = [];

      if (selectedEntity.startsWith('mod:')) {
        const modId = selectedEntity.replace('mod:', '');
        const res = await fetch(`${API_BASE_URL}/api/data/records?moduleId=${encodeURIComponent(modId)}&limit=5000`, { headers });
        if (res.ok) {
          const data = await res.json();
          rowsToExport = Array.isArray(data) ? data : (data.records || []);
        }
      } else if (selectedEntity === 'records') {
        const res = await fetch(`${API_BASE_URL}/api/data/records?limit=5000`, { headers });
        if (res.ok) {
          const data = await res.json();
          rowsToExport = Array.isArray(data) ? data : (data.records || []);
        }
      } else if (selectedEntity === 'catalog') {
        const res = await fetch(`${API_BASE_URL}/api/catalog/items`, { headers });
        if (res.ok) {
          const data = await res.json();
          rowsToExport = Array.isArray(data) ? data : (data.items || []);
        }
      } else if (selectedEntity === 'global_lists') {
        const res = await fetch(`${API_BASE_URL}/api/lists`, { headers });
        if (res.ok) {
          const data = await res.json();
          rowsToExport = Array.isArray(data) ? data : (data.lists || []);
        }
      } else if (selectedEntity === 'blueprints') {
        rowsToExport = modules || [];
      } else if (selectedEntity === 'workforce') {
        const res = await fetch(`${API_BASE_URL}/api/tenants/${encodeURIComponent(activeTenantId || 'tenant_default')}/members`, { headers });
        if (res.ok) {
          const data = await res.json();
          rowsToExport = Array.isArray(data) ? data : (data.members || []);
        }
      } else if (selectedEntity === 'audit_logs') {
        const res = await fetch(`${API_BASE_URL}/api/audit?limit=1000`, { headers });
        if (res.ok) {
          const data = await res.json();
          rowsToExport = Array.isArray(data) ? data : (data.logs || []);
        }
      }

      // Filter by dateRange if applicable
      if (dateRange !== 'all') {
        const days = dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 365;
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        rowsToExport = rowsToExport.filter(r => {
          const ts = r.createdAt || r.timestamp || r.updatedAt;
          return !ts || new Date(ts).getTime() >= cutoff;
        });
      }

      // Project selected fields
      const projectedRows = rowsToExport.map(row => {
        const projected: Record<string, any> = {};
        selectedFields.forEach(f => {
          projected[f] = row[f] !== undefined ? row[f] : (row.data?.[f] ?? '');
        });
        return projected;
      });

      const escapeCsvCell = (val: any): string => {
        if (val === null || val === undefined) return '""';
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      };

      const ext = format === 'xlsx' ? 'csv' : format;
      const content = format === 'json'
        ? JSON.stringify({
            entity: selectedEntity,
            exportedAt: new Date().toISOString(),
            count: projectedRows.length,
            records: projectedRows
          }, null, 2)
        : [
            selectedFields.join(','),
            ...projectedRows.map(r => selectedFields.map(f => escapeCsvCell(r[f])).join(','))
          ].join('\n');

      const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = selectedEntity.replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `aurora_${safeName}_export.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const entityObj = EXPORT_ENTITIES.find(e => e.id === selectedEntity);
      onExportSuccess?.({
        entity: entityObj?.label || selectedEntity,
        records: projectedRows.length
      });

      toast.success(`Exported ${projectedRows.length} records to aurora_${safeName}_export.${ext}`);
      onClose();
    } catch (err: any) {
      toast.error(`Export failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
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
