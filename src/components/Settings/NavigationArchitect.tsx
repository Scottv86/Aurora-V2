import { useState, useMemo } from 'react';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
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
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  ChevronRight, 
  ChevronLeft, 
  Edit3, 
  Check, 
  X, 
  ArrowUp, 
  ArrowDown, 
  Heading
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from '../UI/Primitives';
import { cn, flattenFields } from '../../lib/utils';
import { PLATFORM_MODULES } from '../../config/platformModules';
import { toast } from 'sonner';

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
}

const COMMON_ICONS = [
  'LayoutDashboard', 'Users', 'ClipboardList', 'FileText', 'Inbox', 'BookOpen', 
  'BarChart', 'Settings', 'Database', 'Lock', 'Shield', 'Globe', 'Layers', 
  'MessageSquare', 'Calendar', 'Folder', 'Zap', 'Terminal', 'Heart', 'HelpCircle'
];

export const NavigationArchitect = ({ sections, onChange, layout: _layout, modules }: Props) => {
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

  const handleDragEnd = (event: any, sectionId: string) => {
    const { active, over } = event;
    if (!over) return;

    if (active.id !== over.id) {
      onChange(sections.map(sec => {
        if (sec.id !== sectionId) return sec;
        
        const oldIndex = sec.items.findIndex(i => i.id === active.id);
        const newIndex = sec.items.findIndex(i => i.id === over.id);
        
        if (oldIndex === -1 || newIndex === -1) return sec;
        
        return {
          ...sec,
          items: arrayMove(sec.items, oldIndex, newIndex)
        };
      }));
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

  const moveItemToSection = (currentSectionId: string, targetSectionId: string, item: MenuItem) => {
    onChange(sections.map(sec => {
      // Remove from current
      if (sec.id === currentSectionId) {
        return {
          ...sec,
          items: sec.items.filter(i => i.id !== item.id)
        };
      }
      // Add to target
      if (sec.id === targetSectionId) {
        return {
          ...sec,
          items: [...sec.items, item]
        };
      }
      return sec;
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Menu Tree Architect</h3>
        </div>
        <Button onClick={addSection} variant="secondary" size="sm" className="h-8 gap-1 text-xs">
          <Plus size={14} /> Add Category
        </Button>
      </div>

      {sections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <Heading className="text-zinc-300 dark:text-zinc-700 mb-2" size={32} />
          <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">No categories created yet</h4>
          <p className="text-xs text-zinc-500 max-w-xs mt-1">Create your first category to start structuring your custom menu.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((section, sIndex) => (
            <div 
              key={section.id} 
              className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/20 overflow-hidden shadow-sm"
            >
              {/* Section Header */}
              <div className="flex items-center justify-between p-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                    className="bg-transparent border-none p-0 text-xs font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300 focus:ring-0 w-48 focus:border-b focus:border-indigo-500"
                  />
                  <span className="text-[9px] bg-zinc-100 dark:bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-bold uppercase">
                    {section.items?.length || 0} items
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-zinc-400 hover:text-zinc-600"
                    disabled={sIndex === 0}
                    onClick={() => moveSection(sIndex, 'up')}
                  >
                    <ArrowUp size={13} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-zinc-400 hover:text-zinc-600"
                    disabled={sIndex === sections.length - 1}
                    onClick={() => moveSection(sIndex, 'down')}
                  >
                    <ArrowDown size={13} />
                  </Button>
                  <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-zinc-400 hover:text-red-500"
                    onClick={() => removeSection(section.id)}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>

              {/* Section Items (Sortable with DndContext) */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleDragEnd(e, section.id)}
              >
                <SortableContext
                  items={section.items.map(i => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="p-3 space-y-2 min-h-[60px] bg-zinc-50/50 dark:bg-zinc-900/10">
                    {section.items.length === 0 ? (
                      <p className="text-[10px] text-zinc-400 italic text-center py-4">No items inside. Drag items here or click "+" on tools.</p>
                    ) : (
                      section.items.map((item, itemIndex) => (
                        <SortableItemWrapper
                          key={item.id}
                          item={item}
                          itemIndex={itemIndex}
                          sectionId={section.id}
                          allSections={sections}
                          onRemove={() => removeItem(section.id, item.id)}
                          onUpdate={(updates: Partial<MenuItem>) => updateItem(section.id, item.id, updates)}
                          onIndent={() => indentItem(section.id, itemIndex)}
                          onOutdent={(parentItemId: string, childId: string) => outdentItem(section.id, parentItemId, childId)}
                          onChildUpdate={(childId: string, updates: Partial<MenuItem>) => updateChildItem(section.id, item.id, childId, updates)}
                          onMoveToSection={(targetSecId: string) => moveItemToSection(section.id, targetSecId, item)}
                          modules={modules}
                        />
                      ))
                    )}
                  </div>
                </SortableContext>
              </DndContext>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Sortable Wrapper Component
const SortableItemWrapper = ({ 
  item, 
  itemIndex, 
  sectionId, 
  allSections,
  onRemove, 
  onUpdate, 
  onIndent,
  onOutdent,
  onChildUpdate,
  onMoveToSection,
  modules
}: any) => {
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
    <div ref={setNodeRef} style={style} className="space-y-1">
      <ItemCard 
        item={item} 
        itemIndex={itemIndex}
        sectionId={sectionId}
        allSections={allSections}
        onRemove={onRemove} 
        onUpdate={onUpdate}
        onIndent={onIndent}
        onMoveToSection={onMoveToSection}
        dragProps={{ ...attributes, ...listeners }} 
        modules={modules}
      />

      {/* Render children sub-items */}
      {item.children && item.children.length > 0 && (
        <div className="pl-6 border-l border-zinc-200 dark:border-zinc-800 ml-4.5 space-y-1.5 py-1">
          {item.children.map((child: MenuItem) => (
            <ItemCard 
              key={child.id}
              item={child}
              sectionId={sectionId}
              allSections={allSections}
              isChild={true}
              onRemove={() => {
                const filtered = item.children?.filter((c: MenuItem) => c.id !== child.id) || [];
                onUpdate({ children: filtered });
              }}
              onUpdate={(updates: any) => onChildUpdate(child.id, updates)}
              onOutdent={() => onOutdent(item.id, child.id)}
              modules={modules}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Card representation of menu item
const ItemCard = ({ 
  item, 
  itemIndex,
  sectionId, 
  allSections,
  isChild,
  onRemove, 
  onUpdate, 
  onIndent,
  onOutdent,
  onMoveToSection,
  dragProps,
  modules = []
}: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(item.label);
  const [editPath, setEditPath] = useState(item.to || '');
  const [editIcon, setEditIcon] = useState(item.iconName);
  const [editIconInput, setEditIconInput] = useState('');
  const [isSubtitle, setIsSubtitle] = useState(!!item.isSubtitle);

  // Queue edit states:
  const [editQueueItemType, setEditQueueItemType] = useState<'single' | 'unified'>('single');
  const [editQueueModuleId, setEditQueueModuleId] = useState('');
  const [editQueueModuleIds, setEditQueueModuleIds] = useState<string[]>([]);
  const [editQueueRules, setEditQueueRules] = useState<{ fieldId: string; operator: string; value: string }[]>([]);
  const [editQueueColumns, setEditQueueColumns] = useState<string[]>([]);

  const activeCustomModules = useMemo(() => {
    return modules.filter((mod: any) => {
      if (mod.type === 'PAGE') return false;
      if (mod.status !== 'ACTIVE' && !mod.enabled) return false;
      const isPlatform = PLATFORM_MODULES.some((pm: any) => pm.id === mod.id || pm.id === mod.templateId || pm.name === mod.name || pm.slug === mod.templateId);
      if (isPlatform) return false;
      if (mod.isGlobal || mod.isIntakeTriage || mod.config?.isIntakeTriage) return false;
      return true;
    });
  }, [modules]);

  const queueAvailableFields = useMemo(() => {
    const list: { id: string; label: string; origin?: string }[] = [
      { id: 'currentUser.teamName', label: 'Current User: Team Name' },
      { id: 'currentUser.teamId', label: 'Current User: Team ID' },
      { id: 'currentUser.role', label: 'Current User: Role' },
      { id: 'currentUser.id', label: 'Current User: Member ID' },
      { id: 'status', label: 'Status' },
      { id: 'priority', label: 'Priority' },
      { id: 'assigneeId', label: 'Assignee ID' }
    ];

    const targetModuleIds = editQueueItemType === 'single' 
      ? (editQueueModuleId ? [editQueueModuleId] : []) 
      : editQueueModuleIds;

    targetModuleIds.forEach(mId => {
      const mod = modules.find((m: any) => m.id === mId);
      if (mod?.layout) {
        const flat = flattenFields(mod.layout);
        flat.forEach(f => {
          if (f.type && !['heading', 'divider', 'spacer', 'alert', 'fieldGroup', 'repeatableGroup', 'group', 'card', 'accordion', 'tabs_nested', 'stepper', 'timeline'].includes(f.type)) {
            if (!list.some(item => item.id === f.id)) {
              list.push({ id: f.id, label: `${f.label || f.name} (${mod.name})`, origin: mod.name });
            }
          }
        });
      }
    });

    return list;
  }, [editQueueItemType, editQueueModuleId, editQueueModuleIds, modules]);

  const queueColumnOptions = useMemo(() => {
    const list: { id: string; label: string; group: string }[] = [
      { id: 'id', label: 'Record ID', group: 'System' },
      { id: 'moduleId', label: 'Module Name', group: 'System' },
      { id: 'title', label: 'Title/Key', group: 'System' },
      { id: 'status', label: 'Status', group: 'System' },
      { id: 'priority', label: 'Priority', group: 'System' },
      { id: 'assigneeId', label: 'Assignee', group: 'System' },
      { id: 'createdAt', label: 'Created At', group: 'System' },
      { id: 'updatedAt', label: 'Updated At', group: 'System' }
    ];

    const targetModuleIds = editQueueItemType === 'single' 
      ? (editQueueModuleId ? [editQueueModuleId] : []) 
      : editQueueModuleIds;

    targetModuleIds.forEach(mId => {
      const mod = modules.find((m: any) => m.id === mId);
      if (mod?.layout) {
        const flat = flattenFields(mod.layout);
        flat.forEach(f => {
          if (f.type && !['heading', 'divider', 'spacer', 'alert', 'fieldGroup', 'repeatableGroup', 'group', 'card', 'accordion', 'tabs_nested', 'stepper', 'timeline'].includes(f.type)) {
            if (!list.some(item => item.id === f.id)) {
              list.push({ id: f.id, label: f.label || f.name, group: mod.name });
            }
          }
        });
      }
    });

    return list;
  }, [editQueueItemType, editQueueModuleId, editQueueModuleIds, modules]);

  const startEdit = () => {
    setEditLabel(item.label);
    setEditPath(item.to || '');
    setEditIcon(item.iconName);
    setIsSubtitle(!!item.isSubtitle);

    // Initialize queue states
    const isUnified = !!item.isUnifiedQueue;
    setEditQueueItemType(isUnified ? 'unified' : 'single');
    setEditQueueModuleId(item.moduleId || '');
    setEditQueueModuleIds(item.moduleIds || []);
    
    const initialRules = item.queueConfig?.conditions?.rules?.map((r: any) => ({
      fieldId: r.fieldId,
      operator: r.operator,
      value: r.value || ''
    })) || [{ fieldId: '', operator: 'equals', value: '' }];
    setEditQueueRules(initialRules);
    
    setEditQueueColumns(item.queueConfig?.columns || [
      'id', 'moduleId', 'title', 'status', 'priority', 'assigneeId', 'createdAt'
    ]);

    setIsEditing(true);
  };

  const saveEdit = () => {
    const icon = editIconInput.trim() || editIcon;

    if (item.queueConfig) {
      // It is a queue item! We must validate and update queue specific fields
      if (!editLabel.trim()) {
        toast.error('Please enter a queue label.');
        return;
      }
      if (editQueueItemType === 'single' && !editQueueModuleId) {
        toast.error('Please select a target module.');
        return;
      }
      if (editQueueItemType === 'unified' && editQueueModuleIds.length === 0) {
        toast.error('Please select at least one module.');
        return;
      }

      const validRules = editQueueRules
        .filter(r => r.fieldId)
        .map(r => {
          const isVar = r.fieldId.startsWith('currentUser.');
          return {
            fieldId: r.fieldId,
            fieldType: isVar ? 'variable' : 'field',
            operator: r.operator,
            value: r.value,
            valueType: 'literal'
          };
        });

      const conditions = {
        type: 'group',
        logicalOperator: 'AND',
        rules: validRules
      };

      const queueId = item.id;
      const updatedTo = editQueueItemType === 'single'
        ? `/workspace/modules/${editQueueModuleId}?queueId=${queueId}`
        : `/workspace/queues/${queueId}`;

      onUpdate({
        label: editLabel,
        iconName: icon,
        moduleId: editQueueItemType === 'single' ? editQueueModuleId : undefined,
        moduleIds: editQueueItemType === 'unified' ? editQueueModuleIds : undefined,
        isUnifiedQueue: editQueueItemType === 'unified',
        to: updatedTo,
        queueConfig: {
          conditions,
          columns: editQueueItemType === 'unified' ? editQueueColumns : []
        }
      });
    } else {
      // Normal item edit
      onUpdate({
        label: editLabel,
        iconName: icon,
        isSubtitle: isSubtitle,
        to: isSubtitle ? undefined : editPath
      });
    }

    setIsEditing(false);
  };

  const IconComponent = (LucideIcons as any)[item.iconName] || LucideIcons.Box;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center gap-3 p-3">
        {/* Drag handle */}
        {!isChild && (
          <div {...dragProps} className="cursor-grab active:cursor-grabbing p-1 text-zinc-300 dark:text-zinc-700 hover:text-zinc-500">
            <GripVertical size={14} />
          </div>
        )}
        
        {/* Indent Guide for children */}
        {isChild && (
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        )}

        {/* Icon preview */}
        <div className={cn(
          "p-2 rounded-lg text-zinc-500",
          item.isSubtitle ? "bg-zinc-100 dark:bg-zinc-800" : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
        )}>
          <IconComponent size={14} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "text-xs font-semibold truncate",
              item.isSubtitle ? "text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-extrabold text-[10px]" : "text-zinc-700 dark:text-zinc-300"
            )}>
              {item.label}
            </span>
            {item.isSubtitle && (
              <span className="text-[8px] bg-zinc-100 dark:bg-zinc-800 text-zinc-400 px-1 py-0.2 rounded font-bold uppercase">Subtitle</span>
            )}
          </div>
          {!item.isSubtitle && (
            <p className="text-[10px] text-zinc-400 truncate">{item.to || 'No Link'}</p>
          )}
        </div>

        {/* Actions panel */}
        <div className="flex items-center gap-1 shrink-0">
          
          {/* Nesting controls */}
          {!isChild && itemIndex > 0 && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-zinc-400 hover:text-zinc-600"
              onClick={onIndent}
              title="Indent (Nest under item above)"
            >
              <ChevronRight size={13} />
            </Button>
          )}

          {isChild && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-zinc-400 hover:text-zinc-600"
              onClick={onOutdent}
              title="Outdent (Move to top level)"
            >
              <ChevronLeft size={13} />
            </Button>
          )}

          {/* Move to another section (only top-level items) */}
          {!isChild && (
            <select
              className="text-[10px] bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-1.5 py-0.5 max-w-[80px]"
              onChange={(e) => {
                if (e.target.value) {
                  onMoveToSection(e.target.value);
                  e.target.value = '';
                }
              }}
              defaultValue=""
            >
              <option value="" disabled>Move...</option>
              {allSections.filter((s: any) => s.id !== sectionId).map((s: any) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          )}

          {/* Visibility trigger */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-zinc-400 hover:text-zinc-600"
            onClick={() => onUpdate({ isVisible: item.isVisible !== false ? false : true })}
          >
            {item.isVisible !== false ? <Eye size={13} /> : <EyeOff size={13} className="text-zinc-300" />}
          </Button>

          {/* Edit trigger */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-zinc-400 hover:text-indigo-500"
            onClick={startEdit}
          >
            <Edit3 size={13} />
          </Button>

          {/* Delete trigger */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-zinc-400 hover:text-red-500"
            onClick={onRemove}
          >
            <Trash2 size={13} />
          </Button>
        </div>
      </div>

      {/* Edit drawer/inline panel */}
      {isEditing && (
        <div className="p-3.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Edit Menu Item</span>
            {!item.queueConfig && (
              <div className="flex gap-2 text-[10px]">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isSubtitle} 
                    onChange={(e) => {
                      setIsSubtitle(e.target.checked);
                    }}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-3 w-3"
                  />
                  <span className="font-bold text-zinc-500 uppercase">Is Subtitle</span>
                </label>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Label</label>
              <input
                type="text"
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-xs outline-none"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
              />
            </div>

            {!isSubtitle && !item.queueConfig && (
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Route Path</label>
                <input
                  type="text"
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-xs outline-none"
                  value={editPath}
                  onChange={(e) => setEditPath(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Choose Predefined Icon</label>
              <select
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-xs outline-none"
                value={editIcon}
                onChange={(e) => setEditIcon(e.target.value)}
              >
                {COMMON_ICONS.map(i => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Or Type Lucide Name</label>
              <input
                type="text"
                placeholder="e.g. Activity"
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-xs outline-none"
                value={editIconInput}
                onChange={(e) => setEditIconInput(e.target.value)}
              />
            </div>
          </div>

          {/* Queue builder configurations if queueConfig is present */}
          {item.queueConfig && (
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 bg-white dark:bg-zinc-900 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                  Queue Config
                </span>
                <div className="flex gap-2 text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      setEditQueueItemType('single');
                      setEditQueueColumns(['id', 'moduleId', 'title', 'status', 'priority', 'assigneeId', 'createdAt']);
                    }}
                    className={cn("px-1.5 py-0.5 rounded font-bold uppercase", editQueueItemType === 'single' ? "bg-indigo-600 text-white" : "text-zinc-450")}
                  >
                    Single Module
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditQueueItemType('unified');
                    }}
                    className={cn("px-1.5 py-0.5 rounded font-bold uppercase", editQueueItemType === 'unified' ? "bg-indigo-600 text-white" : "text-zinc-450")}
                  >
                    Unified
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {/* Module Selector */}
                {editQueueItemType === 'single' ? (
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase">Target Module</label>
                    <select
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-2.5 py-1 text-xs outline-none focus:border-indigo-500/50"
                      value={editQueueModuleId}
                      onChange={(e) => setEditQueueModuleId(e.target.value)}
                    >
                      <option value="">Select a Module...</option>
                      {activeCustomModules.map((m: any) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase block">Select Target Modules</label>
                    <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded p-2 max-h-28 overflow-y-auto space-y-1 custom-scrollbar">
                      {activeCustomModules.map((m: any) => {
                        const isChecked = editQueueModuleIds.includes(m.id);
                        return (
                          <label key={m.id} className="flex items-center gap-2 text-xs font-medium text-zinc-750 dark:text-zinc-350 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditQueueModuleIds([...editQueueModuleIds, m.id]);
                                } else {
                                  setEditQueueModuleIds(editQueueModuleIds.filter(id => id !== m.id));
                                }
                              }}
                              className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>{m.name}</span>
                          </label>
                        );
                      })}
                      {activeCustomModules.length === 0 && (
                        <p className="text-[10px] text-zinc-400 italic">No active custom modules.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Condition Builder Section */}
                <div className="space-y-1.5 border-t border-zinc-150 dark:border-zinc-800 pt-2">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase block">Filtering Rules (AND)</label>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                    {editQueueRules.map((rule, idx) => (
                      <div key={idx} className="flex gap-1.5 items-center">
                        <select
                          className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-1.5 py-1 text-[10px] outline-none"
                          value={rule.fieldId}
                          onChange={(e) => {
                            const updated = [...editQueueRules];
                            updated[idx].fieldId = e.target.value;
                            setEditQueueRules(updated);
                          }}
                        >
                          <option value="">Field...</option>
                          {queueAvailableFields.map(f => (
                            <option key={f.id} value={f.id}>{f.label}</option>
                          ))}
                        </select>

                        <select
                          className="w-18 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-1 py-1 text-[10px] outline-none"
                          value={rule.operator}
                          onChange={(e) => {
                            const updated = [...editQueueRules];
                            updated[idx].operator = e.target.value;
                            setEditQueueRules(updated);
                          }}
                        >
                          <option value="equals">==</option>
                          <option value="not_equals">!=</option>
                          <option value="contains">contains</option>
                          <option value="is_empty">empty</option>
                          <option value="not_empty">not empty</option>
                        </select>

                        {rule.operator !== 'is_empty' && rule.operator !== 'not_empty' && (
                          <input
                            type="text"
                            placeholder="Value"
                            className="w-20 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-1.5 py-1 text-[10px] outline-none"
                            value={rule.value}
                            onChange={(e) => {
                              const updated = [...editQueueRules];
                              updated[idx].value = e.target.value;
                              setEditQueueRules(updated);
                            }}
                          />
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setEditQueueRules(editQueueRules.filter((_, i) => i !== idx));
                          }}
                          disabled={editQueueRules.length === 1}
                          className="text-zinc-400 hover:text-red-500 disabled:opacity-30"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditQueueRules([...editQueueRules, { fieldId: '', operator: 'equals', value: '' }])}
                    className="flex items-center gap-1 text-[9px] text-indigo-650 dark:text-indigo-400 font-bold uppercase mt-1 hover:underline"
                  >
                    <Plus size={10} /> Add Rule
                  </button>
                </div>

                {/* Columns Selection Section (Only for Unified Queues) */}
                {editQueueItemType === 'unified' && (
                  <div className="space-y-1.5 border-t border-zinc-150 dark:border-zinc-800 pt-2">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase block">Display Columns</label>
                    <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded p-2 max-h-36 overflow-y-auto space-y-2 custom-scrollbar">
                      {Array.from(new Set(queueColumnOptions.map(c => c.group))).map(groupName => (
                        <div key={groupName} className="space-y-1">
                          <div className="text-[9px] font-black text-zinc-450 dark:text-zinc-650 uppercase tracking-widest border-b border-zinc-200/60 dark:border-zinc-900 pb-0.5">
                            {groupName} Fields
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 pl-1">
                            {queueColumnOptions.filter(c => c.group === groupName).map(col => {
                              const isChecked = editQueueColumns.includes(col.id);
                              return (
                                <label key={col.id} className="flex items-center gap-1.5 text-[10px] text-zinc-700 dark:text-zinc-350 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setEditQueueColumns([...editQueueColumns, col.id]);
                                      } else {
                                        setEditQueueColumns(editQueueColumns.filter(c => c !== col.id));
                                      }
                                    }}
                                    className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 h-3 w-3"
                                  />
                                  <span className="truncate">{col.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-1.5 pt-1.5">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsEditing(false)}>
              <X size={12} /> Cancel
            </Button>
            <Button variant="primary" size="sm" className="h-7 text-xs" onClick={saveEdit}>
              <Check size={12} /> Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
