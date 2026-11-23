import React, { useState } from 'react';
import { GitBranch, Save, Bug } from 'lucide-react';
import { Workflow, WorkflowEntity, StandaloneBuilderContext } from '../../../types/platform';
import { WorkflowGraphEditor } from '../../Builder/Workflow/GraphEditor';
import { Button } from '../../UI/Primitives';
import { API_BASE_URL } from '../../../config';
import { usePlatform } from '../../../hooks/usePlatform';
import { useAuth } from '../../../hooks/useAuth';
import { PLATFORM_MODULES } from '../../../config/platformModules';
import { toast } from 'sonner';

export interface WorkflowBuilderProps {
  initialWorkflow?: Partial<WorkflowEntity>;
  builderContext: StandaloneBuilderContext;
  onSave?: (workflow: WorkflowEntity) => void;
  onDirtyChange?: (isDirty: boolean) => void;
  fields?: any[];
}

export const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({
  initialWorkflow,
  builderContext,
  onSave,
  onDirtyChange,
  fields = []
}) => {
  const { tenant, modules } = usePlatform();
  const { session } = useAuth();
  const token = session?.access_token;
  const [name, setName] = useState(initialWorkflow?.name || 'Untitled Workflow');
  const [description, setDescription] = useState(initialWorkflow?.description || '');
  const [associatedModuleId, setAssociatedModuleId] = useState<string>(
    initialWorkflow?.moduleId ||
    builderContext.parentModuleId ||
    (builderContext.hostType === 'module' ? builderContext.hostId || '' : '')
  );
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow>({
    id: initialWorkflow?.id || `wf_${Date.now()}`,
    name: initialWorkflow?.name || 'Untitled Workflow',
    nodes: initialWorkflow?.nodes || [
      { id: 'node_start', type: 'START', name: 'Trigger Event', position: { x: 100, y: 150 } },
      { id: 'node_end', type: 'END', name: 'End Workflow', position: { x: 500, y: 150 } }
    ],
    edges: initialWorkflow?.edges || [
      { id: 'e_start_end', source: 'node_start', target: 'node_end' }
    ]
  });

  const [showDebugger, setShowDebugger] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [rightSidebarTab, setRightSidebarTab] = useState<'inspector' | 'debugger' | 'architect'>('inspector');
  const [saving, setSaving] = useState(false);
  const isInitializedRef = React.useRef(false);

  React.useEffect(() => {
    if (initialWorkflow) {
      setName(initialWorkflow.name || 'Untitled Workflow');
      setDescription(initialWorkflow.description || '');
      setAssociatedModuleId(
        initialWorkflow.moduleId ||
        builderContext.parentModuleId ||
        (builderContext.hostType === 'module' ? builderContext.hostId || '' : '')
      );
      if (initialWorkflow.nodes && initialWorkflow.edges) {
        setCurrentWorkflow({
          id: initialWorkflow.id || `wf_${Date.now()}`,
          name: initialWorkflow.name || 'Untitled Workflow',
          nodes: initialWorkflow.nodes,
          edges: initialWorkflow.edges
        });
      }
    }
    setTimeout(() => {
      isInitializedRef.current = true;
      onDirtyChange?.(false);
    }, 100);
  }, [initialWorkflow, builderContext.parentModuleId, builderContext.hostId, builderContext.hostType]);

  React.useEffect(() => {
    if (isInitializedRef.current) {
      onDirtyChange?.(true);
    }
  }, [name, description, associatedModuleId, currentWorkflow, onDirtyChange]);

  const effectiveFields = React.useMemo(() => {
    if (fields && fields.length > 0) return fields;
    if (associatedModuleId) {
      const mod = (modules || []).find(m => m.id === associatedModuleId);
      if (mod?.layout) return mod.layout;
    }
    return [];
  }, [fields, associatedModuleId, modules]);

  const handleSaveWorkflow = async () => {
    setSaving(true);
    try {
      const effectiveModuleId =
        associatedModuleId ||
        builderContext.parentModuleId ||
        (builderContext.hostType === 'module' ? builderContext.hostId : undefined) ||
        undefined;
      const isExistingPersistedId = Boolean(initialWorkflow?.id && !initialWorkflow.id.startsWith('wf_'));

      const workflowEntity: WorkflowEntity = {
        id: currentWorkflow.id,
        tenantId: tenant?.id || initialWorkflow?.tenantId || 'tenant_default',
        moduleId: effectiveModuleId,
        name,
        description,
        isGlobal: !effectiveModuleId,
        triggerType: initialWorkflow?.triggerType || 'RECORD_EVENT',
        nodes: currentWorkflow.nodes,
        edges: currentWorkflow.edges,
        version: (initialWorkflow?.version || 0) + 1,
        status: 'PUBLISHED'
      };

      const res = await fetch(`${API_BASE_URL}/api/workflows${isExistingPersistedId ? `/${initialWorkflow!.id}` : ''}`, {
        method: isExistingPersistedId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant?.id || '',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(workflowEntity)
      });

      if (res.ok) {
        const saved = await res.json();
        onDirtyChange?.(false);
        if (onSave) onSave(saved);
        if (builderContext.onSaveSuccess) builderContext.onSaveSuccess(saved.id, saved);
      } else {
        onDirtyChange?.(false);
        if (onSave) onSave(workflowEntity);
        if (builderContext.onSaveSuccess) builderContext.onSaveSuccess(workflowEntity.id, workflowEntity);
      }
    } catch (err) {
      toast.error('Failed to save workflow');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden">

      {/* Workflow Builder Header (48px, matching Module Builder) */}
      <div className="h-12 flex items-center justify-between px-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <GitBranch size={15} />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); onDirtyChange?.(true); }}
              className="text-sm font-semibold bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-indigo-500/30 rounded-md px-1.5 py-0.5 text-zinc-900 dark:text-white min-w-[140px]"
              placeholder="Untitled Workflow"
            />
            <input
              type="text"
              value={description}
              onChange={(e) => { setDescription(e.target.value); onDirtyChange?.(true); }}
              className="hidden md:block text-xs text-zinc-400 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-indigo-500/30 rounded-md px-1.5 py-0.5 w-64 truncate"
              placeholder="Add description..."
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {builderContext.mode === 'global' && (
            <select
              value={associatedModuleId}
              onChange={(e) => setAssociatedModuleId(e.target.value)}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 focus:outline-none cursor-pointer transition-colors"
              title="Associate Workflow with a Module or keep Global"
            >
              <option value="">Global (Cross-Module Flow)</option>
              <optgroup label="Custom Modules">
                {(modules || []).filter(m => (m as any).type !== 'PAGE').map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </optgroup>
              <optgroup label="Platform Modules">
                {PLATFORM_MODULES.map(pm => (
                  <option key={pm.id} value={pm.id}>{pm.name}</option>
                ))}
              </optgroup>
            </select>
          )}

          <button
            type="button"
            onClick={() => {
              setRightSidebarTab('debugger');
              setShowDebugger(true);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <Bug size={14} className="text-indigo-500" />
            <span>Test & Runs</span>
          </button>

          <Button
            onClick={handleSaveWorkflow}
            disabled={saving}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3.5 py-1.5 rounded-lg font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Save size={14} />
            <span>{saving ? 'Saving...' : 'Save'}</span>
          </Button>
        </div>
      </div>

      {/* Visual Canvas */}
      <div className="flex-1 relative overflow-hidden">
          <WorkflowGraphEditor
            workflow={currentWorkflow}
            onChange={(updatedWf: Workflow) => { setCurrentWorkflow(updatedWf); onDirtyChange?.(true); }}
          showDebugger={showDebugger}
          setShowDebugger={setShowDebugger}
          selectedNodeId={selectedNodeId}
          onNodeSelect={setSelectedNodeId}
          selectedEdgeId={selectedEdgeId}
          onEdgeSelect={setSelectedEdgeId}
          rightSidebarTab={rightSidebarTab}
          setRightSidebarTab={setRightSidebarTab}
          fields={effectiveFields}
        />
      </div>
    </div>
  );
};

