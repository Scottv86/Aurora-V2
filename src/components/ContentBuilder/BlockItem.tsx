import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  GripVertical, 
  ArrowUp, 
  ArrowDown, 
  Copy, 
  Trash2, 
  Sliders,
  Type,
  Heading,
  Layout,
  PenTool,
  Table,
  AlertCircle,
  Columns,
  MousePointerClick,
  Minus,
  Quote,
  Code,
  Zap
} from 'lucide-react';
import { ContentBlock, ContentBlockType } from '../../types/platform';
import { cn } from '../../lib/utils';
import { BlockRenderer } from './BlockRenderer';

interface BlockItemProps {
  block: ContentBlock;
  index: number;
  totalBlocks: number;
  isSelected: boolean;
  isDarkCanvas: boolean;
  globalFont: string;
  onSelect: () => void;
  onUpdateData: (newData: Record<string, any>) => void;
  onUpdateStyles: (newStyles: Record<string, any>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onOpenSettings: () => void;
  onInsertTag?: (tag: string) => void;
}

const BLOCK_ICONS: Record<ContentBlockType, any> = {
  heading: Heading,
  text: Type,
  letterhead: Layout,
  signature_block: PenTool,
  table_repeater: Table,
  callout: AlertCircle,
  hero_banner: Layout,
  grid_2col: Columns,
  button: MousePointerClick,
  divider: Minus,
  spacer: Minus,
  quote: Quote,
  code: Code
};

export const BlockItem: React.FC<BlockItemProps> = ({
  block,
  index,
  totalBlocks,
  isSelected,
  isDarkCanvas,
  globalFont,
  onSelect,
  onUpdateData,
  onUpdateStyles,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onOpenSettings,
  onInsertTag
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.4 : 1
  };

  const Icon = BLOCK_ICONS[block.type] || Type;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={cn(
        "group relative rounded-2xl transition-all duration-150 mb-3",
        isSelected
          ? "ring-2 ring-indigo-500 shadow-lg bg-indigo-500/[0.03]"
          : "hover:ring-1 hover:ring-indigo-500/40",
        isDragging && "shadow-2xl ring-2 ring-indigo-600 bg-indigo-950/20"
      )}
    >
      {/* Top Block Header Bar (Visible on Hover / Selected) */}
      <div className={cn(
        "flex items-center justify-between px-3 py-1.5 rounded-t-xl transition-opacity",
        isSelected 
          ? "opacity-100 bg-indigo-600/10 border-b border-indigo-500/20" 
          : "opacity-0 group-hover:opacity-100 bg-zinc-800/60 border-b border-zinc-700/40"
      )}>
        <div className="flex items-center gap-2">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Drag to reorder block"
          >
            <GripVertical size={14} />
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase font-mono">
            <Icon size={12} className="text-indigo-400" />
            <span>{block.type.replace('_', ' ')}</span>
            <span className="text-zinc-500">#{index + 1}</span>

            {block.conditions?.enabled && (
              <span 
                className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[9px] font-sans font-bold capitalize normal-case cursor-pointer hover:bg-amber-500/25 transition-colors"
                title={`Conditional block display enabled (${block.conditions.rules?.length || 1} rules)`}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSettings();
                }}
              >
                <Zap size={9} className="text-amber-400 fill-amber-400" />
                <span>Conditional</span>
              </span>
            )}
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Move Up"
          >
            <ArrowUp size={12} />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === totalBlocks - 1}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Move Down"
          >
            <ArrowDown size={12} />
          </button>
          <button
            onClick={onOpenSettings}
            className="p-1 rounded text-zinc-400 hover:text-indigo-300 hover:bg-zinc-700/50 transition-colors"
            title="Block Style & Font Settings"
          >
            <Sliders size={12} />
          </button>
          <button
            onClick={onDuplicate}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-700/50 transition-colors"
            title="Duplicate Block"
          >
            <Copy size={12} />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Delete Block"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Block Body Content */}
      <div className="p-3">
        <BlockRenderer
          block={block}
          isDarkCanvas={isDarkCanvas}
          globalFont={globalFont}
          onUpdateData={onUpdateData}
          onUpdateStyles={onUpdateStyles}
          onInsertTag={onInsertTag}
        />
      </div>
    </div>
  );
};
