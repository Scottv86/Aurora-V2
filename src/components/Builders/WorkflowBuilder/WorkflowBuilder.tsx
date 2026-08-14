import React, { useState } from 'react';
import { GitBranch, Save, Bug } from 'lucide-react';
import { Workflow, WorkflowEntity, StandaloneBuilderContext } from '../../../types/platform';
import { WorkflowGraphEditor } from '../../Builder/Workflow/GraphEditor';
import { Button } from '../../UI/Primitives';

export interface WorkflowBuilderProps {
  initialWorkflow?: Partial<WorkflowEntity>;
  builderContext: StandaloneBuilderContext;
  onSave?: (workflow: WorkflowEntity) => void;
  fields?: any[];
}

export const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({
  initialWorkflow,
  builderContext,
  onSave,
  fields = []
}) => {
  const [name, setName] = useState(initialWorkflow?.name || 'Untitled Workflow');
  const [description, setDescription] = useState(initialWorkflow?.description || '');
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

  const handleSaveWorkflow = () => {
    setSaving(true);
    const workflowEntity: WorkflowEntity = {
      id: currentWorkflow.id,
      tenantId: initialWorkflow?.tenantId || 'tenant_default',
      moduleId: builderContext.hostType === 'module' ? builderContext.hostId : undefined,
      name,
      description,
      isGlobal: builderContext.mode === 'global',
      triggerType: 'RECORD_EVENT',
      nodes: currentWorkflow.nodes,
      edges: currentWorkflow.edges,
      version: (initialWorkflow?.version || 0) + 1,
      status: 'PUBLISHED'
    };

    setTimeout(() => {
      setSaving(false);
      if (onSave) onSave(workflowEntity);
      if (builderContext.onSaveSuccess) builderContext.onSaveSuccess(workflowEntity.id, workflowEntity);
    }, 400);
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
          fields={fields}
        />
      </div>
    </div>
  );
};

