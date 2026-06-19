import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Plus, 
  Trash2, 
  Settings2, 
  BrainCircuit, 
  Layers, 
  ChevronRight,
  Split,
  CircleDot,
  Database,
  ChevronDown,
  GripVertical,
  MessageSquareQuote,
  Loader2,
  Search,
  User,
  Clock,
  Users,
  Shield,
  Check,
  Mail
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { VisibilityRule, Field, Tab } from '../ModuleEditor';
import { usePlatformLookup } from '../../hooks/usePlatformLookup';
import { useAuth } from '../../hooks/useAuth';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ConditionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: VisibilityRule | undefined) => void;
  initialRule?: VisibilityRule;
  availableFields: Field[];
  tabs: Tab[];
  targetLabel: string;
  title?: string;
  hideActionSelector?: boolean;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

// --- Hierarchical Selector Component ---
import { createPortal } from 'react-dom';

const HierarchicalSelector = ({ 
  options, 
  value, 
  onChange, 
  placeholder = "Search fields...",
  variableMode = false
}: { 
  options: { id: string; label: string; category: string; icon?: any }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  variableMode?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const categories = useMemo(() => Array.from(new Set(options.map(o => o.category))), [options]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, direction: 'down' as 'up' | 'down' });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.id === value);

  // Sync active category
  useEffect(() => {
    if (isOpen && categories.length > 0) {
      if (!activeCategory || !categories.includes(activeCategory)) {
        setActiveCategory(categories[0]);
      }
    }
  }, [isOpen, categories, activeCategory]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (triggerRef.current?.contains(event.target as Node)) return;
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      
      // Calculate position
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const menuHeight = 360; // Approximate
        const direction = spaceBelow < menuHeight && rect.top > menuHeight ? 'up' : 'down';
        
        setCoords({
          top: direction === 'down' ? rect.bottom : rect.top - menuHeight - 8,
          left: rect.left,
          width: rect.width,
          direction
        });
      }
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, activeCategory, categories]);

  const filteredOptions = options.filter(o => 
    (o.label || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const currentCategory = activeCategory || categories[0];
  const displayOptions = (search || categories.length <= 1)
    ? filteredOptions 
    : filteredOptions.filter(o => o.category === currentCategory);

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full h-10 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs flex items-center justify-between transition-all outline-none",
          isOpen ? "ring-2 ring-indigo-500/20 border-indigo-500 shadow-lg" : "hover:border-zinc-300 dark:hover:border-zinc-700",
          variableMode && "text-purple-500 border-purple-500/30",
          selectedOption ? "text-zinc-900 dark:text-white font-bold tracking-tight" : "text-zinc-400"
        )}
      >
        <span className="truncate flex items-center gap-2">
          {selectedOption ? (
            <>
              {selectedOption.icon && <selectedOption.icon size={12} className="opacity-60" />}
              {selectedOption.label}
            </>
          ) : (
            <span>Select...</span>
          )}
        </span>
        <ChevronDown size={14} className={cn("transition-transform duration-200 opacity-40", isOpen && "rotate-180")} />
      </button>

      {isOpen && createPortal(
        <div 
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
          }}
          className="fixed z-[9999]" 
          style={{ 
            top: coords.top, 
            left: coords.left, 
            width: Math.max(coords.width, 320) 
          }}
        >
          <AnimatePresence>
            <motion.div
              ref={containerRef}
              initial={{ opacity: 0, y: coords.direction === 'down' ? 4 : -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: coords.direction === 'down' ? 4 : -4, scale: 0.98 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Search Header */}
              <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2 bg-zinc-50/50 dark:bg-zinc-950/20">
                <Search size={14} className="text-zinc-400" />
                <input
                  autoFocus
                  placeholder={placeholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400"
                />
              </div>

              <div className="flex h-[320px]">
                {/* Left Column: Categories */}
                {!search && categories.length > 1 && (
                  <div className="w-1/3 border-r border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/10 overflow-y-auto custom-scrollbar">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onMouseEnter={() => setActiveCategory(cat)}
                        className={cn(
                          "w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all",
                          activeCategory === cat 
                            ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                            : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}

                {/* Right Column: Items */}
                <div className={cn("flex-1 overflow-y-auto p-2 custom-scrollbar bg-white dark:bg-zinc-900", (search || categories.length <= 1) && "w-full")}>
                  {displayOptions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                      <Search size={24} className="text-zinc-200 dark:text-zinc-800 mb-2" />
                      <p className="text-[10px] font-medium text-zinc-400">No results matching "{search}"</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {displayOptions.map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            onChange(opt.id);
                            setIsOpen(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2.5 rounded-xl transition-all group flex items-center justify-between",
                            value === opt.id 
                              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                              : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300"
                          )}
                        >
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold tracking-tight">{opt.label}</span>
                            {search && (
                              <span className={cn(
                                "text-[9px] uppercase tracking-wider block mt-0.5 font-medium",
                                value === opt.id ? "text-indigo-100" : "text-zinc-400"
                              )}>
                                {opt.category}
                              </span>
                            )}
                          </div>
                          {value === opt.id ? (
                            <Check size={14} className="shrink-0" />
                          ) : (
                            <ChevronRight size={14} className="opacity-0 group-hover:opacity-40 transition-all -translate-x-2 group-hover:translate-x-0 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>,
        document.body
      )}
    </div>
  );
};

// --- Condition Value Input Component ---

const ConditionValueInput = ({ 
  r, 
  onUpdate, 
  availableFields, 
  tabs 
}: { 
  r: VisibilityRule; 
  onUpdate: (updates: Partial<VisibilityRule>) => void;
  availableFields: Field[];
  tabs: Tab[];
}) => {
  const { session } = useAuth();
  const selectedField = availableFields.find(f => f.id === r.fieldId);
  
  // 1. Fetch Lookup items if applicable (Global List, Platform, User, or System Variable)
  const lookupField = useMemo(() => {
    // Check for standard module field lookups
    if (selectedField) {
      // Virtual field for standard User fields
      if (selectedField.type === 'user') {
        return { lookupSource: 'platform', platformEntity: 'users' };
      }
      
      // Normal lookup fields (handled by usePlatformLookup)
      if (selectedField.lookupSource || selectedField.optionsSource === 'global_list') {
        return {
          ...selectedField,
          lookupSource: selectedField.lookupSource || (selectedField.optionsSource === 'global_list' ? 'global_list' : undefined)
        };
      }
    }
    
    // Check for system variables that need lookups
    if (r.fieldType === 'variable') {
      if (r.fieldId === '{{currentUser.id}}' || r.fieldId === '{{currentUser.name}}' || r.fieldId === '{{currentUser.email}}') {
        return { lookupSource: 'platform', platformEntity: 'users' };
      }
      if (r.fieldId === '{{currentUser.position}}') {
        return { lookupSource: 'platform', platformEntity: 'positions' };
      }
      if (r.fieldId === '{{currentUser.team}}') {
        return { lookupSource: 'platform', platformEntity: 'teams' };
      }
    }
    
    return null;
  }, [selectedField, r.fieldType, r.fieldId]);

  const { data: items, loading } = usePlatformLookup(lookupField);

  // 2. Determine options
  const selectorOptions = useMemo(() => {
    // 1. Variable selection options (when choosing a variable to compare WITH)
    if (r.valueType === 'variable') {
      return [
        { value: '{{currentUser.id}}', label: 'Current User' },
        { value: '{{today}}', label: 'Today' },
        { value: '{{now}}', label: 'Now' }
      ];
    }

    // 2. Platform/Lookup options
    if (lookupField && items) {
      const options = items.map(item => {
        let value = String(item.id);
        let label = item.name || item.title || item.value || String(item.id);

        if (r.fieldType === 'variable') {
          if (r.fieldId === '{{currentUser.email}}' && item.email) {
            value = item.email;
            label = item.email;
          } else if (r.fieldId === '{{currentUser.name}}') {
            value = item.name || item.fullName || value;
            label = item.name || item.fullName || value;
          }
        }
        return { value, label };
      });

      // Add current user as a primary option if missing from the list (for workforce vars)
      const isUserVar = r.fieldType === 'variable' && ['{{currentUser.id}}', '{{currentUser.name}}', '{{currentUser.email}}'].includes(r.fieldId || '');
      const isTeamVar = r.fieldType === 'variable' && r.fieldId === '{{currentUser.team}}';
      const isPosVar = r.fieldType === 'variable' && r.fieldId === '{{currentUser.position}}';
      
      const user = session?.user as any;

      if (isUserVar && user) {
        let val = user.id;
        let lab = user.name || user.email;
        
        if (r.fieldId === '{{currentUser.email}}') {
          val = user.email;
          lab = user.email;
        } else if (r.fieldId === '{{currentUser.name}}') {
          val = user.name || user.email;
          lab = user.name || user.email;
        }

        if (!options.find(o => o.value === val)) {
          options.unshift({ value: val, label: `${lab} (You)` });
        }
      }

      if (isTeamVar && user?.teamId) {
        if (!options.find(o => o.value === user.teamId)) {
          const teamLabel = user.teamName || user.team || 'Your Team';
          options.unshift({ value: user.teamId, label: `${teamLabel} (You)` });
        }
      }

      if (isPosVar && user?.positionId) {
        if (!options.find(o => o.value === user.positionId)) {
          const posLabel = user.positionTitle || user.position || 'Your Position';
          options.unshift({ value: user.positionId, label: `${posLabel} (You)` });
        }
      }

      return options.length > 0 ? options : null;
    }

    // 3. Fallbacks for system variables
    if (r.fieldType === 'variable') {
      if (r.fieldId === '{{currentUser.role}}') {
        return [
          { value: 'Admin', label: 'Admin' },
          { value: 'Lead', label: 'Lead' },
          { value: 'Standard', label: 'Standard' }
        ];
      }
    }

    if (!selectedField) return null;

    // 4. Boolean/Toggle types
    if (['toggle', 'checkbox', 'boolean', 'switch', 'Toggle', 'Checkbox', 'Boolean', 'Switch'].includes(selectedField.type)) {
      return [
        { value: 'true', label: 'True' },
        { value: 'false', label: 'False' }
      ];
    }

    // 5. Manual options
    if (selectedField.optionsSource === 'manual' && selectedField.options && selectedField.options.length > 0) {
      return selectedField.options.map((opt: any) => 
        typeof opt === 'string' ? { value: opt, label: opt } : opt
      );
    }

    return null;
  }, [selectedField, items, r.valueType, r.fieldType, r.fieldId]);

  if (r.valueType === 'field') {
    return (
      <div className="relative flex-1">
        <HierarchicalSelector
          value={r.value || ''}
          onChange={(val) => onUpdate({ value: val })}
          placeholder="Select field to compare..."
          options={(() => {
            const opts: any[] = [
              { id: '_record_key', label: 'Record Key', category: 'System Fields', icon: Database }
            ];

            tabs.forEach(tab => {
              const tabFields = availableFields
                .filter(f => f.id !== r.fieldId && f.tabId === tab.id && !['group', 'fieldGroup', 'repeatableGroup', 'card', 'accordion', 'tabs_nested', 'stepper', 'timeline', 'divider', 'spacer', 'heading'].includes(f.type))
                .sort((a, b) => (a.rowIndex || 0) - (b.rowIndex || 0) || (a.startCol || 0) - (b.startCol || 0));
              
              tabFields.forEach(f => {
                opts.push({ id: f.id, label: f.label || f.name || f.id, category: tab.label || 'General', icon: Database });
              });
            });

            // Add other fields not in tabs
            const otherFields = availableFields
              .filter(f => f.id !== r.fieldId && (!f.tabId || !tabs.find(t => t.id === f.tabId)) && !['group', 'fieldGroup', 'repeatableGroup', 'card', 'accordion', 'tabs_nested', 'stepper', 'timeline', 'divider', 'spacer', 'heading'].includes(f.type))
              .sort((a, b) => (a.rowIndex || 0) - (b.rowIndex || 0) || (a.startCol || 0) - (b.startCol || 0));
            
            otherFields.forEach(f => {
              opts.push({ id: f.id, label: f.label || f.name || f.id, category: 'Other Fields', icon: Database });
            });

            return opts;
          })()}
        />
      </div>
    );
  }

  const isWorkforceVar = r.fieldType === 'variable' && [
    '{{currentUser.id}}', 
    '{{currentUser.name}}', 
    '{{currentUser.email}}', 
    '{{currentUser.role}}', 
    '{{currentUser.position}}', 
    '{{currentUser.team}}'
  ].includes(r.fieldId || '');

  if (selectorOptions || loading || isWorkforceVar) {
    const finalOptions = (() => {
      if (r.valueType === 'variable') {
        return [
          { id: '{{currentUser.id}}', label: 'Current User', category: 'User Information', icon: User },
          { id: '{{today}}', label: 'Today', category: 'Time Context', icon: Clock },
          { id: '{{now}}', label: 'Now', category: 'Time Context', icon: Clock }
        ];
      }
      
      if (selectorOptions && selectorOptions.length > 0) {
        return selectorOptions.map(opt => ({
          id: opt.value,
          label: opt.label,
          category: r.fieldType === 'variable' ? 'Options' : (selectedField?.label || 'Options')
        }));
      }

      // Fallbacks if no options found for workforce variables
      if (isWorkforceVar && !loading) {
        return [{ id: 'none', label: 'No options found', category: 'System' }];
      }

      return [];
    })();

    return (
      <div className="relative flex-1">
        <HierarchicalSelector
          value={String(r.value ?? '')}
          onChange={(val) => val !== 'none' && onUpdate({ value: val })}
          placeholder={loading ? "Loading..." : "Search options..."}
          options={finalOptions}
        />
        {loading && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2">
            <Loader2 size={12} className="text-indigo-500 animate-spin" />
          </div>
        )}
      </div>
    );
  }

  // 3. Date/Time Pickers
  if (selectedField?.type === 'date' || (r.fieldType === 'variable' && r.fieldId === '{{today}}')) {
    return (
      <div className="relative flex-1">
        <input
          type="date"
          value={r.value || ''}
          onChange={(e) => onUpdate({ value: e.target.value })}
          className="w-full h-10 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all [color-scheme:dark]"
        />
      </div>
    );
  }

  if (selectedField?.type === 'time' || (r.fieldType === 'variable' && r.fieldId === '{{now}}')) {
    return (
      <div className="relative flex-1">
        <input
          type={selectedField?.type === 'time' ? "time" : "datetime-local"}
          value={r.value || ''}
          onChange={(e) => onUpdate({ value: e.target.value })}
          className="w-full h-10 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all [color-scheme:dark]"
        />
      </div>
    );
  }

  return (
    <div className="relative flex-1">
      <input
        type="text"
        placeholder="Value"
        value={r.value || ''}
        onChange={(e) => onUpdate({ value: e.target.value })}
        className="w-full h-10 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
      />
    </div>
  );
};

// --- Sortable Item Wrapper ---

const SortableItem = ({ 
  id, 
  children, 
  disabled = false 
}: { 
  id: string; 
  children: (props: any) => React.ReactNode;
  disabled?: boolean;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-50")}>
      {children({ attributes, listeners, isDragging })}
    </div>
  );
};

class SmartMouseSensor extends MouseSensor {
  static activators = [
    {
      eventName: 'onMouseDown' as const,
      handler: (event: any) => {
        const nativeEvent = event.nativeEvent || event;
        const target = nativeEvent?.target as HTMLElement;
        if (!target) return true;
        if (
          ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A'].includes(target.tagName) ||
          target.closest('input') ||
          target.closest('select') ||
          target.closest('textarea') ||
          target.closest('button') ||
          target.closest('[role="button"]')
        ) {
          return false;
        }
        return true;
      },
    },
  ];
}

class SmartTouchSensor extends TouchSensor {
  static activators = [
    {
      eventName: 'onTouchStart' as const,
      handler: (event: any) => {
        const nativeEvent = event.nativeEvent || event;
        const target = nativeEvent?.target as HTMLElement;
        if (!target) return true;
        if (
          ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A'].includes(target.tagName) ||
          target.closest('input') ||
          target.closest('select') ||
          target.closest('textarea') ||
          target.closest('button') ||
          target.closest('[role="button"]')
        ) {
          return false;
        }
        return true;
      },
    },
  ];
}

const normalizeRule = (r: any): VisibilityRule | undefined => {
  if (!r) return undefined;

  const mapOperator = (op?: string): any => {
    if (!op) return 'equals';
    switch (op) {
      case 'not_null': return 'not_empty';
      case 'null': return 'is_empty';
      case 'eq': return 'equals';
      case 'neq': return 'not_equals';
      case 'gt': return 'greater_than';
      case 'lt': return 'less_than';
      default: return op;
    }
  };
  
  if (r.type === 'rule' || (!r.rules && !r.logicalOperator)) {
    return {
      id: r.id || `rule-${Math.random().toString(36).substring(2, 9)}`,
      type: 'rule',
      fieldType: r.fieldType || 'field',
      fieldId: r.fieldId || '',
      operator: mapOperator(r.operator),
      value: r.value || '',
      valueType: r.valueType || 'literal',
      isCollapsed: r.isCollapsed
    };
  }
  
  return {
    id: r.id || `group-${Math.random().toString(36).substring(2, 9)}`,
    type: 'group',
    logicalOperator: r.logicalOperator || 'AND',
    rules: Array.isArray(r.rules) 
      ? r.rules.map((sr: any) => normalizeRule(sr)).filter((sr: any): sr is VisibilityRule => !!sr)
      : [],
    name: r.name,
    isCollapsed: r.isCollapsed
  };
};

export const ConditionModal = ({
  isOpen,
  onClose,
  onSave,
  initialRule,
  availableFields,
  tabs,
  targetLabel,
  title = "Trigger Conditions",
  hideActionSelector = false
}: ConditionModalProps) => {
  const [rule, setRule] = useState<VisibilityRule | undefined>(() => normalizeRule(initialRule));
  const [showSummary, setShowSummary] = useState(false);

  const sensors = useSensors(
    useSensor(SmartMouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(SmartTouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const prevIsOpen = useRef(false);

  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      setRule(normalizeRule(initialRule));
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, initialRule]);

  const createDefaultRule = (): VisibilityRule => ({
    id: `rule-${generateId()}`,
    type: 'rule',
    fieldId: '',
    operator: 'equals',
    value: '',
    valueType: 'literal'
  });

  const createDefaultGroup = (): VisibilityRule => ({
    id: `group-${generateId()}`,
    type: 'group',
    logicalOperator: 'AND',
    rules: [createDefaultRule()]
  });

  const handleAddRootRule = () => {
    if (!rule) {
      setRule(createDefaultRule());
    } else if (rule.type === 'rule') {
      setRule({
        id: `group-${generateId()}`,
        type: 'group',
        logicalOperator: 'AND',
        rules: [rule, createDefaultRule()]
      });
    } else {
      setRule({
        ...rule,
        rules: [...(rule.rules || []), createDefaultRule()]
      });
    }
  };

  const handleAddRootGroup = () => {
    if (!rule) {
      setRule(createDefaultGroup());
    } else if (rule.type === 'rule') {
      setRule({
        id: `group-${generateId()}`,
        type: 'group',
        logicalOperator: 'AND',
        rules: [rule, createDefaultGroup()]
      });
    } else {
      setRule({
        ...rule,
        rules: [...(rule.rules || []), createDefaultGroup()]
      });
    }
  };

  const updateNestedRule = (targetId: string, updates: Partial<VisibilityRule>, currentRule: VisibilityRule): VisibilityRule => {
    if (currentRule.id === targetId) {
      return { ...currentRule, ...updates };
    }
    if (currentRule.type === 'group' && currentRule.rules) {
      return {
        ...currentRule,
        rules: currentRule.rules.map(r => updateNestedRule(targetId, updates, r))
      };
    }
    return currentRule;
  };

  const removeNestedRule = (targetId: string, currentRule: VisibilityRule): VisibilityRule | null => {
    if (currentRule.id === targetId) return null;
    if (currentRule.type === 'group' && currentRule.rules) {
      const newRules = currentRule.rules
        .map(r => removeNestedRule(targetId, r))
        .filter((r): r is VisibilityRule => r !== null);
      
      if (newRules.length === 0) return null;
      return { ...currentRule, rules: newRules };
    }
    return currentRule;
  };

  const findParent = (currentRule: VisibilityRule, targetId: string): VisibilityRule | null => {
    if (currentRule.type === 'group' && currentRule.rules) {
      if (currentRule.rules.some(r => r.id === targetId)) return currentRule;
      for (const r of currentRule.rules) {
        const p = findParent(r, targetId);
        if (p) return p;
      }
    }
    return null;
  };

  const findItem = (currentRule: VisibilityRule, targetId: string): VisibilityRule | null => {
    if (currentRule.id === targetId) return currentRule;
    if (currentRule.type === 'group' && currentRule.rules) {
      for (const r of currentRule.rules) {
        const found = findItem(r, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  const renderNaturalLanguageSummary = (r: VisibilityRule, depth: number = 0): React.ReactNode => {
    if (r.type === 'rule') {
      let field = availableFields.find(f => f.id === r.fieldId)?.label;
      if (!field && r.fieldType === 'variable') {
        const varMap: Record<string, string> = {
          '{{currentUser.id}}': 'User ID',
          '{{currentUser.name}}': 'User Name',
          '{{currentUser.email}}': 'User Email',
          '{{currentUser.role}}': 'User Platform Role',
          '{{currentUser.position}}': 'User Position',
          '{{currentUser.team}}': 'User Team',
          '{{today}}': "Today's Date",
          '{{now}}': 'Current Time'
        };
        field = varMap[r.fieldId || ''] || 'Variable';
      }
      field = field || 'Field';
      let op = r.operator || 'equals';
      let opText = '';
      switch (op) {
        case 'equals': opText = 'is'; break;
        case 'not_equals': opText = 'is not'; break;
        case 'contains': opText = 'contains'; break;
        case 'greater_than': opText = 'is greater than'; break;
        case 'less_than': opText = 'is less than'; break;
        case 'is_empty': opText = 'is empty'; break;
        case 'not_empty': opText = 'is not empty'; break;
      }

      let valText = '';
      if (!['is_empty', 'not_empty'].includes(op)) {
        if (r.valueType === 'field') {
          valText = availableFields.find(f => f.id === r.value)?.label || 'another field';
        } else {
          valText = `"${r.value || '...'}"`;
        }
      }

      return (
        <div className="flex items-center gap-2 py-1 hover:bg-indigo-500/[0.03] dark:hover:bg-indigo-500/[0.02] rounded-lg transition-colors px-2 -mx-2 group/sum">
          <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 w-5 tracking-tighter shrink-0">IF</span>
          <span className="text-sm text-zinc-900 dark:text-white font-semibold truncate max-w-[240px]" title={field}>{field}</span>
          <span className="text-[11px] text-indigo-500 font-black italic uppercase tracking-tight mx-1">{opText}</span>
          {valText && <span className="text-sm text-zinc-900 dark:text-white font-semibold truncate max-w-[240px]" title={valText}>{valText}</span>}
        </div>
      );
    }

    if (!r.rules || r.rules.length === 0) return <div className="text-zinc-400 italic py-1 px-2 text-xs">(Empty Group)</div>;

    return (
      <div className="space-y-2 py-1">
        <div className="flex items-center gap-2">
          <span className={cn(
            "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-[0.1em] shadow-sm",
            r.logicalOperator === 'AND' 
              ? "bg-indigo-600 text-white" 
              : "bg-rose-600 text-white"
          )}>
            {r.logicalOperator}
          </span>
          {r.name && (
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">
              {r.name}
            </span>
          )}
        </div>
        <div className="pl-6 border-l-2 border-indigo-500/20 dark:border-indigo-500/10 space-y-2 mt-1 ml-1.5">
          {r.rules.map((subRule) => (
            <div key={subRule.id}>
              {renderNaturalLanguageSummary(subRule, depth + 1)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handleDragStart = () => {
    // No drag overlay active state needed
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && rule) {
      const activeId = active.id as string;
      const overId = over.id as string;

      const activeParent = findParent(rule, activeId);
      const overParent = findParent(rule, overId);

      if (activeParent && overParent && activeParent.id === overParent.id) {
        // Same level move
        const oldIndex = activeParent.rules!.findIndex(r => r.id === activeId);
        const newIndex = activeParent.rules!.findIndex(r => r.id === overId);
        const newRules = arrayMove(activeParent.rules!, oldIndex, newIndex);
        setRule(updateNestedRule(activeParent.id, { rules: newRules }, rule));
      } else if (activeParent) {
        // Move to different parent or nest into group
        const overItem = findItem(rule, overId);
        if (overItem && overItem.type === 'group') {
          // Nest into group
          const itemToMove = findItem(rule, activeId);
          if (itemToMove) {
            let newTree = removeNestedRule(activeId, rule) || undefined;
            if (newTree) {
               const newRules = [...(overItem.rules || []), itemToMove];
               setRule(updateNestedRule(overId, { rules: newRules }, newTree));
            }
          }
        }
      }
    }
  };

  const renderRule = (r: VisibilityRule, depth: number = 0) => {
    return (
      <SortableItem key={r.id} id={r.id}>
        {({ attributes, listeners, isDragging }) => (
          <div className={cn(
            "transition-all",
            isDragging && "z-50"
          )}>
            {r.type === 'rule' ? (
              <div className="group/rule flex items-center gap-3 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm hover:border-indigo-500/50 transition-all">
                <div 
                  {...attributes} 
                  {...listeners}
                  className="w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-indigo-500/10 hover:text-indigo-500 transition-colors cursor-grab active:cursor-grabbing"
                >
                  <GripVertical size={14} />
                </div>
                
                 <div className="flex-1 flex flex-col md:flex-row gap-4 items-end bg-zinc-50/50 dark:bg-zinc-900/20 p-4 rounded-2xl border border-zinc-150 dark:border-zinc-800/50 relative group/rule">
                  {/* LEFT SIDE: TARGET */}
                  <div className="flex gap-3 min-w-[280px] items-end">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.15em] px-1">Source</span>
                      <div className="relative min-w-[100px]">
                        <select
                          value={r.fieldType || 'field'}
                          onChange={(e) => setRule(prev => prev ? updateNestedRule(r.id, { fieldType: e.target.value as any, fieldId: '' }, prev) : undefined)}
                          className={cn(
                            "w-full h-10 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs focus:outline-none transition-all appearance-none pr-8 font-bold tracking-tight",
                            r.fieldType === 'variable' ? "text-purple-500 border-purple-500/30" : "text-zinc-900 dark:text-white"
                          )}
                        >
                          <option value="field">Field</option>
                          <option value="variable">Variable</option>
                        </select>
                        <ChevronRight size={12} className={cn("absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none", r.fieldType === 'variable' ? "text-purple-500" : "text-zinc-400")} />
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col gap-1.5">
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.15em] px-1">
                        {r.fieldType === 'variable' ? 'System Variable' : 'Module Field'}
                      </span>
                      <HierarchicalSelector
                        value={r.fieldId || ''}
                        onChange={(val) => setRule(prev => prev ? updateNestedRule(r.id, { fieldId: val }, prev) : undefined)}
                        variableMode={r.fieldType === 'variable'}
                        placeholder={r.fieldType === 'variable' ? "Search variables..." : "Search fields..."}
                        options={(() => {
                          if (r.fieldType === 'variable') {
                            return [
                              { id: '{{currentUser.id}}', label: 'User ID', category: 'User Information', icon: User },
                              { id: '{{currentUser.name}}', label: 'User Name', category: 'User Information', icon: User },
                              { id: '{{currentUser.email}}', label: 'User Email', category: 'User Information', icon: Mail },
                              { id: '{{currentUser.role}}', label: 'User Platform Role', category: 'User Information', icon: Shield },
                              { id: '{{currentUser.position}}', label: 'User Position', category: 'User Information', icon: Users },
                              { id: '{{currentUser.team}}', label: 'User Team', category: 'User Information', icon: Users },
                              { id: '{{today}}', label: "Today's Date", category: 'Time Context', icon: Clock },
                              { id: '{{now}}', label: 'Current Time', category: 'Time Context', icon: Clock }
                            ];
                          }

                          const opts: any[] = [
                            { id: '_record_key', label: 'Record Key', category: 'System Fields', icon: Database }
                          ];

                          tabs.forEach(tab => {
                            const tabFields = availableFields
                              .filter(f => f.tabId === tab.id && !['group', 'fieldGroup', 'repeatableGroup', 'card', 'accordion', 'tabs_nested', 'stepper', 'timeline', 'divider', 'spacer', 'heading'].includes(f.type))
                              .sort((a, b) => (a.rowIndex || 0) - (b.rowIndex || 0) || (a.startCol || 0) - (b.startCol || 0));
                            
                            tabFields.forEach(f => {
                              opts.push({ id: f.id, label: f.label || f.name || f.id, category: tab.label || 'General', icon: Database });
                            });
                          });

                          // Add other fields not in tabs
                          const otherFields = availableFields
                            .filter(f => (!f.tabId || !tabs.find(t => t.id === f.tabId)) && !['group', 'fieldGroup', 'repeatableGroup', 'card', 'accordion', 'tabs_nested', 'stepper', 'timeline', 'divider', 'spacer', 'heading'].includes(f.type))
                            .sort((a, b) => (a.rowIndex || 0) - (b.rowIndex || 0) || (a.startCol || 0) - (b.startCol || 0));
                          
                          otherFields.forEach(f => {
                            opts.push({ id: f.id, label: f.label || f.name || f.id, category: 'Other Fields', icon: Database });
                          });

                          return opts;
                        })()}
                      />
                    </div>
                  </div>

                  {/* MIDDLE: OPERATOR */}
                  <div className="flex flex-col gap-1.5 min-w-[120px]">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.15em] px-1">Operator</span>
                    <div className="relative">
                      <select
                        value={r.operator}
                        onChange={(e) => setRule(prev => prev ? updateNestedRule(r.id, { operator: e.target.value as any }, prev) : undefined)}
                        className="w-full h-10 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none pr-8"
                      >
                        <option value="equals">Equals</option>
                        <option value="not_equals">Not Equals</option>
                        <option value="contains">Contains</option>
                        <option value="greater_than">Greater Than</option>
                        <option value="less_than">Less Than</option>
                        <option value="is_empty">Is Empty</option>
                        <option value="not_empty">Not Empty</option>
                      </select>
                      <ChevronRight size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 rotate-90 pointer-events-none" />
                    </div>
                  </div>

                  {/* RIGHT SIDE: VALUE */}
                  {!['is_empty', 'not_empty'].includes(r.operator || '') && (
                    <div className="flex gap-3 min-w-[280px] items-end">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.15em] px-1">Source</span>
                        <div className="relative min-w-[100px]">
                          <select
                            value={r.valueType || 'literal'}
                            onChange={(e) => setRule(prev => prev ? updateNestedRule(r.id, { valueType: e.target.value as any, value: '' }, prev) : undefined)}
                            className={cn(
                              "w-full h-10 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs focus:outline-none transition-all appearance-none pr-8 font-bold tracking-tight",
                              r.valueType === 'field' 
                                ? "text-indigo-500 border-indigo-500/30" 
                                : r.valueType === 'variable'
                                  ? "text-purple-500 border-purple-500/30"
                                  : "text-zinc-900 dark:text-white"
                            )}
                          >
                            <option value="literal">Value</option>
                            <option value="field">Field</option>
                            <option value="variable">Variable</option>
                          </select>
                          <ChevronRight size={12} className={cn(
                            "absolute right-3 top-1/2 -translate-y-1/2 rotate-90 transition-colors pointer-events-none",
                            r.valueType === 'field' ? "text-indigo-500" : r.valueType === 'variable' ? "text-purple-500" : "text-zinc-400"
                          )} />
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col gap-1.5">
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.15em] px-1">Compare Value</span>
                        <ConditionValueInput 
                          r={r} 
                          availableFields={availableFields}
                          tabs={tabs}
                          onUpdate={updates => setRule(prev => prev ? updateNestedRule(r.id, updates, prev) : undefined)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setRule(prev => prev ? removeNestedRule(r.id, prev) || undefined : undefined)}
                  className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover/rule:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ) : (
              <div className={cn(
                "relative p-6 rounded-[2rem] border-2 transition-all space-y-4",
                "bg-zinc-50/50 dark:bg-zinc-900/20 border-zinc-200/50 dark:border-zinc-800/50"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      {...attributes} 
                      {...listeners}
                      className="w-8 h-8 bg-white dark:bg-zinc-900 rounded-lg flex items-center justify-center text-zinc-400 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:text-indigo-500 transition-colors cursor-grab active:cursor-grabbing"
                    >
                      <GripVertical size={14} />
                    </div>
                    <button
                      onClick={() => setRule(prev => prev ? updateNestedRule(r.id, { isCollapsed: !r.isCollapsed }, prev) : undefined)}
                      className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-indigo-500 transition-colors"
                    >
                      <ChevronDown size={16} className={cn("transition-transform duration-200", r.isCollapsed && "-rotate-90")} />
                    </button>
                    <div className="flex bg-white dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                      <button
                        onClick={() => setRule(prev => prev ? updateNestedRule(r.id, { logicalOperator: 'AND' }, prev) : undefined)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                          r.logicalOperator === 'AND' 
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                            : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                        )}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setRule(prev => prev ? updateNestedRule(r.id, { logicalOperator: 'OR' }, prev) : undefined)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                          r.logicalOperator === 'OR' 
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                            : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                        )}
                      >
                        Any
                      </button>
                    </div>
                    <input
                      type="text"
                      value={r.name || ''}
                      placeholder="Condition Group"
                      onChange={(e) => setRule(prev => prev ? updateNestedRule(r.id, { name: e.target.value }, prev) : undefined)}
                      className="bg-transparent border-none text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-[0.2em] ml-2 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 rounded px-1 min-w-[300px]"
                    />
                    {r.isCollapsed && r.rules && (
                      <span className="text-[10px] font-medium text-zinc-500 ml-4 italic">
                        ({r.rules.length} {r.rules.length === 1 ? 'rule' : 'rules'} hidden)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const newRules = [...(r.rules || []), createDefaultRule()];
                        setRule(prev => prev ? updateNestedRule(r.id, { rules: newRules }, prev) : undefined);
                      }}
                      className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-indigo-500 rounded-xl transition-all shadow-sm"
                      title="Add Rule"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      onClick={() => {
                        const newRules = [...(r.rules || []), createDefaultGroup()];
                        setRule(prev => prev ? updateNestedRule(r.id, { rules: newRules }, prev) : undefined);
                      }}
                      className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-indigo-500 rounded-xl transition-all shadow-sm"
                      title="Add Sub-group"
                    >
                      <Layers size={14} />
                    </button>
                    <button
                      onClick={() => setRule(prev => prev ? removeNestedRule(r.id, prev) || undefined : undefined)}
                      className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {!r.isCollapsed && (
                  <div className="space-y-4 pl-4 border-l-2 border-dashed border-zinc-200 dark:border-zinc-800/50 ml-4">
                    <SortableContext 
                      items={r.rules?.map(sr => sr.id) || []} 
                      strategy={verticalListSortingStrategy}
                    >
                      {r.rules?.map(subRule => renderRule(subRule, depth + 1))}
                    </SortableContext>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </SortableItem>
    );
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div 
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
          }}
          className="fixed inset-0 z-[1001] flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-white/60 dark:bg-black/80 backdrop-blur-xl"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 40 }}
            className="relative z-50 w-full max-w-5xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col max-h-[90vh] font-sans"
          >
            {/* Modal Header */}
            <div className="px-8 py-5 border-b border-zinc-100 dark:border-zinc-900/50 flex items-center justify-between bg-zinc-50/30 dark:bg-zinc-900/20">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center shadow-2xl shadow-indigo-500/30">
                  <BrainCircuit size={24} className="text-white" />
                </div>
                <div className="space-y-0.5">
                  <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">{title}</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Editing Logic for:</span>
                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-500 rounded-md text-[10px] font-bold uppercase tracking-tight">{targetLabel}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-12 h-12 flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-2xl transition-all"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="max-w-4xl mx-auto">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                {!rule ? (
                  <div className="h-56 flex flex-col items-center justify-center gap-5 p-12 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] bg-zinc-50/50 dark:bg-zinc-900/30">
                    <div className="w-16 h-16 bg-white dark:bg-zinc-950 rounded-3xl flex items-center justify-center shadow-xl border border-zinc-100 dark:border-zinc-800">
                      <Split size={24} className="text-zinc-300 dark:text-zinc-700" />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="font-bold text-zinc-900 dark:text-white">No conditions defined yet</p>
                      <p className="text-sm text-zinc-500 max-w-[280px]">Add your first rule or group to control when this element should be visible.</p>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={handleAddRootRule}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-2"
                      >
                        <Plus size={16} />
                        Add First Rule
                      </button>
                      <button 
                        onClick={handleAddRootGroup}
                        className="px-6 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all flex items-center gap-2"
                      >
                        <Layers size={16} />
                        Add Group
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between px-4">
                      <div className="flex items-center gap-2">
                        <CircleDot size={12} className="text-indigo-500 animate-pulse" />
                        <h3 className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.25em]">Logic Configuration Tree</h3>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setShowSummary(!showSummary)}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 border rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                            showSummary 
                              ? "bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20" 
                              : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50"
                          )}
                        >
                          <MessageSquareQuote size={14} />
                          {showSummary ? 'Hide Summary' : 'View Summary'}
                        </button>
                        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1" />
                        <button 
                          onClick={handleAddRootRule}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all"
                        >
                          <Plus size={14} />
                          Add Rule
                        </button>
                        <button 
                          onClick={handleAddRootGroup}
                          className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all"
                        >
                          <Layers size={14} />
                          Add Group
                        </button>
                      </div>
                    </div>

                    {/* Action Selector */}
                    {!hideActionSelector && (
                      <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500">
                            <Settings2 size={18} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Logic Action</p>
                            <p className="text-xs font-bold text-zinc-900 dark:text-white">Determine the outcome when conditions are met</p>
                          </div>
                        </div>
                        <div className="flex bg-white dark:bg-zinc-950 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                          <button
                            onClick={() => setRule(prev => prev ? ({ ...prev, action: 'show' }) : undefined)}
                            className={cn(
                              "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                              (!rule?.action || rule?.action === 'show')
                                ? "bg-indigo-600 text-white shadow-xl shadow-indigo-500/20"
                                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                            )}
                          >
                            Show
                          </button>
                          <button
                            onClick={() => setRule(prev => prev ? ({ ...prev, action: 'hide' }) : undefined)}
                            className={cn(
                              "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                              rule?.action === 'hide'
                                ? "bg-rose-600 text-white shadow-xl shadow-rose-500/20"
                                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                            )}
                          >
                            Hide
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-6">
                      <AnimatePresence>
                        {showSummary && rule && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-8 bg-indigo-500/[0.03] dark:bg-indigo-500/[0.02] border border-indigo-500/10 rounded-[2.5rem] space-y-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500">
                                  <MessageSquareQuote size={16} />
                                </div>
                                <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Logic Summary</h4>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">
                                  {hideActionSelector ? (
                                    "This integration will execute if:"
                                  ) : (
                                    <>
                                      This element will be <span className={cn("font-black", rule.action === 'hide' ? "text-rose-500" : "text-indigo-500")}>{rule.action === 'hide' ? 'HIDDEN' : 'VISIBLE'}</span> if:
                                    </>
                                  )}
                                </p>
                                {renderNaturalLanguageSummary(rule)}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <SortableContext 
                        items={rule.type === 'group' ? (rule.rules?.map(r => r.id) || []) : [rule.id]} 
                        strategy={verticalListSortingStrategy}
                      >
                        {renderRule(rule)}
                      </SortableContext>
                    </div>
                  </div>
                )}
                </DndContext>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-5 border-t border-zinc-100 dark:border-zinc-900/50 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
              <div className="flex items-center gap-4 text-zinc-500">
                <Settings2 size={14} />
                <span className="text-[10px] font-medium uppercase tracking-[0.1em]">All changes are staged until saved</span>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setRule(undefined)}
                  className="px-6 py-3 text-zinc-500 hover:text-rose-500 text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Clear All
                </button>
                <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-2" />
                <button 
                  onClick={onClose}
                  className="px-6 py-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => onSave(rule)}
                  className="px-8 py-3.5 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-500/20"
                >
                  Apply Logic
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
