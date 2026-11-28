import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Shield, ArrowLeft, Save, CheckCircle2, Layers, GitBranch,
  Sparkles, Eye, EyeOff, Lock, Edit3, Play, ChevronDown, ChevronRight,
  Sliders, Users, AlertTriangle, History, UserPlus, X, ListOrdered, Wand2
} from 'lucide-react';
import { toast } from 'sonner';
import { Button, Badge } from '../../UI/Primitives';
import { usePlatform } from '../../../hooks/usePlatform';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissionGroups } from '../../../hooks/usePermissionGroups';
import { PLATFORM_MODULES } from '../../../config/platformModules';
import { API_BASE_URL } from '../../../config';
import {
  RolePolicy,
  RoleType,
  RoleStatus,
  ModulePolicy,
  FieldVisibility,
  RowScope,
  AIPolicyDecision,
  RoleSimulationResult,
  PLATFORM_CAPABILITY_CATEGORIES,
  AI_GOVERNANCE_FEATURES,
  DEFAULT_MODULE_POLICY,
} from '../../../types/roles';

type StudioTab = 'overview' | 'capabilities' | 'modules' | 'workflows' | 'ai' | 'members' | 'audit' | 'simulator';

const COLOR_PRESETS = ['#4f46e5', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#18181b'];

const ROLE_STARTER_PRESETS: Array<{
  label: string;
  description: string;
  type: RoleType;
  color: string;
  capabilities: string[];
  canApprove: boolean;
  maxApprovalAmount: number | null;
  aiPolicies: Record<string, AIPolicyDecision>;
}> = [
  {
    label: 'Read-Only Auditor',
    description: 'Inspect audit logs, view directory, and export reports without modifying data.',
    type: 'CUSTOM',
    color: '#06b6d4',
    capabilities: ['view:audit_logs', 'view:staff', 'view:teams', 'export:records'],
    canApprove: false,
    maxApprovalAmount: null,
    aiPolicies: { 'ai:workflow_actions': 'DENY', 'ai:agent_builder': 'DENY' },
  },
  {
    label: 'Case Worker',
    description: 'Create and update assigned cases within team scope without delete privileges.',
    type: 'CUSTOM',
    color: '#3b82f6',
    capabilities: ['view:staff', 'view:teams', 'create:records'],
    canApprove: false,
    maxApprovalAmount: null,
    aiPolicies: { 'ai:record_summary': 'ALLOW', 'ai:ask_aurora_filter': 'ALLOW' },
  },
  {
    label: 'Department Supervisor',
    description: 'Team-level operational management with financial approval authority up to $10,000.',
    type: 'CUSTOM',
    color: '#8b5cf6',
    capabilities: ['view:staff', 'view:teams', 'manage:teams', 'create:records', 'export:records'],
    canApprove: true,
    maxApprovalAmount: 10000,
    aiPolicies: { 'ai:report_generator': 'ALLOW', 'ai:record_summary': 'ALLOW' },
  },
  {
    label: 'External Portal Citizen',
    description: 'External applicant role restricted strictly to own submissions with portal AI chat.',
    type: 'PORTAL',
    color: '#10b981',
    capabilities: ['create:records'],
    canApprove: false,
    maxApprovalAmount: null,
    aiPolicies: { 'ai:public_portal_chat': 'ALLOW', 'ai:agent_builder': 'DENY', 'ai:solution_builder': 'DENY' },
  },
];

const NON_DATA_FIELD_TYPES = new Set([
  'section',
  'heading',
  'divider',
  'spacer',
  'banner',
  'callout',
  'html',
  'markdown',
  'button',
  'info',
  'text_block',
  'image_banner',
  'column',
  'columns',
  'row',
  'tab',
  'tabs',
]);

const extractModuleFields = (mod: any): Array<{ id: string; label: string; type: string }> => {
  const results: Array<{ id: string; label: string; type: string }> = [];
  const seen = new Set<string>();

  const walk = (nodes: any) => {
    if (!Array.isArray(nodes)) return;
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue;
      const nodeType = String(node.type || '').toLowerCase();

      // Recurse into nested containers (fieldGroup, repeatableGroup, section, columns, etc.)
      if (Array.isArray(node.fields)) walk(node.fields);
      if (Array.isArray(node.children)) walk(node.children);
      if (Array.isArray(node.columns)) {
        node.columns.forEach((col: any) => {
          if (Array.isArray(col)) walk(col);
          else if (Array.isArray(col?.fields)) walk(col.fields);
          else if (Array.isArray(col?.children)) walk(col.children);
        });
      }

      const id = node.id || node.fieldId || node.name;
      const isContainerOnly =
        NON_DATA_FIELD_TYPES.has(nodeType) ||
        nodeType === 'fieldgroup' ||
        nodeType === 'group';

      if (id && !isContainerOnly && !seen.has(id)) {
        seen.add(id);
        results.push({
          id,
          label: node.label || node.name || id,
          type: node.type || 'text',
        });
      }
    }
  };

  if (Array.isArray(mod?.layout)) walk(mod.layout);
  if (Array.isArray(mod?.config?.layout)) walk(mod.config.layout);
  if (Array.isArray(mod?.fields)) walk(mod.fields);
  if (Array.isArray(mod?.config?.fields)) walk(mod.config.fields);
  if (Array.isArray(mod?.tabs)) {
    mod.tabs.forEach((t: any) => {
      if (Array.isArray(t?.layout)) walk(t.layout);
      if (Array.isArray(t?.fields)) walk(t.fields);
    });
  }

  return results;
};

