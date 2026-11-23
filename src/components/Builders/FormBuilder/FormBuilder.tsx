import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Minus,
  Trash2,
  Settings,
  Settings2,
  Eye,
  EyeOff,
  GripVertical,
  FileText,
  Save,
  Calculator,
  Sliders,
  RefreshCw,
  Lock,
  Layout,
  Folder,
  Type,
  Maximize2,
  Code,
  AlertTriangle,
  ListOrdered,
  X,
  Info,
  Copy,
  Check,
  ExternalLink,
  Globe,
  Zap,
  ShieldCheck,
  Sparkles,
  MousePointer2,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Hash,
  Calendar,
  CheckSquare,
  Upload,
  PenTool,
  Star,
  AlignLeft,
  List,
  DollarSign,
  Link2,
  UserCheck,
  Database,
  Download,
  BarChart3,
  Clock,
  CreditCard,
  Search,
  ChevronDown,
  Layers,
  Monitor,
  Tablet,
  Smartphone,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import {
  ModuleField,
  StandaloneBuilderContext,
  FormEntity,
  FormUsageType,
  FieldType,
} from '../../../types/platform';
import { Button } from '../../UI/Primitives';
import { FormRenderer } from './FormRenderer';
import { CalculatorModal } from '../../Builder/CalculatorModal';
import { ConditionModal } from '../../Builder/ConditionModal';
import { PublicFormPublishModal } from '../../Builder/PublicFormPublishModal';
import { cn, flattenFields } from '../../../lib/utils';
import {
  CanonicalFormDefinition,
  FormFieldPlacement,
  FORM_USAGE_MODES,
  getUsageModeMeta,
  extractPaletteFields,
  getSystemMetaFields,
  getUnifiedFieldDefinition,
  resolveContainerChildFields,
  GroupedModuleFields,
  normalizeFormSchema,
  toFormEntityPayload,
  widthToGridClass,
} from '../../../lib/formFieldUtils';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../../config';
import { usePlatform } from '../../../hooks/usePlatform';
import { useAuth } from '../../../hooks/useAuth';
import { PLATFORM_MODULES } from '../../../config/platformModules';

export interface FormBuilderProps {
  // Standalone / Global / Modal mode props
  initialForm?: Partial<FormEntity> | any;
  builderContext?: StandaloneBuilderContext;
  onSave?: (form: FormEntity) => void;
  onDirtyChange?: (isDirty: boolean) => void;

  // Embedded Module Editor mode props (when inside ModuleEditor -> Forms tab)
  mode?: 'global' | 'in_context' | 'module_embedded';
  forms?: any[];
  onFormsChange?: (updater: (prev: any[]) => any[]) => void;
  selectedFormId?: string | null;
  onSelectFormId?: (id: string | null) => void;
  moduleId?: string;
  moduleName?: string;
  moduleLayout?: any[];
  workflow?: any;
  isRestricted?: boolean;
  onPromoteFieldToModule?: (field: ModuleField) => void;
}

const STANDALONE_FIELD_TYPES: Array<{
  type: FieldType;
  label: string;
  icon: any;
  defaultOptions?: string[];
}> = [
  { type: 'text', label: 'Short Text', icon: Type },
  { type: 'longText', label: 'Long Text', icon: AlignLeft },
  { type: 'email', label: 'Email', icon: Mail },
  { type: 'phone', label: 'Phone', icon: Phone },
  { type: 'number', label: 'Number', icon: Hash },
  { type: 'currency', label: 'Currency', icon: DollarSign },
  { type: 'date', label: 'Date', icon: Calendar },
  { type: 'select', label: 'Dropdown', icon: List, defaultOptions: ['Option 1', 'Option 2', 'Option 3'] },
  { type: 'checkbox', label: 'Checkbox / Consent', icon: CheckSquare },
  { type: 'file', label: 'File Upload', icon: Upload },
  { type: 'signature', label: 'E-Signature', icon: PenTool },
  { type: 'rating', label: 'Rating / Score', icon: Star },
];

interface SortableCanvasFieldProps {
  fObj: FormFieldPlacement;
  isSelected: boolean;
  moduleLayout: any[];
  workflow?: any;
  customFields: ModuleField[];
  availableFieldsToAdd?: Array<{ id: string; label: string; type: string; groupLabel?: string }>;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdatePlacement?: (fieldId: string, updates: Partial<FormFieldPlacement>) => void;
  onAddFieldToContainer?: (containerId: string, fieldId: string) => void;
  onCreateSubFieldInContainer?: (containerId: string) => void;
  onRemoveFieldFromContainer?: (containerId: string, subFieldId: string, moveToCanvas?: boolean) => void;
  isRestricted?: boolean;
  viewportMode?: 'desktop' | 'tablet' | 'mobile';
}

const WIDTH_CYCLE_ORDER: Array<'full' | 'two-thirds' | 'half' | 'one-third' | 'one-quarter'> = [
  'full',
  'two-thirds',
  'half',
  'one-third',
  'one-quarter',
];

