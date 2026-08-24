import React, { useState, useId } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { 
  Upload, 
  FileSpreadsheet, 
  X, 
  Check, 
  ArrowLeft,
  ClipboardPaste,
  Sparkles,
  Table as TableIcon,
  ToggleLeft,
  Hash,
  Calendar,
  Type,
  ListFilter
} from 'lucide-react';
import { Button } from '../../UI/Primitives';
import { ListColumn, GlobalList } from '../../../hooks/useGlobalList';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

interface ListBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (createdList?: any) => void;
  existingList?: GlobalList | null;
  createListWithItems?: (name: string, description: string | undefined, columns: ListColumn[], items: Record<string, any>[]) => Promise<any>;
  bulkAddItems?: (items: Record<string, any>[]) => Promise<any>;
}

interface ParsedColumnConfig {
  id: string;
  originalHeader: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'choice';
  required: boolean;
  included: boolean;
  targetExistingColId?: string;
}

export const ListBulkImportModal: React.FC<ListBulkImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingList,
  createListWithItems,
  bulkAddItems
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'paste'>('file');
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  
  // Raw input states
  const [pastedText, setPastedText] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  
  // Parsed dataset states
  const [listName, setListName] = useState('');
  const [listDescription, setListDescription] = useState('');
  const [parsedColumns, setParsedColumns] = useState<ParsedColumnConfig[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputId = useId();

  if (!isOpen) return null;

  // --- PARSING UTILITIES ---
  const detectDelimiter = (text: string): string => {
    const firstLine = text.split(/\r\n|\n|\r/)[0] || '';
    const commas = (firstLine.match(/,/g) || []).length;
    const tabs = (firstLine.match(/\t/g) || []).length;
    const semicolons = (firstLine.match(/;/g) || []).length;
    const pipes = (firstLine.match(/\|/g) || []).length;

    if (tabs >= commas && tabs >= semicolons && tabs > 0) return '\t';
    if (semicolons > commas && semicolons >= pipes) return ';';
    if (pipes > commas) return '|';
    return ',';
  };

  const parseCSVLine = (line: string, delimiter: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const detectType = (values: any[]): 'text' | 'number' | 'date' | 'boolean' => {
    const nonEmpties = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '');
    if (nonEmpties.length === 0) return 'text';

    // Boolean check
    const isBool = nonEmpties.every(v => {
      const s = String(v).toLowerCase().trim();
      return s === 'true' || s === 'false' || s === 'yes' || s === 'no' || s === '1' || s === '0';
    });
    if (isBool) return 'boolean';

    // Number check
    const isNum = nonEmpties.every(v => {
      const s = String(v).replace(/[\$,]/g, '').trim();
      return !isNaN(Number(s)) && !isNaN(parseFloat(s));
    });
    if (isNum) return 'number';

    // Date check (YYYY-MM-DD or parseable dates)
    const isDate = nonEmpties.length > 0 && nonEmpties.every(v => {
      const s = String(v).trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(s) || /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(s)) {
        const d = Date.parse(s);
        return !isNaN(d);
      }
      return false;
    });
    if (isDate) return 'date';

    return 'text';
  };

  const processContent = (content: string, defaultName: string) => {
    const trimmed = content.trim();
    if (!trimmed) {
      toast.error('The provided file or text is empty');
      return;
    }

    const lines = trimmed.split(/\r\n|\n|\r/).filter(l => l.trim().length > 0);
    if (lines.length === 0) {
      toast.error('No rows could be parsed');
      return;
    }

    const delimiter = detectDelimiter(trimmed);
    const headers = parseCSVLine(lines[0], delimiter).map((h, i) => h.replace(/^["']|["']$/g, '').trim() || `Column_${i + 1}`);

    // Parse data rows
    const rows: Record<string, any>[] = [];
    const columnSampleValues: Record<string, any[]> = {};
    headers.forEach(h => { columnSampleValues[h] = []; });

    for (let i = 1; i < lines.length; i++) {
      const vals = parseCSVLine(lines[i], delimiter).map(v => v.replace(/^["']|["']$/g, '').trim());
      const rowObj: Record<string, any> = {};
      
      headers.forEach((h, hIdx) => {
        const val = vals[hIdx] !== undefined ? vals[hIdx] : '';
        rowObj[h] = val;
        if (columnSampleValues[h].length < 100) {
          columnSampleValues[h].push(val);
        }
      });
      rows.push(rowObj);
    }

    if (rows.length === 0) {
      toast.error('Only header row was found. Please include at least one data row.');
      return;
    }

    // Configure columns
    const initialConfigs: ParsedColumnConfig[] = headers.map((header) => {
      const sampleVals = columnSampleValues[header] || [];
      const detected = detectType(sampleVals);
      
      // If appending to existing list, try auto-match
      let matchedExistingId: string | undefined;
      if (existingList) {
        const found = existingList.columns.find(c => 
          c.name.toLowerCase() === header.toLowerCase() || 
          c.id.toLowerCase() === header.toLowerCase()
        );
        if (found) matchedExistingId = found.id;
      }

      return {
        id: 'col_' + Math.random().toString(36).substr(2, 9),
        originalHeader: header,
        name: header.replace(/[_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type: detected,
        required: false,
        included: true,
        targetExistingColId: matchedExistingId
      };
    });

    setParsedColumns(initialConfigs);
    setParsedRows(rows);
    setListName(existingList ? existingList.name : defaultName);
    setListDescription(existingList ? (existingList.description || '') : `Imported ${rows.length} records from ${defaultName}`);
    setStep('preview');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileSize(`${(file.size / 1024).toFixed(1)} KB`);
    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const formattedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processContent(content, formattedName);
    };
    reader.readAsText(file);
  };

  const handlePasteSubmit = () => {
    if (!pastedText.trim()) {
      toast.error('Please paste CSV or spreadsheet data first');
      return;
    }
    processContent(pastedText, 'Pasted Spreadsheet List');
  };

  const handleColumnUpdate = (originalHeader: string, updates: Partial<ParsedColumnConfig>) => {
    setParsedColumns(prev => prev.map(col => {
      if (col.originalHeader === originalHeader) {
        return { ...col, ...updates };
      }
      return col;
    }));
  };

  const handleExecuteImport = async () => {
    const includedCols = parsedColumns.filter(c => c.included);
    if (includedCols.length === 0) {
      toast.error('Please include at least one column for the list.');
      return;
    }

    if (!listName.trim() && !existingList) {
      toast.error('Please provide a name for the new list.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (existingList) {
        // --- APPEND MODE TO EXISTING LIST ---
        const transformedRows = parsedRows.map(row => {
          const rowData: Record<string, any> = {};
          includedCols.forEach(col => {
            const targetId = col.targetExistingColId || col.id;
            let val = row[col.originalHeader];
            
            if (col.type === 'number') {
              const num = parseFloat(String(val).replace(/[\$,]/g, ''));
              val = isNaN(num) ? null : num;
            } else if (col.type === 'boolean') {
              const s = String(val).toLowerCase().trim();
              val = s === 'true' || s === 'yes' || s === '1';
            }
            rowData[targetId] = val;
          });
          return rowData;
        });

        onSuccess({
          mode: 'append',
          rows: transformedRows
        });
        onClose();
      } else {
        // --- CREATE NEW LIST DRAFT MODE ---
        const finalColumns: ListColumn[] = includedCols.map(col => ({
          id: col.id,
          name: col.name,
          type: col.type,
          required: col.required
        }));

        const transformedRows = parsedRows.map(row => {
          const rowData: Record<string, any> = {};
          includedCols.forEach(col => {
            let val = row[col.originalHeader];
            if (col.type === 'number') {
              const num = parseFloat(String(val).replace(/[\$,]/g, ''));
              val = isNaN(num) ? null : num;
            } else if (col.type === 'boolean') {
              const s = String(val).toLowerCase().trim();
              val = s === 'true' || s === 'yes' || s === '1';
            }
            rowData[col.id] = val;
          });
          return rowData;
        });

        onSuccess({
          mode: 'create',
          name: listName.trim(),
          description: listDescription.trim() || undefined,
          columns: finalColumns,
          rows: transformedRows
        });
        onClose();
      }
    } catch (err: any) {
      console.error('Bulk import error', err);
      toast.error(err.message || 'Import failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'number': return <Hash size={12} className="text-amber-500" />;
      case 'date': return <Calendar size={12} className="text-emerald-500" />;
      case 'boolean': return <ToggleLeft size={12} className="text-indigo-500" />;
      case 'choice': return <ListFilter size={12} className="text-purple-500" />;
      default: return <Type size={12} className="text-blue-500" />;
    }
  };

  const modalNode = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose} 
        className="absolute inset-0 bg-zinc-950/75 backdrop-blur-sm" 
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 16 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.96, y: 16 }} 
        className="relative w-full max-w-5xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 rounded-xl">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                {existingList ? `Bulk Import into "${existingList.name}"` : 'Bulk Upload from CSV / Spreadsheet'}
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  {step === 'upload' ? 'Step 1 of 2: Source' : 'Step 2 of 2: Preview & Configure'}
                </span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {step === 'upload' 
                  ? 'Upload a CSV/TSV spreadsheet or paste raw data directly.'
                  : 'Review detected column types, customize field names, and preview parsed records.'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6">
          {step === 'upload' ? (
            <div className="space-y-6 max-w-2xl mx-auto py-2">
              {/* Tab Selector */}
              <div className="flex items-center gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                <button
                  onClick={() => setActiveTab('file')}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                    activeTab === 'file' 
                      ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs" 
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  )}
                >
                  <Upload size={14} />
                  <span>Upload File (.csv, .tsv)</span>
                </button>
                <button
                  onClick={() => setActiveTab('paste')}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                    activeTab === 'paste' 
                      ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs" 
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  )}
                >
                  <ClipboardPaste size={14} />
                  <span>Paste Spreadsheet Data</span>
                </button>
              </div>

              {activeTab === 'file' ? (
                <div className="space-y-4">
                  <label 
                    htmlFor={fileInputId} 
                    className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-zinc-50/50 dark:bg-zinc-950/30 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/80 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Upload size={24} />
                    </div>
                    <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                      Click to browse or drag & drop file
                    </h4>
                    <p className="text-xs text-zinc-400 mt-1">
                      Supports comma-separated (.csv) and tab-separated (.tsv, .txt) files
                    </p>
                    <input 
                      id={fileInputId} 
                      type="file" 
                      accept=".csv, .tsv, .txt, text/csv, text/tab-separated-values" 
                      onChange={handleFileUpload} 
                      className="hidden" 
                    />
                  </label>

                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-500 space-y-1.5">
                    <p className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-indigo-500" />
                      Smart Automatic Parsing
                    </p>
                    <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                      The first row is used for column names. Data types (Text, Number, Date, Boolean) are inferred automatically and can be tweaked in the next preview step.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Paste CSV or Tabular Data
                    </label>
                    <textarea
                      rows={9}
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder={`Name\tCategory\tPrice\tInStock\nStandard Widget\tHardware\t49.99\ttrue\nDeluxe Widget\tHardware\t99.50\ttrue`}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 font-mono text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500 transition-all resize-none"
                    />
                  </div>
                  <Button 
                    onClick={handlePasteSubmit} 
                    className="w-full justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-md"
                  >
                    Parse Data & Preview List
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* PREVIEW & CONFIGURATION STEP */
            <div className="space-y-6">
              {/* List Metadata (Only when creating new list) */}
              {!existingList && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">List Name *</label>
                    <input
                      type="text"
                      required
                      value={listName}
                      onChange={(e) => setListName(e.target.value)}
                      placeholder="e.g. Products & SKUs"
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Description</label>
                    <input
                      type="text"
                      value={listDescription}
                      onChange={(e) => setListDescription(e.target.value)}
                      placeholder="List purpose or notes..."
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Column Schema Mapping Card */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                      Detected Columns & Types ({parsedColumns.filter(c => c.included).length} included)
                    </h4>
                    <p className="text-[11px] text-zinc-500">
                      Customize field names, inferred data types, or exclude unneeded columns.
                    </p>
                  </div>
                  <div className="text-xs text-zinc-500 font-mono">
                    {parsedRows.length} total rows parsed
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {parsedColumns.map((col) => (
                    <div 
                      key={col.originalHeader}
                      className={cn(
                        "p-3 rounded-xl border transition-all space-y-2 relative flex flex-col justify-between",
                        col.included 
                          ? "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-2xs" 
                          : "bg-zinc-50/60 dark:bg-zinc-950/40 border-zinc-200/50 dark:border-zinc-800/40 opacity-50"
                      )}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-[10px] font-mono text-zinc-400 truncate" title={col.originalHeader}>
                            CSV: {col.originalHeader}
                          </span>
                          <label className="flex items-center gap-1 cursor-pointer text-[10px] font-semibold text-zinc-600 dark:text-zinc-400">
                            <input 
                              type="checkbox" 
                              checked={col.included} 
                              onChange={(e) => handleColumnUpdate(col.originalHeader, { included: e.target.checked })}
                              className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>Include</span>
                          </label>
                        </div>

                        {col.included && (
                          <div className="space-y-1.5">
                            <div>
                              <input
                                type="text"
                                value={col.name}
                                onChange={(e) => handleColumnUpdate(col.originalHeader, { name: e.target.value })}
                                placeholder="Column Name"
                                className="w-full bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div className="flex items-center gap-1.5">
                              <div className="relative flex-1">
                                <select
                                  value={col.type}
                                  onChange={(e) => handleColumnUpdate(col.originalHeader, { type: e.target.value as any })}
                                  className="w-full bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-[11px] font-medium text-zinc-800 dark:text-zinc-200 outline-none"
                                >
                                  <option value="text">Text</option>
                                  <option value="number">Number</option>
                                  <option value="date">Date</option>
                                  <option value="boolean">Boolean (Yes/No)</option>
                                  <option value="choice">Choice List</option>
                                </select>
                              </div>

                              <label className="flex items-center gap-1 text-[10px] font-medium text-zinc-500 cursor-pointer shrink-0">
                                <input
                                  type="checkbox"
                                  checked={col.required}
                                  onChange={(e) => handleColumnUpdate(col.originalHeader, { required: e.target.checked })}
                                  className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span>Req</span>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <TableIcon size={14} className="text-indigo-500" />
                    Data Sample Preview (First 50 Rows)
                  </h4>
                </div>

                <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 max-h-64 overflow-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-800 z-10">
                      <tr>
                        <th className="px-3 py-2 w-10 text-center text-zinc-400 font-bold border-r border-zinc-200 dark:border-zinc-800">#</th>
                        {parsedColumns.filter(c => c.included).map(col => (
                          <th key={col.originalHeader} className="px-3 py-2 text-zinc-700 dark:text-zinc-300 font-bold border-r border-zinc-200 dark:border-zinc-800">
                            <div className="flex items-center gap-1.5">
                              {getTypeIcon(col.type)}
                              <span>{col.name}</span>
                              {col.required && <span className="text-red-500">*</span>}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
                      {parsedRows.slice(0, 50).map((row, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                          <td className="px-3 py-1.5 text-center text-zinc-400 text-[10px] border-r border-zinc-100 dark:border-zinc-800/60">
                            {rowIdx + 1}
                          </td>
                          {parsedColumns.filter(c => c.included).map(col => (
                            <td key={col.originalHeader} className="px-3 py-1.5 text-zinc-800 dark:text-zinc-200 truncate max-w-[200px] border-r border-zinc-100 dark:border-zinc-800/60">
                              {row[col.originalHeader] !== undefined ? String(row[col.originalHeader]) : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50 shrink-0">
          {step === 'preview' ? (
            <button
              type="button"
              onClick={() => setStep('upload')}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer disabled:opacity-50"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            {step === 'preview' && (
              <Button
                onClick={handleExecuteImport}
                loading={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-md cursor-pointer"
              >
                <Check size={14} className="mr-1.5" />
                <span>{existingList ? `Import ${parsedRows.length} Records into Builder` : `Load into List Builder (${parsedRows.length} Records)`}</span>
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : null;
};