const isRealDataModule = (mod: any): boolean => {
  if (!mod || typeof mod !== 'object') return false;
  const modType = String(mod.type || '').toUpperCase();
  if (['PAGE', 'QUEUE', 'REPORT', 'DASHBOARD', 'AUTOMATION', 'SITE', 'FORM', 'WORKFLOW'].includes(modType)) {
    return false;
  }
  if (mod.isGlobal || mod.isIntakeTriage || mod.config?.isIntakeTriage || mod.config?.isQueue || mod.config?.isPage) {
    return false;
  }
  const isPlatformService = PLATFORM_MODULES.some(
    (pm) => pm.id === mod.id || pm.id === mod.templateId || pm.name === mod.name || pm.slug === mod.templateId
  );
  if (isPlatformService) return false;
  return true;
};

const slugifyRole = (val: string) =>
  val
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export interface RoleBuilderStudioProps {
  draftMode?: boolean;
  initialDraftRole?: Partial<RolePolicy>;
  draftModules?: any[];
  onSaveDraft?: (role: Partial<RolePolicy>) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export const RoleBuilderStudio: React.FC<RoleBuilderStudioProps> = ({
  draftMode = false,
  initialDraftRole,
  onSaveDraft,
  onDirtyChange,
}) => {
  const { id: routeId } = useParams<{ id?: string }>();
  const id = draftMode ? (initialDraftRole?.id || 'draft_role') : routeId;
  const navigate = useNavigate();
  const location = useLocation();
  const { tenant, modules } = usePlatform();
  const { session } = useAuth();
  const { groups, fetchRoleById, createGroup, updateGroup, simulateGroup } = usePermissionGroups();

  const isNew = draftMode ? false : (!id || id === 'new');
  const [activeTab, setActiveTab] = useState<StudioTab>('overview');
  const [loading, setLoading] = useState(draftMode ? false : !isNew);
  const [saving, setSaving] = useState(false);

  // Role state
  const [name, setName] = useState(initialDraftRole?.name || '');
  const [slug, setSlug] = useState(initialDraftRole?.slug || '');
  const [description, setDescription] = useState(initialDraftRole?.description || '');
  const [type, setType] = useState<RoleType>(initialDraftRole?.type || (draftMode ? 'SOLUTION' : 'CUSTOM'));
  const [status, setStatus] = useState<RoleStatus>(initialDraftRole?.status || (draftMode ? 'DRAFT' : 'ACTIVE'));
  const [color, setColor] = useState(initialDraftRole?.color || '#4f46e5');
  const [parentGroupId, setParentGroupId] = useState<string>(initialDraftRole?.parentGroupId || '');
  const [capabilities, setCapabilities] = useState<string[]>(initialDraftRole?.capabilities || []);
  const [modulePolicies, setModulePolicies] = useState<Record<string, ModulePolicy>>(initialDraftRole?.modulePolicies || {});
  const [workflowPolicies, setWorkflowPolicies] = useState<{
    canApprove?: boolean;
    maxApprovalAmount?: number | null;
    allowedQueueIds?: string[];
    allowedWorkflowIds?: string[];
  }>({
    canApprove: initialDraftRole?.workflowPolicies?.canApprove ?? false,
    maxApprovalAmount: initialDraftRole?.workflowPolicies?.maxApprovalAmount ?? null,
    allowedQueueIds: initialDraftRole?.workflowPolicies?.allowedQueueIds || [],
    allowedWorkflowIds: initialDraftRole?.workflowPolicies?.allowedWorkflowIds || [],
  });
  const [aiPolicies, setAiPolicies] = useState<Record<string, AIPolicyDecision>>(initialDraftRole?.aiPolicies || {});

  // Auxiliary data
  const [queues, setQueues] = useState<Array<{ id: string; name: string }>>([]);
  const [assignedMembers, setAssignedMembers] = useState<any[]>([]);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [selectedMemberToAdd, setSelectedMemberToAdd] = useState('');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // UI & Simulator state
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [moduleSearch, setModuleSearch] = useState('');
  const [simResult, setSimResult] = useState<RoleSimulationResult | null>(null);
  const [memberSimResult, setMemberSimResult] = useState<any>(null);
  const [simMemberId, setSimMemberId] = useState('');
  const [simSampleModuleId, setSimSampleModuleId] = useState('');
  const [simLoading, setSimLoading] = useState(false);

  const authHeaders = useCallback(
    (withJson = false) => ({
      ...(withJson ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${(import.meta as any).env?.VITE_DEV_TOKEN || session?.access_token}`,
      'x-tenant-id': tenant?.id || '',
    }),
    [session?.access_token, tenant?.id]
  );

  // Fetch queues & workspace members for pickers
  useEffect(() => {
    if (!tenant?.id) return;
    fetch(`${API_BASE_URL}/api/queues`, { headers: authHeaders() })
      .then((r): Promise<any> => (r.ok ? r.json() : Promise.resolve([])))
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.queues || [];
        setQueues(list.map((q: any) => ({ id: q.id, name: q.name || q.title || q.id })));
      })
      .catch(() => {});

    fetch(`${API_BASE_URL}/api/members`, { headers: authHeaders() })
      .then((r): Promise<any> => (r.ok ? r.json() : Promise.resolve([])))
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.members || [];
        setAllMembers(list);
      })
      .catch(() => {});
  }, [tenant?.id, authHeaders]);

  const loadRoleMembersAndAudit = useCallback(
    async (roleId: string) => {
      if (!tenant?.id) return;
      try {
        const [mRes, aRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/permissions/groups/${roleId}/members`, { headers: authHeaders() }),
          fetch(`${API_BASE_URL}/api/permissions/groups/${roleId}/audit`, { headers: authHeaders() }),
        ]);
        if (mRes.ok) setAssignedMembers(await mRes.json());
        if (aRes.ok) setAuditLogs(await aRes.json());
      } catch {
        // non-fatal
      }
    },
    [tenant?.id, authHeaders]
  );

  // Hydrate existing role or Solution draftArtifact
  useEffect(() => {
    const draftArtifact = (location.state as any)?.draftArtifact;
    if (isNew && draftArtifact) {
      const content = draftArtifact.content || {};
      const draftName = draftArtifact.name || content.name || 'Solution Role';
      setName(draftName);
      setSlug(slugifyRole(draftName));
      setDescription(draftArtifact.description || content.description || 'Imported from Solution Blueprint');
      setType('SOLUTION');
      setStatus('DRAFT');
      if (Array.isArray(content.capabilities)) setCapabilities(content.capabilities);
      if (content.modulePolicies && typeof content.modulePolicies === 'object') setModulePolicies(content.modulePolicies);
      if (content.aiPolicies && typeof content.aiPolicies === 'object') setAiPolicies(content.aiPolicies);
      toast.success(`Loaded draft Role from Solution: "${draftName}"`);
      return;
    }

    if (!isNew && id) {
      setLoading(true);
      fetchRoleById(id)
        .then((role) => {
          if (!role) return;
          setName(role.name || '');
          setSlug(role.slug || slugifyRole(role.name || ''));
          setDescription(role.description || '');
          setType((role.type as RoleType) || 'CUSTOM');
          setStatus((role.status as RoleStatus) || 'ACTIVE');
          setColor(role.color || '#4f46e5');
          setParentGroupId(role.parentGroupId || '');
          setCapabilities(Array.isArray(role.capabilities) ? role.capabilities : []);
          setModulePolicies(role.modulePolicies || {});
          setWorkflowPolicies(role.workflowPolicies || { canApprove: false, maxApprovalAmount: null, allowedQueueIds: [] });
          setAiPolicies(role.aiPolicies || {});
          loadRoleMembersAndAudit(id);
        })
        .catch(() => {
          toast.error('Could not load role');
          navigate('/workspace/settings/platform-modules/roles-library');
        })
        .finally(() => setLoading(false));
    }
  }, [id, isNew, location.state, fetchRoleById, navigate, loadRoleMembersAndAudit]);

  const applyStarterPreset = (preset: (typeof ROLE_STARTER_PRESETS)[number]) => {
    setName(preset.label);
    setSlug(slugifyRole(preset.label));
    setDescription(preset.description);
    setType(preset.type);
    setColor(preset.color);
    setCapabilities(preset.capabilities);
    setWorkflowPolicies((prev) => ({
      ...prev,
      canApprove: preset.canApprove,
      maxApprovalAmount: preset.maxApprovalAmount,
    }));
    setAiPolicies(preset.aiPolicies);
    toast.success(`Applied "${preset.label}" preset`);
  };

  // Resolve parent capabilities client-side for live "Inherited" badges
  const inheritedCapabilities = useMemo(() => {
    const inherited = new Set<string>();
    const visited = new Set<string>();
    let curr = parentGroupId;
    while (curr && !visited.has(curr)) {
      visited.add(curr);
      const p = groups.find((g) => g.id === curr);
      if (!p) break;
      (p.capabilities || []).forEach((c) => inherited.add(c));
      curr = p.parentGroupId || '';
    }
    return inherited;
  }, [parentGroupId, groups]);

  const inheritanceChainPreview = useMemo(() => {
    const chain: string[] = [];
    const visited = new Set<string>();
    let curr = parentGroupId;
    while (curr && !visited.has(curr)) {
      visited.add(curr);
      const p = groups.find((g) => g.id === curr);
      if (!p) break;
      chain.unshift(p.name);
      curr = p.parentGroupId || '';
    }
    chain.push(name || 'This Role');
    return chain;
  }, [parentGroupId, groups, name]);

  const dataModules = useMemo(() => (modules || []).filter(isRealDataModule), [modules]);

  const filteredModules = useMemo(() => {
    const q = moduleSearch.trim().toLowerCase();
    return dataModules.filter(
      (m: any) => !q || m.name?.toLowerCase().includes(q) || m.slug?.toLowerCase().includes(q)
    );
  }, [dataModules, moduleSearch]);

  const toggleCapability = (capKey: string) => {
    setCapabilities((prev) =>
      prev.includes(capKey) ? prev.filter((c) => c !== capKey) : [...prev, capKey]
    );
  };

  const updateModulePolicy = (moduleId: string, patch: Partial<ModulePolicy>) => {
    setModulePolicies((prev) => {
      const current = prev[moduleId] || { ...DEFAULT_MODULE_POLICY };
      return {
        ...prev,
        [moduleId]: { ...current, ...patch },
      };
    });
  };

  const removeModulePolicy = (moduleId: string) => {
    setModulePolicies((prev) => {
      const next = { ...prev };
      delete next[moduleId];
      return next;
    });
  };

  const setFieldVisibility = (moduleId: string, fieldId: string, visibility: FieldVisibility) => {
    setModulePolicies((prev) => {
      const current = prev[moduleId] || { ...DEFAULT_MODULE_POLICY };
      const fields = { ...(current.fields || {}) };
      if (visibility === 'editable') {
        delete fields[fieldId];
      } else {
        fields[fieldId] = { visibility };
      }
      return {
        ...prev,
        [moduleId]: { ...current, fields },
      };
    });
  };

  const toggleAllowedQueue = (queueId: string) => {
    setWorkflowPolicies((prev) => {
      const curr = prev.allowedQueueIds || [];
      const next = curr.includes(queueId) ? curr.filter((q) => q !== queueId) : [...curr, queueId];
      return { ...prev, allowedQueueIds: next };
    });
  };

  const setAIPolicy = (featureKey: string, decision: AIPolicyDecision) => {
    setAiPolicies((prev) => {
      const next = { ...prev };
      if (decision === 'INHERIT') {
        delete next[featureKey];
      } else {
        next[featureKey] = decision;
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Role name is required');
      setActiveTab('overview');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<RolePolicy> = {
        id: initialDraftRole?.id || id,
        name: name.trim(),
        slug: slug.trim() || slugifyRole(name),
        description: description.trim(),
        type,
        status,
        color,
        parentGroupId: parentGroupId || null,
        capabilities,
        modulePolicies,
        workflowPolicies,
        aiPolicies,
      };

      if (draftMode) {
        onSaveDraft?.(payload);
        onDirtyChange?.(false);
        toast.success(`Role "${name}" updated in Solution draft.`);
        return;
      }

      if (isNew) {
        const created = await createGroup(payload);
        toast.success(`Role "${name}" created`);
        if (created?.id) {
          navigate(`/workspace/settings/builder/role/${created.id}`, { replace: true });
        }
      } else if (id) {
        await updateGroup(id, payload);
        toast.success(`Role "${name}" saved`);
        loadRoleMembersAndAudit(id);
      }
    } catch {
      // handled in hook
    } finally {
      setSaving(false);
    }
  };

  const handleAssignMember = async () => {
    if (!id || isNew || !selectedMemberToAdd) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/permissions/groups/${id}/members`, {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ memberId: selectedMemberToAdd }),
      });
      if (!res.ok) throw new Error('Failed to assign member');
      setSelectedMemberToAdd('');
      toast.success('Member assigned to role');
      loadRoleMembersAndAudit(id);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!id || isNew) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/permissions/groups/${id}/members/${memberId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to remove member');
      toast.success('Member removed from role');
      loadRoleMembersAndAudit(id);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRunSimulation = async () => {
    if (isNew || !id) {
      toast.info('Save the role first to run server-side effective access simulation.');
      return;
    }
    setSimLoading(true);
    try {
      const res = await simulateGroup(id);
      setSimResult(res);
      setMemberSimResult(null);
    } catch (err: any) {
      toast.error(err.message || 'Simulation failed');
    } finally {
      setSimLoading(false);
    }
  };

  const handleSimulateMember = async () => {
    if (!simMemberId) return;
    setSimLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/permissions/simulate-member/${simMemberId}`, {
        method: 'POST',
        headers: authHeaders(true),
      });
      if (!res.ok) throw new Error('Member simulation failed');
      setMemberSimResult(await res.json());
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSimLoading(false);
    }
  };

  const sampleRecordPreview = useMemo(() => {
    if (!simSampleModuleId) return null;
    const mod: any = dataModules.find((m: any) => m.id === simSampleModuleId);
    if (!mod) return null;
    const pol = simResult?.effectiveModulePolicies?.[mod.id] || modulePolicies[mod.id];
    const fields = extractModuleFields(mod);
    return fields.map((f) => {
      const fId = f.id;
      const vis: FieldVisibility = pol?.fields?.[fId]?.visibility || 'editable';
      const sampleVal = f.type === 'email' ? 'jane.doe@aurora.gov' : f.type === 'number' ? '42500' : 'Sample Value 8921';
      const rendered =
        vis === 'hidden'
          ? '[STRIPPED FROM API RESPONSE]'
          : vis === 'masked'
          ? '••••••••8921'
          : sampleVal;
      return { id: fId, label: f.label, vis, rendered };
    });
  }, [simSampleModuleId, dataModules, simResult, modulePolicies]);

  const tabs: Array<{ id: StudioTab; label: string; icon: any; count?: number }> = [
    { id: 'overview', label: 'Overview & Inheritance', icon: Sliders },
    { id: 'capabilities', label: 'Platform Capabilities', icon: CheckCircle2, count: capabilities.length + inheritedCapabilities.size },
    { id: 'modules', label: 'Data & Modules', icon: Layers, count: Object.keys(modulePolicies).length },
    { id: 'workflows', label: 'Workflows & Queues', icon: GitBranch, count: (workflowPolicies.allowedQueueIds || []).length },
    { id: 'ai', label: 'AI & Agent Guardrails', icon: Sparkles, count: Object.keys(aiPolicies).length },
    ...(!isNew
      ? [
          { id: 'members' as StudioTab, label: 'Assigned Members', icon: Users, count: assignedMembers.length },
          { id: 'audit' as StudioTab, label: 'Audit History', icon: History, count: auditLogs.length },
        ]
      : []),
    { id: 'simulator', label: 'Access Simulator', icon: Play },
  ];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-sm font-medium text-zinc-500">Loading Role Builder Studio...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      {/* Top Studio Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6">
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/workspace/settings/platform-modules/roles-library')}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Back to Roles Library"
          >
            <ArrowLeft size={16} />
          </button>

          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
            style={{ backgroundColor: color }}
          >
            <Shield size={19} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {name || 'Untitled Role'}
              </h1>
              <Badge variant={status === 'ACTIVE' ? 'green' : 'zinc'} className="text-[10px] font-bold uppercase">
                {status}
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
              {inheritanceChainPreview.join(' → ')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {!isNew && (
            <Button
              variant="secondary"
              onClick={() => setActiveTab('members')}
            >
              <Users size={14} className="mr-1.5" />
              {assignedMembers.length} Assigned
            </Button>
          )}
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            <Save size={14} className="mr-1.5" />
            {saving ? 'Saving...' : isNew ? 'Create Role' : 'Save Role'}
          </Button>
        </div>
      </header>

      {/* Main Studio Body */}
      <div className="flex flex-1 min-h-0">
        {/* Left Navigation Rail */}
        <aside className="w-64 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 flex flex-col justify-between overflow-y-auto">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon size={15} />
                    {tab.label}
                  </span>
                  {typeof tab.count === 'number' && tab.count > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                        isActive
                          ? 'bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Compact Policy Summary */}
          <div className="mt-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Policy Footprint</div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Capabilities</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100">{capabilities.length + inheritedCapabilities.size}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Governed Modules</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100">{Object.keys(modulePolicies).length}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">AI Overrides</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100">{Object.keys(aiPolicies).length}</span>
            </div>
          </div>
        </aside>

        {/* Center Canvas */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-4xl space-y-6">
            {/* TAB 1: OVERVIEW & INHERITANCE */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Role Identity & Inheritance</h2>
                  <p className="text-xs text-zinc-500 mt-1">
                    Define the blueprint identity, classification, and optional parent role to inherit baseline permissions from.
                  </p>
                </div>

                {/* Starter Presets for New Roles */}
                {isNew && (
                  <div className="rounded-xl border border-indigo-200/70 dark:border-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                      <Wand2 size={14} />
                      Start from an Enterprise Preset
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      {ROLE_STARTER_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => applyStarterPreset(preset)}
                          className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 text-left hover:border-indigo-400 transition-colors"
                        >
                          <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{preset.label}</div>
                          <div className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2">{preset.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                        Role Name *
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (isNew) setSlug(slugifyRole(e.target.value));
                        }}
                        placeholder="e.g. Senior Permit Inspector"
                        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                        Blueprint Slug
                      </label>
                      <input
                        type="text"
                        value={slug}
                        onChange={(e) => setSlug(slugifyRole(e.target.value))}
                        placeholder="senior-permit-inspector"
                        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-sm font-mono outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the responsibilities and data boundaries for this role..."
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                        Role Classification
                      </label>
                      <select
                        value={type}
                        onChange={(e) => setType(e.target.value as RoleType)}
                        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                      >
                        <option value="CUSTOM">Custom Role</option>
                        <option value="SOLUTION">Solution Blueprint Role</option>
                        <option value="PORTAL">External Portal Role</option>
                        <option value="SYSTEM">System Role</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                        Lifecycle Status
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as RoleStatus)}
                        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                      >
                        <option value="ACTIVE">Active (Enforced)</option>
                        <option value="DRAFT">Draft</option>
                        <option value="ARCHIVED">Archived</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                        Badge Color
                      </label>
                      <div className="flex items-center gap-2 pt-1.5">
                        {COLOR_PRESETS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setColor(c)}
                            className={`h-6 w-6 rounded-full transition-transform ${
                              color === c ? 'ring-2 ring-offset-2 ring-zinc-900 dark:ring-white scale-110' : ''
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Inheritance Card */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <GitBranch size={17} className="text-indigo-500" />
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Role Inheritance</h3>
                      <p className="text-xs text-zinc-500">
                        Automatically inherit capabilities, module policies, and AI defaults from a parent role. Child rules override parent rules.
                      </p>
                    </div>
                  </div>

                  <select
                    value={parentGroupId}
                    onChange={(e) => setParentGroupId(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="">None (Standalone Root Role)</option>
                    {groups
                      .filter((g) => g.id !== id)
                      .map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                  </select>

                  {inheritanceChainPreview.length > 1 && (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-indigo-50/70 dark:bg-indigo-500/10 border border-indigo-200/60 dark:border-indigo-500/20 px-4 py-3 text-xs">
                      <span className="font-bold text-indigo-700 dark:text-indigo-300">Resolution Chain:</span>
                      {inheritanceChainPreview.map((step, i) => (
                        <React.Fragment key={`${step}-${i}`}>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">{step}</span>
                          {i < inheritanceChainPreview.length - 1 && <span className="text-zinc-400">→</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: PLATFORM CAPABILITIES */}
            {activeTab === 'capabilities' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Platform Capabilities</h2>
                  <p className="text-xs text-zinc-500 mt-1">
                    Toggle system-wide capabilities. Permissions inherited from parent roles are highlighted automatically.
                  </p>
                </div>

                <div className="space-y-5">
                  {PLATFORM_CAPABILITY_CATEGORIES.map((cat) => (
                    <div
                      key={cat.id}
                      className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">{cat.category}</h3>
                        <button
                          type="button"
                          onClick={() => {
                            const keys = cat.items.map((i) => i.key);
                            const allOn = keys.every((k) => capabilities.includes(k));
                            setCapabilities((prev) =>
                              allOn ? prev.filter((k) => !keys.includes(k)) : Array.from(new Set([...prev, ...keys]))
                            );
                          }}
                          className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          Toggle All
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {cat.items.map((item) => {
                          const isDirect = capabilities.includes(item.key);
                          const isInherited = inheritedCapabilities.has(item.key);
                          const isActive = isDirect || isInherited;

                          return (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => toggleCapability(item.key)}
                              className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${
                                isDirect
                                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10'
                                  : isInherited
                                  ? 'border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-500/5'
                                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                              }`}
                            >
                              <div
                                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                  isActive
                                    ? isDirect
                                      ? 'border-indigo-500 bg-indigo-500 text-white'
                                      : 'border-emerald-500 bg-emerald-500 text-white'
                                    : 'border-zinc-300 dark:border-zinc-700'
                                }`}
                              >
                                {isActive && <CheckCircle2 size={12} strokeWidth={3} />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{item.label}</span>
                                  {isInherited && !isDirect && (
                                    <span className="rounded bg-emerald-100 dark:bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
                                      Inherited
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
                                  {item.description}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: DATA & MODULE SECURITY MATRIX */}
            {activeTab === 'modules' && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Data & Module Security Matrix</h2>
                    <p className="text-xs text-zinc-500 mt-1">
                      Enforced directly in PostgreSQL queries, API CRUD verbs, and workspace UI forms/tables.
                    </p>
                  </div>
                  <input
                    type="text"
                    value={moduleSearch}
                    onChange={(e) => setModuleSearch(e.target.value)}
                    placeholder="Filter modules..."
                    className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-xs outline-none focus:border-indigo-500 w-56"
                  />
                </div>

                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                  <div className="grid grid-cols-12 items-center border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    <div className="col-span-4">Data Module</div>
                    <div className="col-span-1 text-center">Access</div>
                    <div className="col-span-1 text-center">Create</div>
                    <div className="col-span-1 text-center">Read</div>
                    <div className="col-span-1 text-center">Edit</div>
                    <div className="col-span-1 text-center">Delete</div>
                    <div className="col-span-1 text-center">Export</div>
                    <div className="col-span-2 text-right">Row Scope</div>
                  </div>

                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {filteredModules.length === 0 ? (
                      <div className="p-8 text-center text-xs text-zinc-500">No data modules found in this workspace.</div>
                    ) : (
                      filteredModules.map((mod: any) => {
                        const pol = modulePolicies[mod.id];
                        const isConfigured = Boolean(pol);
                        const isExpanded = expandedModuleId === mod.id;
                        const fields = extractModuleFields(mod);
                        const fieldOverrideCount = Object.keys(pol?.fields || {}).length;

                        return (
                          <div key={mod.id} className="transition-colors">
                            <div className="grid grid-cols-12 items-center px-4 py-3 text-xs hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30">
                              <div className="col-span-4 flex items-center gap-2 min-w-0 pr-2">
                                <button
                                  type="button"
                                  onClick={() => setExpandedModuleId(isExpanded ? null : mod.id)}
                                  className="p-1 rounded-md text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                  title="Configure field-level security"
                                >
                                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </button>
                                <div className="min-w-0">
                                  <div className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{mod.name}</div>
                                  <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                                    <span>{fields.length} fields</span>
                                    {fieldOverrideCount > 0 && (
                                      <span className="text-amber-600 dark:text-amber-400 font-bold">
                                        · {fieldOverrideCount} restricted
                                      </span>
                                    )}
                                    {!isConfigured && <span>· Unrestricted</span>}
                                  </div>
                                </div>
                              </div>

                              {(['access', 'create', 'read', 'update', 'delete', 'export'] as const).map((flag) => {
                                const checked = isConfigured ? Boolean(pol[flag]) : false;
                                return (
                                  <div key={flag} className="col-span-1 flex justify-center">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) => updateModulePolicy(mod.id, { [flag]: e.target.checked })}
                                      className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                  </div>
                                );
                              })}

                              <div className="col-span-2 flex items-center justify-end gap-1.5">
                                <select
                                  value={pol?.rowScope || 'ALL'}
                                  onChange={(e) => updateModulePolicy(mod.id, { rowScope: e.target.value as RowScope })}
                                  className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1 text-[11px] font-semibold outline-none"
                                >
                                  <option value="ALL">All Rows</option>
                                  <option value="TEAM">Team Only</option>
                                  <option value="OWNED">Own Only</option>
                                </select>
                                {isConfigured && (
                                  <button
                                    type="button"
                                    onClick={() => removeModulePolicy(mod.id)}
                                    className="text-[10px] text-zinc-400 hover:text-red-500 px-1"
                                    title="Reset to default"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="bg-zinc-50/80 dark:bg-zinc-950/60 border-t border-zinc-100 dark:border-zinc-800 px-10 py-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                                    Field-Level Security — {mod.name}
                                  </span>
                                  <span className="text-[10px] text-zinc-400">
                                    Masked values render as ••••1234 and are protected on write
                                  </span>
                                </div>

                                {fields.length === 0 ? (
                                  <div className="text-xs text-zinc-400 italic">This module has no custom fields defined yet.</div>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {fields.map((field: any) => {
                                      const fId = field.id || field.name;
                                      const currentVis: FieldVisibility = pol?.fields?.[fId]?.visibility || 'editable';
                                      return (
                                        <div
                                          key={fId}
                                          className="flex items-center justify-between rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2"
                                        >
                                          <div className="min-w-0 pr-2">
                                            <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                                              {field.label || field.name}
                                            </div>
                                            <div className="text-[10px] font-mono text-zinc-400 truncate">{field.type || 'text'}</div>
                                          </div>
                                          <div className="flex items-center gap-1 shrink-0">
                                            {(
                                              [
                                                { v: 'editable', icon: Edit3, label: 'Edit' },
                                                { v: 'readonly', icon: Eye, label: 'Read' },
                                                { v: 'masked', icon: Lock, label: 'Mask' },
                                                { v: 'hidden', icon: EyeOff, label: 'Hide' },
                                              ] as const
                                            ).map((opt) => (
                                              <button
                                                key={opt.v}
                                                type="button"
                                                onClick={() => setFieldVisibility(mod.id, fId, opt.v)}
                                                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold transition-colors ${
                                                  currentVis === opt.v
                                                    ? opt.v === 'hidden'
                                                      ? 'bg-red-500 text-white'
                                                      : opt.v === 'masked'
                                                      ? 'bg-amber-500 text-white'
                                                      : opt.v === 'readonly'
                                                      ? 'bg-blue-500 text-white'
                                                      : 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                                                }`}
                                              >
                                                <opt.icon size={10} />
                                                {opt.label}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: WORKFLOWS & QUEUES */}
            {activeTab === 'workflows' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Workflows, Approvals & Queues</h2>
                  <p className="text-xs text-zinc-500 mt-1">
                    Enforce financial approval ceilings in Aurora Approvals and scope which operational queues this role can work from.
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5">
                  <div className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                    <div>
                      <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Workflow Approval Authority</div>
                      <div className="text-xs text-zinc-500">
                        Allow members with this role to approve or reject workflow, invoice, and leave decisions.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(workflowPolicies.canApprove)}
                      onChange={(e) =>
                        setWorkflowPolicies((prev) => ({ ...prev, canApprove: e.target.checked }))
                      }
                      className="h-5 w-5 rounded border-zinc-300 text-indigo-600 cursor-pointer"
                    />
                  </div>

                  {workflowPolicies.canApprove && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                        Maximum Financial Approval Limit ($)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={workflowPolicies.maxApprovalAmount ?? ''}
                        onChange={(e) =>
                          setWorkflowPolicies((prev) => ({
                            ...prev,
                            maxApprovalAmount: e.target.value === '' ? null : Number(e.target.value),
                          }))
                        }
                        placeholder="Leave blank for unlimited approval authority"
                        className="w-full max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}
                </div>

                {/* Permitted Queues */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <ListOrdered size={16} className="text-indigo-500" />
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Allowed Work Queues</h3>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Select specific queues this role is authorized to triage. Leave all unchecked to allow all workspace queues.
                  </p>
                  {queues.length === 0 ? (
                    <div className="text-xs text-zinc-400 italic py-2">No queues configured in this workspace yet.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {queues.map((q) => {
                        const selected = (workflowPolicies.allowedQueueIds || []).includes(q.id);
                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => toggleAllowedQueue(q.id)}
                            className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-all ${
                              selected
                                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                                : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                            }`}
                          >
                            <span className="truncate">{q.name}</span>
                            {selected && <CheckCircle2 size={14} className="text-indigo-500 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: AI & AGENT GUARDRAILS */}
            {activeTab === 'ai' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">AI & Agent Guardrails</h2>
                  <p className="text-xs text-zinc-500 mt-1">
                    Explicitly Allow or Deny AI capabilities for this role. Explicit Deny always takes precedence across sibling roles.
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
                  {AI_GOVERNANCE_FEATURES.map((feat) => {
                    const decision: AIPolicyDecision = aiPolicies[feat.key] || 'INHERIT';
                    return (
                      <div key={feat.key} className="flex items-center justify-between px-5 py-3.5">
                        <div>
                          <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{feat.label}</div>
                          <div className="text-[10px] text-zinc-400 font-mono">
                            {feat.category} · {feat.key}
                          </div>
                        </div>
                        <div className="inline-flex rounded-xl border border-zinc-200 dark:border-zinc-800 p-0.5 bg-zinc-50 dark:bg-zinc-950">
                          {(['INHERIT', 'ALLOW', 'DENY'] as const).map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setAIPolicy(feat.key, opt)}
                              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                decision === opt
                                  ? opt === 'ALLOW'
                                    ? 'bg-emerald-500 text-white shadow-sm'
                                    : opt === 'DENY'
                                    ? 'bg-red-500 text-white shadow-sm'
                                    : 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900'
                                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 6: ASSIGNED MEMBERS */}
            {activeTab === 'members' && !isNew && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Assigned Workforce Members</h2>
                  <p className="text-xs text-zinc-500 mt-1">
                    Assign or remove people directly here — automatically synced with Workforce Management.
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                  <select
                    value={selectedMemberToAdd}
                    onChange={(e) => setSelectedMemberToAdd(e.target.value)}
                    className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-xs outline-none"
                  >
                    <option value="">Select a Workforce member to assign...</option>
                    {allMembers
                      .filter((m: any) => !assignedMembers.some((am) => am.memberId === m.id))
                      .map((m: any) => (
                        <option key={m.id} value={m.id}>
                          {`${m.firstName || ''} ${m.familyName || ''}`.trim() || m.email} ({m.email})
                        </option>
                      ))}
                  </select>
                  <Button variant="primary" onClick={handleAssignMember} disabled={!selectedMemberToAdd}>
                    <UserPlus size={14} className="mr-1.5" />
                    Assign
                  </Button>
                </div>

                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
                  {assignedMembers.length === 0 ? (
                    <div className="p-8 text-center text-xs text-zinc-400">No Workforce members assigned to this role yet.</div>
                  ) : (
                    assignedMembers.map((m) => (
                      <div key={m.memberId} className="flex items-center justify-between px-5 py-3.5">
                        <div>
                          <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{m.name}</div>
                          <div className="text-[11px] text-zinc-500">
                            {m.email} {m.teamName ? `· ${m.teamName}` : ''}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(m.memberId)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          title="Remove from role"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 7: AUDIT HISTORY */}
            {activeTab === 'audit' && !isNew && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Policy Audit History</h2>
                  <p className="text-xs text-zinc-500 mt-1">
                    Immutable record of policy changes and member assignments for this role.
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
                  {auditLogs.length === 0 ? (
                    <div className="p-8 text-center text-xs text-zinc-400">No audit events recorded yet.</div>
                  ) : (
                    auditLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between px-5 py-3.5 text-xs">
                        <div>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">{log.action}</span>
                          <span className="text-zinc-400 ml-2 font-mono text-[10px]">by {log.actorId}</span>
                        </div>
                        <span className="text-[11px] text-zinc-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 8: ACCESS SIMULATOR */}
            {activeTab === 'simulator' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Effective Access Simulator</h2>
                    <p className="text-xs text-zinc-500 mt-1">
                      Evaluate server-side inheritance for this role, test a real Workforce member, or preview live field masking on a sample record.
                    </p>
                  </div>
                  <Button variant="primary" onClick={handleRunSimulation} disabled={simLoading || isNew}>
                    <Play size={14} className="mr-1.5" />
                    {simLoading ? 'Simulating...' : 'Simulate This Role'}
                  </Button>
                </div>

                {/* Test As Real Workforce Member */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Test As Workforce Member (All Combined Roles)</div>
                  <div className="flex items-center gap-2">
                    <select
                      value={simMemberId}
                      onChange={(e) => setSimMemberId(e.target.value)}
                      className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-xs outline-none"
                    >
                      <option value="">Choose a Workforce member...</option>
                      {allMembers.map((m: any) => (
                        <option key={m.id} value={m.id}>
                          {`${m.firstName || ''} ${m.familyName || ''}`.trim() || m.email}
                        </option>
                      ))}
                    </select>
                    <Button variant="secondary" onClick={handleSimulateMember} disabled={!simMemberId || simLoading}>
                      Simulate Member
                    </Button>
                  </div>

                  {memberSimResult && (
                    <div className="rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 space-y-2 text-xs">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">
                        {memberSimResult.memberName} — Assigned Roles:{' '}
                        {(memberSimResult.assignedRoles || []).map((r: any) => r.name).join(', ') || 'None'}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        Effective Capabilities: {memberSimResult.effectivePolicies?.capabilities?.length || 0} ·
                        Governed Modules: {Object.keys(memberSimResult.effectivePolicies?.modulePolicies || {}).length} ·
                        Approval Authority: {memberSimResult.effectivePolicies?.workflowPolicies?.canApprove ? 'Yes' : 'No'}
                        {memberSimResult.effectivePolicies?.workflowPolicies?.maxApprovalAmount != null
                          ? ` (Limit: $${memberSimResult.effectivePolicies.workflowPolicies.maxApprovalAmount.toLocaleString()})`
                          : ''}
                      </div>
                    </div>
                  )}
                </div>

                {/* Live Sample Record Masking Preview */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Sample Record Field-Security Preview</div>
                    <select
                      value={simSampleModuleId}
                      onChange={(e) => setSimSampleModuleId(e.target.value)}
                      className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-1.5 text-xs outline-none"
                    >
                      <option value="">Select a module to preview...</option>
                      {dataModules.map((m: any) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {sampleRecordPreview && (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                      {sampleRecordPreview.map((row) => (
                        <div key={row.id} className="flex items-center justify-between px-3.5 py-2 text-xs bg-zinc-50/50 dark:bg-zinc-950/50">
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300">{row.label}</span>
                          <div className="flex items-center gap-2">
                            <span className={`font-mono text-[11px] ${row.vis === 'hidden' ? 'text-red-500 italic' : row.vis === 'masked' ? 'text-amber-600 font-bold' : 'text-zinc-600 dark:text-zinc-400'}`}>
                              {row.rendered}
                            </span>
                            <Badge variant={row.vis === 'hidden' ? 'red' : row.vis === 'masked' ? 'amber' : row.vis === 'readonly' ? 'blue' : 'zinc'}>
                              {row.vis.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {isNew && (
                  <div className="flex items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-300">
                    <AlertTriangle size={16} />
                    Save this role first to run the server-side inheritance simulation.
                  </div>
                )}

                {simResult && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                        Resolved Inheritance Chain
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                        {simResult.inheritanceChain.map((n, i) => (
                          <React.Fragment key={n.id}>
                            <span className="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-zinc-900 dark:text-zinc-100">
                              {n.name}
                            </span>
                            {i < simResult.inheritanceChain.length - 1 && <span className="text-zinc-400">→</span>}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                        Effective Capabilities ({simResult.effectiveCapabilities.length})
                      </div>
                      {simResult.effectiveCapabilities.length === 0 ? (
                        <div className="text-xs text-zinc-400 italic">No platform capabilities granted.</div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {simResult.effectiveCapabilities.map((c) => (
                            <span
                              key={c.key}
                              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${
                                c.inherited
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                                  : 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300'
                              }`}
                            >
                              {c.key}
                              <span className="text-[9px] opacity-75">({c.sourceRoleName})</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                        Effective Module Policies ({Object.keys(simResult.effectiveModulePolicies).length})
                      </div>
                      {Object.keys(simResult.effectiveModulePolicies).length === 0 ? (
                        <div className="text-xs text-zinc-400 italic">No explicit module overrides configured.</div>
                      ) : (
                        <div className="space-y-2">
                          {Object.entries(simResult.effectiveModulePolicies).map(([modId, pol]) => {
                            const modName = (modules || []).find((m: any) => m.id === modId)?.name || modId;
                            return (
                              <div
                                key={modId}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 px-3.5 py-2.5 text-xs"
                              >
                                <div className="font-bold text-zinc-900 dark:text-zinc-100">
                                  {modName}{' '}
                                  <span className="text-[10px] font-normal text-zinc-400">from {pol.sourceRoleName}</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                                  {pol.read && <Badge variant="blue">READ</Badge>}
                                  {pol.create && <Badge variant="green">CREATE</Badge>}
                                  {pol.update && <Badge variant="purple">EDIT</Badge>}
                                  {pol.delete && <Badge variant="zinc">DELETE</Badge>}
                                  <Badge variant="zinc">SCOPE: {pol.rowScope}</Badge>
                                  {Object.keys(pol.fields || {}).length > 0 && (
                                    <Badge variant="zinc">{Object.keys(pol.fields || {}).length} FIELD RULES</Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
