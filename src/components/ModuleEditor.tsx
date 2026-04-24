import React, { useState, useEffect, useCallback } from 'react';
import { 
  Save, 
  Eye, 
  Search, 
  Trash2, 
  Settings2,
  Plus, 
  Layers,
  Sparkles,
  Monitor,
  Tablet,
  Smartphone,
  Layout as GridIcon,
  Grid3X3,
  Maximize2,
  Folder,
  ListPlus,
  Calculator,
  AlertCircle,
  Image,
  GripVertical,
  Type,
  AlignLeft,
  Hash,
  DollarSign,
  Calendar,
  ListFilter,
  CheckSquare,
  UploadCloud,
  Heading,
  Minus,
  Move,
  BrainCircuit,
  Palette,
  ArrowUp,
  X,
  Bug,
  Database,
  FileText,
  Upload
} from 'lucide-react';
import { WorkflowGraphEditor } from './Builder/Workflow/GraphEditor';
import { Workflow } from '../types/platform';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { useParams, useNavigate } from 'react-router-dom';
import { CommandPalette } from './CommandPalette';
import { cn } from '../lib/utils';
import { usePlatform } from '../hooks/usePlatform';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import { DATA_API_URL } from '../config';
import { ModuleType } from '../types/platform';
import { MODULES } from '../constants/modules';
import { FieldGroup } from './Builder/FieldGroup';
import { useGridEngine } from '../hooks/useGridEngine';
import { IconPicker } from './Common/IconPicker';
import { ConditionModal } from './Builder/ConditionModal';
import { CalculatorModal } from './Builder/CalculatorModal';


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
  | 'group'
  | 'repeatableGroup';

export interface VisibilityRule {
  id: string;
  type: 'rule' | 'group';
  fieldId?: string;
  operator?: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'not_empty';
  value?: string;
  valueType?: 'literal' | 'field';
  logicalOperator?: 'AND' | 'OR';
  rules?: VisibilityRule[];
  isCollapsed?: boolean;
  name?: string;
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
  calculationTriggers?: string[];
  targetModuleId?: string;
  // For nested fields (fieldGroup, repeatableGroup)
  fields?: Field[];
  visibilityRule?: VisibilityRule;
  colSpan?: number;
  startCol?: number;
  rowIndex?: number;
  tabId?: string;
}

