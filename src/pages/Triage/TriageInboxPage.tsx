import { useState, useEffect, useRef, useCallback } from 'react';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { usePositions } from '../../hooks/usePositions';
import { API_BASE_URL } from '../../config';
import { 
  Inbox, Clock, RefreshCw, Send, ChevronRight, CheckCircle, 
  AlertCircle, Zap, Search, GitFork, 
  HelpCircle, XCircle, User, Mail, Phone, FileText, Check, 
  RotateCcw, Info, ExternalLink, Layers, Copy, Play, Pause, ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { FieldInput } from '../../components/FieldInput';

// Helper: Reconstruct dynamic form fields by filtering standard DB fields
const getRecordFields = (rec: any) => {
  if (!rec) return {};
  const data = rec.data || {};
  const standardKeys = [
    'id', 'moduleId', 'status', 'associations', 'path', 'createdAt', 'updatedAt', 'createdBy', 'workflowState', 'data'
  ];
  const fields: Record<string, any> = { ...data };
  for (const [key, value] of Object.entries(rec)) {
    if (!standardKeys.includes(key)) {
      fields[key] = value;
    }
  }
  return fields;
};

// Helper: Flatten layout fields in target module config
const flattenFields = (fields: any[]): any[] => {
  const result: any[] = [];
  if (!fields) return result;
  fields.forEach(f => {
    const containerTypes = ['fieldGroup', 'group', 'card', 'accordion', 'tabs_nested', 'stepper', 'timeline'];
    if (containerTypes.includes(f.type) && f.fields) {
      result.push(...flattenFields(f.fields));
    } else {
      result.push(f);
    }
  });
  return result;
};

// Helper: Smart auto-mapping keys matching target to source
const findAutoMapKey = (targetId: string, targetLabel: string, sourceKeys: string[]) => {
  const cleanStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const targetCleanId = cleanStr(targetId);
  const targetCleanLabel = cleanStr(targetLabel);
  
  // 1. Check exact clean id match
  for (const k of sourceKeys) {
    if (cleanStr(k) === targetCleanId) return k;
  }
  // 2. Check exact clean label match
  for (const k of sourceKeys) {
    if (cleanStr(k) === targetCleanLabel) return k;
  }
  // 3. Partial check
  for (const k of sourceKeys) {
    const kClean = cleanStr(k);
    if (kClean.includes(targetCleanId) || targetCleanId.includes(kClean)) return k;
    if (kClean.includes(targetCleanLabel) || targetCleanLabel.includes(kClean)) return k;
  }
  // 4. Common aliases
  if (targetCleanId === 'name' || targetCleanId === 'fullname' || targetCleanId === 'submittedby') {
    const aliases = ['submitted_by', 'submittedby', 'name', 'fullname', 'email'];
    for (const alias of aliases) {
      const match = sourceKeys.find(k => cleanStr(k) === cleanStr(alias));
      if (match) return match;
    }
  }
  return '';
};

// Helper: Get original module this form was created under
const getOriginalModule = (rec: any, modulesList: any[]) => {
  if (!rec || !modulesList) return null;
  const fields = getRecordFields(rec);
  const origId = fields._originalModuleId || rec._originalModuleId;
  if (!origId) return null;
  return modulesList.find((m: any) => m.id === origId) || null;
};

// Helper: Get field label from original module layout if available
const getFieldLabel = (key: string, originalModule: any) => {
  if (!originalModule) return key.replace(/_/g, ' ');
  const fields = flattenFields(originalModule.layout || originalModule.config?.layout || []);
  const field = fields.find((f: any) => f.id === key);
  return field ? (field.label || field.name || key) : key.replace(/_/g, ' ');
};

// Helper: Extract customer reference number from record data
const getRecordCustomerRef = (rec: any) => {
  if (!rec) return '';
  const fields = getRecordFields(rec);
  return fields._customerRef || rec._customerRef || '';
};

// Helper: Styling options for different intake statuses
const getStatusStyles = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'new':
      return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', label: 'New' };
    case 'in review':
    case 'in_review':
      return { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', label: 'In Review' };
    case 'needs info':
    case 'needs_info':
      return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', label: 'Needs Info' };
    case 'routed':
      return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', label: 'Routed' };
    case 'rejected':
      return { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', label: 'Rejected' };
    default:
      return { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/20', label: status || 'Pending' };
  }
};

export const TriageInboxPage = () => {
  const { tenant, modules, members = [], teams = [] } = usePlatform();
  const { session, user } = useAuth();
  const queryClient = useQueryClient();
  const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token || '';
  const [triageModule, setTriageModule] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [triageRules, setTriageRules] = useState<any[]>([]);
  const [countdownText, setCountdownText] = useState<string>('');
  const [isRunningTriage, setIsRunningTriage] = useState(false);
  const [isTimerPaused, setIsTimerPaused] = useState<boolean>(() => localStorage.getItem('auto_distribution_paused') === 'true');

  const autoRunTriggeredRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(localStorage.getItem('auto_distribution_paused') === 'true' ? Date.now() : 0);
  const accumulatedPausedMsRef = useRef<number>(0);
  const lastNextRunRef = useRef<number>(0);

  
  // Collaboration / Tabs / Filter states
  const [comments, setComments] = useState<any[]>([]);
  const [newCommentBody, setNewCommentBody] = useState('');
  const [activeTab, setActiveTab] = useState<'assessment' | 'default_map' | 'source' | 'activity' | 'rules'>('assessment');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'pending' | 'needs_info' | 'routed' | 'rejected' | 'all'>('pending');

  // Manual Routing panel states
  const [isRouting, setIsRouting] = useState(false);
  const [selectedTargetModuleId, setSelectedTargetModuleId] = useState('');
  const [mappings, setMappings] = useState<Record<string, { type: 'source' | 'custom' | 'ignore', value: string }>>({});
  const [routingInProgress, setRoutingInProgress] = useState(false);
  const [isEditingForm, setIsEditingForm] = useState(false);
  const [editedFormData, setEditedFormData] = useState<Record<string, any>>({});

  const { positions } = usePositions();

  const currentMember = members?.find((m: any) => m.userId === user?.id);
  const currentMemberId = currentMember?.id || '';

  const handleAssigneeChange = async (newAssigneeId: string | null, assigneeType: string = 'USER') => {
    if (!selectedRecord) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/data/records/${selectedRecord.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant?.id || '',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          moduleId: triageModule.id,
          assigneeId: newAssigneeId,
          assigneeType: newAssigneeId ? assigneeType : 'USER'
        })
      });

      if (!res.ok) {
        const errObj = await res.json();
        throw new Error(errObj.error || 'Failed to update assignee');
      }

      const updatedRecord = await res.json();

      // Update in state
      setSelectedRecord(updatedRecord);
      setRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
      
      let assigneeName = 'Unassigned';
      if (newAssigneeId) {
        if (assigneeType === 'USER') {
          const m = members.find((mem: any) => mem.id === newAssigneeId);
          assigneeName = m ? m.name : 'Unknown User';
        } else if (assigneeType === 'TEAM') {
          const t = teams.find((team: any) => team.id === newAssigneeId);
          assigneeName = t ? `Team: ${t.name}` : 'Unknown Team';
        } else {
          const p = positions.find((pos: any) => pos.id === newAssigneeId);
          assigneeName = p ? `Position: ${p.title}` : 'Unknown Position';
        }
      }

      toast.success(newAssigneeId ? `Assigned to ${assigneeName}` : 'Set to unassigned');

      // Post a system note
      const userLabel = user?.user_metadata?.full_name || user?.email || 'System User';
      await postSystemComment(
        selectedRecord.id,
        `Assignee updated to "${assigneeName}" by ${userLabel}`
      );
    } catch (err: any) {
      toast.error(err.message || 'Assignment failed');
    }
  };

  const handleAssigneeTypeChange = async (newType: string) => {
    if (!selectedRecord) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/data/records/${selectedRecord.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant?.id || '',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          moduleId: triageModule.id,
          assigneeId: null,
          assigneeType: newType
        })
      });

      if (!res.ok) {
        const errObj = await res.json();
        throw new Error(errObj.error || 'Failed to update assignee type');
      }

      const updatedRecord = await res.json();
      setSelectedRecord(updatedRecord);
      setRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
      toast.success(`Switched assignment type to ${newType.toLowerCase()}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update assignee type');
    }
  };
  
  // Port coordinates state for node connection curves
  const [portCoords, setPortCoords] = useState<Record<string, { x: number, y: number }>>({});
  const [activeSourcePort, setActiveSourcePort] = useState<string | null>(null);
  const canvasRef = useRef<SVGSVGElement>(null);

  const updatePortCoordinates = () => {
    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const newCoords: Record<string, { x: number, y: number }> = {};

    const ports = document.querySelectorAll('[data-port-id]');
    ports.forEach((portEl) => {
      const portId = portEl.getAttribute('data-port-id');
      if (portId) {
        const rect = portEl.getBoundingClientRect();
        newCoords[portId] = {
          x: rect.left + rect.width / 2 - canvasRect.left,
          y: rect.top + rect.height / 2 - canvasRect.top
        };
      }
    });
    setPortCoords(newCoords);
  };

  useEffect(() => {
    if (isRouting) {
      const timer = setTimeout(updatePortCoordinates, 100);
      window.addEventListener('resize', updatePortCoordinates);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', updatePortCoordinates);
      };
    }
  }, [isRouting, selectedTargetModuleId, mappings]);

  useEffect(() => {
    if (modules) {
      const triage = modules.find((m: any) => m.isIntakeTriage === true || m.config?.isIntakeTriage === true);
      setTriageModule(triage || null);
    }
  }, [modules]);

  useEffect(() => {
    if (triageModule) {
      loadInboxRecords();
      loadTriageRules();
    }
  }, [triageModule]);

  useEffect(() => {
    if (selectedRecord) {
      loadRecordComments(selectedRecord.id);
      setIsRouting(false);
      setSelectedTargetModuleId('');
      setMappings({});
      setIsEditingForm(false);
      setEditedFormData(getRecordFields(selectedRecord));
    } else {
      setIsEditingForm(false);
      setEditedFormData({});
    }
  }, [selectedRecord]);

  // Dynamic mapping generator on target module selection
  useEffect(() => {
    if (!selectedTargetModuleId || !selectedRecord) {
      setMappings({});
      return;
    }
    const targetModule = modules.find((m: any) => m.id === selectedTargetModuleId);
    if (!targetModule) return;
    
    const targetFields = flattenFields(targetModule.layout || targetModule.config?.layout || []);
    const sourceFields = getRecordFields(selectedRecord);
    const sourceKeys = Object.keys(sourceFields);
    
    const newMappings: Record<string, any> = {};
    targetFields.forEach((field: any) => {
      // Don't auto-map system keys or layouts
      if (field.type === 'section' || field.type === 'row') return;
      const autoKey = findAutoMapKey(field.id, field.label || '', sourceKeys);
      if (autoKey) {
        newMappings[field.id] = { type: 'source', value: autoKey };
      } else {
        newMappings[field.id] = { type: 'ignore', value: '' };
      }
    });
    setMappings(newMappings);
  }, [selectedTargetModuleId, selectedRecord, modules]);

  const getFormFields = () => {
    if (!selectedRecord || !modules) return [];
    const originalModule = getOriginalModule(selectedRecord, modules);
    if (!originalModule) return [];
    
    const publicForm = originalModule.forms?.find((f: any) => f.usage === 'public_link');
    if (!publicForm) return [];

    const formFields: any[] = [];
    
    const formFieldsSource = publicForm.isMultistep && publicForm.steps
      ? publicForm.steps.flatMap((step: any) => step.fields || [])
      : (publicForm.fields || []);
      
    const allLayoutFields = flattenFields(originalModule.layout || originalModule.config?.layout || []);
    
    formFieldsSource.forEach((fObj: any) => {
      if (fObj.id && !fObj.id.startsWith('visual-')) {
        const fieldDef = allLayoutFields.find((f: any) => f.id === fObj.id);
        if (fieldDef) {
          formFields.push({
            id: fObj.id,
            field: fieldDef,
            label: fObj.labelOverride || fieldDef.label || fieldDef.name || fObj.id,
            width: fObj.width || 'full',
            required: fObj.required || fieldDef.required
          });
        }
      }
    });
    
    return formFields;
  };

  const getAdditionalFields = (formFields: any[]) => {
    if (!selectedRecord) return [];
    const recordFields = getRecordFields(selectedRecord);
    const formFieldIds = new Set(formFields.map(f => f.id));
    
    const additional: any[] = [];
    Object.entries(recordFields)
      .filter(([k]) => !k.startsWith('_') && !formFieldIds.has(k))
      .forEach(([key, val]) => {
        additional.push({
          id: key,
          label: key.replace(/_/g, ' '),
          value: val
        });
      });
      
    return additional;
  };

  const handleManualRunTriage = async () => {
    setIsRunningTriage(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/automations/run-triage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant?.id || '',
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || 'Queue auto-distribution completed');
        loadInboxRecords();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to trigger queue');
      }
    } catch (err: any) {
      toast.error(err.message || 'Manual run failed');
    } finally {
      setIsRunningTriage(false);
    }
  };

  const loadInboxRecords = useCallback(async () => {
    if (!triageModule) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/data/records?moduleId=${triageModule.id}&page=1&limit=100&_t=${Date.now()}`, {
        headers: { 
          'x-tenant-id': tenant?.id || '',
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
      }
    } catch (err) {
      toast.error('Failed to load triage queue');
    } finally {
      setLoading(false);
    }
  }, [triageModule, tenant?.id, token]);

  const loadTriageRules = useCallback(async () => {
    if (!triageModule) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/automations?moduleId=${triageModule.id}&_t=${Date.now()}`, {
        headers: { 
          'x-tenant-id': tenant?.id || '',
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const rules = await res.json();
        setTriageRules(rules);
      }
    } catch (err) {
      console.error('Failed to load rules:', err);
    }
  }, [triageModule, tenant?.id, token]);

  // Setup Socket.IO for real-time updates
  useEffect(() => {
    if (!tenant?.id || !token) return;

    let socket: any = null;
    let isActive = true;

    const connectSocket = async () => {
      try {
        const { io } = await import('socket.io-client');
        if (!isActive) return;

        socket = io('http://127.0.0.1:3001', {
          auth: { token }
        });

        socket.on('connect', () => {
          socket.emit('join_tenant', tenant.id);
        });

        const refreshQueue = () => {
          loadInboxRecords();
        };

        socket.on('record_added', refreshQueue);
        socket.on('record_updated', refreshQueue);
        socket.on('record_deleted', refreshQueue);
      } catch (err) {
        console.error('[Socket] Connection failed:', err);
      }
    };

    connectSocket();

    return () => {
      isActive = false;
      if (socket) {
        socket.emit('leave_tenant', tenant.id);
        socket.disconnect();
      }
    };
  }, [tenant?.id, token, loadInboxRecords]);

  useEffect(() => {
    const scheduledRule = triageRules.find(r => r.isActive && r.triggers?.some((t: any) => t.type === 'CRON'));
    let cronExpr = scheduledRule?.triggers?.find((t: any) => t.type === 'CRON')?.cronExpression;

    if (cronExpr === 'GLOBAL') {
      cronExpr = triageModule?.config?.globalSchedule || '*/5 * * * *';
    }

    if (!cronExpr && triageModule) {
      cronExpr = triageModule?.config?.globalSchedule || '*/5 * * * *';
    }

    if (!cronExpr) {
      setCountdownText('');
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const nextRun = getNextCronDate(cronExpr, now);
      
      // Reset accumulated paused time when crossing into a new cron cycle
      if (lastNextRunRef.current && nextRun.getTime() !== lastNextRunRef.current) {
        accumulatedPausedMsRef.current = 0;
        if (isTimerPaused) {
          pausedTimeRef.current = Date.now();
        }
      }
      lastNextRunRef.current = nextRun.getTime();

      const baseDiffMs = nextRun.getTime() - now.getTime();
      
      // Calculate adjusted diff based on paused duration
      const currentPausedMs = isTimerPaused && pausedTimeRef.current > 0 
        ? Date.now() - pausedTimeRef.current 
        : 0;
      const adjustedDiffMs = baseDiffMs + accumulatedPausedMsRef.current + currentPausedMs;
      
      if (adjustedDiffMs <= 0) {
        setCountdownText('Running...');
        
        // Trigger auto-distribution if we haven't triggered it for this scheduled tick
        const minuteKey = Math.floor(nextRun.getTime() / 60000);
        if (autoRunTriggeredRef.current !== minuteKey) {
          autoRunTriggeredRef.current = minuteKey;
          if (!isTimerPaused) {
            handleManualRunTriage();
          }
        }
        return;
      }

      const totalSec = Math.floor(adjustedDiffMs / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      
      if (min > 0) {
        setCountdownText(`${min}m ${sec}s`);
      } else {
        setCountdownText(`${sec}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [triageRules, triageModule, isTimerPaused]);

  const loadRecordComments = async (recordId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/data/${recordId}/comments`, {
        headers: { 
          'x-tenant-id': tenant?.id || '',
          'Authorization': `Bearer ${token}` 
        }
      });
      if (res.ok) {
        const comms = await res.json();
        setComments(comms);
      }
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  };

  const postSystemComment = async (recordId: string, text: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/data/${recordId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant?.id || '',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          body: text,
          author: 'System Workflow'
        })
      });
    } catch (err) {
      console.error('Failed to post system comment:', err);
    }
  };

  const handlePostComment = async () => {
    if (!newCommentBody.trim() || !selectedRecord) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/data/${selectedRecord.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant?.id || '',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          body: newCommentBody,
          author: user?.user_metadata?.full_name || user?.email || 'System User'
        })
      });
      if (res.ok) {
        setNewCommentBody('');
        loadRecordComments(selectedRecord.id);
        toast.success('Comment added');
      }
    } catch (err) {
      toast.error('Failed to add comment');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedRecord) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/data/records/${selectedRecord.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant?.id || '',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus,
          moduleId: triageModule.id
        })
      });
      if (res.ok) {
        toast.success(`Submission status updated to: ${newStatus}`);
        await loadInboxRecords();
        
        // Keep the selection updated in place
        setSelectedRecord((prev: any) => prev ? { ...prev, status: newStatus } : null);
        loadRecordComments(selectedRecord.id);
      } else {
        throw new Error('Failed to update status');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleSaveForm = async () => {
    if (!selectedRecord || !triageModule) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/data/records/${selectedRecord.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant?.id || '',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          moduleId: triageModule.id,
          ...editedFormData
        })
      });
      if (res.ok) {
        const updatedRecord = await res.json();
        toast.success('Pre-assessment form updated successfully');
        await loadInboxRecords();
        setSelectedRecord(updatedRecord);
        setIsEditingForm(false);
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save pre-assessment form changes');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save pre-assessment form changes');
    }
  };


  const handleTriggerRule = async (ruleId: string) => {
    if (!selectedRecord) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/automations/${ruleId}/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant?.id || '',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ recordId: selectedRecord.id })
      });

      if (res.ok) {
        toast.success('Routing rule executed successfully');
        queryClient.invalidateQueries({ queryKey: ['records'] });
        setSelectedRecord(null);
        loadInboxRecords();
      } else {
        const errObj = await res.json();
        throw new Error(errObj.error || 'Failed to trigger routing rule');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Handles Dispatching manual routing mapping to destination module
  const handleManualDispatch = async () => {
    if (!selectedRecord || !selectedTargetModuleId) return;
    setRoutingInProgress(true);
    
    try {
      const targetModule = modules.find((m: any) => m.id === selectedTargetModuleId);
      if (!targetModule) throw new Error('Target module not found');

      const sourceFields = getRecordFields(selectedRecord);
      
      // Build routing payload
      const dispatchPayload: Record<string, any> = {
        moduleId: selectedTargetModuleId,
        associations: [],
        path: null
      };

      // Set mapped properties
      Object.entries(mappings).forEach(([targetFieldId, mappingConfig]) => {
        if (mappingConfig.type === 'source') {
          dispatchPayload[targetFieldId] = sourceFields[mappingConfig.value];
        } else if (mappingConfig.type === 'custom') {
          dispatchPayload[targetFieldId] = mappingConfig.value;
        }
      });

      // 1. Submit record to destination module
      const createRes = await fetch(`${API_BASE_URL}/api/data/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant?.id || '',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dispatchPayload)
      });

      if (!createRes.ok) {
        const errObj = await createRes.json();
        throw new Error(errObj.error || 'Failed to create record in destination module');
      }

      const newRecord = await createRes.json();

      // 2. Set status of the triage record to 'Routed' (Archived on backend logic)
      const archiveRes = await fetch(`${API_BASE_URL}/api/data/records/${selectedRecord.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant?.id || '',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'Routed',
          moduleId: triageModule.id
        })
      });

      if (archiveRes.ok) {
        const userLabel = user?.user_metadata?.full_name || user?.email || 'System User';
        await postSystemComment(
          selectedRecord.id, 
          `Record successfully routed to standard module "${targetModule.name}" (Record ID: ${newRecord.id}) by ${userLabel}`
        );
        toast.success(`Submission successfully routed to "${targetModule.name}"!`);
      }

      setIsRouting(false);
      setSelectedRecord(null);
      queryClient.invalidateQueries({ queryKey: ['records'] });
      await loadInboxRecords();

    } catch (err: any) {
      toast.error(err.message || 'Routing failed');
    } finally {
      setRoutingInProgress(false);
    }
  };

  // Handles routing back to original module using default 1-to-1 mappings
  const handleDefaultRoute = async () => {
    const originalModule = getOriginalModule(selectedRecord, modules);
    if (!selectedRecord || !originalModule) return;
    setRoutingInProgress(true);
    
    try {
      const sourceFields = getRecordFields(selectedRecord);
      const targetFields = flattenFields(originalModule.layout || originalModule.config?.layout || []);
      
      const dispatchPayload: Record<string, any> = {
        moduleId: originalModule.id,
        associations: [],
        path: null
      };

      // Direct 1-to-1 field ID mappings
      targetFields.forEach((field: any) => {
        if (field.type === 'section' || field.type === 'row') return;
        if (sourceFields[field.id] !== undefined) {
          dispatchPayload[field.id] = sourceFields[field.id];
        }
      });

      // 1. Submit record to original module
      const createRes = await fetch(`${API_BASE_URL}/api/data/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant?.id || '',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dispatchPayload)
      });

      if (!createRes.ok) {
        const errObj = await createRes.json();
        throw new Error(errObj.error || 'Failed to create record in destination module');
      }

      const newRecord = await createRes.json();

      // 2. Archive triage record
      const archiveRes = await fetch(`${API_BASE_URL}/api/data/records/${selectedRecord.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant?.id || '',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'Routed',
          moduleId: triageModule.id
        })
      });

      if (archiveRes.ok) {
        const userLabel = user?.user_metadata?.full_name || user?.email || 'System User';
        await postSystemComment(
          selectedRecord.id, 
          `Record routed automatically to original module "${originalModule.name}" (Record ID: ${newRecord.id}) by ${userLabel}`
        );
        toast.success(`Submission routed successfully to "${originalModule.name}"!`);
      }

      setSelectedRecord(null);
      queryClient.invalidateQueries({ queryKey: ['records'] });
      await loadInboxRecords();

    } catch (err: any) {
      toast.error(err.message || 'Default routing failed');
    } finally {
      setRoutingInProgress(false);
    }
  };

  // Filter and search computation
  const filteredRecords = records.filter(rec => {
    const fields = getRecordFields(rec);
    const displayName = String(fields.submitted_by || fields.name || fields.fullName || fields.email || 'Anonymous Submission').toLowerCase();
    const displayDesc = String(fields.description || fields.issueDescription || '').toLowerCase();
    const matchesSearch = displayName.includes(searchQuery.toLowerCase()) || displayDesc.includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    const statusLower = (rec.status || 'new').toLowerCase();
    
    if (activeFilter === 'pending') {
      return statusLower === 'new' || statusLower === 'in review' || statusLower === 'in_review' || statusLower === 'active';
    } else if (activeFilter === 'needs_info') {
      return statusLower === 'needs info' || statusLower === 'needs_info';
    } else if (activeFilter === 'routed') {
      return statusLower === 'routed' || statusLower === 'archived';
    } else if (activeFilter === 'rejected') {
      return statusLower === 'rejected';
    }
    
    return true; // 'all'
  });

  const getKPIStats = () => {
    let pending = 0, needsInfo = 0, routed = 0, rejected = 0;
    records.forEach(r => {
      const s = (r.status || 'new').toLowerCase();
      if (s === 'new' || s === 'in review' || s === 'in_review' || s === 'active') pending++;
      else if (s === 'needs info' || s === 'needs_info') needsInfo++;
      else if (s === 'routed' || s === 'archived') routed++;
      else if (s === 'rejected') rejected++;
    });
    return { pending, needsInfo, routed, rejected };
  };

  const kpis = getKPIStats();

  const renderRoutingModal = () => {
    if (!selectedRecord) return null;
    const originalModule = getOriginalModule(selectedRecord, modules);
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
        <div className="bg-zinc-950 border border-zinc-900 w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/50 backdrop-blur-md">
            <div>
              <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                <GitFork size={14} className="text-indigo-400" />
                Manual Intake Work Dispatcher
              </h3>
              <p className="text-[10px] text-zinc-550 mt-0.5">
                Map incoming form data to the target business module's schema.
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Destination dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Destination:</span>
                <select
                  value={selectedTargetModuleId}
                  onChange={(e) => setSelectedTargetModuleId(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                >
                  <option value="">Select Target Module...</option>
                  {modules?.filter((m: any) => m.id !== triageModule.id && m.isIntakeTriage !== true && m.config?.isIntakeTriage !== true).map((m: any) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Close Button */}
              <button
                onClick={() => setIsRouting(false)}
                className="p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
              >
                <XCircle size={16} />
              </button>
            </div>
          </div>

          {/* Modal Body / Canvas */}
          <div className="flex-1 overflow-hidden relative flex bg-zinc-950/30">
            {selectedTargetModuleId ? (
              <div className="flex-1 flex overflow-hidden relative">
                
                {/* SVG Connections Overlay Canvas */}
                <svg
                  ref={canvasRef}
                  className="absolute inset-0 pointer-events-none w-full h-full z-10"
                >
                  <defs>
                    <linearGradient id="wire-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity="0.8" />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Render mapping connection lines */}
                  {(() => {
                    const targetModule = modules.find((m: any) => m.id === selectedTargetModuleId);
                    if (!targetModule) return null;
                    const targetFields = flattenFields(targetModule.layout || targetModule.config?.layout || []);
                    
                    return targetFields.map((field: any) => {
                      const currentMap = mappings[field.id];
                      if (!currentMap || currentMap.type !== 'source') return null;
                      
                      const sourceId = currentMap.value;
                      const sourcePortId = `source-${sourceId}`;
                      const targetPortId = `target-${field.id}`;
                      
                      const start = portCoords[sourcePortId];
                      const end = portCoords[targetPortId];
                      
                      if (!start || !end) return null;
                      
                      const dx = Math.abs(end.x - start.x) * 0.4;
                      const pathData = `M ${start.x} ${start.y} C ${start.x + dx} ${start.y}, ${end.x - dx} ${end.y}, ${end.x} ${end.y}`;
                      
                      return (
                        <g key={field.id}>
                          <path
                            d={pathData}
                            fill="none"
                            stroke="rgba(99, 102, 241, 0.15)"
                            strokeWidth="4"
                          />
                          <path
                            d={pathData}
                            fill="none"
                            stroke="url(#wire-gradient)"
                            strokeWidth="1.5"
                            filter="url(#glow)"
                            className="animate-pulse"
                          />
                        </g>
                      );
                    });
                  })()}
                </svg>

                {/* Left Column: Source Fields */}
                <div
                  onScroll={updatePortCoordinates}
                  className="w-[38%] overflow-y-auto p-6 space-y-3 custom-scrollbar border-r border-zinc-900 bg-zinc-950/20"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-zinc-550 uppercase tracking-widest">
                      Source Fields (Client Request)
                    </span>
                    <span className="text-[8px] text-zinc-650 font-bold bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                      Select a port to connect
                    </span>
                  </div>

                  {Object.keys(getRecordFields(selectedRecord)).filter(k => !k.startsWith('_')).map(k => {
                    const label = getFieldLabel(k, originalModule);
                    const val = getRecordFields(selectedRecord)[k];
                    const displayValue = val === undefined || val === null ? '' : typeof val === 'object' ? JSON.stringify(val) : String(val);
                    const isSelected = activeSourcePort === k;

                    return (
                      <div
                        key={k}
                        className={`p-3 bg-zinc-900/20 border rounded-xl flex items-center justify-between group transition-all duration-200 ${
                          isSelected 
                            ? 'border-indigo-500/50 bg-indigo-500/[0.02] shadow-lg shadow-indigo-500/5' 
                            : 'border-zinc-900 hover:border-zinc-800'
                        }`}
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <span className="text-[10px] font-bold text-zinc-350 block truncate">{label}</span>
                          <span className="text-[8px] font-mono text-zinc-550 truncate block mt-0.5 bg-zinc-950/50 px-1.5 py-0.5 rounded border border-zinc-900/60 max-w-max">
                            {displayValue || 'empty'}
                          </span>
                        </div>
                        
                        {/* Source Port */}
                        <button
                          data-port-id={`source-${k}`}
                          onClick={() => {
                            if (activeSourcePort === k) {
                              setActiveSourcePort(null);
                            } else {
                              setActiveSourcePort(k);
                            }
                          }}
                          className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 relative cursor-pointer outline-none ${
                            isSelected 
                              ? 'bg-indigo-500 text-white scale-110 shadow-lg shadow-indigo-500/30' 
                              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-500 border border-zinc-800'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-zinc-500 group-hover:bg-zinc-400'}`} />
                          
                          {/* Pulse ring for active port */}
                          {isSelected && (
                            <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-30 animate-ping" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Middle Connector Space */}
                <div className="w-[24%] border-r border-zinc-900 bg-zinc-950/40 relative flex flex-col justify-center items-center p-4">
                  <div className="text-center space-y-3 select-none">
                    {activeSourcePort ? (
                      <>
                        <div className="w-8 h-8 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-full flex items-center justify-center mx-auto animate-bounce">
                          <GitFork size={14} />
                        </div>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">
                          Select Destination Port
                        </p>
                        <p className="text-[8px] text-zinc-500 leading-normal max-w-[130px] mx-auto">
                          Click any target port on the right to connect **{getFieldLabel(activeSourcePort, originalModule)}**
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded-full flex items-center justify-center mx-auto">
                          <Info size={14} />
                        </div>
                        <p className="text-[9px] font-bold text-zinc-450 uppercase tracking-widest">
                          Visual Mapper
                        </p>
                        <p className="text-[8px] text-zinc-500 leading-normal max-w-[130px] mx-auto">
                          Select a source port on the left, then select a target port on the right to map them.
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Right Column: Target Fields */}
                <div
                  onScroll={updatePortCoordinates}
                  className="w-[38%] overflow-y-auto p-6 space-y-4 custom-scrollbar bg-zinc-950/20"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-zinc-550 uppercase tracking-widest">
                      Destination Fields (Target Module)
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAutoMap}
                        className="px-2 py-0.5 text-[8px] font-bold bg-indigo-900/20 hover:bg-indigo-900/40 text-indigo-400 rounded border border-indigo-900/30 cursor-pointer"
                      >
                        Auto-Map
                      </button>
                      <button
                        onClick={handleClearAllMappings}
                        className="px-2 py-0.5 text-[8px] font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded border border-zinc-800 cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {(() => {
                    const targetModule = modules.find((m: any) => m.id === selectedTargetModuleId);
                    if (!targetModule) return null;
                    const targetFields = flattenFields(targetModule.layout || targetModule.config?.layout || []);
                    
                    return targetFields.map((field: any) => {
                      if (field.type === 'section' || field.type === 'row') return null;
                      const currentMap = mappings[field.id] || { type: 'ignore', value: '' };
                      const isMapped = currentMap.type === 'source';
                      const isCustom = currentMap.type === 'custom';
                      const isIgnored = currentMap.type === 'ignore';
                      
                      return (
                        <div
                          key={field.id}
                          className={`p-3 bg-zinc-900/20 border rounded-xl flex flex-col gap-2 transition-all duration-200 ${
                            isMapped 
                              ? 'border-indigo-500/20 bg-indigo-500/[0.01]' 
                              : isCustom 
                                ? 'border-amber-500/20 bg-amber-500/[0.01]' 
                                : 'border-zinc-900 opacity-80 hover:opacity-100'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {/* Target Input Port */}
                              <button
                                data-port-id={`target-${field.id}`}
                                onClick={() => {
                                  if (activeSourcePort) {
                                    setMappings(prev => ({
                                      ...prev,
                                      [field.id]: { type: 'source', value: activeSourcePort }
                                    }));
                                    setActiveSourcePort(null);
                                    setTimeout(updatePortCoordinates, 100);
                                  }
                                }}
                                className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 relative cursor-pointer outline-none ${
                                  isMapped 
                                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' 
                                    : activeSourcePort 
                                      ? 'bg-zinc-900 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 animate-pulse scale-105' 
                                      : 'bg-zinc-900 text-zinc-550 border border-zinc-800'
                                }`}
                              >
                                <div className={`w-2 h-2 rounded-full ${isMapped ? 'bg-white' : activeSourcePort ? 'bg-indigo-400' : 'bg-zinc-650'}`} />
                              </button>

                              <div>
                                <span className="text-[10px] font-bold text-zinc-300 block">
                                  {field.label || field.id}
                                  {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                                </span>
                                <span className="text-[7.5px] text-zinc-550 capitalize font-medium">
                                  {field.type}
                                </span>
                              </div>
                            </div>

                            {/* Control Pill Bar */}
                            <div className="flex items-center bg-zinc-950 border border-zinc-900 rounded-lg p-0.5 text-[7.5px] font-bold">
                              <button
                                onClick={() => {
                                  setMappings(prev => ({ ...prev, [field.id]: { type: 'ignore', value: '' } }));
                                  setTimeout(updatePortCoordinates, 100);
                                }}
                                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${isIgnored ? 'bg-zinc-900 text-zinc-400' : 'text-zinc-550 hover:text-zinc-400'}`}
                              >
                                Ignore
                              </button>
                              <button
                                onClick={() => {
                                  setMappings(prev => ({ ...prev, [field.id]: { type: 'custom', value: '' } }));
                                  setTimeout(updatePortCoordinates, 100);
                                }}
                                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${isCustom ? 'bg-amber-900/30 text-amber-400 border border-amber-900/40' : 'text-zinc-550 hover:text-zinc-400'}`}
                              >
                                Custom
                              </button>
                            </div>
                          </div>

                          {/* Detail / Value Panel */}
                          {isMapped && (
                            <div className="flex items-center justify-between bg-indigo-950/15 border border-indigo-900/20 px-2.5 py-1.5 rounded-lg text-[8px] text-indigo-300">
                              <div className="truncate pr-2">
                                <span className="font-bold uppercase tracking-wider text-indigo-400 block text-[6.5px]">Connected to source:</span>
                                <span className="font-semibold">{getFieldLabel(currentMap.value, originalModule)}</span>
                              </div>
                              <button
                                onClick={() => {
                                  setMappings(prev => {
                                    const next = { ...prev };
                                    delete next[field.id];
                                    return next;
                                  });
                                  setTimeout(updatePortCoordinates, 100);
                                }}
                                className="text-zinc-500 hover:text-rose-400 font-bold p-0.5 cursor-pointer"
                                title="Disconnect"
                              >
                                Disconnect
                              </button>
                            </div>
                          )}

                          {isCustom && (
                            <div className="w-full">
                              <input
                                type="text"
                                value={currentMap.value || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setMappings(prev => ({ ...prev, [field.id]: { type: 'custom', value: val } }));
                                }}
                                placeholder="Enter custom value..."
                                className="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-2.5 py-1 text-[9px] text-zinc-200 focus:outline-none focus:border-indigo-500/50 font-medium"
                              />
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-550 bg-zinc-950/20">
                <GitFork size={28} className="text-zinc-750 mb-3 animate-pulse" />
                <p className="text-xs font-bold text-zinc-450">Select Target Module</p>
                <p className="text-[9px] text-zinc-550 mt-1 max-w-xs leading-normal font-medium">
                  Select a business module in the header to load the destination fields and start mapping form data.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-zinc-900 flex items-center justify-end gap-3 bg-zinc-950/50 backdrop-blur-md">
            <button
              onClick={() => setIsRouting(false)}
              className="px-3.5 py-1.5 border border-zinc-900 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleManualDispatch}
              disabled={routingInProgress || !selectedTargetModuleId}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <GitFork size={12} className={routingInProgress ? 'animate-spin' : ''} />
              Dispatch Submission
            </button>
          </div>

        </div>
      </div>
    );
  };

  const handleAutoMap = () => {
    if (!selectedTargetModuleId) return;
    const targetModule = modules.find((m: any) => m.id === selectedTargetModuleId);
    if (!targetModule) return;
    
    const targetFields = flattenFields(targetModule.layout || targetModule.config?.layout || []);
    const sourceFields = getRecordFields(selectedRecord);
    const sourceKeys = Object.keys(sourceFields);
    
    const newMappings = { ...mappings };
    targetFields.forEach((field: any) => {
      if (field.type === 'section' || field.type === 'row') return;
      const autoKey = findAutoMapKey(field.id, field.label || '', sourceKeys);
      if (autoKey) {
        newMappings[field.id] = { type: 'source', value: autoKey };
      }
    });
    setMappings(newMappings);
    toast.success('Auto-mapped matching fields');
    setTimeout(updatePortCoordinates, 100);
  };

  const handleClearAllMappings = () => {
    setMappings({});
    toast.success('Cleared all mappings');
    setTimeout(updatePortCoordinates, 100);
  };

  return (
    <div className="flex-1 bg-zinc-950 p-8 overflow-y-auto custom-scrollbar flex flex-col gap-6">
      {/* Header section */}
      <header className="flex items-center justify-between border-b border-zinc-900 pb-5 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black tracking-widest text-indigo-500 uppercase">Platform Work Distribution</span>
            <span className="h-3 w-px bg-zinc-800"></span>
            <span className="text-[10px] font-bold text-zinc-400">Pre-Assessment Staging</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
            <Inbox className="text-indigo-400 animate-pulse" size={24} />
            Work Distribution
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Review external client request submissions, run pre-assessment staging, and dispatch work pathways.</p>
        </div>

        {/* Countdown to Next Job Run */}
        {(() => {
          const scheduledRule = triageRules.find(r => r.isActive && r.triggers?.some((t: any) => t.type === 'CRON'));
          let cronExpr = scheduledRule?.triggers?.find((t: any) => t.type === 'CRON')?.cronExpression;

          if (cronExpr === 'GLOBAL') {
            cronExpr = triageModule?.config?.globalSchedule || '*/5 * * * *';
          }

          if (!cronExpr && triageModule) {
            cronExpr = triageModule?.config?.globalSchedule || '*/5 * * * *';
          }

          if (!cronExpr || !countdownText) return null;

          return (
            <div className="flex items-center gap-3 bg-zinc-900/40 border border-zinc-900 px-4 py-2.5 rounded-2xl animate-in fade-in duration-200 shadow-sm shrink-0">
              <div className={`h-2 w-2 rounded-full ${isTimerPaused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                  {scheduledRule ? 'Auto-Distribution' : 'Global Queue Check'}
                </span>
                <span className="text-xs font-bold text-zinc-200 mt-0.5">
                  {isTimerPaused ? (
                    <span className="text-amber-400 font-bold">
                      Paused <span className="font-mono text-[10px] text-amber-500/80">({countdownText})</span>
                    </span>
                  ) : (
                    <>Running in: <span className="font-mono text-indigo-400 font-black">{countdownText}</span></>
                  )}
                </span>
              </div>
              <span className="h-6 w-px bg-zinc-800" />
              <button
                onClick={() => {
                  const newVal = !isTimerPaused;
                  setIsTimerPaused(newVal);
                  localStorage.setItem('auto_distribution_paused', String(newVal));
                  if (newVal) {
                    pausedTimeRef.current = Date.now();
                  } else {
                    if (pausedTimeRef.current > 0) {
                      accumulatedPausedMsRef.current += Date.now() - pausedTimeRef.current;
                    }
                    pausedTimeRef.current = 0;
                  }
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer select-none border ${
                  isTimerPaused 
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/25' 
                    : 'bg-zinc-800 text-zinc-355 border-zinc-700/80 hover:bg-zinc-700/90'
                }`}
                title={isTimerPaused ? "Resume Auto-Distribution" : "Pause Auto-Distribution"}
              >
                {isTimerPaused ? <Play size={10} /> : <Pause size={10} />}
                {isTimerPaused ? 'Resume' : 'Pause'}
              </button>
              <span className="h-6 w-px bg-zinc-800" />
              <button
                onClick={handleManualRunTriage}
                disabled={isRunningTriage}
                className="flex items-center gap-1.5 bg-indigo-500/10 hover:bg-indigo-500/25 disabled:opacity-50 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer select-none"
                title="Run Auto-Distribution Now"
              >
                <Zap size={10} className={isRunningTriage ? 'animate-pulse' : ''} />
                {isRunningTriage ? 'Running...' : 'Run Now'}
              </button>
              <span className="h-6 w-px bg-zinc-800" />
              <div className="flex flex-col text-right">
                <span className="text-[7.5px] font-semibold text-zinc-550">
                  {scheduledRule ? `Rule: ${scheduledRule.name}` : 'Queue Schedule'}
                </span>
                <span className="text-[8px] font-mono text-zinc-450 opacity-80 mt-0.5">
                  ({scheduledRule && scheduledRule?.triggers?.find((t: any) => t.type === 'CRON')?.cronExpression === 'GLOBAL'
                    ? `Global: ${cronExpr}`
                    : cronExpr})
                </span>
              </div>
            </div>
          );
        })()}
      </header>

      {triageModule ? (
        <>
          {/* Executive KPI Bar */}
          <div className="grid grid-cols-4 gap-4 shrink-0">
            <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider">Pending Assessment</p>
                <h3 className="text-2xl font-black text-zinc-100 mt-1">{kpis.pending}</h3>
              </div>
              <div className="h-10 w-10 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/20">
                <Layers size={18} />
              </div>
            </div>
            <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider">Awaiting Info</p>
                <h3 className="text-2xl font-black text-amber-400 mt-1">{kpis.needsInfo}</h3>
              </div>
              <div className="h-10 w-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center border border-amber-500/20">
                <HelpCircle size={18} />
              </div>
            </div>
            <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider">Routed Workflows</p>
                <h3 className="text-2xl font-black text-blue-400 mt-1">{kpis.routed}</h3>
              </div>
              <div className="h-10 w-10 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/20">
                <CheckCircle size={18} />
              </div>
            </div>
            <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider">Rejected Entries</p>
                <h3 className="text-2xl font-black text-rose-500 mt-1">{kpis.rejected}</h3>
              </div>
              <div className="h-10 w-10 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center border border-rose-500/20">
                <XCircle size={18} />
              </div>
            </div>
          </div>

          {/* Main Content Workspace Split Layout */}
          <div className="grid grid-cols-12 gap-6 flex-1 min-h-0 items-stretch">
            
            {/* Sidebar list (col-span-4) */}
            <div className="col-span-4 bg-zinc-900/20 border border-zinc-900 rounded-3xl p-5 flex flex-col gap-4">
              {/* Search Box & Refresh */}
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-900 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                    placeholder="Search submissions..."
                  />
                </div>
                <button 
                  onClick={loadInboxRecords}
                  disabled={loading}
                  className="p-2.5 bg-zinc-950 border border-zinc-900 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-all cursor-pointer shrink-0"
                  title="Refresh Queue"
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>

              {/* Status Tab Filters */}
              <div className="flex flex-wrap gap-1 border-b border-zinc-900 pb-2">
                <button
                  onClick={() => setActiveFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    activeFilter === 'pending'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  Pending ({kpis.pending})
                </button>
                <button
                  onClick={() => setActiveFilter('needs_info')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    activeFilter === 'needs_info'
                      ? 'bg-amber-600 text-white shadow'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  Need Info ({kpis.needsInfo})
                </button>
                <button
                  onClick={() => setActiveFilter('routed')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    activeFilter === 'routed'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  Routed ({kpis.routed})
                </button>
                <button
                  onClick={() => setActiveFilter('rejected')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    activeFilter === 'rejected'
                      ? 'bg-rose-600 text-white shadow'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  Rejected ({kpis.rejected})
                </button>
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    activeFilter === 'all'
                      ? 'bg-zinc-800 text-zinc-200 shadow'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  All
                </button>
              </div>

              {/* Stream queue list */}
              <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[480px] custom-scrollbar pr-1">
                {filteredRecords.map((rec) => {
                  const fields = getRecordFields(rec);
                  const isSelected = selectedRecord?.id === rec.id;
                  
                  const displayName = fields.submitted_by || fields.name || fields.fullName || fields.email || 'Anonymous Submission';
                  const displayDesc = fields.description || fields.issueDescription || 'No description provided.';
                  const displaySource = fields._submissionSource || 'API Webhook';
                  const statusStyles = getStatusStyles(rec.status);

                  return (
                    <div
                      key={rec.id}
                      onClick={() => setSelectedRecord(rec)}
                      className={`p-3.5 border rounded-2xl text-left cursor-pointer transition-all flex items-start justify-between gap-3 ${
                        isSelected 
                          ? 'bg-indigo-950/20 border-indigo-500/40 shadow shadow-indigo-500/5' 
                          : 'bg-zinc-950/40 border-zinc-900 hover:border-zinc-800 hover:bg-zinc-950/70'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-xs font-bold text-zinc-200 truncate max-w-[130px]">
                            {displayName}
                          </span>
                          {getRecordCustomerRef(rec) && (
                            <span className="text-[7.5px] px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 font-mono font-bold shrink-0">
                              {getRecordCustomerRef(rec)}
                            </span>
                          )}
                          <span className="text-[7.5px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider">
                            {displaySource}
                          </span>
                          <span className={`text-[7.5px] px-1.5 py-0.5 rounded border font-semibold ${statusStyles.bg} ${statusStyles.text} ${statusStyles.border}`}>
                            {statusStyles.label}
                          </span>
                        </div>
                        <p className="text-[9px] text-zinc-450 line-clamp-2 leading-relaxed">
                          {displayDesc}
                        </p>
                        <span className="text-[7.5px] text-zinc-550 font-medium mt-2 flex items-center gap-1">
                          <Clock size={8} /> {new Date(rec.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <ChevronRight size={14} className="text-zinc-600 self-center shrink-0" />
                    </div>
                  );
                })}
                
                {filteredRecords.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-650 border border-dashed border-zinc-900 rounded-2xl">
                    <CheckCircle size={24} className="text-emerald-500/20 mb-2" />
                    <p className="text-xs font-bold text-zinc-400">Staging Queue is empty</p>
                    <p className="text-[9px] text-zinc-500 mt-0.5 max-w-[200px]">No entries matching search or filters found.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Detail Viewer (col-span-8) */}
            <div className="col-span-8">
              {selectedRecord ? (
                <div className="bg-zinc-900/20 border border-zinc-900 rounded-3xl p-6 flex flex-col h-full gap-5">
                  {/* Action staging header bar */}
                  <div className="flex flex-wrap items-center justify-between border-b border-zinc-900 pb-4 gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Submission Detail</span>
                        <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border ${getStatusStyles(selectedRecord.status).bg} ${getStatusStyles(selectedRecord.status).text} ${getStatusStyles(selectedRecord.status).border}`}>
                          {getStatusStyles(selectedRecord.status).label}
                        </span>
                      </div>
                      <h2 className="text-sm font-bold text-zinc-200 truncate mt-1 flex items-center gap-2">
                        {getRecordFields(selectedRecord).submitted_by || getRecordFields(selectedRecord).name || 'Ingested Record'}
                        {getRecordCustomerRef(selectedRecord) && (
                          <span className="text-[9px] font-mono font-bold px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 rounded-md shrink-0">
                            {getRecordCustomerRef(selectedRecord)}
                          </span>
                        )}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setIsRouting(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow cursor-pointer animate-pulse"
                      >
                        <GitFork size={12} />
                        Route Submission
                      </button>
                      
                      {selectedRecord.status?.toLowerCase() !== 'needs info' && selectedRecord.status?.toLowerCase() !== 'needs_info' && (
                        <button
                          onClick={() => handleStatusChange('Needs Info')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-amber-400 hover:bg-zinc-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          <HelpCircle size={12} />
                          Needs Info
                        </button>
                      )}
                      
                      {selectedRecord.status?.toLowerCase() !== 'rejected' && (
                        <button
                          onClick={() => handleStatusChange('Rejected')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-rose-500 hover:bg-rose-950/20 hover:border-rose-900/50 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          <XCircle size={12} />
                          Reject
                        </button>
                      )}

                      {selectedRecord.status?.toLowerCase() !== 'new' && (
                        <button
                          onClick={() => handleStatusChange('New')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-emerald-400 hover:bg-zinc-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          <RotateCcw size={12} />
                          Re-open
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between border-t border-zinc-900/60 pt-3.5 mt-2.5 w-full gap-3">
                      {/* Assignee Control */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider">Assign To:</span>
                          <select
                            value={getRecordFields(selectedRecord).assigneeType || 'USER'}
                            onChange={(e) => {
                              const newType = e.target.value;
                              handleAssigneeTypeChange(newType);
                            }}
                            className="bg-zinc-950 border border-zinc-900 hover:border-zinc-800 text-zinc-350 rounded-xl px-2.5 py-1 text-xs focus:outline-none focus:ring-0 focus:border-indigo-500/50 cursor-pointer transition-all"
                          >
                            <option value="USER">User</option>
                            <option value="TEAM">Team</option>
                            <option value="POSITION">Position</option>
                          </select>
                        </div>

                        {/* Value Dropdown */}
                        {(() => {
                          const type = getRecordFields(selectedRecord).assigneeType || 'USER';
                          const currentValue = getRecordFields(selectedRecord).assigneeId || '';
                          
                          if (type === 'USER') {
                            return (
                              <select
                                value={currentValue}
                                onChange={(e) => handleAssigneeChange(e.target.value || null, 'USER')}
                                className="bg-zinc-950 border border-zinc-900 hover:border-zinc-800 text-zinc-350 rounded-xl px-2.5 py-1 text-xs focus:outline-none focus:ring-0 focus:border-indigo-500/50 cursor-pointer transition-all"
                              >
                                <option value="">Unassigned</option>
                                {members?.map((m: any) => {
                                  const memberTeam = teams?.find((t: any) => t.id === m.teamId)?.name || '';
                                  const suffix = [m.position, memberTeam].filter(Boolean).join(' - ');
                                  return (
                                    <option key={m.id} value={m.id}>
                                      {m.name || m.email} {suffix ? `(${suffix})` : ''}
                                    </option>
                                  );
                                })}
                              </select>
                            );
                          } else if (type === 'TEAM') {
                            return (
                              <select
                                value={currentValue}
                                onChange={(e) => handleAssigneeChange(e.target.value || null, 'TEAM')}
                                className="bg-zinc-950 border border-zinc-900 hover:border-zinc-800 text-zinc-350 rounded-xl px-2.5 py-1 text-xs focus:outline-none focus:ring-0 focus:border-indigo-500/50 cursor-pointer transition-all"
                              >
                                <option value="">Select Team...</option>
                                {teams?.map((t: any) => (
                                  <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                              </select>
                            );
                          } else {
                            return (
                              <select
                                value={currentValue}
                                onChange={(e) => handleAssigneeChange(e.target.value || null, 'POSITION')}
                                className="bg-zinc-950 border border-zinc-900 hover:border-zinc-800 text-zinc-350 rounded-xl px-2.5 py-1 text-xs focus:outline-none focus:ring-0 focus:border-indigo-500/50 cursor-pointer transition-all"
                              >
                                <option value="">Select Position...</option>
                                {positions?.map((p: any) => (
                                  <option key={p.id} value={p.id}>{p.title}</option>
                                ))}
                              </select>
                            );
                          }
                        })()}
                      </div>

                      {/* Quick assignment action buttons */}
                      <div className="flex gap-2">
                        {getRecordFields(selectedRecord).assigneeType === 'USER' && getRecordFields(selectedRecord).assigneeId === currentMemberId ? (
                          <button
                            onClick={() => handleAssigneeChange(null, 'USER')}
                            className="px-2.5 py-1 text-[10px] font-bold border border-zinc-900 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 rounded-lg transition-all cursor-pointer"
                          >
                            Set to unassigned
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAssigneeChange(currentMemberId, 'USER')}
                            className="px-2.5 py-1 text-[10px] font-bold bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-zinc-200 rounded-lg transition-all cursor-pointer"
                          >
                            Assign to me
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Main display card content */}
                  <div className="flex-1 min-h-[350px]">
                    {/* Sanitization warnings alert banner */}
                    {(() => {
                      const fields = getRecordFields(selectedRecord);
                      const flags = fields._sanitizationFlags || selectedRecord._sanitizationFlags;
                      if (!flags || !Array.isArray(flags) || flags.length === 0) return null;

                      return (
                        <div className="bg-amber-950/20 border border-amber-500/10 text-amber-400 p-3 rounded-2xl flex items-start gap-2.5 text-[10px] leading-relaxed mb-4">
                          <ShieldAlert size={14} className="shrink-0 text-amber-500 mt-0.5" />
                          <div>
                            <span className="font-bold">Inbound Security Action Applied:</span> Harmless HTML tags, event handlers, or scripts were detected and automatically stripped from this record: <span className="font-mono text-[9px] text-amber-500/85">({flags.join(', ')})</span>.
                          </div>
                        </div>
                      );
                    })()}

                    {/* Main View Tabs (Assessment / Activity / Automation Rules) */}
                    <div className="flex flex-col h-full gap-4 font-bold">
                        {/* Tab Headers */}
                        <div className="flex gap-4 border-b border-zinc-900 pb-2">
                          <button
                            onClick={() => setActiveTab('assessment')}
                            className={`pb-2 border-b-2 text-xs font-bold transition-all cursor-pointer ${
                              activeTab === 'assessment'
                                ? 'border-indigo-500 text-indigo-400'
                                : 'border-transparent text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            Pre-Assessment Form
                          </button>
                          {getOriginalModule(selectedRecord, modules) && (
                            <button
                              onClick={() => setActiveTab('default_map')}
                              className={`pb-2 border-b-2 text-xs font-bold transition-all cursor-pointer ${
                                activeTab === 'default_map'
                                  ? 'border-indigo-500 text-indigo-400'
                                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              Default Mapping
                            </button>
                          )}
                          <button
                            onClick={() => setActiveTab('source')}
                            className={`pb-2 border-b-2 text-xs font-bold transition-all cursor-pointer ${
                              activeTab === 'source'
                                ? 'border-indigo-500 text-indigo-400'
                                : 'border-transparent text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            Source
                          </button>
                          <button
                            onClick={() => setActiveTab('activity')}
                            className={`pb-2 border-b-2 text-xs font-bold transition-all cursor-pointer ${
                              activeTab === 'activity'
                                ? 'border-indigo-500 text-indigo-400'
                                : 'border-transparent text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            Activity Log ({comments.length})
                          </button>
                          <button
                            onClick={() => setActiveTab('rules')}
                            className={`pb-2 border-b-2 text-xs font-bold transition-all cursor-pointer ${
                              activeTab === 'rules'
                                ? 'border-indigo-500 text-indigo-400'
                                : 'border-transparent text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            Automated Rules ({triageRules.length})
                          </button>
                        </div>

                        {/* Tab Content Panels */}
                        <div className="flex-1 overflow-y-auto max-h-[360px] custom-scrollbar pr-1">
                          {activeTab === 'assessment' && (() => {
                            const originalModule = getOriginalModule(selectedRecord, modules);
                            const formFields = getFormFields();
                            const hasForm = formFields.length > 0;
                            const additionalFields = hasForm ? getAdditionalFields(formFields) : [];
                            
                            return (
                              <div className="space-y-4">
                                {/* Form controls header */}
                                <div className="flex items-center justify-between pb-2 border-b border-zinc-900/60">
                                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                    {isEditingForm ? 'Editing Pre-Assessment Data' : 'Pre-Assessment Form Content'}
                                  </div>
                                  <div className="flex gap-2">
                                    {isEditingForm ? (
                                      <>
                                        <button
                                          onClick={() => {
                                            setIsEditingForm(false);
                                            setEditedFormData(getRecordFields(selectedRecord));
                                          }}
                                          className="px-2.5 py-1 text-[10px] font-bold border border-zinc-805 hover:bg-zinc-900/40 rounded-lg text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          onClick={handleSaveForm}
                                          className="px-2.5 py-1 text-[10px] font-bold bg-indigo-650 hover:bg-indigo-600 rounded-lg text-white transition-all cursor-pointer"
                                        >
                                          Save Changes
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setEditedFormData(getRecordFields(selectedRecord));
                                          setIsEditingForm(true);
                                        }}
                                        className="px-2.5 py-1 text-[10px] font-bold bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-300 hover:text-zinc-200 transition-all cursor-pointer"
                                      >
                                        Edit Form
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  {/* Render Form-ordered Fields */}
                                  {hasForm ? (
                                    <>
                                      {formFields.map(({ id, field, label, width }) => {
                                        const val = isEditingForm ? editedFormData[id] : (selectedRecord[id] !== undefined ? selectedRecord[id] : (selectedRecord.data?.[id]));
                                        const displayValue = val === undefined || val === null ? '' : typeof val === 'object' ? JSON.stringify(val) : String(val);
                                        const isLink = !isEditingForm && (displayValue.startsWith('http://') || displayValue.startsWith('https://'));
                                        let Icon = FileText;
                                        if (id.toLowerCase().includes('email')) Icon = Mail;
                                        else if (id.toLowerCase().includes('phone') || id.toLowerCase().includes('tel')) Icon = Phone;
                                        else if (id.toLowerCase().includes('user') || id.toLowerCase().includes('name')) Icon = User;

                                        return (
                                          <div
                                            key={id}
                                            className={`p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl space-y-1.5 flex flex-col justify-between hover:border-zinc-800 group transition-all ${
                                              width === 'half' ? 'col-span-1' : 'col-span-2'
                                            }`}
                                          >
                                            {isEditingForm ? (
                                              <div className="space-y-1 w-full">
                                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                                                  <Icon size={9} className="text-zinc-500" />
                                                  {label}
                                                </label>
                                                <FieldInput
                                                  field={field}
                                                  value={editedFormData[id]}
                                                  onChange={(newVal) => {
                                                    setEditedFormData(prev => ({ ...prev, [id]: newVal }));
                                                  }}
                                                  density="compact"
                                                />
                                              </div>
                                            ) : (
                                              <div>
                                                <div className="flex items-center justify-between">
                                                  <span className="text-[9px] font-bold text-zinc-550 capitalize tracking-wider flex items-center gap-1.5">
                                                    <Icon size={9} className="text-zinc-500" />
                                                    {label}
                                                  </span>
                                                  <button
                                                    onClick={() => {
                                                      navigator.clipboard.writeText(displayValue);
                                                      toast.success(`Copied ${label} value`);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-900 rounded text-zinc-500 hover:text-zinc-300 transition-all cursor-pointer"
                                                    title="Copy value"
                                                  >
                                                    <Copy size={9} />
                                                  </button>
                                                </div>
                                                {isLink ? (
                                                  <a
                                                    href={displayValue}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs font-medium text-indigo-400 hover:underline inline-flex items-center gap-1 font-mono break-all mt-1"
                                                  >
                                                    {displayValue}
                                                    <ExternalLink size={10} />
                                                  </a>
                                                ) : (
                                                  <p className="text-xs font-semibold text-zinc-250 leading-relaxed font-mono break-words mt-1">
                                                    {displayValue || <span className="text-zinc-650 italic text-[10px]">Empty</span>}
                                                  </p>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}

                                      {/* Render Additional Fields */}
                                      {additionalFields.length > 0 && (
                                        <div className="col-span-2 pt-4 pb-2 border-t border-zinc-900/60">
                                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                                            Additional Record Metadata
                                          </span>
                                        </div>
                                      )}

                                      {additionalFields.map(({ id, label, value }) => {
                                        const val = isEditingForm ? editedFormData[id] : value;
                                        const displayValue = val === undefined || val === null ? '' : typeof val === 'object' ? JSON.stringify(val) : String(val);
                                        const isLink = !isEditingForm && (displayValue.startsWith('http://') || displayValue.startsWith('https://'));
                                        
                                        return (
                                          <div
                                            key={id}
                                            className={`p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl space-y-1.5 flex flex-col justify-between hover:border-zinc-800 group transition-all ${
                                              displayValue.length > 50 ? 'col-span-2' : 'col-span-1'
                                            }`}
                                          >
                                            {isEditingForm ? (
                                              <div className="space-y-1 w-full">
                                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                                                  <FileText size={9} className="text-zinc-500" />
                                                  {label}
                                                </label>
                                                <input
                                                  type="text"
                                                  value={displayValue}
                                                  onChange={(e) => {
                                                    setEditedFormData(prev => ({ ...prev, [id]: e.target.value }));
                                                  }}
                                                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-[10px] text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                                                />
                                              </div>
                                            ) : (
                                              <div>
                                                <div className="flex items-center justify-between">
                                                  <span className="text-[9px] font-bold text-zinc-550 capitalize tracking-wider flex items-center gap-1.5">
                                                    <FileText size={9} className="text-zinc-500" />
                                                    {label}
                                                  </span>
                                                  <button
                                                    onClick={() => {
                                                      navigator.clipboard.writeText(displayValue);
                                                      toast.success(`Copied ${label} value`);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-900 rounded text-zinc-500 hover:text-zinc-300 transition-all cursor-pointer"
                                                    title="Copy value"
                                                  >
                                                    <Copy size={9} />
                                                  </button>
                                                </div>
                                                {isLink ? (
                                                  <a
                                                    href={displayValue}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs font-medium text-indigo-400 hover:underline inline-flex items-center gap-1 font-mono break-all mt-1"
                                                  >
                                                    {displayValue}
                                                    <ExternalLink size={10} />
                                                  </a>
                                                ) : (
                                                  <p className="text-xs font-semibold text-zinc-250 leading-relaxed font-mono break-words mt-1">
                                                    {displayValue || <span className="text-zinc-650 italic text-[10px]">Empty</span>}
                                                  </p>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </>
                                  ) : (
                                    /* Fallback Layout */
                                    <>
                                      {Object.entries(getRecordFields(selectedRecord))
                                        .filter(([k]) => !k.startsWith('_'))
                                        .map(([key, val]) => {
                                          const cleanLabel = getFieldLabel(key, originalModule);
                                          let Icon = FileText;
                                          let isLink = false;
                                          
                                          if (key.toLowerCase().includes('email')) Icon = Mail;
                                          else if (key.toLowerCase().includes('phone') || key.toLowerCase().includes('tel')) Icon = Phone;
                                          else if (key.toLowerCase().includes('user') || key.toLowerCase().includes('name')) Icon = User;
                                          
                                          const currentVal = isEditingForm ? editedFormData[key] : val;
                                          const displayValue = currentVal === undefined || currentVal === null ? '' : typeof currentVal === 'object' ? JSON.stringify(currentVal) : String(currentVal);
                                          if (!isEditingForm && (displayValue.startsWith('http://') || displayValue.startsWith('https://'))) {
                                            isLink = true;
                                          }

                                          return (
                                            <div 
                                              key={key} 
                                              className={`p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl space-y-1.5 flex flex-col justify-between hover:border-zinc-800 group transition-all ${
                                                key.toLowerCase().includes('description') || key.toLowerCase().includes('content') || displayValue.length > 50 
                                                  ? 'col-span-2' 
                                                  : 'col-span-1'
                                              }`}
                                            >
                                              {isEditingForm ? (
                                                <div className="space-y-1 w-full">
                                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                                                    <Icon size={9} className="text-zinc-500" />
                                                    {cleanLabel}
                                                  </label>
                                                  <input
                                                    type="text"
                                                    value={displayValue}
                                                    onChange={(e) => {
                                                      setEditedFormData(prev => ({ ...prev, [key]: e.target.value }));
                                                    }}
                                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-[10px] text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                                                  />
                                                </div>
                                              ) : (
                                                <div>
                                                  <div className="flex items-center justify-between">
                                                    <span className="text-[9px] font-bold text-zinc-550 capitalize tracking-wider flex items-center gap-1.5">
                                                      <Icon size={9} className="text-zinc-500" />
                                                      {cleanLabel}
                                                    </span>
                                                    <button
                                                      onClick={() => {
                                                        navigator.clipboard.writeText(displayValue);
                                                        toast.success(`Copied ${cleanLabel} value`);
                                                      }}
                                                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-900 rounded text-zinc-500 hover:text-zinc-300 transition-all cursor-pointer"
                                                      title="Copy value"
                                                    >
                                                      <Copy size={9} />
                                                    </button>
                                                  </div>
                                                  {isLink ? (
                                                    <a 
                                                      href={displayValue} 
                                                      target="_blank" 
                                                      rel="noopener noreferrer" 
                                                      className="text-xs font-medium text-indigo-400 hover:underline inline-flex items-center gap-1 font-mono break-all mt-1"
                                                    >
                                                      {displayValue}
                                                      <ExternalLink size={10} />
                                                    </a>
                                                  ) : (
                                                    <p className="text-xs font-semibold text-zinc-250 leading-relaxed font-mono break-words mt-1">
                                                      {displayValue || <span className="text-zinc-650 italic text-[10px]">Empty</span>}
                                                    </p>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}

                                      {Object.entries(getRecordFields(selectedRecord)).filter(([k]) => !k.startsWith('_')).length === 0 && (
                                        <div className="col-span-2 py-10 text-center text-zinc-650 italic text-[10px]">
                                          No fields available on this submission record.
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })()}

                          {activeTab === 'source' && (
                            /* Visualizes form intake source metadata */
                            <div className="space-y-4">
                              {(() => {
                                const origMod = getOriginalModule(selectedRecord, modules) || triageModule;
                                if (!origMod) return null;
                                
                                const fields = getRecordFields(selectedRecord);
                                const sourceChannel = fields._submissionSource || selectedRecord._submissionSource || 'Public Portal Form';
                                
                                // Find public link form inside module config if available
                                const formName = origMod.forms?.find((f: any) => f.usage === 'public_link')?.name || `${origMod.name} Form`;
                                const publicUrl = `${window.location.origin}/portal?moduleId=${origMod.id}`;

                                return (
                                  <div className="grid grid-cols-2 gap-4">
                                    {/* Channel card */}
                                    <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl flex flex-col justify-between hover:border-zinc-800 transition-all col-span-1">
                                      <div className="space-y-1">
                                        <span className="text-[9px] font-bold text-zinc-550 capitalize tracking-wider flex items-center gap-1.5">
                                          <Layers size={9} className="text-zinc-500" />
                                          Intake Channel
                                        </span>
                                        <p className="text-xs font-bold text-white mt-1.5">{sourceChannel}</p>
                                        <p className="text-[9.5px] text-zinc-500 leading-relaxed mt-0.5">Routed through Platform Work Distribution router.</p>
                                      </div>
                                    </div>

                                    {/* Form Name card */}
                                    <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl flex flex-col justify-between hover:border-zinc-800 transition-all col-span-1">
                                      <div className="space-y-1">
                                        <span className="text-[9px] font-bold text-zinc-550 capitalize tracking-wider flex items-center gap-1.5">
                                          <FileText size={9} className="text-zinc-500" />
                                          Source Form Name
                                        </span>
                                        <p className="text-xs font-bold text-white mt-1.5">{formName}</p>
                                        <p className="text-[9.5px] text-zinc-500 leading-relaxed mt-0.5">Configured usage: public_link form builder definition.</p>
                                      </div>
                                    </div>

                                    {/* Link / URL Card */}
                                    <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl flex flex-col justify-between hover:border-zinc-800 transition-all col-span-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-bold text-zinc-550 capitalize tracking-wider flex items-center gap-1.5">
                                          <ExternalLink size={9} className="text-zinc-500" />
                                          Public Form URL
                                        </span>
                                        <button
                                          onClick={() => {
                                            navigator.clipboard.writeText(publicUrl);
                                            toast.success('Form URL copied to clipboard');
                                          }}
                                          className="p-1 hover:bg-zinc-900 rounded text-zinc-500 hover:text-zinc-300 transition-all cursor-pointer"
                                          title="Copy URL"
                                        >
                                          <Copy size={9} />
                                        </button>
                                      </div>
                                      <div className="flex items-center justify-between gap-4 mt-2">
                                        <a 
                                          href={publicUrl} 
                                          target="_blank" 
                                          rel="noopener noreferrer" 
                                          className="text-xs font-medium text-indigo-400 hover:underline inline-flex items-center gap-1 font-mono break-all"
                                        >
                                          {publicUrl}
                                        </a>
                                        <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-400 text-[8px] font-bold rounded-md uppercase tracking-wider shrink-0">
                                          Active Form
                                        </span>
                                      </div>
                                    </div>

                                    {/* Origin module card */}
                                    <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl flex flex-col justify-between hover:border-zinc-800 transition-all col-span-2">
                                      <div className="space-y-1">
                                        <span className="text-[9px] font-bold text-zinc-550 capitalize tracking-wider flex items-center gap-1.5">
                                          <CheckCircle size={9} className="text-zinc-500" />
                                          Destination Target Module
                                        </span>
                                        <div className="flex items-center gap-2 mt-1.5">
                                          <span className="text-xs font-bold text-white">{origMod.name}</span>
                                          <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
                                          <span className="text-[9px] font-medium text-zinc-500 font-mono">({origMod.id})</span>
                                        </div>
                                      </div>
                                    </div>

                                  </div>
                                );
                              })()}
                            </div>
                          )}

                          {activeTab === 'default_map' && (
                            /* Default Mapping list and quick route button */
                            <div className="space-y-4">
                              {(() => {
                                const origMod = getOriginalModule(selectedRecord, modules);
                                if (!origMod) return null;
                                const sourceFields = getRecordFields(selectedRecord);
                                const targetFields = flattenFields(origMod.layout || origMod.config?.layout || []);

                                return (
                                  <>
                                    <div className="bg-zinc-950/50 border border-zinc-900 rounded-2xl p-4 flex items-center justify-between gap-4">
                                      <div className="flex gap-2.5 items-center">
                                        <Info size={16} className="text-indigo-400 shrink-0" />
                                        <p className="text-[9.5px] text-zinc-450 leading-normal">
                                          This submission was created under the <span className="text-zinc-200 font-bold">"{origMod.name}"</span> module. By default, it maps directly back into its original fields.
                                        </p>
                                      </div>
                                      <button
                                        onClick={handleDefaultRoute}
                                        disabled={routingInProgress}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow cursor-pointer shrink-0"
                                      >
                                        <Check size={12} className={routingInProgress ? 'animate-spin' : ''} />
                                        Route to "{origMod.name}"
                                      </button>
                                    </div>

                                    <div className="border border-zinc-900 bg-zinc-950/30 rounded-2xl overflow-hidden">
                                      <div className="grid grid-cols-12 gap-3 p-3 text-[9px] font-bold text-zinc-550 border-b border-zinc-900 bg-zinc-950">
                                        <span className="col-span-4">Source Field (Form)</span>
                                        <span className="col-span-4">Ingested Value</span>
                                        <span className="col-span-4">Destination Field</span>
                                      </div>

                                      <div className="divide-y divide-zinc-900/60 max-h-[220px] overflow-y-auto custom-scrollbar">
                                        {targetFields.map((field) => {
                                          if (field.type === 'section' || field.type === 'row') return null;
                                          const val = sourceFields[field.id];
                                          if (val === undefined) return null;

                                          return (
                                            <div key={field.id} className="grid grid-cols-12 gap-3 p-3 items-center text-[10px]">
                                              <span className="col-span-4 text-zinc-400 font-medium">
                                                {getFieldLabel(field.id, origMod)}
                                              </span>
                                              <span className="col-span-4 text-zinc-250 font-mono truncate pr-2">
                                                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                              </span>
                                              <span className="col-span-4 text-zinc-450 font-bold">
                                                {field.label || field.id}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          )}

                          {activeTab === 'activity' && (
                            /* Collaboration Notes Stream feed */
                            <div className="space-y-4">
                              {/* Comment feed input */}
                              <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-900 rounded-2xl p-1.5 focus-within:border-indigo-500/50">
                                <input 
                                  type="text"
                                  value={newCommentBody}
                                  onChange={(e) => setNewCommentBody(e.target.value)}
                                  className="flex-1 bg-transparent px-4 py-2 text-xs text-zinc-200 focus:outline-none placeholder-zinc-550"
                                  placeholder="Type notes or request explanations..."
                                />
                                <button 
                                  onClick={handlePostComment}
                                  className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                                >
                                  <Send size={11} />
                                </button>
                              </div>

                              {/* Comments list feed */}
                              <div className="space-y-2.5">
                                {comments.map((comm) => {
                                  const isSystem = comm.author === 'System Workflow';
                                  return (
                                    <div 
                                      key={comm.id} 
                                      className={`p-3 border rounded-2xl space-y-1 ${
                                        isSystem 
                                          ? 'bg-zinc-900/10 border-zinc-900/60 border-l-2 border-l-indigo-500/50' 
                                          : 'bg-zinc-950/40 border-zinc-900'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between text-[8px] font-bold text-zinc-550">
                                        <span className={isSystem ? 'text-indigo-400' : 'text-zinc-400'}>{comm.author}</span>
                                        <span>{new Date(comm.timestamp).toLocaleString()}</span>
                                      </div>
                                      <p className="text-[10px] text-zinc-350 leading-relaxed break-words">{comm.body}</p>
                                    </div>
                                  );
                                })}
                                {comments.length === 0 && (
                                  <p className="text-[9px] text-zinc-550 italic text-center py-6">No workflow activities or notes recorded.</p>
                                )}
                              </div>
                            </div>
                          )}

                          {activeTab === 'rules' && (
                            /* Automated Rules automations */
                            <div className="space-y-3">
                              <div className="bg-zinc-950/50 border border-zinc-900 rounded-2xl p-4 flex gap-3 mb-2">
                                <Zap size={15} className="text-indigo-400 shrink-0 mt-0.5" />
                                <p className="text-[9.5px] text-zinc-450 leading-normal">
                                  You can run saved automated dispatch pipelines. These rules apply conditions (like email domain suffix) and run field mapping automations in the background.
                                </p>
                              </div>

                              <div className="flex flex-col gap-2">
                                {triageRules.map((rule) => (
                                  <button 
                                    key={rule.id}
                                    onClick={() => handleTriggerRule(rule.id)}
                                    className="w-full p-3.5 border border-zinc-900 bg-zinc-950/20 hover:border-indigo-500/30 rounded-xl text-left flex items-center justify-between cursor-pointer transition-all hover:bg-zinc-900/40 group"
                                  >
                                    <div>
                                      <p className="text-xs font-bold text-zinc-200 group-hover:text-indigo-400">{rule.name}</p>
                                      <p className="text-[9px] text-zinc-500 mt-1 leading-normal font-mono">
                                        Condition: {rule.conditions || 'Unconditional trigger matching'}
                                      </p>
                                    </div>
                                    <Send size={12} className="text-zinc-550 group-hover:text-indigo-400 transition-colors" />
                                  </button>
                                ))}
                                {triageRules.length === 0 && (
                                  <p className="text-[9px] text-zinc-550 italic text-center py-8">No automated triage rules configured for this workspace.</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                  </div>
                </div>
              ) : (
                /* Detail Pane Empty State */
                <div className="h-full border border-dashed border-zinc-900 rounded-3xl flex flex-col items-center justify-center p-8 text-center text-zinc-550 bg-zinc-950/10">
                  <AlertCircle size={28} className="text-zinc-750 mb-3" />
                  <p className="text-xs font-bold text-zinc-400 font-sans">No Submission Selected</p>
                  <p className="text-[9.5px] text-zinc-500 mt-1 max-w-xs leading-normal">Select an incoming intake request from the left staging stream to preview form fields, leave collaboration logs, or dispatch tasks across modules.</p>
                </div>
              )}
            </div>

          </div>
        </>
      ) : (
        /* Intake Disabled */
        <div className="flex-1 border border-dashed border-zinc-900 rounded-3xl flex flex-col items-center justify-center p-12 text-center text-zinc-550">
          <AlertCircle size={36} className="text-zinc-700 mb-4" />
          <h3 className="text-sm font-black text-zinc-300">Work Distribution is not configured</h3>
          <p className="text-[10px] text-zinc-500 mt-1 max-w-md">The Work Distribution system is currently disabled. Please contact your system administrator to enable the triage module inside Triage settings.</p>
        </div>
      )}
      
      {/* Visual Work Dispatch Modal */}
      {isRouting && renderRoutingModal()}
    </div>
  );
};

// Helper to calculate next run date for standard cron expressions
function getNextCronDate(expression: string, now: Date): Date {
  const fields = expression.split(' ');
  if (fields.length !== 5) {
    return new Date(now.getTime() + 60000);
  }

  const matchesField = (field: string, val: number): boolean => {
    if (field === '*') return true;
    if (field.includes('/')) {
      const parts = field.split('/');
      const step = parseInt(parts[1], 10);
      if (parts[0] === '*' || parts[0] === '0') {
        return val % step === 0;
      }
    }
    if (field.includes(',')) {
      return field.split(',').map(Number).includes(val);
    }
    if (field.includes('-')) {
      const [start, end] = field.split('-').map(Number);
      return val >= start && val <= end;
    }
    return parseInt(field, 10) === val;
  };

  const candidate = new Date(now.getTime());
  candidate.setSeconds(0);
  candidate.setMilliseconds(0);

  for (let i = 0; i < 1440; i++) {
    candidate.setMinutes(candidate.getMinutes() + 1);
    
    const m = candidate.getMinutes();
    const h = candidate.getHours();
    const dom = candidate.getDate();
    const mo = candidate.getMonth() + 1;
    const dow = candidate.getDay();

    if (
      matchesField(fields[0], m) &&
      matchesField(fields[1], h) &&
      matchesField(fields[2], dom) &&
      matchesField(fields[3], mo) &&
      matchesField(fields[4], dow)
    ) {
      return candidate;
    }
  }

  return new Date(now.getTime() + 300000);
}
