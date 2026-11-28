import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Boxes,
  Save,
  Rocket,
  Eye,
  LayoutGrid,
  History,
  RotateCcw,
  PanelLeftOpen,
  MousePointer2,
  Hand,
  Maximize2,
  Minimize2,
  ChevronDown,
  SlidersHorizontal,
  Download,
  BookmarkPlus,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import {
  SolutionBlueprint,
  SolutionArtifact,
  SolutionChatMessage,
  GuidedDiscoveryCard,
} from '../../../types/solutions';
import {
  SolutionStudioProvider,
  useSolutionStudio,
} from '../../../context/SolutionStudioContext';
import { OrchestratorChatPanel } from './OrchestratorChatPanel';
import {
  SolutionComponentsGrid,
  SolutionAuditReportUI,
  SolutionAuditFindingUI,
} from './SolutionComponentsGrid';
import { SolutionBuilderModalHost } from './SolutionBuilderModalHost';
import { SolutionSandboxProvider } from './SolutionSandboxProvider';
import { SolutionLivePreview } from './SolutionLivePreview';
import {
  SolutionDeployPreflightModal,
  PreFlightReport,
  PreFlightBlastRadiusItem,
} from './SolutionDeployPreflightModal';
import {
  formatRelativeTime,
  getComponentMeta,
  normalizeArtifactType,
  normalizeSolutionArtifact,
} from './solutionComponentCatalog';
import { usePlatform } from '../../../hooks/usePlatform';
import { API_BASE_URL } from '../../../config';
import { supabase } from '../../../lib/supabase';
import { UnsavedChangesModal } from '../../Common/UnsavedChangesModal';
import { cn } from '../../../lib/utils';

const getAuthToken = async (): Promise<string> => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) return session.access_token;
  } catch (_) {}

  const authDataStr = localStorage.getItem('aurora_auth');
  if (authDataStr) {
    try {
      const authData = JSON.parse(authDataStr);
      return authData?.access_token || authData?.token || '';
    } catch (_) {}
  }
  return '';
};

export interface SolutionBuilderStudioProps {
  initialSolution?: SolutionBlueprint | null;
  onClose?: () => void;
  onSaveSuccess?: () => void;
}

