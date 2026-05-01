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
import { Workflow, WorkflowNodeType } from '../../../types/platform';
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
}

const WorkflowPreviewContent: React.FC<WorkflowPreviewProps> = ({ workflow, activeNodeId }) => {
  const initialNodes = useMemo(() => 
    workflow.nodes.map(n => ({
      id: n.id,
      type: 'workflowNode',
      data: { 
        label: n.name, 
        type: n.type,
        isActive: n.id === activeNodeId,
        readOnly: true,
        onDelete: () => {} // No-op in preview
      },
      position: n.position || { x: 0, y: 0 },
    })), [workflow, activeNodeId]);

  const initialEdges = useMemo(() => 
    workflow.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label || e.condition,
      type: 'workflowEdge',
      animated: e.source === activeNodeId,
      className: e.source === activeNodeId ? "stroke-indigo-500" : "stroke-zinc-600"
    })), [workflow, activeNodeId]);

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
