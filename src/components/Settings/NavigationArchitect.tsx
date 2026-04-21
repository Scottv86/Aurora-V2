import React, { useState } from 'react';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2, LayoutDashboard, FileText, Users, Settings, ChevronRight } from 'lucide-react';
import { Button } from '../UI/Primitives';
import { motion, AnimatePresence } from 'motion/react';

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  path?: string;
  children?: MenuItem[];
}

interface Props {
  items: MenuItem[];
  onChange: (items: MenuItem[]) => void;
  layout: 'sidebar' | 'top';
}

export const NavigationArchitect = ({ items, onChange, layout }: Props) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      
      onChange(arrayMove(items, oldIndex, newIndex));
    }
    
    setActiveId(null);
  };

  const addItem = () => {
    const newItem: MenuItem = {
      id: Math.random().toString(36).substr(2, 9),
      label: 'New Item',
      icon: 'FileText',
      path: '/workspace/new'
    };
    onChange([...items, newItem]);
  };

  const removeItem = (id: string) => {
    onChange(items.filter(i => i.id !== id));
  };

  const updateItem = (id: string, updates: Partial<MenuItem>) => {
    onChange(items.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Navigation Architect</h3>
          <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded font-bold">DRAG & DROP</span>
        </div>
        <Button onClick={addItem} variant="ghost" size="sm" className="h-8 gap-1 text-xs">
          <Plus size={14} /> Add Item
        </Button>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={items.map(i => i.id)}
            strategy={layout === 'top' ? horizontalListSortingStrategy : verticalListSortingStrategy}
          >
            <div className={`p-2 ${layout === 'top' ? 'flex flex-row flex-wrap items-start gap-2' : 'space-y-1'}`}>
              {items.map((item) => (
                <SortableItem 
                  key={item.id} 
                  item={item} 
                  layout={layout}
                  onRemove={() => removeItem(item.id)}
                  onUpdate={(updates) => updateItem(item.id, updates)}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({
              styles: {
                active: {
                  opacity: '0.5',
                },
              },
            }),
          }}>
            {activeId ? (
              <ItemContent 
                item={items.find(i => i.id === activeId)!} 
                isDragging 
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
};

const SortableItem = ({ item, onRemove, onUpdate, layout }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 100 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className={`${layout === 'top' ? '' : 'w-full'}`}>
      <ItemContent 
        item={item} 
        layout={layout}
        onRemove={onRemove} 
        onUpdate={onUpdate}
        dragProps={{ ...attributes, ...listeners }} 
      />
      {item.children && layout !== 'top' && (
        <div className="ml-8 mt-1 border-l border-zinc-100 dark:border-zinc-800 pl-4 space-y-1">
          {item.children.map((child: any) => (
            <ItemContent 
              key={child.id}
              item={child} 
              isChild
              onRemove={() => {
                const newChildren = item.children.filter((c: any) => c.id !== child.id);
                onUpdate({ children: newChildren });
              }}
            />
          ))}
          <button 
            onClick={() => {
              const newChild = { id: Math.random().toString(), label: 'Sub Item', icon: 'FileText' };
              onUpdate({ children: [...(item.children || []), newChild] });
            }}
            className="flex items-center gap-2 p-2 text-xs text-zinc-400 hover:text-blue-600 transition-colors"
          >
            <Plus size={12} /> Add Sub-item
          </button>
        </div>
      )}
    </div>
  );
};

const ItemContent = ({ item, dragProps, onRemove, onUpdate, isDragging, isChild, layout }: any) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div 
      className={`group flex items-center gap-3 p-3 rounded-xl border transition-all ${
        layout === 'top' ? 'min-w-[140px]' : 'w-full'
      } ${
        isDragging 
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-lg scale-[1.02] z-50' 
          : 'bg-transparent border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
      }`}
    >
      {!isChild && (
        <div {...dragProps} className="cursor-grab active:cursor-grabbing p-1 text-zinc-300 dark:text-zinc-700 hover:text-zinc-500">
          <GripVertical size={16} />
        </div>
      )}
      
      <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
        <IconRenderer name={item.icon} size={16} />
      </div>

      <div className="flex-1">
        {isEditing ? (
          <input 
            autoFocus
            className="w-full bg-transparent border-none p-0 text-sm font-medium focus:ring-0"
            value={item.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
          />
        ) : (
          <div 
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-text"
            onClick={() => setIsEditing(true)}
          >
            {item.label}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-zinc-400 hover:text-red-600"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  );
};

const IconRenderer = ({ name, ...props }: { name: string } & any) => {
  const icons: any = {
    LayoutDashboard,
    Settings,
    Users,
    FileText
  };
  const Icon = icons[name] || FileText;
  return <Icon {...props} />;
};
