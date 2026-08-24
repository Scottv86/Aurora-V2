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
  Sparkles,
  FileSpreadsheet,
  Save,
  Calculator,
  FunctionSquare,
  KeyRound,
  Fingerprint,
  ListOrdered,
  Binary,
  DollarSign,
  Percent,
  Mail,
  Phone,
  Globe,
  Link2,
  User,
  Tag,
  CircleDot,
  Copy,
  ExternalLink,
  RefreshCw
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

import { useGlobalLists, useGlobalList, GlobalListItem, ListColumn, ListColumnType, StatusPillOption, GlobalList } from '../../../hooks/useGlobalList';
import { PageHeader } from '../../../components/UI/PageHeader';
import { EmptyState } from '../../../components/UI/EmptyState';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';
import { usePlatform } from '../../../hooks/usePlatform';
import { TrashService } from '../../../services/trashService';
import { DeleteConfirmationModal } from '../../../components/Common/DeleteConfirmationModal';
import { ListBulkImportModal } from '../../../components/Settings/PlatformModules/ListBulkImportModal';
import { CalculatorModal } from '../../../components/Builder/CalculatorModal';
import { createFormulaContext } from '../../../lib/formulaEngine';

export const generateUUID = (prefix?: string) => {
  const uuid = typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
  return prefix ? `${prefix}${uuid}` : uuid;
};

export const formatAutoNumber = (seqIndex: number, prefix: string = 'REC-', padding: number = 4, start: number = 1) => {
  const num = (start || 1) + seqIndex;
  const padded = String(num).padStart(Math.max(1, padding || 4), '0');
  return `${prefix || ''}${padded}`;
};

