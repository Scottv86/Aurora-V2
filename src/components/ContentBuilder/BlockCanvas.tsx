import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { ContentBlock, ContentBlockType, ContentType } from '../../types/platform';
import { BlockItem } from './BlockItem';
import { BlockInserter } from './BlockInserter';
import { Plus, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

interface BlockCanvasProps {
  blocks: ContentBlock[];
  selectedBlockId: string | null;
  contentType: ContentType;
  isDarkCanvas: boolean;
  globalFont: string;
  onSelectBlock: (id: string | null) => void;
  onUpdateBlockData: (id: string, data: Record<string, any>) => void;
  onUpdateBlockStyles: (id: string, styles: Record<string, any>) => void;
  onReorderBlocks: (newBlocks: ContentBlock[]) => void;
  onInsertBlock: (type: ContentBlockType, atIndex: number) => void;
  onDuplicateBlock: (id: string) => void;
  onDeleteBlock: (id: string) => void;
  onOpenSettings: (id: string) => void;
  onInsertTag?: (tag: string) => void;
}

export const BlockCanvas: React.FC<BlockCanvasProps> = ({
  blocks,
  selectedBlockId,
  contentType,
  isDarkCanvas,
  globalFont,
  onSelectBlock,
  onUpdateBlockData,
  onUpdateBlockStyles,
  onReorderBlocks,
  onInsertBlock,
  onDuplicateBlock,
  onDeleteBlock,
  onOpenSettings,
  onInsertTag
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        onReorderBlocks(arrayMove(blocks, oldIndex, newIndex));
      }
    }
  };

  const moveBlock = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= blocks.length) return;
    onReorderBlocks(arrayMove(blocks, fromIndex, toIndex));
  };

  if (blocks.length === 0) {
    return (
      <div className="py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
          <Sparkles size={24} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-zinc-300">No content blocks yet</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
            Get started by adding your first heading, text block, letterhead, or table.
          </p>
        </div>
        <button
          onClick={() => onInsertBlock('text', 0)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Plus size={14} />
          <span>Add First Block</span>
        </button>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={blocks.map((b) => b.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1">
          {blocks.map((block, index) => (
            <React.Fragment key={block.id}>
              {/* Block Item */}
              <BlockItem
                block={block}
                index={index}
                totalBlocks={blocks.length}
                isSelected={selectedBlockId === block.id}
                isDarkCanvas={isDarkCanvas}
                globalFont={globalFont}
                onSelect={() => onSelectBlock(block.id)}
                onUpdateData={(newData) => onUpdateBlockData(block.id, newData)}
                onUpdateStyles={(newStyles) => onUpdateBlockStyles(block.id, newStyles)}
                onMoveUp={() => moveBlock(index, index - 1)}
                onMoveDown={() => moveBlock(index, index + 1)}
                onDuplicate={() => onDuplicateBlock(block.id)}
                onDelete={() => onDeleteBlock(block.id)}
                onOpenSettings={() => {
                  onSelectBlock(block.id);
                  onOpenSettings(block.id);
                }}
                onInsertTag={onInsertTag}
              />

              {/* In-Between Inserter */}
              <BlockInserter
                index={index + 1}
                onInsertBlock={onInsertBlock}
                isDarkCanvas={isDarkCanvas}
              />
            </React.Fragment>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
