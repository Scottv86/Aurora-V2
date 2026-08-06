import { useState } from 'react';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  GripVertical, 
  Trash2, 
  Eye, 
  EyeOff, 
  Edit3, 
  Check, 
  X, 
  ArrowUp, 
  ArrowDown, 
  FolderPlus,
  Compass,
  CornerDownRight,
  ChevronLeft
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from '../UI/Primitives';
import { cn } from '../../lib/utils';

// Types matching NavigationSettingsPage
interface MenuItem {
  id: string;
  label: string;
  iconName: string;
  to?: string;
  isVisible?: boolean;
  isSubtitle?: boolean;
  children?: MenuItem[];
  moduleId?: string;
  moduleIds?: string[];
  isUnifiedQueue?: boolean;
  queueConfig?: {
    conditions: any;
    columns: string[];
  };
}

interface MenuSection {
  id: string;
  title: string;
  items: MenuItem[];
}

interface Props {
  sections: MenuSection[];
  onChange: (sections: MenuSection[]) => void;
  layout: 'sidebar' | 'slim' | 'top';
  modules?: any[];
  selectedItemId?: string | null;
  onSelectItem?: (itemId: string | null) => void;
  onDropToolboxItem?: (sectionId: string, toolData: any) => void;
}

export const NavigationArchitect = ({ 
  sections, 
  onChange, 
  layout: _layout, 
  selectedItemId, 
  onSelectItem,
  onDropToolboxItem
}: Props) => {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

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

  const addSection = () => {
    const newSection: MenuSection = {
      id: `section-${Date.now()}`,
      title: 'New Category',
      items: []
    };
    onChange([...sections, newSection]);
  };

  const removeSection = (sectionId: string) => {
    onChange(sections.filter(s => s.id !== sectionId));
  };

  const updateSectionTitle = (sectionId: string, title: string) => {
    onChange(sections.map(s => s.id === sectionId ? { ...s, title } : s));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    
    const updated = [...sections];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    onChange(updated);
  };

  // Find container helper
  const findContainer = (id: string): string | null => {
    if (sections.some(s => s.id === id)) return id;
    for (const sec of sections) {
      if (sec.items?.some(i => i.id === id || i.children?.some(c => c.id === id))) {
        return sec.id;
      }
    }
    return null;
  };

  // Find item helper
  const findItem = (id: string): MenuItem | null => {
    for (const sec of sections) {
      for (const item of sec.items || []) {
        if (item.id === id) return item;
        if (item.children) {
          const child = item.children.find(c => c.id === id);
          if (child) return child;
        }
      }
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Ignore section drags during drag over to prevent infinite re-render loops (measureRects)
    const isSectionDrag = sections.some(s => s.id === activeId);
    if (isSectionDrag) return;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    // Moving between categories!
    const sourceSection = sections.find(s => s.id === activeContainer);
    const targetSection = sections.find(s => s.id === overContainer);

    if (!sourceSection || !targetSection) return;

    const activeItem = sourceSection.items.find(i => i.id === activeId);
    if (!activeItem) return;

    const newSourceItems = sourceSection.items.filter(i => i.id !== activeId);
    const overIndex = targetSection.items.findIndex(i => i.id === overId);
    const newTargetItems = [...targetSection.items];

    if (overIndex >= 0) {
      newTargetItems.splice(overIndex, 0, activeItem);
    } else {
      newTargetItems.push(activeItem);
    }

    onChange(sections.map(s => {
      if (s.id === activeContainer) return { ...s, items: newSourceItems };
      if (s.id === overContainer) return { ...s, items: newTargetItems };
      return s;
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Section reordering check
    const isSectionDrag = sections.some(s => s.id === activeId);
    if (isSectionDrag) {
      const targetSectionId = findContainer(overId);
      if (targetSectionId) {
        const oldIndex = sections.findIndex(s => s.id === activeId);
        const newIndex = sections.findIndex(s => s.id === targetSectionId);
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          onChange(arrayMove(sections, oldIndex, newIndex));
        }
      }
      return;
    }

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer) return;

    if (activeContainer === overContainer) {
      // Reordering inside same section
      const section = sections.find(s => s.id === activeContainer);
      if (!section) return;

      const oldIndex = section.items.findIndex(i => i.id === activeId);
      const newIndex = section.items.findIndex(i => i.id === overId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(section.items, oldIndex, newIndex);
        onChange(sections.map(s => s.id === activeContainer ? { ...s, items: reordered } : s));
      }
    }
  };

  const removeItem = (sectionId: string, itemId: string) => {
    onChange(sections.map(sec => {
      if (sec.id !== sectionId) return sec;
      return {
        ...sec,
        items: sec.items.filter(i => i.id !== itemId)
      };
    }));
  };

  const updateItem = (sectionId: string, itemId: string, updates: Partial<MenuItem>) => {
    onChange(sections.map(sec => {
      if (sec.id !== sectionId) return sec;
      return {
        ...sec,
        items: sec.items.map(item => {
          if (item.id === itemId) return { ...item, ...updates };
          return item;
        })
      };
    }));
  };

  const indentItem = (sectionId: string, itemIndex: number) => {
    if (itemIndex === 0) return;
    onChange(sections.map(sec => {
      if (sec.id !== sectionId) return sec;
      const items = [...sec.items];
      const targetItem = items[itemIndex];
      const parentItem = { ...items[itemIndex - 1] };
      parentItem.children = [...(parentItem.children || []), targetItem];
      
      items[itemIndex - 1] = parentItem;
      items.splice(itemIndex, 1);
      return { ...sec, items };
    }));
  };

  const outdentItem = (sectionId: string, parentItemId: string, childId: string) => {
    onChange(sections.map(sec => {
      if (sec.id !== sectionId) return sec;
      const items = [...sec.items];
      const parentIndex = items.findIndex(i => i.id === parentItemId);
      if (parentIndex === -1) return sec;
      
      const parentItem = { ...items[parentIndex] };
      const childItem = parentItem.children?.find(c => c.id === childId);
      if (!childItem) return sec;
      
      parentItem.children = parentItem.children?.filter(c => c.id !== childId);
      items[parentIndex] = parentItem;
      
      // Insert right after parent
      items.splice(parentIndex + 1, 0, childItem);
      return { ...sec, items };
    }));
  };

  const updateChildItem = (sectionId: string, parentItemId: string, childId: string, updates: Partial<MenuItem>) => {
    onChange(sections.map(sec => {
      if (sec.id !== sectionId) return sec;
      return {
        ...sec,
        items: sec.items.map(item => {
          if (item.id !== parentItemId) return item;
          return {
            ...item,
            children: item.children?.map(child => child.id === childId ? { ...child, ...updates } : child)
          };
        })
      };
    }));
  };

  const activeDragItem = activeDragId ? findItem(activeDragId) : null;
  const activeDragSection = activeDragId ? sections.find(s => s.id === activeDragId) : null;

  return (
    <div className="space-y-4 select-none">
      {/* Category Actions Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-200/50 dark:border-white/10">
        <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
          {sections.length} Categories
        </span>
        <Button onClick={addSection} variant="secondary" size="sm" className="h-8 gap-1.5 text-xs font-bold shadow-sm">
          <FolderPlus size={14} className="text-indigo-500" /> Add Category
        </Button>
      </div>

      {sections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/10 dark:bg-zinc-900/10">
          <Compass className="text-zinc-400 dark:text-zinc-600 mb-3 animate-pulse" size={36} />
          <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">No categories in navigation</h4>
          <p className="text-xs text-zinc-500 max-w-xs mt-1">Click "+ Add Category" above or drag/click items from the Left Toolbox.</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-6">
              {sections.map((section, sIndex) => (
                <CategorySectionContainer
                  key={section.id}
                  section={section}
                  sIndex={sIndex}
                  sections={sections}
                  selectedItemId={selectedItemId}
                  onSelectItem={onSelectItem}
                  onDropToolboxItem={onDropToolboxItem}
                  updateSectionTitle={updateSectionTitle}
                  moveSection={moveSection}
                  removeSection={removeSection}
                  removeItem={removeItem}
                  updateItem={updateItem}
                  indentItem={indentItem}
                  outdentItem={outdentItem}
                  updateChildItem={updateChildItem}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeDragItem && (
              <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-2xl flex items-center gap-3 border border-indigo-400 opacity-90">
                <GripVertical size={16} />
                <span className="text-xs font-bold">{activeDragItem.label}</span>
              </div>
            )}
            {activeDragSection && (
              <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-2xl flex items-center gap-3 border border-indigo-400 opacity-90">
                <GripVertical size={18} />
                <span className="text-xs font-black uppercase tracking-wider">{activeDragSection.title} ({activeDragSection.items.length} items)</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
};

// Container for each Menu Category / Section
const CategorySectionContainer = ({
  section,
  sIndex,
  sections,
  selectedItemId,
  onSelectItem,
  onDropToolboxItem,
  updateSectionTitle,
  moveSection,
  removeSection,
  removeItem,
  updateItem,
  indentItem,
  outdentItem,
  updateChildItem
}: {
  section: MenuSection;
  sIndex: number;
  sections: MenuSection[];
  selectedItemId?: string | null;
  onSelectItem?: (itemId: string | null) => void;
  onDropToolboxItem?: (sectionId: string, toolData: any) => void;
  updateSectionTitle: (id: string, title: string) => void;
  moveSection: (index: number, dir: 'up' | 'down') => void;
  removeSection: (id: string) => void;
  removeItem: (secId: string, itemId: string) => void;
  updateItem: (secId: string, itemId: string, updates: Partial<MenuItem>) => void;
  indentItem: (secId: string, idx: number) => void;
  outdentItem: (secId: string, parentId: string, childId: string) => void;
  updateChildItem: (secId: string, parentId: string, childId: string, updates: Partial<MenuItem>) => void;
}) => {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(section.title);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const saveTitle = () => {
    if (titleInput.trim()) {
      updateSectionTitle(section.id, titleInput.trim());
    } else {
      setTitleInput(section.title);
    }
    setEditingTitle(false);
  };

  const itemIds = section.items.map(i => i.id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={(e) => {
        e.preventDefault();
        const rawData = e.dataTransfer.getData('application/json');
        if (rawData && onDropToolboxItem) {
          try {
            const data = JSON.parse(rawData);
            onDropToolboxItem(section.id, data);
          } catch (err) {
            console.error('Failed to parse dropped toolbox data:', err);
          }
        }
      }}
      className={cn(
        "rounded-2xl border transition-all overflow-hidden p-4 bg-white/40 dark:bg-white/[0.02] backdrop-blur-xl",
        isOver 
          ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-500/[0.02]" 
          : "border-zinc-200/80 dark:border-white/5"
      )}
    >
      {/* Category Section Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-200/50 dark:border-white/5">
        <div className="flex items-center gap-2">
          {/* Section Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded transition-colors"
            title="Drag Category to Reorder"
          >
            <GripVertical size={15} />
          </div>
          {editingTitle ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                autoFocus
                className="bg-white dark:bg-zinc-800 border border-indigo-500 rounded-lg px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTitle();
                  if (e.key === 'Escape') {
                    setTitleInput(section.title);
                    setEditingTitle(false);
                  }
                }}
              />
              <button onClick={saveTitle} className="p-1 text-emerald-500 hover:text-emerald-400">
                <Check size={14} />
              </button>
              <button onClick={() => { setTitleInput(section.title); setEditingTitle(false); }} className="p-1 text-zinc-400 hover:text-zinc-300">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">
                {section.title}
              </span>
              <button
                onClick={() => { setTitleInput(section.title); setEditingTitle(true); }}
                className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-opacity"
                title="Rename Category"
              >
                <Edit3 size={12} />
              </button>
            </div>
          )}

          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            {section.items.length} items
          </span>
        </div>

        {/* Section Reorder / Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => moveSection(sIndex, 'up')}
            disabled={sIndex === 0}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400"
            title="Move Category Up"
          >
            <ArrowUp size={14} />
          </button>
          <button
            onClick={() => moveSection(sIndex, 'down')}
            disabled={sIndex === sections.length - 1}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400"
            title="Move Category Down"
          >
            <ArrowDown size={14} />
          </button>
          <button
            onClick={() => removeSection(section.id)}
            className="p-1 rounded-lg text-zinc-400 hover:text-red-500 transition-colors"
            title="Delete Category"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Category Items Droppable Context */}
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-1.5 min-h-[48px]">
          {section.items.length === 0 ? (
            <div className="py-6 text-center border border-dashed border-zinc-200 dark:border-zinc-800/80 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/20 text-xs text-zinc-400 font-medium">
              Drag menu items here into <span className="font-bold text-zinc-600 dark:text-zinc-300">{section.title}</span>
            </div>
          ) : (
            section.items.map((item, iIndex) => (
              <SortableItemRow
                key={item.id}
                item={item}
                itemIndex={iIndex}
                section={section}
                selectedItemId={selectedItemId}
                onSelectItem={onSelectItem}
                removeItem={removeItem}
                updateItem={updateItem}
                indentItem={indentItem}
                outdentItem={outdentItem}
                updateChildItem={updateChildItem}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
};

// Sortable Row representing each menu item
const SortableItemRow = ({
  item,
  itemIndex,
  section,
  selectedItemId,
  onSelectItem,
  removeItem,
  updateItem,
  indentItem,
  outdentItem,
  updateChildItem
}: {
  item: MenuItem;
  itemIndex: number;
  section: MenuSection;
  selectedItemId?: string | null;
  onSelectItem?: (itemId: string | null) => void;
  removeItem: (secId: string, itemId: string) => void;
  updateItem: (secId: string, itemId: string, updates: Partial<MenuItem>) => void;
  indentItem: (secId: string, idx: number) => void;
  outdentItem: (secId: string, parentId: string, childId: string) => void;
  updateChildItem: (secId: string, parentId: string, childId: string, updates: Partial<MenuItem>) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isSelected = selectedItemId === item.id;
  const IconComponent = (LucideIcons as any)[item.iconName] || LucideIcons.Link2;

  return (
    <div ref={setNodeRef} style={style} className="space-y-1">
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (onSelectItem) onSelectItem(item.id);
        }}
        className={cn(
          "group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none",
          isSelected 
            ? "bg-indigo-500/[0.08] dark:bg-indigo-500/[0.12] border-indigo-500 ring-2 ring-indigo-500/20" 
            : "bg-white/60 dark:bg-white/[0.03] border-zinc-200/60 dark:border-white/5 hover:border-indigo-500/40 hover:bg-white dark:hover:bg-white/[0.06]"
        )}
      >
        {/* Left Side: Drag handle, Icon, Label, Path */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded transition-colors"
          >
            <GripVertical size={14} />
          </div>

          {/* Icon Badge */}
          <div className={cn(
            "p-2 rounded-lg border transition-all shrink-0",
            isSelected 
              ? "bg-indigo-500 text-white border-indigo-400" 
              : "bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-white/10 group-hover:text-indigo-500"
          )}>
            <IconComponent size={15} />
          </div>

          {/* Label & Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-xs font-bold truncate",
                isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-900 dark:text-white"
              )}>
                {item.label}
              </span>

              {item.isSubtitle && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700">
                  Label
                </span>
              )}

              {item.children && item.children.length > 0 && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  {item.children.length} sub-items
                </span>
              )}
            </div>

            {item.to && (
              <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                {item.to}
              </p>
            )}
          </div>
        </div>

        {/* Right Side: Visibility, Indent, Remove */}
        <div className="flex items-center gap-1.5 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>

          {/* Indent button */}
          {itemIndex > 0 && (
            <button
              onClick={() => indentItem(section.id, itemIndex)}
              className="p-1 rounded-lg text-zinc-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors"
              title="Nest under item above"
            >
              <CornerDownRight size={13} />
            </button>
          )}

          {/* Visibility Toggle */}
          <button
            onClick={() => updateItem(section.id, item.id, { isVisible: item.isVisible === false ? true : false })}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              item.isVisible === false 
                ? "text-amber-500 bg-amber-500/10" 
                : "text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            )}
            title={item.isVisible === false ? "Hidden from menu" : "Visible in menu"}
          >
            {item.isVisible === false ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>

          {/* Remove item */}
          <button
            onClick={() => removeItem(section.id, item.id)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
            title="Remove menu item"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Sub-items / Nested Children */}
      {item.children && item.children.length > 0 && (
        <div className="pl-6 space-y-1.5 pt-1 border-l-2 border-indigo-500/20 ml-4">
          {item.children.map((child) => {
            const ChildIcon = (LucideIcons as any)[child.iconName] || LucideIcons.Link2;
            const isChildSelected = selectedItemId === child.id;

            return (
              <div
                key={child.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectItem) onSelectItem(child.id);
                }}
                className={cn(
                  "group flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none",
                  isChildSelected
                    ? "bg-indigo-500/[0.08] dark:bg-indigo-500/[0.12] border-indigo-500 ring-2 ring-indigo-500/20"
                    : "bg-white/40 dark:bg-white/[0.02] border-zinc-200/50 dark:border-white/5 hover:border-indigo-500/40"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className={cn(
                    "p-1.5 rounded-lg border transition-all shrink-0",
                    isChildSelected 
                      ? "bg-indigo-500 text-white border-indigo-400" 
                      : "bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-white/10"
                  )}>
                    <ChildIcon size={13} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className={cn(
                      "text-xs font-semibold truncate block",
                      isChildSelected ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-800 dark:text-zinc-200"
                    )}>
                      {child.label}
                    </span>
                    {child.to && (
                      <span className="text-[9px] font-mono text-zinc-400 truncate block">
                        {child.to}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => outdentItem(section.id, item.id, child.id)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors"
                    title="Promote to top level"
                  >
                    <ChevronLeft size={13} />
                  </button>

                  <button
                    onClick={() => updateChildItem(section.id, item.id, child.id, { isVisible: child.isVisible === false ? true : false })}
                    className={cn(
                      "p-1 rounded-lg transition-colors",
                      child.isVisible === false ? "text-amber-500 bg-amber-500/10" : "text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    )}
                    title={child.isVisible === false ? "Hidden" : "Visible"}
                  >
                    {child.isVisible === false ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
