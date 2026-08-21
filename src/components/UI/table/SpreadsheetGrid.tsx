import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Save, X, Undo2, Redo2, Check, AlertCircle, 
  HelpCircle, Edit3, ClipboardPaste, ArrowDown 
} from 'lucide-react';
import { cn, Button } from '../Primitives';
import { Column } from '../Table';
import { getColKey, getRecordValue } from './TableGrouping';
import { toast } from 'sonner';

export interface CellPosition {
  rowIdx: number;
  colIdx: number;
}

export interface SpreadsheetGridProps<T extends { id: string | number }> {
  data: T[];
  columns: Column<T>[];
  onSaveBatch: (updatedRecords: Partial<T>[]) => Promise<void> | void;
  onExitEditMode: () => void;
  isSaving?: boolean;
}

export function SpreadsheetGrid<T extends { id: string | number }>({
  data,
  columns,
  onSaveBatch,
  onExitEditMode,
  isSaving = false
}: SpreadsheetGridProps<T>) {
  // Editable grid records state
  const [gridData, setGridData] = useState<T[]>(() => JSON.parse(JSON.stringify(data)));
  const [dirtyMap, setDirtyMap] = useState<Map<string | number, Partial<T>>>(new Map());
  
  // Active cell & navigation state
  const [selectedCell, setSelectedCell] = useState<CellPosition>({ rowIdx: 0, colIdx: 0 });
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editValue, setEditValue] = useState<string>('');
  
  // History for Undo/Redo
  const [history, setHistory] = useState<T[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter only editable columns (excluding actions and selection)
  const editableColumns = useMemo(() => {
    return columns.filter(c => c.header && c.header.toLowerCase() !== 'actions' && c.header.toLowerCase() !== 'select' && c.header !== '');
  }, [columns]);

  // Sync with prop data when initial load changes
  useEffect(() => {
    setGridData(JSON.parse(JSON.stringify(data)));
    setDirtyMap(new Map());
  }, [data]);

  // Focus input automatically when entering edit mode for a cell
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const getCellValue = useCallback((rowIdx: number, colIdx: number): any => {
    const row = gridData[rowIdx];
    if (!row) return '';
    const col = editableColumns[colIdx];
    if (!col) return '';
    const key = getColKey(col);
    return getRecordValue(row, key);
  }, [gridData, editableColumns]);

  const commitCellEdit = useCallback((val: any) => {
    const { rowIdx, colIdx } = selectedCell;
    const col = editableColumns[colIdx];
    if (!col) {
      setIsEditing(false);
      return;
    }

    const row = gridData[rowIdx];
    const key = getColKey(col);
    const oldVal = getRecordValue(row, key);

    if (oldVal === val) {
      setIsEditing(false);
      return;
    }

    // Save history
    setHistory(prev => [...prev.slice(0, historyIndex + 1), JSON.parse(JSON.stringify(gridData))]);
    setHistoryIndex(prev => prev + 1);

    // Update grid data
    const nextGridData = [...gridData];
    const updatedRow = { ...nextGridData[rowIdx] };
    (updatedRow as any)[key] = val;
    if ((updatedRow as any).data && typeof (updatedRow as any).data === 'object') {
      (updatedRow as any).data = { ...(updatedRow as any).data, [key]: val };
    }
    nextGridData[rowIdx] = updatedRow;
    setGridData(nextGridData);

    // Track dirty map
    setDirtyMap(prev => {
      const nextMap = new Map(prev);
      const existing = nextMap.get(row.id) || { id: row.id } as Partial<T>;
      (existing as any)[key] = val;
      nextMap.set(row.id, existing);
      return nextMap;
    });

    setIsEditing(false);
  }, [selectedCell, editableColumns, gridData, historyIndex]);

  // Keyboard navigation & Excel shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (isEditing) {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitCellEdit(editValue);
        // Move down like Excel
        setSelectedCell(prev => ({
          ...prev,
          rowIdx: Math.min(gridData.length - 1, prev.rowIdx + 1)
        }));
      } else if (e.key === 'Tab') {
        e.preventDefault();
        commitCellEdit(editValue);
        if (e.shiftKey) {
          setSelectedCell(prev => ({
            ...prev,
            colIdx: Math.max(0, prev.colIdx - 1)
          }));
        } else {
          setSelectedCell(prev => ({
            ...prev,
            colIdx: Math.min(editableColumns.length - 1, prev.colIdx + 1)
          }));
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsEditing(false);
      }
      return;
    }

    // Navigation mode
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        setSelectedCell(prev => ({ ...prev, rowIdx: Math.max(0, prev.rowIdx - 1) }));
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedCell(prev => ({ ...prev, rowIdx: Math.min(gridData.length - 1, prev.rowIdx + 1) }));
        break;
      case 'ArrowLeft':
        e.preventDefault();
        setSelectedCell(prev => ({ ...prev, colIdx: Math.max(0, prev.colIdx - 1) }));
        break;
      case 'ArrowRight':
        e.preventDefault();
        setSelectedCell(prev => ({ ...prev, colIdx: Math.min(editableColumns.length - 1, prev.colIdx + 1) }));
        break;
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          setSelectedCell(prev => ({ ...prev, colIdx: Math.max(0, prev.colIdx - 1) }));
        } else {
          setSelectedCell(prev => ({ ...prev, colIdx: Math.min(editableColumns.length - 1, prev.colIdx + 1) }));
        }
        break;
      case 'Enter':
      case 'F2':
        e.preventDefault();
        const currentVal = getCellValue(selectedCell.rowIdx, selectedCell.colIdx);
        setEditValue(String(currentVal ?? ''));
        setIsEditing(true);
        break;
      case 'Backspace':
      case 'Delete':
        e.preventDefault();
        commitCellEdit('');
        break;
      default:
        // Direct typing replaces cell content like Excel
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          setEditValue(e.key);
          setIsEditing(true);
        }
        break;
    }
  }, [isEditing, editValue, commitCellEdit, gridData.length, editableColumns.length, getCellValue, selectedCell]);

  // Handle Multi-cell Clipboard Paste (from Excel / Sheets)
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const clipboardText = e.clipboardData.getData('text/plain');
    if (!clipboardText) return;

    const rows = clipboardText.split(/\r\n|\n|\r/).filter(r => r.length > 0);
    if (rows.length === 0) return;

    const parsedMatrix = rows.map(row => row.split('\t'));
    const startRow = selectedCell.rowIdx;
    const startCol = selectedCell.colIdx;

    const nextGrid = [...gridData];
    const nextDirty = new Map(dirtyMap);

    let updatedCount = 0;

    parsedMatrix.forEach((pRow, rOffset) => {
      const targetRowIdx = startRow + rOffset;
      if (targetRowIdx >= nextGrid.length) return;

      const currentRow = { ...nextGrid[targetRowIdx] };
      const dirtyObj = nextDirty.get(currentRow.id) || { id: currentRow.id } as Partial<T>;

      pRow.forEach((val, cOffset) => {
        const targetColIdx = startCol + cOffset;
        if (targetColIdx >= editableColumns.length) return;

        const col = editableColumns[targetColIdx];
        const key = getColKey(col);
        (currentRow as any)[key] = val;
        (dirtyObj as any)[key] = val;
        if ((currentRow as any).data && typeof (currentRow as any).data === 'object') {
          (currentRow as any).data = { ...(currentRow as any).data, [key]: val };
        }
        updatedCount++;
      });

      nextGrid[targetRowIdx] = currentRow;
      nextDirty.set(currentRow.id, dirtyObj);
    });

    setGridData(nextGrid);
    setDirtyMap(nextDirty);
    toast.success(`Pasted data into ${updatedCount} cell(s)`);
  }, [selectedCell, gridData, dirtyMap, editableColumns]);

  const handleSave = async () => {
    if (dirtyMap.size === 0) {
      toast.info('No changes to save');
      return;
    }
    const updates = Array.from(dirtyMap.values());
    try {
      await onSaveBatch(updates);
      setDirtyMap(new Map());
      toast.success(`Successfully saved ${updates.length} record(s)`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save batch edits');
    }
  };

  const handleDiscard = () => {
    setGridData(JSON.parse(JSON.stringify(data)));
    setDirtyMap(new Map());
    setIsEditing(false);
    toast.info('Changes discarded');
  };

  return (
    <div 
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      className="flex flex-col h-full w-full outline-none select-none bg-zinc-50 dark:bg-zinc-950 text-xs"
    >
      {/* Edit Mode Notification Banner & Actions */}
      <div className="flex items-center justify-between px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 text-amber-900 dark:text-amber-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 text-xs">
            <Edit3 size={13} />
            <span>Spreadsheet Edit Mode Active</span>
          </div>

          <span className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
            {dirtyMap.size === 0 ? 'No unsaved edits' : `${dirtyMap.size} modified record(s)`}
          </span>

          <div className="hidden md:flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 ml-2">
            <span className="bg-white/80 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">Arrows / Tab: Move</span>
            <span className="bg-white/80 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">Enter: Edit</span>
            <span className="bg-white/80 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">Ctrl+V: Paste Excel</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {dirtyMap.size > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDiscard}
              className="h-7 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              <X size={12} className="mr-1" /> Discard
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            disabled={dirtyMap.size === 0 || isSaving}
            onClick={handleSave}
            className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
          >
            <Save size={12} className="mr-1" />
            {isSaving ? 'Saving...' : `Save ${dirtyMap.size > 0 ? `(${dirtyMap.size})` : ''}`}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onExitEditMode}
            className="h-7 text-xs"
          >
            Exit Edit Mode
          </Button>
        </div>
      </div>

      {/* Grid Canvas */}
      <div className="flex-1 overflow-auto relative custom-scrollbar">
        <table className="w-full border-collapse border border-zinc-200 dark:border-zinc-800 text-left">
          <thead className="sticky top-0 z-20 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-semibold text-xs">
            <tr>
              <th className="w-10 px-2 py-2 text-center border-r border-zinc-200 dark:border-zinc-800 font-mono text-[10px] text-zinc-400">
                #
              </th>
              {editableColumns.map((col, cIdx) => (
                <th 
                  key={cIdx} 
                  className="px-3 py-2 border-r border-zinc-200 dark:border-zinc-800 truncate font-bold text-[11px] uppercase tracking-wider text-zinc-500"
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gridData.map((row, rIdx) => {
              const isRowDirty = dirtyMap.has(row.id);
              return (
                <tr key={row.id} className={cn(
                  "border-b border-zinc-200 dark:border-zinc-800 transition-colors",
                  isRowDirty ? "bg-amber-50/40 dark:bg-amber-950/20" : "hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30"
                )}>
                  {/* Row index header */}
                  <td className="w-10 px-2 py-1.5 text-center border-r border-zinc-200 dark:border-zinc-800 font-mono text-[10px] text-zinc-400 bg-zinc-50 dark:bg-zinc-900">
                    <span className="flex items-center justify-center gap-0.5">
                      {isRowDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                      {rIdx + 1}
                    </span>
                  </td>

                  {editableColumns.map((col, cIdx) => {
                    const isSelected = selectedCell.rowIdx === rIdx && selectedCell.colIdx === cIdx;
                    const cellVal = getCellValue(rIdx, cIdx);
                    const isCellEditing = isSelected && isEditing;

                    return (
                      <td
                        key={cIdx}
                        onClick={() => {
                          setSelectedCell({ rowIdx: rIdx, colIdx: cIdx });
                        }}
                        onDoubleClick={() => {
                          setSelectedCell({ rowIdx: rIdx, colIdx: cIdx });
                          setEditValue(String(cellVal ?? ''));
                          setIsEditing(true);
                        }}
                        className={cn(
                          "relative px-3 py-1.5 border-r border-zinc-200 dark:border-zinc-800 font-mono text-xs transition-all",
                          isSelected && "ring-2 ring-indigo-500 ring-inset bg-indigo-50/30 dark:bg-indigo-950/30 z-10",
                          !isSelected && "hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 cursor-cell"
                        )}
                      >
                        {isCellEditing ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => commitCellEdit(editValue)}
                            className="w-full -my-1 -mx-2 px-2 py-1 bg-white dark:bg-zinc-900 border-2 border-indigo-600 rounded text-xs font-mono outline-none shadow-sm"
                          />
                        ) : (
                          <div className="truncate text-zinc-800 dark:text-zinc-200">
                            {cellVal === '' || cellVal === null || cellVal === undefined ? (
                              <span className="text-zinc-300 dark:text-zinc-700 italic">empty</span>
                            ) : (
                              String(cellVal)
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
