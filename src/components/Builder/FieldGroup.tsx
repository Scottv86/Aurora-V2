import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GripVertical, Trash2, Folder, ListPlus, X, Maximize2, Move, BrainCircuit, Settings2, Copy, ChevronDown, Box, LayoutGrid, FolderTree, ListOrdered, GitCommit, Layers, Plus } from 'lucide-react';
import { cn, calculateHeight } from '../../lib/utils';
import { useGridEngine, GridItem, GridPos } from '../../hooks/useGridEngine';
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
  onDragStart: (e: React.DragEvent, data: any) => void;
  isDraggingOver?: boolean;
  renderNested?: (fields: Field[], parentId: string) => React.ReactNode;
  viewportSize: 'desktop' | 'tablet' | 'mobile';
  onClone: (id: string) => void;
  hoveredMapping?: { connectorId: string, sourceOutput: string, targetFieldId: string } | null;
  dragOverInfo?: { col: number, span: number, index: number, active: boolean, parentId?: string, height?: number } | null;
}

export const FieldGroup: React.FC<FieldGroupProps> = ({
  block,
  selectedIds,
  onSelect,
  onUpdate,
  onDelete,
  onDrop,
  onDragOver,
  onDragStart,
  renderNested,
  viewportSize,
  onClone,
  isDraggingOver,
  hoveredMapping,
  dragOverInfo
}) => {
  const isSelected = selectedIds.includes(block.id);
  const isRepeatable = block.type === 'repeatableGroup';
  const isCard = block.type === 'card';
  const isAccordion = block.type === 'accordion';
  const isTabs = block.type === 'tabs_nested';
  
  const getIcon = () => {
    if (block.iconName) {
      return <DynamicIcon name={block.iconName} size={16} />;
    }

    switch (block.type) {
      case 'card': return <Box size={16} />;
      case 'accordion': return <LayoutGrid size={16} />;
      case 'tabs_nested': return <FolderTree size={16} />;
      case 'stepper': return <ListOrdered size={16} />;
      case 'timeline': return <GitCommit size={16} />;
      case 'repeatableGroup': return <ListPlus size={16} />;
      case 'group': return <Layers size={16} />;
      case 'fieldGroup': return <Folder size={16} />;
      default: return <Folder size={16} />;
    }
  };

  const showIcon = block.showIcon !== false;

  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isContentHovered, setIsContentHovered] = useState(false);

  const { snapToGrid } = useGridEngine();
  const isCollapsed = block.collapsible ? (block.isCollapsed ?? block.defaultCollapsed ?? false) : false;
  const isNested = !!block.parentId;
  const isDraggingOverTarget = dragOverInfo?.active && dragOverInfo?.parentId === block.id;
  const currentHeight = calculateHeight(block, isDraggingOverTarget ? { 
    index: dragOverInfo!.index,
    rowSpan: (dragOverInfo as any).rowSpan 
  } : null);


  const handleResizeStart = (e: React.PointerEvent, direction: 'left' | 'right') => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(direction);
    
    const startX = e.clientX;
    const startSpan = block.colSpan || 12;
    const startCol = block.startCol || 1;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!containerRef.current) return;
      
      const canvas = containerRef.current.closest('.grid-canvas-container');
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const padding = isNested ? GRID_CONFIG.nestedPadding : GRID_CONFIG.padding;
      const canvasWidth = rect.width - padding;
      const colWidth = canvasWidth / 12;
      
      const deltaX = moveEvent.clientX - startX;
      const deltaCols = Math.round(deltaX / colWidth);

      if (direction === 'right') {
        const newSpan = Math.max(1, Math.min(12, startSpan + deltaCols));
        const finalSpan = Math.min(newSpan, 13 - startCol);
        if (block.colSpan !== finalSpan) {
          onUpdate(block.id, { colSpan: finalSpan });
        }
      } else {
        const maxStartCol = startCol + startSpan - 1;
        const newStartCol = Math.max(1, Math.min(maxStartCol, startCol + deltaCols));
        const newSpan = startSpan - (newStartCol - startCol);
        if (block.startCol !== newStartCol || block.colSpan !== newSpan) {
          onUpdate(block.id, { startCol: newStartCol, colSpan: newSpan });
        }
      }
    };

    const handlePointerUp = () => {
      setIsResizing(null);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <motion.div
      ref={containerRef}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        gridColumn: viewportSize === 'mobile' ? 'span 1' : `${block.startCol || 1} / span ${block.colSpan || 12}`,
        gridRow: viewportSize === 'mobile' ? 'auto' : `${(block.rowIndex || 0) + 1} / span ${currentHeight}`
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(block.id, e);
      }}
      className={cn(
        "group/group relative p-4 rounded-[24px] cursor-pointer transition-all duration-300 border-2 h-full flex flex-col",
        isCard ? "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-xl" :
        isAccordion ? "bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-100 dark:border-zinc-800 shadow-sm" :
        "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800",
        isSelected ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-500/5 ring-4 ring-indigo-500/10 z-30 shadow-2xl" : "hover:border-indigo-500/30 z-10 hover:z-40",
        isResizing && "ring-4 ring-indigo-500/20 border-indigo-400 z-30",
        hoveredMapping?.targetFieldId === block.id && "ring-8 ring-indigo-500/30 border-indigo-500 scale-[1.02] shadow-2xl z-30"
      )}
    >
      {isSelected && (
        <div className="absolute -top-3 left-6 px-3 py-1 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg z-50">
          Selected
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-50/50 to-transparent dark:from-zinc-900/20 dark:to-transparent rounded-[22px] pointer-events-none" />

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          {showIcon && (
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500",
              isSelected ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 rotate-3" : 
              isRepeatable ? "bg-amber-500/10 text-amber-500" :
              isCard ? "bg-blue-500/10 text-blue-500" :
              isAccordion ? "bg-purple-500/10 text-purple-500" :
              isTabs ? "bg-emerald-500/10 text-emerald-500" :
              "bg-zinc-100 dark:bg-zinc-900 text-zinc-500"
            )}>
              {getIcon()}
            </div>
          )}
          <div>
            <h4 className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.15em] mb-0.5">
              {block.type.replace('Group', ' Group')}
            </h4>
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{block.label}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {block.collapsible && (
            <button 
              onClick={(e) => { e.stopPropagation(); onUpdate(block.id, { isCollapsed: !isCollapsed }); }}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                isCollapsed ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400" : "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500"
              )}
            >
              <ChevronDown 
                size={14} 
                className={cn("transition-transform duration-500 ease-out", isCollapsed ? "-rotate-90" : "rotate-0")} 
              />
            </button>
          )}
          {block.visibilityRule && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20 shadow-sm shadow-indigo-500/10" title="Conditional Logic Applied">
              <BrainCircuit size={12} className="text-indigo-500" />
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter">Logic</span>
            </div>
          )}
          <button 
            draggable
            onDragStart={(e) => {
              onDragStart(e, { type: 'move', fieldId: block.id });
            }}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors cursor-grab active:cursor-grabbing"
          >
            <GripVertical size={16} />
          </button>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <button 
        onClick={(e) => { e.stopPropagation(); onClone(block.id); }}
        className={cn(
          "absolute -top-4 right-10 w-8 h-8 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-full flex items-center justify-center transition-opacity shadow-lg z-50 hover:scale-110 active:scale-95 border border-zinc-200 dark:border-zinc-700",
          "opacity-0",
          !isContentHovered && "group-hover/group:opacity-100"
        )}
        title="Duplicate Group"
      >
        <Copy size={14} />
      </button>

      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(block.id); }}
        className={cn(
          "absolute -top-4 -right-4 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center transition-opacity shadow-lg z-50 hover:scale-110 active:scale-95",
          "opacity-0",
          !isContentHovered && "group-hover/group:opacity-100"
        )}
        title="Delete Group"
      >
        <Trash2 size={16} />
      </button>

      {/* Selection Pill */}
      {isSelected && (
        <div className="absolute -top-3 left-6 px-3 py-1 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg z-50">
          Selected
        </div>
      )}

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ 
              height: { duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] },
              opacity: { duration: 0.2, delay: 0.1 }
            }}
          >
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
              className={cn(
                "relative rounded-[18px] border-2 border-dashed transition-all duration-300 p-3 mt-4 flex-grow",
                isAccordion ? "p-0 mt-6 bg-transparent border-none" : "p-3 mt-4 bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800"
              )}
            >
              {isAccordion ? (
                <div className="flex flex-col gap-4">
                  {block.fields && block.fields.length > 0 ? (
                    block.fields.map((section) => (
                      <div 
                        key={section.id} 
                        className={cn(
                          "bg-white dark:bg-zinc-950 border-2 transition-all overflow-hidden",
                          selectedIds.includes(section.id) ? "border-indigo-500 ring-4 ring-indigo-500/10 shadow-2xl z-10 scale-[1.02]" : "border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-sm",
                          dragOverInfo?.parentId === section.id && "border-indigo-500 ring-4 ring-indigo-500/10 shadow-2xl"
                        )}
                        style={{ borderRadius: selectedIds.includes(section.id) ? '2.2rem' : '2rem' }}
                      >
                        {/* Section Header in Builder */}
                        <div 
                          onClick={(e) => { e.stopPropagation(); onSelect(section.id); }}
                          className={cn(
                            "px-6 py-4 flex items-center justify-between cursor-pointer select-none transition-colors",
                            selectedIds.includes(section.id) ? "bg-indigo-500/5" : "bg-zinc-50/80 dark:bg-zinc-900/80 border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                              selectedIds.includes(section.id) ? "bg-indigo-500 text-white shadow-lg rotate-3" : "bg-indigo-500/10 text-indigo-500"
                            )}>
                              <DynamicIcon name={section.iconName || 'Folder'} size={14} />
                            </div>
                            <div>
                              <p className={cn(
                                "text-[8px] font-black uppercase tracking-widest",
                                selectedIds.includes(section.id) ? "text-indigo-600" : "text-zinc-400"
                              )}>Section Subtitle</p>
                              <p className="text-xs font-bold text-zinc-900 dark:text-white">{section.label}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                             <button 
                               onClick={(e) => { e.stopPropagation(); onSelect(section.id); }}
                               className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-indigo-500 transition-colors"
                             >
                               <Settings2 size={12} />
                             </button>
                          </div>
                        </div>

                        {/* Nesting Zone for Section */}
                        <div 
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
                            "p-4 grid grid-cols-12 gap-5 min-h-[100px] transition-colors",
                            dragOverInfo?.parentId === section.id ? "bg-indigo-500/5" : "bg-transparent"
                          )}
                          style={{ gridAutoRows: '50px' }}
                        >
                          {renderNested && renderNested(section.fields || [], section.id)}
                          {(!section.fields || section.fields.length === 0) && !isDraggingOver && (
                            <div className="col-span-12 flex flex-col items-center justify-center py-8 opacity-30">
                              <Move size={16} className="text-zinc-400 mb-2" />
                              <p className="text-[8px] font-black uppercase tracking-widest">Drop fields into {section.label}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div 
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDragOver?.(e, block.id);
                      }}
                      onDrop={(e) => onDrop(e, block.id)}
                      className="p-12 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl flex flex-col items-center justify-center gap-2 opacity-40 hover:opacity-100 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                        <Plus size={24} />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Drop a Group to create a section</p>
                    </div>
                  )}
                </div>
              ) : (
                ((block.fields && block.fields.length > 0) || isDraggingOver) ? (
                  <div 
                    className="grid grid-cols-12 gap-5 min-h-full"
                    style={{ gridAutoRows: '50px' }}
                  >
                    {renderNested && renderNested(block.fields || [], block.id)}
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-40">
                    <div className="p-3 bg-zinc-200 dark:bg-zinc-800 rounded-full border-2 border-dashed border-zinc-300 dark:border-zinc-700">
                      <Move size={20} className="text-zinc-400" />
                    </div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Drop fields to nest</p>
                  </div>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fluid Interaction Controls */}
      {viewportSize !== 'mobile' && isSelected && (
        <>
          {/* Resize Handles */}
          <div 
            onPointerDown={(e) => handleResizeStart(e, 'left')}
            className="absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-16 cursor-ew-resize z-50 flex items-center justify-center"
          >
            <div className="w-1.5 h-8 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
          </div>
          
          <div 
            onPointerDown={(e) => handleResizeStart(e, 'right')}
            className="absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-16 cursor-ew-resize z-50 flex items-center justify-center"
          >
            <div className="w-1.5 h-8 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
          </div>
        </>
      )}

      {/* Floating Action Bar */}
      <AnimatePresence>
        {isSelected && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-xl shadow-2xl z-50"
          >
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(block.id); }}
              className="p-2 hover:bg-rose-500 hover:text-white rounded-lg transition-all"
              title="Delete Group"
            >
              <Trash2 size={16} />
            </button>
            <div className="w-px h-4 bg-zinc-700 dark:bg-zinc-200 mx-1" />
            <button 
              onClick={(e) => { e.stopPropagation(); onClone(block.id); }}
              className="p-2 hover:bg-indigo-500 hover:text-white rounded-lg transition-all"
              title="Duplicate"
            >
              <Copy size={16} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onSelect(block.id); }}
              className="p-2 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-lg transition-all"
              title="Settings"
            >
              <Settings2 size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

