import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Search, X, Plus, User, 
  ChevronDown, Check, Clock,
  RotateCcw, Sparkles, Filter
} from 'lucide-react';
import { Button } from '../UI/Primitives';
import { SavedSearchEntity, SearchParameterExposed } from '../../types/searchBuilder';
import { flattenFields } from '../../lib/utils';
import { extractWorkflowStatusesFromModules } from '../../utils/workflowStatusExtractor';
import { usePlatform } from '../../hooks/usePlatform';
import { cn } from '../../lib/utils';

export interface SearchFilterBarProps {
  searchDef: SavedSearchEntity;
  activeParameters: Record<string, any>;
  keyword: string;
  onKeywordChange: (kw: string) => void;
  onParameterChange: (key: string, value: any) => void;
  onResetFilters: () => void;
  onExecuteSearch?: () => void;
  isSearching?: boolean;
  className?: string;
  compact?: boolean;
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  searchDef,
  activeParameters,
  keyword,
  onKeywordChange,
  onParameterChange,
  onResetFilters,
  onExecuteSearch,
  isSearching = false,
  className
}) => {
  const { modules, members, user } = usePlatform();
  const [showAddFilterMenu, setShowAddFilterMenu] = useState(false);
  const [openDropdownKey, setOpenDropdownKey] = useState<string | null>(null);
  const [userSearchText, setUserSearchText] = useState('');
  const [selectSearchText, setSelectSearchText] = useState('');
  const [dynamicControls, setDynamicControls] = useState<SearchParameterExposed[]>([]);
  const addFilterRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addFilterRef.current && !addFilterRef.current.contains(e.target as Node)) {
        setShowAddFilterMenu(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdownKey(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scoped modules for field extraction
  const scopedModules = useMemo(() => {
    const targetIds = searchDef.targetModuleIds || [];
    if (!targetIds.length) return modules || [];
    return (modules || []).filter(m => targetIds.includes(m.id));
  }, [modules, searchDef.targetModuleIds]);

  // Exposed controls from search configuration
  const configuredControls: SearchParameterExposed[] = useMemo(() => {
    const fromConfig = searchDef.searchConfig?.exposedControls || [];
    if (fromConfig.length > 0) return fromConfig;

    // Default standard controls if none configured
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
        label: 'Status',
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
  }, [searchDef]);

  // Merge configured controls with dynamically added filters
  const allControls: SearchParameterExposed[] = useMemo(() => {
    const existingKeys = new Set(configuredControls.map(c => c.parameterName || c.fieldKey));
    const uniqueDynamics = dynamicControls.filter(c => !existingKeys.has(c.parameterName || c.fieldKey));
    return [...configuredControls, ...uniqueDynamics];
  }, [configuredControls, dynamicControls]);

  // All custom fields across scoped modules for "+ Add Filter"
  const availableCustomFields = useMemo(() => {
    const fieldsByModule: Array<{ moduleId: string; moduleName: string; fields: any[] }> = [];

    scopedModules.forEach(mod => {
      const flat = flattenFields(mod.layout || mod.config?.layout || []);
      const customOnes = flat.filter(f => f.id && !['id', 'status', 'assigneeId', 'createdAt', 'updatedAt', 'created_at', 'updated_at'].includes(f.id));
      if (customOnes.length > 0) {
        fieldsByModule.push({
          moduleId: mod.id,
          moduleName: mod.name,
          fields: customOnes
        });
      }
    });

    return fieldsByModule;
  }, [scopedModules]);

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return !!keyword || Object.values(activeParameters).some(v => v !== undefined && v !== null && v !== '');
  }, [keyword, activeParameters]);

  const DATE_PRESETS = [
    { label: 'Today', value: 'today' },
    { label: 'Past 7 Days', value: 'past_7_days' },
    { label: 'Past 30 Days', value: 'past_30_days' },
    { label: 'All Time', value: '' }
  ];

  return (
    <div className={cn("space-y-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs", className)}>
      {/* Search Omnibar & Execute Row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            placeholder={`Search across ${scopedModules.length ? scopedModules.map(m => m.name).join(', ') : 'all modules'}...`}
            className="w-full pl-10 pr-9 py-2 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          {keyword && (
            <button
              onClick={() => onKeywordChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {onExecuteSearch && (
          <Button
            size="sm"
            onClick={onExecuteSearch}
            disabled={isSearching}
            className="h-9 px-4 text-xs font-semibold gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
          >
            {isSearching ? <Sparkles size={14} className="animate-spin" /> : <Search size={14} />}
            Search
          </Button>
        )}

        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            title="Reset All Filters"
          >
            <RotateCcw size={15} />
          </button>
        )}
      </div>

      {/* Filter Chips Bar */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {/* Render Curated & Dynamic Controls */}
        {allControls.map(ctrl => {
          const currentVal = activeParameters[ctrl.parameterName] !== undefined 
            ? activeParameters[ctrl.parameterName] 
            : (ctrl.defaultValue ?? '');
          const isOpen = openDropdownKey === ctrl.parameterName;
          const isDynamic = ctrl.id.startsWith('dyn_');

          // User Picker Filter
          if (ctrl.controlType === 'user') {
            const selectedMember = (members || []).find(m => m.id === currentVal);
            return (
              <div key={ctrl.id} className="relative flex items-center" ref={isOpen ? dropdownRef : undefined}>
                <button
                  onClick={() => setOpenDropdownKey(isOpen ? null : ctrl.parameterName)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
                    currentVal 
                      ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300"
                      : "bg-zinc-50 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                  )}
                >
                  <User size={13} className={currentVal ? "text-indigo-500" : "text-zinc-400"} />
                  <span>{ctrl.label}:</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {selectedMember ? (selectedMember.name || `${(selectedMember as any).firstName || (selectedMember as any).first_name || ''} ${(selectedMember as any).familyName || (selectedMember as any).family_name || ''}`.trim()) : (currentVal === '@me' ? 'Me' : 'Anyone')}
                  </span>
                  <ChevronDown size={12} className="opacity-60" />
                </button>

                {isDynamic && (
                  <button
                    onClick={() => {
                      onParameterChange(ctrl.parameterName, '');
                      setDynamicControls(prev => prev.filter(c => c.id !== ctrl.id));
                    }}
                    className="ml-1 p-1 text-zinc-400 hover:text-rose-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    title="Remove filter"
                  >
                    <X size={12} />
                  </button>
                )}

                {isOpen && (
                  <div className="absolute left-0 top-full mt-1.5 w-60 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <input
                      type="text"
                      placeholder="Find team member..."
                      value={userSearchText}
                      onChange={(e) => setUserSearchText(e.target.value)}
                      className="w-full px-2.5 py-1.5 mb-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
                    />
                    <div className="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar">
                      <button
                        onClick={() => {
                          onParameterChange(ctrl.parameterName, '');
                          setOpenDropdownKey(null);
                        }}
                        className={cn("w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between", !currentVal ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 font-semibold" : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300")}
                      >
                        <span>Anyone</span>
                        {!currentVal && <Check size={13} />}
                      </button>

                      {user && (
                        <button
                          onClick={() => {
                            const uId = (user as any).id || (user as any).uid;
                            onParameterChange(ctrl.parameterName, uId);
                            setOpenDropdownKey(null);
                          }}
                          className={cn("w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between", (currentVal === (user as any).id || currentVal === (user as any).uid) ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 font-semibold" : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300")}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold flex items-center justify-center">Me</span>
                            <span>Assigned to Me</span>
                          </div>
                          {(currentVal === (user as any).id || currentVal === (user as any).uid) && <Check size={13} />}
                        </button>
                      )}

                      {(members || [])
                        .filter(m => {
                          const fullName = m.name || `${(m as any).firstName || (m as any).first_name || ''} ${(m as any).familyName || (m as any).family_name || ''}`.trim();
                          return !userSearchText || fullName.toLowerCase().includes(userSearchText.toLowerCase());
                        })
                        .map(member => {
                          const mName = member.name || `${(member as any).firstName || (member as any).first_name || ''} ${(member as any).familyName || (member as any).family_name || ''}`.trim();
                          const isSelected = currentVal === member.id;
                          return (
                            <button
                              key={member.id}
                              onClick={() => {
                                onParameterChange(ctrl.parameterName, member.id);
                                setOpenDropdownKey(null);
                              }}
                              className={cn("w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between", isSelected ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 font-semibold" : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300")}
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold flex items-center justify-center uppercase">
                                  {mName.charAt(0)}
                                </div>
                                <span className="truncate">{mName}</span>
                              </div>
                              {isSelected && <Check size={13} />}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // Status Filter (Dynamic Workflow Statuses & Multi-Select)
          if (ctrl.controlType === 'status') {
            const rawOptions = (ctrl.options && ctrl.options.length > 0)
              ? ctrl.options
              : extractWorkflowStatusesFromModules(scopedModules);

            const isMulti = ctrl.isMultiSelect !== false;
            const selectedList = currentVal 
              ? (Array.isArray(currentVal) 
                  ? currentVal.map(String) 
                  : String(currentVal).split(',').map(s => s.trim()).filter(Boolean))
              : [];

            const labelDisplay = selectedList.length === 0
              ? 'All'
              : (selectedList.length === 1
                  ? (rawOptions.find(o => o.value === selectedList[0])?.label || selectedList[0])
                  : `${selectedList.length} Selected`);

            const handleToggleStatus = (val: string) => {
              if (!isMulti) {
                onParameterChange(ctrl.parameterName, val);
                setOpenDropdownKey(null);
                return;
              }
              const next = selectedList.includes(val)
                ? selectedList.filter(s => s !== val)
                : [...selectedList, val];
              onParameterChange(ctrl.parameterName, next.join(','));
            };

            return (
              <div key={ctrl.id} className="relative flex items-center" ref={isOpen ? dropdownRef : undefined}>
                <button
                  onClick={() => setOpenDropdownKey(isOpen ? null : ctrl.parameterName)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
                    selectedList.length > 0 
                      ? "bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300"
                      : "bg-zinc-50 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                  )}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>{ctrl.label}:</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{labelDisplay}</span>
                  <ChevronDown size={12} className="opacity-60" />
                </button>

                {isDynamic && (
                  <button
                    onClick={() => {
                      onParameterChange(ctrl.parameterName, '');
                      setDynamicControls(prev => prev.filter(c => c.id !== ctrl.id));
                    }}
                    className="ml-1 p-1 text-zinc-400 hover:text-rose-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    title="Remove filter"
                  >
                    <X size={12} />
                  </button>
                )}

                {isOpen && (
                  <div className="absolute left-0 top-full mt-1.5 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-100 dark:border-zinc-800">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        {isMulti ? 'Select Statuses' : 'Select Status'}
                      </span>
                      {selectedList.length > 0 && (
                        <button
                          onClick={() => onParameterChange(ctrl.parameterName, '')}
                          className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline font-medium"
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        onParameterChange(ctrl.parameterName, '');
                        if (!isMulti) setOpenDropdownKey(null);
                      }}
                      className={cn(
                        "w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between mb-1",
                        selectedList.length === 0 
                          ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold" 
                          : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      )}
                    >
                      <span>All Statuses</span>
                      {selectedList.length === 0 && <Check size={13} />}
                    </button>

                    <div className="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar">
                      {rawOptions.map(opt => {
                        const isChecked = selectedList.includes(opt.value);
                        return (
                          <button
                            key={opt.value}
                            onClick={() => handleToggleStatus(opt.value)}
                            className={cn(
                              "w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors",
                              isChecked 
                                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold" 
                                : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              {isMulti && (
                                <div className={cn(
                                  "w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors",
                                  isChecked ? "bg-amber-600 border-amber-600 text-white" : "border-zinc-300 dark:border-zinc-600"
                                )}>
                                  {isChecked && <Check size={10} strokeWidth={3} />}
                                </div>
                              )}
                              <span>{opt.label}</span>
                            </div>
                            {!isMulti && isChecked && <Check size={13} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // Custom Select / Dropdown Field Filter (Single or Multi-select)
          if (ctrl.controlType === 'select') {
            const rawOptions = ctrl.options || [];
            const isMulti = ctrl.isMultiSelect !== false;
            const selectedList = currentVal 
              ? (Array.isArray(currentVal) 
                  ? currentVal.map(String) 
                  : String(currentVal).split(',').map(s => s.trim()).filter(Boolean))
              : [];

            const labelDisplay = selectedList.length === 0
              ? 'All'
              : (selectedList.length === 1
                  ? (rawOptions.find(o => o.value === selectedList[0])?.label || selectedList[0])
                  : `${selectedList.length} Selected`);

            const filteredOpts = rawOptions.filter(opt => 
              !selectSearchText || opt.label.toLowerCase().includes(selectSearchText.toLowerCase())
            );

            const handleToggleOption = (val: string) => {
              if (!isMulti) {
                onParameterChange(ctrl.parameterName, val);
                setOpenDropdownKey(null);
                return;
              }
              const next = selectedList.includes(val)
                ? selectedList.filter(s => s !== val)
                : [...selectedList, val];
              onParameterChange(ctrl.parameterName, next.join(','));
            };

            const handleSelectAll = () => {
              const allValues = rawOptions.map(o => o.value);
              onParameterChange(ctrl.parameterName, allValues.join(','));
            };

            return (
              <div key={ctrl.id} className="relative flex items-center" ref={isOpen ? dropdownRef : undefined}>
                <button
                  onClick={() => {
                    setOpenDropdownKey(isOpen ? null : ctrl.parameterName);
                    setSelectSearchText('');
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
                    selectedList.length > 0 
                      ? "bg-purple-50/80 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300"
                      : "bg-zinc-50 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                  )}
                >
                  <Filter size={13} className={selectedList.length > 0 ? "text-purple-500" : "text-zinc-400"} />
                  <span>{ctrl.label}:</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{labelDisplay}</span>
                  <ChevronDown size={12} className="opacity-60" />
                </button>

                {isDynamic && (
                  <button
                    onClick={() => {
                      onParameterChange(ctrl.parameterName, '');
                      setDynamicControls(prev => prev.filter(c => c.id !== ctrl.id));
                    }}
                    className="ml-1 p-1 text-zinc-400 hover:text-rose-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    title="Remove filter"
                  >
                    <X size={12} />
                  </button>
                )}

                {isOpen && (
                  <div className="absolute left-0 top-full mt-1.5 w-60 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    {rawOptions.length > 5 && (
                      <input
                        type="text"
                        placeholder="Search options..."
                        value={selectSearchText}
                        onChange={(e) => setSelectSearchText(e.target.value)}
                        className="w-full px-2.5 py-1.5 mb-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
                      />
                    )}

                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-100 dark:border-zinc-800 text-[10px]">
                      {isMulti ? (
                        <>
                          <button
                            onClick={handleSelectAll}
                            className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
                          >
                            Select all ({rawOptions.length})
                          </button>
                          {selectedList.length > 0 && (
                            <button
                              onClick={() => onParameterChange(ctrl.parameterName, '')}
                              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                            >
                              Clear
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            onParameterChange(ctrl.parameterName, '');
                            setOpenDropdownKey(null);
                          }}
                          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        >
                          Clear Selection
                        </button>
                      )}
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar">
                      {filteredOpts.map(opt => {
                        const isChecked = selectedList.includes(opt.value);
                        return (
                          <button
                            key={opt.value}
                            onClick={() => handleToggleOption(opt.value)}
                            className={cn(
                              "w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors",
                              isChecked 
                                ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-semibold" 
                                : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                            )}
                          >
                            <div className="flex items-center gap-2 truncate">
                              {isMulti && (
                                <div className={cn(
                                  "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors",
                                  isChecked ? "bg-purple-600 border-purple-600 text-white" : "border-zinc-300 dark:border-zinc-600"
                                )}>
                                  {isChecked && <Check size={10} strokeWidth={3} />}
                                </div>
                              )}
                              <span className="truncate">{opt.label}</span>
                            </div>
                            {!isMulti && isChecked && <Check size={13} />}
                          </button>
                        );
                      })}
                      {filteredOpts.length === 0 && (
                        <p className="text-xs text-zinc-400 p-2 text-center italic">No matching options</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // Boolean Filter (All / Yes / No segmented pill)
          if (ctrl.controlType === 'boolean') {
            const isTrue = currentVal === true || currentVal === 'true';
            const isFalse = currentVal === false || currentVal === 'false';
            return (
              <div key={ctrl.id} className="flex items-center bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-0.5 text-xs font-medium">
                <span className="px-2 text-zinc-500 text-[11px]">{ctrl.label}:</span>
                <button
                  type="button"
                  onClick={() => onParameterChange(ctrl.parameterName, '')}
                  className={cn(
                    "px-2 py-0.5 rounded-lg text-xs transition-colors",
                    !isTrue && !isFalse 
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold shadow-2xs" 
                      : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  )}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => onParameterChange(ctrl.parameterName, 'true')}
                  className={cn(
                    "px-2 py-0.5 rounded-lg text-xs transition-colors",
                    isTrue 
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold shadow-2xs" 
                      : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  )}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => onParameterChange(ctrl.parameterName, 'false')}
                  className={cn(
                    "px-2 py-0.5 rounded-lg text-xs transition-colors",
                    isFalse 
                      ? "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold shadow-2xs" 
                      : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  )}
                >
                  No
                </button>
                {isDynamic && (
                  <button
                    onClick={() => {
                      onParameterChange(ctrl.parameterName, '');
                      setDynamicControls(prev => prev.filter(c => c.id !== ctrl.id));
                    }}
                    className="ml-1 p-0.5 text-zinc-400 hover:text-rose-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    title="Remove filter"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            );
          }

          // Date Range Presets
          if (ctrl.controlType === 'date_preset') {
            const activePreset = DATE_PRESETS.find(p => p.value === currentVal);
            return (
              <div key={ctrl.id} className="relative flex items-center" ref={isOpen ? dropdownRef : undefined}>
                <button
                  onClick={() => setOpenDropdownKey(isOpen ? null : ctrl.parameterName)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
                    currentVal 
                      ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300"
                      : "bg-zinc-50 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                  )}
                >
                  <Clock size={13} className={currentVal ? "text-emerald-500" : "text-zinc-400"} />
                  <span>{ctrl.label}:</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{activePreset?.label || currentVal || 'All Time'}</span>
                  <ChevronDown size={12} className="opacity-60" />
                </button>

                {isDynamic && (
                  <button
                    onClick={() => {
                      onParameterChange(ctrl.parameterName, '');
                      setDynamicControls(prev => prev.filter(c => c.id !== ctrl.id));
                    }}
                    className="ml-1 p-1 text-zinc-400 hover:text-rose-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    title="Remove filter"
                  >
                    <X size={12} />
                  </button>
                )}

                {isOpen && (
                  <div className="absolute left-0 top-full mt-1.5 w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-1.5 z-50">
                    {DATE_PRESETS.map(preset => (
                      <button
                        key={preset.value}
                        onClick={() => {
                          onParameterChange(ctrl.parameterName, preset.value);
                          setOpenDropdownKey(null);
                        }}
                        className={cn("w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between", currentVal === preset.value ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 font-semibold" : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300")}
                      >
                        <span>{preset.label}</span>
                        {currentVal === preset.value && <Check size={13} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          // Generic custom text / input filter
          return (
            <div key={ctrl.id} className="relative flex items-center">
              <input
                type="text"
                placeholder={ctrl.label}
                value={currentVal || ''}
                onChange={(e) => onParameterChange(ctrl.parameterName, e.target.value)}
                className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[150px]"
              />
              {isDynamic && (
                <button
                  onClick={() => {
                    onParameterChange(ctrl.parameterName, '');
                    setDynamicControls(prev => prev.filter(c => c.id !== ctrl.id));
                  }}
                  className="ml-1 p-1 text-zinc-400 hover:text-rose-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Remove filter"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          );
        })}

        {/* Dynamic "+ Add Filter" for any custom module field */}
        <div className="relative" ref={addFilterRef}>
          <button
            onClick={() => setShowAddFilterMenu(!showAddFilterMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors"
          >
            <Plus size={13} />
            <span>Add Filter</span>
          </button>

          {showAddFilterMenu && (
            <div className="absolute left-0 top-full mt-1.5 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-2 z-50 max-h-64 overflow-y-auto custom-scrollbar">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2 py-1">Custom Module Fields</p>
              {availableCustomFields.length === 0 ? (
                <p className="text-xs text-zinc-400 px-2 py-2 italic">No custom fields found in scoped modules.</p>
              ) : (
                availableCustomFields.map(group => (
                  <div key={group.moduleId} className="mb-2">
                    <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 px-2 py-1 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-lg">
                      {group.moduleName}
                    </p>
                    <div className="mt-1 space-y-0.5">
                      {group.fields.map((f: any) => {
                        const hasOptions = Array.isArray(f.options) && f.options.length > 0;
                        const lowerType = (f.type || '').toLowerCase();
                        const isSelect = ['select', 'radio', 'tag', 'duallist', 'checkboxgroup', 'multiselect', 'dropdown', 'choice'].includes(lowerType) || hasOptions;
                        const isBool = ['boolean', 'checkbox', 'toggle', 'switch'].includes(lowerType);

                        const handleSelectField = () => {
                          const safeParamName = f.id.replace(/[^a-zA-Z0-9_]/g, '_');
                          let controlType: SearchParameterExposed['controlType'] = 'text';
                          let isMultiSelect = false;
                          let options: any[] | undefined = undefined;

                          if (isSelect) {
                            controlType = 'select';
                            isMultiSelect = true;
                            options = (f.options || []).map((o: any) => 
                              typeof o === 'string' ? { label: o, value: o } : { label: o.label || o.name || String(o.value), value: String(o.value ?? o.label) }
                            );
                          } else if (isBool) {
                            controlType = 'boolean';
                          } else if (['date', 'datetime'].includes(lowerType)) {
                            controlType = 'date_range';
                          } else if (['number', 'currency', 'integer'].includes(lowerType)) {
                            controlType = 'number_range';
                          }

                          const newCtrl: SearchParameterExposed = {
                            id: `dyn_${safeParamName}`,
                            parameterName: safeParamName,
                            fieldKey: f.id,
                            label: `${f.label || f.name || f.id}`,
                            controlType,
                            isMultiSelect,
                            options
                          };

                          setDynamicControls(prev => [...prev.filter(c => c.fieldKey !== f.id), newCtrl]);
                          setShowAddFilterMenu(false);
                        };

                        return (
                          <button
                            key={f.id}
                            onClick={handleSelectField}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between"
                          >
                            <span className="truncate">{f.label || f.name || f.id}</span>
                            <span className="text-[9px] text-zinc-400 uppercase">
                              {isSelect ? `choice (${f.options?.length || 0})` : (f.type || 'text')}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
