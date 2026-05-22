import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom';
import { 
  motion, 
  AnimatePresence 
} from 'motion/react';
import { 
  Trash2, 
  Edit2, 
  Loader2,
  ArrowLeft, 
  ChevronRight,
  ChevronLeft,
  History, 
  AlertCircle, 
  GitFork,
  X,
  Zap,
  RefreshCw,
  CheckCircle2,
  Lock,
  HelpCircle,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { toast } from 'sonner';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { MODULES } from '../../constants/modules';
import { DATA_API_URL } from '../../config';
import { FieldInput } from '../../components/FieldInput';
import { generateAISummary, evaluateCalculations } from '../../services/aiService';
import { cn, isFieldVisible, flattenFields, calculateHeight, getFieldValue } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

import { compactLayout } from '../../lib/layoutEngine';
import { Module, ModuleField } from '../../types/platform';
import { calculateDefaultValue } from '../../services/fieldService';
import { CollapsibleFieldGroup } from '../../components/UI/CollapsibleFieldGroup';
import { WorkflowPreview } from '../../components/Builder/Workflow/WorkflowPreview';
import { RepeatableGroupBlock } from '../../components/Platform/RepeatableGroupBlock';
import { AccordionContainer } from '../../components/UI/AccordionContainer';
import { RecordDetailSkeleton } from '../../components/Platform/RecordDetailSkeleton';
import { DynamicIcon } from '../../components/UI/DynamicIcon';


interface WorkflowState {
  currentNodeId: string;
  transitions?: any[];
  history: {
    nodeId: string;
    timestamp: string;
    action?: string;
    triggeredBy?: string;
  }[];
}

export const RecordDetailView = () => {
  const { moduleId, recordId } = useParams();
  const navigate = useNavigate();
  const auth = useAuth();
  const { session, user: supabaseUser } = auth;
  const { tenant, user: platformUser, isLoading: platformLoading, setBreadcrumbOverride, members } = usePlatform();
  const [moduleData, setModuleData] = useState<Module | null>(null);
  const [record, setRecord] = useState<Record<string, any> | null>(null);
  const [syncingConnectors, setSyncingConnectors] = useState<Record<string, boolean>>({});

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

  const [loading, setLoading] = useState(true);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [savingFieldId, setSavingFieldId] = useState<string | null>(null);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [lookupData, setLookupData] = useState<Record<string, any[]>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const isSavingRef = useRef(false);
  const pendingUpdateRef = useRef<{ data: any, fieldId: string | null } | null>(null);
  const editDataRef = useRef<Record<string, any>>({});

  // Keep ref in sync for use in handlers that shouldn't wait for re-renders
  useEffect(() => {
    editDataRef.current = editData;
  }, [editData]);

  // Dropdown menus states and refs for toolbar
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
  const [showTransitionsMenu, setShowTransitionsMenu] = useState(false);
  const [showHistoryMenu, setShowHistoryMenu] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');

  const assigneeMenuRef = useRef<HTMLDivElement>(null);
  const transitionsMenuRef = useRef<HTMLDivElement>(null);
  const historyMenuRef = useRef<HTMLDivElement>(null);

  // Click outside hook for toolbar dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (assigneeMenuRef.current && !assigneeMenuRef.current.contains(target)) {
        setShowAssigneeMenu(false);
      }
      if (transitionsMenuRef.current && !transitionsMenuRef.current.contains(target)) {
        setShowTransitionsMenu(false);
      }
      if (historyMenuRef.current && !historyMenuRef.current.contains(target)) {
        setShowHistoryMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentAssignee = useMemo(() => {
    const assigneeId = editData.assigneeId ?? record?.assigneeId;
    if (!assigneeId) return null;
    return (members || []).find(m => m.id === assigneeId) || null;
  }, [editData.assigneeId, record?.assigneeId, members]);

  const handleUpdateAssignee = async (newAssigneeId: string | null) => {
    if (!tenant?.id || !moduleId || !recordId) return;

    // Update local state first (optimistic update)
    setRecord(prev => prev ? { ...prev, assigneeId: newAssigneeId } : null);
    setEditData(prev => ({ ...prev, assigneeId: newAssigneeId }));
    editDataRef.current = { ...editDataRef.current, assigneeId: newAssigneeId };

    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || (session as any)?.access_token;
      const res = await fetch(`${DATA_API_URL}/records/${recordId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify({
          moduleId,
          assigneeId: newAssigneeId
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update assignee');
      }

      const updatedRecord = await res.json();
      setRecord(updatedRecord);
      setEditData(prev => ({ ...prev, ...updatedRecord }));
      editDataRef.current = { ...editDataRef.current, ...updatedRecord };
      toast.success(newAssigneeId ? "Record assigned successfully" : "Assignee cleared");
    } catch (error: any) {
      console.error("Assignee Update Error:", error);
      toast.error(error.message || "Failed to update assignee");
    }
  };

  


  // Global click-away handler
  useEffect(() => {
    if (!activeFieldId) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // If we're clicking something that should NOT trigger a save (like a modal or toast), skip
      if (target.closest('.sonner-toast') || target.closest('[role="dialog"]')) return;
      
      const fieldContainer = document.querySelector(`[data-active-field="${activeFieldId}"]`);
      if (fieldContainer && !fieldContainer.contains(target)) {
        handleUpdateEntry();
      }
    };

    // Use mousedown instead of click to fire before any other click handlers
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeFieldId, editData]);

  const visibilityContext = useMemo(() => {
    return {
      user: platformUser || supabaseUser,
      tenant,
      session
    };
  }, [platformUser, supabaseUser, tenant, session]);
  
  const visibleTabs = useMemo(() => {
    if (!moduleData?.tabs) return [];
    const filtered = moduleData.tabs.filter(tab => isFieldVisible(tab, editData || record || {}, visibilityContext));
    return filtered;
  }, [moduleData?.tabs, editData, record, visibilityContext]);

  // Tab scrolling state
  const tabContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);

  const checkScroll = useCallback(() => {
    if (tabContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabContainerRef.current;
      setShowLeftScroll(scrollLeft > 0);
      setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 5);
    }
  }, []);

  const handleScroll = (direction: 'left' | 'right') => {
    if (tabContainerRef.current) {
      const scrollAmount = 200;
      tabContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [checkScroll, visibleTabs]);

  useEffect(() => {
    if (visibleTabs.length > 0 && (!activeTabId || !visibleTabs.find(t => t.id === activeTabId))) {
      setActiveTabId(visibleTabs[0].id);
    }
  }, [visibleTabs, activeTabId]);

  const allFields = useMemo(() => {
    return flattenFields(moduleData?.layout || []) as ModuleField[];
  }, [moduleData]);

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

  const recordTitle = useMemo(() => {
    if (!moduleData || (!record && Object.keys(editData).length === 0)) return 'Record Details';
    
    const titleFieldId = moduleData.config?.titleFieldId || (moduleData as any).titleFieldId;
    
    if (titleFieldId) {
      const val = editData[titleFieldId] ?? record?.[titleFieldId];
      if (val) return val;
    }

    return (
      editData._record_key || record?._record_key || 
      editData.name || record?.name || 
      editData.title || record?.title || 
      record?.id || 'Record Details'
    );
  }, [moduleData, editData, record]);

  const activeWorkflow = useMemo(() => {
    if (!moduleData) return null;
    return moduleData.workflow || (moduleData.workflows && moduleData.workflows[0]) || null;
  }, [moduleData]);

  useEffect(() => {
    if (platformLoading) return;
    if (!tenant?.id || !moduleId || !recordId) {
      setLoading(false);
      return;
    }

    // Guard: Don't re-fetch if we already have this specific record and module loaded
    if (record?.id === recordId && moduleData?.id === moduleId) {
      setLoading(false);
      return;
    }

    const fetchModAndRecord = async () => {
      setLoading(true);
      try {
        const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
        
        const prebuilt = MODULES.find(m => m.id === moduleId);
        let currentModule = moduleData;
        if (prebuilt) {
          currentModule = prebuilt as any;
          setModuleData(currentModule);
        } else {
          const modRes = await fetch(`${DATA_API_URL}/modules/${moduleId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'x-tenant-id': tenant.id
            }
          });
          if (modRes.ok) {
            currentModule = await modRes.json();
            setModuleData(currentModule);
          }
        }
        
        const recRes = await fetch(`${DATA_API_URL}/records/${recordId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenant.id
          }
        });
        
        if (recRes.ok) {
          const recData = await recRes.json();
          setRecord(recData);
          
          // CRITICAL: Compute flat fields and merge defaults into editData
          // so that calculations (including VLOOKUP) can see fields that rely on default values.
          const currentFlatFields = flattenFields(currentModule?.layout || []) as ModuleField[];
          
          const dataWithDefaults = { ...recData };
          currentFlatFields.forEach(f => {
            if (dataWithDefaults[f.id] === undefined || dataWithDefaults[f.id] === null) {
              const defaultValue = calculateDefaultValue(f, recData);
              if (defaultValue !== undefined && defaultValue !== null) {
                dataWithDefaults[f.id] = defaultValue;
              }
            }
          });

          const withCalculations = evaluateCalculations(dataWithDefaults, currentFlatFields, lookupData);
          setEditData(withCalculations);
          
          if (recordId && recData._record_key) {
            setBreadcrumbOverride(recordId, recData._record_key);
          }

          // Trigger AI summary update once on load if field exists
          const aiField = currentFlatFields.find(f => f.type === 'ai_summary');
          
          if (aiField) {
            (async () => {
              try {
                const summary = await generateAISummary(withCalculations, currentFlatFields);
                const aiRes = await fetch(`${DATA_API_URL}/records/${recordId}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-tenant-id': tenant.id!
                  },
                  body: JSON.stringify({ moduleId, ...recData, [aiField.id]: summary })
                });
                if (aiRes.ok) {
                  const updated = await aiRes.json();
                  setRecord(updated);
                  setEditData(updated);
                }
              } catch (e) {
                console.error("Load-time AI Summary failed:", e);
              }
            })();
          }
        } else if (recRes.status === 404) {
          toast.error("Record not found");
        } else {
          throw new Error(`Failed to fetch record: ${recRes.statusText}`);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchModAndRecord();
  }, [tenant?.id, moduleId, recordId, platformLoading, session?.access_token]);

  // Memoize the list names required by calculations to avoid expensive regex scanning on every render/update
  const requiredGlobalLists = useMemo(() => {
    if (!allFields.length) return [];
    const listNames = new Set<string>();
    const regex = /VLOOKUP\s*\(\s*[\s\S]*?\s*,\s*['"]([^'"]+)['"]/gi;
    
    allFields.forEach(f => {
      if (f.type === 'calculation' && f.calculationLogic) {
        let match;
        while ((match = regex.exec(f.calculationLogic)) !== null) {
          listNames.add(match[1]);
        }
      }
    });
    return Array.from(listNames);
  }, [allFields]);

  // Fetch Global Lists for VLOOKUP support in evaluateCalculations
  useEffect(() => {
    if (!requiredGlobalLists.length || !tenant?.id) return;

    const fetchLists = async () => {
      const names = requiredGlobalLists.filter(name => !lookupData[name]);
      if (names.length === 0) return;

      const newLookupData = { ...lookupData };
      let changed = false;

      for (const name of names) {
        try {
          const { data: lists } = await supabase
            .from('global_lists')
            .select('id, columns')
            .ilike('name', name);
          
          if (lists && lists.length > 0) {
            const { data: items } = await supabase
              .from('global_list_items')
              .select('data')
              .eq('list_id', lists[0].id)
              .eq('is_active', true);
            
            if (items) {
              const columns = lists[0].columns || [];
              const idToName: Record<string, string> = {};
              columns.forEach((c: any) => { idToName[c.id] = c.name; });

              const transformed = items.map(i => {
                const row: Record<string, any> = {};
                const itemData = i.data || {};
                Object.entries(itemData).forEach(([id, val]) => {
                  const colName = idToName[id] || id;
                  row[colName] = val;
                });
                return row;
              });

              newLookupData[name] = transformed;
              changed = true;
            }
          }
        } catch (err) {
          console.error(`Failed to fetch global list ${name}:`, err);
        }
      }

      if (changed) {
        setLookupData(newLookupData);
        // Re-evaluate calculations with new data
        setEditData(prev => evaluateCalculations(prev, allFields, newLookupData));
      }
    };

    fetchLists();
  }, [requiredGlobalLists, tenant?.id]);
  const handleFieldChange = (fieldId: string, val: any, metadata?: any) => {
    let updatedData = { ...editData };
    updatedData[fieldId] = val;
    
    // Execute Lookup Output Mappings
    const field = allFields.find(f => f.id === fieldId);
    if (field?.type === 'lookup' && field.lookupOutputMappings?.length) {
      // ONLY clear and populate if the lookup value itself has changed.
      // This prevents wiping mapped fields on simple auto-saves (blur events)
      // while ensuring old values are cleared when a new record is selected.
      if (val !== editData[fieldId]) {
        // First, null out all target fields to clear any previously mapped values
        field.lookupOutputMappings.forEach(mapping => {
          if (mapping.targetFieldId) {
            updatedData[mapping.targetFieldId] = null;
          }
        });

        // Then, map the new values from metadata if available
        if (metadata && typeof metadata === 'object') {
          field.lookupOutputMappings.forEach(mapping => {
            if (mapping.sourceFieldId && mapping.targetFieldId) {
              const sourceValue = metadata[mapping.sourceFieldId];
              if (sourceValue !== undefined) {
                updatedData[mapping.targetFieldId] = sourceValue;
              }
            }
          });
        }
      }
    }
    
    // Re-calculate dynamic defaults that might depend on this field
    allFields.forEach(f => {
      if (f.id !== fieldId && f.defaultType === 'field_copy' && f.defaultSourceFieldId === fieldId) {
        const currentVal = updatedData[f.id];
        const oldDefault = calculateDefaultValue(f, editData);
        
        // Only overwrite if it was empty or matched the previous default
        if (!currentVal || currentVal === oldDefault) {
          updatedData[f.id] = calculateDefaultValue(f, updatedData);
        }
      }
    });

    const withCalculations = evaluateCalculations(updatedData, allFields, lookupData);
    
    // Update ref immediately so concurrent calls to handleUpdateEntry get fresh data
    editDataRef.current = withCalculations;
    setEditData(withCalculations);
    
    return withCalculations;
  };

  const handleUpdateEntry = async (dataToSave?: any, specificFieldId?: string, silent: boolean = true) => {
    if (!tenant?.id || !moduleId || !recordId || !moduleData) return;
    
    // Use the latest data from ref if not provided
    const currentData = dataToSave || editDataRef.current;
    
    // Strict guard to prevent concurrent saves
    if (isSavingRef.current) {
      // If we're already saving, store this update as "pending"
      // This ensures that the LAST change always gets persisted
      pendingUpdateRef.current = { data: currentData, fieldId: specificFieldId || activeFieldId };
      return;
    }
    
    const fieldIdBeingSaved = specificFieldId || activeFieldId;

    // Instant Lock: Clear active field immediately so the UI feels responsive
    if (fieldIdBeingSaved) {
      setActiveFieldId(null);
    }

    // 1. Validation Logic Optimization
    // Only validate the field being saved to ensure snappiness
    if (fieldIdBeingSaved) {
      const field = allFields.find(f => f.id === fieldIdBeingSaved);
      if (field?.required) {
        // Check visibility (with parent chain cache)
        const visibilityCache: Record<string, boolean> = {};
        const isVisibleWithCache = (f: any): boolean => {
          if (visibilityCache[f.id] !== undefined) return visibilityCache[f.id];
          
          const visible = isFieldVisible(f, currentData, visibilityContext);
          if (!visible) {
            visibilityCache[f.id] = false;
            return false;
          }
          
          let parentId = fieldToGroupMap[f.id];
          if (parentId) {
            const parent = allFields.find(p => p.id === parentId);
            if (parent && !isVisibleWithCache(parent)) {
              visibilityCache[f.id] = false;
              return false;
            }
          }
          
          visibilityCache[f.id] = true;
          return true;
        };

        if (isVisibleWithCache(field)) {
          const val = getFieldValue(currentData, fieldIdBeingSaved);
          if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) {
            toast.error(`${field.label || 'Field'} is required`);
            setSavingFieldId(null);
            // Clear pending since this one failed validation
            pendingUpdateRef.current = null;
            return;
          }
        }
      }

      // 2. Change Detection
      const newValue = getFieldValue(currentData, fieldIdBeingSaved);
      const oldValue = getFieldValue(record, fieldIdBeingSaved);
      if (JSON.stringify(newValue) === JSON.stringify(oldValue)) {
        setActiveFieldId(prev => prev === fieldIdBeingSaved ? null : prev);
        // Still check for pending updates if they exist
        isSavingRef.current = false;
        if (pendingUpdateRef.current) {
          const next = pendingUpdateRef.current;
          pendingUpdateRef.current = null;
          handleUpdateEntry(next.data, next.fieldId || undefined, true);
        }
        return;
      }
    }

    setSavingFieldId(fieldIdBeingSaved || 'global');
    isSavingRef.current = true;
    
    // Capture previous state for potential reversion on failure
    const previousRecord = { ...record };
    const previousEditData = { ...editData };

    try {
      // 3. Selective Payload (PATCH)
      const payload: any = { moduleId };
      if (fieldIdBeingSaved) {
        // Always include the primary field being saved
        payload[fieldIdBeingSaved] = getFieldValue(currentData, fieldIdBeingSaved);
        
        // Also include any other fields that have changed (e.g. from lookup mappings or calculations)
        allFields.forEach(f => {
          if (f.id !== fieldIdBeingSaved) {
            const newVal = getFieldValue(currentData, f.id);
            const oldVal = getFieldValue(record, f.id);
            if (newVal !== oldVal) {
              payload[f.id] = newVal;
            }
          }
        });
      } else {
        Object.assign(payload, currentData);
      }

      // OPTIMISTIC UPDATE:
      // Clear the saving indicator immediately if it's an individual field save
      // so the UI feels "instant".
      if (fieldIdBeingSaved) {
        setSavingFieldId(null);
        setActiveFieldId(prev => prev === fieldIdBeingSaved ? null : prev);
        // Update both record and editData optimistically so the UI reflects the change immediately
        setRecord(prev => ({ ...prev, ...payload }));
        setEditData(prev => ({ ...prev, ...payload }));
        editDataRef.current = { ...editDataRef.current, ...payload };
      }
      
      const token = (import.meta as any).env.VITE_DEV_TOKEN || (session as any)?.access_token;
      const method = fieldIdBeingSaved ? 'PATCH' : 'PUT';
      
      const res = await fetch(`${DATA_API_URL}/records/${recordId}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update record');
      }

      const updatedRecord = await res.json();
      
      // Final sync with server data - merge with current local state to preserve in-flight edits
      setRecord(updatedRecord);
      setEditData(prev => {
        if (!fieldIdBeingSaved) return updatedRecord;
        return {
          ...updatedRecord,
          ...prev,
          // Always take the server's version of the saved field (it may have generated autonumbers)
          [fieldIdBeingSaved]: updatedRecord[fieldIdBeingSaved]
        };
      });

      if (recordId && updatedRecord._record_key) {
        setBreadcrumbOverride(recordId, updatedRecord._record_key);
      }
      setActiveFieldId(prev => prev === fieldIdBeingSaved ? null : prev);
      if (!silent) {
        toast.success("Record updated successfully");
      }
    } catch (error: any) {
      console.error("Update Error:", error);
      toast.error(error.message || "Failed to update record");
      
      // REVERT on failure
      setRecord(previousRecord);
      setEditData(previousEditData);
    } finally {
      setSavingFieldId(null);
      setActiveFieldId(prev => prev === fieldIdBeingSaved ? null : prev);
      isSavingRef.current = false;
      
      // Check for PENDING updates
      if (pendingUpdateRef.current) {
        const next = pendingUpdateRef.current;
        pendingUpdateRef.current = null;
        handleUpdateEntry(next.data, next.fieldId || undefined, true);
      }
    }
  };



  const handleStatusTransition = async (newStatus: string, transitionTo?: string) => {
    if (!tenant?.id || !moduleId || !recordId || !record || isTransitioning) return;
    
    setIsTransitioning(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || (session as any)?.access_token;
      const res = await fetch(`${DATA_API_URL}/records/${recordId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify({
          moduleId,
          status: newStatus,
          transitionTo
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update status');
      }

      const updatedRecord = await res.json();
      setRecord(updatedRecord);
      toast.success(`Status updated to ${newStatus}`);
    } catch (error: any) {
      console.error("Status Update Error:", error);
      toast.error(error.message || "Failed to update status");
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleStartWorkflow = async () => {
    if (!tenant?.id || !moduleId || !recordId || !activeWorkflow || isTransitioning) return;
    
    const startNode = activeWorkflow.nodes.find((n: any) => n.type === 'START') || activeWorkflow.nodes[0];
    if (!startNode) {
      toast.error("No start node found in workflow.");
      return;
    }

    setIsTransitioning(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || (session as any)?.access_token;
      const res = await fetch(`${DATA_API_URL}/records/${recordId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify({
          moduleId,
          transitionTo: startNode.id
        })
      });

      if (!res.ok) throw new Error("Failed to start workflow");
      
      const updatedRecord = await res.json();
      setRecord(updatedRecord);
      toast.success("Workflow started!");
    } catch (err: any) {
      toast.error(err.message || "Failed to start workflow");
    } finally {
      setIsTransitioning(false);
    }
  };



  const handleSyncConnector = async (field: any) => {
    if (!tenant?.id || !moduleId || !recordId || !field.connectorId) return;
    
    setSyncingConnectors(prev => ({ ...prev, [field.id]: true }));
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || (session as any)?.access_token;
      
      const res = await fetch(`${DATA_API_URL}/nexus/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify({
          connectorId: field.connectorId,
          moduleId: moduleId,
          recordId: recordId,
        })
      });

      if (!res.ok) throw new Error("Sync failed");
      
      const data = await res.json();
      setRecord(data);
        
      // Update breadcrumb override
      if (recordId && data._record_key) {
        setBreadcrumbOverride(recordId, data._record_key);
      }
      setEditData(prev => ({ ...prev, ...data }));
      toast.success("Data synced successfully via " + (field.label || 'Connector'));
    } catch (err) {
      console.error("Sync Error:", err);
      toast.error("Failed to sync data from external source");
    } finally {
      setSyncingConnectors(prev => ({ ...prev, [field.id]: false }));
    }
  };

  const handleDeleteEntry = async () => {
    if (!tenant?.id || !moduleId || !recordId) return;

    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || (session as any)?.access_token;
      const res = await fetch(`${DATA_API_URL}/records/${recordId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete record');
      }

      toast.success("Record deleted successfully");
      navigate(`/workspace/modules/${moduleId}`);
    } catch (error: any) {
      console.error("Delete Error:", error);
      toast.error(error.message || "Failed to delete record");
    }
  };

  const getDensityStyles = (d: 'compact' | 'standard' | 'spacious') => {
    switch (d) {
      case 'compact':
        return {
          gapX: '12px',
          gapY: '12px',
          padding: 'p-2',
          rounded: 'rounded-xl',
          cardPaddingAndRounding: 'p-2.5 -m-2.5 rounded-xl',
          nestedGridGap: 'gap-3',
          labelSize: 'text-[9px]',
          fontSize: 'text-[10px]'
        };
      case 'spacious':
        return {
          gapX: '24px',
          gapY: '24px',
          padding: 'p-6',
          rounded: 'rounded-[32px]',
          cardPaddingAndRounding: 'p-6 -m-6 rounded-3xl',
          nestedGridGap: 'gap-8',
          labelSize: 'text-[11px]',
          fontSize: 'text-sm'
        };
      case 'standard':
      default:
        return {
          gapX: '16px',
          gapY: '24px',
          padding: 'p-4',
          rounded: 'rounded-2xl',
          cardPaddingAndRounding: 'p-4 -m-4 rounded-2xl',
          nestedGridGap: 'gap-6',
          labelSize: 'text-[10px]',
          fontSize: 'text-xs'
        };
    }
  };

  const renderNestedField = (nestedField: any) => {
    if (!isFieldVisible(nestedField, editData || record || {}, visibilityContext)) return null;
    const density = (interfaceSettings.detail as any)?.density || 'standard';
    const ds = getDensityStyles(density);
    
    return (
      <div 
        key={nestedField.id} 
        className={cn(
          "transition-all relative border-2 group/nestedField",
          ds.padding,
          ds.rounded,
          activeFieldId === nestedField.id 
            ? "bg-indigo-500/5 border-indigo-500 shadow-xl shadow-indigo-500/10 z-10" 
            : "border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:border-zinc-200 dark:hover:border-zinc-800",
          !activeFieldId && !['calculation', 'ai_summary', 'autonumber', 'automation'].includes(nestedField.type) && "cursor-pointer"
        )}
        data-field-id={nestedField.id}
        data-active-field={activeFieldId === nestedField.id ? nestedField.id : undefined}
        onClick={(e) => {
          if (activeFieldId !== nestedField.id && !['calculation', 'ai_summary', 'autonumber', 'automation'].includes(nestedField.type)) {
            e.stopPropagation();
            setActiveFieldId(nestedField.id);
          }
        }}
      >
        {activeFieldId === nestedField.id && savingFieldId === nestedField.id && (
          <div className="absolute -top-3 left-6 px-3 py-1 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg z-20 animate-in zoom-in-50 duration-300 flex items-center gap-1.5">
            <Loader2 size={10} className="animate-spin" />
            Saving
          </div>
        )}

        <label className={cn(ds.labelSize, "font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 relative group/label")}>
          {nestedField.label}
          {nestedField.required && <span className="text-rose-500">*</span>}
          {nestedField.tooltip && (
            <div className="relative cursor-help">
              <HelpCircle size={10} className="text-zinc-400 hover:text-indigo-500 transition-colors" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 text-white text-[10px] rounded-lg opacity-0 group-hover/label:opacity-100 pointer-events-none transition-all duration-200 whitespace-pre-wrap w-48 shadow-xl border border-white/10 z-50">
                {nestedField.tooltip}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-zinc-900" />
              </div>
            </div>
          )}
          {!activeFieldId && (
            ['calculation', 'ai_summary', 'autonumber', 'automation'].includes(nestedField.type) ? (
              <Lock size={8} className="opacity-0 group-hover/nestedField:opacity-100 transition-opacity text-zinc-400" />
            ) : (
              !['datatable'].includes(nestedField.type) && (
                <Edit2 size={8} className="opacity-0 group-hover/nestedField:opacity-100 transition-opacity text-indigo-500" />
              )
            )
          )}
        </label>
        <FieldInput 
          field={nestedField}
          value={(() => {
            const edited = getFieldValue(editData, nestedField.id);
            if (edited !== undefined) return edited;
            const original = getFieldValue(record, nestedField.id);
            if (original !== undefined) return original;
            return calculateDefaultValue(nestedField, editData);
          })()}
          onChange={(val, metadata) => handleFieldChange(nestedField.id, val, metadata)}
          onBlur={() => handleUpdateEntry()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleUpdateEntry();
            if (e.key === 'Escape') setActiveFieldId(null);
          }}
          readonly={savingFieldId === nestedField.id || activeFieldId !== nestedField.id}
          recordData={editData}
          allFields={allFields}
          density={density}
        />
        {nestedField.helperText && (
          <p className={cn(ds.fontSize, "text-zinc-500 mt-1.5 font-medium px-0.5 italic")}>{nestedField.helperText}</p>
        )}
      </div>
    );
  };

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
      actions: []
    };
  }, [moduleData]);

  const renderFieldsGrid = (tabId: string) => {
    if (!moduleData) return null;
    const visibleFields = compactLayout(
      (moduleData.layout || [])
        .filter((field: ModuleField) => {
          const isVisible = isFieldVisible(field, editData || record || {}, visibilityContext);
          const firstVisibleTabId = visibleTabs[0]?.id;
          const fieldTabId = field.tabId || firstVisibleTabId;
          return fieldTabId === tabId && isVisible;
        })
        .map((field: ModuleField) => ({
          ...field,
          isCollapsed: collapsedGroups[field.id] ?? field.defaultCollapsed ?? false
        }))
    );

    if (visibleFields.length === 0) {
      return (
        <div className="col-span-12 text-center py-12 text-xs font-bold uppercase tracking-widest text-zinc-400">
          No fields configured for this section
        </div>
      );
    }

    const density = (interfaceSettings.detail as any)?.density || 'standard';
    const ds = getDensityStyles(density);

    return (
      <div 
        className="grid grid-cols-12 w-full"
        style={{ gap: `${ds.gapY} ${ds.gapX}` }}
      >
        <AnimatePresence mode="popLayout">
          {visibleFields.map((field: ModuleField) => (
            <motion.div 
              key={field.id} 
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ 
                type: "spring",
                stiffness: 300,
                damping: 30,
                layout: { duration: 0.3 }
              }}
              data-field-id={field.id}
              data-active-field={activeFieldId === field.id ? field.id : undefined}
              className={cn(
                "group/field transition-all relative min-w-0",
                !activeFieldId && !['heading', 'divider', 'spacer', 'alert', 'connector', 'fieldGroup', 'repeatableGroup', 'group', 'card', 'accordion', 'tabs_nested', 'stepper', 'timeline', 'calculation', 'ai_summary', 'autonumber', 'automation', 'datatable'].includes(field.type) && "cursor-pointer"
              )}
              style={{
                gridColumn: `${field.startCol || 1} / span ${field.colSpan || 12}`,
                gridRow: `${(field.rowIndex || 0) + 1} / span ${calculateHeight(field)}`
              }}
              onClick={() => {
                if (activeFieldId !== field.id && !['heading', 'divider', 'spacer', 'alert', 'connector', 'fieldGroup', 'repeatableGroup', 'group', 'card', 'accordion', 'tabs_nested', 'stepper', 'timeline', 'calculation', 'ai_summary', 'autonumber', 'automation', 'datatable'].includes(field.type)) {
                  setActiveFieldId(field.id);
                }
              }}
            >
            <div className={cn(
              "w-full transition-all duration-200 border-2 relative",
              ds.cardPaddingAndRounding,
              activeFieldId === field.id 
                ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-500/5 ring-4 ring-indigo-500/10 z-10"
                : !activeFieldId && !['heading', 'divider', 'spacer', 'alert', 'connector', 'fieldGroup', 'repeatableGroup', 'group', 'card', 'accordion', 'tabs_nested', 'stepper', 'timeline', 'calculation', 'ai_summary', 'autonumber', 'automation', 'datatable'].includes(field.type) 
                  ? "hover:bg-indigo-500/5 hover:border-indigo-500/30 border-transparent"
                  : "border-transparent"
            )}>
              {activeFieldId === field.id && savingFieldId === field.id && (
                <div className="absolute -top-3 left-6 px-3 py-1 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg z-20 animate-in zoom-in-50 duration-300 flex items-center gap-1.5">
                  <Loader2 size={10} className="animate-spin" />
                  Saving
                </div>
              )}

            {field.type === 'heading' ? (
              <h4 className={cn(
                "font-bold text-zinc-900 dark:text-white mt-4",
                field.options?.[0] === 'h1' ? "text-2xl" :
                field.options?.[0] === 'h3' ? "text-lg" :
                field.options?.[0] === 'h4' ? "text-base" : "text-xl"
              )}>{field.label}</h4>
            ) : field.type === 'divider' ? (
              <div className="w-full h-px bg-zinc-200 dark:bg-zinc-800 my-4" />
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
            ) : field.type === 'accordion' ? (
              <AccordionContainer 
                field={field}
                renderContent={(section) => (
                  <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: ds.gapX }}>
                    {(section.fields || []).map(renderNestedField)}
                  </div>
                )}
              />
            ) : ['fieldGroup', 'group', 'card', 'tabs_nested', 'stepper', 'timeline'].includes(field.type) ? (
              <CollapsibleFieldGroup 
                field={field}
                isCollapsed={collapsedGroups[field.id] ?? field.defaultCollapsed ?? false}
                onToggle={(collapsed) => setCollapsedGroups(prev => ({ ...prev, [field.id]: collapsed }))}
              >
                <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: ds.gapX }}>
                  {(field.fields || []).map(renderNestedField)}
                </div>
              </CollapsibleFieldGroup>
            ) : field.type === 'repeatableGroup' ? (
              <RepeatableGroupBlock 
                 field={field}
                 value={getFieldValue(editData, field.id) ?? (record?.[field.id] || [])}
                 onChange={(newVal) => handleFieldChange(field.id, newVal)}
                 onBlur={() => handleUpdateEntry(undefined, field.id)}
                 hideHeader={true}
              />
            ) : field.type === 'connector' ? (
              <div className="p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-3xl space-y-4 shadow-inner relative overflow-hidden group/connector">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16 group-hover/connector:scale-150 transition-transform duration-1000" />
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white dark:bg-zinc-900 rounded-2xl flex items-center justify-center text-indigo-500 shadow-xl shadow-indigo-500/10 border border-indigo-500/20">
                      <Zap size={24} />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-tight">{field.label}</h5>
                      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Nexus Connector Active</p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSyncConnector(field);
                    }}
                    disabled={syncingConnectors[field.id]}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                  >
                    {syncingConnectors[field.id] ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <RefreshCw size={14} />
                    )}
                    {syncingConnectors[field.id] ? 'Syncing...' : 'Sync Data'}
                  </button>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/50 dark:bg-black/20 rounded-lg border border-zinc-100 dark:border-white/5 w-fit">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Reshaping Engine Engaged</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 relative group/label">
                  {field.label}
                  {field.required && <span className="text-rose-500">*</span>}
                  {field.tooltip && (
                    <div className="relative cursor-help">
                      <HelpCircle size={10} className="text-zinc-400 hover:text-indigo-500 transition-colors" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 text-white text-[10px] rounded-lg opacity-0 group-hover/label:opacity-100 pointer-events-none transition-all duration-200 whitespace-pre-wrap w-48 shadow-xl border border-white/10 z-50">
                        {field.tooltip}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-zinc-900" />
                      </div>
                    </div>
                  )}
                  {!activeFieldId && (
                    ['calculation', 'ai_summary', 'autonumber', 'automation'].includes(field.type) ? (
                      <Lock size={8} className="opacity-0 group-hover/field:opacity-100 transition-opacity text-zinc-400" />
                    ) : (
                      !['datatable'].includes(field.type) && (
                        <Edit2 size={8} className="opacity-0 group-hover/field:opacity-100 transition-opacity text-indigo-500" />
                      )
                    )
                  )}
                </label>
                <FieldInput 
                  field={field}
                  value={(() => {
                    const edited = getFieldValue(editData, field.id);
                    if (edited !== undefined) return edited;
                    const original = getFieldValue(record, field.id);
                    if (original !== undefined) return original;
                    return calculateDefaultValue(field, editData);
                  })()}
                  onChange={(val, metadata) => handleFieldChange(field.id, val, metadata)}
                  onBlur={() => handleUpdateEntry()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdateEntry();
                    if (e.key === 'Escape') setActiveFieldId(null);
                  }}
                  readonly={savingFieldId === field.id || activeFieldId !== field.id}
                  recordData={editData}
                  allFields={allFields}
                />
                {field.helperText && (
                  <p className="text-[10px] text-zinc-500 mt-1.5 font-medium px-0.5 italic">{field.helperText}</p>
                )}
              </div>
            )}
            </div>
          </motion.div>
        ))}
        </AnimatePresence>
      </div>
    );
  };

  if (loading || platformLoading) return <RecordDetailSkeleton />;


  if (!moduleData || !record) return <Navigate to="/workspace" replace />;

  return (
    <div className="flex flex-col w-full px-6 lg:px-12 pt-6 pb-20 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            to={`/workspace/modules/${moduleId}`}
            className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-xl transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20">
            <Icon size={24} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                {recordTitle}
              </h1>
            </div>
            <div className="text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1.5 text-xs">
              {(() => {
                const config = moduleData.config || (moduleData as any).config;
                const subtitleFieldIds = config?.subtitleFieldIds;
                
                if (subtitleFieldIds && Array.isArray(subtitleFieldIds) && subtitleFieldIds.length > 0) {
                  const items = subtitleFieldIds.map((fieldId) => {
                    // Special handling for metadata fields
                    if (fieldId === 'createdAt') {
                      return record.createdAt ? new Date(record.createdAt).toLocaleDateString() : 'Just now';
                    }
                    if (fieldId === 'createdBy') {
                      return record.createdBy || 'System';
                    }
                    if (fieldId === '_record_key') {
                      return record._record_key || record.id;
                    }

                    const value = getFieldValue(editData, fieldId) ?? getFieldValue(record, fieldId);
                    if (!value && value !== 0) return null;
                    
                    // Format value if it's a date or other special type
                    const field = allFields.find(f => f.id === fieldId);
                    let displayValue = value;
                    if (field?.type === 'date' && value) {
                      displayValue = new Date(value).toLocaleDateString();
                    }
                    
                    return displayValue;
                  }).filter(Boolean);

                  if (items.length > 0) {
                    return items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        {idx > 0 && <span className="w-1 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />}
                        <span className="font-medium">{String(item)}</span>
                      </div>
                    ));
                  }
                }
                
                // Fallback to default: Module Name • Record Key • Created Date
                return (
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">{moduleData.name}</span>
                    {(editData._record_key || record._record_key) && (
                      <>
                        <span className="w-1 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                        <span className="font-medium">{editData._record_key || record._record_key}</span>
                      </>
                    )}
                    <span className="w-1 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                    <span>Created {record.createdAt ? new Date(record.createdAt).toLocaleDateString() : 'Just now'}</span>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Status & Transitions Dropdown */}
          {activeWorkflow ? (
            <div className="relative" ref={transitionsMenuRef}>
              {(() => {
                const wState = record.workflowState as WorkflowState | undefined;
                const currentNode = activeWorkflow?.nodes.find((n: any) => n.id === wState?.currentNodeId);

                if (!currentNode) {
                  return (
                    <button
                      onClick={handleStartWorkflow}
                      disabled={isTransitioning}
                      className="h-10 px-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                    >
                      {isTransitioning ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <LucideIcons.Zap size={12} fill="currentColor" />
                      )}
                      <span>Initialize Workflow</span>
                    </button>
                  );
                }

                const transitions = wState?.transitions || activeWorkflow?.edges?.filter((e: any) => e.source === wState?.currentNodeId) || [];

                return (
                  <>
                    <button
                      onClick={() => setShowTransitionsMenu(!showTransitionsMenu)}
                      className="h-10 px-4 bg-indigo-500/10 dark:bg-indigo-500/5 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider relative overflow-hidden group/status"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)] animate-pulse" />
                      <span>{currentNode.name}</span>
                      <LucideIcons.ChevronDown size={14} className="text-indigo-500/70 group-hover:text-indigo-500 transition-colors" />
                    </button>

                    <AnimatePresence>
                      {showTransitionsMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 overflow-hidden p-1.5 space-y-0.5"
                        >
                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-2.5 py-1.5">Transitions</p>
                          {transitions.map((edge: any) => {
                            const targetNode = activeWorkflow?.nodes.find((n: any) => n.id === edge.target);
                            if (!targetNode) return null;

                            return (
                              <button
                                key={edge.id}
                                onClick={() => {
                                  handleStatusTransition(targetNode.name, targetNode.id);
                                  setShowTransitionsMenu(false);
                                }}
                                disabled={isTransitioning}
                                className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex items-center justify-between group/item disabled:opacity-50"
                              >
                                <span>{targetNode.name}</span>
                                <LucideIcons.ArrowRight size={12} className="text-zinc-400 group-hover/item:translate-x-0.5 transition-transform" />
                              </button>
                            );
                          })}
                          {transitions.length === 0 && (
                            <p className="text-[10px] text-zinc-400 italic px-2.5 py-2">No available transitions</p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                );
              })()}
            </div>
          ) : null}

          {/* Visualizer Trigger */}
          {activeWorkflow && (
            <button
              onClick={() => setShowVisualizer(true)}
              title="View Workflow Diagram"
              className="w-10 h-10 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-xl transition-all flex items-center justify-center hover:scale-105 active:scale-95 shadow-sm"
            >
              <GitFork size={16} />
            </button>
          )}

          {/* History Popover */}
          {activeWorkflow && (
            <div className="relative" ref={historyMenuRef}>
              <button
                onClick={() => setShowHistoryMenu(!showHistoryMenu)}
                title="Workflow History"
                className={cn(
                  "w-10 h-10 border text-zinc-500 rounded-xl transition-all flex items-center justify-center hover:scale-105 active:scale-95 shadow-sm",
                  showHistoryMenu 
                    ? "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-500/50 text-indigo-600 dark:text-indigo-400"
                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:text-indigo-500 dark:hover:text-indigo-400"
                )}
              >
                <History size={16} />
              </button>

              <AnimatePresence>
                {showHistoryMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col"
                  >
                    <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 flex items-center justify-between">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Workflow History</span>
                      <History size={12} className="text-zinc-400" />
                    </div>

                    <div className="max-h-64 overflow-y-auto p-3 space-y-4 relative before:absolute before:inset-y-3 before:left-5 before:w-px before:bg-zinc-200 dark:before:bg-zinc-800 scrollbar-thin">
                      {(() => {
                        const wState = record.workflowState as WorkflowState | undefined;
                        const history = wState?.history || [];

                        if (history.length === 0) {
                          return (
                            <p className="text-[10px] text-zinc-400 italic text-center py-4 pl-4">No history available</p>
                          );
                        }

                        return history.map((h, i) => {
                          const node = activeWorkflow?.nodes?.find((n: any) => n.id === h.nodeId);
                          return (
                            <div key={i} className="relative pl-7 flex flex-col gap-0.5">
                              <div className={cn(
                                "absolute left-1.5 top-1 w-2.5 h-2.5 rounded-full bg-white dark:bg-zinc-950 border-2 z-10 transition-colors",
                                i === history.length - 1 ? "border-indigo-500 scale-110 shadow-lg shadow-indigo-500/20" : "border-zinc-300 dark:border-zinc-700"
                              )} />
                              <p className="text-[11px] font-bold text-zinc-900 dark:text-white leading-tight">
                                {node?.name || 'Unknown Node'}
                              </p>
                              <div className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium space-x-1 flex items-center flex-wrap">
                                <span>{new Date(h.timestamp).toLocaleDateString()} {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                {h.triggeredBy && (
                                  <>
                                    <span>•</span>
                                    <span className="text-indigo-500/80">{h.triggeredBy}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Assignee Picker */}
          <div className="relative" ref={assigneeMenuRef}>
            <button
              onClick={() => setShowAssigneeMenu(!showAssigneeMenu)}
              className="h-10 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-indigo-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all flex items-center gap-2 group text-xs font-semibold shadow-sm"
            >
              {currentAssignee ? (
                <>
                  {currentAssignee.avatarUrl ? (
                    <img src={currentAssignee.avatarUrl} alt={currentAssignee.name} className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                      {currentAssignee.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                  )}
                  <span className="text-zinc-700 dark:text-zinc-300 max-w-[100px] truncate">{currentAssignee.name}</span>
                </>
              ) : (
                <>
                  <div className="w-5 h-5 rounded-full border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-400 group-hover:text-indigo-500 group-hover:border-indigo-500 transition-colors">
                    <LucideIcons.User size={10} />
                  </div>
                  <span className="text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">Assignee</span>
                </>
              )}
              <LucideIcons.ChevronDown size={14} className="text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
            </button>

            <AnimatePresence>
              {showAssigneeMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col max-h-80"
                >
                  {/* Actions */}
                  <div className="p-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 space-y-1">
                    <button
                      onClick={() => {
                        const me = members.find(m => m.id === platformUser?.memberId || m.id === platformUser?.cuid);
                        if (me) handleUpdateAssignee(me.id);
                        setShowAssigneeMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 transition-colors flex items-center gap-2"
                    >
                      <LucideIcons.UserCheck size={12} />
                      <span>Assign to me</span>
                    </button>
                    <button
                      onClick={() => {
                        handleUpdateAssignee(null);
                        setShowAssigneeMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2"
                    >
                      <LucideIcons.UserMinus size={12} />
                      <span>Clear Assignee</span>
                    </button>
                  </div>

                  {/* Search */}
                  <div className="p-2 border-b border-zinc-100 dark:border-zinc-800 relative">
                    <LucideIcons.Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={12} />
                    <input
                      type="text"
                      placeholder="Search members..."
                      value={assigneeSearch}
                      onChange={(e) => setAssigneeSearch(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-300 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Members List */}
                  <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 max-h-48 scrollbar-thin">
                    {(members || [])
                      .filter(m => !m.isSynthetic && m.name.toLowerCase().includes(assigneeSearch.toLowerCase()))
                      .map(member => {
                        const isSelected = (editData.assigneeId ?? record?.assigneeId) === member.id;
                        return (
                          <button
                            key={member.id}
                            onClick={() => {
                              handleUpdateAssignee(member.id);
                              setShowAssigneeMenu(false);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                              isSelected && "bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 font-semibold"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {member.avatarUrl ? (
                                <img src={member.avatarUrl} alt={member.name} className="w-5 h-5 rounded-full object-cover" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center text-[9px] font-bold">
                                  {member.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="truncate leading-none">{member.name}</p>
                                <p className="text-[9px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">{member.email}</p>
                              </div>
                            </div>
                            {isSelected && <LucideIcons.Check size={12} className="text-indigo-500 shrink-0 ml-2" />}
                          </button>
                        );
                      })}
                    {(members || []).filter(m => !m.isSynthetic && m.name.toLowerCase().includes(assigneeSearch.toLowerCase())).length === 0 && (
                      <p className="text-[10px] text-zinc-400 text-center py-4 italic font-medium">No members found</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Delete Button */}
          <button 
            onClick={() => setShowDeleteModal(true)}
            className="h-10 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-rose-500 rounded-xl transition-all flex items-center justify-center hover:scale-105 active:scale-95 shadow-sm"
            title="Delete Record"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="w-full space-y-8">
        {interfaceSettings.detail?.layoutType === 'split' ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
            {/* Left Navigation Menu */}
            <div className="md:col-span-1 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-[32px] p-5 space-y-4 shadow-sm">
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-2">Sections</p>
              <div className="space-y-1">
                {visibleTabs.map((tab: any) => {
                  const isActive = activeTabId === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTabId(tab.id)}
                      className={cn(
                        "w-full text-left px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-between group",
                        isActive
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {interfaceSettings.detail?.showTabIcons && (
                          <DynamicIcon name={tab.iconName || 'Layout'} size={12} className="shrink-0" />
                        )}
                        <span className="truncate">{tab.label}</span>
                      </div>
                      <ChevronRight size={12} className={cn("transition-transform flex-shrink-0 ml-2", isActive ? "text-white" : "text-zinc-400 group-hover:translate-x-0.5")} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Field Cards Container */}
            <div className="md:col-span-3 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-[32px] p-8 shadow-sm">
              {activeTabId ? renderFieldsGrid(activeTabId) : (
                <div className="text-zinc-400 text-xs text-center py-12 uppercase tracking-widest font-bold">Select a section</div>
              )}
            </div>
          </div>
        ) : interfaceSettings.detail?.layoutType === 'sidebar' || interfaceSettings.detail?.layoutType === 'single_page' || interfaceSettings.detail?.layoutType === 'single' ? (
          <div className="space-y-8">
            {visibleTabs.map((tab: any) => (
              <div key={tab.id} className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-[32px] p-8 shadow-sm space-y-6">
                <div className="pb-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                  {interfaceSettings.detail?.showTabIcons ? (
                    <DynamicIcon name={tab.iconName || 'Layout'} size={14} className="text-indigo-500 shrink-0" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  )}
                  <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">{tab.label}</h3>
                </div>
                {renderFieldsGrid(tab.id)}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-[32px] shadow-sm">
            {moduleData?.tabs && moduleData.tabs.length > 0 && (
              <div className="relative group/tabs overflow-hidden rounded-t-[31px]">
                <AnimatePresence>
                  {showLeftScroll && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
                    >
                      <div className="w-full h-full bg-gradient-to-r from-zinc-50 dark:from-zinc-900 via-zinc-50/40 dark:via-zinc-900/40 to-transparent flex items-center justify-start pl-4 opacity-0 group-hover/tabs:opacity-100 transition-opacity duration-300">
                        <button 
                          onClick={() => handleScroll('left')}
                          className="p-2 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-full shadow-xl pointer-events-auto transition-all hover:scale-110 active:scale-95 ring-4 ring-black/5 dark:ring-white/5"
                        >
                          <ChevronLeft size={18} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div 
                  ref={tabContainerRef}
                  onScroll={checkScroll}
                  className="flex gap-1.5 px-6 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 overflow-x-auto no-scrollbar scroll-smooth"
                >
                  {visibleTabs.map((tab: any) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTabId(tab.id)}
                      className={cn(
                        "px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2",
                        activeTabId === tab.id
                          ? "bg-white dark:bg-zinc-900 text-indigo-500 shadow-xl shadow-indigo-500/5"
                          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                      )}
                    >
                      {interfaceSettings.detail?.showTabIcons && (
                        <DynamicIcon name={tab.iconName || 'Layout'} size={12} className="shrink-0" />
                      )}
                      {tab.label}
                    </button>
                  ))}
                </div>

                <AnimatePresence>
                  {showRightScroll && (
                    <motion.div 
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
                    >
                      <div className="w-full h-full bg-gradient-to-l from-zinc-50 dark:from-zinc-900 via-zinc-50/40 dark:via-zinc-900/40 to-transparent flex items-center justify-end pr-4 opacity-0 group-hover/tabs:opacity-100 transition-opacity duration-300">
                        <button 
                          onClick={() => handleScroll('right')}
                          className="p-2 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-full shadow-xl pointer-events-auto transition-all hover:scale-110 active:scale-95 ring-4 ring-black/5 dark:ring-white/5"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="p-8">
              {activeTabId ? renderFieldsGrid(activeTabId) : (
                <div className="text-zinc-500 text-sm">
                  Select a section
                </div>
              )}
            </div>
          </div>
        )}
      </div>



      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="absolute inset-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-[440px] max-w-[95vw] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-2xl p-10 space-y-8"
            >
              <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center text-rose-500 mx-auto">
                <AlertCircle size={32} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Delete Entry?</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                  Are you sure you want to delete this record? This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setShowDeleteModal(false)} 
                  className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-xl font-bold text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteEntry} 
                  className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-700 transition-all shadow-xl shadow-rose-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Workflow Visualizer Modal */}
      <AnimatePresence>
        {showVisualizer && activeWorkflow && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowVisualizer(false)}
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full h-full max-w-6xl bg-zinc-950 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-8 py-6 border-b border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                    <GitFork size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight">Workflow Visualizer</h2>
                    <p className="text-xs text-zinc-500 font-medium">Visualizing the path for {record?._record_key || 'this record'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowVisualizer(false)}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-zinc-400 hover:text-white transition-all active:scale-95"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 p-8">
                <WorkflowPreview 
                  workflow={activeWorkflow} 
                  activeNodeId={(record?.workflowState as any)?.currentNodeId} 
                />
              </div>

              <div className="px-8 py-6 bg-white/5 border-t border-white/5 flex items-center justify-between">
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Active State</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-indigo-500/20 border border-indigo-500/50" />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Planned Path</span>
                  </div>
                </div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                  {activeWorkflow?.nodes?.length || 0} Nodes • {activeWorkflow?.edges?.length || 0} Transitions
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
