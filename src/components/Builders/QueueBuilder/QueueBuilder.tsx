import React, { useState, useMemo } from 'react';
import { 
  Layers, Settings, Filter, Table, Play, Save, X, Plus, Trash2,
  Sparkles, Check, ChevronRight
} from 'lucide-react';
import { usePlatform } from '../../../hooks/usePlatform';
import { QueueEntity } from '../../../types/platform';
import { Button } from '../../UI/Primitives';
import { DynamicIcon } from '../../UI/DynamicIcon';
import { QueueRenderer } from './QueueRenderer';
import { flattenFields, slugify, cn } from '../../../lib/utils';
import { PLATFORM_MODULES } from '../../../config/platformModules';
import { toast } from 'sonner';

export interface QueueBuilderProps {
  initialQueue?: QueueEntity | null;
  onSave: (queue: QueueEntity) => void;
  onCancel?: () => void;
  isSaving?: boolean;
}

const POPULAR_ICONS = [
  'ListOrdered', 'Inbox', 'ClipboardList', 'Layers', 'CheckSquare',
  'AlertCircle', 'Clock', 'Flame', 'Zap', 'ShieldAlert', 'Filter'
];

export const QueueBuilder: React.FC<QueueBuilderProps> = ({
  initialQueue,
  onSave,
  onCancel,
  isSaving = false
}) => {
  const { tenant, modules } = usePlatform();

  // Active custom business data modules only
  const activeCustomModules = useMemo(() => {
    return (modules || []).filter((m: any) => {
      if (m.type === 'PAGE' || m.type === 'REPORT') return false;
      if (m.enabled === false || m.status === 'INACTIVE') return false;
      if (m.type === 'PLATFORM' || m.type === 'SYSTEM') return false;
      if (m.isGlobal || m.isIntakeTriage || m.config?.isIntakeTriage) return false;
      if (m.config?.isPlatform || m.config?.isSystem) return false;
      const isPlatform = PLATFORM_MODULES.some(pm =>
        pm.id === m.id || pm.id === m.templateId || pm.name.toLowerCase() === m.name?.toLowerCase() || pm.slug === m.templateId
      );
      if (isPlatform) return false;
      const lower = (m.name || '').toLowerCase();
      if (lower === 'my work' || lower === 'dashboard' || lower === 'my reports') return false;
      return true;
    });
  }, [modules]);

  // Form state
  const [activeTab, setActiveTab] = useState<'general' | 'filters' | 'columns' | 'preview'>('general');
  const [name, setName] = useState(initialQueue?.name || 'New Work Queue');
  const [description, setDescription] = useState(initialQueue?.description || '');
  const [iconName, setIconName] = useState(initialQueue?.iconName || 'ListOrdered');
  const [isUnifiedQueue, setIsUnifiedQueue] = useState(
    initialQueue?.isUnifiedQueue ?? (initialQueue?.moduleIds && initialQueue.moduleIds.length > 1) ?? false
  );
  const [moduleId, setModuleId] = useState<string>(
    initialQueue?.moduleId || (activeCustomModules[0]?.id || '')
  );
  const [moduleIds, setModuleIds] = useState<string[]>(
    initialQueue?.moduleIds || (initialQueue?.moduleId ? [initialQueue.moduleId] : (activeCustomModules[0]?.id ? [activeCustomModules[0].id] : []))
  );

  // Auto-sync initial moduleId when custom modules finish loading
  React.useEffect(() => {
    if (!moduleId && activeCustomModules.length > 0) {
      setModuleId(activeCustomModules[0].id);
    }
    if ((!moduleIds || moduleIds.length === 0 || (moduleIds.length === 1 && !moduleIds[0])) && activeCustomModules.length > 0) {
      setModuleIds([activeCustomModules[0].id]);
    }
  }, [activeCustomModules, moduleId, moduleIds]);

  // Condition Rules
  const [rules, setRules] = useState<any[]>(() => {
    return initialQueue?.queueConfig?.conditions?.rules || [];
  });

  // Display Columns
  const [selectedColumns, setSelectedColumns] = useState<string[]>(() => {
    return initialQueue?.queueConfig?.columns || ['id', 'moduleId', 'title', 'status', 'priority', 'assigneeId', 'createdAt'];
  });

  // Default Sort
  const [defaultSortKey, setDefaultSortKey] = useState(
    initialQueue?.queueConfig?.defaultSort?.key || 'createdAt'
  );
  const [defaultSortDir, setDefaultSortDir] = useState<'asc' | 'desc'>(
    initialQueue?.queueConfig?.defaultSort?.direction || 'desc'
  );

  // Target Module IDs
  const currentTargetModuleIds = useMemo(() => {
    if (isUnifiedQueue) {
      const filtered = moduleIds.filter(Boolean);
      return filtered.length > 0 ? filtered : (activeCustomModules[0]?.id ? [activeCustomModules[0].id] : []);
    }
    const single = moduleId || activeCustomModules[0]?.id;
    return single ? [single] : [];
  }, [isUnifiedQueue, moduleIds, moduleId, activeCustomModules]);

  // Available Fields across target modules
  const availableFields = useMemo(() => {
    const list: { id: string; label: string; group: string; type?: string }[] = [
      { id: 'currentUser.memberId', label: 'Current User (Assignee Token)', group: 'Session Variables' },
      { id: 'currentUser.id', label: 'Current User ID', group: 'Session Variables' },
      { id: 'id', label: 'Record ID', group: 'System Fields' },
      { id: 'title', label: 'Title / Subject', group: 'System Fields' },
      { id: 'status', label: 'Status', group: 'System Fields' },
      { id: 'priority', label: 'Priority', group: 'System Fields' },
      { id: 'assigneeId', label: 'Assignee', group: 'System Fields' },
      { id: 'createdAt', label: 'Created At', group: 'System Fields' },
      { id: 'updatedAt', label: 'Last Modified', group: 'System Fields' },
    ];

    currentTargetModuleIds.forEach((mId) => {
      const mod = modules.find((m: any) => m.id === mId);
      if (mod && mod.layout) {
        const flat = flattenFields(mod.layout);
        flat.forEach((f: any) => {
          if (!list.some(item => item.id === f.id)) {
            list.push({
              id: f.id,
              label: `${f.label || f.name} (${mod.name})`,
              group: `${mod.name} Fields`,
              type: f.type
            });
          }
        });
      }
    });

    return list;
  }, [currentTargetModuleIds, modules]);

  // Available Columns Options
  const availableColumnOptions = useMemo(() => {
    const standardCols = [
      { id: 'id', label: 'Record ID', group: 'Standard' },
      { id: 'moduleId', label: 'Source Module', group: 'Standard' },
      { id: 'title', label: 'Title / Key', group: 'Standard' },
      { id: 'status', label: 'Status', group: 'Standard' },
      { id: 'priority', label: 'Priority', group: 'Standard' },
      { id: 'assigneeId', label: 'Assignee Avatar/Name', group: 'Standard' },
      { id: 'createdAt', label: 'Creation Date', group: 'Standard' },
      { id: 'updatedAt', label: 'Last Modified', group: 'Standard' },
    ];

    const customCols: { id: string; label: string; group: string }[] = [];
    currentTargetModuleIds.forEach((mId) => {
      const mod = modules.find((m: any) => m.id === mId);
      if (mod && mod.layout) {
        const flat = flattenFields(mod.layout);
        flat.forEach((f: any) => {
          if (!standardCols.some(c => c.id === f.id) && !customCols.some(c => c.id === f.id)) {
            customCols.push({
              id: f.id,
              label: `${f.label || f.name}`,
              group: mod.name
            });
          }
        });
      }
    });

    return [...standardCols, ...customCols];
  }, [currentTargetModuleIds, modules]);

  // Handle Save
  const handleSaveClick = () => {
    if (!name.trim()) {
      toast.error('Please enter a queue title');
      return;
    }

    const effectiveModuleIds = currentTargetModuleIds;
    if (effectiveModuleIds.length === 0) {
      toast.error('Please select at least one target module');
      return;
    }

    const effectiveModuleId = isUnifiedQueue ? undefined : (moduleId || effectiveModuleIds[0]);

    const payload: QueueEntity = {
      id: initialQueue?.id || `queue_${Date.now()}`,
      tenantId: tenant?.id || 't1',
      name: name.trim(),
      slug: slugify(name.trim()),
      description: description.trim(),
      iconName,
      isGlobal: true,
      isUnifiedQueue,
      moduleId: effectiveModuleId,
      moduleName: effectiveModuleId ? modules.find((m: any) => m.id === effectiveModuleId)?.name : undefined,
      moduleIds: effectiveModuleIds,
      queueConfig: {
        conditions: {
          type: 'group',
          logicalOperator: 'AND',
          rules: rules.filter(r => r.fieldId)
        },
        columns: selectedColumns.length > 0 ? selectedColumns : ['id', 'moduleId', 'title', 'status', 'priority', 'assigneeId', 'createdAt'],
        defaultSort: { key: defaultSortKey, direction: defaultSortDir }
      },
      version: (initialQueue?.version || 0) + 1,
      status: 'PUBLISHED',
      updatedAt: new Date().toISOString()
    };

    onSave(payload);
  };

  // Preview Queue Draft Entity
  const previewDraftQueue = useMemo<QueueEntity>(() => ({
    id: initialQueue?.id || 'temp-preview-queue',
    tenantId: tenant?.id || 't1',
    name: name || 'Queue Preview',
    description,
    iconName,
    isGlobal: true,
    isUnifiedQueue,
    moduleId: isUnifiedQueue ? undefined : moduleId,
    moduleIds: currentTargetModuleIds,
    queueConfig: {
      conditions: {
        type: 'group',
        logicalOperator: 'AND',
        rules: rules.filter(r => r.fieldId)
      },
      columns: selectedColumns,
      defaultSort: { key: defaultSortKey, direction: defaultSortDir }
    },
    status: 'PUBLISHED'
  }), [initialQueue, tenant?.id, name, description, iconName, isUnifiedQueue, moduleId, currentTargetModuleIds, rules, selectedColumns, defaultSortKey, defaultSortDir]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white select-none">
      {/* Studio Header */}
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/40 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <DynamicIcon name={iconName} size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2">
              {name || 'Untitled Queue'}
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                {isUnifiedQueue ? `Unified (${currentTargetModuleIds.length} modules)` : 'Single Module'}
              </span>
            </h2>
            <p className="text-[11px] text-zinc-400">Configure query rules, target schemas, and display columns.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs">
              <X size={14} className="mr-1" /> Cancel
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveClick}
            disabled={isSaving}
            className="text-xs font-bold gap-1.5 shadow-md shadow-indigo-500/20"
          >
            <Save size={14} /> {isSaving ? 'Saving...' : 'Save Queue'}
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0 text-xs font-bold">
        {[
          { id: 'general', label: '1. General & Scope', icon: Settings },
          { id: 'filters', label: '2. Filter Rules & Sort', icon: Filter, count: rules.length },
          { id: 'columns', label: '3. Display Columns', icon: Table, count: selectedColumns.length },
          { id: 'preview', label: '4. Live Preview', icon: Play }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 py-3 px-3 border-b-2 transition-all cursor-pointer",
              activeTab === tab.id
                ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            )}
          >
            <tab.icon size={14} />
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Canvas Body */}
      <div className="flex-1 overflow-y-auto p-6 bg-zinc-50/40 dark:bg-zinc-900/10 custom-scrollbar">
        
        {/* TAB 1: General & Scope */}
        {activeTab === 'general' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Settings size={14} /> Queue Information
              </h3>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Queue Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priority Support Cases"
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Describe what items appear in this queue..."
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Icon Picker */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Queue Icon</label>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_ICONS.map((ico) => {
                    const isSel = iconName === ico;
                    return (
                      <button
                        key={ico}
                        type="button"
                        onClick={() => setIconName(ico)}
                        className={cn(
                          "p-2.5 rounded-xl border transition-all flex items-center justify-center cursor-pointer",
                          isSel 
                            ? "bg-indigo-500 text-white border-indigo-400 shadow-sm" 
                            : "bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                        )}
                      >
                        <DynamicIcon name={ico} size={16} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Scope / Module Selection */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  <Layers size={14} /> Module Scope
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setIsUnifiedQueue(false)}
                  className={cn(
                    "p-4 rounded-xl border transition-all cursor-pointer space-y-1.5",
                    !isUnifiedQueue
                      ? "bg-indigo-500/10 border-indigo-500 ring-2 ring-indigo-500/20"
                      : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">Single Module</span>
                    {!isUnifiedQueue && <Check size={14} className="text-indigo-500" />}
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Filter and display records exclusively from one specific custom module.
                  </p>
                </div>

                <div
                  onClick={() => setIsUnifiedQueue(true)}
                  className={cn(
                    "p-4 rounded-xl border transition-all cursor-pointer space-y-1.5",
                    isUnifiedQueue
                      ? "bg-indigo-500/10 border-indigo-500 ring-2 ring-indigo-500/20"
                      : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">Unified Multi-Module</span>
                    {isUnifiedQueue && <Check size={14} className="text-indigo-500" />}
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Aggregate records across multiple modules into a centralized triage queue.
                  </p>
                </div>
              </div>

              {/* Module selection dropdown / checklist */}
              {!isUnifiedQueue ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Target Module *</label>
                  <select
                    value={moduleId}
                    onChange={(e) => setModuleId(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500"
                  >
                    <option value="">Select a module...</option>
                    {activeCustomModules.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Target Modules Checklist *</label>
                  <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
                    {activeCustomModules.map((m) => {
                      const isChecked = moduleIds.includes(m.id);
                      return (
                        <label key={m.id} className="flex items-center gap-2.5 text-xs cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setModuleIds([...moduleIds, m.id]);
                              } else {
                                setModuleIds(moduleIds.filter(id => id !== m.id));
                              }
                            }}
                            className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">{m.name}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">({m.id})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setActiveTab('filters')} variant="secondary" size="sm" className="gap-1.5 text-xs font-bold">
                Next: Filter Rules <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}

        {/* TAB 2: Filters & Sort */}
        {activeTab === 'filters' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                    <Filter size={14} /> Queue Filter Rules (AND)
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Define conditions that records must satisfy to appear in this queue.</p>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setRules([
                      ...rules,
                      { fieldId: '', fieldType: 'field', operator: 'equals', value: '', valueType: 'literal' }
                    ]);
                  }}
                  className="gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400"
                >
                  <Plus size={13} /> Add Condition
                </Button>
              </div>

              {rules.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/40">
                  <p className="text-xs text-zinc-400">No filter conditions defined.</p>
                  <p className="text-[11px] text-zinc-500 mt-1">This queue will display all records from the selected module(s).</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rules.map((rule, idx) => (
                    <div key={idx} className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">Rule #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => setRules(rules.filter((_, i) => i !== idx))}
                          className="text-zinc-400 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {/* Field Picker */}
                        <select
                          value={rule.fieldId || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const isVar = val.startsWith('currentUser.');
                            const updated = [...rules];
                            updated[idx] = { ...updated[idx], fieldId: val, fieldType: isVar ? 'variable' : 'field' };
                            setRules(updated);
                          }}
                          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500"
                        >
                          <option value="">Select Field / Variable...</option>
                          {availableFields.map(f => (
                            <option key={f.id} value={f.id}>{f.label}</option>
                          ))}
                        </select>

                        {/* Operator */}
                        <select
                          value={rule.operator || 'equals'}
                          onChange={(e) => {
                            const updated = [...rules];
                            updated[idx] = { ...updated[idx], operator: e.target.value };
                            setRules(updated);
                          }}
                          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500"
                        >
                          <option value="equals">equals (=)</option>
                          <option value="not_equals">not equals (!=)</option>
                          <option value="contains">contains</option>
                          <option value="is_empty">is empty</option>
                          <option value="not_empty">not empty</option>
                        </select>

                        {/* Value Input */}
                        {rule.operator !== 'is_empty' && rule.operator !== 'not_empty' && (
                          <input
                            type="text"
                            placeholder="Target Value..."
                            value={rule.value || ''}
                            onChange={(e) => {
                              const updated = [...rules];
                              updated[idx] = { ...updated[idx], value: e.target.value };
                              setRules(updated);
                            }}
                            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Default Sorting */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Default Sorting Order</h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Sort Column</label>
                  <select
                    value={defaultSortKey}
                    onChange={(e) => setDefaultSortKey(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500"
                  >
                    <option value="createdAt">Created Date</option>
                    <option value="updatedAt">Updated Date</option>
                    <option value="priority">Priority</option>
                    <option value="status">Status</option>
                    <option value="title">Title</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Direction</label>
                  <select
                    value={defaultSortDir}
                    onChange={(e) => setDefaultSortDir(e.target.value as any)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500"
                  >
                    <option value="desc">Descending (Newest / High First)</option>
                    <option value="asc">Ascending (Oldest / Low First)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button onClick={() => setActiveTab('general')} variant="ghost" size="sm" className="text-xs">
                Back
              </Button>
              <Button onClick={() => setActiveTab('columns')} variant="secondary" size="sm" className="gap-1.5 text-xs font-bold">
                Next: Display Columns <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}

        {/* TAB 3: Display Columns */}
        {activeTab === 'columns' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  <Table size={14} /> Visible Table Columns
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">Select which columns appear in the work queue table view.</p>
              </div>

              <div className="space-y-4">
                {Array.from(new Set(availableColumnOptions.map(c => c.group))).map((groupName) => (
                  <div key={groupName} className="space-y-2 bg-zinc-50/60 dark:bg-zinc-950/40 p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
                      {groupName} Columns
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availableColumnOptions.filter(c => c.group === groupName).map((col) => {
                        const isChecked = selectedColumns.includes(col.id);
                        return (
                          <label key={col.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedColumns([...selectedColumns, col.id]);
                                } else {
                                  setSelectedColumns(selectedColumns.filter(id => id !== col.id));
                                }
                              }}
                              className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className={isChecked ? "text-zinc-900 dark:text-white font-bold" : "text-zinc-500"}>
                              {col.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <Button onClick={() => setActiveTab('filters')} variant="ghost" size="sm" className="text-xs">
                Back
              </Button>
              <Button onClick={() => setActiveTab('preview')} variant="primary" size="sm" className="gap-1.5 text-xs font-bold">
                Test Live Preview <Play size={14} />
              </Button>
            </div>
          </div>
        )}

        {/* TAB 4: Live Preview */}
        {activeTab === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 text-xs">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Sparkles size={16} />
                <span className="font-bold">Live Simulation Mode:</span>
                <span className="text-zinc-600 dark:text-zinc-300">
                  Showing live data matching {rules.length} condition rules across {currentTargetModuleIds.length} modules.
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
              <QueueRenderer
                queue={previewDraftQueue}
                showHeader={true}
                readOnly={false}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