const SortableCanvasField: React.FC<SortableCanvasFieldProps> = ({
  fObj,
  isSelected,
  moduleLayout,
  workflow,
  customFields,
  availableFieldsToAdd = [],
  onSelect,
  onDelete,
  onUpdatePlacement,
  onAddFieldToContainer,
  onCreateSubFieldInContainer,
  onRemoveFieldFromContainer,
  isRestricted,
  viewportMode = 'desktop',
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: fObj.id,
    disabled: isRestricted,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const isVisual =
    String(fObj.id || '').startsWith('visual-') ||
    ['heading', 'divider', 'spacer', 'html-text', 'alert'].includes(fObj.type || '');

  const fieldDef = isVisual
    ? null
    : getUnifiedFieldDefinition(fObj.id, moduleLayout, workflow, customFields);

  const effectiveType = fieldDef?.type || fObj.type || 'text';
  const isRepeater = effectiveType === 'repeatableGroup';
  const isFieldGroup = ['fieldGroup', 'group', 'card', 'accordion'].includes(effectiveType);

  const containerSubFields: any[] = useMemo(() => {
    if (!isRepeater && !isFieldGroup) return [];
    return resolveContainerChildFields(fObj, fieldDef, moduleLayout, workflow, customFields);
  }, [isRepeater, isFieldGroup, fObj, fieldDef, moduleLayout, workflow, customFields]);

  const isCustomField = Boolean(!isVisual && customFields.some((cf) => cf.id === fObj.id));
  const colClass =
    viewportMode === 'mobile'
      ? 'col-span-12'
      : viewportMode === 'tablet'
      ? fObj.width === 'one-quarter' ||
        fObj.width === '3' ||
        fObj.width === 3 ||
        fObj.width === 'one-third' ||
        fObj.width === '4' ||
        fObj.width === 4
        ? 'col-span-12 sm:col-span-6'
        : widthToGridClass(fObj.width)
      : widthToGridClass(fObj.width);

  const widthLabel =
    fObj.width === 'half' || fObj.width === '6'
      ? '1/2'
      : fObj.width === 'two-thirds' || fObj.width === '8'
      ? '2/3'
      : fObj.width === 'one-third' || fObj.width === '4'
      ? '1/3'
      : fObj.width === 'one-quarter' || fObj.width === '3'
      ? '1/4'
      : 'Full';

  const normalizedWidthKey =
    fObj.width === 'half' || fObj.width === '6'
      ? 'half'
      : fObj.width === 'two-thirds' || fObj.width === '8'
      ? 'two-thirds'
      : fObj.width === 'one-third' || fObj.width === '4'
      ? 'one-third'
      : fObj.width === 'one-quarter' || fObj.width === '3'
      ? 'one-quarter'
      : 'full';

  const handleCycleWidth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdatePlacement || isRestricted) return;
    const idx = WIDTH_CYCLE_ORDER.indexOf(normalizedWidthKey);
    const nextWidth = WIDTH_CYCLE_ORDER[(idx + 1) % WIDTH_CYCLE_ORDER.length];
    onUpdatePlacement(fObj.id, { width: nextWidth });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(fObj.id)}
      className={cn(
        colClass,
        'group relative p-3.5 rounded-2xl border transition-all cursor-pointer select-none',
        isDragging && 'opacity-50 scale-[1.01] shadow-2xl',
        isSelected
          ? 'bg-indigo-50/40 dark:bg-indigo-950/25 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
          : isRepeater
          ? 'bg-violet-50/30 dark:bg-violet-950/15 border-violet-300/70 dark:border-violet-800/60 hover:border-violet-500'
          : isFieldGroup
          ? 'bg-indigo-50/20 dark:bg-indigo-950/10 border-indigo-200/80 dark:border-indigo-800/50 hover:border-indigo-400'
          : 'bg-zinc-50/60 dark:bg-zinc-900/50 border-zinc-200/80 dark:border-zinc-800 hover:border-indigo-400/50',
        fObj.hidden && 'opacity-60 border-dashed'
      )}
    >
      {/* Adaptive Card Header — Field Label always has full priority without truncation on narrow columns */}
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-2">
        <div className="flex items-center gap-1.5 min-w-[110px] flex-1">
          {!isRestricted && (
            <div
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
              className="p-0.5 -ml-1 text-zinc-400 hover:text-indigo-500 cursor-grab active:cursor-grabbing rounded-lg shrink-0"
              title="Drag to reorder"
            >
              <GripVertical size={13} />
            </div>
          )}

          {isVisual ? (
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
              {fObj.type}
            </span>
          ) : (
            <span
              className="text-xs font-bold text-zinc-900 dark:text-white leading-tight flex items-center gap-1.5"
              title={fObj.labelOverride || fieldDef?.label || fObj.id}
            >
              {isRepeater && <ListOrdered size={13} className="text-violet-500 shrink-0" />}
              {isFieldGroup && <Folder size={13} className="text-indigo-500 shrink-0" />}
              <span className="break-words">{fObj.labelOverride || fieldDef?.label || fObj.id}</span>
            </span>
          )}

          {!isVisual && (fObj.required || fieldDef?.required) && (
            <span className="text-rose-500 font-bold text-xs shrink-0">*</span>
          )}
        </div>

        {/* Compact Status & Quick-Resize Badges */}
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          {isRepeater && (
            <span className="px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[9px] font-bold uppercase">
              Repeater (1:N)
            </span>
          )}
          {isFieldGroup && (
            <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold uppercase">
              Field Group
            </span>
          )}
          {fieldDef?.isSystemMeta && (
            <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[9px] font-bold uppercase">
              Meta
            </span>
          )}
          {isCustomField && !fieldDef?.isSystemMeta && !isRepeater && !isFieldGroup && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold uppercase">
              Custom
            </span>
          )}
          {fObj.readOnly && (
            <span
              className="p-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-500"
              title="Read-Only"
            >
              <Lock size={10} />
            </span>
          )}
          {fObj.hidden && (
            <span
              className="p-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400"
              title="Hidden Field (Populated via prefill/context)"
            >
              <EyeOff size={10} />
            </span>
          )}
          {fObj.visibilityRule && (
            <span
              className="p-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400"
              title="Conditional Visibility Rule Active"
            >
              <Zap size={10} />
            </span>
          )}
          {(fObj.calculationLogic || fieldDef?.calculationLogic) && (
            <span
              className="p-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
              title="Calculation Formula Active"
            >
              <Calculator size={10} />
            </span>
          )}
          {fObj.prefill && fObj.prefill.source !== 'none' && (
            <span
              className="px-1 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[8px] font-bold uppercase"
              title={`Prefill: ${fObj.prefill.source}`}
            >
              Prefill
            </span>
          )}
          <button
            type="button"
            onClick={handleCycleWidth}
            title="Click to cycle column width (Full → 2/3 → 1/2 → 1/3 → 1/4)"
            className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 hover:bg-indigo-500/20 hover:text-indigo-600 dark:hover:text-indigo-400 text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer"
          >
            {widthLabel}
          </button>
          {!isVisual && !isRepeater && !isFieldGroup && (
            <span className="text-[8px] font-mono font-bold px-1 py-0.5 rounded bg-zinc-200/60 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 uppercase">
              {effectiveType}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(fObj.id);
            }}
            className="p-0.5 text-zinc-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
            title="Remove from form"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Field Preview Representation */}
      {isVisual ? (
        <div className="py-1">
          {fObj.type === 'heading' && (
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-1">
              {fObj.labelOverride || 'Section Heading'}
            </h4>
          )}
          {fObj.type === 'divider' && (
            <div className="h-px bg-zinc-300 dark:bg-zinc-700 w-full my-2" />
          )}
          {fObj.type === 'spacer' && (
            <div
              className="flex items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg text-[9px] font-mono text-zinc-400 uppercase"
              style={{
                height:
                  fObj.height === 'sm'
                    ? 20
                    : fObj.height === 'lg'
                    ? 48
                    : fObj.height === 'xl'
                    ? 64
                    : 32,
              }}
            >
              Vertical Spacer ({fObj.height || 'md'})
            </div>
          )}
          {(fObj.type === 'html-text' || fObj.type === 'html') && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {fObj.labelOverride || 'Instructional text block...'}
            </p>
          )}
          {fObj.type === 'alert' && (
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-medium flex items-center gap-2">
              <Info size={14} />
              <span>{fObj.labelOverride || 'Important callout notice'}</span>
            </div>
          )}
        </div>
      ) : isRepeater ? (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelect(fObj.id);
          }}
          className="mt-2 rounded-xl border border-violet-200/80 dark:border-violet-800/60 bg-white dark:bg-zinc-950 p-3 space-y-2.5"
        >
          {containerSubFields.length > 0 ? (
            <div
              className={cn(
                'grid gap-2',
                viewportMode === 'mobile' ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'
              )}
            >
              {containerSubFields.map((sf: any) => (
                <div
                  key={sf.id}
                  className="group/sub relative p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 hover:border-violet-400 transition-colors"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 truncate">
                      {sf.label}
                      {sf.required && <span className="text-rose-500 ml-0.5">*</span>}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[8px] font-mono uppercase text-zinc-400">
                        {sf.type}
                      </span>
                      {onRemoveFieldFromContainer && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveFieldFromContainer(fObj.id, sf.id, false);
                          }}
                          className="p-0.5 text-zinc-400 hover:text-rose-500 rounded transition-colors cursor-pointer"
                          title="Remove column from repeater"
                        >
                          <X size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 h-5 rounded bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800 px-1.5 flex items-center text-[9px] text-zinc-400">
                    Row item...
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-zinc-400 text-center py-3 border border-dashed border-violet-200 dark:border-violet-800/50 rounded-xl">
              No repeater columns yet — click any field in the Left Palette or use the picker below to add columns.
            </div>
          )}

          {/* Inline Add Column Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-1.5">
              {onAddFieldToContainer && availableFieldsToAdd.length > 0 && (
                <select
                  value=""
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    e.stopPropagation();
                    if (e.target.value) {
                      onAddFieldToContainer(fObj.id, e.target.value);
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 text-[10px] font-bold focus:outline-none cursor-pointer"
                >
                  <option value="">+ Add Existing Field as Column...</option>
                  {availableFieldsToAdd.map((af) => (
                    <option key={af.id} value={af.id}>
                      {af.groupLabel ? `[${af.groupLabel}] ` : ''}
                      {af.label} ({af.type})
                    </option>
                  ))}
                </select>
              )}
              {onCreateSubFieldInContainer && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateSubFieldInContainer(fObj.id);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Plus size={11} />
                  <span>New Column</span>
                </button>
              )}
            </div>

            <span className="text-[10px] text-zinc-400 font-medium">
              {containerSubFields.length} sub-columns
              {typeof fObj.minRows === 'number' && fObj.minRows > 0 ? ` • Min ${fObj.minRows} rows` : ''}
              {typeof fObj.maxRows === 'number' && fObj.maxRows > 0 ? ` • Max ${fObj.maxRows} rows` : ''}
            </span>
          </div>
        </div>
      ) : isFieldGroup ? (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelect(fObj.id);
          }}
          className="mt-2 rounded-xl border border-indigo-200/70 dark:border-indigo-800/50 bg-white dark:bg-zinc-950 p-3 space-y-2.5"
        >
          {containerSubFields.length > 0 ? (
            <div
              className={cn(
                'grid gap-2',
                viewportMode === 'mobile' ? 'grid-cols-1' : 'grid-cols-2'
              )}
            >
              {containerSubFields.map((sf: any) => (
                <div
                  key={sf.id}
                  className="group/sub relative p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 hover:border-indigo-400 transition-colors"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 truncate">
                      {sf.label}
                      {sf.required && <span className="text-rose-500 ml-0.5">*</span>}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-500">
                        {sf.type}
                      </span>
                      {onRemoveFieldFromContainer && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveFieldFromContainer(fObj.id, sf.id, true);
                            }}
                            className="p-0.5 text-zinc-400 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                            title="Move field out of group onto main canvas"
                          >
                            <ExternalLink size={10} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveFieldFromContainer(fObj.id, sf.id, false);
                            }}
                            className="p-0.5 text-zinc-400 hover:text-rose-500 rounded transition-colors cursor-pointer"
                            title="Remove field from group"
                          >
                            <X size={11} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-zinc-400 text-center py-3 border border-dashed border-indigo-200 dark:border-indigo-800/50 rounded-xl">
              Empty Field Group — while this group is selected, click any field in the Left Palette or use the picker below to add fields into this group.
            </div>
          )}

          {/* Inline Add Field to Group Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-1.5">
              {onAddFieldToContainer && availableFieldsToAdd.length > 0 && (
                <select
                  value=""
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    e.stopPropagation();
                    if (e.target.value) {
                      onAddFieldToContainer(fObj.id, e.target.value);
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold focus:outline-none cursor-pointer"
                >
                  <option value="">+ Add Field into Group...</option>
                  {availableFieldsToAdd.map((af) => (
                    <option key={af.id} value={af.id}>
                      {af.groupLabel ? `[${af.groupLabel}] ` : ''}
                      {af.label} ({af.type})
                    </option>
                  ))}
                </select>
              )}
              {onCreateSubFieldInContainer && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateSubFieldInContainer(fObj.id);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Plus size={11} />
                  <span>New Custom Sub-Field</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-[10px] text-zinc-400">
              <span>{containerSubFields.length} grouped fields</span>
              <span>•</span>
              <span>{fObj.collapsible !== false ? 'Collapsible' : 'Static'}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-9 bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 rounded-xl px-3 flex items-center justify-between text-xs text-zinc-400 pointer-events-none">
          <span className="truncate">
            {fObj.placeholderOverride ||
              fieldDef?.placeholder ||
              `Enter ${(fObj.labelOverride || fieldDef?.label || 'value').toLowerCase()}...`}
          </span>
          {fieldDef?.options && Array.isArray(fieldDef.options) && (
            <span className="text-[10px] font-mono text-zinc-400 shrink-0 ml-2">
              {fieldDef.options.length} options
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export const FormBuilder: React.FC<FormBuilderProps> = ({
  initialForm,
  builderContext = { mode: 'global' },
  onSave,
  onDirtyChange,
  mode: explicitMode,
  forms: externalForms,
  onFormsChange,
  selectedFormId: externalSelectedFormId,
  onSelectFormId,
  moduleId: propModuleId,
  moduleName: propModuleName,
  moduleLayout: propModuleLayout,
  workflow: propWorkflow,
  isRestricted = false,
  onPromoteFieldToModule,
}) => {
  const effectiveMode = explicitMode || builderContext.mode || 'global';
  const isModuleEmbedded = effectiveMode === 'module_embedded';

  const { tenant, modules, user: platformUser } = usePlatform();
  const { session } = useAuth();
  const token = session?.access_token;

  // In standalone mode, we manage a single canonical form state (or derive from initialForm).
  // In module_embedded mode, we read/write directly to externalForms via onFormsChange.
  const [internalForm, setInternalForm] = useState<CanonicalFormDefinition>(() =>
    normalizeFormSchema(
      initialForm || {
        name: 'Untitled Form',
        moduleId: propModuleId || builderContext.parentModuleId,
        usage: propModuleId || builderContext.parentModuleId ? 'workspace_create' : 'public_link',
      },
      propModuleId || builderContext.parentModuleId
    )
  );

  const [internalSelectedFormId, setInternalSelectedFormId] = useState<string | null>(
    externalSelectedFormId || externalForms?.[0]?.id || null
  );

  const activeFormId = isModuleEmbedded
    ? externalSelectedFormId ?? internalSelectedFormId
    : internalForm.id;

  const setActiveFormId = (id: string | null) => {
    if (onSelectFormId) onSelectFormId(id);
    setInternalSelectedFormId(id);
  };

  // Resolve active CanonicalFormDefinition
  const activeForm: CanonicalFormDefinition = useMemo(() => {
    if (isModuleEmbedded && externalForms) {
      const found = externalForms.find((f) => f.id === activeFormId) || externalForms[0];
      return normalizeFormSchema(found, propModuleId);
    }
    return internalForm;
  }, [isModuleEmbedded, externalForms, activeFormId, internalForm, propModuleId]);

  const isInitializedRef = React.useRef(false);

  // Sync when initialForm prop changes in standalone mode
  useEffect(() => {
    if (!isModuleEmbedded && initialForm) {
      const norm = normalizeFormSchema(
        initialForm,
        propModuleId || builderContext.parentModuleId
      );
      setInternalForm(norm);
      setCurrentStepId(norm.steps[0]?.id || 'step-1');
    }
    const timer = setTimeout(() => {
      isInitializedRef.current = true;
      onDirtyChange?.(false);
    }, 100);
    return () => clearTimeout(timer);
  }, [initialForm, isModuleEmbedded, propModuleId, builderContext.parentModuleId]);

  // Unified updater for the active form
  const updateActiveForm = (
    updater: (prev: CanonicalFormDefinition) => CanonicalFormDefinition
  ) => {
    if (isInitializedRef.current) {
      onDirtyChange?.(true);
    }
    if (isModuleEmbedded && onFormsChange) {
      onFormsChange((prevForms) =>
        prevForms.map((rawF) => {
          if (rawF.id !== activeForm.id) return rawF;
          const norm = normalizeFormSchema(rawF, propModuleId);
          const next = updater(norm);
          return {
            ...rawF,
            ...next,
            description: next.description || next.settings?.description || '',
            settings: {
              ...next.settings,
              description: next.description || next.settings?.description || '',
            },
          };
        })
      );
    } else {
      setInternalForm((prev) => updater(prev));
    }
  };

  // Resolve associated module, layout, and workflow
  const effectiveModuleId = activeForm.moduleId || propModuleId || builderContext.parentModuleId || '';
  const associatedModule = useMemo(() => {
    if (!effectiveModuleId) return null;
    return (modules || []).find((m: any) => m.id === effectiveModuleId) || null;
  }, [modules, effectiveModuleId]);

  const resolvedModuleLayout = useMemo(() => {
    if (propModuleLayout && propModuleLayout.length > 0) return propModuleLayout;
    if (associatedModule) {
      return (
        associatedModule.layout ||
        (associatedModule as any).config?.layout ||
        associatedModule.fields ||
        []
      );
    }
    return [];
  }, [propModuleLayout, associatedModule]);

  const resolvedWorkflow = useMemo(() => {
    if (propWorkflow) return propWorkflow;
    if (associatedModule) {
      return (
        (associatedModule as any).workflow ||
        (associatedModule as any).config?.workflow ||
        ((associatedModule as any).workflows && (associatedModule as any).workflows[0])
      );
    }
    return undefined;
  }, [propWorkflow, associatedModule]);

  const resolvedModuleName =
    propModuleName || associatedModule?.name || activeForm.moduleName || 'Module';

  // UI state
  const [viewMode, setViewMode] = useState<'editor' | 'preview' | 'submissions' | 'settings'>('editor');
  const [currentStepId, setCurrentStepId] = useState<string>(
    activeForm.steps?.[0]?.id || 'step-1'
  );
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [paletteSection, setPaletteSection] = useState<'module' | 'custom'>('module');
  const [paletteSearch, setPaletteSearch] = useState('');
  const [hideAddedFields, setHideAddedFields] = useState(false);
  const [formSettingsTab, setFormSettingsTab] = useState<'general' | 'ecosystem' | 'governance'>(
    'general'
  );
  const [fieldInspectorTab, setFieldInspectorTab] = useState<'layout' | 'logic'>('layout');
  const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [showFormsManagerModal, setShowFormsManagerModal] = useState(false);
  const [formsModalSearch, setFormsModalSearch] = useState('');
  const [formsModalPurposeFilter, setFormsModalPurposeFilter] = useState<string>('all');
  const [saving, setSaving] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const workflowStageOptions = useMemo(() => {
    const nodes = resolvedWorkflow?.nodes;
    if (Array.isArray(nodes) && nodes.length > 0) {
      const stages = nodes
        .filter(
          (n: any) =>
            n.type === 'STATUS' || n.type === 'START' || n.type === 'END' || n.isStage || n.name
        )
        .map((n: any) => String(n.name || n.label || n.id).trim())
        .filter(Boolean);
      if (stages.length > 0) return Array.from(new Set(stages));
    }
    return ['New', 'In Progress', 'Under Review', 'Approved', 'Completed', 'Escalated'];
  }, [resolvedWorkflow]);

  const handleCreateNewModuleForm = () => {
    if (!isModuleEmbedded || !externalForms || !onFormsChange) return;
    const hasCreateForm = externalForms.some((f) => f.usage === 'workspace_create');
    const newForm = normalizeFormSchema(
      {
        id: `form-${Date.now()}`,
        name: hasCreateForm ? 'New Intake / Action Form' : 'Create Record Form',
        usage: hasCreateForm ? 'public_link' : 'workspace_create',
        isMultistep: false,
        fields: [],
        settings: {
          requireLogin: hasCreateForm ? false : true,
          submitLabel: hasCreateForm ? 'Submit' : 'Create Record',
          workspaceButtonLabel: hasCreateForm ? undefined : 'Create',
        },
      },
      propModuleId
    );
    onFormsChange((prev) => [...prev, newForm]);
    setActiveFormId(newForm.id);
    setSelectedItemId(null);
    toast.success(`Created "${newForm.name}"`);
  };

  const handleCloneActiveForm = () => {
    const clonedId = `form-${Date.now()}`;
    const clonedUsage: FormUsageType =
      activeForm.usage === 'workspace_create' || activeForm.usage === 'workspace_edit'
        ? 'action_trigger'
        : activeForm.usage;
    const cloned = normalizeFormSchema(
      {
        ...JSON.parse(JSON.stringify(activeForm)),
        id: clonedId,
        name: `${activeForm.name} (Copy)`,
        title: `${activeForm.name} (Copy)`,
        usage: clonedUsage,
      },
      propModuleId
    );

    if (isModuleEmbedded && onFormsChange) {
      onFormsChange((prev) => [...prev, cloned]);
      setActiveFormId(cloned.id);
      setSelectedItemId(null);
      toast.success(`Cloned "${activeForm.name}"`);
    } else {
      setInternalForm(cloned);
      toast.success(`Cloned "${activeForm.name}" into editor`);
    }
  };

  // Submissions & Drafts Analytics State
  const [submissionsData, setSubmissionsData] = useState<{
    submissions: any[];
    drafts: any[];
    stats: {
      totalSubmissions: number;
      activeDrafts: number;
      completionRate: number;
      lastSubmittedAt: string | null;
    };
  }>({
    submissions: [],
    drafts: [],
    stats: { totalSubmissions: 0, activeDrafts: 0, completionRate: 100, lastSubmittedAt: null },
  });
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [submissionSearch, setSubmissionSearch] = useState('');
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);

  const fetchFormSubmissions = React.useCallback(async () => {
    if (!tenant?.id || !activeForm.id) return;
    setLoadingSubmissions(true);
    try {
      const headers: Record<string, string> = {
        'x-tenant-id': tenant.id,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const qs = effectiveModuleId ? `?moduleId=${encodeURIComponent(effectiveModuleId)}` : '';
      const res = await fetch(
        `${API_BASE_URL}/api/forms/${encodeURIComponent(activeForm.id)}/submissions${qs}`,
        { headers }
      );
      if (res.ok) {
        const json = await res.json();
        setSubmissionsData({
          submissions: Array.isArray(json.submissions) ? json.submissions : [],
          drafts: Array.isArray(json.drafts) ? json.drafts : [],
          stats: json.stats || {
            totalSubmissions: 0,
            activeDrafts: 0,
            completionRate: 100,
            lastSubmittedAt: null,
          },
        });
      }
    } catch {
      // ignore
    } finally {
      setLoadingSubmissions(false);
    }
  }, [tenant?.id, token, activeForm.id, effectiveModuleId]);

  useEffect(() => {
    if (viewMode === 'submissions') {
      fetchFormSubmissions();
    }
  }, [viewMode, fetchFormSubmissions]);

  const handleExportSubmissionsCsv = () => {
    const rows = submissionsData.submissions;
    if (rows.length === 0) {
      toast.info('No submissions to export yet.');
      return;
    }
    const fieldIds = allAvailableFieldsForModals.map((f) => f.id);
    const headers = ['Reference', 'Submitted By', 'Email', 'Status', 'Source', 'Submitted At', ...fieldIds];
    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };
    const csvLines = [
      headers.map(escapeCsv).join(','),
      ...rows.map((r) =>
        [
          r.customerRef,
          r.submittedBy,
          r.email,
          r.status,
          r.source,
          r.createdAt,
          ...fieldIds.map((fid) => r.data?.[fid] ?? ''),
        ]
          .map(escapeCsv)
          .join(',')
      ),
    ];
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_submissions.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} submissions to CSV!`);
  };

  const handlePromoteCustomFieldToModule = async (customField: ModuleField) => {
    if (!effectiveModuleId && !onPromoteFieldToModule) {
      toast.error('Bind this form to a module first to promote custom fields to a module schema.');
      return;
    }

    if (onPromoteFieldToModule) {
      onPromoteFieldToModule(customField);
      updateActiveForm((prev) => ({
        ...prev,
        customFields: (prev.customFields || []).filter((cf) => cf.id !== customField.id),
      }));
      toast.success(`Promoted "${customField.label}" to ${resolvedModuleName} schema!`);
      return;
    }

    if (associatedModule && tenant?.id) {
      try {
        const currentLayout =
          associatedModule.layout || (associatedModule as any).config?.layout || [];
        if (currentLayout.some((f: any) => f.id === customField.id)) {
          toast.info('This field already exists on the module layout.');
          return;
        }
        const nextLayout = [...currentLayout, customField];
        const res = await fetch(`${API_BASE_URL}/api/data/modules/${effectiveModuleId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': tenant.id,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            ...associatedModule,
            layout: nextLayout,
            config: {
              ...((associatedModule as any).config || {}),
              layout: nextLayout,
            },
          }),
        });
        if (res.ok) {
          toast.success(`Saved "${customField.label}" permanently to ${resolvedModuleName} schema!`);
        } else {
          toast.error('Failed to update module schema.');
        }
      } catch {
        toast.error('Failed to promote field to module schema.');
      }
    }
  };

  // Modals
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [conditionTarget, setConditionTarget] = useState<{
    targetId: string;
    targetType: 'field' | 'step';
    label: string;
    rule: any;
  } | null>(null);

  // Real Cross-Builder Integrations (Validation Rulesets & Document Templates)
  const [validationRulesets, setValidationRulesets] = useState<any[]>([]);
  const [documentTemplates, setDocumentTemplates] = useState<any[]>([]);

  useEffect(() => {
    if (!tenant?.id) return;
    const headers: Record<string, string> = {
      'x-tenant-id': tenant.id,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    fetch(`${API_BASE_URL}/api/validations`, { headers })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setValidationRulesets(data);
      })
      .catch(() => {});

    fetch(`${API_BASE_URL}/api/templates`, { headers })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : Array.isArray(data?.templates) ? data.templates : [];
        setDocumentTemplates(list);
      })
      .catch(() => {});
  }, [tenant?.id, token]);

  // Keep currentStepId in sync when switching forms
  useEffect(() => {
    if (activeForm.steps && activeForm.steps.length > 0) {
      const exists = activeForm.steps.some((s) => s.id === currentStepId);
      if (!exists) {
        setCurrentStepId(activeForm.steps[0].id);
      }
    }
  }, [activeForm.id, activeForm.steps, currentStepId]);

  const { ungroupedFields, groups, repeatableGroups } = useMemo(
    () => extractPaletteFields(resolvedModuleLayout),
    [resolvedModuleLayout]
  );
  const systemMetaFields = useMemo(
    () => getSystemMetaFields(resolvedWorkflow),
    [resolvedWorkflow]
  );

  const allAvailableFieldsForModals = useMemo(() => {
    const flat = flattenFields(resolvedModuleLayout);
    const map = new Map<string, any>();
    [...flat, ...systemMetaFields, ...(activeForm.customFields || [])].forEach((f) => {
      if (f && f.id && !map.has(f.id)) map.set(f.id, f);
    });
    return Array.from(map.values());
  }, [resolvedModuleLayout, systemMetaFields, activeForm.customFields]);

  const allLeafCandidateFieldsForContainers = useMemo(() => {
    const containerTypes = ['repeatableGroup', 'fieldGroup', 'group', 'card', 'accordion'];
    const visualTypes = ['heading', 'divider', 'spacer', 'html-text', 'html', 'alert'];
    const list: Array<{ id: string; label: string; type: string; groupLabel?: string }> = [];
    const seen = new Set<string>();

    const pushIfLeaf = (f: any, groupLabel?: string) => {
      if (!f || !f.id || seen.has(f.id)) return;
      if (containerTypes.includes(f.type) || visualTypes.includes(f.type)) return;
      if (String(f.id).startsWith('visual-')) return;
      seen.add(f.id);
      list.push({
        id: f.id,
        label: f.label || f.name || f.id,
        type: f.type || 'text',
        groupLabel,
      });
    };

    ungroupedFields.forEach((f) => pushIfLeaf(f, 'Module'));
    groups.forEach((g) => (g.fields || []).forEach((f) => pushIfLeaf(f, g.label)));
    systemMetaFields.forEach((m) => pushIfLeaf(m, 'Record Meta'));
    (activeForm.customFields || []).forEach((cf) => {
      pushIfLeaf(cf, 'Custom');
      if (Array.isArray(cf.fields)) {
        cf.fields.forEach((sf) => pushIfLeaf(sf, cf.label));
      }
    });

    return list;
  }, [ungroupedFields, groups, systemMetaFields, activeForm.customFields]);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const currentStep = useMemo(() => {
    if (!activeForm.isMultistep) return null;
    return (
      activeForm.steps.find((s) => s.id === currentStepId) || activeForm.steps[0] || null
    );
  }, [activeForm.isMultistep, activeForm.steps, currentStepId]);

  const currentCanvasPlacements: FormFieldPlacement[] = useMemo(() => {
    if (activeForm.isMultistep) {
      return currentStep?.fields || [];
    }
    return activeForm.fields || [];
  }, [activeForm.isMultistep, currentStep, activeForm.fields]);

  const isContainerPlacement = (fObj: FormFieldPlacement | null | undefined): boolean => {
    if (!fObj) return false;
    const def = getUnifiedFieldDefinition(
      fObj.id,
      resolvedModuleLayout,
      resolvedWorkflow,
      activeForm.customFields
    );
    const t = def?.type || fObj.type || '';
    return ['repeatableGroup', 'fieldGroup', 'group', 'card', 'accordion'].includes(t);
  };

  const activeContainerPlacement = useMemo(() => {
    if (!selectedItemId) return null;
    const found = currentCanvasPlacements.find((f) => f.id === selectedItemId);
    if (found && isContainerPlacement(found)) return found;
    return null;
  }, [selectedItemId, currentCanvasPlacements, resolvedModuleLayout, resolvedWorkflow, activeForm.customFields]);

  const getContainerIncludedIds = (fObj: FormFieldPlacement): string[] => {
    if (Array.isArray(fObj.includedSubFieldIds)) return fObj.includedSubFieldIds;
    const def = getUnifiedFieldDefinition(
      fObj.id,
      resolvedModuleLayout,
      resolvedWorkflow,
      activeForm.customFields
    );
    const rawChildren: any[] = Array.isArray(def?.fields) ? def.fields : [];
    return rawChildren.map((c: any) => c.id);
  };

  const isFieldInCurrentForm = (fieldId: string): boolean => {
    const allPlacements = activeForm.isMultistep
      ? activeForm.steps.flatMap((s) => s.fields || [])
      : activeForm.fields || [];
    return allPlacements.some((f) => {
      if (f.id === fieldId) return true;
      if (isContainerPlacement(f)) {
        const inc = getContainerIncludedIds(f);
        return inc.includes(fieldId);
      }
      return false;
    });
  };

  const updateCurrentStepOrFields = (
    transformList: (list: FormFieldPlacement[]) => FormFieldPlacement[]
  ) => {
    updateActiveForm((prev) => {
      if (prev.isMultistep) {
        const targetStepId = currentStep?.id || prev.steps[0]?.id;
        const nextSteps = prev.steps.map((s) =>
          s.id === targetStepId ? { ...s, fields: transformList(s.fields || []) } : s
        );
        return {
          ...prev,
          steps: nextSteps,
          fields: nextSteps.flatMap((s) => s.fields || []),
        };
      }
      const nextFields = transformList(prev.fields || []);
      return {
        ...prev,
        fields: nextFields,
        steps: [{ id: 'step-1', title: 'Step 1', fields: nextFields }],
      };
    });
  };

  const handleAddExistingFieldToContainer = (containerId: string, fieldId: string) => {
    if (!containerId || !fieldId || containerId === fieldId) return;
    updateCurrentStepOrFields((list) => {
      // Remove loose top-level placement of fieldId if it was sitting on the canvas
      const cleaned = list.filter((fo) => fo.id !== fieldId);
      return cleaned.map((fo) => {
        if (fo.id !== containerId) return fo;
        const currentIds = getContainerIncludedIds(fo);
        if (currentIds.includes(fieldId)) return fo;
        return {
          ...fo,
          includedSubFieldIds: [...currentIds, fieldId],
        };
      });
    });
    const addedDef = getUnifiedFieldDefinition(
      fieldId,
      resolvedModuleLayout,
      resolvedWorkflow,
      activeForm.customFields
    );
    toast.success(`Added "${addedDef?.label || fieldId}" into group`);
  };

  const handleRemoveSubFieldFromContainer = (
    containerId: string,
    subFieldId: string,
    moveToRootCanvas = false
  ) => {
    const subDef = getUnifiedFieldDefinition(
      subFieldId,
      resolvedModuleLayout,
      resolvedWorkflow,
      activeForm.customFields
    );
    updateCurrentStepOrFields((list) => {
      const nextList = list.map((fo) => {
        if (fo.id !== containerId) return fo;
        const currentIds = getContainerIncludedIds(fo);
        return {
          ...fo,
          includedSubFieldIds: currentIds.filter((id) => id !== subFieldId),
        };
      });
      if (moveToRootCanvas && !nextList.some((fo) => fo.id === subFieldId)) {
        nextList.push({
          id: subFieldId,
          type: subDef?.type,
          labelOverride: subDef?.label || subFieldId,
          width: 'full',
          required: Boolean(subDef?.required),
        });
      }
      return nextList;
    });
    if (moveToRootCanvas) {
      toast.success(`Moved "${subDef?.label || subFieldId}" to main canvas`);
    }
  };

  const handleCreateNewSubFieldInContainer = (
    containerId: string,
    type: FieldType = 'text',
    label = 'Field',
    defaultOptions?: string[]
  ) => {
    const subId = `${containerId}_sub_${Date.now().toString(36)}`;
    const newSubField: ModuleField = {
      id: subId,
      label: `New ${label}`,
      type,
      required: false,
      options: defaultOptions ? [...defaultOptions] : undefined,
      colSpan: 6,
    };

    updateActiveForm((prev) => {
      const isCustomContainer = (prev.customFields || []).some((cf) => cf.id === containerId);
      const nextCustomFields = isCustomContainer
        ? (prev.customFields || []).map((cf) =>
            cf.id === containerId
              ? { ...cf, fields: [...(cf.fields || []), newSubField] }
              : cf
          )
        : [...(prev.customFields || []), newSubField];

      const updateList = (list: FormFieldPlacement[]) =>
        list.map((fo) => {
          if (fo.id !== containerId) return fo;
          const currentIds = getContainerIncludedIds(fo);
          return {
            ...fo,
            includedSubFieldIds: [...currentIds, subId],
          };
        });

      if (prev.isMultistep) {
        const nextSteps = prev.steps.map((s) => ({
          ...s,
          fields: updateList(s.fields || []),
        }));
        return {
          ...prev,
          customFields: nextCustomFields,
          steps: nextSteps,
          fields: nextSteps.flatMap((s) => s.fields || []),
        };
      }

      const nextFields = updateList(prev.fields || []);
      return {
        ...prev,
        customFields: nextCustomFields,
        fields: nextFields,
        steps: [{ id: 'step-1', title: 'Step 1', fields: nextFields }],
      };
    });
  };

  const handleToggleSingleField = (
    fieldId: string,
    fieldLabel: string,
    fieldRequired = false
  ) => {
    // If a Field Group or Repeater is currently selected on the canvas, toggle the field INSIDE that group!
    if (activeContainerPlacement && activeContainerPlacement.id !== fieldId) {
      const currentIds = getContainerIncludedIds(activeContainerPlacement);
      if (currentIds.includes(fieldId)) {
        handleRemoveSubFieldFromContainer(activeContainerPlacement.id, fieldId, false);
      } else {
        handleAddExistingFieldToContainer(activeContainerPlacement.id, fieldId);
      }
      return;
    }

    const isAddedTopLevel = (activeForm.isMultistep
      ? activeForm.steps.flatMap((s) => s.fields || [])
      : activeForm.fields || []
    ).some((f) => f.id === fieldId);

    if (isAddedTopLevel) {
      updateActiveForm((prev) => {
        if (prev.isMultistep) {
          const nextSteps = prev.steps.map((s) => ({
            ...s,
            fields: (s.fields || []).filter((fo) => fo.id !== fieldId),
          }));
          return {
            ...prev,
            steps: nextSteps,
            fields: nextSteps.flatMap((s) => s.fields),
          };
        }
        const nextFields = (prev.fields || []).filter((fo) => fo.id !== fieldId);
        return {
          ...prev,
          fields: nextFields,
          steps: [{ id: 'step-1', title: 'Step 1', fields: nextFields }],
        };
      });
      if (selectedItemId === fieldId) setSelectedItemId(null);
    } else {
      const newPlacement: FormFieldPlacement = {
        id: fieldId,
        labelOverride: fieldLabel,
        width: 'full',
        required: fieldRequired,
      };
      updateCurrentStepOrFields((list) => [...list, newPlacement]);
      setSelectedItemId(fieldId);
    }
  };

  const handleToggleGroupContainer = (group: GroupedModuleFields) => {
    const isAdded = isFieldInCurrentForm(group.id);
    if (isAdded) {
      handleDeleteFieldFromForm(group.id);
    } else {
      const newPlacement: FormFieldPlacement = {
        id: group.id,
        type: 'fieldGroup',
        labelOverride: group.label,
        width: 'full',
        collapsible: true,
        defaultCollapsed: false,
        includedSubFieldIds: group.fields.map((f) => f.id),
      };
      updateCurrentStepOrFields((list) => [...list, newPlacement]);
      setSelectedItemId(group.id);
    }
  };

  const handleToggleRepeater = (rep: GroupedModuleFields) => {
    const isAdded = isFieldInCurrentForm(rep.id);
    if (isAdded) {
      handleDeleteFieldFromForm(rep.id);
    } else {
      const newPlacement: FormFieldPlacement = {
        id: rep.id,
        type: 'repeatableGroup',
        labelOverride: rep.label,
        width: 'full',
        collapsible: true,
        defaultCollapsed: false,
        minRows: 0,
        addRowLabel: 'Add Item',
        includedSubFieldIds: rep.fields.map((f) => f.id),
      };
      updateCurrentStepOrFields((list) => [...list, newPlacement]);
      setSelectedItemId(rep.id);
    }
  };

  const handleAddStandaloneContainer = (containerType: 'fieldGroup' | 'repeatableGroup') => {
    const isRep = containerType === 'repeatableGroup';
    const newId = `cf_${isRep ? 'repeater' : 'group'}_${Date.now().toString(36)}`;
    const defaultSubFields: ModuleField[] = isRep
      ? [
          {
            id: `${newId}_col1`,
            label: 'Item Description',
            type: 'text',
            required: true,
            colSpan: 6,
          },
          {
            id: `${newId}_col2`,
            label: 'Quantity / Amount',
            type: 'number',
            required: false,
            colSpan: 6,
          },
        ]
      : [];

    const newCustomContainer: ModuleField = {
      id: newId,
      label: isRep ? 'New Repeatable Sub-Table' : 'New Field Group Section',
      type: containerType,
      required: false,
      colSpan: 12,
      fields: defaultSubFields,
    };

    const newPlacement: FormFieldPlacement = {
      id: newId,
      type: containerType,
      labelOverride: newCustomContainer.label,
      width: 'full',
      collapsible: true,
      defaultCollapsed: false,
      minRows: isRep ? 0 : undefined,
      addRowLabel: isRep ? 'Add Row' : undefined,
      includedSubFieldIds: defaultSubFields.map((sf) => sf.id),
    };

    updateActiveForm((prev) => {
      const nextCustomFields = [...(prev.customFields || []), newCustomContainer];
      if (prev.isMultistep) {
        const targetStepId = currentStep?.id || prev.steps[0]?.id;
        const nextSteps = prev.steps.map((s) =>
          s.id === targetStepId ? { ...s, fields: [...(s.fields || []), newPlacement] } : s
        );
        return {
          ...prev,
          customFields: nextCustomFields,
          steps: nextSteps,
          fields: nextSteps.flatMap((s) => s.fields || []),
        };
      }
      const nextFields = [...(prev.fields || []), newPlacement];
      return {
        ...prev,
        customFields: nextCustomFields,
        fields: nextFields,
        steps: [{ id: 'step-1', title: 'Step 1', fields: nextFields }],
      };
    });
    setSelectedItemId(newId);
  };

  const handleToggleGroup = (group: GroupedModuleFields) => {
    const childIds = group.fields.map((f) => f.id);
    const allAdded = childIds.length > 0 && childIds.every((id) => isFieldInCurrentForm(id));

    if (allAdded) {
      updateActiveForm((prev) => {
        if (prev.isMultistep) {
          const nextSteps = prev.steps.map((s) => ({
            ...s,
            fields: (s.fields || []).filter((fo) => !childIds.includes(fo.id)),
          }));
          return {
            ...prev,
            steps: nextSteps,
            fields: nextSteps.flatMap((s) => s.fields),
          };
        }
        const nextFields = (prev.fields || []).filter((fo) => !childIds.includes(fo.id));
        return {
          ...prev,
          fields: nextFields,
          steps: [{ id: 'step-1', title: 'Step 1', fields: nextFields }],
        };
      });
      if (selectedItemId && childIds.includes(selectedItemId)) {
        setSelectedItemId(null);
      }
    } else {
      updateCurrentStepOrFields((list) => {
        const existingIds = new Set(list.map((fo) => fo.id));
        const toAdd: FormFieldPlacement[] = group.fields
          .filter((cf) => !existingIds.has(cf.id))
          .map((cf) => ({
            id: cf.id,
            labelOverride: cf.label,
            width: 'full',
            required: Boolean(cf.required),
          }));
        return [...list, ...toAdd];
      });
    }
  };

  const handleAddStandaloneCustomField = (
    type: FieldType,
    label: string,
    defaultOptions?: string[]
  ) => {
    if (activeContainerPlacement) {
      handleCreateNewSubFieldInContainer(
        activeContainerPlacement.id,
        type,
        label,
        defaultOptions
      );
      toast.success(
        `Added new ${label} into "${activeContainerPlacement.labelOverride || activeContainerPlacement.id}"`
      );
      return;
    }

    const newId = `cf_${type}_${Date.now().toString(36)}`;
    const newCustomField: ModuleField = {
      id: newId,
      label: `New ${label}`,
      type,
      required: false,
      options: defaultOptions ? [...defaultOptions] : undefined,
      colSpan: 12,
    };
    const newPlacement: FormFieldPlacement = {
      id: newId,
      type,
      labelOverride: newCustomField.label,
      width: 'full',
      required: false,
    };

    updateActiveForm((prev) => {
      const nextCustomFields = [...(prev.customFields || []), newCustomField];
      if (prev.isMultistep) {
        const targetStepId = currentStep?.id || prev.steps[0]?.id;
        const nextSteps = prev.steps.map((s) =>
          s.id === targetStepId ? { ...s, fields: [...(s.fields || []), newPlacement] } : s
        );
        return {
          ...prev,
          customFields: nextCustomFields,
          steps: nextSteps,
          fields: nextSteps.flatMap((s) => s.fields || []),
        };
      }
      const nextFields = [...(prev.fields || []), newPlacement];
      return {
        ...prev,
        customFields: nextCustomFields,
        fields: nextFields,
        steps: [{ id: 'step-1', title: 'Step 1', fields: nextFields }],
      };
    });
    setSelectedItemId(newId);
  };

  const handleAddVisualElement = (visualType: 'heading' | 'divider' | 'spacer' | 'html-text' | 'alert') => {
    const visualId = `visual-${visualType}-${Date.now().toString(36)}`;
    const newVisual: FormFieldPlacement = {
      id: visualId,
      type: visualType,
      labelOverride:
        visualType === 'heading'
          ? 'Section Heading'
          : visualType === 'html-text'
          ? 'Provide instructions or guidance for this section...'
          : visualType === 'alert'
          ? 'Important notice for applicants'
          : '',
      width: 'full',
      height: visualType === 'spacer' ? 'md' : undefined,
      alertStyle: visualType === 'alert' ? 'info' : undefined,
    };
    updateCurrentStepOrFields((list) => [...list, newVisual]);
    setSelectedItemId(visualId);
  };

  const handleUpdateFieldPlacement = (
    fieldId: string,
    updates: Partial<FormFieldPlacement>
  ) => {
    updateActiveForm((prev) => {
      if (prev.isMultistep) {
        const nextSteps = prev.steps.map((s) => ({
          ...s,
          fields: (s.fields || []).map((fo) =>
            fo.id === fieldId ? { ...fo, ...updates } : fo
          ),
        }));
        return {
          ...prev,
          steps: nextSteps,
          fields: nextSteps.flatMap((s) => s.fields),
        };
      }
      const nextFields = (prev.fields || []).map((fo) =>
        fo.id === fieldId ? { ...fo, ...updates } : fo
      );
      return {
        ...prev,
        fields: nextFields,
        steps: [{ id: 'step-1', title: 'Step 1', fields: nextFields }],
      };
    });
  };

  const handleUpdateCustomFieldDef = (
    fieldId: string,
    updates: Partial<ModuleField>
  ) => {
    updateActiveForm((prev) => ({
      ...prev,
      customFields: (prev.customFields || []).map((cf) =>
        cf.id === fieldId ? { ...cf, ...updates } : cf
      ),
    }));
  };

  const handleDeleteFieldFromForm = (fieldId: string) => {
    updateActiveForm((prev) => {
      if (prev.isMultistep) {
        const nextSteps = prev.steps.map((s) => ({
          ...s,
          fields: (s.fields || []).filter((fo) => fo.id !== fieldId),
        }));
        return {
          ...prev,
          steps: nextSteps,
          fields: nextSteps.flatMap((s) => s.fields),
        };
      }
      const nextFields = (prev.fields || []).filter((fo) => fo.id !== fieldId);
      return {
        ...prev,
        fields: nextFields,
        steps: [{ id: 'step-1', title: 'Step 1', fields: nextFields }],
      };
    });
    if (selectedItemId === fieldId) setSelectedItemId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    updateCurrentStepOrFields((list) => {
      const oldIndex = list.findIndex((i) => i.id === active.id);
      const newIndex = list.findIndex((i) => i.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return list;
      return arrayMove(list, oldIndex, newIndex);
    });
  };

  const handleSyncAllModuleFields = () => {
    const allModuleFields = [...groups.flatMap((g) => g.fields), ...ungroupedFields];
    if (allModuleFields.length === 0) {
      toast.info('No data fields found on the associated module layout.');
      return;
    }
    const missing = allModuleFields.filter((mf) => !isFieldInCurrentForm(mf.id));
    if (missing.length === 0) {
      toast.info('All module fields are already included on this form.');
      return;
    }
    const placements: FormFieldPlacement[] = missing.map((mf) => ({
      id: mf.id,
      labelOverride: mf.label,
      width: 'full',
      required: Boolean(mf.required),
    }));
    updateCurrentStepOrFields((list) => [...list, ...placements]);
    toast.success(`Added ${placements.length} fields from ${resolvedModuleName}`);
  };

  const handleSaveStandaloneForm = async () => {
    setSaving(true);
    try {
      const payload = toFormEntityPayload(
        activeForm,
        tenant?.id || 't1',
        resolvedModuleLayout,
        resolvedWorkflow
      );
      const isExistingPersistedId = Boolean(
        initialForm?.id &&
          !String(initialForm.id).startsWith('form_') &&
          !String(initialForm.id).startsWith('form-')
      );

      const res = await fetch(
        `${API_BASE_URL}/api/forms${isExistingPersistedId ? `/${initialForm!.id}` : ''}`,
        {
          method: isExistingPersistedId ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': tenant?.id || '',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        const saved = await res.json();
        toast.success(`Form "${saved.name}" saved!`);
        if (builderContext.onSaveSuccess) builderContext.onSaveSuccess(saved.id, saved);
        if (onSave) onSave(saved);
      } else {
        throw new Error('Server returned an error saving form');
      }
      onDirtyChange?.(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  // Determine what is selected in the Right Inspector
  const selectedStep = useMemo(() => {
    if (!selectedItemId || !activeForm.isMultistep) return null;
    return activeForm.steps.find((s) => s.id === selectedItemId) || null;
  }, [selectedItemId, activeForm.isMultistep, activeForm.steps]);

  const selectedPlacement = useMemo(() => {
    if (!selectedItemId || selectedStep) return null;
    return currentCanvasPlacements.find((f) => f.id === selectedItemId) || null;
  }, [selectedItemId, selectedStep, currentCanvasPlacements]);

  const selectedFieldDef = useMemo(() => {
    if (!selectedPlacement) return null;
    const isVisual =
      String(selectedPlacement.id || '').startsWith('visual-') ||
      ['heading', 'divider', 'spacer', 'html-text', 'alert'].includes(selectedPlacement.type || '');
    if (isVisual) return null;
    return getUnifiedFieldDefinition(
      selectedPlacement.id,
      resolvedModuleLayout,
      resolvedWorkflow,
      activeForm.customFields
    );
  }, [selectedPlacement, resolvedModuleLayout, resolvedWorkflow, activeForm.customFields]);

  const selectedCustomField = useMemo(() => {
    if (!selectedPlacement) return null;
    return (activeForm.customFields || []).find((cf) => cf.id === selectedPlacement.id) || null;
  }, [selectedPlacement, activeForm.customFields]);

  const usageMeta = getUsageModeMeta(activeForm.usage);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.aurora.io';
  const publicShareUrl = effectiveModuleId
    ? `${origin}/portal?moduleId=${effectiveModuleId}&formId=${activeForm.id}`
    : `${origin}/public/forms/${activeForm.id}`;

  const renderTopToolbar = () => (
      <div className="h-11 flex items-center justify-between gap-3 px-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        {/* Left: Collapse Toggle + Form Switcher + Purpose/Module Selectors */}
        <div className="flex items-center gap-2 min-w-0">
          {viewMode === 'editor' && isLeftCollapsed && (
            <>
              <button
                type="button"
                onClick={() => setIsLeftCollapsed(false)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                title="Expand fields panel"
              >
                <ChevronRight size={14} />
                <span className="hidden sm:inline">Fields</span>
              </button>
              <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 shrink-0" />
            </>
          )}

          {isModuleEmbedded && externalForms ? (
            <button
              type="button"
              onClick={() => setShowFormsManagerModal(true)}
              className="group flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer min-w-0"
              title={`Switch or manage module forms (${externalForms.length} total)`}
            >
              <FileText size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="text-xs font-semibold text-zinc-900 dark:text-white truncate max-w-[180px]">
                {activeForm.name}
              </span>
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0',
                  usageMeta.badgeClass
                )}
              >
                {usageMeta.shortLabel}
              </span>
              <span className="text-[11px] text-zinc-400 font-normal shrink-0">
                ({externalForms.length})
              </span>
              <ChevronDown
                size={13}
                className="text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 shrink-0 transition-colors"
              />
            </button>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <FileText size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-white truncate">
                {activeForm.name}
              </span>
              <button
                type="button"
                onClick={() => setSelectedItemId(null)}
                className={cn(
                  'px-2 py-0.5 rounded-md text-[10px] font-medium cursor-pointer flex items-center gap-1 shrink-0',
                  usageMeta.badgeClass
                )}
                title="Configure Form Purpose & Usage Settings"
              >
                <usageMeta.icon size={11} />
                <span>{usageMeta.shortLabel}</span>
              </button>
              <button
                type="button"
                onClick={handleCloneActiveForm}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Clone form"
              >
                <Copy size={13} />
              </button>
            </div>
          )}

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 shrink-0 hidden sm:block" />

          {/* Module Binding Selector (shown in Global Mode) */}
          {!isModuleEmbedded && (
            <select
              value={effectiveModuleId}
              onChange={(e) => {
                const nextModId = e.target.value;
                updateActiveForm((prev) => ({
                  ...prev,
                  moduleId: nextModId || undefined,
                  isGlobal: !nextModId,
                }));
              }}
              className="px-2 py-1 text-xs font-medium bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-200 focus:outline-none cursor-pointer transition-colors"
              title="Bind form to a Module or keep as Standalone Global Form"
            >
              <option value="">Standalone (Global)</option>
              <optgroup label="Workspace Modules">
                {(modules || [])
                  .filter((m: any) => m.type !== 'PAGE' && m.type !== 'SYSTEM')
                  .map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Platform Modules">
                {PLATFORM_MODULES.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.name}
                  </option>
                ))}
              </optgroup>
            </select>
          )}

          {/* Form Purpose Quick Switcher */}
          <select
            value={activeForm.usage}
            onChange={(e) => {
              const nextUsage = e.target.value as FormUsageType;
              if (isModuleEmbedded && onFormsChange) {
                onFormsChange((prev) =>
                  prev.map((f) => {
                    if (f.id === activeForm.id) return { ...f, usage: nextUsage };
                    if (
                      (nextUsage === 'workspace_create' || nextUsage === 'workspace_edit') &&
                      f.usage === nextUsage
                    ) {
                      return { ...f, usage: 'public_link' };
                    }
                    return f;
                  })
                );
              } else {
                updateActiveForm((prev) => ({ ...prev, usage: nextUsage }));
              }
            }}
            className="px-2 py-1 text-xs font-medium bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-200 focus:outline-none cursor-pointer transition-colors hidden sm:block"
            title="Form purpose"
          >
            {FORM_USAGE_MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>

          {/* Share / Publish Button for Public & Portal forms */}
          {(activeForm.usage === 'public_link' || activeForm.usage === 'portal_site') && (
            <button
              type="button"
              onClick={() => setShowPublishModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer"
            >
              <Globe size={13} />
              <span className="hidden sm:inline">Share</span>
            </button>
          )}
        </div>

        {/* Right: Mode Toggle + Viewport Switcher + Collapse Properties */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Editor vs Preview vs Submissions vs Settings Toggle */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('editor')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer',
                viewMode === 'editor'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              )}
            >
              <Layout size={13} className={viewMode === 'editor' ? 'text-indigo-600 dark:text-indigo-400' : ''} />
              <span>Builder</span>
            </button>
            {!isModuleEmbedded && (
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer',
                  viewMode === 'preview'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                )}
              >
                <Eye size={13} className={viewMode === 'preview' ? 'text-indigo-600 dark:text-indigo-400' : ''} />
                <span>Preview</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setViewMode('submissions')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer',
                viewMode === 'submissions'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              )}
            >
              <BarChart3 size={13} className={viewMode === 'submissions' ? 'text-indigo-600 dark:text-indigo-400' : ''} />
              <span>Submissions</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('settings')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer',
                viewMode === 'settings'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              )}
            >
              <Settings size={13} className={viewMode === 'settings' ? 'text-indigo-600 dark:text-indigo-400' : ''} />
              <span>Settings</span>
            </button>
          </div>

          {/* Viewport Device Switcher (icon-only, matching Interface) */}
          {viewMode !== 'submissions' && viewMode !== 'settings' && (
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setViewportMode('desktop')}
                className={cn(
                  'p-1.5 rounded-md transition-colors cursor-pointer',
                  viewportMode === 'desktop'
                    ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                )}
                title="Desktop"
              >
                <Monitor size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('tablet')}
                className={cn(
                  'p-1.5 rounded-md transition-colors cursor-pointer',
                  viewportMode === 'tablet'
                    ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                )}
                title="Tablet (768px)"
              >
                <Tablet size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('mobile')}
                className={cn(
                  'p-1.5 rounded-md transition-colors cursor-pointer',
                  viewportMode === 'mobile'
                    ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                )}
                title="Mobile (390px)"
              >
                <Smartphone size={14} />
              </button>
            </div>
          )}

          {viewMode === 'editor' && isRightCollapsed && (
            <button
              type="button"
              onClick={() => setIsRightCollapsed(false)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Expand properties panel"
            >
              <ChevronLeft size={14} />
              <span className="hidden sm:inline">Properties</span>
            </button>
          )}

          {!isModuleEmbedded && (
            <Button
              onClick={handleSaveStandaloneForm}
              loading={saving}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-3 py-1.5 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Save size={13} />
              <span>Save</span>
            </Button>
          )}
        </div>
      </div>
  );

  return (
    <div className="flex flex-col h-full w-full bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      {viewMode !== 'editor' && renderTopToolbar()}

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Submissions, Saved Drafts & Conversion Analytics View */}
        {viewMode === 'submissions' ? (
          <div className="flex-1 p-6 sm:p-10 overflow-y-auto bg-zinc-100/70 dark:bg-zinc-950">
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Header & Actions */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    Submissions, Saved Drafts & Analytics — {activeForm.name}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Real-time intake records, conversion metrics, and resumable draft tokens
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchFormSubmissions}
                    className="px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw size={13} className={cn(loadingSubmissions && 'animate-spin')} />
                    <span>Refresh</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportSubmissionsCsv}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* 4 KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Total Submissions
                  </p>
                  <p className="text-2xl font-black text-zinc-900 dark:text-white mt-1">
                    {submissionsData.stats.totalSubmissions}
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    In-Progress Saved Drafts
                  </p>
                  <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                    {submissionsData.stats.activeDrafts}
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Completion Rate
                  </p>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {submissionsData.stats.completionRate}%
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Latest Submission
                  </p>
                  <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mt-2">
                    {submissionsData.stats.lastSubmittedAt
                      ? new Date(submissionsData.stats.lastSubmittedAt).toLocaleString()
                      : 'No submissions yet'}
                  </p>
                </div>
              </div>

              {/* Multi-Step Draft Funnel Breakdown */}
              {activeForm.isMultistep && activeForm.steps.length > 1 && (
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Multi-Step Progress & Draft Funnel
                    </h4>
                    <span className="text-[11px] text-zinc-400">
                      {activeForm.steps.length} wizard steps
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {activeForm.steps.map((st, idx) => {
                      const draftsOnStep = submissionsData.drafts.filter(
                        (d: any) => d.stepId === st.id || (!d.stepId && idx === 0)
                      ).length;
                      return (
                        <div
                          key={st.id}
                          className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase block">
                              Step {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-zinc-900 dark:text-white truncate block">
                              {st.title}
                            </span>
                          </div>
                          <span className="px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-[11px] font-mono font-bold text-zinc-700 dark:text-zinc-300 shrink-0">
                            {draftsOnStep} {draftsOnStep === 1 ? 'draft' : 'drafts'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Active Saved Drafts Section */}
              {submissionsData.drafts.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                      <Clock size={14} />
                      <span>Active Saved Drafts (Save & Resume Later)</span>
                    </h4>
                    <span className="text-[11px] text-zinc-400">
                      {submissionsData.drafts.length} resumable sessions
                    </span>
                  </div>
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {submissionsData.drafts.map((drf: any) => {
                      const resumeLink = `${publicShareUrl}${publicShareUrl.includes('?') ? '&' : '?'}draft=${drf.token}`;
                      return (
                        <div
                          key={drf.token}
                          className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                {drf.token}
                              </span>
                              {drf.email && (
                                <span className="text-zinc-500">({drf.email})</span>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-400">
                              Saved {drf.savedAt ? new Date(drf.savedAt).toLocaleString() : 'recently'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(resumeLink);
                                toast.success('Draft resume link copied!');
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <Copy size={12} />
                              <span>Copy Resume Link</span>
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await fetch(
                                  `${API_BASE_URL}/api/forms/${encodeURIComponent(activeForm.id)}/drafts/${encodeURIComponent(drf.token)}`,
                                  {
                                    method: 'DELETE',
                                    headers: {
                                      'x-tenant-id': tenant?.id || '',
                                      ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                    },
                                  }
                                );
                                toast.success('Draft deleted');
                                fetchFormSubmissions();
                              }}
                              className="p-1.5 text-zinc-400 hover:text-rose-500 cursor-pointer"
                              title="Delete Draft"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Submissions Table */}
              <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Submitted Form Records
                  </h4>
                  <div className="relative w-64">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={submissionSearch}
                      onChange={(e) => setSubmissionSearch(e.target.value)}
                      placeholder="Filter by ref, user, or email..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>

                {submissionsData.submissions.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-400">
                    No form submissions recorded yet. Test the form in Live Preview or via its Share Link.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {submissionsData.submissions
                      .filter((s) => {
                        if (!submissionSearch.trim()) return true;
                        const q = submissionSearch.toLowerCase();
                        return (
                          String(s.customerRef || '').toLowerCase().includes(q) ||
                          String(s.submittedBy || '').toLowerCase().includes(q) ||
                          String(s.email || '').toLowerCase().includes(q)
                        );
                      })
                      .map((sub) => {
                        const isExpanded = expandedSubmissionId === sub.id;
                        return (
                          <div key={sub.id} className="py-3 space-y-2">
                            <div
                              onClick={() =>
                                setExpandedSubmissionId(isExpanded ? null : sub.id)
                              }
                              className="flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 p-2 rounded-xl transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                  {sub.customerRef}
                                </span>
                                <div>
                                  <p className="text-xs font-bold text-zinc-900 dark:text-white">
                                    {sub.submittedBy}
                                  </p>
                                  <p className="text-[10px] text-zinc-400">
                                    {sub.email || sub.source}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 text-xs">
                                {sub.paymentStatus && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                    {sub.paymentStatus}
                                  </span>
                                )}
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                                  {sub.status}
                                </span>
                                {sub.moduleId && sub.id && (
                                  <a
                                    href={`/modules/${sub.moduleId}?recordId=${sub.id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold flex items-center gap-1 transition-colors"
                                    title="Open Record in Workspace"
                                  >
                                    <ExternalLink size={11} />
                                    <span>View Record</span>
                                  </a>
                                )}
                                <span className="text-[11px] text-zinc-400">
                                  {sub.createdAt
                                    ? new Date(sub.createdAt).toLocaleString()
                                    : ''}
                                </span>
                              </div>
                            </div>

                            {isExpanded && (
                              <pre className="p-3.5 rounded-2xl bg-zinc-950 text-zinc-200 text-[11px] font-mono overflow-x-auto">
                                {JSON.stringify(sub.data, null, 2)}
                              </pre>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : viewMode === 'preview' ? (
          <div className="flex-1 p-4 sm:p-10 overflow-y-auto bg-zinc-100/70 dark:bg-zinc-950 flex flex-col items-center">
            <div
              className={cn(
                'w-full mx-auto space-y-4 transition-all duration-300',
                viewportMode === 'desktop' && 'max-w-3xl',
                viewportMode === 'tablet' &&
                  'w-[768px] max-w-full p-6 bg-zinc-200/50 dark:bg-zinc-900/60 rounded-[2.5rem] border-2 border-zinc-300/80 dark:border-zinc-700/80 shadow-2xl ring-1 ring-black/5',
                viewportMode === 'mobile' &&
                  'w-[390px] max-w-full p-4 bg-zinc-200/80 dark:bg-zinc-900/80 rounded-[3rem] border-[6px] border-zinc-300 dark:border-zinc-700 shadow-2xl ring-1 ring-black/10'
              )}
            >
              {viewportMode === 'tablet' && (
                <div className="flex items-center justify-between px-3.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-[10px] font-mono text-zinc-500 border border-zinc-200 dark:border-zinc-700/80">
                  <div className="flex items-center gap-1.5">
                    <Tablet size={12} className="text-indigo-500" />
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">
                      Tablet Preview (768px)
                    </span>
                  </div>
                  <span className="text-[9px] text-zinc-400">Interactive live testing</span>
                </div>
              )}

              {viewportMode === 'mobile' && (
                <div className="flex flex-col items-center gap-1 pb-1">
                  <div className="w-16 h-1 rounded-full bg-zinc-400 dark:bg-zinc-600 mb-0.5" />
                  <div className="w-full flex items-center justify-between px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-[10px] font-mono text-zinc-500 border border-zinc-200 dark:border-zinc-700/80">
                    <div className="flex items-center gap-1.5">
                      <Smartphone size={11} className="text-indigo-500" />
                      <span className="font-bold text-zinc-700 dark:text-zinc-300">
                        Mobile Preview (390px)
                      </span>
                    </div>
                    <span className="text-[9px] text-zinc-400">Interactive live testing</span>
                  </div>
                </div>
              )}

              {viewportMode === 'desktop' && (
                <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-700 dark:text-indigo-300">
                  <div className="flex items-center gap-2 font-semibold">
                    <Sparkles size={14} className="text-indigo-500" />
                    <span>
                      Interactive Live Preview — Testing multi-step logic, calculations, and prefill rules
                    </span>
                  </div>
                  <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-white/80 dark:bg-zinc-900">
                    {usageMeta.label}
                  </span>
                </div>
              )}

              <FormRenderer
                form={activeForm}
                moduleLayout={resolvedModuleLayout}
                workflow={resolvedWorkflow}
                isPreviewMode={true}
                viewport={viewportMode}
                context={{
                  user: platformUser || {
                    id: 'usr_preview',
                    name: 'Preview User',
                    email: 'user@aurora.io',
                  },
                }}
              />
            </div>
          </div>
        ) : viewMode === 'settings' ? (
          <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-zinc-50/50 dark:bg-zinc-950/30 custom-scrollbar">
            <div className="w-full space-y-6 pb-16">
              {/* Page Header + Segmented Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    Form settings
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Configure purpose, ecosystem routing, and submission policies for {activeForm.name}.
                  </p>
                </div>

                <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-lg self-start sm:self-auto">
                  {(
                    [
                      { id: 'general', label: 'General' },
                      { id: 'ecosystem', label: 'Ecosystem' },
                      { id: 'governance', label: 'Governance' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFormSettingsTab(tab.id)}
                      className={cn(
                        'px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer',
                        formSettingsTab === tab.id
                          ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                          : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {formSettingsTab === 'general' && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                  {/* Card 1: Purpose & Trigger */}
                  <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-5">
                    <div className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Purpose & trigger</h3>
                      <p className="text-xs text-zinc-500">Choose where and how this form is launched</p>
                    </div>
                      {/* Form Purpose / Usage Selector Cards */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                          What is this form used for?
                        </label>
                        <div className="space-y-1.5">
                          {FORM_USAGE_MODES.map((m) => {
                            const isSelected = activeForm.usage === m.id;
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  if (isModuleEmbedded && onFormsChange) {
                                    onFormsChange((prev) =>
                                      prev.map((f) => {
                                        if (f.id === activeForm.id) return { ...f, usage: m.id };
                                        if (
                                          (m.id === 'workspace_create' ||
                                            m.id === 'workspace_edit') &&
                                          f.usage === m.id
                                        ) {
                                          return { ...f, usage: 'public_link' };
                                        }
                                        return f;
                                      })
                                    );
                                  } else {
                                    updateActiveForm((prev) => ({ ...prev, usage: m.id }));
                                  }
                                }}
                                className={cn(
                                  'w-full p-2.5 rounded-2xl border text-left transition-all flex items-start gap-2.5 cursor-pointer',
                                  isSelected
                                    ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-500 ring-1 ring-indigo-500/20'
                                    : 'bg-zinc-50/60 dark:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300'
                                )}
                              >
                                <div
                                  className={cn(
                                    'w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                                    isSelected
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-500'
                                  )}
                                >
                                  <m.icon size={13} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-zinc-900 dark:text-white">
                                    {m.label}
                                  </p>
                                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-snug mt-0.5">
                                    {m.description}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Mode-Specific Settings: 1. Workspace Create */}
                      {activeForm.usage === 'workspace_create' && (
                        <div className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-500/20 space-y-3">
                          <h4 className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                            Workspace Create Button Config
                          </h4>
                          <div>
                            <label className="text-[10px] font-semibold text-zinc-500 block mb-1">
                              Workspace Toolbar Button Label
                            </label>
                            <input
                              type="text"
                              value={activeForm.settings?.workspaceButtonLabel || 'Create'}
                              onChange={(e) =>
                                updateActiveForm((prev) => ({
                                  ...prev,
                                  settings: {
                                    ...prev.settings,
                                    workspaceButtonLabel: e.target.value,
                                  },
                                }))
                              }
                              placeholder="Create"
                              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs"
                            />
                          </div>
                        </div>
                      )}

                      {/* Mode-Specific Settings: 2. Workspace Action Button */}
                      {activeForm.usage === 'action_trigger' && (
                        <div className="p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-500/20 space-y-3">
                          <h4 className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            Workspace Action Button Config
                          </h4>
                          <div>
                            <label className="text-[10px] font-semibold text-zinc-500 block mb-1">
                              Action Button Label
                            </label>
                            <input
                              type="text"
                              value={
                                activeForm.settings?.actionButtonLabel ||
                                activeForm.settings?.workspaceButtonLabel ||
                                activeForm.name
                              }
                              onChange={(e) =>
                                updateActiveForm((prev) => ({
                                  ...prev,
                                  settings: {
                                    ...prev.settings,
                                    actionButtonLabel: e.target.value,
                                    workspaceButtonLabel: e.target.value,
                                  },
                                }))
                              }
                              placeholder="e.g. Escalate Ticket"
                              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-zinc-500 block mb-1">
                              Action Target Behavior
                            </label>
                            <select
                              value={activeForm.settings?.actionTargetMode || 'create_record'}
                              onChange={(e) =>
                                updateActiveForm((prev) => ({
                                  ...prev,
                                  settings: {
                                    ...prev.settings,
                                    actionTargetMode: e.target.value as any,
                                  },
                                }))
                              }
                              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs"
                            >
                              <option value="create_record">Create New Record in Module</option>
                              <option value="update_record">Update Selected Record Fields</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-zinc-500 block mb-1">
                              Auto-Transition Workflow Stage on Submit
                            </label>
                            <select
                              value={activeForm.settings?.autoTransitionStatus || ''}
                              onChange={(e) =>
                                updateActiveForm((prev) => ({
                                  ...prev,
                                  settings: {
                                    ...prev.settings,
                                    autoTransitionStatus: e.target.value || undefined,
                                  },
                                }))
                              }
                              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs"
                            >
                              <option value="">(Keep Current / Default Status)</option>
                              {workflowStageOptions.map((st) => (
                                <option key={st} value={st}>
                                  Transition to: {st}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      </section>

                      {/* Right Column: Flow & Confirmation Cards */}
                      <div className="space-y-6">
                        <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
                          <div className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Flow & experience</h3>
                            <p className="text-xs text-zinc-500">Wizard steps, review summary, and draft saving</p>
                          </div>
                      {/* Wizard, Review Step & Save Draft Toggles */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-zinc-900 dark:text-white">
                              Multi-Step Wizard Flow
                            </p>
                            <p className="text-[10px] text-zinc-400">
                              Break form into paginated steps with branching
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              updateActiveForm((prev) => {
                                const nextMulti = !prev.isMultistep;
                                let nextSteps = prev.steps || [];
                                let nextFields = prev.fields || [];
                                if (nextMulti && nextSteps.length === 0) {
                                  nextSteps = [{ id: 'step-1', title: 'Step 1', fields: nextFields }];
                                } else if (!nextMulti && nextSteps.length > 0) {
                                  nextFields = nextSteps.flatMap((s) => s.fields || []);
                                }
                                return {
                                  ...prev,
                                  isMultistep: nextMulti,
                                  steps: nextSteps,
                                  fields: nextFields,
                                };
                              })
                            }
                            className={cn(
                              'w-10 h-6 rounded-full relative transition-all cursor-pointer',
                              activeForm.isMultistep
                                ? 'bg-indigo-600'
                                : 'bg-zinc-200 dark:bg-zinc-700'
                            )}
                          >
                            <div
                              className={cn(
                                'absolute top-1 w-4 h-4 bg-white rounded-full transition-all',
                                activeForm.isMultistep ? 'right-1' : 'left-1'
                              )}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-zinc-900 dark:text-white">
                              Review & Confirm Summary Step
                            </p>
                            <p className="text-[10px] text-zinc-400">
                              Show read-only summary + declaration gate before submit
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              updateActiveForm((prev) => ({
                                ...prev,
                                settings: {
                                  ...prev.settings,
                                  enableReviewStep: !prev.settings?.enableReviewStep,
                                },
                              }))
                            }
                            className={cn(
                              'w-10 h-6 rounded-full relative transition-all cursor-pointer',
                              activeForm.settings?.enableReviewStep
                                ? 'bg-indigo-600'
                                : 'bg-zinc-200 dark:bg-zinc-700'
                            )}
                          >
                            <div
                              className={cn(
                                'absolute top-1 w-4 h-4 bg-white rounded-full transition-all',
                                activeForm.settings?.enableReviewStep ? 'right-1' : 'left-1'
                              )}
                            />
                          </button>
                        </div>

                        {activeForm.settings?.enableReviewStep && (
                          <div>
                            <label className="text-[10px] font-semibold text-zinc-500 block mb-1">
                              Legal Declaration / Consent Text (Optional)
                            </label>
                            <textarea
                              rows={2}
                              value={activeForm.settings?.reviewDeclarationText || ''}
                              onChange={(e) =>
                                updateActiveForm((prev) => ({
                                  ...prev,
                                  settings: {
                                    ...prev.settings,
                                    reviewDeclarationText: e.target.value,
                                  },
                                }))
                              }
                              placeholder="I declare that the information provided in this submission is true and accurate..."
                              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-2.5 text-xs"
                            />
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-zinc-900 dark:text-white">
                              Save & Resume Later
                            </p>
                            <p className="text-[10px] text-zinc-400">
                              Allow users to save draft progress and get a resume link
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              updateActiveForm((prev) => ({
                                ...prev,
                                settings: {
                                  ...prev.settings,
                                  allowSaveDraft: !prev.settings?.allowSaveDraft,
                                },
                              }))
                            }
                            className={cn(
                              'w-10 h-6 rounded-full relative transition-all cursor-pointer',
                              activeForm.settings?.allowSaveDraft
                                ? 'bg-indigo-600'
                                : 'bg-zinc-200 dark:bg-zinc-700'
                            )}
                          >
                            <div
                              className={cn(
                                'absolute top-1 w-4 h-4 bg-white rounded-full transition-all',
                                activeForm.settings?.allowSaveDraft ? 'right-1' : 'left-1'
                              )}
                            />
                          </button>
                        </div>
                      </div>
                        </section>

                      {/* Submission & Confirmation Labels */}
                      <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
                        <div className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
                          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Submission & confirmation</h3>
                          <p className="text-xs text-zinc-500">Button label, success message, and redirect behavior</p>
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold text-zinc-500 block mb-1">
                            Submit Button Label
                          </label>
                          <input
                            type="text"
                            value={activeForm.settings?.submitLabel || 'Submit'}
                            onChange={(e) =>
                              updateActiveForm((prev) => ({
                                ...prev,
                                settings: { ...prev.settings, submitLabel: e.target.value },
                              }))
                            }
                            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold text-zinc-500 block mb-1">
                            Confirmation Message
                          </label>
                          <input
                            type="text"
                            value={
                              activeForm.settings?.successMessage ||
                              'Submission completed successfully!'
                            }
                            onChange={(e) =>
                              updateActiveForm((prev) => ({
                                ...prev,
                                settings: { ...prev.settings, successMessage: e.target.value },
                              }))
                            }
                            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold text-zinc-500 block mb-1">
                            Post-Submit Redirect URL (Optional)
                          </label>
                          <input
                            type="url"
                            value={activeForm.settings?.redirectUrl || ''}
                            onChange={(e) =>
                              updateActiveForm((prev) => ({
                                ...prev,
                                settings: { ...prev.settings, redirectUrl: e.target.value },
                              }))
                            }
                            placeholder="https://example.com/thank-you"
                            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs font-mono"
                          />
                        </div>
                      </section>
                      </div>
                </div>
                  )}

                  {formSettingsTab === 'ecosystem' && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                      {/* Directory Party Auto-Upsert */}
                      <div className="p-3.5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-500/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-zinc-900 dark:text-white">
                              People & Orgs Directory Auto-Upsert
                            </p>
                            <p className="text-[10px] text-zinc-500">
                              Auto-match or create a Contact Party from submitted name/email and link to record
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              updateActiveForm((prev) => ({
                                ...prev,
                                settings: {
                                  ...prev.settings,
                                  upsertDirectoryParty: !prev.settings?.upsertDirectoryParty,
                                },
                              }))
                            }
                            className={cn(
                              'w-9 h-5 rounded-full relative transition-all cursor-pointer shrink-0',
                              activeForm.settings?.upsertDirectoryParty
                                ? 'bg-indigo-600'
                                : 'bg-zinc-200 dark:bg-zinc-700'
                            )}
                          >
                            <div
                              className={cn(
                                'absolute top-1 w-3 h-3 rounded-full bg-white transition-all',
                                activeForm.settings?.upsertDirectoryParty ? 'right-1' : 'left-1'
                              )}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Public Link & Reference Numbering */}
                      <div className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-500/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            Routing & Reference Sequence
                          </h4>
                          <button
                            type="button"
                            onClick={() => setShowPublishModal(true)}
                            className="text-[10px] font-bold text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <ExternalLink size={11} />
                            <span>Embed Studio</span>
                          </button>
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold text-zinc-500 block mb-1">
                            Direct Shareable URL
                          </label>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              readOnly
                              value={publicShareUrl}
                              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-[11px] font-mono text-zinc-600 dark:text-zinc-300"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(publicShareUrl);
                                setCopiedUrl(true);
                                toast.success('Public form URL copied!');
                                setTimeout(() => setCopiedUrl(false), 2000);
                              }}
                              className="px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center shrink-0 cursor-pointer"
                              title="Copy Public URL"
                            >
                              {copiedUrl ? <Check size={13} /> : <Copy size={13} />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold text-zinc-500 block mb-1">
                            Submission Routing Destination
                          </label>
                          <select
                            value={activeForm.settings?.routingTarget || 'triage_inbox'}
                            onChange={(e) =>
                              updateActiveForm((prev) => ({
                                ...prev,
                                settings: {
                                  ...prev.settings,
                                  routingTarget: e.target.value as any,
                                },
                              }))
                            }
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs"
                          >
                            <option value="triage_inbox">Route to Intake Triage Inbox First</option>
                            <option value="direct_module">Create Record Directly in Bound Module</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold text-zinc-500 block mb-1">
                            Initial Workflow Stage on Submit
                          </label>
                          <select
                            value={activeForm.settings?.autoTransitionStatus || ''}
                            onChange={(e) =>
                              updateActiveForm((prev) => ({
                                ...prev,
                                settings: {
                                  ...prev.settings,
                                  autoTransitionStatus: e.target.value || undefined,
                                },
                              }))
                            }
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs"
                          >
                            <option value="">Default ("New")</option>
                            {workflowStageOptions.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <div>
                            <label className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">
                              Ref Prefix
                            </label>
                            <input
                              type="text"
                              value={activeForm.settings?.customerRefPrefix || ''}
                              onChange={(e) =>
                                updateActiveForm((prev) => ({
                                  ...prev,
                                  settings: {
                                    ...prev.settings,
                                    customerRefPrefix: e.target.value.toUpperCase(),
                                  },
                                }))
                              }
                              placeholder="APP"
                              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">
                              Next #
                            </label>
                            <input
                              type="number"
                              value={activeForm.settings?.customerRefNextNumber ?? 10001}
                              onChange={(e) =>
                                updateActiveForm((prev) => ({
                                  ...prev,
                                  settings: {
                                    ...prev.settings,
                                    customerRefNextNumber: Number(e.target.value),
                                  },
                                }))
                              }
                              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">
                              Suffix
                            </label>
                            <input
                              type="text"
                              value={activeForm.settings?.customerRefSuffix || ''}
                              onChange={(e) =>
                                updateActiveForm((prev) => ({
                                  ...prev,
                                  settings: {
                                    ...prev.settings,
                                    customerRefSuffix: e.target.value.toUpperCase(),
                                  },
                                }))
                              }
                              placeholder="-26"
                              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Portal / Site Context Bindings */}
                      <div className="p-4 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-500/20 space-y-3">
                        <div className="flex items-center gap-2">
                          <UserCheck size={14} className="text-purple-600 dark:text-purple-400" />
                          <h4 className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                            Logged-In User & Object Context
                          </h4>
                        </div>

                        <div className="flex items-center justify-between py-1">
                          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                            Auto-Capture Logged-In User Identity
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateActiveForm((prev) => ({
                                ...prev,
                                settings: {
                                  ...prev.settings,
                                  contextBindings: {
                                    ...(prev.settings?.contextBindings || {}),
                                    captureLoggedInUser:
                                      !prev.settings?.contextBindings?.captureLoggedInUser,
                                  },
                                },
                              }))
                            }
                            className={cn(
                              'w-9 h-5 rounded-full relative transition-all cursor-pointer',
                              activeForm.settings?.contextBindings?.captureLoggedInUser !== false
                                ? 'bg-purple-600'
                                : 'bg-zinc-200 dark:bg-zinc-700'
                            )}
                          >
                            <div
                              className={cn(
                                'absolute top-1 w-3 h-3 rounded-full bg-white transition-all',
                                activeForm.settings?.contextBindings?.captureLoggedInUser !== false
                                  ? 'right-1'
                                  : 'left-1'
                              )}
                            />
                          </button>
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold text-zinc-500 block mb-1">
                            Bind $user.email to Form Field
                          </label>
                          <select
                            value={activeForm.settings?.contextBindings?.userEmailFieldId || ''}
                            onChange={(e) =>
                              updateActiveForm((prev) => ({
                                ...prev,
                                settings: {
                                  ...prev.settings,
                                  contextBindings: {
                                    ...(prev.settings?.contextBindings || {
                                      captureLoggedInUser: true,
                                    }),
                                    userEmailFieldId: e.target.value || undefined,
                                  },
                                },
                              }))
                            }
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs"
                          >
                            <option value="">(Store in Record Metadata Only)</option>
                            {allAvailableFieldsForModals.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.label} ({f.id})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold text-zinc-500 block mb-1">
                            Bind $user.name to Form Field
                          </label>
                          <select
                            value={activeForm.settings?.contextBindings?.userNameFieldId || ''}
                            onChange={(e) =>
                              updateActiveForm((prev) => ({
                                ...prev,
                                settings: {
                                  ...prev.settings,
                                  contextBindings: {
                                    ...(prev.settings?.contextBindings || {
                                      captureLoggedInUser: true,
                                    }),
                                    userNameFieldId: e.target.value || undefined,
                                  },
                                },
                              }))
                            }
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs"
                          >
                            <option value="">(Store in Record Metadata Only)</option>
                            {allAvailableFieldsForModals.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.label} ({f.id})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="pt-2 border-t border-purple-500/20 space-y-2">
                          <label className="text-[10px] font-semibold text-zinc-500 block">
                            Contextual Parent Object Binding (e.g. Account, Property, Case)
                          </label>
                          <input
                            type="text"
                            value={
                              activeForm.settings?.contextBindings?.parentObjectUrlParam || ''
                            }
                            onChange={(e) =>
                              updateActiveForm((prev) => ({
                                ...prev,
                                settings: {
                                  ...prev.settings,
                                  contextBindings: {
                                    ...(prev.settings?.contextBindings || {}),
                                    parentObjectUrlParam: e.target.value,
                                  },
                                },
                              }))
                            }
                            placeholder="URL/Context param (e.g. accountId, propertyId)"
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-mono"
                          />
                          <select
                            value={
                              activeForm.settings?.contextBindings?.parentObjectTargetFieldId || ''
                            }
                            onChange={(e) =>
                              updateActiveForm((prev) => ({
                                ...prev,
                                settings: {
                                  ...prev.settings,
                                  contextBindings: {
                                    ...(prev.settings?.contextBindings || {}),
                                    parentObjectTargetFieldId: e.target.value || undefined,
                                  },
                                },
                              }))
                            }
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs"
                          >
                            <option value="">Map Parent Object ID to Field...</option>
                            {allAvailableFieldsForModals.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.label} ({f.id})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Real Cross-Builder Integrations */}
                      <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          Cross-Builder Integrations
                        </h4>

                        <div>
                          <label className="text-[10px] font-semibold text-zinc-500 block mb-1">
                            Validation Ruleset
                          </label>
                          <select
                            value={activeForm.settings?.postSubmit?.validationRulesetId || ''}
                            onChange={(e) =>
                              updateActiveForm((prev) => ({
                                ...prev,
                                settings: {
                                  ...prev.settings,
                                  postSubmit: {
                                    ...(prev.settings?.postSubmit || {}),
                                    validationRulesetId: e.target.value || undefined,
                                  },
                                },
                              }))
                            }
                            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs"
                          >
                            <option value="">(Standard Field Validation)</option>
                            {validationRulesets.map((rs: any) => (
                              <option key={rs.id} value={rs.id}>
                                {rs.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold text-zinc-500 block mb-1">
                            On Submit: Generate Document / PDF Template
                          </label>
                          <select
                            value={activeForm.settings?.postSubmit?.pdfTemplateId || ''}
                            onChange={(e) =>
                              updateActiveForm((prev) => ({
                                ...prev,
                                settings: {
                                  ...prev.settings,
                                  postSubmit: {
                                    ...(prev.settings?.postSubmit || {}),
                                    pdfTemplateId: e.target.value || undefined,
                                  },
                                },
                              }))
                            }
                            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs"
                          >
                            <option value="">(Standard Printable Lodgement Receipt)</option>
                            {documentTemplates.map((tpl: any) => (
                              <option key={tpl.id} value={tpl.id}>
                                {tpl.name || tpl.title}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold text-zinc-500 block mb-1">
                            On Submit: Outbound Webhook URL (Optional)
                          </label>
                          <input
                            type="url"
                            value={activeForm.settings?.postSubmit?.webhookUrl || ''}
                            onChange={(e) =>
                              updateActiveForm((prev) => ({
                                ...prev,
                                settings: {
                                  ...prev.settings,
                                  postSubmit: {
                                    ...(prev.settings?.postSubmit || {}),
                                    webhookUrl: e.target.value || undefined,
                                  },
                                },
                              }))
                            }
                            placeholder="https://hooks.zapier.com/..."
                            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold text-zinc-500 block mb-1">
                            On Submit: Notification Emails (Comma-separated)
                          </label>
                          <input
                            type="text"
                            value={activeForm.settings?.postSubmit?.notifyEmails || ''}
                            onChange={(e) =>
                              updateActiveForm((prev) => ({
                                ...prev,
                                settings: {
                                  ...prev.settings,
                                  postSubmit: {
                                    ...(prev.settings?.postSubmit || {}),
                                    notifyEmails: e.target.value || undefined,
                                  },
                                },
                              }))
                            }
                            placeholder="intake@company.com, manager@company.com"
                            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {formSettingsTab === 'governance' && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                      <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                          Availability Schedule & Quotas
                        </h4>

                        <div>
                          <label className="text-[10px] font-semibold text-zinc-500 block mb-1">
                            Open Submissions At (Optional)
                          </label>
                          <input
                            type="datetime-local"
                            value={activeForm.settings?.governance?.openAt || ''}
                            onChange={(e) =>
                              updateActiveForm((prev) => ({
                                ...prev,
                                settings: {
                                  ...prev.settings,
                                  governance: {
                                    ...(prev.settings?.governance || {}),
                                    openAt: e.target.value || undefined,
                                  },
                                },
                              }))
                            }
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold text-zinc-500 block mb-1">
                            Close Submissions At (Optional)
                          </label>
                          <input
                            type="datetime-local"
                            value={activeForm.settings?.governance?.closeAt || ''}
                            onChange={(e) =>
                              updateActiveForm((prev) => ({
                                ...prev,
                                settings: {
                                  ...prev.settings,
                                  governance: {
                                    ...(prev.settings?.governance || {}),
                                    closeAt: e.target.value || undefined,
                                  },
                                },
                              }))
                            }
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold text-zinc-500 block mb-1">
                            Max Submissions Quota (0 = Unlimited)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={activeForm.settings?.governance?.maxSubmissions ?? 0}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value) || 0);
                              updateActiveForm((prev) => ({
                                ...prev,
                                settings: {
                                  ...prev.settings,
                                  governance: {
                                    ...(prev.settings?.governance || {}),
                                    maxSubmissions: val > 0 ? val : undefined,
                                  },
                                },
                              }));
                            }}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs"
                          />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div>
                            <p className="text-xs font-bold text-zinc-900 dark:text-white">
                              One Submission Per User / Email
                            </p>
                            <p className="text-[10px] text-zinc-400">
                              Prevent duplicate submissions from the same email or user
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              updateActiveForm((prev) => ({
                                ...prev,
                                settings: {
                                  ...prev.settings,
                                  governance: {
                                    ...(prev.settings?.governance || {}),
                                    oneSubmissionPerUser:
                                      !prev.settings?.governance?.oneSubmissionPerUser,
                                  },
                                },
                              }))
                            }
                            className={cn(
                              'w-9 h-5 rounded-full relative transition-all cursor-pointer shrink-0',
                              activeForm.settings?.governance?.oneSubmissionPerUser
                                ? 'bg-indigo-600'
                                : 'bg-zinc-200 dark:bg-zinc-700'
                            )}
                          >
                            <div
                              className={cn(
                                'absolute top-1 w-3 h-3 rounded-full bg-white transition-all',
                                activeForm.settings?.governance?.oneSubmissionPerUser
                                  ? 'right-1'
                                  : 'left-1'
                              )}
                            />
                          </button>
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold text-zinc-500 block mb-1">
                            Custom Closed / Quota Reached Message
                          </label>
                          <textarea
                            rows={2}
                            value={activeForm.settings?.governance?.closedMessage || ''}
                            onChange={(e) =>
                              updateActiveForm((prev) => ({
                                ...prev,
                                settings: {
                                  ...prev.settings,
                                  governance: {
                                    ...(prev.settings?.governance || {}),
                                    closedMessage: e.target.value || undefined,
                                  },
                                },
                              }))
                            }
                            placeholder="Submissions for this intake round have now closed."
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-2.5 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payable Form & Fee Collection Section */}
                  <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <CreditCard size={14} className="text-emerald-600 dark:text-emerald-400" />
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          Payable Form & Fee Collection
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateActiveForm((prev) => ({
                            ...prev,
                            settings: {
                              ...prev.settings,
                              payment: {
                                ...(prev.settings?.payment || {
                                  amountMode: 'fixed',
                                  fixedAmount: 50,
                                  currency: 'AUD',
                                }),
                                enabled: !prev.settings?.payment?.enabled,
                              },
                            },
                          }))
                        }
                        className={cn(
                          'w-9 h-5 rounded-full relative transition-all cursor-pointer',
                          activeForm.settings?.payment?.enabled
                            ? 'bg-emerald-600'
                            : 'bg-zinc-200 dark:bg-zinc-700'
                        )}
                      >
                        <div
                          className={cn(
                            'absolute top-1 w-3 h-3 rounded-full bg-white transition-all',
                            activeForm.settings?.payment?.enabled ? 'right-1' : 'left-1'
                          )}
                        />
                      </button>
                    </div>

                    {activeForm.settings?.payment?.enabled && (
                      <div className="p-3.5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-500/20 space-y-2.5">
                        <div>
                          <label className="text-[10px] font-semibold text-zinc-500 block mb-1">
                            Fee Line Item Description
                          </label>
                          <input
                            type="text"
                            value={activeForm.settings?.payment?.itemTitle || ''}
                            onChange={(e) =>
                              updateActiveForm((prev) => ({
                                ...prev,
                                settings: {
                                  ...prev.settings,
                                  payment: {
                                    ...(prev.settings?.payment || {}),
                                    itemTitle: e.target.value,
                                  },
                                },
                              }))
                            }
                            placeholder={`${activeForm.name} Application Fee`}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-semibold text-zinc-500 block mb-1">
                              Fee Source
                            </label>
                            <select
                              value={activeForm.settings?.payment?.amountMode || 'fixed'}
                              onChange={(e) =>
                                updateActiveForm((prev) => ({
                                  ...prev,
                                  settings: {
                                    ...prev.settings,
                                    payment: {
                                      ...(prev.settings?.payment || {}),
                                      amountMode: e.target.value as any,
                                    },
                                  },
                                }))
                              }
                              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs"
                            >
                              <option value="fixed">Fixed Fee</option>
                              <option value="field">From Form Field</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-zinc-500 block mb-1">
                              Currency
                            </label>
                            <select
                              value={activeForm.settings?.payment?.currency || 'AUD'}
                              onChange={(e) =>
                                updateActiveForm((prev) => ({
                                  ...prev,
                                  settings: {
                                    ...prev.settings,
                                    payment: {
                                      ...(prev.settings?.payment || {}),
                                      currency: e.target.value,
                                    },
                                  },
                                }))
                              }
                              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs font-mono"
                            >
                              <option value="AUD">AUD ($)</option>
                              <option value="USD">USD ($)</option>
                              <option value="GBP">GBP (£)</option>
                              <option value="EUR">EUR (€)</option>
                            </select>
                          </div>
                        </div>

                        {activeForm.settings?.payment?.amountMode === 'field' ? (
                          <div>
                            <label className="text-[10px] font-semibold text-zinc-500 block mb-1">
                              Amount / Calculated Currency Field
                            </label>
                            <select
                              value={activeForm.settings?.payment?.amountFieldId || ''}
                              onChange={(e) =>
                                updateActiveForm((prev) => ({
                                  ...prev,
                                  settings: {
                                    ...prev.settings,
                                    payment: {
                                      ...(prev.settings?.payment || {}),
                                      amountFieldId: e.target.value || undefined,
                                    },
                                  },
                                }))
                              }
                              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs"
                            >
                              <option value="">Select field...</option>
                              {allAvailableFieldsForModals.map((f) => (
                                <option key={f.id} value={f.id}>
                                  {f.label} ({f.type})
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div>
                            <label className="text-[10px] font-semibold text-zinc-500 block mb-1">
                              Fixed Amount
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={activeForm.settings?.payment?.fixedAmount ?? 50}
                              onChange={(e) =>
                                updateActiveForm((prev) => ({
                                  ...prev,
                                  settings: {
                                    ...prev.settings,
                                    payment: {
                                      ...(prev.settings?.payment || {}),
                                      fixedAmount: Number(e.target.value),
                                    },
                                  },
                                }))
                              }
                              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-mono"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
            </div>
          </div>
        ) : (
          <>
            {/* Left Sidebar 2: Unified Field Palette (Animated Collapsible) */}
            <AnimatePresence initial={false}>
              {!isLeftCollapsed && (
                <motion.aside
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 288, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col overflow-hidden"
                >
              {/* Active Target Group / Repeater Indicator Banner */}
              {activeContainerPlacement && (
                <div className="mx-3 mt-3 p-2.5 rounded-xl bg-indigo-600 text-white shadow-sm space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Folder size={13} className="shrink-0" />
                      <span className="text-[11px] font-bold truncate">
                        Target: {activeContainerPlacement.labelOverride || activeContainerPlacement.id}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedItemId(null)}
                      className="px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-[10px] font-bold shrink-0 cursor-pointer"
                      title="Switch back to adding fields to the main canvas"
                    >
                      Exit Group
                    </button>
                  </div>
                  <p className="text-[10px] text-indigo-100 leading-tight">
                    Click any Module Field or Custom Field below to add it directly inside this group.
                  </p>
                </div>
              )}

              {/* Top h-11 Search & Collapse Header (inline with Center & Properties top bars) */}
              <div className="h-11 px-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5 shrink-0">
                <div className="relative flex-1">
                  <Search
                    size={13}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                  <input
                    type="text"
                    value={paletteSearch}
                    onChange={(e) => setPaletteSearch(e.target.value)}
                    placeholder="Search fields..."
                    className="w-full h-7 pl-8 pr-2.5 text-xs bg-zinc-100/80 dark:bg-zinc-800/80 border border-transparent rounded-lg focus:bg-white dark:focus:bg-zinc-900 focus:border-indigo-500 focus:outline-none transition-colors"
                  />
                </div>
                {paletteSection === 'module' && (
                  <button
                    type="button"
                    onClick={() => setHideAddedFields((prev) => !prev)}
                    className={cn(
                      'h-7 px-2 rounded-lg text-[11px] font-medium transition-colors shrink-0 cursor-pointer',
                      hideAddedFields
                        ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    )}
                    title="Show only unmapped fields"
                  >
                    Unmapped
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsLeftCollapsed(true)}
                  className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors cursor-pointer shrink-0"
                  title="Collapse fields panel"
                >
                  <ChevronLeft size={14} />
                </button>
              </div>

              {/* Palette Mode Tabs */}
              <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                <div className="grid grid-cols-2 gap-1 p-0.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setPaletteSection('module')}
                    className={cn(
                      'py-1 text-xs font-medium rounded-md transition-colors cursor-pointer',
                      paletteSection === 'module'
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                    )}
                  >
                    Module fields
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaletteSection('custom')}
                    className={cn(
                      'py-1 text-xs font-medium rounded-md transition-colors cursor-pointer',
                      paletteSection === 'custom'
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                    )}
                  >
                    Custom & blocks
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 space-y-5">
                {paletteSection === 'module' ? (
                  <>
                    {/* Module Fields Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                          Schema fields
                        </span>
                        {(groups.length > 0 || ungroupedFields.length > 0) && (
                          <button
                            type="button"
                            onClick={handleSyncAllModuleFields}
                            className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                            title="Add all missing module fields to current step"
                          >
                            <Plus size={11} />
                            <span>Add all</span>
                          </button>
                        )}
                      </div>

                      {/* Repeatable Groups (1:N Sub-Tables) */}
                      {repeatableGroups.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[11px] font-medium text-violet-600 dark:text-violet-400 px-1 block">
                            Sub-tables (1:N)
                          </span>
                          {repeatableGroups.map((rep) => {
                            const isAdded = isFieldInCurrentForm(rep.id);
                            if (hideAddedFields && isAdded) return null;
                            if (
                              paletteSearch.trim() &&
                              !rep.label.toLowerCase().includes(paletteSearch.toLowerCase())
                            ) {
                              return null;
                            }
                            return (
                              <button
                                key={rep.id}
                                type="button"
                                onClick={() => handleToggleRepeater(rep)}
                                className={cn(
                                  'w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors group text-left cursor-pointer',
                                  isAdded
                                    ? 'bg-violet-50/80 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300'
                                    : 'hover:bg-zinc-100/80 dark:hover:bg-zinc-800/70 text-zinc-700 dark:text-zinc-300'
                                )}
                              >
                                <div className="min-w-0 pr-2 flex-1 flex items-center gap-2">
                                  <ListOrdered size={13} className="text-violet-500 shrink-0" />
                                  <span className="text-xs font-medium truncate">{rep.label}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-[10px] text-zinc-400 group-hover:hidden">
                                    {rep.fields.length} cols
                                  </span>
                                  {isAdded ? (
                                    <span className="flex items-center">
                                      <Check size={13} className="text-violet-600 dark:text-violet-400 group-hover:hidden" />
                                      <Minus size={13} className="text-rose-500 hidden group-hover:block" />
                                    </span>
                                  ) : (
                                    <Plus size={13} className="text-zinc-400 group-hover:text-violet-600" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Grouped Fields (Clean flat sections, no nested boxes) */}
                      <div className="space-y-4">
                        {groups.map((group) => {
                          const childIds = group.fields.map((f) => f.id);
                          const isContainerAdded = isFieldInCurrentForm(group.id);
                          const allAdded =
                            childIds.length > 0 &&
                            childIds.every((id) => isFieldInCurrentForm(id));
                          const visibleGroupFields = group.fields.filter((f: any) => {
                            if (hideAddedFields && isFieldInCurrentForm(f.id)) return false;
                            if (paletteSearch.trim()) {
                              const q = paletteSearch.toLowerCase();
                              return (
                                String(f.label || '').toLowerCase().includes(q) ||
                                String(group.label || '').toLowerCase().includes(q)
                              );
                            }
                            return true;
                          });

                          if (visibleGroupFields.length === 0 && (paletteSearch.trim() || hideAddedFields)) {
                            return null;
                          }

                          return (
                            <div key={group.id} className="space-y-1">
                              {/* Clean Section Header */}
                              <div className="flex items-center justify-between px-1 py-0.5 group/hdr">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Folder size={13} className="text-zinc-400 shrink-0" />
                                  <span
                                    className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 truncate"
                                    title={group.label}
                                  >
                                    {group.label}
                                  </span>
                                  <span className="text-[11px] text-zinc-400 shrink-0">
                                    {group.fields.length}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleGroupContainer(group)}
                                    title="Add entire group as a collapsible section box"
                                    className={cn(
                                      'text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors cursor-pointer',
                                      isContainerAdded
                                        ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                                        : 'text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                    )}
                                  >
                                    {isContainerAdded ? 'Box ✓' : '+ Box'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleGroup(group)}
                                    title="Add or remove all fields in this group"
                                    className={cn(
                                      'text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors cursor-pointer',
                                      allAdded
                                        ? 'text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10'
                                        : 'text-zinc-400 hover:text-indigo-600 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                    )}
                                  >
                                    {allAdded ? 'Clear' : '+ All'}
                                  </button>
                                </div>
                              </div>

                              {/* Clean Flat Field Rows */}
                              <div className="space-y-0.5 pl-1">
                                {visibleGroupFields.map((field: any) => {
                                  const isAdded = isFieldInCurrentForm(field.id);
                                  return (
                                    <button
                                      key={field.id}
                                      type="button"
                                      onClick={() =>
                                        handleToggleSingleField(
                                          field.id,
                                          field.label,
                                          field.required
                                        )
                                      }
                                      className={cn(
                                        'w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors group text-left cursor-pointer',
                                        isAdded
                                          ? 'bg-indigo-50/70 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                                          : 'hover:bg-zinc-100/80 dark:hover:bg-zinc-800/70 text-zinc-700 dark:text-zinc-300'
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          'text-xs truncate pr-2',
                                          isAdded ? 'font-medium' : 'font-normal'
                                        )}
                                        title={field.label}
                                      >
                                        {field.label}
                                      </span>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="text-[10px] text-zinc-400 capitalize group-hover:hidden">
                                          {String(field.type || '').replace('_', ' ')}
                                        </span>
                                        {isAdded ? (
                                          <span className="flex items-center">
                                            <Check size={13} className="text-indigo-600 dark:text-indigo-400 group-hover:hidden" />
                                            <Minus size={13} className="text-rose-500 hidden group-hover:block" />
                                          </span>
                                        ) : (
                                          <Plus
                                            size={13}
                                            className="text-zinc-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                                          />
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}

                        {/* Ungrouped Module Fields */}
                        {ungroupedFields.length > 0 && (
                          <div className="space-y-1">
                            {groups.length > 0 && (
                              <span className="text-[11px] font-medium text-zinc-400 px-1 block">
                                Other fields
                              </span>
                            )}
                            <div className="space-y-0.5">
                              {ungroupedFields
                                .filter((f: any) => {
                                  if (hideAddedFields && isFieldInCurrentForm(f.id)) return false;
                                  if (paletteSearch.trim()) {
                                    return String(f.label || '')
                                      .toLowerCase()
                                      .includes(paletteSearch.toLowerCase());
                                  }
                                  return true;
                                })
                                .map((field: any) => {
                                  const isAdded = isFieldInCurrentForm(field.id);
                                  return (
                                    <button
                                      key={field.id}
                                      type="button"
                                      onClick={() =>
                                        handleToggleSingleField(
                                          field.id,
                                          field.label,
                                          field.required
                                        )
                                      }
                                      className={cn(
                                        'w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors group text-left cursor-pointer',
                                        isAdded
                                          ? 'bg-indigo-50/70 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                                          : 'hover:bg-zinc-100/80 dark:hover:bg-zinc-800/70 text-zinc-700 dark:text-zinc-300'
                                      )}
                                    >
                                      <span className={cn('text-xs truncate pr-2', isAdded ? 'font-medium' : 'font-normal')}>
                                        {field.label}
                                      </span>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="text-[10px] text-zinc-400 capitalize group-hover:hidden">
                                          {String(field.type || '').replace('_', ' ')}
                                        </span>
                                        {isAdded ? (
                                          <span className="flex items-center">
                                            <Check size={13} className="text-indigo-600 dark:text-indigo-400 group-hover:hidden" />
                                            <Minus size={13} className="text-rose-500 hidden group-hover:block" />
                                          </span>
                                        ) : (
                                          <Plus
                                            size={13}
                                            className="text-zinc-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                                          />
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                            </div>
                          </div>
                        )}

                        {groups.length === 0 && ungroupedFields.length === 0 && (
                          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800 text-center space-y-2">
                            <p className="text-xs text-zinc-500">
                              {effectiveModuleId
                                ? 'No fields on this module layout yet.'
                                : 'No module bound. Select a module above or add Custom Fields.'}
                            </p>
                            <button
                              type="button"
                              onClick={() => setPaletteSection('custom')}
                              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                            >
                              Switch to Custom & blocks →
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Record Meta Fields Section */}
                    <div className="space-y-1.5 pt-3 border-t border-zinc-200/80 dark:border-zinc-800">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                          System fields
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          {systemMetaFields.length}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {systemMetaFields
                          .filter((meta) => {
                            if (hideAddedFields && isFieldInCurrentForm(meta.id)) return false;
                            if (paletteSearch.trim()) {
                              return String(meta.label || '')
                                .toLowerCase()
                                .includes(paletteSearch.toLowerCase());
                            }
                            return true;
                          })
                          .map((meta) => {
                          const isAdded = isFieldInCurrentForm(meta.id);
                          const Icon = meta.icon;
                          return (
                            <button
                              key={meta.id}
                              type="button"
                              onClick={() =>
                                handleToggleSingleField(meta.id, meta.label, false)
                              }
                              className={cn(
                                'w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors group text-left cursor-pointer',
                                isAdded
                                  ? 'bg-indigo-50/70 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                                  : 'hover:bg-zinc-100/80 dark:hover:bg-zinc-800/70 text-zinc-700 dark:text-zinc-300'
                              )}
                            >
                              <div className="flex items-center gap-2 min-w-0 pr-2 flex-1">
                                <Icon
                                  size={13}
                                  className={cn(
                                    'shrink-0 transition-colors',
                                    isAdded ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 group-hover:text-zinc-600'
                                  )}
                                />
                                <span className={cn('text-xs truncate', isAdded ? 'font-medium' : 'font-normal')}>
                                  {meta.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] text-zinc-400 capitalize group-hover:hidden">
                                  {String(meta.type || '').replace('_', ' ')}
                                </span>
                                {isAdded ? (
                                  <span className="flex items-center">
                                    <Check size={13} className="text-indigo-600 dark:text-indigo-400 group-hover:hidden" />
                                    <Minus size={13} className="text-rose-500 hidden group-hover:block" />
                                  </span>
                                ) : (
                                  <Plus
                                    size={13}
                                    className="text-zinc-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                                  />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Custom / Standalone Intake Fields */}
                    <div className="space-y-2">
                      <div className="px-1">
                        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                          Add Custom Form Field
                        </h3>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          Create standalone intake inputs, consent checkboxes, uploads, or signatures.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {STANDALONE_FIELD_TYPES.map((ft) => (
                          <button
                            key={ft.type}
                            type="button"
                            onClick={() =>
                              handleAddStandaloneCustomField(
                                ft.type,
                                ft.label,
                                ft.defaultOptions
                              )
                            }
                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 hover:border-indigo-500/40 hover:text-indigo-600 dark:hover:text-indigo-400 text-zinc-700 dark:text-zinc-300 text-left transition-all cursor-pointer"
                          >
                            <ft.icon size={12} className="text-indigo-500 shrink-0" />
                            <span className="text-[10.5px] font-medium truncate">{ft.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Containers & Repeaters (Field Group & 1:N Sub-Table) */}
                    <div className="space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="px-1">
                        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                          Field Groups & Repeaters (1:N)
                        </h3>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          Add collapsible grouped sections or multi-row repeatable line items.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAddStandaloneContainer('fieldGroup')}
                          className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/60 hover:border-indigo-500 text-indigo-700 dark:text-indigo-300 text-left transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Folder size={13} className="text-indigo-500 shrink-0" />
                            <div>
                              <span className="text-[11px] font-bold block">Field Group / Section</span>
                              <span className="text-[9.5px] text-zinc-500 dark:text-zinc-400">
                                Collapsible card grouping related fields
                              </span>
                            </div>
                          </div>
                          <Plus size={12} className="text-indigo-500 shrink-0" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddStandaloneContainer('repeatableGroup')}
                          className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-200/80 dark:border-violet-800/60 hover:border-violet-500 text-violet-700 dark:text-violet-300 text-left transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <ListOrdered size={13} className="text-violet-500 shrink-0" />
                            <div>
                              <span className="text-[11px] font-bold block">Repeater / Sub-Table (1:N)</span>
                              <span className="text-[9.5px] text-zinc-500 dark:text-zinc-400">
                                Dynamic rows (line items, dependents, assets)
                              </span>
                            </div>
                          </div>
                          <Plus size={12} className="text-violet-500 shrink-0" />
                        </button>
                      </div>
                    </div>

                    {/* Visual & Layout Elements */}
                    <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                      <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">
                        Visual & Layout Blocks
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { type: 'heading' as const, label: 'Heading', icon: Type },
                          { type: 'html-text' as const, label: 'Rich Text', icon: Code },
                          { type: 'alert' as const, label: 'Callout Alert', icon: AlertTriangle },
                          { type: 'divider' as const, label: 'Divider Line', icon: Minus },
                          { type: 'spacer' as const, label: 'Spacer', icon: Maximize2 },
                        ].map((el) => (
                          <button
                            key={el.type}
                            type="button"
                            onClick={() => handleAddVisualElement(el.type)}
                            className="flex flex-col items-center justify-center gap-1.5 p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 rounded-xl text-zinc-500 hover:text-indigo-600 hover:border-indigo-500/30 transition-all cursor-pointer"
                          >
                            <el.icon size={15} />
                            <span className="text-[10px] font-bold">{el.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.aside>
              )}
            </AnimatePresence>

            {/* Center Builder Column (Inline Top Bar + Dot-Grid Canvas) */}
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
              {renderTopToolbar()}
              <div className="flex-1 bg-zinc-100/70 dark:bg-zinc-950 bg-[radial-gradient(#d4d4d8_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] overflow-y-auto custom-scrollbar p-4 sm:p-8 flex flex-col items-center">
              <div
                className={cn(
                  'w-full mx-auto space-y-6 transition-all duration-300',
                  viewportMode === 'desktop' && 'max-w-3xl',
                  viewportMode === 'tablet' &&
                    'w-[768px] max-w-full p-6 bg-zinc-200/50 dark:bg-zinc-900/60 rounded-[2.5rem] border-2 border-zinc-300/80 dark:border-zinc-700/80 shadow-2xl ring-1 ring-black/5',
                  viewportMode === 'mobile' &&
                    'w-[390px] max-w-full p-4 bg-zinc-200/80 dark:bg-zinc-900/80 rounded-[3rem] border-[6px] border-zinc-300 dark:border-zinc-700 shadow-2xl ring-1 ring-black/10'
                )}
              >
                {/* Viewport Device Bezel Header */}
                {viewportMode === 'tablet' && (
                  <div className="flex items-center justify-between px-3.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-[10px] font-mono text-zinc-500 border border-zinc-200 dark:border-zinc-700/80">
                    <div className="flex items-center gap-1.5">
                      <Tablet size={12} className="text-indigo-500" />
                      <span className="font-bold text-zinc-700 dark:text-zinc-300">
                        Tablet Canvas (768px)
                      </span>
                    </div>
                    <span className="text-[9px] text-zinc-400">Adaptive touch & column layout</span>
                  </div>
                )}

                {viewportMode === 'mobile' && (
                  <div className="flex flex-col items-center gap-1 pb-1">
                    <div className="w-16 h-1 rounded-full bg-zinc-400 dark:bg-zinc-600 mb-0.5" />
                    <div className="w-full flex items-center justify-between px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-[10px] font-mono text-zinc-500 border border-zinc-200 dark:border-zinc-700/80">
                      <div className="flex items-center gap-1.5">
                        <Smartphone size={11} className="text-indigo-500" />
                        <span className="font-bold text-zinc-700 dark:text-zinc-300">
                          Mobile Canvas (390px)
                        </span>
                      </div>
                      <span className="text-[9px] text-zinc-400">Single-column stack</span>
                    </div>
                  </div>
                )}

                {/* Multi-Step Navigator Bar */}
                {activeForm.isMultistep && (
                  <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                          <ListOrdered size={14} />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-zinc-900 dark:text-white">
                            Multi-Step Wizard Navigator
                          </h3>
                          <p className="text-[10px] text-zinc-400">
                            Click a step to edit its fields or configure conditional skip logic
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newStepId = `step-${Date.now()}`;
                          updateActiveForm((prev) => ({
                            ...prev,
                            steps: [
                              ...prev.steps,
                              {
                                id: newStepId,
                                title: `Step ${prev.steps.length + 1}`,
                                fields: [],
                              },
                            ],
                          }));
                          setCurrentStepId(newStepId);
                          setSelectedItemId(newStepId);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-600 text-indigo-600 dark:text-indigo-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Add Step</span>
                      </button>
                    </div>

                    <div className="flex gap-2 p-1 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-100 dark:border-zinc-800 overflow-x-auto no-scrollbar">
                      {activeForm.steps.map((step, i) => {
                        const isActiveStep = currentStep?.id === step.id;
                        const isStepInspected = selectedItemId === step.id;
                        return (
                          <div
                            key={step.id}
                            onClick={() => {
                              setCurrentStepId(step.id);
                              setSelectedItemId(step.id);
                            }}
                            className={cn(
                              'shrink-0 flex items-center gap-2.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer border group/step',
                              isActiveStep
                                ? 'bg-white dark:bg-zinc-900 border-indigo-500 shadow-xs text-indigo-600 dark:text-indigo-400'
                                : isStepInspected
                                ? 'bg-white/60 dark:bg-zinc-900/60 border-indigo-500/40 text-indigo-500'
                                : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                            )}
                          >
                            <span
                              className={cn(
                                'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                                isActiveStep
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                              )}
                            >
                              {i + 1}
                            </span>
                            <input
                              type="text"
                              value={step.title}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateActiveForm((prev) => ({
                                  ...prev,
                                  steps: prev.steps.map((s) =>
                                    s.id === step.id ? { ...s, title: val } : s
                                  ),
                                }));
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="bg-transparent border-none p-0 text-xs font-bold focus:outline-none w-24 text-zinc-900 dark:text-white"
                            />
                            {step.visibilityRule && (
                              <span title="Conditional Step Skip Rule Active">
                                <Zap size={11} className="text-amber-500" />
                              </span>
                            )}
                            {activeForm.steps.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateActiveForm((prev) => {
                                    const nextSteps = prev.steps.filter((s) => s.id !== step.id);
                                    return {
                                      ...prev,
                                      steps: nextSteps,
                                      fields: nextSteps.flatMap((s) => s.fields || []),
                                    };
                                  });
                                  if (currentStepId === step.id) {
                                    const fallback = activeForm.steps.find((s) => s.id !== step.id);
                                    if (fallback) setCurrentStepId(fallback.id);
                                  }
                                }}
                                className="p-0.5 text-zinc-400 hover:text-rose-500 opacity-0 group-hover/step:opacity-100 transition-opacity cursor-pointer"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Form Canvas Surface */}
                <div className="bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
                  {/* Form Canvas Header — Primary Inline Editor for Form Title & Description */}
                  <div
                    onClick={() => setSelectedItemId(null)}
                    className="pb-5 border-b border-zinc-100 dark:border-zinc-800"
                  >
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={activeForm.name}
                        onChange={(e) =>
                          updateActiveForm((prev) => ({
                            ...prev,
                            name: e.target.value,
                            title: e.target.value,
                          }))
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="text-xl font-bold text-zinc-900 dark:text-white bg-transparent border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 focus:border-indigo-500 focus:outline-none rounded-lg px-2 py-0.5 -ml-2 w-full max-w-md transition-colors"
                        placeholder="Enter form name..."
                      />
                      <input
                        type="text"
                        value={activeForm.description || activeForm.settings?.description || ''}
                        onChange={(e) =>
                          updateActiveForm((prev) => ({
                            ...prev,
                            description: e.target.value,
                            settings: { ...prev.settings, description: e.target.value },
                          }))
                        }
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Add form description or applicant instructions..."
                        className="text-xs text-zinc-500 dark:text-zinc-400 bg-transparent border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 focus:border-indigo-500 focus:outline-none rounded-lg px-2 py-1 -ml-2 w-full transition-colors"
                      />
                    </div>
                  </div>

                  {/* Sortable 12-Col Grid */}
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={currentCanvasPlacements.map((f) => f.id)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="grid grid-cols-12 gap-4">
                        {currentCanvasPlacements.length > 0 ? (
                          currentCanvasPlacements.map((fObj) => {
                            const incIds = isContainerPlacement(fObj)
                              ? getContainerIncludedIds(fObj)
                              : [];
                            const addable = isContainerPlacement(fObj)
                              ? allLeafCandidateFieldsForContainers.filter(
                                  (cand) => cand.id !== fObj.id && !incIds.includes(cand.id)
                                )
                              : [];
                            return (
                              <SortableCanvasField
                                key={fObj.id}
                                fObj={fObj}
                                isSelected={selectedItemId === fObj.id}
                                moduleLayout={resolvedModuleLayout}
                                workflow={resolvedWorkflow}
                                customFields={activeForm.customFields || []}
                                availableFieldsToAdd={addable}
                                onSelect={setSelectedItemId}
                                onDelete={handleDeleteFieldFromForm}
                                onUpdatePlacement={handleUpdateFieldPlacement}
                                onAddFieldToContainer={handleAddExistingFieldToContainer}
                                onCreateSubFieldInContainer={(cid) =>
                                  handleCreateNewSubFieldInContainer(cid, 'text', 'Sub-Field')
                                }
                                onRemoveFieldFromContainer={handleRemoveSubFieldFromContainer}
                                isRestricted={isRestricted}
                                viewportMode={viewportMode}
                              />
                            );
                          })
                        ) : (
                          <div className="col-span-12 py-16 text-center space-y-3 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                            <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto text-zinc-400">
                              <MousePointer2 size={22} />
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-bold text-zinc-900 dark:text-white">
                                This form canvas is empty
                              </p>
                              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                                Click fields in the left palette to add Module Fields, Record Meta Fields, or Custom Intake Fields.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </SortableContext>
                  </DndContext>

                  {/* Submit Button Preview */}
                  <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    {activeForm.settings?.allowSaveDraft ? (
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                        <Save size={13} />
                        Save & Resume Later Enabled
                      </span>
                    ) : (
                      <span />
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedItemId(null)}
                      className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/10"
                    >
                      {activeForm.settings?.submitLabel || 'Submit'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            </div>

            {/* Right Inspector Sidebar (Expanded by Default, Animated Collapsible) */}
            <AnimatePresence initial={false}>
              {!isRightCollapsed && (
                <motion.aside
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 340, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="shrink-0 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col overflow-hidden"
                >
                  <div className="h-11 px-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <Settings2 size={14} className="text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-semibold text-zinc-900 dark:text-white">Properties</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsRightCollapsed(true)}
                      className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
                      title="Collapse properties panel"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                  <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">
              {selectedStep ? (
                /* STEP INSPECTOR */
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                    <div>
                      <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        Step Configuration
                      </h3>
                      <p className="text-[10px] text-zinc-400">Wizard Page & Skip Logic</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedItemId(null)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
                        Step Title
                      </label>
                      <input
                        type="text"
                        value={selectedStep.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateActiveForm((prev) => ({
                            ...prev,
                            steps: prev.steps.map((s) =>
                              s.id === selectedStep.id ? { ...s, title: val } : s
                            ),
                          }));
                        }}
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                          Conditional Skip Logic
                        </label>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                          Branching
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setConditionTarget({
                            targetId: selectedStep.id,
                            targetType: 'step',
                            label: `Step: ${selectedStep.title}`,
                            rule: selectedStep.visibilityRule,
                          })
                        }
                        className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-xl flex items-center justify-between hover:border-indigo-500 transition-all cursor-pointer"
                      >
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          {selectedStep.visibilityRule
                            ? 'Condition Rule Active'
                            : 'Always Show This Step'}
                        </span>
                        <Sliders size={14} className="text-indigo-500" />
                      </button>
                      {selectedStep.visibilityRule && (
                        <button
                          type="button"
                          onClick={() =>
                            updateActiveForm((prev) => ({
                              ...prev,
                              steps: prev.steps.map((s) =>
                                s.id === selectedStep.id
                                  ? { ...s, visibilityRule: undefined }
                                  : s
                              ),
                            }))
                          }
                          className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
                        >
                          Remove Step Condition
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : selectedPlacement ? (
                /* FIELD / VISUAL BLOCK INSPECTOR */
                (() => {
                  const isVisual =
                    String(selectedPlacement.id || '').startsWith('visual-') ||
                    ['heading', 'divider', 'spacer', 'html-text', 'alert'].includes(
                      selectedPlacement.type || ''
                    );
                  const effectiveType =
                    selectedFieldDef?.type || selectedPlacement.type || 'text';
                  const isRepeater = effectiveType === 'repeatableGroup';
                  const isFieldGroup = ['fieldGroup', 'group', 'card', 'accordion'].includes(
                    effectiveType
                  );
                  const isContainer = isRepeater || isFieldGroup;
                  const containerChildFields: any[] = isContainer
                    ? resolveContainerChildFields(
                        selectedPlacement,
                        selectedFieldDef || selectedCustomField,
                        resolvedModuleLayout,
                        resolvedWorkflow,
                        activeForm.customFields
                      )
                    : [];
                  const containerIncludedIds = isContainer
                    ? getContainerIncludedIds(selectedPlacement)
                    : [];
                  const addableToSelectedContainer = isContainer
                    ? allLeafCandidateFieldsForContainers.filter(
                        (cand) =>
                          cand.id !== selectedPlacement.id &&
                          !containerIncludedIds.includes(cand.id)
                      )
                    : [];
                  const availableContainersOnStep = !isContainer && !isVisual
                    ? currentCanvasPlacements.filter(
                        (p) => p.id !== selectedPlacement.id && isContainerPlacement(p)
                      )
                    : [];

                  return (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                        <div>
                          <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                            {isVisual
                              ? 'Visual Element'
                              : isRepeater
                              ? 'Repeater (1:N) Properties'
                              : isFieldGroup
                              ? 'Field Group Properties'
                              : 'Field Properties'}
                          </h3>
                          <p className="text-[10px] text-zinc-400 font-mono">
                            ID: {selectedPlacement.id}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedItemId(null)}
                          className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg cursor-pointer"
                        >
                          <X size={15} />
                        </button>
                      </div>

                      {/* Source Badge */}
                      {!isVisual && (
                        <div
                          className={cn(
                            'p-3 rounded-xl border text-xs flex items-center gap-2.5',
                            isRepeater
                              ? 'bg-violet-50/70 dark:bg-violet-950/20 border-violet-500/20 text-violet-700 dark:text-violet-300'
                              : selectedFieldDef?.isSystemMeta
                              ? 'bg-purple-50/70 dark:bg-purple-950/20 border-purple-500/20 text-purple-700 dark:text-purple-300'
                              : selectedCustomField
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                              : 'bg-indigo-50/70 dark:bg-indigo-950/20 border-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                          )}
                        >
                          <Info size={14} className="shrink-0" />
                          <span className="text-[11px] font-semibold leading-snug">
                            {isRepeater
                              ? `1:N Repeatable Sub-Table (${containerChildFields.length} sub-columns)`
                              : isFieldGroup
                              ? `Collapsible Field Group Section (${containerChildFields.length} child fields)`
                              : selectedFieldDef?.isSystemMeta
                              ? `System Meta Field (${selectedFieldDef.label})`
                              : selectedCustomField
                              ? `Custom Form Field (${selectedCustomField.type})`
                              : `Bound to ${resolvedModuleName} Schema (${selectedFieldDef?.type || 'text'})`}
                          </span>
                        </div>
                      )}

                      {/* Sub-Tabs for Field Inspector: Field & Layout vs Logic & Validation */}
                      {!isVisual && (
                        <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl">
                          <button
                            type="button"
                            onClick={() => setFieldInspectorTab('layout')}
                            className={cn(
                              'py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer',
                              fieldInspectorTab === 'layout'
                                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                            )}
                          >
                            Field & Layout
                          </button>
                          <button
                            type="button"
                            onClick={() => setFieldInspectorTab('logic')}
                            className={cn(
                              'py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer',
                              fieldInspectorTab === 'logic'
                                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                            )}
                          >
                            Logic & Rules
                          </button>
                        </div>
                      )}

                      {(isVisual || fieldInspectorTab === 'layout') && (
                        <>
                      {/* Label / Content */}
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
                          {isVisual
                            ? selectedPlacement.type === 'heading'
                              ? 'Heading Text'
                              : 'Content / Text'
                            : isRepeater
                            ? 'Repeater Section Title'
                            : isFieldGroup
                            ? 'Group Section Title'
                            : 'Field Label'}
                        </label>
                        <input
                          type="text"
                          value={selectedPlacement.labelOverride || ''}
                          onChange={(e) => {
                            handleUpdateFieldPlacement(selectedPlacement.id, {
                              labelOverride: e.target.value,
                            });
                            if (selectedCustomField) {
                              handleUpdateCustomFieldDef(selectedPlacement.id, {
                                label: e.target.value,
                              });
                            }
                          }}
                          placeholder={selectedFieldDef?.label || 'Enter label...'}
                          className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* Repeater & Field Group Container Configuration */}
                      {isContainer && (
                        <div className="space-y-4 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                              Collapsible Section Header
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateFieldPlacement(selectedPlacement.id, {
                                  collapsible: selectedPlacement.collapsible === false ? true : false,
                                })
                              }
                              className={cn(
                                'w-9 h-5 rounded-full relative transition-all cursor-pointer',
                                selectedPlacement.collapsible !== false
                                  ? 'bg-indigo-600'
                                  : 'bg-zinc-200 dark:bg-zinc-700'
                              )}
                            >
                              <div
                                className={cn(
                                  'absolute top-1 w-3 h-3 rounded-full bg-white transition-all',
                                  selectedPlacement.collapsible !== false ? 'right-1' : 'left-1'
                                )}
                              />
                            </button>
                          </div>

                          {selectedPlacement.collapsible !== false && (
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                Collapsed by Default
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateFieldPlacement(selectedPlacement.id, {
                                    defaultCollapsed: !selectedPlacement.defaultCollapsed,
                                  })
                                }
                                className={cn(
                                  'w-9 h-5 rounded-full relative transition-all cursor-pointer',
                                  selectedPlacement.defaultCollapsed
                                    ? 'bg-indigo-600'
                                    : 'bg-zinc-200 dark:bg-zinc-700'
                                )}
                              >
                                <div
                                  className={cn(
                                    'absolute top-1 w-3 h-3 rounded-full bg-white transition-all',
                                    selectedPlacement.defaultCollapsed ? 'right-1' : 'left-1'
                                  )}
                                />
                              </button>
                            </div>
                          )}

                          {isRepeater && (
                            <>
                              <div>
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                                  "Add Row" Button Label
                                </label>
                                <input
                                  type="text"
                                  value={selectedPlacement.addRowLabel || 'Add Item'}
                                  onChange={(e) =>
                                    handleUpdateFieldPlacement(selectedPlacement.id, {
                                      addRowLabel: e.target.value,
                                    })
                                  }
                                  placeholder="Add Item"
                                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                                    Min Rows
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={selectedPlacement.minRows ?? 0}
                                    onChange={(e) =>
                                      handleUpdateFieldPlacement(selectedPlacement.id, {
                                        minRows: Math.max(0, Number(e.target.value) || 0),
                                      })
                                    }
                                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                                    Max Rows (0 = ∞)
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={selectedPlacement.maxRows ?? 0}
                                    onChange={(e) => {
                                      const val = Math.max(0, Number(e.target.value) || 0);
                                      handleUpdateFieldPlacement(selectedPlacement.id, {
                                        maxRows: val > 0 ? val : undefined,
                                      });
                                    }}
                                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs"
                                  />
                                </div>
                              </div>
                            </>
                          )}

                          {/* Included Sub-Fields / Columns Manager */}
                          <div className="pt-2 border-t border-zinc-200/70 dark:border-zinc-700/70 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                {isRepeater ? 'Repeater Columns' : 'Fields Inside Group'} (
                                {containerChildFields.length})
                              </label>
                              <button
                                type="button"
                                onClick={() =>
                                  handleCreateNewSubFieldInContainer(
                                    selectedPlacement.id,
                                    'text',
                                    isRepeater ? 'Column' : 'Field'
                                  )
                                }
                                className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                              >
                                <Plus size={11} />
                                <span>New Custom Sub-Field</span>
                              </button>
                            </div>

                            {/* Picker to Add Any Existing Module / Meta / Form Field into this Group */}
                            {addableToSelectedContainer.length > 0 && (
                              <select
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleAddExistingFieldToContainer(
                                      selectedPlacement.id,
                                      e.target.value
                                    );
                                  }
                                }}
                                className="w-full px-3 py-2 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold focus:outline-none cursor-pointer"
                              >
                                <option value="">
                                  + Add Existing Module / Form Field to {isRepeater ? 'Repeater' : 'Group'}...
                                </option>
                                {addableToSelectedContainer.map((af) => (
                                  <option key={af.id} value={af.id}>
                                    {af.groupLabel ? `[${af.groupLabel}] ` : ''}
                                    {af.label} ({af.type})
                                  </option>
                                ))}
                              </select>
                            )}

                            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                              {containerChildFields.length === 0 ? (
                                <p className="text-[11px] text-zinc-400 text-center py-3 border border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl">
                                  No fields in this group yet. Click any field in the Left Palette or select one from the dropdown above.
                                </p>
                              ) : (
                                containerChildFields.map((sf: any) => {
                                  const isEditableCustomSub = Boolean(
                                    (selectedCustomField &&
                                      Array.isArray(selectedCustomField.fields) &&
                                      selectedCustomField.fields.some((c: any) => c.id === sf.id)) ||
                                      (activeForm.customFields || []).some((c) => c.id === sf.id)
                                  );

                                  const updateSubFieldDef = (patch: Partial<ModuleField>) => {
                                    if (
                                      selectedCustomField &&
                                      Array.isArray(selectedCustomField.fields) &&
                                      selectedCustomField.fields.some((c: any) => c.id === sf.id)
                                    ) {
                                      handleUpdateCustomFieldDef(selectedCustomField.id, {
                                        fields: selectedCustomField.fields.map((item: any) =>
                                          item.id === sf.id ? { ...item, ...patch } : item
                                        ),
                                      });
                                    } else {
                                      handleUpdateCustomFieldDef(sf.id, patch);
                                    }
                                  };

                                  return (
                                    <div
                                      key={sf.id}
                                      className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-1.5"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                          {isEditableCustomSub ? (
                                            <input
                                              type="text"
                                              value={sf.label}
                                              onChange={(e) =>
                                                updateSubFieldDef({ label: e.target.value })
                                              }
                                              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs font-semibold"
                                            />
                                          ) : (
                                            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate block">
                                              {sf.label}
                                            </span>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                          {isEditableCustomSub ? (
                                            <select
                                              value={sf.type || 'text'}
                                              onChange={(e) =>
                                                updateSubFieldDef({
                                                  type: e.target.value as FieldType,
                                                })
                                              }
                                              className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-1.5 py-1 text-[10px] font-mono"
                                            >
                                              <option value="text">text</option>
                                              <option value="number">number</option>
                                              <option value="currency">currency</option>
                                              <option value="date">date</option>
                                              <option value="select">select</option>
                                              <option value="checkbox">checkbox</option>
                                              <option value="email">email</option>
                                            </select>
                                          ) : (
                                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                                              {sf.type}
                                            </span>
                                          )}
                                          {isFieldGroup && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleRemoveSubFieldFromContainer(
                                                  selectedPlacement.id,
                                                  sf.id,
                                                  true
                                                )
                                              }
                                              className="p-1 text-zinc-400 hover:text-indigo-600 cursor-pointer"
                                              title="Move out of group onto main canvas"
                                            >
                                              <ExternalLink size={11} />
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleRemoveSubFieldFromContainer(
                                                selectedPlacement.id,
                                                sf.id,
                                                false
                                              )
                                            }
                                            className="p-1 text-zinc-400 hover:text-rose-500 cursor-pointer"
                                            title="Remove from group"
                                          >
                                            <Trash2 size={11} />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          {selectedCustomField &&
                            (effectiveModuleId || onPromoteFieldToModule) && (
                              <button
                                type="button"
                                onClick={() => handlePromoteCustomFieldToModule(selectedCustomField)}
                                className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                                title="Save this custom group/repeater permanently into the bound module's schema"
                              >
                                <Database size={12} />
                                <span>Promote to {resolvedModuleName} Schema</span>
                              </button>
                            )}
                        </div>
                      )}

                      {/* Custom Field Type & Options Editor (for non-container custom fields) */}
                      {selectedCustomField && !isContainer && (
                        <div className="space-y-3 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800">
                          <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                              Input Data Type
                            </label>
                            <select
                              value={selectedCustomField.type}
                              onChange={(e) => {
                                const nextType = e.target.value as FieldType;
                                handleUpdateCustomFieldDef(selectedCustomField.id, {
                                  type: nextType,
                                  options:
                                    nextType === 'select' && !selectedCustomField.options
                                      ? ['Option 1', 'Option 2']
                                      : selectedCustomField.options,
                                });
                                handleUpdateFieldPlacement(selectedCustomField.id, {
                                  type: nextType,
                                });
                              }}
                              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs"
                            >
                              {STANDALONE_FIELD_TYPES.map((ft) => (
                                <option key={ft.type} value={ft.type}>
                                  {ft.label} ({ft.type})
                                </option>
                              ))}
                            </select>
                          </div>

                          {(selectedCustomField.type === 'select' ||
                            selectedCustomField.type === 'radio' ||
                            selectedCustomField.type === 'multiselect') && (
                            <div>
                              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                                Dropdown Options (One per line)
                              </label>
                              <textarea
                                rows={4}
                                value={(selectedCustomField.options || []).join('\n')}
                                onChange={(e) =>
                                  handleUpdateCustomFieldDef(selectedCustomField.id, {
                                    options: e.target.value
                                      .split('\n')
                                      .map((s) => s.trim())
                                      .filter(Boolean),
                                  })
                                }
                                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-2.5 text-xs font-mono"
                                placeholder="Option 1&#10;Option 2&#10;Option 3"
                              />
                            </div>
                          )}

                          {(effectiveModuleId || onPromoteFieldToModule) && (
                            <button
                              type="button"
                              onClick={() => handlePromoteCustomFieldToModule(selectedCustomField)}
                              className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                              title="Save this custom form field permanently into the bound module's schema"
                            >
                              <Database size={12} />
                              <span>Promote to {resolvedModuleName} Schema</span>
                            </button>
                          )}
                        </div>
                      )}

                      {!isVisual && (
                        <>
                          <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
                              Placeholder Text
                            </label>
                            <input
                              type="text"
                              value={selectedPlacement.placeholderOverride || ''}
                              onChange={(e) =>
                                handleUpdateFieldPlacement(selectedPlacement.id, {
                                  placeholderOverride: e.target.value,
                                })
                              }
                              placeholder={selectedFieldDef?.placeholder || 'Custom placeholder...'}
                              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
                              Helper / Guidance Text
                            </label>
                            <input
                              type="text"
                              value={selectedPlacement.helperTextOverride || ''}
                              onChange={(e) =>
                                handleUpdateFieldPlacement(selectedPlacement.id, {
                                  helperTextOverride: e.target.value,
                                })
                              }
                              placeholder="Displayed below the input..."
                              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </>
                      )}

                      {/* Spacer / Alert Visual Settings */}
                      {isVisual && selectedPlacement.type === 'spacer' && (
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
                            Spacer Height
                          </label>
                          <select
                            value={selectedPlacement.height || 'md'}
                            onChange={(e) =>
                              handleUpdateFieldPlacement(selectedPlacement.id, {
                                height: e.target.value as any,
                              })
                            }
                            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs"
                          >
                            <option value="sm">Small (16px)</option>
                            <option value="md">Medium (32px)</option>
                            <option value="lg">Large (48px)</option>
                            <option value="xl">Extra Large (64px)</option>
                          </select>
                        </div>
                      )}

                      {isVisual && selectedPlacement.type === 'alert' && (
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
                            Alert Callout Style
                          </label>
                          <select
                            value={selectedPlacement.alertStyle || 'info'}
                            onChange={(e) =>
                              handleUpdateFieldPlacement(selectedPlacement.id, {
                                alertStyle: e.target.value as any,
                              })
                            }
                            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs"
                          >
                            <option value="info">Information (Indigo)</option>
                            <option value="success">Success (Emerald)</option>
                            <option value="warning">Warning (Amber)</option>
                            <option value="error">Critical / Error (Rose)</option>
                          </select>
                        </div>
                      )}

                      {/* 12-Col Grid Width */}
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
                          Grid Column Width (12-Col)
                        </label>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[
                            { id: 'full', label: 'Full', span: '12/12' },
                            { id: 'half', label: '1/2', span: '6/12' },
                            { id: 'two-thirds', label: '2/3', span: '8/12' },
                            { id: 'one-third', label: '1/3', span: '4/12' },
                            { id: 'one-quarter', label: '1/4', span: '3/12' },
                          ].map((opt) => {
                            const active =
                              selectedPlacement.width === opt.id ||
                              (!selectedPlacement.width && opt.id === 'full');
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() =>
                                  handleUpdateFieldPlacement(selectedPlacement.id, {
                                    width: opt.id as any,
                                  })
                                }
                                className={cn(
                                  'py-2 rounded-xl text-[10px] font-bold border transition-all flex flex-col items-center justify-center cursor-pointer',
                                  active
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                                    : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                                )}
                              >
                                <span>{opt.label}</span>
                                <span className="text-[8px] opacity-75">{opt.span}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Move into Field Group / Repeater (when a loose field is selected) */}
                      {availableContainersOnStep.length > 0 && (
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
                            Move Field into Group / Repeater
                          </label>
                          <select
                            value=""
                            onChange={(e) => {
                              const targetContainerId = e.target.value;
                              if (!targetContainerId) return;
                              handleAddExistingFieldToContainer(
                                targetContainerId,
                                selectedPlacement.id
                              );
                              setSelectedItemId(targetContainerId);
                            }}
                            className="w-full bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl px-3.5 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 cursor-pointer"
                          >
                            <option value="">Move into a Field Group on this step...</option>
                            {availableContainersOnStep.map((cont) => (
                              <option key={cont.id} value={cont.id}>
                                {cont.labelOverride || cont.id}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Move to Step */}
                      {activeForm.isMultistep && activeForm.steps.length > 1 && (
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
                            Wizard Step Assignment
                          </label>
                          <select
                            value={currentStep?.id || ''}
                            onChange={(e) => {
                              const targetStepId = e.target.value;
                              if (!currentStep || targetStepId === currentStep.id) return;
                              const moving = selectedPlacement;
                              updateActiveForm((prev) => {
                                const nextSteps = prev.steps.map((s) => {
                                  if (s.id === currentStep.id) {
                                    return {
                                      ...s,
                                      fields: s.fields.filter((f) => f.id !== moving.id),
                                    };
                                  }
                                  if (s.id === targetStepId) {
                                    return {
                                      ...s,
                                      fields: [...(s.fields || []), moving],
                                    };
                                  }
                                  return s;
                                });
                                return {
                                  ...prev,
                                  steps: nextSteps,
                                  fields: nextSteps.flatMap((s) => s.fields),
                                };
                              });
                              setCurrentStepId(targetStepId);
                            }}
                            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs cursor-pointer"
                          >
                            {activeForm.steps.map((s, idx) => (
                              <option key={s.id} value={s.id}>
                                Step {idx + 1}: {s.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Behavior Flags: Required, Read-Only, Hidden */}
                      {!isVisual && (
                        <div className="space-y-2.5 py-3 border-y border-zinc-100 dark:border-zinc-800">
                          {[
                            {
                              key: 'required' as const,
                              label: 'Required Field',
                              locked: Boolean(
                                !selectedCustomField && selectedFieldDef?.required
                              ),
                              checked: Boolean(
                                selectedPlacement.required || selectedFieldDef?.required
                              ),
                            },
                            {
                              key: 'readOnly' as const,
                              label: 'Read-Only Field',
                              locked: false,
                              checked: Boolean(selectedPlacement.readOnly),
                            },
                            {
                              key: 'hidden' as const,
                              label: 'Hidden Field (Context / URL Prefill)',
                              locked: false,
                              checked: Boolean(selectedPlacement.hidden),
                            },
                          ].map((flag) => (
                            <div
                              key={flag.key}
                              className="flex items-center justify-between"
                            >
                              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                                {flag.label}
                                {flag.locked && (
                                  <Lock
                                    size={11}
                                    className="text-indigo-500"
                                    title="Enforced by module schema"
                                  />
                                )}
                              </span>
                              <button
                                type="button"
                                disabled={flag.locked}
                                onClick={() =>
                                  handleUpdateFieldPlacement(selectedPlacement.id, {
                                    [flag.key]: !flag.checked,
                                  })
                                }
                                className={cn(
                                  'w-9 h-5 rounded-full relative transition-all cursor-pointer disabled:opacity-50',
                                  flag.checked
                                    ? 'bg-indigo-600'
                                    : 'bg-zinc-200 dark:bg-zinc-700'
                                )}
                              >
                                <div
                                  className={cn(
                                    'absolute top-1 w-3 h-3 rounded-full bg-white transition-all',
                                    flag.checked ? 'right-1' : 'left-1'
                                  )}
                                />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                        </>
                      )}

                      {!isVisual && fieldInspectorTab === 'logic' && (
                        <>
                      {/* Context & Prefill Mapping (Formstack / iApply feature) */}
                      {!isVisual && (
                        <div className="space-y-3 pt-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                              Default Value & Context Prefill
                            </label>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400">
                              Auto-Fill
                            </span>
                          </div>

                          <select
                            value={selectedPlacement.prefill?.source || 'none'}
                            onChange={(e) =>
                              handleUpdateFieldPlacement(selectedPlacement.id, {
                                prefill: {
                                  ...(selectedPlacement.prefill || {}),
                                  source: e.target.value as any,
                                },
                              })
                            }
                            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs"
                          >
                            <option value="none">No Prefill (User Input)</option>
                            <option value="static">Static Default Value</option>
                            <option value="url_param">URL Query Parameter (?param=)</option>
                            <option value="user_context">Logged-In User Context ($user)</option>
                            <option value="parent_context">Contextual Parent Object / Record</option>
                            <option value="today">Current Date (Today)</option>
                          </select>

                          {selectedPlacement.prefill?.source === 'static' && (
                            <input
                              type="text"
                              value={selectedPlacement.prefill.staticValue || ''}
                              onChange={(e) =>
                                handleUpdateFieldPlacement(selectedPlacement.id, {
                                  prefill: {
                                    ...selectedPlacement.prefill!,
                                    staticValue: e.target.value,
                                  },
                                })
                              }
                              placeholder="Enter default value..."
                              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs"
                            />
                          )}

                          {selectedPlacement.prefill?.source === 'url_param' && (
                            <input
                              type="text"
                              value={selectedPlacement.prefill.urlParam || ''}
                              onChange={(e) =>
                                handleUpdateFieldPlacement(selectedPlacement.id, {
                                  prefill: {
                                    ...selectedPlacement.prefill!,
                                    urlParam: e.target.value,
                                  },
                                })
                              }
                              placeholder={`Query param key (default: ${selectedPlacement.id})`}
                              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono"
                            />
                          )}

                          {selectedPlacement.prefill?.source === 'user_context' && (
                            <select
                              value={selectedPlacement.prefill.userAttribute || 'email'}
                              onChange={(e) =>
                                handleUpdateFieldPlacement(selectedPlacement.id, {
                                  prefill: {
                                    ...selectedPlacement.prefill!,
                                    userAttribute: e.target.value as any,
                                  },
                                })
                              }
                              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs"
                            >
                              <option value="email">Logged-in User Email ($user.email)</option>
                              <option value="name">Logged-in User Full Name ($user.name)</option>
                              <option value="id">Logged-in User ID ($user.id)</option>
                              <option value="partyId">Directory Party ID ($user.partyId)</option>
                              <option value="organisationId">Organisation ID ($user.organisationId)</option>
                              <option value="phone">User Phone ($user.phone)</option>
                            </select>
                          )}

                          {selectedPlacement.prefill?.source === 'parent_context' && (
                            <input
                              type="text"
                              value={selectedPlacement.prefill.parentParam || ''}
                              onChange={(e) =>
                                handleUpdateFieldPlacement(selectedPlacement.id, {
                                  prefill: {
                                    ...selectedPlacement.prefill!,
                                    parentParam: e.target.value,
                                  },
                                })
                              }
                              placeholder="Parent property or URL param (e.g. accountId)"
                              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono"
                            />
                          )}
                        </div>
                      )}

                      {/* Conditional Visibility & Formula Buttons */}
                      <div className="space-y-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                          Logic & Calculations
                        </label>

                        <button
                          type="button"
                          onClick={() =>
                            setConditionTarget({
                              targetId: selectedPlacement.id,
                              targetType: 'field',
                              label:
                                selectedPlacement.labelOverride ||
                                selectedFieldDef?.label ||
                                selectedPlacement.id,
                              rule: selectedPlacement.visibilityRule,
                            })
                          }
                          className="w-full p-3 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-xl flex items-center justify-between hover:border-indigo-500 transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                            <Sliders size={14} className="text-amber-500" />
                            <span>
                              {selectedPlacement.visibilityRule
                                ? 'Visibility Condition Active'
                                : 'Add Conditional Visibility'}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-indigo-600">Edit</span>
                        </button>

                        {selectedPlacement.visibilityRule && (
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateFieldPlacement(selectedPlacement.id, {
                                visibilityRule: undefined,
                              })
                            }
                            className="text-[10px] font-bold text-rose-500 hover:underline block"
                          >
                            Clear Visibility Condition
                          </button>
                        )}

                        {!isVisual && (
                          <button
                            type="button"
                            onClick={() => setShowCalculatorModal(true)}
                            className="w-full p-3 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-xl flex items-center justify-between hover:border-indigo-500 transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                              <Calculator size={14} className="text-indigo-500" />
                              <span>
                                {selectedPlacement.calculationLogic
                                  ? 'Formula Calculation Active'
                                  : 'Configure Calculation Formula'}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-indigo-600">Edit</span>
                          </button>
                        )}
                      </div>

                      {/* Validation Constraints */}
                      {!isVisual && (
                        <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                            Validation Rules
                          </label>
                          <div>
                            <label className="text-[10px] text-zinc-400 block mb-1">
                              Regex Pattern Constraint
                            </label>
                            <input
                              type="text"
                              value={selectedPlacement.validation?.pattern || ''}
                              onChange={(e) =>
                                handleUpdateFieldPlacement(selectedPlacement.id, {
                                  validation: {
                                    ...(selectedPlacement.validation || {}),
                                    pattern: e.target.value,
                                  },
                                })
                              }
                              placeholder="e.g. ^[0-9]{4,8}$"
                              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-zinc-400 block mb-1">
                              Custom Validation Error Message
                            </label>
                            <input
                              type="text"
                              value={selectedPlacement.validation?.errorMessage || ''}
                              onChange={(e) =>
                                handleUpdateFieldPlacement(selectedPlacement.id, {
                                  validation: {
                                    ...(selectedPlacement.validation || {}),
                                    errorMessage: e.target.value,
                                  },
                                })
                              }
                              placeholder="Please enter a valid value..."
                              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs"
                            />
                          </div>
                        </div>
                      )}
                        </>
                      )}

                      <div className="pt-4">
                        <button
                          type="button"
                          onClick={() => handleDeleteFieldFromForm(selectedPlacement.id)}
                          className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          Remove from Form
                        </button>
                      </div>
                    </div>
                  );
                })()
              ) : (
                /* FORM SUMMARY PROPERTIES (when no field or step is selected) */
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Form Properties</h3>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Click any field on the canvas to edit its properties.
                    </p>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">Form Title</label>
                      <input
                        type="text"
                        value={activeForm.name}
                        onChange={(e) => updateActiveForm((prev) => ({ ...prev, name: e.target.value }))}
                        className="w-full h-8 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">Description</label>
                      <textarea
                        rows={2}
                        value={activeForm.description || ''}
                        onChange={(e) => updateActiveForm((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Optional form subtitle..."
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">Submit Button Label</label>
                      <input
                        type="text"
                        value={activeForm.settings?.submitLabel || ''}
                        onChange={(e) =>
                          updateActiveForm((prev) => ({
                            ...prev,
                            settings: { ...prev.settings, submitLabel: e.target.value },
                          }))
                        }
                        placeholder="Submit"
                        className="w-full h-8 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <label className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg cursor-pointer">
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Allow Save &amp; Resume</span>
                      <input
                        type="checkbox"
                        checked={Boolean(activeForm.settings?.allowSaveDraft)}
                        onChange={(e) =>
                          updateActiveForm((prev) => ({
                            ...prev,
                            settings: { ...prev.settings, allowSaveDraft: e.target.checked },
                          }))
                        }
                        className="w-3.5 h-3.5 text-indigo-600 rounded border-zinc-300 dark:border-zinc-700 focus:ring-indigo-500 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              )}
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Calculator Modal */}
      {showCalculatorModal && selectedPlacement && (
        <CalculatorModal
          isOpen={showCalculatorModal}
          onClose={() => setShowCalculatorModal(false)}
          availableFields={allAvailableFieldsForModals as any}
          targetLabel={
            selectedPlacement.labelOverride ||
            selectedFieldDef?.label ||
            selectedPlacement.id
          }
          initialLogic={selectedPlacement.calculationLogic}
          initialTriggers={selectedPlacement.calculationTriggers}
          onSave={(logic, triggers) => {
            handleUpdateFieldPlacement(selectedPlacement.id, {
              calculationLogic: logic,
              calculationTriggers: triggers,
            });
            toast.success('Calculation formula saved!');
            setShowCalculatorModal(false);
          }}
        />
      )}

      {/* Condition Modal (for either Field or Step) */}
      {conditionTarget && (
        <ConditionModal
          isOpen={Boolean(conditionTarget)}
          onClose={() => setConditionTarget(null)}
          availableFields={allAvailableFieldsForModals as any}
          tabs={[]}
          targetLabel={conditionTarget.label}
          initialRule={conditionTarget.rule}
          onSave={(rule) => {
            if (conditionTarget.targetType === 'step') {
              updateActiveForm((prev) => ({
                ...prev,
                steps: prev.steps.map((s) =>
                  s.id === conditionTarget.targetId ? { ...s, visibilityRule: rule } : s
                ),
              }));
            } else {
              handleUpdateFieldPlacement(conditionTarget.targetId, {
                visibilityRule: rule,
              });
            }
            toast.success('Conditional rule saved!');
            setConditionTarget(null);
          }}
        />
      )}

      {/* Public Form Publish & Embed Studio Modal */}
      {showPublishModal && (
        <PublicFormPublishModal
          isOpen={showPublishModal}
          onClose={() => setShowPublishModal(false)}
          moduleId={effectiveModuleId}
          moduleName={resolvedModuleName}
          formId={activeForm.id}
          formName={activeForm.name}
        />
      )}

      {/* Manage Module Forms Modal (Premium Aurora Animated Portal Modal) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {showFormsManagerModal && isModuleEmbedded && externalForms && (
              <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  onClick={() => setShowFormsManagerModal(false)}
                  className="absolute inset-0 bg-black/60 backdrop-blur-md"
                />

                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: 16 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 340 }}
                  className="relative w-full max-w-2xl bg-white dark:bg-[#151518] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[84vh] z-10 ring-1 ring-black/5 dark:ring-white/10"
                >
                  {/* Premium Modal Header */}
                  <div className="px-6 py-4 bg-gradient-to-b from-zinc-50/90 to-white dark:from-zinc-900/90 dark:to-[#151518] border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-4 shrink-0">
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-inner">
                        <Layers size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white tracking-tight truncate">
                            Module Forms — {resolvedModuleName}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[10px] font-bold shrink-0 whitespace-nowrap">
                            {externalForms.length} {externalForms.length === 1 ? 'form' : 'forms'}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                          Switch the active form in the builder, create a new form, or clone existing forms
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          handleCreateNewModuleForm();
                          setShowFormsManagerModal(false);
                        }}
                        className="h-9 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
                      >
                        <Plus size={14} className="shrink-0" />
                        <span>New Form</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowFormsManagerModal(false)}
                        className="w-9 h-9 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 inline-flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Search & Purpose Filter Bar */}
                  <div className="px-6 py-3.5 bg-zinc-50/70 dark:bg-zinc-950/40 border-b border-zinc-100 dark:border-zinc-800/80 space-y-2.5 shrink-0">
                    <div className="relative">
                      <Search
                        size={14}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                      />
                      <input
                        type="text"
                        value={formsModalSearch}
                        onChange={(e) => setFormsModalSearch(e.target.value)}
                        placeholder="Search module forms by name or description..."
                        className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                      <button
                        type="button"
                        onClick={() => setFormsModalPurposeFilter('all')}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shrink-0 cursor-pointer',
                          formsModalPurposeFilter === 'all'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                        )}
                      >
                        All ({externalForms.length})
                      </button>
                      {FORM_USAGE_MODES.map((m) => {
                        const countForMode = externalForms.filter(
                          (f) => normalizeFormSchema(f, propModuleId).usage === m.id
                        ).length;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setFormsModalPurposeFilter(m.id)}
                            className={cn(
                              'px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shrink-0 cursor-pointer',
                              formsModalPurposeFilter === m.id
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                            )}
                          >
                            {m.shortLabel} ({countForMode})
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Forms List Body */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-2.5 custom-scrollbar">
                    {externalForms
                      .map((f) => normalizeFormSchema(f, propModuleId))
                      .filter((normF) => {
                        if (
                          formsModalPurposeFilter !== 'all' &&
                          normF.usage !== formsModalPurposeFilter
                        ) {
                          return false;
                        }
                        if (formsModalSearch.trim()) {
                          const q = formsModalSearch.toLowerCase();
                          return (
                            normF.name.toLowerCase().includes(q) ||
                            String(normF.description || normF.settings?.description || '')
                              .toLowerCase()
                              .includes(q)
                          );
                        }
                        return true;
                      })
                      .map((normF, idx) => {
                        const fMeta = getUsageModeMeta(normF.usage);
                        const isCurrent = normF.id === activeForm.id;
                        const fieldCount = (normF.isMultistep
                          ? normF.steps.flatMap((s) => s.fields || [])
                          : normF.fields || []
                        ).filter((fo) => !String(fo.id || '').startsWith('visual-')).length;

                        return (
                          <motion.div
                            key={normF.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.16, delay: Math.min(idx * 0.03, 0.18) }}
                            onClick={() => {
                              setActiveFormId(normF.id);
                              setSelectedItemId(null);
                              setShowFormsManagerModal(false);
                            }}
                            className={cn(
                              'p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 cursor-pointer group',
                              isCurrent
                                ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-500 ring-1 ring-indigo-500/20 shadow-xs'
                                : 'bg-white dark:bg-zinc-900/90 border-zinc-200/80 dark:border-zinc-800 hover:border-indigo-400/60 hover:shadow-sm'
                            )}
                          >
                            <div className="flex items-start gap-3.5 min-w-0 flex-1">
                              <div
                                className={cn(
                                  'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                                  isCurrent
                                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                                )}
                              >
                                <fMeta.icon size={16} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                                    {normF.name}
                                  </span>
                                  <span
                                    className={cn(
                                      'px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border whitespace-nowrap shrink-0',
                                      fMeta.badgeClass
                                    )}
                                  >
                                    {fMeta.shortLabel}
                                  </span>
                                  {isCurrent && (
                                    <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-bold uppercase whitespace-nowrap shrink-0">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                  {normF.description ||
                                    normF.settings?.description ||
                                    fMeta.description}
                                </p>
                                <div className="flex items-center gap-3 mt-1.5 text-[10px] font-medium text-zinc-400">
                                  <span>
                                    {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
                                  </span>
                                  {normF.isMultistep && (
                                    <span className="text-indigo-500 font-semibold">
                                      • {normF.steps.length} wizard steps
                                    </span>
                                  )}
                                  {normF.settings?.payment?.enabled && (
                                    <span className="text-emerald-600 font-semibold">
                                      • Payable
                                    </span>
                                  )}
                                  {normF.settings?.enableReviewStep && (
                                    <span className="text-indigo-500 font-semibold">
                                      • Review Step
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const clonedId = `form-${Date.now()}`;
                                  const clonedUsage: FormUsageType =
                                    normF.usage === 'workspace_create' ||
                                    normF.usage === 'workspace_edit'
                                      ? 'action_trigger'
                                      : normF.usage;
                                  const cloned = normalizeFormSchema(
                                    {
                                      ...JSON.parse(JSON.stringify(normF)),
                                      id: clonedId,
                                      name: `${normF.name} (Copy)`,
                                      title: `${normF.name} (Copy)`,
                                      usage: clonedUsage,
                                    },
                                    propModuleId
                                  );
                                  if (onFormsChange) {
                                    onFormsChange((prev) => [...prev, cloned]);
                                  }
                                  setActiveFormId(cloned.id);
                                  setSelectedItemId(null);
                                  setShowFormsManagerModal(false);
                                  toast.success(`Cloned "${normF.name}"`);
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Duplicate / Clone this form"
                              >
                                <Copy size={12} />
                                <span>Clone</span>
                              </button>

                              {normF.id !== 'default-create' && externalForms.length > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onFormsChange) {
                                      onFormsChange((prev) =>
                                        prev.filter((item) => item.id !== normF.id)
                                      );
                                    }
                                    if (activeForm.id === normF.id) {
                                      const fallback = externalForms.find(
                                        (item) => item.id !== normF.id
                                      );
                                      setActiveFormId(fallback?.id || null);
                                    }
                                    toast.success(`Deleted "${normF.name}"`);
                                  }}
                                  className="p-2 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                  title="Delete Form"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                  </div>

                  {/* Modal Footer */}
                  <div className="px-6 py-3 bg-zinc-50/80 dark:bg-zinc-900/60 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 shrink-0">
                    <span>Click any form card to load it into the canvas</span>
                    <button
                      type="button"
                      onClick={() => setShowFormsManagerModal(false)}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};
