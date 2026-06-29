import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Workflow } from '../../../types/platform';
import { CustomWorkflowNode } from './CustomNode';
import { CustomWorkflowEdge } from './CustomEdge';

const nodeTypes = {
  workflowNode: CustomWorkflowNode,
};

const edgeTypes = {
  workflowEdge: CustomWorkflowEdge,
};

interface WorkflowPreviewProps {
  workflow: Workflow;
  activeNodeId?: string;
  activeNodeIds?: string[];
}

const WorkflowPreviewContent: React.FC<WorkflowPreviewProps> = ({ workflow, activeNodeId, activeNodeIds }) => {
  const activeSet = useMemo(() => {
    const set = new Set<string>();
    if (activeNodeId) set.add(activeNodeId);
    if (activeNodeIds) activeNodeIds.forEach(id => set.add(id));
    return set;
  }, [activeNodeId, activeNodeIds]);

  const initialNodes = useMemo(() => 
    workflow.nodes.map(n => ({
      id: n.id,
      type: 'workflowNode',
      data: { 
        label: n.name, 
        type: n.type,
        isActive: activeSet.has(n.id),
        readOnly: true,
        onDelete: () => {} // No-op in preview
      },
      position: n.position || { x: 0, y: 0 },
    })), [workflow, activeSet]);

  const initialEdges = useMemo(() => 
    workflow.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label || e.condition,
      type: 'workflowEdge',
      animated: activeSet.has(e.source),
      className: activeSet.has(e.source) ? "stroke-indigo-500" : "stroke-zinc-600"
    })), [workflow, activeSet]);

  const [nodes] = useNodesState(initialNodes);
  const [edges] = useEdgesState(initialEdges);

  return (
    <div className="h-full w-full bg-zinc-950 rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.5, maxZoom: 0.6 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
        selectionKeyCode={null}
        multiSelectionKeyCode={null}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#18181b" />
      </ReactFlow>
    </div>
  );
};

export const WorkflowPreview: React.FC<WorkflowPreviewProps> = (props) => (
  <ReactFlowProvider>
    <WorkflowPreviewContent {...props} />
  </ReactFlowProvider>
);
