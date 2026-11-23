import React, { useState, useRef } from 'react';
import { GripVertical, Trash2, Folder, ListPlus, Move, BrainCircuit, Settings2, Copy, ChevronDown, Box, LayoutGrid, FolderTree, ListOrdered, GitCommit, Layers, Plus, ExternalLink, Sparkles } from 'lucide-react';
import { cn, calculateHeight } from '../../lib/utils';
import { GRID_CONFIG } from '../ModuleEditor';

export interface Field {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  colSpan?: number;
  startCol?: number;
  rowIndex?: number;
  rowSpan?: number;
  fields?: Field[];
  tabId?: string;
  options?: string[];
  parentId?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  isCollapsed?: boolean;
  showIcon?: boolean;
  iconName?: string;
  visibilityRule?: any;
  detailViewMode?: 'page' | 'modal';
  detailLayoutType?: 'tabs' | 'split' | 'sidebar' | 'process' | 'accordion';
}

import { DynamicIcon } from '../UI/DynamicIcon';

interface FieldGroupProps {
  block: Field;
  selectedIds: string[];
  onSelect: (id: string, e?: React.MouseEvent) => void;
  onUpdate: (id: string, updates: Partial<Field>) => void;
  onDelete: (id: string) => void;
  onDrop: (e: React.DragEvent, parentId?: string) => void;
  onDragOver?: (e: React.DragEvent, parentId?: string) => void;
  onDragStart?: (e: any, data?: any) => void;
  isDraggingOver?: boolean;
  renderNested?: (fields: Field[], parentId: string) => React.ReactNode;
  viewportSize: 'desktop' | 'tablet' | 'mobile';
  onClone: (id: string) => void;
  hoveredMapping?: { connectorId: string, sourceOutput: string, targetFieldId: string } | null;
  dragOverInfo?: { col: number, span: number, index: number, active: boolean, parentId?: string, height?: number } | null;
  gridConfig?: typeof GRID_CONFIG;
  isDragging?: boolean;
  density?: 'compact' | 'standard' | 'spacious';
  style?: React.CSSProperties;
  className?: string;
  availableFieldsToNest?: Array<{ id: string; label: string; type: string }>;
  onMoveFieldToContainer?: (containerId: string, fieldId: string) => void;
  onRequestAddSubfield?: (containerId: string, containerLabel: string) => void;
  onCreateFieldInContainer?: (containerId: string, fieldType?: string) => void;
  onMoveToRoot?: (fieldId: string) => void;
}

const SPAN_CYCLE: number[] = [12, 8, 6, 4, 3];
const getSpanLabel = (colSpan?: number) => {
  const s = colSpan || 12;
  if (s === 12) return 'Full';
  if (s === 8) return '2/3';
  if (s === 6) return '1/2';
  if (s === 4) return '1/3';
  if (s === 3) return '1/4';
  return `${s}/12`;
};