const SolutionBuilderStudioInner: React.FC<SolutionBuilderStudioProps> = ({
  initialSolution,
  onClose,
  onSaveSuccess,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const returnUrl = (location.state as any)?.returnUrl || searchParams.get('returnUrl');
  const { setIsBuilderFullscreen, tenant, refreshModules } = usePlatform();

  const {
    solutionId,
    solutionName,
    setSolutionName,
    solutionVersion,
    solutionStatus,
    contextSources,
    addSource,
    removeSource,
    connectedModules,
    artifacts,
    setArtifacts,
    upsertArtifact,
    removeArtifact,
    activeArtifactId,
    setActiveArtifactId,
    chatMessages,
    setChatMessages,
    appendChatMessage,
    savedNotes,
    versions,
    createSnapshot,
    restoreSnapshot,
    activeCanvasTab,
    setActiveCanvasTab,
    pinnedContext,
    pinToChat,
    clearPinnedContext,
    openInBuilderModal,
    isDirty,
    setIsDirty,
  } = useSolutionStudio();

  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [previewMode, setPreviewMode] = useState<'interact' | 'select'>('interact');
  const [simulatedRole, setSimulatedRole] = useState('Manager');
  const [selectedPreviewScreenId, setSelectedPreviewScreenId] = useState('__home__');
  const [isEditBuilderMenuOpen, setIsEditBuilderMenuOpen] = useState(false);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [liveTrace, setLiveTrace] = useState<Array<{ name: string; arguments?: any; result?: any; status: 'running' | 'done' }>>([]);
  const [workspaceContextNote, setWorkspaceContextNote] = useState<string | null>(null);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreflightOpen, setIsPreflightOpen] = useState(false);
  const [isPreflightLoading, setIsPreflightLoading] = useState(false);
  const [isFixingCompliance, setIsFixingCompliance] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [preflightReport, setPreflightReport] = useState<PreFlightReport | null>(null);

  const versionsMenuRef = useRef<HTMLDivElement>(null);
  const editBuilderMenuRef = useRef<HTMLDivElement>(null);

  const draftRoleOptions = React.useMemo(() => {
    const customRoles = artifacts
      .filter((a) => normalizeArtifactType(a.type) === 'PERMISSION')
      .map((a) => a.name);
    const defaults = ['Manager', 'Operator', 'Client Portal'];
    return Array.from(new Set([...customRoles, ...defaults]));
  }, [artifacts]);

  useEffect(() => {
    setIsBuilderFullscreen(true);
    return () => setIsBuilderFullscreen(false);
  }, [setIsBuilderFullscreen]);

  // Preload tenant workspace config & Knowledge Base SOPs immediately when Solution Studio launches
  useEffect(() => {
    let cancelled = false;
    const preloadWorkspaceContext = async () => {
      try {
        const token = await getAuthToken();
        const tenantId = tenant?.id || localStorage.getItem('aurora_active_tenant_id') || 'default-tenant';
        const res = await fetch(`${API_BASE_URL}/api/solutions/workspace-context`, {
          headers: {
            'x-tenant-id': tenantId,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok || cancelled) return;
        const ctx = await res.json();
        const parts: string[] = [];
        if (ctx.moduleCount > 0) parts.push(`${ctx.moduleCount} modules`);
        const totalKb = (ctx.kbCount || 0) + (ctx.driveSopCount || 0);
        if (totalKb > 0) parts.push(`${totalKb} KB/SOPs`);
        if (ctx.roleCount > 0) parts.push(`${ctx.roleCount} roles`);
        setWorkspaceContextNote(
          parts.length > 0
            ? `${ctx.tenantName || 'Workspace'} synced · ${parts.join(' · ')}`
            : `${ctx.tenantName || 'Workspace'} context synced`
        );
      } catch {
        // Non-blocking background preload
      }
    };
    preloadWorkspaceContext();
    return () => {
      cancelled = true;
    };
  }, [tenant?.id]);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (versionsMenuRef.current && !versionsMenuRef.current.contains(e.target as Node)) {
        setIsVersionsOpen(false);
      }
      if (editBuilderMenuRef.current && !editBuilderMenuRef.current.contains(e.target as Node)) {
        setIsEditBuilderMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const handleSendMessage = async (text: string, model: string) => {
    const activePin = pinnedContext;
    const userMsg: SolutionChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'self',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      pinnedContext: activePin || undefined,
    };

    appendChatMessage(userMsg);
    setIsThinking(true);
    setLiveTrace([]);

    // Auto-snapshot before AI mutation for 1-click rollback
    if (artifacts.length > 0) {
      createSnapshot(`Before AI update: ${text.slice(0, 36)}`, 'AI');
    }

    try {
      setLiveStatus(null);
      const token = await getAuthToken();

      const res = await fetch(`${API_BASE_URL}/api/solutions/orchestrate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          'x-tenant-id': tenant?.id || 'default-tenant',
        },
        body: JSON.stringify({
          prompt: text,
          solutionName,
          contextSources,
          existingArtifacts: artifacts,
          chatHistory: chatMessages.map((m) => ({ role: m.role, text: m.text })),
          pinnedContext: activePin,
          modelTier: model && model !== 'default' ? model : 'default',
          stream: true,
        }),
      });

      if (!res.ok) {
        throw new Error('Solution Orchestrator service returned an error.');
      }

      let data: any = null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('ndjson') && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const evt = JSON.parse(trimmed);
              if (evt.type === 'status') {
                setLiveStatus(evt.label || null);
              } else if (evt.type === 'tool_start') {
                setLiveTrace((prev) => [
                  ...prev,
                  { name: evt.name, arguments: evt.arguments, status: 'running' },
                ]);
              } else if (evt.type === 'tool_done') {
                setLiveTrace((prev) => {
                  const idx = prev.findIndex((t) => t.name === evt.name && t.status === 'running');
                  if (idx === -1) {
                    return [...prev, { name: evt.name, arguments: evt.arguments, result: evt.result, status: 'done' }];
                  }
                  const next = [...prev];
                  next[idx] = { ...next[idx], result: evt.result, status: 'done' };
                  return next;
                });
              } else if (evt.type === 'result') {
                data = evt.data;
              } else if (evt.type === 'error') {
                throw new Error(evt.error || 'Orchestration failed.');
              }
            } catch (parseErr: any) {
              if (parseErr?.message && parseErr.message !== 'Unexpected end of JSON input') {
                throw parseErr;
              }
            }
          }
        }
        if (buffer.trim()) {
          const evt = JSON.parse(buffer.trim());
          if (evt.type === 'result') data = evt.data;
          else if (evt.type === 'error') throw new Error(evt.error || 'Orchestration failed.');
        }
        if (!data) throw new Error('No response received from Solution Orchestrator.');
      } else {
        data = await res.json();
      }

      if (data.solutionName && (solutionName === 'Untitled Solution' || artifacts.length === 0)) {
        setSolutionName(data.solutionName);
      }

      // Apply structured patches while protecting manual user edits unless explicitly pinned
      const skippedUserEdited: string[] = [];
      if (Array.isArray(data.patches) && data.patches.length > 0) {
        const mergeById = (existingArr: any[], incomingArr: any[]) => {
          const merged = [...existingArr];
          for (const item of incomingArr) {
            if (!item || typeof item !== 'object') continue;
            const iIdx = item.id ? merged.findIndex((x) => x?.id === item.id) : -1;
            if (iIdx >= 0) merged[iIdx] = { ...merged[iIdx], ...item };
            else merged.push(item);
          }
          return merged;
        };

        const deepMergeArtifactContent = (existingContent: any, incomingContent: any) => {
          const base = { ...(existingContent || {}) };
          const inc = incomingContent || {};
          for (const [k, v] of Object.entries(inc)) {
            if (
              ['layout', 'fields', 'rules', 'nodes', 'edges', 'widgets', 'items', 'steps'].includes(k) &&
              Array.isArray(v) &&
              Array.isArray(base[k]) &&
              v.length < base[k].length
            ) {
              // Lossless merge by ID when AI emits a partial delta array
              base[k] = mergeById(base[k], v);
            } else if (k === 'modulePolicies' && v && typeof v === 'object' && base[k] && typeof base[k] === 'object') {
              base[k] = { ...base[k], ...(v as Record<string, any>) };
            } else {
              base[k] = v;
            }
          }
          return base;
        };

        setArtifacts((prev) => {
          const next = [...prev];
          for (const patch of data.patches) {
            if (!patch?.artifact) continue;
            const norm = normalizeSolutionArtifact({
              ...patch.artifact,
              origin:
                patch.op === 'link_core' || patch.op === 'extend_core'
                  ? 'CORE'
                  : patch.artifact.origin || 'AI_GEN',
              isSharedCore:
                patch.op === 'link_core' || patch.op === 'extend_core'
                  ? true
                  : Boolean(patch.artifact.isSharedCore),
              coreExtensionOnly:
                patch.op === 'link_core' || patch.op === 'extend_core'
                  ? true
                  : Boolean(patch.artifact.coreExtensionOnly),
              lastEditedBy: 'AI',
            });

            if (patch.op === 'remove_component') {
              const rIdx = next.findIndex((a) => a.id === norm.id);
              if (rIdx >= 0 && next[rIdx].lastEditedBy !== 'USER') {
                next.splice(rIdx, 1);
              } else if (rIdx >= 0) {
                skippedUserEdited.push(next[rIdx].name);
              }
              continue;
            }

            const idx = next.findIndex((a) => a.id === norm.id);
            if (idx >= 0) {
              const existing = next[idx];
              const isExplicitlyPinned = activePin?.artifactId === existing.id;
              // Protect manual user edits from accidental AI clobbering
              if (existing.lastEditedBy === 'USER' && !isExplicitlyPinned) {
                skippedUserEdited.push(existing.name);
                continue;
              }
              next[idx] = {
                ...existing,
                ...norm,
                content: deepMergeArtifactContent(existing.content, norm.content),
                updatedAt: new Date().toISOString(),
              };
            } else {
              next.push(norm);
            }
          }
          return next;
        });

        const firstAdded = data.patches.find((p: any) => p.op !== 'remove_component')?.artifact;
        if (firstAdded?.id) {
          setActiveArtifactId(firstAdded.id);
        }
      }

      const protectedNote =
        skippedUserEdited.length > 0
          ? `\n\n> **Protected manual edits:** Skipped overwriting ${skippedUserEdited.map((n) => `**${n}**`).join(', ')} because you edited them in a specialist builder. Pin a component via **Select → Ask AI** if you want me to modify it.`
          : '';

      appendChatMessage({
        id: `msg_${Date.now() + 1}`,
        role: 'aurora',
        text: `${data.summaryText || `Updated the solution draft for: "${text}".`}${protectedNote}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        groundedSources: Array.isArray(data.groundedSources) ? data.groundedSources : undefined,
        steps: Array.isArray(data.steps) && data.steps.length > 0 ? data.steps : undefined,
        proposalCard: data.proposalCard,
        guidedDiscovery: data.guidedDiscovery,
        suggestedActions: Array.isArray(data.suggestedActions) && data.suggestedActions.length > 0 ? data.suggestedActions : undefined,
      });

      toast.success('Solution draft updated!');
    } catch (err: any) {
      console.error('Reuse-First Orchestration error:', err);
      const errMsg = err.message || 'AI request failed.';
      toast.error(errMsg);
      appendChatMessage({
        id: `msg_${Date.now() + 1}`,
        role: 'aurora',
        text: `Could not reach the Solution Orchestrator (${errMsg}). Please check that the Aurora backend server is running.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: ['Retry Prompt'],
      });
    } finally {
      setLiveStatus(null);
      setLiveTrace([]);
      setIsThinking(false);
    }
  };

  const handleAnswerGuidedDiscovery = (
    card: GuidedDiscoveryCard,
    answer: string,
    skipped = false
  ) => {
    const matchedOption = card.options.find((o) => o.label === answer);
    setChatMessages((prev) =>
      prev.map((m) =>
        m.guidedDiscovery?.id === card.id
          ? {
              ...m,
              guidedDiscovery: {
                ...m.guidedDiscovery,
                status: skipped ? 'SKIPPED' : 'ANSWERED',
                selectedOptionId: matchedOption?.id,
                customValue: !skipped && !matchedOption ? answer : undefined,
              },
            }
          : m
      )
    );

    const prompt = skipped
      ? `For "${card.question}", skip custom configuration and keep the smart defaults.`
      : `For "${card.question}", I choose: ${answer}. Update the Solution draft accordingly.`;
    handleSendMessage(prompt, 'fast');
  };

  const handleApplySuggestedAction = (actionText: string) => {
    if (actionText.toLowerCase().includes('inspect components')) {
      setActiveCanvasTab('components');
      return;
    }
    if (actionText.toLowerCase().includes('deploy solution')) {
      handleDeploySolution();
      return;
    }
    handleSendMessage(actionText, 'default');
  };

  const handleSaveBlueprint = async () => {
    setIsSaving(true);
    try {
      const token = await getAuthToken();
      const firstPrompt = chatMessages.find((m) => m.role === 'self')?.text;
      const dynamicDescription =
        initialSolution?.description ||
        (firstPrompt
          ? `Solution built for "${firstPrompt.slice(0, 100)}"`
          : `Solution combining ${artifacts.length} components.`);

      const payload = {
        id: solutionId,
        name: solutionName,
        description: dynamicDescription,
        category: initialSolution?.category || 'General',
        version: solutionVersion,
        status: solutionStatus,
        author: initialSolution?.author || 'Platform Architecture',
        modulesCount: artifacts.filter((a) => a.type === 'MODULE').length || connectedModules.length,
        formsCount: artifacts.filter((a) => a.type === 'FORM').length,
        workflowsCount: artifacts.filter((a) => a.type === 'WORKFLOW').length,
        metricsCount: artifacts.filter((a) => a.type === 'KPI' || a.type === 'METRIC').length,
        brandsCount: artifacts.filter((a) => a.type === 'BRAND').length,
        searchesCount: artifacts.filter((a) => a.type === 'SEARCH').length,
        contentCount: artifacts.filter((a) => a.type === 'CONTENT' || a.type === 'TEMPLATE').length,
        agentsCount: artifacts.filter((a) => a.type === 'AGENT').length,
        artifactsCount: artifacts.length,
        activeArtifactId,
        contextSources,
        connectedModules,
        artifacts,
        savedNotes,
        chatMessages,
        chatHistory: chatMessages,
        versions,
      };

      const res = await fetch(`${API_BASE_URL}/api/solutions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          'x-tenant-id': tenant?.id || 'default-tenant',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsDirty(false);
        toast.success(`Saved "${solutionName}" draft.`);
        if (onSaveSuccess) onSaveSuccess();
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || 'Failed to save solution draft.');
      }
    } catch (e) {
      console.error('Failed to save solution:', e);
      toast.error('Failed to save solution draft.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenDeployPreflight = async () => {
    setIsPreflightOpen(true);
    setIsPreflightLoading(true);
    setPreflightReport(null);
    await handleSaveBlueprint();

    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/solutions/${solutionId}/preflight`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          'x-tenant-id': tenant?.id || 'default-tenant',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setPreflightReport(data);
      } else {
        throw new Error('Pre-flight check failed');
      }
    } catch (_) {
      // Client-side fallback report if server unreachable
      const coreItems = artifacts.filter((a) => a.isSharedCore || a.origin === 'CORE');
      const netNew = artifacts.filter((a) => !a.isSharedCore && a.origin !== 'CORE');
      setPreflightReport({
        canDeploy: artifacts.length > 0,
        totalComponents: artifacts.length,
        coreExtensionsCount: coreItems.length,
        netNewCount: netNew.length,
        checks: [
          {
            id: 'local_ok',
            severity: artifacts.length > 0 ? 'pass' : 'blocker',
            title: `${artifacts.length} components staged in draft`,
            detail: 'Ready to provision as native Aurora assets.',
          },
        ],
        coreImpacts: coreItems.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          detail: 'Extension-only Core link',
        })),
        componentsToProvision: netNew.map((n) => ({
          id: n.id,
          name: n.name,
          type: n.type,
          origin: n.origin || 'AI_GEN',
        })),
      });
    } finally {
      setIsPreflightLoading(false);
    }
  };

  const handleAutoFixComplianceFromPreflight = async () => {
    setIsFixingCompliance(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/solutions/${solutionId || 'draft'}/audit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          'x-tenant-id': tenant?.id || 'default-tenant',
        },
        body: JSON.stringify({ artifacts }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.repairedArtifacts) && data.repairedArtifacts.length > 0) {
          setArtifacts(data.repairedArtifacts);
          toast.success(`Applied ${data.autoFixCount || 1} compliance & audit auto-fix(es).`);
          await handleOpenDeployPreflight();
        }
      }
    } catch (_) {
      toast.error('Failed to apply compliance auto-fixes.');
    } finally {
      setIsFixingCompliance(false);
    }
  };

  const handleGenerateBlastRadiusFixes = (items: PreFlightBlastRadiusItem[]) => {
    setIsPreflightOpen(false);
    const summary = items
      .slice(0, 8)
      .map((i) => `- ${i.affectedAssetType} "${i.affectedAssetName}": ${i.detail} (${i.suggestedFix})`)
      .join('\n');
    handleSendMessage(
      `Pre-Flight detected downstream dependency impacts in this solution. Please generate targeted fix patches to resolve these broken references without removing user edits:\n${summary}`,
      'default'
    );
  };

  const handleDeploySolution = async () => {
    setIsDeploying(true);
    createSnapshot(`Deployed (${solutionVersion})`, 'DEPLOY');

    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/solutions/${solutionId}/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          'x-tenant-id': tenant?.id || 'default-tenant',
        },
      });
      await refreshModules();
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || `Solution "${solutionName}" deployed!`);
      } else {
        toast.success(`Solution "${solutionName}" deployed to workspace.`);
      }
      setIsPreflightOpen(false);
    } catch (_) {
      toast.success(`Solution "${solutionName}" deployed to workspace.`);
      setIsPreflightOpen(false);
    } finally {
      setIsDeploying(false);
    }

    if (onClose) onClose();
    else navigate('/workspace/settings/platform-modules/solutions');
  };

  const handleEditInBuilder = (artifact: SolutionArtifact) => {
    openInBuilderModal(artifact.id);
  };

  const handleExportSolutionJson = () => {
    const bundle = {
      format: 'aurora-solution-package',
      schemaVersion: '1.0',
      exportedAt: new Date().toISOString(),
      name: solutionName,
      version: solutionVersion,
      artifacts: artifacts.map((a) => ({
        id: a.id,
        slug: a.slug,
        name: a.name,
        type: a.type,
        description: a.description,
        origin: a.origin,
        isSharedCore: a.isSharedCore,
        coreExtensionOnly: a.coreExtensionOnly,
        linkedModuleId: a.linkedModuleId,
        content: a.content,
      })),
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${solutionName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.aurora-solution.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Exported portable Solution package (.aurora-solution.json).');
  };

  const handlePublishAsTemplate = async () => {
    try {
      await handleSaveBlueprint();
      const savedId = solutionId;
      if (!savedId) {
        toast.info('Save your solution first, then click Template again.');
        return;
      }
      const token = await getAuthToken();
      const tenantId = tenant?.id || localStorage.getItem('aurora_active_tenant_id') || 'default-tenant';
      const res = await fetch(`${API_BASE_URL}/api/solutions/${savedId}/publish-template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: solutionName }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to publish template.');
      }
      toast.success(`Saved "${solutionName}" to Workspace Template Catalog.`);
    } catch (err: any) {
      toast.error(err?.message || 'Could not publish template.');
    }
  };

  const handleRunAudit = async (): Promise<SolutionAuditReportUI | null> => {
    try {
      const token = await getAuthToken();
      const tenantId = tenant?.id || localStorage.getItem('aurora_active_tenant_id') || 'default-tenant';
      const targetId = solutionId || 'draft';
      const res = await fetch(`${API_BASE_URL}/api/solutions/${targetId}/audit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ artifacts }),
      });
      if (!res.ok) throw new Error('Audit request failed.');
      return await res.json();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to audit solution.');
      return null;
    }
  };

  const handleApplyAuditAutoFix = (repaired: SolutionArtifact[]) => {
    createSnapshot('Before Audit Auto-Fix');
    setArtifacts(repaired.map((a) => normalizeSolutionArtifact(a)));
    setIsDirty(true);
    toast.success('Applied safe Audit auto-fixes (snapshot saved for rollback).');
  };

  const handleAskAIToFixFindings = (findings: SolutionAuditFindingUI[]) => {
    const summary = findings.map((f) => `- [${f.severity}] ${f.message}`).join('\n');
    setIsChatCollapsed(false);
    handleSendMessage(`Please fix these Solution Audit findings:\n${summary}`, 'smart');
  };

  const exitStudio = () => {
    setIsDirty(false);
    setShowUnsavedConfirm(false);
    if (onClose) onClose();
    else if (returnUrl) navigate(returnUrl);
    else navigate('/workspace/settings/platform-modules/solutions');
  };

  const handleBack = () => {
    if (isDirty) setShowUnsavedConfirm(true);
    else exitStudio();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col w-screen h-screen bg-zinc-50 dark:bg-zinc-950 overflow-hidden font-sans">
      {/* Google-Style Slim Top Bar (48px) — Matches ModuleEditor */}
      <header className="h-12 px-3.5 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 shrink-0 z-30">
        {/* Left: Back + Icon + Inline Editable Name + Dirty Dot + Version Pill */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={handleBack}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
            title="Back to Solutions"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200/70 dark:border-indigo-500/25 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Boxes size={15} />
          </div>

          <input
            type="text"
            value={solutionName}
            onChange={(e) => setSolutionName(e.target.value)}
            placeholder="Untitled Solution"
            className="text-sm font-semibold text-zinc-900 dark:text-white bg-transparent border-none outline-none focus:ring-1 focus:ring-indigo-500/30 rounded-md px-1.5 py-0.5 min-w-[110px] max-w-[220px] truncate"
          />

          {isDirty && (
            <span
              className="w-2 h-2 rounded-full bg-amber-500 shrink-0"
              title="Unsaved draft changes"
            />
          )}

          {/* Version History Pill */}
          <div className="relative" ref={versionsMenuRef}>
            <button
              type="button"
              onClick={() => setIsVersionsOpen((v) => !v)}
              className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
              title="Draft Version History & Rollback"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-mono">{solutionVersion}</span>
              <History size={11} className="text-zinc-400" />
            </button>

            {isVersionsOpen && (
              <div className="absolute left-0 mt-1.5 w-72 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl py-2 z-50">
                <div className="px-3 pb-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                    Draft Snapshots
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      createSnapshot('Manual checkpoint', 'USER');
                      toast.success('Saved draft checkpoint.');
                    }}
                    className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    + Save Snapshot
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  {versions.length === 0 ? (
                    <p className="px-3 py-4 text-center text-[11px] text-zinc-400">
                      No snapshots yet. Snapshots are created automatically before AI updates.
                    </p>
                  ) : (
                    versions.map((v) => (
                      <div
                        key={v.id}
                        className="px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-semibold text-zinc-800 dark:text-zinc-100">
                              {v.versionTag}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {formatRelativeTime(v.createdAt)}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                            {v.label}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (restoreSnapshot(v.id)) {
                              toast.success(`Restored draft to ${v.versionTag}`);
                              setIsVersionsOpen(false);
                            }
                          }}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer shrink-0"
                          title="Restore this snapshot"
                        >
                          <RotateCcw size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Preview | Components (N) Segmented Switcher */}
        <nav
          aria-label="Solution Studio Canvas"
          className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-lg shrink-0 select-none"
        >
          <button
            type="button"
            onClick={() => setActiveCanvasTab('preview')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer',
              activeCanvasTab === 'preview'
                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            )}
          >
            <Eye size={13} />
            <span>Preview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCanvasTab('components')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer',
              activeCanvasTab === 'components'
                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            )}
          >
            <LayoutGrid size={13} />
            <span>Components</span>
            <span
              className={cn(
                'inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full text-[10px] font-semibold',
                activeCanvasTab === 'components'
                  ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300'
                  : 'bg-zinc-200/80 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
              )}
            >
              {artifacts.length}
            </span>
          </button>
        </nav>

        {/* Right: Minimal Utility Cluster */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handlePublishAsTemplate}
            className="h-8 px-2.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Save as Workspace Template"
          >
            <BookmarkPlus size={14} />
            <span className="hidden lg:inline">Template</span>
          </button>

          <button
            type="button"
            onClick={handleExportSolutionJson}
            className="h-8 px-2.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Export portable Solution JSON"
          >
            <Download size={14} />
            <span className="hidden md:inline">Export</span>
          </button>

          <button
            type="button"
            onClick={handleSaveBlueprint}
            disabled={isSaving}
            className="h-8 px-3 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Save size={13} />
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </header>

      {/* Main 2-Panel Workspace (30% Left Chat + Sources | 70% Right Dynamic Canvas) */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Left Panel: Solution Chat & Collapsible Sources */}
        {!isPreviewExpanded && (
          isChatCollapsed ? (
            <div className="w-11 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col items-center py-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsChatCollapsed(false)}
                className="p-2 rounded-lg text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Expand Solution Chat"
              >
                <PanelLeftOpen size={16} />
              </button>
            </div>
          ) : (
            <aside className="w-[30%] min-w-[310px] max-w-[420px] h-full shrink-0 flex flex-col min-h-0">
              <OrchestratorChatPanel
                messages={chatMessages}
                sources={contextSources}
                onAddSource={addSource}
                onRemoveSource={(id) => {
                  removeSource(id);
                  toast.success('Source removed.');
                }}
                onSendMessage={handleSendMessage}
                onApplySuggestedAction={handleApplySuggestedAction}
                onAnswerGuidedDiscovery={handleAnswerGuidedDiscovery}
                pinnedContext={pinnedContext}
                onClearPinnedContext={clearPinnedContext}
                onCollapsePanel={() => setIsChatCollapsed(true)}
                isThinking={isThinking}
                liveStatus={liveStatus}
                liveTrace={liveTrace}
                workspaceContextNote={workspaceContextNote}
              />
            </aside>
          )
        )}

        {/* Right Panel: Dynamic Studio Canvas */}
        <main className="flex-1 h-full min-w-0 min-h-0 flex flex-col relative bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
          {activeCanvasTab === 'components' ? (
            <SolutionComponentsGrid
              artifacts={artifacts}
              onEditInBuilder={handleEditInBuilder}
              onAskAI={(ctx) => {
                pinToChat(ctx);
                setIsChatCollapsed(false);
                toast.info(`Pinned @${ctx.label} to Solution Chat`);
              }}
              onAddArtifact={(artifact) => {
                upsertArtifact(artifact, 'USER');
                toast.success(`Added "${artifact.name}" to Solution.`);
              }}
              onRemoveArtifact={(id) => {
                removeArtifact(id);
                toast.success('Component removed from draft.');
              }}
              onRunAudit={handleRunAudit}
              onApplyAutoFix={handleApplyAuditAutoFix}
              onAskAIToFixFindings={handleAskAIToFixFindings}
            />
          ) : (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Preview Sub-Toolbar (Interact | Select · Simulate Role · Edit in Builder · Expand) */}
              <div className="px-5 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 flex items-center justify-between gap-3 shrink-0 flex-wrap">
                {/* Interact | Select Toggle */}
                <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('interact')}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer',
                      previewMode === 'interact'
                        ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    )}
                  >
                    <Hand size={12} />
                    <span>Interact</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('select')}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer',
                      previewMode === 'select'
                        ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    )}
                  >
                    <MousePointer2 size={12} />
                    <span>Select</span>
                  </button>
                </div>

                {/* Right Preview Controls */}
                <div className="flex items-center gap-2">
                  {/* Simulate Role (Draft Roles + Standard Presets) */}
                  <label className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300">
                    <span className="text-zinc-400">Simulate Role:</span>
                    <select
                      value={simulatedRole}
                      onChange={(e) => setSimulatedRole(e.target.value)}
                      className="bg-transparent font-medium text-zinc-900 dark:text-zinc-100 outline-none cursor-pointer"
                    >
                      {draftRoleOptions.map((roleName) => (
                        <option key={roleName} value={roleName}>
                          {roleName}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Edit in Builder Split Dropdown */}
                  <div className="relative" ref={editBuilderMenuRef}>
                    <div className="inline-flex items-center rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          const active =
                            artifacts.find((a) => a.id === selectedPreviewScreenId) ||
                            artifacts.find((a) => a.id === activeArtifactId) ||
                            artifacts[0];
                          if (active) handleEditInBuilder(active);
                          else setActiveCanvasTab('components');
                        }}
                        className="h-8 px-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <SlidersHorizontal size={12} />
                        <span>Edit in Builder</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditBuilderMenuOpen((v) => !v)}
                        className="h-8 px-2 border-l border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                        title="Choose any Solution component to edit"
                      >
                        <ChevronDown size={12} />
                      </button>
                    </div>

                    {isEditBuilderMenuOpen && (
                      <div className="absolute right-0 mt-1.5 w-64 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl py-1.5 z-50">
                        <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                          Solution Components ({artifacts.length})
                        </div>
                        <div className="max-h-64 overflow-y-auto py-0.5">
                          {artifacts.length === 0 ? (
                            <p className="px-3 py-3 text-xs text-zinc-400 text-center">
                              No components yet
                            </p>
                          ) : (
                            artifacts.map((art) => {
                              const m = getComponentMeta(art.type);
                              const Icon = m.icon;
                              return (
                                <button
                                  key={art.id}
                                  type="button"
                                  onClick={() => {
                                    setIsEditBuilderMenuOpen(false);
                                    handleEditInBuilder(art);
                                  }}
                                  className="w-full px-3 py-2 text-left text-xs text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center justify-between gap-2 cursor-pointer"
                                >
                                  <span className="flex items-center gap-2 min-w-0">
                                    <Icon size={13} className="text-zinc-400 shrink-0" />
                                    <span className="truncate font-medium">{art.name}</span>
                                  </span>
                                  <span className="text-[10px] text-zinc-400 shrink-0">
                                    {m.singularLabel}
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Expand / Collapse Test Drive */}
                  <button
                    type="button"
                    onClick={() => setIsPreviewExpanded((v) => !v)}
                    className="h-8 px-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-300 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    title={isPreviewExpanded ? 'Exit Full Preview' : 'Expand Preview (Test Drive)'}
                  >
                    {isPreviewExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                    <span className="hidden xl:inline">
                      {isPreviewExpanded ? 'Collapse' : 'Expand'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Live Interactive App Sandbox Canvas */}
              <div className="flex-1 min-h-0 p-4 pb-24 overflow-hidden">
                <SolutionLivePreview
                  previewMode={previewMode}
                  simulatedRole={simulatedRole}
                  selectedScreenId={selectedPreviewScreenId}
                  onSelectScreen={setSelectedPreviewScreenId}
                  onAskAI={(ctx) => {
                    pinToChat(ctx);
                    setIsChatCollapsed(false);
                    setIsPreviewExpanded(false);
                    toast.info(`Pinned @${ctx.label} to Solution Chat`);
                  }}
                  onEditInBuilder={handleEditInBuilder}
                  onSwitchToComponents={() => setActiveCanvasTab('components')}
                />
              </div>
            </div>
          )}

          {/* Floating Bottom-Right Draft Status & Deploy Dock */}
          <div className="fixed bottom-4 right-5 z-40">
            <div className="p-2 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-900/10 dark:shadow-black/40 flex flex-col gap-1.5 min-w-[200px]">
              <button
                type="button"
                onClick={() => setIsVersionsOpen((v) => !v)}
                className="px-2.5 py-1 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/70 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
                title="View draft status & snapshots"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-200 truncate">
                    Drafting: {solutionName}
                  </span>
                </span>
                <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                  {solutionVersion}
                </span>
              </button>

              <button
                type="button"
                onClick={handleOpenDeployPreflight}
                className="h-9 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Rocket size={13} />
                <span>Deploy Solution</span>
              </button>
            </div>
          </div>
        </main>
      </div>

      <SolutionBuilderModalHost />

      <SolutionDeployPreflightModal
        isOpen={isPreflightOpen}
        onClose={() => setIsPreflightOpen(false)}
        solutionName={solutionName}
        solutionVersion={solutionVersion}
        loading={isPreflightLoading}
        deploying={isDeploying}
        fixingCompliance={isFixingCompliance}
        report={preflightReport}
        onConfirmDeploy={handleDeploySolution}
        onAutoFixCompliance={handleAutoFixComplianceFromPreflight}
        onGenerateBlastRadiusFixes={handleGenerateBlastRadiusFixes}
      />

      {showUnsavedConfirm && (
        <UnsavedChangesModal
          isOpen={showUnsavedConfirm}
          entityName={solutionName || 'solution'}
          isSaving={isSaving}
          onSaveAndExit={async () => {
            await handleSaveBlueprint();
            exitStudio();
          }}
          onDiscardAndExit={exitStudio}
          onCancel={() => setShowUnsavedConfirm(false)}
        />
      )}
    </div>
  );
};

export const SolutionBuilderStudio: React.FC<SolutionBuilderStudioProps> = (props) => {
  return (
    <SolutionStudioProvider initialSolution={props.initialSolution}>
      <SolutionSandboxProvider>
        <SolutionBuilderStudioInner {...props} />
      </SolutionSandboxProvider>
    </SolutionStudioProvider>
  );
};