export interface Tab {
  id: string;
  label: string;
  visibilityRule?: VisibilityRule;
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

export type Layout = Field[];

// --- Constants ---

export const FIELD_CATEGORIES = [
  {
    id: 'inputs',
    label: 'Inputs',
    fields: [
      { id: 'text', label: 'Short Text', icon: Type, defaultSpan: 6 },
      { id: 'textarea', label: 'Long Text', icon: AlignLeft, defaultSpan: 12 },
      { id: 'number', label: 'Number', icon: Hash, defaultSpan: 4 },
      { id: 'currency', label: 'Currency', icon: DollarSign, defaultSpan: 4 },
      { id: 'date', label: 'Date Picker', icon: Calendar, defaultSpan: 4 },
      { id: 'select', label: 'Dropdown', icon: ListFilter, defaultSpan: 6 },
      { id: 'checkbox', label: 'Checkbox', icon: CheckSquare, defaultSpan: 3 },
      { id: 'file', label: 'File Upload', icon: UploadCloud, defaultSpan: 12 },
    ]
  },
  {
    id: 'display',
    label: 'Display',
    fields: [
      { id: 'heading', label: 'Heading', icon: Heading, defaultSpan: 12 },
      { id: 'divider', label: 'Divider', icon: Minus, defaultSpan: 12 },
      { id: 'spacer', label: 'Spacer', icon: Maximize2, defaultSpan: 12 },
      { id: 'alert', label: 'Alert Notice', icon: AlertCircle, defaultSpan: 12 },
      { id: 'image', label: 'Image Holder', icon: Image, defaultSpan: 12 },
    ]
  },
  {
    id: 'layout',
    label: 'Layout',
    fields: [
      { id: 'group', label: 'Group Container', icon: Layers, defaultSpan: 12 },
      { id: 'fieldGroup', label: 'Field Section', icon: Folder, defaultSpan: 12 },
      { id: 'repeatableGroup', label: 'Repeatable List', icon: ListPlus, defaultSpan: 12 },
    ]
  },
  {
    id: 'logic',
    label: 'Logic & AI',
    fields: [
      { id: 'calculation', label: 'Calculation', icon: Calculator, defaultSpan: 12 },
      { id: 'lookup', label: 'Data Lookup', icon: Search, defaultSpan: 6 },
      { id: 'automation', label: 'AI Prompt', icon: Sparkles, defaultSpan: 12 },
    ]
  }
];



// --- Helper Components ---

const BlockThumbnail = ({ type }: { type: string }) => {
  return (
    <div className="w-full h-14 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden relative flex flex-col justify-center px-3 gap-1.5 group-hover:border-indigo-500/50 transition-colors shadow-sm">
      {type === 'heading' ? (
        <div className="space-y-1.5">
          <div className="h-2 w-3/4 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
          <div className="h-1 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
        </div>
      ) : type === 'image' ? (
        <div className="h-full flex items-center justify-center">
          <Image size={16} className="text-zinc-200 dark:text-zinc-800" />
        </div>
      ) : type === 'button' ? (
        <div className="h-6 w-full bg-indigo-500/20 border border-indigo-500/30 rounded-lg flex items-center justify-center">
          <div className="h-1 w-1/3 bg-indigo-500/40 rounded-full" />
        </div>
      ) : type === 'divider' ? (
        <div className="w-full h-px bg-zinc-200 dark:bg-zinc-800" />
      ) : type === 'spacer' ? (
        <div className="w-full h-full border border-dashed border-zinc-200 dark:border-zinc-800/50 rounded-lg flex items-center justify-center">
          <Maximize2 size={12} className="text-zinc-200 dark:text-zinc-800" />
        </div>
      ) : type === 'checkbox' ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-md border-2 border-indigo-500/50 bg-indigo-500/10 flex items-center justify-center">
            <CheckSquare size={10} className="text-indigo-500" />
          </div>
          <div className="h-1.5 w-12 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
        </div>
      ) : (type === 'select' || type === 'dropdown') ? (
        <div className="space-y-1.5">
          <div className="h-1 w-1/4 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
          <div className="h-5 w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md flex items-center justify-between px-2">
            <div className="h-1 w-1/2 bg-zinc-100 dark:bg-zinc-900 rounded-full" />
            <ListFilter size={10} className="text-zinc-400" />
          </div>
        </div>
      ) : type === 'date' ? (
        <div className="space-y-1.5">
          <div className="h-1 w-1/4 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
          <div className="h-5 w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md flex items-center justify-between px-2">
            <div className="h-1 w-1/2 bg-zinc-100 dark:bg-zinc-900 rounded-full" />
            <Calendar size={10} className="text-zinc-400" />
          </div>
        </div>
      ) : type === 'textarea' ? (
        <div className="space-y-1.5">
          <div className="h-1 w-1/4 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
          <div className="h-8 w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-1.5 space-y-1">
            <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-900 rounded-full" />
            <div className="h-1 w-3/4 bg-zinc-100 dark:bg-zinc-900 rounded-full" />
          </div>
        </div>
      ) : (type === 'number' || type === 'currency') ? (
        <div className="space-y-1.5">
          <div className="h-1 w-1/4 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
          <div className="h-5 w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md flex items-center px-2 gap-2">
            {type === 'currency' ? <DollarSign size={10} className="text-zinc-400" /> : <Hash size={10} className="text-zinc-400" />}
            <div className="h-1 w-1/3 bg-zinc-100 dark:bg-zinc-900 rounded-full" />
          </div>
        </div>
      ) : (type === 'group' || type === 'fieldGroup' || type === 'repeatableGroup') ? (
        <div className="w-full h-10 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-100/50 dark:bg-zinc-900/50 flex flex-col p-1.5 gap-1">
          <div className="h-1.5 w-1/2 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
          <div className="flex-1 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg bg-white/50 dark:bg-zinc-950/50" />
        </div>
      ) : type === 'alert' ? (
        <div className="w-full h-8 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-center px-2 gap-2">
          <AlertCircle size={12} className="text-amber-500" />
          <div className="h-1 w-1/2 bg-amber-500/20 rounded-full" />
        </div>
      ) : type === 'file' ? (
        <div className="w-full h-full border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg flex flex-col items-center justify-center gap-1 bg-zinc-100/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-1">
            <FileText size={8} className="text-zinc-400" />
            <UploadCloud size={12} className="text-indigo-500" />
            <Image size={8} className="text-zinc-400" />
          </div>
          <div className="h-0.5 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
        </div>
      ) : type === 'lookup' ? (
        <div className="space-y-1.5">
          <div className="h-1 w-1/4 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
          <div className="h-5 w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md flex items-center px-2 gap-2">
            <Database size={10} className="text-indigo-400" />
            <div className="h-1 w-2/3 bg-zinc-100 dark:bg-zinc-900 rounded-full" />
          </div>
        </div>
      ) : type === 'calculation' ? (
        <div className="space-y-1.5">
          <div className="h-1 w-1/4 bg-indigo-500/30 rounded-full" />
          <div className="h-5 w-full bg-indigo-500/5 border border-indigo-500/20 rounded-md flex items-center justify-center">
            <Calculator size={12} className="text-indigo-400" />
          </div>
        </div>
      ) : type === 'automation' ? (
        <div className="h-full flex items-center justify-center">
          <Sparkles size={16} className="text-indigo-400 animate-pulse" />
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="h-1 w-1/4 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
          <div className="h-5 w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};

const migrateVisibilityRule = (rule: any): VisibilityRule | undefined => {
  if (!rule) return undefined;
  if (rule.type) return rule as VisibilityRule; // Already in new format
  
  // Migrate old format { fieldId, operator, value }
  return {
    id: `rule-${Math.random().toString(36).substring(2, 11)}`,
    type: 'rule',
    fieldId: rule.fieldId,
    operator: rule.operator,
    value: rule.value
  };
};

const VisibilityRuleEditor = ({ 
  rule, 
  onEdit, 
  onRemove, 
  label = "Conditional Visibility" 
}: { 
  rule?: VisibilityRule, 
  onEdit: () => void, 
  onRemove: () => void, 
  label?: string
}) => {
  if (!rule) {
    return (
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">{label}</label>
        <button
          onClick={onEdit}
          className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest"
        >
          Add Rule
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">{label}</label>
        <div className="flex gap-3">
          <button
            onClick={onEdit}
            className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest"
          >
            Edit
          </button>
          <button
            onClick={onRemove}
            className="text-[10px] font-bold text-rose-400 hover:text-rose-300 uppercase tracking-widest"
          >
            Remove
          </button>
        </div>
      </div>
      
      <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-500">
          <BrainCircuit size={14} />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-tight">Active Logic Applied</p>
          <p className="text-[9px] text-zinc-500">Complex visibility rules are active for this element.</p>
        </div>
      </div>
    </div>
  );
};



// --- Components ---

export const ModuleEditor = () => {
  const { id: routeId } = useParams();
  const id = routeId || 'new';
  const navigate = useNavigate();
  const { tenant, modules, refreshModules } = usePlatform();
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
  
  const [layout, setLayout] = useState<Layout>([]);
  const [viewportSize, setViewportSize] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const [tabs, setTabs] = useState<Tab[]>([
    { id: 'default-tab', label: 'General' }
  ]);
  const [currentTabId, setCurrentTabId] = useState<string>('default-tab');
  const [isEditingTab, setIsEditingTab] = useState<string | null>(null);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [rightSidebarTab, setRightSidebarTab] = useState<'inspector' | 'architect'>('inspector');
  const [architectMessages, setArchitectMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: 'Hello! I am the Shadow Architect. How can I help you optimize your module today?' }
  ]);
  const [architectInput, setArchitectInput] = useState('');
  const [isArchitectThinking, setIsArchitectThinking] = useState(false);
  const [activeDragItem, setActiveDragItem] = useState<{ type: string, fieldType?: string, fieldId?: string } | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<{ col: number, span: number, index: number, active: boolean, parentId?: string, height?: number } | null>(null);

  const [workflow, setWorkflow] = useState<Workflow | undefined>({
    id: `wf-${Date.now()}`,
    name: 'New Workflow',
    nodes: [],
    edges: []
  });
  const [showDebugger, setShowDebugger] = useState(true);
  const [rightSidebarTabWorkflow, setRightSidebarTabWorkflow] = useState<'inspector' | 'debugger' | 'architect'>('inspector');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const { resolveCollisions } = useGridEngine(12);

  const [editingCondition, setEditingCondition] = useState<{
    targetId: string;
    targetType: 'field' | 'tab';
    rule?: VisibilityRule;
  } | null>(null);

  const [editingCalculation, setEditingCalculation] = useState<{
    targetId: string;
    logic?: string;
    triggers?: string[];
  } | null>(null);

  const [relatedModulesMap, setRelatedModulesMap] = useState<Record<string, Field[]>>({});

  // Fetch Related Module Schemas for Lookups
  useEffect(() => {
    const lookupFields = layout.filter(f => f.type === 'lookup' && f.targetModuleId);
    const uniqueModuleIds = [...new Set(lookupFields.map(f => f.targetModuleId as string))];
    
    uniqueModuleIds.forEach(async (moduleId) => {
      if (relatedModulesMap[moduleId] || !tenant?.id) return;
      
      try {
        const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
        const response = await fetch(`${DATA_API_URL}/modules/${moduleId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenant.id
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.layout) {
            setRelatedModulesMap(prev => ({
              ...prev,
              [moduleId]: data.layout
            }));
          }
        }
      } catch (err) {
        console.error(`Failed to fetch related module schema for ${moduleId}:`, err);
      }
    });
  }, [layout, tenant?.id, session?.access_token, relatedModulesMap]);



  const handleArchitectCommand = async (command: string) => {
    if (!command.trim() || !tenant?.id) return;
    
    const newUserMsg = { role: 'user' as const, content: command };
    setArchitectMessages(prev => [...prev, newUserMsg]);
    setArchitectInput('');
    setIsArchitectThinking(true);

    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      
      const response = await fetch(`${DATA_API_URL}/architect/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify({
          command,
          currentLayout: layout
        })
      });

      if (!response.ok) {
        throw new Error('Failed to reach design intelligence');
      }

      const data = await response.json();
      
      if (data.layout) {
        // Apply the AI's suggested layout
        setLayout(normalizeLayout(data.layout));
        
        const aiResponse = data.explanation || "I've updated the module layout based on your request. How does this look?";
        setArchitectMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
      } else {
        setArchitectMessages(prev => [...prev, { role: 'assistant', content: "I've analyzed your request but couldn't determine a layout change. Could you be more specific?" }]);
      }
    } catch (err: any) {
      console.error("Architect Error:", err);
      setArchitectMessages(prev => [...prev, { role: 'assistant', content: "I encountered a synchronization error while reaching the design core. Please try again." }]);
    } finally {
      setIsArchitectThinking(false);
    }
  };

  const [resizing, setResizing] = useState<{ id: string, startX: number, startSpan: number, startCol: number, direction: 'left' | 'right', containerId?: string } | null>(null);
  const layoutRef = React.useRef(layout);
  React.useEffect(() => { layoutRef.current = layout; }, [layout]);


  useEffect(() => {
    if (!resizing) return;

    let frameId: number;
    const handlePointerMove = (e: PointerEvent) => {
      frameId = requestAnimationFrame(() => {
        const canvas = resizing.containerId ? document.getElementById(resizing.containerId) : document.getElementById('main-grid-container');
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const padding = resizing.containerId ? 32 : 64;
        const canvasWidth = rect.width - padding;
        const colWidth = canvasWidth / 12;
        
        const deltaX = e.clientX - resizing.startX;
        const deltaCols = Math.round(deltaX / colWidth);
        
        const field = layoutRef.current.find(f => f.id === resizing.id);
        if (!field) return;

        if (resizing.direction === 'right') {
          const newSpan = Math.max(1, Math.min(12, resizing.startSpan + deltaCols));
          const startCol = field.startCol || 1;
          const finalSpan = Math.min(newSpan, 13 - startCol);
          
          if (field.colSpan !== finalSpan) {
            updateField(resizing.id, { colSpan: finalSpan });
          }
        } else {
          // Left resize
          const maxStartCol = resizing.startCol + resizing.startSpan - 1;
          const newStartCol = Math.max(1, Math.min(maxStartCol, resizing.startCol + deltaCols));
          const newSpan = resizing.startSpan - (newStartCol - resizing.startCol);
          
          if (field.startCol !== newStartCol || field.colSpan !== newSpan) {
            updateField(resizing.id, { startCol: newStartCol, colSpan: newSpan });
          }
        }
      });
    };

    const handlePointerUp = () => {
      setResizing(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [resizing]); 

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

        if (!response.ok) {
          if (response.status === 404) {
            const standardModule = MODULES.find(m => m.id === id);
            if (standardModule) {
              console.log(`[ModuleEditor] Loading default settings for standard module: ${id}`);
              setModuleSettings({
                name: standardModule.name,
                description: standardModule.description || '',
                category: standardModule.category || 'Custom',
                iconName: 'Box', // Defaulting to Box for standard modules as the icon is a component
                type: (standardModule.type as ModuleType) || 'RECORD',
                status: 'ACTIVE',
              });
              setIsLoading(false);
              return;
            }
          }
          throw new Error('Failed to load module');
        }
        
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

        if (data.layout) {
          // Migration logic for old Row/Column format
          if (Array.isArray(data.layout) && data.layout.length > 0 && 'columns' in data.layout[0]) {
            console.log("[ModuleEditor] Migrating legacy row/column layout to grid system");
            const migratedFields: Field[] = [];
            data.layout.forEach((row: any) => {
              row.columns.forEach((col: any, colIdx: number) => {
                const colSpan = Math.floor(12 / (row.columnCount || 1));
                const startCol = (colIdx * colSpan) + 1;
                if (Array.isArray(col.fields)) {
                  col.fields.forEach((field: any) => {
                    migratedFields.push({
                      ...field,
                      colSpan,
                      startCol,
                      tabId: row.tabId || tabs[0]?.id || 'default-tab'
                    });
                  });
                }
              });
            });
            setLayout(migratedFields);
          } else {
            setLayout(data.layout);
          }
        }
        if (data.tabs) setTabs(data.tabs);
        if (data.workflows && data.workflows.length > 0) setWorkflow(data.workflows[0]);
        
      } catch (error) {
        console.error("Error loading module:", error);
        toast.error("Failed to load module layout.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchModule();
  }, [id, tenant?.id]);

  const handleSave = useCallback(async () => {
    if (!tenant?.id) return;
    setIsSaving(true);
    try {
      console.log(`[ModuleEditor] Saving module ${id} for tenant ${tenant.id}`, {
        ...moduleSettings,
        layout,
        tabs
      });

      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const isNew = id === 'new' || MODULES.some(m => m.id === id);
      
      const payload = {
        ...moduleSettings,
        id: isNew && id !== 'new' ? id : undefined, // Pass templateId if standard module
        enabled: moduleSettings.status === 'ACTIVE',
        layout,
        tabs,
        workflows: workflow ? [workflow] : []
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
        navigate(`/workspace/settings/builder/${savedModule.id}`, { replace: true });
      } else {
        toast.success('Module saved successfully!');
      }
    } catch (error: any) {
      console.error("Save Error:", error);
      toast.error(error.message || 'Failed to save module layout.');
    } finally {
      setIsSaving(false);
    }
  }, [tenant?.id, id, moduleSettings, layout, tabs, session?.access_token, navigate, refreshModules]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleSave]);
  
  const [activeTab, setActiveTab] = useState<'build' | 'workflow' | 'settings' | 'preview'>('build');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [moduleState, setModuleState] = useState<Record<string, any>>({});

  // --- Helpers ---
  
  const calculateHeight = (f: Field) => {
    if (f.type === 'repeatableGroup' || f.type === 'fieldGroup' || f.type === 'group') return 2;
    if (f.type === 'file' || f.type === 'textarea' || f.type === 'lookup') return 2;
    return 1;
  };

  const getFieldHeight = (type: string) => {
    if (type === 'repeatableGroup' || type === 'fieldGroup' || type === 'group') return 240;
    if (type === 'file') return 230;
    if (type === 'textarea' || type === 'lookup') return 150;
    if (type === 'spacer') return 80;
    if (type === 'heading') return 90;
    return 110;
  };

  const resolveCollisionsInArray = useCallback((triggerField: Field, fields: Field[]) => {

    const otherFields = fields.filter(f => f.id !== triggerField.id);
    
    const items: any[] = otherFields.map(f => ({
      id: f.id,
      x: (f.startCol || 1) - 1,
      y: f.rowIndex || 0,
      w: f.colSpan || 12,
      h: calculateHeight(f)
    }));

    const triggerItem = {
      id: triggerField.id,
      x: (triggerField.startCol || 1) - 1,
      y: triggerField.rowIndex || 0,
      w: triggerField.colSpan || 12,
      h: calculateHeight(triggerField)
    };

    const resolvedItems = resolveCollisions(triggerItem, items);

    return resolvedItems.map(ri => {
      const original = ri.id === triggerField.id ? triggerField : otherFields.find(f => f.id === ri.id);
      if (!original) return null;
      return {
        ...original,
        startCol: ri.x + 1,
        rowIndex: ri.y,
        colSpan: ri.w
      } as Field;
    }).filter(Boolean) as Field[];
  }, [resolveCollisions]);

  const normalizeLayout = (currentLayout: Field[]) => {
    if (currentLayout.length === 0) return [];
    
    // 1. Sort by row then col
    const sorted = [...currentLayout].sort((a, b) => {
      if ((a.rowIndex || 0) !== (b.rowIndex || 0)) return (a.rowIndex || 0) - (b.rowIndex || 0);
      return (a.startCol || 1) - (b.startCol || 1);
    });

    // 2. Simple compaction: Ensure rowIndex increments are minimal
    // For now, we'll just ensure they are contiguous if possible
    // A more advanced version would check for overlaps on Y
    return sorted;
  };

  const generateId = () => Math.random().toString(36).substring(2, 11);

  // Removed createRow as we are moving to a flat grid system

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
    targetModuleId: '',
    colSpan: type === 'heading' || type === 'divider' || type === 'spacer' || type === 'repeatableGroup' || type === 'fieldGroup' || type === 'group' ? 12 : 6,
    startCol: 1,
    rowIndex: layout.length, // Add to end by default
    tabId: currentTabId,
    fields: type === 'repeatableGroup' || type === 'fieldGroup' || type === 'group' ? [] : undefined
  });

  // --- DnD Handlers ---

  const handleDragStart = (e: React.DragEvent, data: any) => {
    e.dataTransfer.setData('application/json', JSON.stringify(data));
    e.dataTransfer.effectAllowed = 'move';
    setActiveDragItem(data);
    
    // If it's an existing field, mark it as dragging
    if (data.type === 'move') {
      e.dataTransfer.setData('fieldId', data.fieldId);
    }
  };

  const handleDragEnd = () => {
    setActiveDragItem(null);
    setDragOverInfo(null);
  };

  // DnD Handlers updated for flat grid system

  const calculateGridCol = (e: React.DragEvent, isNested = false) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const padding = isNested ? 16 : 32;
    const x = e.clientX - rect.left - padding; 
    const canvasWidth = rect.width - (padding * 2);
    const colWidth = canvasWidth / 12;
    return Math.max(1, Math.min(12, Math.floor(x / colWidth) + 1));
  };

  const handleDragOver = (e: React.DragEvent, parentId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const isNested = !!parentId;
    const col = calculateGridCol(e, isNested);
    
    // Calculate insertion row based on Y
    const container = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - container.top - 16;
    const rowHeight = 130; // Unified row height for better density
    const rowIndex = Math.max(0, Math.floor(y / rowHeight)); 
    
    // Determine span and height from activeDragItem
    let span = 12;
    let isGroupDrag = false;

    if (activeDragItem) {
      if (activeDragItem.type === 'field') {
        const fieldDef = FIELD_CATEGORIES.flatMap(c => c.fields).find(f => f.id === activeDragItem.fieldType);
        if (fieldDef?.defaultSpan) span = fieldDef.defaultSpan;
        isGroupDrag = activeDragItem.fieldType === 'group' || activeDragItem.fieldType === 'fieldGroup' || activeDragItem.fieldType === 'repeatableGroup';
      } else if (activeDragItem.type === 'move') {
        const field = layout.find(f => f.id === activeDragItem.fieldId) || findFieldRecursive(layout, activeDragItem.fieldId || '');
        if (field) {
          span = field.colSpan || 12;
          isGroupDrag = field.type === 'group' || field.type === 'fieldGroup' || field.type === 'repeatableGroup';
        }
      }
    }

    const constrainedSpan = Math.min(span, 13 - col);
    const fieldType = activeDragItem.type === 'field' 
      ? activeDragItem.fieldType 
      : (layout.find(f => f.id === activeDragItem.fieldId) || findFieldRecursive(layout, activeDragItem.fieldId || ''))?.type;

    setDragOverInfo({ 
      col, 
      span: constrainedSpan, 
      index: rowIndex, 
      active: true, 
      parentId,
      height: getFieldHeight(fieldType || 'text')
    });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only clear if we actually left the container
    if (e.relatedTarget && (e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) return;
    setDragOverInfo(null);
  };

  const handleDropOnCanvas = (e: React.DragEvent, parentId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverInfo(null);
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const dropCol = calculateGridCol(e, !!parentId);
      
      const container = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - container.top - 16;
      const rowHeight = 130; 
      const dropRow = Math.max(0, Math.floor(y / rowHeight));

      const fieldId = data.type === 'move' ? data.fieldId : null;
      if (fieldId && fieldId === parentId) return;

      let fieldToInsert: Field | null = null;
      if (data.type === 'field') {
        fieldToInsert = createField(data.fieldType);
      } else if (fieldId) {
        fieldToInsert = findFieldRecursive(layout, fieldId) || null;
      }

      if (!fieldToInsert) return;

      const updatedField = { 
        ...fieldToInsert, 
        startCol: dropCol, 
        rowIndex: dropRow, 
        tabId: parentId ? undefined : currentTabId 
      };

      // Helper to insert field into the tree
      const performInsert = (fields: Field[], targetId?: string): { fields: Field[], insertedField?: Field } => {
        if (!targetId) {
          const resolved = resolveCollisionsInArray(updatedField, [...fields, updatedField]);
          return { fields: normalizeLayout(resolved), insertedField: updatedField };
        }
        
        let insertedField: Field | undefined;
        const nextFields = fields.map(f => {
          if (f.id === targetId) {
            const nestedFields = [...(f.fields || []), updatedField];
            const resolved = resolveCollisionsInArray(updatedField, nestedFields);
            insertedField = updatedField;
            return { ...f, fields: normalizeLayout(resolved) };
          }
          if (f.fields) {
            const result = performInsert(f.fields, targetId);
            if (result.insertedField) insertedField = result.insertedField;
            return { ...f, fields: result.fields };
          }
          return f;
        });
        return { fields: nextFields, insertedField };
      };

      if (parentId && !findFieldRecursive(layout, parentId)) return;

      let nextLayout = fieldId ? removeFieldRecursive(layout, fieldId) : [...layout];
      const result = performInsert(nextLayout, parentId);
      setLayout(result.fields);
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  const findFieldRecursive = (fields: Field[], id: string): Field | undefined => {
    for (const f of fields) {
      if (f.id === id) return f;
      if (f.fields) {
        const found = findFieldRecursive(f.fields, id);
        if (found) return found;
      }
    }
    return undefined;
  };

  const removeFieldRecursive = (fields: Field[], id: string): Field[] => {
    return fields
      .filter(f => f.id !== id)
      .map(f => f.fields ? { ...f, fields: removeFieldRecursive(f.fields, id) } : f);
  };

  const deleteBlock = (id: string) => {
    setLayout(prev => removeFieldRecursive(prev, id));
  };

  const updateField = (fieldId: string, updates: Partial<Field>) => {
    setLayout(prev => {
      const findAndUpdate = (fields: Field[]): { fields: Field[], updatedField?: Field } => {
        let updatedField: Field | undefined;
        const nextFields = fields.map(f => {
          if (f.id === fieldId) {
            updatedField = { ...f, ...updates };
            return updatedField;
          }
          if (f.fields) {
            const result = findAndUpdate(f.fields);
            if (result.updatedField) {
              updatedField = result.updatedField;
              const resolved = resolveCollisionsInArray(updatedField, result.fields);
              return { ...f, fields: normalizeLayout(resolved) };
            }
          }
          return f;
        });
        return { fields: nextFields, updatedField };
      };

      const { fields: nextLayout, updatedField } = findAndUpdate(prev);
      if (!updatedField) return prev;

      if (prev.find(f => f.id === fieldId)) {
        const otherTabFields = nextLayout.filter(f => f.tabId !== updatedField!.tabId);
        const sameTabFields = nextLayout.filter(f => f.tabId === updatedField!.tabId);
        const resolved = resolveCollisionsInArray(updatedField!, sameTabFields);
        return [...otherTabFields, ...normalizeLayout(resolved)];
      }

      return nextLayout;
    });
  };

  const selectedField = selectedId ? findFieldRecursive(layout, selectedId) : null;
  const selectedTab = selectedId ? tabs.find(t => t.id === selectedId) : null;

  const updateTab = (tabId: string, updates: Partial<Tab>) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, ...updates } : t));
  };

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
            {(['settings', 'build', 'workflow'] as const).map((tab) => (
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

          {activeTab === 'build' && (
            <>
              <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />

              {/* Viewport Toggle */}
              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900/50 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
                {[
                  { id: 'desktop', icon: Monitor },
                  { id: 'tablet', icon: Tablet },
                  { id: 'mobile', icon: Smartphone }
                ].map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setViewportSize(v.id as any)}
                    className={cn(
                      "p-1.5 rounded-md transition-all",
                      viewportSize === v.id 
                        ? "bg-white dark:bg-zinc-800 text-indigo-600 shadow-sm" 
                        : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400"
                    )}
                    title={`${v.id.charAt(0).toUpperCase() + v.id.slice(1)} View`}
                  >
                    <v.icon size={14} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'workflow' && (
            <>
              <button 
                onClick={() => setShowDebugger(!showDebugger)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[10px] font-bold transition-all uppercase tracking-widest",
                  showDebugger 
                    ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-500 shadow-inner" 
                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                <Bug size={12} />
                <span>{showDebugger ? 'Hide Sidebar' : 'Show Sidebar'}</span>
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg text-[10px] font-bold hover:text-zinc-900 dark:hover:text-white transition-all uppercase tracking-widest">
                <Sparkles size={12} />
                <span>AI Optimize</span>
              </button>
            </>
          )}
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
        {/* Left Sidebar - Discovery Panel */}
        {activeTab === 'build' && (
          <aside className="w-72 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-transparent">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="Search blocks..." 
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              {FIELD_CATEGORIES.map((category) => {
                const filteredFields = category.fields.filter(f => 
                  f.label.toLowerCase().includes(sidebarSearch.toLowerCase())
                );
                
                if (filteredFields.length === 0) return null;

                return (
                  <div key={category.id} className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">{category.label}</h4>
                      <span className="text-[8px] font-bold text-zinc-300 dark:text-zinc-800">{filteredFields.length}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {filteredFields.map((field) => (
                        <div
                          key={field.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, { type: 'field', fieldType: field.id })}
                          onDragEnd={handleDragEnd}
                          className="group cursor-grab active:cursor-grabbing space-y-2"
                        >
                          <BlockThumbnail type={field.id} />
                          <div className="flex items-center gap-2 px-1">
                            <field.icon size={12} className="text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                            <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors truncate">{field.label}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}


            </div>
          </aside>
        )}

        {/* Canvas / Preview */}
        <main 
          className={cn(
            "flex-1 relative",
            (activeTab === 'build' || activeTab === 'workflow' || activeTab === 'settings') 
              ? "bg-zinc-50 dark:bg-zinc-950" 
              : "bg-zinc-100 dark:bg-zinc-900",
            activeTab === 'build' ? "p-6 overflow-y-auto" : 
            activeTab === 'workflow' ? "p-0 overflow-hidden" : 
            activeTab === 'settings' ? "p-0 overflow-hidden" :
            "p-10 overflow-y-auto"
          )}
          onClick={() => activeTab === 'build' && setSelectedId(null)}
        >
          {activeTab === 'build' ? (
            <>
              {/* Blueprint Grid Background */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.05] dark:opacity-[0.05]" 
                   style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
              
              <div className="w-full space-y-4 relative px-4">
                {/* Tab Management */}
                <div className="flex items-center gap-2 mb-8 overflow-x-auto pt-2 pb-2 px-2 scrollbar-hide">
                  <Reorder.Group 
                    axis="x" 
                    values={tabs} 
                    onReorder={setTabs}
                    className="flex items-center gap-2"
                  >
                    {tabs.map((tab) => (
                      <Reorder.Item 
                        key={tab.id} 
                        value={tab}
                        dragListener={isEditingTab !== tab.id}
                        className="group relative flex-shrink-0"
                      >
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
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentTabId(tab.id);
                                setSelectedId(tab.id);
                              }}
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
                                  setLayout(layout.filter(field => field.tabId !== tab.id));
                                }}
                                className="absolute -top-2 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                              >
                                <X size={10} />
                              </button>
                            )}
                          </div>
                        )}
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newId = `tab-${generateId()}`;
                      setTabs([...tabs, { id: newId, label: 'New Tab' }]);
                      setCurrentTabId(newId);
                      setIsEditingTab(newId);
                      setSelectedId(newId);
                    }}
                    className="p-2.5 bg-zinc-100 dark:bg-zinc-900 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400 hover:text-indigo-600 hover:border-indigo-500/50 transition-all flex-shrink-0"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                {/* Grid Canvas */}
                <div 
                  className={cn(
                    "mx-auto transition-all duration-500 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[32px] shadow-sm dark:shadow-2xl overflow-hidden relative grid-canvas-container",
                    viewportSize === 'desktop' ? "w-full" :
                    viewportSize === 'tablet' ? "w-[768px]" :
                    "w-[375px]"
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDropOnCanvas}
                >
                  {/* Grid Lines Overlay (Builder Mode Only) */}
                  <div className="absolute inset-0 pointer-events-none grid grid-cols-12 gap-4 px-8 py-8 opacity-[0.03] dark:opacity-[0.05]">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="h-full border-x border-zinc-900 dark:border-white" />
                    ))}
                  </div>

                  <div 
                    id="main-grid-container"
                    className={cn(
                      "p-8 min-h-[600px] relative z-10 grid gap-4 items-start content-start transition-all duration-300",
                      "grid-cols-1", // Mobile first
                      viewportSize !== 'mobile' && "md:grid-cols-12", // Desktop/Tablet grid
                      isArchitectThinking && "opacity-40 grayscale-[0.5] scale-[0.99] pointer-events-none"
                    )}
                  >
                    {/* Architect Thinking Overlay */}
                    <AnimatePresence>
                      {isArchitectThinking && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
                        >
                          <div className="flex flex-col items-center gap-4">
                            <div className="relative">
                              <motion.div 
                                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl"
                              />
                              <BrainCircuit size={48} className="text-indigo-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            </div>
                            <div className="px-6 py-2 bg-zinc-900 text-white rounded-full text-[10px] font-bold uppercase tracking-widest shadow-2xl border border-white/10">
                              Architect is Thinking...
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <AnimatePresence mode="popLayout">
                      {(() => {
                        const currentFields = layout
                          .filter(block => block.tabId === currentTabId || (!block.tabId && currentTabId === tabs[0]?.id))
                          .sort((a, b) => {
                            if ((a.rowIndex || 0) !== (b.rowIndex || 0)) return (a.rowIndex || 0) - (b.rowIndex || 0);
                            return (a.startCol || 1) - (b.startCol || 1);
                          });
                        
                        const items = [...currentFields];


                          const renderFieldBlocks = (fields: Field[], parentId?: string): React.ReactNode => {
                            const isNested = !!parentId;
                            const filtered = fields.filter(block => {
                              if (isNested) return true;
                              return block.tabId === currentTabId || (!block.tabId && currentTabId === tabs[0]?.id);
                            });
                            
                            const items = [...filtered];
                            if (dragOverInfo && dragOverInfo.active && dragOverInfo.parentId === parentId) {
                              const placeholder = (
                                <div 
                                  key="placeholder"
                                  className="border-2 border-dashed border-indigo-500/50 bg-indigo-500/5 rounded-[24px] animate-pulse"
                                  style={{ 
                                    gridColumn: `${dragOverInfo.col} / span ${dragOverInfo.span}`,
                                    gridRow: `${dragOverInfo.index + 1} / span ${Math.ceil((dragOverInfo.height || 110) / 130)}`,
                                    height: `${dragOverInfo.height || 110}px`
                                  }}
                                />
                              );
                              items.push(placeholder as any);
                            }

                            return items.map((item) => {
                              if (React.isValidElement(item)) return item;
                              const block = item as Field;
                              const isGroup = block.type === 'group' || block.type === 'fieldGroup' || block.type === 'repeatableGroup';

                              if (isGroup) {
                                return (
                                  <FieldGroup 
                                    key={block.id}
                                    block={block}
                                    selectedId={selectedId}
                                    onSelect={setSelectedId}
                                    onUpdate={updateField}
                                    onDelete={deleteBlock}
                                    onDrop={handleDropOnCanvas}
                                    renderNested={renderFieldBlocks}
                                    viewportSize={viewportSize}
                                  />
                                );
                              }

                              return (
                                <motion.div
                                  key={block.id}
                                  layout
                                  draggable
                                  onDragStart={(e: any) => handleDragStart(e, { type: 'move', fieldId: block.id })}
                                  onDragEnd={handleDragEnd}
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.9 }}
                                  style={{ 
                                    gridColumn: viewportSize === 'mobile' ? 'span 1' : `${block.startCol || 1} / span ${block.colSpan || 12}`,
                                    gridRow: viewportSize === 'mobile' ? 'auto' : `${(block.rowIndex || 0) + 1} / span 1`
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedId(block.id);
                                  }}
                                  className={cn(
                                    "group/field relative p-4 rounded-2xl cursor-pointer transition-all",
                                    "bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800",
                                    selectedId === block.id 
                                      ? "border-indigo-500 ring-2 ring-indigo-500/20" 
                                      : "hover:border-zinc-200 dark:hover:border-zinc-700"
                                  )}
                                >
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                                          {block.type.replace('_', ' ')}
                                          {block.required && <span className="text-rose-500">*</span>}
                                        </label>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {block.visibilityRule && (
                                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-500/10 rounded-full border border-indigo-500/20 shadow-sm shadow-indigo-500/10" title="Conditional Logic Applied">
                                            <BrainCircuit size={10} className="text-indigo-500" />
                                            <span className="text-[8px] font-black text-indigo-500 uppercase tracking-tighter">Logic</span>
                                          </div>
                                        )}
                                        <GripVertical size={12} className="text-zinc-300 group-hover/field:text-zinc-500" />
                                      </div>
                                    </div>

                                    {!(block.type === 'heading' || block.type === 'alert' || block.type === 'divider' || block.type === 'spacer') && (
                                      <p className="text-[11px] font-medium text-zinc-900 dark:text-zinc-300 mb-1">{block.label}</p>
                                    )}

                                  <div className="min-h-[20px]">
                                    {block.type === 'heading' ? (
                                      <h4 className={cn(
                                        "font-bold text-zinc-900 dark:text-white",
                                        block.options?.[0] === 'h1' ? "text-3xl" :
                                        block.options?.[0] === 'h3' ? "text-lg" :
                                        block.options?.[0] === 'h4' ? "text-base" : "text-xl"
                                      )}>{block.label}</h4>
                                    ) : block.type === 'divider' ? (
                                      <div className="w-full h-px bg-zinc-200 dark:bg-zinc-800 my-2" />
                                    ) : block.type === 'spacer' ? (
                                      <div className="w-full h-8 border border-dashed border-zinc-200 dark:border-zinc-800/50 rounded-lg flex items-center justify-center text-[10px] text-zinc-400 dark:text-zinc-600">Spacer</div>
                                    ) : block.type === 'alert' ? (
                                      <div className={cn(
                                        "p-3 rounded-xl border text-xs",
                                        block.options?.[0] === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" :
                                        block.options?.[0] === 'warning' ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400" :
                                        block.options?.[0] === 'error' ? "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400" :
                                        "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                                      )}>
                                        {block.label}
                                      </div>
                                    ) : block.type === 'checkbox' ? (
                                      <div className="flex items-center gap-3 py-2 px-1">
                                        <div className="w-5 h-5 rounded-md border-2 border-indigo-500/50 bg-white dark:bg-zinc-950 flex items-center justify-center">
                                          <CheckSquare size={14} className="text-indigo-500 opacity-20" />
                                        </div>
                                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Checkbox Option</span>
                                      </div>
                                    ) : (block.type === 'select' || block.type === 'dropdown') ? (
                                      <div className="h-10 bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/50 rounded-xl flex items-center justify-between px-4 shadow-sm dark:shadow-none cursor-default">
                                        <span className="text-xs text-zinc-400 dark:text-zinc-600 italic truncate">{block.placeholder || `Select ${block.label.toLowerCase()}...`}</span>
                                        <ListFilter size={14} className="text-zinc-400" />
                                      </div>
                                    ) : block.type === 'date' ? (
                                      <div className="h-10 bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/50 rounded-xl flex items-center justify-between px-4 shadow-sm dark:shadow-none cursor-default">
                                        <span className="text-xs text-zinc-400 dark:text-zinc-600 italic truncate">{block.placeholder || 'Select date...'}</span>
                                        <Calendar size={14} className="text-zinc-400" />
                                      </div>
                                    ) : block.type === 'textarea' ? (
                                      <div className="min-h-[80px] bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/50 rounded-xl p-4 shadow-sm dark:shadow-none">
                                        <span className="text-xs text-zinc-400 dark:text-zinc-600 italic truncate">{block.placeholder || `Enter ${block.label.toLowerCase()}...`}</span>
                                      </div>
                                    ) : (block.type === 'number' || block.type === 'currency') ? (
                                      <div className="h-10 bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/50 rounded-xl flex items-center px-4 shadow-sm dark:shadow-none gap-3">
                                        {block.type === 'currency' ? (
                                          <span className="text-xs font-bold text-zinc-400">{block.currencySymbol || '$'}</span>
                                        ) : (
                                          <Hash size={14} className="text-zinc-400" />
                                        )}
                                        <span className="text-xs text-zinc-400 dark:text-zinc-600 italic truncate">{block.placeholder || '0.00'}</span>
                                      </div>
                                    ) : block.type === 'file' ? (
                                      <div className="h-40 bg-zinc-50 dark:bg-zinc-900/20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2rem] flex flex-col items-center justify-center gap-4 group-hover/field:border-indigo-500/50 group-hover/field:bg-indigo-500/5 transition-all relative overflow-hidden group/dropzone">
                                        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/[0.03] to-transparent pointer-events-none" />
                                        
                                        <div className="flex items-center gap-2 mb-1">
                                          <div className="w-10 h-10 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-center -rotate-6 transition-transform group-hover/dropzone:-rotate-12">
                                            <FileText size={18} className="text-zinc-400" />
                                          </div>
                                          <div className="w-12 h-12 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-indigo-500/20 flex items-center justify-center z-10 scale-110">
                                            <UploadCloud size={24} className="text-indigo-500" />
                                          </div>
                                          <div className="w-10 h-10 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-center rotate-6 transition-transform group-hover/dropzone:rotate-12">
                                            <Image size={18} className="text-zinc-400" />
                                          </div>
                                        </div>

                                        <div className="text-center space-y-2">
                                          <div className="space-y-0.5">
                                            <span className="block text-xs font-bold text-zinc-900 dark:text-zinc-100">Drop files here to upload</span>
                                            <span className="block text-[10px] font-medium text-zinc-500 uppercase tracking-widest opacity-60">or click to browse local files</span>
                                          </div>
                                          
                                          <div className="flex items-center justify-center gap-3 pt-2">
                                            <button className="px-4 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-sm">
                                              Browse Files
                                            </button>
                                          </div>
                                        </div>

                                        {/* Floating Format Labels */}
                                        <div className="absolute top-4 right-4 flex gap-1">
                                          {['PDF', 'JPG', 'PNG'].map(ext => (
                                            <span key={ext} className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-[8px] font-bold text-zinc-500 dark:text-zinc-400">{ext}</span>
                                          ))}
                                        </div>
                                      </div>
                                    ) : block.type === 'lookup' ? (
                                      <div className="min-h-[48px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col shadow-sm group-hover/field:border-indigo-500/50 transition-all overflow-hidden">
                                        <div className="flex items-center justify-between px-4 h-12 border-b border-zinc-50 dark:border-zinc-900/50">
                                          <div className="flex items-center gap-3">
                                            <div className="w-7 h-7 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                                              <Database size={14} className="text-indigo-500" />
                                            </div>
                                            <span className="text-xs text-zinc-400 dark:text-zinc-600 italic truncate">{block.placeholder || 'Search records...'}</span>
                                          </div>
                                          <Search size={14} className="text-zinc-300" />
                                        </div>
                                        
                                        {/* Symbolic Recent Records */}
                                        <div className="p-2 flex gap-2 overflow-hidden">
                                          {[1, 2].map(i => (
                                            <div key={i} className="flex-shrink-0 flex items-center gap-2 px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                              <div className="w-2 h-2 rounded-full bg-indigo-500/40" />
                                              <div className="w-16 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                                              <X size={10} className="text-zinc-400" />
                                            </div>
                                          ))}
                                          <div className="flex-shrink-0 w-8 h-7 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-center">
                                            <Plus size={12} className="text-zinc-300" />
                                          </div>
                                        </div>
                                      </div>
                                    ) : block.type === 'calculation' ? (
                                      <div className="flex flex-col gap-2">
                                        <div className="h-10 bg-zinc-950 dark:bg-black border border-zinc-800 dark:border-zinc-900 rounded-xl flex items-center px-4 gap-3 font-mono shadow-inner group-hover/field:border-indigo-500/30 transition-colors">
                                          <Calculator size={14} className="text-indigo-500" />
                                          <span className="text-[11px] text-indigo-400 opacity-80 truncate">{block.calculationLogic || 'Enter formula (e.g. {price} * {qty})...'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-2">
                                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/40 animate-pulse" />
                                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Computed Result Preview</span>
                                          <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800/50" />
                                          <span className="text-xs font-black text-indigo-500 tracking-tight">0.00</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="h-10 bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/50 rounded-xl flex items-center px-4 shadow-sm dark:shadow-none">
                                        <span className="text-xs text-zinc-400 dark:text-zinc-600 italic truncate">{block.placeholder || `Enter ${block.label.toLowerCase()}...`}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Fluid Resize Handles for Standard Fields */}
                                  {viewportSize !== 'mobile' && selectedId === block.id && (
                                    <>
                                      <div 
                                        onPointerDown={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          const startX = e.clientX;
                                          const startSpan = block.colSpan || 12;
                                          const startCol = block.startCol || 1;
                                          const handleMove = (me: PointerEvent) => {
                                            const canvas = document.querySelector('.grid-canvas-container');
                                            if (!canvas) return;
                                            const rect = canvas.getBoundingClientRect();
                                            const colWidth = (rect.width - 64) / 12;
                                            const deltaCols = Math.round((me.clientX - startX) / colWidth);
                                            const maxStartCol = startCol + startSpan - 1;
                                            const newStartCol = Math.max(1, Math.min(maxStartCol, startCol + deltaCols));
                                            const newSpan = startSpan - (newStartCol - startCol);
                                            updateField(block.id, { startCol: newStartCol, colSpan: newSpan });
                                          };
                                          const handleUp = () => {
                                            window.removeEventListener('pointermove', handleMove);
                                            window.removeEventListener('pointerup', handleUp);
                                          };
                                          window.addEventListener('pointermove', handleMove);
                                          window.addEventListener('pointerup', handleUp);
                                        }}
                                        className="absolute top-0 left-0 w-2 h-full cursor-ew-resize group-hover/field:opacity-100 opacity-0 transition-opacity z-30 flex items-center"
                                      >
                                        <div className="w-1 h-8 bg-indigo-500/50 rounded-full ml-0.5" />
                                      </div>
                                      <div 
                                        onPointerDown={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          const startX = e.clientX;
                                          const startSpan = block.colSpan || 12;
                                          const startCol = block.startCol || 1;
                                          const handleMove = (me: PointerEvent) => {
                                            const canvas = document.querySelector('.grid-canvas-container');
                                            if (!canvas) return;
                                            const rect = canvas.getBoundingClientRect();
                                            const colWidth = (rect.width - 64) / 12;
                                            const deltaCols = Math.round((me.clientX - startX) / colWidth);
                                            const newSpan = Math.max(1, Math.min(12, startSpan + deltaCols));
                                            const finalSpan = Math.min(newSpan, 13 - startCol);
                                            updateField(block.id, { colSpan: finalSpan });
                                          };
                                          const handleUp = () => {
                                            window.removeEventListener('pointermove', handleMove);
                                            window.removeEventListener('pointerup', handleUp);
                                          };
                                          window.addEventListener('pointermove', handleMove);
                                          window.addEventListener('pointerup', handleUp);
                                        }}
                                        className="absolute top-0 right-0 w-2 h-full cursor-ew-resize group-hover/field:opacity-100 opacity-0 transition-opacity z-30 flex items-center justify-end"
                                      >
                                        <div className="w-1 h-8 bg-indigo-500/50 rounded-full mr-0.5" />
                                      </div>
                                    </>
                                  )}
                                  </div>

                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setLayout(prev => removeFieldRecursive(prev, block.id));
                                      if (selectedId === block.id) setSelectedId(null);
                                    }}
                                    className="absolute -top-2 -right-2 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/field:opacity-100 transition-opacity shadow-lg z-20"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </motion.div>
                              );
                            });
                          };

                          return renderFieldBlocks(layout);
                        })()}

                    </AnimatePresence>

                    {layout.filter(block => block.tabId === currentTabId || (!block.tabId && currentTabId === tabs[0]?.id)).length === 0 && !dragOverInfo && (
                      <div className="col-span-full h-64 flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[32px] bg-white dark:bg-zinc-950/50">
                        <GridIcon size={48} className="mb-4 text-zinc-200 dark:text-zinc-800" />
                        <p className="font-medium text-sm text-zinc-500">Drag fields from the sidebar to start building</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : activeTab === 'preview' ? (
            <div className="w-full px-8">
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
                  <div className={cn(
                    "grid gap-8 transition-all duration-500",
                    "grid-cols-1",
                    viewportSize !== 'mobile' && "md:grid-cols-12"
                  )}>
                    {layout
                      .filter(block => block.tabId === currentTabId || (!block.tabId && currentTabId === tabs[0]?.id))
                      .map((block) => (
                      <div 
                        key={block.id} 
                        style={{ 
                          gridColumn: viewportSize === 'mobile' ? 'span 1' : `${block.startCol || 1} / span ${block.colSpan || 12}`
                        }}
                        className="space-y-2.5"
                      >
                        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest px-1">
                          {block.label}
                        </label>
                        <input 
                          type={block.type}
                          placeholder={block.placeholder}
                          value={moduleState[block.id] || ''}
                          onChange={(e) => setModuleState(prev => ({ ...prev, [block.id]: e.target.value }))}
                          className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                        />
                      </div>
                    ))}
                  </div>
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
            <div className="flex h-full w-full overflow-hidden">
              {/* Settings Sidebar */}
              <aside className="w-72 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-2">
                <div className="mb-6 px-2">
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Configuration</h3>
                </div>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold transition-all">
                  <Settings2 size={14} />
                  General Properties
                </button>
              </aside>

              {/* Settings Content */}
              <div className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950 p-12 custom-scrollbar">
                <div className="max-w-3xl mx-auto space-y-12 pb-20">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Module Settings</h2>
                    <p className="text-zinc-500 text-sm">Configure the core properties and identity of this module.</p>
                  </div>
                  
                  <div className="grid gap-10">
                    {/* Identity Section */}
                    <section className="space-y-6">
                      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                        <div className="w-1 h-3 bg-indigo-500 rounded-full" />
                        <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Module Identity</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Module Name</label>
                          <input 
                            type="text" 
                            value={moduleSettings.name}
                            onChange={(e) => setModuleSettings(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                            placeholder="e.g. Grant Applications"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Category</label>
                          <input 
                            type="text" 
                            value={moduleSettings.category}
                            onChange={(e) => setModuleSettings(prev => ({ ...prev, category: e.target.value }))}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                            placeholder="e.g. Operations"
                          />
                        </div>
                      </div>
                    </section>

                    {/* Classification Section */}
                    <section className="space-y-6">
                      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                        <div className="w-1 h-3 bg-indigo-500 rounded-full" />
                        <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Classification</h3>
                      </div>
                      
                      <div className="space-y-4">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Module Type</label>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          {(['RECORD', 'WORK_ITEM', 'REGISTRY', 'LOG', 'FINANCIAL'] as ModuleType[]).map((type) => (
                            <button
                              key={type}
                              onClick={() => setModuleSettings(prev => ({ ...prev, type }))}
                              className={cn(
                                "px-3 py-2.5 rounded-xl border text-[9px] font-bold transition-all uppercase tracking-widest",
                                moduleSettings.type === type
                                  ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
                              )}
                            >
                              {type.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                      </div>
                    </section>

                    {/* Metadata Section */}
                    <section className="space-y-6">
                      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                        <div className="w-1 h-3 bg-indigo-500 rounded-full" />
                        <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Appearance & Description</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-6">
                        <IconPicker 
                          label="Module Icon"
                          value={moduleSettings.iconName || 'Box'}
                          onChange={(iconName) => setModuleSettings(prev => ({ ...prev, iconName }))}
                        />

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Description</label>
                          <textarea 
                            value={moduleSettings.description}
                            onChange={(e) => setModuleSettings(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all min-h-[120px] resize-none"
                            placeholder="Brief description of what this module does..."
                          />
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'workflow' ? (
            <div className="w-full h-full">
              <WorkflowGraphEditor 
                workflow={workflow}
                onChange={setWorkflow}
                showDebugger={showDebugger}
                setShowDebugger={setShowDebugger}
                selectedNodeId={selectedNodeId}
                onNodeSelect={setSelectedNodeId}
                selectedEdgeId={selectedEdgeId}
                onEdgeSelect={setSelectedEdgeId}
                rightSidebarTab={rightSidebarTabWorkflow}
                setRightSidebarTab={setRightSidebarTabWorkflow}
              />
            </div>
          ) : null}
        </main>

        {/* Right Sidebar - Dual Mode */}
        {activeTab === 'build' && (
          <aside className="w-85 flex-shrink-0 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col overflow-hidden">
            {/* Mode Switcher */}
            <div className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center p-1 bg-zinc-50/50 dark:bg-transparent">
              <div className="flex-1 grid grid-cols-2 gap-1 h-full">
                <button 
                  onClick={() => setRightSidebarTab('inspector')}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                    rightSidebarTab === 'inspector' 
                      ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-zinc-200 dark:border-zinc-800" 
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  <Settings2 size={12} />
                  Inspector
                </button>
                <button 
                  onClick={() => setRightSidebarTab('architect')}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                    rightSidebarTab === 'architect' 
                      ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-zinc-200 dark:border-zinc-800" 
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  <Sparkles size={12} />
                  Architect
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {rightSidebarTab === 'inspector' ? (
                <AnimatePresence mode="wait">
                  {selectedField ? (
                    <motion.div 
                      key={selectedField.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="p-6 space-y-8"
                    >
                      {/* Header with Close */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                          <h3 className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-widest">
                            {selectedField.type.replace('_', ' ')} Properties
                          </h3>
                        </div>
                        <button 
                          onClick={() => setSelectedId(null)}
                          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-500 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
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

                      </div>

                      {/* Grid Position Controls */}
                      <div className="space-y-6 pt-6 border-t border-zinc-100 dark:border-zinc-900">
                        <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">Grid Layout</h4>
                        
                        <div className="space-y-5">
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between px-1">
                              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Column Span</label>
                              <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md border border-indigo-500/20">{selectedField.colSpan || 12} Columns</span>
                            </div>
                            <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 flex items-center">
                              <input 
                                type="range" 
                                min="1" 
                                max="12" 
                                step="1"
                                value={selectedField.colSpan || 12}
                                onChange={(e) => updateField(selectedField.id, { colSpan: parseInt(e.target.value) })}
                                className="w-full accent-indigo-600 cursor-pointer h-1.5"
                              />
                            </div>
                          </div>

                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between px-1">
                              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Start Column</label>
                              <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md border border-indigo-500/20">Column {selectedField.startCol || 1}</span>
                            </div>
                            <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 flex items-center">
                              <input 
                                type="range" 
                                min="1" 
                                max="12" 
                                step="1"
                                value={selectedField.startCol || 1}
                                onChange={(e) => updateField(selectedField.id, { startCol: parseInt(e.target.value) })}
                                className="w-full accent-indigo-600 cursor-pointer h-1.5"
                              />
                            </div>
                          </div>
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

                      {(selectedField.type === 'fieldGroup' || selectedField.type === 'repeatableGroup' || selectedField.type === 'group') && (
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
                                    {FIELD_CATEGORIES.flatMap(c => c.fields).filter(f => f.id !== 'fieldGroup' && f.id !== 'repeatableGroup' && f.id !== 'group').map(f => (
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
                        <div className="space-y-4">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Calculation Logic</label>
                          <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-500">
                                <Calculator size={14} />
                              </div>
                              <div className="flex-1">
                                <p className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-tight">Active Formula</p>
                                <p className="text-[9px] text-zinc-500 truncate font-mono">{selectedField.calculationLogic || 'No logic defined'}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => setEditingCalculation({
                                targetId: selectedField.id,
                                logic: selectedField.calculationLogic,
                                triggers: selectedField.calculationTriggers
                              })}
                              className="w-full py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[10px] font-bold text-indigo-500 hover:bg-indigo-500/5 transition-all uppercase tracking-widest"
                            >
                              Configure Logic
                            </button>
                          </div>
                          <p className="text-[9px] text-zinc-600 italic px-1">Complex mathematical and logical operations.</p>
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

                      <div className="pt-6 border-t border-zinc-100 dark:border-zinc-900">
                        <VisibilityRuleEditor 
                          rule={selectedField.visibilityRule}
                          onEdit={() => setEditingCondition({
                            targetId: selectedField.id,
                            targetType: 'field',
                            rule: migrateVisibilityRule(selectedField.visibilityRule)
                          })}
                          onRemove={() => updateField(selectedField.id, { visibilityRule: undefined })}
                          label="Conditional Visibility"
                        />
                      </div>
                    </div>

                    <div className="pt-12">
                      <button 
                        onClick={() => {
                          if (selectedField) {
                            deleteBlock(selectedField.id);
                            setSelectedId(null);
                          }
                        }}
                        className="w-full py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] font-bold text-rose-500 hover:bg-rose-500 hover:text-white transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        <Trash2 size={12} />
                        <span>Delete Field</span>
                      </button>
                    </div>
                  </motion.div>
                ) : selectedTab ? (
                  <motion.div 
                    key={selectedTab.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="p-6 space-y-8"
                  >
                    {/* Header with Close */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                        <h3 className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-widest">
                          Tab Properties
                        </h3>
                      </div>
                      <button 
                        onClick={() => setSelectedId(null)}
                        className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Tab Label</label>
                        <input 
                          type="text" 
                          value={selectedTab.label}
                          onChange={(e) => updateTab(selectedTab.id, { label: e.target.value })}
                          className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                          placeholder="e.g. General"
                        />
                      </div>

                      <div className="pt-6 border-t border-zinc-100 dark:border-zinc-900">
                        <VisibilityRuleEditor 
                          rule={selectedTab.visibilityRule}
                          onEdit={() => setEditingCondition({
                            targetId: selectedTab.id,
                            targetType: 'tab',
                            rule: migrateVisibilityRule(selectedTab.visibilityRule)
                          })}
                          onRemove={() => updateTab(selectedTab.id, { visibilityRule: undefined })}
                          label="Tab Visibility Rule"
                        />
                      </div>
                    </div>

                    <div className="pt-12">
                      <button 
                        onClick={() => {
                          if (tabs.length > 1) {
                            const newTabs = tabs.filter(t => t.id !== selectedTab.id);
                            setTabs(newTabs);
                            if (currentTabId === selectedTab.id) setCurrentTabId(newTabs[0].id);
                            setLayout(layout.filter(field => field.tabId !== selectedTab.id));
                            setSelectedId(null);
                          } else {
                            toast.error("Cannot delete the last remaining tab");
                          }
                        }}
                        className="w-full py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] font-bold text-rose-500 hover:bg-rose-500 hover:text-white transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        <Trash2 size={12} />
                        <span>Delete Tab</span>
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
            ) : (
              /* Shadow Architect Panel */
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col h-full overflow-hidden"
              >
                {/* Agent Status */}
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-transparent">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <BrainCircuit size={20} className="text-white" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-zinc-950 rounded-full" />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-zinc-900 dark:text-white uppercase tracking-widest">Shadow Architect</h4>
                      <p className="text-[9px] text-zinc-500 font-medium">L4 Design Intelligence Active</p>
                    </div>
                  </div>
                </div>

                {/* Suggestions Chips */}
                <div className="px-6 py-4 flex gap-2 overflow-x-auto no-scrollbar border-b border-zinc-100 dark:border-zinc-900">
                  {[
                    { label: 'Optimize Layout', icon: Grid3X3, cmd: 'Optimize the current layout for better readability' },
                    { label: 'Add Logic', icon: Calculator, cmd: 'Suggest some logic or calculations for this module' },
                    { label: 'Styling Audit', icon: Palette, cmd: 'Perform a styling and alignment audit' }
                  ].map((s, i) => (
                    <button 
                      key={i}
                      onClick={() => handleArchitectCommand(s.cmd)}
                      className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-[9px] font-bold text-zinc-600 dark:text-zinc-400 hover:border-indigo-500/50 hover:text-indigo-600 transition-all uppercase tracking-widest"
                    >
                      <s.icon size={10} />
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {architectMessages.map((msg, i) => (
                    <div key={i} className={cn(
                      "flex flex-col gap-2 max-w-[85%]",
                      msg.role === 'user' ? "ml-auto items-end" : "items-start"
                    )}>
                      <div className={cn(
                        "px-4 py-3 rounded-2xl text-[11px] leading-relaxed",
                        msg.role === 'user' 
                          ? "bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-500/10" 
                          : "bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-tl-none border border-zinc-200 dark:border-zinc-800"
                      )}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isArchitectThinking && (
                    <div className="flex items-center gap-2 text-zinc-400">
                      <div className="flex gap-1">
                        <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce" />
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-widest">Architect is thinking...</span>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-6 border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-transparent">
                  <div className="relative">
                    <input 
                      type="text" 
                      value={architectInput}
                      onChange={(e) => setArchitectInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleArchitectCommand(architectInput);
                        }
                      }}
                      placeholder="Ask the architect..."
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-4 pr-10 py-3 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
                    />
                    <button 
                      onClick={() => handleArchitectCommand(architectInput)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all"
                    >
                      <ArrowUp size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
            </div>
          </aside>
        )}

        {/* Condition Modal */}
        <ConditionModal 
          isOpen={!!editingCondition}
          onClose={() => setEditingCondition(null)}
          onSave={(rule) => {
            if (editingCondition) {
              if (editingCondition.targetType === 'field') {
                updateField(editingCondition.targetId, { visibilityRule: rule });
              } else {
                updateTab(editingCondition.targetId, { visibilityRule: rule });
              }
            }
            setEditingCondition(null);
          }}
          initialRule={editingCondition?.rule}
          availableFields={layout.filter(f => f.id !== editingCondition?.targetId)}
          targetLabel={
            editingCondition?.targetType === 'field' 
              ? (layout.find(f => f.id === editingCondition?.targetId)?.label || 'Field')
              : (tabs.find(t => t.id === editingCondition?.targetId)?.label || 'Tab')
          }
        />

        {/* Calculator Modal */}
        <CalculatorModal 
          isOpen={!!editingCalculation}
          onClose={() => setEditingCalculation(null)}
          onSave={(logic, triggers) => {
            if (editingCalculation) {
              updateField(editingCalculation.targetId, { 
                calculationLogic: logic,
                calculationTriggers: triggers
              });
            }
            setEditingCalculation(null);
          }}
          initialLogic={editingCalculation?.logic}
          initialTriggers={editingCalculation?.triggers}
          availableFields={layout.filter(f => f.id !== editingCalculation?.targetId)}
          relatedFields={relatedModulesMap}
          allModules={modules}
          targetLabel={layout.find(f => f.id === editingCalculation?.targetId)?.label || 'Calculation'}
        />

        {/* Command Palette */}
        <CommandPalette 
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onSelectBlock={(type) => {
            const newField = createField(type as FieldType);
            setLayout([...layout, newField]);
          }}
          onAction={(action) => {
            if (action === 'preview') setActiveTab('preview');
            if (action === 'settings') setActiveTab('settings');
            if (action === 'save') handleSave();
          }}
        />
      </div>
    </div>
  );
};

export default ModuleEditor;
