import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileSpreadsheet, X, AlertCircle, 
  Trash2, Plus, RefreshCw, Upload,
  CheckCircle2, Sparkles
} from 'lucide-react';
import { Button, AuroraSpinner } from '../UI/Primitives';
import { Module } from '../../types/platform';
import { flattenFields, cn, slugify } from '../../lib/utils';
import { bulkCreateRecords } from '../../services/dataService';
import { toast } from 'sonner';

export interface BulkPasteRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  module: Module | any;
  tenantId: string;
  token: string;
  defaultValues?: Record<string, any>;
  onSuccess?: (result?: any) => void;
}

interface ColumnMapping {
  colIndex: number;
  originalHeader: string;
  targetFieldId: string; // field id, or '__IGNORE__'
}

interface RowValidationError {
  fieldId: string;
  fieldLabel: string;
  message: string;
}

interface ParsedRowState {
  id: string;
  rawValues: string[];
  data: Record<string, any>;
  errors: RowValidationError[];
  isValid: boolean;
}

const ROW_HEIGHT = 42;
const OVERSCAN_COUNT = 15;

export const BulkPasteRecordModal: React.FC<BulkPasteRecordModalProps> = ({
  isOpen,
  onClose,
  module,
  tenantId,
  token,
  defaultValues = {},
  onSuccess
}) => {
  const [rawPastedText, setRawPastedText] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [rows, setRows] = useState<ParsedRowState[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'errors' | 'valid'>('all');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; colIdx: number } | null>(null);
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [containerHeight, setContainerHeight] = useState<number>(400);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Extract valid target module fields across all module schema formats
  const moduleFields = useMemo(() => {
    if (!module) return [];
    
    let rawLayout: any[] = [];
    if (Array.isArray(module.layout)) {
      rawLayout = module.layout;
    } else if (Array.isArray(module.config?.layout)) {
      rawLayout = module.config.layout;
    } else if (typeof module.config === 'string') {
      try {
        const parsed = JSON.parse(module.config);
        if (Array.isArray(parsed.layout)) rawLayout = parsed.layout;
        else if (Array.isArray(parsed.fields)) rawLayout = parsed.fields;
      } catch (e) {
        // ignore
      }
    } else if (Array.isArray(module.fields)) {
      rawLayout = module.fields;
    } else if (Array.isArray(module.config?.fields)) {
      rawLayout = module.config.fields;
    } else if (Array.isArray(module.columns)) {
      rawLayout = module.columns.map((c: any) => typeof c === 'string' ? { id: c, label: c, type: 'text' } : c);
    }

    const all = flattenFields(rawLayout || []);
    const nonDataTypes = ['heading', 'divider', 'spacer', 'alert', 'button', 'group', 'fieldGroup', 'repeatableGroup', 'card', 'accordion', 'tabs_nested', 'stepper', 'timeline'];
    
    const extracted = all
      .filter((f: any) => f && (f.id || f.name || f.label) && !nonDataTypes.includes(f.type))
      .map((f: any) => ({
        ...f,
        id: f.id || slugify(f.label || f.name),
        label: f.label || f.name || f.id
      }));

    // If common fields like status or title are not explicitly in layout, offer them
    if (!extracted.some((f: any) => f.id === 'status')) {
      extracted.push({ id: 'status', label: 'Status', type: 'select', options: ['Open', 'In Progress', 'Completed', 'Closed', 'Active', 'Inactive'] });
    }
    if (!extracted.some((f: any) => f.id === 'title' || f.id === 'name')) {
      extracted.push({ id: 'title', label: 'Title / Subject', type: 'text' });
    }

    return extracted;
  }, [module]);

  const requiredFields = useMemo(() => {
    return moduleFields.filter((f: any) => f.required);
  }, [moduleFields]);

  // Intelligent header matching against schema fields & semantic aliases
  const matchHeaderToField = useCallback((headerText: string, fields: any[]): any | null => {
    if (!headerText || !fields || fields.length === 0) return null;
    const cleanHeader = headerText.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. Exact ID or Label match
    const exact = fields.find((f: any) => {
      const fId = String(f.id || '').toLowerCase();
      const fLabel = String(f.label || f.name || '').toLowerCase();
      return fId === headerText.toLowerCase() || fLabel === headerText.toLowerCase();
    });
    if (exact) return exact;

    // 2. Normalized alphanumeric match
    const normalized = fields.find((f: any) => {
      const cleanId = String(f.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanLabel = String(f.label || f.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const slugLabel = slugify(f.label || f.name || '').replace(/[^a-z0-9]/g, '');
      return cleanHeader === cleanId || cleanHeader === cleanLabel || cleanHeader === slugLabel;
    });
    if (normalized) return normalized;

    // 3. Synonym / Semantic alias mapping
    const aliasMap: Record<string, string[]> = {
      first_name: ['firstname', 'first', 'fname', 'givenname'],
      last_name: ['lastname', 'last', 'lname', 'surname', 'familyname'],
      email: ['mail', 'emailaddress', 'useremail', 'workemail', 'personalemail'],
      phone: ['phonenumber', 'telephone', 'mobile', 'cell'],
      username: ['user', 'login', 'account', 'handle', 'uname'],
      identifier: ['id', 'code', 'number', 'key', 'ref', 'reference', 'appid', 'recordid'],
      title: ['name', 'subject', 'headline', 'itemname', 'recordname', 'application'],
      description: ['details', 'notes', 'summary', 'body', 'desc', 'comment'],
      status: ['state', 'condition', 'stage'],
      priority: ['urgency', 'severity', 'importance'],
      amount: ['cost', 'price', 'total', 'fee', 'salary', 'balance'],
      date: ['createdat', 'creationdate', 'submitted', 'timestamp']
    };

    for (const [canonicalKey, aliases] of Object.entries(aliasMap)) {
      if (aliases.includes(cleanHeader) || cleanHeader === canonicalKey.replace(/_/g, '')) {
        const aliasMatch = fields.find((f: any) => {
          const cleanId = String(f.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanLabel = String(f.label || f.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          return cleanId === canonicalKey.replace(/_/g, '') || cleanLabel === canonicalKey.replace(/_/g, '') ||
                 aliases.includes(cleanId) || aliases.includes(cleanLabel);
        });
        if (aliasMatch) return aliasMatch;
      }
    }

    // 4. Substring inclusion match (e.g. "Applicant First Name" -> "First Name")
    const substringMatch = fields.find((f: any) => {
      const cleanLabel = String(f.label || f.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return cleanLabel.length > 2 && (cleanHeader.includes(cleanLabel) || cleanLabel.includes(cleanHeader));
    });
    if (substringMatch) return substringMatch;

    return null;
  }, []);

  // Sync / Re-match column mappings whenever moduleFields become available or change
  useEffect(() => {
    if (headers.length > 0 && moduleFields.length > 0) {
      setColumnMappings(prev => {
        const needsUpdate = prev.length === 0 || prev.every(m => m.targetFieldId === '__IGNORE__');
        if (!needsUpdate) return prev;

        return headers.map((headerText, colIndex) => {
          const matched = matchHeaderToField(headerText, moduleFields);
          return {
            colIndex,
            originalHeader: headerText,
            targetFieldId: matched ? matched.id : '__IGNORE__'
          };
        });
      });
    }
  }, [moduleFields, headers, matchHeaderToField]);

  // Measure container height for virtual scroll
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [rows.length]);

  // Handle global paste event when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        if (!target.classList.contains('paste-catcher')) {
          return;
        }
      }

      const clipboardData = e.clipboardData?.getData('text');
      if (clipboardData && clipboardData.trim().length > 0) {
        e.preventDefault();
        processPastedData(clipboardData);
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  }, [isOpen, moduleFields]);

  // Robust TSV/CSV delimiter & row parser
  const parseDelimitedText = (text: string): string[][] => {
    const lines = text.split(/\r\n|\n|\r/).filter(l => l.length > 0);
    if (lines.length === 0) return [];

    const firstLine = lines[0];
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semiCount = (firstLine.match(/;/g) || []).length;

    let delimiter = '\t';
    if (tabCount === 0 && commaCount > 0) delimiter = ',';
    else if (tabCount === 0 && semiCount > 0) delimiter = ';';

    return lines.map(line => {
      if (delimiter === '\t') {
        return line.split('\t').map(c => c.trim().replace(/^["']|["']$/g, ''));
      }
      
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      return result;
    });
  };

  // Process pasted string into headers, mappings, and validated rows
  const processPastedData = (text: string) => {
    setSubmitError(null);
    const parsedGrid = parseDelimitedText(text);
    if (parsedGrid.length === 0) {
      toast.error('No readable rows found in clipboard data.');
      return;
    }

    setRawPastedText(text);

    const rawHeaders = parsedGrid[0];
    const dataRows = parsedGrid.length > 1 ? parsedGrid.slice(1) : parsedGrid;

    // Initial column mapping heuristic
    const initialMappings: ColumnMapping[] = rawHeaders.map((headerText, colIndex) => {
      const matchedField = matchHeaderToField(headerText, moduleFields);

      return {
        colIndex,
        originalHeader: headerText,
        targetFieldId: matchedField ? matchedField.id : (slugify(headerText) || '__IGNORE__')
      };
    });

    setHeaders(rawHeaders);
    setColumnMappings(initialMappings);

    const constructedRows = buildAndValidateRows(dataRows, initialMappings);
    setRows(constructedRows);
    toast.success(`Parsed ${constructedRows.length} rows from clipboard.`);
  };


  // Re-build row objects and run schema validation
  const buildAndValidateRows = (
    rawRows: string[][],
    mappings: ColumnMapping[]
  ): ParsedRowState[] => {
    return rawRows.map((rawCells, rIdx) => {
      const rowData: Record<string, any> = { ...defaultValues };
      
      mappings.forEach(mapping => {
        if (mapping.targetFieldId && mapping.targetFieldId !== '__IGNORE__') {
          const rawVal = rawCells[mapping.colIndex] !== undefined ? rawCells[mapping.colIndex] : '';
          const targetField = moduleFields.find((f: any) => f.id === mapping.targetFieldId);
          
          if (targetField) {
            rowData[mapping.targetFieldId] = castValueToFieldType(rawVal, targetField);
          } else {
            rowData[mapping.targetFieldId] = rawVal;
          }
        }
      });

      const errors: RowValidationError[] = [];

      requiredFields.forEach((reqF: any) => {
        const val = rowData[reqF.id];
        if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
          errors.push({
            fieldId: reqF.id,
            fieldLabel: reqF.label || reqF.name || reqF.id,
            message: `Required field "${reqF.label || reqF.id}" is missing.`
          });
        }
      });

      return {
        id: `row_${rIdx}_${Math.random().toString(36).substr(2, 5)}`,
        rawValues: rawCells,
        data: rowData,
        errors,
        isValid: errors.length === 0
      };
    });
  };

  const castValueToFieldType = (val: string, field: any): any => {
    if (val === null || val === undefined || val === '') return '';
    const type = field.type;

    if (type === 'number' || type === 'currency' || type === 'percent') {
      const cleaned = String(val).replace(/[^0-9.-]/g, '');
      const num = Number(cleaned);
      return isNaN(num) ? val : num;
    }

    if (type === 'boolean' || type === 'checkbox' || type === 'toggle') {
      const lower = String(val).toLowerCase().trim();
      return lower === 'true' || lower === 'yes' || lower === '1' || lower === 'y';
    }

    if (type === 'date' || type === 'datetime') {
      const parsed = Date.parse(val);
      if (!isNaN(parsed)) {
        return new Date(parsed).toISOString();
      }
      return val;
    }

    return val;
  };

  const handleMappingChange = (colIndex: number, newFieldId: string) => {
    const updatedMappings = columnMappings.map(m => 
      m.colIndex === colIndex ? { ...m, targetFieldId: newFieldId } : m
    );
    setColumnMappings(updatedMappings);

    const rawData = rows.map(r => r.rawValues);
    const updatedRows = buildAndValidateRows(rawData, updatedMappings);
    setRows(updatedRows);
  };

  const handleCellEditCommit = (rowIdx: number, colIdx: number, newVal: string) => {
    const updatedRows = [...rows];
    const targetRow = { ...updatedRows[rowIdx] };
    const targetRawValues = [...targetRow.rawValues];
    targetRawValues[colIdx] = newVal;
    targetRow.rawValues = targetRawValues;

    const mapping = columnMappings.find(m => m.colIndex === colIdx);
    if (mapping && mapping.targetFieldId !== '__IGNORE__') {
      const field = moduleFields.find((f: any) => f.id === mapping.targetFieldId);
      targetRow.data = {
        ...targetRow.data,
        [mapping.targetFieldId]: field ? castValueToFieldType(newVal, field) : newVal
      };
    }

    const errors: RowValidationError[] = [];
    requiredFields.forEach((reqF: any) => {
      const val = targetRow.data[reqF.id];
      if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
        errors.push({
          fieldId: reqF.id,
          fieldLabel: reqF.label || reqF.name || reqF.id,
          message: `Required field "${reqF.label || reqF.id}" is missing.`
        });
      }
    });

    targetRow.errors = errors;
    targetRow.isValid = errors.length === 0;

    updatedRows[rowIdx] = targetRow;
    setRows(updatedRows);
    setEditingCell(null);
  };

  const handleDeleteRow = (index: number) => {
    setRows(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleDeleteInvalidRows = () => {
    const validOnes = rows.filter(r => r.isValid);
    setRows(validOnes);
    toast.success(`Removed ${rows.length - validOnes.length} invalid rows.`);
  };

  const handleAddEmptyRow = () => {
    const emptyCells = headers.map(() => '');
    const newRows = buildAndValidateRows([...rows.map(r => r.rawValues), emptyCells], columnMappings);
    setRows(newRows);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        processPastedData(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filteredRows = useMemo(() => {
    if (activeFilter === 'errors') return rows.filter(r => !r.isValid);
    if (activeFilter === 'valid') return rows.filter(r => r.isValid);
    return rows;
  }, [rows, activeFilter]);

  const errorCount = useMemo(() => rows.filter(r => !r.isValid).length, [rows]);
  const validCount = useMemo(() => rows.filter(r => r.isValid).length, [rows]);

  const totalRowsCount = filteredRows.length;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_COUNT);
  const endIndex = Math.min(totalRowsCount, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN_COUNT);
  const visibleRows = filteredRows.slice(startIndex, endIndex);
  const topPadding = startIndex * ROW_HEIGHT;
  const bottomPadding = Math.max(0, (totalRowsCount - endIndex) * ROW_HEIGHT);

  const handleSubmitBatch = async () => {
    if (rows.length === 0) {
      toast.error('No rows to import.');
      return;
    }

    if (errorCount > 0) {
      toast.error(`Please fix or remove the ${errorCount} invalid rows before proceeding.`);
      setActiveFilter('errors');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const recordsToCreate = rows.map(r => r.data);
      const res = await bulkCreateRecords(
        module.id,
        recordsToCreate,
        tenantId,
        token
      );

      toast.success(res.message || `Successfully created ${recordsToCreate.length} records.`);
      if (onSuccess) onSuccess(res);
      onClose();
    } catch (err: any) {
      console.error('[Bulk Import Failed]:', err);
      setSubmitError(err.message || 'Batch creation failed and all records were rolled back.');
      toast.error('Import failed: Transaction was completely rolled back.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return typeof document !== 'undefined' ? createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          className="relative w-full max-w-[1400px] h-[90vh] max-h-[900px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                    Bulk Create Records
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                    {module?.name || 'Workspace Module'}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Upload or paste rows directly from CSV, Excel, or Sheets
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv,.tsv,.txt"
                className="hidden"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-1.5 text-xs cursor-pointer"
              >
                <Upload size={14} />
                Upload CSV / File
              </Button>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {rows.length === 0 ? (
              /* Empty / Paste Landing Zone */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-zinc-50/30 dark:bg-zinc-900/30">
                <div className="w-20 h-20 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 shadow-xl shadow-blue-500/5">
                  <FileSpreadsheet size={36} />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                  Copy & Paste from Excel
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mb-6 leading-relaxed">
                  Select your rows and columns in Excel or Sheets, copy them (<kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 font-mono text-xs">Ctrl+C</kbd>), and press <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 font-mono text-xs">Ctrl+V</kbd> anywhere on this screen.
                </p>

                <div className="w-full max-w-xl">
                  <textarea
                    rows={4}
                    placeholder="Or paste tabular data directly into this box..."
                    value={rawPastedText}
                    onChange={(e) => {
                      setRawPastedText(e.target.value);
                      if (e.target.value.trim().length > 0) {
                        processPastedData(e.target.value);
                      }
                    }}
                    className="paste-catcher w-full p-4 text-xs font-mono rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm resize-none"
                  />
                </div>
              </div>
            ) : (
              /* Active Spreadsheet Grid View */
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Rollback / Failure Alert Banner */}
                {submitError && (
                  <div className="px-6 py-3 bg-rose-500/10 border-b border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-start gap-3 text-xs">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-bold">Transaction Rolled Back (All-or-Nothing)</p>
                      <p className="text-rose-500/90">{submitError}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSubmitError(null)}
                      className="text-rose-400 hover:text-rose-600 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Toolbar & Filter Tabs */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-zinc-200/60 dark:bg-zinc-800 p-0.5 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setActiveFilter('all')}
                        className={cn(
                          'px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer',
                          activeFilter === 'all'
                            ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                        )}
                      >
                        All ({rows.length.toLocaleString()})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveFilter('valid')}
                        className={cn(
                          'px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer',
                          activeFilter === 'valid'
                            ? 'bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                            : 'text-zinc-500 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400'
                        )}
                      >
                        <CheckCircle2 size={12} />
                        Valid ({validCount.toLocaleString()})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveFilter('errors')}
                        className={cn(
                          'px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer',
                          activeFilter === 'errors'
                            ? 'bg-white dark:bg-zinc-700 text-rose-600 dark:text-rose-400 shadow-sm'
                            : 'text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400'
                        )}
                      >
                        <AlertCircle size={12} />
                        Errors ({errorCount.toLocaleString()})
                      </button>
                    </div>

                    {errorCount > 0 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleDeleteInvalidRows}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 text-xs gap-1 cursor-pointer"
                      >
                        <Trash2 size={12} />
                        Remove Invalid ({errorCount})
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleAddEmptyRow}
                      className="text-xs gap-1 cursor-pointer"
                    >
                      <Plus size={12} />
                      Add Row
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRows([]);
                        setHeaders([]);
                        setColumnMappings([]);
                        setRawPastedText('');
                      }}
                      className="text-zinc-500 hover:text-rose-600 text-xs gap-1 cursor-pointer"
                    >
                      <RefreshCw size={12} />
                      Clear & Re-paste
                    </Button>
                  </div>
                </div>

                {/* Virtualized Table Container */}
                <div 
                  ref={containerRef}
                  onScroll={(e) => setScrollTop((e.target as HTMLElement).scrollTop)}
                  className="flex-1 overflow-auto bg-white dark:bg-zinc-950 font-mono text-xs select-none text-zinc-900 dark:text-zinc-100"
                >
                  <table className="w-full border-collapse border-spacing-0 text-zinc-900 dark:text-zinc-100">
                    {/* Sticky Table Header */}
                    <thead className="sticky top-0 z-20 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-sm">
                      <tr>
                        <th className="w-16 p-2 text-center text-[10px] font-bold text-zinc-400 dark:text-zinc-400 border-r border-zinc-200 dark:border-zinc-800">
                          #
                        </th>
                        {columnMappings.map((mapping, cIdx) => {
                          const targetField = moduleFields.find((f: any) => f.id === mapping.targetFieldId);
                          const isMapped = mapping.targetFieldId !== '__IGNORE__';

                          return (
                            <th
                              key={cIdx}
                              className="min-w-[210px] p-2 text-left border-r border-zinc-200 dark:border-zinc-800"
                            >
                              <div className="flex flex-col gap-1.5 font-sans">
                                <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300 text-[11px]">
                                  <span className="truncate font-semibold max-w-[130px]" title={mapping.originalHeader}>
                                    {mapping.originalHeader || `Col ${cIdx + 1}`}
                                  </span>
                                  {targetField?.required && (
                                    <span className="text-rose-500 font-bold text-xs" title="Required Field">*</span>
                                  )}
                                </div>

                                {/* Target Field Selector */}
                                <select
                                  value={mapping.targetFieldId}
                                  onChange={(e) => handleMappingChange(cIdx, e.target.value)}
                                  className={cn(
                                    'w-full py-1.5 px-2.5 text-xs rounded-xl border outline-none transition-colors cursor-pointer font-medium shadow-xs',
                                    isMapped
                                      ? 'bg-white dark:bg-zinc-800 border-indigo-300 dark:border-indigo-700/60 text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-indigo-500'
                                      : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 italic'
                                  )}
                                >
                                  <option value="__IGNORE__" className="bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 py-1">
                                    ❌ (Ignore Column)
                                  </option>
                                  {moduleFields.length > 0 && (
                                    <optgroup label="Module Schema Fields" className="bg-zinc-100 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 font-semibold">
                                      {moduleFields.map((f: any) => (
                                        <option key={f.id} value={f.id} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 py-1">
                                          {f.label || f.name || f.id} {f.required ? '*' : ''} ({f.type || 'text'})
                                        </option>
                                      ))}
                                    </optgroup>
                                  )}
                                  {mapping.targetFieldId !== '__IGNORE__' && !moduleFields.some((f: any) => f.id === mapping.targetFieldId) && (
                                    <optgroup label="Custom Key" className="bg-zinc-100 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 font-semibold">
                                      <option value={mapping.targetFieldId} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 py-1">
                                        ⚡ {mapping.originalHeader || mapping.targetFieldId} (Custom Key)
                                      </option>
                                    </optgroup>
                                  )}
                                </select>
                              </div>
                            </th>
                          );
                        })}
                        <th className="w-12 p-2 text-center text-zinc-400 dark:text-zinc-400 border-r border-zinc-200 dark:border-zinc-800">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    {/* Table Body with Windowing Padding */}
                    <tbody className="text-zinc-800 dark:text-zinc-200">
                      {topPadding > 0 && (
                        <tr>
                          <td style={{ height: `${topPadding}px` }} colSpan={columnMappings.length + 2} />
                        </tr>
                      )}

                      {visibleRows.map((row, relativeIdx) => {
                        const actualRowIdx = startIndex + relativeIdx;

                        return (
                          <tr
                            key={row.id}
                            style={{ height: `${ROW_HEIGHT}px` }}
                            className={cn(
                              'group border-b border-zinc-100 dark:border-zinc-800/80 transition-colors',
                              row.isValid 
                                ? 'hover:bg-zinc-50 dark:hover:bg-zinc-900/50' 
                                : 'bg-rose-50/30 dark:bg-rose-950/20 hover:bg-rose-50/60 dark:hover:bg-rose-950/40'
                            )}
                          >
                            {/* Row Status & Index */}
                            <td className="w-16 p-2 text-center border-r border-zinc-200 dark:border-zinc-800/80 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                              <div className="flex items-center justify-center gap-1">
                                {!row.isValid ? (
                                  <span title={row.errors.map(e => e.message).join('\n')}>
                                    <AlertCircle size={12} className="text-rose-500" />
                                  </span>
                                ) : (
                                  <span className="text-zinc-500 dark:text-zinc-400">
                                    {actualRowIdx + 1}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Cells */}
                            {columnMappings.map((mapping, cIdx) => {
                              const isIgnored = mapping.targetFieldId === '__IGNORE__';
                              const rawVal = row.rawValues[cIdx] !== undefined ? row.rawValues[cIdx] : '';
                              const targetField = moduleFields.find((f: any) => f.id === mapping.targetFieldId);
                              const hasError = targetField && row.errors.some(e => e.fieldId === targetField.id);
                              const isEditingThisCell = editingCell?.rowIdx === actualRowIdx && editingCell?.colIdx === cIdx;

                              return (
                                <td
                                  key={cIdx}
                                  onClick={() => !isEditingThisCell && setEditingCell({ rowIdx: actualRowIdx, colIdx: cIdx })}
                                  className={cn(
                                    'p-2.5 border-r border-zinc-200 dark:border-zinc-800/80 truncate max-w-[280px] cursor-text relative text-zinc-800 dark:text-zinc-200 font-medium',
                                    isIgnored && 'opacity-30 line-through text-zinc-400 dark:text-zinc-500',
                                    hasError && 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 font-semibold'
                                  )}
                                  title={hasError ? row.errors.find(e => e.fieldId === targetField?.id)?.message : rawVal}
                                >
                                  {isEditingThisCell ? (
                                    <input
                                      autoFocus
                                      defaultValue={rawVal}
                                      onBlur={(e) => handleCellEditCommit(actualRowIdx, cIdx, e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleCellEditCommit(actualRowIdx, cIdx, e.currentTarget.value);
                                        if (e.key === 'Escape') setEditingCell(null);
                                      }}
                                      className="w-full py-0.5 px-1 text-xs font-mono bg-white dark:bg-zinc-800 border border-indigo-500 rounded outline-none text-zinc-900 dark:text-white"
                                    />
                                  ) : (
                                    <span className="text-zinc-800 dark:text-zinc-200">
                                      {rawVal || <span className="text-zinc-400 dark:text-zinc-600 italic font-normal">empty</span>}
                                    </span>
                                  )}
                                </td>
                              );
                            })}

                            {/* Row Delete Action */}
                            <td className="w-12 p-2 text-center border-r border-zinc-200 dark:border-zinc-800/80">
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(actualRowIdx)}
                                className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-rose-500 transition-opacity cursor-pointer p-1 rounded"
                                title="Delete row"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {bottomPadding > 0 && (
                        <tr>
                          <td style={{ height: `${bottomPadding}px` }} colSpan={columnMappings.length + 2} />
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80">
            <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              {rows.length > 0 && (
                <>
                  <span>
                    Total: <strong className="text-zinc-900 dark:text-white">{rows.length.toLocaleString()}</strong> rows
                  </span>
                  <span>•</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    <strong>{validCount.toLocaleString()}</strong> ready
                  </span>
                  {errorCount > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-rose-500 font-semibold">
                        <strong>{errorCount}</strong> errors require fix
                      </span>
                    </>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={isSubmitting}
                className="cursor-pointer"
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                onClick={handleSubmitBatch}
                disabled={rows.length === 0 || errorCount > 0 || isSubmitting}
                className="gap-2 px-6 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <AuroraSpinner size="sm" />
                    Writing {rows.length.toLocaleString()} Records...
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    Create {rows.length > 0 ? `${rows.length.toLocaleString()} Records` : 'Records'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  ) : null;
};