export const FieldGroup = React.forwardRef<HTMLDivElement, FieldGroupProps & Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect' | 'onDragStart' | 'onDrop' | 'onDragOver'>>(({
  block,
  selectedIds,
  onSelect,
  onUpdate,
  onDelete,
  onDrop,
  onDragOver,
  onDragStart: _onDragStart,
  renderNested,
  viewportSize,
  onClone,
  isDraggingOver,
  hoveredMapping,
  dragOverInfo,
  gridConfig,
  isDragging,
  density = 'standard',
  style,
  className,
  availableFieldsToNest = [],
  onMoveFieldToContainer,
  onRequestAddSubfield,
  onCreateFieldInContainer,
  onMoveToRoot,
  ...rest
}, ref) => {
  const isSelected = selectedIds.includes(block.id);
  const isRepeatable = block.type === 'repeatableGroup';
  const isCard = block.type === 'card';
  const isAccordion = block.type === 'accordion';
  const isTabs = block.type === 'tabs_nested';
  
  const cardPadding = density === 'compact' ? 'p-2 rounded-lg' : density === 'spacious' ? 'p-5 rounded-2xl' : 'p-4 rounded-xl';
  const headerMargin = density === 'compact' ? 'mb-1' : density === 'spacious' ? 'mb-3' : 'mb-2';
  const iconBoxSize = density === 'compact' ? 'w-6 h-6 rounded-md' : density === 'spacious' ? 'w-8 h-8 rounded-lg' : 'w-7 h-7 rounded-lg';
  const iconSize = density === 'compact' ? 12 : density === 'spacious' ? 16 : 14;
  const titleTextSize = density === 'compact' ? 'text-xs' : density === 'spacious' ? 'text-sm font-bold' : 'text-xs font-bold';
  const subtitleTextSize = density === 'compact' ? 'text-[8px]' : density === 'spacious' ? 'text-[10px]' : 'text-[9px]';

  const getIcon = (size: number = 16) => {
    if (block.iconName) {
      return <DynamicIcon name={block.iconName} size={size} />;
    }

    switch (block.type) {
      case 'card': return <Box size={size} />;
      case 'accordion': return <LayoutGrid size={size} />;
      case 'tabs_nested': return <FolderTree size={size} />;
      case 'stepper': return <ListOrdered size={size} />;
      case 'timeline': return <GitCommit size={size} />;
      case 'repeatableGroup': return <ListPlus size={size} />;
      case 'group': return <Layers size={size} />;
      case 'fieldGroup': return <Folder size={size} />;
      default: return <Folder size={size} />;
    }
  };

  const showIcon = block.showIcon !== false;

  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizing] = useState<'left' | 'right' | null>(null);
  const [, setIsContentHovered] = useState(false);

  const gc = gridConfig || GRID_CONFIG;
  const isCollapsed = block.collapsible ? (block.isCollapsed ?? block.defaultCollapsed ?? false) : false;
  const isNested = !!block.parentId;
  const isDraggingOverTarget = dragOverInfo?.active && dragOverInfo?.parentId === block.id;
  const currentHeight = calculateHeight(block, isDraggingOverTarget ? { 
    index: dragOverInfo!.index,
    rowSpan: (dragOverInfo as any).rowSpan 
  } : null);

  return (
    <div
      ref={ref || containerRef}
      id={`canvas-field-${block.id}`}
      data-group-id={block.id}
      data-container-id={block.id}
      {...rest}
      style={{
        ...(isNested ? {
          gridColumn: viewportSize === 'mobile' ? 'span 1' : `${block.startCol || 1} / span ${block.colSpan || 12}`,
          gridRow: viewportSize === 'mobile' ? 'auto' : `${(block.rowIndex || 0) + 1} / span ${currentHeight}`
        } : {}),
        ...style
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(block.id, e);
        rest.onClick?.(e);
      }}
      className={cn(
        "group/group relative cursor-pointer border-2 h-full flex flex-col",
        cardPadding,
        isCard ? "bg-white dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 shadow-xl" :
        isAccordion ? "bg-zinc-50/60 dark:bg-zinc-900/40 border-zinc-200/80 dark:border-zinc-800/80 shadow-sm" :
        "bg-zinc-50/80 dark:bg-zinc-900/40 border-zinc-200/80 dark:border-zinc-800/80",
        isSelected ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-500/10 ring-4 ring-indigo-500/15 z-30 shadow-2xl" : "hover:border-indigo-500/30 z-10 hover:z-40",
        isResizing && "ring-4 ring-indigo-500/20 border-indigo-400 z-30",
        isDraggingOver && "border-indigo-500 bg-indigo-50/10 dark:bg-indigo-500/5 ring-4 ring-indigo-500/15 shadow-2xl z-30 scale-[1.005]",
        hoveredMapping?.targetFieldId === block.id && "ring-8 ring-indigo-500/30 border-indigo-500 scale-[1.02] shadow-2xl z-30",
        className
      )}
    >
      {isSelected && (
        <div className="absolute -top-3 left-6 px-3 py-1 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg z-50">
          Selected
        </div>
      )}
      <div className={cn("absolute inset-0 bg-gradient-to-br from-zinc-50/50 to-transparent dark:from-zinc-900/20 dark:to-transparent pointer-events-none", density === 'compact' ? 'rounded-lg' : density === 'spacious' ? 'rounded-2xl' : 'rounded-xl')} />

      <div className={cn("flex items-center justify-between gap-2 pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60", headerMargin)}>
        <div className={cn("flex items-center min-w-0", density === 'compact' ? 'gap-1.5' : 'gap-2.5')}>
          <div 
            className={cn(
              "drag-handle text-zinc-400 hover:text-indigo-500 dark:text-zinc-500 dark:hover:text-indigo-400 cursor-grab active:cursor-grabbing p-1 -ml-1 rounded-lg flex items-center shrink-0 transition-colors",
              isNested ? "nested-drag-handle" : "root-drag-handle"
            )}
            title="Drag to move container"
          >
            <GripVertical size={14} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className={cn("font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider truncate", titleTextSize)}>
                {block.label}
              </p>
              <span className={cn("px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-mono font-bold uppercase shrink-0", subtitleTextSize)}>
                {({
                  repeatableGroup: 'Repeater (1:N)',
                  fieldGroup: 'Field Group',
                  group: 'Group',
                  card: 'Card',
                  accordion: 'Accordion',
                  tabs_nested: 'Tabs',
                  stepper: 'Stepper',
                  timeline: 'Timeline',
                } as Record<string, string>)[block.type] || block.type}
              </span>
              <span className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800/80 rounded text-[9px] font-mono font-semibold text-zinc-500 border border-zinc-200/60 dark:border-zinc-700/60 shrink-0">
                {block.fields?.length || 0}
              </span>
            </div>
            {block.helperText && (
              <p className="text-[10px] text-zinc-400 font-medium truncate mt-0.5">
                {block.helperText}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {block.visibilityRule && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 rounded-md border border-amber-500/20" title="Conditional Logic Applied">
              <BrainCircuit size={11} className="text-amber-500" />
              <span className="text-[8px] font-black text-amber-600 dark:text-amber-400 uppercase">Logic</span>
            </div>
          )}

          {/* 1-Click Width Cycle Pill (FormBuilder consistency) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const cur = block.colSpan || 12;
              const idx = SPAN_CYCLE.indexOf(cur);
              const nextSpan = SPAN_CYCLE[(idx + 1) % SPAN_CYCLE.length];
              const maxStart = Math.max(1, 13 - nextSpan);
              const nextStart = Math.min(block.startCol || 1, maxStart);
              onUpdate(block.id, { colSpan: nextSpan, startCol: nextStart });
            }}
            title="Click to cycle width (Full → 2/3 → 1/2 → 1/3 → 1/4)"
            className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 hover:bg-indigo-500/20 hover:text-indigo-600 dark:hover:text-indigo-400 text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer"
          >
            {getSpanLabel(block.colSpan)}
          </button>

          {isNested && onMoveToRoot && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveToRoot(block.id);
              }}
              className="p-1 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer"
              title="Move container out to main canvas"
            >
              <ExternalLink size={12} />
            </button>
          )}

          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); onClone(block.id); }}
            className="p-1 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            title="Duplicate Group"
          >
            <Copy size={12} />
          </button>

          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(block.id); }}
            className="p-1 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
            title="Delete Group"
          >
            <Trash2 size={12} />
          </button>

          {block.collapsible && (
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); onUpdate(block.id, { isCollapsed: !isCollapsed }); }}
              className={cn(
                "w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer",
                isCollapsed ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400" : "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500"
              )}
              title={isCollapsed ? "Expand Group" : "Collapse Group"}
            >
              <ChevronDown 
                size={13} 
                className={cn("transition-transform duration-200 ease-out", isCollapsed ? "-rotate-90" : "rotate-0")} 
              />
            </button>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div className="flex-1 flex flex-col min-h-0 w-full">
          <div 
            onDragOver={(e) => { 
              if (isAccordion) return; // Handled by sections
              e.preventDefault(); 
              e.stopPropagation(); 
              onDragOver?.(e, block.id);
            }}
            onDrop={(e) => {
              if (isAccordion) return; // Handled by sections
              onDrop(e, block.id);
            }}
            onMouseEnter={() => setIsContentHovered(true)}
            onMouseLeave={() => setIsContentHovered(false)}
            data-group-id={block.id}
            data-container-id={block.id}
            className={cn(
              "relative border-2 border-dashed transition-all duration-300 flex-1 flex flex-col min-h-0 w-full rounded-2xl",
              isAccordion ? "p-0 mt-3 bg-transparent border-none" : "bg-zinc-100/50 dark:bg-zinc-900/20 border-zinc-200/80 dark:border-zinc-800/80 p-3.5 mt-1"
            )}
          >
              {isAccordion ? (
                <div className={cn("flex flex-col", density === 'compact' ? 'gap-2' : 'gap-3')}>
                  {block.fields && block.fields.length > 0 ? (
                    <>
                      {block.fields.map((section, sIdx) => (
                        <div 
                          key={section.id} 
                          id={`canvas-field-${section.id}`}
                          data-group-id={section.id}
                          data-container-id={section.id}
                          className={cn(
                            "bg-white dark:bg-zinc-900/60 border-2 transition-all overflow-hidden",
                            selectedIds.includes(section.id)
                              ? "border-indigo-500 ring-4 ring-indigo-500/10 shadow-lg z-10 scale-[1.005]" 
                              : cn("border-zinc-200 dark:border-zinc-800 shadow-xs", density === 'compact' ? 'rounded-lg' : 'rounded-xl'),
                            dragOverInfo?.parentId === section.id && "border-indigo-500 ring-4 ring-indigo-500/10 shadow-lg"
                          )}
                          style={{ borderRadius: density === 'compact' ? '8px' : '12px' }}
                        >
                          {/* Section Header in Builder */}
                          <div 
                            onClick={(e) => { e.stopPropagation(); onSelect(section.id); }}
                            className={cn(
                              "flex items-center justify-between cursor-pointer select-none transition-colors",
                              density === 'compact' ? 'px-3 py-2' : 'px-4 py-3',
                              selectedIds.includes(section.id) ? "bg-indigo-500/5" : "bg-zinc-50/80 dark:bg-zinc-900/80 border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            )}
                          >
                            <div className={cn("flex items-center", density === 'compact' ? 'gap-1.5' : 'gap-3')}>
                              <div className={cn(
                                "flex items-center justify-center transition-all",
                                density === 'compact' ? 'w-6 h-6 rounded-md' : 'w-8 h-8 rounded-xl',
                                selectedIds.includes(section.id) ? "bg-indigo-500 text-white shadow-lg rotate-3" : "bg-indigo-500/10 text-indigo-500"
                              )}>
                                <DynamicIcon name={section.iconName || 'Folder'} size={density === 'compact' ? 10 : 14} />
                              </div>
                              <div>
                                <p className={cn(
                                  "font-black uppercase tracking-widest",
                                  density === 'compact' ? 'text-[7px]' : 'text-[8px]',
                                  selectedIds.includes(section.id) ? "text-indigo-600" : "text-zinc-400"
                                )}>Section {sIdx + 1}</p>
                                <p className={cn("font-bold text-zinc-900 dark:text-white", density === 'compact' ? 'text-[10px]' : 'text-xs')}>{section.label}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-400 mr-1">
                                {section.fields?.length || 0} {section.fields?.length === 1 ? 'Field' : 'Fields'}
                              </span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const updated = (block.fields || []).map(s => s.id === section.id ? { ...s, isCollapsed: !s.isCollapsed } : s);
                                  onUpdate(block.id, { fields: updated });
                                }}
                                className={cn(
                                  "w-6 h-6 rounded-md flex items-center justify-center transition-all",
                                  section.isCollapsed ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200" : "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500"
                                )}
                                title={section.isCollapsed ? "Expand Section" : "Collapse Section"}
                              >
                                <ChevronDown size={12} className={cn("transition-transform duration-200", section.isCollapsed ? "-rotate-90" : "rotate-0")} />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const updated = (block.fields || []).filter(s => s.id !== section.id);
                                  onUpdate(block.id, { fields: updated });
                                }}
                                className="p-1 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-all"
                                title="Delete Section"
                              >
                                <Trash2 size={12} />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); onSelect(section.id); }}
                                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-indigo-500 transition-colors"
                                title="Configure Section"
                              >
                                <Settings2 size={12} />
                              </button>
                            </div>
                          </div>

                          {/* Nesting Zone for Section */}
                          {!section.isCollapsed && (
                            <div 
                              id={`canvas-nesting-${section.id}`}
                              data-group-id={section.id}
                              data-container-id={section.id}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onDragOver?.(e, section.id);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onDrop(e, section.id);
                              }}
                              className={cn(
                                "relative w-full transition-colors",
                                dragOverInfo?.parentId === section.id ? "bg-indigo-500/5" : "bg-transparent"
                              )}
                              style={{ 
                                padding: `${gc.nestedPadding}px`,
                                minHeight: section.fields && section.fields.length > 0 ? 'auto' : '60px'
                              }}
                            >
                              {isDragging && (
                                <div className="absolute inset-0 pointer-events-none z-0 grid grid-cols-12 opacity-50" style={{ gap: `${gc.gap}px`, padding: `${gc.nestedPadding}px` }}>
                                  {Array.from({ length: 12 }).map((_, i) => (
                                    <div key={i} className="h-full border-x border-dashed border-indigo-500/10 bg-indigo-500/[0.005] rounded-xl" />
                                  ))}
                                </div>
                              )}
                              {renderNested && renderNested(section.fields || [], section.id)}
                              {(!section.fields || section.fields.length === 0) && !isDraggingOver && (
                                <div className="w-full flex flex-col items-center justify-center py-3.5 opacity-30">
                                  <Move size={14} className="text-zinc-400 mb-1" />
                                  <p className="text-[8px] font-black uppercase tracking-widest">Drop fields into {section.label}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Add Subsection Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newSection: Field = {
                            id: `section-${Date.now()}`,
                            type: 'group',
                            label: `New Section ${(block.fields?.length || 0) + 1}`,
                            parentId: block.id,
                            fields: []
                          };
                          onUpdate(block.id, { fields: [...(block.fields || []), newSection] });
                        }}
                        className="w-full py-2.5 px-3 border border-dashed border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-indigo-500 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Plus size={12} />
                        Add Subsection
                      </button>
                    </>
                  ) : (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        const newSection: Field = {
                          id: `section-${Date.now()}`,
                          type: 'group',
                          label: 'New Section 1',
                          parentId: block.id,
                          fields: []
                        };
                        onUpdate(block.id, { fields: [newSection] });
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDragOver?.(e, block.id);
                      }}
                      onDrop={(e) => onDrop(e, block.id)}
                      className="p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer opacity-50 hover:opacity-100 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all"
                    >
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <Plus size={20} />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Add Subsection</p>
                      <p className="text-[8px] text-zinc-400 font-medium">Click to add a section or drop fields here</p>
                    </div>
                  )}
                </div>
              ) : (
                ((block.fields && block.fields.length > 0) || isDraggingOver) ? (
                  <div 
                    className="relative w-full flex-1 min-h-0 z-10 flex flex-col justify-between"
                    style={{ 
                      padding: `${gc.nestedPadding}px`
                    }}
                  >
                    <div className="relative w-full flex-1">
                      {isDragging && (
                        <div className="absolute inset-0 pointer-events-none z-0 grid grid-cols-12 opacity-50" style={{ gap: `${gc.gap}px` }}>
                          {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="h-full border-x border-dashed border-indigo-500/10 bg-indigo-500/[0.005] rounded-xl" />
                          ))}
                        </div>
                      )}
                      {renderNested && renderNested(block.fields || [], block.id)}
                    </div>

                    {/* FormBuilder-style Inline Add Field to Group Toolbar */}
                    {(onMoveFieldToContainer || onCreateFieldInContainer) && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 mt-2 border-t border-zinc-200/70 dark:border-zinc-800/80 relative z-20">
                        <div className="flex items-center gap-1.5">
                          {onMoveFieldToContainer && availableFieldsToNest.length > 0 && (
                            <select
                              value=""
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation();
                                if (e.target.value) {
                                  onMoveFieldToContainer(block.id, e.target.value);
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800/70 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold focus:outline-none cursor-pointer shadow-2xs"
                            >
                              <option value="">+ Move Existing Field into {isRepeatable ? 'Repeater' : 'Group'}...</option>
                              {availableFieldsToNest.map((af) => (
                                <option key={af.id} value={af.id}>
                                  {af.label} ({af.type})
                                </option>
                              ))}
                            </select>
                          )}
                          {(onRequestAddSubfield || onCreateFieldInContainer) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onRequestAddSubfield) {
                                  onRequestAddSubfield(block.id, block.label || 'Group');
                                } else if (onCreateFieldInContainer) {
                                  onCreateFieldInContainer(block.id);
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                            >
                              <Plus size={11} />
                              <span>New Sub-Field</span>
                            </button>
                          )}
                        </div>
                        <span className="text-[9px] text-zinc-400 font-semibold">
                          {isSelected ? 'Active target: click any palette block to add here' : `${block.fields?.length || 0} nested`}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 py-4 px-3">
                    <div className="flex flex-col items-center gap-1.5 opacity-60">
                      <div className="p-2.5 bg-zinc-200/70 dark:bg-zinc-800 rounded-full border border-dashed border-zinc-300 dark:border-zinc-700">
                        <Move size={16} className="text-zinc-500" />
                      </div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center">
                        {isSelected ? 'Selected — click any block in Left Palette or drop here to nest' : 'Drop fields here or select group to add fields'}
                      </p>
                    </div>
                    {(onMoveFieldToContainer || onCreateFieldInContainer) && (
                      <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1 relative z-20">
                        {onMoveFieldToContainer && availableFieldsToNest.length > 0 && (
                          <select
                            value=""
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              if (e.target.value) {
                                onMoveFieldToContainer(block.id, e.target.value);
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800/70 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold focus:outline-none cursor-pointer shadow-2xs"
                          >
                            <option value="">+ Move Existing Field Here...</option>
                            {availableFieldsToNest.map((af) => (
                              <option key={af.id} value={af.id}>
                                {af.label} ({af.type})
                              </option>
                            ))}
                          </select>
                        )}
                        {(onRequestAddSubfield || onCreateFieldInContainer) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onRequestAddSubfield) {
                                onRequestAddSubfield(block.id, block.label || 'Group');
                              } else if (onCreateFieldInContainer) {
                                onCreateFieldInContainer(block.id);
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                          >
                            <Plus size={11} />
                            <span>New Sub-Field</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        )}

    </div>
  );
});

FieldGroup.displayName = 'FieldGroup';

