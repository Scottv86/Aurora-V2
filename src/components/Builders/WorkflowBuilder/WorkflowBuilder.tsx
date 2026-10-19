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

  const [showDebugger, setShowDebugger] = useState(false);
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
    <div className="flex flex-col h-full w-full bg-zinc-950 text-white overflow-hidden">

      {/* Workflow Builder Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-950/80 text-indigo-400 border border-indigo-800/50 rounded-lg">
            <GitBranch size={18} />
          </div>
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="font-bold text-base bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 text-white"
              placeholder="Workflow Name"
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs text-zinc-400 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 block w-full"
              placeholder="Add workflow description..."
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {builderContext.mode === 'global' && (
            <select
              value={associatedModuleId}
              onChange={(e) => setAssociatedModuleId(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
            onClick={() => setShowDebugger(!showDebugger)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-all"
          >
            <Bug size={14} className={showDebugger ? "text-amber-400" : "text-zinc-400"} />
            <span>Debugger</span>
          </button>

          <Button
            onClick={handleSaveWorkflow}
            disabled={saving}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2 rounded-lg font-semibold shadow-sm transition-all"
          >
            <Save size={14} />
            <span>{saving ? 'Saving...' : 'Save Workflow'}</span>
          </Button>
        </div>
      </div>

      {/* Visual Canvas */}
      <div className="flex-1 relative">
        <WorkflowGraphEditor
          workflow={currentWorkflow}
          onChange={(updatedWf: Workflow) => setCurrentWorkflow(updatedWf)}
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

