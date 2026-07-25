import React from 'react';
import { ReactFlow, Background, Controls, Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { GitMerge, Clock } from 'lucide-react';

export interface WorkflowDAGProps {
  title?: string;
  nodes?: Node[];
  edges?: Edge[];
  height?: number;
}

const DEFAULT_NODES: Node[] = [
  {
    id: '1',
    position: { x: 50, y: 100 },
    data: { label: '⚡ Trigger: Order Created' },
    style: { background: '#0f172a', color: '#f8fafc', border: '1px solid #6366f1', borderRadius: '8px', padding: '10px', fontSize: '12px' }
  },
  {
    id: '2',
    position: { x: 280, y: 40 },
    data: { label: '🤖 Agent: Fraud Analysis' },
    style: { background: '#0f172a', color: '#f8fafc', border: '1px solid #10b981', borderRadius: '8px', padding: '10px', fontSize: '12px' }
  },
  {
    id: '3',
    position: { x: 280, y: 160 },
    data: { label: '📄 Module: Generate Invoice' },
    style: { background: '#0f172a', color: '#f8fafc', border: '1px solid #f59e0b', borderRadius: '8px', padding: '10px', fontSize: '12px' }
  },
  {
    id: '4',
    position: { x: 520, y: 100 },
    data: { label: '✅ Action: Send Notification' },
    style: { background: '#0f172a', color: '#f8fafc', border: '1px solid #8b5cf6', borderRadius: '8px', padding: '10px', fontSize: '12px' }
  }
];

const DEFAULT_EDGES: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#6366f1' } },
  { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: '#6366f1' } },
  { id: 'e2-4', source: '2', target: '4', style: { stroke: '#10b981' } },
  { id: 'e3-4', source: '3', target: '4', style: { stroke: '#f59e0b' } }
];

export const WorkflowDAGRenderer: React.FC<WorkflowDAGProps> = ({
  title = 'Workflow Execution Graph',
  nodes = DEFAULT_NODES,
  edges = DEFAULT_EDGES,
  height = 260
}) => {
  return (
    <div className="my-4 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/90 shadow-lg backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
        <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
          <GitMerge className="h-4 w-4 text-indigo-400" />
          {title}
        </h4>
        <span className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
          <Clock className="h-3 w-3 text-emerald-400" />
          Execution DAG Topology
        </span>
      </div>

      {/* ReactFlow Viewport */}
      <div className="w-full relative bg-slate-950" style={{ height }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          attributionPosition="bottom-right"
        >
          <Background color="#334155" gap={16} size={1} />
          <Controls className="bg-slate-800 border-slate-700 text-slate-300" />
        </ReactFlow>
      </div>
    </div>
  );
};
