import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GripVertical, Trash2, Folder, ListPlus, X, Maximize2, Move, BrainCircuit, Settings2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useGridEngine, GridItem, GridPos } from '../../hooks/useGridEngine';

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
}

interface FieldGroupProps {
  block: Field;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Field>) => void;
  onDelete: (id: string) => void;
  onDrop: (e: React.DragEvent, parentId?: string) => void;
  renderNested?: (fields: Field[], parentId: string) => React.ReactNode;
  viewportSize: 'desktop' | 'tablet' | 'mobile';
}

export const FieldGroup: React.FC<FieldGroupProps> = ({
  block,
  selectedId,
  onSelect,
  onUpdate,
  onDelete,
  onDrop,
  renderNested,
  viewportSize
}) => {
  const isSelected = selectedId === block.id;
  const isRepeatable = block.type === 'repeatableGroup';
  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isContentHovered, setIsContentHovered] = useState(false);

  const { snapToGrid } = useGridEngine();

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
      const padding = 64; // Based on ModuleEditor p-8 * 2
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
        gridRow: viewportSize === 'mobile' ? 'auto' : `${(block.rowIndex || 0) + 1} / span ${(block.rowSpan || 1)}`
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(block.id);
      }}
      className={cn(
        "group/group relative p-6 rounded-[24px] cursor-pointer transition-all duration-300",
        "bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800",
        isSelected ? "border-indigo-500 ring-4 ring-indigo-500/10 z-20 shadow-2xl" : "hover:border-zinc-300 dark:hover:border-zinc-700 z-10",
        isResizing && "ring-4 ring-indigo-500/20 border-indigo-400 z-30"
      )}
    >
      {/* Ghost Background during Drag/Resize (Visual Polish) */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-50/50 to-transparent dark:from-zinc-900/20 dark:to-transparent rounded-[22px] pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-xl transition-colors",
            isSelected ? "bg-indigo-600 text-white" : "bg-zinc-100 dark:bg-zinc-900 text-zinc-500"
          )}>
            {isRepeatable ? <ListPlus size={16} /> : <Folder size={16} />}
          </div>
          <div>
            <h4 className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.15em] mb-0.5">
              {block.type.replace('Group', ' Group')}
            </h4>
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{block.label}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {block.visibilityRule && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20 shadow-sm shadow-indigo-500/10" title="Conditional Logic Applied">
              <BrainCircuit size={12} className="text-indigo-500" />
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter">Logic</span>
            </div>
          )}
          <div className="flex items-center gap-1 px-2 py-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg opacity-0 group-hover/group:opacity-100 transition-opacity">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter">W: {block.colSpan}</span>
          </div>
          <button 
            draggable
            onDragStart={(e) => {
              const data = { type: 'move', fieldId: block.id };
              e.dataTransfer.setData('application/json', JSON.stringify(data));
              e.dataTransfer.effectAllowed = 'move';
            }}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors cursor-grab active:cursor-grabbing"
          >
            <GripVertical size={16} />
          </button>
        </div>
      </div>

      {/* Top-Right Delete Button (Hover State) */}
      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(block.id); }}
        className={cn(
          "absolute -top-2 -right-2 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center transition-opacity shadow-lg z-30 hover:scale-110 active:scale-95",
          "opacity-0",
          !isContentHovered && "group-hover/group:opacity-100"
        )}
        title="Delete Group"
      >
        <Trash2 size={16} />
      </button>

      {/* Nested Content Area */}
      <div 
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={(e) => onDrop(e, block.id)}
        onMouseEnter={() => setIsContentHovered(true)}
        onMouseLeave={() => setIsContentHovered(false)}
        className={cn(
          "relative min-h-[120px] rounded-[18px] border-2 border-dashed transition-all duration-300 p-4",
          "bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800",
          "group-hover/group:border-indigo-500/30 group-hover/group:bg-indigo-500/5"
        )}
      >
        {block.fields && block.fields.length > 0 ? (
          <div className="grid grid-cols-12 gap-4">
            {renderNested && renderNested(block.fields, block.id)}
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-40">
            <div className="p-3 bg-zinc-200 dark:bg-zinc-800 rounded-full border-2 border-dashed border-zinc-300 dark:border-zinc-700">
              <Move size={20} className="text-zinc-400" />
            </div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Drop fields to nest</p>
          </div>
        )}
      </div>

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
              onClick={(e) => { e.stopPropagation(); onUpdate(block.id, { label: block.label + ' (Copy)' }); }}
              className="p-2 hover:bg-indigo-500 hover:text-white rounded-lg transition-all"
              title="Duplicate"
            >
              <Folder size={16} />
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

