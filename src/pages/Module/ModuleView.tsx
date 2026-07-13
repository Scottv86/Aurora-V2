import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { RecordDetailView } from '../Record/RecordDetailView';
import { createPortal } from 'react-dom';
import { Table } from '../../components/UI/Table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  motion, 
  AnimatePresence 
} from 'motion/react';
import { 
  Plus, 
  Trash2,
  Search,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  AreaChart, Area
} from 'recharts';
import L from 'leaflet';
import * as LucideIcons from 'lucide-react';
import { toast } from 'sonner';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { DATA_API_URL, API_BASE_URL } from '../../config';
import { FieldInput } from '../../components/FieldInput';
import { Skeleton } from '../../components/UI/Skeleton';
import { generateAISummary, evaluateCalculations } from '../../services/aiService';
import { fetchModule, fetchRecords } from '../../services/dataService';
import { cn, isFieldVisible, flattenFields, getFieldValue, checkCondition, evaluateExpression, evaluateFormula, slugify } from '../../lib/utils';
import { validateRecordRules } from '../../lib/validationEngine';
import { Module, ModuleField } from '../../types/platform';
import { calculateDefaultValue } from '../../services/fieldService';
import { CollapsibleFieldGroup } from '../../components/UI/CollapsibleFieldGroup';
import { RepeatableGroupBlock } from '../../components/Platform/RepeatableGroupBlock';
import { DynamicIcon } from '../../components/UI/DynamicIcon';
import { useModalStack } from '../../context/ModalStackContext';

