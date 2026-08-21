import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { 
  Bookmark, ChevronDown, Check, Plus, Trash2, Edit2, 
  Share2, Star, Search, X, Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from './Primitives';
import { 
  SavedViewEntity, 
  fetchSavedViews, 
  saveSavedView, 
  deleteSavedView, 
  setDefaultSavedView 
} from '../../services/savedViewService';
import { TableFilterState, getOperatorLabel, FilterFieldOption } from './TableFilterBar';

export interface SavedViewsSelectorProps {
  fields?: FilterFieldOption[];
  scopeType: 'MODULE' | 'QUEUE' | 'WORKSPACE';
  scopeId: string;
  tenantId?: string;
  token?: string;
  currentUserId?: string;
  activeFilterState: TableFilterState;
  onApplyView: (view: SavedViewEntity | null, filterState: TableFilterState) => void;
  className?: string;
}

export const SavedViewsSelector: React.FC<SavedViewsSelectorProps> = ({
  fields = [],
  scopeType,
  scopeId,
  tenantId,
  token,
  currentUserId,
  activeFilterState,
  onApplyView,
  className
}) => {
  const [views, setViews] = useState<SavedViewEntity[]>([]);
  const [_loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<SavedViewEntity | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [editingView, setEditingView] = useState<SavedViewEntity | null>(null);
  const [searchView, setSearchView] = useState('');
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Form State for Save/Edit Modal
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIcon, setFormIcon] = useState('Bookmark');
  const [formColor, setFormColor] = useState('#6366f1');
  const [formIsShared, setFormIsShared] = useState(false);
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load Saved Views on mount or when scope changes
  useEffect(() => {
    let isSubscribed = true;
    const loadViews = async () => {
      if (!tenantId || !scopeId) return;
      setLoading(true);
      try {
        const data = await fetchSavedViews(scopeType, scopeId, tenantId, token);
        if (isSubscribed) {
          setViews(data);
          
          // Auto-apply default view on initial load if no custom filters active yet
          const defaultView = data.find(v => v.isDefault);
          if (defaultView && activeFilterState.clauses.length === 0) {
            setActiveView(defaultView);
            onApplyView(defaultView, defaultView.filterState);
          }
        }
      } catch (err) {
        console.error('Failed to load saved views', err);
      } finally {
        if (isSubscribed) setLoading(false);
      }
    };

    loadViews();
    return () => { isSubscribed = false; };
  }, [scopeType, scopeId, tenantId, token]);

  // Check if active filters differ from currently active view (Dirty state)
  const isModified = useMemo(() => {
    if (!activeView) {
      return activeFilterState.clauses.length > 0;
    }
    const activeJSON = JSON.stringify({
      matchType: activeFilterState.matchType,
      clauses: activeFilterState.clauses.map(c => ({
        fieldId: c.fieldId,
        operator: c.operator,
        value: c.value,
        valueSecondary: c.valueSecondary
      }))
    });
    const savedJSON = JSON.stringify({
      matchType: activeView.filterState.matchType,
      clauses: (activeView.filterState.clauses || []).map((c: any) => ({
        fieldId: c.fieldId,
        operator: c.operator,
        value: c.value,
        valueSecondary: c.valueSecondary
      }))
    });
    return activeJSON !== savedJSON;
  }, [activeView, activeFilterState]);

  const fieldMap = useMemo(() => new Map((fields || []).map(f => [f.id, f])), [fields]);

  const resolveClauseDisplay = (clause: any) => {
    const fieldDef = fieldMap.get(clause.fieldId);
    const fieldLabel = fieldDef?.label || clause.fieldId;
    const opLabel = getOperatorLabel(clause.operator);

    if (['is_empty', 'not_empty', 'date_today', 'date_yesterday', 'date_past_7_days', 'date_past_30_days', 'date_this_month', 'is_me', 'is_unassigned'].includes(clause.operator)) {
      return `${fieldLabel} ${opLabel}`;
    }

    const resolveItem = (val: any) => {
      if (val === undefined || val === null || val === '') return '...';
      if (val === '__me__') return 'Current User';
      if (val === '__unassigned__') return 'Unassigned';
      if (fieldDef?.type === 'user' || fieldDef?.userOptions) {
        const matchUser = (fieldDef?.userOptions || []).find((u: any) => 
          u.id === val || u.cuid === val || u.memberId === val || u.userId === val
        );
        if (matchUser) return matchUser.name || (matchUser as any).user?.name || matchUser.email || val;
      }
      const match = fieldDef?.options?.find(o => (typeof o === 'string' ? o : o.value) === val);
      if (match) return typeof match === 'object' ? match.label : match;
      return String(val);
    };

    let valStr = '';
    if (clause.operator === 'between' || clause.operator === 'date_between') {
      valStr = `${clause.value || '...'} - ${clause.valueSecondary || '...'}`;
    } else if (Array.isArray(clause.value)) {
      valStr = clause.value.map(resolveItem).join(', ');
    } else {
      valStr = resolveItem(clause.value);
    }

    return `${fieldLabel} ${opLabel} ${valStr}`;
  };

  // Outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openCreateModal = () => {
    setEditingView(null);
    setFormName('');
    setFormDescription('');
    setFormIcon('Bookmark');
    setFormColor('#6366f1');
    setFormIsShared(false);
    setFormIsDefault(false);
    setIsSaveModalOpen(true);
    setIsDropdownOpen(false);
  };

  const openEditModal = (view: SavedViewEntity, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingView(view);
    setFormName(view.name);
    setFormDescription(view.description || '');
    setFormIcon(view.icon || 'Bookmark');
    setFormColor(view.color || '#6366f1');
    setFormIsShared(view.isShared);
    setFormIsDefault(view.isDefault);
    setIsSaveModalOpen(true);
    setIsDropdownOpen(false);
  };

  const handleSaveViewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !tenantId) return;

    setIsSaving(true);
    try {
      const payload: Partial<SavedViewEntity> = {
        id: editingView?.id,
        name: formName.trim(),
        description: formDescription.trim() || null,
        icon: formIcon,
        color: formColor,
        scopeType,
        scopeId,
        filterState: activeFilterState,
        isShared: formIsShared,
        isDefault: formIsDefault,
        userId: currentUserId || null
      };

      const saved = await saveSavedView(payload, tenantId, token);
      
      setViews(prev => {
        const filtered = prev.filter(v => v.id !== saved.id);
        if (saved.isDefault) {
          // Unset default on other views in local state
          return [saved, ...filtered.map(v => ({ ...v, isDefault: false }))];
        }
        return [saved, ...filtered];
      });

      setActiveView(saved);
      toast.success(editingView ? `Updated "${saved.name}"` : `Saved view "${saved.name}"`);
      setIsSaveModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save view');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickUpdateActiveView = async () => {
    if (!activeView || !tenantId) return;
    try {
      const updated = await saveSavedView({
        ...activeView,
        filterState: activeFilterState
      }, tenantId, token);

      setViews(prev => prev.map(v => v.id === updated.id ? updated : v));
      setActiveView(updated);
      toast.success(`Updated "${updated.name}" with current filters`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update view');
    }
  };

  const handleDeleteView = async (viewId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!tenantId) return;
    if (!confirm('Are you sure you want to delete this saved view?')) return;

    try {
      await deleteSavedView(viewId, tenantId, token);
      setViews(prev => prev.filter(v => v.id !== viewId));
      if (activeView?.id === viewId) {
        setActiveView(null);
      }
      toast.success('Saved view deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete view');
    }
  };

  const handleToggleDefault = async (view: SavedViewEntity, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!tenantId) return;

    const nextDefault = !view.isDefault;
    try {
      const updated = await setDefaultSavedView(view.id, nextDefault, tenantId, token);
      setViews(prev => prev.map(v => ({
        ...v,
        isDefault: v.id === updated.id ? updated.isDefault : (nextDefault ? false : v.isDefault)
      })));
      if (activeView?.id === view.id) {
        setActiveView(prev => prev ? { ...prev, isDefault: nextDefault } : null);
      }
      toast.success(nextDefault ? `Set "${view.name}" as default` : `Removed default from "${view.name}"`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update default');
    }
  };

  const handleSelectView = (view: SavedViewEntity | null) => {
    setActiveView(view);
    setIsDropdownOpen(false);
    if (view) {
      onApplyView(view, view.filterState);
      toast.success(`Applied view: ${view.name}`);
    } else {
      onApplyView(null, { matchType: 'and', clauses: [] });
      toast.success('Reset to all records');
    }
  };

  const filteredViews = useMemo(() => {
    if (!searchView.trim()) return views;
    const q = searchView.toLowerCase();
    return views.filter(v => v.name.toLowerCase().includes(q) || v.description?.toLowerCase().includes(q));
  }, [views, searchView]);

  const myViews = filteredViews.filter(v => !v.isShared);
  const teamViews = filteredViews.filter(v => v.isShared);

  return (
    <div className={cn("relative inline-flex items-center gap-1.5", className)}>
      {/* Active View Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs select-none",
          activeView
            ? "bg-white dark:bg-zinc-800/90 border-indigo-300 dark:border-indigo-700/60 text-zinc-900 dark:text-zinc-100"
            : "bg-white/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700"
        )}
      >
        <Bookmark size={13} className={activeView ? "text-indigo-600 dark:text-indigo-400 fill-indigo-600/20" : "text-zinc-400"} />
        <span className="max-w-[130px] truncate">
          {activeView ? activeView.name : 'All Records'}
        </span>
        {activeView?.isDefault && (
          <span title="Default View" className="shrink-0 flex items-center">
            <Star size={10} className="text-amber-500 fill-amber-500" />
          </span>
        )}
        {activeView?.isShared && (
          <span title="Shared with team" className="shrink-0 flex items-center">
            <Share2 size={10} className="text-indigo-500 opacity-75" />
          </span>
        )}
        {isModified && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" title="View modified with new filters" />
        )}
        <ChevronDown size={12} className="text-zinc-400 opacity-80 shrink-0" />
      </button>

      {/* Quick Action when Modified */}
      {isModified && (
        <div className="flex items-center gap-1">
          {activeView ? (
            <button
              type="button"
              onClick={handleQuickUpdateActiveView}
              className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/80 transition-colors shadow-2xs"
              title="Save modified filters to current view"
            >
              Update View
            </button>
          ) : (
            <button
              type="button"
              onClick={openCreateModal}
              className="px-2 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold hover:bg-indigo-700 transition-colors shadow-xs"
              title="Save active filters as a reusable view"
            >
              Save View
            </button>
          )}
        </div>
      )}

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 mt-1.5 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-2 z-[9999] flex flex-col gap-1 text-xs animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Search Box */}
          {views.length > 4 && (
            <div className="relative px-1 pt-1 pb-1">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search saved views..."
                value={searchView}
                onChange={(e) => setSearchView(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-7 pr-2.5 py-1 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <div className="max-h-64 overflow-y-auto custom-scrollbar flex flex-col gap-1">
            {/* Standard "All Records" Item */}
            <button
              type="button"
              onClick={() => handleSelectView(null)}
              className={cn(
                "flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-colors",
                activeView === null
                  ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              )}
            >
              <div className="flex items-center gap-2 truncate">
                <Layers size={13} className="text-zinc-400" />
                <span>All Records (Default)</span>
              </div>
              {activeView === null && <Check size={13} className="text-indigo-600 dark:text-indigo-400" />}
            </button>

            {/* My Saved Views */}
            {myViews.length > 0 && (
              <div className="flex flex-col gap-0.5 mt-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-2.5 py-1">
                  My Views
                </div>
                {myViews.map(view => {
                  const isSelected = activeView?.id === view.id;
                  const clauseCount = view.filterState?.clauses?.length || 0;
                  return (
                    <div
                      key={view.id}
                      onClick={() => handleSelectView(view)}
                      className={cn(
                        "group flex items-center justify-between px-2.5 py-2 rounded-xl cursor-pointer transition-colors",
                        isSelected
                          ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold"
                          : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate flex-1 mr-2">
                        <Bookmark size={13} className={isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400"} />
                        <span className="truncate">{view.name}</span>
                        {clauseCount > 0 && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                            {clauseCount} {clauseCount === 1 ? 'filter' : 'filters'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleToggleDefault(view, e)}
                          className={cn("p-1 hover:text-amber-500 rounded", view.isDefault && "text-amber-500 opacity-100")}
                          title={view.isDefault ? "Default View" : "Set as Default"}
                        >
                          <Star size={11} className={view.isDefault ? "fill-amber-500" : ""} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => openEditModal(view, e)}
                          className="p-1 hover:text-indigo-500 rounded"
                          title="Edit View"
                        >
                          <Edit2 size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteView(view.id, e)}
                          className="p-1 hover:text-red-500 rounded"
                          title="Delete View"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Team Saved Views */}
            {teamViews.length > 0 && (
              <div className="flex flex-col gap-0.5 mt-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-2.5 py-1 flex items-center justify-between">
                  <span>Team Views</span>
                  <Share2 size={10} className="text-zinc-400" />
                </div>
                {teamViews.map(view => {
                  const isSelected = activeView?.id === view.id;
                  const clauseCount = view.filterState?.clauses?.length || 0;
                  return (
                    <div
                      key={view.id}
                      onClick={() => handleSelectView(view)}
                      className={cn(
                        "group flex items-center justify-between px-2.5 py-2 rounded-xl cursor-pointer transition-colors",
                        isSelected
                          ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold"
                          : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate flex-1 mr-2">
                        <Share2 size={13} className={isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-indigo-400/70"} />
                        <span className="truncate">{view.name}</span>
                        {clauseCount > 0 && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                            {clauseCount} {clauseCount === 1 ? 'filter' : 'filters'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleToggleDefault(view, e)}
                          className={cn("p-1 hover:text-amber-500 rounded", view.isDefault && "text-amber-500 opacity-100")}
                          title={view.isDefault ? "Default View" : "Set as Default"}
                        >
                          <Star size={11} className={view.isDefault ? "fill-amber-500" : ""} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => openEditModal(view, e)}
                          className="p-1 hover:text-indigo-500 rounded"
                          title="Edit View"
                        >
                          <Edit2 size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteView(view.id, e)}
                          className="p-1 hover:text-red-500 rounded"
                          title="Delete View"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* "+ Save Current View" Button */}
          <div className="border-t border-zinc-150 dark:border-zinc-800 pt-1 mt-1">
            <button
              type="button"
              onClick={openCreateModal}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold transition-colors shadow-2xs"
            >
              <Plus size={13} />
              <span>Save Current View</span>
            </button>
          </div>
        </div>
      )}

      {/* Save / Edit View Modal */}
      {isSaveModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isSaving && setIsSaveModalOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 flex flex-col gap-4 text-xs z-10"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Bookmark size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
                    {editingView ? 'Edit Saved View' : 'Save Custom Filter View'}
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Persist your active filter configuration for instant reuse.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveViewSubmit} className="flex flex-col gap-3.5">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1 block">
                  View Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="e.g. High Value Deals, Urgent Open"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1 block">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Filtered by deals above $100k"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Active Filter Summary Preview */}
              <div className="p-3 bg-zinc-100/90 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  <span>Included Filters</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                    Match: {activeFilterState.matchType.toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeFilterState.clauses.map(c => (
                    <span
                      key={c.id}
                      className="px-2.5 py-1 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-750 text-[11px] font-medium text-zinc-800 dark:text-zinc-200 shadow-2xs"
                    >
                      {resolveClauseDisplay(c)}
                    </span>
                  ))}
                  {activeFilterState.clauses.length === 0 && (
                    <span className="text-zinc-400 italic text-[11px]">No active filter clauses (All records)</span>
                  )}
                </div>
              </div>

              {/* Checkbox Options */}
              <div className="flex flex-col gap-2 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formIsShared}
                    onChange={(e) => setFormIsShared(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex flex-col">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">Share with team</span>
                    <span className="text-[10px] text-zinc-400">Visible to all workspace members in this tenant</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formIsDefault}
                    onChange={(e) => setFormIsDefault(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex flex-col">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">Set as default view</span>
                    <span className="text-[10px] text-zinc-400">Automatically applied when opening this module or queue</span>
                  </div>
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-2.5 pt-3 border-t border-zinc-150 dark:border-zinc-800 mt-1">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  disabled={isSaving}
                  className="flex-1 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !formName.trim()}
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors shadow-md disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingView ? 'Update View' : 'Save View'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
};
