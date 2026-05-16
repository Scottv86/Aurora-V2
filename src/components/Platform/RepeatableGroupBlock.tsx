import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Edit2, Eye, Layers, Check, X, ChevronRight, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { FieldInput } from '../FieldInput';
import { useModalStack } from '../../context/ModalStackContext';

interface RepeatableGroupBlockProps {
  field: any; // The field definition from the layout
  value: any[]; // The array of sub-records
  onChange?: (newValue: any[]) => void;
  readOnly?: boolean;
  hideHeader?: boolean;
  onBlur?: () => void;
}

export const RepeatableGroupBlock: React.FC<RepeatableGroupBlockProps> = ({
  field,
  value = [],
  onChange,
  readOnly = false,
  hideHeader = false,
  onBlur
}) => {
  const { pushModal } = useModalStack();
  const [localRows, setLocalRows] = useState(value);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(localRows.length / pageSize);

  const paginatedRows = localRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  // Sync with external value prop
  React.useEffect(() => {
    setLocalRows(value);
  }, [value]);

  const triggerBlockSave = (newRows: any[]) => {
    if (JSON.stringify(newRows) !== JSON.stringify(value)) {
      onChange?.(newRows);
      // Trigger an immediate server-side save for collection changes
      onBlur?.();
    }
  };

  const handleAdd = () => {
    if (readOnly) return;
    const newRow = {};
    
    // Launch modal for the new row immediately
    pushModal({
      moduleId: 'virtual',
      type: 'edit',
      title: `New ${field.label} Item`,
      localData: newRow,
      localSchema: field.fields,
      onSaveLocal: (updatedRow) => {
        const finalRows = [...localRows, updatedRow];
        setLocalRows(finalRows);
        triggerBlockSave(finalRows);
      }
    });
  };

  const handleRemove = (index: number) => {
    if (readOnly) return;
    setDeletingIndex(index);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (deletingIndex === null) return;
    const newRows = localRows.filter((_, i) => i !== deletingIndex);
    setLocalRows(newRows);
    triggerBlockSave(newRows);
    setShowDeleteModal(false);
    setDeletingIndex(null);
  };

  const handleUpdateRow = (index: number, rowUpdates: any) => {
    if (readOnly) return;
    const newRows = [...localRows];
    newRows[index] = { ...newRows[index], ...rowUpdates };
    setLocalRows(newRows);
  };

  const handleDrillDown = (index: number, isReadOnly: boolean = false) => {
    const row = localRows[index];
    pushModal({
      moduleId: 'virtual',
      type: isReadOnly ? 'view' : 'edit',
      title: `${field.label} Detail`,
      localData: row,
      localSchema: field.fields,
      onSaveLocal: isReadOnly ? undefined : (updatedRow) => {
        const newRows = [...localRows];
        newRows[index] = updatedRow;
        setLocalRows(newRows);
        triggerBlockSave(newRows);
      }
    });
  };

  // Default to table if not specified
  const displayMode = field.variant || 'table';

  return (
    <div 
      className="space-y-4 outline-none" 
      tabIndex={0} 
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          triggerBlockSave(localRows);
          onBlur?.();
        }
      }}
    >
      {displayMode === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {localRows.map((row, idx) => (
            <button
              key={idx}
              onClick={() => handleDrillDown(idx)}
              className="group relative flex flex-col p-6 bg-white dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] hover:border-indigo-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all text-left shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight size={18} className="text-indigo-500 transform group-hover:translate-x-1 transition-transform" />
              </div>
              
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 rounded-[1.25rem] bg-indigo-500/5 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-500 shadow-inner">
                   <Layers size={24} />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                    Item #{idx + 1}
                  </p>
                  <p className="text-lg font-bold text-zinc-900 dark:text-white truncate leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {row[field.fields[0]?.id] || 'Untitled Record'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-4 gap-x-6 pt-5 border-t border-zinc-100 dark:border-zinc-800/50 mt-auto">
                {field.fields.slice(1, 5).map((f: any) => (
                  <div key={f.id} className="min-w-0">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest truncate">{f.label}</p>
                    <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 truncate mt-1">
                      {row[f.id] ? String(row[f.id]) : <span className="text-zinc-300 dark:text-zinc-800">—</span>}
                    </p>
                  </div>
                ))}
                {field.fields.length > 5 && (
                  <div className="col-span-2 pt-1">
                    <p className="text-[10px] text-zinc-400 font-medium italic">+{field.fields.length - 5} more properties</p>
                  </div>
                )}
              </div>
              
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}

          {!readOnly && (
            <button 
              onClick={handleAdd}
              className={cn(
                "flex flex-col items-center justify-center p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] group hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-center",
                localRows.length === 0 ? "col-span-full py-16" : ""
              )}
            >
              <div className="w-14 h-14 bg-zinc-50 dark:bg-zinc-900 rounded-[1.25rem] flex items-center justify-center mx-auto mb-4 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-inner">
                <Plus size={24} className="text-zinc-400 group-hover:text-white" />
              </div>
              <p className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] group-hover:text-indigo-500 transition-colors">
                {localRows.length === 0 ? `Initialize ${field.label}` : 'Add New'}
              </p>
              <p className="text-[10px] text-zinc-400 mt-2 font-medium">Click to expand this collection.</p>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-950/30 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden overflow-x-auto shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                {(field.fields || []).map((subField: any) => (
                  <th key={subField.id} className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.15em]">
                    {subField.label}
                  </th>
                ))}
                {!readOnly && (
                  <th className="px-8 py-5 text-right">
                    <button 
                      onClick={handleAdd}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                    >
                      <Plus size={14} />
                      Add
                    </button>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {localRows.length === 0 ? (
                <tr>
                  <td colSpan={(field.fields?.length || 0) + (readOnly ? 0 : 1)} className="px-8 py-20 text-center">
                    <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <Layers size={20} className="text-zinc-300" />
                    </div>
                    <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Empty Collection</p>
                    {!readOnly && (
                      <button 
                        onClick={handleAdd}
                        className="mt-6 px-6 py-2.5 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 rounded-xl text-[10px] font-bold hover:bg-indigo-500 hover:text-white transition-all uppercase tracking-widest"
                      >
                        Create your first record
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, idx) => {
                  const actualIndex = (currentPage - 1) * pageSize + idx;
                  return (
                    <tr 
                      key={actualIndex} 
                      onClick={() => handleDrillDown(actualIndex)}
                      className="group cursor-pointer hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors"
                    >
                      {field.fields.map((subField: any) => (
                        <td key={subField.id} className="px-8 py-5">
                          <div className="text-sm text-zinc-700 dark:text-zinc-300 font-semibold tracking-tight">
                            {row[subField.id] ? String(row[subField.id]) : <span className="text-zinc-300 dark:text-zinc-800 font-normal">—</span>}
                          </div>
                        </td>
                      ))}
                      {!readOnly && (
                        <td className="px-8 py-5 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDrillDown(actualIndex, true);
                              }} 
                              className="p-2.5 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-500/10 rounded-2xl transition-all"
                              title="View"
                            >
                              <Eye size={16} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDrillDown(actualIndex);
                              }} 
                              className="p-2.5 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-500/10 rounded-2xl transition-all"
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemove(actualIndex);
                              }} 
                              className="p-2.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all"
                              title="Remove"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Pagination Footer */}
          {localRows.length > 0 && (
            <div className="px-8 py-5 bg-zinc-50/50 dark:bg-zinc-950/30 border-t border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                Showing <span className="text-zinc-900 dark:text-white">{(currentPage - 1) * pageSize + 1}</span> to <span className="text-zinc-900 dark:text-white">{Math.min(currentPage * pageSize, localRows.length)}</span> of <span className="text-zinc-900 dark:text-white">{localRows.length}</span> items
              </p>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 transition-all shadow-sm"
                >
                  Prev
                </button>
                
                <div className="flex items-center gap-1.5">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={cn(
                        "w-8 h-8 rounded-lg text-[10px] font-bold transition-all",
                        currentPage === i + 1 
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                          : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      )}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 transition-all shadow-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="absolute inset-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-[440px] max-w-[95vw] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-2xl p-10 space-y-8"
            >
              <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center text-rose-500 mx-auto">
                <AlertCircle size={32} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Delete Item?</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                  Are you sure you want to remove this item from the collection? This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setShowDeleteModal(false)} 
                  className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-xl font-bold text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete} 
                  className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-700 transition-all shadow-xl shadow-rose-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
