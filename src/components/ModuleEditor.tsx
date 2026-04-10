import React, { useState } from 'react';
import { 
  Plus, 
  Settings2, 
  Trash2, 
  GripVertical, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  Save, 
  Type, 
  Hash, 
  Calendar, 
  CheckSquare, 
  AlignLeft, 
  Box, 
  Layout as LayoutIcon, 
  Columns, 
  Maximize2, 
  Move,
  Info,
  Copy,
  Sparkles,
  DollarSign,
  Grid3X3,
  Mail,
  Phone,
  MapPin,
  Search,
  User,
  BrainCircuit,
  X,
  Minus,
  Clock,
  Palette,
  Link,
  UploadCloud,
  PenTool,
  Folder
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useParams, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { usePlatform } from '../hooks/usePlatform';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import { DATA_API_URL } from '../config';
import { ModuleType } from '../types/platform';

// --- Types ---

export type FieldType = 
  | 'text' 
  | 'longText'
  | 'number' 
  | 'checkbox'
  | 'currency'
  | 'email'
  | 'phone'
  | 'address'
  | 'lookup'
  | 'user'
  | 'calculation'
  | 'ai_summary'
  | 'date' 
  | 'select'
  | 'heading'
  | 'divider'
  | 'spacer'
  | 'alert'
  | 'url'
  | 'time'
  | 'color'
  | 'file'
  | 'signature'
  | 'fieldGroup'
  | 'repeatableGroup';

export interface VisibilityRule {
  fieldId: string;
  operator: 'equals' | 'not_equals';
  value: string;
}

export interface Field {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  // Specific settings
  currencySymbol?: string;
  options?: string[];
  calculationLogic?: string;
  targetModuleId?: string;
  // For nested fields (fieldGroup, repeatableGroup)
  fields?: Field[];
  visibilityRule?: VisibilityRule;
}

export interface Tab {
  id: string;
  label: string;
}

export interface Column {
  id: string;
  fields: Field[];
}

export interface Row {
  id: string;
  columnCount: number;
  columns: Column[];
  tabId?: string;
}

export type Layout = Row[];

// --- Constants ---

const FIELD_CATEGORIES = [
  {
    id: 'layout',
    label: 'Layout & Formatting',
    fields: [
      { id: 'heading', label: 'Heading', icon: Type },
      { id: 'divider', label: 'Divider', icon: Minus },
      { id: 'spacer', label: 'Spacer', icon: Maximize2 },
      { id: 'alert', label: 'Alert Box', icon: Info },
    ]
  },
  {
    id: 'common',
    label: 'Common',
    fields: [
      { id: 'text', label: 'Short Text', icon: Type },
      { id: 'longText', label: 'Long Text', icon: AlignLeft },
      { id: 'number', label: 'Number', icon: Hash },
      { id: 'checkbox', label: 'Checkbox', icon: CheckSquare },
      { id: 'select', label: 'Dropdown', icon: ChevronDown },
      { id: 'date', label: 'Date', icon: Calendar },
      { id: 'time', label: 'Time', icon: Clock },
      { id: 'color', label: 'Color Picker', icon: Palette },
    ]
  },
  {
    id: 'business',
    label: 'Business',
    fields: [
      { id: 'currency', label: 'Currency', icon: DollarSign },
      { id: 'email', label: 'Email', icon: Mail },
      { id: 'phone', label: 'Phone', icon: Phone },
      { id: 'address', label: 'Address', icon: MapPin },
      { id: 'url', label: 'Website URL', icon: Link },
    ]
  },
  {
    id: 'complex',
    label: 'Complex Data',
    fields: [
      { id: 'file', label: 'File Upload', icon: UploadCloud },
      { id: 'signature', label: 'Signature', icon: PenTool },
      { id: 'fieldGroup', label: 'Field Group', icon: Folder },
      { id: 'repeatableGroup', label: 'Repeatable List', icon: Copy },
    ]
  },
  {
    id: 'relational',
    label: 'Relational',
    fields: [
      { id: 'lookup', label: 'Lookup', icon: Search },
      { id: 'user', label: 'User Selector', icon: User },
    ]
  },
  {
    id: 'intelligence',
    label: 'Intelligence',
    fields: [
      { id: 'calculation', label: 'AI Formula', icon: Sparkles },
      { id: 'ai_summary', label: 'AI Summary', icon: BrainCircuit },
    ]
  }
];

const LAYOUT_TYPES = [
  { id: 1, label: '1 Column', icon: Box },
  { id: 2, label: '2 Columns', icon: Columns },
  { id: 3, label: '3 Columns', icon: Grid3X3 },
  { id: 4, label: '4 Columns', icon: Maximize2 },
];

// --- Components ---

export const ModuleEditor = () => {
  const { id: routeId } = useParams();
  const id = routeId || 'new';
  const navigate = useNavigate();
  const { tenant, refreshModules } = usePlatform();
  const { session } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [moduleSettings, setModuleSettings] = useState({
    name: 'New Custom Module',
    description: 'Created via Drag-and-Drop Builder',
    category: 'Custom',
    iconName: 'Box',
    type: 'RECORD' as ModuleType,
    status: 'ACTIVE' as const,
  });
  
  const [layout, setLayout] = useState<Layout>([
    {
      id: 'initial-row',
      columnCount: 1,
      columns: [{ id: 'initial-col', fields: [] }],
      tabId: 'default-tab'
    }
  ]);

  const [tabs, setTabs] = useState<Tab[]>([
    { id: 'default-tab', label: 'General' }
  ]);
  const [currentTabId, setCurrentTabId] = useState<string>('default-tab');
  const [isEditingTab, setIsEditingTab] = useState<string | null>(null);

  // Load layout - SIMULATED for migration
  React.useEffect(() => {
    if (!tenant?.id) return;
    
    if (id === 'new') {
      setIsLoading(false);
      return;
    }

    const fetchModule = async () => {
      try {
        console.log(`[ModuleEditor] Fetching module ${id} for tenant ${tenant.id}`);
        
        const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
        const response = await fetch(`${DATA_API_URL}/modules/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenant.id
          }
        });

        if (!response.ok) throw new Error('Failed to load module');
        
        const data = await response.json();
        
        // Populate state with data from backend
        setModuleSettings({
          name: data.name || 'Untitled Module',
          description: data.description || '',
          category: data.category || 'Custom',
          iconName: data.iconName || 'Box',
          type: data.type || 'RECORD',
          status: data.status || 'ACTIVE',
        });

        if (data.layout) setLayout(data.layout);
        if (data.tabs) setTabs(data.tabs);
        
      } catch (error) {
        console.error("Error loading module:", error);
        toast.error("Failed to load module layout.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchModule();
  }, [id, tenant?.id]);

  const handleSave = async () => {
    if (!tenant?.id) return;
    setIsSaving(true);
    try {
      console.log(`[ModuleEditor] Saving module ${id} for tenant ${tenant.id}`, {
        ...moduleSettings,
        layout,
        tabs
      });

      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const isNew = id === 'new';
      
      const payload = {
        ...moduleSettings,
        layout,
        tabs
      };

      const url = isNew 
        ? `${DATA_API_URL}/modules` 
        : `${DATA_API_URL}/modules/${id}`;
      
      const response = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to save module');
      }

      const savedModule = await response.json();
      
      await refreshModules();
      
      if (isNew) {
        toast.success('Module created successfully!');
        navigate(`/workspace/builder/${savedModule.id}`, { replace: true });
      } else {
        toast.success('Module saved successfully!');
      }
    } catch (error: any) {
      console.error("Save Error:", error);
      toast.error(error.message || 'Failed to save module layout.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const [activeTab, setActiveTab] = useState<'build' | 'preview' | 'logic' | 'settings'>('build');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const [insertionIndex, setInsertionIndex] = useState<number | null>(null);
  const [insertionFieldIndex, setInsertionFieldIndex] = useState<{ colId: string, index: number } | null>(null);
  const [moduleState, setModuleState] = useState<Record<string, any>>({});

  // --- Helpers ---

  const generateId = () => Math.random().toString(36).substring(2, 11);

  const createRow = (columnCount: number): Row => ({
    id: `row-${generateId()}`,
    columnCount,
    columns: Array.from({ length: columnCount }, (_, i) => ({
      id: `col-${generateId()}-${i}`,
      fields: [] as Field[]
    })),
    tabId: currentTabId
  });

  const createField = (type: FieldType): Field => ({
    id: `field-${generateId()}`,
    type,
    label: `New ${type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}`,
    placeholder: `Enter ${type.replace('_', ' ')}...`,
    helperText: '',
    required: false,
    currencySymbol: '$',
    options: ['Option 1', 'Option 2'],
    calculationLogic: '',
    targetModuleId: ''
  });

  // --- DnD Handlers ---

  const handleDragStart = (e: React.DragEvent, data: any) => {
    e.dataTransfer.setData('application/json', JSON.stringify(data));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleRowDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setInsertionIndex(index);
  };

  const handleColDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverColId(colId);
  };

  const handleDropOnCanvas = (e: React.DragEvent, filteredIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const filteredLayout = layout.filter(row => row.tabId === currentTabId || (!row.tabId && currentTabId === tabs[0]?.id));
      
      // Calculate real index in layout array
      let realInsertionIndex;
      if (filteredIndex >= filteredLayout.length) {
        // Drop at the end of the filtered layout
        if (filteredLayout.length === 0) {
          realInsertionIndex = layout.length;
        } else {
          const lastFilteredRow = filteredLayout[filteredLayout.length - 1];
          realInsertionIndex = layout.findIndex(r => r.id === lastFilteredRow.id) + 1;
        }
      } else {
        // Drop before a specific filtered row
        const targetRow = filteredLayout[filteredIndex];
        realInsertionIndex = layout.findIndex(r => r.id === targetRow.id);
      }

      if (data.type === 'layout') {
        const newRow = createRow(data.columnCount);
        newRow.tabId = currentTabId; // Assign to current tab
        const newLayout = [...layout];
        newLayout.splice(realInsertionIndex, 0, newRow);
        setLayout(newLayout);
      } else if (data.type === 'move_row') {
        const { rowId } = data;
        const sourceRealIndex = layout.findIndex(r => r.id === rowId);
        
        setLayout(prev => {
          const nextLayout = [...prev];
          const [movedRow] = nextLayout.splice(sourceRealIndex, 1);
          // Adjust target index if we're moving it further down
          const adjustedTargetIndex = realInsertionIndex > sourceRealIndex ? realInsertionIndex - 1 : realInsertionIndex;
          nextLayout.splice(adjustedTargetIndex, 0, movedRow);
          return nextLayout;
        });
      }
    } catch (err) {
      console.error('Drop error:', err);
    } finally {
      setInsertionIndex(null);
    }
  };

  const handleDropOnColumn = (e: React.DragEvent, rowId: string, colId: string, targetIndex?: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      
      if (data.type === 'field') {
        const newField = createField(data.fieldType);
        setLayout(prev => prev.map(row => {
          if (row.id !== rowId) return row;
          return {
            ...row,
            columns: row.columns.map(col => {
              if (col.id !== colId) return col;
              const nextFields = [...col.fields];
              if (typeof targetIndex === 'number') {
                nextFields.splice(targetIndex, 0, newField);
              } else {
                nextFields.push(newField);
              }
              return { ...col, fields: nextFields };
            })
          };
        }));
      } else if (data.type === 'move_field') {
        const { fieldId, sourceRowId, sourceColId } = data;
        
        setLayout(prev => {
          // 1. Find and remove the field from source
          let movedField: Field | null = null;
          const nextLayout = prev.map(row => {
            if (row.id !== sourceRowId) return row;
            return {
              ...row,
              columns: row.columns.map(col => {
                if (col.id !== sourceColId) return col;
                const fieldIndex = col.fields.findIndex(f => f.id === fieldId);
                if (fieldIndex > -1) {
                  movedField = col.fields[fieldIndex];
                  const nextFields = [...col.fields];
                  nextFields.splice(fieldIndex, 1);
                  return { ...col, fields: nextFields };
                }
                return col;
              })
            };
          });

          if (!movedField) return prev;

          // 2. Add the field to destination
          return nextLayout.map(row => {
            if (row.id !== rowId) return row;
            return {
              ...row,
              columns: row.columns.map(col => {
                if (col.id !== colId) return col;
                const nextFields = [...col.fields];
                if (typeof targetIndex === 'number') {
                  // Adjust index if we're moving within the same column
                  let adjustedIndex = targetIndex;
                  if (sourceColId === colId) {
                    const sourceIndex = col.fields.findIndex(f => f.id === fieldId);
                    if (sourceIndex > -1 && targetIndex > sourceIndex) {
                      adjustedIndex = targetIndex - 1;
                    }
                  }
                  nextFields.splice(adjustedIndex, 0, movedField!);
                } else {
                  nextFields.push(movedField!);
                }
                return { ...col, fields: nextFields };
              })
            };
          });
        });
      }
    } catch (err) {
      console.error('Drop error:', err);
    } finally {
      setDragOverColId(null);
      setInsertionFieldIndex(null);
    }
  };

  // --- Actions ---

  const deleteRow = (rowId: string) => {
    setLayout(prev => prev.filter(r => r.id !== rowId));
  };

  const moveRow = (rowId: string, direction: 'up' | 'down') => {
    const filteredLayout = layout.filter(row => row.tabId === currentTabId || (!row.tabId && currentTabId === tabs[0]?.id));
    const filteredIndex = filteredLayout.findIndex(r => r.id === rowId);
    if (filteredIndex === -1) return;

    const targetFilteredIndex = direction === 'up' ? filteredIndex - 1 : filteredIndex + 1;
    if (targetFilteredIndex < 0 || targetFilteredIndex >= filteredLayout.length) return;

    const targetRowId = filteredLayout[targetFilteredIndex].id;
    const realIndex = layout.findIndex(r => r.id === rowId);
    const realTargetIndex = layout.findIndex(r => r.id === targetRowId);

    const newLayout = [...layout];
    const [movedRow] = newLayout.splice(realIndex, 1);
    newLayout.splice(realTargetIndex, 0, movedRow);
    setLayout(newLayout);
  };

  const updateColumnCount = (rowId: string, count: number) => {
    setLayout(prev => prev.map(row => {
      if (row.id !== rowId) return row;
      
      const currentFields = row.columns.flatMap(c => c.fields);
      const newColumns: Column[] = Array.from({ length: count }, (_, i) => ({
        id: `col-${generateId()}-${i}`,
        fields: i === 0 ? currentFields : [] // Put all fields in first column for now
      }));
      
      return {
        ...row,
        columnCount: count,
        columns: newColumns
      };
    }));
  };

  const deleteField = (rowId: string, colId: string, fieldId: string) => {
    setLayout(prev => prev.map(row => {
      if (row.id !== rowId) return row;
      return {
        ...row,
        columns: row.columns.map(col => {
          if (col.id !== colId) return col;
          return {
            ...col,
            fields: col.fields.filter(f => f.id !== fieldId)
          };
        })
      };
    }));
  };

  const updateField = (fieldId: string, updates: Partial<Field>) => {
    setLayout(prev => prev.map(row => ({
      ...row,
      columns: row.columns.map(col => ({
        ...col,
        fields: col.fields.map(field => 
          field.id === fieldId ? { ...field, ...updates } : field
        )
      }))
    })));
  };

  const selectedField = (() => {
    if (!selectedId) return null;
    for (const row of layout) {
      for (const col of row.columns) {
        const field = col.fields.find(f => f.id === selectedId);
        if (field) return field;
      }
    }
    return null;
  })();

  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-950 overflow-hidden">
      {/* Sub-Header / Toolbar */}
      <div className="h-14 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/50 backdrop-blur-xl flex items-center justify-between px-6 z-30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-600 rounded-lg">
              <Sparkles size={14} className="text-white" />
            </div>
            <span className="text-xs font-bold text-zinc-900 dark:text-white tracking-tight">Aurora Architect</span>
          </div>
          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900/50 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
            {(['build', 'preview', 'logic', 'settings'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3 py-1 rounded-md text-[10px] font-bold transition-all uppercase tracking-widest",
                  activeTab === tab 
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm dark:shadow-lg" 
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveTab(activeTab === 'preview' ? 'build' : 'preview')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[10px] font-bold transition-all uppercase tracking-widest",
              activeTab === 'preview' 
                ? "bg-indigo-600 border-indigo-500 text-white" 
                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            )}
          >
            <Eye size={12} />
            <span>{activeTab === 'preview' ? 'Exit Preview' : 'Preview'}</span>
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 rounded-lg text-[10px] font-bold text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 uppercase tracking-widest disabled:opacity-50"
          >
            <Save size={12} />
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Only show in build mode */}
        {activeTab === 'build' && (
          <aside className="w-72 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col overflow-y-auto">
            <div className="p-5 space-y-8">
              {/* Layout Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Layouts</h3>
                  <Info size={12} className="text-zinc-300 dark:text-zinc-600" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {LAYOUT_TYPES.map((type) => (
                    <div
                      key={type.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, { type: 'layout', columnCount: type.id })}
                      className="flex flex-col items-center gap-2 p-3 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-indigo-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all group cursor-grab active:cursor-grabbing shadow-sm dark:shadow-none"
                    >
                      <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center group-hover:bg-indigo-600/20 transition-colors">
                        <type.icon size={16} className="text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                      </div>
                      <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest group-hover:text-zinc-600 dark:group-hover:text-zinc-300">{type.label}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Elements Section */}
              <section className="space-y-6">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Field Library</h3>
                  <Sparkles size={12} className="text-indigo-600 dark:text-indigo-500" />
                </div>
                <div className="space-y-6">
                  {FIELD_CATEGORIES.map((category) => (
                    <div key={category.id} className="space-y-3">
                      <h4 className="text-[9px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest px-1">{category.label}</h4>
                      <div className="space-y-1.5">
                        {category.fields.map((type) => (
                          <div
                            key={type.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, { type: 'field', fieldType: type.id })}
                            className="flex items-center gap-3 p-2.5 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-indigo-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all group cursor-grab active:cursor-grabbing shadow-sm dark:shadow-none"
                          >
                            <div className="w-7 h-7 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center group-hover:bg-indigo-600/20 transition-colors">
                              <type.icon size={12} className="text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                            </div>
                            <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white">{type.label}</span>
                            <GripVertical size={12} className="ml-auto text-zinc-300 dark:text-zinc-700 group-hover:text-zinc-500" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </aside>
        )}

        {/* Canvas / Preview */}
        <main 
          className={cn(
            "flex-1 overflow-y-auto relative",
            activeTab === 'build' ? "bg-zinc-50 dark:bg-zinc-950 p-12" : "bg-zinc-100 dark:bg-zinc-900 p-20"
          )}
          onClick={() => activeTab === 'build' && setSelectedId(null)}
        >
          {activeTab === 'build' ? (
            <>
              {/* Blueprint Grid Background */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.05] dark:opacity-[0.05]" 
                   style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
              
              <div className="max-w-5xl mx-auto space-y-4 relative">
                {/* Tab Management */}
                <div className="flex items-center gap-2 mb-8 overflow-x-auto pt-2 pb-2 px-2 scrollbar-hide">
                  {tabs.map((tab) => (
                    <div key={tab.id} className="group relative flex-shrink-0">
                      {isEditingTab === tab.id ? (
                        <input
                          autoFocus
                          className="px-4 py-2 bg-white dark:bg-zinc-900 border-2 border-indigo-500 rounded-xl text-sm font-bold focus:outline-none min-w-[120px]"
                          value={tab.label}
                          onChange={(e) => {
                            const newTabs = tabs.map(t => t.id === tab.id ? { ...t, label: e.target.value } : t);
                            setTabs(newTabs);
                          }}
                          onBlur={() => setIsEditingTab(null)}
                          onKeyDown={(e) => e.key === 'Enter' && setIsEditingTab(null)}
                        />
                      ) : (
                        <div className="flex items-center">
                          <button
                            onClick={() => setCurrentTabId(tab.id)}
                            onDoubleClick={() => setIsEditingTab(tab.id)}
                            className={cn(
                              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border-2",
                              currentTabId === tab.id
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
                            )}
                          >
                            {tab.label}
                          </button>
                          {tabs.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const newTabs = tabs.filter(t => t.id !== tab.id);
                                setTabs(newTabs);
                                if (currentTabId === tab.id) setCurrentTabId(newTabs[0].id);
                                // Move rows to first tab or delete them? Let's move them for safety.
                                setLayout(layout.map(r => r.tabId === tab.id ? { ...r, tabId: newTabs[0].id } : r));
                              }}
                              className="absolute -top-2 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            >
                              <X size={10} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const newId = `tab-${generateId()}`;
                      setTabs([...tabs, { id: newId, label: 'New Tab' }]);
                      setCurrentTabId(newId);
                      setIsEditingTab(newId);
                    }}
                    className="p-2.5 bg-zinc-100 dark:bg-zinc-900 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400 hover:text-indigo-600 hover:border-indigo-500/50 transition-all flex-shrink-0"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                {/* Top Drop Zone */}
                <div 
                  className={cn(
                    "h-4 -mt-2 transition-all rounded-full mb-2 relative z-10",
                    insertionIndex === 0 ? "bg-indigo-500 opacity-100" : "opacity-0"
                  )}
                  onDragOver={(e) => handleRowDragOver(e, 0)}
                  onDragLeave={() => setInsertionIndex(null)}
                  onDrop={(e) => handleDropOnCanvas(e, 0)}
                />

                <AnimatePresence mode="popLayout">
                  {(() => {
                    const filteredLayout = layout.filter(row => row.tabId === currentTabId || (!row.tabId && currentTabId === tabs[0]?.id));
                    return filteredLayout.map((row, rowIndex) => (
                      <motion.div
                        key={row.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="space-y-4"
                      >
                        <div className="group relative">
                          {/* Row Controls (Floating) */}
                          <div className="absolute -left-10 top-0 bottom-0 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 group-has-[.group\/field:hover]:opacity-0 transition-opacity z-20">
                            <button 
                              onClick={() => moveRow(row.id, 'up')}
                              disabled={rowIndex === 0}
                              className="p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-500 disabled:opacity-30 shadow-sm"
                            >
                              <ChevronUp size={14} />
                            </button>
                            <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800" />
                            <button 
                              onClick={() => moveRow(row.id, 'down')}
                              disabled={rowIndex === filteredLayout.length - 1}
                              className="p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-500 disabled:opacity-30 shadow-sm"
                            >
                              <ChevronDown size={14} />
                            </button>
                          </div>

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteRow(row.id);
                          }}
                          className="absolute -top-2 -right-2 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 group-has-[.group\/field:hover]:opacity-0 transition-opacity shadow-lg z-30"
                        >
                          <Trash2 size={14} />
                        </button>

                        {/* Row Container */}
                        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm dark:shadow-xl overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
                          {/* Row Header / Settings */}
                          <div className="h-10 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between px-4">
                            <div 
                              className="flex items-center gap-2 cursor-grab active:cursor-grabbing"
                              draggable
                              onDragStart={(e) => handleDragStart(e, { type: 'move_row', rowId: row.id })}
                            >
                              <GripVertical size={14} className="text-zinc-300 dark:text-zinc-700" />
                              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Row {rowIndex + 1}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4].map(count => (
                                <button
                                  key={count}
                                  onClick={() => updateColumnCount(row.id, count)}
                                  className={cn(
                                    "w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold transition-all",
                                    row.columnCount === count 
                                      ? "bg-indigo-600 text-white" 
                                      : "text-zinc-400 dark:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                  )}
                                >
                                  {count}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Columns Grid */}
                          <div className={cn(
                            "grid gap-px bg-zinc-100 dark:bg-zinc-800",
                            row.columnCount === 1 && "grid-cols-1",
                            row.columnCount === 2 && "grid-cols-2",
                            row.columnCount === 3 && "grid-cols-3",
                            row.columnCount === 4 && "grid-cols-4",
                          )}>
                            {row.columns.map((col) => (
                              <div
                                key={col.id}
                                onDragOver={(e) => handleColDragOver(e, col.id)}
                                onDragLeave={() => setDragOverColId(null)}
                                onDrop={(e) => handleDropOnColumn(e, row.id, col.id)}
                                className={cn(
                                  "min-h-[140px] bg-white dark:bg-zinc-950 p-4 transition-all relative",
                                  dragOverColId === col.id && "bg-indigo-500/5 ring-2 ring-indigo-500 ring-inset"
                                )}
                              >
                                {col.fields.length === 0 ? (
                                  <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-zinc-100 dark:border-zinc-900 rounded-xl text-zinc-300 dark:text-zinc-700">
                                    <Plus size={20} className="mb-2 opacity-20" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Drop here</span>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    {col.fields.map((field, fIndex) => (
                                      <React.Fragment key={field.id}>
                                        {/* Field Drop Zone (Top) */}
                                        <div 
                                          onDragOver={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setInsertionFieldIndex({ colId: col.id, index: fIndex });
                                          }}
                                          onDragLeave={() => setInsertionFieldIndex(null)}
                                          onDrop={(e) => handleDropOnColumn(e, row.id, col.id, fIndex)}
                                          className={cn(
                                            "h-1.5 transition-all rounded-full",
                                            insertionFieldIndex?.colId === col.id && insertionFieldIndex?.index === fIndex ? "bg-indigo-500 opacity-100 my-1" : "opacity-0"
                                          )}
                                        />
                                        <div
                                          draggable
                                          onDragStart={(e) => handleDragStart(e, { 
                                            type: 'move_field', 
                                            fieldId: field.id, 
                                            sourceRowId: row.id, 
                                            sourceColId: col.id 
                                          })}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedId(field.id);
                                          }}
                                          className={cn(
                                            "p-4 bg-zinc-50 dark:bg-zinc-900/50 border rounded-xl group/field relative cursor-pointer transition-all",
                                            selectedId === field.id ? "border-indigo-500 ring-1 ring-indigo-500" : "border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700"
                                          )}
                                        >
                                          <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                                                {field.type === 'heading' ? 'Heading' : field.type === 'divider' ? 'Divider' : field.type === 'spacer' ? 'Spacer' : field.type === 'alert' ? 'Alert' : field.type === 'fieldGroup' ? 'Group' : field.label}
                                                {field.required && <span className="text-rose-500">*</span>}
                                              </label>
                                              <GripVertical size={12} className="text-zinc-800 group-hover/field:text-zinc-600 cursor-grab active:cursor-grabbing" />
                                            </div>
                                            
                                            {field.type === 'heading' ? (
                                              <h4 className={cn(
                                                "font-bold text-zinc-900 dark:text-white",
                                                field.options?.[0] === 'h1' ? "text-3xl" :
                                                field.options?.[0] === 'h3' ? "text-lg" :
                                                field.options?.[0] === 'h4' ? "text-base" : "text-xl"
                                              )}>{field.label}</h4>
                                            ) : field.type === 'divider' ? (
                                              <div className="w-full h-px bg-zinc-200 dark:bg-zinc-800 my-2" />
                                            ) : field.type === 'spacer' ? (
                                              <div className="w-full h-8 border border-dashed border-zinc-200 dark:border-zinc-800/50 rounded-lg flex items-center justify-center text-[10px] text-zinc-400 dark:text-zinc-600">Spacer</div>
                                            ) : field.type === 'alert' ? (
                                              <div className={cn(
                                                "p-4 rounded-xl border text-sm",
                                                field.options?.[0] === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" :
                                                field.options?.[0] === 'warning' ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400" :
                                                field.options?.[0] === 'error' ? "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400" :
                                                "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                                              )}>
                                                {field.label}
                                              </div>
                                            ) : field.type === 'fieldGroup' ? (
                                              <div className="bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 shadow-sm dark:shadow-none">
                                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{field.label}</p>
                                              </div>
                                            ) : (
                                              <div className="h-9 bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/50 rounded-lg flex items-center px-3 shadow-sm dark:shadow-none">
                                                <span className="text-[11px] text-zinc-400 dark:text-zinc-700 italic">{field.placeholder || `Enter ${field.label.toLowerCase()}...`}</span>
                                              </div>
                                            )}

                                            {field.helperText && (
                                              <p className="text-[9px] text-zinc-600 italic px-1">{field.helperText}</p>
                                            )}
                                          </div>

                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              deleteField(row.id, col.id, field.id);
                                            }}
                                            className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/field:opacity-100 transition-opacity shadow-lg"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
                                      </React.Fragment>
                                    ))}
                                    {/* Field Drop Zone (Bottom) */}
                                    <div 
                                      onDragOver={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setInsertionFieldIndex({ colId: col.id, index: col.fields.length });
                                      }}
                                      onDragLeave={() => setInsertionFieldIndex(null)}
                                      onDrop={(e) => handleDropOnColumn(e, row.id, col.id, col.fields.length)}
                                      className={cn(
                                        "h-1.5 transition-all rounded-full",
                                        insertionFieldIndex?.colId === col.id && insertionFieldIndex?.index === col.fields.length ? "bg-indigo-500 opacity-100 my-1" : "opacity-0"
                                      )}
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Bottom Drop Zone for each row */}
                      <div 
                        className={cn(
                          "h-4 -mb-2 transition-all rounded-full relative z-10",
                          insertionIndex === rowIndex + 1 ? "bg-indigo-500 opacity-100" : "opacity-0"
                        )}
                        onDragOver={(e) => handleRowDragOver(e, rowIndex + 1)}
                        onDragLeave={() => setInsertionIndex(null)}
                        onDrop={(e) => handleDropOnCanvas(e, rowIndex + 1)}
                      />
                    </motion.div>
                    ));
                  })()}
                </AnimatePresence>

                {layout.filter(row => row.tabId === currentTabId || (!row.tabId && currentTabId === tabs[0]?.id)).length === 0 && (
                  <div 
                    onDragOver={(e) => handleRowDragOver(e, 0)}
                    onDragLeave={() => setInsertionIndex(null)}
                    onDrop={(e) => handleDropOnCanvas(e, 0)}
                    className={cn(
                      "h-64 flex flex-col items-center justify-center border-2 border-dashed rounded-[32px] transition-all",
                      insertionIndex === 0 
                        ? "border-indigo-500 bg-indigo-500/5" 
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50"
                    )}
                  >
                    <LayoutIcon size={48} className={cn(
                      "mb-4 transition-colors",
                      insertionIndex === 0 ? "text-indigo-500" : "text-zinc-300 dark:text-zinc-800"
                    )} />
                    <p className={cn(
                      "font-medium text-sm transition-colors",
                      insertionIndex === 0 ? "text-indigo-400" : "text-zinc-500"
                    )}>
                      {insertionIndex === 0 ? "Drop to create layout" : "Drag a layout from the sidebar to start building"}
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : activeTab === 'preview' ? (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[32px] shadow-2xl overflow-hidden">
                <div className="p-12 space-y-12">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Module Preview</h2>
                      <p className="text-zinc-500 text-sm">Interactive preview of the configured module layout and fields.</p>
                    </div>
                    <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Active State</span>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {layout.map((row) => (
                      <div 
                        key={row.id} 
                        className={cn(
                          "grid gap-8",
                          row.columnCount === 1 && "grid-cols-1",
                          row.columnCount === 2 && "grid-cols-2",
                          row.columnCount === 3 && "grid-cols-3",
                          row.columnCount === 4 && "grid-cols-4",
                        )}
                      >
                        {row.columns.map((col) => (
                          <div key={col.id} className="space-y-6">
                            {col.fields.map((field) => (
                              <div key={field.id} className="space-y-2.5">
                                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest px-1">
                                  {field.label}
                                </label>
                                <input 
                                  type={field.type}
                                  placeholder={field.placeholder}
                                  value={moduleState[field.id] || ''}
                                  onChange={(e) => setModuleState(prev => ({ ...prev, [field.id]: e.target.value }))}
                                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                />
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  <div className="pt-8 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
                    <button 
                      onClick={() => setModuleState({})}
                      className="px-6 py-3 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
                    >
                      Reset Module
                    </button>
                    <button 
                      onClick={() => {
                        alert('Module state exported! (Check developer console for data)');
                      }}
                      className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20"
                    >
                      Export Module State
                    </button>
                  </div>
                </div>
              </div>

              {/* Debug Data */}
              <div className="mt-12 p-8 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[32px] shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Module Output State</h3>
                </div>
                <pre className="text-[11px] font-mono text-indigo-400/80 leading-relaxed overflow-x-auto">
                  {JSON.stringify(moduleState, null, 2)}
                </pre>
              </div>
            </div>
          ) : activeTab === 'settings' ? (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[32px] shadow-2xl overflow-hidden p-12 space-y-8">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Module Settings</h2>
                  <p className="text-zinc-500 text-sm">Configure the core properties of this module.</p>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Module Name</label>
                    <input 
                      type="text" 
                      value={moduleSettings.name}
                      onChange={(e) => setModuleSettings(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                      placeholder="e.g. Grant Applications"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Category</label>
                    <input 
                      type="text" 
                      value={moduleSettings.category}
                      onChange={(e) => setModuleSettings(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                      placeholder="e.g. Operations"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Module Type</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {(['RECORD', 'WORK_ITEM', 'REGISTRY', 'LOG', 'FINANCIAL'] as ModuleType[]).map((type) => (
                        <button
                          key={type}
                          onClick={() => setModuleSettings(prev => ({ ...prev, type }))}
                          className={cn(
                            "px-4 py-3 rounded-xl border text-[10px] font-bold transition-all uppercase tracking-widest",
                            moduleSettings.type === type
                              ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                              : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
                          )}
                        >
                          {type.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Description</label>
                    <textarea 
                      value={moduleSettings.description}
                      onChange={(e) => setModuleSettings(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all min-h-[100px]"
                      placeholder="Brief description of what this module does..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Icon Name (Lucide)</label>
                    <input 
                      type="text" 
                      value={moduleSettings.iconName}
                      onChange={(e) => setModuleSettings(prev => ({ ...prev, iconName: e.target.value }))}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                      placeholder="e.g. Box, Users, FileText"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </main>

        {/* Property Panel - Only show in build mode */}
        {activeTab === 'build' && (
          <aside className="w-80 flex-shrink-0 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col overflow-hidden">
            <div className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 bg-zinc-50/50 dark:bg-transparent">
              <div className="flex items-center gap-3">
                <Settings2 size={14} className="text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-[0.2em]">Properties</h3>
              </div>
              {selectedField && (
                <button 
                  onClick={() => setSelectedId(null)}
                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-500 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {selectedField ? (
                  <motion.div 
                    key={selectedField.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="p-6 space-y-8"
                  >
                    {/* Global Settings */}
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Field Label</label>
                        <input 
                          type="text" 
                          value={selectedField.label}
                          onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                          className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                          placeholder="e.g. Customer Name"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Helper Text</label>
                        <input 
                          type="text" 
                          value={selectedField.helperText || ''}
                          onChange={(e) => updateField(selectedField.id, { helperText: e.target.value })}
                          className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                          placeholder="e.g. Enter your full legal name"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-widest">Required Field</p>
                          <p className="text-[9px] text-zinc-500 italic">Validation will enforce input</p>
                        </div>
                        <button 
                          onClick={() => updateField(selectedField.id, { required: !selectedField.required })}
                          className={cn(
                            "w-10 h-5 rounded-full transition-all relative",
                            selectedField.required ? "bg-indigo-600" : "bg-zinc-200 dark:bg-zinc-800"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
                            selectedField.required ? "right-1" : "left-1"
                          )} />
                        </button>
                      </div>
                    </div>

                    <div className="h-px bg-zinc-200 dark:bg-zinc-900" />

                    {/* Specific Settings */}
                    <div className="space-y-6">
                      {selectedField.type === 'currency' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Currency Symbol</label>
                          <select 
                            value={selectedField.currencySymbol || '$'}
                            onChange={(e) => updateField(selectedField.id, { currencySymbol: e.target.value })}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                          >
                            <option value="$">USD ($)</option>
                            <option value="£">GBP (£)</option>
                            <option value="€">EUR (€)</option>
                            <option value="¥">JPY (¥)</option>
                          </select>
                        </div>
                      )}

                      {selectedField.type === 'select' && (
                        <div className="space-y-4">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Option List</label>
                          <div className="space-y-2">
                            {(selectedField.options || []).map((opt, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <input 
                                  type="text" 
                                  value={opt}
                                  onChange={(e) => {
                                    const newOpts = [...(selectedField.options || [])];
                                    newOpts[idx] = e.target.value;
                                    updateField(selectedField.id, { options: newOpts });
                                  }}
                                  className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                                />
                                <button 
                                  onClick={() => {
                                    const newOpts = (selectedField.options || []).filter((_, i) => i !== idx);
                                    updateField(selectedField.id, { options: newOpts });
                                  }}
                                  className="p-2 text-zinc-600 hover:text-rose-500 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                            <button 
                              onClick={() => {
                                const newOpts = [...(selectedField.options || []), `Option ${(selectedField.options?.length || 0) + 1}`];
                                updateField(selectedField.id, { options: newOpts });
                              }}
                              className="w-full py-2 border border-dashed border-zinc-800 rounded-xl text-[10px] font-bold text-zinc-500 hover:text-indigo-400 hover:border-indigo-500/50 transition-all uppercase tracking-widest"
                            >
                              Add Option
                            </button>
                          </div>
                        </div>
                      )}

                      {(selectedField.type === 'fieldGroup' || selectedField.type === 'repeatableGroup') && (
                        <div className="space-y-4">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Nested Fields</label>
                          <div className="space-y-2">
                            {(selectedField.fields || []).map((nestedField, idx) => (
                              <div key={nestedField.id} className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-white">{nestedField.label}</span>
                                  <button 
                                    onClick={() => {
                                      const newFields = [...(selectedField.fields || [])];
                                      newFields.splice(idx, 1);
                                      updateField(selectedField.id, { fields: newFields });
                                    }}
                                    className="p-1 text-rose-500 hover:bg-rose-500/10 rounded transition-colors"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <input 
                                    type="text" 
                                    value={nestedField.label}
                                    onChange={(e) => {
                                      const newFields = [...(selectedField.fields || [])];
                                      newFields[idx] = { ...nestedField, label: e.target.value };
                                      updateField(selectedField.id, { fields: newFields });
                                    }}
                                    placeholder="Label"
                                    className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                                  />
                                  <select
                                    value={nestedField.type}
                                    onChange={(e) => {
                                      const newFields = [...(selectedField.fields || [])];
                                      newFields[idx] = { ...nestedField, type: e.target.value as FieldType };
                                      updateField(selectedField.id, { fields: newFields });
                                    }}
                                    className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 appearance-none"
                                  >
                                    {FIELD_CATEGORIES.flatMap(c => c.fields).filter(f => f.id !== 'fieldGroup' && f.id !== 'repeatableGroup').map(f => (
                                      <option key={f.id} value={f.id}>{f.label}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            ))}
                            <button 
                              onClick={() => {
                                const newFields = [...(selectedField.fields || []), {
                                  id: `nested-${Date.now()}`,
                                  type: 'text' as FieldType,
                                  label: 'New Field',
                                  required: false
                                }];
                                updateField(selectedField.id, { fields: newFields });
                              }}
                              className="w-full py-2 border border-dashed border-zinc-800 rounded-xl text-[10px] font-bold text-zinc-500 hover:text-indigo-400 hover:border-indigo-500/50 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                              <Plus size={14} />
                              Add Nested Field
                            </button>
                          </div>
                        </div>
                      )}

                      {selectedField.type === 'calculation' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Calculation Logic</label>
                          <textarea 
                            value={selectedField.calculationLogic || ''}
                            onChange={(e) => updateField(selectedField.id, { calculationLogic: e.target.value })}
                            className="w-full h-32 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500 transition-all resize-none"
                            placeholder="{{price}} * 1.1"
                          />
                          <p className="text-[9px] text-zinc-600 italic px-1">Use {"{{field_id}}"} to reference other fields.</p>
                        </div>
                      )}

                      {selectedField.type === 'heading' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Heading Level</label>
                          <select 
                            value={selectedField.options?.[0] || 'h2'}
                            onChange={(e) => updateField(selectedField.id, { options: [e.target.value] })}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                          >
                            <option value="h1">Heading 1 (Largest)</option>
                            <option value="h2">Heading 2</option>
                            <option value="h3">Heading 3</option>
                            <option value="h4">Heading 4 (Smallest)</option>
                          </select>
                        </div>
                      )}

                      {selectedField.type === 'alert' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Alert Type</label>
                          <select 
                            value={selectedField.options?.[0] || 'info'}
                            onChange={(e) => updateField(selectedField.id, { options: [e.target.value] })}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                          >
                            <option value="info">Info (Blue)</option>
                            <option value="success">Success (Green)</option>
                            <option value="warning">Warning (Yellow)</option>
                            <option value="error">Error (Red)</option>
                          </select>
                        </div>
                      )}

                      {selectedField.type === 'lookup' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Target Module</label>
                          <select 
                            value={selectedField.targetModuleId || ''}
                            onChange={(e) => updateField(selectedField.id, { targetModuleId: e.target.value })}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                          >
                            <option value="">Select Module...</option>
                            <option value="contacts">Contacts</option>
                            <option value="companies">Companies</option>
                            <option value="deals">Deals</option>
                          </select>
                        </div>
                      )}

                      <div className="pt-6 border-t border-zinc-800 space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Conditional Visibility</label>
                          <button
                            onClick={() => {
                              if (selectedField.visibilityRule) {
                                updateField(selectedField.id, { visibilityRule: undefined });
                              } else {
                                updateField(selectedField.id, { visibilityRule: { fieldId: '', operator: 'equals', value: '' } });
                              }
                            }}
                            className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest"
                          >
                            {selectedField.visibilityRule ? 'Remove' : 'Add Rule'}
                          </button>
                        </div>
                        
                        {selectedField.visibilityRule && (
                          <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 space-y-3">
                            <select
                              value={selectedField.visibilityRule.fieldId}
                              onChange={(e) => updateField(selectedField.id, { 
                                visibilityRule: { ...selectedField.visibilityRule!, fieldId: e.target.value } 
                              })}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                            >
                              <option value="">Select Field...</option>
                              {layout.flatMap(r => r.columns).flatMap(c => c.fields).filter(f => f.id !== selectedField.id).map(f => (
                                <option key={f.id} value={f.id}>{f.label}</option>
                              ))}
                            </select>
                            <div className="flex gap-2">
                              <select
                                value={selectedField.visibilityRule.operator}
                                onChange={(e) => updateField(selectedField.id, { 
                                  visibilityRule: { ...selectedField.visibilityRule!, operator: e.target.value as any } 
                                })}
                                className="w-1/2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                              >
                                <option value="equals">Equals</option>
                                <option value="not_equals">Not Equals</option>
                              </select>
                              <input
                                type="text"
                                placeholder="Value"
                                value={selectedField.visibilityRule.value}
                                onChange={(e) => updateField(selectedField.id, { 
                                  visibilityRule: { ...selectedField.visibilityRule!, value: e.target.value } 
                                })}
                                className="w-1/2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-12">
                      <button 
                        onClick={() => {
                          // Find row and col to delete
                          layout.forEach(row => {
                            row.columns.forEach(col => {
                              if (col.fields.some(f => f.id === selectedField.id)) {
                                deleteField(row.id, col.id, selectedField.id);
                                setSelectedId(null);
                              }
                            });
                          });
                        }}
                        className="w-full py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] font-bold text-rose-500 hover:bg-rose-500 hover:text-white transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        <Trash2 size={12} />
                        <span>Delete Field</span>
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4"
                  >
                    <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-200 dark:border-zinc-800 shadow-2xl shadow-indigo-500/5">
                      <Move size={20} className="text-zinc-500 dark:text-zinc-400" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">No Selection</p>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-500 leading-relaxed max-w-[160px]">Select any field on the canvas to configure its properties.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default ModuleEditor;