export const STATUS_COLOR_MAP: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  emerald: { bg: 'bg-emerald-500/10 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
  amber: { bg: 'bg-amber-500/10 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-500/30', dot: 'bg-amber-500' },
  rose: { bg: 'bg-rose-500/10 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-500/30', dot: 'bg-rose-500' },
  blue: { bg: 'bg-blue-500/10 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-500/30', dot: 'bg-blue-500' },
  indigo: { bg: 'bg-indigo-500/10 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-500/30', dot: 'bg-indigo-500' },
  purple: { bg: 'bg-purple-500/10 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-500/30', dot: 'bg-purple-500' },
  zinc: { bg: 'bg-zinc-500/10 dark:bg-zinc-800/80', text: 'text-zinc-700 dark:text-zinc-300', border: 'border-zinc-500/30', dot: 'bg-zinc-500' },
  cyan: { bg: 'bg-cyan-500/10 dark:bg-cyan-950/40', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-500/30', dot: 'bg-cyan-500' },
};

export const COLUMN_TYPES: { id: ListColumnType; label: string; category: string; icon: any }[] = [
  // Basic
  { id: 'text', label: 'Single Text', category: 'Basic', icon: Type },
  { id: 'number', label: 'Numeric', category: 'Basic', icon: Hash },
  { id: 'date', label: 'Date/Time', category: 'Basic', icon: Calendar },
  { id: 'boolean', label: 'Toggle', category: 'Basic', icon: ToggleLeft },

  // Choices & Tags
  { id: 'choice', label: 'Single Choice', category: 'Choices', icon: ListFilter },
  { id: 'multi_choice', label: 'Multi-Select Tags', category: 'Choices', icon: Tag },
  { id: 'status_pill', label: 'Status Pill', category: 'Choices', icon: CircleDot },

  // Identifiers
  { id: 'uuid', label: 'UUID / GUID', category: 'Identifiers', icon: KeyRound },
  { id: 'autonumber', label: 'Auto-Sequence ID', category: 'Identifiers', icon: ListOrdered },

  // Financial
  { id: 'currency', label: 'Currency', category: 'Financial', icon: DollarSign },
  { id: 'percentage', label: 'Percentage', category: 'Financial', icon: Percent },

  // Contact & Links
  { id: 'email', label: 'Email', category: 'Contact', icon: Mail },
  { id: 'phone', label: 'Phone', category: 'Contact', icon: Phone },
  { id: 'url', label: 'Web Link / URL', category: 'Contact', icon: Globe },

  // People & Compute
  { id: 'user', label: 'User / Member', category: 'Advanced', icon: User },
  { id: 'calculation', label: 'Calculated Field', category: 'Advanced', icon: Calculator },
];

export const evaluateListFormula = (
  formula?: string,
  rowData?: Record<string, any>,
  columns: ListColumn[] = [],
  getGlobalListItems?: (name: string) => any[]
) => {
  if (!formula || !rowData) return null;
  try {
    const cleanKey = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Build comprehensive aliases for all columns
    const columnMap: Record<string, ListColumn> = {};
    columns.forEach(col => {
      if (col.id) {
        columnMap[col.id.toLowerCase()] = col;
        columnMap[cleanKey(col.id)] = col;
      }
      if (col.name) {
        columnMap[col.name.toLowerCase().trim()] = col;
        columnMap[col.name.toLowerCase().replace(/[^a-z0-9_]/g, '_')] = col;
        columnMap[cleanKey(col.name)] = col;
      }
    });

    // Helper to resolve cell value from rowData
    const getRowValue = (identifier: string) => {
      const trimmed = identifier.trim();
      const lower = trimmed.toLowerCase();
      const clean = cleanKey(trimmed);

      // 1. Direct key match in rowData
      if (rowData[trimmed] !== undefined) return rowData[trimmed];
      if (rowData[lower] !== undefined) return rowData[lower];

      // 2. Resolved column match in rowData
      const matchedCol = columnMap[lower] || columnMap[clean];
      if (matchedCol) {
        if (rowData[matchedCol.id] !== undefined) return rowData[matchedCol.id];
        if (rowData[matchedCol.name] !== undefined) return rowData[matchedCol.name];
        if (rowData[matchedCol.name.toLowerCase()] !== undefined) return rowData[matchedCol.name.toLowerCase()];
      }

      // 3. Fallback matching rowData keys via cleaned key
      for (const [key, val] of Object.entries(rowData)) {
        if (cleanKey(key) === clean) return val;
      }

      return undefined;
    };

    // Strip comments
    let executable = formula.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

    // Variable Substitution: '{Field}', "{Field}", or {Field}
    executable = executable.replace(/['"]\{([^{}]+)\}['"]|\{([^{}]+)\}/g, (_match, id1, id2) => {
      const identifier = id1 || id2;
      const val = getRowValue(identifier);

      if (val === undefined || val === null || val === '') return 'null';

      if (typeof val === 'boolean') return String(val);
      if (typeof val === 'number') return String(val);

      if (String(val).toLowerCase() === 'true') return 'true';
      if (String(val).toLowerCase() === 'false') return 'false';

      if (!isNaN(Number(val)) && String(val).trim() !== '') {
        return Number(val);
      }

      return `"${String(val).replace(/"/g, '\\"')}"`;
    });

    // Replace equality operators for JavaScript execution: == to ===, != to !==
    executable = executable
      .replace(/([^=!])==([^=])/g, '$1===$2')
      .replace(/([^=!])!=([^=])/g, '$1!==$2');
    
    if (executable.startsWith('==')) executable = '=' + executable;
    if (executable.startsWith('!=')) executable = '!' + executable;

    const context = createFormulaContext({
      getGlobalListItems
    });

    // eslint-disable-next-line no-new-func
    const func = new Function(...Object.keys(context), `return ${executable}`);
    const res = func(...Object.values(context));
    return res;
  } catch (err) {
    console.warn('[evaluateListFormula] Evaluation Error:', formula, err);
    return null;
  }
};

export const GlobalListsSettings = () => {
  const location = useLocation();
  const { tenant, members = [], isBuilderFullscreen, setIsBuilderFullscreen, toggleBuilderFullscreen } = usePlatform();
  const isSettingsMode = location.pathname.startsWith('/workspace/settings');

  const { lists, loading: listsLoading, createListWithItems, saveFullList, deleteList, refetch: refetchLists } = useGlobalLists();
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importModalTargetList, setImportModalTargetList] = useState<GlobalList | null>(null);
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
  const [confirmRegenerateUUIDCol, setConfirmRegenerateUUIDCol] = useState<{ colId: string; prefix?: string; colName: string } | null>(null);
  const [confirmRenumberCol, setConfirmRenumberCol] = useState<{ colId: string; prefix?: string; padding?: number; start?: number; colName: string } | null>(null);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [rowHeight, setRowHeight] = useState(36);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, type: 'cell' | 'header', itemId?: string, colId?: string, colIndex?: number, rowIndex?: number } | null>(null);
  const [calculatorModalCol, setCalculatorModalCol] = useState<ListColumn | null>(null);

  // Draft / In-Studio Local State
  const [draftList, setDraftList] = useState<{ id: string; name: string; description: string; isNewDraft: boolean } | null>(null);
  const [localColumns, setLocalColumns] = useState<ListColumn[]>([]);
  const [localItems, setLocalItems] = useState<GlobalListItem[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const availableFieldsForCalculator = useMemo(() => {
    return localColumns
      .filter(c => c.id !== calculatorModalCol?.id)
      .map(c => ({
        id: c.id,
        name: c.name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        label: c.name,
        type: (c.type === 'calculation' ? 'calculation' : c.type === 'number' ? 'number' : c.type === 'date' ? 'date' : c.type === 'boolean' ? 'boolean' : 'text') as any,
        calculationLogic: c.calculation_formula,
        calculationTriggers: c.calculation_triggers,
      }));
  }, [localColumns, calculatorModalCol]);

  const activeListSummary = useMemo(() => lists.find(l => l.id === selectedListId), [lists, selectedListId]);
  const { 
    list: activeList,
    items: dbItems
  } = useGlobalList(selectedListId && selectedListId !== 'draft' ? selectedListId : null, { showAllHistory: showHistory });

  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Sync loaded DB data into local state when opening an existing list
  useEffect(() => {
    if (selectedListId && selectedListId !== 'draft' && activeList) {
      setDraftList({
        id: activeList.id,
        name: activeList.name,
        description: activeList.description || '',
        isNewDraft: false
      });
      setMetadataForm({
        name: activeList.name,
        description: activeList.description || ''
      });
      setLocalColumns(activeList.columns || []);
      setLocalItems(dbItems || []);
      setIsDirty(false);
    }
  }, [selectedListId, activeList, dbItems]);
  
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
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = localItems.findIndex(item => item.id === active.id);
    const newIndex = localItems.findIndex(item => item.id === over.id);
    const nextItems = arrayMove(localItems, oldIndex, newIndex).map((r, i) => ({ ...r, sort_order: i }));
    setLocalItems(nextItems);
    setIsDirty(true);
  };

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListData.name.trim()) return;
    const defaultCols: ListColumn[] = [
      { id: 'col_' + Math.random().toString(36).substr(2, 9), name: 'Title', type: 'text', required: true }
    ];
    setDraftList({
      id: 'draft',
      name: newListData.name.trim(),
      description: newListData.description.trim(),
      isNewDraft: true
    });
    setMetadataForm({
      name: newListData.name.trim(),
      description: newListData.description.trim()
    });
    setLocalColumns(defaultCols);
    setLocalItems([
      {
        id: `draft_row_${Date.now()}`,
        list_id: 'draft',
        tenant_id: tenant?.id || '',
        data: { [defaultCols[0].id]: '' },
        sort_order: 0,
        is_active: true,
        valid_from: new Date().toISOString(),
        valid_to: null
      }
    ]);
    setSelectedListId('draft');
    setIsDirty(true);
    setIsCreatingList(false);
    setNewListData({ name: '', description: '' });
  };

  const handleImportSuccess = (draftData: any) => {
    if (!draftData) return;
    if (draftData.mode === 'create') {
      setDraftList({
        id: 'draft',
        name: draftData.name || 'Imported List',
        description: draftData.description || '',
        isNewDraft: true
      });
      setMetadataForm({
        name: draftData.name || 'Imported List',
        description: draftData.description || ''
      });
      setLocalColumns(draftData.columns);
      setLocalItems(draftData.rows.map((row: any, idx: number) => ({
        id: `draft_row_${idx + 1}`,
        list_id: 'draft',
        tenant_id: tenant?.id || '',
        data: row,
        sort_order: idx,
        is_active: true,
        valid_from: new Date().toISOString(),
        valid_to: null
      })));
      setSelectedListId('draft');
      setIsDirty(true);
      setIsImportModalOpen(false);
    } else if (draftData.mode === 'append') {
      const startingIdx = localItems.length;
      const newItems: GlobalListItem[] = draftData.rows.map((row: any, idx: number) => ({
        id: `draft_appended_${Date.now()}_${idx}`,
        list_id: selectedListId || 'draft',
        tenant_id: tenant?.id || '',
        data: row,
        sort_order: startingIdx + idx,
        is_active: true,
        valid_from: new Date().toISOString(),
        valid_to: null
      }));
      setLocalItems(prev => [...prev, ...newItems]);
      setIsDirty(true);
      setIsImportModalOpen(false);
      toast.success(`Loaded ${newItems.length} rows into builder`);
    }
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

  const handleUpdateMetadata = () => {
    setIsEditingMetadata(false);
    if (draftList && (metadataForm.name !== draftList.name || metadataForm.description !== draftList.description)) {
      setDraftList(prev => prev ? { ...prev, name: metadataForm.name, description: metadataForm.description } : null);
      setIsDirty(true);
    }
  };

  const handleResizeColumn = (colId: string, width: number) => {
    setColumnWidths(prev => ({ ...prev, [colId]: Math.max(80, width) }));
  };

  const handleAddColumn = (insertAt?: number) => {
    const newColId = `col_${Date.now()}`;
    const newColName = `Field ${localColumns.length + 1}`;
    const newCol: ListColumn = { id: newColId, name: newColName, type: 'text', required: false };
    setLocalColumns(prev => {
      const next = [...prev];
      if (insertAt !== undefined) next.splice(insertAt, 0, newCol);
      else next.push(newCol);
      return next;
    });
    setIsDirty(true);
    setActiveMenuColumnId(newColId);
    toast.success('Field added');
  };

  const handleColumnUpdate = (colId: string, updates: Partial<ListColumn>) => {
    setLocalColumns(prev => prev.map(c => c.id === colId ? { ...c, ...updates } : c));
    setIsDirty(true);
  };

  const handleDeleteColumn = () => {
    if (!confirmDeleteColumnId) return;
    if (localColumns.length <= 1) {
      toast.error('Lists require at least one column');
      setConfirmDeleteColumnId(null);
      return;
    }
    setLocalColumns(prev => prev.filter(c => c.id !== confirmDeleteColumnId));
    setIsDirty(true);
    setConfirmDeleteColumnId(null);
    toast.success('Column deleted');
  };

  const handleRetireItem = () => {
    if (!confirmRetireItemId) return;
    setLocalItems(prev => prev.filter(i => i.id !== confirmRetireItemId));
    setIsDirty(true);
    setConfirmRetireItemId(null);
    toast.success('Record removed');
  };

  const handleCellChange = (item: GlobalListItem, colId: string, value: any) => {
    setLocalItems(prev => prev.map(p => p.id === item.id ? { ...p, data: { ...p.data, [colId]: value } } : p));
    setIsDirty(true);
  };

  const handleBackfillUUID = (colId: string, prefix?: string) => {
    let count = 0;
    setLocalItems(prev => prev.map(item => {
      if (!item.data?.[colId]) {
        count++;
        return { ...item, data: { ...item.data, [colId]: generateUUID(prefix) } };
      }
      return item;
    }));
    setIsDirty(true);
    toast.success(count > 0 ? `Generated UUIDs for ${count} empty records` : 'No empty records found');
  };

  const handleRegenerateAllUUIDs = (colId: string, prefix?: string) => {
    setLocalItems(prev => prev.map(item => ({
      ...item,
      data: { ...item.data, [colId]: generateUUID(prefix) }
    })));
    setIsDirty(true);
    toast.success('All record UUIDs regenerated & overwritten');
  };

  const handleBackfillAutoNumber = (colId: string, prefix: string = 'REC-', padding: number = 4, start: number = 1) => {
    let count = 0;
    setLocalItems(prev => prev.map((item, idx) => {
      if (!item.data?.[colId]) {
        count++;
        return {
          ...item,
          data: {
            ...item.data,
            [colId]: formatAutoNumber(idx, prefix, padding, start)
          }
        };
      }
      return item;
    }));
    setIsDirty(true);
    toast.success(count > 0 ? `Assigned sequence numbers to ${count} empty records` : 'All records already have sequence numbers');
  };

  const handleRenumberAutoNumber = (colId: string, prefix: string = 'REC-', padding: number = 4, start: number = 1) => {
    setLocalItems(prev => prev.map((item, idx) => ({
      ...item,
      data: {
        ...item.data,
        [colId]: formatAutoNumber(idx, prefix, padding, start)
      }
    })));
    setIsDirty(true);
    toast.success('Sequence numbers re-calculated for all records');
  };

  const handleAddRow = (insertAt?: number) => {
    const initialData: Record<string, any> = {};
    const seqIdx = insertAt !== undefined ? insertAt : localItems.length;
    localColumns.forEach(col => {
      if (col.type === 'uuid') {
        initialData[col.id] = generateUUID(col.uuid_prefix);
      } else if (col.type === 'autonumber') {
        initialData[col.id] = formatAutoNumber(
          seqIdx,
          col.autonumber_prefix ?? 'REC-',
          col.autonumber_padding ?? 4,
          col.autonumber_start ?? 1
        );
      } else if (col.type === 'multi_choice') {
        initialData[col.id] = [];
      } else if (col.type === 'boolean') {
        initialData[col.id] = false;
      } else if (col.type === 'number' || col.type === 'currency' || col.type === 'percentage') {
        initialData[col.id] = null;
      } else {
        initialData[col.id] = '';
      }
    });
    const newId = `row_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newRow: GlobalListItem = {
      id: newId,
      list_id: selectedListId || 'draft',
      tenant_id: tenant?.id || '',
      data: initialData,
      sort_order: seqIdx,
      is_active: true,
      valid_from: new Date().toISOString(),
      valid_to: null
    };
    setLocalItems(prev => {
      const next = [...prev];
      if (insertAt !== undefined) next.splice(insertAt, 0, newRow);
      else next.push(newRow);
      return next.map((r, i) => ({ ...r, sort_order: i }));
    });
    setIsDirty(true);
    if (localColumns.length > 0) {
      setActiveEditingCell({ itemId: newId, colId: localColumns[0].id });
    }
    toast.success('New row added');
  };

  const handleTab = (itemId: string, colId: string, shift: boolean) => {
    if (localColumns.length === 0) return;
    const itemIndex = localItems.findIndex(i => i.id === itemId);
    const colIndex = localColumns.findIndex(c => c.id === colId);
    
    if (!shift) {
      if (colIndex < localColumns.length - 1) {
        setActiveEditingCell({ itemId, colId: localColumns[colIndex + 1].id });
      } else if (itemIndex < localItems.length - 1) {
        setActiveEditingCell({ itemId: localItems[itemIndex + 1].id, colId: localColumns[0].id });
      } else {
        handleAddRow();
      }
    } else {
      if (colIndex > 0) {
        setActiveEditingCell({ itemId, colId: localColumns[colIndex - 1].id });
      } else if (itemIndex > 0) {
        setActiveEditingCell({ itemId: localItems[itemIndex - 1].id, colId: localColumns[localColumns.length - 1].id });
      }
    }
  };

  const handleOpenList = (list: any) => {
    setSelectedListId(list.id);
    setDraftList({
      id: list.id,
      name: list.name,
      description: list.description || '',
      isNewDraft: false
    });
    setMetadataForm({
      name: list.name,
      description: list.description || ''
    });
    setLocalColumns(list.columns || []);
    setIsDirty(false);
  };

  const handleSaveList = async () => {
    if (!draftList?.name.trim()) {
      toast.error('Please enter a list name');
      return;
    }
    if (localColumns.length === 0) {
      toast.error('Please add at least one column');
      return;
    }

    setIsSaving(true);
    try {
      if (draftList.isNewDraft || selectedListId === 'draft') {
        const created = await createListWithItems(
          draftList.name.trim(),
          draftList.description.trim() || undefined,
          localColumns,
          localItems.map(i => i.data)
        );
        if (created) {
          setSelectedListId(created.id);
          setDraftList({
            id: created.id,
            name: created.name,
            description: created.description || '',
            isNewDraft: false
          });
          setIsDirty(false);
        }
      } else {
        await saveFullList(
          draftList.id,
          {
            name: draftList.name.trim(),
            description: draftList.description.trim() || undefined,
            columns: localColumns
          },
          localItems
        );
        setIsDirty(false);
        toast.success('List saved successfully');
      }
    } catch (err: any) {
      console.error('Save error', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackClick = () => {
    if (isDirty) {
      setShowUnsavedConfirm(true);
    } else {
      setSelectedListId(null);
      setDraftList(null);
      setLocalItems([]);
      setLocalColumns([]);
      setIsDirty(false);
      setInspectedItem(null);
      setActiveMenuColumnId(null);
      setActiveEditingCell(null);
      setIsEditingMetadata(false);
      setIsBuilderFullscreen(false);
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
      const storedMatch = Object.values(item.data || {}).some(val => {
        if (val === null || val === undefined) return false;
        if (Array.isArray(val)) return val.some(v => String(v).toLowerCase().includes(q));
        return String(val).toLowerCase().includes(q);
      });
      if (storedMatch) return true;
      return localColumns.some(col => {
        if (col.type === 'calculation' && col.calculation_formula) {
          const calcVal = evaluateListFormula(col.calculation_formula, item.data || {}, localColumns);
          return calcVal !== null && calcVal !== undefined && String(calcVal).toLowerCase().includes(q);
        }
        if (col.type === 'user') {
          const userVal = item.data?.[col.id];
          const member = members.find((m: any) => m.id === userVal || m.email === userVal);
          if (member) {
            const fullName = `${member.firstName || ''} ${member.familyName || ''} ${member.email || ''}`.toLowerCase();
            return fullName.includes(q);
          }
        }
        return false;
      });
    });
  }, [localItems, localColumns, tableSearch, members]);

  const renderCellContent = (column: ListColumn, value: any, rowData?: Record<string, any>) => {
    if (column.type === 'calculation') {
      const calculatedValue = rowData ? evaluateListFormula(column.calculation_formula, rowData, localColumns) : value;
      if (calculatedValue === null || calculatedValue === undefined || calculatedValue === '') return '-';
      if (column.calculation_show_as_currency) {
        const num = Number(calculatedValue);
        const sym = column.calculation_currency_symbol || '$';
        return isNaN(num) ? `${sym}${calculatedValue}` : `${sym}${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      return typeof calculatedValue === 'number' ? calculatedValue.toLocaleString() : String(calculatedValue);
    }
    if (column.type === 'currency') {
      if (value === null || value === undefined || value === '') return '-';
      const num = Number(value);
      const sym = column.currency_symbol || '$';
      return isNaN(num) ? `${sym}${value}` : `${sym}${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (column.type === 'percentage') {
      if (value === null || value === undefined || value === '') return '-';
      return `${value}%`;
    }
    if (column.type === 'uuid') {
      return value || '-';
    }
    if (column.type === 'autonumber') {
      return value || '-';
    }
    if (column.type === 'multi_choice') {
      if (!Array.isArray(value) || value.length === 0) return '-';
      return value.join(', ');
    }
    if (column.type === 'status_pill') {
      return value || '-';
    }
    if (column.type === 'user') {
      if (!value) return '-';
      const member = members.find((m: any) => m.id === value || m.email === value);
      return member ? `${member.firstName || ''} ${member.familyName || ''}`.trim() || member.email : String(value);
    }
    if (value === undefined || value === null) return '';
    if (column.type === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

  // Full Screen List Studio Mode
  if (selectedListId) {
    return (
      <div className="fixed inset-0 z-[100] bg-zinc-50 dark:bg-zinc-950 flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100 animate-in fade-in duration-200">
        {/* Top Studio Bar */}
        <div className="h-14 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-900/90 backdrop-blur-md px-6 flex items-center justify-between z-30 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <button
              onClick={handleBackClick}
              className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shrink-0"
              title="Back to All Lists (Esc)"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Lists</span>
            </button>

            <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-800 shrink-0" />

            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 shrink-0">
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
                    className="text-sm font-bold bg-zinc-100 dark:bg-zinc-800 border-b-2 border-zinc-400 dark:border-zinc-500 text-zinc-900 dark:text-zinc-100 outline-none px-1.5 py-0.5 rounded"
                    placeholder="List Name"
                  />
                ) : (
                  <div 
                    onClick={() => setIsEditingMetadata(true)} 
                    className="flex items-center gap-1.5 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 px-1.5 py-0.5 -mx-1.5 rounded-lg transition-all group/title"
                    title="Click to edit list name"
                  >
                    <span className="text-sm font-black text-zinc-900 dark:text-white tracking-tight truncate max-w-xs sm:max-w-md">
                      {draftList?.name || 'Untitled List'}
                    </span>
                    <Edit2 size={12} className="text-zinc-400 opacity-0 group-hover/title:opacity-100 transition-opacity" />
                  </div>
                )}
                <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 shrink-0">
                  {draftList?.isNewDraft ? 'Draft List' : 'List Studio'}
                </span>
                <span className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 shrink-0">
                  {localItems.length} Records
                </span>
                {isDirty && (
                  <span className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0 animate-pulse">
                    Unsaved
                  </span>
                )}
              </div>
              {draftList?.description && (
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium truncate max-w-md">
                  {draftList.description}
                </p>
              )}
            </div>
          </div>

          {/* Right Toolbar Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Table Search Filter */}
            <div className="relative hidden md:block w-44">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Filter rows..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="w-full bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-7 pr-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Density Slider */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <span className="text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Density</span>
              <input 
                type="range" 
                min="36" 
                max="72" 
                value={rowHeight} 
                onChange={(e) => setRowHeight(parseInt(e.target.value))} 
                className="w-14 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" 
              />
            </div>

            {/* History Mode Toggle */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all border cursor-pointer",
                showHistory 
                  ? "bg-rose-500/20 border-rose-500/40 text-rose-500 dark:text-rose-400 shadow-md shadow-rose-500/20" 
                  : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              )}
              title="Toggle Version Audit History (SCD Type 2)"
            >
              <History size={13} />
              <span className="hidden sm:inline">{showHistory ? 'Viewing History' : 'History'}</span>
            </button>

            {/* Import CSV Data Button */}
            <button
              onClick={() => {
                setImportModalTargetList(draftList as any);
                setIsImportModalOpen(true);
              }}
              disabled={showHistory}
              className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              title="Bulk import CSV or spreadsheet rows into this list"
            >
              <FileSpreadsheet size={13} className="text-indigo-500" />
              <span className="hidden sm:inline">Import CSV</span>
            </button>

            {/* Add Column Button */}
            <button
              onClick={() => handleAddColumn()}
              disabled={showHistory}
              className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <Columns size={13} className="text-indigo-500" />
              <span className="hidden sm:inline">Add Field</span>
            </button>

            {/* Add Record Button */}
            <button
              onClick={() => handleAddRow()}
              disabled={showHistory}
              className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <Plus size={14} className="text-indigo-500" />
              <span className="hidden sm:inline">Add Record</span>
            </button>

            {/* SAVE BUTTON */}
            <button
              onClick={handleSaveList}
              disabled={isSaving || (!isDirty && !draftList?.isNewDraft)}
              className={cn(
                "px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md",
                isDirty || draftList?.isNewDraft
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25 ring-2 ring-indigo-400/30"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700 cursor-default opacity-50"
              )}
              title="Save all changes to this list"
            >
              {isSaving ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-0.5" />
              ) : (
                <Save size={13} className={cn(isDirty || draftList?.isNewDraft ? "text-white" : "text-zinc-400")} />
              )}
              <span>{isSaving ? 'Saving...' : draftList?.isNewDraft ? 'Save List' : isDirty ? 'Save Changes' : 'Saved'}</span>
            </button>

            {/* Delete List (only if not a brand new unsaved draft) */}
            {!draftList?.isNewDraft && selectedListId !== 'draft' && (
              <button
                onClick={() => setConfirmDeleteListId(selectedListId)}
                className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                title="Delete List"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Main Studio Canvas */}
        <div className="flex-1 flex flex-row min-h-0 relative z-10 p-4 gap-4 overflow-hidden bg-zinc-100 dark:bg-zinc-950">
          <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xl relative z-10">
            {/* Table Action Bar */}
            <div className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-2.5">
                <div className="p-1 bg-zinc-100 dark:bg-zinc-800 rounded-md text-zinc-500 dark:text-zinc-400">
                  <LayoutGrid size={13} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  {localItems.length} Records Total {tableSearch && `• ${displayLocalItems.length} matching filter`}
                </span>
              </div>
              {showHistory && (
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 dark:text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-md border border-rose-500/20">
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
              {draftList && (
                <DndContext sensors={sensors} collisionDetection={rectIntersection} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                  <table className="w-max min-w-full text-left border-collapse table-fixed relative z-30">
                    <thead className="sticky top-0 bg-zinc-100/90 dark:bg-zinc-900/90 z-50 shadow-xs border-b border-zinc-200 dark:border-zinc-800 backdrop-blur-xs">
                      <tr>
                        <th className="p-0 w-10 text-center border-r border-zinc-200 dark:border-zinc-800 bg-zinc-100/90 dark:bg-zinc-900/80 text-xs font-bold text-zinc-700 dark:text-zinc-300">#</th>
                        {localColumns.map((col, idx) => (
                          <th key={col.id} className="p-0 text-xs font-bold text-zinc-900 dark:text-zinc-100 relative group/th border-r border-zinc-200 dark:border-zinc-800 bg-zinc-100/90 dark:bg-zinc-900/80 column-header-container context-menu-trigger" style={{ width: columnWidths[col.id] || 160 }} onContextMenu={(e) => onHeaderContextMenu(e, col.id, idx)}>
                            <ColumnHeader 
                              column={col} 
                              isMenuOpen={activeMenuColumnId === col.id} 
                              onToggleMenu={(open: boolean) => setActiveMenuColumnId(open ? col.id : null)} 
                              onUpdate={(updates: Partial<ListColumn>) => handleColumnUpdate(col.id, updates)} 
                              onDelete={() => setConfirmDeleteColumnId(col.id)} 
                              onResize={(width: number) => handleResizeColumn(col.id, width)} 
                              onInsertLeft={() => handleAddColumn(idx)} 
                              onInsertRight={() => handleAddColumn(idx + 1)} 
                              onOpenCalculator={() => setCalculatorModalCol(col)}
                              onBackfillUUID={() => handleBackfillUUID(col.id, col.uuid_prefix)}
                              onRegenerateAllUUID={() => {
                                setActiveMenuColumnId(null);
                                setConfirmRegenerateUUIDCol({ colId: col.id, prefix: col.uuid_prefix, colName: col.name });
                              }}
                              onBackfillAutoNumber={(prefix?: string, padding?: number, start?: number) => handleBackfillAutoNumber(col.id, prefix, padding, start)}
                              onRenumberAutoNumber={(prefix?: string, padding?: number, start?: number) => {
                                setActiveMenuColumnId(null);
                                setConfirmRenumberCol({ colId: col.id, prefix, padding, start, colName: col.name });
                              }}
                              disabled={showHistory} 
                            />
                          </th>
                        ))}
                        <th className="p-0 w-10 bg-zinc-100/90 dark:bg-zinc-900/80"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 border-b border-zinc-200 dark:border-zinc-800 relative z-30">
                      <SortableContext items={displayLocalItems.map(i => i.id)} strategy={verticalListSortingStrategy} disabled={showHistory || Boolean(tableSearch)}>
                        {displayLocalItems.map((item, idx) => (
                          <SortableRow 
                            key={item.id} 
                            index={idx + 1} 
                            item={item} 
                            columns={localColumns} 
                            columnWidths={columnWidths} 
                            rowHeight={rowHeight} 
                            members={members}
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
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl z-50 shrink-0"
              >
                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
                  <div>
                    <h3 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight uppercase">Record Inspector</h3>
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">VERSION: {inspectedItem.is_active ? 'CURRENT' : 'HISTORICAL'}</p>
                  </div>
                  <button onClick={() => setInspectedItem(null)} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer">
                    <X size={18} />
                  </button>
                </div>
                <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Metadata</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-1">
                        <span className="text-[8px] font-black text-zinc-400 uppercase">Valid From</span>
                        <p className="text-xs font-bold truncate text-zinc-800 dark:text-zinc-200">{new Date(inspectedItem.valid_from).toLocaleDateString()}</p>
                      </div>
                      <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-1">
                        <span className="text-[8px] font-black text-zinc-400 uppercase">Status</span>
                        <p className={cn("text-xs font-bold", inspectedItem.is_active ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400")}>
                          {inspectedItem.is_active ? 'Active' : 'Retired'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Full Record Data</label>
                    <div className="space-y-2">
                      {localColumns.map(col => (
                        <div key={col.id} className="p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl flex items-center justify-between">
                          <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">{col.name}</span>
                          <span className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-tight">{renderCellContent(col, inspectedItem.data[col.id], inspectedItem.data)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {inspectedItem.is_active && (
                    <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                      <label className="text-[9px] font-black uppercase tracking-widest text-rose-500">Danger Zone</label>
                      <button 
                        onClick={() => { setConfirmRetireItemId(inspectedItem.id); setInspectedItem(null); }} 
                        className="w-full flex items-center justify-between p-4 bg-rose-500/10 hover:bg-rose-500 text-rose-500 dark:text-rose-400 hover:text-white rounded-xl border border-rose-500/20 transition-all group cursor-pointer"
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
          {confirmDeleteListId && <ConfirmationModal title="Delete List?" message="Irreversible action." confirmLabel="Delete" onConfirm={() => { deleteList(confirmDeleteListId); setConfirmDeleteListId(null); setSelectedListId(null); setDraftList(null); }} onCancel={() => setConfirmDeleteListId(null)} />}
          {confirmDeleteColumnId && <ConfirmationModal title="Delete Column?" message="Column will be removed upon saving." confirmLabel="Delete" onConfirm={() => handleDeleteColumn()} onCancel={() => setConfirmDeleteColumnId(null)} />}
          {confirmRetireItemId && <ConfirmationModal title="Remove Record?" message="Record will be removed upon saving." confirmLabel="Remove" onConfirm={() => handleRetireItem()} onCancel={() => setConfirmRetireItemId(null)} />}
          {confirmRegenerateUUIDCol && (
            <ConfirmationModal
              title={`Regenerate UUIDs for "${confirmRegenerateUUIDCol.colName}"?`}
              message="This will overwrite existing UUIDs for ALL records across this list with new unique identifiers."
              confirmLabel="Overwrite & Regenerate"
              onConfirm={() => {
                handleRegenerateAllUUIDs(confirmRegenerateUUIDCol.colId, confirmRegenerateUUIDCol.prefix);
                setConfirmRegenerateUUIDCol(null);
              }}
              onCancel={() => setConfirmRegenerateUUIDCol(null)}
            />
          )}
          {confirmRenumberCol && (
            <ConfirmationModal
              title={`Renumber Records for "${confirmRenumberCol.colName}"?`}
              message="This will recalculate and overwrite the sequence codes for ALL records in this list based on the configured prefix and start number."
              confirmLabel="Renumber All"
              onConfirm={() => {
                handleRenumberAutoNumber(confirmRenumberCol.colId, confirmRenumberCol.prefix, confirmRenumberCol.padding, confirmRenumberCol.start);
                setConfirmRenumberCol(null);
              }}
              onCancel={() => setConfirmRenumberCol(null)}
            />
          )}
          {showUnsavedConfirm && (
            <UnsavedChangesModal
              isSaving={isSaving}
              onSaveAndExit={async () => {
                await handleSaveList();
                setShowUnsavedConfirm(false);
                setSelectedListId(null);
                setDraftList(null);
                setIsDirty(false);
              }}
              onDiscardAndExit={() => {
                setShowUnsavedConfirm(false);
                setSelectedListId(null);
                setDraftList(null);
                setLocalItems([]);
                setLocalColumns([]);
                setIsDirty(false);
              }}
              onCancel={() => setShowUnsavedConfirm(false)}
            />
          )}
        </AnimatePresence>

        {calculatorModalCol && (
          <CalculatorModal
            isOpen={Boolean(calculatorModalCol)}
            onClose={() => setCalculatorModalCol(null)}
            availableFields={availableFieldsForCalculator}
            targetLabel={calculatorModalCol.name}
            initialLogic={calculatorModalCol.calculation_formula || ''}
            initialTriggers={calculatorModalCol.calculation_triggers || []}
            showAsCurrency={calculatorModalCol.calculation_show_as_currency}
            currencySymbol={calculatorModalCol.calculation_currency_symbol}
            onSave={(logic, triggers, showAsCurrency, currencySymbol) => {
              handleColumnUpdate(calculatorModalCol.id, {
                type: 'calculation',
                calculation_formula: logic,
                calculation_triggers: triggers,
                calculation_show_as_currency: showAsCurrency,
                calculation_currency_symbol: currencySymbol
              });
              setCalculatorModalCol(null);
              toast.success(`Calculation saved for "${calculatorModalCol.name}"`);
            }}
          />
        )}

        <ListBulkImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          existingList={importModalTargetList}
          onSuccess={handleImportSuccess}
        />
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
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setImportModalTargetList(null);
                setIsImportModalOpen(true);
              }}
              variant="secondary"
              className="flex items-center gap-2 font-semibold text-xs px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 transition-all cursor-pointer bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <FileSpreadsheet size={15} className="text-indigo-500" />
              <span>Import CSV / Spreadsheet</span>
            </Button>
            <Button
              onClick={() => setIsCreatingList(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>Create</span>
            </Button>
          </div>
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
                onClick={() => handleOpenList(list)}
                className="group p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-3xl transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between h-full relative overflow-hidden min-h-[220px]"
              >
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 group-hover:text-indigo-500 group-hover:border-indigo-500/30 transition-colors duration-200">
                        <ListTodo size={22} />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border bg-indigo-500/10 text-indigo-500 border-indigo-500/20">
                          {list.columns?.length || 1} Columns
                        </span>

                        <button
                          onClick={(e) => handleDeleteClick(e, list)}
                          className="p-2 rounded-xl bg-zinc-100 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 dark:bg-zinc-800 dark:hover:bg-red-500/20 transition-colors duration-150 opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
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

                  <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
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
          {isCreatingList && (
            <CreateListModal 
              onClose={() => setIsCreatingList(false)} 
              onSubmit={handleCreateList} 
              data={newListData} 
              setData={setNewListData} 
              onOpenBulkImport={() => {
                setIsCreatingList(false);
                setImportModalTargetList(null);
                setIsImportModalOpen(true);
              }}
            />
          )}
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

        <ListBulkImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          existingList={importModalTargetList}
          onSuccess={handleImportSuccess}
        />
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

const ColumnHeader = ({ 
  column, 
  isMenuOpen, 
  onToggleMenu, 
  onUpdate, 
  onDelete, 
  onResize, 
  onInsertLeft, 
  onInsertRight, 
  onOpenCalculator, 
  onBackfillUUID, 
  onRegenerateAllUUID,
  onBackfillAutoNumber,
  onRenumberAutoNumber, 
  disabled 
}: any) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [localName, setLocalName] = useState(column.name);
  const [newOption, setNewOption] = useState('');
  const [newStatusLabel, setNewStatusLabel] = useState('');
  const [newStatusColor, setNewStatusColor] = useState<any>('emerald');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  
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

  const handleAddOption = () => {
    if (!newOption.trim()) return;
    onUpdate({ options: [...(column.options || []), newOption.trim()] });
    setNewOption('');
  };

  const handleRemoveOption = (opt: string) => {
    onUpdate({ options: (column.options || []).filter((o: string) => o !== opt) });
  };

  const handleAddStatusOption = () => {
    if (!newStatusLabel.trim()) return;
    const newStatus: StatusPillOption = {
      id: `st_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      label: newStatusLabel.trim(),
      color: newStatusColor || 'emerald'
    };
    onUpdate({ status_options: [...(column.status_options || []), newStatus] });
    setNewStatusLabel('');
  };

  const handleRemoveStatusOption = (optId: string) => {
    onUpdate({ status_options: (column.status_options || []).filter((o: StatusPillOption) => o.id !== optId) });
  };

  const CurrentIcon = COLUMN_TYPES.find(t => t.id === column.type)?.icon || Type;
  const categories = ['All', 'Basic', 'Choices', 'Identifiers', 'Financial', 'Contact', 'Advanced'];
  const filteredTypes = activeCategory === 'All' 
    ? COLUMN_TYPES 
    : COLUMN_TYPES.filter(t => t.category === activeCategory);

  return (
    <div className="flex flex-col h-full w-full relative z-50" ref={containerRef}>
      <div className="flex items-center gap-2 px-3 py-1.5 h-full group/th">
        <button 
          onClick={() => !disabled && onToggleMenu(!isMenuOpen)} 
          className={cn(
            "p-1 rounded-md border shrink-0 transition-all cursor-pointer",
            column.type === 'calculation'
              ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500/20"
              : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-indigo-500 border-zinc-200 dark:border-zinc-700"
          )}
          title={`Change column type (${column.type})`}
        >
          <CurrentIcon size={12} />
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
              className="w-full bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold text-xs outline-none py-0.5 px-1.5 rounded border border-zinc-300 dark:border-zinc-600 focus:border-zinc-500 shadow-xs" 
            />
          ) : (
            <div 
              onClick={() => !disabled && setIsEditingName(true)} 
              className="flex items-center gap-1 cursor-text truncate group/name"
              title="Click to rename field"
            >
              <span className="truncate text-xs font-bold tracking-normal transition-colors text-zinc-900 dark:text-zinc-100 group-hover/th:text-indigo-600 dark:group-hover/th:text-indigo-400">
                {column.name}
              </span>
              {column.required && <span className="text-red-500 dark:text-red-400 text-xs font-bold">*</span>}
              {column.type === 'calculation' && (
                <span className="text-[9px] font-mono font-bold text-indigo-500 bg-indigo-500/10 px-1 py-0.2 rounded border border-indigo-500/20">
                  fx
                </span>
              )}
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
          <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute left-0 top-full mt-2 w-80 max-h-[85vh] overflow-y-auto custom-scrollbar bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 z-[100] p-4 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-semibold text-zinc-400">Field Settings</span>
              <button onClick={() => { onToggleMenu(false); onDelete(); }} className="text-zinc-400 hover:text-rose-400 transition-colors p-1 cursor-pointer">
                <Trash2 size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { onInsertLeft(); onToggleMenu(false); }} className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-indigo-600 text-zinc-300 hover:text-white rounded-lg text-xs font-medium transition-all cursor-pointer">
                <Plus size={12} /> Insert Left
              </button>
              <button onClick={() => { onInsertRight(); onToggleMenu(false); }} className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-indigo-600 text-zinc-300 hover:text-white rounded-lg text-xs font-medium transition-all cursor-pointer">
                <Plus size={12} /> Insert Right
              </button>
            </div>
            <button onClick={() => onUpdate({ required: !column.required })} className={cn("w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer", column.required ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "text-zinc-300 hover:bg-zinc-800 border border-transparent")}>
              <span>Mandatory Field</span>
              <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center transition-all", column.required ? "bg-rose-500 border-rose-500 text-white" : "border-zinc-600")}>
                {column.required && <Check size={10} strokeWidth={3} />}
              </div>
            </button>

            {/* Data Type Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-zinc-400 px-1">Data Type</span>
                <span className="text-[10px] font-bold text-indigo-400 capitalize">{column.type.replace('_', ' ')}</span>
              </div>
              
              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap transition-all cursor-pointer",
                      activeCategory === cat
                        ? "bg-indigo-600 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-0.5">
                {filteredTypes.map((type) => (
                  <button 
                    key={type.id} 
                    onClick={() => { 
                      if (type.id === 'calculation') {
                        onUpdate({ type: 'calculation' });
                        onToggleMenu(false);
                        if (!column.calculation_formula) onOpenCalculator?.();
                      } else if (type.id === 'uuid') {
                        onUpdate({ type: 'uuid', uuid_prefix: column.uuid_prefix || '' });
                      } else if (type.id === 'autonumber') {
                        onUpdate({ 
                          type: 'autonumber', 
                          autonumber_prefix: column.autonumber_prefix ?? 'REC-', 
                          autonumber_padding: column.autonumber_padding ?? 4, 
                          autonumber_start: column.autonumber_start ?? 1 
                        });
                      } else if (type.id === 'currency') {
                        onUpdate({ type: 'currency', currency_symbol: column.currency_symbol || '$' });
                      } else if (type.id === 'status_pill') {
                        onUpdate({ 
                          type: 'status_pill', 
                          status_options: column.status_options || [
                            { id: 'st_1', label: 'Active', color: 'emerald' },
                            { id: 'st_2', label: 'Pending', color: 'amber' },
                            { id: 'st_3', label: 'Archived', color: 'zinc' }
                          ] 
                        });
                      } else {
                        onUpdate({ type: type.id }); 
                      }
                    }} 
                    className={cn(
                      "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer text-left truncate", 
                      column.type === type.id 
                        ? "bg-indigo-600 text-white shadow-md font-semibold" 
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    )}
                  >
                    <type.icon size={12} className="shrink-0" /> 
                    <span className="truncate">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Type Specific Configuration Panels */}
            {column.type === 'calculation' && (
              <div className="pt-3 border-t border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-zinc-400 px-1">Calculation Logic</span>
                  {column.calculation_formula ? (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                      Configured
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                      No Formula
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    onToggleMenu(false);
                    onOpenCalculator?.();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer"
                >
                  <Calculator size={13} />
                  <span>{column.calculation_formula ? 'Edit Calculation' : 'Configure Formula'}</span>
                </button>
                {column.calculation_formula && (
                  <div className="p-2 bg-zinc-950/80 rounded-lg border border-zinc-800 text-[10px] font-mono text-zinc-400 truncate select-all" title={column.calculation_formula}>
                    {column.calculation_formula}
                  </div>
                )}
              </div>
            )}

            {column.type === 'uuid' && (
              <div className="pt-3 border-t border-zinc-800 space-y-2.5">
                <span className="text-[11px] font-medium text-zinc-400 px-1">UUID Generator Prefix</span>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="e.g. REC-, USR_" 
                    value={column.uuid_prefix || ''} 
                    onChange={(e) => onUpdate({ uuid_prefix: e.target.value })} 
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500 transition-all font-mono" 
                  />
                </div>
                <div className="flex flex-col gap-1.5 pt-1">
                  <button
                    onClick={() => {
                      onBackfillUUID?.();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-medium transition-all cursor-pointer"
                  >
                    <KeyRound size={12} className="text-indigo-400" />
                    <span>Fill Empty Records Only</span>
                  </button>
                  <button
                    onClick={() => {
                      onRegenerateAllUUID?.();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 rounded-lg text-xs font-medium transition-all cursor-pointer"
                  >
                    <RefreshCw size={12} className="text-rose-400" />
                    <span>Overwrite & Regenerate All</span>
                  </button>
                </div>
              </div>
            )}

            {column.type === 'autonumber' && (
              <div className="pt-3 border-t border-zinc-800 space-y-2.5">
                <span className="text-[11px] font-medium text-zinc-400 px-1">Auto-Sequence Configuration</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[9px] text-zinc-500 font-semibold uppercase">Prefix</span>
                    <input 
                      type="text" 
                      placeholder="REC-" 
                      value={column.autonumber_prefix ?? 'REC-'} 
                      onChange={(e) => onUpdate({ autonumber_prefix: e.target.value })} 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-white font-mono mt-1" 
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 font-semibold uppercase">Digits</span>
                    <input 
                      type="number" 
                      min="1" 
                      max="10" 
                      value={column.autonumber_padding ?? 4} 
                      onChange={(e) => onUpdate({ autonumber_padding: parseInt(e.target.value) || 4 })} 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-white font-mono mt-1" 
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 font-semibold uppercase">Start</span>
                    <input 
                      type="number" 
                      min="1" 
                      value={column.autonumber_start ?? 1} 
                      onChange={(e) => onUpdate({ autonumber_start: parseInt(e.target.value) || 1 })} 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-white font-mono mt-1" 
                    />
                  </div>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">
                  Preview: {formatAutoNumber(0, column.autonumber_prefix ?? 'REC-', column.autonumber_padding ?? 4, column.autonumber_start ?? 1)}
                </div>
                <div className="flex flex-col gap-1.5 pt-1">
                  <button
                    onClick={() => {
                      onBackfillAutoNumber?.(column.autonumber_prefix ?? 'REC-', column.autonumber_padding ?? 4, column.autonumber_start ?? 1);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-medium transition-all cursor-pointer"
                  >
                    <ListOrdered size={12} className="text-indigo-400" />
                    <span>Assign to Empty Records Only</span>
                  </button>
                  <button
                    onClick={() => {
                      onRenumberAutoNumber?.(column.autonumber_prefix ?? 'REC-', column.autonumber_padding ?? 4, column.autonumber_start ?? 1);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-medium transition-all cursor-pointer"
                  >
                    <RefreshCw size={12} className="text-indigo-400" />
                    <span>Renumber & Overwrite All Rows</span>
                  </button>
                </div>
              </div>
            )}

            {column.type === 'currency' && (
              <div className="pt-3 border-t border-zinc-800 space-y-2.5">
                <span className="text-[11px] font-medium text-zinc-400 px-1">Currency Symbol</span>
                <div className="flex gap-1.5 flex-wrap">
                  {['$', '€', '£', '¥', 'A$', 'C$', 'CHF', 'kr', 'R$'].map((sym) => (
                    <button
                      key={sym}
                      onClick={() => onUpdate({ currency_symbol: sym })}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-bold font-mono transition-all cursor-pointer",
                        (column.currency_symbol || '$') === sym
                          ? "bg-indigo-600 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                      )}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
                <input 
                  type="text" 
                  placeholder="Custom symbol..." 
                  value={column.currency_symbol || '$'} 
                  onChange={(e) => onUpdate({ currency_symbol: e.target.value })} 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono mt-1" 
                />
              </div>
            )}

            {column.type === 'status_pill' && (
              <div className="pt-3 border-t border-zinc-800 space-y-2.5">
                <span className="text-[11px] font-medium text-zinc-400 px-1">Status Pills Configuration</span>
                <div className="space-y-2">
                  <div className="flex gap-1.5">
                    <input 
                      type="text" 
                      placeholder="Status label..." 
                      value={newStatusLabel} 
                      onChange={(e) => setNewStatusLabel(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleAddStatusOption()} 
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500" 
                    />
                    <button 
                      onClick={handleAddStatusOption} 
                      className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all cursor-pointer"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  {/* Color Preset Palette */}
                  <div className="flex items-center gap-1.5 px-1 py-0.5">
                    {(['emerald', 'amber', 'rose', 'blue', 'indigo', 'purple', 'zinc', 'cyan'] as const).map((col) => (
                      <button
                        key={col}
                        onClick={() => setNewStatusColor(col)}
                        className={cn(
                          "w-5 h-5 rounded-full border-2 transition-transform cursor-pointer",
                          STATUS_COLOR_MAP[col]?.dot || 'bg-zinc-500',
                          newStatusColor === col ? "scale-110 border-white ring-1 ring-indigo-500" : "border-transparent opacity-70 hover:opacity-100"
                        )}
                        title={col}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto custom-scrollbar pt-1">
                  {(column.status_options || []).map((opt: StatusPillOption) => {
                    const colorStyle = STATUS_COLOR_MAP[opt.color] || STATUS_COLOR_MAP.zinc;
                    return (
                      <div key={opt.id} className="flex items-center justify-between px-2.5 py-1.5 bg-zinc-950 rounded-lg border border-zinc-800">
                        <div className="flex items-center gap-2">
                          <span className={cn("w-2 h-2 rounded-full", colorStyle.dot)} />
                          <span className="text-xs font-semibold text-zinc-200">{opt.label}</span>
                        </div>
                        <button onClick={() => handleRemoveStatusOption(opt.id)} className="text-zinc-500 hover:text-rose-400 p-0.5 cursor-pointer">
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(column.type === 'choice' || column.type === 'multi_choice') && (
              <div className="pt-3 border-t border-zinc-800 space-y-2.5">
                <span className="text-[11px] font-medium text-zinc-400 px-1">
                  {column.type === 'multi_choice' ? 'Tag Options' : 'Selection Options'}
                </span>
                <div className="flex gap-2">
                  <input type="text" placeholder="Add option..." value={newOption} onChange={(e) => setNewOption(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddOption()} className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500 transition-all" />
                  <button onClick={handleAddOption} className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all cursor-pointer">
                    <Plus size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                  {(column.options || []).map((opt: string) => (
                    <div key={opt} className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800 text-zinc-300 rounded-md text-xs font-medium border border-zinc-700">
                      <span>{opt}</span>
                      <button onClick={() => handleRemoveOption(opt)} className="text-zinc-500 hover:text-rose-400 cursor-pointer">
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

const SortableRow = ({ item, index, columns, columnWidths, rowHeight, members, onInspect, isInspected, onCellChange, showHistory, activeEditingColId, setActiveEditingColId, onTab, isMenuOpen, onToggleMenu, onInsertAbove, onInsertBelow, onRetire, onContextMenu }: any) => {
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
    <tr ref={setNodeRef} style={style} className={cn("group transition-colors relative border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40", isInspected && "bg-indigo-500/10", !item.is_active && "opacity-60")}>
      <td className="p-0 w-10 text-center border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/30" style={{ height: rowHeight }}>
        {!showHistory && item.is_active ? (
          <button {...attributes} {...listeners} className="w-full h-full flex flex-col items-center justify-center cursor-grab active:cursor-grabbing group/handle">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 group-hover/handle:hidden">{index}</span>
            <GripVertical size={13} className="text-indigo-400 hidden group-hover/handle:block" />
          </button>
        ) : (
          <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">{index}</div>
        )}
      </td>
      {columns.map((col: any, colIdx: number) => (
        <td key={col.id} className="p-0 relative border-r border-zinc-200 dark:border-zinc-800 context-menu-trigger" style={{ width: columnWidths[col.id] || 160 }} onContextMenu={(e) => onContextMenu(e, col.id, colIdx)}>
          <CellEditor 
            column={col} 
            value={item.data?.[col.id]} 
            itemData={item.data} 
            allColumns={columns} 
            members={members}
            onChange={(val: any) => onCellChange?.(col.id, val)} 
            disabled={showHistory || !item.is_active} 
            isEditing={activeEditingColId === col.id} 
            setIsEditing={(editing: boolean) => setActiveEditingColId(editing ? col.id : null)} 
            onTab={onTab} 
          />
        </td>
      ))}
      <td className="p-0 w-10 text-center bg-zinc-50/50 dark:bg-zinc-900/50 relative row-menu-container">
        <button onClick={() => onToggleMenu(!isMenuOpen)} className={cn("p-1 rounded-lg transition-all cursor-pointer", isInspected || isMenuOpen ? "bg-indigo-600 text-white shadow-xs shadow-indigo-500/20" : "text-zinc-400 hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800")}>
          <MoreVertical size={13} />
        </button>
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div initial={{ opacity: 0, x: 10, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 10, scale: 0.95 }} className="absolute right-full top-0 mr-2 w-48 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-[100] overflow-hidden p-1.5 flex flex-col">
              <button onClick={() => { onInspect(); onToggleMenu(false); }} className="flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-medium transition-all cursor-pointer">
                <Info size={14} className="text-indigo-400" /> Inspect Version
              </button>
              <div className="h-px bg-zinc-800 my-1 mx-2" />
              <button onClick={() => { onInsertAbove(); onToggleMenu(false); }} className="flex items-center gap-2.5 px-3 py-2 hover:bg-indigo-600 text-zinc-300 hover:text-white rounded-xl text-xs font-medium transition-all cursor-pointer">
                <ArrowUp size={14} className="text-zinc-400 group-hover:text-white" /> Insert Above
              </button>
              <button onClick={() => { onInsertBelow(); onToggleMenu(false); }} className="flex items-center gap-2.5 px-3 py-2 hover:bg-indigo-600 text-zinc-300 hover:text-white rounded-xl text-xs font-medium transition-all cursor-pointer">
                <ArrowDown size={14} className="text-zinc-400 group-hover:text-white" /> Insert Below
              </button>
              <div className="h-px bg-zinc-800 my-1 mx-2" />
              <button onClick={() => { onRetire(); onToggleMenu(false); }} className="flex items-center gap-2.5 px-3 py-2 hover:bg-rose-600 text-rose-400 hover:text-white rounded-xl text-xs font-medium transition-all cursor-pointer">
                <Archive size={14} /> Retire Version
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </td>
    </tr>
  );
};

const CellEditor = ({ column, value, itemData, allColumns, members = [], onChange, disabled, isEditing, setIsEditing, onTab }: any) => {
  const [localValue, setLocalValue] = useState<any>(value);
  const [copiedUUID, setCopiedUUID] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const isInvalid = column.required && (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0));
  const lastCommittedValue = useRef<any>(value);

  useEffect(() => { 
    if (!isEditing) { 
      setLocalValue(value); 
      lastCommittedValue.current = value; 
    } 
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing && (column.type === 'choice' || column.type === 'multi_choice' || column.type === 'status_pill' || column.type === 'user' || column.type === 'date')) {
      const handleClickOutside = (e: MouseEvent) => { 
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          handleCommit(localValue);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isEditing, localValue, column.type]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (column.type === 'number' || column.type === 'currency' || column.type === 'percentage') { 
      val = val.replace(/[^0-9.-]/g, ''); 
      const parts = val.split('.'); 
      if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join(''); 
      if (val.indexOf('-') > 0) val = val.replace(/-/g, ''); 
    }
    setLocalValue(val);
  };

  const handleCommit = (val: any) => {
    if (val === lastCommittedValue.current) { 
      setIsEditing(false); 
      return; 
    }
    let committedValue = val;
    if (column.type === 'number' || column.type === 'currency' || column.type === 'percentage') { 
      if (val === '' || val === null || val === undefined) { 
        committedValue = null; 
      } else { 
        const parsed = parseFloat(val); 
        committedValue = isNaN(parsed) ? null : parsed; 
      } 
    }
    lastCommittedValue.current = committedValue;
    setLocalValue(committedValue);
    onChange(committedValue);
    setIsEditing(false);
  };

  const handleToggle = () => { 
    if (disabled) return; 
    const nextVal = !value; 
    setLocalValue(nextVal); 
    lastCommittedValue.current = nextVal; 
    onChange(nextVal); 
  };

  const handleCopyUUID = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!value) return;
    navigator.clipboard.writeText(String(value));
    setCopiedUUID(true);
    toast.success('UUID copied to clipboard');
    setTimeout(() => setCopiedUUID(false), 2000);
  };

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

  // 1. Calculated Column
  if (column.type === 'calculation') {
    const calculatedValue = evaluateListFormula(column.calculation_formula, itemData || {}, allColumns || []);
    let displayStr = '-';
    if (calculatedValue !== null && calculatedValue !== undefined && calculatedValue !== '') {
      if (column.calculation_show_as_currency) {
        const num = Number(calculatedValue);
        const sym = column.calculation_currency_symbol || '$';
        displayStr = isNaN(num) ? `${sym}${calculatedValue}` : `${sym}${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      } else {
        displayStr = typeof calculatedValue === 'number' ? calculatedValue.toLocaleString() : String(calculatedValue);
      }
    }

    return (
      <div 
        className="px-3 py-1.5 text-xs font-medium w-full h-full min-h-[36px] flex items-center justify-between group/cell relative z-10 bg-indigo-500/[0.03] text-zinc-800 dark:text-zinc-200 select-none cursor-default"
        title={column.calculation_formula ? `Formula: ${column.calculation_formula}` : 'No calculation formula set'}
      >
        <span className="truncate font-semibold text-zinc-900 dark:text-zinc-100">{displayStr}</span>
        <span className="text-[9px] font-bold font-mono px-1 py-0.5 rounded bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 shrink-0 ml-1">
          fx
        </span>
      </div>
    );
  }

  // 2. UUID / GUID Column
  if (column.type === 'uuid') {
    return (
      <div 
        ref={containerRef}
        className="px-2.5 py-1.5 w-full h-full min-h-[36px] flex items-center justify-between group/uuid relative z-10 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40 select-none"
        title={value ? `Full UUID: ${value}` : 'No UUID'}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <KeyRound size={11} className="text-zinc-500 dark:text-zinc-400 shrink-0" />
          {isEditing && !disabled ? (
            <input
              autoFocus
              type="text"
              value={localValue ?? ''}
              onChange={handleInputChange}
              onBlur={() => handleCommit(localValue)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-xs font-mono font-medium text-zinc-900 dark:text-zinc-100 outline-none"
            />
          ) : (
            <span 
              onClick={() => !disabled && setIsEditing(true)} 
              className="font-mono text-xs text-zinc-900 dark:text-zinc-100 font-medium truncate cursor-text"
            >
              {value ? String(value) : <span className="text-zinc-400 dark:text-zinc-500 italic">None</span>}
            </span>
          )}
        </div>
        {!isEditing && (
          <div className="flex items-center gap-1 opacity-0 group-hover/uuid:opacity-100 transition-opacity shrink-0 ml-1">
            {!disabled && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newUuid = generateUUID(column.uuid_prefix);
                  onChange(newUuid);
                  toast.success('Generated new UUID for record');
                }}
                className="p-1 rounded bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 transition-colors cursor-pointer"
                title="Regenerate & overwrite UUID"
              >
                <RefreshCw size={11} />
              </button>
            )}
            {value && (
              <button
                onClick={handleCopyUUID}
                className="p-1 rounded bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 transition-colors cursor-pointer"
                title="Copy to clipboard"
              >
                {copiedUUID ? <Check size={11} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={11} />}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // 3. Auto-Sequence Column
  if (column.type === 'autonumber') {
    return (
      <div 
        ref={containerRef}
        className="px-3 py-1.5 w-full h-full min-h-[36px] flex items-center justify-between group/autonumber relative z-10 select-none bg-zinc-500/[0.02] hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40"
        title={`Auto-Sequence ID: ${value || 'Unassigned'}`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <ListOrdered size={11} className="text-zinc-500 dark:text-zinc-400 shrink-0" />
          {isEditing && !disabled ? (
            <input
              autoFocus
              type="text"
              value={localValue ?? ''}
              onChange={handleInputChange}
              onBlur={() => handleCommit(localValue)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 outline-none"
            />
          ) : (
            <span 
              onClick={() => !disabled && setIsEditing(true)} 
              className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate cursor-text"
            >
              {value || '-'}
            </span>
          )}
        </div>
      </div>
    );
  }

  // 4. Boolean Toggle
  if (column.type === 'boolean') {
    return (
      <div className="w-full h-full flex items-center justify-center p-1">
         <button onClick={handleToggle} disabled={disabled} className={cn("w-8 h-4 rounded-full relative transition-all border cursor-pointer", value ? "bg-indigo-600 border-indigo-500" : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700", disabled && "opacity-50 cursor-not-allowed")}>
            <motion.div animate={{ x: value ? 16 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className={cn("absolute left-0.5 top-0.5 w-2.5 h-2.5 rounded-full shadow-xs", value ? "bg-white" : "bg-zinc-400 dark:bg-zinc-500")} />
         </button>
      </div>
    );
  }

  // 5. Contact fields (Email, Phone, URL action triggers when not editing)
  const isLinkField = column.type === 'email' || column.type === 'phone' || column.type === 'url';

  return (
    <div ref={containerRef} className="w-full h-full min-h-[36px] relative group/celleditor cursor-text" onClick={() => !disabled && !isEditing && setIsEditing(true)}>
       {!isEditing && (
         <div className={cn(
           "px-3 py-1.5 text-xs font-normal transition-colors w-full h-full min-h-[36px] flex items-center group/cell relative z-10", 
           disabled ? "cursor-default" : (column.type === 'choice' || column.type === 'multi_choice' || column.type === 'status_pill' || column.type === 'user' || column.type === 'date' ? "cursor-pointer" : "cursor-text"), 
           isInvalid ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/50"
         )}>
            <div className="flex-1 truncate relative z-10 flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100 font-normal">
              {/* Special non-editing display formats */}
              {column.type === 'status_pill' && value ? (
                (() => {
                  const opt = (column.status_options || []).find((o: StatusPillOption) => o.label === value || o.id === value);
                  const colorKey = opt?.color || 'zinc';
                  const style = STATUS_COLOR_MAP[colorKey] || STATUS_COLOR_MAP.zinc;
                  return (
                    <span className={cn("px-2 py-0.5 text-[11px] font-bold rounded-full border flex items-center gap-1.5", style.bg, style.text, style.border)}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", style.dot)} />
                      <span className="truncate">{opt?.label || value}</span>
                    </span>
                  );
                })()
              ) : column.type === 'multi_choice' && Array.isArray(value) && value.length > 0 ? (
                <div className="flex items-center gap-1 overflow-hidden">
                  {value.slice(0, 2).map((tag: string) => (
                    <span key={tag} className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 truncate">
                      {tag}
                    </span>
                  ))}
                  {value.length > 2 && (
                    <span className="px-1 py-0.5 text-[9px] font-bold rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 shrink-0">
                      +{value.length - 2}
                    </span>
                  )}
                </div>
              ) : column.type === 'user' && value ? (
                (() => {
                  const member = members.find((m: any) => m.id === value || m.email === value);
                  const name = member ? `${member.firstName || ''} ${member.familyName || ''}`.trim() || member.email : value;
                  return (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {member?.avatarUrl ? (
                          <img src={member.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          name.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <span className="truncate font-semibold text-xs text-zinc-900 dark:text-zinc-100">{name}</span>
                    </div>
                  );
                })()
              ) : (
                <span className="truncate text-zinc-900 dark:text-zinc-100 font-normal">{formatCellDisplay(column, value, itemData, members, allColumns)}</span>
              )}
            </div>

            {/* Quick Action Icons for Links / Contact */}
            {isLinkField && value && !disabled && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (column.type === 'email') window.open(`mailto:${value}`);
                  else if (column.type === 'phone') window.open(`tel:${value}`);
                  else if (column.type === 'url') window.open(String(value).startsWith('http') ? String(value) : `https://${value}`, '_blank');
                }}
                className="p-1 rounded text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 hover:bg-zinc-200 dark:hover:bg-zinc-700 opacity-0 group-hover/cell:opacity-100 transition-opacity shrink-0 cursor-pointer ml-1"
                title={column.type === 'email' ? 'Send email' : column.type === 'phone' ? 'Call number' : 'Open link in new tab'}
              >
                {column.type === 'email' ? <Mail size={11} /> : column.type === 'phone' ? <Phone size={11} /> : <ExternalLink size={11} />}
              </button>
            )}

            {isInvalid && <AlertTriangle size={13} className="text-rose-500 ml-1.5 animate-pulse relative z-10 shrink-0" />}
            {(column.type === 'choice' || column.type === 'multi_choice' || column.type === 'status_pill' || column.type === 'user' || column.type === 'date') && !disabled && (
              <div className="text-zinc-500 dark:text-zinc-400 opacity-0 group-hover/cell:opacity-100 ml-1.5 shrink-0 transition-opacity relative z-10">
                {column.type === 'date' ? <Calendar size={11} /> : column.type === 'user' ? <User size={11} /> : <ChevronDown size={11} />}
              </div>
            )}
         </div>
       )}

       {isEditing && !disabled && (
          <div className={cn("absolute inset-0 z-[100] flex flex-col bg-white dark:bg-zinc-900 border-2 border-zinc-500 dark:border-zinc-400 shadow-xs rounded-none", column.type === 'date' && "bg-white dark:bg-zinc-900")}>
             <div className="flex-1 flex items-center px-3 relative h-full">
                {/* 1. Single Choice */}
                {column.type === 'choice' ? (
                  <div tabIndex={0} autoFocus onKeyDown={handleKeyDown} className="flex items-center justify-between w-full h-full cursor-pointer outline-none">
                    <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate pr-4">{localValue ?? 'Select...'}</span>
                    <ChevronDown size={12} className="text-zinc-400" />
                  </div>
                ) : 
                /* 2. Status Pill Picker */
                column.type === 'status_pill' ? (
                  <div tabIndex={0} autoFocus onKeyDown={handleKeyDown} className="flex items-center justify-between w-full h-full cursor-pointer outline-none">
                    <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate pr-4">{localValue ?? 'Select Status...'}</span>
                    <CircleDot size={12} className="text-zinc-400" />
                  </div>
                ) : 
                /* 3. Multi-Select Tags */
                column.type === 'multi_choice' ? (
                  <div tabIndex={0} autoFocus onKeyDown={handleKeyDown} className="flex items-center justify-between w-full h-full cursor-pointer outline-none">
                    <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate pr-4">
                      {Array.isArray(localValue) && localValue.length > 0 ? `${localValue.length} Selected` : 'Select Tags...'}
                    </span>
                    <Tag size={12} className="text-zinc-400" />
                  </div>
                ) : 
                /* 4. User Selector */
                column.type === 'user' ? (
                  <div tabIndex={0} autoFocus onKeyDown={handleKeyDown} className="flex items-center justify-between w-full h-full cursor-pointer outline-none">
                    <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate pr-4">
                      {localValue ? (() => {
                        const m = members.find((u: any) => u.id === localValue || u.email === localValue);
                        return m ? `${m.firstName || ''} ${m.familyName || ''}`.trim() || m.email : localValue;
                      })() : 'Select Member...'}
                    </span>
                    <User size={12} className="text-zinc-400" />
                  </div>
                ) : 
                /* 5. Date Popover */
                column.type === 'date' ? (
                  <div tabIndex={0} autoFocus onKeyDown={handleKeyDown} className="w-full h-full flex items-center outline-none">
                    <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-medium text-xs">
                      <Calendar size={12} className="text-zinc-400" />
                      <span>Editing Date...</span>
                    </div>
                    <div className="relative z-[101]"><DateTimePopover value={localValue} onChange={handleCommit} onCancel={() => setIsEditing(false)} /></div>
                  </div>
                ) : 
                /* 6. Numeric / Currency / Percentage / Text / Contact */
                (
                  <div className="flex items-center w-full h-full">
                    {column.type === 'currency' && (
                      <span className="text-xs font-bold text-zinc-400 mr-1 select-none">{column.currency_symbol || '$'}</span>
                    )}
                    <input 
                      autoFocus 
                      type={column.type === 'email' ? 'email' : column.type === 'phone' ? 'tel' : 'text'} 
                      inputMode={column.type === 'number' || column.type === 'currency' || column.type === 'percentage' ? 'decimal' : 'text'} 
                      value={localValue ?? ''} 
                      onChange={handleInputChange} 
                      onBlur={() => handleCommit(localValue)} 
                      onFocus={(e) => e.target.select()} 
                      onKeyDown={handleKeyDown} 
                      placeholder={column.type === 'percentage' ? 'e.g. 25' : column.type === 'email' ? 'name@domain.com' : ''}
                      className="w-full h-full bg-transparent text-xs font-normal text-zinc-900 dark:text-zinc-100 outline-none dark:[color-scheme:dark] relative z-20" 
                    />
                    {column.type === 'percentage' && (
                      <span className="text-xs font-bold text-zinc-400 ml-1 select-none">%</span>
                    )}
                  </div>
                )}
             </div>

             {/* Single Choice Dropdown */}
             {column.type === 'choice' && (
               <motion.div 
                 initial={{ opacity: 0, y: 4, scale: 0.98 }} 
                 animate={{ opacity: 1, y: 0, scale: 1 }} 
                 className="absolute left-0 top-full mt-1 w-full min-w-[150px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden py-1 z-[500]"
               >
                 <div className="max-h-64 overflow-y-auto custom-scrollbar bg-white dark:bg-zinc-900">
                   {(column.options || []).length === 0 ? (
                     <div className="px-4 py-3 text-[10px] font-bold uppercase text-zinc-400 italic">No options defined</div>
                   ) : (
                     (column.options || []).map((opt: string) => (
                       <button 
                         key={opt} 
                         onClick={() => handleCommit(opt)} 
                         className={cn(
                           "w-full text-left px-4 py-2.5 text-xs font-medium transition-all cursor-pointer", 
                           localValue === opt 
                             ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold" 
                             : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-200"
                         )}
                       >
                         {opt}
                       </button>
                     ))
                   )}
                 </div>
               </motion.div>
             )}

             {/* Status Pill Dropdown */}
             {column.type === 'status_pill' && (
               <motion.div 
                 initial={{ opacity: 0, y: 4, scale: 0.98 }} 
                 animate={{ opacity: 1, y: 0, scale: 1 }} 
                 className="absolute left-0 top-full mt-1 w-full min-w-[160px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden py-1 z-[500]"
               >
                 <div className="max-h-64 overflow-y-auto custom-scrollbar bg-white dark:bg-zinc-900">
                   {(column.status_options || []).length === 0 ? (
                     <div className="px-4 py-3 text-[10px] font-bold uppercase text-zinc-400 italic">No status pills defined</div>
                   ) : (
                     (column.status_options || []).map((opt: StatusPillOption) => {
                       const style = STATUS_COLOR_MAP[opt.color] || STATUS_COLOR_MAP.zinc;
                       const isSelected = localValue === opt.label || localValue === opt.id;
                       return (
                         <button 
                           key={opt.id} 
                           onClick={() => handleCommit(opt.label)} 
                           className={cn(
                             "w-full text-left px-3.5 py-2 text-xs font-medium transition-all cursor-pointer flex items-center justify-between", 
                             isSelected 
                               ? "bg-zinc-100 dark:bg-zinc-800 font-semibold" 
                               : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                           )}
                         >
                           <span className={cn("px-2 py-0.5 text-[11px] font-bold rounded-full border flex items-center gap-1.5", style.bg, style.text, style.border)}>
                             <span className={cn("w-1.5 h-1.5 rounded-full", style.dot)} />
                             <span>{opt.label}</span>
                           </span>
                           {isSelected && <Check size={12} className="text-zinc-500" />}
                         </button>
                       );
                     })
                   )}
                 </div>
               </motion.div>
             )}

             {/* Multi-Select Tags Dropdown */}
             {column.type === 'multi_choice' && (
               <motion.div 
                 initial={{ opacity: 0, y: 4, scale: 0.98 }} 
                 animate={{ opacity: 1, y: 0, scale: 1 }} 
                 className="absolute left-0 top-full mt-1 w-full min-w-[200px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden p-2 z-[500] space-y-2"
               >
                 <div className="relative">
                   <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" />
                   <input
                     type="text"
                     placeholder="Filter tags..."
                     value={tagSearch}
                     onChange={(e) => setTagSearch(e.target.value)}
                     className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg pl-6 pr-2 py-1 text-xs outline-none"
                   />
                 </div>
                 <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                   {((column.options || []) as string[])
                     .filter(opt => !tagSearch || opt.toLowerCase().includes(tagSearch.toLowerCase()))
                     .map((opt: string) => {
                       const currentArr = Array.isArray(localValue) ? localValue : [];
                       const isChecked = currentArr.includes(opt);
                       return (
                         <button 
                           key={opt} 
                           onClick={() => {
                             const next = isChecked ? currentArr.filter(o => o !== opt) : [...currentArr, opt];
                             setLocalValue(next);
                           }} 
                           className={cn(
                             "w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center justify-between",
                             isChecked ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 font-semibold" : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                           )}
                         >
                           <span className="truncate">{opt}</span>
                           <div className={cn("w-3.5 h-3.5 rounded border flex items-center justify-center", isChecked ? "bg-indigo-600 border-indigo-600 text-white" : "border-zinc-400")}>
                             {isChecked && <Check size={10} strokeWidth={3} />}
                           </div>
                         </button>
                       );
                     })}
                 </div>
                 <div className="pt-1 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
                   <button 
                     onClick={() => handleCommit(localValue)} 
                     className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                   >
                     Done
                   </button>
                 </div>
               </motion.div>
             )}

             {/* User / Member Picker Dropdown */}
             {column.type === 'user' && (
               <motion.div 
                 initial={{ opacity: 0, y: 4, scale: 0.98 }} 
                 animate={{ opacity: 1, y: 0, scale: 1 }} 
                 className="absolute left-0 top-full mt-1 w-full min-w-[220px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden p-2 z-[500] space-y-2"
               >
                 <div className="relative">
                   <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" />
                   <input
                     type="text"
                     placeholder="Search member..."
                     value={userSearch}
                     onChange={(e) => setUserSearch(e.target.value)}
                     className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg pl-6 pr-2 py-1 text-xs outline-none"
                   />
                 </div>
                 <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                   {members
                     .filter((m: any) => {
                       if (!userSearch) return true;
                       const q = userSearch.toLowerCase();
                       return (m.firstName && m.firstName.toLowerCase().includes(q)) || 
                              (m.familyName && m.familyName.toLowerCase().includes(q)) || 
                              (m.email && m.email.toLowerCase().includes(q));
                     })
                     .map((m: any) => {
                       const name = `${m.firstName || ''} ${m.familyName || ''}`.trim() || m.email;
                       const isSelected = localValue === m.id || localValue === m.email;
                       return (
                         <button 
                           key={m.id} 
                           onClick={() => handleCommit(m.id)} 
                           className={cn(
                             "w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center justify-between gap-2",
                             isSelected ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 font-semibold" : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                           )}
                         >
                           <div className="flex items-center gap-2 min-w-0">
                             <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                               {m.avatarUrl ? (
                                 <img src={m.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                               ) : (
                                 name.slice(0, 2).toUpperCase()
                               )}
                             </div>
                             <div className="truncate">
                               <div className="truncate text-xs font-medium">{name}</div>
                               <div className="text-[10px] text-zinc-400 truncate">{m.email}</div>
                             </div>
                           </div>
                           {isSelected && <Check size={12} className="text-indigo-600 shrink-0" />}
                         </button>
                       );
                     })}
                 </div>
               </motion.div>
             )}
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

export const formatCellDisplay = (column: ListColumn, value: any, rowData?: Record<string, any>, members: any[] = [], allColumns: ListColumn[] = []) => {
  if (column.type === 'calculation') {
    const calculatedValue = rowData ? evaluateListFormula(column.calculation_formula, rowData, allColumns) : value;
    if (calculatedValue === null || calculatedValue === undefined || calculatedValue === '') return '-';
    if (column.calculation_show_as_currency) {
      const num = Number(calculatedValue);
      const sym = column.calculation_currency_symbol || '$';
      return isNaN(num) ? `${sym}${calculatedValue}` : `${sym}${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return typeof calculatedValue === 'number' ? calculatedValue.toLocaleString() : String(calculatedValue);
  }
  if (column.type === 'currency') {
    if (value === null || value === undefined || value === '') return '-';
    const num = Number(value);
    const sym = column.currency_symbol || '$';
    return isNaN(num) ? `${sym}${value}` : `${sym}${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (column.type === 'percentage') {
    if (value === null || value === undefined || value === '') return '-';
    return `${value}%`;
  }
  if (column.type === 'uuid') {
    return value || '-';
  }
  if (column.type === 'autonumber') {
    return value || '-';
  }
  if (column.type === 'multi_choice') {
    if (!Array.isArray(value) || value.length === 0) return '-';
    return value.join(', ');
  }
  if (column.type === 'status_pill') {
    return value || '-';
  }
  if (column.type === 'user') {
    if (!value) return '-';
    const member = members.find((m: any) => m.id === value || m.email === value);
    return member ? `${member.firstName || ''} ${member.familyName || ''}`.trim() || member.email : String(value);
  }
  if (value === undefined || value === null || value === '') return '-';
  if (column.type === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
};

const ConfirmationModal = ({ title, message, confirmLabel, onConfirm, onCancel }: any) => {
  const modalNode = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }} className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-8 text-center space-y-6">
        <div className="w-14 h-14 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/20"><AlertTriangle size={26} /></div>
        <div className="space-y-2"><h3 className="text-lg font-bold text-white tracking-tight">{title}</h3><p className="text-xs text-zinc-400 leading-relaxed">{message}</p></div>
        <div className="flex gap-3"><button onClick={onCancel} className="flex-1 px-4 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold hover:bg-zinc-700 transition-all">Cancel</button><button onClick={onConfirm} className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-500 shadow-md shadow-rose-500/20 transition-all">{confirmLabel || 'Confirm'}</button></div>
      </motion.div>
    </div>
  );
  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : null;
};

const CreateListModal = ({ onClose, onSubmit, data, setData, onOpenBulkImport }: any) => {
  const modalNode = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-zinc-950/60" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }} className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-8 space-y-6">
        <div className="space-y-1.5">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">New List</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Define a new master lookup list and choice dataset.</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 px-0.5">List Name</label>
            <input required type="text" placeholder="e.g. Application Types" value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 transition-all text-xs font-medium text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 px-0.5">Description</label>
            <textarea placeholder="What is this list for?" value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 transition-all text-xs font-medium text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 min-h-[90px] resize-none" />
          </div>
        </div>

        {onOpenBulkImport && (
          <button
            type="button"
            onClick={onOpenBulkImport}
            className="w-full py-2.5 px-3 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet size={15} />
            <span>Or Bulk Upload from CSV / Spreadsheet</span>
          </button>
        )}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl font-semibold text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer">Cancel</button>
          <button onClick={onSubmit} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-xs shadow-md shadow-indigo-500/20 hover:bg-indigo-500 transition-all cursor-pointer">Create List</button>
        </div>
      </motion.div>
    </div>
  );
  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : null;
};

const UnsavedChangesModal = ({ onSaveAndExit, onDiscardAndExit, onCancel, isSaving }: any) => {
  const modalNode = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel} className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }} className="relative w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 text-center space-y-5 z-10">
        <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/20">
          <AlertTriangle size={24} />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">Unsaved Changes</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            You have unsaved changes in this list. What would you like to do before leaving?
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-1">
          <button
            onClick={onSaveAndExit}
            disabled={isSaving}
            className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 hover:bg-indigo-500 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save & Exit'}
          </button>
          <button
            onClick={onDiscardAndExit}
            className="w-full py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all cursor-pointer"
          >
            Discard Changes & Exit
          </button>
          <button
            onClick={onCancel}
            className="w-full py-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs font-medium transition-all cursor-pointer"
          >
            Keep Editing
          </button>
        </div>
      </motion.div>
    </div>
  );
  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : null;
};
