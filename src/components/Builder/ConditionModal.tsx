import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Plus, 
  Trash2, 
  Settings2, 
  BrainCircuit, 
  Layers, 
  Filter, 
  ChevronRight,
  Split,
  CircleDot,
  Database,
  Type,
  ChevronDown,
  GripVertical,
  MessageSquareQuote
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { VisibilityRule, Field, Tab } from '../ModuleEditor';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent
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
}

const generateId = () => Math.random().toString(36).substring(2, 11);

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

export const ConditionModal = ({
  isOpen,
  onClose,
  onSave,
  initialRule,
  availableFields,
  tabs,
  targetLabel
}: ConditionModalProps) => {
  const [rule, setRule] = useState<VisibilityRule | undefined>(initialRule);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (isOpen) {
      setRule(initialRule);
    }
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
      const field = availableFields.find(f => f.id === r.fieldId)?.label || 'Field';
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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

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
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="relative">
                    <select
                      value={r.fieldId}
                      onChange={(e) => setRule(prev => prev ? updateNestedRule(r.id, { fieldId: e.target.value }, prev) : undefined)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none pr-8"
                    >
                      <option value="">Select Field...</option>
                      <optgroup label="System Fields">
                        <option value="_record_key">Record Key</option>
                      </optgroup>
                      {tabs.map(tab => {
                        const tabFields = availableFields
                          .filter(f => f.tabId === tab.id)
                          .sort((a, b) => (a.rowIndex || 0) - (b.rowIndex || 0) || (a.startCol || 0) - (b.startCol || 0));
                        
                        if (tabFields.length === 0) return null;
                        
                        return (
                          <optgroup key={tab.id} label={tab.label}>
                            {tabFields.map(f => (
                              <option key={f.id} value={f.id}>{f.label}</option>
                            ))}
                          </optgroup>
                        );
                      })}
                      {availableFields.some(f => !f.tabId || !tabs.find(t => t.id === f.tabId)) && (
                        <optgroup label="Other Fields">
                          {availableFields
                            .filter(f => !f.tabId || !tabs.find(t => t.id === f.tabId))
                            .sort((a, b) => (a.rowIndex || 0) - (b.rowIndex || 0) || (a.startCol || 0) - (b.startCol || 0))
                            .map(f => (
                              <option key={f.id} value={f.id}>{f.label}</option>
                            ))}
                        </optgroup>
                      )}
                    </select>
                    <ChevronRight size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 rotate-90" />
                  </div>

                  <div className="relative">
                    <select
                      value={r.operator}
                      onChange={(e) => setRule(prev => prev ? updateNestedRule(r.id, { operator: e.target.value as any }, prev) : undefined)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none pr-8"
                    >
                      <option value="equals">Equals</option>
                      <option value="not_equals">Not Equals</option>
                      <option value="contains">Contains</option>
                      <option value="greater_than">Greater Than</option>
                      <option value="less_than">Less Than</option>
                      <option value="is_empty">Is Empty</option>
                      <option value="not_empty">Not Empty</option>
                    </select>
                    <ChevronRight size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 rotate-90" />
                  </div>

                  {!['is_empty', 'not_empty'].includes(r.operator || '') && (
                    <div className="flex gap-2 min-w-[200px]">
                      <button
                        onClick={() => setRule(prev => prev ? updateNestedRule(r.id, { valueType: r.valueType === 'field' ? 'literal' : 'field', value: '' }, prev) : undefined)}
                        className={cn(
                          "px-3 rounded-xl border transition-all flex items-center justify-center gap-2",
                          r.valueType === 'field' 
                            ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-500" 
                            : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-400"
                        )}
                        title={r.valueType === 'field' ? "Comparing to Field" : "Comparing to Value"}
                      >
                        {r.valueType === 'field' ? <Database size={12} /> : <Type size={12} />}
                      </button>

                      {r.valueType === 'field' ? (
                        <div className="relative flex-1">
                          <select
                            value={r.value || ''}
                            onChange={(e) => setRule(prev => prev ? updateNestedRule(r.id, { value: e.target.value }, prev) : undefined)}
                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none pr-8"
                          >
                            <option value="">Select Field...</option>
                            <optgroup label="System Fields">
                              <option value="_record_key">Record Key</option>
                            </optgroup>
                            {tabs.map(tab => {
                              const tabFields = availableFields
                                .filter(f => f.id !== r.fieldId && f.tabId === tab.id)
                                .sort((a, b) => (a.rowIndex || 0) - (b.rowIndex || 0) || (a.startCol || 0) - (b.startCol || 0));
                              
                              if (tabFields.length === 0) return null;

                              return (
                                <optgroup key={tab.id} label={tab.label}>
                                  {tabFields.map(f => (
                                    <option key={f.id} value={f.id}>{f.label}</option>
                                  ))}
                                </optgroup>
                              );
                            })}
                            {availableFields.some(f => f.id !== r.fieldId && (!f.tabId || !tabs.find(t => t.id === f.tabId))) && (
                              <optgroup label="Other Fields">
                                {availableFields
                                  .filter(f => f.id !== r.fieldId && (!f.tabId || !tabs.find(t => t.id === f.tabId)))
                                  .sort((a, b) => (a.rowIndex || 0) - (b.rowIndex || 0) || (a.startCol || 0) - (b.startCol || 0))
                                  .map(f => (
                                    <option key={f.id} value={f.id}>{f.label}</option>
                                  ))}
                              </optgroup>
                            )}
                          </select>
                          <ChevronRight size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 rotate-90" />
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Value"
                          value={r.value || ''}
                          onChange={(e) => setRule(prev => prev ? updateNestedRule(r.id, { value: e.target.value }, prev) : undefined)}
                          className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                        />
                      )}
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
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
            className="relative w-full max-w-5xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="px-8 py-5 border-b border-zinc-100 dark:border-zinc-900/50 flex items-center justify-between bg-zinc-50/30 dark:bg-zinc-900/20">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center shadow-2xl shadow-indigo-500/30">
                  <BrainCircuit size={24} className="text-white" />
                </div>
                <div className="space-y-0.5">
                  <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">Conditional Visibility</h2>
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
                                  This element will be <span className={cn("font-black", rule.action === 'hide' ? "text-rose-500" : "text-indigo-500")}>{rule.action === 'hide' ? 'HIDDEN' : 'VISIBLE'}</span> if:
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
    </AnimatePresence>
  );
};
