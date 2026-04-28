import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  List as ListIcon, 
  Search, 
  Plus, 
  History, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  ChevronRight, 
  ChevronLeft,
  Clock, 
  Database, 
  AlertCircle,
  MoreVertical,
  Activity,
  Box,
  Eye,
  EyeOff,
  Columns,
  Type,
  Settings2,
  Save,
  PlusCircle,
  Hash,
  Calendar,
  ToggleLeft,
  ChevronDown,
  LayoutGrid,
  GripVertical,
  ArrowLeft,
  Filter,
  ArrowRight,
  Info,
  User,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Settings,
  GripHorizontal,
  Archive,
  RefreshCcw,
  UserCheck,
  ListFilter,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DndContext, 
  closestCenter, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  defaultDropAnimationSideEffects,
  rectIntersection
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { useGlobalLists, useGlobalList, GlobalListItem, ListColumn } from '../../../hooks/useGlobalList';
import { usePlatform } from '../../../hooks/usePlatform';
import { PageHeader } from '../../UI/PageHeader';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

export const GlobalListsSettings = () => {
  const { modules } = usePlatform();
  const { lists, loading: listsLoading, createList, deleteList, refetch: refetchLists } = useGlobalLists();
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [inspectedItem, setInspectedItem] = useState<GlobalListItem | null>(null);
  const [newListData, setNewListData] = useState({ name: '', description: '' });
  const [activeMenuColumnId, setActiveMenuColumnId] = useState<string | null>(null);
  const [activeMenuRowId, setActiveMenuRowId] = useState<string | null>(null);
  const [activeEditingCell, setActiveEditingCell] = useState<{ itemId: string, colId: string } | null>(null);
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [metadataForm, setMetadataForm] = useState({ name: '', description: '' });
  const [confirmDeleteListId, setConfirmDeleteListId] = useState<string | null>(null);
  const [confirmDeleteColumnId, setConfirmDeleteColumnId] = useState<string | null>(null);
  const [confirmRetireItemId, setConfirmRetireItemId] = useState<string | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [rowHeight, setRowHeight] = useState(48);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, type: 'cell' | 'header', itemId?: string, colId?: string, colIndex?: number, rowIndex?: number } | null>(null);

  const activeListSummary = useMemo(() => lists.find(l => l.id === selectedListId), [lists, selectedListId]);
  const { 
    list: activeList,
    items: dbItems, 
    loading: itemsLoading, 
    addItem, 
    editItem, 
    retireItem,
    reorderItems,
    updateSchema,
    updateMetadata
  } = useGlobalList(selectedListId, { showAllHistory: showHistory });
  const [localItems, setLocalItems] = useState<GlobalListItem[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [isSyncingOrder, setIsSyncingOrder] = useState(false);
  const [pendingSaves, setPendingSaves] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!activeDragId && !isSyncingOrder) {
      setLocalItems(prev => {
        return dbItems.map(dbItem => {
          const localItem = prev.find(p => p.id === dbItem.id);
          if (!localItem) return dbItem;
          const mergedData = { ...dbItem.data };
          Object.keys(localItem.data).forEach(key => {
            if (pendingSaves.has(`${dbItem.id}-${key}`)) mergedData[key] = localItem.data[key];
          });
          return { ...dbItem, data: mergedData };
        });
      });
    }
  }, [dbItems, activeDragId, isSyncingOrder, pendingSaves]);

  useEffect(() => { if (activeList) setMetadataForm({ name: activeList.name, description: activeList.description || '' }); }, [activeList]);
  
  useEffect(() => {
    const handleCloseMenu = () => setContextMenu(null);
    window.addEventListener('click', handleCloseMenu);
    window.addEventListener('contextmenu', (e) => { if (!(e.target as HTMLElement).closest('.context-menu-trigger')) setContextMenu(null); });
    return () => { window.removeEventListener('click', handleCloseMenu); window.removeEventListener('contextmenu', handleCloseMenu); };
  }, []);

  const filteredLists = useMemo(() => lists.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()) || l.description?.toLowerCase().includes(searchQuery.toLowerCase())), [lists, searchQuery]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 10 } }));
  
  const handleDragStart = (event: DragStartEvent) => setActiveDragId(event.active.id as string);
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = localItems.findIndex(item => item.id === active.id);
    const newIndex = localItems.findIndex(item => item.id === over.id);
    const nextItems = arrayMove(localItems, oldIndex, newIndex);
    setLocalItems(nextItems);
    setIsSyncingOrder(true);
    const orderUpdates = nextItems.map((item, index) => ({ id: item.id, sort_order: index }));
    try { await reorderItems(orderUpdates); } catch (err) { setLocalItems(dbItems); } finally { setIsSyncingOrder(false); }
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListData.name) return;
    try { const newList = await createList(newListData.name, newListData.description); setIsCreatingList(false); setNewListData({ name: '', description: '' }); if (newList) setSelectedListId(newList.id); } catch (err) { }
  };

  const handleSaveMetadata = async () => { if (!metadataForm.name) return; await updateMetadata(metadataForm.name, metadataForm.description); await refetchLists(); setIsEditingMetadata(false); };
  
  const handleCellChange = async (item: GlobalListItem, columnId: string, newValue: any) => {
    const saveKey = `${item.id}-${columnId}`;
    setPendingSaves(prev => new Set(prev).add(saveKey));
    const updatedData = { ...(item.data || {}), [columnId]: newValue };
    setLocalItems(prev => prev.map(i => i.id === item.id ? { ...i, data: updatedData } : i));
    try {
      await editItem(item.id, updatedData);
      setTimeout(() => setPendingSaves(prev => { const next = new Set(prev); next.delete(saveKey); return next; }), 500);
    } catch (err: any) {
      toast.error(`Save failed: ${err.message || 'Unknown error'}`);
      setPendingSaves(prev => { const next = new Set(prev); next.delete(saveKey); return next; });
      setLocalItems(dbItems);
    }
  };

  const handleColumnUpdate = async (columnId: string, updates: Partial<ListColumn>) => { if (!activeList) return; const updatedColumns = activeList.columns.map(col => col.id === columnId ? { ...col, ...updates } : col); await updateSchema(updatedColumns); };
  
  const handleAddColumn = async (insertAt?: number) => { 
    if (!activeList) return; 
    const newCol: ListColumn = { id: 'col_' + Math.random().toString(36).substr(2, 9), name: 'New Column', type: 'text', required: false }; 
    const nextCols = [...activeList.columns];
    if (insertAt !== undefined) nextCols.splice(insertAt, 0, newCol);
    else nextCols.push(newCol);
    await updateSchema(nextCols); 
  };

  const handleDeleteColumn = async (colId?: string) => { 
    const id = colId || confirmDeleteColumnId;
    if (!activeList || !id) return; 
    const updatedColumns = activeList.columns.filter(col => col.id !== id); 
    await updateSchema(updatedColumns); 
    setConfirmDeleteColumnId(null); 
  };

  const handleRetireItem = async (itemId?: string) => { 
    const id = itemId || confirmRetireItemId;
    if (!id) return; 
    await retireItem(id); 
    setConfirmRetireItemId(null); 
    setInspectedItem(null); 
  };

  const handleResizeColumn = (columnId: string, newWidth: number) => setColumnWidths(prev => ({ ...prev, [columnId]: Math.max(100, newWidth) }));

  const handleAddRow = async (insertAt?: number) => {
    if (!activeList) return;
    try {
      const initialData: Record<string, any> = {};
      activeList.columns.forEach(col => {
        if (col.type === 'boolean') initialData[col.id] = false;
        else initialData[col.id] = null;
      });
      const newItemId = await addItem(initialData);
      
      if (insertAt !== undefined && newItemId) {
        const currentOrder = localItems.map(i => i.id);
        currentOrder.splice(insertAt, 0, newItemId);
        const orderUpdates = currentOrder.map((id, index) => ({ id, sort_order: index }));
        await reorderItems(orderUpdates);
      }
      
      if (newItemId) {
        setActiveEditingCell({ itemId: newItemId, colId: activeList.columns[0].id });
      }
      toast.success('New row added');
    } catch (err: any) {
      toast.error(`Failed to add row: ${err.message}`);
    }
  };

  const handleTab = (itemId: string, colId: string, shift: boolean) => {
    if (!activeList) return;
    const itemIndex = localItems.findIndex(i => i.id === itemId);
    const colIndex = activeList.columns.findIndex(c => c.id === colId);
    
    if (!shift) {
      if (colIndex < activeList.columns.length - 1) {
        setActiveEditingCell({ itemId, colId: activeList.columns[colIndex + 1].id });
      } else if (itemIndex < localItems.length - 1) {
        setActiveEditingCell({ itemId: localItems[itemIndex + 1].id, colId: activeList.columns[0].id });
      } else {
        handleAddRow();
      }
    } else {
      if (colIndex > 0) {
        setActiveEditingCell({ itemId, colId: activeList.columns[colIndex - 1].id });
      } else if (itemIndex > 0) {
        setActiveEditingCell({ itemId: localItems[itemIndex - 1].id, colId: activeList.columns[activeList.columns.length - 1].id });
      }
    }
  };

  const onHeaderContextMenu = (e: React.MouseEvent, colId: string, index: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'header', colId, colIndex: index });
  };

  const onCellContextMenu = (e: React.MouseEvent, itemId: string, colId: string, rowIndex: number, colIndex: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'cell', itemId, colId, rowIndex, colIndex });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] w-full px-6 lg:px-12 py-10">
      <AnimatePresence mode="wait">
        {!selectedListId ? (
          <motion.div key="master" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 flex flex-col space-y-8">
            <PageHeader title="Global Lists" description="Enterprise-grade lookup tables with full SCD Type 2 versioning." />
            <div className="flex flex-col space-y-6">
              <div className="flex items-center gap-4">
                <div className="relative w-96">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input type="text" placeholder="Search lists..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:border-indigo-500 transition-all" />
                </div>
                <button onClick={() => setIsCreatingList(true)} className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-500 transition-all shadow-lg active:scale-95">
                  <Plus size={18} />
                  <span>Create List</span>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pb-12">
                {listsLoading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-64 bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded-3xl" />) : filteredLists.map((list) => (
                  <motion.div key={list.id} whileHover={{ y: -4 }} onClick={() => setSelectedListId(list.id)} className="group cursor-pointer bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between min-h-[180px]">
                    <div className="space-y-4"><div className="p-3 w-fit bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors"><Database size={20} /></div><div className="space-y-1"><h3 className="text-lg font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 transition-colors">{list.name}</h3><p className="text-sm text-zinc-500 line-clamp-2">{list.description || <span className="italic text-zinc-400 opacity-50">No description provided</span>}</p></div></div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-row gap-6 overflow-visible">
            <div className="flex-1 flex flex-col min-w-0 overflow-visible">
              <div className="mb-6 flex items-center justify-between bg-white dark:bg-zinc-900/40 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative z-40 backdrop-blur-md">
                <div className="flex items-center gap-6">
                  <button onClick={() => { setSelectedListId(null); setInspectedItem(null); setActiveMenuColumnId(null); setActiveEditingCell(null); setIsEditingMetadata(false); }} className="p-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-2xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all shadow-sm"><ArrowLeft size={20} /></button>
                  <div className="space-y-1 group">
                    {isEditingMetadata ? (
                      <div className="flex flex-col gap-2">
                        <input autoFocus value={metadataForm.name} onChange={(e) => setMetadataForm({ ...metadataForm, name: e.target.value })} className="text-2xl font-black bg-indigo-500/10 border-b border-indigo-500 text-indigo-600 dark:text-indigo-400 outline-none px-2" placeholder="List Name" />
                        <input value={metadataForm.description} onChange={(e) => setMetadataForm({ ...metadataForm, description: e.target.value })} className="text-xs font-bold text-zinc-500 bg-transparent border-b border-zinc-800 outline-none px-2" placeholder="Description (optional)" />
                        <div className="flex gap-2 mt-2"><button onClick={handleSaveMetadata} className="flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase"><Check size={12} /> Save</button><button onClick={() => setIsEditingMetadata(false)} className="flex items-center gap-1 px-3 py-1 bg-zinc-800 text-zinc-400 rounded-lg text-[10px] font-black uppercase"><X size={12} /> Cancel</button></div>
                      </div>
                    ) : (
                      <div className="flex flex-col cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/50 p-2 -m-2 rounded-xl transition-all" onClick={() => setIsEditingMetadata(true)}>
                        <div className="flex items-center gap-2"><h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight leading-none">{activeList?.name}</h2><Edit2 size={14} className="text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                        {activeList?.description && <p className="text-xs font-bold text-zinc-500 mt-1">{activeList.description}</p>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-zinc-100/50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl"><span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Density</span><input type="range" min="32" max="80" value={rowHeight} onChange={(e) => setRowHeight(parseInt(e.target.value))} className="w-20 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-600" /></div>
                    <button onClick={() => setConfirmDeleteListId(activeListSummary!.id)} className="p-3 text-zinc-400 hover:text-rose-600 rounded-2xl transition-all"><Trash2 size={20} /></button>
                </div>
              </div>
              <div className="flex-1 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden flex flex-col shadow-xl relative z-30">
                <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/80">
                   <div className="flex items-center gap-3"><div className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-400"><LayoutGrid size={14} /></div><span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{localItems.length} Records Active</span></div>
                   <button onClick={() => setShowHistory(!showHistory)} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border", showHistory ? "bg-rose-500 border-rose-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-transparent")}><History size={12} /><span>{showHistory ? 'Viewing History' : 'View History'}</span></button>
                </div>
                <div className="flex-1 overflow-auto custom-scrollbar relative z-30" onClick={(e) => { 
                  if (activeMenuColumnId && !(e.target as HTMLElement).closest('.column-header-container')) setActiveMenuColumnId(null); 
                  if (activeMenuRowId && !(e.target as HTMLElement).closest('.row-menu-container')) setActiveMenuRowId(null);
                }}>
                   {activeList && (
                     <DndContext sensors={sensors} collisionDetection={rectIntersection} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                       <table className="w-max min-w-full text-left border-collapse table-fixed relative z-30">
                         <thead className="sticky top-0 bg-white dark:bg-zinc-950 z-50 shadow-sm border-b border-zinc-100 dark:border-zinc-800">
                           <tr>
                             <th className="p-0 w-16 text-center border-r border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">#</th>
                             {activeList.columns.map((col, idx) => (
                               <th key={col.id} className="p-0 text-[10px] font-black uppercase text-zinc-400 relative group/th border-r border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 column-header-container context-menu-trigger" style={{ width: columnWidths[col.id] || 200 }} onContextMenu={(e) => onHeaderContextMenu(e, col.id, idx)}>
                                 <ColumnHeader column={col} index={idx} isMenuOpen={activeMenuColumnId === col.id} onToggleMenu={(open) => setActiveMenuColumnId(open ? col.id : null)} onUpdate={(updates) => handleColumnUpdate(col.id, updates)} onDelete={() => setConfirmDeleteColumnId(col.id)} onResize={(width) => handleResizeColumn(col.id, width)} onInsertLeft={() => handleAddColumn(idx)} onInsertRight={() => handleAddColumn(idx + 1)} disabled={showHistory} />
                               </th>
                             ))}

                             <th className="p-4 w-16 bg-zinc-50/30 dark:bg-zinc-900/30"></th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50 relative z-30">
                           <SortableContext items={localItems.map(i => i.id)} strategy={verticalListSortingStrategy} disabled={showHistory}>
                             {localItems.map((item, idx) => (
                               <SortableRow 
                                 key={item.id} 
                                 index={idx + 1} 
                                 item={item} 
                                 columns={activeList.columns} 
                                 columnWidths={columnWidths} 
                                 rowHeight={rowHeight} 
                                 onInspect={() => { setInspectedItem(item); setActiveMenuColumnId(null); setActiveMenuRowId(null); }} 
                                 isInspected={inspectedItem?.id === item.id} 
                                 onCellChange={(colId: string, val: any) => handleCellChange(item, colId, val)} 
                                 showHistory={showHistory}
                                 activeEditingColId={activeEditingCell?.itemId === item.id ? activeEditingCell.colId : null}
                                 setActiveEditingColId={(colId) => setActiveEditingCell(colId ? { itemId: item.id, colId } : null)}
                                 onTab={(colId: string, shift: boolean) => handleTab(item.id, colId, shift)}
                                 isMenuOpen={activeMenuRowId === item.id}
                                 onToggleMenu={(open) => setActiveMenuRowId(open ? item.id : null)}
                                 onInsertAbove={() => handleAddRow(idx)}
                                 onInsertBelow={() => handleAddRow(idx + 1)}
                                 onRetire={() => setConfirmRetireItemId(item.id)}
                                 onContextMenu={(e: React.MouseEvent, colId: string, colIndex: number) => onCellContextMenu(e, item.id, colId, idx, colIndex)}
                               />
                             ))}
                           </SortableContext>
                         </tbody>

                       </table>
                     </DndContext>
                   )}
                </div>
              </div>
            </div>
            <AnimatePresence>
              {inspectedItem && (
                <motion.aside initial={{ x: 100, width: 0, opacity: 0 }} animate={{ x: 0, width: 420, opacity: 1 }} exit={{ x: 100, width: 0, opacity: 0 }} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl z-50 backdrop-blur-xl shrink-0">
                  <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/50"><div><h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight uppercase">Record Inspector</h3><p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">VERSION: {inspectedItem.is_active ? 'CURRENT' : 'HISTORICAL'}</p></div><button onClick={() => setInspectedItem(null)} className="p-3 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-all"><X size={20} /></button></div>
                  <div className="flex-1 p-8 space-y-10 overflow-y-auto custom-scrollbar">
                     <div className="space-y-4"><label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Metadata</label><div className="grid grid-cols-2 gap-4"><div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-1"><span className="text-[9px] font-black text-zinc-400 uppercase">Valid From</span><p className="text-xs font-bold truncate">{new Date(inspectedItem.valid_from).toLocaleDateString()}</p></div><div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-1"><span className="text-[9px] font-black text-zinc-400 uppercase">Status</span><p className={cn("text-xs font-bold", inspectedItem.is_active ? "text-emerald-500" : "text-rose-500")}>{inspectedItem.is_active ? 'Active' : 'Retired'}</p></div></div></div>
                     <div className="space-y-4"><label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Full Record Data</label><div className="space-y-3">{activeList?.columns.map(col => <div key={col.id} className="p-4 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl flex items-center justify-between"><span className="text-xs font-bold text-zinc-500">{col.name}</span><span className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-tight">{renderCellContent(col, inspectedItem.data[col.id])}</span></div>)}</div></div>
                     {inspectedItem.is_active && <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800 space-y-4"><label className="text-[10px] font-black uppercase tracking-widest text-rose-500">Danger Zone</label><button onClick={() => { setConfirmRetireItemId(inspectedItem.id); setInspectedItem(null); }} className="w-full flex items-center justify-between p-5 bg-rose-500/5 hover:bg-rose-500 text-rose-500 hover:text-white rounded-2xl border border-rose-500/20 transition-all group"><div className="flex items-center gap-3"><Archive size={18} /> <span className="text-sm font-bold">Retire & Version Record</span></div><ChevronRight size={16} /></button></div>}
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {contextMenu && (
          <ContextMenuPortal 
            {...contextMenu} 
            onClose={() => setContextMenu(null)}
            actions={{
              insertRowAbove: () => handleAddRow(contextMenu.rowIndex),
              insertRowBelow: () => handleAddRow(contextMenu.rowIndex !== undefined ? contextMenu.rowIndex + 1 : undefined),
              insertColLeft: () => handleAddColumn(contextMenu.colIndex),
              insertColRight: () => handleAddColumn(contextMenu.colIndex !== undefined ? contextMenu.colIndex + 1 : undefined),
              removeRow: () => { if (contextMenu.itemId) setConfirmRetireItemId(contextMenu.itemId); },
              removeCol: () => { if (contextMenu.colId) setConfirmDeleteColumnId(contextMenu.colId); }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCreatingList && <CreateListModal onClose={() => setIsCreatingList(false)} onSubmit={handleCreateList} data={newListData} setData={setNewListData} />}
        {confirmDeleteListId && <ConfirmationModal title="Delete List?" message="Irreversible action." confirmLabel="Delete" onConfirm={() => { deleteList(confirmDeleteListId); setConfirmDeleteListId(null); setSelectedListId(null); }} onCancel={() => setConfirmDeleteListId(null)} />}
        {confirmDeleteColumnId && <ConfirmationModal title="Delete Column?" message="Data will be lost." confirmLabel="Delete" onConfirm={() => handleDeleteColumn()} onCancel={() => setConfirmDeleteColumnId(null)} />}
        {confirmRetireItemId && <ConfirmationModal title="Retire Record?" message="Archive this version." confirmLabel="Retire" onConfirm={() => handleRetireItem()} onCancel={() => setConfirmRetireItemId(null)} />}
      </AnimatePresence>
    </div>
  );
};

const ContextMenuPortal = ({ x, y, type, onClose, actions }: any) => {
  return createPortal(
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed z-[9999] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden p-1.5 w-56 backdrop-blur-xl" style={{ left: x, top: y }}>
      <div className="flex flex-col">
        {type === 'cell' || type === 'header' ? (
          <>
            <div className="px-3 py-1.5 text-[9px] font-black uppercase text-zinc-500 tracking-widest border-b border-zinc-800 mb-1">Row Actions</div>
            <button onClick={() => { actions.insertRowAbove(); onClose(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-indigo-600 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all"><ArrowUp size={14} className="text-indigo-400" /> Insert Row Above</button>
            <button onClick={() => { actions.insertRowBelow(); onClose(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-indigo-600 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all"><ArrowDown size={14} className="text-indigo-400" /> Insert Row Below</button>
            <button onClick={() => { actions.removeRow(); onClose(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-rose-600 text-rose-500 hover:text-white rounded-xl text-xs font-bold transition-all"><Trash2 size={14} /> Remove Row</button>
            
            <div className="px-3 py-1.5 text-[9px] font-black uppercase text-zinc-500 tracking-widest border-b border-zinc-800 my-1">Column Actions</div>
            <button onClick={() => { actions.insertColLeft(); onClose(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-indigo-600 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all"><PlusCircle size={14} className="text-emerald-400" /> Insert Column Left</button>
            <button onClick={() => { actions.insertColRight(); onClose(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-indigo-600 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all"><PlusCircle size={14} className="text-emerald-400" /> Insert Column Right</button>
            <button onClick={() => { actions.removeCol(); onClose(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-rose-600 text-rose-500 hover:text-white rounded-xl text-xs font-bold transition-all"><Trash2 size={14} /> Remove Column</button>
          </>
        ) : null}
      </div>
    </motion.div>,
    document.body
  );
};

const ColumnHeader = ({ column, index, isMenuOpen, onToggleMenu, onUpdate, onDelete, onResize, onInsertLeft, onInsertRight, disabled }: any) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [localName, setLocalName] = useState(column.name);
  const [newOption, setNewOption] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  useEffect(() => { setLocalName(column.name); }, [column.name]);
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault(); isResizing.current = true; startX.current = e.clientX; startWidth.current = containerRef.current?.offsetWidth || 0;
    const handleMouseMove = (moveEvent: MouseEvent) => { if (isResizing.current) onResize(startWidth.current + (moveEvent.clientX - startX.current)); };
    const handleMouseUp = () => { isResizing.current = false; document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
    document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', handleMouseUp);
  };
  const types = [{ id: 'text', label: 'Single Text', icon: Type }, { id: 'number', label: 'Numeric', icon: Hash }, { id: 'date', label: 'Date/Time', icon: Calendar }, { id: 'boolean', label: 'Toggle', icon: ToggleLeft }, { id: 'choice', label: 'Selection', icon: ListFilter }];
  const handleAddOption = () => { if (!newOption.trim()) return; onUpdate({ options: [...(column.options || []), newOption.trim()] }); setNewOption(''); };
  const handleRemoveOption = (opt: string) => { onUpdate({ options: (column.options || []).filter((o: string) => o !== opt) }); };
  const CurrentIcon = types.find(t => t.id === column.type)?.icon || Type;
  return (
    <div className="flex flex-col h-full w-full relative z-50" ref={containerRef}>
      <div className="flex items-center gap-2 px-4 py-3 h-full group/th">
        <button onClick={() => !disabled && onToggleMenu(!isMenuOpen)} className="p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 text-zinc-500 hover:bg-indigo-600 hover:text-white border border-zinc-200 dark:border-zinc-800 shrink-0 transition-all"><CurrentIcon size={12} /></button>
        <div className="flex-1 min-w-0">{isEditingName ? <input ref={inputRef} autoFocus value={localName} onChange={(e) => setLocalName(e.target.value)} onBlur={() => { setIsEditingName(false); onUpdate({ name: localName }); }} onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.blur()} className="w-full bg-indigo-500/10 text-indigo-400 font-bold text-[10px] uppercase outline-none py-1 px-2 rounded-md" /> : <div onClick={() => !disabled && setIsEditingName(true)} className="flex items-center gap-1 cursor-text truncate"><span className={cn("truncate font-black text-[10px] uppercase tracking-widest transition-colors", column.required ? "text-indigo-400" : "text-zinc-500")}>{column.name}</span>{column.required && <span className="text-rose-500 text-[10px]">*</span>}</div>}</div>
      </div>
      {!disabled && <div onMouseDown={handleResizeStart} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-500/30 active:bg-indigo-600 transition-colors z-50" />}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute left-0 top-full mt-2 w-72 bg-zinc-900 dark:bg-zinc-950 rounded-[1.5rem] shadow-2xl border border-zinc-800 z-[100] p-4 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/50 pb-2"><span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Settings</span><button onClick={() => { onToggleMenu(false); onDelete(); }} className="text-zinc-500 hover:text-rose-500 transition-colors"><Trash2 size={14} /></button></div>
            <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { onInsertLeft(); onToggleMenu(false); }} className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-indigo-600 text-zinc-400 hover:text-white rounded-lg text-[9px] font-black uppercase transition-all"><Plus size={10} /> Insert Left</button>
                <button onClick={() => { onInsertRight(); onToggleMenu(false); }} className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-indigo-600 text-zinc-400 hover:text-white rounded-lg text-[9px] font-black uppercase transition-all"><Plus size={10} /> Insert Right</button>
            </div>
            <button onClick={() => onUpdate({ required: !column.required })} className={cn("w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all", column.required ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "text-zinc-400 hover:bg-zinc-800 border border-transparent")}><span>Mandatory Field</span><div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all", column.required ? "bg-rose-500 border-rose-500 text-white" : "border-zinc-700")}>{column.required && <Check size={12} strokeWidth={3} />}</div></button>
            <div className="space-y-1"><span className="text-[9px] font-black uppercase text-zinc-600 tracking-widest px-2">Data Type</span><div className="grid grid-cols-2 gap-1">{types.map((type) => <button key={type.id} onClick={() => { onUpdate({ type: type.id }); onToggleMenu(false); }} className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold transition-all", column.type === type.id ? "bg-indigo-600 text-white shadow-lg" : "text-zinc-500 hover:bg-zinc-800")}><type.icon size={12} /> <span>{type.label}</span></button>)}</div></div>
            {column.type === 'choice' && <div className="pt-4 border-t border-zinc-800/50 space-y-3"><span className="text-[9px] font-black uppercase text-zinc-600 tracking-widest px-2">Selection Options</span><div className="flex gap-2"><input type="text" placeholder="Add option..." value={newOption} onChange={(e) => setNewOption(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddOption()} className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500 transition-all" /><button onClick={handleAddOption} className="p-2 bg-indigo-600 text-white rounded-lg"><Plus size={14} /></button></div><div className="flex wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">{(column.options || []).map((opt: string) => <div key={opt} className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800 text-zinc-300 rounded-md text-[10px] font-bold border border-zinc-700 group"><span>{opt}</span><button onClick={() => handleRemoveOption(opt)} className="text-zinc-500 hover:text-rose-500"><X size={10} /></button></div>)}</div></div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SortableRow = ({ item, index, columns, columnWidths, rowHeight, onInspect, isInspected, onCellChange, showHistory, activeEditingColId, setActiveEditingColId, onTab, isMenuOpen, onToggleMenu, onInsertAbove, onInsertBelow, onRetire, onContextMenu }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const isEditingAnyCell = activeEditingColId !== null;
  const style = { 
    transform: CSS.Translate.toString(transform), 
    transition, 
    opacity: isDragging ? 0.2 : 1, 
    zIndex: isDragging ? 1000 : (isEditingAnyCell || isMenuOpen ? 500 : 30),
    position: 'relative' as const
  };
  return (
    <tr ref={setNodeRef} style={style} className={cn("group transition-colors relative", isInspected && "bg-indigo-500/10", !item.is_active && "opacity-60")}>
      <td className="p-0 w-16 text-center border-r border-zinc-100 dark:border-zinc-800" style={{ height: rowHeight }}>
        {!showHistory && item.is_active ? <button {...attributes} {...listeners} className="w-full h-full flex flex-col items-center justify-center cursor-grab active:cursor-grabbing group/handle"><span className="text-[10px] font-black text-zinc-300 group-hover/handle:hidden">{index}</span><GripVertical size={14} className="text-indigo-500 hidden group-hover/handle:block" /></button> : <div className="text-[10px] font-black text-zinc-300">{index}</div>}
      </td>
      {columns.map((col: any, colIdx: number) => <td key={col.id} className="p-0 relative border-r border-zinc-100 dark:border-zinc-800/50 context-menu-trigger" style={{ width: columnWidths[col.id] || 200 }} onContextMenu={(e) => onContextMenu(e, col.id, colIdx)}><CellEditor column={col} value={item.data?.[col.id]} onChange={(val: any) => onCellChange?.(col.id, val)} disabled={showHistory || !item.is_active} isEditing={activeEditingColId === col.id} setIsEditing={(editing: boolean) => setActiveEditingColId(editing ? col.id : null)} onTab={onTab} /></td>)}
      <td className="p-0 w-12 text-center bg-zinc-50/10 dark:bg-zinc-950/10 relative row-menu-container">
        <button onClick={() => onToggleMenu(!isMenuOpen)} className={cn("p-2 rounded-xl transition-all", isInspected || isMenuOpen ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-zinc-300 hover:text-indigo-600 hover:bg-indigo-50")}><MoreVertical size={16} /></button>
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div initial={{ opacity: 0, x: 10, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 10, scale: 0.95 }} className="absolute right-full top-0 mr-2 w-48 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-[100] overflow-hidden p-1.5 flex flex-col">
              <button onClick={() => { onInspect(); onToggleMenu(false); }} className="flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all"><Info size={14} className="text-indigo-400" /> Inspect Version</button>
              <div className="h-px bg-zinc-800 my-1 mx-2" />
              <button onClick={() => { onInsertAbove(); onToggleMenu(false); }} className="flex items-center gap-3 px-3 py-2.5 hover:bg-indigo-600 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all"><ArrowUp size={14} className="text-zinc-500 group-hover:text-white" /> Insert Above</button>
              <button onClick={() => { onInsertBelow(); onToggleMenu(false); }} className="flex items-center gap-3 px-3 py-2.5 hover:bg-indigo-600 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all"><ArrowDown size={14} className="text-zinc-500 group-hover:text-white" /> Insert Below</button>
              <div className="h-px bg-zinc-800 my-1 mx-2" />
              <button onClick={() => { onRetire(); onToggleMenu(false); }} className="flex items-center gap-3 px-3 py-2.5 hover:bg-rose-600 text-rose-500 hover:text-white rounded-xl text-xs font-bold transition-all"><Archive size={14} /> Retire Version</button>
            </motion.div>
          )}
        </AnimatePresence>
      </td>
    </tr>
  );
};

const CellEditor = ({ column, value, onChange, disabled, isEditing, setIsEditing, onTab }: any) => {
  const [localValue, setLocalValue] = useState<any>(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isInvalid = column.required && (value === null || value === undefined || value === '');
  const lastCommittedValue = useRef<any>(value);
  useEffect(() => { if (!isEditing) { setLocalValue(value); lastCommittedValue.current = value; } }, [value, isEditing]);
  useEffect(() => {
    if (isEditing && (column.type === 'choice' || column.type === 'date')) {
      const handleClickOutside = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) handleCommit(localValue); };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isEditing, localValue, column.type]);
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (column.type === 'number') { val = val.replace(/[^0-9.-]/g, ''); const parts = val.split('.'); if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join(''); if (val.indexOf('-') > 0) val = val.replace(/-/g, ''); }
    setLocalValue(val);
  };
  const handleCommit = (val: any) => {
    if (val === lastCommittedValue.current) { setIsEditing(false); return; }
    let committedValue = val;
    if (column.type === 'number') { if (val === '' || val === null || val === undefined) { committedValue = null; } else { const parsed = parseFloat(val); committedValue = isNaN(parsed) ? null : parsed; } }
    lastCommittedValue.current = committedValue;
    setLocalValue(committedValue);
    onChange(committedValue);
    setIsEditing(false);
  };
  const handleToggle = () => { if (disabled) return; const nextVal = !value; setLocalValue(nextVal); lastCommittedValue.current = nextVal; onChange(nextVal); };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      handleCommit(localValue);
      onTab(column.id, e.shiftKey);
    } else if (e.key === 'Enter') {
      handleCommit(localValue);
    } else if (e.key === 'Escape') {
      setLocalValue(value);
      setIsEditing(false);
    }
  };

  if (column.type === 'boolean') {
    return (
      <div className="w-full h-full flex items-center justify-center p-2">
         <button onClick={handleToggle} disabled={disabled} className={cn("w-10 h-5 rounded-full relative transition-all border-2", value ? "bg-indigo-600 border-indigo-500" : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700", disabled && "opacity-50 cursor-not-allowed")}>
            <motion.div animate={{ x: value ? 20 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className={cn("absolute left-0.5 top-0.5 w-3 h-3 rounded-full shadow-sm", value ? "bg-white" : "bg-zinc-400 dark:bg-zinc-500")} />
         </button>
      </div>
    );
  }
  return (
    <div ref={containerRef} className="w-full h-full min-h-[48px] relative group/celleditor cursor-text" onClick={() => !disabled && !isEditing && setIsEditing(true)}>
       {!isEditing && (
         <div className={cn("px-4 py-3 text-sm font-bold transition-colors w-full h-full min-h-[48px] flex items-center group/cell relative z-10", disabled ? "cursor-default" : (column.type === 'choice' || column.type === 'date' ? "cursor-pointer" : "cursor-text"), isInvalid ? "bg-rose-500/10" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50")}>
           <div className="flex-1 truncate relative z-10">{renderCellContent(column, value)}</div>
           {isInvalid && <AlertTriangle size={14} className="text-rose-400 ml-2 animate-pulse relative z-10" />}
           {(column.type === 'choice' || column.type === 'date') && !disabled && <div className="text-zinc-400 opacity-0 group-hover/cell:opacity-100 ml-2 shrink-0 transition-opacity relative z-10">{column.type === 'choice' ? <ChevronDown size={12} /> : <Calendar size={12} />}</div>}
         </div>
       )}
       {isEditing && !disabled && (
          <div className={cn("absolute inset-0 z-[100] flex flex-col bg-zinc-950 shadow-[0_0_100px_rgba(99,102,241,1)] border-2 border-indigo-500 rounded-xl", column.type === 'date' && "bg-zinc-950")}>
             <div className="flex-1 flex items-center px-4 relative h-full">
                {column.type === 'choice' ? (
                  <div tabIndex={0} autoFocus onKeyDown={handleKeyDown} className="flex items-center justify-between w-full h-full cursor-pointer outline-none"><span className="text-sm font-bold text-indigo-400 truncate pr-6">{localValue ?? 'Select...'}</span><ChevronDown size={14} className="text-indigo-500" /></div>
                ) : column.type === 'date' ? (
                  <div tabIndex={0} autoFocus onKeyDown={handleKeyDown} className="w-full h-full flex items-center outline-none"><div className="flex items-center gap-2 text-indigo-400 font-bold text-sm"><Calendar size={14} /><span>Editing Date...</span></div><div className="relative z-[101]"><DateTimePopover value={localValue} onChange={handleCommit} onCancel={() => setIsEditing(false)} /></div></div>
                ) : (
                  <input autoFocus type="text" inputMode={column.type === 'number' ? 'decimal' : 'text'} value={localValue ?? ''} onChange={handleInputChange} onBlur={() => handleCommit(localValue)} onFocus={(e) => e.target.select()} onKeyDown={handleKeyDown} className="w-full h-full bg-transparent text-sm font-bold text-indigo-400 outline-none dark:[color-scheme:dark] relative z-20" />
                )}
             </div>
             {column.type === 'choice' && (<motion.div initial={{ opacity: 0, y: 4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="absolute left-0 top-full mt-1 w-full bg-zinc-950 border-2 border-indigo-500 rounded-xl shadow-[0_40px_80px_rgba(0,0,0,1)] overflow-hidden py-1 z-[500]"><div className="max-h-64 overflow-y-auto custom-scrollbar bg-zinc-950">{(column.options || []).length === 0 ? (<div className="px-4 py-3 text-[10px] font-black uppercase text-zinc-700 italic bg-zinc-950">No options defined</div>) : (column.options || []).map((opt: string) => (<button key={opt} onClick={() => handleCommit(opt)} className={cn("w-full text-left px-4 py-3.5 text-xs font-bold transition-all border-l-2", localValue === opt ? "bg-indigo-600 text-white border-indigo-400" : "text-zinc-400 hover:bg-zinc-900 hover:text-white border-transparent")}>{opt}</button>))}</div></motion.div>)}
          </div>
       )}
    </div>
  );
};

const DateTimePopover = ({ value, onChange, onCancel }: any) => {
  const initialDate = value ? new Date(value) : new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [time, setTime] = useState({ hour: initialDate.getHours(), minute: initialDate.getMinutes() });
  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const days = useMemo(() => { const numDays = daysInMonth(currentMonth); const offset = firstDayOfMonth(currentMonth); const arr = []; for (let i = 0; i < offset; i++) arr.push(null); for (let i = 1; i <= numDays; i++) arr.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i)); return arr; }, [currentMonth]);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const handleApply = () => { const finalDate = new Date(selectedDate); finalDate.setHours(time.hour); finalDate.setMinutes(time.minute); onChange(finalDate.toISOString()); };
  return (
    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="absolute left-[-16px] top-[-16px] w-[320px] bg-zinc-950 rounded-3xl border-2 border-indigo-500 shadow-[0_50px_100px_rgba(0,0,0,1)] z-[1000] overflow-hidden p-4">
       <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between px-2"><button onClick={(e) => { e.stopPropagation(); setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)); }} className="p-1 hover:bg-zinc-800 rounded-md transition-colors"><ChevronLeft size={16} className="text-zinc-400" /></button><span className="text-xs font-black uppercase text-zinc-200 tracking-widest">{months[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span><button onClick={(e) => { e.stopPropagation(); setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)); }} className="p-1 hover:bg-zinc-800 rounded-md transition-colors"><ChevronRight size={16} className="text-zinc-400" /></button></div>
          <div className="grid grid-cols-7 gap-1 text-center">{["S", "M", "T", "W", "T", "F", "S"].map(d => <div key={d} className="text-[9px] font-black text-zinc-600 p-1">{d}</div>)}{days.map((d, i) => d ? (<button key={i} onClick={(e) => { e.stopPropagation(); setSelectedDate(d); }} className={cn("p-2 text-[10px] font-bold rounded-lg transition-all", selectedDate.toDateString() === d.toDateString() ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200")}>{d.getDate()}</button>) : <div key={i} />)}</div>
          <div className="border-t border-zinc-800 pt-4 flex flex-col gap-4">
             <div className="flex items-center justify-between px-2"><div className="flex items-center gap-2"><Clock size={14} className="text-zinc-500" /><span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Time Select</span></div><div className="flex items-center gap-1"><input type="number" min="0" max="23" value={time.hour} onChange={(e) => setTime({...time, hour: parseInt(e.target.value) || 0})} onClick={(e) => e.stopPropagation()} className="w-10 bg-zinc-900 border border-zinc-800 rounded p-1 text-[10px] font-bold text-zinc-200 outline-none focus:border-indigo-500" /><span className="text-zinc-600">:</span><input type="number" min="0" max="59" value={time.minute} onChange={(e) => setTime({...time, minute: parseInt(e.target.value) || 0})} onClick={(e) => e.stopPropagation()} className="w-10 bg-zinc-900 border border-zinc-800 rounded p-1 text-[10px] font-bold text-zinc-200 outline-none focus:border-indigo-500" /></div></div>
             <div className="flex gap-2"><button onClick={(e) => { e.stopPropagation(); onCancel(); }} className="flex-1 py-2 bg-zinc-900 text-zinc-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-zinc-800 hover:bg-zinc-800 transition-all">Cancel</button><button onClick={(e) => { e.stopPropagation(); handleApply(); }} className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all">Apply</button></div>
          </div>
       </div>
    </motion.div>
  );
};

const renderCellContent = (column: any, value: any) => {
  if (value === undefined || value === null || value === '') return <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-zinc-800 animate-pulse" /><span className="text-zinc-500 italic text-[10px] font-black uppercase tracking-widest">Empty</span></div>;
  if (column.type === 'boolean') return value ? <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-md text-[9px] font-black uppercase border border-emerald-500/20">Yes</span> : <span className="px-2 py-0.5 bg-rose-500/10 text-rose-500 rounded-md text-[9px] font-black uppercase border border-rose-500/20">No</span>;
  if (column.type === 'choice') return <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-md text-[10px] font-black uppercase border border-indigo-500/20 shadow-sm">{value}</span>;
  if (column.type === 'date') { const d = new Date(value); return (<span className="flex items-center gap-2 text-zinc-400 font-bold"><Calendar size={12} className="text-indigo-400 shrink-0" /><span className="text-zinc-200 truncate">{d.toLocaleDateString()}</span><span className="text-[10px] text-zinc-500 font-black uppercase opacity-60 ml-auto bg-zinc-800/50 px-1.5 py-0.5 rounded border border-zinc-700/50">{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></span>); }
  if (column.type === 'number') return <span className="font-mono text-indigo-500 dark:text-indigo-400 font-black">{value}</span>;
  return <span className="tracking-tight">{String(value)}</span>;
};

const ConfirmationModal = ({ title, message, confirmLabel, onConfirm, onCancel }: any) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel} className="absolute inset-0 bg-zinc-950/80" />
    <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-[2.5rem] shadow-2xl p-10 text-center space-y-8">
      <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center mx-auto border border-rose-500/20 shadow-inner"><AlertTriangle size={36} /></div>
      <div className="space-y-3"><h3 className="text-2xl font-black text-white uppercase">{title}</h3><p className="text-sm text-zinc-400 leading-relaxed">{message}</p></div>
      <div className="flex gap-4"><button onClick={onCancel} className="flex-1 px-6 py-4 bg-zinc-800 text-white rounded-2xl text-sm font-bold transition-all">Cancel</button><button onClick={onConfirm} className="flex-1 px-6 py-4 bg-rose-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-rose-500/20">Confirm</button></div>
    </motion.div>
  </div>
);

const CreateListModal = ({ onClose, onSubmit, data, setData }: any) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-zinc-950/60" /><motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-2xl p-10 space-y-8"><div className="space-y-2"><h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter">New Global List</h3><p className="text-sm text-zinc-500 font-medium">Define a new master data structure.</p></div><div className="space-y-4"><div className="space-y-2"><label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest px-1">Table Name</label><input required type="text" placeholder="e.g. Australian States" value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 transition-all text-sm font-bold" /></div><div className="space-y-2"><label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest px-1">Description</label><textarea placeholder="What is this list for?" value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 transition-all text-sm font-bold min-h-[100px] resize-none" /></div></div><div className="flex gap-4"><button type="button" onClick={onClose} className="flex-1 px-6 py-4 border rounded-2xl font-bold text-zinc-500">Cancel</button><button onClick={onSubmit} className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-all">Create Table</button></div></motion.div>
  </div>
);
