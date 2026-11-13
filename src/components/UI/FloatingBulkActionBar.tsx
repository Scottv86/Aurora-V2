import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  UserCheck, 
  Tag, 
  FolderInput, 
  Star, 
  Download, 
  Trash2,
  ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';

export interface FloatingBulkActionBarProps<T = any> {
  selectedIds: (string | number)[];
  selectedItems?: T[];
  totalCount?: number;
  onClearSelection: () => void;
  onSelectAll?: () => void;
  
  // Bulk Assign
  onBulkAssign?: (selectedIds: (string | number)[], selectedItems: T[], assigneeId: string, clearSelection: () => void) => void;
  assigneeOptions?: { id: string; name: string; avatarUrl?: string }[];
  
  // Bulk Status
  onBulkStatusChange?: (selectedIds: (string | number)[], selectedItems: T[], status: string, clearSelection: () => void) => void;
  statusOptions?: (string | { label: string; value: string })[];
  
  // Bulk Move
  onBulkMove?: (selectedIds: (string | number)[], selectedItems: T[], clearSelection: () => void) => void;
  
  // Bulk Star
  onBulkStar?: (selectedIds: (string | number)[], selectedItems: T[], star: boolean, clearSelection: () => void) => void;
  
  // Export CSV
  onExportSelected?: (selectedIds: (string | number)[], selectedItems: T[]) => void;
  
  // Bulk Delete
  onBulkDelete?: (selectedIds: (string | number)[], selectedItems: T[], clearSelection: () => void) => void;
  deleteTitle?: string;
  deleteDescription?: string;
  
  // Custom bulk actions
  bulkActions?: React.ReactNode | ((selectedIds: (string | number)[], selectedItems: T[], clearSelection: () => void) => React.ReactNode);
  
  className?: string;
}

