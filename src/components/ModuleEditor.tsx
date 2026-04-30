import React, { useState, useEffect, useCallback } from 'react';
import { 
  Save, 
  Eye, 
  Search, 
  Trash2, 
  Settings2,
  Settings,
  Plus, 
  Layers,
  Sparkles,
  Monitor,
  Tablet,
  Smartphone,
  Layout,
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
  Upload,
  Radio,
  ToggleRight,
  Sliders,
  Clock,
  MousePointer2,
  Box,
  Smile,
  CreditCard,
  FileJson,
  Table,
  ListOrdered,
  GitCommit,
  ArrowLeftRight,
  TreePalm,
  PenTool,
  MapPin,
  Code,
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
  Menu,
  FileCode,
  Rocket,
  Globe,
  Webhook,
  ClipboardList,
  History,
  Terminal,
  AlertTriangle,
  XCircle,
  ChevronUp,
  ChevronDown,
  MousePointerClick,
  Filter,
  TableProperties,
  ArrowRight,
  Check,
  Command,
  Info,
  ChevronRight
} from 'lucide-react';
import { WorkflowGraphEditor } from './Builder/Workflow/GraphEditor';
import { Workflow } from '../types/platform';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useParams, useNavigate } from 'react-router-dom';
import { CommandPalette } from './CommandPalette';
import { cn } from '../lib/utils';
import { usePlatform } from '../hooks/usePlatform';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import { DATA_API_URL, API_BASE_URL } from '../config';
import { ModuleType } from '../types/platform';
import { MODULES } from '../constants/modules';
import { FieldGroup } from './Builder/FieldGroup';
import { useGridEngine } from '../hooks/useGridEngine';
import { IconPicker } from './Common/IconPicker';
import { ConditionModal } from './Builder/ConditionModal';
import { CalculatorModal } from './Builder/CalculatorModal';
import { FieldInput } from './FieldInput';
import { NexusSelectionModal } from './Builder/NexusSelectionModal';
import { ConnectorConfigDrawer } from './Builder/ConnectorConfigDrawer';


// --- Types ---

