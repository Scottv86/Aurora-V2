import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Database, 
  Play, 
  Save, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  Table as TableIcon, 
  Columns as ColumnsIcon, 
  Key as KeyIcon, 
  Search, 
  Loader2, 
  Sliders, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  Sparkles, 
  Maximize2, 
  Minimize2, 
  Clock, 
  Tag, 
  HelpCircle, 
  Check, 
  Code, 
  Eye, 
  RefreshCw, 
  Share2, 
  Zap,
  Info,
  Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Button } from '../../UI/Primitives';
import { DynamicIcon } from '../../UI/DynamicIcon';
import { usePlatform } from '../../../hooks/usePlatform';
import { useAuth } from '../../../hooks/useAuth';
import { API_BASE_URL } from '../../../config';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../lib/utils';
import { 
  SavedQueryEntity, 
  QueryParameter, 
  QueryColumnConfig, 
  ColumnDisplayType, 
  QueryStatus 
} from '../../../types/queryBuilder';
import { SqlEditor } from './SqlEditor';

interface QueryBuilderProps {
  initialQuery?: SavedQueryEntity | null;
  onClose: () => void;
  onSaveSuccess?: (saved: SavedQueryEntity) => void;
}

interface ColumnSchema {
  name: string;
  type: string;
  nullable?: boolean;
  isPrimary?: boolean;
  label?: string;
}

interface TableSchema {
  name: string;
  displayName?: string;
  columns: ColumnSchema[];
}

interface SchemaData {
  physicalTables: TableSchema[];
  customModules: TableSchema[];
}

