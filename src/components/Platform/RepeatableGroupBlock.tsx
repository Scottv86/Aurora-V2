import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Edit2, Eye, Layers, ChevronRight, AlertCircle, Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useModalStack } from '../../context/ModalStackContext';
import { Table } from '../UI/Table';

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
  onBlur
}) => {
  const { pushModal } = useModalStack();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [savingRowCount, setSavingRowCount] = useState<number | null>(null);
  const [cardImgIndices, setCardImgIndices] = useState<Record<string, number>>({});

  // Keep a ref to the latest value so modal callbacks never have stale closures.
  // We do NOT maintain a separate localRows state — the component is fully controlled
  // by the `value` prop. This ensures server-generated values (like autonumbers) are
  // reflected in the table immediately when the parent state updates.
  const valueRef = React.useRef(value);
  React.useLayoutEffect(() => {
    valueRef.current = value;
  });

  // Autonumber sub-fields in this repeatable group
  const autonumberSubFields = useMemo(
    () => (field.fields || []).filter((f: any) => f.type === 'autonumber'),
    [field.fields]
  );

  // Once value updates and the pending row now has autonumber values, clear the saving indicator
  React.useEffect(() => {
    if (savingRowCount === null) return;
    if (value.length < savingRowCount) return;
    const pendingRow = value[savingRowCount - 1];
    if (!pendingRow) return;
    // If there are no autonumber fields, or at least one has resolved, clear the indicator
    if (autonumberSubFields.length === 0 || autonumberSubFields.some((f: any) => pendingRow[f.id])) {
      setSavingRowCount(null);
    }
  }, [value, savingRowCount, autonumberSubFields]);

  const triggerSave = (newRows: any[]) => {
    onChange?.(newRows);
    onBlur?.();
  };

  const handleAdd = () => {
    if (readOnly) return;
    pushModal({
      moduleId: 'virtual',
      type: 'edit',
      title: `New ${field.label} Item`,
      localData: {},
      localSchema: field.fields,
      detailLayoutType: field.detailLayoutType,
      onSaveLocal: (updatedRow) => {
        // Use ref so we always append to the latest rows, not a stale snapshot
        const finalRows = [...valueRef.current, updatedRow];
        // Mark the new row as pending so the autonumber cell shows a loading indicator
        if (autonumberSubFields.length > 0) {
          setSavingRowCount(finalRows.length);
        }
        triggerSave(finalRows);
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
    const newRows = valueRef.current.filter((_, i) => i !== deletingIndex);
    triggerSave(newRows);
    setShowDeleteModal(false);
    setDeletingIndex(null);
  };

  const handleDrillDown = (index: number, isReadOnly: boolean = false) => {
    const row = valueRef.current[index];
    pushModal({
      moduleId: 'virtual',
      type: isReadOnly ? 'view' : 'edit',
      title: `${field.label} Detail`,
      localData: row,
      localSchema: field.fields,
      detailLayoutType: field.detailLayoutType,
      onSaveLocal: isReadOnly ? undefined : (updatedRow) => {
        // Use ref so we always update the latest snapshot
        const newRows = [...valueRef.current];
        newRows[index] = updatedRow;
        triggerSave(newRows);
      }
    });
  };

  // Derive display rows from value (fully controlled — no local state)
  const rowsWithIds = useMemo(() => {
    let filtered = value.map((row, index) => ({
      ...row,
      id: row.id || `row-${index}`,
      _originalIndex: index
    }));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(row => {
        return field.fields.some((f: any) => {
          const val = row[f.id];
          return val && String(val).toLowerCase().includes(q);
        });
      });
    }

    return filtered;
  }, [value, searchQuery, field.fields]);

  const columns = useMemo(() => [
    ...(field.fields || []).map((subField: any) => ({
      header: subField.label,
      accessor: (row: any) => {
        const activeDensity = field.density || 'standard';
        const cellFontClass = activeDensity === 'compact' ? 'text-xs' : 'text-sm';
        // Show a loading badge for autonumber cells on the row currently awaiting server response
        const isPendingAutonumber =
          subField.type === 'autonumber' &&
          savingRowCount !== null &&
          row._originalIndex === savingRowCount - 1 &&
          !row[subField.id];
        if (isPendingAutonumber) {
          return (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-bold text-indigo-400 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
              Generating…
            </span>
          );
        }
        return (
          <div className={cn(cellFontClass, "text-zinc-700 dark:text-zinc-300 font-semibold tracking-tight")}>
            {row[subField.id] ? String(row[subField.id]) : <span className="text-zinc-300 dark:text-zinc-800 font-normal">—</span>}
          </div>
        );
      },
      sortable: true,
      sortKey: subField.id
    })),
    {
      header: '',
      className: 'text-right',
      accessor: (row: any) => {
        const activeDensity = field.density || 'standard';
        const buttonPaddingClass = activeDensity === 'compact' ? 'p-1.5' : 'p-2.5';
        return (
          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleDrillDown(row._originalIndex, true);
              }} 
              className={cn(buttonPaddingClass, "text-zinc-400 hover:text-indigo-500 hover:bg-indigo-500/10 rounded-2xl transition-all")}
              title="View"
            >
              <Eye size={16} />
            </button>
            {!readOnly && (
              <>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDrillDown(row._originalIndex);
                  }} 
                  className={cn(buttonPaddingClass, "text-zinc-400 hover:text-indigo-500 hover:bg-indigo-500/10 rounded-2xl transition-all")}
                  title="Edit"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(row._originalIndex);
                  }} 
                  className={cn(buttonPaddingClass, "text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all")}
                  title="Remove"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
          </div>
        );
      }
    }
  ], [field.fields, readOnly, field.density, savingRowCount]);

  // Default to table if not specified
  const displayMode = field.variant || 'table';

  const renderPortfolioView = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {value.map((row, idx) => {
          const subFields = field.fields || [];
          const titleField = subFields[0];
          const recordTitle = row[titleField?.id] || row[titleField?.name] || 'Untitled Record';
          const rowId = row.id || `row-${idx}`;

          // Auto-detect image
          let images: string[] = [];
          const fileFields = subFields.filter((f: any) => f.type === 'file' || f.type === 'url');
          fileFields.forEach((f: any) => {
            const val = row[f.id];
            if (val) {
              if (typeof val === 'string') {
                if (val.includes(',')) {
                  images.push(...val.split(',').map(s => s.trim()).filter(Boolean));
                } else {
                  images.push(val);
                }
              } else if (Array.isArray(val)) {
                images.push(...val.filter(v => typeof v === 'string'));
              }
            }
          });

          if (images.length === 0) {
            const fallbacks = [
              "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80",
              "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80",
              "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80",
              "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=600&q=80"
            ];
            images.push(fallbacks[idx % fallbacks.length]);
          }

          const activeImgIdx = cardImgIndices[rowId] || 0;

          const handlePrevImage = (e: React.MouseEvent) => {
            e.stopPropagation();
            setCardImgIndices(prev => ({
              ...prev,
              [rowId]: activeImgIdx === 0 ? images.length - 1 : activeImgIdx - 1
            }));
          };

          const handleNextImage = (e: React.MouseEvent) => {
            e.stopPropagation();
            setCardImgIndices(prev => ({
              ...prev,
              [rowId]: activeImgIdx === images.length - 1 ? 0 : activeImgIdx + 1
            }));
          };

          const customFields = subFields
            .filter((f: any) => f.id !== titleField?.id && f.type !== 'file' && f.type !== 'repeatableGroup' && f.type !== 'sub_module')
            .slice(0, 3);

          return (
            <div
              key={idx}
              onClick={() => handleDrillDown(idx)}
              className="group relative flex flex-col bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] hover:border-indigo-500/55 hover:shadow-2xl hover:shadow-indigo-500/[0.04] hover:-translate-y-1 cursor-pointer transition-all duration-300 overflow-hidden min-h-[320px]"
            >
              {/* Card Slider Header */}
              <div className="h-40 w-full overflow-hidden relative border-b border-zinc-100 dark:border-zinc-800/80 group/gallery">
                <img 
                  src={images[activeImgIdx]} 
                  alt={recordTitle}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {images.length > 1 && (
                  <>
                    <button 
                      onClick={handlePrevImage}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 bg-black/30 hover:bg-black/50 text-white rounded-full opacity-0 group-hover/gallery:opacity-100 transition-opacity backdrop-blur-md border border-white/10 z-10"
                    >
                      <ChevronRight className="rotate-180" size={12} />
                    </button>
                    <button 
                      onClick={handleNextImage}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-black/30 hover:bg-black/50 text-white rounded-full opacity-0 group-hover/gallery:opacity-100 transition-opacity backdrop-blur-md border border-white/10 z-10"
                    >
                      <ChevronRight size={12} />
                    </button>
                  </>
                )}
                <div className="absolute top-4 left-4 px-2.5 py-1 bg-black/45 backdrop-blur-md border border-white/10 rounded-xl text-white text-[9px] font-black uppercase tracking-widest">
                  Item #{idx + 1}
                </div>
              </div>
              
              {/* Details Content */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white leading-snug group-hover:text-indigo-500 transition-colors line-clamp-2">
                    {recordTitle}
                  </h4>
                  
                  {/* Highlights Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
                    {customFields.map((f: any) => {
                      const val = row[f.id];
                      return (
                        <div key={f.id} className="min-w-0">
                          <span className="text-[9px] font-black text-zinc-450 uppercase tracking-wider block">{f.label || f.name}</span>
                          <span className="text-[11px] font-bold text-zinc-650 dark:text-zinc-350 truncate block mt-0.5">
                            {val !== undefined && val !== null && val !== '' ? String(val) : '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Actions footer */}
                <div className="flex items-center justify-between pt-4 mt-6 border-t border-zinc-100 dark:border-zinc-800/60">
                  <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Portfolio</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDrillDown(idx, true); }}
                      className="p-2 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-400 hover:text-indigo-500 rounded-xl transition-all"
                      title="View Details"
                    >
                      <Eye size={12} />
                    </button>
                    {!readOnly && (
                      <>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDrillDown(idx); }}
                          className="p-2 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-400 hover:text-indigo-500 rounded-xl transition-all"
                          title="Edit"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleRemove(idx); }}
                          className="p-2 bg-zinc-50 hover:bg-rose-500/10 dark:bg-zinc-850 dark:hover:bg-rose-500/10 text-zinc-400 hover:text-rose-500 rounded-xl transition-all"
                          title="Remove"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        {!readOnly && (
          <button 
            onClick={handleAdd}
            className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] group hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-center min-h-[320px]"
          >
            <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-900 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-inner">
              <Plus size={20} className="text-zinc-400 group-hover:text-white" />
            </div>
            <p className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest group-hover:text-indigo-500 transition-colors">
              Add Portfolio Item
            </p>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {displayMode === 'portfolio' ? (
        renderPortfolioView()
      ) : displayMode === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {value.map((row, idx) => (
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
                      {row[f.id] ? String(row[f.id]) : <span className="text-zinc-300 dark:text-zinc-800 font-normal">—</span>}
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
                value.length === 0 ? "col-span-full py-16" : ""
              )}
            >
              <div className="w-14 h-14 bg-zinc-50 dark:bg-zinc-900 rounded-[1.25rem] flex items-center justify-center mx-auto mb-4 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-inner">
                <Plus size={24} className="text-zinc-400 group-hover:text-white" />
              </div>
              <p className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] group-hover:text-indigo-500 transition-colors">
                {value.length === 0 ? `Initialize ${field.label}` : 'Add New'}
              </p>
              <p className="text-[10px] text-zinc-400 mt-2 font-medium">Click to expand this collection.</p>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white/5 dark:bg-zinc-950/20 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] overflow-hidden shadow-inner">
          <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
            <div className="flex-1 max-w-xs relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
              <input 
                type="text"
                placeholder={`Search ${field.label}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>
            {!readOnly && (
              <button 
                onClick={handleAdd}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.15em] hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/20 transition-all active:scale-95"
              >
                <Plus size={14} />
                Add Record
              </button>
            )}
          </div>
          <Table 
            data={rowsWithIds}
            columns={columns}
            onRowClick={(row) => handleDrillDown(row._originalIndex)}
            emptyMessage={searchQuery ? 'No items match your search.' : `Empty Collection. ${!readOnly ? 'Create your first record to begin.' : ''}`}
            className="bg-transparent dark:bg-transparent border-none"
            noContainer={true}
            density={field.density || 'standard'}
          />
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
