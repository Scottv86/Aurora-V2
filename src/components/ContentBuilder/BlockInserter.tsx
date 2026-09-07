import React, { useState } from 'react';
import { 
  Plus, 
  Heading, 
  Type, 
  Layout, 
  PenTool, 
  Table, 
  AlertCircle, 
  Columns, 
  MousePointerClick, 
  Minus, 
  Quote, 
  Code
} from 'lucide-react';
import { ContentBlockType } from '../../types/platform';
import { cn } from '../../lib/utils';

interface BlockInserterProps {
  index: number;
  onInsertBlock: (type: ContentBlockType, atIndex: number) => void;
  isDarkCanvas: boolean;
}

const QUICK_BLOCKS: { type: ContentBlockType; label: string; icon: any }[] = [
  { type: 'text', label: 'Rich Text', icon: Type },
  { type: 'heading', label: 'Heading', icon: Heading },
  { type: 'callout', label: 'Callout Box', icon: AlertCircle },
  { type: 'grid_2col', label: '2 Columns', icon: Columns },
  { type: 'table_repeater', label: 'Data Table', icon: Table },
  { type: 'signature_block', label: 'Signatures', icon: PenTool },
  { type: 'letterhead', label: 'Letterhead', icon: Layout },
  { type: 'button', label: 'CTA Button', icon: MousePointerClick },
  { type: 'quote', label: 'Pull Quote', icon: Quote },
  { type: 'divider', label: 'Divider', icon: Minus },
  { type: 'code', label: 'Code Snippet', icon: Code }
];

export const BlockInserter: React.FC<BlockInserterProps> = ({
  index,
  onInsertBlock,
  isDarkCanvas
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative py-1 group/inserter z-20">
      {/* Subtle line on hover */}
      <div className="flex items-center justify-center">
        <div className={cn(
          "h-px flex-1 transition-opacity duration-150",
          isOpen 
            ? "bg-indigo-500 opacity-100" 
            : "opacity-0 group-hover/inserter:opacity-100",
          isDarkCanvas ? "bg-zinc-700" : "bg-zinc-300"
        )} />
        
        <button
          onClick={() => setIsOpen(prev => !prev)}
          className={cn(
            "px-2.5 py-1 rounded-full text-[11px] font-bold transition-all duration-150 flex items-center gap-1 cursor-pointer mx-2 shadow-sm",
            isOpen
              ? "bg-indigo-600 text-white scale-105 shadow-md shadow-indigo-600/30"
              : isDarkCanvas
                ? "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-indigo-600 opacity-0 group-hover/inserter:opacity-100"
                : "bg-white text-zinc-600 hover:text-white hover:bg-indigo-600 border border-zinc-200 opacity-0 group-hover/inserter:opacity-100"
          )}
          title="Insert block here"
        >
          <Plus size={12} className={isOpen ? "rotate-45 transition-transform" : ""} />
          <span>Insert Block</span>
        </button>

        <div className={cn(
          "h-px flex-1 transition-opacity duration-150",
          isOpen 
            ? "bg-indigo-500 opacity-100" 
            : "opacity-0 group-hover/inserter:opacity-100",
          isDarkCanvas ? "bg-zinc-700" : "bg-zinc-300"
        )} />
      </div>

      {/* Quick Pick Popover */}
      {isOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 top-8 z-50 w-80 bg-zinc-950 border border-zinc-800 rounded-2xl p-3 shadow-2xl space-y-2 animate-in fade-in zoom-in-95 duration-100">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-1">
            Choose Block Type
          </div>
          <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
            {QUICK_BLOCKS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.type}
                  onClick={() => {
                    onInsertBlock(item.type, index);
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-2 p-2 rounded-xl bg-zinc-900/60 hover:bg-indigo-600 hover:text-white border border-zinc-800/80 text-left transition-all text-zinc-300 text-xs font-semibold cursor-pointer group"
                >
                  <Icon size={14} className="text-indigo-400 group-hover:text-white shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
