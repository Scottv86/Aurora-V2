import React, { useState, useMemo, useEffect } from 'react';
import { 
  Layers, Sliders, Layout, Save, ArrowLeft, 
  Plus, Trash2, Check, Code, Eye, Columns,
  ArrowUp, ArrowDown, EyeOff, RotateCcw, GripVertical, Search,
  Shield, Lock, Unlock, Globe
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../UI/Primitives';
import { usePlatform } from '../../../hooks/usePlatform';
import { useAuth } from '../../../hooks/useAuth';
import { QueryColumnConfig, ColumnDisplayType } from '../../../types/queryBuilder';
import { 
  SavedSearchEntity, 
  SearchParameterExposed, 
  SearchFieldAlias, 
  SearchScopeType,
  SearchUXConfig 
} from '../../../types/searchBuilder';
import { saveSavedSearch, compileSearchSql } from '../../../services/searchService';
import { flattenFields } from '../../../lib/utils';
import { extractWorkflowStatusesFromModules } from '../../../utils/workflowStatusExtractor';
import { SearchRenderer } from '../../Search/SearchRenderer';
import { cn } from '../../../lib/utils';

const DEFAULT_SYSTEM_COLUMNS: QueryColumnConfig[] = [
  { name: 'title', label: 'Record / Title', type: 'link', visible: true, isCustom: false },
  { name: 'module_name', label: 'Source Module', type: 'badge', visible: true, isCustom: false },
  { name: 'status', label: 'Status', type: 'badge', visible: true, isCustom: false },
  { name: 'assignee_name', label: 'Allocated To', type: 'avatar', visible: true, isCustom: false },
  { name: 'files', label: 'Files', type: 'number', visible: true, isCustom: false },
  { name: 'created_at', label: 'Created Date', type: 'date', visible: true, isCustom: false }
];

const AVAILABLE_SYSTEM_COLUMNS: QueryColumnConfig[] = [
  { name: 'title', label: 'Record / Title', type: 'link', visible: true, isCustom: false },
  { name: 'module_name', label: 'Source Module', type: 'badge', visible: true, isCustom: false },
  { name: 'status', label: 'Status', type: 'badge', visible: true, isCustom: false },
  { name: 'assignee_name', label: 'Allocated To', type: 'avatar', visible: true, isCustom: false },
  { name: 'files', label: 'Files', type: 'number', visible: true, isCustom: false },
  { name: 'created_at', label: 'Created Date', type: 'date', visible: true, isCustom: false },
  { name: 'updated_at', label: 'Updated Date', type: 'date', visible: true, isCustom: false },
  { name: 'id', label: 'Record ID', type: 'text', visible: true, isCustom: false }
];

export interface SearchBuilderProps {
  initialSearch?: SavedSearchEntity | null;
  onClose: () => void;
  onSaveSuccess?: (saved: SavedSearchEntity) => void;
  onOpenInQueryBuilder?: (sql: string, search: SavedSearchEntity) => void;
}

export const SearchBuilder: React.FC<SearchBuilderProps> = ({
  initialSearch,
  onClose,
  onSaveSuccess,
  onOpenInQueryBuilder
}) => {
  const { tenant, modules } = usePlatform();
  const { session } = useAuth();
  const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token || localStorage.getItem('aurora_token') || 'dev-token';
  const tenantId = tenant?.id || 't1';

  // Active custom data modules
  const customModules = useMemo(() => {
    return (modules || []).filter((m: any) => {
      if (m.type === 'PAGE' || m.type === 'REPORT' || m.type === 'PLATFORM' || m.type === 'SYSTEM') return false;
      if (m.enabled === false || m.status === 'INACTIVE') return false;
      return true;
    });
  }, [modules]);

  // Tab State
  const [activeTab, setActiveTab] = useState<'general' | 'scope' | 'controls' | 'columns' | 'layout' | 'preview'>('scope');

  // Metadata State
  const [searchId, setSearchId] = useState(initialSearch?.id || '');
  const [name, setName] = useState(initialSearch?.name || 'New Advanced Search');
  const [description, setDescription] = useState(initialSearch?.description || '');
  const [category, setCategory] = useState(initialSearch?.category || 'Operations');
  const [entityTarget, setEntityTarget] = useState<'records' | 'files'>(
    initialSearch?.searchConfig?.entityTarget || 'records'
  );

  // Columns Configuration State
  const [columnsConfig, setColumnsConfig] = useState<QueryColumnConfig[]>(() => {
    if (initialSearch?.columnsConfig && Array.isArray(initialSearch.columnsConfig) && initialSearch.columnsConfig.length > 0) {
      return initialSearch.columnsConfig;
    }
    return DEFAULT_SYSTEM_COLUMNS;
  });
  const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null);
  const [dragOverColumnIndex, setDragOverColumnIndex] = useState<number | null>(null);

  // Scope State: start unselected for clean new searches
  const [scopeType, setScopeType] = useState<SearchScopeType>(
    initialSearch?.scopeType || 'MULTI_MODULE'
  );
  const [targetModuleIds, setTargetModuleIds] = useState<string[]>(() => {
    if (initialSearch?.targetModuleIds?.length) return initialSearch.targetModuleIds;
    return [];
  });

  // Governance & RBAC State: empty array means public to all roles
  const [allowedRoleIds, setAllowedRoleIds] = useState<string[]>(() => {
    if (initialSearch?.allowedRoleIds && Array.isArray(initialSearch.allowedRoleIds)) {
      return initialSearch.allowedRoleIds;
    }
    return [];
  });

  // Extract workflow statuses dynamically for selected modules
  const workflowStatusOptions = useMemo(() => {
    return extractWorkflowStatusesFromModules(customModules, targetModuleIds);
  }, [customModules, targetModuleIds]);

  // Exposed Parameters State
  const [exposedControls, setExposedControls] = useState<SearchParameterExposed[]>(() => {
    if (initialSearch?.searchConfig?.exposedControls?.length) {
      return initialSearch.searchConfig.exposedControls;
    }
    return [
      {
        id: 'assigneeId',
        parameterName: 'assigneeId',
        fieldKey: 'assigneeId',
        label: 'Allocated To',
        controlType: 'user'
      },
      {
        id: 'status',
        parameterName: 'status',
        fieldKey: 'status',
        label: 'Record Status',
        controlType: 'status',
        isMultiSelect: true,
        options: []
      },
      {
        id: 'datePreset',
        parameterName: 'datePreset',
        fieldKey: 'datePreset',
        label: 'Date Range',
        controlType: 'date_preset',
        defaultValue: 'past_7_days'
      }
    ];
  });

  // Keep Record Status options dynamically synced with scoped module workflows
  useEffect(() => {
    if (workflowStatusOptions.length > 0) {
      setExposedControls(prev => prev.map(ctrl => {
        if (ctrl.controlType === 'status' || ctrl.fieldKey === 'status') {
          return {
            ...ctrl,
            isMultiSelect: ctrl.isMultiSelect ?? true,
            options: workflowStatusOptions
          };
        }
        return ctrl;
      }));
    }
  }, [workflowStatusOptions]);

  // Field Aliases State
  const [fieldAliases] = useState<SearchFieldAlias[]>(() => {
    return initialSearch?.searchConfig?.fieldAliases || [];
  });

  // UX & Layout State
  const [defaultLayout, setDefaultLayout] = useState<'table' | 'cards' | 'split'>(
    initialSearch?.searchConfig?.defaultLayout || 'table'
  );
  const [pageSize, setPageSize] = useState<number>(
    initialSearch?.searchConfig?.pageSize || 25
  );
  const [allowExport, setAllowExport] = useState(
    initialSearch?.searchConfig?.allowExport ?? true
  );

  // Generated SQL state
  const [generatedSql, setGeneratedSql] = useState(initialSearch?.sql || '');
  const [isSaving, setIsSaving] = useState(false);

  // Recompile SQL on configuration changes
  useEffect(() => {
    compileSearchSql({
      scopeType,
      targetModuleIds,
      exposedControls,
      fieldAliases,
      entityTarget
    }, tenantId, token).then(sql => {
      if (sql) setGeneratedSql(sql);
    });
  }, [scopeType, targetModuleIds, exposedControls, fieldAliases, entityTarget, tenantId, token]);

  // Available custom fields across currently selected target modules
  const availableCustomFields = useMemo(() => {
    const list: Array<{ 
      id: string; 
      label: string; 
      moduleName: string; 
      type?: string;
      options?: Array<{ label: string; value: string }>;
    }> = [];
    
    targetModuleIds.forEach(mId => {
      const mod = customModules.find(m => m.id === mId);
      if (mod) {
        const flat = flattenFields(mod.layout || mod.config?.layout || []);
        flat.forEach((f: any) => {
          if (f.id && !['id', 'status', 'assigneeId', 'createdAt', 'updatedAt', 'created_at', 'updated_at', 'tenantId', 'tenant_id'].includes(f.id)) {
            // Extract and normalize options if dropdown/choice field
            let parsedOptions: Array<{ label: string; value: string }> | undefined = undefined;
            if (Array.isArray(f.options) && f.options.length > 0) {
              parsedOptions = f.options.map((opt: any) => {
                if (typeof opt === 'string') return { label: opt, value: opt };
                return { 
                  label: opt.label || opt.name || String(opt.value), 
                  value: String(opt.value ?? opt.label) 
                };
              });
            }

            list.push({
              id: f.id,
              label: f.label || f.name || f.id,
              moduleName: mod.name,
              type: f.type || 'text',
              options: parsedOptions
            });
          }
        });
      }
    });
    return list;
  }, [targetModuleIds, customModules]);

  // Sidebar Search Filter States
  const [filterSearchQuery, setFilterSearchQuery] = useState('');
  const [columnSearchQuery, setColumnSearchQuery] = useState('');

  // Filtered available custom fields for Tab 2 Filter Library
  const filteredCustomFieldsForFilters = useMemo(() => {
    if (!filterSearchQuery.trim()) return availableCustomFields;
    const q = filterSearchQuery.toLowerCase();
    return availableCustomFields.filter(f => 
      f.label.toLowerCase().includes(q) || 
      f.id.toLowerCase().includes(q) || 
      f.moduleName.toLowerCase().includes(q) ||
      (f.type && f.type.toLowerCase().includes(q))
    );
  }, [availableCustomFields, filterSearchQuery]);

  // Filtered available custom fields for Tab 3 Column Library
  const filteredCustomFieldsForColumns = useMemo(() => {
    if (!columnSearchQuery.trim()) return availableCustomFields;
    const q = columnSearchQuery.toLowerCase();
    return availableCustomFields.filter(f => 
      f.label.toLowerCase().includes(q) || 
      f.id.toLowerCase().includes(q) || 
      f.moduleName.toLowerCase().includes(q) ||
      (f.type && f.type.toLowerCase().includes(q))
    );
  }, [availableCustomFields, columnSearchQuery]);

  // Filtered system columns for Tab 3 Column Library
  const filteredSystemColumns = useMemo(() => {
    if (!columnSearchQuery.trim()) return AVAILABLE_SYSTEM_COLUMNS;
    const q = columnSearchQuery.toLowerCase();
    return AVAILABLE_SYSTEM_COLUMNS.filter(c =>
      c.label.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q)
    );
  }, [columnSearchQuery]);

  // Toggle Module Selection
  const handleToggleModule = (modId: string) => {
    if (targetModuleIds.includes(modId)) {
      setTargetModuleIds(targetModuleIds.filter(id => id !== modId));
    } else {
      setTargetModuleIds([...targetModuleIds, modId]);
    }
  };

  // Add Custom Field Filter Control with intelligent control type inference
  const handleAddCustomControl = (field: { 
    id: string; 
    label: string; 
    moduleName: string; 
    type?: string;
    options?: Array<{ label: string; value: string }>;
  }) => {
    const safeParamName = field.id.replace(/[^a-zA-Z0-9_]/g, '_');
    const lowerType = (field.type || '').toLowerCase();
    
    let controlType: SearchParameterExposed['controlType'] = 'text';
    let isMultiSelect: boolean | undefined = undefined;
    let options = field.options;

    if (['select', 'radio', 'tag', 'duallist', 'checkboxgroup', 'multiselect', 'dropdown', 'choice'].includes(lowerType) || (options && options.length > 0)) {
      controlType = 'select';
      isMultiSelect = true;
    } else if (['boolean', 'checkbox', 'toggle', 'switch'].includes(lowerType)) {
      controlType = 'boolean';
    } else if (['date', 'datetime', 'timestamp'].includes(lowerType)) {
      controlType = 'date_range';
    } else if (['number', 'integer', 'float', 'currency', 'decimal'].includes(lowerType)) {
      controlType = 'number_range';
    } else if (['user', 'assignee', 'member', 'owner'].includes(lowerType)) {
      controlType = 'user';
    }

    const newControl: SearchParameterExposed = {
      id: `param_${safeParamName}_${Date.now()}`,
      parameterName: safeParamName,
      fieldKey: field.id,
      label: `${field.label} (${field.moduleName})`,
      controlType,
      isMultiSelect,
      options
    };
    setExposedControls(prev => [...prev, newControl]);
    toast.success(`Added ${controlType} filter for ${field.label}`);
  };

  // Column Management Handlers
  const handleToggleColumnVisibility = (index: number) => {
    setColumnsConfig(prev => prev.map((col, i) => i === index ? { ...col, visible: !col.visible } : col));
  };

  const handleMoveColumn = (index: number, direction: 'up' | 'down') => {
    setColumnsConfig(prev => {
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  const handleDropColumn = (targetIndex: number) => {
    if (draggedColumnIndex === null || draggedColumnIndex === targetIndex) {
      setDraggedColumnIndex(null);
      setDragOverColumnIndex(null);
      return;
    }
    setColumnsConfig(prev => {
      const copy = [...prev];
      const [movedItem] = copy.splice(draggedColumnIndex, 1);
      copy.splice(targetIndex, 0, movedItem);
      return copy;
    });
    setDraggedColumnIndex(null);
    setDragOverColumnIndex(null);
  };

  const handleUpdateColumnLabel = (index: number, label: string) => {
    setColumnsConfig(prev => prev.map((col, i) => i === index ? { ...col, label } : col));
  };

  const handleUpdateColumnType = (index: number, type: ColumnDisplayType) => {
    setColumnsConfig(prev => prev.map((col, i) => i === index ? { ...col, type } : col));
  };

  const handleRemoveColumn = (index: number) => {
    setColumnsConfig(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddCustomColumn = (field: { 
    id: string; 
    label: string; 
    moduleName: string; 
    type?: string; 
  }) => {
    const existingIndex = columnsConfig.findIndex(c => c.name === field.id);
    if (existingIndex >= 0) {
      if (!columnsConfig[existingIndex].visible) {
        setColumnsConfig(prev => prev.map((c, i) => i === existingIndex ? { ...c, visible: true } : c));
        toast.success(`Enabled column ${field.label}`);
      } else {
        toast.info(`Column ${field.label} is already included`);
      }
      return;
    }

    let colType: ColumnDisplayType = 'text';
    const lowerType = (field.type || '').toLowerCase();
    if (['currency', 'money'].includes(lowerType)) colType = 'currency';
    else if (['number', 'integer', 'float', 'decimal'].includes(lowerType)) colType = 'number';
    else if (['date', 'datetime', 'timestamp'].includes(lowerType)) colType = 'date';
    else if (['boolean', 'checkbox', 'toggle'].includes(lowerType)) colType = 'boolean';
    else if (['select', 'radio', 'tag', 'status', 'choice'].includes(lowerType)) colType = 'badge';
    else if (['user', 'assignee', 'member'].includes(lowerType)) colType = 'avatar';

    const newCol: QueryColumnConfig = {
      name: field.id,
      label: field.label,
      type: colType,
      visible: true,
      isCustom: true,
      moduleName: field.moduleName
    };

    setColumnsConfig(prev => [...prev, newCol]);
    toast.success(`Added ${field.label} to result columns`);
  };

  const handleResetColumns = () => {
    setColumnsConfig(DEFAULT_SYSTEM_COLUMNS);
    toast.info('Reset to default system columns');
  };

  // Add Standard System Column
  const handleAddSystemColumn = (sysCol: QueryColumnConfig) => {
    const existingIndex = columnsConfig.findIndex(c => c.name === sysCol.name);
    if (existingIndex >= 0) {
      if (!columnsConfig[existingIndex].visible) {
        setColumnsConfig(prev => prev.map((c, i) => i === existingIndex ? { ...c, visible: true } : c));
        toast.success(`Enabled column ${sysCol.label}`);
      } else {
        toast.info(`Column ${sysCol.label} is already in the table`);
      }
      return;
    }
    setColumnsConfig(prev => [...prev, { ...sysCol, visible: true }]);
    toast.success(`Added ${sysCol.label} to result columns`);
  };

  // Add Standard Filter Parameter
  const handleAddStandardControl = (type: 'assignee' | 'status' | 'date_preset' | 'query') => {
    if (type === 'assignee') {
      if (exposedControls.some(c => c.parameterName === 'assigneeId' || c.controlType === 'user')) {
        toast.info('Assignee filter is already added');
        return;
      }
      setExposedControls(prev => [...prev, {
        id: `param_assignee_${Date.now()}`,
        parameterName: 'assigneeId',
        fieldKey: 'assigneeId',
        label: 'Allocated To',
        controlType: 'user'
      }]);
      toast.success('Added Assignee filter');
    } else if (type === 'status') {
      if (exposedControls.some(c => c.parameterName === 'status' || c.controlType === 'status')) {
        toast.info('Status filter is already added');
        return;
      }
      setExposedControls(prev => [...prev, {
        id: `param_status_${Date.now()}`,
        parameterName: 'status',
        fieldKey: 'status',
        label: 'Workflow Status',
        controlType: 'status',
        isMultiSelect: true,
        options: workflowStatusOptions
      }]);
      toast.success('Added Workflow Status filter');
    } else if (type === 'date_preset') {
      if (exposedControls.some(c => c.parameterName === 'datePreset' || c.controlType === 'date_preset')) {
        toast.info('Date Range filter is already added');
        return;
      }
      setExposedControls(prev => [...prev, {
        id: `param_date_${Date.now()}`,
        parameterName: 'datePreset',
        fieldKey: 'datePreset',
        label: 'Date Range',
        controlType: 'date_preset',
        defaultValue: 'past_30_days'
      }]);
      toast.success('Added Date Range filter');
    } else if (type === 'query') {
      if (exposedControls.some(c => c.parameterName === 'query')) {
        toast.info('Search Query filter is already added');
        return;
      }
      setExposedControls(prev => [...prev, {
        id: `param_query_${Date.now()}`,
        parameterName: 'query',
        fieldKey: 'query',
        label: 'Keyword Search',
        controlType: 'text'
      }]);
      toast.success('Added Keyword Search filter');
    }
  };

  // Save Search
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Search name is required');
      return;
    }
    if (scopeType === 'MULTI_MODULE' && targetModuleIds.length === 0) {
      toast.error('Please select at least one module');
      return;
    }

    setIsSaving(true);
    const searchConfig: SearchUXConfig = {
      defaultLayout,
      pageSize,
      allowExport,
      allowPersonalPresets: true,
      enableInstantSearch: true,
      entityTarget,
      exposedControls,
      fieldAliases
    };

    const payload: Partial<SavedSearchEntity> = {
      id: searchId || undefined,
      tenantId,
      name: name.trim(),
      description: description.trim(),
      category,
      isSearchEnabled: true,
      scopeType,
      targetModuleIds,
      allowedRoleIds,
      searchConfig,
      columnsConfig,
      sql: generatedSql,
      status: 'PUBLISHED'
    };

    try {
      const saved = await saveSavedSearch(payload, tenantId, token);
      setSearchId(saved.id);
      toast.success('Search successfully published for business users!');
      if (onSaveSuccess) onSaveSuccess(saved);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save search');
    } finally {
      setIsSaving(false);
    }
  };

  // Convert exposedControls to parameters for Query Builder integration
  const generatedParameters = useMemo(() => {
    const params: any[] = [];
    exposedControls.forEach(ctrl => {
      const pName = (ctrl.parameterName || ctrl.id).replace(/[^a-zA-Z0-9_]/g, '_');
      if (ctrl.controlType === 'date_preset' || ctrl.controlType === 'date_range') {
        params.push({
          id: `p_${pName}From`,
          name: `${pName}From`,
          label: `${ctrl.label} (From)`,
          type: 'string',
          defaultValue: ''
        });
        params.push({
          id: `p_${pName}To`,
          name: `${pName}To`,
          label: `${ctrl.label} (To)`,
          type: 'string',
          defaultValue: ''
        });
      } else {
        params.push({
          id: `p_${pName}`,
          name: pName,
          label: ctrl.label,
          type: ctrl.controlType === 'number_range' ? 'number' : 'string',
          defaultValue: ctrl.defaultValue || ''
        });
      }
    });
    return params;
  }, [exposedControls]);

  // Construct draft entity for live preview
  const draftEntity: SavedSearchEntity = {
    id: searchId || 'draft-search',
    tenantId,
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    description,
    category,
    isSearchEnabled: true,
    scopeType,
    targetModuleIds,
    allowedRoleIds,
    sql: generatedSql,
    parameters: generatedParameters,
    columnsConfig,
    searchConfig: {
      defaultLayout,
      pageSize,
      allowExport,
      allowPersonalPresets: true,
      enableInstantSearch: true,
      entityTarget,
      exposedControls,
      fieldAliases
    },
    status: 'PUBLISHED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return (
    <div className={cn(
      "fixed inset-0 z-[9999] flex flex-col w-screen h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans"
    )}>
      {/* Top Header Bar */}
      <div className="px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all text-xs font-semibold border border-zinc-200 dark:border-zinc-800"
            title="Back to Searches Library"
          >
            <ArrowLeft size={15} />
            <span>Library</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md">
                Search Studio
              </span>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">{name}</h2>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">Configure reusable, cross-module business user searches</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onOpenInQueryBuilder && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onOpenInQueryBuilder(generatedSql, draftEntity)}
              className="gap-1.5 text-xs text-purple-600 border-purple-200 dark:border-purple-800/60 hover:bg-purple-50 dark:hover:bg-purple-950/40"
            >
              <Code size={13} />
              <span>Open in Query Builder</span>
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
          >
            <Save size={13} />
            <span>{isSaving ? 'Saving...' : 'Publish Search'}</span>
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="px-6 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-6 shrink-0 text-xs font-semibold overflow-x-auto">
        {[
          { id: 'scope', label: '1. Scopes & Modules', icon: Layers },
          { id: 'controls', label: '2. Filter Parameters', icon: Sliders },
          { id: 'columns', label: '3. Result Columns', icon: Columns },
          { id: 'layout', label: '4. Display & Layout', icon: Layout },
          { id: 'preview', label: '5. Live Consumer Preview', icon: Eye }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 py-3 border-b-2 transition-all shrink-0",
              activeTab === tab.id
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            )}
          >
            <tab.icon size={15} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Studio Body */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* TAB 1: SCOPES & MODULES */}
        {activeTab === 'scope' && (
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Search Metadata */}
              <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Search Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-zinc-500 font-medium mb-1">Search Display Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Steve's Pending Files"
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 font-medium mb-1">Category</label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g. Work Management, Invoices"
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-zinc-500 font-medium mb-1">Description</label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe what business users can accomplish with this search..."
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Target Scoping & Modules Picker */}
              <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xs space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Module Scoping</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Select which custom modules this search indexes and queries across</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setScopeType('MULTI_MODULE')}
                    className={cn(
                      "flex-1 p-4 rounded-2xl border text-left transition-all",
                      scopeType === 'MULTI_MODULE'
                        ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-1 ring-indigo-600"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                    )}
                  >
                    <div className="font-bold text-xs text-zinc-900 dark:text-white">Selected Custom Modules</div>
                    <div className="text-[11px] text-zinc-500 mt-1">Federate across specific business modules (e.g. Greg's 3 modules)</div>
                  </button>

                  <button
                    onClick={() => setScopeType('PLATFORM')}
                    className={cn(
                      "flex-1 p-4 rounded-2xl border text-left transition-all",
                      scopeType === 'PLATFORM'
                        ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-1 ring-indigo-600"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                    )}
                  >
                    <div className="font-bold text-xs text-zinc-900 dark:text-white">Platform-Wide (All Modules)</div>
                    <div className="text-[11px] text-zinc-500 mt-1">Query records across every active module in this workspace</div>
                  </button>
                </div>

                {scopeType === 'MULTI_MODULE' && (
                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                        Available Modules ({targetModuleIds.length} Selected)
                      </span>
                      <button
                        onClick={() => setTargetModuleIds(customModules.map(m => m.id))}
                        className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Select All
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {customModules.map(mod => {
                        const isSelected = targetModuleIds.includes(mod.id);
                        return (
                          <div
                            key={mod.id}
                            onClick={() => handleToggleModule(mod.id)}
                            className={cn(
                              "p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all",
                              isSelected
                                ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800"
                                : "bg-zinc-50 dark:bg-zinc-950/30 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={cn("p-1.5 rounded-lg", isSelected ? "bg-indigo-600 text-white" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600")}>
                                <Layers size={14} />
                              </div>
                              <div className="truncate">
                                <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">{mod.name}</div>
                                <div className="text-[10px] text-zinc-400 capitalize">{mod.category || 'Module'}</div>
                              </div>
                            </div>
                            {isSelected && <Check size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Access & Visibility (Governance & RBAC) */}
              <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <Shield size={16} className="text-indigo-500" />
                      Access & Visibility
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Control who can discover and run this federated search</p>
                  </div>
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5",
                    allowedRoleIds.length === 0
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50"
                  )}>
                    {allowedRoleIds.length === 0 ? <Globe size={12} /> : <Lock size={12} />}
                    {allowedRoleIds.length === 0 ? 'Public to All' : `Restricted (${allowedRoleIds.length} Roles)`}
                  </span>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setAllowedRoleIds([])}
                    className={cn(
                      "flex-1 p-3.5 rounded-2xl border text-left transition-all",
                      allowedRoleIds.length === 0
                        ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-1 ring-indigo-600"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                    )}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-zinc-900 dark:text-white">
                      <Globe size={14} className="text-emerald-500" />
                      <span>All Workspace Users (Public)</span>
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-1">Available to all authenticated team members across the workspace</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (allowedRoleIds.length === 0) {
                        setAllowedRoleIds(['Admin', 'Manager']);
                      }
                    }}
                    className={cn(
                      "flex-1 p-3.5 rounded-2xl border text-left transition-all",
                      allowedRoleIds.length > 0
                        ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-1 ring-indigo-600"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                    )}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-zinc-900 dark:text-white">
                      <Lock size={14} className="text-amber-500" />
                      <span>Restricted by Role (RBAC)</span>
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-1">Only users with selected security roles will have access</div>
                  </button>
                </div>

                {allowedRoleIds.length > 0 && (
                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
                      Permitted Roles
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'Admin', label: 'Tenant Admin' },
                        { id: 'Developer', label: 'Developer / Builder' },
                        { id: 'Manager', label: 'Manager' },
                        { id: 'Staff', label: 'Standard User / Staff' }
                      ].map(role => {
                        const isSelected = allowedRoleIds.includes(role.id);
                        return (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                const next = allowedRoleIds.filter(r => r !== role.id);
                                setAllowedRoleIds(next.length > 0 ? next : []);
                              } else {
                                setAllowedRoleIds(prev => [...prev, role.id]);
                              }
                            }}
                            className={cn(
                              "px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all",
                              isSelected
                                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold"
                                : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                            )}
                          >
                            <span className={cn(
                              "w-2 h-2 rounded-full",
                              isSelected ? "bg-indigo-500" : "bg-zinc-300 dark:bg-zinc-700"
                            )} />
                            <span>{role.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FILTER PARAMETERS */}
        {activeTab === 'controls' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar: Filter Library */}
            <aside className="w-80 lg:w-96 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col h-full overflow-hidden">
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders size={16} className="text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                      Filter Library
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    {filteredCustomFieldsForFilters.length + 4} Available
                  </span>
                </div>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-2.5 text-zinc-400" />
                  <input
                    type="text"
                    value={filterSearchQuery}
                    onChange={e => setFilterSearchQuery(e.target.value)}
                    placeholder="Search filters & fields..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
                {/* 1. Quick Add Standard Filters */}
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    Standard Filters
                  </div>
                  <div className="space-y-1.5">
                    {[
                      {
                        type: 'assignee' as const,
                        label: 'Allocated To',
                        desc: 'User assignee dropdown',
                        isAdded: exposedControls.some(c => c.parameterName === 'assigneeId' || c.controlType === 'user')
                      },
                      {
                        type: 'status' as const,
                        label: 'Workflow Status',
                        desc: 'Multi-select module stages',
                        isAdded: exposedControls.some(c => c.parameterName === 'status' || c.controlType === 'status')
                      },
                      {
                        type: 'date_preset' as const,
                        label: 'Date Range',
                        desc: 'Calendar & relative presets',
                        isAdded: exposedControls.some(c => c.parameterName === 'datePreset' || c.controlType === 'date_preset' || c.controlType === 'date_range')
                      },
                      {
                        type: 'query' as const,
                        label: 'Keyword Search',
                        desc: 'Full-text query filter',
                        isAdded: exposedControls.some(c => c.parameterName === 'query')
                      }
                    ].map(item => (
                      <div
                        key={item.type}
                        className={cn(
                          "p-2.5 rounded-xl border flex items-center justify-between transition-colors",
                          item.isAdded
                            ? "bg-zinc-50/80 dark:bg-zinc-950/40 border-zinc-200/70 dark:border-zinc-800/70"
                            : "bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/30"
                        )}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                            {item.label}
                          </div>
                          <div className="text-[10px] text-zinc-400 truncate">{item.desc}</div>
                        </div>
                        {item.isAdded ? (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full shrink-0">
                            <Check size={11} />
                            <span>Added</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddStandardControl(item.type)}
                            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors shrink-0"
                          >
                            <Plus size={12} />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Custom Module Fields */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    <span>Module Custom Fields</span>
                    <span className="text-[10px] font-semibold text-zinc-500">
                      {filteredCustomFieldsForFilters.length}
                    </span>
                  </div>

                  {filteredCustomFieldsForFilters.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic p-2 bg-zinc-50 dark:bg-zinc-950/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center">
                      {filterSearchQuery.trim() ? 'No matching custom fields found.' : 'No custom fields in selected modules.'}
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {filteredCustomFieldsForFilters.map((field, i) => {
                        const isAlreadyAdded = exposedControls.some(c => c.fieldKey === field.id || c.parameterName === field.id.replace(/[^a-zA-Z0-9_]/g, '_'));
                        return (
                          <div
                            key={`${field.id}_${i}`}
                            className={cn(
                              "p-2.5 rounded-xl border flex items-center justify-between transition-colors",
                              isAlreadyAdded
                                ? "bg-zinc-50/80 dark:bg-zinc-950/40 border-zinc-200/70 dark:border-zinc-800/70"
                                : "bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/30"
                            )}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate flex items-center gap-1.5">
                                <span className="truncate">{field.label}</span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-normal uppercase shrink-0">
                                  {field.options && field.options.length > 0 ? `choice (${field.options.length})` : (field.type || 'text')}
                                </span>
                              </div>
                              <div className="text-[10px] text-zinc-400 truncate mt-0.5">{field.moduleName}</div>
                            </div>
                            {isAlreadyAdded ? (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full shrink-0">
                                <Check size={11} />
                                <span>Added</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAddCustomControl(field)}
                                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors shrink-0"
                              >
                                <Plus size={12} />
                                <span>Add</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </aside>

            {/* Right Canvas: Configured Filters */}
            <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-zinc-50/60 dark:bg-zinc-950/60 custom-scrollbar">
              <div className="max-w-4xl mx-auto space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-200/80 dark:border-zinc-800">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <span>Configured Filter Parameters</span>
                      <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-full">
                        {exposedControls.length} Active
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Interactive controls rendered for end-users to filter cross-module search results
                    </p>
                  </div>
                </div>

                {exposedControls.length === 0 ? (
                  <div className="p-12 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/50 dark:bg-zinc-900/30 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
                      <Sliders size={22} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">No filter parameters added yet</h4>
                      <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
                        Select standard filters or custom module fields from the library on the left to expose them to users.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {exposedControls.map((ctrl, index) => (
                      <div 
                        key={ctrl.id} 
                        className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs flex items-center justify-between gap-4 transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                            {index + 1}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2 flex-wrap">
                              <span>{ctrl.label}</span>
                              <span className={cn(
                                "text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full",
                                ctrl.controlType === 'select' ? "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300" :
                                ctrl.controlType === 'status' ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300" :
                                ctrl.controlType === 'boolean' ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300" :
                                ctrl.controlType === 'user' ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300" :
                                "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                              )}>
                                {ctrl.controlType}
                              </span>
                              {ctrl.options && ctrl.options.length > 0 && (
                                <span className="text-[10px] font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                                  {ctrl.options.length} options
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-zinc-400 mt-0.5">
                              Parameter: <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">:{ctrl.parameterName}</code> • Target: <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">{ctrl.fieldKey}</code>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {(ctrl.controlType === 'select' || ctrl.controlType === 'status') && (
                            <button
                              type="button"
                              onClick={() => {
                                setExposedControls(prev => prev.map(c => c.id === ctrl.id ? { ...c, isMultiSelect: !c.isMultiSelect } : c));
                              }}
                              className={cn(
                                "text-[11px] font-medium px-2.5 py-1 rounded-xl border transition-colors",
                                ctrl.isMultiSelect
                                  ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 font-semibold"
                                  : "bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700 text-zinc-500"
                              )}
                              title="Toggle between Multi-select and Single-select for business users"
                            >
                              {ctrl.isMultiSelect ? 'Multi-select: ON' : 'Single Select'}
                            </button>
                          )}

                          {(ctrl.controlType === 'date_preset' || ctrl.controlType === 'date_range') ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Date Preset Default Dropdown */}
                              <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-950 px-2.5 py-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Default:</span>
                                <select
                                  value={ctrl.defaultValue?.startsWith('custom:') ? 'custom' : (ctrl.defaultValue || 'past_7_days')}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'custom') {
                                      const today = new Date().toISOString().split('T')[0];
                                      const past30 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
                                      setExposedControls(prev => prev.map(c => c.id === ctrl.id ? { ...c, defaultValue: `custom:${past30},${today}` } : c));
                                    } else {
                                      setExposedControls(prev => prev.map(c => c.id === ctrl.id ? { ...c, defaultValue: val } : c));
                                    }
                                  }}
                                  className="text-xs bg-transparent font-semibold text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer"
                                >
                                  <option value="today">Today</option>
                                  <option value="yesterday">Yesterday</option>
                                  <option value="this_week">This Week</option>
                                  <option value="this_month">This Month</option>
                                  <option value="past_7_days">Past 7 Days</option>
                                  <option value="past_30_days">Past 30 Days</option>
                                  <option value="past_90_days">Past 90 Days</option>
                                  <option value="all_time">All Time (No Restriction)</option>
                                  <option value="custom">Custom Fixed Range...</option>
                                </select>
                              </div>

                              {/* Custom Date Pickers if 'custom' is selected */}
                              {ctrl.defaultValue?.startsWith('custom:') && (
                                <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/60 px-2 py-1 rounded-xl text-xs">
                                  <input
                                    type="date"
                                    value={ctrl.defaultValue.replace('custom:', '').split(',')[0] || ''}
                                    onChange={(e) => {
                                      const currentTo = ctrl.defaultValue.replace('custom:', '').split(',')[1] || '';
                                      setExposedControls(prev => prev.map(c => c.id === ctrl.id ? { ...c, defaultValue: `custom:${e.target.value},${currentTo}` } : c));
                                    }}
                                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 rounded text-[11px] outline-none text-zinc-800 dark:text-zinc-200"
                                  />
                                  <span className="text-zinc-400 text-xs">to</span>
                                  <input
                                    type="date"
                                    value={ctrl.defaultValue.replace('custom:', '').split(',')[1] || ''}
                                    onChange={(e) => {
                                      const currentFrom = ctrl.defaultValue.replace('custom:', '').split(',')[0] || '';
                                      setExposedControls(prev => prev.map(c => c.id === ctrl.id ? { ...c, defaultValue: `custom:${currentFrom},${e.target.value}` } : c));
                                    }}
                                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 rounded text-[11px] outline-none text-zinc-800 dark:text-zinc-200"
                                  />
                                </div>
                              )}

                              {/* Lock / Customize Toggle */}
                              <button
                                type="button"
                                onClick={() => {
                                  setExposedControls(prev => prev.map(c => c.id === ctrl.id ? { ...c, isLocked: !c.isLocked } : c));
                                }}
                                className={cn(
                                  "text-[11px] font-medium px-2.5 py-1 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer",
                                  ctrl.isLocked
                                    ? "bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/80 text-amber-700 dark:text-amber-300 font-semibold"
                                    : "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 hover:border-emerald-300"
                                )}
                                title={ctrl.isLocked ? "Date range is locked for business users in workspace" : "Business users can define their own date range in workspace"}
                              >
                                {ctrl.isLocked ? (
                                  <>
                                    <Lock size={12} className="text-amber-500" />
                                    <span>Fixed by Admin</span>
                                  </>
                                ) : (
                                  <>
                                    <Unlock size={12} className="text-emerald-500" />
                                    <span>User Customizable</span>
                                  </>
                                )}
                              </button>
                            </div>
                          ) : (
                            ctrl.defaultValue && (
                              <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded-md">
                                Default: {String(ctrl.defaultValue)}
                              </span>
                            )
                          )}
                          <button
                            onClick={() => setExposedControls(exposedControls.filter(c => c.id !== ctrl.id))}
                            className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                            title="Remove Filter"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </main>
          </div>
        )}

        {/* TAB 3: RESULT COLUMNS */}
        {activeTab === 'columns' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar: Columns Library */}
            <aside className="w-80 lg:w-96 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col h-full overflow-hidden">
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Columns size={16} className="text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                      Columns Library
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    {filteredSystemColumns.length + filteredCustomFieldsForColumns.length} Available
                  </span>
                </div>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-2.5 text-zinc-400" />
                  <input
                    type="text"
                    value={columnSearchQuery}
                    onChange={e => setColumnSearchQuery(e.target.value)}
                    placeholder="Search columns & fields..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
                {/* 1. Standard System Columns */}
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    Standard System Fields
                  </div>
                  <div className="space-y-1.5">
                    {filteredSystemColumns.map(sysCol => {
                      const isIncluded = columnsConfig.some(c => c.name === sysCol.name && c.visible !== false);
                      return (
                        <div
                          key={sysCol.name}
                          className={cn(
                            "p-2.5 rounded-xl border flex items-center justify-between transition-colors",
                            isIncluded
                              ? "bg-zinc-50/80 dark:bg-zinc-950/40 border-zinc-200/70 dark:border-zinc-800/70"
                              : "bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/30"
                          )}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate flex items-center gap-1.5">
                              <span>{sysCol.label}</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-normal uppercase">
                                {sysCol.type || 'text'}
                              </span>
                            </div>
                            <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                              <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.2 rounded">{sysCol.name}</code>
                            </div>
                          </div>
                          {isIncluded ? (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full shrink-0">
                              <Check size={11} />
                              <span>Added</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddSystemColumn(sysCol)}
                              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors shrink-0"
                            >
                              <Plus size={12} />
                              <span>Add</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Module Custom Fields */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    <span>Module Custom Fields</span>
                    <span className="text-[10px] font-semibold text-zinc-500">
                      {filteredCustomFieldsForColumns.length}
                    </span>
                  </div>

                  {filteredCustomFieldsForColumns.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic p-2 bg-zinc-50 dark:bg-zinc-950/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center">
                      {columnSearchQuery.trim() ? 'No matching custom fields found.' : 'No custom fields in selected modules.'}
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {filteredCustomFieldsForColumns.map((field, i) => {
                        const isAlreadyAdded = columnsConfig.some(c => c.name === field.id && c.visible !== false);
                        return (
                          <div
                            key={`${field.id}_${i}`}
                            className={cn(
                              "p-2.5 rounded-xl border flex items-center justify-between transition-colors",
                              isAlreadyAdded
                                ? "bg-zinc-50/80 dark:bg-zinc-950/40 border-zinc-200/70 dark:border-zinc-800/70"
                                : "bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/30"
                            )}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate flex items-center gap-1.5">
                                <span className="truncate">{field.label}</span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-normal uppercase shrink-0">
                                  {field.type || 'text'}
                                </span>
                              </div>
                              <div className="text-[10px] text-zinc-400 truncate mt-0.5">{field.moduleName}</div>
                            </div>
                            {isAlreadyAdded ? (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full shrink-0">
                                <Check size={11} />
                                <span>Added</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAddCustomColumn(field)}
                                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors shrink-0"
                              >
                                <Plus size={12} />
                                <span>Add</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </aside>

            {/* Right Canvas: Reorderable Columns */}
            <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-zinc-50/60 dark:bg-zinc-950/60 custom-scrollbar">
              <div className="max-w-4xl mx-auto space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-200/80 dark:border-zinc-800">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <span>Result Table Columns</span>
                      <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-full">
                        {columnsConfig.filter(c => c.visible !== false).length} Visible of {columnsConfig.length}
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Drag and drop using the handle to reorder columns. Customize headers, visibility, and data formatting styles.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetColumns}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
                    title="Reset to default system columns"
                  >
                    <RotateCcw size={13} />
                    <span>Reset Defaults</span>
                  </button>
                </div>

                {columnsConfig.length === 0 ? (
                  <div className="p-12 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/50 dark:bg-zinc-900/30 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
                      <Columns size={22} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">No output columns configured</h4>
                      <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
                        Add system or custom fields from the sidebar on the left, or click "Reset Defaults" to restore standard columns.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {columnsConfig.map((col, idx) => {
                      const isDragging = draggedColumnIndex === idx;
                      const isDragOver = dragOverColumnIndex === idx && draggedColumnIndex !== idx;

                      return (
                        <div
                          key={`${col.name}_${idx}`}
                          draggable
                          onDragStart={(e) => {
                            setDraggedColumnIndex(idx);
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', String(idx));
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            if (dragOverColumnIndex !== idx) setDragOverColumnIndex(idx);
                          }}
                          onDragLeave={() => {
                            if (dragOverColumnIndex === idx) setDragOverColumnIndex(null);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            handleDropColumn(idx);
                          }}
                          onDragEnd={() => {
                            setDraggedColumnIndex(null);
                            setDragOverColumnIndex(null);
                          }}
                          className={cn(
                            "p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all select-none shadow-xs",
                            isDragging && "opacity-30 scale-[0.99] border-dashed border-indigo-400 bg-indigo-50/20",
                            isDragOver && "border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-50/60 dark:bg-indigo-950/60 shadow-md translate-y-0.5",
                            !isDragging && !isDragOver && (
                              col.visible !== false
                                ? "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                                : "bg-zinc-100/60 dark:bg-zinc-950/40 border-dashed border-zinc-200 dark:border-zinc-850 opacity-60"
                            )
                          )}
                        >
                          {/* Left: Drag Handle, Reorder & Visibility */}
                          <div className="flex items-center gap-2">
                            {/* Drag Handle */}
                            <div 
                              className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-grab active:cursor-grabbing rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                              title="Drag to reorder column"
                            >
                              <GripVertical size={15} />
                            </div>

                            {/* Accessibility Up/Down Buttons */}
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveColumn(idx, 'up')}
                                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-20 transition-opacity"
                                title="Move column left"
                              >
                                <ArrowUp size={12} />
                              </button>
                              <button
                                type="button"
                                disabled={idx === columnsConfig.length - 1}
                                onClick={() => handleMoveColumn(idx, 'down')}
                                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-20 transition-opacity"
                                title="Move column right"
                              >
                                <ArrowDown size={12} />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleColumnVisibility(idx)}
                              className={cn(
                                "p-2 rounded-xl transition-colors",
                                col.visible !== false
                                  ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                                  : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400"
                              )}
                              title={col.visible !== false ? "Hide column from table" : "Show column in table"}
                            >
                              {col.visible !== false ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>

                            {/* Display Label input */}
                            <div className="flex flex-col min-w-[200px]">
                              <input
                                type="text"
                                value={col.label}
                                onChange={(e) => handleUpdateColumnLabel(idx, e.target.value)}
                                className="px-2.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="Column Header Label"
                              />
                              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-zinc-400">
                                <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.2 rounded">
                                  {col.name}
                                </code>
                                {col.isCustom ? (
                                  <span className="text-[9px] bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold px-1.5 py-0.2 rounded">
                                    {col.moduleName || 'Custom'}
                                  </span>
                                ) : (
                                  <span className="text-[9px] bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium px-1.5 py-0.2 rounded">
                                    System
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Format Type & Remove */}
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-zinc-400 font-medium">Format:</span>
                              <select
                                value={col.type || 'text'}
                                onChange={(e) => handleUpdateColumnType(idx, e.target.value as ColumnDisplayType)}
                                className="px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-800 dark:text-zinc-200 font-medium focus:outline-none"
                              >
                                <option value="text">Plain Text</option>
                                <option value="badge">Badge / Pill</option>
                                <option value="date">Date</option>
                                <option value="currency">Currency ($)</option>
                                <option value="number">Number</option>
                                <option value="boolean">Yes / No</option>
                                <option value="avatar">User / Avatar</option>
                                <option value="link">Record Link</option>
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveColumn(idx)}
                              className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              title="Remove Column"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </main>
          </div>
        )}

        {/* TAB 4: DISPLAY & LAYOUT */}
        {activeTab === 'layout' && (
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Default Presentation Layout</h3>
                
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'table', label: 'Data Table', desc: 'Standard tabular layout with sortable column headers' },
                    { id: 'cards', label: 'Card Grid', desc: 'Visual card stream ideal for attachments & case tiles' },
                    { id: 'split', label: 'Split View', desc: 'Results on left with immediate record inspection on right' }
                  ].map(l => (
                    <button
                      key={l.id}
                      onClick={() => setDefaultLayout(l.id as any)}
                      className={cn(
                        "p-4 rounded-2xl border text-left transition-all",
                        defaultLayout === l.id
                          ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-1 ring-indigo-600"
                          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                      )}
                    >
                      <div className="font-bold text-xs text-zinc-900 dark:text-white">{l.label}</div>
                      <div className="text-[10px] text-zinc-500 mt-1">{l.desc}</div>
                    </button>
                  ))}
                </div>

                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-zinc-900 dark:text-white">Enable CSV Export</div>
                    <div className="text-[11px] text-zinc-500">Allow business users to export filtered result sets to Excel/CSV</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowExport}
                    onChange={(e) => setAllowExport(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                </div>

                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-zinc-900 dark:text-white">Target Entity</div>
                    <div className="text-[11px] text-zinc-500">Search for parent records or focus specifically on attached files</div>
                  </div>
                  <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setEntityTarget('records')}
                      className={cn("px-3 py-1.5 rounded-lg", entityTarget === 'records' ? "bg-white dark:bg-zinc-900 text-indigo-600 shadow-xs" : "text-zinc-400")}
                    >
                      Records
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntityTarget('files')}
                      className={cn("px-3 py-1.5 rounded-lg", entityTarget === 'files' ? "bg-white dark:bg-zinc-900 text-indigo-600 shadow-xs" : "text-zinc-400")}
                    >
                      Files
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-zinc-900 dark:text-white">Results Per Page</div>
                    <div className="text-[11px] text-zinc-500">Default pagination size for search results</div>
                  </div>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100"
                  >
                    <option value={10}>10 records</option>
                    <option value={25}>25 records</option>
                    <option value={50}>50 records</option>
                  </select>
                </div>
              </div>

              {/* Generated SQL Preview Box */}
              <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code size={16} className="text-purple-500" />
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Generated Query Execution Plan</h3>
                  </div>
                  <span className="text-[10px] bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 font-bold px-2 py-0.5 rounded-full">
                    PostgreSQL RLS Safe
                  </span>
                </div>
                <pre className="p-4 bg-zinc-950 text-emerald-400 font-mono text-[11px] rounded-2xl overflow-x-auto leading-relaxed border border-zinc-800">
                  {generatedSql || '-- Compiling query...'}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: LIVE CONSUMER PREVIEW */}
        {activeTab === 'preview' && (
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="max-w-5xl mx-auto h-[600px]">
              <SearchRenderer
                initialSearch={draftEntity}
                title={name}
                layout={defaultLayout}
                className="h-full"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
