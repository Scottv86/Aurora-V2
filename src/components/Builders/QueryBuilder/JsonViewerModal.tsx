import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Copy, 
  Check, 
  Search, 
  Code, 
  Table as TableIcon, 
  ListTree, 
  ChevronRight, 
  ChevronDown, 
  Terminal,
  Tag
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';

export interface FieldMetaInfo {
  id: string;
  label: string;
  name?: string; // slug
  type?: string;
  moduleName?: string;
}

export type KeyDisplayMode = 'both' | 'label' | 'slug' | 'id';

interface JsonViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  columnName: string;
  data: any;
  rowIndex?: number;
  fieldDictionary?: Record<string, FieldMetaInfo>;
  onPromoteToSql?: (columnName: string, path: string[], asAlias: string) => void;
}

type TabType = 'tree' | 'table' | 'raw';

// Recursive Tree Node Component
interface TreeNodeProps {
  label: string;
  value: any;
  path: string[];
  depth?: number;
  searchFilter: string;
  keyDisplayMode: KeyDisplayMode;
  fieldDictionary?: Record<string, FieldMetaInfo>;
  onCopyPath: (path: string[]) => void;
  onPromote?: (path: string[], alias: string) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  label,
  value,
  path,
  depth = 0,
  searchFilter,
  keyDisplayMode,
  fieldDictionary,
  onCopyPath,
  onPromote
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(depth < 2);
  const [copied, setCopied] = useState(false);

  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);

  // Field schema metadata
  const fieldMeta = fieldDictionary?.[label];

  // Format label based on user display preference
  const displayLabel = useMemo(() => {
    if (!fieldMeta) return label;
    if (keyDisplayMode === 'label') return fieldMeta.label;
    if (keyDisplayMode === 'slug') return fieldMeta.name || fieldMeta.label;
    if (keyDisplayMode === 'id') return fieldMeta.id || label;
    // 'both' mode: show human label as primary
    return fieldMeta.label;
  }, [fieldMeta, label, keyDisplayMode]);

  const secondaryPill = useMemo(() => {
    if (!fieldMeta) return null;
    if (keyDisplayMode === 'both') {
      return fieldMeta.name ? fieldMeta.name : (fieldMeta.id !== fieldMeta.label ? fieldMeta.id : null);
    }
    if (keyDisplayMode === 'label' && fieldMeta.name && fieldMeta.name !== fieldMeta.label) {
      return fieldMeta.name;
    }
    return null;
  }, [fieldMeta, keyDisplayMode]);

  const rawKeySubtitle = useMemo(() => {
    if (!fieldMeta || keyDisplayMode === 'id') return null;
    if (fieldMeta.id && fieldMeta.id.startsWith('field-')) {
      return fieldMeta.id;
    }
    return null;
  }, [fieldMeta, keyDisplayMode]);

  const matchesFilter = useMemo(() => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    if (label.toLowerCase().includes(q)) return true;
    if (fieldMeta?.label.toLowerCase().includes(q)) return true;
    if (fieldMeta?.name?.toLowerCase().includes(q)) return true;
    if (fieldMeta?.moduleName?.toLowerCase().includes(q)) return true;
    if (!isObject && String(value).toLowerCase().includes(q)) return true;
    if (isObject) {
      return JSON.stringify(value).toLowerCase().includes(q);
    }
    return false;
  }, [label, value, isObject, searchFilter, fieldMeta]);

  if (!matchesFilter) return null;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value));
    setCopied(true);
    toast.success(`Copied ${displayLabel} to clipboard`);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleCopySqlPath = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopyPath(path);
  };

  // Best alias for SQL: prefer slug (name), then clean label, then raw label
  const sqlAlias = fieldMeta?.name || (fieldMeta?.label ? fieldMeta.label.toLowerCase().replace(/[^a-z0-9_]/g, '_') : label);

  return (
    <div className="text-xs font-mono select-text" style={{ paddingLeft: `${depth * 14}px` }}>
      <div 
        className={cn(
          "flex items-center gap-1.5 py-1 px-1.5 rounded-lg group hover:bg-zinc-800/60 cursor-pointer transition-colors",
          !isObject && "cursor-default"
        )}
        onClick={() => isObject && setIsExpanded(!isExpanded)}
      >
        {isObject ? (
          <button 
            type="button" 
            className="text-zinc-400 hover:text-white p-0.5 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        ) : (
          <span className="w-3.5 inline-block text-zinc-600">•</span>
        )}

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn(
            "font-semibold",
            fieldMeta ? "text-indigo-200" : "text-indigo-300"
          )}>
            {displayLabel}:
          </span>

          {secondaryPill && (
            <span className="px-1.5 py-0.2 rounded bg-indigo-950/80 border border-indigo-800/50 text-[10px] text-indigo-300 font-sans">
              {secondaryPill}
            </span>
          )}

          {rawKeySubtitle && (
            <span 
              className="text-[9px] text-zinc-500 hover:text-zinc-400 font-mono"
              title={`Internal Database Key: ${rawKeySubtitle}${fieldMeta?.moduleName ? ` • Module: ${fieldMeta.moduleName}` : ''}`}
            >
              ({rawKeySubtitle})
            </span>
          )}
        </div>

        {isObject ? (
          <span className="text-zinc-500 text-[11px] ml-1">
            {isArray ? `Array(${value.length})` : `Object {${Object.keys(value).length}}`}
          </span>
        ) : value === null ? (
          <span className="text-zinc-500 italic ml-1">null</span>
        ) : typeof value === 'string' ? (
          <span className="text-emerald-400 break-all ml-1">"{value}"</span>
        ) : typeof value === 'number' ? (
          <span className="text-amber-400 font-bold ml-1">{value}</span>
        ) : typeof value === 'boolean' ? (
          <span className="text-purple-400 font-bold ml-1">{value ? 'true' : 'false'}</span>
        ) : (
          <span className="text-zinc-300 break-all ml-1">{String(value)}</span>
        )}

        {/* Action icons on hover */}
        <div className="ml-auto opacity-0 group-hover:opacity-100 flex items-center gap-1.5 transition-opacity">
          <button
            type="button"
            onClick={handleCopy}
            title="Copy value"
            className="p-1 hover:text-white text-zinc-400 hover:bg-zinc-700/60 rounded cursor-pointer"
          >
            {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          </button>

          <button
            type="button"
            onClick={handleCopySqlPath}
            title="Copy PostgreSQL Path"
            className="px-1.5 py-0.5 text-[10px] bg-zinc-800 hover:bg-indigo-600/40 text-zinc-400 hover:text-indigo-200 border border-zinc-700 rounded flex items-center gap-1 cursor-pointer"
          >
            <span>SQL Path</span>
          </button>

          {onPromote && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPromote(path, sqlAlias);
              }}
              title={`Add to query: SELECT ... ${path[0]} AS ${sqlAlias}`}
              className="px-1.5 py-0.5 text-[10px] bg-indigo-600/20 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 rounded flex items-center gap-1 cursor-pointer font-sans"
            >
              <span>+ SQL</span>
            </button>
          )}
        </div>
      </div>

      {isObject && isExpanded && (
        <div className="border-l border-zinc-800/80 ml-2">
          {Object.entries(value).map(([k, v]) => (
            <TreeNode
              key={k}
              label={k}
              value={v}
              path={[...path, k]}
              depth={depth + 1}
              searchFilter={searchFilter}
              keyDisplayMode={keyDisplayMode}
              fieldDictionary={fieldDictionary}
              onCopyPath={onCopyPath}
              onPromote={onPromote}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const JsonViewerModal: React.FC<JsonViewerModalProps> = ({
  isOpen,
  onClose,
  columnName,
  data,
  rowIndex,
  fieldDictionary = {},
  onPromoteToSql
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('tree');
  const [keyDisplayMode, setKeyDisplayMode] = useState<KeyDisplayMode>('both');
  const [searchFilter, setSearchFilter] = useState('');
  const [isCopiedAll, setIsCopiedAll] = useState(false);

  // Normalize data in case it's a stringified JSON
  const parsedData = useMemo(() => {
    if (data === null || data === undefined) return null;
    if (typeof data === 'object') return data;
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }, [data]);

  // Build PostgreSQL access path helper
  const getPostgresPath = (path: string[]) => {
    if (path.length === 0) return columnName;
    if (path.length === 1) {
      return `${columnName}->>'${path[0]}'`;
    }
    const leading = path.slice(0, -1).map(p => `'${p}'`).join('->');
    const last = path[path.length - 1];
    return `${columnName}->${leading}->>'${last}'`;
  };

  const handleCopyPath = (path: string[]) => {
    const expr = getPostgresPath(path);
    navigator.clipboard.writeText(expr);
    toast.success(`Copied SQL path: ${expr}`);
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(JSON.stringify(parsedData, null, 2));
    setIsCopiedAll(true);
    toast.success('Full JSON copied to clipboard');
    setTimeout(() => setIsCopiedAll(false), 1500);
  };

  // Top level entries for Table view with enriched metadata
  const topLevelEntries = useMemo(() => {
    if (!parsedData || typeof parsedData !== 'object') return [];
    return Object.entries(parsedData)
      .map(([k, v]) => {
        const meta = fieldDictionary[k];
        return {
          key: k,
          val: v,
          label: meta?.label || k,
          slug: meta?.name || (meta?.label ? meta.label.toLowerCase().replace(/[^a-z0-9_]/g, '_') : k),
          type: meta?.type || (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v),
          moduleName: meta?.moduleName
        };
      })
      .filter(item => {
        if (!searchFilter.trim()) return true;
        const q = searchFilter.toLowerCase();
        return (
          item.key.toLowerCase().includes(q) ||
          item.label.toLowerCase().includes(q) ||
          item.slug.toLowerCase().includes(q) ||
          (item.moduleName && item.moduleName.toLowerCase().includes(q)) ||
          String(item.val).toLowerCase().includes(q)
        );
      });
  }, [parsedData, searchFilter, fieldDictionary]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 select-none">
          {/* Backdrop with Aurora blur and smooth fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Modal Dialog with signature Aurora spring scale and slide in/out */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-4xl max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-zinc-200 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-950/70">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-mono text-sm font-bold shadow-inner">
                  {"{ }"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">JSON Inspector</h3>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-950/70 border border-indigo-800/60 text-[11px] font-mono text-indigo-300">
                      {columnName}
                    </span>
                    {rowIndex !== undefined && (
                      <span className="text-xs text-zinc-500">Row #{rowIndex + 1}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400">Inspect structure, copy values, and generate PostgreSQL paths</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl transition-all cursor-pointer font-medium"
                >
                  {isCopiedAll ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>Copy JSON</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Toolbar: Views & Display Mode Toggles */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 border-b border-zinc-800/60 bg-zinc-900/40">
              <div className="flex items-center gap-2">
                {/* View Tabs */}
                <div className="flex items-center gap-1 bg-zinc-950/80 p-1 rounded-xl border border-zinc-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab('tree')}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer font-medium",
                      activeTab === 'tree' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    <ListTree size={13} />
                    <span>Tree View</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('table')}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer font-medium",
                      activeTab === 'table' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    <TableIcon size={13} />
                    <span>Table View</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('raw')}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer font-medium",
                      activeTab === 'raw' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    <Code size={13} />
                    <span>Raw JSON</span>
                  </button>
                </div>

                {/* Key Display Mode Switcher (Labels vs Slugs vs IDs) */}
                {activeTab !== 'raw' && (
                  <div className="flex items-center gap-1 bg-zinc-950/80 p-1 rounded-xl border border-zinc-800 text-[11px] font-sans">
                    <span className="text-zinc-500 px-1.5 flex items-center gap-1">
                      <Tag size={11} />
                      <span>Keys:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setKeyDisplayMode('both')}
                      className={cn(
                        "px-2 py-0.5 rounded-md transition-all cursor-pointer font-medium",
                        keyDisplayMode === 'both' ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-zinc-200"
                      )}
                      title="Show Field Label and Slug"
                    >
                      Both
                    </button>
                    <button
                      type="button"
                      onClick={() => setKeyDisplayMode('label')}
                      className={cn(
                        "px-2 py-0.5 rounded-md transition-all cursor-pointer font-medium",
                        keyDisplayMode === 'label' ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-zinc-200"
                      )}
                      title="Show Field Label only"
                    >
                      Label
                    </button>
                    <button
                      type="button"
                      onClick={() => setKeyDisplayMode('slug')}
                      className={cn(
                        "px-2 py-0.5 rounded-md transition-all cursor-pointer font-medium",
                        keyDisplayMode === 'slug' ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-zinc-200"
                      )}
                      title="Show Developer Slug only"
                    >
                      Slug
                    </button>
                    <button
                      type="button"
                      onClick={() => setKeyDisplayMode('id')}
                      className={cn(
                        "px-2 py-0.5 rounded-md transition-all cursor-pointer font-medium",
                        keyDisplayMode === 'id' ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-zinc-200"
                      )}
                      title="Show Raw Database Key / ID"
                    >
                      Raw ID
                    </button>
                  </div>
                )}
              </div>

              {/* Search Filter */}
              {activeTab !== 'raw' && (
                <div className="relative min-w-[240px]">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    placeholder="Search labels, slugs, or values..."
                    className="w-full pl-8 pr-7 py-1 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  {searchFilter && (
                    <button
                      onClick={() => setSearchFilter('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Body View Area */}
            <div className="flex-1 overflow-auto p-6 min-h-[340px] max-h-[560px] bg-zinc-950/40">
              {parsedData === null || parsedData === undefined ? (
                <div className="h-48 flex items-center justify-center text-zinc-500 text-xs italic">
                  Value is null or undefined
                </div>
              ) : activeTab === 'tree' ? (
                <div className="space-y-1">
                  {typeof parsedData === 'object' ? (
                    Object.entries(parsedData).map(([key, val]) => (
                      <TreeNode
                        key={key}
                        label={key}
                        value={val}
                        path={[key]}
                        searchFilter={searchFilter}
                        keyDisplayMode={keyDisplayMode}
                        fieldDictionary={fieldDictionary}
                        onCopyPath={handleCopyPath}
                        onPromote={onPromoteToSql ? (path, alias) => onPromoteToSql(columnName, path, alias) : undefined}
                      />
                    ))
                  ) : (
                    <div className="text-xs font-mono text-zinc-300">{String(parsedData)}</div>
                  )}
                </div>
              ) : activeTab === 'table' ? (
                <div className="rounded-2xl border border-zinc-800/80 overflow-hidden bg-zinc-950">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-900/70 text-zinc-400 font-semibold font-mono text-[11px]">
                        <th className="px-3.5 py-2.5">Field / Label</th>
                        <th className="px-3.5 py-2.5">Slug</th>
                        <th className="px-3.5 py-2.5">Key / ID</th>
                        <th className="px-3.5 py-2.5">Type</th>
                        <th className="px-3.5 py-2.5">Value Preview</th>
                        <th className="px-3.5 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50 font-mono text-[11px]">
                      {topLevelEntries.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-zinc-500 italic">
                            {searchFilter ? 'No matching fields found' : 'No properties found'}
                          </td>
                        </tr>
                      ) : (
                        topLevelEntries.map((item) => (
                          <tr key={item.key} className="hover:bg-zinc-900/40 transition-colors">
                            <td className="px-3.5 py-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-indigo-200 font-sans">{item.label}</span>
                                {item.moduleName && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 font-sans">
                                    {item.moduleName}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3.5 py-2.5 text-indigo-300 font-mono text-[11px]">{item.slug}</td>
                            <td className="px-3.5 py-2.5 text-zinc-500 font-mono text-[10px]">{item.key}</td>
                            <td className="px-3.5 py-2.5 text-zinc-400 text-[10px] uppercase">{item.type}</td>
                            <td className="px-3.5 py-2.5 text-zinc-300 truncate max-w-[200px]">
                              {typeof item.val === 'object' ? JSON.stringify(item.val) : String(item.val)}
                            </td>
                            <td className="px-3.5 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleCopyPath([item.key])}
                                  title={`Copy ${columnName}->>'${item.key}'`}
                                  className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md border border-zinc-700 cursor-pointer"
                                >
                                  SQL
                                </button>
                                {onPromoteToSql && (
                                  <button
                                    type="button"
                                    onClick={() => onPromoteToSql(columnName, [item.key], item.slug)}
                                    title={`Add to query: SELECT ... ${columnName}->>'${item.key}' AS ${item.slug}`}
                                    className="px-2 py-0.5 text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white rounded-md font-sans font-medium cursor-pointer"
                                  >
                                    + Select
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <pre className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 font-mono text-xs text-zinc-300 leading-relaxed overflow-auto whitespace-pre">
                  {JSON.stringify(parsedData, null, 2)}
                </pre>
              )}
            </div>

            {/* Footer info banner */}
            <div className="px-6 py-3 border-t border-zinc-800/80 bg-zinc-950/80 flex items-center justify-between text-xs text-zinc-400">
              <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-500">
                <Terminal size={12} className="text-indigo-400" />
                <span>Postgres syntax: <code className="text-zinc-300">{columnName}-&gt;&gt;'{'{id}'}' AS slug</code></span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