const InlineAssigneeCell = ({
  record,
  members = [],
  platformUser,
  updateMutation,
  inlineEditEnabled
}: {
  record: any;
  members?: any[];
  platformUser: any;
  updateMutation: any;
  inlineEditEnabled: boolean;
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [search, setSearch] = useState('');
  const [coords, setCoords] = useState<{ buttonTop: number; buttonBottom: number; left: number; width: number; openUpward: boolean; maxHeight: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const clickedInsideButton = menuRef.current && menuRef.current.contains(target);
      const clickedInsideDropdown = dropdownRef.current && dropdownRef.current.contains(target);
      if (!clickedInsideButton && !clickedInsideDropdown) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showMenu]);

  useEffect(() => {
    if (!showMenu || !buttonRef.current) return;

    const updateCoords = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      
      // Page has a sticky header (Navbar = 64px, Breadcrumbs = 40px) which totals 104px.
      // We set a safety limit of 110px to avoid overlapping with headers.
      const headerHeight = 110;
      const spaceBelow = window.innerHeight - rect.bottom - 16; // 16px safety margin at bottom
      const spaceAbove = rect.top - headerHeight;
      const dropdownHeight = 240; // max dropdown height (max-h-60)
      
      let openUp = false;
      let maxHeight = dropdownHeight;

      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow && spaceAbove >= 120) {
        openUp = true;
        maxHeight = Math.min(dropdownHeight, spaceAbove - 10);
      } else {
        openUp = false;
        maxHeight = Math.max(120, Math.min(dropdownHeight, spaceBelow - 10));
      }
      
      setCoords({
        buttonTop: rect.top,
        buttonBottom: rect.bottom,
        left: rect.left,
        width: Math.max(rect.width, 224), // w-56 is 224px
        openUpward: openUp,
        maxHeight
      });
    };

    updateCoords();
    
    window.addEventListener('scroll', updateCoords, true);
    window.addEventListener('resize', updateCoords);
    
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [showMenu]);

  const val = record.assigneeId;
  const resolvedUser = members?.find((m: any) => m.id === val);

  if (!inlineEditEnabled) {
    if (resolvedUser) {
      return (
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-800",
            resolvedUser.isSynthetic 
              ? "bg-indigo-50/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400" 
              : "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-400"
          )}>
            {resolvedUser.avatarUrl ? (
              <img src={resolvedUser.avatarUrl} alt={resolvedUser.name} className="w-full h-full object-cover" />
            ) : (
              resolvedUser.isSynthetic ? <LucideIcons.Bot size={12} /> : <LucideIcons.User size={12} />
            )}
          </div>
          <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
            {resolvedUser.name}
          </span>
        </div>
      );
    }
    return <span className="text-zinc-400 dark:text-zinc-600">-</span>;
  }

  const handleUpdate = (newId: string | null) => {
    updateMutation.mutate({
      recordId: record.id,
      data: { assigneeId: newId }
    });
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className={cn(
          "flex items-center gap-2 px-2 py-1 rounded-xl transition-all border text-left group",
          showMenu 
            ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500/50 text-indigo-900 dark:text-indigo-100" 
            : "bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/50 dark:hover:bg-zinc-800 border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700 text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
        )}
      >
        {resolvedUser ? (
          <>
            <div className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-800",
              resolvedUser.isSynthetic 
                ? "bg-indigo-50/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400" 
                : "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-400"
            )}>
              {resolvedUser.avatarUrl ? (
                <img src={resolvedUser.avatarUrl} alt={resolvedUser.name} className="w-full h-full object-cover" />
              ) : (
                resolvedUser.isSynthetic ? <LucideIcons.Bot size={10} /> : <LucideIcons.User size={10} />
              )}
            </div>
            <span className="text-[11px] font-bold truncate max-w-[80px]">
              {resolvedUser.name}
            </span>
          </>
        ) : (
          <>
            <div className="w-5 h-5 rounded-full border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-400 dark:text-zinc-500 group-hover:text-indigo-500 group-hover:border-indigo-500 transition-colors">
              <LucideIcons.User size={10} />
            </div>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-bold group-hover:text-zinc-900 dark:group-hover:text-zinc-300 transition-colors">
              Unassigned
            </span>
          </>
        )}
        <LucideIcons.ChevronDown size={12} className="text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors shrink-0" />
      </button>

      {createPortal(
        <AnimatePresence>
          {showMenu && coords && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: coords.openUpward ? -4 : 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: coords.openUpward ? -4 : 4, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'fixed',
                left: `${Math.max(16, Math.min(coords.left, window.innerWidth - coords.width - 16))}px`,
                width: `${coords.width}px`,
                zIndex: 99999,
                maxHeight: `${coords.maxHeight}px`,
                ...(coords.openUpward 
                  ? { bottom: `${window.innerHeight - coords.buttonTop + 4}px` } 
                  : { top: `${coords.buttonBottom + 4}px` })
              }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden flex flex-col"
            >
              {/* Quick Actions */}
              <div className="p-1 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 flex flex-col gap-0.5">
                <button
                  onClick={() => {
                    const me = members.find(m => m.id === platformUser?.memberId || m.id === platformUser?.cuid);
                    if (me) handleUpdate(me.id);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-2 py-1 rounded-lg text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 transition-colors flex items-center gap-2"
                >
                  <LucideIcons.UserCheck size={10} />
                  <span>Assign to me</span>
                </button>
                <button
                  onClick={() => {
                    handleUpdate(null);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-2 py-1 rounded-lg text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2"
                >
                  <LucideIcons.UserMinus size={10} />
                  <span>Clear Assignee</span>
                </button>
              </div>

              {/* Search Input */}
              <div className="p-1 border-b border-zinc-100 dark:border-zinc-800 relative">
                <LucideIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={10} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-7 pr-2 py-1 text-[10px] text-zinc-900 dark:text-zinc-300 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Members List */}
              <div className="flex-1 overflow-y-auto p-1 space-y-0.5 max-h-36 scrollbar-thin">
                {(members || [])
                  .filter(m => !m.isSynthetic && m.name.toLowerCase().includes(search.toLowerCase()))
                  .map(member => {
                    const isSelected = val === member.id;
                    return (
                      <button
                        key={member.id}
                        onClick={() => {
                          handleUpdate(member.id);
                          setShowMenu(false);
                        }}
                        className={cn(
                          "w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                          isSelected ? "bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 font-semibold" : "text-zinc-700 dark:text-zinc-300"
                        )}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {member.avatarUrl ? (
                            <img src={member.avatarUrl} alt={member.name} className="w-4 h-4 rounded-full object-cover" />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center text-[8px] font-bold">
                              {member.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                          )}
                          <span className="truncate">{member.name}</span>
                        </div>
                        {isSelected && <LucideIcons.Check size={10} className="text-indigo-500 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                {(members || []).filter(m => !m.isSynthetic && m.name.toLowerCase().includes(search.toLowerCase())).length === 0 && (
                  <p className="text-[9px] text-zinc-400 text-center py-2 italic font-medium">No members found</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export const ModuleView = () => {
  const { moduleId: moduleIdRaw } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queueIdRaw = searchParams.get('queueId');
  const { session, user } = useAuth();
  const { tenant, isLoading: platformLoading, modules, members, user: platformUser, menuConfig } = usePlatform();

  const moduleId = useMemo(() => {
    if (!moduleIdRaw || !modules) return moduleIdRaw || '';
    const matchedMod = modules.find(
      (m: any) => m.type !== 'PAGE' && (slugify(m.name) === moduleIdRaw || m.name.toLowerCase() === moduleIdRaw.toLowerCase())
    );
    return matchedMod ? matchedMod.id : moduleIdRaw;
  }, [moduleIdRaw, modules]);
  
  const activeQueue = useMemo(() => {
    if (!menuConfig?.sections || !queueIdRaw) return null;

    const findItem = (items: any[]): any => {
      for (const item of items) {
        if (item.id === queueIdRaw || slugify(item.label) === queueIdRaw || item.label.toLowerCase() === queueIdRaw.toLowerCase()) return item;
        if (item.children) {
          const found = findItem(item.children);
          if (found) return found;
        }
      }
      return null;
    };

    for (const section of menuConfig.sections) {
      const found = findItem(section.items || []);
      if (found) return found;
    }
    return null;
  }, [menuConfig, queueIdRaw]);

  const queueId = useMemo(() => {
    return activeQueue ? activeQueue.id : queueIdRaw;
  }, [activeQueue, queueIdRaw]);

  useModalStack();
  const [moduleData, setModuleData] = useState<Module | null>(null);
  const [records, setRecords] = useState<Record<string, any>[]>([]);
  // Use TanStack Query states instead
  // const [loading, setLoading] = useState(true);
  // const [recordsLoading, setRecordsLoading] = useState(true);
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [newEntryData, setNewEntryData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = useMemo(() => {
    return (moduleData as any)?.interfaceSettings?.master?.pagination?.pageSize || 25;
  }, [moduleData]);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [activeQuickAction, setActiveQuickAction] = useState<any | null>(null);
  const [showQuickActionModal, setShowQuickActionModal] = useState(false);
  const [actionFormData, setActionFormData] = useState<Record<string, any>>({});
  const [actionFormErrors, setActionFormErrors] = useState<Record<string, string>>({});
  const [actionForm, setActionForm] = useState<any | null>(null);
  const [actionStepId, setActionStepId] = useState<string | null>(null);

  const createForm = useMemo(() => {
    const forms = (moduleData as any)?.forms || [];
    const found = forms.find((f: any) => f.usage === 'workspace_create');
    if (found) return found;
    if (forms.length === 1 && (!forms[0].usage || forms[0].usage === 'undefined' || forms[0].usage === 'workspace_create')) {
      return forms[0];
    }
    return null;
  }, [moduleData]);

  const visibilityContext = useMemo(() => {
    return {
      user: platformUser || user,
      tenant,
      session
    };
  }, [platformUser, user, tenant, session]);

  const visibleTabs = useMemo(() => {
    if (!moduleData?.tabs) return [];
    return moduleData.tabs.filter(tab => isFieldVisible(tab, newEntryData, visibilityContext));
  }, [moduleData?.tabs, newEntryData, visibilityContext]);

  useEffect(() => {
    if (visibleTabs.length > 0 && (!activeTabId || !visibleTabs.find(t => t.id === activeTabId))) {
      setActiveTabId(visibleTabs[0].id);
    }
  }, [visibleTabs, activeTabId]);

  const Icon = useMemo(() => {
    if (!moduleData) return LucideIcons.Layers;
    const iconSource = (moduleData as any).iconName || (moduleData as any).icon;
    
    if (typeof iconSource === 'string' && iconSource.trim() !== '') {
      return (LucideIcons as any)[iconSource] || LucideIcons.Layers;
    }
    
    if (typeof iconSource === 'function' || (typeof iconSource === 'object' && iconSource !== null && (iconSource as any).$$typeof)) {
      return iconSource;
    }
    
    return LucideIcons.Layers;
  }, [moduleData]);

  const allFields = useMemo(() => {
    return flattenFields(moduleData?.layout || []) as ModuleField[];
  }, [moduleData]);

  const displayFields = useMemo(() => {
    return allFields.filter((f: ModuleField) => 
      !['heading', 'divider', 'spacer', 'alert', 'fieldGroup', 'repeatableGroup', 'group', 'card', 'accordion', 'tabs_nested', 'stepper', 'timeline'].includes(f.type)
    );
  }, [allFields]);

  const fieldToGroupMap = useMemo(() => {
    const map: Record<string, string> = {};
    const containerTypes = ['fieldGroup', 'group', 'card', 'accordion', 'tabs_nested', 'stepper', 'timeline'];
    
    const processFields = (fields: any[], parentId?: string) => {
      fields.forEach((f: any) => {
        if (parentId) {
          map[f.id] = parentId;
        }
        if (containerTypes.includes(f.type) && f.fields) {
          processFields(f.fields, f.id);
        }
      });
    };
    
    processFields(moduleData?.layout || []);
    return map;
  }, [moduleData]);

  const queryClient = useQueryClient();
  const { data: moduleResult, isLoading: moduleQueryLoading, error: moduleError } = useQuery({
    queryKey: ['module', tenant?.id, moduleId],
    queryFn: async () => {
      if (!tenant?.id || !moduleId) return null;
      const token = (import.meta as any).env.VITE_DEV_TOKEN || (session as any)?.access_token;
      return fetchModule(moduleId, tenant.id, token, modules);
    },
    enabled: !!tenant?.id && !!moduleId && !platformLoading && (!!session?.access_token || !!(import.meta as any).env.VITE_DEV_TOKEN)
  });

  const { data: recordsResult, isLoading: recordsQueryLoading } = useQuery({
    queryKey: ['records', tenant?.id, moduleId, queueId ? 'all' : page, queueId ? 2000 : pageSize],
    queryFn: async () => {
      if (!tenant?.id || !moduleId) return null;
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      return fetchRecords(moduleId, tenant.id, token, queueId ? 1 : page, queueId ? 2000 : pageSize);
    },
    enabled: !!tenant?.id && !!moduleId && !platformLoading && (!!session?.access_token || !!(import.meta as any).env.VITE_DEV_TOKEN)
  });

  // Clear data when moduleId changes to prevent stale UI
  useEffect(() => {
    setModuleData(null);
    setRecords([]);
    setPage(1);
  }, [moduleId]);

  useEffect(() => {
    if (moduleResult) setModuleData(moduleResult);
  }, [moduleResult]);

  useEffect(() => {
    if (recordsResult) {
      setRecords(recordsResult.records);
      if (!queueId) {
        setTotalRecords(recordsResult.total);
        setTotalPages(recordsResult.totalPages);
      }
    }
  }, [recordsResult, queueId]);

  // Combined loading state for progressive rendering
  const isSessionReady = !!session?.access_token || !!(import.meta as any).env.VITE_DEV_TOKEN;
  const loading = moduleQueryLoading || !isSessionReady;
  const recordsLoading = recordsQueryLoading;

  const createMutation = useMutation({
    mutationFn: async (finalData: any) => {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${DATA_API_URL}/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify({
          moduleId: moduleId,
          ...finalData
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save record');
      }

      return res.json();
    },
    onSuccess: (savedRecord) => {
      queryClient.invalidateQueries({ queryKey: ['records', tenant?.id, moduleId] });
      
      const queryKey = ['records', tenant?.id, moduleId, page, pageSize];
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          records: [savedRecord, ...old.records.filter((r: any) => r.id !== savedRecord.id)],
          total: old.total + 1,
          totalPages: Math.ceil((old.total + 1) / pageSize)
        };
      });

      setRecords(prev => {
        if (prev.some(r => r.id === savedRecord.id)) return prev;
        return [savedRecord, ...prev];
      });
      setTotalRecords(t => t + 1);

      toast.success("Record created successfully");
      setShowNewEntryModal(false);
      setNewEntryData({});
    },
    onError: (error: any) => {
      console.error("Save Error:", error);
      toast.error(error.message || (editingRecord ? "Failed to update record" : "Failed to create record"));
    }
  });

  const handleSubmitQuickAction = async () => {
    if (!tenant?.id || !moduleId || !actionForm) return;

    setIsSubmitting(true);
    try {
      const allFormFields = actionForm.isMultistep 
        ? (actionForm.steps || []).flatMap((s: any) => s.fields || [])
        : (actionForm.fields || []);

      let hasErrors = false;
      const errors: Record<string, string> = {};
      allFormFields.forEach((fObj: any) => {
        if (fObj.id.startsWith('visual-')) return;
        if (!isFieldVisible(fObj, actionFormData, visibilityContext)) return;
        const field = allFields.find(f => f.id === fObj.id);
        const isRequired = fObj.required || field?.required;
        const value = actionFormData[fObj.id];
        if (isRequired && (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0))) {
          hasErrors = true;
          errors[fObj.id] = 'This field is required';
        }
      });

      if (hasErrors) {
        setActionFormErrors(errors);
        toast.error('Please fill in all required fields.');
        setIsSubmitting(false);
        return;
      }

      let finalData = evaluateCalculations(actionFormData, allFields);
      
      const hasAISummary = allFields.some(f => f.type === 'ai_summary');
      if (hasAISummary) {
        toast.info("Generating AI Summary...");
        const aiSummaryField = allFields.find(f => f.type === 'ai_summary');
        if (aiSummaryField) {
          finalData[aiSummaryField.id] = await generateAISummary(finalData, allFields);
        }
      }

      await createMutation.mutateAsync(finalData);
      toast.success(`Action "${activeQuickAction?.label}" completed and record created successfully!`);
      setShowQuickActionModal(false);
      setActiveQuickAction(null);
      setActionForm(null);
      setActionFormData({});
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit quick action.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateEntry = async () => {
    if (!tenant?.id || !moduleId || !moduleData) return;
    
    setIsSubmitting(true);
    try {
      let finalData = evaluateCalculations(newEntryData, allFields);

      // Validate required fields in custom create form if present
      if (createForm) {
        const allFormFields = createForm.isMultistep 
          ? (createForm.steps || []).flatMap((s: any) => s.fields || [])
          : (createForm.fields || []);
        
        let hasErrors = false;
        allFormFields.forEach((fObj: any) => {
          if (fObj.id.startsWith('visual-')) return;
          if (!isFieldVisible(fObj, finalData, visibilityContext)) return;
          const field = allFields.find(f => f.id === fObj.id);
          const isRequired = fObj.required || field?.required;
          const value = finalData[fObj.id];
          if (isRequired && (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0))) {
            hasErrors = true;
          }
        });
        if (hasErrors) {
          toast.error('Please fill in all required fields.');
          setIsSubmitting(false);
          return;
        }
      }
      
      // Validate business validation rules before saving
      const rules = moduleData?.config?.validationRules || (moduleData as any)?.validationRules || [];
      const validationErrors = validateRecordRules(finalData, rules, allFields);
      if (validationErrors.length > 0) {
        const hardErrors = validationErrors.filter(e => e.severity === 'error');
        const bypassableWarnings = validationErrors.filter(e => {
          const rule = rules.find((r: any) => r.id === e.ruleId);
          return e.severity === 'warning' && rule?.bypassMode === 'confirm';
        });

        if (hardErrors.length > 0) {
          const toastErrors = hardErrors.filter(e => {
            const rule = rules.find((r: any) => r.id === e.ruleId);
            return rule?.showToast !== false;
          });
          if (toastErrors.length > 0) {
            toast.error(toastErrors.map(e => e.message).join(' | '));
          }
          setIsSubmitting(false);
          return;
        }

        if (bypassableWarnings.length > 0) {
          const msg = bypassableWarnings.map(e => e.message).join('\n');
          const confirmed = window.confirm(`Validation Warnings:\n\n${msg}\n\nDo you want to save anyway?`);
          if (!confirmed) {
            setIsSubmitting(false);
            return;
          }
        }

        // Show toast alerts for silent warnings if configured
        const silentWarnings = validationErrors.filter(e => {
          const rule = rules.find((r: any) => r.id === e.ruleId);
          return e.severity === 'warning' && rule?.bypassMode !== 'confirm';
        });
        const toastWarnings = silentWarnings.filter(e => {
          const rule = rules.find((r: any) => r.id === e.ruleId);
          return rule?.showToast !== false;
        });
        if (toastWarnings.length > 0) {
          toast.warning(toastWarnings.map(e => e.message).join(' | '));
        }
      }
      
      const hasAISummary = allFields.some(f => f.type === 'ai_summary');
      if (hasAISummary) {
        toast.info("Generating AI Summary...");
        const aiSummaryField = allFields.find(f => f.type === 'ai_summary');
        if (aiSummaryField) {
          finalData[aiSummaryField.id] = await generateAISummary(finalData, allFields);
        }
      }

      await createMutation.mutateAsync(finalData);
    } catch (error: any) {
      // Error handled by mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  const evaluateAllDataPopulationRules = async (currentData: any) => {
    const rules = moduleData?.config?.dataPopulationRules || (moduleData as any)?.dataPopulationRules || [];
    if (rules.length === 0) return;

    for (const rule of rules) {
      // 1. Evaluate condition
      const condition = rule.condition || { operator: 'not_null' };
      const fieldIdToEval = rule.triggerFieldId || condition.fieldId;
      if (!fieldIdToEval) continue;

      const triggerVal = getFieldValue(currentData, fieldIdToEval);
      
      let conditionMatches = false;
      if (condition.operator === 'not_null') {
        conditionMatches = triggerVal !== null && triggerVal !== undefined && triggerVal !== '';
      } else if (condition.operator === 'equals') {
        conditionMatches = String(triggerVal) === String(condition.value);
      } else if (condition.operator === 'not_equals') {
        conditionMatches = String(triggerVal) !== String(condition.value);
      }

      if (!conditionMatches) continue;

      // 2. Gather input parameter payload
      const payload: Record<string, any> = {};
      (rule.inputMappings || []).forEach((m: any) => {
        if (m.inputName && m.sourceFieldId) {
          payload[m.inputName] = getFieldValue(currentData, m.sourceFieldId) ?? '';
        }
      });

      try {
        const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
        const res = await fetch(`${API_BASE_URL}/api/nexus-proxy/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenant?.id || ''
          },
          body: JSON.stringify({
            connectorId: rule.connectorId,
            moduleId: moduleId,
            noReshape: true,
            payload
          })
        });

        if (!res.ok) throw new Error("Connector execution failed");
        const json = await res.json();
        const rawData = json.data || json;

        if (rawData && typeof rawData === 'object') {
          // Apply output mappings
          setNewEntryData(prev => {
            const updatedData = { ...prev };
            let changed = false;

            (rule.outputMappings || []).forEach((m: any) => {
              if (m.targetFieldId && m.sourceFieldId) {
                const val = rawData[m.sourceFieldId];
                if (val !== undefined && getFieldValue(updatedData, m.targetFieldId) !== val) {
                  const targetGroupId = fieldToGroupMap[m.targetFieldId];
                  if (targetGroupId) {
                    updatedData[targetGroupId] = {
                      ...(updatedData[targetGroupId] || {}),
                      [m.targetFieldId]: val
                    };
                  } else {
                    updatedData[m.targetFieldId] = val;
                  }
                  changed = true;
                }
              }
            });

            return changed ? updatedData : prev;
          });
        }
      } catch (err) {
        console.error("Failed to run data population rule on load:", err);
      }
    }
  };

  const evaluateDataPopulationRules = async (changedFieldId: string, currentData: any) => {
    const rules = moduleData?.config?.dataPopulationRules || (moduleData as any)?.dataPopulationRules || [];
    const visibilityContext = { user };

    const isRuleTriggeredByField = (rule: any, fieldId: string): boolean => {
      if (rule.triggerFieldId === fieldId) return true;
      if ((rule.triggerMode || 'visual') === 'visual' && rule.condition) {
        const extractFields = (c: any): string[] => {
          if (!c) return [];
          if (c.type === 'rule') {
            const list = [];
            if (c.fieldId && c.fieldType === 'field') list.push(c.fieldId);
            if (c.value && c.valueType === 'field') list.push(c.value);
            return list;
          }
          if (c.type === 'group') {
            return (c.rules || []).flatMap(extractFields);
          }
          if (c.fieldId) return [c.fieldId];
          return [];
        };
        return extractFields(rule.condition).includes(fieldId);
      }
      if (rule.triggerMode === 'expression' && rule.conditionExpression) {
        const regex = new RegExp(`\\{\\s*${fieldId}\\s*\\}`, 'i');
        return regex.test(rule.conditionExpression);
      }
      return false;
    };

    const matchingRules = rules.filter((r: any) => isRuleTriggeredByField(r, changedFieldId));
    
    if (matchingRules.length === 0) return;

    for (const rule of matchingRules) {
      // 1. Evaluate condition
      let conditionMatches = false;
      if ((rule.triggerMode || 'visual') === 'visual') {
        if (rule.condition) {
          conditionMatches = checkCondition(rule.condition, currentData, visibilityContext);
        } else if (rule.triggerFieldId) {
          const triggerVal = getFieldValue(currentData, rule.triggerFieldId);
          conditionMatches = triggerVal !== null && triggerVal !== undefined && triggerVal !== '';
        } else {
          conditionMatches = true;
        }
      } else if (rule.triggerMode === 'expression' && rule.conditionExpression) {
        try {
          const result = evaluateFormula(rule.conditionExpression, currentData);
          conditionMatches = (result as any) === true || String(result).toLowerCase() === 'true';
        } catch (e) {
          console.error("Trigger expression evaluation error:", e);
          conditionMatches = false;
        }
      } else {
        conditionMatches = true;
      }

      if (!conditionMatches) continue;

      // 2. Gather input parameter payload
      const payload: Record<string, any> = {};
      (rule.inputMappings || []).forEach((m: any) => {
        if (m.inputName) {
          if (m.mappingType === 'expression' && m.expression) {
            payload[m.inputName] = evaluateExpression(m.expression, currentData, visibilityContext);
          } else if (m.sourceFieldId) {
            payload[m.inputName] = getFieldValue(currentData, m.sourceFieldId) ?? '';
          }
        }
      });

      try {
        const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
        const res = await fetch(`${API_BASE_URL}/api/nexus-proxy/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenant?.id || ''
          },
          body: JSON.stringify({
            connectorId: rule.connectorId,
            moduleId: moduleId,
            noReshape: true,
            payload
          })
        });

        if (!res.ok) throw new Error("Connector execution failed");
        const json = await res.json();
        const rawData = json.data || json;

        if (rawData && typeof rawData === 'object') {
          // Apply output mappings
          setNewEntryData(prev => {
            const updatedData = { ...prev };
            let changed = false;

            (rule.outputMappings || []).forEach((m: any) => {
              if (m.targetFieldId && m.sourceFieldId) {
                const val = rawData[m.sourceFieldId];
                if (val !== undefined) {
                  const targetField = allFields.find(f => f.id === m.targetFieldId);
                  let finalVal = val;
                  if (targetField && targetField.type === 'repeatableGroup' && Array.isArray(val)) {
                    const childFields = targetField.fields || [];
                    finalVal = val.map((item: any) => {
                      const mappedItem: Record<string, any> = {};
                      childFields.forEach((cf: any) => {
                        const sourceVal = item[cf.name] !== undefined ? item[cf.name]
                                       : item[cf.label] !== undefined ? item[cf.label]
                                       : item[cf.id];
                        if (sourceVal !== undefined) {
                          mappedItem[cf.id] = sourceVal;
                        }
                      });
                      return mappedItem;
                    });
                  }
                  
                  const targetGroupId = fieldToGroupMap[m.targetFieldId];
                  if (targetGroupId) {
                    updatedData[targetGroupId] = {
                      ...(updatedData[targetGroupId] || {}),
                      [m.targetFieldId]: finalVal
                    };
                  } else {
                    updatedData[m.targetFieldId] = finalVal;
                  }
                  changed = true;
                }
              }
            });

            return changed ? updatedData : prev;
          });
        }
      } catch (err) {
        console.error("Failed to run data population rule:", err);
      }
    }
  };

  const handleFieldChange = (fieldId: string, val: any, metadata?: any) => {
    let finalData: any;
    
    setNewEntryData(prev => {
      let updatedData = { ...prev };
      
      const groupId = fieldToGroupMap[fieldId];
      if (groupId) {
        updatedData[groupId] = { ...(prev[groupId] || {}), [fieldId]: val };
      } else {
        updatedData[fieldId] = val;
      }
      
      // Execute Lookup Output Mappings
      const field = allFields.find(f => f.id === fieldId);
      if ((field?.type === 'lookup' || field?.lookupSource === 'connector') && field.lookupOutputMappings?.length) {
        // ONLY clear and populate if the lookup value itself has changed.
        if (val !== prev[fieldId]) {
          // First, null out all target fields to clear any previously mapped values
          field.lookupOutputMappings.forEach(mapping => {
            if (mapping.targetFieldId) {
              const targetFieldId = mapping.targetFieldId;
              const targetGroupId = fieldToGroupMap[targetFieldId];
              
              if (targetGroupId) {
                updatedData[targetGroupId] = { 
                  ...(updatedData[targetGroupId] || {}), 
                  [targetFieldId]: null 
                };
              } else {
                updatedData[targetFieldId] = null;
              }
            }
          });

          // Then, map the new values from metadata if available
          if (metadata && typeof metadata === 'object') {
            field.lookupOutputMappings.forEach(mapping => {
              if (mapping.sourceFieldId && mapping.targetFieldId) {
                const sourceValue = metadata[mapping.sourceFieldId];
                if (sourceValue !== undefined) {
                  const targetFieldId = mapping.targetFieldId;
                  const targetGroupId = fieldToGroupMap[targetFieldId];
                  
                  if (targetGroupId) {
                    updatedData[targetGroupId] = { 
                      ...(updatedData[targetGroupId] || {}), 
                      [targetFieldId]: sourceValue 
                    };
                  } else {
                    updatedData[targetFieldId] = sourceValue;
                  }
                }
              }
            });
          }
        }
      }
      
      // Re-calculate dynamic defaults that might depend on this field
      allFields.forEach(f => {
        if (f.id !== fieldId && f.defaultType === 'field_copy' && f.defaultSourceFieldId === fieldId) {
          const currentVal = getFieldValue(updatedData, f.id);
          const oldDefault = calculateDefaultValue(f, prev);
          
          // Only overwrite if it was empty or matched the previous default
          if (!currentVal || currentVal === oldDefault) {
            const defaultVal = calculateDefaultValue(f, updatedData);
            const targetGroupId = fieldToGroupMap[f.id];
            if (targetGroupId) {
              updatedData[targetGroupId] = {
                ...(updatedData[targetGroupId] || {}),
                [f.id]: defaultVal
              };
            } else {
              updatedData[f.id] = defaultVal;
            }
          }
        }
      });
      
      finalData = updatedData;
      return updatedData;
    });

    if (finalData) {
      evaluateDataPopulationRules(fieldId, finalData);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarViewMode, setCalendarViewMode] = useState<'year' | 'month' | 'week' | 'day'>('month');
  const [activeDetailRecordId, setActiveDetailRecordId] = useState<string | null>(null);
  const [cardImgIndices, setCardImgIndices] = useState<Record<string, number>>({});

  const interfaceSettings = useMemo(() => {
    return (moduleData as any)?.interfaceSettings || {
      master: {
        layoutType: 'table',
        density: 'standard',
        pagination: { enabled: true, pageSize: 25 }
      },
      detail: {
        layoutType: 'tabs'
      },
    };
  }, [moduleData]);

  const getRecordTitle = useCallback((r: any) => {
    if (!r) return 'Untitled';
    const fieldId = moduleData?.config?.titleFieldId || (moduleData as any)?.titleFieldId;
    if (fieldId) {
      if (fieldId === 'createdAt') {
        return r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Just now';
      }
      if (fieldId === 'createdBy') {
        return r.createdBy || 'System';
      }
      if (fieldId === '_record_key') {
        return r._record_key || r.id;
      }
      const f = allFields.find(field => field.id === fieldId);
      const val = getFieldValue(r, fieldId, f?.name);
      if (val) return String(val);
    }
    if (displayFields[0]) {
      const val = getFieldValue(r, displayFields[0].id, displayFields[0].name);
      if (val) return String(val);
    }
    return r.title || r.name || r._record_key || r.id || 'Untitled';
  }, [moduleData, allFields, displayFields]);

  const handleRecordClick = (recordId: string) => {
    const detailViewMode = interfaceSettings.master.detailViewMode || 'page';
    if (detailViewMode === 'modal') {
      setActiveDetailRecordId(recordId);
    } else {
      navigate(`/workspace/modules/${moduleIdRaw}/records/${recordId}`);
    }
  };

  const filteredRecords = useMemo(() => {
    let result = records;

    // Apply Queue conditions
    if (activeQueue?.queueConfig?.conditions) {
      result = result.filter(record => 
        checkCondition(activeQueue.queueConfig.conditions, record, visibilityContext)
      );
    }

    if (!searchQuery.trim()) return result;
    const query = searchQuery.toLowerCase();
    return result.filter(record => {
      return Object.entries(record).some(([key, val]) => {
        if (key.startsWith('_') || val === null || val === undefined) return false;
        if (typeof val === 'object') return false;
        return String(val).toLowerCase().includes(query);
      });
    });
  }, [records, searchQuery, activeQueue, visibilityContext]);

  // Sliced records for table rendering when queue is active
  const slicedRecords = useMemo(() => {
    if (!queueId) return filteredRecords;
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page, pageSize, queueId]);

  // Keep pagination totals in sync dynamically when queue matches change
  useEffect(() => {
    if (queueId) {
      setTotalRecords(filteredRecords.length);
      setTotalPages(Math.ceil(filteredRecords.length / pageSize) || 1);
    }
  }, [filteredRecords, queueId, pageSize]);

  const updateMutation = useMutation({
    mutationFn: async ({ recordId, data }: { recordId: string; data: any }) => {
      // Validate business validation rules before saving
      const originalRecord = records.find(r => r.id === recordId) || {};
      const fullRecord = { ...originalRecord, ...data };
      const rules = moduleData?.config?.validationRules || (moduleData as any)?.validationRules || [];
      const validationErrors = validateRecordRules(fullRecord, rules, allFields);
      if (validationErrors.length > 0) {
        const hardErrors = validationErrors.filter(e => e.severity === 'error');
        const bypassableWarnings = validationErrors.filter(e => {
          const rule = rules.find((r: any) => r.id === e.ruleId);
          return e.severity === 'warning' && rule?.bypassMode === 'confirm';
        });

        if (hardErrors.length > 0) {
          const toastErrors = hardErrors.filter(e => {
            const rule = rules.find((r: any) => r.id === e.ruleId);
            return rule?.showToast !== false;
          });
          if (toastErrors.length === 0) {
            throw new Error("Silent: Validation failed");
          }
          throw new Error(toastErrors.map(e => e.message).join(' | '));
        }

        if (bypassableWarnings.length > 0) {
          const msg = bypassableWarnings.map(e => e.message).join('\n');
          const confirmed = window.confirm(`Validation Warnings:\n\n${msg}\n\nDo you want to save anyway?`);
          if (!confirmed) {
            throw new Error("Silent: Validation bypassed by user cancel");
          }
        }

        // Show toast alerts for silent warnings if configured
        const silentWarnings = validationErrors.filter(e => {
          const rule = rules.find((r: any) => r.id === e.ruleId);
          return e.severity === 'warning' && rule?.bypassMode !== 'confirm';
        });
        const toastWarnings = silentWarnings.filter(e => {
          const rule = rules.find((r: any) => r.id === e.ruleId);
          return rule?.showToast !== false;
        });
        if (toastWarnings.length > 0) {
          toast.warning(toastWarnings.map(e => e.message).join(' | '));
        }
      }

      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${DATA_API_URL}/records/${recordId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update record');
      }

      return res.json();
    },
    onMutate: async ({ recordId, data }) => {
      // Cancel any outgoing refetches for records (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['records', tenant?.id, moduleId] });

      // Snapshot the previous value
      const queryKey = ['records', tenant?.id, moduleId, page, pageSize];
      const previousRecordsData = queryClient.getQueryData(queryKey);

      // Optimistically update the React Query cache
      if (previousRecordsData) {
        queryClient.setQueryData(
          queryKey,
          (old: any) => {
            if (!old) return old;
            return {
              ...old,
              records: old.records.map((r: any) => 
                r.id === recordId ? { ...r, ...data } : r
              )
            };
          }
        );
      }

      // Also optimistically update the local component state
      setRecords(prev => 
        prev.map((r: any) => r.id === recordId ? { ...r, ...data } : r)
      );

      return { previousRecordsData, queryKey };
    },
    onError: (error: any, _variables, context: any) => {
      // Rollback to the previous state on error
      if (context?.previousRecordsData) {
        queryClient.setQueryData(context.queryKey, context.previousRecordsData);
        setRecords(context.previousRecordsData.records);
      }
      const msg = error.message || "Failed to update record";
      if (msg.startsWith("Silent:")) {
        return;
      }
      if (msg.startsWith("Warning: ")) {
        toast.warning(msg.replace("Warning: ", ""));
      } else {
        toast.error(msg);
      }
    },
    onSettled: () => {
      // Refetch in the background to ensure data sync
      queryClient.invalidateQueries({ queryKey: ['records', tenant?.id, moduleId] });
    },
    onSuccess: () => {
      toast.success("Record updated successfully");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (recordId: string) => {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || (session as any)?.access_token;
      const res = await fetch(`${DATA_API_URL}/records/${recordId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete record');
      }
      const data = await res.json();
      return { ...data, deletedRecordId: recordId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['records', tenant?.id, moduleId] });
      const deletedId = data?.deletedRecordId;
      if (deletedId) {
        const queryKey = ['records', tenant?.id, moduleId, page, pageSize];
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old) return old;
          const updatedRecords = old.records.filter((r: any) => r.id !== deletedId);
          const newTotal = Math.max(0, old.total - 1);
          return {
            ...old,
            records: updatedRecords,
            total: newTotal,
            totalPages: Math.ceil(newTotal / pageSize)
          };
        });

        setRecords(prev => prev.filter(r => r.id !== deletedId));
        setTotalRecords(t => Math.max(0, t - 1));
      }
      toast.success("Record deleted successfully");
      setRecordToDelete(null);
    },
    onError: (error: any) => {
      console.error("Delete Error:", error);
      toast.error(error.message || "Failed to delete record");
    }
  });

  const handleDeleteEntry = async (recordId: string) => {
    if (!tenant?.id || !moduleId) return;
    deleteMutation.mutate(recordId);
  };

  const kanbanConfig = useMemo(() => {
    const statusField = allFields.find(f => f.type === 'select' || f.id === 'status' || f.name === 'status');
    const stages = statusField?.options || ['Todo', 'In Progress', 'Done'];
    const fieldId = statusField?.id || 'status';

    const grouped: Record<string, any[]> = {};
    stages.forEach(stage => {
      grouped[stage] = [];
    });

    filteredRecords.forEach(record => {
      const val = record[fieldId] || record.status || 'Todo';
      if (grouped[val]) {
        grouped[val].push(record);
      } else {
        if (grouped[stages[0]]) grouped[stages[0]].push(record);
      }
    });

    return { stages, fieldId, grouped };
  }, [allFields, filteredRecords]);

  const handleMoveCard = (recordId: string, newStage: string) => {
    const fieldId = kanbanConfig.fieldId;
    updateMutation.mutate({
      recordId,
      data: {
        [fieldId]: newStage,
        status: newStage
      }
    });
  };

  const pipelineConfig = useMemo(() => {
    const statusField = allFields.find(f => (f.type as string) === 'status' || f.name === 'status');
    const stages = statusField?.options || ['Lead', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
    const fieldId = statusField?.id || 'status';

    const valueFieldId = interfaceSettings.master.pipelineValueFieldId || '';
    const dateFieldId = interfaceSettings.master.pipelineDateFieldId || '';

    const grouped: Record<string, any[]> = {};
    stages.forEach(stage => {
      grouped[stage] = [];
    });

    filteredRecords.forEach(record => {
      const val = record[fieldId] || record.status || stages[0];
      if (grouped[val]) {
        grouped[val].push(record);
      } else {
        if (grouped[stages[0]]) grouped[stages[0]].push(record);
      }
    });

    // Calculate aggregated column statistics
    const columnTotals: Record<string, number> = {};
    stages.forEach(stage => {
      const cards = grouped[stage] || [];
      const total = cards.reduce((sum, rec) => {
        const value = parseFloat(rec[valueFieldId]) || 0;
        return sum + value;
      }, 0);
      columnTotals[stage] = total;
    });

    return { stages, fieldId, valueFieldId, dateFieldId, grouped, columnTotals };
  }, [allFields, filteredRecords, interfaceSettings]);

  const handleMovePipelineCard = (recordId: string, newStage: string) => {
    const fieldId = pipelineConfig.fieldId;
    updateMutation.mutate({
      recordId,
      data: {
        [fieldId]: newStage,
        status: newStage
      }
    });
  };

  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dateFieldId = interfaceSettings.master.calendarDateFieldId || allFields.find(f => f.type === 'date')?.id || 'createdAt';

    // 1. Month View parameters
    const firstDayIndex = new Date(year, month, 1).getDay();
    const numDays = new Date(year, month + 1, 0).getDate();
    
    // 2. Week View parameters
    const startOfWeek = new Date(currentDate);
    const dayOfWeek = currentDate.getDay(); // 0 is Sunday
    startOfWeek.setDate(currentDate.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });

    // 3. Year View mappings
    // yearRecordsMap: monthIndex (0..11) -> day (1..31) -> record[]
    const yearRecordsMap: Record<number, Record<number, any[]>> = {};
    for (let m = 0; m < 12; m++) {
      yearRecordsMap[m] = {};
    }

    // 4. Month View mappings
    // monthRecordsMap: day (1..31) -> record[]
    const monthRecordsMap: Record<number, any[]> = {};

    // 5. Week View mappings
    // weekRecordsMap: dayIndex (0..6) -> record[]
    const weekRecordsMap: Record<number, any[]> = {
      0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
    };

    // 6. Day View mappings
    // dayRecords: record[], hourlyRecords: hour (8..18) -> record[], allDayRecords: record[]
    const dayRecords: any[] = [];
    const hourlyRecords: Record<number, any[]> = {};
    const allDayRecords: any[] = [];
    for (let h = 8; h <= 18; h++) {
      hourlyRecords[h] = [];
    }

    // Iterate and map records
    filteredRecords.forEach(record => {
      const rawDate = record[dateFieldId] || record.createdAt;
      if (!rawDate) return;
      const dateObj = new Date(rawDate);
      if (isNaN(dateObj.getTime())) return;

      const recordYear = dateObj.getFullYear();
      const recordMonth = dateObj.getMonth();
      const recordDay = dateObj.getDate();

      // Year mapping
      if (recordYear === year) {
        if (!yearRecordsMap[recordMonth][recordDay]) {
          yearRecordsMap[recordMonth][recordDay] = [];
        }
        yearRecordsMap[recordMonth][recordDay].push(record);
      }

      // Month mapping
      if (recordYear === year && recordMonth === month) {
        if (!monthRecordsMap[recordDay]) {
          monthRecordsMap[recordDay] = [];
        }
        monthRecordsMap[recordDay].push(record);
      }

      // Week mapping
      weekDates.forEach((wDate, idx) => {
        if (
          dateObj.getFullYear() === wDate.getFullYear() &&
          dateObj.getMonth() === wDate.getMonth() &&
          dateObj.getDate() === wDate.getDate()
        ) {
          weekRecordsMap[idx].push(record);
        }
      });

      // Day mapping
      if (
        recordYear === currentDate.getFullYear() &&
        recordMonth === currentDate.getMonth() &&
        recordDay === currentDate.getDate()
      ) {
        dayRecords.push(record);

        const hour = dateObj.getHours();
        const hasTime = dateObj.getHours() !== 0 || dateObj.getMinutes() !== 0 || dateObj.getSeconds() !== 0;

        if (hasTime && hour >= 8 && hour <= 18) {
          hourlyRecords[hour].push(record);
        } else {
          allDayRecords.push(record);
        }
      }
    });

    return {
      year,
      month,
      firstDayIndex,
      numDays,
      dateFieldId,
      weekDates,
      yearRecordsMap,
      monthRecordsMap,
      weekRecordsMap,
      dayRecords,
      hourlyRecords,
      allDayRecords
    };
  }, [filteredRecords, allFields, currentDate, interfaceSettings]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  const renderKanbanView = () => {
    const { stages, grouped } = kanbanConfig;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 shadow-sm">
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input 
                type="text" 
                placeholder="Filter cards..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 overflow-x-auto pb-4">
          {stages.map((stage: string) => {
            const cards = grouped[stage] || [];
            return (
              <div 
                key={stage}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const rId = e.dataTransfer.getData('text/plain');
                  if (rId) handleMoveCard(rId, stage);
                }}
                className="bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200/60 dark:border-zinc-800/60 rounded-[2rem] p-6 flex flex-col min-h-[500px]"
              >
                <div className="flex items-center justify-between mb-6 pb-3 border-b border-zinc-200/50 dark:border-zinc-800/50">
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    {stage}
                  </span>
                  <span className="px-2 py-0.5 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-full text-[10px] font-bold text-zinc-500">
                    {cards.length}
                  </span>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto max-h-[600px] pr-1.5 custom-scrollbar">
                  {cards.map(record => (
                    <div 
                      key={record.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', record.id)}
                      onClick={() => handleRecordClick(record.id)}
                      className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl cursor-grab active:cursor-grabbing hover:border-indigo-500/50 hover:shadow-lg transition-all group relative space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                          {record._record_key || 'Key'}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRecordToDelete(record.id);
                            }}
                            className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-zinc-400 hover:text-rose-500 rounded"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-zinc-900 dark:text-white leading-relaxed">
                          {getRecordTitle(record)}
                        </p>
                        {displayFields.slice(1, 3).map((f: any) => {
                          const val = record[f.id] || record[f.name];
                          if (val === undefined || val === null || val === '') return null;
                          
                          if (f.type === 'user') {
                            const resolvedUser = members?.find((m: any) => m.id === val);
                            return (
                              <div key={f.id} className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-medium truncate">
                                <span className="font-bold text-zinc-500">{f.label}:</span>
                                <div className="flex items-center gap-1 min-w-0">
                                  {resolvedUser ? (
                                    <>
                                      <div className={cn(
                                        "w-4 h-4 rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-zinc-200/50 dark:border-zinc-800/50",
                                        resolvedUser.isSynthetic 
                                          ? "bg-indigo-500/10 text-indigo-600" 
                                          : "bg-zinc-100 text-zinc-600"
                                      )}>
                                        {resolvedUser.avatarUrl ? (
                                          <img src={resolvedUser.avatarUrl} alt={resolvedUser.name} className="w-full h-full object-cover" />
                                        ) : (
                                          resolvedUser.isSynthetic ? <LucideIcons.Bot size={8} /> : <LucideIcons.User size={8} />
                                        )}
                                      </div>
                                      <span className="text-zinc-700 dark:text-zinc-300 font-bold truncate">{resolvedUser.name}</span>
                                    </>
                                  ) : (
                                    <span className="text-zinc-500 truncate">{val}</span>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          
                          return (
                            <p key={f.id} className="text-[10px] text-zinc-400 font-medium truncate">
                              <span className="font-bold text-zinc-500">{f.label}:</span> {val}
                            </p>
                          );
                        })}
                      </div>

                      <div className="flex justify-end gap-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
                        {stages.indexOf(stage) > 0 && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const prevStage = stages[stages.indexOf(stage) - 1];
                              handleMoveCard(record.id, prevStage);
                            }}
                            className="p-1 text-[10px] font-black text-zinc-400 hover:text-indigo-500 uppercase"
                            title="Move Left"
                          >
                            ←
                          </button>
                        )}
                        {stages.indexOf(stage) < stages.length - 1 && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextStage = stages[stages.indexOf(stage) + 1];
                              handleMoveCard(record.id, nextStage);
                            }}
                            className="p-1 text-[10px] font-black text-zinc-400 hover:text-indigo-500 uppercase"
                            title="Move Right"
                          >
                            →
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {cards.length === 0 && (
                    <div className="h-28 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400 text-[10px] font-bold uppercase">
                      Empty column
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPipelineView = () => {
    const { stages, valueFieldId, dateFieldId, grouped, columnTotals } = pipelineConfig;

    const formatCurrency = (val: any) => {
      const parsed = parseFloat(val);
      if (isNaN(parsed)) return '$0';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      }).format(parsed);
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 shadow-sm">
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input 
                type="text" 
                placeholder="Filter pipeline deals..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest hidden md:block">
            Value Source: <span className="text-indigo-500 font-black">{allFields.find(f => f.id === valueFieldId)?.label || 'None (Count Only)'}</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 overflow-x-auto pb-4 custom-scrollbar">
          {stages.map((stage: string) => {
            const cards = grouped[stage] || [];
            const totalValue = columnTotals[stage] || 0;
            return (
              <div 
                key={stage}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const rId = e.dataTransfer.getData('text/plain');
                  if (rId) handleMovePipelineCard(rId, stage);
                }}
                className="bg-zinc-50 dark:bg-zinc-900/20 border border-zinc-200/50 dark:border-zinc-800/50 rounded-[2rem] p-4 flex flex-col min-h-[550px] w-full md:w-[280px] shrink-0"
              >
                {/* Column Header */}
                <div className="mb-4 pb-3 border-b border-zinc-200/50 dark:border-zinc-800/50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      {stage}
                    </span>
                    <span className="px-2 py-0.5 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-full text-[9px] font-bold text-zinc-500">
                      {cards.length}
                    </span>
                  </div>
                  {valueFieldId && (
                    <div className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-tight">
                      {formatCurrency(totalValue)}
                    </div>
                  )}
                </div>

                {/* Cards List */}
                <div className="flex-1 space-y-3.5 overflow-y-auto max-h-[500px] pr-1 custom-scrollbar">
                  {cards.map(record => {
                    const value = record[valueFieldId];
                    const dateVal = record[dateFieldId];
                    const assignee = members?.find((m: any) => m.id === record.assigneeId);

                    return (
                      <div 
                        key={record.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', record.id)}
                        onClick={() => handleRecordClick(record.id)}
                        className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl cursor-grab active:cursor-grabbing hover:border-indigo-500/50 hover:shadow-xl transition-all group relative space-y-3.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">
                            {record._record_key || 'Deal'}
                          </span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRecordToDelete(record.id);
                              }}
                              className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-zinc-400 hover:text-rose-500 rounded"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-xs font-black text-zinc-900 dark:text-white leading-snug">
                            {getRecordTitle(record)}
                          </p>
                          {valueFieldId && value !== undefined && value !== null && (
                            <p className="text-sm font-black font-mono text-zinc-800 dark:text-zinc-200">
                              {formatCurrency(value)}
                            </p>
                          )}
                          {dateFieldId && dateVal && (
                            <p className="text-[9px] font-bold text-zinc-400 font-mono">
                              Close: {new Date(dateVal).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}
                            </p>
                          )}
                        </div>

                        {/* Card Footer Assignee */}
                        <div className="flex items-center justify-between pt-2.5 border-t border-zinc-100 dark:border-zinc-800/60">
                          <div className="flex items-center gap-1">
                            {assignee ? (
                              <div className={cn(
                                "w-4 h-4 rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-zinc-200/50 dark:border-zinc-800/50",
                                assignee.isSynthetic 
                                  ? "bg-indigo-500/10 text-indigo-600" 
                                  : "bg-zinc-100 text-zinc-600"
                              )}>
                                {assignee.avatarUrl ? (
                                  <img src={assignee.avatarUrl} alt={assignee.name} className="w-full h-full object-cover" />
                                ) : (
                                  assignee.isSynthetic ? <LucideIcons.Bot size={8} /> : <LucideIcons.User size={8} />
                                )}
                              </div>
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200/30">
                                <LucideIcons.User size={8} className="text-zinc-400" />
                              </div>
                            )}
                            <span className="text-[9px] text-zinc-400 font-bold truncate max-w-[80px]">
                              {assignee?.name || 'Unassigned'}
                            </span>
                          </div>
                          
                          <div className="flex gap-1">
                            {stages.indexOf(stage) > 0 && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const prevStage = stages[stages.indexOf(stage) - 1];
                                  handleMovePipelineCard(record.id, prevStage);
                                }}
                                className="p-0.5 text-[9px] font-black text-zinc-400 hover:text-indigo-500"
                                title="Move Stage Back"
                              >
                                ←
                              </button>
                            )}
                            {stages.indexOf(stage) < stages.length - 1 && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const nextStage = stages[stages.indexOf(stage) + 1];
                                  handleMovePipelineCard(record.id, nextStage);
                                }}
                                className="p-0.5 text-[9px] font-black text-zinc-400 hover:text-indigo-500"
                                title="Move Stage Next"
                              >
                                →
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {cards.length === 0 && (
                    <div className="h-24 border border-dashed border-zinc-200 dark:border-zinc-800/80 rounded-2xl flex items-center justify-center text-zinc-400 text-[9px] font-black uppercase tracking-wider">
                      No deals
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCalendarView = () => {
    const { 
      year, 
      month, 
      firstDayIndex, 
      numDays, 
      dateFieldId, 
      weekDates, 
      yearRecordsMap, 
      monthRecordsMap, 
      weekRecordsMap, 
      dayRecords, 
      hourlyRecords, 
      allDayRecords 
    } = calendarData;

    const getMonthDaysGrid = (y: number, m: number) => {
      const firstDay = new Date(y, m, 1).getDay();
      const numD = new Date(y, m + 1, 0).getDate();
      const grid = [];
      for (let i = 0; i < firstDay; i++) {
        grid.push(null);
      }
      for (let d = 1; d <= numD; d++) {
        grid.push(d);
      }
      return grid;
    };

    const formatWeekRange = () => {
      const start = weekDates[0];
      const end = weekDates[6];
      if (start.getMonth() === end.getMonth()) {
        return `${monthNames[start.getMonth()]} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`;
      } else if (start.getFullYear() === end.getFullYear()) {
        return `${monthNames[start.getMonth()].slice(0, 3)} ${start.getDate()} – ${monthNames[end.getMonth()].slice(0, 3)} ${end.getDate()}, ${start.getFullYear()}`;
      } else {
        return `${monthNames[start.getMonth()].slice(0, 3)} ${start.getDate()}, ${start.getFullYear()} – ${monthNames[end.getMonth()].slice(0, 3)} ${end.getDate()}, ${end.getFullYear()}`;
      }
    };

    const getHeaderTitle = () => {
      if (calendarViewMode === 'year') {
        return `${year}`;
      } else if (calendarViewMode === 'month') {
        return `${monthNames[month]} ${year}`;
      } else if (calendarViewMode === 'week') {
        return formatWeekRange();
      } else {
        // day view
        return `${monthNames[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
      }
    };

    const handlePrev = () => {
      if (calendarViewMode === 'year') {
        setCurrentDate(new Date(year - 1, month, 1));
      } else if (calendarViewMode === 'month') {
        setCurrentDate(new Date(year, month - 1, 1));
      } else if (calendarViewMode === 'week') {
        const d = new Date(currentDate);
        d.setDate(d.getDate() - 7);
        setCurrentDate(d);
      } else if (calendarViewMode === 'day') {
        const d = new Date(currentDate);
        d.setDate(d.getDate() - 1);
        setCurrentDate(d);
      }
    };

    const handleNext = () => {
      if (calendarViewMode === 'year') {
        setCurrentDate(new Date(year + 1, month, 1));
      } else if (calendarViewMode === 'month') {
        setCurrentDate(new Date(year, month + 1, 1));
      } else if (calendarViewMode === 'week') {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + 7);
        setCurrentDate(d);
      } else if (calendarViewMode === 'day') {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + 1);
        setCurrentDate(d);
      }
    };

    const handleToday = () => {
      setCurrentDate(new Date());
    };

    const renderYearView = () => {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-300">
          {monthNames.map((mName, mIdx) => {
            const monthDays = getMonthDaysGrid(year, mIdx);
            const dayMap = yearRecordsMap[mIdx] || {};
            const monthRecordsCount = Object.values(dayMap).reduce((sum, list) => sum + (list?.length || 0), 0);

            return (
              <div 
                key={mName}
                onClick={() => {
                  setCurrentDate(new Date(year, mIdx, 1));
                  setCalendarViewMode('month');
                }}
                className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl hover:border-indigo-500/50 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between min-h-[180px]"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white group-hover:text-indigo-500 transition-colors">
                    {mName}
                  </span>
                  {monthRecordsCount > 0 && (
                    <span className="text-[10px] font-black text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                      {monthRecordsCount} {monthRecordsCount === 1 ? 'record' : 'records'}
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-7 gap-1 flex-1 items-center justify-items-center">
                  {monthDays.map((dayVal, idx) => {
                    if (dayVal === null) {
                      return <div key={idx} className="w-2.5 h-2.5 rounded-sm bg-transparent" />;
                    }
                    const hasRecords = dayMap[dayVal]?.length > 0;
                    return (
                      <div 
                        key={idx} 
                        title={hasRecords ? `${dayMap[dayVal].length} records on ${mName} ${dayVal}` : undefined}
                        className={cn(
                          "w-2.5 h-2.5 rounded-sm transition-all duration-300",
                          hasRecords 
                            ? "bg-indigo-500 dark:bg-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.5)] scale-110" 
                            : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        )}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      );
    };

    const renderMonthView = () => {
      const daysInWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const cells = [];
      for (let i = 0; i < firstDayIndex; i++) {
        cells.push(null);
      }
      for (let d = 1; d <= numDays; d++) {
        cells.push(d);
      }

      return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] overflow-hidden shadow-sm animate-in fade-in duration-300">
          <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            {daysInWeek.map(day => (
              <div key={day} className="py-4 text-center text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 divide-x divide-y divide-zinc-200 dark:divide-zinc-800">
            {cells.map((day, idx) => {
              const dayRecordsList = day ? (monthRecordsMap[day] || []) : [];
              return (
                <div 
                  key={idx} 
                  onClick={() => {
                    if (day) {
                      setCurrentDate(new Date(year, month, day));
                      setCalendarViewMode('day');
                    }
                  }}
                  className={cn(
                    "min-h-[120px] p-3 flex flex-col space-y-2 transition-colors cursor-pointer hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10",
                    !day ? "bg-zinc-50/30 dark:bg-zinc-950/10 cursor-default" : "bg-white dark:bg-zinc-900"
                  )}
                >
                  {day && (
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "text-xs font-bold font-mono",
                        new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year
                          ? "w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black"
                          : "text-zinc-500"
                      )}>
                        {day}
                      </span>
                      {dayRecordsList.length > 0 && (
                        <span className="text-[9px] font-black text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded-full">
                          {dayRecordsList.length}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[80px] custom-scrollbar pr-0.5">
                    {dayRecordsList.map(record => (
                      <div 
                        key={record.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRecordClick(record.id);
                        }}
                        className="px-2 py-1 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 hover:border-indigo-500/30 rounded-lg text-[9px] font-bold text-indigo-600 dark:text-indigo-400 truncate cursor-pointer transition-all flex items-center justify-between group"
                      >
                        <span className="truncate">{record._record_key || 'Record'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    const renderWeekView = () => {
      const daysInWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      
      return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] overflow-hidden shadow-sm animate-in fade-in duration-300">
          <div className="grid grid-cols-7 divide-x divide-zinc-200 dark:divide-zinc-800">
            {weekDates.map((wDate, idx) => {
              const dayRecordsList = weekRecordsMap[idx] || [];
              const isToday = wDate.getDate() === new Date().getDate() &&
                              wDate.getMonth() === new Date().getMonth() &&
                              wDate.getFullYear() === new Date().getFullYear();
              
              return (
                <div key={idx} className="flex flex-col min-h-[500px]">
                  {/* Day Header */}
                  <div 
                    onClick={() => {
                      setCurrentDate(wDate);
                      setCalendarViewMode('day');
                    }}
                    className={cn(
                      "p-4 text-center border-b border-zinc-200 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-colors",
                      isToday ? "bg-indigo-50/5" : "bg-zinc-50/20 dark:bg-zinc-900/20"
                    )}
                  >
                    <div className="text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-1">
                      {daysInWeek[idx].slice(0, 3)}
                    </div>
                    <div className={cn(
                      "text-lg font-black font-mono inline-flex items-center justify-center w-8 h-8 rounded-full",
                      isToday ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/25" : "text-zinc-900 dark:text-white"
                    )}>
                      {wDate.getDate()}
                    </div>
                  </div>

                  {/* Day Records Body */}
                  <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[400px] custom-scrollbar bg-white dark:bg-zinc-900">
                    {dayRecordsList.map(record => (
                      <div 
                        key={record.id}
                        onClick={() => handleRecordClick(record.id)}
                        className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl hover:border-indigo-500/50 hover:shadow-md transition-all cursor-pointer space-y-2 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black text-indigo-500 uppercase tracking-wider">
                            {record._record_key || 'Key'}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-zinc-900 dark:text-white leading-relaxed truncate">
                          {getRecordTitle(record)}
                        </p>
                        
                        {displayFields[1] && (
                          <p className="text-[9px] text-zinc-400 font-medium truncate">
                            <span className="font-bold text-zinc-500">{displayFields[1].label}:</span> {record[displayFields[1].id] || record[displayFields[1].name]}
                          </p>
                        )}
                      </div>
                    ))}
                    {dayRecordsList.length === 0 && (
                      <div className="h-20 border border-dashed border-zinc-200 dark:border-zinc-800/80 rounded-2xl flex items-center justify-center text-zinc-400 text-[9px] font-bold uppercase tracking-wider">
                        No records
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    const renderDayView = () => {
      const hours = Array.from({ length: 11 }, (_, i) => i + 8); // 8 to 18

      return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          {/* Left panel: Hourly Schedule */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 shadow-sm space-y-6">
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-3">
              Daily Schedule
            </h4>
            
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {/* All Day Slots */}
              {allDayRecords.length > 0 && (
                <div className="flex gap-4 border-b border-zinc-100 dark:border-zinc-800/50 pb-4">
                  <div className="w-16 shrink-0 text-right">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded-full">
                      All Day
                    </span>
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {allDayRecords.map(record => (
                      <div 
                        key={record.id}
                        onClick={() => handleRecordClick(record.id)}
                        className="p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 hover:border-indigo-500/50 rounded-xl cursor-pointer transition-all flex items-center justify-between"
                      >
                        <span className="text-[10px] font-black text-indigo-500 truncate mr-2 shrink-0">{record._record_key}</span>
                        <span className="text-[11px] font-bold text-zinc-900 dark:text-white truncate flex-1 text-right">
                          {getRecordTitle(record)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hourly Slots */}
              {hours.map(hour => {
                const hourRecords = hourlyRecords[hour] || [];
                const isAm = hour < 12;
                const hourLabel = `${hour === 12 ? 12 : hour % 12}:00 ${isAm ? 'AM' : 'PM'}`;

                return (
                  <div key={hour} className="flex gap-4 items-start min-h-[48px]">
                    <div className="w-16 shrink-0 text-right pt-1">
                      <span className="text-[10px] font-mono font-bold text-zinc-400">
                        {hourLabel}
                      </span>
                    </div>
                    <div className="flex-1 border-t border-zinc-100 dark:border-zinc-800/60 pt-2">
                      {hourRecords.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {hourRecords.map(record => (
                            <div 
                              key={record.id}
                              onClick={() => handleRecordClick(record.id)}
                              className="p-3 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 hover:border-indigo-500/30 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                            >
                              <span className="text-[10px] font-black text-indigo-500 truncate mr-2 shrink-0">{record._record_key}</span>
                              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 truncate flex-1 text-right">
                                {getRecordTitle(record)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[9px] text-zinc-300 dark:text-zinc-700 italic pt-1 uppercase tracking-wider font-semibold">
                          Free slot
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right panel: Record Index */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 shadow-sm space-y-6 flex flex-col max-h-[675px]">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                Records Summary
              </h4>
              <span className="text-[10px] font-black text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                {dayRecords.length} {dayRecords.length === 1 ? 'record' : 'records'}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1.5 custom-scrollbar">
              {dayRecords.map(record => (
                <div 
                  key={record.id}
                  onClick={() => handleRecordClick(record.id)}
                  className="p-5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl hover:border-indigo-500/50 hover:shadow-md transition-all cursor-pointer space-y-3 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                      {record._record_key || 'Key'}
                    </span>
                    <span className="text-[9px] font-bold text-zinc-400 font-mono">
                      {new Date(record[dateFieldId] || record.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs font-black text-zinc-900 dark:text-white leading-relaxed">
                    {getRecordTitle(record)}
                  </p>
                  
                  {displayFields.slice(1, 4).map((f: any) => {
                    const val = record[f.id] || record[f.name];
                    if (val === undefined || val === null || val === '') return null;
                    
                    if (f.type === 'user') {
                      const resolvedUser = members?.find((m: any) => m.id === val);
                      return (
                        <div key={f.id} className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-semibold">
                          <span className="text-zinc-500">{f.label}:</span>
                          <span className="text-zinc-700 dark:text-zinc-300 font-bold">{resolvedUser?.name || val}</span>
                        </div>
                      );
                    }
                    return (
                      <p key={f.id} className="text-[10px] text-zinc-400 font-semibold truncate">
                        <span className="text-zinc-500">{f.label}:</span> {val}
                      </p>
                    );
                  })}
                </div>
              ))}
              {dayRecords.length === 0 && (
                <div className="h-full border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl flex flex-col items-center justify-center p-8 text-center text-zinc-400 space-y-2 py-20">
                  <LucideIcons.Calendar size={28} className="text-zinc-300 dark:text-zinc-700" />
                  <span className="text-[10px] font-black uppercase tracking-wider">No scheduled records</span>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={handlePrev}
              className="p-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-xl border border-zinc-200 dark:border-zinc-800 transition-colors"
            >
              <LucideIcons.ChevronLeft size={16} />
            </button>
            <h3 className="text-base font-black uppercase tracking-wider text-zinc-900 dark:text-white min-w-[150px] text-center">
              {getHeaderTitle()}
            </h3>
            <button 
              onClick={handleNext}
              className="p-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-xl border border-zinc-200 dark:border-zinc-800 transition-colors"
            >
              <LucideIcons.ChevronRight size={16} />
            </button>
            <button 
              onClick={handleToday}
              className="px-4 py-2 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-xs font-black uppercase tracking-wider rounded-xl border border-zinc-200 dark:border-zinc-800 transition-colors"
            >
              Today
            </button>
          </div>
          <div className="flex items-center gap-4 self-end sm:self-center">
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50">
              {(['year', 'month', 'week', 'day'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setCalendarViewMode(mode)}
                  className={cn(
                    "px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all",
                    calendarViewMode === mode 
                      ? "bg-white dark:bg-zinc-900 text-indigo-500 shadow-sm border border-zinc-200/50 dark:border-zinc-800/50" 
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
            <div className="hidden md:block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              Date source: <span className="text-indigo-500 font-black">{allFields.find(f => f.id === dateFieldId)?.label || 'Created Date'}</span>
            </div>
          </div>
        </div>

        {/* View Mode Router */}
        {calendarViewMode === 'year' && renderYearView()}
        {calendarViewMode === 'month' && renderMonthView()}
        {calendarViewMode === 'week' && renderWeekView()}
        {calendarViewMode === 'day' && renderDayView()}
      </div>
    );
  };

  const LeafletMapWrapper = ({
    records,
    interfaceSettings,
    handleRecordClick,
    displayFields
  }: any) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markersRef = useRef<L.Marker[]>([]);
    const [selectedRecord, setSelectedRecord] = useState<any>(null);
    const [mapSearch, setMapSearch] = useState('');
    
    // Coordinate cache to avoid hitting Nominatim rate limits/network delays on every render
    const [coordsCache, setCoordsCache] = useState<Record<string, [number, number]>>({});
    const [loadingGeocode, setLoadingGeocode] = useState(false);

    // Address field ID
    const addressFieldId = interfaceSettings.master.mapAddressFieldId || '_record_key';

    // 1. Dynamic CSS injection
    useEffect(() => {
      const linkId = 'leaflet-css-link';
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
    }, []);

    // 2. Geocoding helper
    const geocodeAddress = async (addressText: string, recordId: string): Promise<[number, number]> => {
      // Check cache
      if (coordsCache[recordId]) return coordsCache[recordId];
      
      // Deterministic fallback (San Francisco center by default, offset based on hash of recordId)
      const getFallback = (): [number, number] => {
        let hash = 0;
        for (let i = 0; i < recordId.length; i++) {
          hash = recordId.charCodeAt(i) + ((hash << 5) - hash);
        }
        const latOffset = (hash % 1000) / 15000;
        const lngOffset = ((hash >> 3) % 1000) / 15000;
        return [37.7749 + latOffset, -122.4194 + lngOffset]; // San Francisco area
      };

      if (!addressText || addressText === '-' || addressText === recordId) {
        return getFallback();
      }

      // Try Nominatim API
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(addressText)}`;
        const res = await fetch(url, {
          headers: {
            'Accept-Language': 'en'
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);
            const coords: [number, number] = [lat, lng];
            setCoordsCache(prev => ({ ...prev, [recordId]: coords }));
            return coords;
          }
        }
      } catch (e) {
        console.warn("Geocoding failed, using deterministic fallback", e);
      }

      const fallback = getFallback();
      setCoordsCache(prev => ({ ...prev, [recordId]: fallback }));
      return fallback;
    };

    // 3. Geocode all records
    useEffect(() => {
      const geocodeAll = async () => {
        setLoadingGeocode(true);
        for (const record of records) {
          const addressText = record[addressFieldId] || record._record_key || '';
          await geocodeAddress(addressText, record.id);
        }
        setLoadingGeocode(false);
      };
      geocodeAll();
    }, [records, addressFieldId]);

    // 4. Initialize Map
    useEffect(() => {
      if (!mapContainerRef.current) return;
      
      // Create map centered in San Francisco
      const map = L.map(mapContainerRef.current).setView([37.7749, -122.4194], 13);
      mapRef.current = map;

      // Add clean tiles (Voyager dark/light matching dashboard)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      return () => {
        map.remove();
        mapRef.current = null;
      };
    }, []);

    // 5. Update Markers when coordinates are geocoded
    useEffect(() => {
      const map = mapRef.current;
      if (!map) return;

      // Clear previous markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      const bounds: [number, number][] = [];

      records.forEach((record: any) => {
        const coords = coordsCache[record.id];
        if (!coords) return;

        bounds.push(coords);

        // Create styled divIcon marker
        const markerHtml = `
          <div class="relative flex items-center justify-center">
            <div class="w-8 h-8 rounded-full bg-indigo-600/20 animate-ping absolute"></div>
            <div class="w-6 h-6 rounded-full bg-white dark:bg-zinc-900 border-2 border-indigo-600 shadow-lg flex items-center justify-center relative z-10">
              <div class="w-2.5 h-2.5 rounded-full bg-indigo-600"></div>
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: markerHtml,
          className: 'custom-map-marker-icon',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const marker = L.marker(coords, { icon: customIcon }).addTo(map);
        markersRef.current.push(marker);

        // Marker click popup
        marker.on('click', () => {
          setSelectedRecord(record);
          map.setView(coords, Math.max(map.getZoom(), 15));
        });
      });

      // Auto-fit bounds if we have markers
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    }, [records, coordsCache]);

    const filteredList = useMemo(() => {
      if (!mapSearch) return records;
      const query = mapSearch.toLowerCase();
      return records.filter((r: any) => 
        String(r._record_key || '').toLowerCase().includes(query) ||
        String(r[addressFieldId] || '').toLowerCase().includes(query)
      );
    }, [records, mapSearch, addressFieldId]);

    const handlePanToRecord = (record: any) => {
      const coords = coordsCache[record.id];
      const map = mapRef.current;
      if (coords && map) {
        setSelectedRecord(record);
        map.setView(coords, 16);
      }
    };

    return (
      <div className="flex flex-col lg:flex-row h-[600px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] overflow-hidden shadow-sm">
        {/* Sidebar Record list */}
        <div className="w-full lg:w-80 flex flex-col border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
              <input 
                type="text" 
                placeholder="Search locations..."
                value={mapSearch}
                onChange={(e) => setMapSearch(e.target.value)}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">
              Source: <span className="text-indigo-500 font-bold">{addressFieldId === '_record_key' ? 'Record Key' : addressFieldId}</span>
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {filteredList.map((record: any) => {
              const isSelected = selectedRecord?.id === record.id;
              return (
                <div 
                  key={record.id}
                  onClick={() => handlePanToRecord(record)}
                  className={cn(
                    "p-4 rounded-2xl border cursor-pointer transition-all",
                    isSelected
                      ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-900 dark:text-white font-semibold"
                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">{record._record_key || 'Record'}</span>
                    {loadingGeocode && !coordsCache[record.id] && (
                      <div className="w-3 h-3 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                    )}
                  </div>
                  <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-1 truncate">
                    {getRecordTitle(record)}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-1 truncate">
                    {record[addressFieldId] || 'No location address'}
                  </p>
                </div>
              );
            })}
            {filteredList.length === 0 && (
              <p className="text-center text-[10px] text-zinc-400 uppercase tracking-widest py-8">No records mapped</p>
            )}
          </div>
        </div>

        {/* Leaflet Canvas */}
        <div className="flex-1 relative h-full min-h-[300px]">
          <div ref={mapContainerRef} className="w-full h-full z-10" />

          {/* Floating Details Overlay */}
          <AnimatePresence>
            {selectedRecord && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-6 left-6 right-6 lg:left-auto lg:right-6 lg:w-96 p-5 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl shadow-2xl z-20 flex flex-col gap-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{selectedRecord._record_key}</span>
                    <h4 className="text-sm font-bold text-zinc-950 dark:text-white mt-0.5">
                      {getRecordTitle(selectedRecord)}
                    </h4>
                  </div>
                  <button 
                    onClick={() => setSelectedRecord(null)}
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 rounded-lg"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="text-[10px] text-zinc-600 dark:text-zinc-400 space-y-1 bg-zinc-50/50 dark:bg-zinc-900/50 p-3 rounded-2xl">
                  {displayFields.slice(1, 4).map((f: any) => {
                    const val = selectedRecord[f.id] || selectedRecord[f.name];
                    if (val === undefined || val === null || val === '') return null;
                    return (
                      <div key={f.id} className="flex justify-between gap-4">
                        <span className="font-bold text-zinc-500">{f.label || f.name}:</span>
                        <span className="truncate">{String(val)}</span>
                      </div>
                    );
                  })}
                  <div className="flex justify-between gap-4 border-t border-zinc-100 dark:border-zinc-800/50 pt-1.5 mt-1.5">
                    <span className="font-bold text-zinc-500">Address:</span>
                    <span className="truncate" title={selectedRecord[addressFieldId]}>{selectedRecord[addressFieldId] || '-'}</span>
                  </div>
                </div>

                <button 
                  onClick={() => handleRecordClick(selectedRecord.id)}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20 uppercase tracking-widest"
                >
                  Open Details
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  const renderMapView = () => {
    return (
      <LeafletMapWrapper 
        records={filteredRecords}
        interfaceSettings={interfaceSettings}
        members={members}
        handleRecordClick={handleRecordClick}
        moduleId={moduleId}
        displayFields={displayFields}
      />
    );
  };

  const renderCardsView = () => {
    const cardFields: any[] = interfaceSettings.master.cardFields || [];
    const activeCardFields = cardFields.length > 0
      ? cardFields.filter((cf: any) => cf.visible !== false).map((cf: any) => {
          const customField = displayFields.find(f => f.id === cf.fieldId);
          const systemField = [
            { id: 'createdAt', label: 'Created Date', type: 'date' },
            { id: 'createdBy', label: 'Created By', type: 'user' },
            { id: 'updatedAt', label: 'Updated Date', type: 'date' },
            { id: 'status', label: 'Status', type: 'select' },
            { id: 'assigneeId', label: 'Assignee', type: 'user' }
          ].find(sf => sf.id === cf.fieldId);
          return customField || systemField;
        }).filter(Boolean)
      : displayFields.slice(1, 4);

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 shadow-sm">
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input 
                type="text" 
                placeholder="Search cards..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredRecords.map((record: any) => {
            const statusField = allFields.find(f => f.id === 'status' || f.name === 'status');
            const status = record.status || record[statusField?.id || ''] || '-';
            
            const assignee = members?.find((m: any) => m.id === record.assigneeId);

            return (
              <div 
                key={record.id}
                onClick={() => handleRecordClick(record.id)}
                className="group relative bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50 rounded-[2rem] p-6 hover:shadow-2xl hover:shadow-indigo-500/[0.03] hover:-translate-y-1 cursor-pointer transition-all duration-300 flex flex-col justify-between min-h-[220px]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{record._record_key || 'Key'}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold uppercase tracking-wider">
                      {status}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white mt-4 line-clamp-2 leading-snug group-hover:text-indigo-500 transition-colors">
                    {getRecordTitle(record)}
                  </h4>

                  <div className="mt-4 space-y-1.5 border-t border-zinc-100 dark:border-zinc-800/60 pt-3">
                    {activeCardFields.map((f: any) => {
                      let val = record[f.id] || record[f.name];
                      if (f.id === 'createdBy' && record.createdBy) {
                        const creator = members?.find((m: any) => m.id === record.createdBy);
                        if (creator) val = creator.name;
                      }
                      if (f.id === 'assigneeId' && record.assigneeId) {
                        const assigneeUser = members?.find((m: any) => m.id === record.assigneeId);
                        if (assigneeUser) val = assigneeUser.name;
                      }
                      if (f.id === 'createdAt' || f.id === 'updatedAt') {
                        val = record[f.id] ? new Date(record[f.id]).toLocaleDateString() : '';
                      }
                      if (val === undefined || val === null || val === '') return null;
                      return (
                        <p key={f.id} className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate flex items-center justify-between">
                          <span className="font-bold text-zinc-400">{f.label || f.name}:</span>
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">{String(val)}</span>
                        </p>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-6 pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
                  <span className="text-[9px] text-zinc-400 font-bold">{record.createdAt ? new Date(record.createdAt).toLocaleDateString() : 'Just now'}</span>
                  
                  {assignee ? (
                    <div className="flex items-center gap-1.5" title={`Assignee: ${assignee.name}`}>
                      <div className="w-5 h-5 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 flex items-center justify-center text-[9px] font-bold">
                        {assignee.avatarUrl ? (
                          <img src={assignee.avatarUrl} alt={assignee.name} className="w-full h-full object-cover" />
                        ) : (
                          assignee.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-400">
                      <LucideIcons.User size={8} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {filteredRecords.length === 0 && (
            <div className="col-span-full py-16 text-center text-zinc-400 font-bold text-xs uppercase tracking-widest">No cards found</div>
          )}
        </div>
      </div>
    );
  };

  const renderPortfolioView = () => {
    const portfolioSettings = interfaceSettings.master.portfolioSettings || {};
    const galleryFieldId = portfolioSettings.galleryFieldId;
    const keyInfoFieldIds = portfolioSettings.keyInfoFieldIds || [];

    const activeKeyFields = keyInfoFieldIds.length > 0
      ? keyInfoFieldIds.map((fieldId: string) => {
          const customField = displayFields.find(f => f.id === fieldId);
          const systemField = [
            { id: 'createdAt', label: 'Created Date', type: 'date' },
            { id: 'createdBy', label: 'Created By', type: 'user' },
            { id: 'updatedAt', label: 'Updated Date', type: 'date' },
            { id: 'status', label: 'Status', type: 'select' },
            { id: 'assigneeId', label: 'Assignee', type: 'user' }
          ].find(sf => sf.id === fieldId);
          return customField || systemField;
        }).filter(Boolean)
      : displayFields.slice(1, 4);

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 shadow-sm">
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input 
                type="text" 
                placeholder="Search portfolio..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredRecords.map((record: any) => {
            const statusField = allFields.find(f => f.id === 'status' || f.name === 'status');
            const status = record.status || record[statusField?.id || ''] || '-';
            const assignee = members?.find((m: any) => m.id === record.assigneeId);
            
            // Extract images from gallery image field or auto-detect
            const images: string[] = [];
            if (galleryFieldId && record[galleryFieldId]) {
              const val = record[galleryFieldId];
              if (Array.isArray(val)) {
                images.push(...val.filter(v => typeof v === 'string'));
              } else if (typeof val === 'string') {
                if (val.includes(',')) {
                  images.push(...val.split(',').map(s => s.trim()).filter(Boolean));
                } else {
                  images.push(val);
                }
              }
            } else {
              // Auto-detect file/url fields that contain image URLs
              allFields.forEach((field: any) => {
                const val = record[field.id];
                if (val && (field.type === 'file' || field.type === 'url')) {
                  if (typeof val === 'string' && (val.startsWith('http') || val.includes('/uploads/') || val.includes('unsplash.com'))) {
                    if (val.includes(',')) {
                      images.push(...val.split(',').map(s => s.trim()).filter(Boolean));
                    } else {
                      images.push(val);
                    }
                  } else if (Array.isArray(val)) {
                    images.push(...val.filter(v => typeof v === 'string' && (v.startsWith('http') || v.includes('/uploads/'))));
                  }
                }
              });
            }

            // Fallbacks if no image is available
            if (images.length === 0) {
              const fallbacks = [
                "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=600&q=80"
              ];
              const charSum = record.id.split('').reduce((sum: number, char: string) => sum + char.charCodeAt(0), 0);
              images.push(fallbacks[charSum % fallbacks.length]);
            }

            const activeImgIdx = cardImgIndices[record.id] || 0;

            const handlePrevImage = (e: React.MouseEvent) => {
              e.stopPropagation();
              setCardImgIndices(prev => ({
                ...prev,
                [record.id]: activeImgIdx === 0 ? images.length - 1 : activeImgIdx - 1
              }));
            };

            const handleNextImage = (e: React.MouseEvent) => {
              e.stopPropagation();
              setCardImgIndices(prev => ({
                ...prev,
                [record.id]: activeImgIdx === images.length - 1 ? 0 : activeImgIdx + 1
              }));
            };

            return (
              <div 
                key={record.id}
                onClick={() => handleRecordClick(record.id)}
                className="group relative bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/55 rounded-[2.5rem] overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/[0.04] hover:-translate-y-1 cursor-pointer transition-all duration-300 flex flex-col justify-between min-h-[340px]"
              >
                {/* Picture Gallery Slider inside card header */}
                <div className="h-44 w-full relative bg-zinc-150 dark:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-800/80 overflow-hidden group/gallery">
                  <img 
                    src={images[activeImgIdx]} 
                    alt={record.name || 'Listing'} 
                    className="w-full h-full object-cover select-none transition-transform duration-500 group-hover:scale-105"
                  />
                  {images.length > 1 && (
                    <>
                      <button 
                        onClick={handlePrevImage}
                        className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 bg-black/30 hover:bg-black/50 text-white rounded-full opacity-0 group-hover/gallery:opacity-100 transition-opacity backdrop-blur-md border border-white/10 z-10"
                      >
                        <LucideIcons.ChevronLeft size={14} />
                      </button>
                      <button 
                        onClick={handleNextImage}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-black/30 hover:bg-black/50 text-white rounded-full opacity-0 group-hover/gallery:opacity-100 transition-opacity backdrop-blur-md border border-white/10 z-10"
                      >
                        <LucideIcons.ChevronRight size={14} />
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                        {images.map((_, i) => (
                          <div 
                            key={i} 
                            className={cn(
                              "w-1.5 h-1.5 rounded-full transition-all duration-300", 
                              activeImgIdx === i ? "bg-white w-3" : "bg-white/40"
                            )} 
                          />
                        ))}
                      </div>
                    </>
                  )}
                  <div className="absolute top-4 left-4 px-2 py-0.5 bg-black/40 backdrop-blur-md rounded-lg text-white text-[8px] font-black uppercase tracking-widest border border-white/10">
                    {activeImgIdx + 1} / {images.length}
                  </div>
                </div>

                <div className="p-6 flex-grow flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{record._record_key || 'Key'}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold uppercase tracking-wider">
                        {status}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white mt-4 line-clamp-2 leading-snug group-hover:text-indigo-500 transition-colors">
                      {getRecordTitle(record)}
                    </h4>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
                      {activeKeyFields.map((f: any) => {
                        let val = record[f.id] || record[f.name];
                        if (f.id === 'createdBy' && record.createdBy) {
                          const creator = members?.find((m: any) => m.id === record.createdBy);
                          if (creator) val = creator.name;
                        }
                        if (f.id === 'assigneeId' && record.assigneeId) {
                          const assigneeUser = members?.find((m: any) => m.id === record.assigneeId);
                          if (assigneeUser) val = assigneeUser.name;
                        }
                        if (f.id === 'createdAt' || f.id === 'updatedAt') {
                          val = record[f.id] ? new Date(record[f.id]).toLocaleDateString() : '';
                        }
                        
                        return (
                          <div key={f.id} className="min-w-0">
                            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block">{f.label || f.name}</span>
                            <span className="text-[10px] font-bold text-zinc-755 dark:text-zinc-350 truncate block mt-0.5">
                              {val !== undefined && val !== null && val !== '' ? String(val) : '—'}
                            </span>
                          </div>
                        );
                      })}
                      {activeKeyFields.length === 0 && (
                        <p className="col-span-2 text-[9px] text-zinc-400 italic text-center">No key info configured</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-6 pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
                    <span className="text-[9px] text-zinc-400 font-bold">{record.createdAt ? new Date(record.createdAt).toLocaleDateString() : 'Just now'}</span>
                    
                    {assignee ? (
                      <div className="flex items-center gap-1.5" title={`Assignee: ${assignee.name}`}>
                        <div className="w-5 h-5 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 flex items-center justify-center text-[9px] font-bold">
                          {assignee.avatarUrl ? (
                            <img src={assignee.avatarUrl} alt={assignee.name} className="w-full h-full object-cover" />
                          ) : (
                            assignee.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-400">
                        <LucideIcons.User size={8} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredRecords.length === 0 && (
            <div className="col-span-full py-16 text-center text-zinc-400 font-bold text-xs uppercase tracking-widest">No cards found</div>
          )}
        </div>
      </div>
    );
  };

  const renderTimelineView = () => {
    const dateFieldId = interfaceSettings.master.timelineDateFieldId || 'createdAt';
    
    const sortedTimelineRecords = [...filteredRecords].sort((a, b) => {
      const dateA = new Date(a[dateFieldId] || a.createdAt || 0).getTime();
      const dateB = new Date(b[dateFieldId] || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input 
                type="text" 
                placeholder="Search timeline..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            Timeline Date: <span className="text-indigo-500 font-black">{dateFieldId === 'createdAt' ? 'Created Date' : (allFields.find(f => f.id === dateFieldId)?.label || dateFieldId)}</span>
          </div>
        </div>

        <div className="relative border-l border-zinc-200 dark:border-zinc-800 pl-8 ml-4 space-y-8 py-4">
          {sortedTimelineRecords.map((record: any) => {
            const rawDate = record[dateFieldId] || record.createdAt;
            const dateObj = rawDate ? new Date(rawDate) : new Date();
            const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            const timeStr = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            
            const assignee = members?.find((m: any) => m.id === record.assigneeId);
            const status = record.status || '-';

            return (
              <div key={record.id} className="relative group animate-in slide-in-from-left-4 duration-300">
                <div className="absolute -left-[41px] top-1.5 w-6 h-6 rounded-full bg-white dark:bg-zinc-950 border-2 border-indigo-600 shadow-md flex items-center justify-center z-10 transition-transform group-hover:scale-125 duration-200">
                  <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                </div>

                <div 
                  onClick={() => handleRecordClick(record.id)}
                  className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-zinc-400">{dateStr} • {timeStr}</span>
                      <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[9px] font-bold text-indigo-500 uppercase tracking-widest">
                        {status}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">
                      {getRecordTitle(record)}
                    </h4>
                    <p className="text-[10px] text-zinc-400 font-mono">
                      ID: {record._record_key || record.id}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    {assignee && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                        <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
                          {assignee.avatarUrl ? (
                            <img src={assignee.avatarUrl} alt={assignee.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-indigo-600 text-white flex items-center justify-center text-[8px] font-bold">
                              {assignee.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300">{assignee.name}</span>
                      </div>
                    )}
                    <ChevronRight size={16} className="text-zinc-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
          {sortedTimelineRecords.length === 0 && (
            <p className="text-center text-zinc-400 uppercase tracking-widest text-xs py-8">No records on the timeline</p>
          )}
        </div>
      </div>
    );
  };

  const renderGanttView = () => {
    const startFieldId = interfaceSettings.master.ganttStartDateFieldId || 'createdAt';
    const endFieldId = interfaceSettings.master.ganttEndDateFieldId || 'createdAt';

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const prevMonth = () => {
      setCurrentDate(new Date(year, month - 1, 1));
    };

    const nextMonth = () => {
      setCurrentDate(new Date(year, month + 1, 1));
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={prevMonth}
              className="p-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-xl border border-zinc-200 dark:border-zinc-800 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <h3 className="text-base font-black uppercase tracking-wider text-zinc-900 dark:text-white min-w-[150px] text-center">
              {monthNames[month]} {year}
            </h3>
            <button 
              onClick={nextMonth}
              className="p-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-xl border border-zinc-200 dark:border-zinc-800 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest space-x-4">
            <span>Start: <span className="text-indigo-500 font-bold">{startFieldId === 'createdAt' ? 'Created Date' : (allFields.find(f => f.id === startFieldId)?.label || startFieldId)}</span></span>
            <span>End: <span className="text-indigo-500 font-bold">{endFieldId === 'createdAt' ? 'Created Date' : (allFields.find(f => f.id === endFieldId)?.label || endFieldId)}</span></span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] overflow-hidden shadow-sm flex flex-col">
          <div className="flex overflow-x-auto custom-scrollbar border-b border-zinc-200 dark:border-zinc-800 min-w-full">
            <div className="w-56 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 p-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">
              Tasks
            </div>
            
            <div className="flex-1 flex min-w-[700px]">
              {daysArray.map((day) => (
                <div key={day} className="flex-1 min-w-[32px] text-center py-4 border-r border-zinc-100 dark:border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                  {day}
                </div>
              ))}
            </div>
          </div>

          <div className="divide-y divide-zinc-200 dark:divide-zinc-800 max-h-[450px] overflow-y-auto custom-scrollbar">
            {filteredRecords.map((record: any) => {
              const rStart = record[startFieldId] || record.createdAt;
              const rEnd = record[endFieldId] || record.createdAt;

              const dateStart = rStart ? new Date(rStart) : new Date(year, month, 1);
              const dateEnd = rEnd ? new Date(rEnd) : new Date(year, month, daysInMonth);

              let startIdx = 1;
              if (dateStart.getFullYear() === year && dateStart.getMonth() === month) {
                startIdx = dateStart.getDate();
              } else if (dateStart.getTime() > new Date(year, month, daysInMonth).getTime()) {
                return null;
              }

              let endIdx = daysInMonth;
              if (dateEnd.getFullYear() === year && dateEnd.getMonth() === month) {
                endIdx = dateEnd.getDate();
              } else if (dateEnd.getTime() < new Date(year, month, 1).getTime()) {
                return null;
              }

              startIdx = Math.max(1, startIdx);
              endIdx = Math.min(daysInMonth, Math.max(startIdx, endIdx));

              const dayWidth = 100 / daysInMonth;
              const barLeft = (startIdx - 1) * dayWidth;
              const barWidth = (endIdx - startIdx + 1) * dayWidth;

              const status = record.status || '-';

              return (
                <div 
                  key={record.id} 
                  onClick={() => handleRecordClick(record.id)}
                  className="flex min-w-full items-center group hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 cursor-pointer transition-colors"
                >
                  <div className="w-56 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/10 p-4 truncate">
                    <span className="block text-[9px] font-black text-indigo-500 uppercase tracking-widest">{record._record_key}</span>
                    <span className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate mt-0.5 group-hover:text-indigo-500 transition-colors">
                      {getRecordTitle(record)}
                    </span>
                  </div>

                  <div className="flex-1 flex min-w-[700px] h-12 relative items-center">
                    {daysArray.map((day) => (
                      <div key={day} className="absolute top-0 bottom-0 border-r border-zinc-100 dark:border-zinc-800/40 pointer-events-none" style={{ left: `${(day - 1) * dayWidth}%`, width: `${dayWidth}%` }} />
                    ))}

                    <div 
                      className="absolute h-6 rounded-lg bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wider flex items-center px-3 truncate transition-all shadow-md group-hover:shadow-lg shadow-indigo-600/10 border border-indigo-500/20"
                      style={{ left: `${barLeft}%`, width: `${barWidth}%` }}
                    >
                      <span className="truncate">{status}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredRecords.length === 0 && (
              <p className="text-center text-zinc-400 uppercase tracking-widest text-xs py-12">No tasks available</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const analyticsData = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    const assigneeCounts: Record<string, number> = {};
    const dateCounts: Record<string, number> = {};

    records.forEach(r => {
      const status = r.status || 'Active';
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      if (r.assigneeId) {
        const member = members?.find((m: any) => m.id === r.assigneeId);
        const name = member ? member.name : 'Unknown';
        assigneeCounts[name] = (assigneeCounts[name] || 0) + 1;
      } else {
        assigneeCounts['Unassigned'] = (assigneeCounts['Unassigned'] || 0) + 1;
      }

      if (r.createdAt) {
        const dStr = new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        dateCounts[dStr] = (dateCounts[dStr] || 0) + 1;
      }
    });

    const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
    const assigneeData = Object.entries(assigneeCounts).map(([name, value]) => ({ name, value }));
    const trendData = Object.entries(dateCounts)
      .map(([date, count]) => ({ date, count }))
      .slice(-10);

    const todoCounts = statusCounts['Todo'] || statusCounts['Pending'] || 0;
    const progressCounts = statusCounts['In Progress'] || statusCounts['Active'] || 0;
    const doneCounts = statusCounts['Done'] || statusCounts['Completed'] || 0;

    return {
      total: records.length,
      todoCounts,
      progressCounts,
      doneCounts,
      statusData,
      assigneeData,
      trendData
    };
  }, [records, members]);

  const renderAnalyticsView = () => {
    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total Records</span>
            <span className="text-3xl font-black text-zinc-900 dark:text-white mt-4">{analyticsData.total}</span>
            <span className="text-[9px] text-emerald-500 font-bold mt-2 flex items-center gap-1">
              Active volume
            </span>
          </div>

          <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">To Do / Pending</span>
            <span className="text-3xl font-black text-zinc-900 dark:text-white mt-4">{analyticsData.todoCounts}</span>
            <span className="text-[9px] text-zinc-400 font-bold mt-2">Requires attention</span>
          </div>

          <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">In Progress</span>
            <span className="text-3xl font-black text-zinc-900 dark:text-white mt-4">{analyticsData.progressCounts}</span>
            <span className="text-[9px] text-indigo-500 font-bold mt-2">Currently being processed</span>
          </div>

          <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Completed / Done</span>
            <span className="text-3xl font-black text-zinc-900 dark:text-white mt-4">{analyticsData.doneCounts}</span>
            <span className="text-[9px] text-emerald-500 font-bold mt-2">Successfully closed</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 shadow-sm flex flex-col">
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white mb-6">Status Breakdown</h4>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analyticsData.statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {analyticsData.statusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: '#18181b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
              {analyticsData.statusData.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span>{entry.name}: {entry.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 shadow-sm flex flex-col">
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white mb-6">Creation Activity Trend</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData.trendData}>
                  <defs>
                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e720" />
                  <XAxis dataKey="date" tickLine={false} style={{ fontSize: '10px', fill: '#888' }} />
                  <YAxis tickLine={false} style={{ fontSize: '10px', fill: '#888' }} />
                  <Tooltip contentStyle={{ background: '#18181b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }} />
                  <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorTrend)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 shadow-sm flex flex-col lg:col-span-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white mb-6">Workload distribution by Member</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.assigneeData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e720" />
                  <XAxis dataKey="name" tickLine={false} style={{ fontSize: '10px', fill: '#888' }} />
                  <YAxis tickLine={false} style={{ fontSize: '10px', fill: '#888' }} />
                  <Tooltip contentStyle={{ background: '#18181b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }} />
                  <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} maxBarSize={48}>
                    {analyticsData.assigneeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTableView = () => {
    const densityClass = (() => {
      const d = interfaceSettings.master.density || 'standard';
      if (d === 'compact') return 'px-4 py-2 text-[11px] leading-normal font-medium';
      if (d === 'spacious') return 'px-8 py-5 text-sm leading-relaxed';
      return 'px-6 py-4 text-sm';
    })();

    // hasStatusField removed

    // Define the custom column accessor mapper
    const mapCustomFieldToColumn = (field: any) => ({
      header: field.label || field.name,
      sortable: true,
      sortKey: field.id || field.name,
      className: densityClass,
      style: field.columnWidth ? { width: `${field.columnWidth}px`, minWidth: `${field.columnWidth}px` } : undefined,
      accessor: (record: any) => {
        const val = record[field.id] || record[field.name];
        if (field.type === 'checkbox') return val ? 'Yes' : 'No';
        
        if (field.type === 'user') {
          if (!val) return '-';
          const resolvedUser = members?.find((m: any) => m.id === val);
          if (resolvedUser) {
            return (
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-800",
                  resolvedUser.isSynthetic 
                    ? "bg-indigo-50/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400" 
                    : "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-400"
                )}>
                  {resolvedUser.avatarUrl ? (
                    <img src={resolvedUser.avatarUrl} alt={resolvedUser.name} className="w-full h-full object-cover" />
                  ) : (
                    resolvedUser.isSynthetic ? <LucideIcons.Bot size={12} /> : <LucideIcons.User size={12} />
                  )}
                </div>
                <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                  {resolvedUser.name}
                </span>
              </div>
            );
          }
          return (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-white/10 flex items-center justify-center overflow-hidden shrink-0 text-zinc-400 border border-zinc-200 dark:border-zinc-800">
                <LucideIcons.User size={12} />
              </div>
              <span className="text-xs font-medium text-zinc-500 truncate">
                {val}
              </span>
            </div>
          );
        }
        
        if (field.type === 'repeatableGroup' || field.type === 'collection') {
          const count = Array.isArray(val) ? val.length : 0;
          return (
            <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider rounded-full border border-indigo-100 dark:border-indigo-500/20">
              {count} {count === 1 ? 'Item' : 'Items'}
            </span>
          );
        }

        if (Array.isArray(val)) {
          if (val.length === 0) return '-';
          return (
            <div className="flex flex-wrap gap-1 max-w-[200px]">
              {val.map((v: any, k: number) => {
                let displayStr = '';
                if (v && typeof v === 'object') {
                  const stringValues = Object.values(v).map(String).filter(s => s && s !== '[object Object]');
                  displayStr = stringValues[0] || 'Item';
                } else {
                  displayStr = String(v);
                }
                return (
                  <span key={k} className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-[9px] font-bold rounded border border-zinc-200 dark:border-zinc-700 uppercase truncate max-w-[120px]" title={displayStr}>
                    {displayStr}
                  </span>
                );
              })}
            </div>
          );
        }

        if (val && typeof val === 'object') {
          return <span className="text-zinc-400 italic text-[11px]">Complex Data</span>;
        }

        // Render Status fields using the premium badge styling
        if (field.id === 'status' || field.name?.toLowerCase() === 'status') {
          return (
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold border border-indigo-500/20">
              {val || record.status || '-'}
            </span>
          );
        }

        return val || '-';
      }
    });

    // Define System fields columns
    const systemColumnsMap: Record<string, any> = {
      createdAt: {
        header: 'Created',
        sortable: true,
        sortKey: 'createdAt',
        className: densityClass,
        style: interfaceSettings.master.columns?.find((c: any) => c.fieldId === 'createdAt')?.width 
          ? { width: `${interfaceSettings.master.columns.find((c: any) => c.fieldId === 'createdAt').width}px`, minWidth: `${interfaceSettings.master.columns.find((c: any) => c.fieldId === 'createdAt').width}px` } 
          : undefined,
        accessor: (record: any) => (
          <span className="text-sm text-zinc-500">
            {record.createdAt ? new Date(record.createdAt).toLocaleDateString() : 'Just now'}
          </span>
        )
      },
      createdBy: {
        header: 'Created By',
        sortable: true,
        sortKey: 'createdBy',
        className: densityClass,
        style: interfaceSettings.master.columns?.find((c: any) => c.fieldId === 'createdBy')?.width 
          ? { width: `${interfaceSettings.master.columns.find((c: any) => c.fieldId === 'createdBy').width}px`, minWidth: `${interfaceSettings.master.columns.find((c: any) => c.fieldId === 'createdBy').width}px` } 
          : undefined,
        accessor: (record: any) => {
          const val = record.createdBy;
          if (!val) return '-';
          const resolvedUser = members?.find((m: any) => m.id === val);
          if (resolvedUser) {
            return (
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-800",
                  resolvedUser.isSynthetic 
                    ? "bg-indigo-50/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400" 
                    : "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-400"
                )}>
                  {resolvedUser.avatarUrl ? (
                    <img src={resolvedUser.avatarUrl} alt={resolvedUser.name} className="w-full h-full object-cover" />
                  ) : (
                    resolvedUser.isSynthetic ? <LucideIcons.Bot size={12} /> : <LucideIcons.User size={12} />
                  )}
                </div>
                <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                  {resolvedUser.name}
                </span>
              </div>
            );
          }
          return '-';
        }
      },
      updatedAt: {
        header: 'Updated',
        sortable: true,
        sortKey: 'updatedAt',
        className: densityClass,
        style: interfaceSettings.master.columns?.find((c: any) => c.fieldId === 'updatedAt')?.width 
          ? { width: `${interfaceSettings.master.columns.find((c: any) => c.fieldId === 'updatedAt').width}px`, minWidth: `${interfaceSettings.master.columns.find((c: any) => c.fieldId === 'updatedAt').width}px` } 
          : undefined,
        accessor: (record: any) => (
          <span className="text-sm text-zinc-500">
            {record.updatedAt ? new Date(record.updatedAt).toLocaleDateString() : 'Just now'}
          </span>
        )
      },
      status: {
        header: 'Status',
        sortable: true,
        sortKey: 'status',
        className: densityClass,
        style: interfaceSettings.master.columns?.find((c: any) => c.fieldId === 'status')?.width 
          ? { width: `${interfaceSettings.master.columns.find((c: any) => c.fieldId === 'status').width}px`, minWidth: `${interfaceSettings.master.columns.find((c: any) => c.fieldId === 'status').width}px` } 
          : undefined,
        accessor: (record: any) => (
          <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold border border-indigo-500/20">
            {record.status || '-'}
          </span>
        )
      },
      assigneeId: {
        header: 'Assignee',
        sortable: true,
        sortKey: 'assigneeId',
        className: densityClass,
        style: interfaceSettings.master.columns?.find((c: any) => c.fieldId === 'assigneeId')?.width 
          ? { width: `${interfaceSettings.master.columns.find((c: any) => c.fieldId === 'assigneeId').width}px`, minWidth: `${interfaceSettings.master.columns.find((c: any) => c.fieldId === 'assigneeId').width}px` } 
          : undefined,
        accessor: (record: any) => {
          const colConfig = interfaceSettings.master.columns?.find((c: any) => c.fieldId === 'assigneeId');
          const inlineEditEnabled = colConfig?.inlineEdit === true;
          return (
            <InlineAssigneeCell
              record={record}
              members={members}
              platformUser={platformUser}
              updateMutation={updateMutation}
              inlineEditEnabled={inlineEditEnabled}
            />
          );
        }
      }
    };

    // Sort displayColumns based on configured order in interfaceSettings
    const activeCustomFields = displayFields.filter((field: any) => field.showInTable !== false);
    const configured = interfaceSettings.master.columns || [];

    const builtColumns: any[] = [];
    if (configured.length > 0) {
      configured.forEach((c: any) => {
        if (c.visible === false) return;
        
        // Is it a custom field?
        const customField = activeCustomFields.find(f => f.id === c.fieldId);
        if (customField) {
          builtColumns.push(mapCustomFieldToColumn(customField));
        } else if (systemColumnsMap[c.fieldId]) {
          // Is it a configured system field?
          builtColumns.push(systemColumnsMap[c.fieldId]);
        }
      });

      // Append any custom fields that are marked showInTable but weren't in configured
      activeCustomFields.forEach((field: any) => {
        if (!configured.some((c: any) => c.fieldId === field.id)) {
          builtColumns.push(mapCustomFieldToColumn(field));
        }
      });
    } else {
      // Fallback: Default ordering (Custom fields first, then default status & createdAt)
      activeCustomFields.forEach((field: any) => {
        builtColumns.push(mapCustomFieldToColumn(field));
      });
      if (!activeCustomFields.some(f => f.id === 'status' || f.name?.toLowerCase() === 'status')) {
        builtColumns.push(systemColumnsMap.status);
      }
      builtColumns.push(systemColumnsMap.createdAt);
    }

    const tableColumns = [
      {
        header: interfaceSettings.master.columns?.find((c: any) => c.fieldId === '_record_key')?.label || 'Key',
        sortable: true,
        sortKey: '_record_key',
        className: densityClass,
        style: interfaceSettings.master.columns?.find((c: any) => c.fieldId === '_record_key')?.width 
          ? { width: `${interfaceSettings.master.columns.find((c: any) => c.fieldId === '_record_key').width}px`, minWidth: `${interfaceSettings.master.columns.find((c: any) => c.fieldId === '_record_key').width}px` } 
          : undefined,
        accessor: (record: any) => (
          <span className="text-sm font-bold text-indigo-500">
            {record._record_key || '-'}
          </span>
        )
      },
      ...builtColumns,
      {
        header: '',
        className: cn('text-right', densityClass),
        accessor: (record: any) => (
          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setRecordToDelete(record.id);
              }}
              className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )
      }
    ];

    return (
      <div className="flex-1 bg-white/60 dark:bg-zinc-900/35 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl shadow-sm overflow-hidden flex flex-col">
        
        <Table 
          data={slicedRecords as any}
          onRowClick={(record) => handleRecordClick(String(record.id))}
          className="bg-transparent dark:bg-transparent border-none shadow-none"
          noContainer={true}
          pagination={false}
          columns={tableColumns}
        />

        {interfaceSettings.master.pagination?.enabled !== false && totalRecords > 0 && (
          <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-950/30 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Showing <span className="text-zinc-900 dark:text-white">{totalRecords > 0 ? (page - 1) * pageSize + 1 : 0}</span> to <span className="text-zinc-900 dark:text-white">{Math.min(page * pageSize, totalRecords)}</span> of <span className="text-zinc-900 dark:text-white">{totalRecords}</span> records
            </p>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest hover:text-zinc-900 dark:hover:text-white disabled:opacity-50 transition-all"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {totalPages > 0 && [...Array(totalPages)].map((_, i) => {
                  const pNum = i + 1;
                  if (totalPages > 7 && pNum > 2 && pNum < totalPages - 1 && Math.abs(pNum - page) > 1) {
                    if (pNum === 3 || pNum === totalPages - 2) return <span key={pNum} className="text-zinc-400 px-1">...</span>;
                    return null;
                  }
                  return (
                    <button
                      key={pNum}
                      onClick={() => setPage(pNum)}
                      className={cn(
                        "w-8 h-8 rounded-lg text-[10px] font-bold transition-all",
                        page === pNum 
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                          : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      )}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
                className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest hover:text-zinc-900 dark:hover:text-white disabled:opacity-50 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if ((loading || platformLoading) && !moduleData) return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton width={180} height={32} variant="rounded" />
          <Skeleton width={350} height={20} variant="text" />
        </div>
        <div className="flex gap-4">
          <Skeleton width={100} height={40} variant="rounded" />
          <Skeleton width={120} height={40} variant="rounded" />
        </div>
      </div>

      <div className="space-y-4 pt-6">
        <div className="flex items-center gap-4">
          <Skeleton width={200} height={40} variant="rounded" />
          <Skeleton width={40} height={40} variant="rounded" />
        </div>
        <Skeleton height={400} variant="rounded" className="rounded-[2.5rem]" />
      </div>
    </div>
  );

  if (!moduleData && !loading) {
    if (moduleError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 space-y-4">
          <LucideIcons.AlertCircle className="text-red-500" size={48} />
          <h2 className="text-xl font-bold">Failed to load module</h2>
          <p className="text-zinc-500">{(moduleError as any)?.message || "An unexpected error occurred"}</p>
          <button 
            onClick={() => navigate('/workspace')}
            className="px-6 py-2 bg-zinc-900 text-white rounded-xl font-bold"
          >
            Go Back
          </button>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 space-y-4">
        <LucideIcons.SearchX className="text-zinc-400" size={48} />
        <h2 className="text-xl font-bold">Module not found</h2>
        <p className="text-zinc-500">We couldn't find the module you're looking for ({moduleId}).</p>
        <button 
          onClick={() => navigate('/workspace')}
          className="px-6 py-2 bg-zinc-900 text-white rounded-xl font-bold"
        >
          Go Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-[calc(100vh-4rem)] bg-transparent overflow-hidden">
      
      {/* Header Panel */}
      <div className="px-6 lg:px-12 py-6 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-900/10 backdrop-blur-md shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 z-20">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Icon size={24} />
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-zinc-950 dark:text-white">{moduleData?.name || 'Loading...'}</h1>
            {moduleData?.description && (
              <p className="text-xs text-zinc-500 dark:text-zinc-450 mt-0.5">
                {moduleData.description}
              </p>
            )}
          </div>
        </div>

        {/* Toolbar Controls / Actions / Search */}
        <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
          {interfaceSettings.master.layoutType !== 'pipeline' && 
           interfaceSettings.master.layoutType !== 'kanban' && 
           interfaceSettings.master.layoutType !== 'calendar' && 
           interfaceSettings.master.layoutType !== 'map' && 
           interfaceSettings.master.layoutType !== 'cards' && 
           interfaceSettings.master.layoutType !== 'portfolio' && 
           interfaceSettings.master.layoutType !== 'timeline' && 
           interfaceSettings.master.layoutType !== 'gantt' && 
           interfaceSettings.master.layoutType !== 'analytics' && (
            <div className="relative">
              <LucideIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
              <input 
                type="text" 
                placeholder="Search records..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-450 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 w-60 transition-all shadow-sm"
              />
            </div>
          )}

          {/* Quick Actions & Create Buttons */}
          <div className="flex items-center gap-2">
            {interfaceSettings.actions?.map((act: any) => {
              const ActionIcon = (LucideIcons as any)[act.icon] || LucideIcons.Zap;
              return (
                <button
                  key={act.id}
                  onClick={() => {
                    const form = (moduleData as any)?.forms?.find((f: any) => f.usage === 'action_trigger');
                    setActiveQuickAction(act);
                    setActionForm(form || null);
                    const defaults: any = {};
                    if (form) {
                      const allFormFields = form.isMultistep 
                        ? (form.steps || []).flatMap((s: any) => s.fields || [])
                        : (form.fields || []);
                      allFormFields.forEach((fObj: any) => {
                        const field = allFields.find(f => f.id === fObj.id);
                        const defVal = calculateDefaultValue(field, defaults);
                        if (defVal !== undefined && defVal !== null && defVal !== '') {
                          defaults[fObj.id] = defVal;
                        }
                      });
                      if (form.isMultistep && form.steps?.length > 0) {
                        const visibleSteps = form.steps.filter((s: any) => isFieldVisible(s, defaults, visibilityContext));
                        setActionStepId(visibleSteps[0]?.id || form.steps[0].id);
                      }
                    }
                    setActionFormData(defaults);
                    setActionFormErrors({});
                    setShowQuickActionModal(true);
                  }}
                  className="px-3.5 py-2 bg-white/50 dark:bg-zinc-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <ActionIcon size={14} />
                  {act.label}
                </button>
              );
            })}
            
            <button 
              onClick={() => {
                const initialDefaults: any = {};
                allFields.forEach((f: any) => {
                  const defVal = calculateDefaultValue(f, initialDefaults);
                  if (defVal !== undefined && defVal !== null && defVal !== '') {
                    initialDefaults[f.id] = defVal;
                  }
                });
                setNewEntryData(initialDefaults);
                evaluateAllDataPopulationRules(initialDefaults);
                setEditingRecord(null);
                if (moduleData?.tabs && moduleData.tabs.length > 0) {
                  setActiveTabId(moduleData.tabs[0].id);
                } else {
                  setActiveTabId(null);
                }
                
                if (createForm && createForm.isMultistep && createForm.steps?.length > 0) {
                  const visibleSteps = createForm.steps.filter((s: any) => isFieldVisible(s, initialDefaults, visibilityContext));
                  setActiveStepId(visibleSteps[0]?.id || createForm.steps[0].id);
                } else {
                  setActiveStepId(null);
                }
                
                setShowNewEntryModal(true);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-500 transition-all shadow-md shadow-indigo-500/10 flex items-center gap-1.5"
            >
              <Plus size={14} />
              {createForm?.settings?.workspaceButtonLabel || 'New Entry'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 lg:p-8 overflow-hidden min-h-0 flex flex-col">



      {recordsLoading ? (
        <div className="space-y-4 pt-6">
          <div className="flex items-center gap-4">
            <Skeleton width={200} height={40} variant="rounded" />
            <Skeleton width={40} height={40} variant="rounded" />
          </div>
          <Skeleton height={400} variant="rounded" className="rounded-[2.5rem]" />
        </div>
      ) : records.length > 0 ? (
        interfaceSettings.master.layoutType === 'pipeline' ? (
          renderPipelineView()
        ) : interfaceSettings.master.layoutType === 'kanban' ? (
          renderKanbanView()
        ) : interfaceSettings.master.layoutType === 'calendar' ? (
          renderCalendarView()
        ) : interfaceSettings.master.layoutType === 'map' ? (
          renderMapView()
        ) : interfaceSettings.master.layoutType === 'cards' ? (
          renderCardsView()
        ) : interfaceSettings.master.layoutType === 'portfolio' ? (
          renderPortfolioView()
        ) : interfaceSettings.master.layoutType === 'timeline' ? (
          renderTimelineView()
        ) : interfaceSettings.master.layoutType === 'gantt' ? (
          renderGanttView()
        ) : interfaceSettings.master.layoutType === 'analytics' ? (
          renderAnalyticsView()
        ) : (
          renderTableView()
        )
      ) : (
        <div className="p-12 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl text-center space-y-4">
          <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto border border-zinc-200 dark:border-zinc-800">
            <Icon size={24} className="text-zinc-400 dark:text-zinc-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">No data found in {moduleData?.name || 'Module'}</h3>
            <p className="text-zinc-500 mt-1">Start by creating your first entry or importing data.</p>
          </div>
          <button 
            onClick={() => {
              const initialDefaults = {};
              allFields.forEach((f: any) => {
                if (f.defaultValue !== undefined && f.defaultValue !== '') {
                  (initialDefaults as any)[f.id] = f.defaultValue;
                }
              });
              setNewEntryData(initialDefaults);
              evaluateAllDataPopulationRules(initialDefaults);
              setEditingRecord(null);
              if (moduleData?.tabs && moduleData.tabs.length > 0) {
                setActiveTabId(moduleData.tabs[0].id);
              } else {
                setActiveTabId(null);
              }

              // Initialize custom create form step if applicable
              if (createForm && createForm.isMultistep && createForm.steps?.length > 0) {
                const visibleSteps = createForm.steps.filter((s: any) => isFieldVisible(s, initialDefaults, visibilityContext));
                setActiveStepId(visibleSteps[0]?.id || createForm.steps[0].id);
              } else {
                setActiveStepId(null);
              }

              setShowNewEntryModal(true);
            }}
            className="px-6 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Create First Entry
          </button>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showNewEntryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowNewEntryModal(false);
                setEditingRecord(null);
                setNewEntryData({});
              }}
              className="absolute inset-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                      <Plus size={20} />
                    </div>
                    {createForm ? createForm.name : `New ${moduleData?.name || 'Record'} Entry`}
                  </h2>
                  {createForm?.settings?.description && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed pl-12">
                      {createForm.settings.description}
                    </p>
                  )}
                </div>
                <button 
                  onClick={() => {
                    setShowNewEntryModal(false);
                    setEditingRecord(null);
                    setNewEntryData({});
                  }}
                  className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar w-full">
                {createForm ? (
                  <div className="space-y-10 w-full">
                    {createForm.isMultistep && (
                      <div className="flex items-center gap-4 px-2 mb-8 overflow-x-auto no-scrollbar py-2 border-b border-zinc-100 dark:border-zinc-800">
                        {createForm.steps
                          .filter((s: any) => isFieldVisible(s, newEntryData, visibilityContext))
                          .map((step: any, idx: number, list: any[]) => {
                            const isActive = activeStepId === step.id;
                            const activeIdx = list.findIndex(s => s.id === activeStepId);
                            const isCompleted = activeIdx > idx;

                            return (
                              <div key={step.id} className="flex items-center gap-3 shrink-0">
                                <div className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-300",
                                  isActive ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : 
                                  isCompleted ? "bg-emerald-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                                )}>
                                  {isCompleted ? <LucideIcons.Check size={12} /> : idx + 1}
                                </div>
                                <span className={cn(
                                  "text-[9px] font-black uppercase tracking-widest transition-colors",
                                  isActive ? "text-zinc-900 dark:text-white" : "text-zinc-400"
                                )}>{step.title}</span>
                                {idx < list.length - 1 && (
                                  <div className="w-8 h-px bg-zinc-200 dark:bg-zinc-800 ml-2" />
                                )}
                              </div>
                            );
                        })}
                      </div>
                    )}

                    <div className="grid grid-cols-12 gap-x-8 gap-y-8 w-full font-sans select-none">
                      {(() => {
                        const currentStep = createForm.isMultistep 
                          ? createForm.steps.find((s: any) => s.id === activeStepId)
                          : null;
                        const fields = currentStep ? currentStep.fields : createForm.fields;

                        return fields.map((fObj: any) => {
                          const isVisual = fObj.id.startsWith('visual-');
                          const field = isVisual ? null : allFields.find(f => f.id === fObj.id);
                          if (!isVisual && !field) return null;

                          // Evaluate Visibility
                          if (!isFieldVisible(fObj, newEntryData, visibilityContext)) return null;

                          const labelOverride = fObj.labelOverride || field?.label;
                          const isRequired = fObj.required || field?.required;
                          const isReadOnly = fObj.readOnly || (field as any)?.readOnly;

                          return (
                            <div key={fObj.id} className={cn(
                              "space-y-2",
                              fObj.width === 'half' ? "col-span-6" : "col-span-12"
                            )}>
                              {isVisual ? (
                                <div className="py-2">
                                  {fObj.type === 'heading' && (
                                    <h4 className="font-bold text-zinc-900 dark:text-white mt-2 text-xl">{fObj.labelOverride || 'Section Heading'}</h4>
                                  )}
                                  {fObj.type === 'divider' && (
                                    <div className="w-full h-px bg-zinc-200 dark:bg-zinc-800 my-2" />
                                  )}
                                  {fObj.type === 'spacer' && (
                                    <div style={{ height: fObj.height === 'sm' ? 16 : fObj.height === 'lg' ? 64 : fObj.height === 'xl' ? 128 : 32 }} />
                                  )}
                                  {fObj.type === 'html-text' && (
                                    <div className="text-sm text-zinc-500 leading-relaxed prose dark:prose-invert max-w-none">
                                      {fObj.labelOverride || 'Text content goes here...'}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <>
                                  <label className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 mb-2 relative group/label">
                                    {labelOverride}
                                    {isRequired && <span className="text-rose-500">*</span>}
                                    {field?.tooltip && (
                                      <div className="relative cursor-help">
                                        <LucideIcons.HelpCircle size={10} className="text-zinc-400 hover:text-indigo-500 transition-colors" />
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 text-white text-[10px] rounded-lg opacity-0 group-hover/label:opacity-100 pointer-events-none transition-all duration-200 whitespace-pre-wrap w-48 shadow-xl border border-white/10 z-50">
                                          {field.tooltip}
                                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-zinc-900" />
                                        </div>
                                      </div>
                                    )}
                                  </label>
                                  <FieldInput 
                                    field={field!}
                                    value={newEntryData[field!.id]}
                                    onChange={(val, metadata) => handleFieldChange(field!.id, val, metadata)}
                                    recordData={newEntryData}
                                    readonly={isReadOnly}
                                  />
                                  {field?.helperText && (
                                    <p className="text-[10px] text-zinc-500 mt-1.5 font-medium">{field.helperText}</p>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                ) : (
                  <>
                    {visibleTabs && visibleTabs.length > 0 && (
                      <div className="flex gap-2 mb-8 p-1.5 bg-zinc-100 dark:bg-zinc-950/50 rounded-2xl overflow-x-auto no-scrollbar">
                        {visibleTabs.map((tab: any) => (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTabId(tab.id)}
                            className={cn(
                              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2",
                              activeTabId === tab.id
                                ? "bg-white dark:bg-zinc-900 text-indigo-500 shadow-xl shadow-indigo-500/5"
                                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                            )}
                          >
                            {interfaceSettings.detail?.showTabIcons && (
                              <DynamicIcon name={tab.iconName || 'Layout'} size={14} className="shrink-0" />
                            )}
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {moduleData?.layout ? (
                      <div className="grid grid-cols-12 gap-x-8 gap-y-8 w-full">
                        {(moduleData.layout || [])
                          .filter((field: ModuleField) => {
                            if (visibleTabs.length === 0) return true;
                            const firstTabId = visibleTabs[0]?.id;
                            const fieldTabId = field.tabId || firstTabId;
                            return fieldTabId === activeTabId;
                          })
                          .sort((a, b) => ((a.rowIndex || 0) - (b.rowIndex || 0)) || ((a.startCol || 0) - (b.startCol || 0)))
                          .map((field: ModuleField) => {
                            if (!isFieldVisible(field, newEntryData, visibilityContext)) return null;
                            
                            return (
                                <div 
                                  key={field.id} 
                                  className={cn(
                                    "space-y-2",
                                    field.colSpan === 1 ? "col-span-1" :
                                    field.colSpan === 2 ? "col-span-2" :
                                    field.colSpan === 3 ? "col-span-3" :
                                    field.colSpan === 4 ? "col-span-4" :
                                    field.colSpan === 5 ? "col-span-5" :
                                    field.colSpan === 6 ? "col-span-6" :
                                    field.colSpan === 7 ? "col-span-7" :
                                    field.colSpan === 8 ? "col-span-8" :
                                    field.colSpan === 9 ? "col-span-9" :
                                    field.colSpan === 10 ? "col-span-10" :
                                    field.colSpan === 11 ? "col-span-11" : "col-span-12"
                                  )}
                                  style={{
                                    gridColumnStart: field.startCol ? field.startCol + 1 : 'auto',
                                    gridRowStart: (field.rowIndex !== undefined) ? field.rowIndex + 1 : 'auto'
                                  }}
                                >
                                {field.type === 'heading' ? (
                                  <h4 className={cn(
                                    "font-bold text-zinc-900 dark:text-white mt-2",
                                    field.options?.[0] === 'h1' ? "text-2xl" :
                                    field.options?.[0] === 'h3' ? "text-lg" :
                                    field.options?.[0] === 'h4' ? "text-base" : "text-xl"
                                  )}>{field.label}</h4>
                                ) : field.type === 'divider' ? (
                                  <div className="w-full h-px bg-zinc-200 dark:bg-zinc-800 my-2" />
                                ) : field.type === 'spacer' ? (
                                  <div className="w-full h-8" />
                                ) : field.type === 'alert' ? (
                                  <div className={cn(
                                    "p-4 rounded-xl border text-sm",
                                    field.options?.[0] === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" :
                                    field.options?.[0] === 'warning' ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400" :
                                    field.options?.[0] === 'error' ? "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400" :
                                    "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                                  )}>
                                    {field.label}
                                  </div>
                                ) : ['fieldGroup', 'group', 'card', 'accordion', 'tabs_nested'].includes(field.type) ? (
                                  <CollapsibleFieldGroup field={field}>
                                    <div className="space-y-4">
                                      {(field.fields || []).map((nestedField: any) => {
                                        if (!isFieldVisible(nestedField, newEntryData[field.id] || {}, visibilityContext)) return null;
                                        return (
                                        <div key={nestedField.id} className="space-y-2">
                                          <label className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 relative group/label">
                                            {nestedField.label}
                                            {nestedField.tooltip && (
                                              <div className="relative cursor-help">
                                                <LucideIcons.HelpCircle size={10} className="text-zinc-400 hover:text-indigo-500 transition-colors" />
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 text-white text-[10px] rounded-lg opacity-0 group-hover/label:opacity-100 pointer-events-none transition-all duration-200 whitespace-pre-wrap w-48 shadow-xl border border-white/10 z-50">
                                                  {nestedField.tooltip}
                                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-zinc-900" />
                                                </div>
                                              </div>
                                            )}
                                          </label>
                                          <FieldInput 
                                            field={nestedField}
                                            value={(() => {
                                              const val = newEntryData[field.id]?.[nestedField.id];
                                              if (val !== undefined) return val;
                                              return calculateDefaultValue(nestedField, newEntryData[field.id] || {});
                                            })()}
                                            onChange={(val, metadata) => handleFieldChange(nestedField.id, val, metadata)}
                                            recordData={newEntryData[field.id] || {}}
                                          />
                                        </div>
                                      )})}
                                    </div>
                                  </CollapsibleFieldGroup>
                                ) : field.type === 'repeatableGroup' ? (
                                  <CollapsibleFieldGroup field={field} count={(newEntryData[field.id] || []).length}>
                                    <RepeatableGroupBlock 
                                      field={field}
                                      value={newEntryData[field.id] || []}
                                      onChange={(val) => handleFieldChange(field.id, val)}
                                      hideHeader={true}
                                    />
                                  </CollapsibleFieldGroup>
                                ) : (
                                  <>
                                    <label className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 mb-2 relative group/label">
                                      {field.label}
                                      {field.required && <span className="text-rose-500">*</span>}
                                      {field.tooltip && (
                                        <div className="relative cursor-help">
                                          <LucideIcons.HelpCircle size={10} className="text-zinc-400 hover:text-indigo-500 transition-colors" />
                                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 text-white text-[10px] rounded-lg opacity-0 group-hover/label:opacity-100 pointer-events-none transition-all duration-200 whitespace-pre-wrap w-48 shadow-xl border border-white/10 z-50">
                                            {field.tooltip}
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-zinc-900" />
                                          </div>
                                        </div>
                                      )}
                                    </label>
                                      <FieldInput 
                                        field={field}
                                        value={(() => {
                                        const val = newEntryData[field.id];
                                        if (val !== undefined) return val;
                                        return calculateDefaultValue(field, newEntryData);
                                      })()}
                                        onChange={(val, metadata) => handleFieldChange(field.id, val, metadata)}
                                        recordData={newEntryData}
                                      />
                                    {field.helperText && (
                                      <p className="text-[10px] text-zinc-500 mt-1.5 font-medium">{field.helperText}</p>
                                    )}
                                  </>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="text-zinc-500 text-sm italic">
                        No fields configured for this layout.
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="p-8 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex gap-4">
                {createForm?.isMultistep && activeStepId !== createForm.steps[0].id ? (
                  <button
                    onClick={() => {
                      const visibleSteps = createForm.steps.filter((s: any) => isFieldVisible(s, newEntryData, visibilityContext));
                      const currentIdx = visibleSteps.findIndex((s: any) => s.id === activeStepId);
                      if (currentIdx > 0) {
                        setActiveStepId(visibleSteps[currentIdx - 1].id);
                      }
                    }}
                    className="flex-1 py-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 transition-colors uppercase tracking-widest text-xs"
                  >
                    Back
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      setShowNewEntryModal(false);
                      setEditingRecord(null);
                      setNewEntryData({});
                    }}
                    className="flex-1 py-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button 
                  onClick={async () => {
                    if (createForm?.isMultistep) {
                      // Validation
                      const currentStep = createForm.steps.find((s: any) => s.id === activeStepId);
                      const fieldsToValidate = currentStep ? currentStep.fields : [];
                      let hasErrors = false;
                      fieldsToValidate.forEach((fObj: any) => {
                        if (fObj.id.startsWith('visual-')) return;
                        if (!isFieldVisible(fObj, newEntryData, visibilityContext)) return;
                        const field = allFields.find(f => f.id === fObj.id);
                        const isRequired = fObj.required || field?.required;
                        const value = newEntryData[fObj.id];
                        if (isRequired && (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0))) {
                          hasErrors = true;
                        }
                      });
                      if (hasErrors) {
                        toast.error('Please fill in all required fields.');
                        return;
                      }

                      const visibleSteps = createForm.steps.filter((s: any) => isFieldVisible(s, newEntryData, visibilityContext));
                      const currentIdx = visibleSteps.findIndex((s: any) => s.id === activeStepId);
                      if (currentIdx < visibleSteps.length - 1) {
                        setActiveStepId(visibleSteps[currentIdx + 1].id);
                        return;
                      }
                    }
                    handleCreateEntry();
                  }}
                  disabled={isSubmitting}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting && <LucideIcons.Loader2 size={18} className="animate-spin" />}
                  {isSubmitting ? 'Saving...' : (createForm?.isMultistep && activeStepId !== createForm.steps[createForm.steps.length - 1].id ? 'Continue' : (createForm?.settings?.submitLabel || 'Create Entry'))}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showQuickActionModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowQuickActionModal(false);
                setActiveQuickAction(null);
                setActionForm(null);
                setActionFormData({});
              }}
              className="absolute inset-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-2xl flex flex-col z-10 animate-in zoom-in-95 duration-350"
            >
              <div className="p-8 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                    <LucideIcons.Zap size={20} />
                  </div>
                  Quick Action: {activeQuickAction?.label}
                </h2>
                <button 
                  onClick={() => {
                    setShowQuickActionModal(false);
                    setActiveQuickAction(null);
                    setActionForm(null);
                    setActionFormData({});
                  }}
                  className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar w-full">
                {actionForm ? (
                  <div className="space-y-10 w-full">
                    {actionForm.isMultistep && (
                      <div className="flex items-center gap-4 px-2 mb-8 overflow-x-auto no-scrollbar py-2 border-b border-zinc-100 dark:border-zinc-800">
                        {actionForm.steps
                          .filter((s: any) => isFieldVisible(s, actionFormData, visibilityContext))
                          .map((step: any, idx: number, list: any[]) => {
                            const isActive = actionStepId === step.id;
                            const activeIdx = list.findIndex(s => s.id === actionStepId);
                            const isCompleted = activeIdx > idx;

                            return (
                              <div key={step.id} className="flex items-center gap-3 shrink-0">
                                <div className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-300",
                                  isActive ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : 
                                  isCompleted ? "bg-emerald-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                                )}>
                                  {isCompleted ? <LucideIcons.Check size={12} /> : idx + 1}
                                </div>
                                <span className={cn(
                                  "text-[9px] font-black uppercase tracking-widest transition-colors",
                                  isActive ? "text-zinc-900 dark:text-white" : "text-zinc-400"
                                )}>{step.title}</span>
                                {idx < list.length - 1 && (
                                  <div className="w-8 h-px bg-zinc-200 dark:bg-zinc-800 ml-2" />
                                )}
                              </div>
                            );
                        })}
                      </div>
                    )}

                    <div className="grid grid-cols-12 gap-x-8 gap-y-8 w-full font-sans select-none">
                      {(() => {
                        const currentStep = actionForm.isMultistep 
                          ? actionForm.steps.find((s: any) => s.id === actionStepId)
                          : null;
                        const fields = currentStep ? currentStep.fields : actionForm.fields;

                        return (fields || []).map((fObj: any) => {
                          const isVisual = fObj.id.startsWith('visual-');
                          const field = isVisual ? null : allFields.find(f => f.id === fObj.id);
                          if (!isVisual && !field) return null;

                          // Evaluate Visibility
                          if (!isFieldVisible(fObj, actionFormData, visibilityContext)) return null;

                          const labelOverride = fObj.labelOverride || field?.label;
                          const isRequired = fObj.required || field?.required;
                          const isReadOnly = fObj.readOnly || (field as any)?.readOnly;
                          const error = actionFormErrors[fObj.id];

                          return (
                            <div key={fObj.id} className={cn(
                              "space-y-2",
                              fObj.width === 'half' ? "col-span-6" : "col-span-12"
                            )}>
                              {isVisual ? (
                                <div className="py-2 animate-in fade-in duration-300">
                                  {fObj.type === 'heading' && (
                                    <h4 className="font-bold text-zinc-900 dark:text-white mt-2 text-xl">{fObj.labelOverride || 'Section Heading'}</h4>
                                  )}
                                  {fObj.type === 'divider' && (
                                    <div className="w-full h-px bg-zinc-200 dark:bg-zinc-800 my-2" />
                                  )}
                                  {fObj.type === 'spacer' && (
                                    <div style={{ height: fObj.height === 'sm' ? 16 : fObj.height === 'lg' ? 64 : fObj.height === 'xl' ? 128 : 32 }} />
                                  )}
                                  {fObj.type === 'html-text' && (
                                    <div className="text-sm text-zinc-500 leading-relaxed prose dark:prose-invert max-w-none">
                                      {fObj.labelOverride || 'Text content goes here...'}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <>
                                  <label className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 mb-2 relative group/label">
                                    {labelOverride}
                                    {isRequired && <span className="text-rose-500">*</span>}
                                    {field?.tooltip && (
                                      <div className="relative cursor-help">
                                        <LucideIcons.HelpCircle size={10} className="text-zinc-400 hover:text-indigo-500 transition-colors" />
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 text-white text-[10px] rounded-lg opacity-0 group-hover/label:opacity-100 pointer-events-none transition-all duration-200 whitespace-pre-wrap w-48 shadow-xl border border-white/10 z-50">
                                          {field.tooltip}
                                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-zinc-900" />
                                        </div>
                                      </div>
                                    )}
                                  </label>
                                  <FieldInput 
                                    field={field!}
                                    value={actionFormData[field!.id]}
                                    onChange={(val) => {
                                      setActionFormData(prev => ({ ...prev, [field!.id]: val }));
                                      if (actionFormErrors[field!.id]) {
                                        setActionFormErrors(prev => {
                                          const next = { ...prev };
                                          delete next[field!.id];
                                          return next;
                                        });
                                      }
                                    }}
                                    recordData={actionFormData}
                                    readonly={isReadOnly}
                                    allFields={allFields}
                                  />
                                  {error && (
                                    <p className="text-[10px] text-rose-500 mt-1 font-semibold">{error}</p>
                                  )}
                                  {field?.helperText && !error && (
                                    <p className="text-[10px] text-zinc-500 mt-1.5 font-medium">{field.helperText}</p>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-zinc-500 italic">
                    No action form layout configured. Click Submit to execute.
                  </div>
                )}
              </div>
              <div className="p-8 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex gap-4">
                {actionForm?.isMultistep && actionStepId !== actionForm.steps[0].id ? (
                  <button
                    onClick={() => {
                      const visibleSteps = actionForm.steps.filter((s: any) => isFieldVisible(s, actionFormData, visibilityContext));
                      const currentIdx = visibleSteps.findIndex((s: any) => s.id === actionStepId);
                      if (currentIdx > 0) {
                        setActionStepId(visibleSteps[currentIdx - 1].id);
                      }
                    }}
                    className="flex-1 py-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 transition-colors uppercase tracking-widest text-xs"
                  >
                    Back
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      setShowQuickActionModal(false);
                      setActiveQuickAction(null);
                      setActionForm(null);
                      setActionFormData({});
                    }}
                    className="flex-1 py-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button 
                  onClick={async () => {
                    if (actionForm?.isMultistep) {
                      // Validation
                      const currentStep = actionForm.steps.find((s: any) => s.id === actionStepId);
                      const fieldsToValidate = currentStep ? currentStep.fields : [];
                      let hasErrors = false;
                      const errors: Record<string, string> = {};
                      fieldsToValidate.forEach((fObj: any) => {
                        if (fObj.id.startsWith('visual-')) return;
                        if (!isFieldVisible(fObj, actionFormData, visibilityContext)) return;
                        const field = allFields.find(f => f.id === fObj.id);
                        const isRequired = fObj.required || field?.required;
                        const value = actionFormData[fObj.id];
                        if (isRequired && (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0))) {
                          hasErrors = true;
                          errors[fObj.id] = 'This field is required';
                        }
                      });
                      if (hasErrors) {
                        setActionFormErrors(errors);
                        toast.error('Please fill in all required fields.');
                        return;
                      }

                      const visibleSteps = actionForm.steps.filter((s: any) => isFieldVisible(s, actionFormData, visibilityContext));
                      const currentIdx = visibleSteps.findIndex((s: any) => s.id === actionStepId);
                      if (currentIdx < visibleSteps.length - 1) {
                        setActionStepId(visibleSteps[currentIdx + 1].id);
                        return;
                      }
                    }
                    handleSubmitQuickAction();
                  }}
                  disabled={isSubmitting}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting && <LucideIcons.Loader2 size={18} className="animate-spin" />}
                  {isSubmitting ? 'Submitting...' : (actionForm?.isMultistep && actionStepId !== actionForm.steps[actionForm.steps.length - 1].id ? 'Continue' : (actionForm?.settings?.submitLabel || 'Submit'))}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {recordToDelete && (
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRecordToDelete(null)}
              className="absolute inset-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-[440px] max-w-[95vw] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-2xl p-10 space-y-8"
            >
              <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center text-rose-500 mx-auto">
                <LucideIcons.AlertCircle size={32} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Delete Entry?</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                  Are you sure you want to delete this record? This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setRecordToDelete(null)}
                  className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-xl font-bold text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDeleteEntry(recordToDelete)}
                  className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-700 transition-all shadow-xl shadow-rose-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {activeDetailRecordId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setActiveDetailRecordId(null);
                queryClient.invalidateQueries({ queryKey: ['records', tenant?.id, moduleId] });
              }}
              className="absolute inset-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-[92vw] xl:max-w-7xl h-[85vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden z-10"
            >
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <RecordDetailView 
                  moduleIdProp={moduleId} 
                  recordIdProp={activeDetailRecordId} 
                  isModal={true} 
                  onClose={() => {
                    setActiveDetailRecordId(null);
                    queryClient.invalidateQueries({ queryKey: ['records', tenant?.id, moduleId] });
                  }} 
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
};