export type FieldType = 
  | 'text' | 'longText' | 'number' | 'checkbox' | 'currency' | 'email' | 'phone' | 'address' | 'lookup' | 'user' | 'calculation' | 'ai_summary' | 'date' | 'select'
  | 'radio' | 'checkboxGroup' | 'toggle' | 'slider' | 'time' | 'button' | 'buttonGroup' | 'icon' | 'card' | 'richtext' | 'accordion' | 'datatable' | 'stepper' 
  | 'timeline' | 'duallist' | 'treeview' | 'signature' | 'payment' | 'colorpicker' | 'map' | 'html' | 'qr_scanner' | 'canvas' | 'chat' | 'tabs_nested' 
  | 'rating' | 'progress' | 'tag' | 'video' | 'audio' | 'heading' | 'divider' | 'spacer' | 'alert' | 'url' | 'fieldGroup' | 'group' | 'repeatableGroup' | 'autonumber' | 'connector';

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
  // Component specific
  min?: number;
  max?: number;
  variant?: string;
  action?: string;
  iconName?: string;
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
      { id: 'longText', label: 'Long Text', icon: AlignLeft, defaultSpan: 12 },
      { id: 'number', label: 'Number', icon: Hash, defaultSpan: 4 },
      { id: 'currency', label: 'Currency', icon: DollarSign, defaultSpan: 4 },
      { id: 'date', label: 'Date Picker', icon: Calendar, defaultSpan: 4 },
      { id: 'time', label: 'Time Picker', icon: Clock, defaultSpan: 4 },
      { id: 'select', label: 'Dropdown', icon: ListFilter, defaultSpan: 6 },
      { id: 'radio', label: 'Radio Buttons', icon: Radio, defaultSpan: 6 },
      { id: 'checkboxGroup', label: 'Checkbox Group', icon: ListPlus, defaultSpan: 6 },
      { id: 'checkbox', label: 'Single Checkbox', icon: CheckSquare, defaultSpan: 3 },
      { id: 'toggle', label: 'Switch / Toggle', icon: ToggleRight, defaultSpan: 3 },
      { id: 'slider', label: 'Range Slider', icon: Sliders, defaultSpan: 6 },
      { id: 'rating', label: 'Star Rating', icon: Star, defaultSpan: 4 },
      { id: 'colorpicker', label: 'Color Picker', icon: Palette, defaultSpan: 4 },
      { id: 'tag', label: 'Tag Input', icon: Tag, defaultSpan: 12 },
    ]
  },
  {
    id: 'actions',
    label: 'Actions & Tools',
    fields: [
      { id: 'button', label: 'Action Button', icon: MousePointer2, defaultSpan: 3 },
      { id: 'buttonGroup', label: 'Button Group', icon: Layers, defaultSpan: 6 },
      { id: 'signature', label: 'Signature Pad', icon: PenTool, defaultSpan: 6 },
      { id: 'qr_scanner', label: 'QR / Barcode', icon: QrCode, defaultSpan: 4 },
      { id: 'payment', label: 'Payment Control', icon: CreditCard, defaultSpan: 6 },
      { id: 'file', label: 'File Upload', icon: UploadCloud, defaultSpan: 12 },
    ]
  },
  {
    id: 'display',
    label: 'Content & Display',
    fields: [
      { id: 'heading', label: 'Heading', icon: Heading, defaultSpan: 12 },
      { id: 'richtext', label: 'Rich Text / WYSIWYG', icon: FileJson, defaultSpan: 12 },
      { id: 'html', label: 'HTML Block', icon: Code, defaultSpan: 12 },
      { id: 'icon', label: 'Icon Display', icon: Smile, defaultSpan: 2 },
      { id: 'divider', label: 'Divider', icon: Minus, defaultSpan: 12 },
      { id: 'spacer', label: 'Spacer', icon: Maximize2, defaultSpan: 12 },
      { id: 'alert', label: 'Alert Notice', icon: AlertCircle, defaultSpan: 12 },
      { id: 'image', label: 'Image Holder', icon: Image, defaultSpan: 12 },
      { id: 'video', label: 'Video Player', icon: Video, defaultSpan: 12 },
      { id: 'audio', label: 'Audio Player', icon: Music, defaultSpan: 6 },
      { id: 'progress', label: 'Progress Bar', icon: Activity, defaultSpan: 6 },
      { id: 'map', label: 'Map / Geolocation', icon: MapPin, defaultSpan: 12 },
      { id: 'canvas', label: 'Drawing Canvas', icon: Brush, defaultSpan: 12 },
      { id: 'chat', label: 'Chat Stream', icon: MessageSquare, defaultSpan: 6 },
    ]
  },
  {
    id: 'layout',
    label: 'Containers & Layout',
    fields: [
      { id: 'card', label: 'Card Container', icon: Box, defaultSpan: 12 },
      { id: 'accordion', label: 'Accordion', icon: GridIcon, defaultSpan: 12 },
      { id: 'tabs_nested', label: 'Nested Tabs', icon: FolderTree, defaultSpan: 12 },
      { id: 'stepper', label: 'Step Progress', icon: ListOrdered, defaultSpan: 12 },
      { id: 'timeline', label: 'Timeline View', icon: GitCommit, defaultSpan: 12 },
      { id: 'group', label: 'Group Container', icon: Layers, defaultSpan: 12 },
      { id: 'fieldGroup', label: 'Field Section', icon: Folder, defaultSpan: 12 },
      { id: 'repeatableGroup', label: 'Repeatable List', icon: ListPlus, defaultSpan: 12 },
    ]
  },
  {
    id: 'data',
    label: 'Data & Intelligence',
    fields: [
      { id: 'datatable', label: 'Data Table', icon: Table, defaultSpan: 12 },
      { id: 'duallist', label: 'Dual List', icon: ArrowLeftRight, defaultSpan: 12 },
      { id: 'treeview', label: 'Tree View', icon: TreePalm, defaultSpan: 6 },
      { id: 'calculation', label: 'Calculation', icon: Calculator, defaultSpan: 12 },
      { id: 'lookup', label: 'Data Lookup', icon: Search, defaultSpan: 6 },
      { id: 'autonumber', label: 'Auto-increment', icon: Hash, defaultSpan: 6 },
      { id: 'connector', label: 'Connector', icon: Zap, defaultSpan: 12 },
      { id: 'automation', label: 'AI Prompt', icon: Sparkles, defaultSpan: 12 },
    ]
  },
  {
    id: 'hierarchical',
    label: 'Hierarchical',
    fields: [
      { id: 'sub_module', label: 'Nested Collection', icon: Layers, defaultSpan: 12 },
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

  // Handle Legacy Format (Form Fields)
  if (rule.fieldId && !rule.type) {
    const { fieldId, operator, value } = rule;
    const fieldValue = data[fieldId];
    if (operator === 'neq') return String(fieldValue) !== String(value);
    if (operator === 'contains') return String(fieldValue || '').toLowerCase().includes(String(value || '').toLowerCase());
    return String(fieldValue) === String(value);
  }

  if (rule.type === 'rule') {
    const { fieldId, operator, value, valueType } = rule;
    if (!fieldId) return true;

    const fieldValue = data[fieldId];
    const compareValue = valueType === 'field' ? data[value || ''] : value;

    const isEmpty = (val: any) => val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);

    switch (operator) {
      case 'equals': return String(fieldValue) === String(compareValue);
      case 'not_equals': return String(fieldValue) !== String(compareValue);
      case 'contains': return String(fieldValue || '').toLowerCase().includes(String(compareValue || '').toLowerCase());
      case 'greater_than': return Number(fieldValue) > Number(compareValue);
      case 'less_than': return Number(fieldValue) < Number(compareValue);
      case 'is_empty': return isEmpty(fieldValue);
      case 'not_empty': return !isEmpty(fieldValue);
      default: return true;
    }
  }

  if (rule.type === 'group') {
    if (!rule.rules || rule.rules.length === 0) return true;
    
    if (rule.logicalOperator === 'OR') {
      return rule.rules.some(r => evaluateVisibilityRule(r, data));
    } else {
      return rule.rules.every(r => evaluateVisibilityRule(r, data));
    }
  }

  return true;
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

const generateMockData = (fields: Field[], count: number = 5) => {
  const mocks: any[] = [];
  const firstNames = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
  const statuses = ['Active', 'Pending', 'Archived', 'Draft', 'Review'];
  const categories = ['Internal', 'External', 'Partner', 'Tier 1', 'Tier 2'];

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
            record[f.id] = f.options[Math.floor(Math.random() * f.options.length)].value;
          } else {
            record[f.id] = statuses[Math.floor(Math.random() * statuses.length)];
          }
          break;
        case 'date':
          record[f.id] = new Date(Date.now() - Math.random() * 1000000000).toISOString().split('T')[0];
          break;
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

const FormCanvasItem = ({ fObj, isSelected, onSelect, onDelete, layout }: any) => {
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
          {fObj.type === 'html/text' && (
            <p className="text-sm text-zinc-500 leading-relaxed">
              {fObj.placeholderOverride || 'Enter some descriptive text or HTML here...'}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
             <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{fObj.type}</span>
          </div>
        </div>
      ) : (
        <div className="space-y-2 opacity-80 group-hover:opacity-100 transition-opacity">
           <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">{fObj.labelOverride || field?.label}</label>
           <div className="h-11 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 flex items-center text-xs text-zinc-400 italic">
             {fObj.placeholderOverride || `Enter ${field?.label.toLowerCase()}...`}
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
         <button 
           onClick={(e) => {
             e.stopPropagation();
             onDelete(fObj.id);
           }}
           className="p-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-400 hover:text-rose-600"
         >
           <Trash2 size={12} />
         </button>
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
  const mockData = React.useMemo(() => generateMockData(layout, 10), [layout.length]);
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
  const [activeConnectors, setActiveConnectors] = useState<any[]>([]);
  const [connectorRegistry, setConnectorRegistry] = useState<any[]>([]);
  const [showConnectorModal, setShowConnectorModal] = useState(false);

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
        if (data.forms) {
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
        id: isNew && id !== 'new' ? id : undefined, // Pass templateId if standard module
        enabled: moduleSettings.status === 'ACTIVE',
        layout,
        tabs,
        forms,
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
  }, [tenant?.id, id, moduleSettings, layout, tabs, forms, workflow, session?.access_token, navigate, refreshModules]);

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
  
  const [activeTab, setActiveTab] = useState<'details' | 'schema' | 'builder' | 'workflow' | 'rules' | 'experience' | 'security' | 'localization' | 'map' | 'assets' | 'forms' | 'deployment' | 'preview'>('builder');
  const [experienceSubTab, setExperienceSubTab] = useState<'master' | 'detail' | 'filters' | 'actions'>('master');
  const [previewView, setPreviewView] = useState<'table' | 'detail' | 'create'>('table');
  const [previewSelectedId, setPreviewSelectedId] = useState<string | null>(null);
  const [previewStepId, setPreviewStepId] = useState<string | null>(null);
  const [showConsole, setShowConsole] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [moduleState, setModuleState] = useState<Record<string, any>>({});
  const [showGridlines, setShowGridlines] = useState(true);

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

  const [interfaceSettings, setInterfaceSettings] = useState({
    master: {
      columns: [] as { fieldId: string, visible: boolean, inlineEdit: boolean, width?: number }[],
      density: 'standard' as 'compact' | 'standard' | 'spacious',
      pagination: {
        enabled: true,
        pageSize: 25,
        showSizeChanger: true
      }
    },
    detail: {
      layoutType: 'tabs' as 'split' | 'tabs' | 'sidebar',
    },
    filters: [] as { fieldId: string, type: string }[],
    actions: [
      { id: 'act-1', label: 'Export PDF', icon: 'FileText' },
      { id: 'act-2', label: 'Archive', icon: 'Trash2' }
    ]
  });

  // Helper for single selection
  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null;
  const setSelectedId = (id: string | null) => setSelectedIds(id ? [id] : []);

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

    // 2. Compaction: Push items up if there's space
    // For now, let's at least ensure there are no completely empty row indices
    let lastRow = -1;
    let currentRowOffset = 0;
    
    const rows = [...new Set(sorted.map(f => f.rowIndex || 0))].sort((a, b) => a - b);
    const rowMap = new Map();
    rows.forEach((r, i) => rowMap.set(r, i));

    return sorted.map(f => ({
      ...f,
      rowIndex: rowMap.get(f.rowIndex || 0) || 0
    }));
  };

  const compactLayout = (fields: Field[]) => {
    // Advanced compaction: Try to fill gaps in previous rows
    // This is a placeholder for a more complex grid packing algorithm
    return normalizeLayout(fields);
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

  const deleteBlocks = (ids: string[]) => {
    setLayout(prev => {
      let next = prev;
      ids.forEach(id => {
        next = removeFieldRecursive(next, id);
      });
      return next;
    });
    setSelectedIds([]);
  };

  const updateFields = (fieldIds: string[], updates: Partial<Field>) => {
    fieldIds.forEach(id => updateField(id, updates));
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
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900/50 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
            {(['details', 'schema', 'builder', 'workflow', 'rules', 'experience', 'security', 'localization', 'map', 'assets', 'forms', 'deployment'] as const).map((tab) => (
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
            onClick={() => setShowGridlines(!showGridlines)}
            className={cn(
              "p-1.5 rounded-lg border transition-all",
              showGridlines 
                ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-500 shadow-inner" 
                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            )}
            title={showGridlines ? "Hide Gridlines" : "Show Gridlines"}
          >
            <Grid3X3 size={14} />
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
            onClick={() => setIsCommandPaletteOpen(true)}
            className="p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-all"
            title="Open Command Palette (Ctrl+K)"
          >
            <Command size={14} />
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
        {activeTab === 'builder' && (
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

            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-8 custom-scrollbar">
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
        <main className={cn(
          "flex-1 relative flex flex-col overflow-hidden",
          activeTab === 'builder' ? "bg-zinc-100 dark:bg-zinc-900" : "bg-zinc-50 dark:bg-zinc-950"
        )}>
          {/* Main Tab Content Area */}
          <div 
            className={cn(
              "flex-1 relative overflow-hidden",
              activeTab === 'builder' ? "p-6 overflow-y-auto" : "p-0 overflow-y-auto"
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
            <>
              {/* Blueprint Grid Background */}
              {showGridlines && (
                <div className="absolute inset-0 pointer-events-none opacity-[0.05] dark:opacity-[0.05]" 
                     style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
              )}
              
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
                              {currentTabId === tab.id && (
                                <Settings2 
                                  size={14} 
                                  className="ml-2 opacity-60 hover:opacity-100 transition-opacity" 
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
                  {showGridlines && (
                    <div className="absolute inset-0 pointer-events-none grid grid-cols-12 gap-4 px-8 py-8 opacity-[0.03] dark:opacity-[0.05]">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="h-full border-x border-zinc-900 dark:border-white" />
                      ))}
                    </div>
                  )}

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
                                    if (e.shiftKey || e.metaKey || e.ctrlKey) {
                                      setSelectedIds(prev => prev.includes(block.id) ? prev.filter(id => id !== block.id) : [...prev, block.id]);
                                    } else {
                                      setSelectedIds([block.id]);
                                    }
                                  }}
                                  className={cn(
                                    "group/field relative p-4 rounded-2xl cursor-pointer transition-all border-2",
                                    selectedIds.includes(block.id) 
                                      ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-500/5 ring-4 ring-indigo-500/10" 
                                      : "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700",
                                    activeDragItem?.fieldId === block.id && "shadow-2xl ring-4 ring-indigo-500/20 z-50 cursor-grabbing"
                                  )}
                                >
                                  {/* Selection UI */}
                                  {selectedIds.includes(block.id) && (
                                    <div className="absolute -top-3 left-6 px-3 py-1 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg z-20">
                                      Selected
                                    </div>
                                  )}
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
                                    {block.type === 'radio' || block.type === 'checkboxGroup' ? (
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
                                    ) : block.type === 'button' ? (
                                      <div className="pt-2">
                                        <div className="h-11 w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl flex items-center justify-center font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all">
                                          {block.label}
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
                                    ) : block.type === 'html' ? (
                                      <div className="min-h-[120px] bg-zinc-950 rounded-2xl p-5 font-mono text-[10px] text-emerald-500/80 leading-relaxed shadow-2xl border border-white/5 overflow-hidden group/html relative">
                                        <div className="absolute top-0 right-0 p-3 flex gap-2">
                                          <div className="w-2 h-2 rounded-full bg-rose-500/50" />
                                          <div className="w-2 h-2 rounded-full bg-amber-500/50" />
                                          <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
                                        </div>
                                        <span className="block text-indigo-400">&lt;div class="custom-card"&gt;</span>
                                        <span className="block pl-4">&lt;h1&gt{block.label}&lt;/h1&gt;</span>
                                        <span className="block pl-4 text-zinc-500">&lt;p&gt;Dynamic HTML content...&lt;/p&gt;</span>
                                        <span className="block text-indigo-400">&lt;/div&gt;</span>
                                      </div>
                                    ) : block.type === 'icon' ? (
                                      <div className="flex flex-col items-center justify-center gap-3 pt-4 pb-2">
                                        <div className="w-16 h-16 bg-indigo-500/10 rounded-3xl flex items-center justify-center text-indigo-600 border border-indigo-500/20 shadow-xl shadow-indigo-500/5">
                                          <Smile size={32} />
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
                                        <div className="h-14 border-b border-zinc-100 dark:border-zinc-900 flex items-center px-5 justify-between bg-white dark:bg-zinc-950">
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
                                        <div className="h-14 border-b border-zinc-100 dark:border-zinc-900 flex items-center px-2 bg-zinc-50/50 dark:bg-zinc-900/30">
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
                                    ) : block.type === 'datatable' ? (
                                      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
                                        <div className="h-14 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-900 flex items-center px-6 gap-8">
                                          {['Name', 'Category', 'Status', 'Date Modified'].map((col, i) => (
                                            <div key={i} className={cn("flex-1 text-[9px] font-black text-zinc-400 uppercase tracking-widest", i > 1 && "hidden md:block")}>{col}</div>
                                          ))}
                                        </div>
                                        <div className="divide-y divide-zinc-50 dark:divide-zinc-900">
                                          {[1, 2, 3, 4].map(row => (
                                            <div key={row} className="h-14 flex items-center px-6 gap-8 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                                              <div className="flex-1 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 font-bold text-[10px]">R{row}</div>
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
                                            <div className="w-6 h-6 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center"><ArrowLeftRight size={10} className="text-zinc-400 rotate-90" /></div>
                                            <div className="w-6 h-6 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-[10px] font-bold">1</div>
                                            <div className="w-6 h-6 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">2</div>
                                            <div className="w-6 h-6 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center"><ArrowLeftRight size={10} className="text-zinc-400 -rotate-90" /></div>
                                          </div>
                                        </div>
                                      </div>
                                    ) : block.type === 'duallist' ? (
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
                                          <button className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg"><ArrowLeftRight size={14} className="-rotate-90" /></button>
                                          <button className="w-8 h-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center text-zinc-400"><ArrowLeftRight size={14} className="rotate-90" /></button>
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
                                    ) : block.type === 'connector' ? (
                                      <div className="p-6 bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-white/10 shadow-xl dark:shadow-2xl relative overflow-hidden group/connector">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16 group-hover/connector:scale-150 transition-transform duration-700" />
                                        <div className="space-y-4 relative z-10">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                              <div className="w-10 h-10 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                                                <Zap size={20} />
                                              </div>
                                              <div>
                                                <h4 className="text-sm font-black text-zinc-900 dark:text-white tracking-tight uppercase">{block.label || 'Nexus Connector'}</h4>
                                                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest">Active Integration Block</p>
                                              </div>
                                            </div>
                                            <div className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full">
                                              <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Connected</span>
                                            </div>
                                          </div>
                                          <div className="h-px bg-zinc-100 dark:bg-white/5 w-full" />
                                          <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3 bg-zinc-50 dark:bg-white/5 rounded-2xl border border-zinc-100 dark:border-white/5">
                                               <span className="block text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase mb-1">Status</span>
                                               <div className="flex items-center gap-2">
                                                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                 <span className="text-[10px] font-black text-zinc-600 dark:text-zinc-300 uppercase">Live</span>
                                               </div>
                                            </div>
                                            <div className="p-3 bg-zinc-50 dark:bg-white/5 rounded-2xl border border-zinc-100 dark:border-white/5">
                                               <span className="block text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase mb-1">Latency</span>
                                               <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase">24ms</span>
                                            </div>
                                          </div>
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
                </div>
              </div>
            </>
          ) : activeTab === 'experience' ? (
            <div className="flex h-full w-full overflow-hidden bg-white dark:bg-zinc-950">
              {/* Experience Sidebar */}
              <aside className="w-72 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-zinc-50/50 dark:bg-transparent">
                <div className="p-8 pb-4">
                  <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-6">Views & Experience</h3>
                  <div className="space-y-2">
                    {[
                      { id: 'master', label: 'Master View', icon: TableProperties, desc: 'Table & List config' },
                      { id: 'detail', label: 'Detail View', icon: Layout, desc: 'Record page layout' },
                      { id: 'filters', label: 'Filters & Search', icon: Filter, desc: 'Global search & facets' },
                      { id: 'actions', label: 'Quick Actions', icon: MousePointerClick, desc: 'Buttons & Triggers' }
                    ].map((st) => (
                      <button 
                        key={st.id}
                        onClick={() => setExperienceSubTab(st.id as any)}
                        className={cn(
                          "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-left transition-all group",
                          experienceSubTab === st.id 
                            ? "bg-white dark:bg-zinc-900 shadow-xl shadow-indigo-500/5 border border-zinc-100 dark:border-zinc-800 text-indigo-600 dark:text-indigo-400" 
                            : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                          experienceSubTab === st.id ? "bg-indigo-500/10 text-indigo-500" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"
                        )}>
                          <st.icon size={18} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold">{st.label}</p>
                          <p className="text-[9px] font-medium opacity-60 truncate">{st.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </aside>

              {/* Experience Content */}
              <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                <div className="max-w-5xl mx-auto space-y-12 pb-20">
                  {experienceSubTab === 'master' ? (
                    <div className="space-y-12">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Master View Configuration</h2>
                          <p className="text-zinc-500 text-sm">Define how records are displayed in the main table or list view.</p>
                        </div>
                        <div className="flex items-center gap-3">
                           <select className="bg-zinc-100 dark:bg-zinc-900 border-none rounded-xl px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                             <option>Default Table View</option>
                             <option>Kanban Board</option>
                             <option>Calendar View</option>
                           </select>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-indigo-500/5">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-zinc-100 dark:border-zinc-800/50">
                              <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest w-1/3">Field</th>
                              <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Show in Table</th>
                              <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Inline Edit</th>
                              <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Column Width</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                            {layout.map((field) => (
                              <tr key={field.id} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                <td className="px-8 py-5">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                                      {(() => {
                                        const fieldDef = FIELD_CATEGORIES.flatMap(c => c.fields).find(f => f.id === field.type);
                                        const Icon = fieldDef?.icon || Table;
                                        return <Icon size={14} />;
                                      })()}
                                    </div>
                                    <span className="text-xs font-bold text-zinc-900 dark:text-white">{field.label}</span>
                                  </div>
                                </td>
                                <td className="px-8 py-5 text-center">
                                  <button 
                                    className={cn(
                                      "w-10 h-6 rounded-full relative transition-all mx-auto",
                                      field.showInTable !== false ? "bg-indigo-600" : "bg-zinc-200 dark:bg-zinc-800"
                                    )}
                                    onClick={() => updateField(field.id, { showInTable: field.showInTable === false })}
                                  >
                                    <div className={cn(
                                      "absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all",
                                      field.showInTable !== false ? "right-1" : "left-1"
                                    )} />
                                  </button>
                                </td>
                                <td className="px-8 py-5 text-center">
                                  <button 
                                    className={cn(
                                      "w-10 h-6 rounded-full relative transition-all mx-auto",
                                      field.inlineEdit ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-800"
                                    )}
                                    onClick={() => updateField(field.id, { inlineEdit: !field.inlineEdit })}
                                  >
                                    <div className={cn(
                                      "absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all",
                                      field.inlineEdit ? "right-1" : "left-1"
                                    )} />
                                  </button>
                                </td>
                                <td className="px-8 py-5">
                                  <div className="flex items-center gap-3">
                                    <input 
                                      type="range" 
                                      className="w-24 accent-indigo-500 h-1" 
                                      min="50" max="500" step="10"
                                      value={field.columnWidth || 200}
                                      onChange={(e) => updateField(field.id, { columnWidth: parseInt(e.target.value) })}
                                    />
                                    <span className="text-[10px] font-mono text-zinc-400">{field.columnWidth || 200}px</span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* View Options */}
                      <div className="grid grid-cols-2 gap-8">
                         <div className="p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] space-y-6">
                            <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">Table Density</h3>
                            <div className="grid grid-cols-3 gap-3">
                              {['Compact', 'Standard', 'Spacious'].map(d => (
                                <button key={d} className={cn(
                                  "px-4 py-3 rounded-xl border text-[9px] font-bold uppercase tracking-widest transition-all",
                                  d === 'Standard' ? "bg-indigo-600 border-indigo-500 text-white shadow-lg" : "bg-zinc-50 dark:bg-zinc-950 border-zinc-100 dark:border-zinc-800 text-zinc-500"
                                )}>{d}</button>
                              ))}
                            </div>
                         </div>
                         <div className="p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] space-y-6">
                            <div className="flex items-center justify-between">
                               <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">Pagination</h3>
                               <button 
                                 className={cn(
                                   "w-10 h-6 rounded-full relative transition-all",
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
                                   "absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all",
                                   interfaceSettings.master.pagination?.enabled ? "right-1" : "left-1"
                                 )} />
                               </button>
                            </div>
                            
                            <div className="flex items-center gap-4">
                               <div className="flex-1 space-y-2">
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Default Per Page</label>
                                  <select 
                                    value={interfaceSettings.master.pagination?.pageSize || 25}
                                    onChange={(e) => setInterfaceSettings(prev => ({
                                      ...prev,
                                      master: {
                                        ...prev.master,
                                        pagination: { ...prev.master.pagination, pageSize: parseInt(e.target.value) }
                                      }
                                    }))}
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-[10px] font-bold text-zinc-600"
                                  >
                                    {[10, 25, 50, 100].map(size => (
                                      <option key={size} value={size}>{size} records</option>
                                    ))}
                                  </select>
                               </div>
                               <div className="flex-1 space-y-2">
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Options</label>
                                  <div className="flex items-center gap-2">
                                     <div className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-[9px] font-bold text-zinc-500">10, 25, 50...</div>
                                     <button className="p-2 text-indigo-500 hover:bg-indigo-500/10 rounded-lg"><Settings2 size={14} /></button>
                                  </div>
                               </div>
                            </div>
                         </div>
                      </div>
                    </div>
                  ) : experienceSubTab === 'filters' ? (
                    <div className="space-y-12">
                      <div className="space-y-1">
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Global Filters & Search</h2>
                        <p className="text-zinc-500 text-sm">Configure the search experience and facets available to users.</p>
                      </div>

                      <div className="grid grid-cols-3 gap-8">
                        <div className="col-span-2 space-y-6">
                           <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">Active Filters</h3>
                           <div className="space-y-3">
                             {layout.filter(f => f.type === 'select' || f.type === 'date' || f.type === 'boolean').map((field, i) => (
                               <div key={i} className="flex items-center justify-between p-6 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2rem] group hover:border-indigo-500/30 transition-all">
                                 <div className="flex items-center gap-4">
                                   <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                     <Filter size={18} />
                                   </div>
                                   <div>
                                     <p className="text-sm font-bold text-zinc-900 dark:text-white">{field.label}</p>
                                     <p className="text-[10px] text-zinc-400 font-medium">Type: {field.type.toUpperCase()}</p>
                                   </div>
                                 </div>
                                 <div className="flex items-center gap-6">
                                   <div className="flex items-center gap-2">
                                     <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Multi-select</span>
                                     <button className="w-8 h-4 bg-zinc-200 dark:bg-zinc-800 rounded-full relative">
                                       <div className="absolute left-1 top-0.5 w-3 h-3 bg-white rounded-full" />
                                     </button>
                                   </div>
                                   <button className="p-2 text-zinc-300 hover:text-rose-500 transition-colors"><Trash2 size={14} /></button>
                                 </div>
                               </div>
                             ))}
                             <button className="w-full py-4 border-2 border-dashed border-zinc-100 dark:border-zinc-900 rounded-[2rem] text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] hover:border-indigo-500/50 hover:text-indigo-500 transition-all flex items-center justify-center gap-2">
                               <Plus size={14} />
                               Add Search Filter
                             </button>
                           </div>
                        </div>

                        <div className="space-y-8">
                           <div className="p-8 bg-indigo-600 rounded-[2.5rem] text-white space-y-6 shadow-2xl shadow-indigo-500/20">
                             <h4 className="text-xs font-black uppercase tracking-widest text-white/60">Search Logic</h4>
                             <div className="space-y-4">
                               <label className="flex items-center gap-3 cursor-pointer">
                                 <div className="w-4 h-4 bg-white/20 border border-white/40 rounded flex items-center justify-center"><CheckSquare size={12} className="text-white" /></div>
                                 <span className="text-xs font-bold">Enable Full-Text Search</span>
                               </label>
                               <label className="flex items-center gap-3 cursor-pointer">
                                 <div className="w-4 h-4 bg-white/20 border border-white/40 rounded" />
                                 <span className="text-xs font-bold text-white/60">Fuzzy Matching</span>
                               </label>
                             </div>
                           </div>
                        </div>
                      </div>
                    </div>
                  ) : experienceSubTab === 'actions' ? (
                    <div className="space-y-12">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Quick Actions & Commands</h2>
                          <p className="text-zinc-500 text-sm">Define custom buttons and automated actions for users in the master view.</p>
                        </div>
                        <button className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/20">
                          + New Action
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        {interfaceSettings.actions.map((action) => (
                          <div key={action.id} className="p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] group hover:border-indigo-500/50 transition-all">
                             <div className="flex items-center justify-between mb-8">
                                <div className="w-14 h-14 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:text-indigo-500 group-hover:bg-indigo-500/10 transition-all">
                                   <MousePointerClick size={24} />
                                </div>
                                <div className="flex gap-2">
                                  <button className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"><Settings2 size={16} /></button>
                                  <button className="p-2 text-zinc-400 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                                </div>
                             </div>
                             <div className="space-y-2">
                               <p className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">{action.label}</p>
                               <p className="text-xs text-zinc-500">Trigger: Row Command • Scope: Single Record</p>
                             </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-12">
                      <div className="space-y-1">
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Detail View Experience</h2>
                        <p className="text-zinc-500 text-sm">Configure how individual records are presented when opened.</p>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-8">
                         {[
                           { label: 'Tabbed Layout', desc: 'Standard hierarchical tabs for clean organization.', icon: Layers },
                           { label: 'Split View', desc: 'Two-column layout with sidebar and main content.', icon: Layout },
                           { label: 'Single Page', desc: 'Vertical scrolling view with distinct sections.', icon: AlignLeft }
                         ].map((l, i) => (
                           <div key={i} className={cn(
                             "p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] space-y-4 cursor-pointer hover:border-indigo-500/50 transition-all group",
                             i === 0 ? "border-indigo-500 shadow-xl shadow-indigo-500/5" : ""
                           )}>
                              <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center mb-4",
                                i === 0 ? "bg-indigo-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                              )}>
                                <l.icon size={24} />
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-bold text-zinc-900 dark:text-white">{l.label}</p>
                                <p className="text-[10px] text-zinc-500 leading-relaxed">{l.desc}</p>
                              </div>
                           </div>
                         ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === 'preview' ? (
            <div className="w-full px-8 pb-20">
              <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[32px] shadow-2xl overflow-hidden min-h-[600px]">
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
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                      <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">Live Testing Mode</span>
                    </div>
                  </div>
                </div>

                <div className="p-8">
                  {previewView === 'detail' ? (
                    <div className="space-y-8 max-w-5xl mx-auto py-12">
                      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-6">
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => setPreviewView('table')}
                            className="p-2.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-500 rounded-xl hover:text-indigo-600 transition-all"
                          >
                            <ArrowLeftRight size={16} className="rotate-180" />
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
                          <button className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/20">
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
                                "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                currentTabId === tab.id 
                                  ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" 
                                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                              )}
                            >
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
                            <FieldInput 
                              field={block}
                              value={moduleState[block.id]}
                              onChange={(val) => setModuleState(prev => ({ ...prev, [block.id]: val }))}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between px-2">
                        <div className="space-y-1">
                          <h3 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">{moduleSettings.name || 'Module'} Records</h3>
                          <p className="text-xs text-zinc-500">Previewing with {mockData.length} mock records generated from your schema.</p>
                        </div>
                        <button 
                          onClick={() => {
                            setPreviewView('create');
                            const createForm = forms.find(f => f.usage === 'workspace_create');
                            if (createForm?.isMultistep) {
                              const visibleSteps = createForm.steps.filter((s: any) => evaluateVisibilityRule(s.visibilityRule, moduleState));
                              if (visibleSteps.length > 0) setPreviewStepId(visibleSteps[0].id);
                            }
                          }}
                          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-all"
                        >
                          <Plus size={14} />
                          Create New
                        </button>
                      </div>

                      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-xl shadow-indigo-500/5">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-zinc-50/50 dark:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-800">
                                <th className="px-6 py-4 w-12 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest">#</th>
                                {layout.filter(f => f.showInTable !== false).slice(0, 5).map(f => (
                                  <th key={f.id} style={{ minWidth: f.columnWidth || 150 }} className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                    {f.label}
                                  </th>
                                ))}
                                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Created</th>
                                <th className="px-6 py-4 w-20"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                              {mockData.map((record, idx) => (
                                <tr 
                                  key={record.id} 
                                  onClick={() => {
                                    setPreviewSelectedId(record.id);
                                    setPreviewView('detail');
                                    setModuleState(record);
                                  }}
                                  className="group hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5 transition-all cursor-pointer"
                                >
                                  <td className="px-6 py-4 text-center text-[10px] font-mono text-zinc-400">{idx + 1}</td>
                                  {layout.filter(f => f.showInTable !== false).slice(0, 5).map(f => (
                                    <td key={f.id} className="px-6 py-4">
                                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                                        {f.type === 'boolean' ? (record[f.id] ? 'Yes' : 'No') : String(record[f.id])}
                                      </span>
                                    </td>
                                  ))}
                                  <td className="px-6 py-4">
                                    <span className="text-[10px] font-medium text-zinc-400">{new Date(record.createdAt).toLocaleDateString()}</span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
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
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Showing 1 to {Math.min(interfaceSettings.master.pagination?.pageSize || 25, mockData.length)} of {mockData.length} records</span>
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
                                                 <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">
                                                   {fObj.labelOverride || field?.label}
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
                                    
                                    // Check required
                                    if (fObj.required && (!val || (Array.isArray(val) && val.length === 0))) {
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
          ) : activeTab === 'schema' ? (
            <div className="flex h-full w-full overflow-hidden">
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
                <div className="max-w-6xl mx-auto space-y-8 pb-20">
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
                                {field.visibilityRule && <Eye size={12} className="text-indigo-500" title="Has Visibility Rules" />}
                                {field.calculationLogic && <Calculator size={12} className="text-emerald-500" title="Calculated Field" />}
                                {field.options && <ListPlus size={12} className="text-amber-500" title={`Has ${field.options.length} options`} />}
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
          ) : activeTab === 'details' ? (
            <div className="flex h-full w-full overflow-hidden">
              {/* Details Sidebar */}
              <aside className="w-72 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-2">
                <div className="mb-6 px-2">
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Configuration</h3>
                </div>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold transition-all text-left">
                  <Settings2 size={14} />
                  General Properties
                </button>
              </aside>

              {/* Details Content */}
              <div className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950 p-12 custom-scrollbar">
                <div className="max-w-6xl mx-auto space-y-12 pb-20">
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
          ) : activeTab === 'rules' ? (
            <div className="flex h-full w-full overflow-hidden">
              {/* Rules Sidebar */}
              <aside className="w-72 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-2">
                <div className="mb-6 px-2">
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Logic & Validation</h3>
                </div>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold transition-all text-left">
                  <ShieldCheck size={14} />
                  Validation Rules
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl text-xs font-bold transition-all text-left">
                  <Zap size={14} />
                  Automation Triggers
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl text-xs font-bold transition-all text-left">
                  <Lock size={14} />
                  Access Control
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl text-xs font-bold transition-all text-left">
                  <FileCode size={14} />
                  Advanced Logic
                </button>
              </aside>

              {/* Rules Content */}
              <div className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950 p-12 custom-scrollbar">
                <div className="max-w-6xl mx-auto space-y-12 pb-20">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Business Rules</h2>
                    <p className="text-zinc-500 text-sm">Define global validation, automation, and processing rules for this module.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {[
                      { title: 'Validation Rules', desc: 'Ensure data integrity with custom logic constraints.', icon: CheckSquare, count: 0 },
                      { title: 'Automation Triggers', desc: 'Execute actions when records are created or updated.', icon: Zap, count: 0 },
                      { title: 'Access Control', desc: 'Manage row-level security and field permissions.', icon: Lock, count: 2 }
                    ].map((card, i) => (
                      <div key={i} className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-4 hover:border-indigo-500/50 transition-all group">
                        <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                          <card.icon size={24} />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-zinc-900 dark:text-white">{card.title}</h4>
                          <p className="text-xs text-zinc-500 leading-relaxed">{card.desc}</p>
                        </div>
                        <div className="pt-2 flex items-center justify-between">
                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{card.count} Active</span>
                          <button className="text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-400">Configure</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-indigo-600 rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl shadow-indigo-500/20">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl -mr-32 -mt-32" />
                    <div className="relative z-10 space-y-6">
                      <div className="space-y-2">
                        <h3 className="text-xl font-black text-white tracking-tight">New Rule Discovery</h3>
                        <p className="text-white/70 text-sm max-w-xl">Our Shadow Architect can help you generate complex validation logic using natural language. Try describing a rule you need.</p>
                      </div>
                      <div className="flex gap-4">
                        <input 
                          type="text" 
                          placeholder="e.g. Total amount cannot exceed budget field by more than 10%..."
                          className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:bg-white/20 transition-all"
                        />
                        <button className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-xl">
                          Generate Rule
                        </button>
                      </div>
                    </div>
                  </div>
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
                <div className="max-w-6xl mx-auto space-y-12 pb-20">
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
                            <ArrowLeftRight size={14} />
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
                showGridlines={showGridlines}
              />
            </div>
          ) : activeTab === 'security' ? (
            <div className="flex h-full w-full bg-white dark:bg-zinc-950">
              {/* Roles Sidebar */}
              <aside className="w-72 border-r border-zinc-100 dark:border-zinc-900 flex flex-col bg-zinc-50/50 dark:bg-transparent">
                <div className="p-8 pb-4">
                  <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-6">Access Roles</h3>
                  <div className="space-y-2">
                    {[
                      { id: 'admin', label: 'Administrator', icon: ShieldCheck, color: 'text-indigo-500' },
                      { id: 'manager', label: 'Department Manager', icon: Settings, color: 'text-emerald-500' },
                      { id: 'staff', label: 'Standard Staff', icon: Type, color: 'text-amber-500' },
                      { id: 'guest', label: 'External Guest', icon: Globe, color: 'text-zinc-400' }
                    ].map((role) => (
                      <button 
                        key={role.id}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left",
                          role.id === 'admin' ? "bg-white dark:bg-zinc-900 shadow-xl shadow-indigo-500/5 border border-zinc-100 dark:border-zinc-800 text-zinc-900 dark:text-white" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                        )}
                      >
                        <role.icon size={14} className={role.color} />
                        {role.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-auto p-8 pt-0">
                  <button className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2">
                    <Plus size={12} />
                    New Role
                  </button>
                </div>
              </aside>

              {/* Permissions Content */}
              <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                <div className="max-w-5xl mx-auto space-y-12">
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
          ) : activeTab === 'localization' ? (
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
                <div className="max-w-5xl mx-auto space-y-12">
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
          ) : activeTab === 'map' ? (
            <div className="h-full w-full bg-zinc-900 relative overflow-hidden flex items-center justify-center">
              {/* Dependency Grid Background */}
              {showGridlines && (
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
                  style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} 
                />
              )}
              
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
          ) : activeTab === 'assets' ? (
            <div className="flex-1 overflow-y-auto p-12 bg-white dark:bg-zinc-950 custom-scrollbar">
              <div className="max-w-6xl mx-auto space-y-12">
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
          ) : activeTab === 'forms' ? (
            <div className="flex h-full w-full bg-white dark:bg-zinc-950 overflow-hidden">
               {/* Form Management Sidebar (Left) */}
               <aside className="w-80 border-r border-zinc-100 dark:border-zinc-900 flex flex-col bg-zinc-50/50 dark:bg-transparent">
                <div className="p-8 pb-4">
                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Module Forms</h3>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-500/10 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest">
                      <Zap size={10} />
                      AI Build
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 space-y-3">
                    {forms.map((form) => (
                      <div 
                        key={form.id}
                        onClick={() => {
                          setSelectedFormId(form.id);
                          setSelectedFieldInFormId(null);
                        }}
                        className={cn(
                          "w-full p-5 rounded-3xl transition-all text-left border-2 group cursor-pointer",
                          selectedFormId === form.id 
                            ? "bg-white dark:bg-zinc-900 border-indigo-500 shadow-xl shadow-indigo-500/5" 
                            : "bg-transparent border-transparent hover:border-zinc-200 dark:hover:border-zinc-800"
                        )}
                      >
                        <div className="flex items-center justify-between mb-3">
                           <span className={cn(
                             "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter",
                             form.id === selectedFormId ? "bg-indigo-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                           )}>
                             {form.usage?.split('_')[1] || 'custom'}
                           </span>
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               if (form.id === 'default-create') return;
                               setForms(prev => prev.filter(f => f.id !== form.id));
                               if (selectedFormId === form.id) setSelectedFormId('default-create');
                             }}
                             className="p-1.5 text-zinc-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                           >
                             <Trash2 size={12} />
                           </button>
                        </div>
                        <p className={cn("text-xs font-bold", selectedFormId === form.id ? "text-zinc-900 dark:text-white" : "text-zinc-500")}>{form.name}</p>
                        <div className="mt-2 flex items-center gap-2">
                           <div className="flex items-center gap-1 text-[9px] font-medium text-zinc-400">
                              <Layout size={10} className={form.id === selectedFormId ? "text-indigo-500" : ""} />
                              {form.fields?.length || 0} Components
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-8 border-t border-zinc-100 dark:border-zinc-900">
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
                      className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-3 hover:bg-indigo-500 transition-all"
                    >
                      <Plus size={14} />
                      Create New Form
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
                                 const isAdded = selectedForm.isMultistep ? (selectedForm.steps || []).some((s: any) => s.fields.some((f: any) => f.id === field.id)) : (selectedForm.fields || []).some((f: any) => f.id === field.id);
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
                                         const newFieldObj = { id: field.id, labelOverride: field.label, width: 'full' };
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
                     <aside className="w-80 border-l border-zinc-100 dark:border-zinc-900 bg-white dark:bg-zinc-950 p-8 overflow-y-auto custom-scrollbar">
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
                                          const newFields = [...selectedForm.fields];
                                          newFields[fObjIdx] = { ...fObj, labelOverride: e.target.value };
                                          setForms(prev => prev.map(f => f.id === selectedFormId ? { ...f, fields: newFields } : f));
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
                                          const newFields = [...selectedForm.fields];
                                          newFields[fObjIdx] = { ...fObj, placeholderOverride: e.target.value };
                                          setForms(prev => prev.map(f => f.id === selectedFormId ? { ...f, fields: newFields } : f));
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
                                                const newFields = [...selectedForm.fields];
                                                newFields[fObjIdx] = { ...fObj, width: w };
                                                setForms(prev => prev.map(f => f.id === selectedFormId ? { ...f, fields: newFields } : f));
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
                                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Required</span>
                                          <div 
                                            onClick={() => {
                                              const newFields = [...selectedForm.fields];
                                              newFields[fObjIdx] = { ...fObj, required: !fObj.required };
                                              setForms(prev => prev.map(f => f.id === selectedFormId ? { ...f, fields: newFields } : f));
                                            }}
                                            className={cn(
                                              "h-5 w-9 rounded-full relative cursor-pointer transition-colors",
                                              fObj.required ? "bg-indigo-600" : "bg-zinc-200 dark:bg-zinc-800"
                                            )}
                                          >
                                            <div className={cn("absolute top-1 h-3 w-3 rounded-full bg-white shadow-sm transition-all", fObj.required ? "right-1" : "left-1")} />
                                          </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Read Only</span>
                                          <div 
                                            onClick={() => {
                                              const newFields = [...selectedForm.fields];
                                              newFields[fObjIdx] = { ...fObj, readOnly: !fObj.readOnly };
                                              setForms(prev => prev.map(f => f.id === selectedFormId ? { ...f, fields: newFields } : f));
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
                                              const newFields = [...selectedForm.fields];
                                              newFields[fObjIdx] = { ...fObj, height: e.target.value };
                                              setForms(prev => prev.map(f => f.id === selectedFormId ? { ...f, fields: newFields } : f));
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
                                              const newFields = [...selectedForm.fields];
                                              newFields[fObjIdx] = { ...fObj, visibility: { ...fObj.visibility, fieldId: e.target.value } };
                                              setForms(prev => prev.map(f => f.id === selectedFormId ? { ...f, fields: newFields } : f));
                                            }}
                                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-[11px] text-zinc-900 dark:text-white focus:outline-none"
                                          >
                                            <option value="">Always Visible</option>
                                            {selectedForm.fields
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
                                                  const newFields = [...selectedForm.fields];
                                                  newFields[fObjIdx] = { ...fObj, visibility: { ...fObj.visibility, operator: e.target.value } };
                                                  setForms(prev => prev.map(f => f.id === selectedFormId ? { ...f, fields: newFields } : f));
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
                                                  const newFields = [...selectedForm.fields];
                                                  newFields[fObjIdx] = { ...fObj, visibility: { ...fObj.visibility, value: e.target.value } };
                                                  setForms(prev => prev.map(f => f.id === selectedFormId ? { ...f, fields: newFields } : f));
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
                                                const newFields = [...selectedForm.fields];
                                                newFields[fObjIdx] = { ...fObj, validation: { ...fObj.validation, pattern: e.target.value } };
                                                setForms(prev => prev.map(f => f.id === selectedFormId ? { ...f, fields: newFields } : f));
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
                                                const newFields = [...selectedForm.fields];
                                                newFields[fObjIdx] = { ...fObj, validation: { ...fObj.validation, errorMessage: e.target.value } };
                                                setForms(prev => prev.map(f => f.id === selectedFormId ? { ...f, fields: newFields } : f));
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
                                       const newFields = selectedForm.fields.filter((_: any, i: number) => i !== fObjIdx);
                                       setForms(prev => prev.map(f => f.id === selectedFormId ? { ...f, fields: newFields } : f));
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
                  {selectedIds.length > 1 ? (
                    <motion.div 
                      key="bulk-edit"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="p-6 space-y-8"
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
                                  <button onClick={() => updateFields(selectedIds, { required: true })} className="px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded text-[9px] font-bold uppercase tracking-widest">On</button>
                                  <button onClick={() => updateFields(selectedIds, { required: false })} className="px-2 py-1 bg-rose-500/10 text-rose-600 rounded text-[9px] font-bold uppercase tracking-widest">Off</button>
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
                  ) : selectedField ? (
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

                      {(selectedField.type === 'select' || selectedField.type === 'radio' || selectedField.type === 'checkboxGroup' || selectedField.type === 'buttonGroup' || selectedField.type === 'duallist' || selectedField.type === 'stepper' || selectedField.type === 'timeline') && (
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
                        <div className="space-y-4">
                          <div className="flex items-center justify-between px-1">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Nested Elements</label>
                            {selectedField.type === 'repeatableGroup' && (
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-zinc-400 uppercase">View:</span>
                                <select 
                                  value={selectedField.variant || 'table'}
                                  onChange={(e) => updateField(selectedField.id, { variant: e.target.value })}
                                  className="bg-zinc-100 dark:bg-zinc-800 border-none rounded-md px-2 py-0.5 text-[9px] font-bold text-zinc-600 dark:text-zinc-400 focus:ring-0"
                                >
                                  <option value="table">Table</option>
                                  <option value="list">Master/Detail</option>
                                </select>
                              </div>
                            )}
                          </div>
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
                                  required: false
                                }];
                                updateField(selectedField.id, { fields: newFields });
                              }}
                              className="w-full py-2 border border-dashed border-zinc-800 rounded-xl text-[10px] font-bold text-zinc-500 hover:text-indigo-400 hover:border-indigo-500/50 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                              <Plus size={14} />
                              Add Nested Element
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
                            {modules.map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {selectedField.type === 'sub_module' && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Target Collection</label>
                            <select 
                              value={selectedField.targetModuleId || ''}
                              onChange={(e) => updateField(selectedField.id, { targetModuleId: e.target.value })}
                              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                            >
                              <option value="">Select Module...</option>
                              {modules.filter(m => m.id !== id).map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </select>
                          </div>
                          <p className="text-[9px] text-zinc-600 italic px-1">This will render a mirrored view of records from the selected module that are associated with this parent.</p>
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
                            <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl space-y-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-500">
                                  <Zap size={14} />
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-tight">Handshake Verified</p>
                                  <p className="text-[9px] text-zinc-500">Ready to snap into layout</p>
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

      <NexusSelectionModal 
        isOpen={showConnectorModal}
        onClose={() => setShowConnectorModal(false)}
        activeConnectors={activeConnectors}
        registry={connectorRegistry}
        onSelect={(conn) => {
          if (selectedField) {
            updateField(selectedField.id, { 
              connectorId: conn.connectorId,
              label: conn.displayName
            });
            
            const fullConnector = connectorRegistry.find(c => c.id === conn.connectorId);
            if (fullConnector) {
              setConfigConnector({ ...fullConnector, connectorId: conn.connectorId });
              setConfigDrawerOpen(true);
            }
          }
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
    </div>
  );
};

export default ModuleEditor;
