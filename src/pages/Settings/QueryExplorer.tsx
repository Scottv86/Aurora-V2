import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Database, 
  Folder, 
  FolderOpen, 
  Play, 
  Trash2, 
  Download, 
  ChevronRight, 
  ChevronDown, 
  Table as TableIcon,
  Columns as ColumnsIcon,
  Key as KeyIcon,
  Link2,
  ArrowRight,
  Search, 
  Loader2,
  Terminal,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { SqlEditor } from '../../components/Builders/QueryBuilder/SqlEditor';
import { ReferencingRecordPopover } from '../../components/UI/ReferencingRecordPopover';

interface ColumnSchema {
  name: string;
  type: string;
  nullable?: boolean;
  isPrimary?: boolean;
  label?: string;
  foreignKey?: { targetTable: string; targetColumn: string };
}

interface TableSchema {
  name: string;
  displayName?: string;
  columns: ColumnSchema[];
  foreignKeys?: Record<string, { targetTable: string; targetColumn: string }>;
}

interface SchemaData {
  physicalTables: TableSchema[];
  customModules: TableSchema[];
  foreignKeyMap?: Record<string, { targetTable: string; targetColumn: string }>;
  columnToFkMap?: Record<string, { targetTable: string; targetColumn: string }>;
}

export const QueryExplorer = () => {
  const navigate = useNavigate();
  const { tenant, isBuilderFullscreen, setIsBuilderFullscreen } = usePlatform();
  const { session } = useAuth();

  useEffect(() => {
    setIsBuilderFullscreen(true);
    return () => {
      setIsBuilderFullscreen(false);
    };
  }, [setIsBuilderFullscreen]);
  const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token || localStorage.getItem('aurora_token') || 'dev-token';

  // UI State
  const [activeTab, setActiveTab] = useState<'results' | 'messages'>('results');
  const [editorHeight, setEditorHeight] = useState(300);
  const [sqlQuery, setSqlQuery] = useState<string>(`-- Write your PostgreSQL query here\nSELECT * FROM workspaces LIMIT 10;`);
  const [schema, setSchema] = useState<SchemaData>({ physicalTables: [], customModules: [] });
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [schemaSearch, setSchemaSearch] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'tables-folder': true,
    'modules-folder': true,
  });

  // Query Execution State
  const [executing, setExecuting] = useState(false);
  const [hasExecuted, setHasExecuted] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [consoleMessage, setConsoleMessage] = useState<string>('Ready.');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Referencing Record Popover State
  const [popoverState, setPopoverState] = useState<{
    isOpen: boolean;
    targetTable: string;
    targetColumn: string;
    value: string | number;
    anchorRect: DOMRect | null;
  }>({
    isOpen: false,
    targetTable: '',
    targetColumn: 'id',
    value: '',
    anchorRect: null
  });

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;

  // Identify active table from SQL query
  const activeTable = useMemo(() => {
    const match = sqlQuery.match(/(?:from|into|update)\s+["']?([a-zA-Z0-9_]+)["']?/i);
    if (!match) return null;
    const tblName = match[1].toLowerCase();
    return schema.physicalTables.find(t => t.name.toLowerCase() === tblName) ||
           schema.customModules.find(m => m.name.toLowerCase() === tblName || m.name.toLowerCase().replace(/\s+/g, '_') === tblName) || null;
  }, [sqlQuery, schema]);

  // Helper to resolve column metadata, primary key, and foreign key relations
  const getColumnMeta = (columnName: string): ColumnSchema => {
    const colLower = columnName.toLowerCase();
    
    // 1. Check active table definitions
    if (activeTable) {
      const found = activeTable.columns.find(c => c.name.toLowerCase() === colLower);
      if (found) return found;
      if (activeTable.foreignKeys && activeTable.foreignKeys[columnName]) {
        return {
          name: columnName,
          type: 'text',
          foreignKey: activeTable.foreignKeys[columnName]
        };
      }
    }

    // 2. Check global foreignKeyMap by table.column
    if (activeTable && schema.foreignKeyMap) {
      const directFk = schema.foreignKeyMap[`${activeTable.name}.${columnName}`];
      if (directFk) {
        return {
          name: columnName,
          type: 'text',
          foreignKey: directFk
        };
      }
    }

    // 3. Check global columnToFkMap fallback (e.g. session_id -> antigravity_sessions)
    if (schema.columnToFkMap && schema.columnToFkMap[columnName]) {
      return {
        name: columnName,
        type: 'text',
        foreignKey: schema.columnToFkMap[columnName]
      };
    }

    // 4. Heuristic inference for columns ending in _id
    if (colLower.endsWith('_id') && colLower !== 'id') {
      const baseName = colLower.slice(0, -3); // e.g. "session" -> "antigravity_sessions" or "sessions"
      const candidateTable = schema.physicalTables.find(t => 
        t.name.toLowerCase() === baseName || 
        t.name.toLowerCase() === `${baseName}s` ||
        t.name.toLowerCase() === `antigravity_${baseName}s` ||
        t.name.toLowerCase().includes(baseName)
      );
      if (candidateTable) {
        return {
          name: columnName,
          type: 'text',
          foreignKey: { targetTable: candidateTable.name, targetColumn: 'id' }
        };
      }
    }

    return {
      name: columnName,
      type: 'text',
      isPrimary: colLower === 'id'
    };
  };

  // Open table from referenced record popover
  const handleOpenTableFromReference = (targetTable: string, targetColumn: string, value: string | number) => {
    const isCustom = schema.customModules.some(m => m.name === targetTable);
    const safeTableName = targetTable.includes(' ') || isCustom ? `"${targetTable}"` : targetTable;
    const newQuery = `SELECT * FROM ${safeTableName} WHERE "${targetColumn}" = '${value}' LIMIT 50;`;
    
    setSqlQuery(newQuery);
    setActiveTab('results');
    toast.success(`Opening referencing record in public.${targetTable}`);

    // Trigger execution immediately
    handleExecuteQuery(newQuery);
  };

  // Load Schema
  const fetchSchema = async () => {
    try {
      setSchemaLoading(true);
      const { data: sessData } = await supabase.auth.getSession();
      const activeToken = sessData?.session?.access_token || token;
      const res = await fetch(`${API_BASE_URL}/api/query-explorer/schema`, {
        headers: {
          'Authorization': `Bearer ${activeToken}`,
          'x-tenant-id': tenant?.id || 't1'
        }
      });
      const data = await res.json();
      if (res.ok) {
        setSchema(data);
      } else {
        console.error('Failed to load schema:', data.error);
      }
    } catch (err) {
      console.error('Failed to load schema:', err);
    } finally {
      setSchemaLoading(false);
    }
  };

  useEffect(() => {
    if (tenant?.id && token) {
      fetchSchema();
    }
  }, [tenant?.id, token]);

  // Execute Query (with optional query override)
  const handleExecuteQuery = async (overrideQuery?: string) => {
    const queryToRun = overrideQuery || sqlQuery;
    if (!queryToRun.trim() || executing) return;

    setExecuting(true);
    setQueryError(null);
    setResults([]);
    setActiveTab('results');
    setConsoleMessage('Executing query...');

    try {
      const { data: sessData } = await supabase.auth.getSession();
      const activeToken = sessData?.session?.access_token || token;
      const res = await fetch(`${API_BASE_URL}/api/query-explorer/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`,
          'x-tenant-id': tenant?.id || 't1'
        },
        body: JSON.stringify({ query: queryToRun })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setResults(data.rows);
        setRowCount(data.rowCount);
        setDurationMs(data.durationMs);
        setHasExecuted(true);
        setConsoleMessage(`( ${data.rowCount} row(s) affected )\n\nCompletion time: ${new Date().toLocaleTimeString()}\nExecution time: ${data.durationMs} ms`);
      } else {
        const errMsg = data.error || 'Unknown query execution error.';
        setQueryError(errMsg);
        setActiveTab('messages');
        setConsoleMessage(`Msg 50000, Level 16, State 1\n[Error]: ${errMsg}\n\nCompletion time: ${new Date().toLocaleTimeString()}`);
      }
    } catch (err: any) {
      const errMsg = err.message || 'Network error executing query.';
      setQueryError(errMsg);
      setActiveTab('messages');
      setConsoleMessage(`[Network Error]: ${errMsg}\n\nCompletion time: ${new Date().toLocaleTimeString()}`);
    } finally {
      setExecuting(false);
      setCurrentPage(1);
    }
  };

  // Draggable Divider Resizer
  const handleStartResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = editorHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const newHeight = Math.max(150, Math.min(600, startHeight + deltaY));
      setEditorHeight(newHeight);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Expand/collapse node helpers
  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  // Double click table name to populate template SELECT query
  const handleNodeDoubleClick = (tableName: string) => {
    const isCustom = schema.customModules.some(m => m.name === tableName);
    const queryTableName = tableName.includes(' ') || isCustom ? `"${tableName}"` : tableName;
    const templateQuery = `SELECT * FROM ${queryTableName} LIMIT 50;`;
    setSqlQuery(templateQuery);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Filter schema tree by search query
  const filteredPhysicalTables = useMemo(() => {
    if (!schemaSearch) return schema.physicalTables;
    return schema.physicalTables.filter(t => 
      t.name.toLowerCase().includes(schemaSearch.toLowerCase()) ||
      t.columns.some(c => c.name.toLowerCase().includes(schemaSearch.toLowerCase()))
    );
  }, [schema.physicalTables, schemaSearch]);

  const filteredCustomModules = useMemo(() => {
    if (!schemaSearch) return schema.customModules;
    return schema.customModules.filter(m => 
      m.name.toLowerCase().includes(schemaSearch.toLowerCase()) ||
      m.columns.some(c => c.name.toLowerCase().includes(schemaSearch.toLowerCase()))
    );
  }, [schema.customModules, schemaSearch]);

  // Export Results to CSV
  const handleExportCSV = () => {
    if (results.length === 0) return;
    
    const headers = Object.keys(results[0]);
    const csvContent = [
      headers.join(','),
      ...results.map(row => 
        headers.map(header => {
          let val = row[header];
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') val = JSON.stringify(val);
          val = String(val).replace(/"/g, '""');
          return `"${val}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `query_results_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sorting logic for results table
  const sortedResults = useMemo(() => {
    if (!sortConfig) return results;
    return [...results].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      
      if (aVal === null || aVal === undefined) return sortConfig.direction === 'asc' ? -1 : 1;
      if (bVal === null || bVal === undefined) return sortConfig.direction === 'asc' ? 1 : -1;
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();
      if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [results, sortConfig]);

  // Pagination calculation
  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedResults.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedResults, currentPage]);

  const totalPages = Math.ceil(sortedResults.length / rowsPerPage);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className={cn(
      "flex w-full overflow-hidden bg-zinc-900 text-zinc-300 font-sans transition-all duration-300",
      isBuilderFullscreen ? "h-screen" : "h-[calc(100vh-64px)]"
    )}>
      {/* 1. Object Explorer (Sidebar) */}
      <div className="w-80 flex flex-col border-r border-zinc-800 bg-zinc-950 select-none">
        <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-200 font-bold text-xs tracking-wider uppercase">
            <button 
              onClick={() => {
                setIsBuilderFullscreen(false);
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/workspace/settings');
                }
              }}
              className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors cursor-pointer mr-0.5"
              title="Back to Previous Page"
            >
              <ArrowLeft size={14} />
            </button>
            <Database size={14} className="text-blue-400" />
            <span>Object Explorer</span>
          </div>
          <button 
            onClick={fetchSchema} 
            disabled={schemaLoading}
            className="text-zinc-500 hover:text-zinc-300 disabled:opacity-50 transition-colors"
            title="Refresh Schema"
          >
            <Loader2 size={12} className={cn("animate-spin", !schemaLoading && "hidden")} />
            {!schemaLoading && <span className="text-[10px] font-bold uppercase tracking-wider">Reload</span>}
          </button>
        </div>

        {/* Database Node Briefing */}
        <div className="px-3 py-2 bg-zinc-900/50 flex items-center gap-2 text-[11px] border-b border-zinc-800/80">
          <Database size={11} className="text-emerald-400" />
          <span className="font-semibold text-zinc-400 truncate">
            {tenant?.name || 'Local'} ({tenant?.slug || 'dev'})
          </span>
        </div>

        {/* Schema Tree Filter */}
        <div className="p-2 border-b border-zinc-850 relative">
          <input
            type="text"
            placeholder="Filter tables/columns..."
            value={schemaSearch}
            onChange={(e) => setSchemaSearch(e.target.value)}
            className="w-full pl-7 pr-3 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-300 focus:outline-none focus:border-zinc-700 placeholder-zinc-600"
          />
          <Search size={11} className="absolute left-4 top-3 text-zinc-600" />
        </div>

        {/* Tree Content */}
        <div className="flex-1 overflow-y-auto p-2 text-xs font-mono">
          {schemaLoading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-zinc-500">
              <Loader2 size={16} className="animate-spin text-blue-400" />
              <span>Cataloging schema...</span>
            </div>
          ) : (
            <div className="space-y-1">
              
              {/* Tables Folder */}
              <div>
                <div 
                  onClick={() => toggleNode('tables-folder')}
                  className="flex items-center gap-1.5 py-1 px-1.5 rounded hover:bg-zinc-900 cursor-pointer text-zinc-400 font-semibold"
                >
                  {expandedNodes['tables-folder'] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  {expandedNodes['tables-folder'] ? <FolderOpen size={12} className="text-amber-500" /> : <Folder size={12} className="text-amber-500" />}
                  <span>System Tables ({filteredPhysicalTables.length})</span>
                </div>

                {expandedNodes['tables-folder'] && (
                  <div className="pl-4 mt-0.5 space-y-1 border-l border-zinc-900 ml-3">
                    {filteredPhysicalTables.map(table => (
                      <div key={`table-${table.name}`}>
                        <div 
                          onClick={() => toggleNode(`table-${table.name}`)}
                          onDoubleClick={() => handleNodeDoubleClick(table.name)}
                          className="flex items-center gap-1.5 py-0.5 px-1.5 rounded hover:bg-zinc-850 cursor-pointer text-zinc-300 group"
                        >
                          {expandedNodes[`table-${table.name}`] ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                          <TableIcon size={11} className="text-blue-400" />
                          <span className="truncate">{table.name}</span>
                        </div>

                        {expandedNodes[`table-${table.name}`] && (
                          <div className="pl-4 mt-0.5 space-y-0.5 border-l border-zinc-900 ml-2">
                            {/* Columns Folder */}
                            <div>
                              <div 
                                onClick={() => toggleNode(`table-${table.name}-columns`)}
                                className="flex items-center gap-1 py-0.5 px-1.5 text-[10px] text-zinc-500 uppercase tracking-wider font-semibold cursor-pointer"
                              >
                                {expandedNodes[`table-${table.name}-columns`] !== false ? <ChevronDown size={8} /> : <ChevronRight size={8} />}
                                <ColumnsIcon size={10} />
                                <span>Columns</span>
                              </div>

                              {expandedNodes[`table-${table.name}-columns`] !== false && (
                                <div className="pl-4 space-y-0.5 mt-0.5">
                                  {table.columns.map(col => (
                                    <div key={`col-${table.name}-${col.name}`} className="flex items-center gap-1.5 py-0.5 text-zinc-400 select-text">
                                      {col.isPrimary ? <KeyIcon size={9} className="text-yellow-500 shrink-0" /> : <div className="w-2.5" />}
                                      <span className="text-zinc-300 font-semibold">{col.name}</span>
                                      <span className="text-zinc-650 text-[10px]">({col.type.toLowerCase()}{col.nullable ? ', null' : ''})</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom Modules (Virtual Tables) */}
              <div className="mt-2">
                <div 
                  onClick={() => toggleNode('modules-folder')}
                  className="flex items-center gap-1.5 py-1 px-1.5 rounded hover:bg-zinc-900 cursor-pointer text-zinc-400 font-semibold"
                >
                  {expandedNodes['modules-folder'] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  {expandedNodes['modules-folder'] ? <FolderOpen size={12} className="text-indigo-400" /> : <Folder size={12} className="text-indigo-400" />}
                  <span>Custom Modules ({filteredCustomModules.length})</span>
                </div>

                {expandedNodes['modules-folder'] && (
                  <div className="pl-4 mt-0.5 space-y-1 border-l border-zinc-900 ml-3">
                    {filteredCustomModules.map(module => (
                      <div key={`module-${module.name}`}>
                        <div 
                          onClick={() => toggleNode(`module-${module.name}`)}
                          onDoubleClick={() => handleNodeDoubleClick(module.name)}
                          className="flex items-center gap-1.5 py-0.5 px-1.5 rounded hover:bg-zinc-850 cursor-pointer text-zinc-300"
                        >
                          {expandedNodes[`module-${module.name}`] ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                          <TableIcon size={11} className="text-indigo-400" />
                          <span className="truncate">{module.name}</span>
                        </div>

                        {expandedNodes[`module-${module.name}`] && (
                          <div className="pl-4 mt-0.5 space-y-0.5 border-l border-zinc-900 ml-2">
                            {/* Columns Folder */}
                            <div>
                              <div 
                                onClick={() => toggleNode(`module-${module.name}-columns`)}
                                className="flex items-center gap-1 py-0.5 px-1.5 text-[10px] text-zinc-500 uppercase tracking-wider font-semibold cursor-pointer"
                              >
                                {expandedNodes[`module-${module.name}-columns`] !== false ? <ChevronDown size={8} /> : <ChevronRight size={8} />}
                                <ColumnsIcon size={10} />
                                <span>Fields (Columns)</span>
                              </div>

                              {expandedNodes[`module-${module.name}-columns`] !== false && (
                                <div className="pl-4 space-y-0.5 mt-0.5">
                                  {module.columns.map(col => (
                                    <div key={`mcol-${module.name}-${col.name}`} className="flex items-center gap-1.5 py-0.5 text-zinc-400 select-text">
                                      <div className="w-2.5" />
                                      <span className="text-zinc-300 font-semibold">{col.name}</span>
                                      <span className="text-zinc-600 text-[10px]">({col.type.toLowerCase()})</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>

      {/* 2. Main Query Workspace Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-zinc-900">
        
        {/* Top Control Bar */}
        <div className="h-11 border-b border-zinc-800 bg-zinc-950 flex items-center px-4 justify-between select-none">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsBuilderFullscreen(false);
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/workspace/settings');
                }
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 rounded text-xs transition-all cursor-pointer font-medium mr-1.5 shadow-xs"
              title="Exit Query Explorer and return to previous page"
            >
              <ArrowLeft size={13} />
              <span>Back</span>
            </button>

            <div className="w-[1px] h-5 bg-zinc-800 mr-1.5" />

            <button
              onClick={handleExecuteQuery}
              disabled={executing || !sqlQuery.trim()}
              className="flex items-center gap-1.5 px-3 py-1 bg-emerald-700 hover:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-500 rounded text-xs text-white font-semibold shadow-sm transition-colors cursor-pointer"
              title="Execute SQL Query (Ctrl+Enter)"
            >
              {executing ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Play size={12} fill="currentColor" />
              )}
              <span>Execute</span>
            </button>
            
            <div className="w-[1px] h-5 bg-zinc-800 mx-2" />

            <button
              onClick={() => setSqlQuery('')}
              className="flex items-center gap-1 px-2.5 py-1 text-zinc-450 hover:text-zinc-200 text-xs rounded transition-colors"
              title="Clear Editor"
            >
              <Trash2 size={12} />
              <span>Clear</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={results.length === 0}
              className="flex items-center gap-1 px-2.5 py-1 text-zinc-450 hover:text-zinc-200 disabled:text-zinc-700 disabled:cursor-not-allowed text-xs rounded transition-colors"
              title="Download results as CSV"
            >
              <Download size={12} />
              <span>Export CSV</span>
            </button>

            <div className="w-[1px] h-5 bg-zinc-800 mx-2" />

            <button
              onClick={() => {
                setIsBuilderFullscreen(false);
                navigate('/workspace/settings/platform-modules/queries-library', {
                  state: { prefillSql: sqlQuery }
                });
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 text-indigo-400 hover:text-indigo-200 bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-500/30 text-xs rounded-lg transition-all font-medium cursor-pointer shadow-xs"
              title="Open in Query Builder to save as a reusable dataset"
            >
              <Sparkles size={12} />
              <span>Save to Query Builder</span>
            </button>
          </div>

          {/* Indicators */}
          <div className="flex items-center gap-3">

            <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
            {executing ? (
              <span className="text-blue-400 flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" />
                Executing query...
              </span>
            ) : queryError ? (
              <span className="text-rose-400 flex items-center gap-1">
                <AlertTriangle size={12} />
                Failed
              </span>
            ) : rowCount > 0 ? (
              <span className="text-zinc-400 flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-emerald-500" />
                Query executed: {rowCount} rows ({durationMs}ms)
              </span>
            ) : (
              <span>Ready</span>
            )}
            </div>
          </div>
        </div>

        {/* 3. Monospace Code Editor (Variable Height) */}
        <div 
          style={{ height: editorHeight }}
          className="relative flex flex-col overflow-hidden border-b border-zinc-800 bg-zinc-950 font-mono text-[13px] leading-relaxed"
        >
          <SqlEditor
            value={sqlQuery}
            onChange={setSqlQuery}
            tables={schema.physicalTables}
            customModules={schema.customModules}
            onRun={handleExecuteQuery}
          />
        </div>

        {/* 4. Draggable Divider Resizer */}
        <div 
          onMouseDown={handleStartResize}
          className="h-1.5 bg-zinc-800 hover:bg-blue-500 transition-colors cursor-row-resize select-none shrink-0"
          title="Drag to resize query window"
        />

        {/* 5. Bottom Pane: Results & Messages Tabs */}
        <div className="flex-1 flex flex-col bg-zinc-900 overflow-hidden">
          
          {/* Tabs navigation */}
          <div className="h-9 border-b border-zinc-800 bg-zinc-950 flex items-center px-4 select-none shrink-0">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('results')}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-t transition-colors",
                  activeTab === 'results' 
                    ? "bg-zinc-900 text-zinc-200 border-t-2 border-blue-500" 
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                Results
              </button>
              <button
                onClick={() => setActiveTab('messages')}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-t transition-colors",
                  activeTab === 'messages' 
                    ? "bg-zinc-900 text-zinc-200 border-t-2 border-blue-500" 
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                Messages
              </button>
            </div>
          </div>

          {/* Tab Contents */}
          <div className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait">
              {activeTab === 'results' ? (
                <motion.div
                  key="results-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full flex flex-col"
                >
                  {executing ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900/80">
                      <Loader2 className="animate-spin text-blue-500" size={28} />
                      <span className="text-zinc-400 font-semibold text-xs tracking-wider uppercase">Executing Query...</span>
                    </div>
                  ) : results.length > 0 ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                      {/* Grid Data Container */}
                      <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
                        <table className="min-w-full w-max border-collapse text-left font-mono text-xs text-zinc-350 select-text">
                          <thead className="sticky top-0 bg-zinc-950 text-zinc-400 font-semibold border-b border-zinc-800 z-10 select-none">
                            <tr>
                              <th className="px-2 py-2 border-r border-zinc-800 w-12 text-center text-zinc-600 bg-zinc-950 font-sans">#</th>
                              {Object.keys(results[0]).map(header => {
                                const meta = getColumnMeta(header);
                                return (
                                  <th 
                                    key={`header-${header}`}
                                    onClick={() => requestSort(header)}
                                    className="px-3 py-2 border-r border-zinc-800 hover:bg-zinc-850 cursor-pointer group whitespace-nowrap min-w-[120px]"
                                  >
                                    <div className="flex items-center gap-1.5">
                                      {meta.isPrimary ? (
                                        <KeyIcon size={11} className="text-yellow-500 shrink-0" title="Primary Key" />
                                      ) : meta.foreignKey ? (
                                        <Link2 size={11} className="text-emerald-400 shrink-0" title={`Foreign Key -> ${meta.foreignKey.targetTable}.${meta.foreignKey.targetColumn}`} />
                                      ) : null}
                                      <span className="text-zinc-200">{header}</span>
                                      {meta.type && (
                                        <span className="text-[10px] text-zinc-500 font-normal lowercase">{meta.type}</span>
                                      )}
                                      <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors ml-auto">
                                        {sortConfig?.key === header 
                                          ? (sortConfig.direction === 'asc' ? '▲' : '▼')
                                          : '↕'}
                                      </span>
                                    </div>
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedResults.map((row, idx) => {
                              const globalRowIdx = (currentPage - 1) * rowsPerPage + idx + 1;
                              return (
                                <tr 
                                  key={`row-${idx}`}
                                  className="border-b border-zinc-850 hover:bg-zinc-800/40 odd:bg-zinc-900/30 even:bg-zinc-900/60"
                                >
                                  <td className="px-2 py-1.5 border-r border-zinc-850 text-center text-zinc-600 select-none font-sans bg-zinc-950/20">
                                    {globalRowIdx}
                                  </td>
                                  {Object.keys(row).map(key => {
                                    let cellVal = row[key];
                                    let isNull = cellVal === null || cellVal === undefined;
                                    let cellString = '';

                                    if (isNull) {
                                      cellString = 'null';
                                    } else if (typeof cellVal === 'object') {
                                      cellString = JSON.stringify(cellVal);
                                    } else {
                                      cellString = String(cellVal);
                                    }

                                    const meta = getColumnMeta(key);
                                    const isForeignKey = !isNull && cellString !== '' && Boolean(meta.foreignKey);

                                    return (
                                      <td 
                                        key={`cell-${idx}-${key}`}
                                        className={cn(
                                          "px-3 py-1.5 border-r border-zinc-850 min-w-[120px] max-w-md whitespace-nowrap group/cell relative",
                                          isNull && "text-zinc-600 italic font-sans"
                                        )}
                                      >
                                        <div className="flex items-center justify-between gap-1.5">
                                          <span className="truncate" title={cellString}>{cellString}</span>

                                          {isForeignKey && meta.foreignKey && (
                                            <div className="relative group/fk inline-flex items-center shrink-0">
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setPopoverState({
                                                    isOpen: true,
                                                    targetTable: meta.foreignKey!.targetTable,
                                                    targetColumn: meta.foreignKey!.targetColumn || 'id',
                                                    value: cellVal,
                                                    anchorRect: e.currentTarget.getBoundingClientRect()
                                                  });
                                                }}
                                                className="p-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all cursor-pointer border border-zinc-700/60 shadow-sm ml-1.5"
                                                title="View referencing record"
                                              >
                                                <ArrowRight size={10} />
                                              </button>
                                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/fk:flex items-center px-2 py-0.5 rounded bg-zinc-950 text-zinc-200 text-[10px] whitespace-nowrap border border-zinc-800 shadow-xl pointer-events-none z-30 font-sans">
                                                View referencing record
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="h-10 border-t border-zinc-850 bg-zinc-950 px-4 flex items-center justify-between select-none text-xs text-zinc-500 shrink-0">
                          <div>
                            Showing { (currentPage - 1) * rowsPerPage + 1 } - { Math.min(currentPage * rowsPerPage, results.length) } of { results.length } rows
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => setCurrentPage(1)}
                              disabled={currentPage === 1}
                              className="px-2 py-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-30 rounded text-zinc-300 font-semibold"
                            >
                              First
                            </button>
                            <button
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                              className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-30 rounded text-zinc-300 font-semibold"
                            >
                              Prev
                            </button>
                            <div className="px-3 py-1 flex items-center text-zinc-400 font-semibold">
                              Page {currentPage} of {totalPages}
                            </div>
                            <button
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={currentPage === totalPages}
                              className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-30 rounded text-zinc-300 font-semibold"
                            >
                              Next
                            </button>
                            <button
                              onClick={() => setCurrentPage(totalPages)}
                              disabled={currentPage === totalPages}
                              className="px-2 py-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-30 rounded text-zinc-300 font-semibold"
                            >
                              Last
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : queryError ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 gap-2 bg-zinc-900">
                      <AlertTriangle className="text-rose-500" size={32} />
                      <span className="text-zinc-300 font-bold text-sm">Execution Failed</span>
                      <p className="text-zinc-500 text-xs text-center max-w-lg font-mono">
                        {queryError}
                      </p>
                      <button 
                        onClick={() => setActiveTab('messages')}
                        className="mt-2 text-xs text-blue-400 hover:underline"
                      >
                        View console messages
                      </button>
                    </div>
                  ) : hasExecuted ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 gap-3 text-center max-w-md mx-auto bg-zinc-900/50">
                      <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 shadow-sm">
                        <Database size={28} className="opacity-50" />
                      </div>
                      <span className="font-bold text-sm text-zinc-200">0 Rows Returned</span>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Query completed in <span className="font-mono text-emerald-400">⚡{durationMs}ms</span> with 0 affected rows.
                      </p>
                      <div className="text-[11px] text-zinc-400 bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 text-left space-y-1">
                        <p className="font-semibold text-zinc-300">💡 Why are no rows returned?</p>
                        <p className="text-zinc-500 leading-normal">
                          Multi-tenant Row Level Security (RLS) is active for tenant <strong className="text-zinc-300">{tenant?.name || 'Current Tenant'}</strong> (<span className="text-zinc-400 font-mono">{tenant?.id || 't1'}</span>). Tables containing tenant data (e.g. <code className="text-indigo-300 font-mono">records</code>) only expose rows matching the current tenant context.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-650 bg-zinc-900/50">
                      <Terminal size={36} className="text-zinc-800" />
                      <span className="font-semibold text-xs tracking-wider uppercase">Execute query to view results</span>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="messages-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full p-4 bg-zinc-950 font-mono text-[12px] leading-relaxed text-zinc-300 overflow-y-auto whitespace-pre select-text selection:bg-zinc-800"
                >
                  <div className={cn(queryError ? "text-rose-400" : "text-zinc-400")}>
                    {consoleMessage}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </div>

      {/* Referencing Record Inline Preview Popover */}
      <ReferencingRecordPopover
        isOpen={popoverState.isOpen}
        onClose={() => setPopoverState(prev => ({ ...prev, isOpen: false }))}
        targetTable={popoverState.targetTable}
        targetColumn={popoverState.targetColumn}
        value={popoverState.value}
        anchorRect={popoverState.anchorRect}
        onOpenTable={handleOpenTableFromReference}
      />

    </div>
  );
};
export default QueryExplorer;
