import { useState, useEffect } from 'react';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config';
import { 
  Inbox, Clock, RefreshCw, Send, ChevronRight, CheckCircle, 
  AlertCircle, Zap, Search, GitFork, 
  HelpCircle, XCircle, User, Mail, Phone, FileText, Check, 
  RotateCcw, Info, ExternalLink, Layers, Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

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
  const { tenant, modules } = usePlatform();
  const { session, user } = useAuth();
  const queryClient = useQueryClient();
  const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token || '';
  const [triageModule, setTriageModule] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [triageRules, setTriageRules] = useState<any[]>([]);
  
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

  const loadInboxRecords = async () => {
    if (!triageModule) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/data/records?moduleId=${triageModule.id}&page=1&limit=100`, {
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
  };

  const loadTriageRules = async () => {
    if (!triageModule) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/automations?moduleId=${triageModule.id}`, {
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
  };

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
    const displayName = String(fields.submitted_by || fields.name || fields.fullName || fields.email || 'Anonymous Ingestion').toLowerCase();
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

  return (
    <div className="flex-1 bg-zinc-950 p-8 overflow-y-auto custom-scrollbar flex flex-col gap-6">
      {/* Header section */}
      <header className="flex items-center justify-between border-b border-zinc-900 pb-5 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black tracking-widest text-indigo-500 uppercase">Platform Inbound Queue</span>
            <span className="h-3 w-px bg-zinc-800"></span>
            <span className="text-[10px] font-bold text-zinc-400">Pre-Assessment Staging</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
            <Inbox className="text-indigo-400 animate-pulse" size={24} />
            Inbound Queue
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Review external client request submissions, run pre-assessment staging, and dispatch work pathways.</p>
        </div>
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
                  
                  const displayName = fields.submitted_by || fields.name || fields.fullName || fields.email || 'Anonymous Ingestion';
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
                          : 'bg-zinc-950/40 border-zinc-900 hover:border-zinc-850 hover:bg-zinc-950/70'
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
                      {!isRouting ? (
                        <>
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
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-amber-400 hover:bg-zinc-850 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            >
                              <HelpCircle size={12} />
                              Needs Info
                            </button>
                          )}
                          
                          {selectedRecord.status?.toLowerCase() !== 'rejected' && (
                            <button
                              onClick={() => handleStatusChange('Rejected')}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-850 text-rose-500 hover:bg-rose-950/20 hover:border-rose-900/50 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            >
                              <XCircle size={12} />
                              Reject
                            </button>
                          )}

                          {selectedRecord.status?.toLowerCase() !== 'new' && (
                            <button
                              onClick={() => handleStatusChange('New')}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-emerald-400 hover:bg-zinc-850 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            >
                              <RotateCcw size={12} />
                              Re-open
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={() => setIsRouting(false)}
                          className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          Back to Review
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Main display card content */}
                  <div className="flex-1 min-h-[350px]">
                    {isRouting ? (
                      /* Manual Routing Wizard */
                      <div className="space-y-5">
                        <div className="bg-indigo-950/10 border border-indigo-900/30 rounded-2xl p-4 flex gap-3">
                          <Info size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                          <div className="text-[10px] text-zinc-400 leading-normal">
                            <span className="font-bold text-zinc-200 block mb-0.5 font-sans">Manual Work Dispatch</span>
                            Select a target business module below. The system will load the destination fields and attempt to auto-map values extracted from the client's form submission.
                          </div>
                        </div>

                        {/* Step 1: Destination selection */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-450">Destination Business Module</label>
                          <select
                            value={selectedTargetModuleId}
                            onChange={(e) => setSelectedTargetModuleId(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                          >
                            <option value="">Select Destination Module...</option>
                            {modules?.filter((m: any) => m.id !== triageModule.id && m.isIntakeTriage !== true && m.config?.isIntakeTriage !== true).map((m: any) => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Step 2: Mapping controls */}
                        {selectedTargetModuleId && (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <h4 className="text-[10px] font-black text-zinc-450 uppercase tracking-widest">Field Mapping Template</h4>
                              <span className="text-[8px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">Auto-mapping enabled</span>
                            </div>

                            <div className="border border-zinc-900 bg-zinc-950/30 rounded-2xl overflow-hidden max-h-[220px] overflow-y-auto custom-scrollbar">
                              <div className="grid grid-cols-12 gap-3 p-3 text-[9px] font-bold text-zinc-550 border-b border-zinc-900 bg-zinc-950">
                                <span className="col-span-5">Target Field (Destination)</span>
                                <span className="col-span-7">Source Field / Custom Value</span>
                              </div>

                              <div className="divide-y divide-zinc-900/60">
                                {flattenFields(
                                  (() => {
                                    const m = modules.find((m: any) => m.id === selectedTargetModuleId);
                                    return m ? (m.layout || m.config?.layout || []) : [];
                                  })()
                                ).map((field) => {
                                  if (field.type === 'section' || field.type === 'row') return null;
                                  const currentMap = mappings[field.id] || { type: 'ignore', value: '' };

                                  return (
                                    <div key={field.id} className="grid grid-cols-12 gap-3 p-3 items-center text-[10px]">
                                      <div className="col-span-5 flex flex-col">
                                        <span className="font-bold text-zinc-300">
                                          {field.label || field.id}
                                          {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                                        </span>
                                        <span className="text-[8px] text-zinc-550 capitalize">{field.type}</span>
                                      </div>

                                      <div className="col-span-7 space-y-1.5">
                                        <select
                                          value={currentMap.type === 'source' ? currentMap.value : currentMap.type}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === 'ignore') {
                                              setMappings(prev => ({ ...prev, [field.id]: { type: 'ignore', value: '' } }));
                                            } else if (val === 'custom') {
                                              setMappings(prev => ({ ...prev, [field.id]: { type: 'custom', value: '' } }));
                                            } else {
                                              setMappings(prev => ({ ...prev, [field.id]: { type: 'source', value: val } }));
                                            }
                                          }}
                                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-[10px] text-zinc-300 cursor-pointer focus:outline-none focus:border-indigo-500/50"
                                        >
                                          <option value="ignore">[Ignore / Keep Empty]</option>
                                          <option value="custom">[Use Static Custom Value]</option>
                                          {Object.keys(getRecordFields(selectedRecord)).filter(k => !k.startsWith('_')).map(k => (
                                            <option key={k} value={k}>Map: {k}</option>
                                          ))}
                                        </select>

                                        {currentMap.type === 'custom' && (
                                          <input
                                            type="text"
                                            value={currentMap.value || ''}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              setMappings(prev => ({ ...prev, [field.id]: { type: 'custom', value: val } }));
                                            }}
                                            placeholder="Enter static value..."
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-[10px] text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                                          />
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Dispatch actions footer */}
                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-900">
                              <button
                                onClick={() => setIsRouting(false)}
                                className="px-3.5 py-1.5 border border-zinc-900 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleManualDispatch}
                                disabled={routingInProgress}
                                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow cursor-pointer disabled:opacity-50"
                              >
                                <GitFork size={12} className={routingInProgress ? 'animate-spin' : ''} />
                                Dispatch Submission
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Main View Tabs (Assessment / Activity / Automation Rules) */
                      <div className="flex flex-col h-full gap-4">
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
                          {activeTab === 'assessment' && (
                            /* Submissions field mapping details */
                            <div className="grid grid-cols-2 gap-4">
                              {Object.entries(getRecordFields(selectedRecord))
                                .filter(([k]) => !k.startsWith('_'))
                                .map(([key, val]) => {
                                  const originalModule = getOriginalModule(selectedRecord, modules);
                                  const cleanLabel = getFieldLabel(key, originalModule);
                                  let Icon = FileText;
                                  let isLink = false;
                                  
                                  if (key.toLowerCase().includes('email')) Icon = Mail;
                                  else if (key.toLowerCase().includes('phone') || key.toLowerCase().includes('tel')) Icon = Phone;
                                  else if (key.toLowerCase().includes('user') || key.toLowerCase().includes('name')) Icon = User;
                                  
                                  const displayValue = typeof val === 'object' ? JSON.stringify(val) : String(val);
                                  if (String(val).startsWith('http://') || String(val).startsWith('https://')) {
                                    isLink = true;
                                  }

                                  return (
                                    <div 
                                      key={key} 
                                      className={`p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl space-y-1.5 flex flex-col justify-between hover:border-zinc-850 group transition-all ${
                                        key.toLowerCase().includes('description') || key.toLowerCase().includes('content') || displayValue.length > 50 
                                          ? 'col-span-2' 
                                          : 'col-span-1'
                                      }`}
                                    >
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
                                            {displayValue}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}

                              {Object.entries(getRecordFields(selectedRecord)).filter(([k]) => !k.startsWith('_')).length === 0 && (
                                <div className="col-span-2 py-10 text-center text-zinc-650 italic text-[10px]">
                                  No fields available on this submission record.
                                </div>
                              )}
                            </div>
                          )}

                          {activeTab === 'source' && (
                            /* Visualizes form ingestion source metadata */
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
                                    <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl flex flex-col justify-between hover:border-zinc-850 transition-all col-span-1">
                                      <div className="space-y-1">
                                        <span className="text-[9px] font-bold text-zinc-550 capitalize tracking-wider flex items-center gap-1.5">
                                          <Layers size={9} className="text-zinc-500" />
                                          Ingestion Channel
                                        </span>
                                        <p className="text-xs font-bold text-white mt-1.5">{sourceChannel}</p>
                                        <p className="text-[9.5px] text-zinc-500 leading-relaxed mt-0.5">Routed through Platform Central Intake routing router.</p>
                                      </div>
                                    </div>

                                    {/* Form Name card */}
                                    <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl flex flex-col justify-between hover:border-zinc-850 transition-all col-span-1">
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
                                    <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl flex flex-col justify-between hover:border-zinc-850 transition-all col-span-2">
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
                                        <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-850 text-zinc-400 text-[8px] font-bold rounded-md uppercase tracking-wider shrink-0">
                                          Active Form
                                        </span>
                                      </div>
                                    </div>

                                    {/* Origin module card */}
                                    <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl flex flex-col justify-between hover:border-zinc-850 transition-all col-span-2">
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
                    )}
                  </div>
                </div>
              ) : (
                /* Detail Pane Empty State */
                <div className="h-full border border-dashed border-zinc-900 rounded-3xl flex flex-col items-center justify-center p-8 text-center text-zinc-550 bg-zinc-950/10">
                  <AlertCircle size={28} className="text-zinc-750 mb-3" />
                  <p className="text-xs font-bold text-zinc-400 font-sans">No Submission Selected</p>
                  <p className="text-[9.5px] text-zinc-500 mt-1 max-w-xs leading-normal">Select an incoming ingestion request from the left staging stream to preview form fields, leave collaboration logs, or dispatch tasks across modules.</p>
                </div>
              )}
            </div>

          </div>
        </>
      ) : (
        /* Ingestion Disabled */
        <div className="flex-1 border border-dashed border-zinc-900 rounded-3xl flex flex-col items-center justify-center p-12 text-center text-zinc-550">
          <AlertCircle size={36} className="text-zinc-700 mb-4" />
          <h3 className="text-sm font-black text-zinc-300">Inbound Queue is not configured</h3>
          <p className="text-[10px] text-zinc-500 mt-1 max-w-md">The Inbound Queue system is currently disabled. Please contact your system administrator to enable the triage module inside Triage settings.</p>
        </div>
      )}
    </div>
  );
};
