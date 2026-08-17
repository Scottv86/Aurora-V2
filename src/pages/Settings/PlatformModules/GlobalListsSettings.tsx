import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Button } from '../../../components/UI/Primitives';
import { 
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
  ListTodo,
  MoreVertical,
  Type, 
  PlusCircle,
  Hash,
  Calendar,
  ToggleLeft,
  ChevronDown,
  LayoutGrid,
  GripVertical,
  ArrowLeft,
  ArrowRight,
  Info,
  AlertTriangle,
  Archive,
  ListFilter,
  ArrowUp,
  ArrowDown,
  Columns,
  Maximize2,
  Minimize2,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DndContext, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  DragStartEvent,
  rectIntersection
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { useGlobalLists, useGlobalList, GlobalListItem, ListColumn } from '../../../hooks/useGlobalList';
import { PageHeader } from '../../../components/UI/PageHeader';
import { EmptyState } from '../../../components/UI/EmptyState';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';
import { usePlatform } from '../../../hooks/usePlatform';
import { TrashService } from '../../../services/trashService';
import { DeleteConfirmationModal } from '../../../components/Common/DeleteConfirmationModal';

export const GlobalListsSettings = () => {
  const location = useLocation();
  const { tenant, isBuilderFullscreen, setIsBuilderFullscreen, toggleBuilderFullscreen } = usePlatform();
  const isSettingsMode = location.pathname.startsWith('/workspace/settings');

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

  const [filterTab, setFilterTab] = useState<'all' | 'custom' | 'system'>('all');

  const filteredLists = useMemo(() => {
    return lists.filter(l => {
      const matchesSearch = l.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (l.description && l.description.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchesSearch) return false;
      if (filterTab === 'custom') return !l.is_system;
      if (filterTab === 'system') return Boolean(l.is_system);
      return true;
    });
  }, [lists, searchQuery, filterTab]);

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

  const [listToDelete, setListToDelete] = useState<any | null>(null);
  const [isDeletingList, setIsDeletingList] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent, list: any) => {
    e.stopPropagation();
    setListToDelete(list);
  };

  const confirmDeleteListCard = async () => {
    if (!listToDelete) return;
    const list = listToDelete;
    setIsDeletingList(true);
    try {
      if (tenant?.id) {
        await TrashService.softDelete({
          tenantId: tenant.id,
          itemType: 'GLOBAL_LIST',
          itemId: list.id,
          title: list.name,
          subtitle: list.description || `List: ${list.name}`,
          payload: list
        });
      }
      await deleteList(list.id);
      toast.success('List moved to Recycling Bin');
      if (selectedListId === list.id) {
        setSelectedListId(null);
      }
    } catch (err) {
      toast.error('Failed to delete list');
    } finally {
      setIsDeletingList(false);
      setListToDelete(null);
    }
  };

  const handleUpdateMetadata = async () => {
    setIsEditingMetadata(false);
    if (metadataForm.name !== activeList?.name || metadataForm.description !== activeList?.description) {
      await updateMetadata(metadataForm.name, metadataForm.description);
    }
  };

  const handleResizeColumn = (colId: string, width: number) => {
    setColumnWidths(prev => ({ ...prev, [colId]: Math.max(80, width) }));
  };

  const handleAddColumn = async (insertAt?: number) => {
    if (!activeList) return;
    const newColId = `col_${Date.now()}`;
    const newColName = `Field ${activeList.columns.length + 1}`;
    const newCol: ListColumn = { id: newColId, name: newColName, type: 'text', required: false };
    const nextCols = [...activeList.columns];
    if (insertAt !== undefined) nextCols.splice(insertAt, 0, newCol);
    else nextCols.push(newCol);
    await updateSchema(nextCols);
    setActiveMenuColumnId(newColId);
    toast.success('New column added');
  };

  const handleColumnUpdate = async (colId: string, updates: Partial<ListColumn>) => {
    if (!activeList) return;
    const nextCols = activeList.columns.map(c => c.id === colId ? { ...c, ...updates } : c);
    await updateSchema(nextCols);
  };

  const handleDeleteColumn = async () => {
    if (!activeList || !confirmDeleteColumnId) return;
    const colId = confirmDeleteColumnId;
    setConfirmDeleteColumnId(null);
    if (activeList.columns.length <= 1) {
      toast.error('Lists require at least one column');
      return;
    }
    const nextCols = activeList.columns.filter(c => c.id !== colId);
    await updateSchema(nextCols);
    toast.success('Column deleted');
  };

  const handleRetireItem = async () => {
    if (!confirmRetireItemId) return;
    const id = confirmRetireItemId;
    setConfirmRetireItemId(null);
    try {
      await retireItem(id);
      toast.success('Record retired and versioned');
    } catch (err: any) {
      toast.error(`Failed to retire record: ${err.message}`);
    }
  };

  const handleCellChange = async (item: GlobalListItem, colId: string, value: any) => {
    const key = `${item.id}-${colId}`;
    setPendingSaves(prev => new Set(prev).add(key));
    setLocalItems(prev => prev.map(p => p.id === item.id ? { ...p, data: { ...p.data, [colId]: value } } : p));
    try {
      await editItem(item.id, { ...item.data, [colId]: value });
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`);
      setLocalItems(dbItems);
    } finally {
      setPendingSaves(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleAddRow = async (insertAt?: number) => {
    if (!activeList) return;
    try {
      const initialData: Record<string, any> = {};
      activeList.columns.forEach(col => {
        initialData[col.id] = col.type === 'boolean' ? false : col.type === 'number' ? 0 : '';
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

  useEffect(() => {
    if (selectedListId) {
      setIsBuilderFullscreen(true);
    } else {
      setIsBuilderFullscreen(false);
    }
    return () => {
      setIsBuilderFullscreen(false);
    };
  }, [selectedListId, setIsBuilderFullscreen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedListId) {
        if (!isCreatingList && !listToDelete && !confirmDeleteListId && !confirmDeleteColumnId && !confirmRetireItemId && !contextMenu && !activeEditingCell) {
          setSelectedListId(null);
          setInspectedItem(null);
          setIsBuilderFullscreen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedListId, isCreatingList, listToDelete, confirmDeleteListId, confirmDeleteColumnId, confirmRetireItemId, contextMenu, activeEditingCell, setIsBuilderFullscreen]);

  const [tableSearch, setTableSearch] = useState('');

  const displayLocalItems = useMemo(() => {
    if (!tableSearch.trim()) return localItems;
    const q = tableSearch.toLowerCase();
    return localItems.filter(item => {
      return Object.values(item.data || {}).some(val => 
        val !== null && val !== undefined && String(val).toLowerCase().includes(q)
      );
    });
  }, [localItems, tableSearch]);

  const renderCellContent = (column: ListColumn, value: any) => {
    if (value === undefined || value === null) return '';
    if (column.type === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

  // Full Screen List Studio Mode
  if (selectedListId) {
    return (
      <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col overflow-hidden text-zinc-100 animate-in fade-in duration-200">
        {/* Ambient Aurora Glow Background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.12),rgba(255,255,255,0))] pointer-events-none" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Studio Bar */}
        <div className="h-14 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl px-6 flex items-center justify-between z-30 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <button
              onClick={() => {
                setSelectedListId(null);
                setInspectedItem(null);
                setActiveMenuColumnId(null);
                setActiveEditingCell(null);
                setIsEditingMetadata(false);
                setIsBuilderFullscreen(false);
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shrink-0"
              title="Back to All Lists (Esc)"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Lists</span>
            </button>

            <div className="h-5 w-px bg-zinc-800 shrink-0" />

            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
              <ListTodo size={18} />
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                {isEditingMetadata ? (
                  <input
                    autoFocus
                    value={metadataForm.name}
                    onChange={(e) => setMetadataForm({ ...metadataForm, name: e.target.value })}
                    onBlur={handleUpdateMetadata}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateMetadata()}
                    className="text-sm font-bold bg-indigo-500/10 border-b border-indigo-500 text-indigo-400 outline-none px-1.5 py-0.5 rounded"
                    placeholder="List Name"
                  />
                ) : (
                  <div 
                    onClick={() => setIsEditingMetadata(true)} 
                    className="flex items-center gap-1.5 cursor-pointer hover:bg-white/5 px-1.5 py-0.5 -mx-1.5 rounded-lg transition-all group/title"
                    title="Click to edit list name"
                  >
                    <span className="text-sm font-black text-white tracking-tight truncate max-w-xs sm:max-w-md">
                      {activeList?.name || 'Untitled List'}
                    </span>
                    <Edit2 size={12} className="text-zinc-500 opacity-0 group-hover/title:opacity-100 transition-opacity" />
                  </div>
                )}
                <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                  List Studio
                </span>
                <span className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700 shrink-0">
                  {localItems.length} Records
                </span>
              </div>
              {activeList?.description && (
                <p className="text-[10px] text-zinc-400 font-medium truncate max-w-md">
                  {activeList.description}
                </p>
              )}
            </div>
          </div>

          {/* Right Toolbar Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Table Search Filter */}
            <div className="relative hidden md:block w-48">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Filter rows..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-7 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-all"
              />
            </div>

            {/* Density Slider */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Density</span>
              <input 
                type="range" 
                min="36" 
                max="72" 
                value={rowHeight} 
                onChange={(e) => setRowHeight(parseInt(e.target.value))} 
                className="w-16 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" 
              />
            </div>

            {/* History Mode Toggle */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all border cursor-pointer",
                showHistory 
                  ? "bg-rose-500/20 border-rose-500/40 text-rose-400 shadow-md shadow-rose-500/20" 
                  : "bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10"
              )}
              title="Toggle Version Audit History (SCD Type 2)"
            >
              <History size={13} />
              <span className="hidden sm:inline">{showHistory ? 'Viewing History' : 'History'}</span>
            </button>

            {/* Add Column Button */}
            <button
              onClick={() => handleAddColumn()}
              disabled={showHistory}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <Columns size={13} className="text-indigo-400" />
              <span className="hidden sm:inline">Add Field</span>
            </button>

            {/* Add Record Button */}
            <button
              onClick={() => handleAddRow()}
              disabled={showHistory}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <Plus size={14} />
              <span>Add Record</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleBuilderFullscreen}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 transition-all cursor-pointer"
              title={isBuilderFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen"}
            >
              {isBuilderFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>

            {/* Delete List */}
            <button
              onClick={() => setConfirmDeleteListId(activeListSummary!.id)}
              className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
              title="Delete List"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Main Studio Canvas */}
        <div className="flex-1 flex flex-row min-h-0 relative z-10 p-6 gap-6 overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative z-10">
            {/* Table Action Bar */}
            <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-white/5 rounded-lg text-zinc-400">
                  <LayoutGrid size={14} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  {localItems.length} Records Total {tableSearch && `• ${displayLocalItems.length} matching filter`}
                </span>
              </div>
              {showHistory && (
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-md border border-rose-500/20">
                  SCD2 Audit Mode Active
                </span>
              )}
            </div>

            {/* Table Viewport */}
            <div 
              className="flex-1 overflow-auto custom-scrollbar relative z-30" 
              onClick={(e) => { 
                if (activeMenuColumnId && !(e.target as HTMLElement).closest('.column-header-container')) setActiveMenuColumnId(null); 
                if (activeMenuRowId && !(e.target as HTMLElement).closest('.row-menu-container')) setActiveMenuRowId(null);
              }}
            >
              {activeList && (
                <DndContext sensors={sensors} collisionDetection={rectIntersection} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                  <table className="w-max min-w-full text-left border-collapse table-fixed relative z-30">
                    <thead className="sticky top-0 bg-zinc-900/95 backdrop-blur-xl z-50 shadow-sm border-b border-white/10">
                      <tr>
                        <th className="p-0 w-14 text-center border-r border-white/10 bg-white/[0.02] text-xs font-semibold text-zinc-400">#</th>
                        {activeList.columns.map((col, idx) => (
                          <th key={col.id} className="p-0 text-xs font-semibold text-zinc-300 relative group/th border-r border-white/10 bg-white/[0.01] column-header-container context-menu-trigger" style={{ width: columnWidths[col.id] || 200 }} onContextMenu={(e) => onHeaderContextMenu(e, col.id, idx)}>
                            <ColumnHeader column={col} isMenuOpen={activeMenuColumnId === col.id} onToggleMenu={(open: boolean) => setActiveMenuColumnId(open ? col.id : null)} onUpdate={(updates: Partial<ListColumn>) => handleColumnUpdate(col.id, updates)} onDelete={() => setConfirmDeleteColumnId(col.id)} onResize={(width: number) => handleResizeColumn(col.id, width)} onInsertLeft={() => handleAddColumn(idx)} onInsertRight={() => handleAddColumn(idx + 1)} disabled={showHistory} />
                          </th>
                        ))}
                        <th className="p-4 w-16 bg-white/[0.01]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 relative z-30">
                      <SortableContext items={displayLocalItems.map(i => i.id)} strategy={verticalListSortingStrategy} disabled={showHistory || Boolean(tableSearch)}>
                        {displayLocalItems.map((item, idx) => (
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
                            setActiveEditingColId={(colId: string | null) => setActiveEditingCell(colId ? { itemId: item.id, colId } : null)}
                            onTab={(colId: string, shift: boolean) => handleTab(item.id, colId, shift)}
                            isMenuOpen={activeMenuRowId === item.id}
                            onToggleMenu={(open: boolean) => setActiveMenuRowId(open ? item.id : null)}
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

          {/* Record Inspector Side Drawer */}
          <AnimatePresence>
            {inspectedItem && (
              <motion.aside 
                initial={{ x: 100, width: 0, opacity: 0 }} 
                animate={{ x: 0, width: 400, opacity: 1 }} 
                exit={{ x: 100, width: 0, opacity: 0 }} 
                className="bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl z-50 shrink-0"
              >
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                  <div>
                    <h3 className="text-lg font-black text-white tracking-tight uppercase">Record Inspector</h3>
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">VERSION: {inspectedItem.is_active ? 'CURRENT' : 'HISTORICAL'}</p>
                  </div>
                  <button onClick={() => setInspectedItem(null)} className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer">
                    <X size={18} />
                  </button>
                </div>
                <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Metadata</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                        <span className="text-[8px] font-black text-zinc-400 uppercase">Valid From</span>
                        <p className="text-xs font-bold truncate text-zinc-200">{new Date(inspectedItem.valid_from).toLocaleDateString()}</p>
                      </div>
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                        <span className="text-[8px] font-black text-zinc-400 uppercase">Status</span>
                        <p className={cn("text-xs font-bold", inspectedItem.is_active ? "text-emerald-400" : "text-rose-400")}>
                          {inspectedItem.is_active ? 'Active' : 'Retired'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Full Record Data</label>
                    <div className="space-y-2">
                      {activeList?.columns.map(col => (
                        <div key={col.id} className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
                          <span className="text-xs font-bold text-zinc-400">{col.name}</span>
                          <span className="text-xs font-black text-white uppercase tracking-tight">{renderCellContent(col, inspectedItem.data[col.id])}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {inspectedItem.is_active && (
                    <div className="pt-6 border-t border-white/10 space-y-3">
                      <label className="text-[9px] font-black uppercase tracking-widest text-rose-400">Danger Zone</label>
                      <button 
                        onClick={() => { setConfirmRetireItemId(inspectedItem.id); setInspectedItem(null); }} 
                        className="w-full flex items-center justify-between p-4 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-xl border border-rose-500/20 transition-all group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <Archive size={16} /> 
                          <span className="text-xs font-bold">Retire & Version Record</span>
                        </div>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>

        {/* Studio Portals & Modals */}
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
          {confirmDeleteListId && <ConfirmationModal title="Delete List?" message="Irreversible action." confirmLabel="Delete" onConfirm={() => { deleteList(confirmDeleteListId); setConfirmDeleteListId(null); setSelectedListId(null); }} onCancel={() => setConfirmDeleteListId(null)} />}
          {confirmDeleteColumnId && <ConfirmationModal title="Delete Column?" message="Data will be lost." confirmLabel="Delete" onConfirm={() => handleDeleteColumn()} onCancel={() => setConfirmDeleteColumnId(null)} />}
          {confirmRetireItemId && <ConfirmationModal title="Retire Record?" message="Archive this version." confirmLabel="Retire" onConfirm={() => handleRetireItem()} onCancel={() => setConfirmRetireItemId(null)} />}
        </AnimatePresence>
      </div>
    );
  }

  // Landing Directory Mode
  return (
    <div className="flex flex-col w-full relative min-h-[calc(100vh-4rem)] bg-zinc-50/50 dark:bg-zinc-950/50 overflow-y-auto">
      <PageHeader
        title="Lists"
        description="Build and manage reusable choice datasets, lookup tables, and option sets."
        actions={
          <Button
            onClick={() => setIsCreatingList(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Create</span>
          </Button>
        }
      />

      <div className="flex-1 px-6 lg:px-12 pt-8 pb-20 relative z-10 space-y-6">
        {/* Search & Scope Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search lists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-zinc-900 dark:text-zinc-100 font-medium"
            />
          </div>

          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl w-full sm:w-auto">
            {[
              { id: 'all', label: 'All' },
              { id: 'custom', label: 'Custom Lists' },
              { id: 'system', label: 'System Lookups' }
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setFilterTab(mode.id as any)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  filterTab === mode.id
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {listsLoading ? null : filteredLists.length === 0 ? (
          <EmptyState
            icon={ListTodo}
            title={searchQuery ? "No lists match your search" : "No lists created yet"}
            description={
              searchQuery 
                ? "Try searching for a different keyword or clear your search query." 
                : "Build reusable choice datasets, lookup tables, and option sets across your platform modules."
            }
            action={{
              label: "Create List",
              onClick: () => setIsCreatingList(true)
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLists.map((list, i) => (
              <motion.div
                key={list.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03, ease: 'easeOut' }}
                onClick={() => setSelectedListId(list.id)}
                className="group p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-3xl transition-[border-color,box-shadow,background-color] duration-200 shadow-xl shadow-black/5 dark:shadow-none hover:shadow-indigo-500/10 cursor-pointer flex flex-col justify-between h-full relative overflow-hidden min-h-[220px]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.1] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-500 group-hover:text-indigo-500 group-hover:border-indigo-500/30 transition-colors duration-200">
                        <ListTodo size={22} />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border bg-indigo-500/10 text-indigo-500 border-indigo-500/20">
                          {list.columns?.length || 1} Columns
                        </span>

                        <button
                          onClick={(e) => handleDeleteClick(e, list)}
                          className="p-2 rounded-xl bg-zinc-100/80 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 dark:bg-zinc-800/80 dark:hover:bg-red-500/20 transition-colors duration-150 opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
                          title="Delete List"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-indigo-500 transition-colors duration-150">
                      {list.name}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {list.description || "No description provided."}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-zinc-500 font-semibold">
                      <Database size={13} className="text-zinc-400" />
                      <span>{list.item_count ?? (list.items?.length || 0)} Items</span>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-bold text-indigo-500 group-hover:translate-x-1 transition-transform duration-150">
                      Open Studio <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <AnimatePresence>
          {isCreatingList && <CreateListModal onClose={() => setIsCreatingList(false)} onSubmit={handleCreateList} data={newListData} setData={setNewListData} />}
          <DeleteConfirmationModal
            isOpen={Boolean(listToDelete)}
            onClose={() => setListToDelete(null)}
            onConfirm={confirmDeleteListCard}
            title="Delete List"
            description="Are you sure you want to delete this list? It will be moved to the Recycling Bin."
            itemName={listToDelete?.name}
            isDeleting={isDeletingList}
          />
        </AnimatePresence>
      </div>
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

const ColumnHeader = ({ column, isMenuOpen, onToggleMenu, onUpdate, onDelete, onResize, onInsertLeft, onInsertRight, disabled }: any) => {
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
    e.preventDefault();
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = containerRef.current?.offsetWidth || 0;
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (isResizing.current) onResize(startWidth.current + (moveEvent.clientX - startX.current));
    };
    const handleMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const types = [
    { id: 'text', label: 'Single Text', icon: Type },
    { id: 'number', label: 'Numeric', icon: Hash },
    { id: 'date', label: 'Date/Time', icon: Calendar },
    { id: 'boolean', label: 'Toggle', icon: ToggleLeft },
    { id: 'choice', label: 'Selection', icon: ListFilter }
  ];

  const handleAddOption = () => {
    if (!newOption.trim()) return;
    onUpdate({ options: [...(column.options || []), newOption.trim()] });
    setNewOption('');
  };
  const handleRemoveOption = (opt: string) => {
    onUpdate({ options: (column.options || []).filter((o: string) => o !== opt) });
  };

  const CurrentIcon = types.find(t => t.id === column.type)?.icon || Type;

  return (
    <div className="flex flex-col h-full w-full relative z-50" ref={containerRef}>
      <div className="flex items-center gap-2.5 px-3.5 py-3 h-full group/th">
        <button 
          onClick={() => !disabled && onToggleMenu(!isMenuOpen)} 
          className="p-1 rounded-md bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-indigo-400 border border-white/10 shrink-0 transition-all cursor-pointer"
          title={`Change column type (${column.type})`}
        >
          <CurrentIcon size={13} />
        </button>
        <div className="flex-1 min-w-0">
          {isEditingName ? (
            <input 
              ref={inputRef} 
              autoFocus 
              value={localName} 
              onChange={(e) => setLocalName(e.target.value)} 
              onBlur={() => { setIsEditingName(false); onUpdate({ name: localName }); }} 
              onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.blur()} 
              className="w-full bg-indigo-500/10 text-indigo-300 font-medium text-xs outline-none py-0.5 px-1.5 rounded border border-indigo-500/30" 
            />
          ) : (
            <div 
              onClick={() => !disabled && setIsEditingName(true)} 
              className="flex items-center gap-1 cursor-text truncate group/name"
              title="Click to rename field"
            >
              <span className={cn(
                "truncate text-xs font-semibold tracking-normal transition-colors", 
                column.required ? "text-indigo-400" : "text-zinc-300 group-hover/th:text-white"
              )}>
                {column.name}
              </span>
              {column.required && <span className="text-rose-400 text-xs font-bold">*</span>}
            </div>
          )}
        </div>
      </div>
      {!disabled && (
        <div 
          onMouseDown={handleResizeStart} 
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-500/40 active:bg-indigo-600 transition-colors z-50" 
        />
      )}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute left-0 top-full mt-2 w-72 bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 z-[100] p-4 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-semibold text-zinc-400">Field Settings</span>
              <button onClick={() => { onToggleMenu(false); onDelete(); }} className="text-zinc-400 hover:text-rose-400 transition-colors p-1">
                <Trash2 size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { onInsertLeft(); onToggleMenu(false); }} className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-indigo-600 text-zinc-300 hover:text-white rounded-lg text-xs font-medium transition-all">
                <Plus size={12} /> Insert Left
              </button>
              <button onClick={() => { onInsertRight(); onToggleMenu(false); }} className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-indigo-600 text-zinc-300 hover:text-white rounded-lg text-xs font-medium transition-all">
                <Plus size={12} /> Insert Right
              </button>
            </div>
            <button onClick={() => onUpdate({ required: !column.required })} className={cn("w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all", column.required ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "text-zinc-300 hover:bg-zinc-800 border border-transparent")}>
              <span>Mandatory Field</span>
              <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center transition-all", column.required ? "bg-rose-500 border-rose-500 text-white" : "border-zinc-600")}>
                {column.required && <Check size={10} strokeWidth={3} />}
              </div>
            </button>
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-zinc-400 px-1">Data Type</span>
              <div className="grid grid-cols-2 gap-1.5">
                {types.map((type) => (
                  <button key={type.id} onClick={() => { onUpdate({ type: type.id }); onToggleMenu(false); }} className={cn("flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all", column.type === type.id ? "bg-indigo-600 text-white shadow-md" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200")}>
                    <type.icon size={12} /> <span>{type.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {column.type === 'choice' && (
              <div className="pt-3 border-t border-zinc-800 space-y-2.5">
                <span className="text-[11px] font-medium text-zinc-400 px-1">Selection Options</span>
                <div className="flex gap-2">
                  <input type="text" placeholder="Add option..." value={newOption} onChange={(e) => setNewOption(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddOption()} className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500 transition-all" />
                  <button onClick={handleAddOption} className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all">
                    <Plus size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                  {(column.options || []).map((opt: string) => (
                    <div key={opt} className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800 text-zinc-300 rounded-md text-xs font-medium border border-zinc-700">
                      <span>{opt}</span>
                      <button onClick={() => handleRemoveOption(opt)} className="text-zinc-500 hover:text-rose-400">
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
      <td className="p-0 w-14 text-center border-r border-white/10" style={{ height: rowHeight }}>
        {!showHistory && item.is_active ? (
          <button {...attributes} {...listeners} className="w-full h-full flex flex-col items-center justify-center cursor-grab active:cursor-grabbing group/handle">
            <span className="text-xs font-medium text-zinc-400 group-hover/handle:hidden">{index}</span>
            <GripVertical size={14} className="text-indigo-400 hidden group-hover/handle:block" />
          </button>
        ) : (
          <div className="text-xs font-medium text-zinc-400">{index}</div>
        )}
      </td>
      {columns.map((col: any, colIdx: number) => (
        <td key={col.id} className="p-0 relative border-r border-white/10 context-menu-trigger" style={{ width: columnWidths[col.id] || 200 }} onContextMenu={(e) => onContextMenu(e, col.id, colIdx)}>
          <CellEditor column={col} value={item.data?.[col.id]} onChange={(val: any) => onCellChange?.(col.id, val)} disabled={showHistory || !item.is_active} isEditing={activeEditingColId === col.id} setIsEditing={(editing: boolean) => setActiveEditingColId(editing ? col.id : null)} onTab={onTab} />
        </td>
      ))}
      <td className="p-0 w-12 text-center bg-white/[0.01] relative row-menu-container">
        <button onClick={() => onToggleMenu(!isMenuOpen)} className={cn("p-1.5 rounded-lg transition-all", isInspected || isMenuOpen ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "text-zinc-400 hover:text-indigo-400 hover:bg-white/5")}>
          <MoreVertical size={15} />
        </button>
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div initial={{ opacity: 0, x: 10, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 10, scale: 0.95 }} className="absolute right-full top-0 mr-2 w-48 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-[100] overflow-hidden p-1.5 flex flex-col">
              <button onClick={() => { onInspect(); onToggleMenu(false); }} className="flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-medium transition-all">
                <Info size={14} className="text-indigo-400" /> Inspect Version
              </button>
              <div className="h-px bg-zinc-800 my-1 mx-2" />
              <button onClick={() => { onInsertAbove(); onToggleMenu(false); }} className="flex items-center gap-2.5 px-3 py-2 hover:bg-indigo-600 text-zinc-300 hover:text-white rounded-xl text-xs font-medium transition-all">
                <ArrowUp size={14} className="text-zinc-400 group-hover:text-white" /> Insert Above
              </button>
              <button onClick={() => { onInsertBelow(); onToggleMenu(false); }} className="flex items-center gap-2.5 px-3 py-2 hover:bg-indigo-600 text-zinc-300 hover:text-white rounded-xl text-xs font-medium transition-all">
                <ArrowDown size={14} className="text-zinc-400 group-hover:text-white" /> Insert Below
              </button>
              <div className="h-px bg-zinc-800 my-1 mx-2" />
              <button onClick={() => { onRetire(); onToggleMenu(false); }} className="flex items-center gap-2.5 px-3 py-2 hover:bg-rose-600 text-rose-400 hover:text-white rounded-xl text-xs font-medium transition-all">
                <Archive size={14} /> Retire Version
              </button>
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
  const days = useMemo(() => {
    const numDays = daysInMonth(currentMonth);
    const offset = firstDayOfMonth(currentMonth);
    const arr = [];
    for (let i = 0; i < offset; i++) arr.push(null);
    for (let i = 1; i <= numDays; i++) arr.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
    return arr;
  }, [currentMonth]);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const handleApply = () => {
    const finalDate = new Date(selectedDate);
    finalDate.setHours(time.hour);
    finalDate.setMinutes(time.minute);
    onChange(finalDate.toISOString());
  };
  return (
    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="absolute left-[-16px] top-[-16px] w-[300px] bg-zinc-950 rounded-2xl border border-zinc-800 shadow-2xl z-[1000] overflow-hidden p-4">
      <div className="flex flex-col space-y-3">
        <div className="flex items-center justify-between px-1">
          <button onClick={(e) => { e.stopPropagation(); setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)); }} className="p-1 hover:bg-zinc-800 rounded-md transition-colors">
            <ChevronLeft size={16} className="text-zinc-400" />
          </button>
          <span className="text-xs font-semibold text-zinc-200">
            {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <button onClick={(e) => { e.stopPropagation(); setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)); }} className="p-1 hover:bg-zinc-800 rounded-md transition-colors">
            <ChevronRight size={16} className="text-zinc-400" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {["S", "M", "T", "W", "T", "F", "S"].map(d => (
            <div key={d} className="text-[10px] font-semibold text-zinc-500 p-1">{d}</div>
          ))}
          {days.map((d, i) => d ? (
            <button key={i} onClick={(e) => { e.stopPropagation(); setSelectedDate(d); }} className={cn("p-1.5 text-xs font-medium rounded-lg transition-all", selectedDate.toDateString() === d.toDateString() ? "bg-indigo-600 text-white shadow-md" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200")}>
              {d.getDate()}
            </button>
          ) : <div key={i} />)}
        </div>
        <div className="border-t border-zinc-800 pt-3 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <Clock size={13} className="text-zinc-500" />
              <span className="text-xs font-medium text-zinc-400">Time</span>
            </div>
            <div className="flex items-center gap-1">
              <input type="number" min="0" max="23" value={time.hour} onChange={(e) => setTime({ ...time, hour: parseInt(e.target.value) || 0 })} onClick={(e) => e.stopPropagation()} className="w-10 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-xs font-medium text-zinc-200 outline-none focus:border-indigo-500 text-center" />
              <span className="text-zinc-500">:</span>
              <input type="number" min="0" max="59" value={time.minute} onChange={(e) => setTime({ ...time, minute: parseInt(e.target.value) || 0 })} onClick={(e) => e.stopPropagation()} className="w-10 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-xs font-medium text-zinc-200 outline-none focus:border-indigo-500 text-center" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={(e) => { e.stopPropagation(); onCancel(); }} className="flex-1 py-1.5 bg-zinc-900 text-zinc-400 rounded-xl text-xs font-medium border border-zinc-800 hover:bg-zinc-800 transition-all">
              Cancel
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleApply(); }} className="flex-1 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-medium hover:bg-indigo-500 shadow-md shadow-indigo-500/20 transition-all">
              Apply
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const renderCellContent = (column: any, value: any) => {
  if (value === undefined || value === null || value === '') return <span className="text-zinc-600 italic text-xs">—</span>;
  if (column.type === 'boolean') return value ? <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md text-xs font-medium border border-emerald-500/20">Yes</span> : <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded-md text-xs font-medium border border-rose-500/20">No</span>;
  if (column.type === 'choice') return <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300 rounded-md text-xs font-medium border border-indigo-500/20">{value}</span>;
  if (column.type === 'date') {
    const d = new Date(value);
    return (
      <span className="flex items-center gap-1.5 text-zinc-300 text-xs font-normal">
        <Calendar size={12} className="text-indigo-400 shrink-0" />
        <span className="truncate">{d.toLocaleDateString()}</span>
        <span className="text-[11px] text-zinc-500 ml-auto bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
          {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </span>
    );
  }
  if (column.type === 'number') return <span className="font-mono text-zinc-200 text-xs font-normal">{value}</span>;
  return <span className="text-zinc-200 text-xs font-normal">{String(value)}</span>;
};

const ConfirmationModal = ({ title, message, confirmLabel, onConfirm, onCancel }: any) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" />
    <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }} className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-8 text-center space-y-6">
      <div className="w-14 h-14 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/20"><AlertTriangle size={26} /></div>
      <div className="space-y-2"><h3 className="text-lg font-bold text-white tracking-tight">{title}</h3><p className="text-xs text-zinc-400 leading-relaxed">{message}</p></div>
      <div className="flex gap-3"><button onClick={onCancel} className="flex-1 px-4 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold hover:bg-zinc-700 transition-all">Cancel</button><button onClick={onConfirm} className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-500 shadow-md shadow-rose-500/20 transition-all">{confirmLabel || 'Confirm'}</button></div>
    </motion.div>
  </div>
);

const CreateListModal = ({ onClose, onSubmit, data, setData }: any) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-zinc-950/60" />
    <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }} className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-8 space-y-6">
      <div className="space-y-1.5">
        <h3 className="text-xl font-bold text-white tracking-tight">New List</h3>
        <p className="text-xs text-zinc-400">Define a new master lookup list and choice dataset.</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300 px-0.5">List Name</label>
          <input required type="text" placeholder="e.g. Application Types" value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 transition-all text-xs font-medium text-white placeholder-zinc-500" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300 px-0.5">Description</label>
          <textarea placeholder="What is this list for?" value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 transition-all text-xs font-medium text-white placeholder-zinc-500 min-h-[90px] resize-none" />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-zinc-700 rounded-xl font-semibold text-xs text-zinc-400 hover:bg-zinc-800 transition-all cursor-pointer">Cancel</button>
        <button onClick={onSubmit} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-xs shadow-md shadow-indigo-500/20 hover:bg-indigo-500 transition-all cursor-pointer">Create List</button>
      </div>
    </motion.div>
  </div>
);
