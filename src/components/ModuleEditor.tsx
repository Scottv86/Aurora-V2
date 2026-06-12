import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Save, 
  Eye, 
  EyeOff,
  Search, 
  Users,
  Trash2, 
  Settings2,
  Settings,
  Plus, 
  Layers,
  Sparkles,
  Loader2,
  Monitor,
  Tablet,
  Smartphone,
  Layout,
  Layout as GridIcon,
  Columns,
  Sidebar,
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
  ArrowDown,
  X,
  Bug,
  Database,
  FileText,
  Upload,
  Radio,
  ToggleRight,
  Sliders,
  Clock,
  MousePointer2,
  Box,
  Smile,
  ExternalLink,
  CreditCard,
  FileJson,
  Table,
  ListOrdered,
  GitCommit,
  ArrowRightLeft,
  TreePalm,
  PenTool,
  MapPin,
  Code,
  Wand2,
  QrCode,
  Brush,
  MessageSquare,
  FolderTree,
  Star,
  Activity,
  Tag,
  Video,
  Music,
  Zap,
  Lock,
  ShieldCheck,
  FileCode,
  Rocket,
  HelpCircle,
  Globe,
  Webhook,
  ClipboardList,
  History,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  TableProperties,
  ArrowRight,
  Check,
  Command,
  Info,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Copy,
  Key,
  Edit2
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { WorkflowGraphEditor } from './Builder/Workflow/GraphEditor';
import { Workflow, FieldType, Tab, VisibilityRule } from '../types/platform';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useParams, useNavigate } from 'react-router-dom';
import { CommandPalette } from './CommandPalette';
import { cn, calculateHeight, flattenFields, isFieldVisible, isContainerField } from '../lib/utils';
import { compactLayout } from '../lib/layoutEngine';
import { usePlatform } from '../hooks/usePlatform';
import { useAuth } from '../hooks/useAuth';
import { useGlobalLists } from '../hooks/useGlobalList';
import { useTeams } from '../hooks/useTeams';
import { usePositions } from '../hooks/usePositions';
import { usePermissionGroups } from '../hooks/usePermissionGroups';
import { toast } from 'sonner';
import { DATA_API_URL, API_BASE_URL } from '../config';
import { ModuleType } from '../types/platform';
import { MODULES, MODULE_CATEGORIES } from '../constants/modules';
import { PLATFORM_MODULES } from '../constants/platformModules';
import { FieldGroup } from './Builder/FieldGroup';
import { useGridEngine } from '../hooks/useGridEngine';
import { IconPicker } from './Common/IconPicker';
import { ConditionModal } from './Builder/ConditionModal';
import { CalculatorModal } from './Builder/CalculatorModal';
import { FieldInput } from './FieldInput';
import { NexusSelectionModal } from './Builder/NexusSelectionModal';
import { ConnectorConfigDrawer } from './Builder/ConnectorConfigDrawer';
import { DynamicIcon } from './UI/DynamicIcon';
import { FieldSelectorModal } from './Builder/FieldSelectorModal';
import { SubmoduleSetupModal } from './Builder/SubmoduleSetupModal';
import { ValidationRule } from '../lib/validationEngine';
import { generateExpression } from '../services/aiService';
import { ValidationRuleModal } from './Builder/ValidationRuleModal';

const METADATA_FIELDS = [
  { id: 'createdAt', label: 'Created Date', type: 'date', tabId: 'metadata' },
  { id: 'createdBy', label: 'Creation User', type: 'user', tabId: 'metadata' },
  { id: '_record_key', label: 'Record Key', type: 'text', tabId: 'metadata' },
];

// --- Grid Constants ---
export const GRID_CONFIG = {
  rowHeight: 50,
  gap: 20,
  padding: 32,
  nestedPadding: 12, // Match p-3 in FieldGroup
  cols: 12
};

// --- Mock Sub-module Renderer ---
const renderSubmoduleMock = (block: any) => {
  const variant = block.variant || 'table';
  
  return (
    <div className="pt-2 flex-1 flex flex-col justify-between">
      <div className="bg-white/5 dark:bg-zinc-950/20 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] overflow-hidden shadow-inner w-full flex flex-col flex-1">
        {/* Inner Toolbar */}
        <div className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4 select-none shrink-0">
          <div className="flex-1 max-w-[140px] relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" size={12} />
            <input 
              type="text"
              placeholder={`Search ${block.label || 'Sub-module'}...`}
              disabled
              className="w-full bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-lg pl-7 pr-2 py-0.5 text-[9px] text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[9px] font-bold text-zinc-550 dark:text-zinc-450 cursor-not-allowed">
              <Search size={10} />
              <span>Link Existing</span>
            </div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-600 text-white rounded-lg text-[9px] font-bold cursor-not-allowed">
              <Plus size={10} />
              <span>Add Record</span>
            </div>
          </div>
        </div>

        {variant === 'cards' ? (
          <div className="p-4 grid grid-cols-2 gap-3 overflow-y-auto flex-1 scrollbar-hide min-h-[95px]">
            {[1, 2].map(i => (
              <div key={i} className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col justify-between gap-1 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">REC-00{i}</span>
                  <span className="px-1 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[6px] font-bold border border-indigo-500/20">Active</span>
                </div>
                <h5 className="text-[9px] font-bold text-zinc-900 dark:text-white truncate">Example Record Item {i === 1 ? 'A' : 'B'}</h5>
                <div className="h-0.5 w-1/2 bg-zinc-100 dark:bg-zinc-855 rounded-full mt-1" />
              </div>
            ))}
          </div>
        ) : variant === 'list' ? (
          <div className="p-3 space-y-2 overflow-y-auto flex-1 scrollbar-hide min-h-[95px]">
            {[1, 2].map(i => (
              <div key={i} className="p-2.5 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[8px] font-black text-indigo-500 shrink-0">REC-00{i}</span>
                  <h5 className="text-[9px] font-bold text-zinc-900 dark:text-white truncate">{i === 1 ? 'Example Associated Record A' : 'Example Associated Record B'}</h5>
                </div>
                <span className="px-1 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[6px] font-bold border border-indigo-500/20 shrink-0">Active</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 scrollbar-hide min-h-[90px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/50 dark:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">Key</th>
                  <th className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">Name</th>
                  <th className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">Status</th>
                  <th className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">Created</th>
                  <th className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
                {[1, 2].map(i => (
                  <tr key={i} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10">
                    <td className="px-4 py-1.5 text-[10px] font-bold text-indigo-500">REC-00{i}</td>
                    <td className="px-4 py-1.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-400 truncate max-w-[120px]">
                      {i === 1 ? 'Example Associated Record A' : 'Example Associated Record B'}
                    </td>
                    <td className="px-4 py-1.5">
                      <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[8px] font-bold border border-indigo-500/20">Active</span>
                    </td>
                    <td className="px-4 py-1.5 text-[9px] text-zinc-550 dark:text-zinc-500">5/25/2026</td>
                    <td className="px-4 py-1.5 text-right">
                      <div className="flex justify-end gap-1 opacity-60">
                        <div className="p-0.5 text-zinc-400 rounded"><Eye size={10} /></div>
                        <div className="p-0.5 text-zinc-400 rounded"><Edit2 size={10} /></div>
                        <div className="p-0.5 text-zinc-400 rounded"><Trash2 size={10} /></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};


// --- Filter Builder Component ---
const FilterBuilder = ({ field, updateField, modules, teams, positions, permissionGroups }: any) => {
  const { lookupSource, platformEntity, targetModuleId, targetPlatformModuleId, lookupFilters = [], userFilters } = field;
  
  // Backward compatibility migration
  const activeFilters = lookupFilters.length > 0 ? lookupFilters : (userFilters || []);

  // Determine available fields for filtering
  let availableFields: { id: string, label: string, type?: string, options?: any[] }[] = [];
  
  if ((lookupSource === 'module_records' || !lookupSource) && targetModuleId) {
    const targetMod = modules.find((m: any) => m.id === targetModuleId);
    if (targetMod) {
      availableFields = (targetMod.layout || []).map((f: any) => ({ id: f.id, label: f.label, type: f.type, options: f.options }));
    }
  } else if (lookupSource === 'platform' && platformEntity === 'modules' && targetPlatformModuleId) {
    const targetMod = PLATFORM_MODULES.find((m: any) => m.id === targetPlatformModuleId);
    if (targetMod) {
      availableFields = targetMod.availableFields;
    }
  } else if (lookupSource === 'tenant_users' || (lookupSource === 'platform' && platformEntity === 'users')) {
    availableFields = [
      { id: 'roleId', label: 'Role', type: 'select', options: (permissionGroups || []).map((g: any) => ({ value: g.id, label: g.name })) },
      { id: 'teamId', label: 'Team', type: 'select', options: (teams || []).map((t: any) => ({ value: t.id, label: t.name })) },
      { id: 'positionId', label: 'Position', type: 'select', options: (positions || []).map((p: any) => ({ value: p.id, label: p.title })) },
      { id: 'status', label: 'Status', type: 'select', options: [{ value: 'Active', label: 'Active' }, { value: 'Pending', label: 'Pending' }, { value: 'Inactive', label: 'Inactive' }] },
      { id: 'isSynthetic', label: 'Member Type', type: 'select', options: [{ value: 'false', label: 'Human' }, { value: 'true', label: 'AI Agent' }] },
      { id: 'isContractor', label: 'Contractor Status', type: 'select', options: [{ value: 'false', label: 'Full-time Employee' }, { value: 'true', label: 'Contractor' }] }
    ];
  } else if (lookupSource === 'global_list' && field.globalListId) {
     availableFields = [{ id: 'value', label: 'List Value', type: 'text' }];
  }

  const addFilter = () => {
    const newFilters = [...activeFilters, { id: Math.random().toString(36).substr(2, 9), field: availableFields[0]?.id || '', operator: 'equals', value: '' }];
    updateField(field.id, { lookupFilters: newFilters, userFilters: undefined });
  };

  const removeFilter = (id: string) => {
    const newFilters = activeFilters.filter((f: any) => f.id !== id);
    updateField(field.id, { lookupFilters: newFilters, userFilters: undefined });
  };

  const updateFilter = (id: string, updates: any) => {
    const newFilters = activeFilters.map((f: any) => f.id === id ? { ...f, ...updates } : f);
    updateField(field.id, { lookupFilters: newFilters, userFilters: undefined });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Lookup Filters</label>
        <button 
          onClick={addFilter}
          className="flex items-center gap-1 text-[9px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-600 transition-colors"
        >
          <Plus size={10} />
          Add Rule
        </button>
      </div>

      {activeFilters.length === 0 ? (
        <div className="p-4 bg-indigo-500/5 border border-dashed border-indigo-500/20 rounded-2xl">
          <p className="text-[9px] text-zinc-500 leading-relaxed italic text-center">
            No filters applied. All records will be returned.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeFilters.map((filter: any) => {
            const fieldDef = availableFields.find(f => f.id === filter.field);
            return (
              <div key={filter.id} className="p-3 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl space-y-2 relative group">
                <button 
                  onClick={() => removeFilter(filter.id)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-rose-500 shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X size={10} />
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <select 
                    value={filter.field}
                    onChange={(e) => updateFilter(filter.id, { field: e.target.value, value: '' })}
                    className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-lg px-2 py-1.5 text-[10px] text-zinc-900 dark:text-white focus:outline-none"
                  >
                    <option value="">Select Field...</option>
                    {availableFields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>

                  <select 
                    value={filter.operator}
                    onChange={(e) => updateFilter(filter.id, { operator: e.target.value })}
                    className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-lg px-2 py-1.5 text-[10px] text-zinc-900 dark:text-white focus:outline-none"
                  >
                    <option value="equals">Is</option>
                    <option value="not_equals">Is Not</option>
                    <option value="contains">Contains</option>
                    <option value="greater_than">Greater Than</option>
                    <option value="less_than">Less Than</option>
                    <option value="is_empty">Is Empty</option>
                    <option value="not_empty">Is Not Empty</option>
                  </select>
                </div>

                {!['is_empty', 'not_empty'].includes(filter.operator) && (
                  <>
                    {fieldDef?.type === 'select' || fieldDef?.options ? (
                      <select 
                        value={filter.value}
                        onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-lg px-2 py-1.5 text-[10px] text-zinc-900 dark:text-white focus:outline-none"
                      >
                        <option value="">Select Value...</option>
                        {fieldDef.options?.map((opt: any) => (
                          typeof opt === 'string' 
                            ? <option key={opt} value={opt}>{opt}</option>
                            : <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        type={fieldDef?.type === 'number' ? 'number' : 'text'}
                        value={filter.value}
                        onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                        placeholder="Enter value..."
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-lg px-2 py-1.5 text-[10px] text-zinc-900 dark:text-white focus:outline-none"
                      />
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// --- Connection Visualizer Component ---
const ConnectionLine = ({ hoveredMapping, containerRef }: { 
  hoveredMapping: { connectorId: string, sourceOutput: string, targetFieldId: string } | null, 
  containerRef: React.RefObject<HTMLDivElement> 
}) => {
  const [path, setPath] = useState<string>("");

  useEffect(() => {
    if (!hoveredMapping || !containerRef.current) {
      setPath("");
      return;
    }

    const updatePath = () => {
      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const sourceId = `output-${hoveredMapping.connectorId}-${hoveredMapping.sourceOutput}`;
      const targetId = `canvas-field-${hoveredMapping.targetFieldId}`;

      const sourceEl = document.getElementById(sourceId);
      const targetEl = document.getElementById(targetId);

      if (!sourceEl || !targetEl) return;

      const sourceRect = sourceEl.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();

      // Calculate relative coordinates
      // Source point (Right edge of the mapping row)
      const x1 = sourceRect.right - containerRect.left;
      const y1 = sourceRect.top + (sourceRect.height / 2) - containerRect.top;

      // Target point (Left edge of the field container)
      const x2 = targetRect.left - containerRect.left;
      const y2 = targetRect.top + (targetRect.height / 2) - containerRect.top;

      // Control points for a smooth Bezier curve
      const dx = Math.abs(x2 - x1);
      const cx1 = x1 + (dx * 0.4);
      const cy1 = y1;
      const cx2 = x2 - (dx * 0.4);
      const cy2 = y2;

      setPath(`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`);
    };

    updatePath();
    
    // Update on scroll or resize within the container
    const scrollContainer = containerRef.current.parentElement;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', updatePath);
    }
    window.addEventListener('resize', updatePath);
    
    // Animation frame for smooth tracking during drags/transitions
    let rafId: number;
    const animate = () => {
      updatePath();
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);

    return () => {
      if (scrollContainer) scrollContainer.removeEventListener('scroll', updatePath);
      window.removeEventListener('resize', updatePath);
      cancelAnimationFrame(rafId);
    };
  }, [hoveredMapping, containerRef]);

  if (!path) return null;

  return (
    <svg 
      className="absolute inset-0 pointer-events-none z-[100]" 
      style={{ width: '100%', height: '100%', overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="1" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      
      {/* Background Shadow Line */}
      <motion.path
        d={path}
        stroke="rgba(99, 102, 241, 0.1)"
        strokeWidth="12"
        fill="transparent"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      
      {/* Main Connection Path */}
      <motion.path
        d={path}
        stroke="url(#line-gradient)"
        strokeWidth="4"
        fill="transparent"
        strokeLinecap="round"
        filter="url(#glow)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
      
      {/* Animated Dash Overlay */}
      <motion.path
        d={path}
        stroke="white"
        strokeWidth="2"
        strokeDasharray="8, 16"
        fill="transparent"
        strokeLinecap="round"
        initial={{ strokeDashoffset: 0, opacity: 0 }}
        animate={{ strokeDashoffset: -100, opacity: 0.4 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Source Point Dot */}
      <motion.circle
        cx={path.split(' ')[1]}
        cy={path.split(' ')[2]}
        r="4"
        fill="#6366f1"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
      />
      
      {/* Target Point Dot */}
      <motion.circle
        cx={path.split(', ').pop()?.split(' ')[0]}
        cy={path.split(', ').pop()?.split(' ')[1]}
        r="6"
        fill="#818cf8"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        style={{ filter: 'drop-shadow(0 0 8px #818cf8)' }}
      />
    </svg>
  );
};


// --- Types ---



export interface UserFilter {
  id: string;
  field: 'roleId' | 'teamId' | 'positionId' | 'status' | 'isSynthetic' | 'isContractor';
  operator: 'equals' | 'not_equals';
  value: string;
}

export interface LookupFilter {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'not_empty';
  value: any;
}

export interface Field {
  id: string;
  name?: string;
  isNameManuallyEdited?: boolean;
  type: FieldType;
  label: string;
  placeholder?: string;
  helperText?: string;
  tooltip?: string;
  defaultValue?: any;
  required?: boolean;
  // Specific settings
  currencySymbol?: string;
  options?: string[];
  optionsSource?: 'manual' | 'global_list';
  globalListId?: string;
  calculationLogic?: string;
  calculationTriggers?: string[];
  targetModuleId?: string;
  targetPlatformModuleId?: string;
  lookupSource?: 'module_records' | 'global_list' | 'tenant_users' | 'platform' | 'connector';
  platformEntity?: 'users' | 'teams' | 'roles' | 'security_groups' | 'modules' | 'records';
  lookupFilters?: LookupFilter[];
  lookupDisplayField?: string;
  lookupOutputMappings?: { id: string; sourceFieldId: string; targetFieldId: string }[];
  // For nested fields (fieldGroup, repeatableGroup)
  fields?: Field[];
  visibilityRule?: VisibilityRule;
  colSpan?: number;
  startCol?: number;
  rowIndex?: number;
  rowSpan?: number;
  tabId?: string;
  // Component specific
  min?: number;
  max?: number;
  variant?: string;
  density?: 'compact' | 'standard' | 'spacious';
  action?: string;
  iconName?: string;
  showIcon?: boolean;
  icon?: any;
  detailViewMode?: 'page' | 'modal';
  detailLayoutType?: 'tabs' | 'split' | 'sidebar' | 'process' | 'accordion';
  // Auto-number settings
  autonumberPrefix?: string;
  autonumberSuffix?: string;
  autonumberStart?: number;
  autonumberDigits?: number;
  // Connector settings
  connectorId?: string;
  // View settings
  showInTable?: boolean;
  inlineEdit?: boolean;
  columnWidth?: number;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  isCollapsed?: boolean;
  hidden?: boolean;
  optionLayout?: 'vertical' | 'horizontal';
  parentId?: string;
  // Date/Time specific settings
  dateFormat?: string;
  timeFormat?: '12h' | '24h';
  minuteStep?: number;
  excludeWeekends?: boolean;
  defaultType?: 'static' | 'today' | 'now' | 'rounded_now' | 'relative' | 'field_copy' | 'start_of_week' | 'end_of_week' | 'start_of_month' | 'end_of_month' | 'start_of_year' | 'end_of_year';
  defaultOffset?: number;
  defaultOffsetUnit?: 'minutes' | 'hours' | 'days' | 'business_days' | 'months' | 'years';
  defaultRounding?: number;
  defaultSourceFieldId?: string;
  minDateType?: 'none' | 'static' | 'today' | 'now' | 'relative' | 'field_value';
  minDateValue?: string;
  minDateOffset?: number;
  minDateOffsetUnit?: 'minutes' | 'hours' | 'days' | 'business_days' | 'months';
  minDateFieldId?: string;
  maxDateType?: 'none' | 'static' | 'today' | 'now' | 'relative' | 'field_value';
  maxDateValue?: string;
  maxDateOffset?: number;
  maxDateOffsetUnit?: 'minutes' | 'hours' | 'days' | 'business_days' | 'months';
  maxDateFieldId?: string;
  // Calculation formatting
  showAsCurrency?: boolean;
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
      { id: 'longText', label: 'Long Text', icon: AlignLeft, defaultSpan: 6 },
      { id: 'number', label: 'Number', icon: Hash, defaultSpan: 6 },
      { id: 'currency', label: 'Currency', icon: DollarSign, defaultSpan: 6 },
      { id: 'date', label: 'Date Picker', icon: Calendar, defaultSpan: 6 },
      { id: 'time', label: 'Time Picker', icon: Clock, defaultSpan: 6 },
      { id: 'select', label: 'Dropdown', icon: ListFilter, defaultSpan: 6 },
      { id: 'radio', label: 'Radio Buttons', icon: Radio, defaultSpan: 6 },
      { id: 'checkboxGroup', label: 'Checkbox Group', icon: ListPlus, defaultSpan: 6 },
      { id: 'checkbox', label: 'Single Checkbox', icon: CheckSquare, defaultSpan: 6 },
      { id: 'toggle', label: 'Switch / Toggle', icon: ToggleRight, defaultSpan: 6 },
      { id: 'slider', label: 'Range Slider', icon: Sliders, defaultSpan: 6 },
      { id: 'rating', label: 'Star Rating', icon: Star, defaultSpan: 6 },
      { id: 'colorpicker', label: 'Color Picker', icon: Palette, defaultSpan: 6 },
      { id: 'tag', label: 'Tag Input', icon: Tag, defaultSpan: 6 },
    ]
  },
  {
    id: 'actions',
    label: 'Actions & Tools',
    fields: [
      { id: 'button', label: 'Action Button', icon: MousePointer2, defaultSpan: 6 },
      { id: 'buttonGroup', label: 'Button Group', icon: Layers, defaultSpan: 6 },
      { id: 'signature', label: 'Signature Pad', icon: PenTool, defaultSpan: 6 },
      { id: 'qr_scanner', label: 'QR / Barcode', icon: QrCode, defaultSpan: 6 },
      { id: 'payment', label: 'Payment Control', icon: CreditCard, defaultSpan: 6 },
      { id: 'file', label: 'File Upload', icon: UploadCloud, defaultSpan: 6 },
    ]
  },
  {
    id: 'display',
    label: 'Content & Display',
    fields: [
      { id: 'heading', label: 'Heading', icon: Heading, defaultSpan: 6 },
      { id: 'richtext', label: 'Rich Text / WYSIWYG', icon: FileJson, defaultSpan: 6 },
      { id: 'html', label: 'HTML Block', icon: Code, defaultSpan: 6 },
      { id: 'icon', label: 'Icon Display', icon: Smile, defaultSpan: 6 },
      { id: 'divider', label: 'Divider', icon: Minus, defaultSpan: 6 },
      { id: 'spacer', label: 'Spacer', icon: Maximize2, defaultSpan: 6 },
      { id: 'alert', label: 'Alert Notice', icon: AlertCircle, defaultSpan: 6 },
      { id: 'image', label: 'Image Holder', icon: Image, defaultSpan: 6 },
      { id: 'video', label: 'Video Player', icon: Video, defaultSpan: 6 },
      { id: 'audio', label: 'Audio Player', icon: Music, defaultSpan: 6 },
      { id: 'progress', label: 'Progress Bar', icon: Activity, defaultSpan: 6 },
      { id: 'map', label: 'Map / Geolocation', icon: MapPin, defaultSpan: 6 },
      { id: 'canvas', label: 'Drawing Canvas', icon: Brush, defaultSpan: 6 },
      { id: 'chat', label: 'Chat Stream', icon: MessageSquare, defaultSpan: 6 },
    ]
  },
  {
    id: 'layout',
    label: 'Containers & Layout',
    fields: [
      { id: 'card', label: 'Card Container', icon: Box, defaultSpan: 6 },
      { id: 'accordion', label: 'Accordion', icon: GridIcon, defaultSpan: 6 },
      { id: 'tabs_nested', label: 'Nested Tabs', icon: FolderTree, defaultSpan: 6 },
      { id: 'stepper', label: 'Step Progress', icon: ListOrdered, defaultSpan: 6 },
      { id: 'timeline', label: 'Timeline View', icon: GitCommit, defaultSpan: 6 },
      { id: 'group', label: 'Group Container', icon: Layers, defaultSpan: 6 },
      { id: 'fieldGroup', label: 'Field Section', icon: Folder, defaultSpan: 6 },
      { id: 'repeatableGroup', label: 'Collection', icon: ListPlus, defaultSpan: 6 },
    ]
  },
  {
    id: 'data',
    label: 'Data & Intelligence',
    fields: [
      { id: 'datatable', label: 'Data Table', icon: Table, defaultSpan: 6 },
      { id: 'duallist', label: 'Dual List', icon: ArrowRightLeft, defaultSpan: 6 },
      { id: 'treeview', label: 'Tree View', icon: TreePalm, defaultSpan: 6 },
      { id: 'calculation', label: 'Calculation', icon: Calculator, defaultSpan: 6 },
      { id: 'lookup', label: 'Data Lookup', icon: Search, defaultSpan: 6 },
      { id: 'user', label: 'User Selector', icon: Users, defaultSpan: 6 },
      { id: 'autonumber', label: 'Auto-increment', icon: Hash, defaultSpan: 6 },
      { id: 'connector', label: 'Connector', icon: Zap, defaultSpan: 6 },
      { id: 'automation', label: 'AI Prompt', icon: Sparkles, defaultSpan: 6 },
    ]
  },
  {
    id: 'hierarchical',
    label: 'Hierarchical',
    fields: [
      { id: 'sub_module', label: 'Sub-module', icon: Layers, defaultSpan: 6 },
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
          <div className="h-1 w-1/2 bg-zinc-200 dark:border-zinc-800 rounded-full" />
        </div>
      ) : type === 'image' ? (
        <div className="h-full flex items-center justify-center">
          <Image size={16} className="text-zinc-200 dark:text-zinc-800" />
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
      ) : (type === 'select' || type === 'dropdown' || type === 'lookup' || type === 'user') ? (
        <div className="space-y-1.5">
          <div className="h-1 w-1/4 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
          <div className="h-5 w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md flex items-center justify-between px-2">
            <div className="h-1 w-1/2 bg-zinc-100 dark:bg-zinc-900 rounded-full" />
            <ChevronDown size={10} className="text-zinc-400" />
          </div>
        </div>
      ) : type === 'autonumber' ? (
        <div className="space-y-1.5">
          <div className="h-1 w-1/4 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
          <div className="h-5 w-full bg-zinc-100 dark:bg-zinc-800/50 border border-indigo-500/10 rounded-md flex items-center px-2">
            <div className="h-1.5 w-12 bg-indigo-500/20 rounded-full" />
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
      ) : type === 'time' ? (
        <div className="flex items-center gap-2 h-5 w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-2">
          <Clock size={10} className="text-zinc-400" />
          <div className="h-1 w-1/3 bg-zinc-100 dark:bg-zinc-900 rounded-full" />
        </div>
      ) : (type === 'radio' || type === 'checkboxGroup') ? (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <div className={cn("w-2.5 h-2.5 border border-zinc-300 dark:border-zinc-700", type === 'radio' ? 'rounded-full' : 'rounded-sm')} />
            <div className="h-1 w-8 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
          </div>
          <div className="flex items-center gap-1.5 opacity-50">
            <div className={cn("w-2.5 h-2.5 border border-zinc-300 dark:border-zinc-700", type === 'radio' ? 'rounded-full' : 'rounded-sm')} />
            <div className="h-1 w-6 bg-zinc-100 dark:bg-zinc-900 rounded-full" />
          </div>
        </div>
      ) : type === 'toggle' ? (
        <div className="w-6 h-3 bg-indigo-500/20 border border-indigo-500/30 rounded-full relative">
          <div className="absolute right-0.5 top-0.5 w-2 h-2 bg-indigo-500 rounded-full shadow-sm" />
        </div>
      ) : type === 'slider' ? (
        <div className="relative w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full">
          <div className="absolute left-0 top-0 h-full w-1/2 bg-indigo-500 rounded-full" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white border border-indigo-500 rounded-full shadow-sm" />
        </div>
      ) : type === 'rating' ? (
        <div className="flex gap-0.5">
          {[1, 2, 3].map(i => <Star key={i} size={8} className="text-amber-400 fill-amber-400" />)}
          {[4, 5].map(i => <Star key={i} size={8} className="text-zinc-200 dark:text-zinc-800" />)}
        </div>
      ) : type === 'colorpicker' ? (
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-md bg-indigo-500" />
          <div className="h-1 w-8 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
        </div>
      ) : type === 'tag' ? (
        <div className="flex gap-1 flex-wrap">
          <div className="px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-[6px] text-indigo-500">Label</div>
          <div className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded text-[6px] text-zinc-400">Tag</div>
        </div>
      ) : type === 'button' ? (
        <div className="h-6 w-full bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
          <div className="h-1 w-1/3 bg-white/40 rounded-full" />
        </div>
      ) : type === 'buttonGroup' ? (
        <div className="flex border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden h-5">
          <div className="flex-1 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800" />
          <div className="flex-1 bg-indigo-500" />
          <div className="flex-1 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800" />
        </div>
      ) : type === 'signature' ? (
        <div className="w-full h-8 bg-zinc-50 dark:bg-zinc-900/50 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-md flex items-center justify-center">
          <PenTool size={10} className="text-zinc-300" />
        </div>
      ) : type === 'qr_scanner' ? (
        <div className="w-full h-10 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-center bg-zinc-100/50 dark:bg-zinc-900/50">
          <QrCode size={12} className="text-zinc-400" />
        </div>
      ) : type === 'payment' ? (
        <div className="h-6 w-full bg-zinc-900 rounded-lg flex items-center justify-between px-2">
          <CreditCard size={10} className="text-zinc-400" />
          <div className="h-1 w-8 bg-zinc-700 rounded-full" />
        </div>
      ) : type === 'richtext' ? (
        <div className="w-full h-10 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-1.5 space-y-1">
          <div className="flex gap-1 border-b border-zinc-100 dark:border-zinc-900 pb-1 mb-1">
            <div className="w-1.5 h-1.5 bg-zinc-200 rounded-full" />
            <div className="w-1.5 h-1.5 bg-zinc-200 rounded-full" />
          </div>
          <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-900 rounded-full" />
          <div className="h-1 w-3/4 bg-zinc-100 dark:bg-zinc-900 rounded-full" />
        </div>
      ) : type === 'html' ? (
        <div className="h-full flex flex-col justify-center">
          <div className="font-mono text-[8px] text-zinc-400">&lt;div&gt;...&lt;/div&gt;</div>
        </div>
      ) : type === 'icon' ? (
        <div className="h-full flex items-center justify-center">
          <Smile size={16} className="text-indigo-500" />
        </div>
      ) : type === 'video' ? (
        <div className="w-full h-10 bg-zinc-900 rounded-lg flex items-center justify-center relative">
          <div className="w-4 h-4 bg-white/20 rounded-full flex items-center justify-center">
            <div className="w-0 h-0 border-t-[3px] border-t-transparent border-l-[5px] border-l-white border-b-[3px] border-b-transparent ml-0.5" />
          </div>
          <div className="absolute bottom-1 left-1 right-1 h-0.5 bg-white/20 rounded-full">
            <div className="w-1/3 h-full bg-indigo-500 rounded-full" />
          </div>
        </div>
      ) : type === 'audio' ? (
        <div className="w-full h-6 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center px-2 gap-2">
          <Music size={10} className="text-indigo-500" />
          <div className="flex-1 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
        </div>
      ) : type === 'progress' ? (
        <div className="w-full space-y-1">
          <div className="flex justify-between">
            <div className="h-0.5 w-8 bg-zinc-200 rounded-full" />
            <div className="h-0.5 w-4 bg-indigo-500 rounded-full" />
          </div>
          <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div className="w-2/3 h-full bg-indigo-500" />
          </div>
        </div>
      ) : type === 'map' ? (
        <div className="w-full h-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden relative">
          <div className="absolute inset-0 border border-zinc-300 dark:border-zinc-700" style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(255,255,255,0.1) 50%)', backgroundSize: '10px 10px' }} />
          <MapPin size={12} className="text-rose-500 relative z-10" />
        </div>
      ) : type === 'canvas' ? (
        <div className="w-full h-10 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg flex items-center justify-center bg-white dark:bg-zinc-900/50">
          <Brush size={12} className="text-zinc-300" />
        </div>
      ) : type === 'chat' ? (
        <div className="space-y-1">
          <div className="flex gap-1 justify-start">
            <div className="w-2 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-2 w-10 bg-indigo-500/10 rounded-sm" />
          </div>
          <div className="flex gap-1 justify-end">
            <div className="h-2 w-8 bg-indigo-500 rounded-sm" />
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
          </div>
        </div>
      ) : type === 'card' ? (
        <div className="w-full h-10 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 shadow-sm overflow-hidden flex flex-col">
          <div className="h-2 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-800" />
          <div className="flex-1 p-1 gap-1 flex flex-col">
            <div className="h-1 w-3/4 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
            <div className="h-1 w-1/2 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
          </div>
        </div>
      ) : type === 'accordion' ? (
        <div className="w-full space-y-0.5">
          <div className="h-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md flex items-center px-2 justify-between">
            <div className="h-1 w-8 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
            <div className="w-1.5 h-1.5 border-b border-r border-zinc-400 rotate-45 mb-0.5" />
          </div>
          <div className="h-4 bg-indigo-500/5 border border-indigo-500/20 rounded-md" />
        </div>
      ) : type === 'tabs_nested' ? (
        <div className="w-full h-10 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md flex flex-col overflow-hidden">
          <div className="h-3 flex gap-0.5 p-0.5 bg-zinc-50 dark:bg-zinc-900">
            <div className="flex-1 bg-white dark:bg-zinc-800 rounded-sm" />
            <div className="flex-1 bg-transparent" />
            <div className="flex-1 bg-transparent" />
          </div>
          <div className="flex-1 p-1">
            <div className="h-1 w-1/2 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
          </div>
        </div>
      ) : type === 'stepper' ? (
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          <div className="flex-1 h-0.5 bg-indigo-500" />
          <div className="w-2 h-2 rounded-full border border-zinc-300 dark:border-zinc-700" />
          <div className="flex-1 h-0.5 bg-zinc-200 dark:bg-zinc-800" />
          <div className="w-2 h-2 rounded-full border border-zinc-300 dark:border-zinc-700" />
        </div>
      ) : type === 'timeline' ? (
        <div className="space-y-1.5 relative pl-3">
          <div className="absolute left-1 top-0 bottom-0 w-px bg-zinc-200 dark:bg-zinc-800" />
          <div className="relative">
            <div className="absolute -left-[10.5px] top-0.5 w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <div className="h-1 w-8 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
          </div>
          <div className="relative">
            <div className="absolute -left-[10.5px] top-0.5 w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <div className="h-1 w-6 bg-zinc-100 dark:bg-zinc-900 rounded-full opacity-50" />
          </div>
        </div>
      ) : type === 'datatable' ? (
        <div className="w-full h-10 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden flex flex-col">
          <div className="h-2.5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex gap-1 px-1 items-center">
            <div className="h-1 w-3 bg-zinc-200 rounded-full" />
            <div className="h-1 w-4 bg-zinc-200 rounded-full" />
          </div>
          <div className="flex-1 flex flex-col gap-1 p-1">
            <div className="flex gap-1">
              <div className="h-1 w-3 bg-zinc-100 rounded-full" />
              <div className="h-1 w-4 bg-zinc-100 rounded-full" />
            </div>
            <div className="flex gap-1">
              <div className="h-1 w-3 bg-zinc-100 rounded-full" />
              <div className="h-1 w-4 bg-zinc-100 rounded-full" />
            </div>
          </div>
        </div>
      ) : type === 'duallist' ? (
        <div className="flex h-10 gap-1">
          <div className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-1 space-y-0.5">
            <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-900 rounded-full" />
            <div className="h-1 w-3/4 bg-indigo-500/10 rounded-full" />
          </div>
          <div className="w-2 flex flex-col justify-center items-center gap-0.5">
            <div className="w-1.5 h-1.5 border-t border-r border-zinc-300 rotate-45" />
            <div className="w-1.5 h-1.5 border-b border-l border-zinc-300 rotate-45" />
          </div>
          <div className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-1 space-y-0.5">
            <div className="h-1 w-2/3 bg-zinc-100 dark:bg-zinc-900 rounded-full" />
          </div>
        </div>
      ) : type === 'treeview' ? (
        <div className="space-y-1 pl-1">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 border-b border-r border-zinc-400 rotate-45 mb-0.5" />
            <div className="h-1 w-8 bg-zinc-300 rounded-full" />
          </div>
          <div className="space-y-1 pl-3 opacity-60">
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 bg-zinc-200 rounded-full" />
              <div className="h-1 w-6 bg-zinc-200 rounded-full" />
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 bg-zinc-200 rounded-full" />
              <div className="h-1 w-4 bg-zinc-200 rounded-full" />
            </div>
          </div>
        </div>
      ) : (type === 'textarea' || type === 'longText') ? (
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
      ) : type === 'connector' ? (
        <div className="h-full flex items-center justify-center">
          <Zap size={16} className="text-indigo-400" />
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

const evaluateVisibilityRule = (rule: any | undefined, data: any): boolean => {
  if (!rule) return true;

  const action = rule.action || 'show';
  let isConditionMet = false;

  // Handle Legacy Format (Form Fields)
  if (rule.fieldId && !rule.type) {
    const { fieldId, operator, value } = rule;
    const fieldValue = data[fieldId];
    if (operator === 'neq') isConditionMet = String(fieldValue) !== String(value);
    else if (operator === 'contains') isConditionMet = String(fieldValue || '').toLowerCase().includes(String(value || '').toLowerCase());
    else isConditionMet = String(fieldValue) === String(value);
  } else if (rule.type === 'rule') {
    const { fieldId, operator, value, valueType } = rule;
    if (!fieldId) {
      isConditionMet = true;
    } else {
      const actualFieldId = fieldId === '_record_key' ? (data.key ? 'key' : 'id') : fieldId;
      const fieldValue = data[actualFieldId];
      const compareValue = valueType === 'field' 
        ? data[value === '_record_key' ? (data.key ? 'key' : 'id') : (value || '')] 
        : value;

      const isEmpty = (val: any) => val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
      const safeString = (val: any) => (val === undefined || val === null) ? '' : String(val);

      switch (operator) {
        case 'equals': isConditionMet = safeString(fieldValue) === safeString(compareValue); break;
        case 'not_equals': isConditionMet = safeString(fieldValue) !== safeString(compareValue); break;
        case 'contains': isConditionMet = safeString(fieldValue).toLowerCase().includes(safeString(compareValue).toLowerCase()); break;
        case 'greater_than': isConditionMet = Number(fieldValue) > Number(compareValue); break;
        case 'less_than': isConditionMet = Number(fieldValue) < Number(compareValue); break;
        case 'is_empty': isConditionMet = isEmpty(fieldValue); break;
        case 'not_empty': isConditionMet = !isEmpty(fieldValue); break;
        default: isConditionMet = true;
      }
    }
  } else if (rule.type === 'group') {
    if (!rule.rules || rule.rules.length === 0) {
      isConditionMet = true;
    } else if (rule.logicalOperator === 'OR') {
      isConditionMet = (rule.rules || []).some((r: VisibilityRule) => evaluateVisibilityRule(r, data));
    } else {
      isConditionMet = (rule.rules || []).every((r: VisibilityRule) => evaluateVisibilityRule(r, data));
    }
  } else {
    isConditionMet = true;
  }

  return action === 'hide' ? !isConditionMet : isConditionMet;
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
          <p className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-tight">
            {rule.action === 'hide' ? 'Hide' : 'Show'} Logic Applied
          </p>
          <p className="text-[9px] text-zinc-500">
            {rule.action === 'hide' ? 'This element is hidden when conditions are met.' : 'This element is visible when conditions are met.'}
          </p>
        </div>
      </div>
    </div>
  );
};



// --- Components ---

const generateMockData = (fields: Field[], count: number = 5) => {
  const mocks: any[] = [];
  const firstNames = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
  const statuses = ['Active', 'Pending', 'Archived', 'Draft', 'Review'];

  for (let i = 0; i < count; i++) {
    const record: any = { id: `mock-${i}`, createdAt: new Date(Date.now() - Math.random() * 1000000000).toISOString() };
    fields.forEach(f => {
      switch (f.type) {
        case 'text':
          if (f.label.toLowerCase().includes('name')) {
            record[f.id] = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
          } else {
            record[f.id] = `Mock ${f.label} ${i + 1}`;
          }
          break;
        case 'email':
          record[f.id] = `${firstNames[Math.floor(Math.random() * firstNames.length)].toLowerCase()}@example.com`;
          break;
        case 'number':
        case 'currency':
          record[f.id] = Math.floor(Math.random() * 10000);
          break;
        case 'select':
          if (f.options && f.options.length > 0) {
            record[f.id] = f.options[Math.floor(Math.random() * f.options.length)];
          } else {
            record[f.id] = statuses[Math.floor(Math.random() * statuses.length)];
          }
          break;
        case 'date':
          record[f.id] = new Date(Date.now() - Math.random() * 1000000000).toISOString().split('T')[0];
          break;
        case 'checkbox':
        case 'toggle':
        case 'boolean':
          record[f.id] = Math.random() > 0.5;
          break;
        default:
          record[f.id] = '-';
      }
    });
    mocks.push(record);
  }
  return mocks;
};

const FormCanvasItem = ({ fObj, isSelected, onSelect, onDelete, layout, isRestricted }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: fObj.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : undefined,
  };

  const isVisual = fObj.id.startsWith('visual-');
  const field = isVisual ? null : layout.find((f: any) => f.id === fObj.id);
  if (!isVisual && !field) return null;

  return (
    <div 
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(fObj.id);
      }}
      className={cn(
        "relative group p-4 rounded-2xl border-2 transition-all select-none",
        fObj.width === 'half' ? "col-span-6" : "col-span-12",
        isSelected 
          ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-500/5 ring-4 ring-indigo-500/10" 
          : "border-transparent hover:border-zinc-200 dark:hover:border-zinc-800",
        isDragging && "shadow-2xl ring-4 ring-indigo-500/20 z-50 cursor-grabbing"
      )}
    >
      {/* Selection UI */}
      {isSelected && (
        <div className="absolute -top-3 left-6 px-3 py-1 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg z-10">
          Selected
        </div>
      )}

      {fObj.visibility?.fieldId && (
        <div className={cn(
          "absolute -top-3 px-3 py-1 bg-amber-500 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg z-10 transition-all",
          isSelected ? "left-24" : "left-6"
        )}>
          <Zap size={10} className="inline mr-1" /> Conditional
        </div>
      )}
      
      {isVisual ? (
        <div className="py-2">
          {fObj.type === 'heading' && (
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">{fObj.labelOverride || 'Heading'}</h3>
          )}
          {fObj.type === 'divider' && (
            <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-4" />
          )}
          {fObj.type === 'spacer' && (
            <div className="h-8 border-x border-zinc-100 dark:border-zinc-800/50 border-dashed mx-auto w-px" />
          )}
          {(fObj.type === 'html/text' || fObj.type === 'html-text') && (
            <p className="text-sm text-zinc-500 leading-relaxed">
              {fObj.labelOverride || fObj.placeholderOverride || 'Enter some descriptive text or HTML here...'}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
             <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded flex items-center gap-1">
               {(() => {
                 const fieldDef = FIELD_CATEGORIES.flatMap(c => c.fields).find(f => f.id === fObj.type);
                 const Icon = fieldDef?.icon;
                 return Icon ? <Icon size={8} className="text-zinc-400" /> : null;
               })()}
               {fObj.type}
             </span>
          </div>
        </div>
      ) : ['heading', 'divider', 'spacer', 'alert', 'html', 'button'].includes(field?.type || '') ? (
        <div className="py-2 space-y-2">
          {field?.type === 'heading' && (() => {
            const rawTag = field?.options?.[0] || 'h2';
            const Tag = (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(rawTag) ? rawTag : 'h2') as React.ElementType;
            const size = Tag === 'h1' ? 'text-2xl font-bold' :
                         Tag === 'h2' ? 'text-xl font-bold' :
                         Tag === 'h3' ? 'text-lg font-bold' :
                         Tag === 'h4' ? 'text-base font-bold' : 'text-xl font-bold';
            return (
              <Tag className={cn("text-zinc-900 dark:text-white tracking-tight", size)}>
                {fObj.labelOverride || field?.label || 'Heading'}
              </Tag>
            );
          })()}
          {field?.type === 'divider' && (
            <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-4" />
          )}
          {field?.type === 'spacer' && (
            <div className="h-8 border-x border-zinc-100 dark:border-zinc-800/50 border-dashed mx-auto w-px" />
          )}
          {field?.type === 'alert' && (() => {
            const variant = field?.options?.[0] || 'info';
            const style = variant === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-600' :
                          variant === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' :
                          variant === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' :
                          'bg-indigo-500/10 border-indigo-500/20 text-indigo-600';
            const Icon = variant === 'error' ? XCircle :
                         variant === 'warning' ? AlertTriangle :
                         variant === 'success' ? Check : Info;
            return (
              <div className={cn("p-4 rounded-2xl border flex items-center gap-3", style)}>
                <Icon size={18} />
                <span className="text-xs font-bold uppercase tracking-widest">{fObj.labelOverride || field?.label || 'Alert Notice'}</span>
              </div>
            );
          })()}
          {field?.type === 'html' && (
            <div 
              className="text-sm text-zinc-500 leading-relaxed prose dark:prose-invert max-w-none" 
              dangerouslySetInnerHTML={{ __html: fObj.labelOverride || field?.label || 'HTML content...' }} 
            />
          )}
          {field?.type === 'button' && (
            <button
              type="button"
              className={cn(
                "px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                field?.variant === 'secondary' ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white" :
                field?.variant === 'outline' ? "border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white" :
                field?.variant === 'danger' ? "bg-rose-500 text-white" :
                "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
              )}
            >
              {fObj.labelOverride || field?.label || 'Action Button'}
            </button>
          )}
          
          <div className="mt-2 flex items-center gap-2">
             <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded flex items-center gap-1">
               {(() => {
                 const fieldDef = FIELD_CATEGORIES.flatMap(c => c.fields).find(f => f.id === field?.type);
                 const Icon = fieldDef?.icon;
                 return Icon ? <Icon size={8} className="text-zinc-400" /> : null;
               })()}
               {field?.type} {field?.type === 'heading' && `(${field?.options?.[0] || 'h2'})`}
             </span>
          </div>
        </div>
      ) : (
        <div className="space-y-2 opacity-80 group-hover:opacity-100 transition-opacity">
           <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">
             {fObj.labelOverride || field?.label}
             {(fObj.required || field?.required) && <span className="text-rose-500 ml-1">*</span>}
           </label>
           <div className="h-11 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 flex items-center justify-between text-xs text-zinc-400 italic">
             <span>
               {fObj.placeholderOverride || (['select', 'lookup', 'user'].includes(field?.type || '') 
                 ? `Select ${field?.label?.toLowerCase() || 'option'}...` 
                  : field?.type === 'date' ? (field?.dateFormat === 'yyyy-MM-dd' ? 'YYYY-MM-DD' : field?.dateFormat === 'dd/MM/yyyy' ? 'DD / MM / YYYY' : field?.dateFormat === 'MM/dd/yyyy' ? 'MM / DD / YYYY' : 'May 9th, 2026')
                  : field?.type === 'time' ? (field?.timeFormat === '24h' ? '00:00' : '00:00 AM')
                 : `Enter ${field?.label?.toLowerCase() || 'value'}...`)}
             </span>
             {['select', 'lookup', 'user'].includes(field?.type || '') && (
               <ChevronDown size={14} className="text-zinc-400" />
             )}
             {field?.type === 'date' && (
               <Calendar size={14} className="text-zinc-400" />
             )}
             {field?.type === 'time' && (
               <Clock size={14} className="text-zinc-400" />
             )}
           </div>
        </div>
      )}

      {/* Drag Handle & Action Buttons */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
         <div 
           className="p-1.5 text-zinc-300 cursor-grab active:cursor-grabbing hover:text-indigo-500 transition-colors"
           {...attributes}
           {...listeners}
         >
           <GripVertical size={14} />
         </div>
         {!isRestricted && (
           <button 
             onClick={(e) => {
               e.stopPropagation();
               onDelete(fObj.id);
             }}
             className="p-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-400 hover:text-rose-600"
           >
             <Trash2 size={12} />
           </button>
         )}
      </div>
    </div>
  );
};


export const ModuleEditor = () => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );


  const { id: routeId } = useParams();
  const id = routeId || 'new';
  const navigate = useNavigate();
  const { tenant, modules, refreshModules, setBreadcrumbOverride } = usePlatform();
  const { session, user } = useAuth();
  const { lists: globalLists } = useGlobalLists();
  const { teams } = useTeams();
  const { positions } = usePositions();
  const { groups: permissionGroups } = usePermissionGroups();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRestricted, setIsRestricted] = useState(false);
  
  const [moduleSettings, setModuleSettings] = useState({
    name: 'New Custom Module',
    description: 'Created via Drag-and-Drop Builder',
    category: 'Custom',
    iconName: 'Box',
    type: 'RECORD' as ModuleType,
    status: 'ACTIVE' as const,
    recordKeyPrefix: '',
    recordKeySuffix: '',
    nextKeyNumber: 1,
    titleFieldId: '',
    subtitleFieldIds: [] as string[],
  });
  const [isFieldSelectorOpen, setIsFieldSelectorOpen] = useState(false);
  
  const [layout, setLayout] = useState<Layout>([]);
  const allFields = React.useMemo(() => flattenFields(layout), [layout]);
  const displayFields = React.useMemo(() => {
    return allFields.filter(f => !['heading', 'divider', 'spacer', 'alert', 'fieldGroup', 'repeatableGroup', 'group', 'card', 'accordion', 'tabs_nested', 'stepper', 'timeline'].includes(f.type));
  }, [allFields]);
  const [viewportSize, setViewportSize] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const [tabs, setTabs] = useState<Tab[]>([
    { id: 'default-tab', label: 'General' }
  ]);
  const [currentTabId, setCurrentTabId] = useState<string>('default-tab');
  const [interfaceSettings, setInterfaceSettings] = useState({
    master: {
      layoutType: 'table' as 'table' | 'kanban' | 'calendar' | 'map' | 'cards' | 'timeline' | 'gantt' | 'analytics' | 'pipeline',
      columns: [] as { fieldId: string, visible: boolean, inlineEdit: boolean, width?: number, label?: string }[],
      density: 'standard' as 'compact' | 'standard' | 'spacious',
      pagination: {
        enabled: true,
        pageSize: 25,
        showSizeChanger: true
      },
      timelineDateFieldId: 'createdAt',
      ganttStartDateFieldId: 'createdAt',
      ganttEndDateFieldId: 'createdAt',
      mapAddressFieldId: '_record_key',
      calendarDateFieldId: 'createdAt',
      detailViewMode: 'page' as 'page' | 'modal',
      pipelineValueFieldId: '',
      pipelineDateFieldId: '',
      cardFields: [] as { fieldId: string, visible: boolean }[]
    },
    detail: {
      layoutType: 'tabs' as 'split' | 'tabs' | 'sidebar' | 'process' | 'accordion',
      density: 'standard' as 'compact' | 'standard' | 'spacious',
      showWorkflow: true,
      showTabIcons: false,
      wizardSaveMode: 'step' as 'step' | 'end'
    },
    filters: [] as { fieldId: string, type: string }[],
    actions: [
      { id: 'act-1', label: 'Export PDF', icon: 'FileText' },
      { id: 'act-2', label: 'Archive', icon: 'Trash2' }
    ]
  });
  const [connectorMappings, setConnectorMappings] = useState<Record<string, Record<string, string>>>({});
  
  // Column Drag and Drop Indicators
  const [tableDropIndicator, setTableDropIndicator] = useState<{
    index: number;
    hoveredIndex: number;
    side: 'left' | 'right';
  } | null>(null);

  // Real Database Preview States
  const [useRealData, setUseRealData] = useState(false);
  const [realRecords, setRealRecords] = useState<any[]>([]);
  const [isFetchingRealRecords, setIsFetchingRealRecords] = useState(false);
  const [isEditingTab, setIsEditingTab] = useState<string | null>(null);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [activeMappingIdx, setActiveMappingIdx] = useState<number | null>(null);
  const [activeMappingType, setActiveMappingType] = useState<'source' | 'target'>('target');
  const mockData = React.useMemo(() => generateMockData(layout, 10), [layout.length]);
  const previewRecords = React.useMemo(() => {
    return useRealData && realRecords.length > 0 ? realRecords : mockData;
  }, [useRealData, realRecords, mockData]);
  const [rightSidebarTab, setRightSidebarTab] = useState<'inspector' | 'architect'>('inspector');
  const [architectMessages, setArchitectMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: 'Hello! I am the Shadow Architect. How can I help you optimize your module today?' }
  ]);
  const [architectInput, setArchitectInput] = useState('');
  const [isArchitectThinking, setIsArchitectThinking] = useState(false);
  const [activeDragItem, setActiveDragItem] = useState<{ type: string, fieldType?: string, fieldId?: string } | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<{ col: number, span: number, index: number, active: boolean, parentId?: string, height?: number } | null>(null);
  const [previewLayout, setPreviewLayout] = useState<Field[] | null>(null);
  const [hoveredMapping, setHoveredMapping] = useState<{ connectorId: string, sourceOutput: string, targetFieldId: string } | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Fetch Real Database Records for Live Preview
  useEffect(() => {
    if (useRealData && id && id !== 'new') {
      setIsFetchingRealRecords(true);
      fetch(`${DATA_API_URL}/records?moduleId=${id}`)
        .then(res => {
          if (!res.ok) throw new Error("Server error");
          return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) {
            setRealRecords(data);
          } else if (data && Array.isArray(data.records)) {
            setRealRecords(data.records);
          } else {
            setRealRecords([]);
          }
        })
        .catch(err => {
          console.error("Failed to fetch real records:", err);
          toast.error("Failed to connect to Live Database. Falling back to mock data.");
          setUseRealData(false);
        })
        .finally(() => {
          setIsFetchingRealRecords(false);
        });
    }
  }, [useRealData, id]);

  const [workflow, setWorkflow] = useState<Workflow | undefined>({
    id: `wf-${Date.now()}`,
    name: 'New Workflow',
    nodes: [],
    edges: []
  });

  const [forms, setForms] = useState<any[]>([
    { 
      id: 'default-create', 
      name: 'Create Record', 
      type: 'create', 
      usage: 'workspace_create',
      isMultistep: false,
      steps: [
        { id: 'step-1', title: 'Step 1', fields: [] }
      ],
      fields: [] as any[], // Legacy flat fields
      settings: { 
        requireLogin: true, 
        submitLabel: 'Create',
        successMessage: 'Record created successfully!',
        description: 'Default form for creating new records in this module.'
      } 
    }
  ]);
  const [selectedFormId, setSelectedFormId] = useState<string | null>('default-create');
  const [currentStepId, setCurrentStepId] = useState<string | null>('step-1');
  const [selectedFieldInFormId, setSelectedFieldInFormId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleFormCanvasDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setForms(prev => prev.map(f => {
        if (f.id !== selectedFormId) return f;
        
        if (f.isMultistep) {
          const newSteps = f.steps.map((step: any) => {
            if (step.id !== currentStepId) return step;
            const oldIndex = step.fields.findIndex((fi: any) => fi.id === active.id);
            const newIndex = step.fields.findIndex((fi: any) => fi.id === over.id);
            return { ...step, fields: arrayMove(step.fields, oldIndex, newIndex) };
          });
          return { ...f, steps: newSteps };
        } else {
          const oldIndex = f.fields.findIndex((fi: any) => fi.id === active.id);
          const newIndex = f.fields.findIndex((fi: any) => fi.id === over.id);
          return { ...f, fields: arrayMove(f.fields, oldIndex, newIndex) };
        }
      }));
    }
  };
  const [showDebugger, setShowDebugger] = useState(true);
  const [rightSidebarTabWorkflow, setRightSidebarTabWorkflow] = useState<'inspector' | 'debugger' | 'architect'>('inspector');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const { resolveCollisions, snapToGrid } = useGridEngine(12);

  const [editingCondition, setEditingCondition] = useState<{
    targetId: string;
    targetType: 'field' | 'tab';
    rule?: VisibilityRule;
  } | null>(null);

  const [editingCalculation, setEditingCalculation] = useState<{
    targetId: string;
    logic?: string;
    triggers?: string[];
    showAsCurrency?: boolean;
    currencySymbol?: string;
  } | null>(null);

  const [relatedModulesMap, setRelatedModulesMap] = useState<Record<string, { layout: Field[], tabs: Tab[] }>>({});
  const [activeConnectors, setActiveConnectors] = useState<any[]>([]);
  const [connectorRegistry, setConnectorRegistry] = useState<any[]>([]);
  const [showConnectorModal, setShowConnectorModal] = useState(false);
  const [showSubmoduleWizard, setShowSubmoduleWizard] = useState(false);

  // Validation Rules State
  const [validationRules, setValidationRules] = useState<ValidationRule[]>([]);
  const [activeRulesSubTab, setActiveRulesSubTab] = useState<'validation' | 'triggers' | 'security'>('validation');
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ValidationRule | null>(null);
  const [isGeneratingRule, setIsGeneratingRule] = useState(false);
  const [ruleAiPrompt, setRuleAiPrompt] = useState('');

  // Fetch Active Connectors & Registry
  useEffect(() => {
    if (!tenant?.id) return;
    fetchConnectors();

    // Broadcast Channel for Connector Sync
    const channel = new BroadcastChannel('nexus_connectors');
    channel.onmessage = (event) => {
      if (event.data === 'refresh') {
        fetchConnectors();
      }
    };
    return () => channel.close();
  }, [tenant?.id, session?.access_token]);

  const fetchConnectors = async () => {
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const response = await fetch(`${API_BASE_URL}/api/connectors`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setConnectorRegistry(data.registry || []);
        setActiveConnectors(data.active.filter((c: any) => c.isActive));
      }
    } catch (err) {
      console.error("Failed to fetch connectors:", err);
    }
  };

  const handleCreateCustomConnector = async (connector: any) => {
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const response = await fetch(`${API_BASE_URL}/api/connectors/custom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify(connector)
      });
      
      if (response.ok) {
        const data = await response.json();
        fetchConnectors();
        new BroadcastChannel('nexus_connectors').postMessage('refresh');
        toast.success("Custom connector forged successfully");
        return data;
      }
    } catch (err) {
      console.error("Failed to create custom connector:", err);
      toast.error("Failed to create custom connector");
    }
  };

  const handleForgeConnector = async (prompt: string) => {
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const response = await fetch(`${API_BASE_URL}/api/architect/forge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt })
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.error("Failed to forge connector:", err);
      toast.error("Shadow Architect failed to forge connector");
    }
  };

  const [configDrawerOpen, setConfigDrawerOpen] = useState(false);

  const [configConnector, setConfigConnector] = useState<any>(null);

  const handleSaveConfig = async (secrets: any) => {
    if (!configConnector || !tenant?.id) return;
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/connectors/${configConnector.connectorId}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant.id,
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ secrets })
      });
      if (res.ok) {
        toast.success("Configuration vaulted successfully");
      }
    } catch (err) {
      console.error("Config save failed:", err);
      toast.error("Failed to vault secrets");
    }
  };

  const handleSaveRule = (rule: ValidationRule) => {
    setValidationRules(prev => {
      const exists = prev.some(r => r.id === rule.id);
      if (exists) {
        return prev.map(r => r.id === rule.id ? rule : r);
      } else {
        return [...prev, rule];
      }
    });
    setIsRuleModalOpen(false);
    setEditingRule(null);
    toast.success(editingRule ? "Validation rule updated! Don't forget to save changes." : "New validation rule added! Don't forget to save changes.");
  };

  const handleActivateConnector = async (connectorId: string) => {
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const response = await fetch(`${API_BASE_URL}/api/connectors/${connectorId}/activate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Refresh active connectors
        const activeRes = await fetch(`${API_BASE_URL}/api/connectors`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenant?.id || ''
          }
        });
        if (activeRes.ok) {
          const activeData = await activeRes.json();
          setActiveConnectors(activeData.active.filter((ac: any) => ac.isActive));
        }
        toast.success("Connector activated successfully");
        return data;
      }
    } catch (err) {
      console.error("Failed to activate connector:", err);
      toast.error("Failed to activate connector");
    }
  };

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
          setRelatedModulesMap(prev => ({
            ...prev,
            [moduleId]: { layout: data.layout || [], tabs: data.tabs || [] }
          }));
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
      // Local Heuristics for instant feedback
      const lowerCmd = command.toLowerCase();
      if (lowerCmd.includes('optimize') || lowerCmd.includes('compact') || lowerCmd.includes('balance')) {
        setTimeout(() => {
          setLayout(prev => compactLayout(prev));
          setArchitectMessages(prev => [...prev, { 
            role: 'assistant', 
            content: "I've analyzed the grid and compacted the rows to remove unnecessary whitespace. Does this look more efficient?" 
          }]);
          setIsArchitectThinking(false);
        }, 800);
        return;
      }

      if (lowerCmd.includes('add') && (lowerCmd.includes('field') || lowerCmd.includes('input'))) {
        // Try to guess type
        let type: FieldType = 'text';
        if (lowerCmd.includes('phone')) type = 'phone';
        if (lowerCmd.includes('email')) type = 'email';
        if (lowerCmd.includes('date')) type = 'date';
        if (lowerCmd.includes('number') || lowerCmd.includes('amount')) type = 'number';
        
        const newField = createField(type);
        setLayout(prev => [...prev, newField]);
        setSelectedId(newField.id);
        
        setArchitectMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `I've added a new ${type} field to the layout. You can now configure its specific properties in the inspector.` 
        }]);
        setIsArchitectThinking(false);
        return;
      }

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
        setLayout(normalizeLayout(data.layout));
        const aiResponse = data.explanation || "I've updated the module layout based on your request. How does this look?";
        setArchitectMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
      } else {
        setArchitectMessages(prev => [...prev, { role: 'assistant', content: data.message || "I've analyzed your request but couldn't determine a layout change. Could you be more specific?" }]);
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
      setBreadcrumbOverride('new', 'New Custom Module');
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
                recordKeyPrefix: (standardModule as any).recordKeyPrefix || '',
                recordKeySuffix: (standardModule as any).recordKeySuffix || '',
                nextKeyNumber: (standardModule as any).nextKeyNumber || 1,
                titleFieldId: (standardModule as any).config?.titleFieldId || '',
                subtitleFieldIds: (standardModule as any).config?.subtitleFieldIds || [],
              });
              setBreadcrumbOverride(id, standardModule.name);
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
          recordKeyPrefix: data.recordKeyPrefix || '',
          recordKeySuffix: data.recordKeySuffix || '',
          nextKeyNumber: data.nextKeyNumber || 1,
          titleFieldId: data.config?.titleFieldId || '',
          subtitleFieldIds: data.config?.subtitleFieldIds || [],
        });
        
        if (data.interfaceSettings) {
          setInterfaceSettings({
            ...data.interfaceSettings,
            master: {
              ...data.interfaceSettings.master,
              layoutType: data.interfaceSettings.master?.layoutType || 'table',
              columns: data.interfaceSettings.master?.columns || [],
              density: data.interfaceSettings.master?.density || 'standard',
              pagination: data.interfaceSettings.master?.pagination || { enabled: true, pageSize: 25 },
              timelineDateFieldId: data.interfaceSettings.master?.timelineDateFieldId || 'createdAt',
              ganttStartDateFieldId: data.interfaceSettings.master?.ganttStartDateFieldId || 'createdAt',
              ganttEndDateFieldId: data.interfaceSettings.master?.ganttEndDateFieldId || 'createdAt',
              mapAddressFieldId: data.interfaceSettings.master?.mapAddressFieldId || '_record_key',
              calendarDateFieldId: data.interfaceSettings.master?.calendarDateFieldId || 'createdAt',
              cardFields: data.interfaceSettings.master?.cardFields || []
            },
            detail: {
              ...data.interfaceSettings.detail,
              layoutType: data.interfaceSettings.detail?.layoutType || 'tabs',
              density: data.interfaceSettings.detail?.density || 'standard',
              showWorkflow: data.interfaceSettings.detail?.showWorkflow !== false,
              showTabIcons: !!data.interfaceSettings.detail?.showTabIcons,
              wizardSaveMode: data.interfaceSettings.detail?.wizardSaveMode || 'step'
            }
          });
        }
        
        setIsRestricted(!!data.isGlobal);

        setBreadcrumbOverride(id, data.name || 'Untitled Module');

        if (data.layout) {
          setLayout(normalizeLayout(data.layout));
        }
        if (data.tabs) setTabs(data.tabs);
        if (data.validationRules) setValidationRules(data.validationRules);
        if (data.connectorMappings) setConnectorMappings(data.connectorMappings);
        if (data.workflows && data.workflows.length > 0) {
          setWorkflow(data.workflows[0]);
        } else if (data.workflow) {
          setWorkflow(data.workflow);
        }
        if (data.forms && Array.isArray(data.forms)) {
          const normalizedForms = data.forms.map((f: any) => {
            if (!f.steps || f.steps.length === 0) {
              return {
                ...f,
                isMultistep: f.isMultistep || false,
                steps: f.steps || [
                  { id: 'step-1', title: 'Step 1', fields: f.fields || [] }
                ]
              };
            }
            return f;
          });
          setForms(normalizedForms);
        }
        
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
        config: {
          titleFieldId: moduleSettings.titleFieldId,
          subtitleFieldIds: moduleSettings.subtitleFieldIds,
        },
        id: isNew && id !== 'new' ? id : undefined, // Pass templateId if standard module
        enabled: moduleSettings.status === 'ACTIVE',
        layout,
        tabs,
        forms,
        connectorMappings,
        workflows: workflow ? [workflow] : [],
        interfaceSettings,
        validationRules
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
      queryClient.invalidateQueries({ queryKey: ['module', tenant?.id, id] });
      
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
  }, [tenant?.id, id, moduleSettings, layout, tabs, forms, workflow, connectorMappings, interfaceSettings, session?.access_token, navigate, refreshModules, queryClient, validationRules]);

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
  
  const [activeTab, setActiveTab] = useState<'details' | 'schema' | 'builder' | 'workflow' | 'rules' | 'experience' | 'security' | 'localization' | 'map' | 'assets' | 'forms' | 'deployment' | 'preview'>('details');
  const [activeViewMode, setActiveViewMode] = useState<'master' | 'detail'>('detail');
  const [detailsTab, setDetailsTab] = useState<'general' | 'schema' | 'localization' | 'dependencies' | 'assets'>('general');
  const [previewView, setPreviewView] = useState<'table' | 'detail' | 'create'>('table');
  const [previewSelectedId, setPreviewSelectedId] = useState<string | null>(null);
  const [previewStepId, setPreviewStepId] = useState<string | null>(null);
  const [showConsole, setShowConsole] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [moduleState, setModuleState] = useState<Record<string, any>>({});
  const showSystemFields = true;
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  
  // Tab Scrolling Refs & State
  const tabContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);

  const checkScroll = useCallback(() => {
    requestAnimationFrame(() => {
      if (tabContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = tabContainerRef.current;
        setShowLeftScroll(scrollLeft > 0);
        setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 5);
      }
    });
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [checkScroll, tabs, isLoading]);

  // Canvas Tab Scrolling Refs & State
  const canvasTabContainerRef = useRef<HTMLDivElement>(null);
  const [showCanvasLeftScroll, setShowCanvasLeftScroll] = useState(false);
  const [showCanvasRightScroll, setShowCanvasRightScroll] = useState(false);

  const checkCanvasScroll = useCallback(() => {
    requestAnimationFrame(() => {
      if (canvasTabContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = canvasTabContainerRef.current;
        setShowCanvasLeftScroll(scrollLeft > 0);
        setShowCanvasRightScroll(scrollLeft < scrollWidth - clientWidth - 5);
      }
    });
  }, []);

  useEffect(() => {
    checkCanvasScroll();
    window.addEventListener('resize', checkCanvasScroll);
    return () => window.removeEventListener('resize', checkCanvasScroll);
  }, [checkCanvasScroll, tabs, activeTab, isLoading, interfaceSettings.detail?.layoutType]);

  // Handle tab visibility auto-switch in Preview
  useEffect(() => {
    if (activeTab === 'preview') {
      const visibleTabs = tabs.filter(t => evaluateVisibilityRule(t.visibilityRule, moduleState));
      const isCurrentTabVisible = visibleTabs.some(t => t.id === currentTabId);
      
      if (!isCurrentTabVisible && visibleTabs.length > 0) {
        setCurrentTabId(visibleTabs[0].id);
      }
    }
  }, [activeTab, moduleState, tabs, currentTabId]);

  // Helper for single selection
  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null;
  const setSelectedId = (id: string | null) => setSelectedIds(id ? [id] : []);

  // Master View column reordering and system fields selection helper states & memos
  const [draggingColumnIndex, setDraggingColumnIndex] = useState<number | null>(null);

  const selectedSystemField = React.useMemo(() => {
    if (!selectedId) return null;
    const keyCol = interfaceSettings.master.columns?.find(c => c.fieldId === '_record_key');
    const systemFieldsDef = [
      { id: '_record_key', label: keyCol?.label || 'Record Key', type: 'text' },
      { id: 'createdAt', label: 'Created Date', type: 'date' },
      { id: 'createdBy', label: 'Created By', type: 'user' },
      { id: 'updatedAt', label: 'Updated Date', type: 'date' },
      { id: 'status', label: 'Status', type: 'select' },
      { id: 'assigneeId', label: 'Assignee', type: 'user' }
    ];
    return systemFieldsDef.find(sf => sf.id === selectedId) || null;
  }, [selectedId, interfaceSettings.master.columns]);

  const activeColumns = React.useMemo(() => {
    const systemFieldsDef = [
      { id: 'createdAt', label: 'Created Date', type: 'date' },
      { id: 'createdBy', label: 'Created By', type: 'user' },
      { id: 'updatedAt', label: 'Updated Date', type: 'date' },
      { id: 'status', label: 'Status', type: 'select' },
      { id: 'assigneeId', label: 'Assignee', type: 'user' }
    ];

    const activeCustom = displayFields.filter(f => f.showInTable !== false);
    const configured = interfaceSettings.master.columns || [];

    // Combine custom fields and system fields that are marked visible/enabled
    const allAvailable = [
      ...activeCustom,
      ...systemFieldsDef.filter(sf => 
        configured.some(c => c.fieldId === sf.id && c.visible !== false) &&
        !activeCustom.some(df => df.id === sf.id)
      )
    ];

    if (configured.length > 0) {
      const sorted = [...allAvailable].sort((a, b) => {
        const indexA = configured.findIndex(c => c.fieldId === a.id);
        const indexB = configured.findIndex(c => c.fieldId === b.id);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
      return sorted;
    }
    
    return allAvailable;
  }, [displayFields, interfaceSettings.master.columns]);


  // --- Helpers ---
  

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

  const normalizeLayout = (currentLayout: Field[]): Field[] => {
    if (!currentLayout || currentLayout.length === 0) return [];
    
    // Group fields by tabId and parentId to normalize each context independently
    const groups: Record<string, Field[]> = {};
    currentLayout.forEach(f => {
      const key = `${f.tabId || 'default'}-${f.parentId || 'root'}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(f);
    });

    const resultLayout: Field[] = [];

    // Process each group context (tab + parent)
    Object.values(groups).forEach(groupFields => {
      // 1. Recursively normalize nested fields first to ensure heights are correct
      const withNormalizedChildren = groupFields.map(f => {
        if (f.fields && f.fields.length > 0) {
          return { ...f, fields: normalizeLayout(f.fields) };
        }
        return f;
      });

      // 2. Gravity Compaction: Sort by row then col
      const sorted = [...withNormalizedChildren].sort((a, b) => {
        if ((a.rowIndex || 0) !== (b.rowIndex || 0)) return (a.rowIndex || 0) - (b.rowIndex || 0);
        return (a.startCol || 1) - (b.startCol || 1);
      });

      // 3. Track column tops for this context
      const columnTops = new Array(13).fill(0);
      
      const normalizedGroup = sorted.map(f => {
        const startCol = f.startCol || 1;
        const colSpan = f.colSpan || 12;
        const height = calculateHeight(f);
        const endCol = Math.min(13, startCol + colSpan);

        // Find highest available row in spanning columns
        let targetRow = 0;
        for (let i = startCol; i < endCol; i++) {
          targetRow = Math.max(targetRow, columnTops[i]);
        }

        // Smart Gravity: If it's a placeholder, prefer its current rowIndex 
        // to give the user precise control, but still respect collisions with items above.
        let newRowIndex = targetRow;
        if (f.id === 'placeholder') {
          newRowIndex = Math.max(targetRow, f.rowIndex || 0);
        }
        for (let i = startCol; i < endCol; i++) {
          columnTops[i] = newRowIndex + height;
        }

        return {
          ...f,
          rowIndex: newRowIndex
        };
      });

      resultLayout.push(...normalizedGroup);
    });

    return resultLayout;
  };


  const generateId = () => Math.random().toString(36).substring(2, 11);
  
  const generateSlug = (label: string, fields: Field[], currentFieldId?: string): string => {
    // 1. Basic slugification
    let slug = label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    
    if (!slug) slug = 'field';
    
    // 2. Uniqueness check
    const getAllSlugs = (f: Field[]): string[] => {
      let slugs: string[] = [];
      f.forEach(field => {
        if (field.id !== currentFieldId && field.name) slugs.push(field.name);
        if (field.fields) slugs.push(...getAllSlugs(field.fields));
      });
      return slugs;
    };
    
    const existingSlugs = getAllSlugs(fields);
    let finalSlug = slug;
    let counter = 1;
    
    while (existingSlugs.includes(finalSlug)) {
      finalSlug = `${slug}_${counter}`;
      counter++;
    }
    
    return finalSlug;
  };

  const createField = (type: FieldType): Field => {
    const id = `field-${generateId()}`;
    const label = `New ${type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}`;
    const name = generateSlug(label, layout, id);
    
    return {
      id,
      name,
      type,
      label,
      placeholder: ['select', 'lookup', 'user'].includes(type) 
        ? `Select ${type.replace('_', ' ')}...`
        : `Enter ${type.replace('_', ' ')}...`,
      helperText: '',
      required: false,
      currencySymbol: '$',
      options: ['Option 1', 'Option 2'],
      calculationLogic: '',
      targetModuleId: '',
      colSpan: 6,
      startCol: 1,
      rowIndex: layout.length,
      tabId: currentTabId,
      fields: isContainerField(type) ? [] : undefined
    };
  };

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
    setPreviewLayout(null);
  };

  const handleColumnDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
    setDraggingColumnIndex(index);
  };

  const handleColumnHeaderDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const side = x < width / 2 ? 'left' : 'right';
    const targetIdx = side === 'left' ? index : index + 1;
    
    setTableDropIndicator({
      index: targetIdx,
      hoveredIndex: index,
      side: side
    });
  };

  const handleKeyHeaderDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTableDropIndicator({
      index: 0,
      hoveredIndex: -1,
      side: 'right'
    });
  };

  const handleColumnDragLeave = () => {
    setTableDropIndicator(null);
  };

  const handleColumnDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndexStr = e.dataTransfer.getData('text/plain');
    if (!sourceIndexStr) return;
    const sourceIndex = parseInt(sourceIndexStr, 10);
    if (isNaN(sourceIndex)) return;

    const targetIdx = tableDropIndicator ? tableDropIndicator.index : targetIndex;

    const sourceCol = activeColumns[sourceIndex];
    if (!sourceCol) return;

    setInterfaceSettings(prev => {
      const cols = [...(prev.master.columns || [])];
      
      let currentCols = cols.length > 0 ? cols : [
        { fieldId: '_record_key', visible: true, inlineEdit: false, width: 120 },
        ...activeColumns.map(ac => ({
          fieldId: ac.id,
          visible: true,
          inlineEdit: ac.inlineEdit || false,
          width: ac.columnWidth || 200
        }))
      ];

      activeColumns.forEach(ac => {
        if (!currentCols.some(c => c.fieldId === ac.id)) {
          currentCols.push({
            fieldId: ac.id,
            visible: true,
            inlineEdit: false,
            width: 200
          });
        }
      });

      const fullSourceIdx = currentCols.findIndex(c => c.fieldId === sourceCol.id);
      if (fullSourceIdx === -1) return prev;

      let fullTargetIdx = currentCols.length;
      if (targetIdx < activeColumns.length) {
        const targetColRef = activeColumns[targetIdx];
        if (targetColRef) {
          const idxInCurrent = currentCols.findIndex(c => c.fieldId === targetColRef.id);
          if (idxInCurrent !== -1) {
            fullTargetIdx = idxInCurrent;
          }
        }
      }

      if (fullSourceIdx !== -1 && fullTargetIdx !== -1) {
        const itemToMove = currentCols[fullSourceIdx];
        const remaining = currentCols.filter((_, idx) => idx !== fullSourceIdx);
        
        let finalInsertIdx = fullTargetIdx;
        if (fullSourceIdx < fullTargetIdx) {
          finalInsertIdx = fullTargetIdx - 1;
        }
        
        const nextCols = [
          ...remaining.slice(0, finalInsertIdx),
          itemToMove,
          ...remaining.slice(finalInsertIdx)
        ];

        return {
          ...prev,
          master: {
            ...prev.master,
            columns: nextCols
          }
        };
      }
      return prev;
    });

    setDraggingColumnIndex(null);
    setTableDropIndicator(null);
  };

  const handleTableDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const jsonStr = e.dataTransfer.getData('application/json');
      if (!jsonStr) return;
      const data = JSON.parse(jsonStr);
      if (data.type === 'master-column-add') {
        const { fieldId, isSystem } = data;
        
        const targetIdx = tableDropIndicator ? tableDropIndicator.index : activeColumns.length;

        if (isSystem) {
          setInterfaceSettings(prev => {
            const cols = prev.master.columns || [];
            let currentCols = cols.length > 0 ? [...cols] : [
              { fieldId: '_record_key', visible: true, inlineEdit: false, width: 120 },
              ...activeColumns.map(ac => ({
                fieldId: ac.id,
                visible: true,
                inlineEdit: ac.inlineEdit || false,
                width: ac.columnWidth || 200
              }))
            ];

            const existingIdx = currentCols.findIndex(c => c.fieldId === fieldId);
            let newColItem: { fieldId: string, visible: boolean, inlineEdit: boolean, width?: number, label?: string } = { fieldId, visible: true, inlineEdit: false, width: 120 };
            
            if (existingIdx !== -1) {
              newColItem = { ...currentCols[existingIdx], visible: true };
              currentCols.splice(existingIdx, 1);
            }

            let fullInsertIdx = currentCols.length;
            if (targetIdx < activeColumns.length) {
              const targetColRef = activeColumns[targetIdx];
              if (targetColRef) {
                const idxInCurrent = currentCols.findIndex(c => c.fieldId === targetColRef.id);
                if (idxInCurrent !== -1) {
                  fullInsertIdx = idxInCurrent;
                }
              }
            }

            currentCols.splice(fullInsertIdx, 0, newColItem);

            return {
              ...prev,
              master: {
                ...prev.master,
                columns: currentCols
              }
            };
          });
          setSelectedId(fieldId);
          toast.success("System column added to table!");
          setTableDropIndicator(null);
          return;
        }

        updateField(fieldId, { showInTable: true });

        setInterfaceSettings(prev => {
          const cols = prev.master.columns || [];
          let currentCols = cols.length > 0 ? [...cols] : [
            { fieldId: '_record_key', visible: true, inlineEdit: false, width: 120 },
            ...activeColumns.map(ac => ({
              fieldId: ac.id,
              visible: true,
              inlineEdit: ac.inlineEdit || false,
              width: ac.columnWidth || 200
            }))
          ];

          const existingIdx = currentCols.findIndex(c => c.fieldId === fieldId);
          let newColItem: { fieldId: string, visible: boolean, inlineEdit: boolean, width?: number, label?: string } = { fieldId, visible: true, inlineEdit: false, width: 200 };
          
          if (existingIdx !== -1) {
            newColItem = { ...currentCols[existingIdx], visible: true };
            currentCols.splice(existingIdx, 1);
          }

          let fullInsertIdx = currentCols.length;
          if (targetIdx < activeColumns.length) {
            const targetColRef = activeColumns[targetIdx];
            if (targetColRef) {
              const idxInCurrent = currentCols.findIndex(c => c.fieldId === targetColRef.id);
              if (idxInCurrent !== -1) {
                fullInsertIdx = idxInCurrent;
              }
            }
          }

          currentCols.splice(fullInsertIdx, 0, newColItem);

          return {
            ...prev,
            master: {
              ...prev.master,
              columns: currentCols
            }
          };
        });

        setSelectedId(fieldId);
        toast.success("Column added to table view!");
      }
    } catch (err) {
      console.error(err);
    }
    setTableDropIndicator(null);
  };

  const handleCardsDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const jsonStr = e.dataTransfer.getData('application/json');
      if (!jsonStr) return;
      const data = JSON.parse(jsonStr);
      if (data.type === 'master-column-add') {
        const { fieldId } = data;
        setInterfaceSettings((prev: any) => {
          const cardFields = prev.master.cardFields || [];
          const currentFields = cardFields.length > 0
            ? cardFields
            : displayFields.slice(1, 4).map(df => ({ fieldId: df.id, visible: true }));

          if (currentFields.some((cf: any) => cf.fieldId === fieldId)) {
            toast.success("Field already active on cards!");
            return {
              ...prev,
              master: {
                ...prev.master,
                cardFields: currentFields.map((cf: any) => cf.fieldId === fieldId ? { ...cf, visible: true } : cf)
              }
            };
          }
          toast.success("Field added to cards!");
          return {
            ...prev,
            master: {
              ...prev.master,
              cardFields: [...currentFields, { fieldId, visible: true }]
            }
          };
        });
        setSelectedId('__table_settings');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // DnD Handlers updated for flat grid system


  const handleDragOver = (e: React.DragEvent, parentId?: string, targetTabId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const isNested = !!parentId;
    const container = e.currentTarget.getBoundingClientRect();
    
    // Use snapToGrid for consistent coordinates
    const { x, y } = snapToGrid(
      e.clientX - container.left,
      e.clientY - container.top,
      container.width,
      GRID_CONFIG.rowHeight,
      GRID_CONFIG.gap,
      isNested ? GRID_CONFIG.nestedPadding : GRID_CONFIG.padding
    );

    const col = x + 1;
    const rowIndex = y;
    
    // Determine span and height from activeDragItem
    let span = 12;

    if (activeDragItem) {
      if (activeDragItem.type === 'field') {
        const fieldDef = FIELD_CATEGORIES.flatMap(c => c.fields).find(f => f.id === activeDragItem.fieldType);
        if (fieldDef?.defaultSpan) span = fieldDef.defaultSpan;
      } else if (activeDragItem.type === 'move') {
        const field = layout.find(f => f.id === activeDragItem.fieldId) || findFieldRecursive(layout, activeDragItem.fieldId || '');
        if (field) {
          span = field.colSpan || 12;
        }
      }
    }

    const constrainedSpan = Math.min(span, 13 - col);

    const fieldToMoveId = activeDragItem?.type === 'move' ? activeDragItem.fieldId : null;
    const draggedField = fieldToMoveId ? findFieldRecursive(layout, fieldToMoveId) : null;
    const draggedHeight = draggedField ? calculateHeight(draggedField) : 2;

    const info = { 
      col, 
      span: constrainedSpan, 
      index: rowIndex, 
      active: true, 
      parentId,
      rowSpan: draggedHeight
    };

    // Ensure we don't spam updates if nothing changed
    if (dragOverInfo?.col === info.col && 
        dragOverInfo?.index === info.index && 
        dragOverInfo?.parentId === info.parentId &&
        dragOverInfo?.active === info.active) {
      return;
    }

    setDragOverInfo(info);

    // Generate Preview Layout
    const tempField: Field = {
      id: 'placeholder',
      type: 'placeholder',
      label: 'Placeholder',
      startCol: info.col,
      colSpan: info.span,
      rowIndex: info.index,
      rowSpan: draggedHeight,
      parentId: info.parentId,
      tabId: targetTabId || currentTabId,
      name: 'placeholder'
    };

    const performPreviewInsert = (fields: Field[], targetId?: string, fieldToMoveId?: string): Field[] => {
      // 1. Remove the field if it's being moved
      let cleanedFields = fields;
      if (fieldToMoveId) {
        cleanedFields = fields
          .filter(f => f.id !== fieldToMoveId)
          .map(f => f.fields ? { ...f, fields: performPreviewInsert(f.fields, undefined, fieldToMoveId) } : f);
      }

      // 2. Insert the placeholder at target
      if (!targetId) return [...cleanedFields, tempField];
      
      return cleanedFields.map(f => {
        if (f.id === targetId) return { ...f, fields: [...(f.fields || []), tempField] };
        if (f.fields) return { ...f, fields: performPreviewInsert(f.fields, targetId, fieldToMoveId) };
        return f;
      });
    };

    const preview = normalizeLayout(performPreviewInsert(layout, parentId, fieldToMoveId || undefined));
    setPreviewLayout(preview);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only clear if we actually left the container
    if (e.relatedTarget && (e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) return;
    setDragOverInfo(null);
    setPreviewLayout(null);
  };

  const handleDropOnCanvas = (e: React.DragEvent, parentId?: string, targetTabId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverInfo(null);
    setPreviewLayout(null);
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const isNested = !!parentId;
      const container = e.currentTarget.getBoundingClientRect();
      
      const { x, y } = snapToGrid(
        e.clientX - container.left,
        e.clientY - container.top,
        container.width,
        GRID_CONFIG.rowHeight,
        GRID_CONFIG.gap,
        isNested ? GRID_CONFIG.nestedPadding : GRID_CONFIG.padding
      );

      const dropCol = x + 1;
      const dropRow = y;

      const fieldId = data.type === 'move' ? data.fieldId : null;
      if (fieldId && fieldId === parentId) return;

      let fieldToInsert: Field | null = null;
      if (data.type === 'field') {
        fieldToInsert = createField(data.fieldType);
      } else if (fieldId) {
        fieldToInsert = findFieldRecursive(layout, fieldId) || null;
      }

      if (!fieldToInsert) return;

      const resolvedTabId = targetTabId || currentTabId;

      const updatedField = { 
        ...fieldToInsert, 
        startCol: dropCol, 
        rowIndex: dropRow, 
        tabId: parentId ? undefined : resolvedTabId 
      };

      // Helper to insert field into the tree
      const performInsert = (fields: Field[], targetId?: string): { fields: Field[], insertedField?: Field } => {
        if (!targetId) {
          const sameTabFields = fields.filter(f => !f.parentId && f.tabId === resolvedTabId);
          const otherFields = fields.filter(f => f.parentId || f.tabId !== resolvedTabId);
          const resolved = resolveCollisionsInArray(updatedField, [...sameTabFields, updatedField]);
          return { 
            fields: [...otherFields, ...normalizeLayout(resolved)], 
            insertedField: updatedField 
          };
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
      setLayout(normalizeLayout(result.fields));
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

  const cloneField = (id: string) => {
    const original = findFieldRecursive(layout, id);
    if (!original) return;

    const deepClone = (field: Field, pId?: string): Field => {
      const newId = generateId();
      const clonedField = {
        ...field,
        id: newId,
        parentId: pId
      };
      
      if (field.id === id) {
        clonedField.label = `${field.label} (Copy)`;
      }

      if (field.fields) {
        clonedField.fields = field.fields.map(f => deepClone(f, newId));
      }
      
      return clonedField;
    };

    const cloned = deepClone(original, original.parentId);
    // Position it at the end of the same container/tab
    cloned.rowIndex = 9999; 

    setLayout(prev => {
      // Find the container where the original field was
      const performInsert = (fields: Field[], targetParentId?: string): Field[] => {
        if (!targetParentId) {
          // It's a top-level field in a tab
          const sameTabFields = fields.filter(f => !f.parentId && f.tabId === original.tabId);
          const otherFields = fields.filter(f => f.parentId || f.tabId !== original.tabId);
          const nextSameTab = [...sameTabFields, cloned];
          // We don't really need resolveCollisions here since it's at rowIndex 9999, 
          // but normalizeLayout will handle it.
          return [...otherFields, ...normalizeLayout(nextSameTab)];
        }

        return fields.map(f => {
          if (f.id === targetParentId) {
            const nestedFields = [...(f.fields || []), cloned];
            return { ...f, fields: normalizeLayout(nestedFields) };
          }
          if (f.fields) {
            return { ...f, fields: performInsert(f.fields, targetParentId) };
          }
          return f;
        });
      };

      return normalizeLayout(performInsert([...prev], original.parentId));
    });

    setSelectedId(cloned.id);
    toast.success('Field duplicated');
  };

  const deleteBlocks = (ids: string[]) => {
    setLayout(prev => {
      let next = prev;
      ids.forEach(id => {
        next = removeFieldRecursive(next, id);
      });
      return normalizeLayout(next);
    });
    setSelectedIds([]);
  };

  const updateFields = (fieldIds: string[], updates: Partial<Field>) => {
    fieldIds.forEach(id => updateField(id, updates));
    
    // Sync with forms if required status changed
    if (updates.required !== undefined) {
      setForms(prev => prev.map(form => ({
        ...form,
        fields: form.fields.map((f: any) => fieldIds.includes(f.id) ? { ...f, required: updates.required } : f),
        steps: form.steps?.map((step: any) => ({
          ...step,
          fields: step.fields.map((f: any) => fieldIds.includes(f.id) ? { ...f, required: updates.required } : f)
        }))
      })));
    }
  };

  const updateField = (fieldId: string, updates: Partial<Field>) => {
    setLayout(prev => {
      // 1. Recursive update function
      const findAndUpdate = (fields: Field[]): Field[] => {
        return fields.map(f => {
          if (f.id === fieldId) {
            const newUpdates = { ...updates };
            
            // If label is changing and name hasn't been manually edited, auto-generate slug
            if (updates.label !== undefined && !f.isNameManuallyEdited && updates.name === undefined) {
              newUpdates.name = generateSlug(updates.label, layout, fieldId);
            }
            
            // If name is being manually updated, mark it as manually edited
            if (updates.name !== undefined) {
              newUpdates.isNameManuallyEdited = true;
            }
            
            return { ...f, ...newUpdates };
          }
          if (f.fields) {
            return { ...f, fields: findAndUpdate(f.fields) };
          }
          return f;
        });
      };

      // 2. Perform the update
      const updatedLayout = findAndUpdate(prev);
      
      // 3. Re-normalize the entire layout tree bottom-up
      // This ensures that any height changes in nested fields propagate to parents 
      // and their siblings, preventing overlaps.
      return normalizeLayout(updatedLayout);
    });

    // Sync with forms if required status changed
    if (updates.required !== undefined) {
      setForms(prev => prev.map(form => ({
        ...form,
        fields: form.fields.map((f: any) => f.id === fieldId ? { ...f, required: updates.required } : f),
        steps: form.steps?.map((step: any) => ({
          ...step,
          fields: step.fields.map((f: any) => f.id === fieldId ? { ...f, required: updates.required } : f)
        }))
      })));
    }
  };

  const selectedField = selectedId ? findFieldRecursive(layout, selectedId) : null;
  const parentField = (selectedField && selectedField.parentId) ? findFieldRecursive(layout, selectedField.parentId) : null;
  const isAccordionSection = selectedField?.type === 'group' && parentField?.type === 'accordion';
  const selectedTab = selectedId ? tabs.find(t => t.id === selectedId) : null;

  const updateTab = (tabId: string, updates: Partial<Tab>) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, ...updates } : t));
  };

  const mockRecords = [
    { id: '1', _record_key: 'REQ-001', title: 'Website Redesign', status: 'In Progress', assignee: 'Scott V.', date: '2026-05-29', end_date: '2026-06-15', location: 'San Francisco, CA' },
    { id: '2', _record_key: 'REQ-002', title: 'Database Optimization', status: 'To Do', assignee: 'Jane D.', date: '2026-05-30', end_date: '2026-06-05', location: 'New York, NY' },
    { id: '3', _record_key: 'REQ-003', title: 'API Integration', status: 'Done', assignee: 'Alex M.', date: '2026-05-28', end_date: '2026-05-28', location: 'Los Angeles, CA' },
    { id: '4', _record_key: 'REQ-004', title: 'Security Audit', status: 'In Progress', assignee: 'Scott V.', date: '2026-06-01', end_date: '2026-06-10', location: 'Chicago, IL' }
  ];

  const renderMasterKanbanPreview = () => {
    const statuses = ['To Do', 'In Progress', 'Done'];
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest font-black">Kanban Board Preview</span>
            <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase">Grouping by: Status</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-black">Columns</span>
              <div className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-[10px] font-bold text-zinc-500">Status</div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId('__table_settings');
              }}
              className={cn(
                "px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-sm",
                selectedId === '__table_settings'
                  ? "bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/20"
                  : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              )}
            >
              <Settings size={11} className={selectedId === '__table_settings' ? "animate-spin-slow" : ""} />
              Kanban Settings
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {statuses.map(status => {
            const statusRecords = mockRecords.filter(r => r.status === status);
            return (
              <div key={status} className="bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200/60 dark:border-zinc-800/40 rounded-[2rem] p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      status === 'Done' ? "bg-emerald-500" :
                      status === 'In Progress' ? "bg-indigo-500" : "bg-zinc-400"
                    )} />
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">{status}</span>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 rounded-full">{statusRecords.length}</span>
                </div>
                
                <div className="space-y-3">
                  {statusRecords.map(record => (
                    <div key={record.id} className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-indigo-500 tracking-wider">{record._record_key}</span>
                        <div className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-[8px] font-bold text-zinc-600 dark:text-zinc-400">
                          {record.assignee.substring(0, 2)}
                        </div>
                      </div>
                      <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{record.title}</h4>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMasterCalendarPreview = () => {
    const days = Array.from({ length: 35 }, (_, i) => i - 3);
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <button className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400"><ChevronLeft size={14} /></button>
            <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider">May 2026</h3>
            <button className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400"><ChevronRight size={14} /></button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-black">Date Field</span>
              <div className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-[10px] font-bold text-zinc-500">
                {interfaceSettings.master.calendarDateFieldId || 'createdAt'}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId('__table_settings');
              }}
              className={cn(
                "px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-sm",
                selectedId === '__table_settings'
                  ? "bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/20"
                  : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              )}
            >
              <Settings size={11} className={selectedId === '__table_settings' ? "animate-spin-slow" : ""} />
              Calendar Settings
            </button>
          </div>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] overflow-hidden shadow-sm">
          <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="py-3 text-center text-[10px] font-black text-zinc-400 uppercase tracking-wider">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 divide-x divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {days.map((day, idx) => {
              const dateVal = day > 0 && day <= 31 ? day : '';
              const matchingRecs = dateVal === 29 ? [mockRecords[0]] : dateVal === 30 ? [mockRecords[1]] : dateVal === 28 ? [mockRecords[2]] : [];
              return (
                <div key={idx} className="min-h-[100px] p-3 flex flex-col gap-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-950/20 transition-colors">
                  <span className={cn(
                    "text-[10px] font-bold text-zinc-400",
                    dateVal === 29 && "text-indigo-600 dark:text-indigo-400 font-extrabold"
                  )}>{dateVal}</span>
                  {matchingRecs.map(r => (
                    <div key={r.id} className="px-2 py-1 rounded bg-indigo-550/10 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 truncate">
                      {r._record_key}: {r.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderMasterMapPreview = () => {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest font-black">Interactive Map Preview</span>
            <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase">Location Mapping</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-black">Address Field</span>
              <div className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-[10px] font-bold text-zinc-500">
                {interfaceSettings.master.mapAddressFieldId || '_record_key'}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId('__table_settings');
              }}
              className={cn(
                "px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-sm",
                selectedId === '__table_settings'
                  ? "bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/20"
                  : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              )}
            >
              <Settings size={11} className={selectedId === '__table_settings' ? "animate-spin-slow" : ""} />
              Map Settings
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] overflow-hidden shadow-sm min-h-[500px]">
          <div className="bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 p-5 flex flex-col gap-4">
            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Geocoded Locations</span>
            <div className="space-y-2 flex-grow overflow-y-auto">
              {mockRecords.map(r => (
                <div key={r.id} className="p-3.5 border border-zinc-100 dark:border-zinc-800/80 hover:border-indigo-500/30 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/20 cursor-pointer transition-all">
                  <div className="text-[9px] font-black text-indigo-500 uppercase">{r._record_key}</div>
                  <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{r.title}</div>
                  <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mt-1 flex items-center gap-1">
                    <LucideIcons.MapPin size={10} />
                    {r.location}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="lg:col-span-3 bg-zinc-100 dark:bg-zinc-950 relative flex items-center justify-center p-8 overflow-hidden select-none">
            <div className="absolute inset-0 bg-[radial-gradient(#e4e4e7_1.5px,transparent_1.5px)] dark:bg-[radial-gradient(#27272a_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-60" />
            
            <div className="w-[80%] h-[80%] rounded-[2rem] bg-indigo-500/5 dark:bg-indigo-500/2 border-2 border-indigo-500/10 dark:border-indigo-500/5 flex items-center justify-center relative backdrop-blur-[2px]">
              <div className="absolute top-[30%] left-[25%] flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 animate-ping absolute"></div>
                <div className="w-6 h-6 rounded-full bg-white dark:bg-zinc-900 border-2 border-indigo-600 flex items-center justify-center relative z-10 shadow-lg cursor-pointer">
                  <div className="w-2 h-2 rounded-full bg-indigo-600" />
                </div>
                <span className="text-[9px] font-black bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-2 py-0.5 rounded-lg shadow-md mt-1 relative z-20">SF</span>
              </div>
              
              <div className="absolute top-[50%] right-[30%] flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-white dark:bg-zinc-900 border-2 border-indigo-600 flex items-center justify-center relative z-10 shadow-lg cursor-pointer">
                  <div className="w-2 h-2 rounded-full bg-indigo-600" />
                </div>
                <span className="text-[9px] font-black bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-2 py-0.5 rounded-lg shadow-md mt-1 relative z-20">NY</span>
              </div>
              
              <div className="text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest max-w-xs leading-relaxed z-10 bg-white/80 dark:bg-zinc-900/80 px-6 py-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm">
                Leaflet Map Container Canvas Preview
              </div>
            </div>
            
            <div className="absolute bottom-6 right-6 flex flex-col gap-1.5 shadow-sm z-20">
              <button className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 font-extrabold">+</button>
              <button className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 font-extrabold">-</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMasterCardsPreview = () => {
    const cardFields = interfaceSettings.master.cardFields || [];
    const activeCardFields = cardFields.length > 0
      ? cardFields.filter(cf => cf.visible !== false).map(cf => {
          const customField = displayFields.find(f => f.id === cf.fieldId);
          const systemField = [
            { id: 'createdAt', label: 'Created Date', type: 'date' },
            { id: 'createdBy', label: 'Created By', type: 'user' },
            { id: 'updatedAt', label: 'Updated Date', type: 'date' },
            { id: 'status', label: 'Status', type: 'select' },
            { id: 'assigneeId', label: 'Assignee', type: 'user' }
          ].find(sf => sf.id === cf.fieldId);
          return customField || systemField;
        }).filter(Boolean)
      : displayFields.slice(1, 4);

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest font-black">Cards View Preview</span>
            <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase">Grid Cards</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 text-[9px] font-black uppercase tracking-wider text-zinc-500">
              <span className="px-2.5 py-1 bg-white dark:bg-zinc-950 rounded-lg shadow-sm">Grid</span>
              <span className="px-2.5 py-1">List</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId('__table_settings');
              }}
              className={cn(
                "px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-sm",
                selectedId === '__table_settings'
                  ? "bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/20"
                  : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              )}
            >
              <Settings size={11} className={selectedId === '__table_settings' ? "animate-spin-slow" : ""} />
              Cards Settings
            </button>
          </div>
        </div>
        
        <div 
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleCardsDrop}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 min-h-[300px] border-2 border-dashed border-transparent hover:border-zinc-300 dark:hover:border-zinc-800 rounded-[2rem] p-2 transition-all"
        >
          {mockRecords.map(r => (
            <div key={r.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all flex flex-col gap-4 justify-between min-h-[220px]">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-indigo-500 tracking-wider">{r._record_key}</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border",
                    r.status === 'Done' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" :
                    r.status === 'In Progress' ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-600" :
                    "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400"
                  )}>{r.status}</span>
                </div>
                
                <h4 className="text-xs font-black uppercase tracking-wide text-zinc-800 dark:text-zinc-200 leading-tight mt-4">
                  {displayFields[0] ? ((r as any)[displayFields[0].name] || (r as any)[displayFields[0].id] || r.title || 'Untitled') : r.title || 'Untitled'}
                </h4>
                
                <div className="mt-4 space-y-1.5 border-t border-zinc-100 dark:border-zinc-800/60 pt-3">
                  {activeCardFields.map((f: any) => {
                    let val = (r as any)[f.id] || (r as any)[f.name];
                    if (f.id === 'createdAt' || f.id === 'updatedAt') val = r.date;
                    if (f.id === 'assigneeId') val = r.assignee;
                    if (val === undefined || val === null || val === '') {
                      if (f.type === 'currency') val = '$5,000';
                      else if (f.type === 'number') val = '42';
                      else if (f.type === 'date') val = r.date;
                      else val = `Mock ${f.label || f.name}`;
                    }
                    return (
                      <p key={f.id} className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate flex items-center justify-between">
                        <span className="font-bold text-zinc-400">{f.label || f.name}:</span>
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">{String(val)}</span>
                      </p>
                    );
                  })}
                  {activeCardFields.length === 0 && (
                    <p className="text-[9px] text-zinc-400 italic">No body fields configured</p>
                  )}
                </div>
              </div>
              
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[8px] font-black text-indigo-600">{r.assignee.substring(0, 2)}</div>
                  <span className="text-[9px] font-bold text-zinc-500">{r.assignee}</span>
                </div>
                <span className="text-[8px] font-bold text-zinc-400">{r.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMasterTimelinePreview = () => {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest font-black">Timeline View Preview</span>
            <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase">Chronological Progression</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-black">Sorting Field</span>
              <div className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-[10px] font-bold text-zinc-500">
                {interfaceSettings.master.timelineDateFieldId || 'createdAt'}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId('__table_settings');
              }}
              className={cn(
                "px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-sm",
                selectedId === '__table_settings'
                  ? "bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/20"
                  : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              )}
            >
              <Settings size={11} className={selectedId === '__table_settings' ? "animate-spin-slow" : ""} />
              Timeline Settings
            </button>
          </div>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-8 shadow-sm relative">
          <div className="absolute left-[36px] top-8 bottom-8 w-0.5 bg-zinc-100 dark:bg-zinc-800" />
          
          <div className="space-y-8 relative">
            {mockRecords.map(r => (
              <div key={r.id} className="flex items-start gap-6">
                <div className="w-6 h-6 rounded-full bg-white dark:bg-zinc-900 border-2 border-indigo-600 flex items-center justify-center relative z-10 shrink-0 shadow">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                </div>
                
                <div className="flex-1 bg-zinc-50/50 dark:bg-zinc-900/20 border border-zinc-100 dark:border-zinc-800/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-indigo-500 uppercase tracking-wider">{r.date}</span>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white">{r._record_key}: {r.title}</h4>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-bold border bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800 uppercase">{r.status}</span>
                    <div className="w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[8px] font-bold text-indigo-600">{r.assignee.substring(0, 2)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderMasterGanttPreview = () => {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest font-black">Gantt Chart Preview</span>
            <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase">Project Schedules</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-800 rounded-xl px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 text-[9px] font-bold text-zinc-500">
              <span className="text-zinc-400">Start:</span>
              <span>{interfaceSettings.master.ganttStartDateFieldId || 'createdAt'}</span>
            </div>
            <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-800 rounded-xl px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 text-[9px] font-bold text-zinc-500">
              <span className="text-zinc-400">End:</span>
              <span>{interfaceSettings.master.ganttEndDateFieldId || 'createdAt'}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId('__table_settings');
              }}
              className={cn(
                "px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-sm",
                selectedId === '__table_settings'
                  ? "bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/20"
                  : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              )}
            >
              <Settings size={11} className={selectedId === '__table_settings' ? "animate-spin-slow" : ""} />
              Gantt Settings
            </button>
          </div>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] overflow-hidden shadow-sm flex flex-col">
          <div className="grid grid-cols-12 divide-x divide-zinc-200 dark:divide-zinc-800 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="col-span-3 p-3 text-[10px] font-black text-zinc-400 uppercase tracking-wider">Record / Task</div>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="p-3 text-center text-[9px] font-bold text-zinc-400">May {26 + i}</div>
            ))}
          </div>
          
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {mockRecords.map((r, rIdx) => (
              <div key={r.id} className="grid grid-cols-12 divide-x divide-zinc-200/50 dark:divide-zinc-800/30 items-center">
                <div className="col-span-3 p-4 flex flex-col gap-0.5">
                  <span className="text-[8px] font-black text-indigo-500">{r._record_key}</span>
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{r.title}</span>
                </div>
                
                <div className="col-span-9 p-4 relative h-12 flex items-center bg-zinc-50/20 dark:bg-zinc-950/5">
                  <div 
                    className={cn(
                      "h-5 rounded-lg flex items-center px-3 absolute border shadow-sm select-none cursor-pointer hover:opacity-90 transition-opacity",
                      r.status === 'Done' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" :
                      r.status === 'In Progress' ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-600" :
                      "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400"
                    )}
                    style={{
                      left: `${10 + rIdx * 15}%`,
                      width: `${30 + (3 - rIdx) * 10}%`
                    }}
                  >
                    <span className="text-[8px] font-black uppercase tracking-wider truncate text-zinc-700 dark:text-zinc-300">{r.assignee}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderMasterAnalyticsPreview = () => {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest font-black">Analytics Dashboard Preview</span>
            <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase">Overview Metrics</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
              <LucideIcons.Activity size={12} />
              Live Dashboard
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId('__table_settings');
              }}
              className={cn(
                "px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-sm",
                selectedId === '__table_settings'
                  ? "bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/20"
                  : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              )}
            >
              <Settings size={11} className={selectedId === '__table_settings' ? "animate-spin-slow" : ""} />
              Analytics Settings
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Records', val: '4', icon: LucideIcons.Folder, color: 'text-indigo-500 bg-indigo-500/10' },
            { label: 'To Do', val: '1', icon: LucideIcons.Clock, color: 'text-zinc-500 bg-zinc-500/10' },
            { label: 'In Progress', val: '2', icon: LucideIcons.Activity, color: 'text-amber-500 bg-amber-500/10' },
            { label: 'Completed', val: '1', icon: LucideIcons.CheckCircle2, color: 'text-emerald-500 bg-emerald-500/10' }
          ].map((card, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">{card.label}</span>
                <div className="text-2xl font-black text-zinc-900 dark:text-white">{card.val}</div>
              </div>
              <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0", card.color)}>
                <card.icon size={16} />
              </div>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 shadow-sm h-64 flex flex-col justify-between">
            <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Status Breakdown</h4>
            <div className="flex-grow flex items-center justify-center relative">
              <div className="w-32 h-32 rounded-full border-[12px] border-indigo-600 border-t-emerald-500 border-l-zinc-300 relative flex items-center justify-center shadow">
                <div className="w-16 h-16 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center text-[10px] font-black text-zinc-500 uppercase">Status</div>
              </div>
              
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                {['To Do (25%)', 'In Progress (50%)', 'Done (25%)'].map((l, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-400">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      idx === 0 ? "bg-zinc-300" : idx === 1 ? "bg-indigo-500" : "bg-emerald-500"
                    )} />
                    {l}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 shadow-sm h-64 flex flex-col justify-between">
            <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Assignee Workload</h4>
            <div className="flex-grow flex items-end justify-between px-8 pt-8">
              {[
                { name: 'Scott V.', val: '2 records', h: 'h-[80%]' },
                { name: 'Jane D.', val: '1 record', h: 'h-[40%]' },
                { name: 'Alex M.', val: '1 record', h: 'h-[40%]' }
              ].map((bar, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2 w-16">
                  <div className={cn("w-6 rounded-t-lg bg-indigo-500 relative group flex justify-center", bar.h)}>
                    <div className="absolute -top-6 px-1.5 py-0.5 bg-zinc-950 text-white rounded text-[8px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{bar.val}</div>
                  </div>
                  <span className="text-[9px] font-bold text-zinc-400">{bar.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMasterPipelinePreview = () => {
    const pipelineValueFieldId = interfaceSettings.master.pipelineValueFieldId;
    const valueFieldName = pipelineValueFieldId 
      ? (layout.find(f => f.id === pipelineValueFieldId)?.label || 'Deal Value')
      : 'None (Count Only)';

    const stages = ['Lead', 'Proposal', 'Closed Won'];
    const mockPipelineRecords = [
      { id: 'p1', _record_key: 'OPP-001', title: 'Enterprise CRM Setup', stage: 'Lead', value: 45000, date: '2026-06-15', assignee: 'Scott V.' },
      { id: 'p2', _record_key: 'OPP-002', title: 'Cloud Infrastructure Migration', stage: 'Proposal', value: 85000, date: '2026-06-20', assignee: 'Jane D.' },
      { id: 'p3', _record_key: 'OPP-003', title: 'Custom Mobile App', stage: 'Closed Won', value: 120000, date: '2026-05-28', assignee: 'Alex M.' },
      { id: 'p4', _record_key: 'OPP-004', title: 'Security Architecture Audit', stage: 'Proposal', value: 15000, date: '2026-07-02', assignee: 'Scott V.' }
    ];

    const formatCurrency = (val: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      }).format(val);
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block">Sales Pipeline Preview</span>
            <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase">Grouping by: Stage</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Value Source</span>
              <div className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-[10px] font-bold text-indigo-650 dark:text-indigo-400">
                {valueFieldName}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId('__table_settings');
              }}
              className={cn(
                "px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-sm",
                selectedId === '__table_settings'
                  ? "bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/20"
                  : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              )}
            >
              <Settings size={11} className={selectedId === '__table_settings' ? "animate-spin-slow" : ""} />
              Pipeline Settings
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 overflow-x-auto pb-4 custom-scrollbar items-start">
          {stages.map(stage => {
            const stageRecords = mockPipelineRecords.filter(r => r.stage === stage);
            const totalVal = stageRecords.reduce((sum, r) => sum + r.value, 0);

            return (
              <div key={stage} className="bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200/60 dark:border-zinc-800/40 rounded-[2rem] p-5 flex flex-col gap-4 w-full md:w-[280px] shrink-0">
                <div className="flex flex-col gap-1 px-2 pb-2 border-b border-zinc-200/50 dark:border-zinc-800/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        stage === 'Closed Won' ? "bg-emerald-500" :
                        stage === 'Proposal' ? "bg-indigo-500" : "bg-amber-400"
                      )} />
                      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">{stage}</span>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 rounded-full">{stageRecords.length}</span>
                  </div>
                  {pipelineValueFieldId && (
                    <span className="text-[11px] font-bold text-indigo-650 dark:text-indigo-400 font-mono mt-1">
                      {formatCurrency(totalVal)}
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {stageRecords.map(record => (
                    <div key={record.id} className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-indigo-500 tracking-wider">{record._record_key}</span>
                        <div className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-[8px] font-bold text-zinc-600 dark:text-zinc-400">
                          {record.assignee.substring(0, 2)}
                        </div>
                      </div>
                      <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-tight">{record.title}</h4>
                      {pipelineValueFieldId && (
                        <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 font-mono">
                          {formatCurrency(record.value)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMasterViewPreview = () => {
    switch (interfaceSettings.master.layoutType) {
      case 'kanban':
        return renderMasterKanbanPreview();
      case 'calendar':
        return renderMasterCalendarPreview();
      case 'map':
        return renderMasterMapPreview();
      case 'cards':
        return renderMasterCardsPreview();
      case 'timeline':
        return renderMasterTimelinePreview();
      case 'gantt':
        return renderMasterGanttPreview();
      case 'analytics':
        return renderMasterAnalyticsPreview();
      case 'pipeline':
        return renderMasterPipelinePreview();
      default:
        return null;
    }
  };

  const renderFieldBlocks = (fields: Field[], parentId?: string, tabId?: string): React.ReactNode => {
    const isNested = !!parentId;
    const targetTabId = tabId || currentTabId;
    const filtered = fields.filter(block => {
      const type = block.type?.toLowerCase();
      if (!showSystemFields && (type === 'connector' || type === 'automation' || type === 'nexus_connector')) return false;

      if ((activeTab as string) === 'preview' && !isFieldVisible(block, {}, { user })) return false;

      if (isNested) return true;
      return block.tabId === targetTabId || (!block.tabId && targetTabId === tabs[0]?.id);
    });
    
    let items = [...filtered];

    if ((activeTab as string) === 'preview') {
      items = compactLayout(items);
    }

    return items.map((item) => {
      if (React.isValidElement(item)) return item;
      const block = item as Field;
      const isGroup = isContainerField(block.type);

      if (isGroup) {
        return (
          <FieldGroup 
            key={block.id}
            block={block}
            selectedIds={selectedIds}
            onSelect={(id, e) => {
              if (e?.shiftKey || e?.metaKey || e?.ctrlKey) {
                setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
              } else {
                setSelectedIds([id]);
              }
            }}
            onUpdate={updateField}
            onDelete={(id) => deleteBlocks([id])}
            onDrop={(e) => handleDropOnCanvas(e, block.id, targetTabId)}
            onDragOver={(e) => handleDragOver(e, block.id, targetTabId)}
            onDragStart={handleDragStart}
            renderNested={(fields, pId) => renderFieldBlocks(fields as any, pId, targetTabId)}
            viewportSize={viewportSize}
            onClone={cloneField}
            isDraggingOver={dragOverInfo?.active && dragOverInfo?.parentId === block.id}
            hoveredMapping={hoveredMapping}
            dragOverInfo={dragOverInfo}
          />
        );
      }

      if (block.id === 'placeholder') {
        return (
          <div 
            key="placeholder"
            className="border-2 border-dashed border-indigo-500/50 bg-indigo-500/5 rounded-[24px] animate-pulse flex items-center justify-center relative overflow-hidden h-full"
            style={{ 
              gridColumn: viewportSize === 'mobile' ? 'span 1' : `${block.startCol || 1} / span ${block.colSpan || 12}`,
              gridRow: viewportSize === 'mobile' ? 'auto' : `${(block.rowIndex || 0) + 1} / span ${calculateHeight(block)}`
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent" />
            <div className="relative flex flex-col items-center gap-1">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
              <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Drop Zone</span>
            </div>
          </div>
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
            gridRow: viewportSize === 'mobile' ? 'auto' : `${(block.rowIndex || 0) + 1} / span ${calculateHeight(block)}`
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (e.shiftKey || e.metaKey || e.ctrlKey) {
              setSelectedIds(prev => prev.includes(block.id) ? prev.filter(id => id !== block.id) : [...prev, block.id]);
            } else {
              setSelectedIds([block.id]);
            }
          }}
          id={`canvas-field-${block.id}`}
          className={cn(
            "group/field relative p-4 rounded-2xl cursor-pointer transition-all border-2 h-full flex flex-col",
            selectedIds.includes(block.id) 
              ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-500/5 ring-4 ring-indigo-500/10 z-30" 
              : "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800 hover:border-indigo-500/30 hover:z-40",
            block.hidden && activeTab === 'builder' && "opacity-40 border-dashed grayscale-[0.5] hover:opacity-100 hover:grayscale-0",
            activeDragItem?.fieldId === block.id && "shadow-2xl ring-4 ring-indigo-500/20 z-50 cursor-grabbing",
            hoveredMapping?.targetFieldId === block.id && "ring-8 ring-indigo-500/30 border-indigo-500 scale-[1.02] shadow-2xl z-30"
          )}
        >
          {/* Selection UI */}
          {selectedIds.includes(block.id) && (
            <div className="absolute -top-3 left-6 px-3 py-1 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg z-20">
              Selected
            </div>
          )}
          <div className="space-y-2 flex-1 overflow-y-auto scrollbar-hide">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  {(() => {
                    const fieldDef = FIELD_CATEGORIES.flatMap(c => c.fields).find(f => f.id === block.type);
                    const Icon = fieldDef?.icon;
                    return Icon ? <Icon size={10} className="text-zinc-400" /> : null;
                  })()}
                  {FIELD_CATEGORIES.flatMap(c => c.fields).find(f => f.id === block.type)?.label || block.type.replace('_', ' ')}
                  {block.required && <span className="text-rose-500">*</span>}
                  {block.tooltip && <HelpCircle size={10} className="text-zinc-400" />}
                </label>
              </div>
              <div className="flex items-center gap-2">
                {block.hidden && (
                  <div 
                    className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center gap-1 cursor-pointer hover:bg-rose-500/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateField(block.id, { hidden: false });
                    }}
                  >
                    <EyeOff size={10} className="text-rose-500" />
                    <span className="text-[8px] font-black text-rose-500 uppercase tracking-tighter">Hidden</span>
                  </div>
                )}
                <GripVertical size={12} className="text-zinc-300 group-hover/field:text-zinc-500" />
              </div>
            </div>

            {!(block.type === 'heading' || block.type === 'alert' || block.type === 'divider' || block.type === 'spacer') && (
              <p className="text-[11px] font-medium text-zinc-900 dark:text-zinc-300 mb-1">{block.label}</p>
            )}

            <div className="min-h-[20px]">
              {block.type === 'heading' ? (() => {
                const rawTag = block.options?.[0] || 'h2';
                const Tag = (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(rawTag) ? rawTag : 'h2') as React.ElementType;
                const size = Tag === 'h1' ? 'text-2xl font-bold' :
                             Tag === 'h2' ? 'text-xl font-bold' :
                             Tag === 'h3' ? 'text-lg font-bold' :
                             Tag === 'h4' ? 'text-base font-bold' : 'text-xl font-bold';
                return (
                  <div className="pt-2">
                    <Tag className={cn("text-zinc-900 dark:text-white tracking-tight", size)}>
                      {block.label || 'Heading'}
                    </Tag>
                  </div>
                );
              })() : block.type === 'divider' ? (
                <div className="py-2">
                  <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-4" />
                </div>
              ) : block.type === 'spacer' ? (
                <div className="py-2">
                  <div className="h-8 border-x border-zinc-100 dark:border-zinc-800/50 border-dashed mx-auto w-px" />
                </div>
              ) : block.type === 'alert' ? (() => {
                const variant = block.options?.[0] || 'info';
                const alertStyle = variant === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-600' :
                              variant === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' :
                              variant === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' :
                              'bg-indigo-500/10 border-indigo-500/20 text-indigo-600';
                const AlertIcon = variant === 'error' ? XCircle :
                             variant === 'warning' ? AlertTriangle :
                             variant === 'success' ? Check : Info;
                return (
                  <div className="pt-2">
                    <div className={cn("p-4 rounded-2xl border flex items-center gap-3", alertStyle)}>
                      <AlertIcon size={18} />
                      <span className="text-xs font-bold uppercase tracking-widest">{block.label || 'Alert Notice'}</span>
                    </div>
                  </div>
                );
              })() : block.type === 'html' ? (
                <div className="pt-2">
                  <div className="min-h-[120px] bg-zinc-950 rounded-2xl p-5 font-mono text-[10px] text-emerald-500/80 leading-relaxed shadow-2xl border border-white/5 overflow-hidden group/html relative">
                    <div className="absolute top-0 right-0 p-3 flex gap-2">
                      <div className="w-2 h-2 rounded-full bg-rose-500/50" />
                      <div className="w-2 h-2 rounded-full bg-amber-500/50" />
                      <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
                    </div>
                    <span className="block text-indigo-400">&lt;div class="custom-card"&gt;</span>
                    <span className="block pl-4">&lt;h1&gt;{block.label}&lt;/h1&gt;</span>
                    <span className="block pl-4 text-zinc-500">&lt;p&gt;Dynamic HTML content...&lt;/p&gt;</span>
                    <span className="block text-indigo-400">&lt;/div&gt;</span>
                  </div>
                </div>
              ) : block.type === 'icon' ? (
                <div className="flex flex-col items-center justify-center gap-3 pt-4 pb-2">
                  <div className="w-16 h-16 bg-indigo-500/10 rounded-3xl flex items-center justify-center text-indigo-600 border border-indigo-500/20 shadow-xl shadow-indigo-500/5">
                    <DynamicIcon name={block.iconName || 'Smile'} size={32} />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Icon Preview</span>
                </div>
              ) : block.type === 'time' ? (
                <div className="h-10 bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/50 rounded-xl flex items-center justify-between px-4 shadow-sm dark:shadow-none">
                  <span className="text-xs text-zinc-400 dark:text-zinc-600 italic truncate">00:00 AM</span>
                  <Clock size={14} className="text-zinc-400 dark:text-zinc-600" />
                </div>
              ) : block.type === 'sub_module' ? (
                renderSubmoduleMock(block)
              ) : block.type === 'lookup' ? (
                <div className="pt-2">
                  <div className="h-11 w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                      <Search size={14} className="text-zinc-400" />
                      <span className="text-xs text-zinc-400 font-medium italic select-none">
                        {block.placeholder || `Search ${block.label}...`}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* All other basic input fields */
                <div className="pt-2">
                  <div className="h-11 w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-between px-4">
                    <span className="text-xs text-zinc-400 font-medium italic select-none">
                      {block.placeholder || `Enter ${block.label}...`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Action Buttons (Overlapping Border) */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              cloneField(block.id);
            }}
            className="absolute -top-3.5 right-6 w-7 h-7 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-full flex items-center justify-center opacity-0 group-hover/field:opacity-100 transition-opacity shadow-lg z-50 hover:scale-110 active:scale-95 border border-zinc-200 dark:border-zinc-700"
            title="Duplicate Field"
          >
            <Copy size={12} />
          </button>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              setLayout(prev => removeFieldRecursive(prev, block.id));
              if (selectedId === block.id) setSelectedId(null);
            }}
            className="absolute -top-3.5 -right-3.5 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/field:opacity-100 transition-opacity shadow-lg z-50 hover:scale-110 active:scale-95"
            title="Delete Field"
          >
            <Trash2 size={14} />
          </button>

          {!block.hidden && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                updateField(block.id, { hidden: true });
              }}
              className="absolute -top-3.5 right-15 w-7 h-7 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-full flex items-center justify-center opacity-0 group-hover/field:opacity-100 transition-opacity shadow-lg z-50 hover:scale-110 active:scale-95 border border-zinc-200 dark:border-zinc-700"
              title="Quick Hide Field"
            >
              <EyeOff size={12} />
            </button>
          )}
        </motion.div>
      );
    });
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-950 overflow-hidden">
      {/* Sub-Header / Toolbar */}
      <div className="h-[52px] border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/50 backdrop-blur-xl flex items-center justify-between px-6 z-30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900/50 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
            {(['details', 'builder', 'forms', 'workflow', 'rules', 'security', 'deployment'] as const).map((tab) => (
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

          {activeTab === 'builder' && (
            <div className="flex items-center gap-4 pl-4 border-l border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900/50 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 animate-in fade-in duration-300">
                <button
                  onClick={() => setActiveViewMode('master')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold transition-all uppercase tracking-widest",
                    activeViewMode === 'master'
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                      : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  )}
                >
                  <TableProperties size={12} />
                  <span>Master View</span>
                </button>
                <button
                  onClick={() => setActiveViewMode('detail')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold transition-all uppercase tracking-widest",
                    activeViewMode === 'detail'
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                      : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  )}
                >
                  <Layout size={12} />
                  <span>Detail View</span>
                </button>
              </div>

              <div className="flex items-center gap-2 animate-in fade-in duration-300">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Layout</span>
                <select
                  value={
                    activeViewMode === 'master'
                      ? interfaceSettings.master.layoutType || 'table'
                      : interfaceSettings.detail.layoutType || 'tabs'
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    setInterfaceSettings(prev => {
                      if (activeViewMode === 'master') {
                        return {
                          ...prev,
                          master: { ...prev.master, layoutType: val as any }
                        };
                      } else {
                        return {
                          ...prev,
                          detail: { ...prev.detail, layoutType: val as any }
                        };
                      }
                    });
                    toast.success(`Layout preset set to ${val.toUpperCase()}`);
                  }}
                  className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-[10px] font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors uppercase tracking-wider focus:outline-none"
                >
                  {activeViewMode === 'master' ? (
                    <>
                      <option value="table">Table View</option>
                      <option value="kanban">Kanban Board</option>
                      <option value="calendar">Calendar View</option>
                      <option value="map">Map View</option>
                      <option value="cards">Cards Grid</option>
                      <option value="timeline">Timeline View</option>
                      <option value="gantt">Gantt Chart</option>
                      <option value="analytics">Analytics View</option>
                      <option value="pipeline">Sales Pipeline</option>
                    </>
                  ) : (
                    <>
                      <option value="tabs">Tabbed Layout</option>
                      <option value="split">Split View</option>
                      <option value="sidebar">Single Page</option>
                      <option value="process">Process Wizard</option>
                      <option value="accordion">Accordion Stack</option>
                    </>
                  )}
                </select>
              </div>
            </div>
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

          {(activeTab === 'builder' || activeTab === 'preview') && (
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
          )}

          <button 
            onClick={() => setIsCommandPaletteOpen(true)}
            className="p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-all"
            title="Open Command Palette (Ctrl+K)"
          >
            <Command size={14} />
          </button>

          <button 
            onClick={() => setActiveTab(activeTab === 'preview' ? 'builder' : 'preview')}
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

          {id !== 'new' && (
            <button 
              onClick={() => window.open(`/workspace/modules/${id}`, '_blank')}
              className="flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[10px] font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all shadow-sm uppercase tracking-widest"
              title="View in Workspace"
            >
              <ExternalLink size={12} />
              <span>Launch</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Discovery Panel */}
        {activeTab === 'builder' && (
          <aside className="w-72 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col overflow-hidden">
            <div className="h-[52px] px-4 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-transparent flex items-center">
              <div className="relative w-full">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input 
                  type="text" 
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  placeholder="Search blocks..."
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                />
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              {activeViewMode === 'master' ? (
                (() => {
                  const filtered = displayFields.filter(f => 
                    (f.label || f.name || '').toLowerCase().includes(sidebarSearch.toLowerCase())
                  );

                  const sortedFiltered = [...filtered].sort((a, b) => {
                    const tabIdxA = tabs.findIndex(t => t.id === a.tabId);
                    const tabIdxB = tabs.findIndex(t => t.id === b.tabId);
                    
                    const aTab = tabIdxA === -1 ? 9999 : tabIdxA;
                    const bTab = tabIdxB === -1 ? 9999 : tabIdxB;
                    
                    if (aTab !== bTab) return aTab - bTab;
                    
                    const rowA = typeof a.rowIndex === 'number' ? a.rowIndex : 0;
                    const rowB = typeof b.rowIndex === 'number' ? b.rowIndex : 0;
                    if (rowA !== rowB) return rowA - rowB;
                    
                    const colA = typeof a.startCol === 'number' ? a.startCol : 0;
                    const colB = typeof b.startCol === 'number' ? b.startCol : 0;
                    return colA - colB;
                  });

                  const groups: { tabLabel: string; fields: any[] }[] = [];
                  tabs.forEach(tab => {
                    const fieldsInTab = sortedFiltered.filter(f => f.tabId === tab.id);
                    if (fieldsInTab.length > 0) {
                      groups.push({
                        tabLabel: tab.label,
                        fields: fieldsInTab
                      });
                    }
                  });

                  const unassignedFields = sortedFiltered.filter(f => !tabs.some(t => t.id === f.tabId));
                  if (unassignedFields.length > 0) {
                    groups.push({
                      tabLabel: 'Other Fields',
                      fields: unassignedFields
                    });
                  }

                  const keyCol = interfaceSettings.master.columns?.find(c => c.fieldId === '_record_key');
                  // Also include metadata/system fields
                  const systemFields = [
                    { id: '_record_key', label: keyCol?.label || 'Record Key', type: 'text' },
                    { id: 'createdAt', label: 'Created Date', type: 'date' },
                    { id: 'createdBy', label: 'Created By', type: 'user' },
                    { id: 'updatedAt', label: 'Updated Date', type: 'date' },
                    { id: 'status', label: 'Status', type: 'select' },
                    { id: 'assigneeId', label: 'Assignee', type: 'user' }
                  ].filter(sf => 
                    sf.label.toLowerCase().includes(sidebarSearch.toLowerCase()) && 
                    !displayFields.some(df => df.id === sf.id) // Avoid duplicates
                  );

                  return (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      {/* Section: Custom Fields */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">Available Fields</h4>
                          <span className="text-[8px] font-bold text-zinc-300 dark:text-zinc-800">{filtered.length}</span>
                        </div>
                        
                        {sortedFiltered.length === 0 ? (
                          <p className="text-[11px] text-zinc-400 dark:text-zinc-600 italic px-1">No custom fields found</p>
                        ) : (
                          <div className="space-y-5">
                            {groups.map((group) => (
                              <div key={group.tabLabel} className="space-y-2">
                                <div className="flex items-center gap-2 px-1 border-b border-zinc-100/50 dark:border-zinc-900/50 pb-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/40" />
                                  <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{group.tabLabel}</span>
                                </div>
                                <div className="space-y-2">
                                  {group.fields.map((field) => {
                                    const isAlreadyActive = interfaceSettings.master.layoutType === 'cards'
                                      ? ((interfaceSettings.master.cardFields || []).length > 0
                                          ? interfaceSettings.master.cardFields.some(cf => cf.fieldId === field.id && cf.visible !== false)
                                          : displayFields.slice(1, 4).some(df => df.id === field.id))
                                      : field.showInTable !== false;
                                    const fieldDef = FIELD_CATEGORIES.flatMap(c => c.fields).find(f => f.id === field.type);
                                    const Icon = fieldDef?.icon || TableProperties;
                                    
                                    return (
                                      <div
                                        key={field.id}
                                        draggable
                                        onDragStart={(e) => {
                                          handleDragStart(e, { type: 'master-column-add', fieldId: field.id });
                                        }}
                                        onDragEnd={handleDragEnd}
                                        onClick={() => {
                                          if (interfaceSettings.master.layoutType === 'cards') {
                                            setInterfaceSettings((prev: any) => {
                                              const cardFields = prev.master.cardFields || [];
                                              const currentFields = cardFields.length > 0
                                                ? cardFields
                                                : displayFields.slice(1, 4).map(df => ({ fieldId: df.id, visible: true }));
                                              
                                              if (currentFields.some((cf: any) => cf.fieldId === field.id)) {
                                                return {
                                                  ...prev,
                                                  master: {
                                                    ...prev.master,
                                                    cardFields: currentFields.map((cf: any) => cf.fieldId === field.id ? { ...cf, visible: !cf.visible } : cf)
                                                  }
                                                };
                                              }
                                              return {
                                                ...prev,
                                                master: {
                                                  ...prev.master,
                                                  cardFields: [...currentFields, { fieldId: field.id, visible: true }]
                                                }
                                              };
                                            });
                                            setSelectedId('__table_settings');
                                          } else {
                                            if (!isAlreadyActive) {
                                              updateField(field.id, { showInTable: true });
                                              setInterfaceSettings(prev => {
                                                const cols = prev.master.columns || [];
                                                if (cols.some(c => c.fieldId === field.id)) {
                                                  return {
                                                    ...prev,
                                                    master: {
                                                      ...prev.master,
                                                      columns: cols.map(c => c.fieldId === field.id ? { ...c, visible: true } : c)
                                                    }
                                                  };
                                                }
                                                return {
                                                  ...prev,
                                                  master: {
                                                    ...prev.master,
                                                    columns: [...cols, { fieldId: field.id, visible: true, inlineEdit: false, width: 200 }]
                                                  }
                                                };
                                              });
                                            }
                                            setSelectedId(field.id);
                                          }
                                        }}
                                        className={cn(
                                          "flex items-center justify-between p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing hover:shadow-sm group",
                                          isAlreadyActive 
                                            ? "bg-zinc-50/50 dark:bg-zinc-900/20 border-indigo-500/20 text-zinc-500" 
                                            : "bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-900 dark:text-zinc-200"
                                        )}
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <div className={cn(
                                            "w-7 h-7 rounded-lg flex items-center justify-center border transition-colors",
                                            isAlreadyActive 
                                              ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400" 
                                              : "bg-indigo-500/5 border-indigo-500/10 text-indigo-500"
                                          )}>
                                            <Icon size={13} />
                                          </div>
                                          <div className="min-w-0 leading-tight">
                                            <p className="text-[11px] font-bold truncate">{field.label || field.name}</p>
                                            <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider">{field.type}</p>
                                          </div>
                                        </div>
                                        
                                        {isAlreadyActive ? (
                                          <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 text-[8px] font-black uppercase tracking-widest rounded">Active</span>
                                        ) : (
                                          <span className="opacity-0 group-hover:opacity-100 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 text-[8px] font-bold uppercase tracking-widest rounded border border-zinc-200 dark:border-zinc-700 transition-opacity">Add</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Section: System Metadata Fields */}
                      {systemFields.length > 0 && (
                        <div className="space-y-3 pt-6 border-t border-zinc-100 dark:border-zinc-900">
                          <div className="flex items-center justify-between px-1">
                            <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">System Metadata</h4>
                            <span className="text-[8px] font-bold text-zinc-300 dark:text-zinc-800">{systemFields.length}</span>
                          </div>
                          
                          <div className="space-y-2">
                            {systemFields.map((field) => {
                              const isAlreadyActive = field.id === '_record_key' || (
                                interfaceSettings.master.layoutType === 'cards'
                                  ? ((interfaceSettings.master.cardFields || []).length > 0
                                      ? interfaceSettings.master.cardFields.some(cf => cf.fieldId === field.id && cf.visible !== false)
                                      : displayFields.slice(1, 4).some(df => df.id === field.id))
                                  : interfaceSettings.master.columns?.some(c => c.fieldId === field.id && c.visible !== false)
                              );
                              const Icon = field.id === '_record_key' ? Key : field.type === 'user' ? Users : Calendar;
                              
                              return (
                                <div
                                  key={field.id}
                                  draggable={field.id !== '_record_key'}
                                  onDragStart={(e) => {
                                    if (field.id === '_record_key') return;
                                    handleDragStart(e, { type: 'master-column-add', fieldId: field.id, isSystem: true });
                                  }}
                                  onDragEnd={handleDragEnd}
                                  onClick={() => {
                                    if (field.id === '_record_key') return;
                                    if (interfaceSettings.master.layoutType === 'cards') {
                                      setInterfaceSettings((prev: any) => {
                                        const cardFields = prev.master.cardFields || [];
                                        const currentFields = cardFields.length > 0
                                          ? cardFields
                                          : displayFields.slice(1, 4).map(df => ({ fieldId: df.id, visible: true }));
                                        
                                        if (currentFields.some((cf: any) => cf.fieldId === field.id)) {
                                          return {
                                            ...prev,
                                            master: {
                                              ...prev.master,
                                              cardFields: currentFields.map((cf: any) => cf.fieldId === field.id ? { ...cf, visible: !cf.visible } : cf)
                                            }
                                          };
                                        }
                                        return {
                                          ...prev,
                                          master: {
                                            ...prev.master,
                                            cardFields: [...currentFields, { fieldId: field.id, visible: true }]
                                          }
                                        };
                                      });
                                      setSelectedId('__table_settings');
                                    } else {
                                      if (!isAlreadyActive) {
                                        setInterfaceSettings(prev => {
                                          const cols = prev.master.columns || [];
                                          if (cols.some(c => c.fieldId === field.id)) {
                                            return {
                                              ...prev,
                                              master: {
                                                ...prev.master,
                                                columns: cols.map(c => c.fieldId === field.id ? { ...c, visible: true } : c)
                                              }
                                            };
                                          }
                                          return {
                                            ...prev,
                                            master: {
                                              ...prev.master,
                                              columns: [...cols, { fieldId: field.id, visible: true, inlineEdit: false, width: 120 }]
                                            }
                                          };
                                        });
                                      }
                                      setSelectedId(field.id);
                                    }
                                  }}
                                  className={cn(
                                    "flex items-center justify-between p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing hover:shadow-sm group",
                                    isAlreadyActive 
                                      ? "bg-zinc-50/50 dark:bg-zinc-900/20 border-indigo-500/20 text-zinc-500" 
                                      : "bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-900 dark:text-zinc-200"
                                  )}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={cn(
                                      "w-7 h-7 rounded-lg flex items-center justify-center border transition-colors",
                                      isAlreadyActive 
                                        ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400" 
                                        : "bg-amber-500/5 border-amber-500/10 text-amber-500"
                                    )}>
                                      <Icon size={13} />
                                    </div>
                                    <div className="min-w-0 leading-tight">
                                      <p className="text-[11px] font-bold truncate">{field.label}</p>
                                      <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider">system</p>
                                    </div>
                                  </div>
                                  
                                  {isAlreadyActive ? (
                                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 text-[8px] font-black uppercase tracking-widest rounded">Active</span>
                                  ) : (
                                    <span className="opacity-0 group-hover:opacity-100 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 text-[8px] font-bold uppercase tracking-widest rounded border border-zinc-200 dark:border-zinc-700 transition-opacity">Add</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                  FIELD_CATEGORIES.map((category) => {
                  const filteredFields = category.fields.filter(f => 
                    f.label?.toLowerCase().includes(sidebarSearch.toLowerCase())
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
                })
              )}
            </div>
          </aside>
        )}



        {/* Canvas / Preview */}
        <main className="flex-1 relative flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
          {/* Main Tab Content Area */}
          <div 
            className={cn(
              "flex-1 relative overflow-y-auto",
              activeTab === 'builder' ? "p-0" : "p-0"
            )}
            onClick={(e) => {
              if (activeTab === 'builder') {
                if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
                  setSelectedIds([]);
                }
              }
            }}
          >
          {activeTab === 'builder' ? (
            activeViewMode === 'master' ? (
              <div className="flex-1 flex overflow-hidden bg-zinc-50 dark:bg-zinc-950 p-8 custom-scrollbar overflow-y-auto min-h-full">
                <div className="max-w-6xl mx-auto w-full space-y-8 animate-in fade-in duration-300">
                  {(!interfaceSettings.master.layoutType || interfaceSettings.master.layoutType === 'table') ? (
                    <div className="space-y-8 animate-in fade-in duration-300">
                      <div className="space-y-8" onDragOver={(e) => e.preventDefault()} onDrop={handleTableDrop}>
                      <div 
                        className={cn(
                          "rounded-3xl relative transition-all duration-300",
                          tableDropIndicator ? "shadow-lg shadow-indigo-500/5" : "shadow-sm"
                        )}
                      >
                        {/* Absolute Background Layer */}
                        <div className="absolute inset-0 bg-white dark:bg-zinc-900 rounded-3xl -z-10 pointer-events-none" />
                        
                        {/* Absolute Border Overlay Layer */}
                        <div 
                          className={cn(
                            "absolute inset-0 rounded-3xl border pointer-events-none z-10 transition-all duration-300",
                            tableDropIndicator 
                              ? "border-indigo-500 ring-4 ring-indigo-500/30" 
                              : "border-zinc-200 dark:border-zinc-800"
                          )}
                        />
                        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between rounded-t-3xl">
                          <div className="space-y-0.5">
                            <span className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">Active Table Columns</span>
                            <p className="text-[9px] text-zinc-400 font-bold uppercase">Drag & Drop headers to reorder • Click header to edit settings</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedId('__table_settings');
                                }}
                                className={cn(
                                  "px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-sm",
                                  selectedId === '__table_settings'
                                    ? "bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/20"
                                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                )}
                              >
                                <Settings size={11} className={selectedId === '__table_settings' ? "animate-spin-slow" : ""} />
                                Table Settings
                              </button>
                            </div>
                          </div>

                          {activeColumns.length === 0 ? (
                            <div className="py-24 text-center space-y-4 px-6 animate-in fade-in duration-300 rounded-b-3xl">
                              <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl flex items-center justify-center mx-auto text-zinc-300 dark:text-zinc-700 border border-zinc-100 dark:border-zinc-800">
                                <TableProperties size={28} />
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-bold text-zinc-900 dark:text-white">Your table is empty</p>
                                <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
                                  Drag and drop fields from the **Available Fields** palette on the left directly into this workspace to build your table columns!
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="overflow-x-auto custom-scrollbar rounded-b-3xl">
                              <table className="w-full text-left table-fixed">
                                <thead>
                                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-900/10">
                                    {/* Lead Key Column (Fixed, always first) */}
                                    <th 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedId('_record_key');
                                      }}
                                      onDragOver={handleKeyHeaderDragOver}
                                      onDragLeave={handleColumnDragLeave}
                                      style={{ width: `${interfaceSettings.master.columns?.find((c: any) => c.fieldId === '_record_key')?.width || 120}px` }}
                                      className={cn(
                                        "text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30 transition-all select-none border-r border-zinc-100 dark:border-zinc-800/50 relative",
                                        interfaceSettings.master.density === 'compact' ? 'px-4 py-2' : 
                                        interfaceSettings.master.density === 'spacious' ? 'px-8 py-5' : 'px-6 py-4',
                                        selectedId === '_record_key' 
                                          ? "bg-indigo-5/40 dark:bg-indigo-500/5 text-indigo-600 dark:text-indigo-400" 
                                          : "text-zinc-400"
                                      )}
                                    >
                                      {interfaceSettings.master.columns?.find((c: any) => c.fieldId === '_record_key')?.label || 'Key'}
                                      
                                      {/* Drop Indicator lines for Key column right drop */}
                                      {tableDropIndicator && tableDropIndicator.hoveredIndex === -1 && (
                                        <div className="absolute top-0 bottom-0 right-0 w-[4px] bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] z-30 animate-pulse pointer-events-none -mr-[2px]" />
                                      )}
                                    </th>

                                    {/* Draggable Column Headers */}
                                    {activeColumns.map((col, idx) => {
                                      const isSelected = selectedId === col.id;
                                      const width = col.columnWidth || (['createdAt', 'createdBy', 'updatedAt', 'status', 'assigneeId'].includes(col.id) ? 120 : 200);
                                      const isSystem = ['createdAt', 'createdBy', 'updatedAt', 'status', 'assigneeId'].includes(col.id);

                                      return (
                                        <th 
                                          key={col.id}
                                          style={{ width: `${width}px` }}
                                          draggable
                                          onDragStart={(e) => handleColumnDragStart(e, idx)}
                                          onDragOver={(e) => handleColumnHeaderDragOver(e, idx)}
                                          onDragLeave={handleColumnDragLeave}
                                          onDrop={(e) => handleColumnDrop(e, idx)}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedId(col.id);
                                          }}
                                          className={cn(
                                            "text-[10px] font-bold uppercase tracking-widest cursor-grab active:cursor-grabbing hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30 transition-all group relative border-l border-zinc-100 dark:border-zinc-800/50 select-none",
                                            interfaceSettings.master.density === 'compact' ? 'px-3 py-2' : 
                                            interfaceSettings.master.density === 'spacious' ? 'px-8 py-5' : 'px-4 py-4',
                                            isSelected 
                                              ? "bg-indigo-50/40 dark:bg-indigo-500/5 text-indigo-600 dark:text-indigo-400" 
                                              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white",
                                            draggingColumnIndex === idx && "opacity-40 bg-zinc-200 dark:bg-zinc-800"
                                          )}
                                        >
                                          <div className="flex items-center justify-between gap-1">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                              <GripVertical size={11} className="text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                              <span className="truncate">{col.label || col.name}</span>
                                            </div>
                                            
                                            {/* Remove Header Button */}
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (!isSystem) {
                                                  updateField(col.id, { showInTable: false });
                                                }
                                                setInterfaceSettings(prev => {
                                                  const cols = prev.master.columns || [];
                                                  return {
                                                    ...prev,
                                                    master: {
                                                      ...prev.master,
                                                      columns: cols.map(c => c.fieldId === col.id ? { ...c, visible: false } : c)
                                                    }
                                                  };
                                                });
                                                if (selectedId === col.id) setSelectedId(null);
                                                toast.success("Column removed");
                                              }}
                                              className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-rose-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                              <X size={10} />
                                            </button>
                                          </div>

                                          {/* Drop Indicator lines */}
                                          {tableDropIndicator && tableDropIndicator.hoveredIndex === idx && (
                                            <div 
                                              className={cn(
                                                "absolute top-0 bottom-0 w-[4px] bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] z-30 animate-pulse pointer-events-none",
                                                tableDropIndicator.side === 'left' ? "left-0 -ml-[2px]" : "right-0 -mr-[2px]"
                                              )}
                                            />
                                          )}
                                        </th>
                                      );
                                    })}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 select-none">
                                {/* Renders dummy/mock rows */}
                                {mockData.slice(0, 3).map((row, rIdx) => (
                                  <tr key={rIdx} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/10 transition-colors">
                                    {/* Lead ID column */}
                                    <td className={cn(
                                      "font-bold text-indigo-500/80 font-mono",
                                      interfaceSettings.master.density === 'compact' ? 'px-6 py-2 text-[10px]' : 
                                      interfaceSettings.master.density === 'spacious' ? 'px-6 py-5 text-sm' : 'px-6 py-4 text-xs'
                                    )}>
                                      {moduleSettings.recordKeyPrefix || 'KEY'}-{100 + rIdx}
                                    </td>
                                    
                                    {/* Active columns data cells */}
                                    {activeColumns.map((col) => {
                                      const width = col.columnWidth || (['createdAt', 'createdBy', 'updatedAt', 'status', 'assigneeId'].includes(col.id) ? 120 : 200);
                                      let cellValue = row[col.id] || row[col.name] || '-';
                                      
                                      // Custom user display
                                      if (col.type === 'user' || col.id === 'createdBy' || col.id === 'assigneeId') {
                                        cellValue = (
                                          <div className="flex items-center gap-1.5">
                                            <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-500 border border-zinc-300 dark:border-zinc-700">
                                              U
                                            </div>
                                            <span className="text-zinc-600 dark:text-zinc-400 truncate">Mock User</span>
                                          </div>
                                        );
                                      } else if (col.type === 'date' || col.id === 'createdAt' || col.id === 'updatedAt') {
                                        cellValue = new Date().toLocaleDateString();
                                      } else if (col.id === 'status') {
                                        cellValue = (
                                          <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold border border-indigo-500/20">
                                            Active
                                          </span>
                                        );
                                      } else if (typeof cellValue === 'object') {
                                        cellValue = 'Complex Data';
                                      }

                                      return (
                                        <td 
                                          key={col.id} 
                                          style={{ width: `${width}px` }}
                                          className={cn(
                                            "text-zinc-500 dark:text-zinc-400 truncate border-l border-zinc-100/50 dark:border-zinc-800/30",
                                            interfaceSettings.master.density === 'compact' ? 'px-4 py-2 text-[11px]' : 
                                            interfaceSettings.master.density === 'spacious' ? 'px-4 py-5 text-sm' : 'px-4 py-4 text-xs'
                                          )}
                                        >
                                          {cellValue}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        </div>
                      </div>
                    </div>
                  ) : renderMasterViewPreview()}
                </div>
              </div>
            ) : (
              <>
                {/* Unified Page Control Bar */}
                {activeTab !== 'builder' && (
                  <div className="sticky top-0 z-30 bg-zinc-100/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-4 h-[52px] flex items-center gap-4">
                {isLoading ? (
                  <>
                    {/* Skeleton for Icon & Title */}
                    <div className="flex items-center gap-3 px-2 py-0.5 rounded-xl transition-all flex-shrink-0 animate-pulse">
                      <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
                        <div className="h-2 w-16 bg-zinc-200/60 dark:bg-zinc-800/60 rounded-sm" />
                      </div>
                    </div>
                    
                    <div className="h-6 w-px bg-zinc-300 dark:bg-zinc-700 mx-1 flex-shrink-0" />

                    {/* Skeleton for Tabs */}
                    <div className="flex-1 flex items-center gap-2 overflow-hidden animate-pulse">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-8 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-lg flex-shrink-0" />
                      ))}
                    </div>

                    <div className="h-8 w-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg flex-shrink-0 animate-pulse" />
                  </>
                ) : (
                  <>
                    {/* Left: Title & Settings */}
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId('page-header');
                      }}
                      className={cn(
                        "flex items-center gap-3 cursor-pointer group px-2 py-0.5 rounded-xl transition-all flex-shrink-0",
                        selectedId === 'page-header' ? "bg-indigo-500/10 ring-1 ring-indigo-500/50" : "hover:bg-zinc-200 dark:hover:bg-zinc-800"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors shadow-sm",
                        selectedId === 'page-header' ? "bg-indigo-600 text-white" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 group-hover:text-indigo-500"
                      )}>
                        <DynamicIcon name={moduleSettings.iconName || 'Box'} size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight truncate">
                            {moduleSettings.titleFieldId 
                              ? (layout.find(f => f.id === moduleSettings.titleFieldId)?.label || 'Page Title') 
                              : 'Page Title'}
                          </h2>
                          <Settings2 size={12} className={cn("transition-opacity flex-shrink-0", selectedId === 'page-header' ? "opacity-100 text-indigo-500" : "opacity-0 group-hover:opacity-100 text-zinc-400")} />
                        </div>
                        <p className="text-[10px] text-zinc-500 font-medium opacity-60">Record Title Mapping</p>
                      </div>
                    </div>

                    <div className="h-6 w-px bg-zinc-300 dark:bg-zinc-700 mx-1 flex-shrink-0" />

                    {/* Right: Tabs */}
                    <div className="flex-1 flex items-center gap-2 relative overflow-hidden">
                      {showLeftScroll && (
                        <button 
                          onClick={() => tabContainerRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
                          className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-zinc-100 dark:from-zinc-900 via-zinc-100/80 dark:via-zinc-900/80 to-transparent z-10 flex items-center group/scroll"
                        >
                          <div className="w-6 h-6 rounded-full bg-white dark:bg-zinc-800 shadow-md flex items-center justify-center ml-1 text-zinc-500 group-hover/scroll:text-indigo-600 transition-colors">
                            <ChevronLeft size={14} />
                          </div>
                        </button>
                      )}
                      
                      <div 
                        ref={tabContainerRef}
                        onScroll={checkScroll}
                        onWheel={(e) => {
                          if (tabContainerRef.current) {
                            tabContainerRef.current.scrollLeft += e.deltaY;
                          }
                        }}
                        className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-hide py-1 px-2"
                      >
                        <Reorder.Group 
                          axis="x" 
                          values={tabs} 
                          onReorder={setTabs}
                          className="flex items-center gap-1.5"
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
                                  className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-indigo-500 rounded-lg text-xs font-bold focus:outline-none min-w-[100px] shadow-lg"
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
                                      "px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border whitespace-nowrap",
                                      currentTabId === tab.id
                                        ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
                                    )}
                                  >
                                    {interfaceSettings.detail?.showTabIcons && (
                                      <DynamicIcon name={tab.iconName || 'Layout'} size={12} className="shrink-0" />
                                    )}
                                    {tab.label}
                                    {currentTabId === tab.id && (
                                      <Settings2 
                                        size={12} 
                                        className="ml-1 opacity-60 hover:opacity-100 transition-opacity" 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedId(tab.id);
                                        }}
                                      />
                                    )}
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
                                      className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-20"
                                    >
                                      <X size={8} />
                                    </button>
                                  )}
                                </div>
                              )}
                            </Reorder.Item>
                          ))}
                        </Reorder.Group>
                      </div>

                      {showRightScroll && (
                        <button 
                          onClick={() => tabContainerRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
                          className="absolute right-10 top-0 bottom-0 w-10 bg-gradient-to-l from-zinc-100 dark:from-zinc-900 via-zinc-100/80 dark:via-zinc-900/80 to-transparent z-10 flex items-center justify-end group/scroll"
                        >
                          <div className="w-6 h-6 rounded-full bg-white dark:bg-zinc-800 shadow-md flex items-center justify-center mr-1 text-zinc-500 group-hover/scroll:text-indigo-600 transition-colors">
                            <ChevronRight size={14} />
                          </div>
                        </button>
                      )}
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newId = `tab-${generateId()}`;
                          setTabs([...tabs, { id: newId, label: 'New Tab' }]);
                          setCurrentTabId(newId);
                          setIsEditingTab(newId);
                          setSelectedId(newId);
                        }}
                        className="p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-400 hover:text-indigo-600 hover:border-indigo-500/50 transition-all flex-shrink-0 shadow-sm"
                        title="Add New Tab"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </>
                )}
                  </div>
                )}

              <div className="w-full space-y-4 relative px-6 py-6">

                <div className="flex items-start gap-6 w-full">
                  {/* Grid Canvas */}
                  <div 
                    ref={canvasContainerRef}
                    className={cn(
                      "flex-1 min-w-0 rounded-3xl shadow-sm overflow-hidden relative grid-canvas-container flex flex-col",
                      viewportSize === 'desktop' ? "w-full" :
                      viewportSize === 'tablet' ? "w-[768px]" :
                      "w-[375px]"
                    )}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDropOnCanvas}
                  >
                    {/* Absolute Background Layer */}
                    <div className="absolute inset-0 bg-white dark:bg-zinc-900 rounded-3xl -z-10 pointer-events-none" />
                    
                    {/* Absolute Border Overlay Layer */}
                    <div className="absolute inset-0 rounded-3xl border border-zinc-200 dark:border-zinc-800 pointer-events-none z-30" />
                  {/* Connection Visualizer Layer */}
                  <ConnectionLine hoveredMapping={hoveredMapping} containerRef={canvasContainerRef} />

                  {/* In-Canvas Title Header (Conditional for builder canvas) */}
                  {activeTab === 'builder' && (
                    <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm px-8 py-5 flex items-center justify-between gap-4 z-20 relative select-none">
                      {isLoading ? (
                        <div className="flex items-center gap-3.5 px-3 py-2 rounded-2xl flex-shrink-0 animate-pulse">
                          <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
                            <div className="h-2 w-16 bg-zinc-200/60 dark:bg-zinc-800/60 rounded-sm" />
                          </div>
                        </div>
                      ) : (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId('page-header');
                          }}
                          className={cn(
                            "flex items-center gap-3.5 cursor-pointer group px-3 py-2 rounded-2xl transition-all border border-transparent flex-shrink-0",
                            selectedId === 'page-header' 
                              ? "bg-indigo-500/10 border-indigo-500/30 ring-4 ring-indigo-500/5 shadow-sm" 
                              : "hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:border-zinc-100 dark:hover:border-zinc-800"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-md shadow-zinc-200/50 dark:shadow-none border border-transparent",
                            selectedId === 'page-header' 
                              ? "bg-indigo-600 text-white shadow-indigo-500/20" 
                              : "bg-zinc-100 dark:bg-zinc-900 text-zinc-400 group-hover:text-indigo-500 group-hover:bg-indigo-500/5 group-hover:border-indigo-500/10"
                          )}>
                            <DynamicIcon name={moduleSettings.iconName || 'Box'} size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h2 className="text-base font-black text-zinc-900 dark:text-white tracking-tight truncate leading-none">
                                {moduleSettings.titleFieldId 
                                  ? (layout.find(f => f.id === moduleSettings.titleFieldId)?.label || 'Page Title') 
                                  : 'Page Title'}
                              </h2>
                              <Settings2 size={13} className={cn("transition-all duration-300 flex-shrink-0", selectedId === 'page-header' ? "opacity-100 text-indigo-500 transform rotate-45" : "opacity-0 group-hover:opacity-100 text-zinc-400")} />
                            </div>
                            <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest mt-1 block">Record Header Title</span>
                          </div>
                        </div>
                      )}

                      {/* Detail Settings Configuration trigger */}
                      {isLoading ? (
                        <div className="h-9 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId('__detail_settings');
                          }}
                          className={cn(
                            "flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shadow-sm border",
                            selectedId === '__detail_settings'
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20"
                              : "bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
                          )}
                        >
                          <Settings size={12} className={cn("transition-transform duration-500", selectedId === '__detail_settings' ? "rotate-90" : "")} />
                          <span>
                            {interfaceSettings.detail.layoutType === 'tabs' || !interfaceSettings.detail.layoutType ? 'Tabbed Settings' :
                             interfaceSettings.detail.layoutType === 'split' ? 'Split Settings' :
                             interfaceSettings.detail.layoutType === 'sidebar' ? 'Single Page Settings' :
                             interfaceSettings.detail.layoutType === 'process' ? 'Wizard Settings' :
                             'Accordion Settings'}
                          </span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Dynamic horizontal section tabs bar inside the builder canvas card */}
                  {activeTab === 'builder' && (interfaceSettings.detail?.layoutType === 'tabs' || !interfaceSettings.detail?.layoutType) && (
                    <div className="px-8 py-3 bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4 select-none">
                      {isLoading ? (
                        <>
                          <div className="flex-grow flex items-center gap-2 overflow-hidden animate-pulse">
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="h-7.5 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-xl flex-shrink-0" />
                            ))}
                          </div>
                          <div className="w-8 h-8 bg-zinc-200 dark:bg-zinc-800 rounded-xl flex-shrink-0 animate-pulse" />
                        </>
                      ) : (
                        <>
                          <div className="flex-1 flex items-center gap-2 overflow-hidden relative">
                            {showCanvasLeftScroll && (
                              <button 
                                type="button"
                                onClick={() => canvasTabContainerRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
                                className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-zinc-50 dark:from-zinc-900 via-zinc-50/80 dark:via-zinc-900/80 to-transparent z-20 flex items-center group/scroll"
                              >
                                <div className="w-6 h-6 rounded-full bg-white dark:bg-zinc-800 shadow-md flex items-center justify-center ml-1 text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                  <ChevronLeft size={14} />
                                </div>
                              </button>
                            )}

                            <div 
                              ref={canvasTabContainerRef}
                              onScroll={checkCanvasScroll}
                              onWheel={(e) => {
                                if (canvasTabContainerRef.current) {
                                  canvasTabContainerRef.current.scrollLeft += e.deltaY;
                                }
                              }}
                              className="flex-grow overflow-x-auto scrollbar-hide py-1"
                            >
                              <Reorder.Group 
                                axis="x" 
                                values={tabs} 
                                onReorder={setTabs}
                                className="flex items-center gap-1.5"
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
                                        className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-indigo-500 rounded-lg text-xs font-bold focus:outline-none min-w-[100px] shadow-lg text-zinc-900 dark:text-white"
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
                                            "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border whitespace-nowrap",
                                            currentTabId === tab.id
                                              ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                              : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                          )}
                                        >
                                          {interfaceSettings.detail?.showTabIcons && (
                                            <DynamicIcon name={tab.iconName || 'Layout'} size={12} className="shrink-0" />
                                          )}
                                          <span>{tab.label}</span>
                                          {currentTabId === tab.id && (
                                            <Settings2 
                                              size={11} 
                                              className="opacity-60 hover:opacity-100 transition-opacity" 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedId(tab.id);
                                              }}
                                            />
                                          )}
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
                                            className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-20"
                                          >
                                            <X size={8} />
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </Reorder.Item>
                                ))}
                              </Reorder.Group>
                            </div>

                            {showCanvasRightScroll && (
                              <button 
                                type="button"
                                onClick={() => canvasTabContainerRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
                                className="absolute right-10 top-0 bottom-0 w-10 bg-gradient-to-l from-zinc-50 dark:from-zinc-900 via-zinc-50/80 dark:via-zinc-900/80 to-transparent z-20 flex items-center justify-end group/scroll"
                              >
                                <div className="w-6 h-6 rounded-full bg-white dark:bg-zinc-800 shadow-md flex items-center justify-center mr-1 text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                  <ChevronRight size={14} />
                                </div>
                              </button>
                            )}
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const newId = `tab-${Date.now()}`;
                                setTabs([...tabs, { id: newId, label: 'New Section' }]);
                                setCurrentTabId(newId);
                                setIsEditingTab(newId);
                                setSelectedId(newId);
                              }}
                              className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400 hover:text-indigo-600 hover:border-indigo-500/50 transition-all flex-shrink-0 shadow-sm"
                              title="Add Section Tab"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {activeTab === 'builder' && interfaceSettings.detail?.layoutType === 'process' && (
                    <div className="px-8 py-5 bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 flex flex-col gap-4 select-none">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest font-black">Guided Process Wizard Preview</span>
                          <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase mt-0.5">
                            Step {(tabs.findIndex(t => t.id === currentTabId) + 1) || 1} of {tabs.length}: {tabs.find(t => t.id === currentTabId)?.label || 'Step'}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                          {tabs.map((tab: any, idx: number) => {
                            const isCurrent = currentTabId === tab.id;
                            const isCompleted = tabs.findIndex(t => t.id === currentTabId) > idx;
                            return (
                              <div key={tab.id} className="flex items-center">
                                {idx > 0 && <span className="w-4 h-px bg-zinc-200 dark:bg-zinc-800 mx-1" />}
                                <div 
                                  onClick={() => {
                                    setCurrentTabId(tab.id);
                                    setSelectedId(tab.id);
                                  }}
                                  className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border transition-all cursor-pointer",
                                    isCurrent
                                      ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                                      : isCompleted
                                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                                        : "bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400"
                                  )}
                                >
                                  {isCompleted ? <LucideIcons.Check size={8} strokeWidth={4} /> : idx + 1}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 transition-all duration-300"
                          style={{ width: `${((tabs.findIndex(t => t.id === currentTabId) + 1) / tabs.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Horizontal split container for Left Sidebar + Main Grid + Right Workflow Panel */}
                  <div className="flex w-full items-stretch flex-1">
                    
                    {/* Sidebar Vertical Tabs list if layoutType === 'split' */}
                    {activeTab === 'builder' && interfaceSettings.detail?.layoutType === 'split' && (
                      <div className="w-60 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 p-5 space-y-4 flex flex-col justify-between select-none">
                        {isLoading ? (
                          <div className="space-y-4 animate-pulse w-full">
                            <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded px-2 ml-2" />
                            <div className="space-y-2">
                              {[1, 2, 3].map(i => (
                                <div key={i} className="h-9 w-full bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="space-y-4 flex-1 min-h-0 flex flex-col">
                              <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-2">Sections</p>
                              <div className="flex-1 overflow-y-auto px-1.5 pt-1.5 pb-2 custom-scrollbar">
                                <Reorder.Group 
                                  axis="y" 
                                  values={tabs} 
                                  onReorder={setTabs}
                                  className="space-y-1.5"
                                >
                                  {tabs.map((tab) => (
                                    <Reorder.Item 
                                      key={tab.id} 
                                      value={tab}
                                      dragListener={isEditingTab !== tab.id}
                                      className="group relative"
                                    >
                                      {isEditingTab === tab.id ? (
                                        <input
                                          autoFocus
                                          className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-indigo-500 rounded-lg text-xs font-bold focus:outline-none shadow-lg text-zinc-900 dark:text-white"
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
                                              "w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between group",
                                              currentTabId === tab.id
                                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                            )}
                                          >
                                            <div className="flex items-center gap-2 min-w-0">
                                              {interfaceSettings.detail?.showTabIcons && (
                                                <DynamicIcon name={tab.iconName || 'Layout'} size={12} className="shrink-0" />
                                              )}
                                              <span className="truncate">{tab.label}</span>
                                            </div>
                                            <ChevronRight size={12} className={cn("transition-transform shrink-0 ml-2", currentTabId === tab.id ? "text-white" : "text-zinc-400 group-hover:translate-x-0.5")} />
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
                                              className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-20"
                                            >
                                              <X size={8} />
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </Reorder.Item>
                                  ))}
                                </Reorder.Group>
                              </div>
                            </div>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const newId = `tab-${Date.now()}`;
                                setTabs([...tabs, { id: newId, label: 'New Section' }]);
                                setCurrentTabId(newId);
                                setIsEditingTab(newId);
                                setSelectedId(newId);
                              }}
                              className="w-full py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400 hover:text-indigo-600 hover:border-indigo-500/50 transition-all flex items-center justify-center gap-2 shadow-sm font-bold text-xs uppercase tracking-widest"
                            >
                              <Plus size={14} />
                              <span>Add Section</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {activeTab === 'builder' && interfaceSettings.detail?.layoutType === 'accordion' ? (
                      <div className="flex-1 p-8 pb-32 space-y-6 overflow-y-auto max-h-[calc(100vh-140px)] custom-scrollbar select-none">
                        {tabs.map((tab) => {
                          const isCollapsed = collapsedGroups[tab.id] ?? false;
                          return (
                            <div 
                              key={tab.id} 
                              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[24px] shadow-sm overflow-hidden transition-all"
                            >
                              <div 
                                onClick={() => setCollapsedGroups(prev => ({ ...prev, [tab.id]: !isCollapsed }))}
                                className="p-5 bg-zinc-50/50 dark:bg-zinc-900/30 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between cursor-pointer select-none"
                              >
                                <div className="flex items-center gap-3">
                                  {interfaceSettings.detail?.showTabIcons ? (
                                    <DynamicIcon name={tab.iconName || 'Layout'} size={12} className="text-indigo-500 shrink-0" />
                                  ) : (
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                  )}
                                  <h3 className="text-[10px] font-black uppercase tracking-wider text-zinc-900 dark:text-white">{tab.label}</h3>
                                </div>
                                <LucideIcons.ChevronDown size={14} className={cn("text-zinc-400 transition-transform duration-200", isCollapsed && "rotate-180")} />
                              </div>
                              
                              {!isCollapsed && (
                                <div 
                                  onDragOver={(e) => handleDragOver(e, undefined, tab.id)}
                                  onDrop={(e) => handleDropOnCanvas(e, undefined, tab.id)}
                                  className={cn(
                                    "p-6 min-h-[150px] relative transition-all duration-300 grid grid-cols-1 md:grid-cols-12",
                                    isArchitectThinking && "opacity-40 grayscale-[0.5] scale-[0.99] pointer-events-none"
                                  )}
                                  style={{ 
                                    gap: `${GRID_CONFIG.gap}px`,
                                    gridAutoRows: `${GRID_CONFIG.rowHeight}px`
                                  }}
                                >
                                  {isLoading ? (
                                    <div className="col-span-12 h-20 bg-zinc-50 dark:bg-zinc-900/50 animate-pulse rounded-xl" />
                                  ) : (
                                    renderFieldBlocks(previewLayout || layout, undefined, tab.id)
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div 
                        id="main-grid-container"
                      className={cn(
                        "flex-1 min-w-0 p-8 pb-32 min-h-[800px] relative z-10 transition-all duration-300",
                        interfaceSettings.detail?.layoutType === 'sidebar' 
                          ? "flex flex-col gap-8 overflow-y-auto max-h-[calc(100vh-140px)] custom-scrollbar" 
                          : "grid grid-cols-1 " + (viewportSize !== 'mobile' ? "md:grid-cols-12" : ""),
                        isArchitectThinking && "opacity-40 grayscale-[0.5] scale-[0.99] pointer-events-none"
                      )}
                      style={{ 
                        gap: interfaceSettings.detail?.layoutType === 'sidebar' ? undefined : `${GRID_CONFIG.gap}px`,
                        padding: `${GRID_CONFIG.padding}px`,
                        paddingBottom: '160px',
                        gridAutoRows: interfaceSettings.detail?.layoutType === 'sidebar' ? undefined : `${GRID_CONFIG.rowHeight}px`
                      }}
                    >
                    <AnimatePresence mode="popLayout">
                        {isLoading ? (
                          <motion.div
                            key="skeleton-grid"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="col-span-12 grid grid-cols-12 gap-5 animate-pulse"
                          >
                            {/* Large Card Skeleton (Group) - Approx 300px (6 units) */}
                            <div className="col-span-12 h-[300px] bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 space-y-6">
                              <div className="h-6 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
                              <div className="grid grid-cols-2 gap-x-8 gap-y-10">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                  <div key={i} className="space-y-3">
                                    <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
                                    <div className="h-[44px] w-full bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-xl" />
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Row of standard field skeletons - 100px (2 units) */}
                            {[1, 2].map(row => (
                              <div key={row} className="col-span-6 h-[100px] bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 space-y-3">
                                <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
                                <div className="h-[44px] w-full bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-xl" />
                              </div>
                            ))}

                            {/* Another Group or Text Area skeleton */}
                            <div className="col-span-12 h-[200px] bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 space-y-6">
                              <div className="h-6 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
                              <div className="h-[100px] w-full bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-xl" />
                            </div>
                          </motion.div>
                        ) : interfaceSettings.detail?.layoutType === 'sidebar' ? (() => {
                          const displayLayout = previewLayout || layout;
                          const renderFieldBlocks = (fields: Field[], parentId?: string, tabId?: string): React.ReactNode => {
                            const isNested = !!parentId;
                            const filtered = fields.filter(block => {
                              const type = block.type?.toLowerCase();
                              if (!showSystemFields && (type === 'connector' || type === 'automation' || type === 'nexus_connector')) return false;

                              if ((activeTab as string) === 'preview' && !isFieldVisible(block, {}, { user })) return false;

                              if (isNested) return true;
                              return block.tabId === tabId || (!block.tabId && tabId === tabs[0]?.id);
                            });
                            
                            let items = [...filtered];

                            if ((activeTab as string) === 'preview') {
                              items = compactLayout(items);
                            }

                            return items.map((item) => {
                              if (React.isValidElement(item)) return item;
                              const block = item as Field;
                              const isGroup = isContainerField(block.type);

                              if (isGroup) {
                                return (
                                  <FieldGroup 
                                    key={block.id}
                                    block={block}
                                    selectedIds={selectedIds}
                                    onSelect={(id, e) => {
                                      if (e?.shiftKey || e?.metaKey || e?.ctrlKey) {
                                        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                                      } else {
                                        setSelectedIds([id]);
                                      }
                                    }}
                                    onUpdate={updateField}
                                    onDelete={(id) => deleteBlocks([id])}
                                    onDrop={(e) => handleDropOnCanvas(e, block.id, tabId)}
                                    onDragOver={(e) => handleDragOver(e, block.id, tabId)}
                                    onDragStart={handleDragStart}
                                    renderNested={(fields, pId) => renderFieldBlocks(fields as any, pId, tabId)}
                                    viewportSize={viewportSize}
                                    onClone={cloneField}
                                    isDraggingOver={dragOverInfo?.active && dragOverInfo?.parentId === block.id}
                                    hoveredMapping={hoveredMapping}
                                    dragOverInfo={dragOverInfo}
                                  />
                                );
                              }

                              if (block.id === 'placeholder') {
                                return (
                                  <div 
                                    key="placeholder"
                                    className="border-2 border-dashed border-indigo-500/50 bg-indigo-500/5 rounded-[24px] animate-pulse flex items-center justify-center relative overflow-hidden h-full"
                                    style={{ 
                                      gridColumn: viewportSize === 'mobile' ? 'span 1' : `${block.startCol || 1} / span ${block.colSpan || 12}`,
                                      gridRow: viewportSize === 'mobile' ? 'auto' : `${(block.rowIndex || 0) + 1} / span ${calculateHeight(block)}`
                                    }}
                                  >
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent" />
                                    <div className="relative flex flex-col items-center gap-1">
                                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                                      <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Drop Zone</span>
                                    </div>
                                  </div>
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
                                    gridRow: viewportSize === 'mobile' ? 'auto' : `${(block.rowIndex || 0) + 1} / span ${calculateHeight(block)}`
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (e.shiftKey || e.metaKey || e.ctrlKey) {
                                      setSelectedIds(prev => prev.includes(block.id) ? prev.filter(id => id !== block.id) : [...prev, block.id]);
                                    } else {
                                      setSelectedIds([block.id]);
                                    }
                                  }}
                                  id={`canvas-field-${block.id}`}
                                  className={cn(
                                    "group/field relative p-4 rounded-2xl cursor-pointer transition-all border-2 h-full flex flex-col",
                                    selectedIds.includes(block.id) 
                                      ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-500/5 ring-4 ring-indigo-500/10 z-30" 
                                      : "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800 hover:border-indigo-500/30 hover:z-40",
                                    block.hidden && activeTab === 'builder' && "opacity-40 border-dashed grayscale-[0.5] hover:opacity-100 hover:grayscale-0",
                                    activeDragItem?.fieldId === block.id && "shadow-2xl ring-4 ring-indigo-500/20 z-50 cursor-grabbing",
                                    hoveredMapping?.targetFieldId === block.id && "ring-8 ring-indigo-500/30 border-indigo-500 scale-[1.02] shadow-2xl z-30"
                                  )}
                                >
                                  {/* Selection UI */}
                                  {selectedIds.includes(block.id) && (
                                    <div className="absolute -top-3 left-6 px-3 py-1 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg z-20">
                                      Selected
                                    </div>
                                  )}
                                  <div className="space-y-2 flex-1 overflow-y-auto scrollbar-hide">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                                          {(() => {
                                            const fieldDef = FIELD_CATEGORIES.flatMap(c => c.fields).find(f => f.id === block.type);
                                            const Icon = fieldDef?.icon;
                                            return Icon ? <Icon size={10} className="text-zinc-400" /> : null;
                                          })()}
                                          {FIELD_CATEGORIES.flatMap(c => c.fields).find(f => f.id === block.type)?.label || block.type.replace('_', ' ')}
                                          {block.required && <span className="text-rose-500">*</span>}
                                          {block.tooltip && <HelpCircle size={10} className="text-zinc-400" />}
                                        </label>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {block.hidden && (
                                          <div 
                                            className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center gap-1 cursor-pointer hover:bg-rose-500/20"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              updateField(block.id, { hidden: false });
                                            }}
                                          >
                                            <EyeOff size={10} className="text-rose-500" />
                                            <span className="text-[8px] font-black text-rose-500 uppercase tracking-tighter">Hidden</span>
                                          </div>
                                        )}
                                        <GripVertical size={12} className="text-zinc-300 group-hover/field:text-zinc-500" />
                                      </div>
                                    </div>

                                    {!(block.type === 'heading' || block.type === 'alert' || block.type === 'divider' || block.type === 'spacer') && (
                                      <p className="text-[11px] font-medium text-zinc-900 dark:text-zinc-300 mb-1">{block.label}</p>
                                    )}

                                    <div className="min-h-[20px]">
                                      {block.type === 'heading' ? (() => {
                                        const rawTag = block.options?.[0] || 'h2';
                                        const Tag = (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(rawTag) ? rawTag : 'h2') as React.ElementType;
                                        const size = Tag === 'h1' ? 'text-2xl font-bold' :
                                                     Tag === 'h2' ? 'text-xl font-bold' :
                                                     Tag === 'h3' ? 'text-lg font-bold' :
                                                     Tag === 'h4' ? 'text-base font-bold' : 'text-xl font-bold';
                                        return (
                                          <div className="pt-2">
                                            <Tag className={cn("text-zinc-900 dark:text-white tracking-tight", size)}>
                                              {block.label || 'Heading'}
                                            </Tag>
                                          </div>
                                        );
                                      })() : block.type === 'divider' ? (
                                        <div className="py-2">
                                          <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-4" />
                                        </div>
                                      ) : block.type === 'spacer' ? (
                                        <div className="py-2">
                                          <div className="h-8 border-x border-zinc-100 dark:border-zinc-800/50 border-dashed mx-auto w-px" />
                                        </div>
                                      ) : block.type === 'alert' ? (() => {
                                        const variant = block.options?.[0] || 'info';
                                        const alertStyle = variant === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-600' :
                                                      variant === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' :
                                                      variant === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' :
                                                      'bg-indigo-500/10 border-indigo-500/20 text-indigo-600';
                                        const AlertIcon = variant === 'error' ? XCircle :
                                                     variant === 'warning' ? AlertTriangle :
                                                     variant === 'success' ? Check : Info;
                                        return (
                                          <div className="pt-2">
                                            <div className={cn("p-4 rounded-2xl border flex items-center gap-3", alertStyle)}>
                                              <AlertIcon size={18} />
                                              <span className="text-xs font-bold uppercase tracking-widest">{block.label || 'Alert Notice'}</span>
                                            </div>
                                          </div>
                                        );
                                      })() : block.type === 'html' ? (
                                        <div className="pt-2">
                                          <div className="min-h-[120px] bg-zinc-950 rounded-2xl p-5 font-mono text-[10px] text-emerald-500/80 leading-relaxed shadow-2xl border border-white/5 overflow-hidden group/html relative">
                                            <div className="absolute top-0 right-0 p-3 flex gap-2">
                                              <div className="w-2 h-2 rounded-full bg-rose-500/50" />
                                              <div className="w-2 h-2 rounded-full bg-amber-500/50" />
                                              <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
                                            </div>
                                            <span className="block text-indigo-400">&lt;div class="custom-card"&gt;</span>
                                            <span className="block pl-4">&lt;h1&gt;{block.label}&lt;/h1&gt;</span>
                                            <span className="block pl-4 text-zinc-500">&lt;p&gt;Dynamic HTML content...&lt;/p&gt;</span>
                                            <span className="block text-indigo-400">&lt;/div&gt;</span>
                                          </div>
                                        </div>
                                      ) : block.type === 'icon' ? (
                                        <div className="flex flex-col items-center justify-center gap-3 pt-4 pb-2">
                                          <div className="w-16 h-16 bg-indigo-500/10 rounded-3xl flex items-center justify-center text-indigo-600 border border-indigo-500/20 shadow-xl shadow-indigo-500/5">
                                            <DynamicIcon name={block.iconName || 'Smile'} size={32} />
                                          </div>
                                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Icon Preview</span>
                                        </div>
                                      ) : block.type === 'time' ? (
                                        <div className="h-10 bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/50 rounded-xl flex items-center justify-between px-4 shadow-sm dark:shadow-none">
                                          <span className="text-xs text-zinc-400 dark:text-zinc-600 italic truncate">00:00 AM</span>
                                          <Clock size={14} className="text-zinc-400 dark:text-zinc-600" />
                                        </div>
                                      ) : block.type === 'sub_module' ? (
                                        renderSubmoduleMock(block)
                                      ) : block.type === 'lookup' ? (
                                        <div className="pt-2">
                                          <div className="h-11 w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-between px-4">
                                            <div className="flex items-center gap-2">
                                              <Search size={14} className="text-zinc-400" />
                                              <span className="text-xs text-zinc-400 font-medium italic select-none">
                                                {block.placeholder || `Search ${block.label}...`}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        /* All other basic input fields */
                                        <div className="pt-2">
                                          <div className="h-11 w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-between px-4">
                                            <span className="text-xs text-zinc-400 font-medium italic select-none">
                                              {block.placeholder || `Enter ${block.label}...`}
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Quick Action Buttons (Overlapping Border) */}
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      cloneField(block.id);
                                    }}
                                    className="absolute -top-3.5 right-6 w-7 h-7 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-full flex items-center justify-center opacity-0 group-hover/field:opacity-100 transition-opacity shadow-lg z-50 hover:scale-110 active:scale-95 border border-zinc-200 dark:border-zinc-700"
                                    title="Duplicate Field"
                                  >
                                    <Copy size={12} />
                                  </button>

                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setLayout(prev => removeFieldRecursive(prev, block.id));
                                      if (selectedId === block.id) setSelectedId(null);
                                    }}
                                    className="absolute -top-3.5 -right-3.5 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/field:opacity-100 transition-opacity shadow-lg z-50 hover:scale-110 active:scale-95"
                                    title="Delete Field"
                                  >
                                    <Trash2 size={14} />
                                  </button>

                                  {!block.hidden && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateField(block.id, { hidden: true });
                                      }}
                                      className="absolute -top-3.5 right-15 w-7 h-7 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-full flex items-center justify-center opacity-0 group-hover/field:opacity-100 transition-opacity shadow-lg z-50 hover:scale-110 active:scale-95 border border-zinc-200 dark:border-zinc-700"
                                      title="Quick Hide Field"
                                    >
                                      <EyeOff size={12} />
                                    </button>
                                  )}
                                </motion.div>
                              );
                            });
                          };

                          return tabs.map((tab) => {
                            const tabFields = displayLayout.filter(f => !f.parentId && (f.tabId === tab.id || (!f.tabId && tab.id === tabs[0]?.id)));

                            return (
                              <div 
                                key={tab.id}
                                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] p-8 shadow-sm space-y-6 relative group/section w-full"
                              >
                                <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 select-none">
                                  <div className="flex items-center gap-3">
                                    {interfaceSettings.detail?.showTabIcons ? (
                                      <DynamicIcon name={tab.iconName || 'Layout'} size={14} className="text-indigo-500 shrink-0" />
                                    ) : (
                                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                                    )}
                                    <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">{tab.label}</h3>
                                  </div>
                                  <button
                                    onClick={() => setSelectedId(tab.id)}
                                    className="p-2 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-100 dark:border-zinc-700 rounded-xl text-zinc-400 hover:text-indigo-600 transition-all opacity-0 group-hover/section:opacity-100"
                                    title="Section Settings"
                                  >
                                    <Settings size={12} />
                                  </button>
                                </div>

                                <div 
                                  id={`section-grid-${tab.id}`}
                                  className={cn(
                                    "grid items-start content-start transition-all duration-300 relative min-h-[120px] w-full",
                                    "grid-cols-1",
                                    viewportSize !== 'mobile' && "md:grid-cols-12"
                                  )}
                                  style={{ 
                                    gap: `${GRID_CONFIG.gap}px`,
                                    gridAutoRows: `${GRID_CONFIG.rowHeight}px`
                                  }}
                                  onDragOver={(e) => handleDragOver(e, undefined, tab.id)}
                                  onDrop={(e) => handleDropOnCanvas(e, undefined, tab.id)}
                                  onDragLeave={handleDragLeave}
                                >
                                  {renderFieldBlocks(displayLayout, undefined, tab.id)}
                                  
                                  {tabFields.length === 0 && !dragOverInfo && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/20 dark:bg-zinc-950/10 py-8">
                                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Drop fields here to add to {tab.label}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          });
                        })() : (() => {
                          const displayLayout = previewLayout || layout;
                          const renderFieldBlocks = (fields: Field[], parentId?: string): React.ReactNode => {
                            const isNested = !!parentId;
                             const filtered = fields.filter(block => {
                               // System fields filter (connectors, etc)
                               const type = block.type?.toLowerCase();
                               if (!showSystemFields && (type === 'connector' || type === 'automation' || type === 'nexus_connector')) return false;

                               if ((activeTab as string) === 'preview' && !isFieldVisible(block, {}, { user })) return false;

                               if (isNested) return true;
                               return block.tabId === currentTabId || (!block.tabId && currentTabId === tabs[0]?.id);
                             });
                            
                            let items = [...filtered];

                            if ((activeTab as string) === 'preview') {
                              items = compactLayout(items);
                            }

                            return items.map((item) => {
                              if (React.isValidElement(item)) return item;
                              const block = item as Field;
                              const isGroup = isContainerField(block.type);

                                if (isGroup) {
                                return (
                                  <FieldGroup 
                                    key={block.id}
                                    block={block}
                                    selectedIds={selectedIds}
                                    onSelect={(id, e) => {
                                      if (e?.shiftKey || e?.metaKey || e?.ctrlKey) {
                                        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                                      } else {
                                        setSelectedIds([id]);
                                      }
                                    }}
                                    onUpdate={updateField}
                                    onDelete={(id) => deleteBlocks([id])}
                                    onDrop={handleDropOnCanvas}
                                    onDragOver={handleDragOver}
                                    onDragStart={handleDragStart}
                                    renderNested={renderFieldBlocks}
                                    viewportSize={viewportSize}
                                    onClone={cloneField}
                                    isDraggingOver={dragOverInfo?.active && dragOverInfo?.parentId === block.id}
                                    hoveredMapping={hoveredMapping}
                                    dragOverInfo={dragOverInfo}
                                  />
                                );
                              }
                              if (block.id === 'placeholder') {
                                return (
                                  <div 
                                    key="placeholder"
                                    className="border-2 border-dashed border-indigo-500/50 bg-indigo-500/5 rounded-[24px] animate-pulse flex items-center justify-center relative overflow-hidden h-full"
                                    style={{ 
                                      gridColumn: viewportSize === 'mobile' ? 'span 1' : `${block.startCol || 1} / span ${block.colSpan || 12}`,
                                      gridRow: viewportSize === 'mobile' ? 'auto' : `${(block.rowIndex || 0) + 1} / span ${calculateHeight(block)}`
                                    }}
                                  >
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent" />
                                    <div className="relative flex flex-col items-center gap-1">
                                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                                      <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Drop Zone</span>
                                    </div>
                                  </div>
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
                                    gridRow: viewportSize === 'mobile' ? 'auto' : `${(block.rowIndex || 0) + 1} / span ${calculateHeight(block)}`
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (e.shiftKey || e.metaKey || e.ctrlKey) {
                                      setSelectedIds(prev => prev.includes(block.id) ? prev.filter(id => id !== block.id) : [...prev, block.id]);
                                    } else {
                                      setSelectedIds([block.id]);
                                    }
                                  }}
                                  id={`canvas-field-${block.id}`}
                                  className={cn(
                                    "group/field relative p-4 rounded-2xl cursor-pointer transition-all border-2 h-full flex flex-col",
                                    selectedIds.includes(block.id) 
                                      ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-500/5 ring-4 ring-indigo-500/10 z-30" 
                                      : "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800 hover:border-indigo-500/30 hover:z-40",
                                    block.hidden && activeTab === 'builder' && "opacity-40 border-dashed grayscale-[0.5] hover:opacity-100 hover:grayscale-0",
                                    activeDragItem?.fieldId === block.id && "shadow-2xl ring-4 ring-indigo-500/20 z-50 cursor-grabbing",
                                    hoveredMapping?.targetFieldId === block.id && "ring-8 ring-indigo-500/30 border-indigo-500 scale-[1.02] shadow-2xl z-30"
                                  )}
                                >
                                  {/* Selection UI */}
                                  {selectedIds.includes(block.id) && (
                                    <div className="absolute -top-3 left-6 px-3 py-1 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg z-20">
                                      Selected
                                    </div>
                                  )}
                                   <div className="space-y-2 flex-1 overflow-y-auto scrollbar-hide">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                                           {(() => {
                                             const fieldDef = FIELD_CATEGORIES.flatMap(c => c.fields).find(f => f.id === block.type);
                                             const Icon = fieldDef?.icon;
                                             return Icon ? <Icon size={10} className="text-zinc-400" /> : null;
                                           })()}
                                          {FIELD_CATEGORIES.flatMap(c => c.fields).find(f => f.id === block.type)?.label || block.type.replace('_', ' ')}
                                          {block.required && <span className="text-rose-500">*</span>}
                                          {block.tooltip && <HelpCircle size={10} className="text-zinc-400" />}
                                        </label>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {(() => {
                                          const mappingEntry = Object.entries(connectorMappings).find(([_, m]) => Object.values(m).includes(block.id));
                                          if (mappingEntry) {
                                            const [connId] = mappingEntry;
                                            const connector = connectorRegistry.find(c => c.id === connId);
                                            return (
                                              <div 
                                                className={cn(
                                                  "flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all duration-500",
                                                  hoveredMapping?.targetFieldId === block.id 
                                                    ? "bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-500/30 scale-110" 
                                                    : "bg-indigo-500/10 border-indigo-500/20 shadow-sm shadow-indigo-500/5"
                                                )}
                                                title={`Mapped to ${connector?.label || 'Nexus Connector'}`}
                                              >
                                                <Zap size={10} className={cn(hoveredMapping?.targetFieldId === block.id ? "text-white animate-pulse" : "text-indigo-500")} />
                                                <span className={cn(
                                                  "text-[8px] font-black uppercase tracking-tighter",
                                                  hoveredMapping?.targetFieldId === block.id ? "text-white" : "text-indigo-500"
                                                )}>Mapped</span>
                                              </div>
                                            );
                                          }
                                          return null;
                                        })()}
                                        {block.visibilityRule && (
                                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-100 dark:bg-white/5 rounded-full border border-zinc-200 dark:border-white/10 shadow-sm" title={block.visibilityRule.action === 'hide' ? "Conditional Hide Logic Applied" : "Conditional Show Logic Applied"}>
                                            <BrainCircuit size={10} className={cn(block.visibilityRule.action === 'hide' ? "text-rose-500" : "text-indigo-500")} />
                                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-tighter">Logic</span>
                                          </div>
                                        )}
                                        {block.hidden && (
                                          <div 
                                            className="flex items-center gap-1.5 px-2 py-0.5 bg-rose-500/10 rounded-full border border-rose-500/20 shadow-sm cursor-pointer hover:bg-rose-500/20 transition-all" 
                                            title="Hidden by Default (Click to show)"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              updateField(block.id, { hidden: false });
                                            }}
                                          >
                                            <EyeOff size={10} className="text-rose-500" />
                                            <span className="text-[8px] font-black text-rose-500 uppercase tracking-tighter">Hidden</span>
                                          </div>
                                        )}

                                        <GripVertical size={12} className="text-zinc-300 group-hover/field:text-zinc-500" />
                                      </div>
                                    </div>

                                    {!(block.type === 'heading' || block.type === 'alert' || block.type === 'divider' || block.type === 'spacer') && (
                                      <p className="text-[11px] font-medium text-zinc-900 dark:text-zinc-300 mb-1">{block.label}</p>
                                    )}

                                  <div className="min-h-[20px]">
                                    {block.type === 'heading' ? (() => {
                                      const rawTag = block.options?.[0] || 'h2';
                                      const Tag = (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(rawTag) ? rawTag : 'h2') as React.ElementType;
                                      const size = Tag === 'h1' ? 'text-2xl font-bold' :
                                                   Tag === 'h2' ? 'text-xl font-bold' :
                                                   Tag === 'h3' ? 'text-lg font-bold' :
                                                   Tag === 'h4' ? 'text-base font-bold' : 'text-xl font-bold';
                                      return (
                                        <div className="pt-2">
                                          <Tag className={cn("text-zinc-900 dark:text-white tracking-tight", size)}>
                                            {block.label || 'Heading'}
                                          </Tag>
                                        </div>
                                      );
                                    })() : block.type === 'divider' ? (
                                      <div className="py-2">
                                        <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-4" />
                                      </div>
                                    ) : block.type === 'spacer' ? (
                                      <div className="py-2">
                                        <div className="h-8 border-x border-zinc-100 dark:border-zinc-800/50 border-dashed mx-auto w-px" />
                                      </div>
                                    ) : block.type === 'alert' ? (() => {
                                      const variant = block.options?.[0] || 'info';
                                      const alertStyle = variant === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-600' :
                                                    variant === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' :
                                                    variant === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' :
                                                    'bg-indigo-500/10 border-indigo-500/20 text-indigo-600';
                                      const AlertIcon = variant === 'error' ? XCircle :
                                                   variant === 'warning' ? AlertTriangle :
                                                   variant === 'success' ? Check : Info;
                                      return (
                                        <div className="pt-2">
                                          <div className={cn("p-4 rounded-2xl border flex items-center gap-3", alertStyle)}>
                                            <AlertIcon size={18} />
                                            <span className="text-xs font-bold uppercase tracking-widest">{block.label || 'Alert Notice'}</span>
                                          </div>
                                        </div>
                                      );
                                    })() : block.type === 'html' ? (
                                      <div className="pt-2">
                                        <div 
                                          className="text-sm text-zinc-500 leading-relaxed prose dark:prose-invert max-w-none" 
                                          dangerouslySetInnerHTML={{ __html: block.label || 'HTML content...' }} 
                                        />
                                      </div>
                                    ) : block.type === 'button' ? (
                                      <div className="pt-2">
                                        <button
                                          type="button"
                                          className={cn(
                                            "px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                                            block.variant === 'secondary' ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white" :
                                            block.variant === 'outline' ? "border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white" :
                                            block.variant === 'danger' ? "bg-rose-500 text-white" :
                                            "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                                          )}
                                        >
                                          {block.label || 'Action Button'}
                                        </button>
                                      </div>
                                    ) : block.type === 'radio' || block.type === 'checkboxGroup' ? (
                                      <div className="space-y-3 pt-2">
                                        {(block.options || ['Option 1', 'Option 2']).map((opt, i) => (
                                          <div key={i} className="flex items-center gap-3">
                                            <div className={cn(
                                              "w-5 h-5 border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950",
                                              block.type === 'radio' ? "rounded-full" : "rounded-lg"
                                            )} />
                                            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{opt}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : block.type === 'toggle' ? (
                                      <div className="flex items-center gap-3 pt-2">
                                        <div className="w-10 h-5 bg-zinc-200 dark:bg-zinc-800 rounded-full relative">
                                          <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm" />
                                        </div>
                                        <span className="text-xs text-zinc-500 dark:text-zinc-400">On / Off</span>
                                      </div>
                                    ) : block.type === 'slider' ? (
                                      <div className="space-y-4 pt-4">
                                        <div className="relative h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                          <div className="absolute left-0 top-0 h-full w-1/3 bg-indigo-500" />
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-[10px] font-bold text-zinc-400">0</span>
                                          <span className="text-[10px] font-bold text-indigo-500">33</span>
                                          <span className="text-[10px] font-bold text-zinc-400">100</span>
                                        </div>
                                      </div>
                                    ) : block.type === 'rating' ? (
                                      <div className="flex items-center gap-1.5 pt-2">
                                        {[1, 2, 3, 4, 5].map(i => (
                                          <Star key={i} size={18} className={cn(i <= 3 ? "text-amber-400 fill-amber-400" : "text-zinc-200 dark:text-zinc-800")} />
                                        ))}
                                        <span className="ml-2 text-xs font-bold text-zinc-400">3.0</span>
                                      </div>
                                    ) : block.type === 'colorpicker' ? (
                                      <div className="flex items-center gap-3 pt-2">
                                        <div className="w-10 h-10 rounded-2xl bg-indigo-500 shadow-lg shadow-indigo-500/20 border border-white/20" />
                                        <div className="flex-1 h-10 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center px-4 font-mono text-xs text-zinc-500">
                                          #6366F1
                                        </div>
                                      </div>
                                    ) : block.type === 'tag' ? (
                                      <div className="flex flex-wrap gap-2 pt-2">
                                        {['Innovation', 'Strategy', 'Design'].map((tag, i) => (
                                          <div key={i} className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                                            {tag}
                                          </div>
                                        ))}
                                        <div className="px-3 py-1 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-full text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                          + Add
                                        </div>
                                      </div>
                                    ) : block.type === 'autonumber' ? (
                                      <div className="pt-2">
                                        <div className="h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center px-4 font-mono text-xs text-indigo-500 font-black border border-indigo-500/10">
                                          {block.autonumberPrefix || ''}
                                          {(block.autonumberStart || 1).toString().padStart(block.autonumberDigits || 0, '0')}
                                          {block.autonumberSuffix || ''}
                                        </div>
                                        <p className="text-[9px] text-zinc-400 mt-2 italic px-1">Value generated on record creation</p>
                                      </div>
                                    ) : block.type === 'connector' ? (
                                      <div className="pt-2">
                                        <div className="p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-[2.5rem] flex flex-col gap-6 group/connector transition-all hover:bg-indigo-500-[0.07] relative overflow-hidden shadow-sm">
                                          {/* Background Glow */}
                                          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16 group-hover/connector:scale-150 transition-transform duration-1000" />
                                          
                                          <div className="flex items-center justify-between relative z-10">
                                            <div className="flex items-center gap-4">
                                              {(() => {
                                                const conn = activeConnectors.find(c => c.connectorId === block.connectorId) || 
                                                             connectorRegistry.find(c => c.id === block.connectorId);
                                                const iconName = block.icon || conn?.icon || conn?.connector?.icon || 'Zap';
                                                return (
                                                  <button 
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      updateField(block.id, { isCollapsed: !block.isCollapsed });
                                                    }}
                                                    className="w-14 h-14 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-center text-indigo-500 shadow-xl shadow-indigo-500/10 hover:scale-110 transition-transform duration-500 group-hover/connector:rotate-12"
                                                  >
                                                    {block.isCollapsed ? <ChevronDown size={24} /> : <DynamicIcon name={iconName} size={28} />}
                                                  </button>
                                                );
                                              })()}
                                              <div className="text-left">
                                                <h4 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight">{block.label || 'Nexus Connector'}</h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                  <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", block.connectorId ? "bg-emerald-500" : "bg-rose-500")} />
                                                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                                                    {!block.connectorId ? 'Needs Configuration' : block.isCollapsed ? 'Collapsed' : 'Capability Active'}
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                            
                                            <div className="flex gap-2">
                                              {!block.connectorId && (
                                                <div className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-xl mr-2">
                                                  <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest">Setup Needed</span>
                                                </div>
                                              )}
                                              {!block.isCollapsed && block.connectorId && (
                                                <>
                                                  <button 
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setSelectedId(block.id);
                                                      setRightSidebarTab('inspector');
                                                    }}
                                                    className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
                                                    title="Configure Mapping"
                                                  >
                                                    <ArrowRightLeft size={16} />
                                                  </button>
                                                  <button 
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      const conn = activeConnectors.find(c => c.connectorId === block.connectorId) || connectorRegistry.find(c => c.id === block.connectorId);
                                                      if (conn) {
                                                        setConfigConnector(conn);
                                                        setConfigDrawerOpen(true);
                                                      }
                                                    }}
                                                    className="w-10 h-10 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all"
                                                    title="Secrets & Config"
                                                  >
                                                    <Settings2 size={16} />
                                                  </button>
                                                </>
                                              )}
                                              <button 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  updateField(block.id, { isCollapsed: !block.isCollapsed });
                                                }}
                                                className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 hover:text-indigo-500 transition-all"
                                              >
                                                {block.isCollapsed ? <Maximize2 size={16} /> : <ChevronUp size={16} />}
                                              </button>
                                            </div>
                                          </div>

                                          <AnimatePresence>
                                            {!block.isCollapsed && (
                                              <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                                className="overflow-hidden"
                                              >
                                                <div className="space-y-6 pt-4">
                                                  {!block.connectorId ? (
                                                    <div className="py-10 flex flex-col items-center justify-center gap-6 border-2 border-dashed border-rose-500/20 rounded-[2.5rem] bg-rose-500/[0.02] transition-all hover:bg-rose-500/[0.05]">
                                                      <div className="relative">
                                                        <div className="absolute inset-0 bg-rose-500/20 blur-2xl rounded-full" />
                                                        <div className="w-20 h-20 bg-white dark:bg-zinc-900 rounded-[2rem] flex items-center justify-center text-rose-500 shadow-2xl relative z-10 border border-rose-500/20">
                                                          <Zap size={40} className="animate-pulse" />
                                                        </div>
                                                      </div>
                                                      <div className="text-center space-y-2">
                                                        <h5 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight">Integration Setup Required</h5>
                                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest max-w-[200px] leading-relaxed">Choose a Nexus capability to activate this block's logic and data streams.</p>
                                                      </div>
                                                      <button 
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          setSelectedId(block.id);
                                                          setShowConnectorModal(true);
                                                        }}
                                                        className="px-8 py-3 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-rose-500/20 hover:bg-rose-500 hover:scale-105 active:scale-95 transition-all"
                                                      >
                                                        Configure Capability
                                                      </button>
                                                    </div>
                                                  ) : (
                                                    <>
                                                      <div className="h-px bg-zinc-100 dark:bg-white/5 w-full" />
                                                      <div className="space-y-3 relative z-10">
                                                        <div className="flex items-center justify-between px-1 border-t border-indigo-500/10 pt-4 mt-2">
                                                          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Active Data Streams</p>
                                                          <p className="text-[9px] font-bold text-indigo-500 uppercase">{Object.keys(connectorMappings[block.connectorId] || {}).length} Mapped</p>
                                                        </div>
                                                        
                                                        <div className="grid grid-cols-1 gap-2">
                                                          {(() => {
                                                            const registryEntry = activeConnectors.find(c => c.connectorId === block.connectorId) || connectorRegistry.find(c => c.id === block.connectorId);
                                                            const outputs = registryEntry?.ioSchema?.outputs || registryEntry?.connector?.ioSchema?.outputs || [];
                                                            const mappings = connectorMappings[block.connectorId] || {};
                                                            const activeMappings = outputs.filter((o: any) => mappings[o.name]);
                                                            
                                                            if (activeMappings.length === 0) {
                                                              return (
                                                                <div className="py-4 text-center border border-dashed border-indigo-500/20 rounded-2xl">
                                                                  <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest italic">No Data Links Established</p>
                                                                </div>
                                                              );
                                                            }

                                                            return activeMappings.map((output: any) => {
                                                              const targetId = mappings[output.name];
                                                              const targetField = layout.find(f => f.id === targetId);
                                                              
                                                              return (
                                                                <motion.div 
                                                                  key={output.name}
                                                                  id={`output-${block.connectorId}-${output.name}`}
                                                                  onHoverStart={() => setHoveredMapping({ 
                                                                    connectorId: block.connectorId, 
                                                                    sourceOutput: output.name, 
                                                                    targetFieldId: targetId 
                                                                  })}
                                                                  onHoverEnd={() => setHoveredMapping(null)}
                                                                  className={cn(
                                                                    "flex items-center justify-between p-3 bg-white/50 dark:bg-zinc-900/50 border rounded-2xl group/mapping transition-all cursor-help",
                                                                    hoveredMapping?.sourceOutput === output.name 
                                                                      ? "border-indigo-500 bg-white dark:bg-zinc-900 shadow-lg shadow-indigo-500/10" 
                                                                      : "border-zinc-200/50 dark:border-white/5"
                                                                  )}
                                                                >
                                                                  <div className="flex items-center gap-2">
                                                                    <div className={cn(
                                                                      "w-6 h-6 rounded-lg flex items-center justify-center transition-colors",
                                                                      hoveredMapping?.sourceOutput === output.name ? "bg-indigo-600 text-white" : "bg-indigo-500/10 text-indigo-500"
                                                                    )}>
                                                                      <DynamicIcon name={registryEntry?.icon || registryEntry?.connector?.icon || 'Zap'} size={12} className={cn(hoveredMapping?.sourceOutput === output.name && "animate-pulse")} />
                                                                    </div>
                                                                    <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300">{output.label || output.name}</span>
                                                                  </div>
                                                                  <div className="flex items-center gap-2">
                                                                    <ArrowRight size={10} className={cn("transition-transform", hoveredMapping?.sourceOutput === output.name ? "translate-x-1 text-indigo-500" : "text-zinc-300")} />
                                                                    <div className={cn(
                                                                      "px-2 py-1 rounded-lg border transition-all",
                                                                      hoveredMapping?.sourceOutput === output.name ? "bg-indigo-600 border-indigo-600" : "bg-indigo-500/10 border-indigo-500/10"
                                                                    )}>
                                                                      <span className={cn(
                                                                        "text-[9px] font-black uppercase tracking-tight",
                                                                        hoveredMapping?.sourceOutput === output.name ? "text-white" : "text-indigo-600 dark:text-indigo-400"
                                                                      )}>
                                                                        {targetField?.label || 'Target Field'}
                                                                      </span>
                                                                    </div>
                                                                  </div>
                                                                </motion.div>
                                                              );
                                                            });
                                                          })()}
                                                        </div>
                                                      </div>
                                                    </>
                                                    )
                                                  }
                                                </div>
                                              </motion.div>
                                            )}
                                          </AnimatePresence>
                                        </div>
                                      </div>

                                    ) : block.type === 'buttonGroup' ? (
                                      <div className="pt-2 flex">
                                        {['Primary', 'Secondary', 'Tertiary'].map((btn, i) => (
                                          <div key={i} className={cn(
                                            "flex-1 h-10 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest border border-zinc-200 dark:border-zinc-800",
                                            i === 0 ? "rounded-l-xl bg-indigo-600 text-white border-indigo-600" :
                                            i === 2 ? "rounded-r-xl bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400" :
                                            "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-x-0"
                                          )}>
                                            {btn}
                                          </div>
                                        ))}
                                      </div>
                                    ) : block.type === 'signature' ? (
                                      <div className="h-32 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-3 group/signature overflow-hidden relative">
                                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(zinc-200 1px, transparent 1px)', backgroundSize: '100% 24px' }} />
                                        <PenTool size={24} className="text-zinc-300 group-hover/signature:text-indigo-500 transition-colors" />
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Sign here</span>
                                        <div className="absolute bottom-4 right-4 flex gap-2">
                                          <div className="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center"><X size={12} className="text-zinc-400" /></div>
                                          <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center"><CheckSquare size={12} className="text-white" /></div>
                                        </div>
                                      </div>
                                    ) : block.type === 'qr_scanner' ? (
                                      <div className="h-40 bg-black rounded-2xl flex flex-col items-center justify-center gap-4 relative overflow-hidden group/scanner">
                                        <div className="absolute inset-0 border-2 border-indigo-500/20 animate-pulse" />
                                        <div className="w-48 h-48 border-2 border-indigo-500 rounded-3xl flex items-center justify-center relative">
                                          <div className="absolute inset-0 bg-indigo-500/10" />
                                          <div className="w-full h-0.5 bg-indigo-500 absolute top-1/2 -translate-y-1/2 shadow-[0_0_15px_rgba(99,102,241,0.8)]" />
                                          <QrCode size={48} className="text-indigo-500/50" />
                                        </div>
                                        <span className="text-[10px] font-bold text-white uppercase tracking-widest z-10 bg-black/50 px-4 py-2 rounded-full backdrop-blur-md">Scanning Active</span>
                                      </div>
                                    ) : block.type === 'payment' ? (
                                      <div className="p-5 bg-zinc-900 rounded-3xl space-y-6 shadow-2xl border border-white/10">
                                        <div className="flex justify-between items-start">
                                          <div className="space-y-1">
                                            <span className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Total Amount</span>
                                            <span className="block text-xl font-black text-white">$1,250.00</span>
                                          </div>
                                          <CreditCard size={24} className="text-indigo-500" />
                                        </div>
                                        <div className="space-y-3">
                                          <div className="h-10 bg-zinc-800 rounded-xl flex items-center px-4 justify-between">
                                            <span className="text-[10px] text-zinc-500 font-mono">•••• •••• •••• 4242</span>
                                            <div className="w-8 h-5 bg-zinc-700 rounded" />
                                          </div>
                                          <div className="h-11 bg-indigo-600 rounded-xl flex items-center justify-center text-[10px] font-black text-white uppercase tracking-widest shadow-lg shadow-indigo-500/20">
                                            Pay Now
                                          </div>
                                        </div>
                                      </div>
                                    ) : block.type === 'richtext' ? (
                                      <div className="min-h-[160px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col overflow-hidden shadow-sm">
                                        <div className="h-10 border-b border-zinc-100 dark:border-zinc-900 flex items-center px-4 gap-4 bg-zinc-50/50 dark:bg-transparent">
                                          <div className="flex gap-2">
                                            <div className="w-6 h-6 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-[10px] font-black">B</div>
                                            <div className="w-6 h-6 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-[10px] italic font-serif">I</div>
                                            <div className="w-6 h-6 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-[10px] underline">U</div>
                                          </div>
                                          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
                                          <AlignLeft size={14} className="text-zinc-400" />
                                          <ListPlus size={14} className="text-zinc-400" />
                                        </div>
                                        <div className="flex-1 p-5 space-y-3">
                                          <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-900 rounded-full" />
                                          <div className="h-2 w-3/4 bg-zinc-100 dark:bg-zinc-900 rounded-full" />
                                          <div className="h-2 w-5/6 bg-zinc-100 dark:bg-zinc-900 rounded-full" />
                                        </div>
                                      </div>

                                    ) : block.type === 'icon' ? (
                                      <div className="flex flex-col items-center justify-center gap-3 pt-4 pb-2">
                                        <div className="w-16 h-16 bg-indigo-500/10 rounded-3xl flex items-center justify-center text-indigo-600 border border-indigo-500/20 shadow-xl shadow-indigo-500/5">
                                          <DynamicIcon name={block.iconName || 'Smile'} size={32} />
                                        </div>
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Icon Preview</span>
                                      </div>
                                    ) : block.type === 'video' ? (
                                      <div className="aspect-video w-full bg-black rounded-3xl overflow-hidden relative group/video shadow-2xl">
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center group-hover/video:scale-110 transition-transform">
                                            <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-white border-b-[8px] border-b-transparent ml-1.5" />
                                          </div>
                                        </div>
                                        <div className="absolute bottom-6 left-6 right-6 space-y-3">
                                          <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                                            <div className="h-full w-1/3 bg-indigo-500" />
                                          </div>
                                          <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-mono text-white/60">01:42 / 04:20</span>
                                            <div className="flex gap-4">
                                              <Settings2 size={14} className="text-white/60" />
                                              <Maximize2 size={14} className="text-white/60" />
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ) : block.type === 'audio' ? (
                                      <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center gap-4 shadow-sm">
                                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                                          <Music size={18} />
                                        </div>
                                        <div className="flex-1 space-y-2">
                                          <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-tight">Audio_Track_01.mp3</span>
                                            <span className="text-[8px] font-mono text-zinc-400">2:45</span>
                                          </div>
                                          <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden relative">
                                            <div className="absolute left-0 top-0 h-full w-1/2 bg-indigo-500" />
                                          </div>
                                        </div>
                                      </div>
                                    ) : block.type === 'progress' ? (
                                      <div className="space-y-4 pt-4">
                                        <div className="flex justify-between items-end">
                                          <div className="space-y-1">
                                            <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{block.label}</span>
                                            <span className="block text-lg font-black text-zinc-900 dark:text-white">65%</span>
                                          </div>
                                          <Activity size={20} className="text-emerald-500 mb-1" />
                                        </div>
                                        <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden shadow-inner p-0.5">
                                          <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: '65%' }}
                                            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full" 
                                          />
                                        </div>
                                      </div>
                                    ) : block.type === 'map' ? (
                                      <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-3xl overflow-hidden relative group/map shadow-2xl border border-zinc-200 dark:border-zinc-800">
                                        <div className="absolute inset-0 opacity-40 dark:opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <div className="relative">
                                            <div className="w-12 h-12 bg-rose-500/20 rounded-full animate-ping absolute -inset-0" />
                                            <div className="w-12 h-12 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center shadow-2xl relative z-10 border-2 border-rose-500">
                                              <MapPin size={24} className="text-rose-500" />
                                            </div>
                                          </div>
                                        </div>
                                        <div className="absolute bottom-6 left-6 right-6 p-4 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl flex items-center justify-between">
                                          <div className="space-y-0.5">
                                            <span className="block text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-tight">Selected Location</span>
                                            <span className="block text-[9px] text-zinc-500">San Francisco, CA 94103</span>
                                          </div>
                                          <button className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest">Get Directions</button>
                                        </div>
                                      </div>
                                    ) : block.type === 'canvas' ? (
                                      <div className="h-48 bg-white dark:bg-zinc-950 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl flex flex-col items-center justify-center gap-4 group/canvas relative overflow-hidden">
                                        <Brush size={32} className="text-zinc-200 dark:text-zinc-800 transition-colors group-hover/canvas:text-indigo-500" />
                                        <div className="text-center space-y-1">
                                          <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Drawing Canvas</span>
                                          <span className="block text-[9px] text-zinc-500 italic">Click to start drawing...</span>
                                        </div>
                                        <div className="absolute bottom-4 left-4 flex gap-2">
                                          {[ '#ef4444', '#f59e0b', '#10b981', '#6366f1' ].map(c => (
                                            <div key={c} className="w-4 h-4 rounded-full shadow-sm border border-white/10" style={{ backgroundColor: c }} />
                                          ))}
                                        </div>
                                      </div>
                                    ) : block.type === 'chat' ? (
                                      <div className="h-80 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl flex flex-col overflow-hidden shadow-2xl">
                                        <div className="h-[52px] border-b border-zinc-100 dark:border-zinc-900 flex items-center px-5 justify-between bg-white dark:bg-zinc-950">
                                          <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-indigo-500/20">A</div>
                                            <div>
                                              <span className="block text-[11px] font-bold text-zinc-900 dark:text-white uppercase tracking-tight">Project Aurora</span>
                                              <span className="block text-[9px] text-emerald-500 font-medium">3 Online Now</span>
                                            </div>
                                          </div>
                                          <Settings2 size={14} className="text-zinc-400" />
                                        </div>
                                        <div className="flex-1 p-5 space-y-6 overflow-y-auto custom-scrollbar">
                                          <div className="flex gap-3">
                                            <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex-shrink-0" />
                                            <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl rounded-tl-none shadow-sm space-y-1 max-w-[80%]">
                                              <span className="block text-[8px] font-bold text-indigo-500 uppercase tracking-widest">Sarah Miller</span>
                                              <p className="text-xs text-zinc-600 dark:text-zinc-400">Hey team, I've just updated the branding settings. What do you think?</p>
                                            </div>
                                          </div>
                                          <div className="flex gap-3 flex-row-reverse">
                                            <div className="w-8 h-8 rounded-full bg-indigo-600 flex-shrink-0 shadow-lg shadow-indigo-500/20" />
                                            <div className="p-3 bg-indigo-600 text-white rounded-2xl rounded-tr-none shadow-xl shadow-indigo-500/10 space-y-1 max-w-[80%]">
                                              <p className="text-xs">Looks stunning! The glassmorphism effects are really starting to pop.</p>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="p-4 bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-900">
                                          <div className="h-11 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center px-4 gap-3">
                                            <Smile size={18} className="text-zinc-400" />
                                            <span className="text-xs text-zinc-400 italic flex-1">Type a message...</span>
                                            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg"><ArrowUp size={14} /></div>
                                          </div>
                                        </div>
                                      </div>
                                    ) : block.type === 'card' ? (
                                      <div className="p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-2xl relative overflow-hidden group/card">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16 group-hover/card:scale-150 transition-transform duration-700" />
                                        <div className="space-y-6 relative z-10">
                                          <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-500/20">
                                              <Box size={24} />
                                            </div>
                                            <div className="space-y-1">
                                              <h4 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight leading-none">{block.label}</h4>
                                              <p className="text-xs text-zinc-500 font-medium opacity-60">Container ID: {block.id}</p>
                                            </div>
                                          </div>
                                          <div className="h-px bg-zinc-100 dark:bg-zinc-800" />
                                          <div className="min-h-[100px] border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-2 bg-zinc-50/50 dark:bg-zinc-950/50">
                                            <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center"><Plus size={14} className="text-zinc-300" /></div>
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Drop elements here</span>
                                          </div>
                                        </div>
                                      </div>
                                    ) : block.type === 'accordion' ? (
                                      <div className="space-y-3 pt-2">
                                        {[1, 2, 3].map(i => (
                                          <div key={i} className={cn(
                                            "border rounded-2xl overflow-hidden transition-all",
                                            i === 1 ? "bg-white dark:bg-zinc-900 border-indigo-500/30 shadow-lg shadow-indigo-500/5" : "bg-white dark:bg-zinc-950 border-zinc-100 dark:border-zinc-800"
                                          )}>
                                            <div className="h-12 flex items-center px-5 justify-between">
                                              <div className="flex items-center gap-3">
                                                <div className={cn("w-1.5 h-1.5 rounded-full", i === 1 ? "bg-indigo-500" : "bg-zinc-300 dark:bg-zinc-700")} />
                                                <span className={cn("text-xs font-bold uppercase tracking-tight", i === 1 ? "text-zinc-900 dark:text-white" : "text-zinc-400")}>Section {i} Title</span>
                                              </div>
                                              <div className={cn("w-2 h-2 border-b-2 border-r-2 transition-transform duration-300", i === 1 ? "border-indigo-500 rotate-[225deg] mt-1" : "border-zinc-300 rotate-45 mb-1")} />
                                            </div>
                                            {i === 1 && (
                                              <div className="p-5 pt-0 space-y-3">
                                                <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full opacity-60" />
                                                <div className="h-2 w-3/4 bg-zinc-100 dark:bg-zinc-800 rounded-full opacity-60" />
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    ) : block.type === 'tabs_nested' ? (
                                      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
                                        <div className="h-[52px] border-b border-zinc-100 dark:border-zinc-900 flex items-center px-2 bg-zinc-50/50 dark:bg-zinc-900/30">
                                          {['Overview', 'History', 'Documents'].map((tab, i) => (
                                            <div key={i} className={cn(
                                              "h-10 px-6 flex items-center text-[10px] font-black uppercase tracking-widest cursor-default transition-all",
                                              i === 0 ? "bg-white dark:bg-zinc-900 text-indigo-600 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800" : "text-zinc-400"
                                            )}>{tab}</div>
                                          ))}
                                        </div>
                                        <div className="p-8 min-h-[200px] flex flex-col items-center justify-center gap-4">
                                          <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-900 rounded-2xl flex items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800">
                                            <Plus size={18} className="text-zinc-300" />
                                          </div>
                                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Tab Content Area</span>
                                        </div>
                                      </div>
                                    ) : block.type === 'stepper' ? (
                                      <div className="pt-6 px-8 pb-10">
                                        <div className="flex items-center justify-between relative">
                                          {/* Connecting Line Background */}
                                          <div className="absolute top-5 left-8 right-8 h-0.5 bg-zinc-100 dark:bg-zinc-800" />
                                          
                                          {[1, 2, 3].map((step, i) => (
                                            <div key={step} className="flex flex-col items-center gap-3 relative z-10">
                                              <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-500",
                                                i === 0 ? "bg-indigo-600 text-white shadow-xl shadow-indigo-500/40 ring-4 ring-indigo-500/10" : 
                                                i === 1 ? "bg-white dark:bg-zinc-900 border-2 border-indigo-500 text-indigo-500" :
                                                "bg-white dark:bg-zinc-950 border-2 border-zinc-100 dark:border-zinc-800 text-zinc-300"
                                              )}>
                                                {step}
                                              </div>
                                              
                                              {/* Active Line Fill (placed relative to the step) */}
                                              {i === 0 && (
                                                <div className="absolute top-5 left-10 w-[calc(100%+32px)] h-0.5 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                                              )}

                                              <span className={cn(
                                                "absolute -bottom-8 text-[9px] font-bold uppercase tracking-[0.2em] whitespace-nowrap transition-colors duration-500",
                                                i === 0 ? "text-indigo-500" : "text-zinc-400"
                                              )}>
                                                Step {step}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ) : block.type === 'timeline' ? (
                                      <div className="space-y-8 pt-4 pl-4 relative">
                                        <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-zinc-100 dark:bg-zinc-900" />
                                        {[
                                          { t: '10:30 AM', e: 'Module Created', d: 'Initial schema generated by Shadow Architect', a: true },
                                          { t: '11:15 AM', e: 'Fields Added', d: '14 new input components configured', a: false },
                                          { t: '12:00 PM', e: 'Logic Applied', d: 'Validation rules and visibility conditions set', a: false }
                                        ].map((item, i) => (
                                          <div key={i} className="flex gap-8 relative z-10 group/item">
                                            <div className={cn(
                                              "w-4 h-4 rounded-full mt-1 border-4 shadow-lg transition-transform group-hover/item:scale-125",
                                              item.a ? "bg-indigo-600 border-indigo-100 dark:border-indigo-900" : "bg-white dark:bg-zinc-800 border-zinc-100 dark:border-zinc-900"
                                            )} />
                                            <div className="space-y-1">
                                              <span className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest">{item.t}</span>
                                              <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{item.e}</h5>
                                              <p className="text-[10px] text-zinc-500 max-w-xs">{item.d}</p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : block.type === 'datatable' ? (() => {
                                      const d = block.density || 'standard';
                                      const headerHeight = d === 'compact' ? 'h-10' : d === 'spacious' ? 'h-16' : 'h-14';
                                      const rowHeight = d === 'compact' ? 'h-10' : d === 'spacious' ? 'h-16' : 'h-14';
                                      const padding = d === 'compact' ? 'px-4' : d === 'spacious' ? 'px-8' : 'px-6';
                                      const avatarSize = d === 'compact' ? 'w-6 h-6' : d === 'spacious' ? 'w-9 h-9' : 'w-8 h-8';
                                      return (
                                        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300">
                                          <div className={cn("bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-900 flex items-center gap-8 transition-all duration-300", headerHeight, padding)}>
                                            {['Name', 'Category', 'Status', 'Date Modified'].map((col, i) => (
                                              <div key={i} className={cn("flex-1 text-[9px] font-black text-zinc-400 uppercase tracking-widest", i > 1 && "hidden md:block")}>{col}</div>
                                            ))}
                                          </div>
                                          <div className="divide-y divide-zinc-50 dark:divide-zinc-900">
                                            {[1, 2, 3, 4].map(row => (
                                              <div key={row} className={cn("flex items-center gap-8 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-all duration-300", rowHeight, padding)}>
                                                <div className="flex-1 flex items-center gap-3">
                                                  <div className={cn("rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 font-bold text-[10px] transition-all duration-300", avatarSize)}>R{row}</div>
                                                  <div className="h-2 w-24 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
                                                </div>
                                                <div className="flex-1 hidden md:block"><div className="h-2 w-16 bg-zinc-50 dark:bg-zinc-800 rounded-full opacity-60" /></div>
                                                <div className="flex-1 hidden md:block">
                                                  <div className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full w-fit">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                  </div>
                                                </div>
                                                <div className="flex-1 hidden md:block"><div className="h-2 w-20 bg-zinc-50 dark:bg-zinc-800 rounded-full opacity-60" /></div>
                                              </div>
                                            ))}
                                          </div>
                                          <div className="h-12 border-t border-zinc-100 dark:border-zinc-900 flex items-center px-6 justify-between bg-zinc-50/30">
                                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Showing 4 of 24 records</span>
                                            <div className="flex gap-2">
                                              <div className="w-6 h-6 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center"><ArrowRightLeft size={10} className="text-zinc-400 rotate-90" /></div>
                                              <div className="w-6 h-6 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-[10px] font-bold">1</div>
                                              <div className="w-6 h-6 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">2</div>
                                              <div className="w-6 h-6 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center"><ArrowRightLeft size={10} className="text-zinc-400 -rotate-90" /></div>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })()
                                    : block.type === 'duallist' ? (
                                      <div className="flex gap-6 items-center">
                                        <div className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
                                          <div className="h-10 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-900 flex items-center px-4">
                                            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Available Options</span>
                                          </div>
                                          <div className="p-2 space-y-1">
                                            {[1, 2, 3].map(i => (
                                              <div key={i} className="h-8 flex items-center px-3 gap-3 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
                                                <div className="h-1.5 w-16 bg-zinc-200 rounded-full" />
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                        <div className="flex flex-col gap-3">
                                          <button className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg"><ChevronRight size={14} /></button>
                                          <button className="w-8 h-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center text-zinc-400"><ChevronLeft size={14} /></button>
                                        </div>
                                        <div className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
                                          <div className="h-10 bg-indigo-500/5 border-b border-indigo-500/10 flex items-center px-4">
                                            <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Selected Options</span>
                                          </div>
                                          <div className="p-2 space-y-1">
                                            <div className="h-8 flex items-center px-3 gap-3 bg-indigo-500/5 rounded-xl border border-indigo-500/20">
                                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                              <div className="h-1.5 w-20 bg-indigo-500/20 rounded-full" />
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ) : block.type === 'treeview' ? (
                                      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm">
                                        <div className="space-y-4">
                                          {[1, 2].map(root => (
                                            <div key={root} className="space-y-3">
                                              <div className="flex items-center gap-3">
                                                <div className={cn("w-2 h-2 border-b-2 border-r-2 border-zinc-400 rotate-45 mb-1", root === 1 && "rotate-[225deg] border-indigo-500 mt-1")} />
                                                <Folder size={14} className={cn(root === 1 ? "text-indigo-500" : "text-zinc-400")} />
                                                <span className={cn("text-xs font-bold uppercase tracking-tight", root === 1 ? "text-zinc-900 dark:text-white" : "text-zinc-400")}>Root Directory {root}</span>
                                              </div>
                                              {root === 1 && (
                                                <div className="pl-9 space-y-4 relative">
                                                  <div className="absolute left-3.5 top-0 bottom-4 w-px bg-zinc-100 dark:bg-zinc-900" />
                                                  {[1, 2].map(child => (
                                                    <div key={child} className="flex items-center gap-3 relative">
                                                      <div className="absolute -left-5.5 top-1/2 w-4 h-px bg-zinc-100 dark:bg-zinc-900" />
                                                      <FileText size={12} className="text-zinc-300" />
                                                      <div className="h-1.5 w-24 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ) : block.type === 'calculation' ? (
                                      <div className="h-10 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex items-center px-4 shadow-sm">
                                        <Calculator size={12} className="text-indigo-500 mr-2 shrink-0" />
                                        <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 truncate flex-1">
                                          {block.calculationLogic || 'No formula defined'}
                                        </span>
                                      </div>
                                    ) : block.type === 'date' ? (
                                      <div className="h-10 bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/50 rounded-xl flex items-center justify-between px-4 shadow-sm dark:shadow-none">
                                        <span className="text-xs text-zinc-400 dark:text-zinc-600 italic truncate">MM / DD / YYYY</span>
                                        <Calendar size={14} className="text-zinc-400 dark:text-zinc-600" />
                                      </div>
                                    ) : block.type === 'time' ? (
                                      <div className="h-10 bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/50 rounded-xl flex items-center justify-between px-4 shadow-sm dark:shadow-none">
                                        <span className="text-xs text-zinc-400 dark:text-zinc-600 italic truncate">00:00 AM</span>
                                        <Clock size={14} className="text-zinc-400 dark:text-zinc-600" />
                                      </div>
                                    ) : block.type === 'sub_module' ? (
                                      renderSubmoduleMock(block)
                                    ) : block.type === 'lookup' ? (
                                      <div className="h-10 bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/50 rounded-xl flex items-center px-4 gap-2 shadow-sm dark:shadow-none">
                                        <Search size={14} className="text-zinc-400 dark:text-zinc-600" />
                                        <span className="text-xs text-zinc-400 dark:text-zinc-600 italic truncate">{block.placeholder || `Search ${block.label?.toLowerCase() || 'records'}...`}</span>
                                      </div>
                                    ) : (block.type === 'select' || block.type === 'user') ? (
                                      <div className="h-10 bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/50 rounded-xl flex items-center justify-between px-4 shadow-sm dark:shadow-none">
                                        <span className="text-xs text-zinc-400 dark:text-zinc-600 italic truncate">{block.placeholder || `Select ${block.label?.toLowerCase() || 'option'}...`}</span>
                                        <ChevronDown size={14} className="text-zinc-400 dark:text-zinc-600" />
                                      </div>
                                    ) : (
                                      <div className="h-10 bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/50 rounded-xl flex items-center px-4 shadow-sm dark:shadow-none">
                                        <span className="text-xs text-zinc-400 dark:text-zinc-600 italic truncate">{block.placeholder || `Enter ${block.label?.toLowerCase() || 'value'}...`}</span>
                                      </div>
                                    )}
                                  </div>

                                  {block.helperText && !(block.type === 'heading' || block.type === 'alert' || block.type === 'divider' || block.type === 'spacer') && (
                                    <p className="text-[9px] text-zinc-500 italic mt-1 px-1">{block.helperText}</p>
                                  )}

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
                                  {/* Quick Action Buttons (Overlapping Border) */}
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      cloneField(block.id);
                                    }}
                                    className="absolute -top-3.5 right-6 w-7 h-7 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-full flex items-center justify-center opacity-0 group-hover/field:opacity-100 transition-opacity shadow-lg z-50 hover:scale-110 active:scale-95 border border-zinc-200 dark:border-zinc-700"
                                    title="Duplicate Field"
                                  >
                                    <Copy size={12} />
                                  </button>

                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setLayout(prev => removeFieldRecursive(prev, block.id));
                                      if (selectedId === block.id) setSelectedId(null);
                                    }}
                                    className="absolute -top-3.5 -right-3.5 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/field:opacity-100 transition-opacity shadow-lg z-50 hover:scale-110 active:scale-95"
                                    title="Delete Field"
                                  >
                                    <Trash2 size={14} />
                                  </button>

                                  {!block.hidden && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateField(block.id, { hidden: true });
                                      }}
                                      className="absolute -top-3.5 right-15 w-7 h-7 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-full flex items-center justify-center opacity-0 group-hover/field:opacity-100 transition-opacity shadow-lg z-50 hover:scale-110 active:scale-95 border border-zinc-200 dark:border-zinc-700"
                                      title="Quick Hide Field"
                                    >
                                      <EyeOff size={12} />
                                    </button>
                                  )}
                                </motion.div>
                              );
                            });
                          };

                          return renderFieldBlocks(displayLayout);
                        })()}

                    </AnimatePresence>

                    {/* Bottom Spacer for Scrolling Room */}
                    <div className="col-span-full h-32 pointer-events-none" />

                    {interfaceSettings.detail?.layoutType !== 'sidebar' && layout.filter(block => block.tabId === currentTabId || (!block.tabId && currentTabId === tabs[0]?.id)).length === 0 && !dragOverInfo && !isLoading && (
                      <div className="absolute inset-8 bottom-32 flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[32px] bg-white dark:bg-zinc-950/50">
                        <GridIcon size={48} className="mb-4 text-zinc-200 dark:text-zinc-800" />
                        <p className="font-medium text-sm text-zinc-500 mb-6">Drag fields from the sidebar to start building</p>
                        <button 
                          onClick={() => setSelectedId(currentTabId)}
                          className="flex items-center gap-2 px-6 py-3 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all shadow-sm border border-zinc-200 dark:border-zinc-800"
                        >
                          <Settings size={14} />
                          Configure Tab Settings
                        </button>
                      </div>
                    )}
                  </div>
                    )
                  }
                  </div>

                  {activeTab === 'builder' && interfaceSettings.detail?.layoutType === 'process' && (
                    <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex justify-between gap-4 select-none">
                      <button
                        type="button"
                        onClick={() => {
                          const idx = tabs.findIndex(t => t.id === currentTabId);
                          if (idx > 0) {
                            setCurrentTabId(tabs[idx - 1].id);
                            setSelectedId(tabs[idx - 1].id);
                          }
                        }}
                        disabled={tabs.findIndex(t => t.id === currentTabId) === 0}
                        className="px-5 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-widest transition-colors"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const idx = tabs.findIndex(t => t.id === currentTabId);
                          if (idx < tabs.length - 1) {
                            setCurrentTabId(tabs[idx + 1].id);
                            setSelectedId(tabs[idx + 1].id);
                          }
                        }}
                        disabled={tabs.findIndex(t => t.id === currentTabId) === tabs.length - 1}
                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-bold hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20 uppercase tracking-widest"
                      >
                        {tabs.findIndex(t => t.id === currentTabId) === tabs.length - 1 ? 'Finish' : 'Next Step'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            </>
            )
          ) : activeTab === 'preview' ? (
            <div className="w-full px-8 pb-20">
              <div 
                className="rounded-[32px] shadow-2xl overflow-hidden min-h-[600px] relative"
              >
                {/* Absolute Background Layer */}
                <div className="absolute inset-0 bg-white dark:bg-zinc-950 rounded-[32px] -z-10 pointer-events-none" />
                
                {/* Absolute Border Overlay Layer */}
                <div className="absolute inset-0 rounded-[32px] border border-zinc-200 dark:border-zinc-800 pointer-events-none z-30" />
                {/* Preview Toolbar */}
                <div className="h-16 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-transparent px-8 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setPreviewView('table')}
                      className={cn(
                        "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        previewView === 'table' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                      )}
                    >
                      Table View
                    </button>
                    <button 
                      className={cn(
                        "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        previewView === 'detail' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-zinc-500 opacity-50 cursor-not-allowed"
                      )}
                      disabled={!previewSelectedId}
                    >
                      Detail View
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Database Mode Sliding Toggle Switch */}
                    <div className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/80 px-4 py-1.5 rounded-full select-none shadow-sm">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest transition-colors",
                        !useRealData ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400 dark:text-zinc-500"
                      )}>
                        Mock Data
                      </span>
                      <button
                        onClick={() => {
                          setUseRealData(prev => !prev);
                          toast.info(!useRealData ? "Switched to Live Database Mode" : "Switched to Mock Data Mode");
                        }}
                        className={cn(
                          "relative w-9 h-5 rounded-full transition-all duration-300 flex items-center p-0.5",
                          useRealData ? "bg-indigo-600" : "bg-zinc-300 dark:bg-zinc-700"
                        )}
                      >
                        <motion.div
                          className="w-4 h-4 bg-white rounded-full shadow-md animate-in fade-in zoom-in duration-300"
                          layout
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          animate={{ x: useRealData ? 16 : 0 }}
                        />
                      </button>
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5",
                        useRealData ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400 dark:text-zinc-500"
                      )}>
                        <span>Live Database</span>
                        {useRealData && (
                          isFetchingRealRecords ? (
                            <span className="w-2 h-2 border-t-2 border-indigo-500 rounded-full animate-spin shrink-0 ml-1" />
                          ) : (
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                            </span>
                          )
                        )}
                      </span>
                    </div>

                    <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-1.5">
                      <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">Live Testing Mode</span>
                    </div>
                  </div>
                </div>

                <div className="p-8">
                  {previewView === 'detail' ? (
                    <div className="space-y-8 max-w-none mx-auto py-12">
                      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-6">
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => setPreviewView('table')}
                            className="p-2.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-500 rounded-xl hover:text-indigo-600 transition-all"
                          >
                            <ArrowRightLeft size={16} className="rotate-180" />
                          </button>
                          <div>
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Record Details</h3>
                            <p className="text-xs text-zinc-500">ID: {previewSelectedId}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button className="px-6 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                            Cancel
                          </button>
                          <button 
                            onClick={() => {
                              const missingFields = layout
                                .filter(f => (f.tabId === currentTabId || (!f.tabId && currentTabId === tabs[0]?.id)) && f.required)
                                .filter(f => {
                                  const val = moduleState[f.id];
                                  return val === null || val === undefined || (typeof val === 'string' && val.trim() === '');
                                });

                              if (missingFields.length > 0) {
                                toast.error(`Please fill in required fields: ${missingFields.map(f => f.label).join(', ')}`);
                                return;
                              }
                              toast.success("Record saved successfully (Preview Mode)");
                            }}
                            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/20"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>

                      {tabs.length > 0 && (
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-zinc-100 dark:border-zinc-900 pb-4">
                          {tabs.filter(tab => evaluateVisibilityRule(tab.visibilityRule, moduleState)).map((tab) => (
                            <button 
                              key={tab.id}
                              onClick={() => setCurrentTabId(tab.id)}
                              className={cn(
                                "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2",
                                currentTabId === tab.id 
                                  ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" 
                                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                              )}
                            >
                              {interfaceSettings.detail?.showTabIcons && (
                                <DynamicIcon name={tab.iconName || 'Layout'} size={12} className="shrink-0" />
                              )}
                              {tab.label}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className={cn(
                        "grid gap-8 transition-all duration-500",
                        "grid-cols-1",
                        viewportSize !== 'mobile' && "md:grid-cols-12"
                      )}>
                        {layout
                          .filter(block => (block.tabId === currentTabId || (!block.tabId && currentTabId === tabs[0]?.id)) && evaluateVisibilityRule(block.visibilityRule, moduleState))
                          .filter(block => {
                            const type = block.type?.toLowerCase();
                            return showSystemFields || (type !== 'connector' && type !== 'automation' && type !== 'nexus_connector');
                          })
                          .map((block) => (
                          <div 
                            key={block.id} 
                            style={{ 
                              gridColumn: viewportSize === 'mobile' ? 'span 1' : `${block.startCol || 1} / span ${block.colSpan || 12}`
                            }}
                            className="space-y-2.5"
                          >
                            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest px-1 flex items-center gap-1.5 relative group/label">
                              {block.label}
                              {block.required && <span className="text-rose-500">*</span>}
                              {block.tooltip && (
                                <div className="relative cursor-help">
                                  <HelpCircle size={10} className="text-zinc-400 hover:text-indigo-500 transition-colors" />
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 text-white text-[10px] rounded-lg opacity-0 group-hover/label:opacity-100 pointer-events-none transition-all duration-200 whitespace-pre-wrap w-48 shadow-xl border border-white/10 z-50">
                                    {block.tooltip}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-zinc-900" />
                                  </div>
                                </div>
                              )}
                            </label>
                            <FieldInput 
                              field={block}
                              value={moduleState[block.id] ?? block.defaultValue}
                              onChange={(val) => setModuleState(prev => ({ ...prev, [block.id]: val }))}
                            />
                            {block.helperText && (
                              <p className="text-[10px] text-zinc-500 mt-1 font-medium px-1 italic">{block.helperText}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between px-2">
                        <div className="space-y-1">
                          <h3 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">{moduleSettings.name || 'Module'} Records</h3>
                          <p className="text-xs text-zinc-500">Previewing with {previewRecords.length} {useRealData ? 'live API database' : 'mock'} records generated from your schema.</p>
                        </div>
                        <button 
                          onClick={() => {
                            setPreviewView('create');
                            const initialDefaults = {};
                            flattenFields(layout).forEach((f: any) => {
                              if (f.defaultValue !== undefined && f.defaultValue !== '') {
                                (initialDefaults as any)[f.id] = f.defaultValue;
                              }
                            });
                            setModuleState(initialDefaults);
                            
                            const createForm = forms.find(f => f.usage === 'workspace_create');
                            if (createForm?.isMultistep) {
                              const visibleSteps = createForm.steps.filter((s: any) => evaluateVisibilityRule(s.visibilityRule, initialDefaults));
                              if (visibleSteps.length > 0) setPreviewStepId(visibleSteps[0].id);
                            }
                          }}
                          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-all"
                        >
                          <Plus size={14} />
                          Create New
                        </button>
                      </div>

                      <div 
                        className="rounded-3xl overflow-hidden shadow-xl shadow-indigo-500/5 relative"
                      >
                        {/* Absolute Background Layer */}
                        <div className="absolute inset-0 bg-white dark:bg-zinc-900 rounded-3xl -z-10 pointer-events-none" />
                        
                        {/* Absolute Border Overlay Layer */}
                        <div className="absolute inset-0 rounded-3xl border border-zinc-200 dark:border-zinc-800 pointer-events-none z-30" />
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-zinc-50/50 dark:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-800">
                                <th className={cn(
                                  "w-12 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest",
                                  interfaceSettings.master.density === 'compact' ? 'px-4 py-2' : 
                                  interfaceSettings.master.density === 'spacious' ? 'px-8 py-5' : 'px-6 py-4'
                                )}>#</th>
                                {displayFields.filter(f => f.showInTable !== false).slice(0, 5).map(f => (
                                  <th 
                                    key={f.id} 
                                    style={{ minWidth: f.columnWidth || 150 }} 
                                    className={cn(
                                      "text-[10px] font-black text-zinc-400 uppercase tracking-widest",
                                      interfaceSettings.master.density === 'compact' ? 'px-4 py-2' : 
                                      interfaceSettings.master.density === 'spacious' ? 'px-8 py-5' : 'px-6 py-4'
                                    )}
                                  >
                                    {f.label}
                                  </th>
                                ))}
                                <th className={cn(
                                  "text-[10px] font-black text-zinc-400 uppercase tracking-widest",
                                  interfaceSettings.master.density === 'compact' ? 'px-4 py-2' : 
                                  interfaceSettings.master.density === 'spacious' ? 'px-8 py-5' : 'px-6 py-4'
                                )}>Created</th>
                                <th className={cn(
                                  "w-20",
                                  interfaceSettings.master.density === 'compact' ? 'px-4 py-2' : 
                                  interfaceSettings.master.density === 'spacious' ? 'px-8 py-5' : 'px-6 py-4'
                                )}></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                              {previewRecords.map((record, idx) => (
                                <tr 
                                  key={record.id} 
                                  onClick={() => {
                                    setPreviewSelectedId(record.id);
                                    setPreviewView('detail');
                                    setModuleState(record);
                                  }}
                                  className="group hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5 transition-all cursor-pointer"
                                >
                                  <td className={cn(
                                    "text-center font-mono text-zinc-400",
                                    interfaceSettings.master.density === 'compact' ? 'px-4 py-2 text-[10px]' : 
                                    interfaceSettings.master.density === 'spacious' ? 'px-8 py-5 text-xs' : 'px-6 py-4 text-[10px]'
                                  )}>{idx + 1}</td>
                                  {displayFields.filter(f => f.showInTable !== false).slice(0, 5).map(f => (
                                    <td 
                                      key={f.id} 
                                      className={cn(
                                        interfaceSettings.master.density === 'compact' ? 'px-4 py-2' : 
                                        interfaceSettings.master.density === 'spacious' ? 'px-8 py-5' : 'px-6 py-4'
                                      )}
                                    >
                                      <span className={cn(
                                        "font-bold text-zinc-700 dark:text-zinc-300",
                                        interfaceSettings.master.density === 'compact' ? 'text-[11px]' : 
                                        interfaceSettings.master.density === 'spacious' ? 'text-sm' : 'text-xs'
                                      )}>
                                        {f.type === 'boolean' ? (record[f.id] ? 'Yes' : 'No') : String(record[f.id])}
                                      </span>
                                    </td>
                                  ))}
                                  <td className={cn(
                                    interfaceSettings.master.density === 'compact' ? 'px-4 py-2' : 
                                    interfaceSettings.master.density === 'spacious' ? 'px-8 py-5' : 'px-6 py-4'
                                  )}>
                                    <span className={cn(
                                      "font-medium text-zinc-400",
                                      interfaceSettings.master.density === 'compact' ? 'text-[10px]' : 
                                      interfaceSettings.master.density === 'spacious' ? 'text-xs' : 'text-[10px]'
                                    )}>{new Date(record.createdAt).toLocaleDateString()}</span>
                                  </td>
                                  <td className={cn(
                                    "text-right",
                                    interfaceSettings.master.density === 'compact' ? 'px-4 py-2' : 
                                    interfaceSettings.master.density === 'spacious' ? 'px-8 py-5' : 'px-6 py-4'
                                  )}>
                                    <button className="p-2 text-zinc-300 hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100">
                                      <ArrowRight size={14} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {interfaceSettings.master.pagination?.enabled && (
                          <div className="px-8 py-4 bg-zinc-50/50 dark:bg-zinc-800/20 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                            <div className="flex items-center gap-6">
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Showing 1 to {Math.min(interfaceSettings.master.pagination?.pageSize || 25, previewRecords.length)} of {previewRecords.length} records</span>
                              <div className="h-4 w-[1px] bg-zinc-200 dark:bg-zinc-800" />
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Per Page:</span>
                                <select className="bg-transparent text-[10px] font-black text-zinc-600 dark:text-zinc-400 outline-none cursor-pointer">
                                  <option>{interfaceSettings.master.pagination?.pageSize || 25}</option>
                                </select>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[9px] font-black text-zinc-400 uppercase tracking-widest opacity-50 cursor-not-allowed">Prev</button>
                              <div className="flex items-center gap-1">
                                <button className="w-8 h-8 bg-indigo-600 text-white rounded-lg text-[10px] font-black">1</button>
                                <button className="w-8 h-8 text-zinc-400 text-[10px] font-black hover:text-zinc-900 dark:hover:text-white transition-colors">2</button>
                              </div>
                              <button className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[9px] font-black text-zinc-500 uppercase tracking-widest hover:text-indigo-600 transition-all">Next</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                  {/* Creation Modal Overlay */}
                  <AnimatePresence>
                    {previewView === 'create' && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-zinc-950/40 backdrop-blur-sm"
                      >
                        <motion.div 
                          initial={{ scale: 0.9, opacity: 0, y: 20 }}
                          animate={{ scale: 1, opacity: 1, y: 0 }}
                          exit={{ scale: 0.9, opacity: 0, y: 20 }}
                          className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[85vh]"
                        >
                          <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                            <div className="space-y-1">
                               <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
                                 {forms.find(f => f.usage === 'workspace_create')?.name || 'New Record'}
                               </h3>
                               <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Workspace Creation Form</p>
                            </div>
                            <button 
                              onClick={() => setPreviewView('table')}
                              className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-zinc-900 transition-all"
                            >
                              <X size={18} />
                            </button>
                          </div>

                          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                            {(() => {
                              const createForm = forms.find(f => f.usage === 'workspace_create');
                              if (!createForm) return <p className="text-center text-zinc-500 py-12">No creation form configured.</p>;
                              
                              const visibleSteps = createForm.isMultistep 
                                ? createForm.steps.filter((s: any) => evaluateVisibilityRule(s.visibilityRule, moduleState))
                                : null;
                              
                              const currentStep = createForm.isMultistep 
                                ? (visibleSteps?.find((s: any) => s.id === previewStepId) || visibleSteps?.[0])
                                : null;

                              const fields = createForm.isMultistep ? (currentStep?.fields || []) : (createForm.fields || []);

                              return (
                                <div className="space-y-10">
                                  {createForm.isMultistep && visibleSteps && (
                                    <div className="flex items-center justify-between px-2 mb-8">
                                      <div className="flex items-center gap-4">
                                        {visibleSteps.map((step: any, idx: number) => {
                                          const isActive = previewStepId === step.id;
                                          const isCompleted = visibleSteps.indexOf(visibleSteps.find((s: any) => s.id === previewStepId)) > idx;
                                          return (
                                            <div key={step.id} className="flex items-center gap-3">
                                              <div className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-300",
                                                isActive ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : 
                                                isCompleted ? "bg-emerald-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                                              )}>
                                                {isCompleted ? <Check size={12} /> : idx + 1}
                                              </div>
                                              <span className={cn(
                                                "text-[9px] font-black uppercase tracking-widest transition-colors",
                                                isActive ? "text-zinc-900 dark:text-white" : "text-zinc-400"
                                              )}>{step.title}</span>
                                              {idx < visibleSteps.length - 1 && (
                                                <div className="w-8 h-px bg-zinc-200 dark:bg-zinc-800 ml-2" />
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-12 gap-6">
                                    {fields.length > 0 ? (
                                      fields.map((fObj: any) => {
                                        const isVisual = fObj.id.startsWith('visual-');
                                        const field = isVisual ? null : layout.find(f => f.id === fObj.id);
                                        if (!isVisual && !field) return null;

                                        // Evaluate Visibility Rules using the shared engine
                                        const isVisible = evaluateVisibilityRule(fObj.visibilityRule || fObj.visibility, moduleState);

                                        if (!isVisible) return null;
                                        
                                        return (
                                          <div key={fObj.id} className={cn(
                                            "space-y-2",
                                            fObj.width === 'half' ? "col-span-6" : "col-span-12"
                                          )}>
                                             {isVisual ? (
                                               <div className="py-4">
                                                 {fObj.type === 'heading' && (
                                                   <h3 className="text-xl font-bold text-zinc-900 dark:text-white">{fObj.labelOverride || 'Section Heading'}</h3>
                                                 )}
                                                 {fObj.type === 'divider' && (
                                                   <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-4" />
                                                 )}
                                                 {fObj.type === 'spacer' && (
                                                   <div style={{ height: fObj.height === 'sm' ? 16 : fObj.height === 'lg' ? 64 : fObj.height === 'xl' ? 128 : 32 }} />
                                                 )}
                                                 {fObj.type === 'html-text' && (
                                                   <div className="text-sm text-zinc-500 leading-relaxed prose dark:prose-invert max-w-none">
                                                     {fObj.labelOverride || 'Text content goes here...'}
                                                   </div>
                                                 )}
                                               </div>
                                             ) : (
                                               <>
                                                 <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 flex items-center gap-1.5 relative group/label">
                                                   {fObj.labelOverride || field?.label}
                                                   {field?.tooltip && (
                                                     <div className="relative cursor-help">
                                                       <HelpCircle size={10} className="text-zinc-400 hover:text-indigo-500 transition-colors" />
                                                       <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 text-white text-[10px] rounded-lg opacity-0 group-hover/label:opacity-100 pointer-events-none transition-all duration-200 whitespace-pre-wrap w-48 shadow-xl border border-white/10 z-50">
                                                         {field.tooltip}
                                                         <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-zinc-900" />
                                                       </div>
                                                     </div>
                                                   )}
                                                 </label>
                                                 <FieldInput 
                                                   field={field!}
                                                   value={moduleState[field!.id]}
                                                   onChange={(val) => {
                                                     setModuleState(prev => ({ ...prev, [field!.id]: val }));
                                                     if (formErrors[field!.id]) {
                                                       setFormErrors(prev => {
                                                         const next = { ...prev };
                                                         delete next[field!.id];
                                                         return next;
                                                       });
                                                     }
                                                   }}
                                                   error={!!formErrors[field!.id]}
                                                   readonly={fObj.readOnly}
                                                 />
                                                 {formErrors[field!.id] && (
                                                   <p className="text-[10px] font-bold text-rose-500 mt-1 px-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                                     {formErrors[field!.id]}
                                                   </p>
                                                 )}
                                                 {field?.helperText && !formErrors[field.id] && (
                                                   <p className="text-[10px] text-zinc-500 mt-1 font-medium px-1 italic">{field.helperText}</p>
                                                 )}
                                               </>
                                             )}
                                          </div>
                                        );
                                      })
                                    ) : (
                                      <div className="col-span-12 py-12 text-center text-zinc-400 italic text-xs">No fields included in this stage.</div>
                                    )}
                                  </div>

                                  {createForm.isMultistep && visibleSteps && (
                                    <div className="flex items-center justify-between pt-10 border-t border-zinc-100 dark:border-zinc-800">
                                      <button 
                                        disabled={previewStepId === visibleSteps[0]?.id}
                                        onClick={() => {
                                          const idx = visibleSteps.findIndex((s: any) => s.id === previewStepId);
                                          if (idx > 0) setPreviewStepId(visibleSteps[idx - 1].id);
                                        }}
                                        className="px-6 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-zinc-900 disabled:opacity-50 transition-all"
                                      >
                                        Back
                                      </button>
                                      
                                      {previewStepId === visibleSteps[visibleSteps.length - 1]?.id ? (
                                        <button 
                                          onClick={() => {
                                            // Handle final submit logic...
                                            toast.success("Record created successfully (Preview Mode)");
                                            setPreviewView('table');
                                          }}
                                          className="px-8 py-2.5 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                                        >
                                          Complete & Create
                                        </button>
                                      ) : (
                                        <button 
                                          onClick={() => {
                                            const idx = visibleSteps.findIndex((s: any) => s.id === previewStepId);
                                            if (idx < visibleSteps.length - 1) setPreviewStepId(visibleSteps[idx + 1].id);
                                          }}
                                          className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20"
                                        >
                                          Continue
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>

                          <div className="p-8 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/30 flex items-center gap-4">
                             <button 
                               onClick={() => setPreviewView('table')}
                               className="px-8 py-3.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-900 transition-all"
                             >
                               Discard
                             </button>
                              <button 
                                onClick={() => {
                                  const createForm = forms.find(f => f.usage === 'workspace_create');
                                  if (!createForm) return;

                                  // Validation
                                  const errors: Record<string, string> = {};
                                  createForm.fields.forEach((fObj: any) => {
                                    if (fObj.id.startsWith('visual-')) return;
                                    
                                    // Only validate if field is visible
                                    const isVisible = (() => {
                                      if (!fObj.visibility?.fieldId) return true;
                                      const targetVal = moduleState[fObj.visibility.fieldId];
                                      const ruleVal = fObj.visibility.value;
                                      if (fObj.visibility.operator === 'neq') return String(targetVal) !== String(ruleVal);
                                      if (fObj.visibility.operator === 'contains') return String(targetVal).toLowerCase().includes(String(ruleVal).toLowerCase());
                                      return String(targetVal) === String(ruleVal);
                                    })();

                                    if (!isVisible) return;

                                    const val = moduleState[fObj.id];
                                    const fieldDef = layout.find(f => f.id === fObj.id);
                                    
                                    // Check required (from form field OR layout definition)
                                    const isRequired = fObj.required || fieldDef?.required;
                                    if (isRequired && (!val || (Array.isArray(val) && val.length === 0))) {
                                      errors[fObj.id] = `${fieldDef?.label || fObj.id} is required.`;
                                    }
                                    
                                    // Check regex
                                    if (fObj.validation?.pattern && val) {
                                      try {
                                        const regex = new RegExp(fObj.validation.pattern);
                                        if (!regex.test(String(val))) {
                                          errors[fObj.id] = fObj.validation.errorMessage || `${fieldDef?.label || fObj.id} is invalid.`;
                                        }
                                      } catch (e) {
                                        console.error('Invalid regex pattern:', fObj.validation.pattern);
                                      }
                                    }
                                  });

                                  setFormErrors(errors);

                                  if (Object.keys(errors).length > 0) {
                                    toast.error('Please fix the errors before submitting.');
                                    return;
                                  }

                                  toast.success(createForm.settings?.successMessage || 'Record simulated creation!');
                                  setPreviewView('table');
                                  setFormErrors({});
                                }}
                               className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-indigo-500 transition-all"
                             >
                               {forms.find(f => f.usage === 'workspace_create')?.settings?.submitLabel || 'Create Record'}
                             </button>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
          ) : activeTab === 'details' ? (
            <div className="flex h-full w-full overflow-hidden">
              <aside className="w-72 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-2">
                <div className="mb-6 px-2">
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Configuration</h3>
                </div>
                {[
                  { id: 'general', label: 'General Properties', icon: Settings2 },
                  { id: 'schema', label: 'Schema', icon: Database },
                  { id: 'localization', label: 'Localization', icon: Globe },
                  { id: 'dependencies', label: 'Dependencies', icon: MapPin },
                  { id: 'assets', label: 'Assets', icon: Image }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setDetailsTab(tab.id as any)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left",
                      detailsTab === tab.id
                        ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    )}
                  >
                    <tab.icon size={14} />
                    {tab.label}
                  </button>
                ))}
              </aside>

              {/* Details Content */}
              <div className="flex-1 flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
                {detailsTab === 'general' && (
                <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                  <div className="max-w-none mx-auto space-y-12 pb-20">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Module Details</h2>
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
                            onChange={(e) => {
                              const newName = e.target.value;
                              setModuleSettings(prev => ({ ...prev, name: newName }));
                              setBreadcrumbOverride(id, newName);
                            }}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                            placeholder="e.g. Grant Applications"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Category</label>
                          <div className="relative">
                            <select 
                              value={moduleSettings.category}
                              onChange={(e) => setModuleSettings(prev => ({ ...prev, category: e.target.value }))}
                              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                            >
                              {MODULE_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Record Key Section */}
                    <section className="space-y-6">
                      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                        <div className="w-1 h-3 bg-indigo-500 rounded-full" />
                        <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Record Key Configuration</h3>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Key Prefix</label>
                          <input 
                            type="text" 
                            value={moduleSettings.recordKeyPrefix || ''}
                            onChange={(e) => setModuleSettings(prev => ({ ...prev, recordKeyPrefix: e.target.value.toUpperCase() }))}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                            placeholder="e.g. TKT"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Key Suffix</label>
                          <input 
                            type="text" 
                            value={moduleSettings.recordKeySuffix || ''}
                            onChange={(e) => setModuleSettings(prev => ({ ...prev, recordKeySuffix: e.target.value.toUpperCase() }))}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                            placeholder="e.g. A"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-500 px-1">
                        Records will be generated as: <span className="text-indigo-500 font-bold">{moduleSettings.recordKeyPrefix || 'PREFIX'}-1001{moduleSettings.recordKeySuffix || ''}</span>
                      </p>
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
                )}
                {detailsTab === 'schema' && (
                  <div className="h-full w-full">
<div className="flex h-full w-full">
              {/* Schema Sidebar */}
              <aside className="w-72 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-2">
                <div className="mb-6 px-2">
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Data Model</h3>
                </div>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold transition-all text-left">
                  <Table size={14} />
                  Field Overview
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl text-xs font-bold transition-all text-left">
                  <GitCommit size={14} />
                  Relationships
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl text-xs font-bold transition-all text-left">
                  <Database size={14} />
                  Indices & Keys
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl text-xs font-bold transition-all text-left">
                  <UploadCloud size={14} />
                  Data Import/Export
                </button>
              </aside>

              {/* Schema Content */}
              <div className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950 p-12 custom-scrollbar">
                <div className="max-w-none mx-auto space-y-8 pb-20">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Data Schema</h2>
                      <p className="text-zinc-500 text-sm">Review and manage the underlying data structure of this module.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all uppercase tracking-widest">
                        <FileJson size={14} />
                        Export JSON
                      </button>
                    </div>
                  </div>

                  {/* Schema Table */}
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-xl shadow-indigo-500/5">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-100 dark:border-zinc-800/50">
                          <th className="px-6 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Field Label</th>
                          <th className="px-6 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Technical ID</th>
                          <th className="px-6 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Data Type</th>
                          <th className="px-6 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Validation</th>
                          <th className="px-6 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Properties</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                        {layout.map((field) => (
                          <tr key={field.id} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 group-hover:bg-indigo-500/10 group-hover:text-indigo-500 transition-colors">
                                  {(() => {
                                    const fieldDef = FIELD_CATEGORIES.flatMap(c => c.fields).find(f => f.id === field.type);
                                    const Icon = fieldDef?.icon || GridIcon;
                                    return <Icon size={14} />;
                                  })()}
                                </div>
                                <span className="text-xs font-bold text-zinc-900 dark:text-white">{field.label}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <code className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-[10px] text-zinc-500 font-mono">{field.id}</code>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-md text-[9px] font-black uppercase tracking-widest">
                                {field.type.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-zinc-500">
                              {field.required ? 'Required' : 'Optional'}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {field.visibilityRule && <div title="Has Visibility Rules"><Eye size={12} className="text-indigo-500" /></div>}
                                {field.calculationLogic && <div title="Calculated Field"><Calculator size={12} className="text-emerald-500" /></div>}
                                {field.options && <div title={`Has ${field.options.length} options`}><ListPlus size={12} className="text-amber-500" /></div>}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
                  </div>
                )}
                {detailsTab === 'localization' && (
                  <div className="h-full w-full">
<div className="flex h-full w-full bg-white dark:bg-zinc-950">
              {/* Languages Sidebar */}
              <aside className="w-72 border-r border-zinc-100 dark:border-zinc-900 flex flex-col bg-zinc-50/50 dark:bg-transparent">
                <div className="p-8 pb-4">
                  <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-6">Target Languages</h3>
                  <div className="space-y-2">
                    {[
                      { id: 'en', label: 'English (US)', flag: '🇺🇸', status: 'Source' },
                      { id: 'es', label: 'Spanish', flag: '🇪🇸', status: '85%' },
                      { id: 'fr', label: 'French', flag: '🇫🇷', status: '12%' },
                      { id: 'de', label: 'German', flag: '🇩🇪', status: 'Empty' }
                    ].map((lang) => (
                      <button 
                        key={lang.id}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left",
                          lang.id === 'es' ? "bg-white dark:bg-zinc-900 shadow-xl shadow-indigo-500/5 border border-zinc-100 dark:border-zinc-800 text-zinc-900 dark:text-white" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span>{lang.flag}</span>
                          {lang.label}
                        </div>
                        <span className="text-[9px] font-black text-zinc-400">{lang.status}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-auto p-8 pt-0">
                  <button className="w-full py-3 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:border-indigo-500/50 hover:text-indigo-600 transition-all flex items-center justify-center gap-2">
                    <Plus size={12} />
                    Add Language
                  </button>
                </div>
              </aside>

              {/* Translation Content */}
              <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                <div className="max-w-none mx-auto space-y-12">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Localization Workbench</h2>
                      <p className="text-zinc-500 text-sm">Translate your module's interface to reach a global audience.</p>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/20">
                      <Sparkles size={12} />
                      AI Translate
                    </button>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-xl shadow-indigo-500/5">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-100 dark:border-zinc-800/50">
                          <th className="px-6 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Resource Key</th>
                          <th className="px-6 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Source (EN)</th>
                          <th className="px-6 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Spanish (ES)</th>
                          <th className="px-6 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                        {layout.map((field) => (
                          <React.Fragment key={field.id}>
                            <tr className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                              <td className="px-6 py-4">
                                <code className="text-[9px] font-mono text-zinc-400">{field.id}.label</code>
                              </td>
                              <td className="px-6 py-4 text-xs text-zinc-900 dark:text-white font-medium">{field.label}</td>
                              <td className="px-6 py-4">
                                <input 
                                  type="text" 
                                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                                  placeholder="Traducir..."
                                />
                              </td>
                              <td className="px-6 py-4">
                                <div className="w-2 h-2 rounded-full bg-amber-500" />
                              </td>
                            </tr>
                            {field.helperText && (
                              <tr className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors border-t border-zinc-50 dark:border-zinc-900/50">
                                <td className="px-6 py-4">
                                  <code className="text-[9px] font-mono text-zinc-400">{field.id}.helper</code>
                                </td>
                                <td className="px-6 py-4 text-[10px] text-zinc-500 italic">{field.helperText}</td>
                                <td className="px-6 py-4">
                                  <input 
                                    type="text" 
                                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                                    placeholder="Traducir ayuda..."
                                  />
                                </td>
                                <td className="px-6 py-4">
                                  <div className="w-2 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
                  </div>
                )}
                {detailsTab === 'dependencies' && (
                  <div className="h-full w-full">
<div className="h-full w-full bg-zinc-900 relative overflow-hidden flex items-center justify-center">
              {/* Dependency Grid Background */}
              <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
                style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} 
              />
              
              {/* Visual Map Content */}
              <div className="relative z-10 space-y-12 flex flex-col items-center">
                <div className="flex items-center gap-32">
                  <div className="w-48 p-6 bg-zinc-800/50 border border-zinc-700 rounded-3xl backdrop-blur-xl space-y-4 text-center">
                    <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
                      <Database size={24} />
                    </div>
                    <span className="block text-[10px] font-black text-white uppercase tracking-widest">Inventory Module</span>
                  </div>
                  
                  <div className="w-64 p-8 bg-indigo-600 rounded-[2.5rem] shadow-2xl shadow-indigo-500/40 text-center space-y-4 ring-8 ring-indigo-500/10">
                    <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center mx-auto text-white">
                      <Box size={32} />
                    </div>
                    <span className="block text-xs font-black text-white uppercase tracking-[0.2em]">{moduleSettings.name}</span>
                  </div>

                  <div className="w-48 p-6 bg-zinc-800/50 border border-zinc-700 rounded-3xl backdrop-blur-xl space-y-4 text-center">
                    <div className="w-12 h-12 bg-rose-500/20 rounded-2xl flex items-center justify-center mx-auto text-rose-400">
                      <CreditCard size={24} />
                    </div>
                    <span className="block text-[10px] font-black text-white uppercase tracking-widest">Finance Module</span>
                  </div>
                </div>

                <div className="max-w-md p-6 bg-zinc-950/50 border border-zinc-800 rounded-3xl text-center space-y-2">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Architect Insight</p>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    This module currently has 2 inbound lookups and 1 outbound data push. 
                    Changes to the "Unit Price" field will impact the Finance reconciliation workflow.
                  </p>
                </div>
              </div>
              
              {/* Animated Connection Lines (Simplified CSS) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[800px] h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent animate-pulse" />
              </div>
            </div>
                  </div>
                )}
                {detailsTab === 'assets' && (
                  <div className="h-full w-full">
<div className="flex-1 overflow-y-auto p-12 bg-white dark:bg-zinc-950 custom-scrollbar">
              <div className="max-w-none mx-auto space-y-12">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Asset Library</h2>
                    <p className="text-zinc-500 text-sm">Manage images, custom icons, and brand assets used within this module.</p>
                  </div>
                  <button className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/20">
                    <Upload size={14} />
                    Upload Assets
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-6">
                  {[
                    { name: 'Company Logo', type: 'PNG', size: '124 KB', icon: Image },
                    { name: 'Header Illustration', type: 'SVG', size: '45 KB', icon: Palette },
                    { name: 'Icon Set', type: 'ZIP', size: '2.1 MB', icon: Folder },
                    { name: 'Custom Font', type: 'TTF', size: '890 KB', icon: Type }
                  ].map((asset, i) => (
                    <div key={i} className="group relative bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 transition-all hover:shadow-2xl hover:shadow-indigo-500/10 overflow-hidden">
                      <div className="aspect-square bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-center text-zinc-300 group-hover:text-indigo-500 transition-colors mb-4">
                        <asset.icon size={32} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">{asset.name}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{asset.type}</span>
                          <span className="text-[9px] font-bold text-zinc-500">{asset.size}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'rules' ? (
            <div className="flex h-full w-full overflow-hidden">
              {/* Rules Sidebar */}
              <aside className="w-72 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-2">
                <div className="mb-6 px-2">
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Logic & Validation</h3>
                </div>
                <button 
                  onClick={() => setActiveRulesSubTab('validation')}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left",
                    activeRulesSubTab === 'validation'
                      ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                      : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  )}
                >
                  <ShieldCheck size={14} />
                  Validation Rules
                </button>
                <button 
                  onClick={() => setActiveRulesSubTab('triggers')}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left",
                    activeRulesSubTab === 'triggers'
                      ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                      : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  )}
                >
                  <Zap size={14} />
                  Automation Triggers
                </button>
              </aside>

              {/* Rules Content */}
              <div className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950 p-12 custom-scrollbar">
                <div className="max-w-none mx-auto space-y-12 pb-20">
                  
                  {activeRulesSubTab === 'validation' ? (
                    <div className="space-y-8">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Validation Rules</h2>
                          <p className="text-zinc-500 text-sm">Define custom validation checks to maintain data integrity when saving records.</p>
                        </div>
                        <button 
                          onClick={() => {
                            setEditingRule(null);
                            setIsRuleModalOpen(true);
                          }}
                          className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-md"
                        >
                          <Plus size={14} />
                          <span>New Rule</span>
                        </button>
                      </div>

                      {/* Rules List */}
                      {validationRules.length === 0 ? (
                        <div className="p-10 bg-white dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl text-center space-y-3">
                          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No validation rules defined yet.</p>
                          <p className="text-xs text-zinc-400 max-w-sm mx-auto">Click <strong>+ New Rule</strong> to get started.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {validationRules.map((rule) => (
                            <div 
                              key={rule.id} 
                              className="flex items-center justify-between p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-indigo-500/30 transition-all group"
                            >
                              <div className="flex items-center gap-4 flex-1 min-w-0 mr-4">
                                <div className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center border",
                                  rule.isActive 
                                    ? rule.severity === 'warning'
                                      ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                      : "bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
                                    : "bg-zinc-50 text-zinc-400 border-zinc-200"
                                )}>
                                  <ShieldCheck size={18} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-xs font-black text-zinc-900 dark:text-white truncate">{rule.name}</span>
                                    <span className={cn(
                                      "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border",
                                      rule.severity === 'warning' 
                                        ? "bg-amber-500/10 text-amber-600 border-amber-500/20" 
                                        : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                    )}>
                                      {rule.severity || 'error'}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-zinc-400 font-mono truncate bg-zinc-50 dark:bg-zinc-950 px-2 py-0.5 rounded inline-block">
                                    {rule.expression}
                                  </p>
                                  <p className="text-[10px] text-zinc-500 mt-1 italic">&quot;{rule.errorMessage}&quot;</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="flex items-center gap-2 mr-2">
                                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{rule.isActive ? 'Active' : 'Inactive'}</span>
                                  <input 
                                    type="checkbox"
                                    checked={rule.isActive}
                                    onChange={() => {
                                      setValidationRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: !r.isActive } : r));
                                    }}
                                    className="w-4 h-4 text-indigo-600 rounded border-zinc-300 focus:ring-indigo-500 cursor-pointer"
                                  />
                                </div>
                                <button 
                                  onClick={() => {
                                    setEditingRule(rule);
                                    setIsRuleModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-500/10 transition-all bg-white dark:bg-zinc-900"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button 
                                  onClick={() => {
                                    setValidationRules(prev => prev.filter(r => r.id !== rule.id));
                                    toast.success("Validation rule deleted");
                                  }}
                                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-rose-600 hover:bg-rose-500/10 transition-all bg-white dark:bg-zinc-900"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                    </div>
                  ) : (
                    <div className="space-y-4 text-center py-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl">
                      <Zap className="mx-auto text-zinc-400" size={48} />
                      <h3 className="text-lg font-bold text-zinc-850 dark:text-zinc-200">Automation Triggers</h3>
                      <p className="text-zinc-500 text-xs max-w-sm mx-auto">Define actions that execute when records are created or updated. Triggers configuration is coming in a future release.</p>
                    </div>
                  )}

                </div>
              </div>
            </div>
          ) : activeTab === 'deployment' ? (
            <div className="flex h-full w-full overflow-hidden">
              {/* Deployment Sidebar */}
              <aside className="w-72 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-2">
                <div className="mb-6 px-2">
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Release Management</h3>
                </div>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold transition-all text-left">
                  <Rocket size={14} />
                  Deploy Module
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl text-xs font-bold transition-all text-left">
                  <History size={14} />
                  Release History
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl text-xs font-bold transition-all text-left">
                  <Globe size={14} />
                  Environments
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl text-xs font-bold transition-all text-left">
                  <Webhook size={14} />
                  API & Webhooks
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl text-xs font-bold transition-all text-left">
                  <ClipboardList size={14} />
                  Audit Log
                </button>
              </aside>

              {/* Deployment Content */}
              <div className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950 p-12 custom-scrollbar">
                <div className="max-w-none mx-auto space-y-12 pb-20">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Deployment & Releases</h2>
                      <p className="text-zinc-500 text-sm">Manage the lifecycle and external availability of this module.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        Live: v1.0.4
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Primary Action Card */}
                    <div className="lg:col-span-2 bg-indigo-600 rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl shadow-indigo-500/20">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl -mr-32 -mt-32" />
                      <div className="relative z-10 flex flex-col h-full justify-between gap-12">
                        <div className="space-y-4">
                          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white backdrop-blur-md">
                            <Rocket size={24} />
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-2xl font-black text-white tracking-tight">Deploy to Production</h3>
                            <p className="text-white/70 text-sm max-w-md">There are 12 unreleased changes in your current draft. Publishing will update the module for all users across the organization.</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <button className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-xl">
                            Publish v1.0.5
                          </button>
                          <button className="px-6 py-4 bg-white/10 text-white border border-white/20 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-white/20 transition-all">
                            View Changelog
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats Card */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-8 space-y-8 shadow-xl shadow-indigo-500/5">
                      <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Global Status</h4>
                      <div className="space-y-6">
                        {[
                          { label: 'Active Users', value: '1,284', icon: Smartphone, color: 'text-indigo-500' },
                          { label: 'Avg Latency', value: '142ms', icon: Activity, color: 'text-emerald-500' },
                          { label: 'Error Rate', value: '0.02%', icon: AlertCircle, color: 'text-rose-500' }
                        ].map((stat, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn("w-8 h-8 rounded-lg bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center", stat.color)}>
                                <stat.icon size={14} />
                              </div>
                              <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">{stat.label}</span>
                            </div>
                            <span className="text-sm font-black text-zinc-900 dark:text-white">{stat.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* History Section */}
                  <section className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                      <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Recent Activity</h3>
                      <button className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Full Audit Log</button>
                    </div>
                    <div className="space-y-3">
                      {[
                        { v: 'v1.0.4', user: 'Scott V.', date: '2 hours ago', msg: 'Updated validation logic for financial fields', type: 'Production' },
                        { v: 'v1.0.3', user: 'Alex M.', date: '1 day ago', msg: 'Refactored layout density and primary colors', type: 'Production' },
                        { v: 'v1.0.2', user: 'System', date: '3 days ago', msg: 'Automated database schema synchronization', type: 'Staging' }
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-5 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl hover:border-indigo-500/30 transition-all cursor-pointer">
                          <div className="flex items-center gap-6">
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-zinc-900 dark:text-white">{item.v}</span>
                              <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-tight">{item.type}</span>
                            </div>
                            <div className="h-8 w-px bg-zinc-100 dark:bg-zinc-800" />
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{item.msg}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-zinc-400 font-bold">{item.user}</span>
                                <span className="text-[10px] text-zinc-300 dark:text-zinc-600">•</span>
                                <span className="text-[10px] text-zinc-400">{item.date}</span>
                              </div>
                            </div>
                          </div>
                          <button className="p-2 text-zinc-400 hover:text-indigo-500 transition-colors">
                            <ArrowRightLeft size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
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
          ) : activeTab === 'security' ? (
            <div className="flex h-full w-full bg-white dark:bg-zinc-950">
              {/* Roles Sidebar */}
              <aside className="w-72 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-2 flex flex-col">
                <div className="mb-6 px-2">
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Access Roles</h3>
                </div>
                <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                  {[
                    { id: 'admin', label: 'Administrator', icon: ShieldCheck },
                    { id: 'manager', label: 'Department Manager', icon: Settings },
                    { id: 'staff', label: 'Standard Staff', icon: Type },
                    { id: 'guest', label: 'External Guest', icon: Globe }
                  ].map((role) => (
                    <button 
                      key={role.id}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left",
                        role.id === 'admin' 
                          ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      )}
                    >
                      <role.icon size={14} />
                      {role.label}
                    </button>
                  ))}
                </div>
                <div className="mt-auto pt-4">
                  <button className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2">
                    <Plus size={12} />
                    New Role
                  </button>
                </div>
              </aside>

              {/* Permissions Content */}
              <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                <div className="max-w-none mx-auto space-y-12">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Security & Governance</h2>
                      <p className="text-zinc-500 text-sm">Define who can interact with this module and which data fields they can access.</p>
                    </div>
                  </div>

                  {/* Module Level Permissions */}
                  <div className="space-y-6">
                    <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">Global Module Access</h3>
                    <div className="grid grid-cols-3 gap-6">
                      {[
                        { label: 'Create Records', desc: 'Allows users to submit new data entries.', icon: Plus },
                        { label: 'Read All Records', desc: 'Allows viewing of all records in this module.', icon: Eye },
                        { label: 'Export Data', desc: 'Allows CSV/JSON data extraction.', icon: Database }
                      ].map((perm, i) => (
                        <div key={i} className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                              <perm.icon size={18} />
                            </div>
                            <div className="w-10 h-6 bg-emerald-500 rounded-full relative">
                              <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-zinc-900 dark:text-white">{perm.label}</h4>
                            <p className="text-[10px] text-zinc-500 leading-relaxed">{perm.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Field Level Security */}
                  <div className="space-y-6">
                    <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">Field-Level Security (FLS)</h3>
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-xl shadow-indigo-500/5">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-100 dark:border-zinc-800/50">
                            <th className="px-6 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Field Name</th>
                            <th className="px-6 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Read</th>
                            <th className="px-6 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Write</th>
                            <th className="px-6 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Masked</th>
                            <th className="px-6 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Logic</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                          {layout.map((field) => (
                            <tr key={field.id} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 group-hover:bg-indigo-500/10 group-hover:text-indigo-500 transition-colors">
                                    {(() => {
                                      const fieldDef = FIELD_CATEGORIES.flatMap(c => c.fields).find(f => f.id === field.type);
                                      const Icon = fieldDef?.icon || GridIcon;
                                      return <Icon size={14} />;
                                    })()}
                                  </div>
                                  <span className="text-xs font-bold text-zinc-900 dark:text-white">{field.label}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="w-4 h-4 rounded border-2 border-emerald-500 bg-emerald-500/10 mx-auto flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-sm" />
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="w-4 h-4 rounded border-2 border-emerald-500 bg-emerald-500/10 mx-auto flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-sm" />
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="w-4 h-4 rounded border-2 border-zinc-200 dark:border-zinc-800 mx-auto" />
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-[9px] font-bold text-zinc-400 italic">No restrictions</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'forms' ? (
            <div className="flex h-full w-full bg-white dark:bg-zinc-950 overflow-hidden">
               {/* Form Management Sidebar (Left) */}
               <aside className="w-72 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-2 flex flex-col">
                <div className="mb-6 px-2 flex items-center justify-between">
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Module Forms</h3>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-500/10 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest">
                    <Zap size={10} />
                    AI Build
                  </div>
                </div>
                <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2">
                  {forms.map((form) => (
                    <button 
                      key={form.id}
                      onClick={() => {
                        setSelectedFormId(form.id);
                        setSelectedFieldInFormId(null);
                      }}
                      className={cn(
                        "w-full flex flex-col gap-1 px-4 py-2.5 rounded-xl text-left transition-all group",
                        selectedFormId === form.id 
                          ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" 
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                         <span className="text-xs font-bold truncate pr-2">{form.name}</span>
                         <div className="flex items-center gap-2 flex-shrink-0">
                           <span className={cn(
                             "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-tighter",
                             form.id === selectedFormId ? "bg-indigo-500/20 text-indigo-600" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                           )}>
                             {form.usage?.split('_')[1] || 'custom'}
                           </span>
                           {form.id !== 'default-create' && (
                             <div 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setForms(prev => prev.filter(f => f.id !== form.id));
                                 if (selectedFormId === form.id) setSelectedFormId('default-create');
                               }}
                               className="p-1 text-zinc-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                             >
                               <Trash2 size={12} />
                             </div>
                           )}
                         </div>
                      </div>
                      <p className={cn("text-[9px]", selectedFormId === form.id ? "text-indigo-500/70" : "text-zinc-400")}>
                        {form.fields?.length || 0} {(form.fields?.length || 0) === 1 ? 'field' : 'fields'}
                      </p>
                    </button>
                  ))}
                </div>
                <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-900">
                  <button 
                    onClick={() => {
                      const newForm = {
                        id: `form-${Date.now()}`,
                        name: 'New Custom Form',
                        type: 'custom',
                        fields: [] as any[],
                        settings: { requireLogin: true, submitLabel: 'Submit' }
                      };
                      setForms([...forms, newForm]);
                      setSelectedFormId(newForm.id);
                    }}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                  >
                    <Plus size={12} />
                    New Form
                  </button>
                </div>
              </aside>

               {/* Main Builder Area */}
               {selectedFormId ? (() => {
                 const selectedForm = forms.find(f => f.id === selectedFormId);
                 if (!selectedForm) return null;
                 
                 return (
                   <>
                      <aside className="w-72 border-r border-zinc-100 dark:border-zinc-900 bg-white dark:bg-zinc-950 p-6 flex flex-col gap-8 overflow-y-auto custom-scrollbar">
                        <div className="space-y-4">
                           <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2">Module Fields</h3>
                           <div className="space-y-2">
                              {layout.map(field => {
                                 const isAdded = selectedForm.isMultistep 
                                    ? (selectedForm.steps || []).some((s: any) => (s.fields || []).some((f: any) => f.id === field.id)) 
                                    : (selectedForm.fields || []).some((f: any) => f.id === field.id);
                                 return (
                                   <button 
                                     key={field.id}
                                     onClick={() => {
                                       if (isAdded) {
                                         setForms(prev => prev.map(f => {
                                           if (f.id !== selectedFormId) return f;
                                           if (f.isMultistep) {
                                             return { ...f, steps: f.steps.map((s: any) => ({ ...s, fields: s.fields.filter((fo: any) => fo.id !== field.id) })) };
                                           }
                                           return { ...f, fields: f.fields.filter((fo: any) => fo.id !== field.id) };
                                         }));
                                       } else {
                                         const newFieldObj = { id: field.id, labelOverride: field.label, width: 'full', required: field.required || false };
                                         setForms(prev => prev.map(f => {
                                           if (f.id !== selectedFormId) return f;
                                           if (f.isMultistep) {
                                             return { ...f, steps: f.steps.map((s: any) => s.id === currentStepId ? { ...s, fields: [...s.fields, newFieldObj] } : s) };
                                           }
                                           return { ...f, fields: [...f.fields, newFieldObj] };
                                         }));
                                       }
                                     }}
                                     className={cn(
                                       "w-full flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all group",
                                       isAdded 
                                         ? "bg-indigo-50/50 dark:bg-indigo-500/5 border-indigo-500/20" 
                                         : "bg-transparent border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                     )}
                                   >
                                     <div className="flex items-center gap-3">
                                        <div className={cn(
                                          "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                                          isAdded ? "bg-indigo-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 group-hover:text-zinc-600"
                                        )}>
                                           {(() => {
                                             const fieldDef = FIELD_CATEGORIES.flatMap(c => c.fields).find(f => f.id === field.type);
                                             const Icon = fieldDef?.icon || Table;
                                             return <Icon size={14} />;
                                           })()}
                                        </div>
                                        <div className="text-left">
                                           <p className={cn("text-xs font-bold", isAdded ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-500")}>{field.label}</p>
                                           <p className="text-[9px] text-zinc-400 uppercase font-bold tracking-tighter">{field.type}</p>
                                        </div>
                                     </div>
                                     {isAdded ? (
                                       <Minus size={14} className="text-indigo-500" />
                                     ) : (
                                       <Plus size={14} className="text-zinc-300 group-hover:text-indigo-500 transition-colors" />
                                     )}
                                   </button>
                                 );
                              })}
                           </div>
                        </div>

                        <div className="space-y-4">
                           <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2">Visual Elements</h3>
                           <div className="grid grid-cols-2 gap-3">
                              {[
                                { label: 'Heading', icon: Type },
                                { label: 'Divider', icon: Minus },
                                { label: 'Spacer', icon: Maximize2 },
                                { label: 'HTML/Text', icon: Code }
                              ].map((el, i) => (
                                <button 
                                  key={i} 
                                  onClick={() => {
                                    const visualId = `visual-${el.label.toLowerCase().replace('/', '-')}-${generateId()}`;
                                    const newVisualObj = { 
                                      id: visualId, 
                                      type: el.label.toLowerCase().replace('/', '-'), 
                                      labelOverride: el.label === 'Heading' ? 'Section Heading' : el.label === 'HTML/Text' ? 'Text Content' : '',
                                      width: 'full'
                                    };
                                    setForms(prev => prev.map(f => { if (f.id !== selectedFormId) return f; if (f.isMultistep) { return { ...f, steps: f.steps.map((s: any) => s.id === currentStepId ? { ...s, fields: [...s.fields, newVisualObj] } : s) }; } return { ...f, fields: [...f.fields, newVisualObj] }; }));
                                    setSelectedFieldInFormId(visualId);
                                  }}
                                  className="flex flex-col items-center gap-2 p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-zinc-400 hover:text-indigo-600 hover:border-indigo-500/30 transition-all"
                                >
                                   <el.icon size={16} />
                                   <span className="text-[9px] font-black uppercase tracking-tighter">{el.label}</span>
                                </button>
                              ))}
                           </div>
                        </div>
                     </aside>

                     {/* Builder Canvas (Center) */}
                     <div className="flex-1 bg-zinc-50/50 dark:bg-zinc-950/50 overflow-y-auto custom-scrollbar p-12">
                        <div className="max-w-3xl mx-auto space-y-12">
                           {/* Form Preview Header */}
                           <div className="space-y-4">
                              <div className="flex items-center gap-4">
                                <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em]">Module Form Canvas</span>
                                <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                              </div>
                              <div className="bg-white dark:bg-zinc-900 p-10 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl shadow-indigo-500/5 space-y-8">
                                 {selectedForm.isMultistep && (
                                   <div className="space-y-6">
                                     <div className="flex items-center justify-between">
                                       <div className="flex items-center gap-3">
                                         <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                                           <ListOrdered size={16} />
                                         </div>
                                         <div>
                                           <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">Step Navigator</h3>
                                           <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-tighter">Managing {selectedForm.steps?.length || 0} stages</p>
                                         </div>
                                       </div>
                                       <button 
                                         onClick={() => {
                                           const newStepId = `step-${Date.now()}`;
                                           setForms(prev => prev.map(f => f.id === selectedFormId ? { 
                                             ...f, 
                                             steps: [...(f.steps || []), { id: newStepId, title: `Step ${f.steps.length + 1}`, fields: [] }] 
                                           } : f));
                                           setCurrentStepId(newStepId);
                                         }}
                                         className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all"
                                       >
                                         <Plus size={12} />
                                         Add Step
                                       </button>
                                     </div>

                                     <div className="flex gap-2 p-1 bg-zinc-50 dark:bg-zinc-950/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-x-auto no-scrollbar">
                                       {(selectedForm.steps || []).map((step: any, i: number) => (
                                         <div 
                                           key={step.id}
                                           onClick={() => {
                                             setCurrentStepId(step.id);
                                             setSelectedFieldInFormId(step.id);
                                           }}
                                           className={cn(
                                             "flex-shrink-0 flex items-center gap-3 px-5 py-3 rounded-xl transition-all cursor-pointer border-2 group/step",
                                             currentStepId === step.id 
                                               ? "bg-white dark:bg-zinc-900 border-indigo-500 shadow-md text-indigo-600" 
                                               : (selectedFieldInFormId === step.id ? "bg-white/50 dark:bg-zinc-900/50 border-indigo-500/30 text-indigo-400" : "bg-transparent border-transparent text-zinc-400 hover:text-zinc-600")
                                           )}
                                         >
                                           <span className={cn(
                                             "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black",
                                             currentStepId === step.id ? "bg-indigo-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                                           )}>{i + 1}</span>
                                           <input 
                                             type="text"
                                             value={step.title}
                                             onChange={(e) => {
                                               setForms(prev => prev.map(f => f.id === selectedFormId ? {
                                                 ...f,
                                                 steps: f.steps.map((s: any) => s.id === step.id ? { ...s, title: e.target.value } : s)
                                               } : f));
                                             }}
                                             onClick={(e) => e.stopPropagation()}
                                             className="bg-transparent border-none p-0 text-[10px] font-black uppercase tracking-widest focus:outline-none w-24"
                                           />
                                           {currentStepId === step.id && (
                                             <Settings2 
                                               size={12} 
                                               className="opacity-40 hover:opacity-100 transition-opacity ml-1"
                                               onClick={(e) => {
                                                 e.stopPropagation();
                                                 setSelectedFieldInFormId(step.id);
                                               }}
                                             />
                                           )}
                                           {step.visibilityRule && (
                                             <Zap size={10} className="text-amber-500 fill-amber-500/20" />
                                           )}
                                           {selectedForm.steps.length > 1 && (
                                             <button 
                                               onClick={(e) => {
                                                 e.stopPropagation();
                                                 setForms(prev => {
                                                   const newForms = prev.map(f => {
                                                     if (f.id !== selectedFormId) return f;
                                                     const newSteps = f.steps.filter((s: any) => s.id !== step.id);
                                                     return { ...f, steps: newSteps };
                                                   });
                                                   if (currentStepId === step.id) {
                                                      const form = newForms.find(f => f.id === selectedFormId);
                                                      if (form) setCurrentStepId(form.steps[0]?.id);
                                                   }
                                                   return newForms;
                                                 });
                                               }}
                                               className="p-1 hover:text-rose-500 opacity-0 group-hover/step:opacity-100 transition-opacity"
                                             >
                                               <X size={10} />
                                             </button>
                                           )}
                                         </div>
                                       ))}
                                     </div>
                                   </div>
                                 )}

                                 <div className="space-y-2">
                                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">{selectedForm.name}</h2>
                                    <p className="text-sm text-zinc-500">{selectedForm.settings?.description || 'Form description text goes here...'}</p>
                                 </div>

                                 <DndContext
                                   sensors={sensors}
                                   collisionDetection={closestCenter}
                                   onDragEnd={handleFormCanvasDragEnd}
                                 >
                                   {(() => {
                                     const currentStep = selectedForm.isMultistep 
                                       ? (selectedForm.steps.find((s: any) => s.id === currentStepId) || selectedForm.steps[0])
                                       : { fields: selectedForm.fields };
                                     const currentFields = currentStep?.fields || [];

                                     return (
                                       <SortableContext 
                                         items={currentFields.map((f: any) => f.id)}
                                         strategy={rectSortingStrategy}
                                       >
                                         <div className="grid grid-cols-12 gap-6">
                                           {currentFields.length > 0 ? (
                                             currentFields.map((fObj: any) => (
                                               <FormCanvasItem 
                                                 key={fObj.id} 
                                                 fObj={fObj} 
                                                 isSelected={selectedFieldInFormId === fObj.id}
                                                 layout={layout}
                                                 onSelect={setSelectedFieldInFormId}
                                                 isRestricted={isRestricted}
                                                 onDelete={(id: string) => {
                                                   setForms(prev => prev.map(f => {
                                                     if (f.id !== selectedFormId) return f;
                                                     if (f.isMultistep) {
                                                       return { ...f, steps: f.steps.map((s: any) => ({ ...s, fields: s.fields.filter((fo: any) => fo.id !== id) })) };
                                                     }
                                                     return { ...f, fields: f.fields.filter((fo: any) => fo.id !== id) };
                                                   }));
                                                   if (selectedFieldInFormId === id) setSelectedFieldInFormId(null);
                                                 }}
                                               />
                                             ))
                                           ) : (
                                             <div className="col-span-12 py-20 text-center space-y-4">
                                                <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto text-zinc-200">
                                                   <MousePointer2 size={32} />
                                                </div>
                                                <div className="space-y-1">
                                                   <p className="text-sm font-bold text-zinc-900 dark:text-white">Canvas is empty</p>
                                                   <p className="text-xs text-zinc-500">Select fields from the left palette to add them to your form.</p>
                                                </div>
                                             </div>
                                           )}
                                         </div>
                                       </SortableContext>
                                     );
                                   })()}
                                 </DndContext>

                                 <button className="w-full py-4 bg-indigo-600 text-white rounded-[2rem] text-xs font-bold uppercase tracking-widest shadow-2xl shadow-indigo-500/20">
                                    {selectedForm.settings?.submitLabel || 'Submit'}
                                 </button>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em]">Form Canvas Start</span>
                                <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* Inspector Sidebar (Right) */}
                     <aside className="w-80 border-l border-zinc-100 dark:border-zinc-900 bg-white dark:bg-zinc-950 p-4 overflow-y-auto custom-scrollbar">
                        {selectedFieldInFormId ? (() => {
                            // Check if it's a Step selection
                            const selectedStep = selectedForm.isMultistep ? selectedForm.steps.find((s: any) => s.id === selectedFieldInFormId) : null;
                            if (selectedStep) {
                               return (
                                 <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                   <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                                        <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">Step Settings</h3>
                                      </div>
                                      <button 
                                        onClick={() => setSelectedFieldInFormId(null)}
                                        className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
                                      >
                                        <X size={16} />
                                      </button>
                                   </div>

                                   <div className="space-y-6">
                                      <div className="space-y-2">
                                         <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Step Title</label>
                                         <input 
                                           type="text" 
                                           value={selectedStep.title}
                                           onChange={(e) => setForms(prev => prev.map(f => f.id === selectedFormId ? {
                                             ...f,
                                             steps: f.steps.map((s: any) => s.id === selectedStep.id ? { ...s, title: e.target.value } : s)
                                           } : f))}
                                           className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                                         />
                                      </div>

                                      <div className="space-y-4 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                                         <div className="flex items-center justify-between px-1">
                                           <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Step Visibility Rule</label>
                                           <div className="px-2 py-0.5 bg-indigo-500/10 text-indigo-500 rounded text-[8px] font-black uppercase tracking-widest">Conditional</div>
                                         </div>
                                         
                                         <div 
                                           onClick={() => setEditingCondition({
                                             targetId: selectedStep.id,
                                             targetType: 'step' as any,
                                             rule: selectedStep.visibilityRule
                                           })}
                                           className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl cursor-pointer hover:border-indigo-500/50 transition-all group"
                                         >
                                           {selectedStep.visibilityRule ? (
                                             <div className="flex items-center justify-between">
                                               <div className="flex items-center gap-2">
                                                 <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                 <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase">Rule Configured</span>
                                               </div>
                                               <Settings size={12} className="text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                                             </div>
                                           ) : (
                                             <div className="flex items-center justify-between">
                                               <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">Always Visible</span>
                                               <Plus size={12} className="text-zinc-300 group-hover:text-indigo-500 transition-colors" />
                                             </div>
                                           )}
                                         </div>
                                         {selectedStep.visibilityRule && (
                                           <button 
                                             onClick={(e) => {
                                               e.stopPropagation();
                                               setForms(prev => prev.map(f => f.id === selectedFormId ? {
                                                 ...f,
                                                 steps: f.steps.map((s: any) => s.id === selectedStep.id ? { ...s, visibilityRule: undefined } : s)
                                               } : f));
                                             }}
                                             className="text-[9px] font-bold text-rose-500 uppercase tracking-widest hover:underline ml-1"
                                           >
                                             Remove Rule
                                           </button>
                                         )}
                                      </div>
                                   </div>
                                 </div>
                               );
                            }

                           const currentStep = selectedForm.isMultistep ? selectedForm.steps.find((s: any) => s.id === currentStepId) : null;
                           const fields = selectedForm.isMultistep ? (currentStep?.fields || []) : selectedForm.fields;
                           const fObjIdx = fields.findIndex((f: any) => f.id === selectedFieldInFormId);
                           const fObj = fields[fObjIdx];
                           const isVisual = selectedFieldInFormId.startsWith('visual-');
                           const field = isVisual ? null : layout.find(f => f.id === selectedFieldInFormId);
                           if (!fObj || (!isVisual && !field)) return null;

                           return (
                             <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="flex items-center justify-between">
                                   <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">Field Settings</h3>
                                   <button 
                                     onClick={() => setSelectedFieldInFormId(null)}
                                     className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
                                   >
                                     <X size={16} />
                                   </button>
                                </div>

                                <div className="space-y-6">
                                   <div className="space-y-2">
                                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">
                                        {isVisual ? (fObj.type === 'heading' ? 'Heading Text' : fObj.type === 'html-text' ? 'Content' : 'Label Override') : 'Label Override'}
                                      </label>
                                      <input 
                                        type="text" 
                                        value={fObj.labelOverride || ''}
                                        onChange={(e) => {
                                          const updates = { labelOverride: e.target.value };
                                          setForms(prev => prev.map(f => {
                                            if (f.id !== selectedFormId) return f;
                                            if (f.isMultistep) {
                                              return { ...f, steps: f.steps.map((s: any) => ({ ...s, fields: s.fields.map((fo: any) => fo.id === selectedFieldInFormId ? { ...fo, ...updates } : fo) })) };
                                            }
                                            return { ...f, fields: f.fields.map((fo: any) => fo.id === selectedFieldInFormId ? { ...fo, ...updates } : fo) };
                                          }));
                                        }}
                                        placeholder={isVisual ? 'Enter text...' : field?.label}
                                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                                      />
                                   </div>

                                   <div className="space-y-2">
                                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Placeholder Override</label>
                                      <input 
                                        type="text" 
                                        value={fObj.placeholderOverride || ''}
                                        onChange={(e) => {
                                          const updates = { placeholderOverride: e.target.value };
                                          setForms(prev => prev.map(f => {
                                            if (f.id !== selectedFormId) return f;
                                            if (f.isMultistep) {
                                              return { ...f, steps: f.steps.map((s: any) => ({ ...s, fields: s.fields.map((fo: any) => fo.id === selectedFieldInFormId ? { ...fo, ...updates } : fo) })) };
                                            }
                                            return { ...f, fields: f.fields.map((fo: any) => fo.id === selectedFieldInFormId ? { ...fo, ...updates } : fo) };
                                          }));
                                        }}
                                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                                      />
                                   </div>

                                    <div className="space-y-2">
                                       <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Field Width</label>
                                       <div className="grid grid-cols-2 gap-2">
                                          {['full', 'half'].map((w) => (
                                            <button 
                                              key={w}
                                              onClick={() => {
                                                const updates = { width: w };
                                                setForms(prev => prev.map(f => {
                                                  if (f.id !== selectedFormId) return f;
                                                  if (f.isMultistep) {
                                                    return { ...f, steps: f.steps.map((s: any) => ({ ...s, fields: s.fields.map((fo: any) => fo.id === selectedFieldInFormId ? { ...fo, ...updates } : fo) })) };
                                                  }
                                                  return { ...f, fields: f.fields.map((fo: any) => fo.id === selectedFieldInFormId ? { ...fo, ...updates } : fo) };
                                                }));
                                              }}
                                              className={cn(
                                                "py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 transition-all",
                                                fObj.width === w || (!fObj.width && w === 'full')
                                                  ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                                                  : "bg-transparent border-zinc-100 dark:border-zinc-800 text-zinc-400 hover:border-zinc-200"
                                              )}
                                            >
                                              {w}
                                            </button>
                                          ))}
                                       </div>
                                    </div>

                                    {!isVisual && (
                                      <div className="grid grid-cols-2 gap-4 py-6 border-y border-zinc-100 dark:border-zinc-800">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                                            Required
                                            {field?.required && <Lock size={10} className="text-indigo-500" />}
                                          </span>
                                          <div 
                                            onClick={() => {
                                              if (field?.required) return;
                                              const updates = { required: !fObj.required };
                                              setForms(prev => prev.map(f => {
                                                if (f.id !== selectedFormId) return f;
                                                if (f.isMultistep) {
                                                  return { ...f, steps: f.steps.map((s: any) => ({ ...s, fields: s.fields.map((fo: any) => fo.id === selectedFieldInFormId ? { ...fo, ...updates } : fo) })) };
                                                }
                                                return { ...f, fields: f.fields.map((fo: any) => fo.id === selectedFieldInFormId ? { ...fo, ...updates } : fo) };
                                              }));
                                            }}
                                            className={cn(
                                              "h-5 w-9 rounded-full relative transition-all",
                                              field?.required ? "bg-indigo-600/50 cursor-not-allowed" : "cursor-pointer",
                                              (fObj.required || field?.required) ? "bg-indigo-600" : "bg-zinc-200 dark:bg-zinc-800"
                                            )}
                                          >
                                            <div className={cn("absolute top-1 h-3 w-3 rounded-full bg-white shadow-sm transition-all", (fObj.required || field?.required) ? "right-1" : "left-1")} />
                                          </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Read Only</span>
                                          <div 
                                            onClick={() => {
                                              const updates = { readOnly: !fObj.readOnly };
                                              setForms(prev => prev.map(f => {
                                                if (f.id !== selectedFormId) return f;
                                                if (f.isMultistep) {
                                                  return { ...f, steps: f.steps.map((s: any) => ({ ...s, fields: s.fields.map((fo: any) => fo.id === selectedFieldInFormId ? { ...fo, ...updates } : fo) })) };
                                                }
                                                return { ...f, fields: f.fields.map((fo: any) => fo.id === selectedFieldInFormId ? { ...fo, ...updates } : fo) };
                                              }));
                                            }}
                                            className={cn(
                                              "h-5 w-9 rounded-full relative cursor-pointer transition-colors",
                                              fObj.readOnly ? "bg-indigo-600" : "bg-zinc-200 dark:bg-zinc-800"
                                            )}
                                          >
                                            <div className={cn("absolute top-1 h-3 w-3 rounded-full bg-white shadow-sm transition-all", fObj.readOnly ? "right-1" : "left-1")} />
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                   {!isVisual && (
                                     <div className="p-6 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-3xl border border-indigo-500/10 space-y-3">
                                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                           <Info size={14} />
                                           <span className="text-[10px] font-black uppercase tracking-widest">Base Data Point</span>
                                        </div>
                                        <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">
                                          This field maps to <strong>{field?.id}</strong> in your module schema. Data type is <strong>{field?.type}</strong>.
                                        </p>
                                     </div>
                                   )}
                                    {isVisual && fObj.type === 'spacer' && (
                                       <div className="space-y-2">
                                          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Spacer Height</label>
                                          <select 
                                            value={fObj.height || 'md'}
                                            onChange={(e) => {
                                              const updates = { height: e.target.value };
                                              setForms(prev => prev.map(f => {
                                                if (f.id !== selectedFormId) return f;
                                                if (f.isMultistep) {
                                                  return { ...f, steps: f.steps.map((s: any) => ({ ...s, fields: s.fields.map((fo: any) => fo.id === selectedFieldInFormId ? { ...fo, ...updates } : fo) })) };
                                                }
                                                return { ...f, fields: f.fields.map((fo: any) => fo.id === selectedFieldInFormId ? { ...fo, ...updates } : fo) };
                                              }));
                                            }}
                                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-900 dark:text-white focus:outline-none"
                                          >
                                            <option value="sm">Small (16px)</option>
                                            <option value="md">Medium (32px)</option>
                                            <option value="lg">Large (64px)</option>
                                            <option value="xl">Extra Large (128px)</option>
                                          </select>
                                       </div>
                                    )}

                                    {/* Visibility Logic Section */}
                                    <div className="space-y-4 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                                      <div className="flex items-center justify-between px-1">
                                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Visibility Rules</label>
                                        <div className="px-2 py-0.5 bg-indigo-500/10 text-indigo-500 rounded text-[8px] font-black uppercase tracking-widest">Conditional</div>
                                      </div>
                                      
                                      <div className="space-y-3">
                                        <div className="space-y-1.5">
                                          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight ml-1">Dependent On</label>
                                          <select 
                                            value={fObj.visibility?.fieldId || ''}
                                            onChange={(e) => {
                                              const updates = { visibility: { ...fObj.visibility, fieldId: e.target.value } };
                                              setForms(prev => prev.map(f => {
                                                if (f.id !== selectedFormId) return f;
                                                if (f.isMultistep) {
                                                  return { ...f, steps: f.steps.map((s: any) => ({ ...s, fields: s.fields.map((fo: any) => fo.id === selectedFieldInFormId ? { ...fo, ...updates } : fo) })) };
                                                }
                                                return { ...f, fields: f.fields.map((fo: any) => fo.id === selectedFieldInFormId ? { ...fo, ...updates } : fo) };
                                              }));
                                            }}
                                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-[11px] text-zinc-900 dark:text-white focus:outline-none"
                                          >
                                            <option value="">Always Visible</option>
                                            {fields
                                              .filter((f: any) => f.id !== selectedFieldInFormId && !f.id.startsWith('visual-'))
                                              .map((f: any) => {
                                                const label = layout.find(l => l.id === f.id)?.label || f.id;
                                                return <option key={f.id} value={f.id}>{label}</option>
                                              })}
                                          </select>
                                        </div>

                                        {fObj.visibility?.fieldId && (
                                          <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-2 duration-300">
                                            <div className="space-y-1.5">
                                              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight ml-1">Operator</label>
                                              <select 
                                                value={fObj.visibility?.operator || 'eq'}
                                                onChange={(e) => {
                                                  const updates = { visibility: { ...fObj.visibility, operator: e.target.value } };
                                                  setForms(prev => prev.map(f => {
                                                    if (f.id !== selectedFormId) return f;
                                                    if (f.isMultistep) {
                                                      return { ...f, steps: f.steps.map((s: any) => ({ ...s, fields: s.fields.map((fo: any) => fo.id === selectedFieldInFormId ? { ...fo, ...updates } : fo) })) };
                                                    }
                                                    return { ...f, fields: f.fields.map((fo: any) => fo.id === selectedFieldInFormId ? { ...fo, ...updates } : fo) };
                                                  }));
                                                }}
                                                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-[11px] text-zinc-900 dark:text-white focus:outline-none"
                                              >
                                                <option value="eq">Equals</option>
                                                <option value="neq">Not Equals</option>
                                                <option value="contains">Contains</option>
                                              </select>
                                            </div>
                                            <div className="space-y-1.5">
                                              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight ml-1">Value</label>
                                              <input 
                                                type="text"
                                                value={fObj.visibility?.value || ''}
                                                onChange={(e) => {
                                                  const updates = { visibility: { ...fObj.visibility, value: e.target.value } };
                                                  setForms(prev => prev.map(f => {
                                                    if (f.id !== selectedFormId) return f;
                                                    if (f.isMultistep) {
                                                      return { ...f, steps: f.steps.map((s: any) => ({ ...s, fields: s.fields.map((fo: any) => fo.id === selectedFieldInFormId ? { ...fo, ...updates } : fo) })) };
                                                    }
                                                    return { ...f, fields: f.fields.map((fo: any) => fo.id === selectedFieldInFormId ? { ...fo, ...updates } : fo) };
                                                  }));
                                                }}
                                                placeholder="Value..."
                                                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-[11px] text-zinc-900 dark:text-white focus:outline-none"
                                              />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {!isVisual && (
                                      <div className="space-y-4 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                                        <div className="flex items-center justify-between px-1">
                                          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Validation Rules</label>
                                          <div className="px-2 py-0.5 bg-rose-500/10 text-rose-500 rounded text-[8px] font-black uppercase tracking-widest">Constraints</div>
                                        </div>
                                        
                                        <div className="space-y-3">
                                          <div className="space-y-1.5">
                                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight ml-1">Pattern (Regex)</label>
                                            <input 
                                              type="text"
                                              value={fObj.validation?.pattern || ''}
                                              onChange={(e) => {
                                                const updates = { validation: { ...fObj.validation, pattern: e.target.value } };
                                                setForms(prev => prev.map(f => {
                                                  if (f.id !== selectedFormId) return f;
                                                  if (f.isMultistep) {
                                                    return { ...f, steps: f.steps.map((s: any) => ({ ...s, fields: s.fields.map((fo: any) => fo.id === selectedFieldInFormId ? { ...fo, ...updates } : fo) })) };
                                                  }
                                                  return { ...f, fields: f.fields.map((fo: any) => fo.id === selectedFieldInFormId ? { ...fo, ...updates } : fo) };
                                                }));
                                              }}
                                              placeholder="e.g. ^[0-9]{5}$"
                                              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-[11px] text-zinc-900 dark:text-white font-mono focus:outline-none"
                                            />
                                          </div>
                                          <div className="space-y-1.5">
                                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight ml-1">Error Message</label>
                                            <input 
                                              type="text"
                                              value={fObj.validation?.errorMessage || ''}
                                              onChange={(e) => {
                                                const updates = { validation: { ...fObj.validation, errorMessage: e.target.value } };
                                                setForms(prev => prev.map(f => {
                                                  if (f.id !== selectedFormId) return f;
                                                  if (f.isMultistep) {
                                                    return { ...f, steps: f.steps.map((s: any) => ({ ...s, fields: s.fields.map((fo: any) => fo.id === selectedFieldInFormId ? { ...fo, ...updates } : fo) })) };
                                                  }
                                                  return { ...f, fields: f.fields.map((fo: any) => fo.id === selectedFieldInFormId ? { ...fo, ...updates } : fo) };
                                                }));
                                              }}
                                              placeholder="Invalid input..."
                                              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-[11px] text-zinc-900 dark:text-white focus:outline-none"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                   <button 
                                     onClick={() => {
                                       setForms(prev => prev.map(f => {
                                         if (f.id !== selectedFormId) return f;
                                         if (f.isMultistep) {
                                           return { ...f, steps: f.steps.map((s: any) => ({ ...s, fields: s.fields.filter((fo: any) => fo.id !== selectedFieldInFormId) })) };
                                         }
                                         return { ...f, fields: f.fields.filter((fo: any) => fo.id !== selectedFieldInFormId) };
                                       }));
                                       setSelectedFieldInFormId(null);
                                     }}
                                     className="w-full py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                   >
                                     Remove from Form
                                   </button>
                                </div>
                             </div>
                           );
                        })() : (
                          <div className="space-y-8 animate-in fade-in duration-300">
                             <div className="space-y-1">
                                <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">Form Settings</h3>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Global Configuration</p>
                             </div>

                             <div className="space-y-6">
                                <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                                   <div className="space-y-0.5">
                                      <p className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest">Multistep Form</p>
                                      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Enable Wizard Flow</p>
                                   </div>
                                   <button 
                                      onClick={() => {
                                        setForms(prev => prev.map(f => {
                                          if (f.id !== selectedFormId) return f;
                                          const isMultistep = !f.isMultistep;
                                          let steps = f.steps || [];
                                          if (isMultistep && steps.length === 0) {
                                            steps = [{ id: "step-1", title: "Step 1", fields: f.fields || [] }];
                                          }
                                          return { ...f, isMultistep, steps };
                                        }));
                                      }}
                                      className={cn(
                                        "w-10 h-6 rounded-full relative transition-all",
                                        selectedForm.isMultistep ? "bg-indigo-600" : "bg-zinc-200 dark:bg-zinc-800"
                                      )}
                                    >
                                      <div className={cn(
                                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                                        selectedForm.isMultistep ? "right-1" : "left-1"
                                      )} />
                                   </button>
                                </div>
                                <div className="space-y-2">
                                   <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Form Name</label>
                                   <input 
                                     type="text" 
                                     value={selectedForm.name}
                                     onChange={(e) => setForms(prev => prev.map(f => f.id === selectedFormId ? { ...f, name: e.target.value } : f))}
                                     className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                                   />
                                </div>

                                <div className="space-y-2">
                                   <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Description</label>
                                   <textarea 
                                     value={selectedForm.settings?.description || ''}
                                     onChange={(e) => setForms(prev => prev.map(f => f.id === selectedFormId ? { ...f, settings: { ...f.settings, description: e.target.value } } : f))}
                                     rows={3}
                                     className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
                                   />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">Form Usage</label>
                                  <select 
                                    value={selectedForm.usage || 'public_link'}
                                    onChange={(e) => {
                                      const newVal = e.target.value;
                                      setForms(prev => prev.map(f => {
                                        if (f.id === selectedFormId) return { ...f, usage: newVal };
                                        if ((newVal === 'workspace_create' || newVal === 'workspace_edit') && f.usage === newVal) {
                                          return { ...f, usage: 'public_link' };
                                        }
                                        return f;
                                      }));
                                    }}
                                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 appearance-none"
                                  >
                                    <option value="workspace_create">Platform: "Create Record" Button</option>
                                    <option value="workspace_edit">Platform: "Edit Record" Action</option>
                                    <option value="public_link">External: Public Data Entry Link</option>
                                    <option value="action_trigger">Action: Triggered by Quick Action</option>
                                  </select>
                                </div>

                                <div className="space-y-2">
                                  <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">Submit Label</label>
                                  <input 
                                    type="text" 
                                    value={selectedForm.settings?.submitLabel || 'Submit'}
                                    onChange={(e) => setForms(prev => prev.map(f => f.id === selectedFormId ? { ...f, settings: { ...f.settings, submitLabel: e.target.value } } : f))}
                                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">Success Message</label>
                                  <input 
                                    type="text" 
                                    value={selectedForm.settings?.successMessage || 'Success!'}
                                    onChange={(e) => setForms(prev => prev.map(f => f.id === selectedFormId ? { ...f, settings: { ...f.settings, successMessage: e.target.value } } : f))}
                                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                                  />
                                </div>

                                <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                                   <div className="space-y-0.5">
                                      <p className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest">Require Auth</p>
                                      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Private Link Only</p>
                                   </div>
                                   <button 
                                      onClick={() => setForms(prev => prev.map(f => f.id === selectedFormId ? { ...f, settings: { ...f.settings, requireLogin: !f.settings.requireLogin } } : f))}
                                      className={cn(
                                        "w-10 h-6 rounded-full relative transition-all",
                                        selectedForm.settings?.requireLogin ? "bg-indigo-600" : "bg-zinc-200 dark:bg-zinc-800"
                                      )}
                                    >
                                      <div className={cn(
                                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                                        selectedForm.settings?.requireLogin ? "right-1" : "left-1"
                                      )} />
                                    </button>
                                </div>
                             </div>
                          </div>
                        )}
                     </aside>
                   </>
                 );
               })() : (
                 <div className="h-full flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
                    <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-900 rounded-[2.5rem] flex items-center justify-center text-zinc-200 dark:text-zinc-800">
                       <FileCode size={40} />
                    </div>
                    <div className="space-y-1">
                       <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Select a form to configure</h3>
                       <p className="text-sm text-zinc-500">Every module starts with a default create record form.</p>
                    </div>
                 </div>
               )}
            </div>
            ) : null}
          </div>
        </main>
        {/* Right Sidebar - Dual Mode */}
        {activeTab === 'builder' && (
          <aside className="w-85 flex-shrink-0 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col overflow-hidden">
            {/* Mode Switcher */}
            <div className="h-[52px] border-b border-zinc-200 dark:border-zinc-800 flex items-center p-1 bg-zinc-50/50 dark:bg-transparent">
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
                  {selectedIds.length > 1 ? (
                    <motion.div 
                      key="bulk-edit"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="p-4 space-y-4"
                    >
                      {/* Bulk Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-4 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                          <h3 className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest">
                            Bulk Edit ({selectedIds.length} items)
                          </h3>
                        </div>
                        <button 
                          onClick={() => setSelectedIds([])}
                          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-500 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {/* Bulk Controls */}
                      <div className="space-y-6">
                        <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                          <p className="text-[10px] text-amber-600 dark:text-amber-500 font-medium leading-relaxed italic">
                            Changing properties here will apply to all {selectedIds.length} selected fields.
                          </p>
                        </div>

                        {/* Shared Grid Control */}
                        <div className="space-y-5 pt-4">
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between px-1">
                              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Shared Column Span</label>
                            </div>
                            <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 flex items-center">
                              <input 
                                type="range" 
                                min="1" 
                                max="12" 
                                step="1"
                                onChange={(e) => updateFields(selectedIds, { colSpan: parseInt(e.target.value) })}
                                className="w-full accent-amber-500 cursor-pointer h-1.5"
                              />
                            </div>
                          </div>

                          <div className="pt-6 border-t border-zinc-100 dark:border-zinc-900">
                             <label className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl cursor-pointer hover:bg-zinc-100 transition-all">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                    <CheckSquare size={14} className="text-zinc-500" />
                                  </div>
                                  <div>
                                    <span className="block text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-widest">Required</span>
                                    <span className="block text-[9px] text-zinc-500">Toggle for all selected</span>
                                  </div>
                                </div>
                                  <div className="flex items-center gap-2">
                                    <button 
                                      onClick={() => {
                                        const nonContainerIds = selectedIds.filter(id => {
                                          const f = findFieldRecursive(layout, id);
                                          return f && !['heading', 'divider', 'spacer', 'alert', 'connector', 'group', 'fieldGroup', 'repeatableGroup', 'card', 'accordion', 'tabs_nested', 'stepper', 'timeline'].includes(f.type);
                                        });
                                        updateFields(nonContainerIds, { required: true });
                                      }} 
                                      className="px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded text-[9px] font-bold uppercase tracking-widest"
                                    >
                                      On
                                    </button>
                                    <button 
                                      onClick={() => updateFields(selectedIds, { required: false })} 
                                      className="px-2 py-1 bg-rose-500/10 text-rose-600 rounded text-[9px] font-bold uppercase tracking-widest"
                                    >
                                      Off
                                    </button>
                                  </div>
                             </label>
                          </div>
                        </div>

                        <div className="pt-12">
                          <button 
                            onClick={() => deleteBlocks(selectedIds)}
                            className="w-full py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] font-bold text-rose-500 hover:bg-rose-500 hover:text-white transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                          >
                            <Trash2 size={12} />
                            <span>Delete {selectedIds.length} Fields</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ) : selectedId === 'page-header' ? (
                    <motion.div 
                      key="page-header-inspector"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="p-4 space-y-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-4 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                          <h3 className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest">
                            Page Title Settings
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
                        <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                          <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium leading-relaxed italic">
                            Select which field should be used as the primary header for records in this module.
                          </p>
                        </div>

                        <div className="space-y-4">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">Source Field</label>
                          <select 
                            value={moduleSettings.titleFieldId || ''}
                            onChange={(e) => setModuleSettings(prev => ({ ...prev, titleFieldId: e.target.value }))}
                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                          >
                            <option value="">Default (Record ID/Key)</option>
                            {layout
                              .filter(f => !['tab', 'section', 'button', 'spacer', 'heading'].includes(f.type))
                              .map(field => (
                                <option key={field.id} value={field.id}>
                                  {field.label} ({field.type})
                                </option>
                              ))}
                          </select>
                          <p className="text-[9px] text-zinc-500 font-medium px-1 leading-relaxed">
                            If the selected field is empty for a specific record, the system will fallback to the Record ID.
                          </p>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-900">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">Subtitle Fields</label>
                          <div className="space-y-2">
                             <Reorder.Group 
                               axis="y" 
                               values={moduleSettings.subtitleFieldIds || []} 
                               onReorder={(newIds) => setModuleSettings(prev => ({ ...prev, subtitleFieldIds: newIds }))}
                               className="space-y-2"
                             >
                               {moduleSettings.subtitleFieldIds?.map((id) => {
                                 const field = layout.find(f => f.id === id) || METADATA_FIELDS.find(f => f.id === id);
                                 return (
                                   <Reorder.Item 
                                     key={id} 
                                     value={id}
                                     className="flex items-center gap-2 group"
                                   >
                                      <div className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white flex items-center justify-between">
                                         <div className="flex items-center gap-2 min-w-0">
                                           <GripVertical size={12} className="text-zinc-400 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity" />
                                           <span className="truncate text-[10px] font-medium">{field?.label || id}</span>
                                         </div>
                                         <button 
                                           onClick={() => {
                                             setModuleSettings(prev => ({ 
                                               ...prev, 
                                               subtitleFieldIds: prev.subtitleFieldIds.filter(sid => sid !== id) 
                                             }));
                                           }}
                                           className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-rose-500 transition-all"
                                         >
                                           <X size={12} />
                                         </button>
                                      </div>
                                   </Reorder.Item>
                                 );
                               })}
                             </Reorder.Group>
                             
                             <button 
                               onClick={() => setIsFieldSelectorOpen(true)}
                               className="w-full bg-white dark:bg-zinc-950 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-500 hover:text-indigo-500 hover:border-indigo-500 transition-all flex items-center justify-center gap-2 group/add"
                             >
                               <Plus size={14} className="text-zinc-400 group-hover/add:text-indigo-500" />
                               <span>Add Subtitle Field...</span>
                             </button>

                             <FieldSelectorModal 
                               isOpen={isFieldSelectorOpen}
                               onClose={() => setIsFieldSelectorOpen(false)}
                               title="Nominate Subtitle Field"
                               multi={true}
                               onSelectMultiple={(fieldIds) => {
                                 setModuleSettings(prev => ({ 
                                   ...prev, 
                                   subtitleFieldIds: [...(prev.subtitleFieldIds || []), ...fieldIds] 
                                 }));
                               }}
                               onSelect={(fieldId) => {
                                 setModuleSettings(prev => ({ 
                                   ...prev, 
                                   subtitleFieldIds: [...(prev.subtitleFieldIds || []), fieldId] 
                                 }));
                               }}
                               fields={[
                                 ...METADATA_FIELDS.map(f => f as any),
                                 ...allFields.filter(f => !isContainerField(f.type) && !['button', 'spacer', 'heading', 'divider', 'alert', 'html'].includes(f.type))
                               ]}
                               tabs={[
                                 { id: 'metadata', label: 'System Metadata' },
                                 ...tabs
                               ]}
                               excludeFieldIds={moduleSettings.subtitleFieldIds}
                             />
                          </div>
                          <p className="text-[9px] text-zinc-500 font-medium px-1 leading-relaxed">
                            Nominate data points to appear in the record subtitle (separated by dots).
                          </p>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-900">
                          <IconPicker 
                            label="Module Icon"
                            value={moduleSettings.iconName || 'Box'}
                            onChange={(iconName) => setModuleSettings(prev => ({ ...prev, iconName }))}
                          />
                          <p className="text-[9px] text-zinc-500 font-medium px-1 leading-relaxed">
                            This icon represents the module across the entire platform sidebar and workspace.
                          </p>
                        </div>

                        <div className="pt-6 border-t border-zinc-100 dark:border-zinc-900">
                          <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex gap-3">
                            <div className="w-8 h-8 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                              <Sparkles size={14} className="text-amber-600" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-amber-900 dark:text-amber-100 uppercase tracking-tight">Pro Tip</p>
                              <p className="text-[9px] text-amber-700/70 dark:text-amber-500/70 leading-relaxed font-medium">
                                Choose fields like "Full Name", "Project Title", or "Serial Number" for the best user experience.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : selectedId === '__detail_settings' ? (
                    <motion.div 
                      key="detail-settings-inspector"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="p-4 space-y-6"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-4 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                          <h3 className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest">
                            {interfaceSettings.detail.layoutType === 'tabs' || !interfaceSettings.detail.layoutType ? 'Tabbed Layout Settings' :
                             interfaceSettings.detail.layoutType === 'split' ? 'Split View Settings' :
                             interfaceSettings.detail.layoutType === 'sidebar' ? 'Single Page Settings' :
                             interfaceSettings.detail.layoutType === 'process' ? 'Wizard Settings' :
                             'Accordion Settings'}
                          </h3>
                        </div>
                        <button 
                          onClick={() => setSelectedId(null)}
                          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-500 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[9px] text-zinc-400 leading-relaxed font-medium">
                          Configure layout presets and form density.
                        </p>
                      </div>

                      {/* Density Control Panel */}
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Form Density</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['compact', 'standard', 'spacious'] as const).map(d => (
                            <button
                              key={d}
                              onClick={() => setInterfaceSettings(prev => ({
                                ...prev,
                                detail: { ...prev.detail, density: d }
                              }))}
                              className={cn(
                                "px-3 py-2.5 rounded-xl border text-[9px] font-bold uppercase tracking-widest transition-all",
                                ((interfaceSettings.detail as any)?.density || 'standard') === d 
                                  ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                                  : "bg-zinc-50 dark:bg-zinc-950 border-zinc-100 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                              )}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Layout Presets */}
                      <div className="space-y-3 pt-6 border-t border-zinc-100 dark:border-zinc-900">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1 block">Detail Layout</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['tabs', 'split', 'sidebar', 'process', 'accordion'] as const).map(l => (
                            <button
                              key={l}
                              onClick={() => setInterfaceSettings(prev => ({
                                ...prev,
                                detail: { ...prev.detail, layoutType: l }
                              }))}
                              className={cn(
                                "px-1 py-2.5 rounded-xl border text-[8px] font-bold uppercase tracking-widest transition-all flex flex-col items-center gap-1.5 text-center min-w-0 truncate",
                                interfaceSettings.detail.layoutType === l
                                  ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                                  : "bg-zinc-50 dark:bg-zinc-950 border-zinc-100 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                              )}
                            >
                              {l === 'tabs' ? <Layout size={14} /> : 
                               l === 'split' ? <Columns size={14} /> : 
                               l === 'sidebar' ? <Sidebar size={14} /> : 
                               l === 'process' ? <ListOrdered size={14} /> : 
                               <Layers size={14} />}
                              <span className="truncate w-full">
                                {l === 'tabs' ? 'Top Tabs' : 
                                 l === 'split' ? 'Split View' : 
                                 l === 'sidebar' ? 'Single Page' : 
                                 l === 'process' ? 'Wizard' : 
                                 'Accordion'}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Wizard Save Mode (Only for process layout) */}
                      {interfaceSettings.detail.layoutType === 'process' && (
                        <div className="space-y-3 pt-6 border-t border-zinc-100 dark:border-zinc-900 animate-in fade-in duration-200">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1 block">Wizard Save Mode</label>
                          <div className="grid grid-cols-2 gap-2">
                            {([
                              { value: 'step', label: 'Step by Step' },
                              { value: 'end', label: 'Save at End' }
                            ] as const).map(sm => (
                              <button
                                key={sm.value}
                                onClick={() => setInterfaceSettings(prev => ({
                                  ...prev,
                                  detail: { 
                                    ...prev.detail, 
                                    wizardSaveMode: sm.value 
                                  }
                                }))}
                                className={cn(
                                  "px-3 py-2.5 rounded-xl border text-[9px] font-bold uppercase tracking-widest transition-all",
                                  (interfaceSettings.detail.wizardSaveMode || 'step') === sm.value
                                    ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                    : "bg-zinc-50 dark:bg-zinc-950 border-zinc-100 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                                )}
                              >
                                {sm.label}
                              </button>
                            ))}
                          </div>
                          <span className="text-[8px] text-zinc-400 px-1 leading-normal block">
                            "Step by Step" auto-saves fields on focus loss. "Save at End" holds changes locally until you complete the wizard.
                          </span>
                        </div>
                      )}

                      {/* Tab Icons Toggle */}
                      <div className="space-y-3 pt-6 border-t border-zinc-100 dark:border-zinc-900">
                        <div className="flex items-center justify-between px-1">
                          <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-black block">Show Tab Icons</label>
                            <span className="text-[9px] text-zinc-400 block mt-0.5">Display icons on detail section tabs.</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setInterfaceSettings(prev => ({
                              ...prev,
                              detail: { ...prev.detail, showTabIcons: !prev.detail.showTabIcons }
                            }))}
                            className={cn(
                              "w-10 h-6 rounded-full p-0.5 transition-all shrink-0 relative flex items-center",
                              interfaceSettings.detail.showTabIcons ? "bg-indigo-600 justify-end" : "bg-zinc-200 dark:bg-zinc-800 justify-start"
                            )}
                          >
                            <motion.div 
                              layout 
                              className="w-5 h-5 bg-white rounded-full shadow-sm" 
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Detail View Mode */}
                      <div className="space-y-3 pt-6 border-t border-zinc-100 dark:border-zinc-900">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1 block">Detail View Interaction</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { value: 'page', label: 'New Page' },
                            { value: 'modal', label: 'Modal Overlay' }
                          ].map(m => (
                            <button
                              key={m.value}
                              type="button"
                              onClick={() => setInterfaceSettings((prev: any) => ({
                                ...prev,
                                master: { 
                                  ...prev.master, 
                                  detailViewMode: m.value as 'page' | 'modal' 
                                }
                              }))}
                              className={cn(
                                "px-3 py-2.5 rounded-xl border text-[9px] font-bold uppercase tracking-widest transition-all",
                                (interfaceSettings.master.detailViewMode || 'page') === m.value
                                  ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                  : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900/50"
                              )}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ) : selectedId === '__table_settings' && activeViewMode === 'master' ? (
                    <motion.div 
                      key="table-settings-inspector"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="p-4 space-y-6"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-4 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                          <h3 className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest">
                            {interfaceSettings.master.layoutType === 'kanban' ? 'Kanban Settings' :
                             interfaceSettings.master.layoutType === 'calendar' ? 'Calendar Settings' :
                             interfaceSettings.master.layoutType === 'map' ? 'Map Settings' :
                             interfaceSettings.master.layoutType === 'cards' ? 'Cards Settings' :
                             interfaceSettings.master.layoutType === 'timeline' ? 'Timeline Settings' :
                             interfaceSettings.master.layoutType === 'gantt' ? 'Gantt Settings' :
                             interfaceSettings.master.layoutType === 'analytics' ? 'Analytics Settings' :
                             interfaceSettings.master.layoutType === 'pipeline' ? 'Pipeline Settings' :
                             'Table Settings'}
                          </h3>
                        </div>
                        <button 
                          onClick={() => setSelectedId(null)}
                          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-500 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {/* Description block */}
                      <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium leading-relaxed italic">
                          Configure layout presets, record pagination density, and default quick action presets for the master records list.
                        </p>
                      </div>

                      {/* Density Control Panel */}
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Table Density</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['compact', 'standard', 'spacious'] as const).map(d => (
                            <button
                              key={d}
                              onClick={() => setInterfaceSettings(prev => ({
                                ...prev,
                                master: { ...prev.master, density: d }
                              }))}
                              className={cn(
                                "px-3 py-2.5 rounded-xl border text-[9px] font-bold uppercase tracking-widest transition-all",
                                interfaceSettings.master.density === d 
                                  ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                                  : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900/50"
                              )}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Detail View Mode */}
                      <div className="space-y-3 pt-6 border-t border-zinc-100 dark:border-zinc-900">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1 block">Detail View Interaction</label>
                        <div className="grid grid-cols-2 gap-2">
                          {([
                            { value: 'page', label: 'New Page' },
                            { value: 'modal', label: 'Modal Overlay' }
                          ] as const).map(m => (
                            <button
                              key={m.value}
                              onClick={() => setInterfaceSettings(prev => ({
                                ...prev,
                                master: { 
                                  ...prev.master, 
                                  detailViewMode: m.value 
                                }
                              }))}
                              className={cn(
                                "px-3 py-2.5 rounded-xl border text-[9px] font-bold uppercase tracking-widest transition-all",
                                (interfaceSettings.master.detailViewMode || 'page') === m.value
                                  ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                  : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900/50"
                              )}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Pagination Control Panel */}
                      <div className="space-y-4 pt-6 border-t border-zinc-100 dark:border-zinc-900">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Pagination</label>
                          <button 
                            className={cn(
                              "w-8 h-5 rounded-full relative transition-all",
                              interfaceSettings.master.pagination?.enabled ? "bg-indigo-600" : "bg-zinc-200 dark:bg-zinc-800"
                            )}
                            onClick={() => setInterfaceSettings(prev => ({
                              ...prev,
                              master: {
                                ...prev.master,
                                pagination: { ...prev.master.pagination, enabled: !prev.master.pagination?.enabled }
                              }
                            }))}
                          >
                            <div className={cn(
                              "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all",
                              interfaceSettings.master.pagination?.enabled ? "right-0.5" : "left-0.5"
                            )} />
                          </button>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">Default Per Page</label>
                          <select 
                            value={interfaceSettings.master.pagination?.pageSize || 25}
                            onChange={(e) => setInterfaceSettings(prev => ({
                              ...prev,
                              master: {
                                ...prev.master,
                                pagination: { ...prev.master.pagination, pageSize: parseInt(e.target.value) }
                              }
                            }))}
                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-[10px] font-bold text-zinc-600 dark:text-zinc-400 focus:outline-none cursor-pointer"
                          >
                            {[10, 25, 50, 100].map(size => (
                              <option key={size} value={size}>{size} records</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Timeline View specific settings */}
                      {interfaceSettings.master.layoutType === 'timeline' && (
                        <div className="space-y-3 pt-6 border-t border-zinc-100 dark:border-zinc-900 animate-in fade-in duration-200">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1 block">Timeline Settings</label>
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">Date field source</label>
                            <select 
                              value={interfaceSettings.master.timelineDateFieldId || 'createdAt'}
                              onChange={(e) => setInterfaceSettings(prev => ({
                                ...prev,
                                master: {
                                  ...prev.master,
                                  timelineDateFieldId: e.target.value
                                }
                              }))}
                              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-[10px] font-bold text-zinc-600 dark:text-zinc-400 focus:outline-none cursor-pointer"
                            >
                              <option value="createdAt">Created Date (System)</option>
                              <option value="updatedAt">Updated Date (System)</option>
                              {displayFields.filter((f: any) => f.type === 'date').map((f: any) => (
                                <option key={f.id} value={f.id}>{f.label || f.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Gantt View specific settings */}
                      {interfaceSettings.master.layoutType === 'gantt' && (
                        <div className="space-y-3 pt-6 border-t border-zinc-100 dark:border-zinc-900 animate-in fade-in duration-200">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1 block">Gantt Chart Settings</label>
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1 block">Start Date Field</label>
                            <select 
                              value={interfaceSettings.master.ganttStartDateFieldId || 'createdAt'}
                              onChange={(e) => setInterfaceSettings(prev => ({
                                ...prev,
                                master: {
                                  ...prev.master,
                                  ganttStartDateFieldId: e.target.value
                                }
                              }))}
                              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-[10px] font-bold text-zinc-600 dark:text-zinc-400 focus:outline-none cursor-pointer mb-2"
                            >
                              <option value="createdAt">Created Date (System)</option>
                              <option value="updatedAt">Updated Date (System)</option>
                              {displayFields.filter((f: any) => f.type === 'date').map((f: any) => (
                                <option key={f.id} value={f.id}>{f.label || f.name}</option>
                              ))}
                            </select>

                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1 block">End Date Field</label>
                            <select 
                              value={interfaceSettings.master.ganttEndDateFieldId || 'createdAt'}
                              onChange={(e) => setInterfaceSettings(prev => ({
                                ...prev,
                                master: {
                                  ...prev.master,
                                  ganttEndDateFieldId: e.target.value
                                }
                              }))}
                              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-[10px] font-bold text-zinc-600 dark:text-zinc-400 focus:outline-none cursor-pointer"
                            >
                              <option value="createdAt">Created Date (System)</option>
                              <option value="updatedAt">Updated Date (System)</option>
                              {displayFields.filter((f: any) => f.type === 'date').map((f: any) => (
                                <option key={f.id} value={f.id}>{f.label || f.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Calendar View specific settings */}
                      {interfaceSettings.master.layoutType === 'calendar' && (
                        <div className="space-y-3 pt-6 border-t border-zinc-100 dark:border-zinc-900 animate-in fade-in duration-200">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1 block">Calendar Settings</label>
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">Date Field Source</label>
                            <select 
                              value={interfaceSettings.master.calendarDateFieldId || 'createdAt'}
                              onChange={(e) => setInterfaceSettings(prev => ({
                                ...prev,
                                master: {
                                  ...prev.master,
                                  calendarDateFieldId: e.target.value
                                }
                              }))}
                              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-[10px] font-bold text-zinc-600 dark:text-zinc-400 focus:outline-none cursor-pointer"
                            >
                              <option value="createdAt">Created Date (System)</option>
                              <option value="updatedAt">Updated Date (System)</option>
                              {displayFields.filter((f: any) => f.type === 'date').map((f: any) => (
                                <option key={f.id} value={f.id}>{f.label || f.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Map View specific settings */}
                      {interfaceSettings.master.layoutType === 'map' && (
                        <div className="space-y-3 pt-6 border-t border-zinc-100 dark:border-zinc-900 animate-in fade-in duration-200">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1 block">Map Settings</label>
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">Location/Address Field</label>
                            <select 
                              value={interfaceSettings.master.mapAddressFieldId || '_record_key'}
                              onChange={(e) => setInterfaceSettings(prev => ({
                                ...prev,
                                master: {
                                  ...prev.master,
                                  mapAddressFieldId: e.target.value
                                }
                              }))}
                              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-[10px] font-bold text-zinc-600 dark:text-zinc-400 focus:outline-none cursor-pointer"
                            >
                              <option value="_record_key">Record Key (Text)</option>
                              {displayFields.filter((f: any) => ['text', 'longText', 'address', 'connector', 'lookup'].includes(f.type)).map((f: any) => (
                                <option key={f.id} value={f.id}>{f.label || f.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Sales Pipeline specific settings */}
                      {interfaceSettings.master.layoutType === 'pipeline' && (
                        <div className="space-y-4 pt-6 border-t border-zinc-100 dark:border-zinc-900 animate-in fade-in duration-200">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1 block font-black">Pipeline Settings</label>
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">Deal Value / Amount Field</label>
                            <select 
                              value={interfaceSettings.master.pipelineValueFieldId || ''}
                              onChange={(e) => setInterfaceSettings(prev => ({
                                ...prev,
                                master: {
                                  ...prev.master,
                                  pipelineValueFieldId: e.target.value
                                }
                              }))}
                              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-[10px] font-bold text-zinc-600 dark:text-zinc-400 focus:outline-none cursor-pointer"
                            >
                              <option value="">-- Select Field --</option>
                              {displayFields.filter((f: any) => ['number', 'currency', 'calculation'].includes(f.type)).map((f: any) => (
                                <option key={f.id} value={f.id}>{f.label || f.name}</option>
                              ))}
                            </select>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">Close Date Field (Optional)</label>
                            <select 
                              value={interfaceSettings.master.pipelineDateFieldId || ''}
                              onChange={(e) => setInterfaceSettings(prev => ({
                                ...prev,
                                master: {
                                  ...prev.master,
                                  pipelineDateFieldId: e.target.value
                                }
                              }))}
                              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-[10px] font-bold text-zinc-600 dark:text-zinc-400 focus:outline-none cursor-pointer"
                            >
                              <option value="">-- Select Field --</option>
                              {displayFields.filter((f: any) => f.type === 'date').map((f: any) => (
                                <option key={f.id} value={f.id}>{f.label || f.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Cards View specific settings */}
                      {interfaceSettings.master.layoutType === 'cards' && (
                        <div className="space-y-4 pt-6 border-t border-zinc-100 dark:border-zinc-900 animate-in fade-in duration-200">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1 block font-black">Card Fields Config</label>
                          
                          {/* Add Field Section */}
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1 block font-black">Add Field to Card</label>
                            <select 
                              value=""
                              onChange={(e) => {
                                const fieldId = e.target.value;
                                if (!fieldId) return;
                                setInterfaceSettings((prev: any) => {
                                  const cardFields = prev.master.cardFields || [];
                                  const currentFields = cardFields.length > 0
                                    ? cardFields
                                    : displayFields.slice(1, 4).map(df => ({ fieldId: df.id, visible: true }));
                                  
                                  if (currentFields.some((cf: any) => cf.fieldId === fieldId)) {
                                    return {
                                      ...prev,
                                      master: {
                                        ...prev.master,
                                        cardFields: currentFields.map((cf: any) => cf.fieldId === fieldId ? { ...cf, visible: true } : cf)
                                      }
                                    };
                                  }
                                  return {
                                    ...prev,
                                    master: {
                                      ...prev.master,
                                      cardFields: [...currentFields, { fieldId, visible: true }]
                                    }
                                  };
                                });
                              }}
                              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-[10px] font-bold text-zinc-600 dark:text-zinc-400 focus:outline-none cursor-pointer"
                            >
                              <option value="">-- Select field to add --</option>
                              {/* Option for custom fields */}
                              {displayFields
                                .filter(f => {
                                  const cardFields = interfaceSettings.master.cardFields || [];
                                  const currentFields = cardFields.length > 0
                                    ? cardFields
                                    : displayFields.slice(1, 4).map(df => ({ fieldId: df.id, visible: true }));
                                  return !currentFields.some(cf => cf.fieldId === f.id && cf.visible !== false);
                                })
                                .map(f => (
                                  <option key={f.id} value={f.id}>{f.label || f.name} (Custom)</option>
                                ))
                              }
                              {/* Option for system fields */}
                              {[
                                { id: 'createdAt', label: 'Created Date' },
                                { id: 'createdBy', label: 'Created By' },
                                { id: 'updatedAt', label: 'Updated Date' },
                                { id: 'status', label: 'Status' },
                                { id: 'assigneeId', label: 'Assignee' }
                              ]
                                .filter(sf => {
                                  const cardFields = interfaceSettings.master.cardFields || [];
                                  const currentFields = cardFields.length > 0
                                    ? cardFields
                                    : displayFields.slice(1, 4).map(df => ({ fieldId: df.id, visible: true }));
                                  return !currentFields.some(cf => cf.fieldId === sf.id && cf.visible !== false);
                                })
                                .map(sf => (
                                  <option key={sf.id} value={sf.id}>{sf.label} (System)</option>
                                ))
                              }
                            </select>
                          </div>

                          {/* Ordered active field list */}
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1 block font-black">Card Body Fields</label>
                            <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1">
                              {(() => {
                                const cardFields = interfaceSettings.master.cardFields || [];
                                const currentFields = cardFields.length > 0
                                  ? cardFields
                                  : displayFields.slice(1, 4).map(df => ({ fieldId: df.id, visible: true }));
                                
                                return currentFields.map((cf, index) => {
                                  // Find the field def
                                  const customField = displayFields.find(f => f.id === cf.fieldId);
                                  const systemField = [
                                    { id: 'createdAt', label: 'Created Date' },
                                    { id: 'createdBy', label: 'Created By' },
                                    { id: 'updatedAt', label: 'Updated Date' },
                                    { id: 'status', label: 'Status' },
                                    { id: 'assigneeId', label: 'Assignee' }
                                  ].find(sf => sf.id === cf.fieldId);
                                  
                                  const label = customField ? (customField.label || customField.name) : (systemField ? systemField.label : cf.fieldId);
                                  const isSystem = !!systemField;
                                  
                                  return (
                                    <div 
                                      key={cf.fieldId}
                                      className={cn(
                                        "flex items-center justify-between p-2.5 rounded-xl border text-[10px] transition-all",
                                        cf.visible !== false
                                          ? "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 shadow-sm"
                                          : "bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800/50 text-zinc-400"
                                      )}
                                    >
                                      <span className="truncate max-w-[120px] font-bold" title={label}>
                                        {label} {isSystem && <span className="text-[8px] opacity-60 font-medium">(Sys)</span>}
                                      </span>
                                      
                                      <div className="flex items-center gap-0.5 shrink-0">
                                        {/* Reordering arrows */}
                                        <button
                                          disabled={index === 0}
                                          onClick={() => {
                                            setInterfaceSettings((prev: any) => {
                                              const newFields = [...currentFields];
                                              const temp = newFields[index];
                                              newFields[index] = newFields[index - 1];
                                              newFields[index - 1] = temp;
                                              return {
                                                ...prev,
                                                master: {
                                                  ...prev.master,
                                                  cardFields: newFields
                                                }
                                              };
                                            });
                                          }}
                                          className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-30 rounded text-zinc-500 transition-colors"
                                        >
                                          <ArrowUp size={12} />
                                        </button>
                                        
                                        <button
                                          disabled={index === currentFields.length - 1}
                                          onClick={() => {
                                            setInterfaceSettings((prev: any) => {
                                              const newFields = [...currentFields];
                                              const temp = newFields[index];
                                              newFields[index] = newFields[index + 1];
                                              newFields[index + 1] = temp;
                                              return {
                                                ...prev,
                                                master: {
                                                  ...prev.master,
                                                  cardFields: newFields
                                                }
                                              };
                                            });
                                          }}
                                          className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-30 rounded text-zinc-500 transition-colors"
                                        >
                                          <ArrowDown size={12} />
                                        </button>
                                        
                                        {/* Visibility toggle / delete */}
                                        <button
                                          onClick={() => {
                                            setInterfaceSettings((prev: any) => {
                                              const newFields = currentFields.map(f => 
                                                f.fieldId === cf.fieldId ? { ...f, visible: !f.visible } : f
                                              );
                                              return {
                                                ...prev,
                                                master: {
                                                  ...prev.master,
                                                  cardFields: newFields
                                                }
                                              };
                                            });
                                          }}
                                          className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded text-zinc-500 transition-colors"
                                        >
                                          {cf.visible !== false ? <Eye size={12} /> : <EyeOff size={12} />}
                                        </button>

                                        {/* Remove from cardFields */}
                                        <button
                                          onClick={() => {
                                            setInterfaceSettings((prev: any) => {
                                              const newFields = currentFields.filter(f => f.fieldId !== cf.fieldId);
                                              return {
                                                ...prev,
                                                master: {
                                                  ...prev.master,
                                                  cardFields: newFields
                                                }
                                              };
                                            });
                                          }}
                                          className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded text-rose-500 transition-colors"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Quick Actions Panel */}
                      <div className="space-y-4 pt-6 border-t border-zinc-100 dark:border-zinc-900">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1 font-black">Quick Actions</label>
                        <div className="space-y-2">
                          {interfaceSettings.actions.map((act) => (
                            <div key={act.id} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 animate-in fade-in duration-200">
                              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{act.label}</span>
                              <button 
                                onClick={() => setInterfaceSettings(prev => ({
                                  ...prev,
                                  actions: prev.actions.filter(a => a.id !== act.id)
                                }))}
                                className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-rose-500 rounded transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              const label = prompt("Enter action label:");
                              if (label) {
                                setInterfaceSettings(prev => ({
                                  ...prev,
                                  actions: [...prev.actions, { id: `act-${Date.now()}`, label, icon: 'FileText' }]
                                }));
                              }
                            }}
                            className="w-full py-2.5 border border-dashed border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 rounded-xl text-[9px] font-bold uppercase tracking-widest text-zinc-400 hover:text-indigo-500 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Plus size={10} /> Add Quick Action
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ) : selectedSystemField && activeViewMode === 'master' ? (
                    <motion.div 
                      key={`system-${selectedSystemField.id}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="p-4 space-y-6"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-4 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                          <h3 className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest">
                            System Column
                          </h3>
                        </div>
                        <button 
                          onClick={() => setSelectedId(null)}
                          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-500 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {/* Description block */}
                      <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                        <p className="text-[10px] text-amber-600 dark:text-amber-500 font-medium leading-relaxed italic">
                          Configure how the system "{selectedSystemField.label}" field behaves as a table column.
                        </p>
                      </div>

                      {/* Column Label */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Column Header Label</label>
                        <input 
                          type="text" 
                          value={interfaceSettings.master.columns?.find(c => c.fieldId === selectedSystemField.id)?.label || selectedSystemField.label}
                          onChange={(e) => {
                            const newLabel = e.target.value;
                            setInterfaceSettings(prev => {
                              const cols = prev.master.columns || [];
                              const exists = cols.some(c => c.fieldId === selectedSystemField.id);
                              if (!exists) {
                                return {
                                  ...prev,
                                  master: {
                                    ...prev.master,
                                    columns: [...cols, { fieldId: selectedSystemField.id, visible: true, inlineEdit: false, label: newLabel }]
                                  }
                                };
                              }
                              return {
                                ...prev,
                                master: {
                                  ...prev.master,
                                  columns: cols.map(c => c.fieldId === selectedSystemField.id ? { ...c, label: newLabel } : c)
                                }
                              };
                            });
                          }}
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                          placeholder={selectedSystemField.id === '_record_key' ? 'Key' : selectedSystemField.label}
                        />
                      </div>

                      {/* Show In Table Toggle */}
                      {selectedSystemField.id === '_record_key' ? (
                        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-900">
                          <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex gap-3">
                            <div className="w-8 h-8 bg-indigo-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                              <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-indigo-900 dark:text-indigo-100 uppercase tracking-tight">Record Key Column</p>
                              <p className="text-[9px] text-zinc-500 leading-relaxed font-medium">
                                The unique Record Key is statically fixed at column index 0 and cannot be hidden.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-widest">Show in Table</p>
                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Display as active column</p>
                          </div>
                          <button 
                            onClick={() => {
                              setInterfaceSettings(prev => {
                                const cols = prev.master.columns || [];
                                const isCurrentlyShow = cols.some(c => c.fieldId === selectedSystemField.id && c.visible !== false);
                                return {
                                  ...prev,
                                  master: {
                                    ...prev.master,
                                    columns: cols.map(c => c.fieldId === selectedSystemField.id ? { ...c, visible: !isCurrentlyShow } : c)
                                  }
                                };
                              });
                              setSelectedId(null);
                            }}
                            className={cn(
                              "w-10 h-6 rounded-full relative transition-all",
                              interfaceSettings.master.columns?.some(c => c.fieldId === selectedSystemField.id && c.visible !== false) ? "bg-indigo-600" : "bg-zinc-200 dark:bg-zinc-800"
                            )}
                          >
                            <div className={cn(
                              "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                              interfaceSettings.master.columns?.some(c => c.fieldId === selectedSystemField.id && c.visible !== false) ? "right-1" : "left-1"
                            )} />
                          </button>
                        </div>
                      )}

                      {/* Inline Edit Toggle (only for Assignee) */}
                      {selectedSystemField.id === 'assigneeId' && (
                        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-widest">Inline Edit</p>
                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Allow editing in Table</p>
                          </div>
                          <button 
                            onClick={() => {
                              setInterfaceSettings(prev => {
                                const cols = prev.master.columns || [];
                                const exists = cols.some(c => c.fieldId === selectedSystemField.id);
                                const isCurrentlyInlineEdit = cols.find(c => c.fieldId === selectedSystemField.id)?.inlineEdit || false;
                                const newInlineEdit = !isCurrentlyInlineEdit;
                                if (!exists) {
                                  return {
                                    ...prev,
                                    master: {
                                      ...prev.master,
                                      columns: [...cols, { fieldId: selectedSystemField.id, visible: true, inlineEdit: newInlineEdit }]
                                    }
                                  };
                                }
                                return {
                                  ...prev,
                                  master: {
                                    ...prev.master,
                                    columns: cols.map(c => c.fieldId === selectedSystemField.id ? { ...c, inlineEdit: newInlineEdit } : c)
                                  }
                                };
                              });
                            }}
                            className={cn(
                              "w-10 h-6 rounded-full relative transition-all",
                              interfaceSettings.master.columns?.find(c => c.fieldId === selectedSystemField.id)?.inlineEdit ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-800"
                            )}
                          >
                            <div className={cn(
                              "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                              interfaceSettings.master.columns?.find(c => c.fieldId === selectedSystemField.id)?.inlineEdit ? "right-1" : "left-1"
                            )} />
                          </button>
                        </div>
                      )}

                      {/* Column Width Slider */}
                      <div className="space-y-3 pt-6 border-t border-zinc-100 dark:border-zinc-900">
                        <div className="flex items-center justify-between px-1">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Column Width</label>
                          <span className="text-[10px] font-mono text-indigo-500 font-black">
                            {interfaceSettings.master.columns?.find(c => c.fieldId === selectedSystemField.id)?.width || 120}px
                          </span>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 flex items-center">
                          <input 
                            type="range" 
                            min="80" 
                            max="500" 
                            step="10"
                            value={interfaceSettings.master.columns?.find(c => c.fieldId === selectedSystemField.id)?.width || 120}
                            onChange={(e) => {
                              const newWidth = parseInt(e.target.value, 10);
                              setInterfaceSettings(prev => {
                                const cols = prev.master.columns || [];
                                return {
                                  ...prev,
                                  master: {
                                    ...prev.master,
                                    columns: cols.map(c => c.fieldId === selectedSystemField.id ? { ...c, width: newWidth } : c)
                                  }
                                };
                              });
                            }}
                            className="w-full accent-indigo-500 cursor-pointer h-1.5"
                          />
                        </div>
                      </div>

                      {/* Remove Button */}
                      <div className="pt-8 border-t border-zinc-100 dark:border-zinc-900">
                        <button 
                          onClick={() => {
                            setInterfaceSettings(prev => {
                              const cols = prev.master.columns || [];
                              return {
                                ...prev,
                                master: {
                                  ...prev.master,
                                  columns: cols.map(c => c.fieldId === selectedSystemField.id ? { ...c, visible: false } : c)
                                }
                              };
                            });
                            setSelectedId(null);
                            toast.success("System column removed");
                          }}
                          className="w-full py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Remove Column
                        </button>
                      </div>
                    </motion.div>
                  ) : selectedField && activeViewMode === 'master' ? (
                      <motion.div 
                        key={`column-${selectedField.id}`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="p-4 space-y-6"
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-4 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                            <h3 className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest">
                              Column Settings
                            </h3>
                          </div>
                          <button 
                            onClick={() => setSelectedId(null)}
                            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-500 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        {/* Description block */}
                        <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                          <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium leading-relaxed italic">
                            Configure how the "{selectedField.label || selectedField.name}" field behaves as a table column.
                          </p>
                        </div>

                        {/* Column Label Override */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Column Header Label</label>
                          <input 
                            type="text" 
                            value={selectedField.label}
                            onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                            placeholder="e.g. Serial Number"
                          />
                        </div>

                        {/* Inline Edit Toggle */}
                        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-widest">Inline Edit</p>
                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Allow editing in Table</p>
                          </div>
                          <button 
                            onClick={() => {
                              const newInlineEdit = !selectedField.inlineEdit;
                              updateField(selectedField.id, { inlineEdit: newInlineEdit });
                              setInterfaceSettings(prev => {
                                const cols = prev.master.columns || [];
                                return {
                                  ...prev,
                                  master: {
                                    ...prev.master,
                                    columns: cols.map(c => c.fieldId === selectedField.id ? { ...c, inlineEdit: newInlineEdit } : c)
                                  }
                                };
                              });
                            }}
                            className={cn(
                              "w-10 h-6 rounded-full relative transition-all",
                              selectedField.inlineEdit ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-800"
                            )}
                          >
                            <div className={cn(
                              "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                              selectedField.inlineEdit ? "right-1" : "left-1"
                            )} />
                          </button>
                        </div>

                        {/* Show In Table Toggle */}
                        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-widest">Show in Table</p>
                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Display as active column</p>
                          </div>
                          <button 
                            onClick={() => {
                              const newShow = selectedField.showInTable === false;
                              updateField(selectedField.id, { showInTable: newShow });
                              setInterfaceSettings(prev => {
                                const cols = prev.master.columns || [];
                                return {
                                  ...prev,
                                  master: {
                                    ...prev.master,
                                    columns: cols.map(c => c.fieldId === selectedField.id ? { ...c, visible: newShow } : c)
                                  }
                                };
                              });
                              if (!newShow) setSelectedId(null);
                            }}
                            className={cn(
                              "w-10 h-6 rounded-full relative transition-all",
                              selectedField.showInTable !== false ? "bg-indigo-600" : "bg-zinc-200 dark:bg-zinc-800"
                            )}
                          >
                            <div className={cn(
                              "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                              selectedField.showInTable !== false ? "right-1" : "left-1"
                            )} />
                          </button>
                        </div>

                        {/* Column Width Slider */}
                        <div className="space-y-3 pt-6 border-t border-zinc-100 dark:border-zinc-900">
                          <div className="flex items-center justify-between px-1">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Column Width</label>
                            <span className="text-[10px] font-mono text-indigo-500 font-black">{selectedField.columnWidth || 200}px</span>
                          </div>
                          <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 flex items-center">
                            <input 
                              type="range" 
                              min="80" 
                              max="500" 
                              step="10"
                              value={selectedField.columnWidth || 200}
                              onChange={(e) => {
                                const newWidth = parseInt(e.target.value, 10);
                                updateField(selectedField.id, { columnWidth: newWidth });
                                setInterfaceSettings(prev => {
                                  const cols = prev.master.columns || [];
                                  return {
                                    ...prev,
                                    master: {
                                      ...prev.master,
                                      columns: cols.map(c => c.fieldId === selectedField.id ? { ...c, width: newWidth } : c)
                                    }
                                  };
                                });
                              }}
                              className="w-full accent-indigo-500 cursor-pointer h-1.5"
                            />
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="pt-8 border-t border-zinc-100 dark:border-zinc-900">
                          <button 
                            onClick={() => {
                              updateField(selectedField.id, { showInTable: false });
                              setInterfaceSettings(prev => {
                                const cols = prev.master.columns || [];
                                return {
                                  ...prev,
                                  master: {
                                    ...prev.master,
                                    columns: cols.map(c => c.fieldId === selectedField.id ? { ...c, visible: false } : c)
                                  }
                                };
                              });
                              setSelectedId(null);
                              toast.success("Column removed from table");
                            }}
                            className="w-full py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                            Remove Column
                          </button>
                        </div>
                      </motion.div>
                    ) : selectedField ? (
                      <motion.div 
                        key={selectedField.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="p-4 space-y-4"
                      >
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

                      {!['heading', 'divider', 'spacer', 'alert', 'connector', 'group', 'fieldGroup', 'repeatableGroup', 'card', 'accordion', 'tabs_nested', 'stepper', 'timeline', 'html', 'button', 'sub_module'].includes(selectedField.type) && (
                        <>
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

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Placeholder</label>
                            <input 
                              type="text" 
                              value={selectedField.placeholder || ''}
                              onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })}
                              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                              placeholder="e.g. John Doe"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Tooltip / Popover</label>
                            <textarea 
                              value={selectedField.tooltip || ''}
                              onChange={(e) => updateField(selectedField.id, { tooltip: e.target.value })}
                              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all min-h-[80px]"
                              placeholder="e.g. This name must match your government issued ID"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Default Value</label>
                            <input 
                              type="text" 
                              value={selectedField.defaultValue || ''}
                              onChange={(e) => updateField(selectedField.id, { defaultValue: e.target.value })}
                              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                              placeholder="e.g. N/A"
                            />
                          </div>
                        </>
                      )}

                      {!['heading', 'divider', 'spacer', 'alert', 'connector', 'group', 'fieldGroup', 'repeatableGroup', 'card', 'accordion', 'tabs_nested', 'stepper', 'timeline', 'html', 'button', 'sub_module'].includes(selectedField.type) && (
                        <div className="pt-2">
                          <label className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                                selectedField.required ? "bg-indigo-500/10 text-indigo-500" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                              )}>
                                <CheckSquare size={14} />
                              </div>
                              <div>
                                <span className="block text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-widest">Required Field</span>
                                <span className="block text-[9px] text-zinc-500">{selectedField.required ? 'Mandatory for submission' : 'Optional field'}</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => updateField(selectedField.id, { required: !selectedField.required })}
                              className={cn(
                                "w-10 h-5 rounded-full relative transition-colors duration-300",
                                selectedField.required ? "bg-indigo-600" : "bg-zinc-300 dark:bg-zinc-700"
                              )}
                            >
                              <motion.div 
                                animate={{ x: selectedField.required ? 22 : 2 }}
                                className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-sm"
                              />
                            </button>
                          </label>
                        </div>
                      )}

                      {selectedField.type !== 'sub_module' && (
                        <div className="pt-2">
                          <label className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                                selectedField.hidden ? "bg-rose-500/10 text-rose-500" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                              )}>
                                <EyeOff size={14} />
                              </div>
                              <div>
                                <span className="block text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-widest">Hidden by Default</span>
                                <span className="block text-[9px] text-zinc-500">{selectedField.hidden ? 'Field is hidden from users' : 'Field is visible to users'}</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => updateField(selectedField.id, { hidden: !selectedField.hidden })}
                              className={cn(
                                "w-10 h-5 rounded-full relative transition-colors duration-300",
                                selectedField.hidden ? "bg-rose-600" : "bg-zinc-300 dark:bg-zinc-700"
                              )}
                            >
                              <motion.div 
                                animate={{ x: selectedField.hidden ? 22 : 2 }}
                                className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-sm"
                              />
                            </button>
                          </label>
                        </div>
                      )}

                      </div>

                      {/* Data Population Mapping */}
                      {(() => {
                        const mappingEntry = Object.entries(connectorMappings).find(([_, m]) => Object.values(m).includes(selectedField.id));
                        if (mappingEntry) {
                          const [connId, mappings] = mappingEntry;
                          const connector = connectorRegistry.find(c => c.id === connId);
                          const outputName = Object.entries(mappings).find(([_, targetId]) => targetId === selectedField.id)?.[0];
                          
                          return (
                            <div className="space-y-4 pt-6 border-t border-zinc-100 dark:border-zinc-900">
                              <div className="flex items-center gap-2 mb-4">
                                <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                                <h4 className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-widest">Data Population</h4>
                              </div>
                              
                              <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl space-y-4">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Source Connector</span>
                                  <div className="flex items-center gap-2 px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                    <Zap size={10} className="text-indigo-500" />
                                    <span className="text-[10px] font-bold text-zinc-900 dark:text-white">{connector?.label || 'Nexus Connector'}</span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Mapped Output</span>
                                  <div className="flex items-center gap-2 px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                    <BrainCircuit size={10} className="text-emerald-500" />
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">{outputName}</span>
                                  </div>
                                </div>

                                <div className="pt-2">
                                  <p className="text-[9px] text-zinc-500 leading-relaxed italic">
                                    This field's value is automatically populated by the {connector?.label || 'connector'} during data entry.
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

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

                      {/* Advanced Settings */}
                      <div className="space-y-6 pt-6 border-t border-zinc-100 dark:border-zinc-900">
                        <div className="flex items-center justify-between px-1">
                          <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">Advanced Settings</h4>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1">Field Key (Slug)</label>
                            <input 
                              type="text" 
                              value={selectedField.name || ''}
                              onChange={(e) => updateField(selectedField.id, { name: e.target.value })}
                              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
                              placeholder="e.g. total_cost"
                            />
                            <p className="text-[9px] text-zinc-500 font-medium px-1 leading-relaxed italic">
                              This key is used in formulas and API integrations. Changing it may require updates to existing logic.
                            </p>
                          </div>
                        </div>
                      </div>

                    <div className="h-px bg-zinc-200 dark:bg-zinc-900" />

                    {/* Specific Settings */}
                    <div className="space-y-6">
                      {selectedField.type === 'date' && (
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Date Format</label>
                            <select 
                              value={selectedField.dateFormat || 'PPP'}
                              onChange={(e) => updateField(selectedField.id, { dateFormat: e.target.value })}
                              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                            >
                              <option value="PPP">Friendly (May 9th, 2026)</option>
                              <option value="yyyy-MM-dd">ISO (2026-05-09)</option>
                              <option value="dd/MM/yyyy">European (09/05/2026)</option>
                              <option value="MM/dd/yyyy">US (05/09/2026)</option>
                            </select>
                          </div>

                          <label className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                                selectedField.excludeWeekends ? "bg-amber-500/10 text-amber-500" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                              )}>
                                <Calendar size={14} />
                              </div>
                              <div>
                                <span className="block text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-widest">Exclude Weekends</span>
                                <span className="block text-[9px] text-zinc-500">{selectedField.excludeWeekends ? 'Saturdays & Sundays disabled' : 'All days selectable'}</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => updateField(selectedField.id, { excludeWeekends: !selectedField.excludeWeekends })}
                              className={cn(
                                "w-10 h-5 rounded-full relative transition-colors duration-300",
                                selectedField.excludeWeekends ? "bg-indigo-600" : "bg-zinc-300 dark:bg-zinc-700"
                              )}
                            >
                              <motion.div 
                                animate={{ x: selectedField.excludeWeekends ? 22 : 2 }}
                                className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-sm"
                              />
                            </button>
                          </label>

                          <div className="h-px bg-zinc-200 dark:bg-zinc-900" />
                          
                          <div className="space-y-4">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Default Value Strategy</label>
                            <select 
                              value={selectedField.defaultType || 'static'}
                              onChange={(e) => updateField(selectedField.id, { defaultType: e.target.value as any })}
                              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                            >
                              <option value="static">Static Date</option>
                              <option value="today">Today</option>
                              <option value="start_of_week">Start of Week</option>
                              <option value="end_of_week">End of Week</option>
                              <option value="start_of_month">Start of Month</option>
                              <option value="end_of_month">End of Month</option>
                              <option value="start_of_year">Start of Year</option>
                              <option value="end_of_year">End of Year</option>
                              <option value="field_copy">Value from Another Field</option>
                            </select>

                            {selectedField.defaultType === 'field_copy' && (
                              <div className="space-y-2 animate-in slide-in-from-top-2">
                                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">Source Field</label>
                                <select 
                                  value={selectedField.defaultSourceFieldId || ''}
                                  onChange={(e) => updateField(selectedField.id, { defaultSourceFieldId: e.target.value })}
                                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs appearance-none"
                                >
                                  <option value="">Select Date Field...</option>
                                  {allFields
                                    .filter(f => (f.type === 'date' || f.type === 'calculation') && f.id !== selectedField.id)
                                    .map(f => (
                                      <option key={f.id} value={f.id}>{f.label || f.id}</option>
                                    ))}
                                </select>
                              </div>
                            )}

                            {selectedField.defaultType && selectedField.defaultType !== 'static' && (
                              <div className="space-y-2 animate-in slide-in-from-top-2">
                                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">Offset (±)</label>
                                <div className="grid grid-cols-2 gap-2">
                                  <input 
                                    type="number"
                                    placeholder="Amount"
                                    value={selectedField.defaultOffset ?? ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === '' || val === '-') {
                                        updateField(selectedField.id, { defaultOffset: undefined });
                                      } else {
                                        const parsed = parseInt(val);
                                        if (!isNaN(parsed)) {
                                          updateField(selectedField.id, { defaultOffset: parsed });
                                        }
                                      }
                                    }}
                                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs"
                                  />
                                  <select 
                                    value={selectedField.defaultOffsetUnit || 'days'}
                                    onChange={(e) => updateField(selectedField.id, { defaultOffsetUnit: e.target.value as any })}
                                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs appearance-none"
                                  >
                                    <option value="days">Days</option>
                                    <option value="business_days">Business Days</option>
                                    <option value="months">Months</option>
                                    <option value="years">Years</option>
                                  </select>
                                </div>
                                <p className="text-[9px] text-zinc-500 font-medium px-1 italic">Use negative numbers to subtract (e.g. -7).</p>
                              </div>
                            )}
                          </div>

                          <div className="h-px bg-zinc-200 dark:bg-zinc-900" />

                          <div className="space-y-4">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Validation Constraints</label>
                            
                            {/* Min Date */}
                            <div className="space-y-2">
                              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">Minimum Date</span>
                              <div className="grid grid-cols-2 gap-2">
                                <select 
                                  value={selectedField.minDateType || 'none'}
                                  onChange={(e) => updateField(selectedField.id, { minDateType: e.target.value as any })}
                                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs appearance-none"
                                >
                                  <option value="none">No Minimum</option>
                                  <option value="static">Static</option>
                                  <option value="today">Today</option>
                                  <option value="relative">Relative to Today</option>
                                  <option value="field_value">Field Value</option>
                                </select>
                                {selectedField.minDateType === 'static' && (
                                  <input 
                                    type="date"
                                    value={selectedField.minDateValue || ''}
                                    onChange={(e) => updateField(selectedField.id, { minDateValue: e.target.value })}
                                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs"
                                  />
                                )}
                                {selectedField.minDateType === 'relative' && (
                                  <div className="flex gap-2 animate-in slide-in-from-top-2">
                                    <input 
                                      type="number"
                                      value={selectedField.minDateOffset ?? ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '' || val === '-') {
                                          updateField(selectedField.id, { minDateOffset: undefined });
                                        } else {
                                          const parsed = parseInt(val);
                                          if (!isNaN(parsed)) {
                                            updateField(selectedField.id, { minDateOffset: parsed });
                                          }
                                        }
                                      }}
                                      className="w-16 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 py-1 text-xs"
                                    />
                                    <select 
                                      value={selectedField.minDateOffsetUnit || 'days'}
                                      onChange={(e) => updateField(selectedField.id, { minDateOffsetUnit: e.target.value as any })}
                                      className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 py-1 text-xs appearance-none"
                                    >
                                      <option value="days">Days</option>
                                      <option value="business_days">Biz Days</option>
                                      <option value="months">Months</option>
                                    </select>
                                  </div>
                                )}
                                {selectedField.minDateType === 'field_value' && (
                                  <select 
                                    value={selectedField.minDateFieldId || ''}
                                    onChange={(e) => updateField(selectedField.id, { minDateFieldId: e.target.value })}
                                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs appearance-none"
                                  >
                                    <option value="">Select Field...</option>
                                    {allFields.filter(f => (f.type === 'date' || f.type === 'calculation') && f.id !== selectedField.id).map(f => (
                                      <option key={f.id} value={f.id}>{f.label || f.id}</option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            </div>

                            {/* Max Date */}
                            <div className="space-y-2">
                              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">Maximum Date</span>
                              <div className="grid grid-cols-2 gap-2">
                                <select 
                                  value={selectedField.maxDateType || 'none'}
                                  onChange={(e) => updateField(selectedField.id, { maxDateType: e.target.value as any })}
                                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs appearance-none"
                                >
                                  <option value="none">No Maximum</option>
                                  <option value="static">Static</option>
                                  <option value="today">Today</option>
                                  <option value="relative">Relative to Today</option>
                                  <option value="field_value">Field Value</option>
                                </select>
                                {selectedField.maxDateType === 'static' && (
                                  <input 
                                    type="date"
                                    value={selectedField.maxDateValue || ''}
                                    onChange={(e) => updateField(selectedField.id, { maxDateValue: e.target.value })}
                                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs"
                                  />
                                )}
                                {selectedField.maxDateType === 'relative' && (
                                  <div className="flex gap-2 animate-in slide-in-from-top-2">
                                    <input 
                                      type="number"
                                      value={selectedField.maxDateOffset ?? ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '' || val === '-') {
                                          updateField(selectedField.id, { maxDateOffset: undefined });
                                        } else {
                                          const parsed = parseInt(val);
                                          if (!isNaN(parsed)) {
                                            updateField(selectedField.id, { maxDateOffset: parsed });
                                          }
                                        }
                                      }}
                                      className="w-16 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 py-1 text-xs"
                                    />
                                    <select 
                                      value={selectedField.maxDateOffsetUnit || 'days'}
                                      onChange={(e) => updateField(selectedField.id, { maxDateOffsetUnit: e.target.value as any })}
                                      className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 py-1 text-xs appearance-none"
                                    >
                                      <option value="days">Days</option>
                                      <option value="business_days">Biz Days</option>
                                      <option value="months">Months</option>
                                    </select>
                                  </div>
                                )}
                                {selectedField.maxDateType === 'field_value' && (
                                  <select 
                                    value={selectedField.maxDateFieldId || ''}
                                    onChange={(e) => updateField(selectedField.id, { maxDateFieldId: e.target.value })}
                                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs appearance-none"
                                  >
                                    <option value="">Select Field...</option>
                                    {allFields.filter(f => (f.type === 'date' || f.type === 'calculation') && f.id !== selectedField.id).map(f => (
                                      <option key={f.id} value={f.id}>{f.label || f.id}</option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedField.type === 'time' && (
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Time Display</label>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { id: '12h', label: '12 Hour (AM/PM)' },
                                { id: '24h', label: '24 Hour' }
                              ].map((fmt) => (
                                <button 
                                  key={fmt.id}
                                  onClick={() => updateField(selectedField.id, { timeFormat: fmt.id as any })}
                                  className={cn(
                                    "py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 transition-all",
                                    (selectedField.timeFormat || '12h') === fmt.id
                                      ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                                      : "bg-transparent border-zinc-100 dark:border-zinc-800 text-zinc-400 hover:border-zinc-200"
                                  )}
                                >
                                  {fmt.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Minute Increment</label>
                            <select 
                              value={selectedField.minuteStep || 15}
                              onChange={(e) => updateField(selectedField.id, { minuteStep: parseInt(e.target.value) })}
                              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                            >
                              <option value="1">1 Minute</option>
                              <option value="5">5 Minutes</option>
                              <option value="10">10 Minutes</option>
                              <option value="15">15 Minutes</option>
                              <option value="30">30 Minutes</option>
                              <option value="60">1 Hour</option>
                            </select>
                            <p className="text-[9px] text-zinc-500 font-medium px-1 italic">Controls the step for arrow keys and quick select presets.</p>
                          </div>

                          <div className="h-px bg-zinc-200 dark:bg-zinc-900" />
                          
                          <div className="space-y-4">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Default Time Strategy</label>
                            <select 
                              value={selectedField.defaultType || 'static'}
                              onChange={(e) => updateField(selectedField.id, { defaultType: e.target.value as any })}
                              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                            >
                              <option value="static">Static Time</option>
                              <option value="now">Current Time (Now)</option>
                              <option value="rounded_now">Rounded Current Time</option>
                              <option value="relative">Relative Offset from Now</option>
                              <option value="field_copy">Value from Another Field</option>
                            </select>

                            {selectedField.defaultType === 'field_copy' && (
                              <div className="space-y-2 animate-in slide-in-from-top-2">
                                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">Source Field</label>
                                <select 
                                  value={selectedField.defaultSourceFieldId || ''}
                                  onChange={(e) => updateField(selectedField.id, { defaultSourceFieldId: e.target.value })}
                                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs appearance-none"
                                >
                                  <option value="">Select Time Field...</option>
                                  {allFields
                                    .filter(f => (f.type === 'time' || f.type === 'calculation') && f.id !== selectedField.id)
                                    .map(f => (
                                      <option key={f.id} value={f.id}>{f.label || f.id}</option>
                                    ))}
                                </select>
                              </div>
                            )}

                            {selectedField.defaultType && selectedField.defaultType !== 'static' && (
                              <div className="space-y-2 animate-in slide-in-from-top-2">
                                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">Offset (±)</label>
                                <div className="grid grid-cols-2 gap-2">
                                  <input 
                                    type="number"
                                    placeholder="Amount"
                                    value={selectedField.defaultOffset ?? ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === '' || val === '-') {
                                        updateField(selectedField.id, { defaultOffset: undefined });
                                      } else {
                                        const parsed = parseInt(val);
                                        if (!isNaN(parsed)) {
                                          updateField(selectedField.id, { defaultOffset: parsed });
                                        }
                                      }
                                    }}
                                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs"
                                  />
                                  <select 
                                    value={selectedField.defaultOffsetUnit || 'minutes'}
                                    onChange={(e) => updateField(selectedField.id, { defaultOffsetUnit: e.target.value as any })}
                                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs appearance-none"
                                  >
                                    <option value="minutes">Minutes</option>
                                    <option value="hours">Hours</option>
                                  </select>
                                </div>
                              </div>
                            )}

                            <div className="h-px bg-zinc-200 dark:bg-zinc-900 my-2" />

                            {/* Min Time */}
                            <div className="space-y-2">
                              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">Minimum Time</span>
                              <div className="grid grid-cols-2 gap-2">
                                <select 
                                  value={selectedField.minDateType || 'none'}
                                  onChange={(e) => updateField(selectedField.id, { minDateType: e.target.value as any })}
                                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs appearance-none"
                                >
                                  <option value="none">No Minimum</option>
                                  <option value="static">Static</option>
                                  <option value="now">Now</option>
                                  <option value="relative">Relative to Now</option>
                                  <option value="field_value">Field Value</option>
                                </select>
                                {selectedField.minDateType === 'static' && (
                                  <input 
                                    type="time"
                                    value={selectedField.minDateValue || ''}
                                    onChange={(e) => updateField(selectedField.id, { minDateValue: e.target.value })}
                                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs"
                                  />
                                )}
                                {selectedField.minDateType === 'relative' && (
                                  <div className="flex gap-2 animate-in slide-in-from-top-2">
                                    <input 
                                      type="number"
                                      value={selectedField.minDateOffset ?? ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '' || val === '-') {
                                          updateField(selectedField.id, { minDateOffset: undefined });
                                        } else {
                                          const parsed = parseInt(val);
                                          if (!isNaN(parsed)) {
                                            updateField(selectedField.id, { minDateOffset: parsed });
                                          }
                                        }
                                      }}
                                      className="w-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 py-2 text-xs"
                                    />
                                    <select 
                                      value={selectedField.minDateOffsetUnit || 'minutes'}
                                      onChange={(e) => updateField(selectedField.id, { minDateOffsetUnit: e.target.value as any })}
                                      className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 py-2 text-xs appearance-none"
                                    >
                                      <option value="minutes">Mins</option>
                                      <option value="hours">Hours</option>
                                    </select>
                                  </div>
                                )}
                                {selectedField.minDateType === 'field_value' && (
                                  <select 
                                    value={selectedField.minDateFieldId || ''}
                                    onChange={(e) => updateField(selectedField.id, { minDateFieldId: e.target.value })}
                                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs appearance-none"
                                  >
                                    <option value="">Select Field...</option>
                                    {allFields
                                      .filter(f => (f.type === 'time' || f.type === 'calculation') && f.id !== selectedField.id)
                                      .map(f => (
                                        <option key={f.id} value={f.id}>{f.label || f.id}</option>
                                      ))}
                                  </select>
                                )}
                              </div>
                            </div>

                            {/* Max Time */}
                            <div className="space-y-2">
                              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">Maximum Time</span>
                              <div className="grid grid-cols-2 gap-2">
                                <select 
                                  value={selectedField.maxDateType || 'none'}
                                  onChange={(e) => updateField(selectedField.id, { maxDateType: e.target.value as any })}
                                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs appearance-none"
                                >
                                  <option value="none">No Maximum</option>
                                  <option value="static">Static</option>
                                  <option value="now">Now</option>
                                  <option value="relative">Relative to Now</option>
                                  <option value="field_value">Field Value</option>
                                </select>
                                {selectedField.maxDateType === 'static' && (
                                  <input 
                                    type="time"
                                    value={selectedField.maxDateValue || ''}
                                    onChange={(e) => updateField(selectedField.id, { maxDateValue: e.target.value })}
                                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs"
                                  />
                                )}
                                {selectedField.maxDateType === 'relative' && (
                                  <div className="flex gap-2 animate-in slide-in-from-top-2">
                                    <input 
                                      type="number"
                                      value={selectedField.maxDateOffset ?? ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '' || val === '-') {
                                          updateField(selectedField.id, { maxDateOffset: undefined });
                                        } else {
                                          const parsed = parseInt(val);
                                          if (!isNaN(parsed)) {
                                            updateField(selectedField.id, { maxDateOffset: parsed });
                                          }
                                        }
                                      }}
                                      className="w-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 py-2 text-xs"
                                    />
                                    <select 
                                      value={selectedField.maxDateOffsetUnit || 'minutes'}
                                      onChange={(e) => updateField(selectedField.id, { maxDateOffsetUnit: e.target.value as any })}
                                      className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 py-2 text-xs appearance-none"
                                    >
                                      <option value="minutes">Mins</option>
                                      <option value="hours">Hours</option>
                                    </select>
                                  </div>
                                )}
                                {selectedField.maxDateType === 'field_value' && (
                                  <select 
                                    value={selectedField.maxDateFieldId || ''}
                                    onChange={(e) => updateField(selectedField.id, { maxDateFieldId: e.target.value })}
                                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs appearance-none"
                                  >
                                    <option value="">Select Field...</option>
                                    {allFields
                                      .filter(f => (f.type === 'time' || f.type === 'calculation') && f.id !== selectedField.id)
                                      .map(f => (
                                        <option key={f.id} value={f.id}>{f.label || f.id}</option>
                                      ))}
                                  </select>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
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

                      {selectedField.type === 'autonumber' && (
                        <div className="space-y-6 mb-6 pb-6 border-b border-zinc-100 dark:border-zinc-900">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Prefix</label>
                              <input 
                                type="text" 
                                value={selectedField.autonumberPrefix || ''}
                                onChange={(e) => updateField(selectedField.id, { autonumberPrefix: e.target.value })}
                                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                                placeholder="e.g. INV-"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Suffix</label>
                              <input 
                                type="text" 
                                value={selectedField.autonumberSuffix || ''}
                                onChange={(e) => updateField(selectedField.id, { autonumberSuffix: e.target.value })}
                                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                                placeholder="e.g. -US"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Start From</label>
                              <input 
                                type="number" 
                                value={selectedField.autonumberStart || 1}
                                onChange={(e) => updateField(selectedField.id, { autonumberStart: parseInt(e.target.value) })}
                                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Zero Padding</label>
                              <input 
                                type="number" 
                                value={selectedField.autonumberDigits || 0}
                                onChange={(e) => updateField(selectedField.id, { autonumberDigits: parseInt(e.target.value) })}
                                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                                placeholder="e.g. 5"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {(['select', 'radio', 'checkboxGroup', 'buttonGroup', 'duallist', 'stepper', 'timeline', 'tag', 'datatable'].includes(selectedField.type)) && (
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Data Source</label>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { id: 'manual', label: 'Manual' },
                                { id: 'module_records', label: 'Modules' },
                                { id: 'global_list', label: 'Lists' },
                                { id: 'platform', label: 'Platform' },
                                { id: 'connector', label: 'Connector' }
                              ].filter(src => {
                                if (selectedField.type === 'datatable' && src.id === 'manual') return false;
                                return true;
                              }).map((src) => (
                                <button 
                                  key={src.id}
                                  onClick={() => {
                                    if (src.id === 'manual') {
                                      updateField(selectedField.id, { optionsSource: 'manual', lookupSource: undefined });
                                    } else {
                                      updateField(selectedField.id, { 
                                        lookupSource: src.id as any, 
                                        optionsSource: src.id as any, // Sync for legacy
                                        platformEntity: src.id === 'platform' ? 'users' : undefined 
                                      });
                                    }
                                  }}
                                  className={cn(
                                    "py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 transition-all",
                                    ((selectedField.optionsSource === src.id || (!selectedField.optionsSource && src.id === 'manual')) && src.id === 'manual') ||
                                    (selectedField.lookupSource === src.id || 
                                     (selectedField.lookupSource === 'tenant_users' && src.id === 'platform'))
                                      ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                                      : "bg-transparent border-zinc-100 dark:border-zinc-800 text-zinc-400 hover:border-zinc-200"
                                  )}
                                >
                                  {src.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {(selectedField.lookupSource === 'module_records') && (
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Target Module</label>
                              <select 
                                value={selectedField.targetModuleId || ''}
                                onChange={(e) => updateField(selectedField.id, { targetModuleId: e.target.value })}
                                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                              >
                                <option value="">Select Module...</option>
                                {modules.map(m => (
                                  <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {selectedField.lookupSource === 'global_list' && (
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Target Global List</label>
                              <select 
                                value={selectedField.globalListId || ''}
                                onChange={(e) => updateField(selectedField.id, { globalListId: e.target.value })}
                                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                              >
                                <option value="">Select Global List...</option>
                                {globalLists.map((list: any) => (
                                  <option key={list.id} value={list.id}>{list.name}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {selectedField.lookupSource === 'connector' && (
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Source Connector</label>
                              <select 
                                value={selectedField.connectorId || ''}
                                onChange={(e) => updateField(selectedField.id, { connectorId: e.target.value })}
                                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                              >
                                <option value="">Select Connector...</option>
                                {activeConnectors.map((c: any) => (
                                  <option key={c.connectorId} value={c.connectorId}>{c.displayName || c.name || c.label}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {(selectedField.lookupSource === 'platform' || selectedField.lookupSource === 'tenant_users') && (
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Platform Entity</label>
                                <select 
                                  value={selectedField.platformEntity || 'users'}
                                  onChange={(e) => updateField(selectedField.id, { platformEntity: e.target.value as any })}
                                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                                >
                                  <option value="users">Users</option>
                                  <option value="teams">Teams</option>
                                  <option value="roles">Roles</option>
                                  <option value="security_groups">Security Groups</option>
                                  <option value="modules">Platform Module Records</option>
                                  <option value="records">System Records</option>
                                </select>
                              </div>

                              {selectedField.platformEntity === 'modules' && (
                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Target Platform Module</label>
                                  <select 
                                    value={selectedField.targetPlatformModuleId || ''}
                                    onChange={(e) => updateField(selectedField.id, { targetPlatformModuleId: e.target.value })}
                                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                                  >
                                    <option value="">Select Platform Module...</option>
                                    {PLATFORM_MODULES.map(m => (
                                      <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Universal Filter Section */}
                          {selectedField.lookupSource && (
                            <FilterBuilder 
                              field={selectedField}
                              updateField={updateField}
                              modules={modules}
                              globalLists={globalLists}
                              teams={teams}
                              positions={positions}
                              permissionGroups={permissionGroups}
                            />
                          )}

                          {(!selectedField.lookupSource || selectedField.optionsSource === 'manual') && selectedField.type !== 'datatable' && (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between px-1">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Option List</label>
                                {(selectedField.type === 'radio' || selectedField.type === 'checkboxGroup') && (
                                  <div className="flex gap-1 p-0.5 bg-zinc-100 dark:bg-zinc-900 rounded-lg">
                                    <button 
                                      onClick={() => updateField(selectedField.id, { optionLayout: 'vertical' })}
                                      className={cn(
                                        "px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all",
                                        (selectedField.optionLayout || 'vertical') === 'vertical' 
                                          ? "bg-white dark:bg-zinc-800 text-indigo-500 shadow-sm" 
                                          : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                      )}
                                    >
                                      Vert
                                    </button>
                                    <button 
                                      onClick={() => updateField(selectedField.id, { optionLayout: 'horizontal' })}
                                      className={cn(
                                        "px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all",
                                        selectedField.optionLayout === 'horizontal' 
                                          ? "bg-white dark:bg-zinc-800 text-indigo-500 shadow-sm" 
                                          : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                      )}
                                    >
                                      Horiz
                                    </button>
                                  </div>
                                )}
                              </div>
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
                        </div>
                      )}

                      {(selectedField.type === 'slider' || selectedField.type === 'rating' || selectedField.type === 'progress') && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Min Value</label>
                            <input 
                              type="number" 
                              value={selectedField.min || 0}
                              onChange={(e) => updateField(selectedField.id, { min: parseInt(e.target.value) })}
                              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Max Value</label>
                            <input 
                              type="number" 
                              value={selectedField.max || 100}
                              onChange={(e) => updateField(selectedField.id, { max: parseInt(e.target.value) })}
                              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                            />
                          </div>
                        </div>
                      )}

                      {selectedField.type === 'button' && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Button Variant</label>
                            <select 
                              value={selectedField.variant || 'primary'}
                              onChange={(e) => updateField(selectedField.id, { variant: e.target.value })}
                              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                            >
                              <option value="primary">Primary</option>
                              <option value="secondary">Secondary</option>
                              <option value="outline">Outline</option>
                              <option value="ghost">Ghost</option>
                              <option value="danger">Danger</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Action Trigger</label>
                            <input 
                              type="text" 
                              value={selectedField.action || ''}
                              onChange={(e) => updateField(selectedField.id, { action: e.target.value })}
                              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                              placeholder="e.g. submit_form, open_link"
                            />
                          </div>
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
                            <option value="info">Information</option>
                            <option value="success">Success</option>
                            <option value="warning">Warning</option>
                            <option value="error">Error</option>
                          </select>
                        </div>
                      )}

                      {selectedField.type === 'icon' && (
                        <IconPicker 
                          label="Select Icon"
                          value={selectedField.iconName || 'Smile'}
                          onChange={(iconName) => updateField(selectedField.id, { iconName })}
                        />
                      )}

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

                      {(selectedField.type === 'fieldGroup' || selectedField.type === 'repeatableGroup' || selectedField.type === 'group' || selectedField.type === 'card' || selectedField.type === 'accordion' || selectedField.type === 'tabs_nested') && (
                        <div className="space-y-6">
                          <div className="space-y-4">
                            <label className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                                  selectedField.showIcon !== false ? "bg-indigo-500/10 text-indigo-500" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                                )}>
                                  <Smile size={14} />
                                </div>
                                <div>
                                  <span className="block text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-widest">Display Icon</span>
                                  <span className="block text-[9px] text-zinc-500">{selectedField.showIcon !== false ? 'Show icon in group title' : 'Hide icon from title'}</span>
                                </div>
                              </div>
                              <button 
                                onClick={() => updateField(selectedField.id, { showIcon: selectedField.showIcon === false })}
                                className={cn(
                                  "w-10 h-5 rounded-full relative transition-colors duration-300",
                                  selectedField.showIcon !== false ? "bg-indigo-600" : "bg-zinc-300 dark:bg-zinc-700"
                                )}
                              >
                                <motion.div 
                                  animate={{ x: selectedField.showIcon !== false ? 22 : 2 }}
                                  className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-sm"
                                />
                              </button>
                            </label>

                            {selectedField.showIcon !== false && (
                              <IconPicker 
                                label="Group Icon"
                                value={selectedField.iconName || 'Folder'}
                                onChange={(iconName) => updateField(selectedField.id, { iconName })}
                              />
                            )}

                            <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-2" />

                            {!['accordion', 'tabs_nested'].includes(selectedField.type) && !isAccordionSection && (
                              <>
                                <label className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all">
                                  <div className="flex items-center gap-3">
                                    <div className={cn(
                                      "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                                      selectedField.collapsible ? "bg-indigo-500/10 text-indigo-500" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                                    )}>
                                      <ChevronDown size={14} className={cn("transition-transform", selectedField.collapsible ? "" : "-rotate-90")} />
                                    </div>
                                    <div>
                                      <span className="block text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-widest">Collapsible Panel</span>
                                      <span className="block text-[9px] text-zinc-500">{selectedField.collapsible ? 'User can collapse this group' : 'Group is always expanded'}</span>
                                    </div>
                                  </div>
                                  <button 
                                    onClick={() => updateField(selectedField.id, { collapsible: !selectedField.collapsible })}
                                    className={cn(
                                      "w-10 h-5 rounded-full relative transition-colors duration-300",
                                      selectedField.collapsible ? "bg-indigo-600" : "bg-zinc-300 dark:bg-zinc-700"
                                    )}
                                  >
                                    <motion.div 
                                      animate={{ x: selectedField.collapsible ? 22 : 2 }}
                                      className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-sm"
                                    />
                                  </button>
                                </label>

                                {selectedField.collapsible && (
                                  <label className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all">
                                    <div className="flex items-center gap-3">
                                      <div className={cn(
                                        "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                                        selectedField.defaultCollapsed ? "bg-amber-500/10 text-amber-500" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                                      )}>
                                        <EyeOff size={14} />
                                      </div>
                                      <div>
                                        <span className="block text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-widest">Default Collapsed</span>
                                        <span className="block text-[9px] text-zinc-500">{selectedField.defaultCollapsed ? 'Starts hidden' : 'Starts visible'}</span>
                                      </div>
                                    </div>
                                    <button 
                                      onClick={() => updateField(selectedField.id, { defaultCollapsed: !selectedField.defaultCollapsed })}
                                      className={cn(
                                        "w-10 h-5 rounded-full relative transition-colors duration-300",
                                        selectedField.defaultCollapsed ? "bg-amber-500" : "bg-zinc-300 dark:bg-zinc-700"
                                      )}
                                    >
                                      <motion.div 
                                        animate={{ x: selectedField.defaultCollapsed ? 22 : 2 }}
                                        className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-sm"
                                      />
                                    </button>
                                  </label>
                                )}
                              </>
                            )}
                          </div>

                          <div className="h-px bg-zinc-200 dark:bg-zinc-800" />

                          {selectedField.type === 'accordion' ? (
                            <div className="space-y-6">
                              <div className="flex items-center justify-between px-1">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Accordion Sections</label>
                                <button 
                                  onClick={() => {
                                    const newSection: Field = {
                                      id: `section-${Date.now()}`,
                                      type: 'group' as FieldType,
                                      label: `New Section ${ (selectedField.fields?.length || 0) + 1 }`,
                                      name: `section_${Date.now()}`,
                                      fields: []
                                    };
                                    updateField(selectedField.id, { fields: [...(selectedField.fields || []), newSection] });
                                  }}
                                  className="text-[10px] font-bold text-indigo-500 hover:text-indigo-400 transition-colors uppercase tracking-widest"
                                >
                                  Add Section
                                </button>
                              </div>
                              
                              <div className="space-y-3">
                                {(selectedField.fields || []).map((section, idx) => (
                                  <div key={section.id} className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[1.5rem] space-y-4 group/section">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                          <DynamicIcon name={section.iconName || 'Folder'} size={12} />
                                        </div>
                                        <div>
                                          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Section {idx + 1}</p>
                                          <p className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-tight">{section.label}</p>
                                        </div>
                                      </div>
                                      <button 
                                        onClick={() => {
                                          const newFields = (selectedField.fields || []).filter(f => f.id !== section.id);
                                          updateField(selectedField.id, { fields: newFields });
                                        }}
                                        className="p-1.5 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>

                                    <div className="space-y-3">
                                      <div className="space-y-1.5">
                                        <label className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest px-1">Subtitle / Label</label>
                                        <input 
                                          type="text" 
                                          value={section.label}
                                          onChange={(e) => {
                                            const newFields = [...(selectedField.fields || [])];
                                            newFields[idx] = { ...section, label: e.target.value };
                                            updateField(selectedField.id, { fields: newFields });
                                          }}
                                          className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                                        />
                                      </div>
                                      
                                      <div className="flex items-center justify-between pt-1">
                                        <span className="text-[9px] text-zinc-500 font-medium">{section.fields?.length || 0} Fields Nested</span>
                                        <button 
                                          onClick={() => setSelectedId(section.id)}
                                          className="text-[9px] font-bold text-indigo-500 hover:text-indigo-400 uppercase tracking-widest flex items-center gap-1"
                                        >
                                          Configure Fields
                                          <ArrowRight size={10} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}

                                {(!selectedField.fields || selectedField.fields.length === 0) && (
                                  <div className="py-8 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[1.5rem]">
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">No Sections Added</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between px-1">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                  {selectedField.type === 'repeatableGroup' ? 'Collection Properties' : 'Nested Elements'}
                                </label>
                              </div>
                              <div className="space-y-2">
                                {(selectedField.fields || []).map((nestedField, idx) => (
                                  <div key={nestedField.id} className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-medium text-zinc-900 dark:text-white">{nestedField.label}</span>
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
                                        {FIELD_CATEGORIES.flatMap(c => c.fields).filter(f => !['fieldGroup', 'repeatableGroup', 'group', 'card', 'accordion', 'tabs_nested'].includes(f.id)).map(f => (
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
                                      label: 'New Element',
                                      name: `nested_${Date.now()}`,
                                      required: false
                                    }];
                                    updateField(selectedField.id, { fields: newFields });
                                  }}
                                  className="w-full py-2 border border-dashed border-zinc-800 rounded-xl text-[10px] font-bold text-zinc-500 hover:text-indigo-400 hover:border-indigo-500/50 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                                >
                                  <Plus size={14} />
                                  Add Nested Element
                                </button>

                                {selectedField.type === 'repeatableGroup' && (
                                  <div className="space-y-4 pt-4 border-t border-zinc-150 dark:border-zinc-800 mt-4">
                                    {/* Layout Preset */}
                                    <div className="space-y-3">
                                      <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest block">Layout Preset</label>
                                      <div className="grid grid-cols-2 gap-2">
                                        {[
                                          { value: 'table', label: 'Table', icon: Table },
                                          { value: 'list', label: 'Grid Cards', icon: Grid3X3 }
                                        ].map(opt => (
                                          <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => updateField(selectedField.id, { variant: opt.value })}
                                            className={cn(
                                              "px-1 py-2.5 rounded-xl border text-[8px] font-bold uppercase tracking-widest transition-all flex flex-col items-center gap-1.5 text-center min-w-0 truncate",
                                              (selectedField.variant || 'table') === opt.value
                                                ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                                : "bg-zinc-50 dark:bg-zinc-950 border-zinc-100 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                                            )}
                                          >
                                            <opt.icon size={14} />
                                            <span className="truncate w-full">{opt.label}</span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Detail View Layout */}
                                    <div className="space-y-3 pt-3 border-t border-zinc-150 dark:border-zinc-800">
                                      <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest block">Detail View Layout</label>
                                      <div className="grid grid-cols-3 gap-2">
                                        {[
                                          { value: 'tabs', label: 'Top Tabs', icon: Layout },
                                          { value: 'split', icon: Columns, label: 'Split View' },
                                          { value: 'sidebar', icon: Sidebar, label: 'Single Page' },
                                          { value: 'process', icon: ListOrdered, label: 'Wizard' },
                                          { value: 'accordion', icon: Layers, label: 'Accordion' }
                                        ].map(opt => (
                                          <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => updateField(selectedField.id, { detailLayoutType: opt.value as any })}
                                            className={cn(
                                              "px-1 py-2.5 rounded-xl border text-[8px] font-bold uppercase tracking-widest transition-all flex flex-col items-center gap-1.5 text-center min-w-0 truncate",
                                              (selectedField.detailLayoutType || 'sidebar') === opt.value
                                                ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                                : "bg-zinc-50 dark:bg-zinc-950 border-zinc-100 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                                            )}
                                          >
                                            <opt.icon size={14} />
                                            <span className="truncate w-full">{opt.label}</span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {selectedField.type === 'calculation' && (
                        <div className="space-y-4">
                          <div className="space-y-4 border-b border-zinc-100 dark:border-zinc-900 pb-4 mb-4">
                            <div className="flex items-center justify-between px-1">
                              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Show as Currency</label>
                              <button
                                onClick={() => updateField(selectedField.id, { showAsCurrency: !selectedField.showAsCurrency })}
                                className={cn(
                                  "w-11 h-6 rounded-full transition-all relative flex items-center px-1",
                                  selectedField.showAsCurrency ? "bg-indigo-600" : "bg-zinc-200 dark:bg-zinc-800"
                                )}
                              >
                                <div className={cn(
                                  "w-4 h-4 rounded-full bg-white shadow-sm transition-all",
                                  selectedField.showAsCurrency ? "translate-x-5" : "translate-x-0"
                                )} />
                              </button>
                            </div>

                            {selectedField.showAsCurrency && (
                              <div className="space-y-2 animate-in slide-in-from-top-2">
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
                          </div>

                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Calculation Logic</label>
                          <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-500">
                                <Calculator size={14} />
                              </div>
                              <div className="flex-1">
                                <p className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-tight">Active Formula</p>
                                <p className="text-[9px] text-zinc-500 font-mono whitespace-pre-wrap break-all">{selectedField.calculationLogic || 'No logic defined'}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => setEditingCalculation({
                                targetId: selectedField.id,
                                logic: selectedField.calculationLogic,
                                triggers: selectedField.calculationTriggers,
                                showAsCurrency: selectedField.showAsCurrency,
                                currencySymbol: selectedField.currencySymbol
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
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Lookup Source</label>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { id: 'module_records', label: 'Modules' },
                                { id: 'global_list', label: 'Lists' },
                                { id: 'platform', label: 'Platform' },
                                { id: 'connector', label: 'Connector' }
                              ].map((src) => (
                                <button 
                                  key={src.id}
                                  onClick={() => updateField(selectedField.id, { lookupSource: src.id as any, platformEntity: src.id === 'platform' ? 'users' : undefined })}
                                  className={cn(
                                    "py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 transition-all",
                                    (selectedField.lookupSource === src.id || 
                                     (selectedField.lookupSource === 'tenant_users' && src.id === 'platform') || 
                                     (!selectedField.lookupSource && src.id === 'module_records'))
                                      ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                                      : "bg-transparent border-zinc-100 dark:border-zinc-800 text-zinc-400 hover:border-zinc-200"
                                  )}
                                >
                                  {src.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {(selectedField.lookupSource === 'module_records' || !selectedField.lookupSource) && (
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Target Module</label>
                              <select 
                                value={selectedField.targetModuleId || ''}
                                onChange={(e) => updateField(selectedField.id, { targetModuleId: e.target.value })}
                                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                              >
                                <option value="">Select Module...</option>
                                {modules.map(m => (
                                  <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {selectedField.lookupSource === 'global_list' && (
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Target Global List</label>
                              <select 
                                value={selectedField.globalListId || ''}
                                onChange={(e) => updateField(selectedField.id, { globalListId: e.target.value })}
                                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                              >
                                <option value="">Select Global List...</option>
                                {globalLists.map((list: any) => (
                                  <option key={list.id} value={list.id}>{list.name}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {selectedField.lookupSource === 'connector' && (
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Source Connector</label>
                              <select 
                                value={selectedField.connectorId || ''}
                                onChange={(e) => updateField(selectedField.id, { connectorId: e.target.value })}
                                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                              >
                                <option value="">Select Connector...</option>
                                {activeConnectors.map((c: any) => (
                                  <option key={c.connectorId} value={c.connectorId}>{c.displayName || c.name || c.label}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {(selectedField.lookupSource === 'platform' || selectedField.lookupSource === 'tenant_users') && (
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Platform Entity</label>
                                <select 
                                  value={selectedField.platformEntity || 'users'}
                                  onChange={(e) => updateField(selectedField.id, { platformEntity: e.target.value as any })}
                                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                                >
                                  <option value="users">Users</option>
                                  <option value="teams">Teams</option>
                                  <option value="roles">Roles</option>
                                  <option value="security_groups">Security Groups</option>
                                  <option value="modules">Platform Module Records</option>
                                  <option value="records">System Records</option>
                                </select>
                              </div>

                              {selectedField.platformEntity === 'modules' && (
                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Target Platform Module</label>
                                  <select 
                                    value={selectedField.targetPlatformModuleId || ''}
                                    onChange={(e) => updateField(selectedField.id, { targetPlatformModuleId: e.target.value })}
                                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                                  >
                                    <option value="">Select Platform Module...</option>
                                    {PLATFORM_MODULES.map(m => (
                                      <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Universal Filter Section */}
                          {selectedField.lookupSource && (
                            <FilterBuilder 
                              field={selectedField}
                              updateField={updateField}
                              modules={modules}
                              globalLists={globalLists}
                              teams={teams}
                              positions={positions}
                              permissionGroups={permissionGroups}
                            />
                          )}

                          {/* Lookup Enhancements: Display */}
                          {selectedField.lookupSource && (selectedField.targetModuleId || selectedField.targetPlatformModuleId) && (
                            <div className="space-y-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                              <div className="flex items-center gap-2 px-1">
                                <div className="p-1 bg-indigo-500/10 text-indigo-500 rounded-md">
                                  <Eye size={12} />
                                </div>
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Display Field</label>
                              </div>
                              <select 
                                value={selectedField.lookupDisplayField || ''}
                                onChange={(e) => updateField(selectedField.id, { lookupDisplayField: e.target.value })}
                                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                              >
                                <option value="">Default (Name/Subject)</option>
                                {(() => {
                                  let targetFields: any[] = [];
                                  if (selectedField.lookupSource === 'module_records' && selectedField.targetModuleId) {
                                    const targetMod = modules.find((m: any) => m.id === selectedField.targetModuleId);
                                    if (targetMod) targetFields = (targetMod.layout || []).filter((f: any) => f.label && f.id);
                                  } else if (selectedField.lookupSource === 'platform' && selectedField.platformEntity === 'modules' && selectedField.targetPlatformModuleId) {
                                    const platformMod = PLATFORM_MODULES.find(m => m.id === selectedField.targetPlatformModuleId);
                                    if (platformMod) targetFields = platformMod.availableFields;
                                  }
                                  return targetFields.map(f => (
                                    <option key={f.id} value={f.id}>{f.label}</option>
                                  ));
                                })()}
                              </select>
                            </div>
                          )}

                          {selectedField.lookupSource && (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-2">
                                  <div className="p-1 bg-indigo-500/10 text-indigo-500 rounded-md">
                                    <ArrowRightLeft size={12} />
                                  </div>
                                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Field Mapping</label>
                                </div>
                                <button 
                                  onClick={() => {
                                    const currentMappings = selectedField.lookupOutputMappings || [];
                                    updateField(selectedField.id, { 
                                      lookupOutputMappings: [...currentMappings, { id: Math.random().toString(36).substr(2, 9), sourceFieldId: '', targetFieldId: '' }] 
                                    });
                                  }}
                                  className="text-[9px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-600 flex items-center gap-1"
                                >
                                  <Plus size={10} /> Add Mapping
                                </button>
                              </div>

                              <div className="space-y-2">
                                {(selectedField.lookupOutputMappings || []).map((mapping: any, idx: number) => (
                                  <div key={mapping.id} className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded-xl group/mapping">
                                    <div className="flex-1 space-y-1">
                                      {selectedField.lookupSource === 'module_records' ? (
                                        <button
                                          onClick={() => {
                                            setActiveMappingIdx(idx);
                                            setActiveMappingType('source');
                                            setShowMappingModal(true);
                                          }}
                                          className="w-full bg-transparent text-[10px] font-bold text-zinc-600 dark:text-zinc-400 text-left flex items-center justify-between hover:text-indigo-500 transition-all group/src-btn"
                                        >
                                          <span className="truncate">
                                            {(() => {
                                              const relatedData = selectedField.targetModuleId ? relatedModulesMap[selectedField.targetModuleId] : null;
                                              const allFields = relatedData ? flattenFields(relatedData.layout || []) : [];
                                              const source = allFields.find(f => f.id === mapping.sourceFieldId);
                                              if (source) return source.label;

                                              const targetMod = modules.find((m: any) => m.id === selectedField.targetModuleId);
                                              const fallbackFields = targetMod ? flattenFields(targetMod.layout || []) : [];
                                              const fallbackSource = fallbackFields.find(f => f.id === mapping.sourceFieldId);
                                              return fallbackSource ? fallbackSource.label : 'Select Source...';
                                            })()}
                                          </span>
                                          <Search size={10} className="text-zinc-400 group-hover/src-btn:text-indigo-500" />
                                        </button>
                                      ) : (
                                        <select 
                                          value={mapping.sourceFieldId}
                                          onChange={(e) => {
                                            const newMappings = [...(selectedField.lookupOutputMappings || [])];
                                            newMappings[idx] = { ...newMappings[idx], sourceFieldId: e.target.value };
                                            updateField(selectedField.id, { lookupOutputMappings: newMappings });
                                          }}
                                          className="w-full bg-transparent text-[10px] font-bold text-zinc-600 dark:text-zinc-400 focus:outline-none"
                                        >
                                          <option value="">Source Field...</option>
                                          {(() => {
                                            let targetFields: any[] = [];
                                            if (selectedField.lookupSource === 'platform' && selectedField.platformEntity === 'modules' && selectedField.targetPlatformModuleId) {
                                              const platformMod = PLATFORM_MODULES.find(m => m.id === selectedField.targetPlatformModuleId);
                                              if (platformMod) targetFields = platformMod.availableFields;
                                            }
                                            return targetFields.map(f => (
                                              <option key={f.id} value={f.id}>{f.label}</option>
                                            ));
                                          })()}
                                        </select>
                                      )}
                                      <div className="flex items-center gap-1 text-[8px] text-zinc-400 font-black uppercase tracking-widest px-1">
                                        <ArrowRight size={8} /> Target
                                      </div>
                                      <button
                                        onClick={() => {
                                          setActiveMappingIdx(idx);
                                          setActiveMappingType('target');
                                          setShowMappingModal(true);
                                        }}
                                        className="w-full bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 text-left flex items-center justify-between hover:border-indigo-500 transition-all group/btn"
                                      >
                                        <span className="truncate">
                                          {(() => {
                                            const allFields = flattenFields(layout);
                                            const target = allFields.find(f => f.id === mapping.targetFieldId);
                                            return target ? target.label : 'Select Target...';
                                          })()}
                                        </span>
                                        <Search size={10} className="text-zinc-400 group-hover/btn:text-indigo-500" />
                                      </button>
                                    </div>
                                    <button 
                                      onClick={() => {
                                        const newMappings = (selectedField.lookupOutputMappings || []).filter((m: any) => m.id !== mapping.id);
                                        updateField(selectedField.id, { lookupOutputMappings: newMappings });
                                      }}
                                      className="p-1 text-zinc-400 hover:text-rose-500 opacity-0 group-hover/mapping:opacity-100 transition-all"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {selectedField.type === 'sub_module' && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Sub-module</label>
                            
                            {selectedField.targetModuleId ? (
                              <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500">
                                    <Layers size={18} />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                                      {modules.find(m => m.id === selectedField.targetModuleId)?.name || selectedField.targetModuleId}
                                    </h4>
                                    <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Linked Sub-module</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setShowSubmoduleWizard(true)}
                                  className="w-full py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-950 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-all"
                                >
                                  Change Setup...
                                </button>

                                <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-900">
                                  {/* Layout Preset */}
                                  <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest block">Layout Preset</label>
                                    <div className="grid grid-cols-3 gap-2">
                                      {[
                                        { value: 'table', label: 'Table', icon: Table },
                                        { value: 'cards', label: 'Cards', icon: Grid3X3 },
                                        { value: 'list', label: 'List', icon: Layers }
                                      ].map(opt => (
                                        <button
                                          key={opt.value}
                                          type="button"
                                          onClick={() => updateField(selectedField.id, { variant: opt.value })}
                                          className={cn(
                                            "px-1 py-2.5 rounded-xl border text-[8px] font-bold uppercase tracking-widest transition-all flex flex-col items-center gap-1.5 text-center min-w-0 truncate",
                                            (selectedField.variant || 'table') === opt.value
                                              ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                              : "bg-zinc-50 dark:bg-zinc-950 border-zinc-100 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                                          )}
                                        >
                                          <opt.icon size={14} />
                                          <span className="truncate w-full">{opt.label}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Detail Open Action */}
                                  <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-900">
                                    <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest block">Detail Open Action</label>
                                    <div className="grid grid-cols-2 gap-2">
                                      {[
                                        { value: 'modal', label: 'Modal Stack', icon: Layers },
                                        { value: 'page', label: 'Full Page', icon: ExternalLink }
                                      ].map(opt => (
                                        <button
                                          key={opt.value}
                                          type="button"
                                          onClick={() => updateField(selectedField.id, { detailViewMode: opt.value as any })}
                                          className={cn(
                                            "px-1 py-2.5 rounded-xl border text-[8px] font-bold uppercase tracking-widest transition-all flex flex-col items-center gap-1.5 text-center min-w-0 truncate",
                                            (selectedField.detailViewMode || 'modal') === opt.value
                                              ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                              : "bg-zinc-50 dark:bg-zinc-950 border-zinc-100 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                                          )}
                                        >
                                          <opt.icon size={14} />
                                          <span className="truncate w-full">{opt.label}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Detail View Layout */}
                                  <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-900">
                                    <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest block">Detail View Layout</label>
                                    <div className="grid grid-cols-3 gap-2">
                                      {[
                                        { value: 'tabs', label: 'Top Tabs', icon: Layout },
                                        { value: 'split', label: 'Split View', icon: Columns },
                                        { value: 'sidebar', label: 'Single Page', icon: Sidebar },
                                        { value: 'process', label: 'Wizard', icon: ListOrdered },
                                        { value: 'accordion', label: 'Accordion', icon: Layers }
                                      ].map(opt => (
                                        <button
                                          key={opt.value}
                                          type="button"
                                          onClick={() => updateField(selectedField.id, { detailLayoutType: opt.value as any })}
                                          className={cn(
                                            "px-1 py-2.5 rounded-xl border text-[8px] font-bold uppercase tracking-widest transition-all flex flex-col items-center gap-1.5 text-center min-w-0 truncate",
                                            (selectedField.detailLayoutType || 'sidebar') === opt.value
                                              ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                              : "bg-zinc-50 dark:bg-zinc-950 border-zinc-100 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                                          )}
                                        >
                                          <opt.icon size={14} />
                                          <span className="truncate w-full">{opt.label}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="p-5 bg-zinc-50 dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-center space-y-4">
                                <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 mx-auto">
                                  <Layers size={18} />
                                </div>
                                <div className="space-y-1">
                                  <h4 className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest">No Sub-module Configured</h4>
                                  <p className="text-[9px] text-zinc-500 max-w-[180px] mx-auto leading-normal">Link an existing module or quick create a new one to populate this submodule block.</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setShowSubmoduleWizard(true)}
                                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/5"
                                >
                                  Setup Sub-module...
                                </button>
                              </div>
                            )}
                          </div>
                          <p className="text-[9px] text-zinc-500 italic px-1 leading-normal">
                            A Sub-module renders child records as first-class, independent database rows linked back to this parent record.
                          </p>
                        </div>
                      )}

                      {selectedField.type === 'connector' && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Connector</label>
                             <button 
                               onClick={() => setShowConnectorModal(true)}
                               className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-900 dark:text-white flex items-center justify-between hover:border-indigo-500 transition-all group shadow-sm"
                             >
                               <span className={cn(selectedField.connectorId ? "text-zinc-900 dark:text-white font-medium" : "text-zinc-400 font-medium")}>
                                 {activeConnectors.find(c => c.connectorId === selectedField.connectorId)?.displayName || 'Select Connector...'}
                               </span>
                               <ChevronRight size={14} className="text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                             </button>
                           </div>
                          {selectedField.connectorId && (
                            <div className="space-y-3">
                              <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl space-y-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-500">
                                    {(() => {
                                      const conn = activeConnectors.find(c => c.connectorId === selectedField.connectorId) || 
                                                   connectorRegistry.find(c => c.id === selectedField.connectorId);
                                      const iconName = selectedField.icon || conn?.icon || conn?.connector?.icon || 'Zap';
                                      return <DynamicIcon name={iconName} size={14} />;
                                    })()}
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-tight">Handshake Verified</p>
                                    <p className="text-[9px] text-zinc-500">Ready to snap into layout</p>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-6 pt-6 border-t border-zinc-100 dark:border-zinc-900">
                                <div className="flex items-center justify-between px-1">
                                  <div className="flex items-center gap-2">
                                    <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                                    <h4 className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-widest">Data Mapping</h4>
                                  </div>
                                  <button 
                                    onClick={() => {
                                      const conn = activeConnectors.find(c => c.connectorId === selectedField.connectorId) || 
                                                   connectorRegistry.find(c => c.id === selectedField.connectorId);
                                      if (conn) {
                                        const outputs = (conn.ioSchema?.outputs) || (conn.connector?.ioSchema?.outputs) || [];
                                        const fields = layout.filter(f => f.type !== 'connector' && f.type !== 'automation');
                                        const newMappings = { ...(connectorMappings[selectedField.connectorId] || {}) };
                                        let count = 0;
                                        outputs.forEach((output: any) => {
                                          if (newMappings[output.name]) return;
                                          const match = fields.find(f => 
                                            f.id === output.name || 
                                            f.label.toLowerCase() === (output.label || output.name).toLowerCase()
                                          );
                                          if (match) {
                                            newMappings[output.name] = match.id;
                                            count++;
                                          }
                                        });
                                        setConnectorMappings(prev => ({ ...prev, [selectedField.connectorId]: newMappings }));
                                        if (count > 0) toast.success(`Auto-mapped ${count} fields`);
                                        else toast.info("No matching fields found for auto-mapping");
                                      }
                                    }}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
                                  >
                                    <Wand2 size={10} />
                                    Auto-Map
                                  </button>
                                </div>

                                <div className="space-y-3">
                                  {(() => {
                                    const conn = activeConnectors.find(c => c.connectorId === selectedField.connectorId) || 
                                                 connectorRegistry.find(c => c.id === selectedField.connectorId);
                                    const outputs = (conn?.ioSchema?.outputs) || (conn?.connector?.ioSchema?.outputs) || [];
                                    const targetFields = layout.filter(f => f.type !== 'connector' && f.type !== 'automation');
                                    const mappings = connectorMappings[selectedField.connectorId] || {};

                                    if (outputs.length === 0) {
                                      return (
                                        <div className="p-8 text-center bg-zinc-50 dark:bg-zinc-900/50 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                                          <Zap size={20} className="mx-auto mb-3 text-zinc-300" />
                                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">No API Outputs Defined</p>
                                        </div>
                                      );
                                    }

                                    return outputs.map((output: any) => {
                                      const currentTarget = mappings[output.name];
                                      const isDuplicate = Object.values(mappings).filter(v => v === currentTarget && v !== '').length > 1;

                                      return (
                                        <div key={output.name} className="group p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3 hover:border-indigo-500/30 transition-all shadow-sm">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                                                <Zap size={12} className="text-indigo-500" />
                                              </div>
                                              <div>
                                                <span className="block text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-tight">{output.label || output.name}</span>
                                                <span className="block text-[8px] font-mono text-zinc-500">{output.name}</span>
                                              </div>
                                            </div>
                                            {isDuplicate && (
                                              <div className="w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-white text-[8px] font-bold shadow-lg animate-pulse">!</div>
                                            )}
                                          </div>
                                          
                                          <select 
                                            value={currentTarget || ''}
                                            onChange={(e) => {
                                              const newMappings = { ...mappings, [output.name]: e.target.value };
                                              setConnectorMappings(prev => ({ ...prev, [selectedField.connectorId]: newMappings }));
                                            }}
                                            className={cn(
                                              "w-full bg-zinc-50 dark:bg-zinc-800/50 border rounded-xl px-3 py-2 text-[10px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none",
                                              isDuplicate ? "border-amber-500/50 text-amber-600" : "border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                                            )}
                                          >
                                            <option value="">Unmapped</option>
                                            {targetFields.map(f => (
                                              <option key={f.id} value={f.id}>
                                                {f.label} {Object.values(mappings).some(v => v === f.id && v !== currentTarget) ? ' (Already Used)' : ''}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                              </div>
                            </div>
                          )}
                          <p className="text-[9px] text-zinc-600 italic px-1">Connect this block to an active Nexus integration.</p>
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


                      {selectedField.type === 'connector' && (
                        <div className="space-y-6 pt-6 border-t border-zinc-100 dark:border-zinc-900">
                          <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2">
                              <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                              <h4 className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-widest">Data Mapping</h4>
                            </div>
                            <button 
                              onClick={() => {
                                const conn = activeConnectors.find(c => c.connectorId === selectedField.connectorId) || 
                                             connectorRegistry.find(c => c.id === selectedField.connectorId);
                                if (conn) {
                                  const outputs = (conn.ioSchema?.outputs) || (conn.connector?.ioSchema?.outputs) || [];
                                  const fields = layout.filter(f => f.type !== 'connector' && f.type !== 'automation');
                                  const newMappings = { ...(connectorMappings[selectedField.connectorId] || {}) };
                                  let count = 0;
                                  outputs.forEach((output: any) => {
                                    if (newMappings[output.name]) return;
                                    const match = fields.find(f => 
                                      f.id === output.name || 
                                      f.label.toLowerCase() === (output.label || output.name).toLowerCase()
                                    );
                                    if (match) {
                                      newMappings[output.name] = match.id;
                                      count++;
                                    }
                                  });
                                  setConnectorMappings(prev => ({ ...prev, [selectedField.connectorId]: newMappings }));
                                  if (count > 0) toast.success(`Auto-mapped ${count} fields`);
                                  else toast.info("No matching fields found for auto-mapping");
                                }
                              }}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
                            >
                              <Wand2 size={10} />
                              Auto-Map
                            </button>
                          </div>

                          <div className="space-y-3">
                            {(() => {
                              const conn = activeConnectors.find(c => c.connectorId === selectedField.connectorId) || 
                                           connectorRegistry.find(c => c.id === selectedField.connectorId);
                              const outputs = (conn?.ioSchema?.outputs) || (conn?.connector?.ioSchema?.outputs) || [];
                              const targetFields = layout.filter(f => f.type !== 'connector' && f.type !== 'automation');
                              const mappings = connectorMappings[selectedField.connectorId] || {};

                              if (outputs.length === 0) {
                                return (
                                  <div className="p-8 text-center bg-zinc-50 dark:bg-zinc-900/50 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                                    <Zap size={20} className="mx-auto mb-3 text-zinc-300" />
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">No API Outputs Defined</p>
                                  </div>
                                );
                              }

                              return outputs.map((output: any) => {
                                const currentTarget = mappings[output.name];
                                const isDuplicate = Object.values(mappings).filter(v => v === currentTarget && v !== '').length > 1;

                                return (
                                  <div key={output.name} className="group p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3 hover:border-indigo-500/30 transition-all shadow-sm">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                                          <Zap size={12} className="text-indigo-500" />
                                        </div>
                                        <div>
                                          <span className="block text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-tight">{output.label || output.name}</span>
                                          <span className="block text-[8px] font-mono text-zinc-500">{output.name}</span>
                                        </div>
                                      </div>
                                      {isDuplicate && (
                                        <div className="w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-white text-[8px] font-bold shadow-lg animate-pulse">!</div>
                                      )}
                                    </div>
                                    
                                    <select 
                                      value={currentTarget || ''}
                                      onChange={(e) => {
                                        const newMappings = { ...mappings, [output.name]: e.target.value };
                                        setConnectorMappings(prev => ({ ...prev, [selectedField.connectorId]: newMappings }));
                                      }}
                                      className={cn(
                                        "w-full bg-zinc-50 dark:bg-zinc-800/50 border rounded-xl px-3 py-2 text-[10px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none",
                                        isDuplicate ? "border-amber-500/50 text-amber-600" : "border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                                      )}
                                    >
                                      <option value="">Unmapped</option>
                                      {targetFields.map(f => (
                                        <option key={f.id} value={f.id}>
                                          {f.label} {Object.values(mappings).some(v => v === f.id && v !== currentTarget) ? ' (Already Used)' : ''}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Table Spacing Control Panel */}
                      {(selectedField.type === 'datatable' || selectedField.type === 'sub_module' || (selectedField.type === 'repeatableGroup' && (selectedField.variant || 'table') === 'table')) && (
                        <div className="space-y-3 pt-6 border-t border-zinc-100 dark:border-zinc-900">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Table Spacing</label>
                          <div className="grid grid-cols-3 gap-2">
                            {(['compact', 'standard', 'spacious'] as const).map(d => (
                              <button
                                key={d}
                                onClick={() => updateField(selectedField.id, { density: d })}
                                className={cn(
                                  "px-3 py-2.5 rounded-xl border text-[9px] font-bold uppercase tracking-widest transition-all",
                                  (selectedField.density || 'standard') === d 
                                    ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                                    : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900/50"
                                )}
                              >
                                {d}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-12">
                      <button 
                        onClick={() => {
                          if (selectedField) {
                            deleteBlocks([selectedField.id]);
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
                        <h3 className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest">
                          Tab Settings
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

                      {interfaceSettings.detail?.showTabIcons && (
                        <div className="space-y-2">
                          <IconPicker 
                            label="Tab Icon"
                            value={selectedTab.iconName || 'Layout'}
                            onChange={(iconName) => updateTab(selectedTab.id, { iconName })}
                          />
                        </div>
                      )}

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
                    className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4"
                  >
                    <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-200 dark:border-zinc-800 shadow-2xl shadow-indigo-500/5 animate-in zoom-in-50 duration-300">
                      {activeViewMode === 'master' ? <Settings className="text-zinc-500 dark:text-zinc-400" size={20} /> : <Move size={20} className="text-zinc-500 dark:text-zinc-400" />}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">No Selection</p>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-500 leading-relaxed max-w-[180px]">
                        {activeViewMode === 'master' 
                          ? 'Select any column header or click "Table Settings" to configure layout preferences.' 
                          : 'Select any field on the canvas to configure its properties.'}
                      </p>
                    </div>
                    {activeViewMode === 'master' && (
                      <button
                        onClick={() => setSelectedId('__table_settings')}
                        className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                      >
                        Configure Table Settings
                      </button>
                    )}
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
                <div className="p-3 px-4 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-transparent">
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
              } else if (editingCondition.targetType === 'tab') {
                updateTab(editingCondition.targetId, { visibilityRule: rule });
              } else if ((editingCondition.targetType as any) === 'step') {
                setForms(prev => prev.map(f => f.id === selectedFormId ? {
                  ...f,
                  steps: f.steps.map((s: any) => s.id === editingCondition.targetId ? { ...s, visibilityRule: rule } : s)
                } : f));
              }
            }
            setEditingCondition(null);
          }}
          initialRule={editingCondition?.rule}
          availableFields={flattenFields(layout).filter(f => f.id !== editingCondition?.targetId)}
          tabs={tabs}
          targetLabel={
            editingCondition?.targetType === 'field' 
              ? (layout.find(f => f.id === editingCondition?.targetId)?.label || 'Field')
              : (tabs.find(t => t.id === editingCondition?.targetId)?.label || 'Tab')
          }
        />

        {/* Calculator Modal */}
        {(() => {
          const deepFilter = (fields: any[], id: string): any[] => {
            return fields
              .filter(f => f.id !== id)
              .map(f => f.fields ? { ...f, fields: deepFilter(f.fields, id) } : f);
          };
          const availableFieldsForCalc = deepFilter(layout, editingCalculation?.targetId || '');
          
          return (
            <CalculatorModal 
              isOpen={!!editingCalculation}
              onClose={() => setEditingCalculation(null)}
              onSave={(logic, triggers, showAsCurrency, currencySymbol) => {
                if (editingCalculation) {
                  updateField(editingCalculation.targetId, { 
                    calculationLogic: logic,
                    calculationTriggers: triggers,
                    showAsCurrency,
                    currencySymbol
                  });
                }
                setEditingCalculation(null);
              }}
              initialLogic={editingCalculation?.logic}
              initialTriggers={editingCalculation?.triggers}
              showAsCurrency={editingCalculation?.showAsCurrency}
              currencySymbol={editingCalculation?.currencySymbol}
              availableFields={availableFieldsForCalc}
              tabs={tabs}
              relatedFields={Object.fromEntries(
                Object.entries(relatedModulesMap).map(([mid, data]) => [mid, data.layout])
              )}
              allModules={modules}
              targetLabel={layout.find(f => f.id === editingCalculation?.targetId)?.label || 'Calculation'}
            />
          );
        })()}

        {/* Command Palette */}
        <CommandPalette 
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onSelectBlock={(type) => {
            const newField = createField(type as FieldType);
            setLayout([...layout, newField]);
            setSelectedId(newField.id);
          }}
          tabs={tabs}
          layout={layout}
          activeTab={activeTab}
          onAction={(action) => {
            if (action === 'preview') setActiveTab(activeTab === 'preview' ? 'builder' : 'preview');
            if (action === 'save') handleSave();
            if (action === 'console') setShowConsole(!showConsole);
            if (action.startsWith('tab:')) {
              setActiveTab(action.split(':')[1] as any);
            }
            if (layout.find(f => f.id === action)) {
              setSelectedId(action);
            }
          }}
        />
      </div>

      <SubmoduleSetupModal 
        isOpen={showSubmoduleWizard}
        onClose={() => setShowSubmoduleWizard(false)}
        modules={modules}
        currentModuleId={id}
        onComplete={(targetModuleId) => {
          if (selectedField) {
            updateField(selectedField.id, { targetModuleId });
          }
        }}
        tenantId={tenant?.id || ''}
        token={(import.meta as any).env.VITE_DEV_TOKEN || session?.access_token || ''}
        DATA_API_URL={DATA_API_URL}
      />

      <NexusSelectionModal 
        isOpen={showConnectorModal}
        onClose={() => setShowConnectorModal(false)}
        activeConnectors={activeConnectors}
        registry={connectorRegistry}
        onSelect={async (conn, strategy) => {
          if (selectedField) {
            const fullConnector = activeConnectors.find(c => c.connectorId === conn.connectorId) || 
                                connectorRegistry.find(c => c.id === conn.connectorId);

            updateField(selectedField.id, { 
              connectorId: conn.connectorId,
              label: conn.displayName,
              icon: conn.icon || fullConnector?.icon
            });
            
            if (fullConnector) {
              const outputs = (fullConnector.ioSchema?.outputs) || (fullConnector.connector?.ioSchema?.outputs) || [];
              
              if (strategy === 'auto') {
                toast.info(`Auto-provisioning ${outputs.length} fields...`);
                
                const newMappings: Record<string, string> = { ...(connectorMappings[conn.connectorId] || {}) };
                
                // CRITICAL: Apply the connector update to our local layout copy immediately
                // to avoid it being overwritten by the batch update.
                const currentLayout = layout.map(f => f.id === selectedField.id ? {
                  ...f,
                  connectorId: conn.connectorId,
                  label: conn.displayName
                } : f);
                
                let nextRow = currentLayout.length > 0 ? Math.max(...currentLayout.map((f: any) => f.rowIndex || 0)) + 1 : 0;
                let isLeft = true;
                
                for (const output of outputs) {
                  if (newMappings[output.name]) continue;

                  // Generate a unique ID for the new field
                  const fieldId = `field_${Math.random().toString(36).substr(2, 9)}`;
                  
                  // Create new field object for the layout
                  const newField: any = {
                    id: fieldId,
                    label: output.label || output.name,
                    type: output.type === 'number' ? 'number' : 
                          output.type === 'boolean' ? 'checkbox' : 'text',
                    required: false,
                    colSpan: 6,
                    startCol: isLeft ? 1 : 7,
                    rowIndex: nextRow,
                    tabId: currentTabId // Place on current active tab
                  };

                  currentLayout.push(newField);
                  newMappings[output.name] = fieldId;
                  
                  // Toggle side and advance row if needed
                  if (isLeft) {
                    isLeft = false;
                  } else {
                    isLeft = true;
                    nextRow++;
                  }
                }

                // 1. Update local states so UI reflects changes immediately
                setLayout(currentLayout);
                setConnectorMappings(prev => ({ ...prev, [conn.connectorId]: newMappings }));

                // 2. Persist the entire updated module in one go
                const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
                const isNew = id === 'new' || MODULES.some(m => m.id === id);
                
                const payload = {
                  ...moduleSettings,
                  config: {
                    titleFieldId: moduleSettings.titleFieldId
                  },
                  id: isNew && id !== 'new' ? id : undefined,
                  enabled: moduleSettings.status === 'ACTIVE',
                  layout: currentLayout || [],
                  tabs: tabs || [],
                  forms: forms || [],
                  connectorMappings: {
                    ...(connectorMappings || {}),
                    [conn.connectorId]: newMappings
                  },
                  workflows: workflow ? [workflow] : []
                };

                try {
                  const url = isNew ? `${API_BASE_URL}/api/data/modules` : `${API_BASE_URL}/api/data/modules/${id}`;
                  const res = await fetch(url, {
                    method: isNew ? 'POST' : 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      'x-tenant-id': tenant?.id || '',
                      'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                  });

                  if (res.ok) {
                    toast.success(`Successfully provisioned ${outputs.length} fields`);
                    refreshModules();
                  } else {
                    throw new Error('Failed to save auto-provisioned fields');
                  }
                } catch (err) {
                  console.error("Failed to save mappings:", err);
                  toast.error("Failed to persist auto-provisioned fields");
                }
              } else {
                // Manual Strategy: Select the block and open inspector
                setSelectedId(selectedField.id);
                setRightSidebarTab('inspector');
              }
            }
          }
          setShowConnectorModal(false);
        }}
        onActivate={handleActivateConnector}
        onCreateCustom={handleCreateCustomConnector}
        onForge={handleForgeConnector}
      />

      <ConnectorConfigDrawer 
        isOpen={configDrawerOpen}
        onClose={() => setConfigDrawerOpen(false)}
        connector={configConnector}
        onSave={handleSaveConfig}
      />

      <FieldSelectorModal 
        isOpen={showMappingModal}
        onClose={() => {
          setShowMappingModal(false);
          setActiveMappingIdx(null);
        }}
        fields={activeMappingType === 'target' 
          ? flattenFields(layout) 
          : (selectedField?.lookupSource === 'module_records' && selectedField?.targetModuleId)
            ? flattenFields(relatedModulesMap[selectedField.targetModuleId]?.layout || [])
            : []
        }
        tabs={activeMappingType === 'target'
          ? tabs
          : (selectedField?.lookupSource === 'module_records' && selectedField?.targetModuleId)
            ? relatedModulesMap[selectedField.targetModuleId]?.tabs
            : []
        }
        title={activeMappingType === 'target' ? "Select Target Field" : "Select Source Field"}
        selectedFieldId={activeMappingIdx !== null 
          ? (activeMappingType === 'target' 
              ? selectedField?.lookupOutputMappings?.[activeMappingIdx]?.targetFieldId 
              : selectedField?.lookupOutputMappings?.[activeMappingIdx]?.sourceFieldId)
          : undefined}
        excludeFieldIds={activeMappingType === 'target' && selectedField ? [selectedField.id] : []}
        onSelect={(fieldId) => {
          if (activeMappingIdx !== null && selectedField) {
            const newMappings = [...(selectedField.lookupOutputMappings || [])];
            if (activeMappingType === 'target') {
              newMappings[activeMappingIdx] = { ...newMappings[activeMappingIdx], targetFieldId: fieldId };
            } else {
              newMappings[activeMappingIdx] = { ...newMappings[activeMappingIdx], sourceFieldId: fieldId };
            }
            updateField(selectedField.id, { lookupOutputMappings: newMappings });
          }
        }}
      />

      <ValidationRuleModal 
        isOpen={isRuleModalOpen}
        onClose={() => {
          setIsRuleModalOpen(false);
          setEditingRule(null);
        }}
        onSave={handleSaveRule}
        rule={editingRule}
        fields={flattenFields(layout)}
      />

    </div>
  );
};

export default ModuleEditor;