export function FloatingBulkActionBar<T extends Record<string, any>>({
  selectedIds,
  selectedItems = [],
  totalCount,
  onClearSelection,
  onSelectAll,
  onBulkAssign,
  assigneeOptions = [],
  onBulkStatusChange,
  statusOptions = [],
  onBulkMove,
  onBulkStar,
  onExportSelected,
  onBulkDelete,
  deleteTitle,
  deleteDescription,
  bulkActions,
  className = ''
}: FloatingBulkActionBarProps<T>) {
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  const selectedCount = selectedIds.length;

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setShowAssignMenu(false);
        setShowStatusMenu(false);
      }
    };
    if (showAssignMenu || showStatusMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }
  }, [showAssignMenu, showStatusMenu]);

  // Pressing Escape clears selection or closes menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedCount > 0) {
        if (showAssignMenu || showStatusMenu) {
          setShowAssignMenu(false);
          setShowStatusMenu(false);
        } else {
          onClearSelection();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCount, showAssignMenu, showStatusMenu, onClearSelection]);

  if (selectedCount === 0) return null;

  const handleDefaultExport = () => {
    if (onExportSelected) {
      onExportSelected(selectedIds, selectedItems);
      return;
    }

    if (selectedItems.length === 0) {
      toast.error('No record data available to export');
      return;
    }

    try {
      const allKeys = Array.from(
        new Set(
          selectedItems.flatMap(item => Object.keys(item).filter(k => !k.startsWith('_') && typeof item[k] !== 'function'))
        )
      );

      const headers = allKeys.join(',');
      const rows = selectedItems.map(item => {
        return allKeys.map(k => {
          let val = item[k];
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') val = JSON.stringify(val);
          val = String(val).replace(/"/g, '""');
          return `"${val}"`;
        }).join(',');
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `records_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Exported ${selectedCount} record(s)`);
    } catch (err: any) {
      toast.error('Failed to export records');
    }
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          ref={barRef}
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 25, scale: 0.95 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto select-none ${className}`}
        >
          {/* Main Floating Capsule Container */}
          <div className="h-11 px-2.5 rounded-full bg-zinc-950/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-zinc-800/90 dark:border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.85)] ring-1 ring-white/10 flex items-center gap-1.5 whitespace-nowrap">
            
            {/* Selected Count Badge & Selection Info */}
            <div className="flex items-center gap-2 pl-1 pr-1.5 shrink-0">
              <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-indigo-600 text-white font-black text-[11px] leading-none shadow-xs shadow-indigo-500/40">
                {selectedCount}
              </span>
              <span className="text-xs font-semibold text-zinc-200">
                selected
              </span>

              {/* Select All shortcut */}
              {onSelectAll && totalCount && totalCount > selectedCount && (
                <>
                  <span className="text-zinc-600 text-xs">•</span>
                  <button
                    type="button"
                    onClick={onSelectAll}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:underline transition-colors cursor-pointer"
                    title={`Select all ${totalCount} records`}
                  >
                    Select all {totalCount}
                  </button>
                </>
              )}
            </div>

            {/* Vertical Divider */}
            <div className="h-4 w-px bg-zinc-800 dark:bg-white/10 mx-0.5 shrink-0" />

            {/* Actions Row - strictly horizontal, never wraps */}
            <div className="flex items-center gap-0.5 shrink-0">
              
              {/* Assign Action */}
              {onBulkAssign && assigneeOptions.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAssignMenu(prev => !prev);
                      setShowStatusMenu(false);
                    }}
                    className={`h-8 px-2.5 rounded-full flex items-center gap-1.5 text-xs font-medium transition-all cursor-pointer ${
                      showAssignMenu 
                        ? 'bg-white/15 text-white' 
                        : 'text-zinc-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <UserCheck size={14} className="text-zinc-400" />
                    <span>Assign</span>
                    <ChevronDown size={11} className={`text-zinc-400 transition-transform duration-150 ${showAssignMenu ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {showAssignMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.96 }}
                        transition={{ duration: 0.12 }}
                        className="absolute bottom-full mb-3 left-0 w-52 p-1.5 bg-zinc-950/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-zinc-800 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/80 ring-1 ring-white/10 z-50 max-h-64 overflow-y-auto custom-scrollbar"
                      >
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-800/80 mb-1">
                          Assign To
                        </div>
                        {assigneeOptions.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                              onBulkAssign(selectedIds, selectedItems, user.id, onClearSelection);
                              setShowAssignMenu(false);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left rounded-xl hover:bg-white/10 text-zinc-200 hover:text-white transition-colors cursor-pointer"
                          >
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt={user.name} className="w-4 h-4 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-[9px] flex items-center justify-center shrink-0">
                                {user.name?.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="truncate">{user.name}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Status Action */}
              {onBulkStatusChange && statusOptions.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowStatusMenu(prev => !prev);
                      setShowAssignMenu(false);
                    }}
                    className={`h-8 px-2.5 rounded-full flex items-center gap-1.5 text-xs font-medium transition-all cursor-pointer ${
                      showStatusMenu 
                        ? 'bg-white/15 text-white' 
                        : 'text-zinc-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Tag size={14} className="text-zinc-400" />
                    <span>Status</span>
                    <ChevronDown size={11} className={`text-zinc-400 transition-transform duration-150 ${showStatusMenu ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {showStatusMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.96 }}
                        transition={{ duration: 0.12 }}
                        className="absolute bottom-full mb-3 left-0 w-48 p-1.5 bg-zinc-950/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-zinc-800 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/80 ring-1 ring-white/10 z-50 max-h-64 overflow-y-auto custom-scrollbar"
                      >
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-800/80 mb-1">
                          Update Status
                        </div>
                        {statusOptions.map((opt, i) => {
                          const label = typeof opt === 'string' ? opt : opt.label;
                          const value = typeof opt === 'string' ? opt : opt.value;
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                onBulkStatusChange(selectedIds, selectedItems, value, onClearSelection);
                                setShowStatusMenu(false);
                              }}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-left rounded-xl hover:bg-white/10 text-zinc-200 hover:text-white transition-colors cursor-pointer"
                            >
                              <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                              <span className="truncate">{label}</span>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Move Action */}
              {onBulkMove && (
                <button
                  type="button"
                  onClick={() => onBulkMove(selectedIds, selectedItems, onClearSelection)}
                  className="h-8 px-2.5 rounded-full flex items-center gap-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                  title="Move to another module"
                >
                  <FolderInput size={14} className="text-zinc-400" />
                  <span>Move</span>
                </button>
              )}

              {/* Star Action */}
              {onBulkStar && (
                <button
                  type="button"
                  onClick={() => onBulkStar(selectedIds, selectedItems, true, onClearSelection)}
                  className="h-8 px-2.5 rounded-full flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 transition-all cursor-pointer"
                  title="Star selected records"
                >
                  <Star size={14} className="fill-amber-400 text-amber-400" />
                  <span>Star</span>
                </button>
              )}

              {/* Export Action */}
              <button
                type="button"
                onClick={handleDefaultExport}
                className="h-8 px-2.5 rounded-full flex items-center gap-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                title="Export selected as CSV"
              >
                <Download size={14} className="text-zinc-400" />
                <span>Export</span>
              </button>

              {/* Custom Actions Slot (e.g. Assign to me) */}
              {typeof bulkActions === 'function'
                ? bulkActions(selectedIds, selectedItems, onClearSelection)
                : bulkActions}

              {/* Delete Action */}
              {onBulkDelete && (
                <>
                  <div className="h-4 w-px bg-zinc-800 dark:bg-white/10 mx-0.5 shrink-0" />
                  <button
                    type="button"
                    onClick={() => setShowBulkDeleteModal(true)}
                    className="h-8 px-2.5 rounded-full flex items-center gap-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 transition-all cursor-pointer"
                    title="Delete selected records"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                </>
              )}
            </div>

            {/* Vertical Divider */}
            <div className="h-4 w-px bg-zinc-800 dark:bg-white/10 mx-0.5 shrink-0" />

            {/* Dismiss / Deselect Close Button */}
            <button
              type="button"
              onClick={onClearSelection}
              className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer shrink-0"
              title="Deselect all (Esc)"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBulkDeleteModal(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-[440px] max-w-[95vw] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-8 space-y-6"
            >
              <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center text-rose-500 mx-auto">
                <Trash2 size={26} />
              </div>
              <div className="text-center space-y-1.5">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  {deleteTitle || `Move ${selectedCount} ${selectedCount === 1 ? 'record' : 'records'} to Recycling Bin?`}
                </h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">
                  {deleteDescription || `Are you sure you want to delete ${selectedCount} selected ${selectedCount === 1 ? 'entry' : 'entries'}? These will be moved to the Recycling Bin and can be restored at any time.`}
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowBulkDeleteModal(false)}
                  className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-xl font-semibold text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    if (onBulkDelete) {
                      onBulkDelete(selectedIds, selectedItems, onClearSelection);
                    }
                    setShowBulkDeleteModal(false);
                  }}
                  className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl font-semibold text-xs hover:bg-rose-700 transition-all shadow-lg shadow-rose-500/20 cursor-pointer"
                >
                  Move to Recycling Bin
                </button>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