export const QueryBuilder: React.FC<QueryBuilderProps> = ({
  initialQuery,
  onClose,
  onSaveSuccess
}) => {
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token || localStorage.getItem('aurora_token') || 'dev-token';
  const tenantId = tenant?.id || 't1';

  // Metadata State
  const [queryId, setQueryId] = useState<string>(initialQuery?.id || '');
  const [name, setName] = useState<string>(initialQuery?.name || 'Untitled Query View');
  const [description, setDescription] = useState<string>(initialQuery?.description || '');
  const [category, setCategory] = useState<string>(initialQuery?.category || 'General');
  const [tags, setTags] = useState<string[]>(initialQuery?.tags || ['analytics']);
  const [newTagInput, setNewTagInput] = useState('');
  const [status, setStatus] = useState<QueryStatus>(initialQuery?.status || 'DRAFT');
  const [cacheTtl, setCacheTtl] = useState<number>(initialQuery?.cacheTtlSeconds || 0);

  // SQL & Mode State
  const [sqlQuery, setSqlQuery] = useState<string>(
    initialQuery?.sql || 
`-- Define your dataset query below. Use :param_name for dynamic variables.
SELECT 
  id,
  status,
  created_at,
  updated_at
FROM records
WHERE status = :status
ORDER BY created_at DESC
LIMIT 50;`
  );

  // Parameters State
  const [parameters, setParameters] = useState<QueryParameter[]>(
    initialQuery?.parameters?.length 
      ? initialQuery.parameters 
      : [
          {
            id: 'param_status',
            name: 'status',
            label: 'Record Status',
            type: 'string',
            defaultValue: 'active',
            required: true,
            description: 'Filter records by active/archived status'
          }
        ]
  );
  const [testParamValues, setTestParamValues] = useState<Record<string, any>>(() => {
    const initialValues: Record<string, any> = {};
    if (initialQuery?.parameters) {
      initialQuery.parameters.forEach(p => {
        initialValues[p.name] = p.defaultValue ?? '';
      });
    } else {
      initialValues['status'] = 'active';
    }
    return initialValues;
  });

  // Output Columns State
  const [columnsConfig, setColumnsConfig] = useState<QueryColumnConfig[]>(
    initialQuery?.columnsConfig || []
  );

  // Schema state
  const [schema, setSchema] = useState<SchemaData>({ physicalTables: [], customModules: [] });
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [schemaSearch, setSchemaSearch] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'tables-folder': true,
    'modules-folder': true,
  });

  // Active Left / Bottom Tabs
  const [leftTab, setLeftTab] = useState<'schema' | 'params' | 'settings'>('schema');
  const [bottomTab, setBottomTab] = useState<'results' | 'columns' | 'explain'>('results');
  const [isFullscreen, setIsFullscreen] = useState(true);

  // Execution State
  const [executing, setExecuting] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // DOM Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Load Database Schema
  useEffect(() => {
    const fetchSchema = async () => {
      try {
        setSchemaLoading(true);
        const { data: sessData } = await supabase.auth.getSession();
        const activeToken = sessData?.session?.access_token || token;
        const res = await fetch(`${API_BASE_URL}/api/query-explorer/schema`, {
          headers: {
            'Authorization': `Bearer ${activeToken}`,
            'x-tenant-id': tenantId
          }
        });
        if (res.ok) {
          const data = await res.json();
          setSchema({
            physicalTables: data.physicalTables || [],
            customModules: data.customModules || []
          });
        }
      } catch (err) {
        console.error('Failed to load schema:', err);
      } finally {
        setSchemaLoading(false);
      }
    };

    fetchSchema();
  }, [token, tenant?.id]);

  // Sync scroll for editor
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const lineNumbers = useMemo(() => {
    const lines = sqlQuery.split('\n').length;
    return Array.from({ length: Math.max(lines, 1) }, (_, i) => i + 1);
  }, [sqlQuery]);

  // Insert column/table name at cursor
  const insertTextAtCursor = (text: string) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const current = sqlQuery;
    const next = current.substring(0, start) + text + current.substring(end);
    setSqlQuery(next);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + text.length, start + text.length);
      }
    }, 0);
  };

  // Interpolate Parameters for execution
  const buildExecutableQuery = () => {
    let executableSql = sqlQuery;
    parameters.forEach(p => {
      const val = testParamValues[p.name] !== undefined ? testParamValues[p.name] : (p.defaultValue || '');
      const regex = new RegExp(`:${p.name}\\b`, 'g');
      if (p.type === 'number') {
        const numVal = Number(val) || 0;
        executableSql = executableSql.replace(regex, numVal.toString());
      } else if (p.type === 'boolean') {
        executableSql = executableSql.replace(regex, val ? 'true' : 'false');
      } else {
        // Escaped string literal
        const escaped = String(val).replace(/'/g, "''");
        executableSql = executableSql.replace(regex, `'${escaped}'`);
      }
    });
    return executableSql;
  };

  // Run Test Query
  const handleRunQuery = async () => {
    if (!sqlQuery.trim()) {
      toast.error('SQL query cannot be empty');
      return;
    }

    setExecuting(true);
    setQueryError(null);
    const startTime = Date.now();

    try {
      const sqlToRun = buildExecutableQuery();
      const { data: sessData } = await supabase.auth.getSession();
      const activeToken = sessData?.session?.access_token || token;
      const res = await fetch(`${API_BASE_URL}/api/query-explorer/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`,
          'x-tenant-id': tenantId
        },
        body: JSON.stringify({ query: sqlToRun })
      });

      const data = await res.json();
      const duration = Date.now() - startTime;
      setDurationMs(duration);

      if (!res.ok) {
        throw new Error(data.error || 'Execution failed');
      }

      const rows = Array.isArray(data.rows) ? data.rows : (Array.isArray(data.results) ? data.results : []);
      setResults(rows);
      setRowCount(rows.length);
      toast.success(`Executed in ${duration}ms (${rows.length} rows)`);

      // Auto-populate columnsConfig if empty
      if (rows.length > 0) {
        const detectedKeys = Object.keys(rows[0]);
        setColumnsConfig(prev => {
          const existingMap = new Map(prev.map(c => [c.name, c]));
          return detectedKeys.map(k => {
            if (existingMap.has(k)) return existingMap.get(k)!;
            // Guess type
            let guessedType: ColumnDisplayType = 'text';
            const sampleVal = rows[0][k];
            if (typeof sampleVal === 'number') guessedType = 'number';
            else if (typeof sampleVal === 'boolean') guessedType = 'boolean';
            else if (k.toLowerCase().includes('date') || k.toLowerCase().includes('created') || k.toLowerCase().includes('updated')) guessedType = 'date';
            else if (k.toLowerCase().includes('status') || k.toLowerCase().includes('priority')) guessedType = 'badge';

            return {
              name: k,
              label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
              type: guessedType,
              visible: true
            };
          });
        });
      }
    } catch (err: any) {
      setQueryError(err.message || 'An error occurred during query execution.');
      toast.error(err.message || 'Query failed');
    } finally {
      setExecuting(false);
    }
  };

  // Keyboard shortcut Ctrl/Cmd + Enter to run
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunQuery();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sqlQuery, testParamValues, parameters]);

  // Save Query
  const handleSave = async (publishStatus?: QueryStatus) => {
    if (!name.trim()) {
      toast.error('Please enter a query name');
      return;
    }

    setIsSaving(true);
    const targetStatus = publishStatus || status;

    const payload: Partial<SavedQueryEntity> = {
      id: queryId || undefined,
      tenantId: tenant?.id || 't1',
      name: name.trim(),
      description: description.trim(),
      category,
      tags,
      iconName: 'Database',
      sql: sqlQuery,
      parameters,
      columnsConfig,
      status: targetStatus,
      cacheTtlSeconds: cacheTtl
    };

    try {
      const { data: sessData } = await supabase.auth.getSession();
      const activeToken = sessData?.session?.access_token || token;
      const res = await fetch(`${API_BASE_URL}/api/saved-queries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`,
          'x-tenant-id': tenantId
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save query');
      }

      const savedData: SavedQueryEntity = await res.json();
      setQueryId(savedData.id);
      setStatus(savedData.status);
      toast.success(targetStatus === 'PUBLISHED' ? 'Query Published Successfully!' : 'Draft Saved');
      if (onSaveSuccess) onSaveSuccess(savedData);
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(err.message || 'Failed to save query');
    } finally {
      setIsSaving(false);
    }
  };

  // Add a parameter
  const handleAddParameter = () => {
    const newParam: QueryParameter = {
      id: `param_${Date.now()}`,
      name: `param_${parameters.length + 1}`,
      label: `Parameter ${parameters.length + 1}`,
      type: 'string',
      defaultValue: '',
      required: false
    };
    setParameters(prev => [...prev, newParam]);
    setTestParamValues(prev => ({ ...prev, [newParam.name]: '' }));
    setLeftTab('params');
    toast.info(`Added parameter :${newParam.name}`);
  };

  // Tag Management
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(newTagInput.trim())) {
        setTags([...tags, newTagInput.trim()]);
      }
      setNewTagInput('');
    }
  };

  // Export Results
  const exportToCSV = () => {
    if (!results.length) return;
    const headers = Object.keys(results[0]).join(',');
    const rows = results.map(row => 
      Object.values(row).map(val => 
        typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
      ).join(',')
    ).join('\n');
    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.toLowerCase().replace(/\s+/g, '_')}_export.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Results exported to CSV');
  };

  return (
    <div className={cn(
      "fixed inset-0 z-[9999] flex flex-col w-screen h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans",
      "selection:bg-indigo-500/30 selection:text-indigo-200"
    )}>
      {/* Top Header / Action Bar */}
      <header className="flex items-center justify-between px-6 py-3.5 bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-800/80 shrink-0 z-20">
        {/* Left Title & Status */}
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-all text-xs font-semibold border border-zinc-800"
            title="Back to Queries Library"
          >
            <ArrowLeft size={15} />
            <span>Library</span>
          </button>

          <div className="h-4 w-px bg-zinc-800" />

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400">
              <Database size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Query View Name..."
                  className="bg-transparent text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50 rounded px-1.5 py-0.5 hover:bg-zinc-800/50 transition-colors w-64 md:w-80"
                />
                <span className={cn(
                  "px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase tracking-wider",
                  status === 'PUBLISHED' 
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                    : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                )}>
                  {status}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 px-1.5">
                {description || 'No description provided (click Settings on left to edit)'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex items-center gap-3">
          {/* Test Run Button */}
          <Button
            onClick={handleRunQuery}
            disabled={executing}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs px-4 py-2 rounded-xl font-bold shadow-lg shadow-indigo-500/20 border border-indigo-400/30 transition-all active:scale-95"
          >
            {executing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Play size={14} className="fill-current" />
            )}
            <span>{executing ? 'Executing...' : 'Run Query'}</span>
            <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded bg-indigo-950/60 border border-indigo-400/20 text-indigo-200">
              ⌘↵
            </span>
          </Button>

          <div className="h-4 w-px bg-zinc-800" />

          {/* Save Draft */}
          <Button
            variant="secondary"
            onClick={() => handleSave('DRAFT')}
            disabled={isSaving}
            className="text-xs px-3.5 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/60"
          >
            Save Draft
          </Button>

          {/* Publish Dataset */}
          <Button
            onClick={() => handleSave('PUBLISHED')}
            disabled={isSaving}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4 py-2 rounded-xl font-bold shadow-lg shadow-emerald-500/20 border border-emerald-400/30 transition-all"
          >
            <CheckCircle2 size={14} />
            <span>{isSaving ? 'Publishing...' : 'Publish Dataset'}</span>
          </Button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Glassmorphic Drawer */}
        <aside className="w-80 border-r border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md flex flex-col shrink-0">
          {/* Left Drawer Navigation Tabs */}
          <div className="flex items-center border-b border-zinc-800/80 bg-zinc-950/40 p-1">
            <button
              onClick={() => setLeftTab('schema')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all",
                leftTab === 'schema' 
                  ? "bg-zinc-800 text-white shadow-sm" 
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
              )}
            >
              <Database size={14} />
              <span>Schema</span>
            </button>
            <button
              onClick={() => setLeftTab('params')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all relative",
                leftTab === 'params' 
                  ? "bg-zinc-800 text-white shadow-sm" 
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
              )}
            >
              <Sliders size={14} />
              <span>Parameters</span>
              {parameters.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-indigo-500 text-[9px] font-bold flex items-center justify-center text-white">
                  {parameters.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setLeftTab('settings')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all",
                leftTab === 'settings' 
                  ? "bg-zinc-800 text-white shadow-sm" 
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
              )}
            >
              <Tag size={14} />
              <span>Settings</span>
            </button>
          </div>

          {/* Left Drawer Content Area */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
            {/* 1. SCHEMA EXPLORER TAB */}
            {leftTab === 'schema' && (
              <div className="space-y-3">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-zinc-500" />
                  <input
                    type="text"
                    value={schemaSearch}
                    onChange={e => setSchemaSearch(e.target.value)}
                    placeholder="Search tables & fields..."
                    className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-1">
                    <span>Database Entities</span>
                    <span className="text-[10px] text-zinc-500 font-normal">Click to insert</span>
                  </div>

                  {schemaLoading ? (
                    <div className="flex items-center justify-center py-8 text-zinc-500 text-xs gap-2">
                      <Loader2 size={14} className="animate-spin" />
                      <span>Loading schema definitions...</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {/* Physical Tables */}
                      <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/40 overflow-hidden">
                        <button
                          onClick={() => setExpandedNodes(prev => ({ ...prev, 'tables-folder': !prev['tables-folder'] }))}
                          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800/40"
                        >
                          <div className="flex items-center gap-2">
                            {expandedNodes['tables-folder'] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <TableIcon size={14} className="text-indigo-400" />
                            <span>System Tables ({schema.physicalTables.length})</span>
                          </div>
                        </button>

                        {expandedNodes['tables-folder'] && (
                          <div className="p-2 space-y-1 bg-zinc-950/60 border-t border-zinc-800/60">
                            {schema.physicalTables
                              .filter(t => !schemaSearch || t.name.toLowerCase().includes(schemaSearch.toLowerCase()))
                              .map(table => (
                                <div key={table.name} className="space-y-0.5">
                                  <button
                                    onClick={() => insertTextAtCursor(table.name)}
                                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-zinc-800/80 group transition-all"
                                  >
                                    <span className="font-mono text-indigo-300 font-medium">{table.name}</span>
                                    <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300">{table.columns.length} cols</span>
                                  </button>
                                  <div className="pl-4 space-y-0.5">
                                    {table.columns
                                      .filter(c => !schemaSearch || c.name.toLowerCase().includes(schemaSearch.toLowerCase()))
                                      .map(col => (
                                        <button
                                          key={col.name}
                                          onClick={() => insertTextAtCursor(col.name)}
                                          className="w-full flex items-center justify-between px-2 py-1 rounded text-[11px] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
                                        >
                                          <div className="flex items-center gap-1.5">
                                            {col.isPrimary && <KeyIcon size={11} className="text-amber-400" />}
                                            <span className="font-mono">{col.name}</span>
                                          </div>
                                          <span className="text-[9px] text-zinc-600 uppercase font-mono">{col.type}</span>
                                        </button>
                                      ))}
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>

                      {/* Custom Modules */}
                      <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/40 overflow-hidden">
                        <button
                          onClick={() => setExpandedNodes(prev => ({ ...prev, 'modules-folder': !prev['modules-folder'] }))}
                          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800/40"
                        >
                          <div className="flex items-center gap-2">
                            {expandedNodes['modules-folder'] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <Layers size={14} className="text-purple-400" />
                            <span>Custom Modules ({schema.customModules.length})</span>
                          </div>
                        </button>

                        {expandedNodes['modules-folder'] && (
                          <div className="p-2 space-y-1 bg-zinc-950/60 border-t border-zinc-800/60">
                            {schema.customModules
                              .filter(m => !schemaSearch || (m.displayName || m.name).toLowerCase().includes(schemaSearch.toLowerCase()))
                              .map(mod => (
                                <div key={mod.name} className="space-y-0.5">
                                  <button
                                    onClick={() => insertTextAtCursor(`"${mod.displayName || mod.name}"`)}
                                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-zinc-800/80 group transition-all"
                                  >
                                    <span className="font-mono text-purple-300 font-medium">{mod.displayName || mod.name}</span>
                                    <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300">{mod.columns.length} fields</span>
                                  </button>
                                  <div className="pl-4 space-y-0.5">
                                    {mod.columns.map(col => (
                                      <button
                                        key={col.name}
                                        onClick={() => insertTextAtCursor(col.name)}
                                        className="w-full flex items-center justify-between px-2 py-1 rounded text-[11px] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
                                      >
                                        <span className="font-mono">{col.name}</span>
                                        <span className="text-[9px] text-zinc-600 uppercase font-mono">{col.type}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. PARAMETERS CONFIGURATOR TAB */}
            {leftTab === 'params' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Query Variables
                  </div>
                  <button
                    onClick={handleAddParameter}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs font-semibold border border-indigo-500/30"
                  >
                    <Plus size={13} />
                    <span>Add Param</span>
                  </button>
                </div>

                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Parameters allow you to inject dynamic runtime values into your query via <code className="text-indigo-300 bg-zinc-800 px-1 py-0.5 rounded">:param_name</code>.
                </p>

                {parameters.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-zinc-800 rounded-xl p-4">
                    <Sliders size={20} className="mx-auto text-zinc-600 mb-2" />
                    <p className="text-xs text-zinc-400 font-medium">No parameters defined</p>
                    <p className="text-[11px] text-zinc-500 mt-1">Add variables like date ranges or status filters.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {parameters.map((param, idx) => (
                      <div key={param.id} className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-2 relative group">
                        <button
                          onClick={() => {
                            setParameters(prev => prev.filter(p => p.id !== param.id));
                            toast.info(`Removed :${param.name}`);
                          }}
                          className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-rose-400 transition-colors p-1"
                          title="Delete Parameter"
                        >
                          <Trash2 size={13} />
                        </button>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Token Name</label>
                          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1">
                            <span className="text-indigo-400 font-mono text-xs font-bold">:</span>
                            <input
                              type="text"
                              value={param.name}
                              onChange={e => {
                                const newName = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                                setParameters(prev => prev.map(p => p.id === param.id ? { ...p, name: newName } : p));
                              }}
                              className="bg-transparent text-xs font-mono text-white focus:outline-none w-full"
                              placeholder="param_name"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Label</label>
                            <input
                              type="text"
                              value={param.label}
                              onChange={e => {
                                const newLabel = e.target.value;
                                setParameters(prev => prev.map(p => p.id === param.id ? { ...p, label: newLabel } : p));
                              }}
                              className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none w-full"
                              placeholder="Friendly Label"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Data Type</label>
                            <select
                              value={param.type}
                              onChange={e => {
                                const newType = e.target.value as any;
                                setParameters(prev => prev.map(p => p.id === param.id ? { ...p, type: newType } : p));
                              }}
                              className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none w-full"
                            >
                              <option value="string">Text String</option>
                              <option value="number">Number</option>
                              <option value="boolean">Boolean</option>
                              <option value="date">Date</option>
                              <option value="user_id">Current User</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Default Value</label>
                          <input
                            type="text"
                            value={param.defaultValue ?? ''}
                            onChange={e => {
                              const newDef = e.target.value;
                              setParameters(prev => prev.map(p => p.id === param.id ? { ...p, defaultValue: newDef } : p));
                              setTestParamValues(prev => ({ ...prev, [param.name]: newDef }));
                            }}
                            className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-300 focus:outline-none w-full font-mono"
                            placeholder="Default runtime value"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. QUERY SETTINGS & CACHING TAB */}
            {leftTab === 'settings' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Description</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Provide context on what this dataset represents and which dashboards rely on it..."
                    className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="General">General Data View</option>
                    <option value="Sales & Revenue">Sales & Revenue</option>
                    <option value="Customer Support">Customer Support</option>
                    <option value="Workforce">Workforce & HR</option>
                    <option value="Operations">Operations & Logistics</option>
                    <option value="Executive KPI">Executive KPI</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Cache Policy (TTL)</label>
                  <select
                    value={cacheTtl}
                    onChange={e => setCacheTtl(Number(e.target.value))}
                    className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value={0}>Real-time (No Caching)</option>
                    <option value={60}>1 Minute Cache</option>
                    <option value={300}>5 Minutes Cache (Recommended for Dashboards)</option>
                    <option value={1800}>30 Minutes Cache</option>
                    <option value={3600}>1 Hour Cache</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Search Tags</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {tags.map(t => (
                      <span key={t} className="px-2 py-0.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 flex items-center gap-1">
                        #{t}
                        <button onClick={() => setTags(tags.filter(item => item !== t))} className="hover:text-rose-400">×</button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={e => setNewTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="Type tag and press Enter..."
                    className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Center Workspace & Bottom Output Dock */}
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-950/40">
          {/* Parameter Live-Test Bar (if parameters exist) */}
          {parameters.length > 0 && (
            <div className="px-6 py-2.5 bg-zinc-900/40 border-b border-zinc-800/80 flex items-center gap-4 flex-wrap shrink-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400">
                <Sliders size={13} />
                <span>Test Parameters:</span>
              </div>
              {parameters.map(p => (
                <div key={p.id} className="flex items-center gap-2 bg-zinc-950/80 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs">
                  <span className="font-mono text-zinc-400 font-medium">:{p.name}=</span>
                  <input
                    type="text"
                    value={testParamValues[p.name] ?? ''}
                    onChange={e => setTestParamValues(prev => ({ ...prev, [p.name]: e.target.value }))}
                    placeholder={p.defaultValue || 'value'}
                    className="bg-transparent text-white font-mono text-xs focus:outline-none w-24"
                  />
                </div>
              ))}
            </div>
          )}

          {/* SQL Editor Area with Colourised Syntax & IntelliSense */}
          <div className="flex-1 flex flex-col min-h-[220px] relative border-b border-zinc-800/80">
            {/* Editor Top Bar */}
            <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-900/60 border-b border-zinc-800/60 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <Code size={13} className="text-indigo-400" />
                <span className="font-semibold text-zinc-300">SQL Definition</span>
                <span className="text-[10px] text-zinc-500">PostgreSQL • IntelliSense Active (Tab / ↵)</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setSqlQuery(prev => prev.trim());
                    toast.success('Query formatted');
                  }}
                  className="hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  <Sparkles size={12} className="text-indigo-400" />
                  <span>Format</span>
                </button>
              </div>
            </div>

            {/* Colourised IntelliSense SQL Editor */}
            <div className="flex-1 relative flex overflow-hidden">
              <SqlEditor
                value={sqlQuery}
                onChange={setSqlQuery}
                parameters={parameters}
                tables={schema.physicalTables}
                customModules={schema.customModules}
                onRun={handleRunQuery}
              />
            </div>
          </div>

          {/* Bottom Results & Output Configuration Dock */}
          <div className="h-64 flex flex-col bg-zinc-900/70 backdrop-blur-md shrink-0">
            {/* Bottom Tabs Bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-zinc-950/60 border-b border-zinc-800/80 text-xs">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setBottomTab('results')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all",
                    bottomTab === 'results'
                      ? "bg-zinc-800 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  <TableIcon size={14} />
                  <span>Live Preview ({rowCount} rows)</span>
                  {durationMs > 0 && (
                    <span className="text-[10px] text-emerald-400 font-mono">⚡{durationMs}ms</span>
                  )}
                </button>

                <button
                  onClick={() => setBottomTab('columns')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all relative",
                    bottomTab === 'columns'
                      ? "bg-zinc-800 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  <ColumnsIcon size={14} />
                  <span>Output Column Types</span>
                  {columnsConfig.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-zinc-700 text-[9px] font-bold flex items-center justify-center text-zinc-300">
                      {columnsConfig.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setBottomTab('explain')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all",
                    bottomTab === 'explain'
                      ? "bg-zinc-800 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  <Info size={14} />
                  <span>Governance & Isolation</span>
                </button>
              </div>

              {/* Bottom Actions */}
              {results.length > 0 && bottomTab === 'results' && (
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs border border-zinc-700 transition-all"
                >
                  <Download size={13} />
                  <span>Export CSV</span>
                </button>
              )}
            </div>

            {/* Bottom Content Views */}
            <div className="flex-1 overflow-auto p-3">
              {queryError ? (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  <AlertTriangle size={18} className="shrink-0 text-rose-400" />
                  <div>
                    <h4 className="font-bold mb-1">SQL Execution Error</h4>
                    <pre className="font-mono whitespace-pre-wrap">{queryError}</pre>
                  </div>
                </div>
              ) : bottomTab === 'results' ? (
                results.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs gap-2">
                    <Database size={24} className="opacity-40" />
                    <span>Run the query to preview live records</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-zinc-800/80 bg-zinc-950/60">
                    <table className="w-full text-left text-xs border-collapse font-sans">
                      <thead>
                        <tr className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-400 font-semibold">
                          {Object.keys(results[0]).map(col => (
                            <th key={col} className="px-3.5 py-2 whitespace-nowrap font-mono text-[11px]">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60">
                        {results.slice(0, 100).map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-zinc-800/40 transition-colors">
                            {Object.keys(results[0]).map(col => (
                              <td key={col} className="px-3.5 py-2 whitespace-nowrap text-zinc-300 font-mono text-[11px]">
                                {row[col] === null ? (
                                  <span className="text-zinc-600 italic">null</span>
                                ) : typeof row[col] === 'object' ? (
                                  JSON.stringify(row[col])
                                ) : (
                                  String(row[col])
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : bottomTab === 'columns' ? (
                /* Output Column Types Configuration */
                columnsConfig.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs gap-2">
                    <ColumnsIcon size={24} className="opacity-40" />
                    <span>Run the query first to auto-discover output column schemas</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {columnsConfig.map((col, idx) => (
                      <div key={col.name} className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-950/60 flex items-center justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <span className="font-mono text-xs text-indigo-300 font-bold block truncate">{col.name}</span>
                          <input
                            type="text"
                            value={col.label}
                            onChange={e => {
                              const val = e.target.value;
                              setColumnsConfig(prev => prev.map((c, i) => i === idx ? { ...c, label: val } : c));
                            }}
                            className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none w-32"
                            placeholder="Display Label"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={col.type}
                            onChange={e => {
                              const val = e.target.value as ColumnDisplayType;
                              setColumnsConfig(prev => prev.map((c, i) => i === idx ? { ...c, type: val } : c));
                            }}
                            className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none"
                          >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="currency">Currency ($)</option>
                            <option value="date">Date</option>
                            <option value="badge">Status Badge</option>
                            <option value="avatar">User Avatar</option>
                            <option value="link">Record Link</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                /* Governance & Isolation */
                <div className="space-y-3 p-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                    <CheckCircle2 size={16} />
                    <span>Multi-Tenant RLS & Security Boundary Active</span>
                  </div>
                  <p className="text-zinc-400">
                    All executions automatically inject <code className="bg-zinc-800 px-1 py-0.5 rounded text-indigo-300">SET LOCAL app.current_tenant_id = '{tenant?.id}'</code> into the PostgreSQL transaction context to guarantee zero cross-tenant data leaks.
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-950/40">
                      <span className="text-zinc-500 font-bold uppercase text-[10px]">Active Tenant</span>
                      <p className="font-mono text-zinc-200 font-semibold">{tenant?.name || 'Default Tenant'} ({tenant?.id || 't1'})</p>
                    </div>
                    <div className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-950/40">
                      <span className="text-zinc-500 font-bold uppercase text-[10px]">Read-Only Mode</span>
                      <p className="text-emerald-400 font-semibold">Enforced (Mutating queries blocked)</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default QueryBuilder;
