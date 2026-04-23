import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
} from '@xyflow/react';
import { Plus, X, Activity, GitFork, Zap, Clock, CircleDot, Play } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { WorkflowNodeType } from '../../../types/platform';

const nodeTypesList: { type: WorkflowNodeType; icon: any; color: string }[] = [
  { type: 'STATUS', icon: Activity, color: 'indigo' },
  { type: 'DECISION', icon: GitFork, color: 'amber' },
  { type: 'ACTION', icon: Zap, color: 'emerald' },
  { type: 'DELAY', icon: Clock, color: 'zinc' },
];

export const CustomWorkflowEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: any) => {
  const { setEdges, setNodes } = useReactFlow();
  const [showMenu, setShowMenu] = React.useState(false);
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetPosition,
    targetX,
    targetY,
  });

  const onEdgeClick = (evt: React.MouseEvent) => {
    evt.stopPropagation();
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  };

  const onAddBetween = (type: WorkflowNodeType) => {
    const newNodeId = `node-${Date.now()}`;
    const newNode = {
      id: newNodeId,
      type: 'workflowNode',
      position: { x: labelX - 100, y: labelY - 40 },
      data: { 
        label: `New ${type}`, 
        type,
        onDelete: (id: string) => setNodes((nds) => nds.filter(node => node.id !== id))
      },
    };

    // Find the original edge to get source/target
    setEdges((edges) => {
      const originalEdge = edges.find((e) => e.id === id);
      if (!originalEdge) return edges;

      const newEdges = [
        ...edges.filter((e) => e.id !== id),
        {
          id: `e-${originalEdge.source}-${newNodeId}`,
          source: originalEdge.source,
          target: newNodeId,
          type: 'workflowEdge',
          animated: true,
        },
        {
          id: `e-${newNodeId}-${originalEdge.target}`,
          source: newNodeId,
          target: originalEdge.target,
          type: 'workflowEdge',
          animated: true,
        },
      ];
      return newEdges;
    });

    setNodes((nodes) => nodes.concat(newNode));
    setShowMenu(false);
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, strokeWidth: 2 }} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
          }}
          className="nodrag nopan flex items-center gap-1"
        >
          {!showMenu ? (
            <div className="flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity duration-200">
              <button
                className="w-6 h-6 bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-white rounded-full flex items-center justify-center hover:bg-indigo-600 transition-colors shadow-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(true);
                }}
                title="Add node between"
              >
                <Plus size={12} />
              </button>
              <button
                className="w-6 h-6 bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-rose-500 rounded-full flex items-center justify-center hover:bg-rose-600 hover:text-white transition-colors shadow-lg"
                onClick={onEdgeClick}
                title="Remove connection"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-full shadow-2xl animate-in zoom-in-95 duration-200">
              {nodeTypesList.map((node) => (
                <button
                  key={node.type}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddBetween(node.type);
                  }}
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                    `bg-${node.color}-500/10 text-${node.color}-500 hover:bg-${node.color}-500 hover:text-white`
                  )}
                  title={`Add ${node.type}`}
                >
                  <node.icon size={12} />
                </button>
              ))}
              <div className="w-px h-4 bg-zinc-800 mx-1" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-500 hover:bg-zinc-800"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
